#!/bin/bash
# ============================================================================
# Git Protection — PreToolUse hook for Bash
#
# Blocks:
# 1. Direct push to dev or main (must use PR)
# 2. Force push to any branch
# 3. git reset --hard (destructive)
#
# Exit 0 = allow, Exit 2 = block
# ============================================================================

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# No command = allow
if [[ -z "$COMMAND" ]]; then
    exit 0
fi

# Block direct push to dev or main
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*\b(origin\s+)?(dev|main)\b'; then
    # Allow "git push origin <branch>" where branch is not dev/main
    # But block "git push origin dev" and "git push origin main"
    if echo "$COMMAND" | grep -qE 'git\s+push\s+origin\s+(dev|main)\s*$'; then
        echo "BLOCKED: Never push directly to dev or main. Use a feature branch and create a PR. See playbook Section 1 (Hard Constraints)." >&2
        exit 2
    fi
fi

# Block force push
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force'; then
    echo "BLOCKED: Force push is not allowed. If you need to update a branch, use regular push or rebase. See playbook Safety Level 3." >&2
    exit 2
fi

# Block git reset --hard
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
    echo "BLOCKED: git reset --hard is destructive. Ask the user before proceeding. See playbook Safety Level 3." >&2
    exit 2
fi

# Block rm -rf on dangerous paths
if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+(/|~|\$HOME)'; then
    echo "BLOCKED: Destructive rm -rf on system path. This is forbidden. See playbook Safety Level 4." >&2
    exit 2
fi

exit 0
