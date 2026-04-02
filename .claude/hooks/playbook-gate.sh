#!/bin/bash
# ============================================================================
# Playbook Gate — PreToolUse hook (Layer 2)
#
# Blocks ALL significant tool calls unless a task has been classified.
# Gates: Edit, Write, Agent, Bash (non-trivial)
# Allows freely: Read, Grep, Glob (needed during classification)
#
# Exit 0 = allow, Exit 2 = block
# ============================================================================

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

# --- Always allow: Read, Grep, Glob, TodoWrite, ToolSearch ---
# These are observation/planning tools needed DURING classification
case "$TOOL_NAME" in
    Read|Grep|Glob|TodoWrite|ToolSearch|Skill) exit 0 ;;
esac

# --- For Edit/Write: ONLY exempt task file + compliance log (bootstrap) ---
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
    case "$FILE_PATH" in
        */.claude/current-task.json) exit 0 ;;   # Must create this to classify
        */.claude/compliance-log.md) exit 0 ;;    # Must log after every task
        *.env*) exit 0 ;;                         # Env files (secrets — not code)
        *.yml|*.yaml) exit 0 ;;                   # CI/deploy configs
    esac
fi

# --- For Bash: allow read-only commands without gate ---
if [[ "$TOOL_NAME" == "Bash" ]]; then
    case "$COMMAND" in
        git\ status*|git\ log*|git\ diff*|git\ branch*) exit 0 ;;
        curl\ -s*|curl\ --silent*|curl\ -sv*) exit 0 ;;
        ls*|wc*|cat*|head*|tail*|find*|which*|echo*) exit 0 ;;
        grep*|rg*) exit 0 ;;
        bash*health-check*|bash*test-suite*) exit 0 ;;
        npx\ tsc*) exit 0 ;;
        sleep*) exit 0 ;;
        python3\ --version*|/opt/homebrew*--version*) exit 0 ;;
        rm*current-task.json*) exit 0 ;;          # Cleanup after task
        cp*current-task.json*) exit 0 ;;          # Copy task file between dirs
        cat*current-task.json*) exit 0 ;;         # Create/copy task file
        source*|.*\ .env*) exit 0 ;;              # Source env files
        lsof*|kill*) exit 0 ;;                    # Process management
    esac
fi

# --- Now check: is there an active classified task? ---
# Search for current-task.json file — check multiple locations (portable)
TASK_FILE=""
for CANDIDATE in \
    "$CLAUDE_PROJECT_DIR/.claude/current-task.json" \
    "$PROJECT_DIR/.claude/current-task.json" \
    "$PROJECT_DIR/realtorai/.claude/current-task.json" \
    "$CLAUDE_PROJECT_DIR/realtorai/.claude/current-task.json"; do
    if [[ -f "$CANDIDATE" ]]; then
        TASK_FILE="$CANDIDATE"
        break
    fi
done

# No task file = not classified → BLOCK
if [[ -z "$TASK_FILE" || ! -f "$TASK_FILE" ]]; then
    echo "BLOCKED: No classified task found. Before using $TOOL_NAME, you MUST:" >&2
    echo "  1. Read the request twice (HC-15)" >&2
    echo "  2. Decompose → map dependencies → reorder" >&2
    echo "  3. Output classification block" >&2
    echo "  4. Create .claude/current-task.json with: {\"type\": \"...\", \"tier\": \"...\", \"phases\": {\"classified\": true}}" >&2
    exit 2
fi

# Check classified phase
CLASSIFIED=$(jq -r '.phases.classified // false' "$TASK_FILE" 2>/dev/null)
if [[ "$CLASSIFIED" != "true" ]]; then
    echo "BLOCKED: Task file exists but classification incomplete. Set phases.classified=true after outputting classification block." >&2
    exit 2
fi

# For Medium+ tiers, require scope before execution tools
TIER=$(jq -r '.tier // "micro"' "$TASK_FILE" 2>/dev/null)
case "$TIER" in
    medium|large)
        SCOPED=$(jq -r '.phases.scoped // false' "$TASK_FILE" 2>/dev/null)
        if [[ "$SCOPED" != "true" ]]; then
            if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" || "$TOOL_NAME" == "Agent" ]]; then
                echo "BLOCKED: $TIER tier requires scope phase before $TOOL_NAME. Set phases.scoped=true in current-task.json." >&2
                exit 2
            fi
        fi
        ;;
esac

exit 0
