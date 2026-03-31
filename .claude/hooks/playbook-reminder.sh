#!/bin/bash
# ============================================================================
# Playbook Reminder — UserPromptSubmit hook
#
# If a task is active, outputs a short status line.
# If no task, outputs nothing (saves tokens).
# Exit 0 always.
# ============================================================================

PROJECT_DIR=$(cat | jq -r '.cwd // empty')
TASK_FILE=""
if [[ -n "$PROJECT_DIR" ]]; then
    TASK_FILE="$PROJECT_DIR/.claude/current-task.json"
fi

# Only output if a task is active — save tokens when idle
if [[ -n "$TASK_FILE" && -f "$TASK_FILE" ]]; then
    TIER=$(jq -r '.tier // "unknown"' "$TASK_FILE")
    TYPE=$(jq -r '.type // "unknown"' "$TASK_FILE")
    PHASES=$(jq -r '[.phases | to_entries[] | select(.value == true) | .key] | join(", ")' "$TASK_FILE")
    echo "[Task] $TIER | $TYPE | Done: $PHASES"
fi

exit 0
