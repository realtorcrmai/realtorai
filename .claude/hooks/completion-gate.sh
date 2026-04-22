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

        # Deliverable check (soft warning — helps build habit)
        DELIVERABLE_WARNINGS=""
        if [[ "$TYPE" == "CODING:feature" ]]; then
            # Check if any usecases/ file was modified in this git session
            USECASE_CHANGES=$(cd "$PROJECT_DIR" && git diff --cached --name-only 2>/dev/null | grep "usecases/" | wc -l | tr -d ' ')
            if [[ "$USECASE_CHANGES" == "0" ]]; then
                DELIVERABLE_WARNINGS="$DELIVERABLE_WARNINGS\n  ⚠ No usecases/<feature>.md created/updated (CODING:feature requires this)"
            fi
        fi
        if [[ "$TYPE" == CODING:* ]]; then
            # Check if tests were modified
            TEST_CHANGES=$(cd "$PROJECT_DIR" && git diff --cached --name-only 2>/dev/null | grep -E "tests/|__tests__/|\.test\.|\.spec\." | wc -l | tr -d ' ')
            if [[ "$TEST_CHANGES" == "0" ]]; then
                DELIVERABLE_WARNINGS="$DELIVERABLE_WARNINGS\n  ⚠ No test files created/updated (CODING tasks should include tests)"
            fi
        fi
        # Docs freshness check — warn if docs are stale after code changes
        if [[ "$TYPE" == CODING:* || "$TYPE" == DOCS* ]]; then
            cd "$PROJECT_DIR" 2>/dev/null
            DOCS_OUTPUT=$(node scripts/audit-docs.mjs 2>&1)
            DOCS_EXIT=$?
            if [[ $DOCS_EXIT -ne 0 ]]; then
                STALE_COUNT=$(echo "$DOCS_OUTPUT" | grep -c "⚠")
                DELIVERABLE_WARNINGS="$DELIVERABLE_WARNINGS\n  ⚠ Docs audit found $STALE_COUNT stale item(s) — run: node scripts/audit-docs.mjs"
            fi
            # Test plan freshness check
            TEST_OUTPUT=$(node scripts/audit-test-plans.mjs 2>&1)
            TEST_EXIT=$?
            if [[ $TEST_EXIT -ne 0 ]]; then
                STALE_TESTS=$(echo "$TEST_OUTPUT" | grep -c "⚠")
                DELIVERABLE_WARNINGS="$DELIVERABLE_WARNINGS\n  ⚠ Test plan audit found $STALE_TESTS stale item(s) — run: node scripts/audit-test-plans.mjs"
            fi
        fi

        if [[ -n "$DELIVERABLE_WARNINGS" ]]; then
            echo "[Deliverable Check]$DELIVERABLE_WARNINGS"
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

# Auto-append compliance log entry
if [[ -f "$TASK_FILE" ]]; then
    COMPLIANCE_LOG="$PROJECT_DIR/.claude/compliance-log.md"
    DATE=$(date +%Y-%m-%d)
    DESCRIPTION=$(jq -r '.description // "unknown"' "$TASK_FILE" | head -c 80)
    PHASES_DONE=$(jq -r '[.phases | to_entries[] | select(.value == true) | .key] | join(", ")' "$TASK_FILE" 2>/dev/null)
    PHASES_SKIPPED=$(jq -r '[.phases | to_entries[] | select(.value == false) | .key] | join(", ")' "$TASK_FILE" 2>/dev/null)

    # Determine pass/fail state
    STATUS="✅"
    NOTES="Auto-logged by completion-gate"

    # FAIL if any phase was skipped (medium/large tier)
    if [[ -n "$PHASES_SKIPPED" && ("$TIER" == "medium" || "$TIER" == "large") ]]; then
        STATUS="❌"
        NOTES="FAIL: phases skipped ($PHASES_SKIPPED)"
    fi

    # FAIL if deliverable warnings fired
    if [[ -n "$DELIVERABLE_WARNINGS" ]]; then
        STATUS="❌"
        if [[ "$NOTES" == "Auto-logged by completion-gate" ]]; then
            NOTES="FAIL: deliverable warnings — see session output"
        else
            NOTES="$NOTES; deliverable warnings"
        fi
    fi

    # FAIL if tsc failed (defensive — if user overrode the block, log it)
    if [[ -n "$TSC_EXIT" && "$TSC_EXIT" -ne 0 ]]; then
        STATUS="❌"
        NOTES="FAIL: tsc errors bypassed"
    fi

    if [[ -f "$COMPLIANCE_LOG" ]]; then
        echo "| $DATE | claude | $DESCRIPTION | $TYPE | $STATUS | $PHASES_DONE | ${PHASES_SKIPPED:-—} | $NOTES |" >> "$COMPLIANCE_LOG"
    fi
fi

# All checks passed — archive the task file
if [[ -f "$TASK_FILE" ]]; then
    ARCHIVE_DIR="$PROJECT_DIR/.claude/task-archive"
    mkdir -p "$ARCHIVE_DIR"
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    cp "$TASK_FILE" "$ARCHIVE_DIR/task-$TIMESTAMP.json"

    # --- Self-Learning: Extract lesson from task ---
    LESSONS_FILE="$PROJECT_DIR/.claude/playbook/lessons-learned.md"
    if [[ -f "$LESSONS_FILE" ]]; then
        SUMMARY=$(jq -r '.summary // empty' "$TASK_FILE")
        SKIPPED=$(jq -r '.phases | to_entries[] | select(.value == false) | .key' "$TASK_FILE" 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
        TASK_TIER=$(jq -r '.tier // "unknown"' "$TASK_FILE")

        LESSON=""
        # Detect skipped phases
        if [[ -n "$SKIPPED" ]]; then
            LESSON="Phases skipped: $SKIPPED. Ensure all phases complete for $TASK_TIER tier."
        fi
        # Detect rework (task file recreated — same summary exists in archive)
        REWORK_COUNT=$(ls "$ARCHIVE_DIR"/task-*.json 2>/dev/null | xargs grep -l "$SUMMARY" 2>/dev/null | wc -l | tr -d ' ')
        if [[ "$REWORK_COUNT" -gt 1 ]]; then
            LESSON="Task reworked ${REWORK_COUNT}x. Scope may need better upfront analysis."
        fi
        # Detect TypeScript failures that were fixed
        if [[ "$TYPE" == CODING:* ]]; then
            VALIDATED=$(jq -r '.phases.validated // false' "$TASK_FILE")
            if [[ "$VALIDATED" == "true" && -n "$TSC_OUTPUT" ]]; then
                LESSON="TypeScript errors caught and fixed during validation. Self-heal loop worked."
            fi
        fi
        # Default lesson for clean completions
        if [[ -z "$LESSON" ]]; then
            LESSON="Clean completion. All phases followed for $TYPE ($TASK_TIER)."
        fi

        echo "| $(date +%Y-%m-%d) | $TYPE | $LESSON |" >> "$LESSONS_FILE"
    fi

    rm "$TASK_FILE"
fi

exit 0
