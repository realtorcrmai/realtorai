#!/bin/bash
# ============================================================================
# Docs Gate — PreToolUse hook for Bash commands
#
# Intercepts `gh pr create` commands and blocks them if docs are stale.
# Runs both the basic audit (audit-docs.mjs) and the deep audit
# (audit-docs-deep.mjs) which checks changed-file → doc mapping.
#
# Exit 0 = allow
# Exit 0 + JSON {decision: "block"} = block with reason
# ============================================================================

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

# Only gate `gh pr create` commands
if ! echo "$COMMAND" | grep -qE "gh pr create|gh pr create"; then
    exit 0
fi

cd "$PROJECT_DIR" 2>/dev/null || exit 0

# Run basic audit
BASIC_OUTPUT=$(node scripts/audit-docs.mjs 2>&1)
BASIC_EXIT=$?

# Run deep audit (changed files → doc mapping)
DEEP_OUTPUT=$(node scripts/audit-docs-deep.mjs 2>&1)
DEEP_EXIT=$?

# Run test plan audit
TEST_OUTPUT=$(node scripts/audit-test-plans.mjs 2>&1)
TEST_EXIT=$?

if [[ $BASIC_EXIT -ne 0 || $DEEP_EXIT -ne 0 || $TEST_EXIT -ne 0 ]]; then
    ISSUES=""
    if [[ $BASIC_EXIT -ne 0 ]]; then
        STALE=$(echo "$BASIC_OUTPUT" | grep "⚠" | head -5 | sed 's/"/\\"/g' | tr '\n' '|')
        ISSUES="Basic audit failed: $STALE"
    fi
    if [[ $DEEP_EXIT -ne 0 ]]; then
        DEEP_STALE=$(echo "$DEEP_OUTPUT" | grep "📄\|←" | head -8 | sed 's/"/\\"/g' | tr '\n' '|')
        ISSUES="$ISSUES Deep audit: $DEEP_STALE"
    fi
    if [[ $TEST_EXIT -ne 0 ]]; then
        TEST_STALE=$(echo "$TEST_OUTPUT" | grep "⚠" | head -5 | sed 's/"/\\"/g' | tr '\n' '|')
        ISSUES="$ISSUES Test plan audit: $TEST_STALE"
    fi

    cat <<EOF
{
  "decision": "block",
  "reason": "Cannot create PR — docs are stale.\\n\\n$ISSUES\\n\\nFix: update the listed docs and test plans, then retry.\\nRun locally:\\n  node scripts/audit-docs.mjs\\n  node scripts/audit-docs-deep.mjs\\n  node scripts/audit-test-plans.mjs"
}
EOF
    exit 0
fi

# All clean — allow PR creation
exit 0
