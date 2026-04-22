#!/bin/bash
# ============================================================================
# Demo Gate — PreToolUse hook for Bash `gh pr create`
#
# For CODING:feature tasks, requires a demo/<slug>.md file with minimum content
# before a PR can be created. Ensures the feature is actually runnable, not
# just compilable.
#
# Exit 0 = allow, Exit 0 + JSON {decision: "block"} = block with reason
# ============================================================================

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

# Only gate `gh pr create` commands
if ! echo "$COMMAND" | grep -qE "gh pr create"; then
    exit 0
fi

# Find the current task file (not the archived one — needed for slug)
TASK_FILE="$PROJECT_DIR/.claude/current-task.json"
if [[ ! -f "$TASK_FILE" ]]; then
    # No active task. Check archive for the most recent CODING:feature.
    ARCHIVE_DIR="$PROJECT_DIR/.claude/task-archive"
    if [[ -d "$ARCHIVE_DIR" ]]; then
        TASK_FILE=$(ls -t "$ARCHIVE_DIR"/task-*.json 2>/dev/null | head -1)
    fi
    if [[ -z "$TASK_FILE" || ! -f "$TASK_FILE" ]]; then
        # Still nothing. Let it through — not our problem.
        exit 0
    fi
fi

TYPE=$(jq -r '.type // empty' "$TASK_FILE" 2>/dev/null)
SLUG=$(jq -r '.slug // empty' "$TASK_FILE" 2>/dev/null)

# Only gate CODING:feature tasks
if [[ "$TYPE" != "CODING:feature" ]]; then
    exit 0
fi

# Missing slug is a separate problem — block with useful message
if [[ -z "$SLUG" ]]; then
    cat <<EOF
{
  "decision": "block",
  "reason": "CODING:feature tasks must set 'slug' in current-task.json (kebab-case, matches demo/<slug>.md filename).\n\nExample: if feature is 'bulk contacts export', slug is 'contacts-bulk-export' and demo is demo/contacts-bulk-export.md."
}
EOF
    exit 0
fi

# Check the demo file exists
DEMO_FILE="$PROJECT_DIR/demo/$SLUG.md"
if [[ ! -f "$DEMO_FILE" ]]; then
    cat <<EOF
{
  "decision": "block",
  "reason": "CODING:feature requires a demo file at demo/$SLUG.md. This file must document how to reproduce the feature working.\n\nCopy demo/TEMPLATE.md to demo/$SLUG.md and fill it in. Minimum: 3 numbered steps, each with an 'Expected:' outcome."
}
EOF
    exit 0
fi

# Check minimum content: must have 3+ numbered steps
STEP_COUNT=$(grep -cE "^[0-9]+\.\s+\*\*" "$DEMO_FILE" 2>/dev/null || echo "0")
if [[ "$STEP_COUNT" -lt 3 ]]; then
    cat <<EOF
{
  "decision": "block",
  "reason": "demo/$SLUG.md has only $STEP_COUNT step(s). Minimum 3 required. Each step must be formatted as '1. **action** — description'."
}
EOF
    exit 0
fi

# Check each step has an expected outcome
EXPECTED_COUNT=$(grep -cE "^\s*Expected:" "$DEMO_FILE" 2>/dev/null || echo "0")
if [[ "$EXPECTED_COUNT" -lt "$STEP_COUNT" ]]; then
    cat <<EOF
{
  "decision": "block",
  "reason": "demo/$SLUG.md has $STEP_COUNT steps but only $EXPECTED_COUNT 'Expected:' outcomes. Every step must have a corresponding 'Expected:' line."
}
EOF
    exit 0
fi

# Passed all checks
exit 0
