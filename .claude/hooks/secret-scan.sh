#!/bin/bash
# ============================================================================
# Secret Detection — PreToolUse hook for Bash (git commit/add)
#
# Blocks git commits if staged files contain secret patterns:
# - API keys (sk-, AKIA, xoxb-, rk_live_, re_)
# - Private keys (-----BEGIN)
# - Bearer tokens
# - .env.local files
# - Supabase service role keys
#
# Exit 0 = allow, Exit 2 = block
# ============================================================================

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

# Only check git commit and git add commands
if ! echo "$COMMAND" | grep -qE 'git\s+(commit|add)'; then
    exit 0
fi

# Block committing .env.local directly
if echo "$COMMAND" | grep -qE '\.env\.local'; then
    echo "BLOCKED: Never commit .env.local. Use scripts/vault.sh to encrypt secrets into .env.vault instead." >&2
    exit 2
fi

# For git commit, check staged files for secrets
if echo "$COMMAND" | grep -qE 'git\s+commit'; then
    cd "$PROJECT_DIR" 2>/dev/null || exit 0

    # Get staged file contents
    STAGED_DIFF=$(git diff --cached --diff-filter=ACMR 2>/dev/null)

    if [[ -z "$STAGED_DIFF" ]]; then
        exit 0
    fi

    # Check for secret patterns in staged changes (added lines only)
    ADDED_LINES=$(echo "$STAGED_DIFF" | grep '^+' | grep -v '^+++')

    FINDINGS=""

    # AWS access keys
    if echo "$ADDED_LINES" | grep -qE 'AKIA[0-9A-Z]{16}'; then
        FINDINGS="$FINDINGS\n  - AWS Access Key (AKIA...)"
    fi

    # Anthropic API keys
    if echo "$ADDED_LINES" | grep -qE 'sk-ant-[a-zA-Z0-9_-]{20,}'; then
        FINDINGS="$FINDINGS\n  - Anthropic API Key (sk-ant-...)"
    fi

    # OpenAI API keys (sk- prefix, 48+ alphanumeric chars, NOT sk-ant)
    if echo "$ADDED_LINES" | grep -E 'sk-[a-zA-Z0-9]{48,}' | grep -qv 'sk-ant'; then
        FINDINGS="$FINDINGS\n  - Possible OpenAI API Key (sk-...)"
    fi

    # Resend API keys
    if echo "$ADDED_LINES" | grep -qE 're_[a-zA-Z0-9]{20,}'; then
        FINDINGS="$FINDINGS\n  - Resend API Key (re_...)"
    fi

    # Stripe keys
    if echo "$ADDED_LINES" | grep -qE '(sk_live_|rk_live_|pk_live_)[a-zA-Z0-9]{20,}'; then
        FINDINGS="$FINDINGS\n  - Stripe Live Key"
    fi

    # Slack tokens
    if echo "$ADDED_LINES" | grep -qE 'xox[bpras]-[a-zA-Z0-9-]{20,}'; then
        FINDINGS="$FINDINGS\n  - Slack Token (xox...)"
    fi

    # Private keys
    if echo "$ADDED_LINES" | grep -qE '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY'; then
        FINDINGS="$FINDINGS\n  - Private Key (PEM format)"
    fi

    # Supabase service role key (JWT format, long)
    if echo "$ADDED_LINES" | grep -qE 'eyJ[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{50,}'; then
        # Only flag if it looks like it's being assigned (not in a comment or test)
        if echo "$ADDED_LINES" | grep -qE '(SERVICE_ROLE|service.role|supabase).*eyJ'; then
            FINDINGS="$FINDINGS\n  - Possible Supabase Service Role Key (JWT)"
        fi
    fi

    # Generic Bearer token assignment
    if echo "$ADDED_LINES" | grep -qE "Bearer\s+['\"][a-zA-Z0-9_.-]{20,}['\"]"; then
        FINDINGS="$FINDINGS\n  - Hardcoded Bearer token"
    fi

    # Absolute local paths (privacy — no developer home dirs in git)
    if echo "$ADDED_LINES" | grep -qE '/Users/[a-zA-Z]+/|/home/[a-zA-Z]+/|C:\\\\Users\\\\'; then
        # Exclude comments and documentation about paths
        REAL_PATH_LEAKS=$(echo "$ADDED_LINES" | grep -E '/Users/[a-zA-Z]+/|/home/[a-zA-Z]+/' | grep -v "^+.*#\|^+.*//\|^+.*\*\|FIXED\|example\|placeholder" | head -3)
        if [[ -n "$REAL_PATH_LEAKS" ]]; then
            FINDINGS="$FINDINGS\n  - Absolute local path detected (use relative paths or env vars instead)"
        fi
    fi

    # Check if .env.local is being staged
    STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
    if echo "$STAGED_FILES" | grep -qE '\.env\.local$'; then
        FINDINGS="$FINDINGS\n  - .env.local file staged for commit"
    fi
    if echo "$STAGED_FILES" | grep -qE '\.env$'; then
        FINDINGS="$FINDINGS\n  - .env file staged for commit"
    fi

    if [[ -n "$FINDINGS" ]]; then
        cat >&2 <<EOF
BLOCKED: Potential secrets detected in staged changes.

Findings:$FINDINGS

Actions:
1. Remove the secret from your code
2. Use scripts/vault.sh to manage secrets securely
3. If this is a false positive, review the pattern and confirm it's safe

Never commit API keys, tokens, or private keys to git.
EOF
        exit 2
    fi
fi

exit 0
