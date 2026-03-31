#!/bin/bash
# ============================================================================
# Auto-Lint — PostToolUse hook for Edit/Write
#
# After any source code edit, runs ESLint --fix on the changed file.
# Non-blocking (exit 0 always) — auto-fixes what it can, reports rest.
# ============================================================================

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

# Only process source files
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

EXT="${FILE_PATH##*.}"
case "$EXT" in
    ts|tsx|js|jsx|mjs|cjs)
        ;; # Continue
    *)
        exit 0
        ;;
esac

# Skip files outside project
if [[ -n "$PROJECT_DIR" && "$FILE_PATH" != "$PROJECT_DIR"* ]]; then
    exit 0
fi

# Run ESLint --fix (non-blocking — always exit 0)
cd "$PROJECT_DIR" 2>/dev/null || exit 0
npx eslint --fix "$FILE_PATH" 2>/dev/null

exit 0
