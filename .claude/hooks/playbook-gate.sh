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

# --- Violation logging helper ---
log_violation() {
    local RULE="$1" ACTION="$2" TARGET="$3"
    local VLOG="$PROJECT_DIR/.claude/violation-log.md"
    if [[ -f "$VLOG" ]]; then
        echo "| $(date '+%Y-%m-%d %H:%M') | playbook-gate | $RULE | $ACTION | $TARGET |" >> "$VLOG"
    fi
}

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
    log_violation "classification" "No task file — $TOOL_NAME blocked" "${FILE_PATH:-$COMMAND}"
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
    log_violation "classification" "phases.classified not true" "${FILE_PATH:-$COMMAND}"
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
                log_violation "scope" "$TIER tier — $TOOL_NAME before scoped" "${FILE_PATH:-$COMMAND}"
                echo "BLOCKED: $TIER tier requires scope phase before $TOOL_NAME. Set phases.scoped=true in current-task.json." >&2
                exit 2
            fi
        fi
        ;;
esac

# --- Wave 2a: For CODING:feature medium/large, require usecases/<slug>.md before Edit/Write on src/** ---
TYPE=$(jq -r '.type // empty' "$TASK_FILE" 2>/dev/null)
if [[ "$TYPE" == "CODING:feature" && ("$TIER" == "medium" || "$TIER" == "large") ]]; then
    if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
        case "$FILE_PATH" in
            */src/*)
                SLUG=$(jq -r '.slug // empty' "$TASK_FILE" 2>/dev/null)
                if [[ -z "$SLUG" ]]; then
                    echo "BLOCKED: CODING:feature at $TIER tier requires 'slug' field in current-task.json (kebab-case)." >&2
                    exit 2
                fi
                USECASE_FILE=""
                for candidate in \
                    "$CLAUDE_PROJECT_DIR/usecases/$SLUG.md" \
                    "$PROJECT_DIR/usecases/$SLUG.md"; do
                    if [[ -f "$candidate" ]]; then
                        USECASE_FILE="$candidate"
                        break
                    fi
                done
                if [[ -z "$USECASE_FILE" ]]; then
                    log_violation "FQ-3" "Missing usecases/$SLUG.md" "$FILE_PATH"
                    echo "BLOCKED: CODING:feature at $TIER tier requires usecases/$SLUG.md BEFORE editing src/**." >&2
                    echo "" >&2
                    echo "Copy usecases/TEMPLATE.md to usecases/$SLUG.md and fill in 3 scenarios." >&2
                    echo "Then set phases.usecases_written=true in current-task.json." >&2
                    exit 2
                fi
                SCENARIO_COUNT=$(grep -cE "^###\s+Scenario\s+[0-9]+:" "$USECASE_FILE" 2>/dev/null || echo "0")
                if [[ "$SCENARIO_COUNT" -lt 3 ]]; then
                    echo "BLOCKED: usecases/$SLUG.md has only $SCENARIO_COUNT scenario(s). Minimum 3 required." >&2
                    echo "" >&2
                    echo "Scenarios must be formatted as '### Scenario N: <description>'. See usecases/TEMPLATE.md." >&2
                    exit 2
                fi
                ;;
        esac
    fi
fi

# --- Wave 2c: For CODING:feature, require existing_search before Edit/Write on src/** ---
if [[ "$TYPE" == "CODING:feature" ]]; then
    if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
        case "$FILE_PATH" in
            */src/*)
                SEARCH_COUNT=$(jq -r '.existing_search | length // 0' "$TASK_FILE" 2>/dev/null)
                if [[ "$SEARCH_COUNT" -lt 3 ]]; then
                    log_violation "FQ-5" "existing_search has $SEARCH_COUNT entries (need 3+)" "$FILE_PATH"
                    echo "BLOCKED: CODING:feature requires existing_search to contain 3+ entries before editing src/**." >&2
                    echo "" >&2
                    echo "Before coding, search the codebase for related capabilities. For each search:" >&2
                    echo "  1. Run grep/glob to find existing code that might do what you're about to build" >&2
                    echo "  2. Add an entry to existing_search in current-task.json:" >&2
                    echo "     { \"query\": \"<search term>\", \"matches_count\": N, \"decision\": \"extend <file>|create new because <reason>\" }" >&2
                    exit 2
                fi

                # Sanity check: warn if all queries returned 0 matches
                TOTAL_MATCHES=$(jq -r '[.existing_search[].matches_count] | add // 0' "$TASK_FILE" 2>/dev/null)
                if [[ "$TOTAL_MATCHES" == "0" ]]; then
                    echo "WARNING: All existing_search entries returned 0 matches. Did you search thoroughly?" >&2
                fi
                ;;
        esac
    fi
fi

exit 0
