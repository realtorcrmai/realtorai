#!/bin/bash
# ============================================================================
# Completion Gate — Stop hook
#
# When Claude finishes, automatically:
# 1. Run tsc --noEmit for CODING tasks
# 2. Check compliance log for Medium+ tiers
# 3. Archive the task file on success
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
COMPLIANCE=$(jq -r '.phases.compliance_logged // false' "$TASK_FILE")
TYPE=$(jq -r '.type // empty' "$TASK_FILE")

# INFO tasks don't need validation
if [[ "$TYPE" == "INFO" ]]; then
    exit 0
fi

# Micro and Small: run tsc automatically but don't require compliance log
case "$TIER" in
    micro|small)
        if [[ "$TYPE" == CODING:* ]]; then
            cd "$PROJECT_DIR" 2>/dev/null
            TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
            TSC_EXIT=$?
            if [[ $TSC_EXIT -ne 0 ]]; then
                ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS")
                FIRST_ERRORS=$(echo "$TSC_OUTPUT" | grep "error TS" | head -5)
                cat <<EOF
{
  "decision": "block",
  "reason": "TypeScript compilation failed ($ERROR_COUNT errors). Fix before finishing:\\n\\n$FIRST_ERRORS\\n\\nRun: npx tsc --noEmit"
}
EOF
                exit 0
            fi
        fi
        exit 0
        ;;
    medium|large)
        MISSING=""

        # Run tsc for code tasks
        if [[ "$TYPE" == CODING:* ]]; then
            cd "$PROJECT_DIR" 2>/dev/null
            TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
            TSC_EXIT=$?
            if [[ $TSC_EXIT -ne 0 ]]; then
                ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS")
                FIRST_ERRORS=$(echo "$TSC_OUTPUT" | grep "error TS" | head -5)
                MISSING="$MISSING\n- TypeScript compilation failed ($ERROR_COUNT errors):\n$FIRST_ERRORS"
            else
                jq '.phases.validated = true' "$TASK_FILE" > "$TASK_FILE.tmp" && mv "$TASK_FILE.tmp" "$TASK_FILE"
            fi
        fi

        if [[ "$COMPLIANCE" != "true" ]]; then
            MISSING="$MISSING\n- Write compliance log entry in .claude/compliance-log.md, then set phases.compliance_logged=true"
        fi

        if [[ -n "$MISSING" ]]; then
            cat <<EOF
{
  "decision": "block",
  "reason": "Cannot finish — incomplete steps for $TIER tier:\\n$MISSING\\n\\nComplete these steps, then try again."
}
EOF
            exit 0
        fi
        ;;
esac

# Soft warning: decision trail for Medium+
if [[ "$TIER" == "medium" || "$TIER" == "large" ]]; then
    DECISIONS=$(jq -r '.decisions | length // 0' "$TASK_FILE" 2>/dev/null)
    if [[ "$DECISIONS" == "0" || "$DECISIONS" == "null" ]]; then
        echo "[Note] No decision trail logged. Consider documenting key decisions in current-task.json."
    fi
fi

# All checks passed — archive the task file
if [[ -f "$TASK_FILE" ]]; then
    ARCHIVE_DIR="$PROJECT_DIR/.claude/task-archive"
    mkdir -p "$ARCHIVE_DIR"
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    cp "$TASK_FILE" "$ARCHIVE_DIR/task-$TIMESTAMP.json"
    rm "$TASK_FILE"
fi

exit 0
