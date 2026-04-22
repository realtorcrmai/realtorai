#!/bin/bash
# ============================================================================
# Output Validator — PostToolUse hook for Edit|Write
#
# Checks that generated artifacts contain required sections.
# Fires AFTER artifact generation, not before.
#
# Exit 0 always (PostToolUse hooks are advisory — they print warnings).
# ============================================================================

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

[[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]] && exit 0

# --- Validate use-case docs ---
case "$FILE_PATH" in
    */usecases/*.md)
        if [[ "$(basename "$FILE_PATH")" != "TEMPLATE.md" ]]; then
            SCENARIO_COUNT=$(grep -cE "^###\s+Scenario\s+[0-9]+:" "$FILE_PATH" 2>/dev/null || echo "0")
            HAS_PROBLEM=$(grep -cE "^## Problem statement" "$FILE_PATH" 2>/dev/null || echo "0")
            HAS_NONGALS=$(grep -cE "^## Non-goals" "$FILE_PATH" 2>/dev/null || echo "0")
            WARNINGS=""
            if [[ "$SCENARIO_COUNT" -lt 3 ]]; then
                WARNINGS="$WARNINGS\n  ⚠ Only $SCENARIO_COUNT scenario(s) — minimum 3 required"
            fi
            if [[ "$HAS_PROBLEM" -eq 0 ]]; then
                WARNINGS="$WARNINGS\n  ⚠ Missing '## Problem statement' section"
            fi
            if [[ "$HAS_NONGALS" -eq 0 ]]; then
                WARNINGS="$WARNINGS\n  ⚠ Missing '## Non-goals' section"
            fi
            if [[ -n "$WARNINGS" ]]; then
                echo "[Output Validator] usecases/$(basename "$FILE_PATH"):$WARNINGS"
            fi
        fi
        ;;
esac

# --- Validate demo docs ---
case "$FILE_PATH" in
    */demo/*.md)
        if [[ "$(basename "$FILE_PATH")" != "TEMPLATE.md" ]]; then
            STEP_COUNT=$(grep -cE "^[0-9]+\.\s+\*\*" "$FILE_PATH" 2>/dev/null || echo "0")
            EXPECTED_COUNT=$(grep -cE "^\s*Expected:" "$FILE_PATH" 2>/dev/null || echo "0")
            HAS_PREREQS=$(grep -cE "^## Prerequisites" "$FILE_PATH" 2>/dev/null || echo "0")
            HAS_FAILURES=$(grep -cE "^## Failure modes" "$FILE_PATH" 2>/dev/null || echo "0")
            WARNINGS=""
            if [[ "$STEP_COUNT" -lt 3 ]]; then
                WARNINGS="$WARNINGS\n  ⚠ Only $STEP_COUNT step(s) — minimum 3 required"
            fi
            if [[ "$EXPECTED_COUNT" -lt "$STEP_COUNT" ]]; then
                WARNINGS="$WARNINGS\n  ⚠ $STEP_COUNT steps but only $EXPECTED_COUNT Expected: outcomes"
            fi
            if [[ "$HAS_PREREQS" -eq 0 ]]; then
                WARNINGS="$WARNINGS\n  ⚠ Missing '## Prerequisites' section"
            fi
            if [[ "$HAS_FAILURES" -eq 0 ]]; then
                WARNINGS="$WARNINGS\n  ⚠ Missing '## Failure modes' section"
            fi
            if [[ -n "$WARNINGS" ]]; then
                echo "[Output Validator] demo/$(basename "$FILE_PATH"):$WARNINGS"
            fi
        fi
        ;;
esac

# --- Validate smoke test files ---
case "$FILE_PATH" in
    */tests/smoke/*.smoke.ts)
        if grep -q "expect(true).toBe(true); // placeholder" "$FILE_PATH" 2>/dev/null; then
            echo "[Output Validator] $(basename "$FILE_PATH"): ⚠ Contains placeholder assertion — replace with real smoke test"
        fi
        IMPORT_COUNT=$(grep -cE "^import.*from\s+\"@/" "$FILE_PATH" 2>/dev/null || echo "0")
        if [[ "$IMPORT_COUNT" -eq 0 ]]; then
            echo "[Output Validator] $(basename "$FILE_PATH"): ⚠ No imports from @/ — smoke test should import the code it's testing"
        fi
        ;;
esac

exit 0
