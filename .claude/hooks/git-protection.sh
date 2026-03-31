#!/bin/bash
# ============================================================================
# Git Protection — PreToolUse hook for Bash
#
# Blocks dangerous git operations:
# - Push directly to dev or main
# - Force push anywhere
# - Hard reset
# - Catastrophic deletes
#
# Exit 0 = allow, Exit 2 = block
# ============================================================================

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check git and rm commands
if ! echo "$COMMAND" | grep -qE 'git\s|rm\s'; then
    exit 0
fi

# Block push to protected branches
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*\s+(main|dev)\b'; then
    echo "BLOCKED: Never push directly to main or dev. Use a feature branch and create a PR." >&2
    exit 2
fi

# Block force push
if echo "$COMMAND" | grep -qE 'git\s+push\s+(-f|--force)'; then
    echo "BLOCKED: Force push is not allowed. It can destroy remote history." >&2
    exit 2
fi
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*(-f|--force)'; then
    echo "BLOCKED: Force push is not allowed. It can destroy remote history." >&2
    exit 2
fi

# Block hard reset
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
    echo "BLOCKED: git reset --hard can destroy uncommitted work. Use git stash or git checkout -- <file> instead." >&2
    exit 2
fi

# Block catastrophic deletes
if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+(/|~|/Users)'; then
    echo "BLOCKED: Catastrophic delete detected. This would destroy critical data." >&2
    exit 2
fi

exit 0
