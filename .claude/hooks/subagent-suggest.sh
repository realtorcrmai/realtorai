#!/bin/bash
# ============================================================================
# Subagent Suggestion — PostToolUse hook for Edit/Write
#
# Detects patterns in changed files and suggests the appropriate reviewer.
# Does NOT block — just prints a suggestion for the agent to see.
#
# Exit 0 always (advisory only)
# ============================================================================

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')

# Skip if no file path
[[ -z "$FILE_PATH" ]] && exit 0

# Only check source files
case "$FILE_PATH" in
    *.ts|*.tsx|*.sql) ;;
    *) exit 0 ;;
esac

BASENAME=$(basename "$FILE_PATH")
DIRPATH=$(dirname "$FILE_PATH")

SUGGESTIONS=""

# Security reviewer triggers
case "$FILE_PATH" in
    */auth.ts|*/auth/*|*middleware*)
        SUGGESTIONS="$SUGGESTIONS security-reviewer (auth file changed);"
        ;;
esac

case "$FILE_PATH" in
    */webhooks/*|*/api/cron/*)
        SUGGESTIONS="$SUGGESTIONS security-reviewer (webhook/cron endpoint changed);"
        ;;
esac

case "$FILE_PATH" in
    */supabase/migrations/*|*.sql)
        SUGGESTIONS="$SUGGESTIONS migration-reviewer (SQL migration changed);"
        ;;
esac

# Check file content for sensitive patterns (only for .ts/.tsx)
if [[ -f "$FILE_PATH" ]] && [[ "$FILE_PATH" == *.ts || "$FILE_PATH" == *.tsx ]]; then
    # RLS or policy changes
    if grep -qE 'ROW LEVEL SECURITY|CREATE POLICY|supabaseAdmin' "$FILE_PATH" 2>/dev/null; then
        SUGGESTIONS="$SUGGESTIONS security-reviewer (RLS/admin client usage);"
    fi

    # AI prompt construction
    if grep -qE 'anthropic\.messages\.create|messages\.create|system.*prompt' "$FILE_PATH" 2>/dev/null; then
        SUGGESTIONS="$SUGGESTIONS security-reviewer (AI prompt — check for PII leakage);"
    fi

    # User input processing
    if grep -qE 'dangerouslySetInnerHTML|innerHTML|\.rpc\(' "$FILE_PATH" 2>/dev/null; then
        SUGGESTIONS="$SUGGESTIONS security-reviewer (potential injection vector);"
    fi
fi

# Deduplicate suggestions
if [[ -n "$SUGGESTIONS" ]]; then
    # Remove duplicate reviewer names
    UNIQUE=$(echo "$SUGGESTIONS" | tr ';' '\n' | sort -u | grep -v '^$' | tr '\n' ',' | sed 's/,$//')
    echo "[Subagent] Consider spawning:$UNIQUE"
fi

exit 0
