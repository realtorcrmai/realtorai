#!/bin/bash
# ============================================================================
# Playbook Reminder — UserPromptSubmit hook (Layer 1)
#
# Outputs task status + phase-specific nudge before every prompt.
# Saves tokens when no active task.
# Exit 0 always.
# ============================================================================

PROJECT_DIR=$(cat | jq -r '.cwd // empty')
TASK_FILE=""
if [[ -n "$PROJECT_DIR" ]]; then
    TASK_FILE="$PROJECT_DIR/.claude/current-task.json"
fi

if [[ -n "$TASK_FILE" && -f "$TASK_FILE" ]]; then
    TIER=$(jq -r '.tier // "unknown"' "$TASK_FILE")
    TYPE=$(jq -r '.type // "unknown"' "$TASK_FILE")
    CLASSIFIED=$(jq -r '.phases.classified // false' "$TASK_FILE")
    SCOPED=$(jq -r '.phases.scoped // false' "$TASK_FILE")
    IMPLEMENTED=$(jq -r '.phases.implemented // false' "$TASK_FILE")

    # Phase-specific nudge
    if [[ "$CLASSIFIED" != "true" ]]; then
        NUDGE="→ Next: CLASSIFY (read request twice, consider 2+ approaches)"
    elif [[ "$SCOPED" != "true" && ("$TIER" == "medium" || "$TIER" == "large") ]]; then
        NUDGE="→ Next: SCOPE (list files, downside check, plan)"
    elif [[ "$IMPLEMENTED" != "true" ]]; then
        NUDGE="→ Next: IMPLEMENT (output Phase checkpoint before coding)"
    else
        NUDGE="→ Next: VERIFY (tsc + tests + PR)"
    fi

    echo "[L1] $TIER | $TYPE | $NUDGE"
fi

exit 0
