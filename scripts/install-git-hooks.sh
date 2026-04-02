#!/bin/bash
# ============================================================================
# Install Git Hooks — Run once after cloning the repo
#
# Sets up pre-commit hook that enforces playbook rules at git level.
# Works for ALL developers regardless of AI tool used.
#
# Usage: bash scripts/install-git-hooks.sh
# ============================================================================

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [[ -z "$REPO_ROOT" ]]; then
    echo "❌ Not inside a git repository"
    exit 1
fi

HOOKS_DIR="$REPO_ROOT/.git/hooks"
mkdir -p "$HOOKS_DIR"

cat > "$HOOKS_DIR/pre-commit" << 'HOOK'
#!/bin/bash
# Realtors360 Pre-Commit Hook — Playbook Enforcement
# Installed by: bash scripts/install-git-hooks.sh

STAGED_DIFF=$(git diff --cached --diff-filter=ACMR 2>/dev/null)
ADDED_LINES=$(echo "$STAGED_DIFF" | grep '^+' | grep -v '^+++')
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)

ERRORS=""

# 1. Block absolute local paths
if echo "$ADDED_LINES" | grep -qE '/Users/[a-zA-Z]+/|/home/[a-zA-Z]+/|C:\\Users\\'; then
    # Exclude comments and docs
    REAL_PATHS=$(echo "$ADDED_LINES" | grep -E '/Users/[a-zA-Z]+/|/home/[a-zA-Z]+/' | grep -v "^+.*#\|^+.*//\|^+.*\*\|FIXED\|example" | head -1)
    if [[ -n "$REAL_PATHS" ]]; then
        ERRORS="$ERRORS\n  ❌ Absolute local path detected — use relative paths or env vars"
    fi
fi

# 2. Block .env.local
if echo "$STAGED_FILES" | grep -qE '\.env\.local$'; then
    ERRORS="$ERRORS\n  ❌ .env.local staged — use scripts/vault.sh to encrypt"
fi

# 3. Block common secret patterns
if echo "$ADDED_LINES" | grep -qE 'sk-ant-[a-zA-Z0-9_-]{20,}'; then
    ERRORS="$ERRORS\n  ❌ Anthropic API key detected in staged changes"
fi
if echo "$ADDED_LINES" | grep -qE 'AKIA[0-9A-Z]{16}'; then
    ERRORS="$ERRORS\n  ❌ AWS access key detected in staged changes"
fi

# 4. Block push to main/dev (shouldn't happen in pre-commit, but safety check)
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" == "main" || "$BRANCH" == "dev" ]]; then
    ERRORS="$ERRORS\n  ⚠️  Committing directly to $BRANCH — use a feature branch"
fi

if [[ -n "$ERRORS" ]]; then
    echo ""
    echo "╔══════════════════════════════════════════════╗"
    echo "║  Realtors360 Playbook — Pre-Commit Check     ║"
    echo "╠══════════════════════════════════════════════╣"
    echo -e "║$ERRORS"
    echo "╚══════════════════════════════════════════════╝"
    echo ""
    echo "Fix the issues above, then commit again."
    echo "See .claude/agent-playbook.md for full rules."
    exit 1
fi

exit 0
HOOK

chmod +x "$HOOKS_DIR/pre-commit"
echo "✅ Pre-commit hook installed at $HOOKS_DIR/pre-commit"
echo "   Enforces: no local paths, no secrets, no .env.local, branch check"
