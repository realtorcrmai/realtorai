#!/bin/bash
# ============================================================================
# Playbook Reminder — UserPromptSubmit hook (Layer 1)
#
# Outputs task status + ordering reminder before every prompt.
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

    if [[ "$CLASSIFIED" != "true" ]]; then
        NUDGE="→ CLASSIFY first (decompose → dependencies → reorder → task list)"
    elif [[ "$SCOPED" != "true" && ("$TIER" == "medium" || "$TIER" == "large") ]]; then
        NUDGE="→ SCOPE (list files, downside check, plan)"
    elif [[ "$IMPLEMENTED" != "true" ]]; then
        NUDGE="→ IMPLEMENT (output L3 checkpoint before coding)"
    else
        NUDGE="→ VERIFY (tsc + tests + deliverables + task list check)"
    fi

    echo "[L1] $TIER | $TYPE | $NUDGE"
else
    # No active task — remind about process
    echo "[L1] New task? → Read twice → Decompose → Map dependencies → REORDER → Task list → Then classify"
fi

# Surface recent lessons (last 5) if lessons file exists
LESSONS_FILE=""
if [[ -n "$PROJECT_DIR" ]]; then
    LESSONS_FILE="$PROJECT_DIR/.claude/playbook/lessons-learned.md"
fi
if [[ -n "$LESSONS_FILE" && -f "$LESSONS_FILE" ]]; then
    LESSON_COUNT=$(tail -n +9 "$LESSONS_FILE" | grep -c "^|" 2>/dev/null || echo "0")
    if [[ "$LESSON_COUNT" -gt 0 ]]; then
        RECENT=$(tail -n +9 "$LESSONS_FILE" | grep "^|" | tail -3 | sed 's/^| //;s/ |$//' | tr '\n' ';')
        echo "[Lessons] $LESSON_COUNT total. Recent: $RECENT"
    fi
fi

exit 0
