#!/bin/bash
# ============================================================================
# Completion Gate — Stop hook
#
# For Medium and Large tasks, blocks Claude from finishing unless:
# 1. Validation phase is complete (tsc ran)
# 2. Compliance log entry was written
#
# Exit 0 = allow completion
# Exit 0 + JSON with decision=block = block with reason
# ============================================================================

INPUT=$(cat)
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

TASK_FILE=""
if [[ -n "$PROJECT_DIR" ]]; then
    TASK_FILE="$PROJECT_DIR/.claude/current-task.json"
fi

# No active task = allow (INFO tasks, greetings, etc.)
if [[ -z "$TASK_FILE" || ! -f "$TASK_FILE" ]]; then
    exit 0
fi

TIER=$(jq -r '.tier // empty' "$TASK_FILE")
VALIDATED=$(jq -r '.phases.validated // false' "$TASK_FILE")
COMPLIANCE=$(jq -r '.phases.compliance_logged // false' "$TASK_FILE")

# Micro and Small don't need compliance log
case "$TIER" in
    micro|small)
        exit 0
        ;;
    medium|large)
        MISSING=""
        if [[ "$VALIDATED" != "true" ]]; then
            MISSING="$MISSING\n- Run validation (tsc --noEmit + tests), then set phases.validated=true"
        fi
        if [[ "$COMPLIANCE" != "true" ]]; then
            MISSING="$MISSING\n- Write compliance log entry in .claude/compliance-log.md, then set phases.compliance_logged=true"
        fi

        if [[ -n "$MISSING" ]]; then
            # Output JSON to block with reason
            cat <<EOF
{
  "decision": "block",
  "reason": "Cannot finish — incomplete playbook phases for $TIER tier:\\n$MISSING\\n\\nComplete these steps, update .claude/current-task.json, then try again."
}
EOF
            exit 0
        fi
        ;;
esac

# All checks passed — clean up the task file for next task
if [[ -f "$TASK_FILE" ]]; then
    # Archive completed task
    ARCHIVE_DIR="$PROJECT_DIR/.claude/task-archive"
    mkdir -p "$ARCHIVE_DIR"
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    cp "$TASK_FILE" "$ARCHIVE_DIR/task-$TIMESTAMP.json"
    rm "$TASK_FILE"
fi

exit 0
