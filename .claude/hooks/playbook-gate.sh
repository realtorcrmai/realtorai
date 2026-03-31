#!/bin/bash
# ============================================================================
# Playbook Gate — PreToolUse hook for Edit/Write
#
# Blocks code edits unless a task has been classified in current-task.json.
# For Medium+ tiers, also requires scope phase completed.
#
# Exit 0 = allow, Exit 2 = block
# ============================================================================

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

# Skip non-source files (allow editing docs, configs, tests freely)
case "$FILE_PATH" in
    *.md|*.json|*.yml|*.yaml|*.css|*.env*|*.sh|*.mjs) exit 0 ;;
    */tests/*|*/test-results/*|*/__tests__/*) exit 0 ;;
    */.claude/*) exit 0 ;;
esac

# Only gate .ts/.tsx source files
case "$FILE_PATH" in
    *.ts|*.tsx) ;;
    *) exit 0 ;;
esac

TASK_FILE=""
if [[ -n "$PROJECT_DIR" ]]; then
    TASK_FILE="$PROJECT_DIR/.claude/current-task.json"
fi

# No task file = not classified
if [[ -z "$TASK_FILE" || ! -f "$TASK_FILE" ]]; then
    echo "BLOCKED: Classify the task before editing source code. Create .claude/current-task.json with tier, type, and phases.classified=true." >&2
    exit 2
fi

# Check classified phase
CLASSIFIED=$(jq -r '.phases.classified // false' "$TASK_FILE" 2>/dev/null)
if [[ "$CLASSIFIED" != "true" ]]; then
    echo "BLOCKED: Task exists but phases.classified is not true. Complete classification first." >&2
    exit 2
fi

# For Medium+ tiers, require scope
TIER=$(jq -r '.tier // "micro"' "$TASK_FILE" 2>/dev/null)
case "$TIER" in
    medium|large)
        SCOPED=$(jq -r '.phases.scoped // false' "$TASK_FILE" 2>/dev/null)
        if [[ "$SCOPED" != "true" ]]; then
            echo "BLOCKED: $TIER tier requires scope before coding. Set phases.scoped=true in current-task.json." >&2
            exit 2
        fi
        ;;
esac

exit 0
