#!/bin/bash
# ============================================================================
# Review Gate — PreToolUse hook for Bash commands
#
# Intercepts `gh pr create` commands and blocks if code review finds errors.
# Same pattern as docs-gate.sh.
#
# Exit 0 = allow
# Exit 0 + JSON {decision: "block"} = block with reason
# ============================================================================

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

# Only gate `gh pr create` commands
if ! echo "$COMMAND" | grep -qE "gh pr create"; then
    exit 0
fi

cd "$PROJECT_DIR" 2>/dev/null || exit 0

OUTPUT=$(node scripts/review-pr.mjs 2>&1)
EXIT=$?

if [[ $EXIT -ne 0 ]]; then
    ERRORS=$(echo "$OUTPUT" | grep "❌\|—" | head -5 | sed 's/"/\\"/g' | tr '\n' '|')
    cat <<EOF
{
  "decision": "block",
  "reason": "Code review found errors:\\n$ERRORS\\n\\nFix errors before creating PR.\\nRun: node scripts/review-pr.mjs"
}
EOF
    exit 0
fi

# All clean — allow PR creation
exit 0
