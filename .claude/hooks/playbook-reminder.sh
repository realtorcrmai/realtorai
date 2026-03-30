#!/bin/bash
# ============================================================================
# Playbook Reminder — UserPromptSubmit hook
#
# Injects a short reminder into every user prompt so Claude always sees it.
# Exit 0 with stdout = message added to context before Claude processes.
# ============================================================================

PROJECT_DIR=$(cat | jq -r '.cwd // empty')
TASK_FILE=""
if [[ -n "$PROJECT_DIR" ]]; then
    TASK_FILE="$PROJECT_DIR/.claude/current-task.json"
fi

# Check if a task is currently active
if [[ -n "$TASK_FILE" && -f "$TASK_FILE" ]]; then
    TIER=$(jq -r '.tier // "unknown"' "$TASK_FILE")
    TYPE=$(jq -r '.type // "unknown"' "$TASK_FILE")
    PHASES=$(jq -r '[.phases | to_entries[] | select(.value == true) | .key] | join(", ")' "$TASK_FILE")
    echo "[Playbook] Active task: $TIER | $TYPE | Phases done: $PHASES. Follow .claude/agent-playbook.md for next steps. Update .claude/current-task.json as you complete each phase."
else
    echo "[Playbook] No active task. If this is a new task (not INFO), classify it first by writing .claude/current-task.json before editing any source code. Follow .claude/agent-playbook.md."
fi

exit 0
