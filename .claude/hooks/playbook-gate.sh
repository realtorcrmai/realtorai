#!/bin/bash
# ============================================================================
# Playbook Enforcement Gate — PreToolUse hook for Edit/Write
#
# Blocks source code edits unless:
# 1. A task classification file (.claude/current-task.json) exists
# 2. Required playbook phases for the task's tier are marked complete
# 3. The file being edited is listed in the "affected" array
#
# Exit 0 = allow, Exit 2 = block (stderr sent as feedback to Claude)
# ============================================================================

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')

# If we can't determine the file path, allow (safety fallback)
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# ── EXEMPT FILES (always allowed, no classification needed) ──────────────

# Allow writes to .claude/ directory (classification file, compliance log, hooks, settings)
if [[ "$FILE_PATH" == *"/.claude/"* ]]; then
    exit 0
fi

# Allow writes to docs/ directory (PRDs, specs, gap analyses, templates)
if [[ "$FILE_PATH" == *"/docs/"* ]]; then
    exit 0
fi

# Allow writes to non-source files (markdown, json, env, config, yaml, toml, txt)
EXT="${FILE_PATH##*.}"
case "$EXT" in
    md|json|env|yaml|yml|toml|txt|css|html|lock|log|gitignore)
        exit 0
        ;;
esac

# Allow writes outside the project directory (memory files, etc.)
if [[ -n "$PROJECT_DIR" && "$FILE_PATH" != "$PROJECT_DIR"* ]]; then
    exit 0
fi

# ── SOURCE CODE FILES — REQUIRE CLASSIFICATION ──────────────────────────

# Source code extensions that require classification
case "$EXT" in
    ts|tsx|js|jsx|py|sql|sh|mjs|cjs)
        ;; # Continue to check
    *)
        exit 0  # Unknown extension, allow
        ;;
esac

# ── CHECK CLASSIFICATION FILE ───────────────────────────────────────────

TASK_FILE=""
if [[ -n "$PROJECT_DIR" ]]; then
    TASK_FILE="$PROJECT_DIR/.claude/current-task.json"
else
    TASK_FILE=".claude/current-task.json"
fi

if [[ ! -f "$TASK_FILE" ]]; then
    cat >&2 <<'BLOCK'
BLOCKED: No task classification found.

Before editing source code, you must classify the task by writing .claude/current-task.json:

{
  "tier": "micro|small|medium|large",
  "type": "CODING:feature|CODING:bugfix|...",
  "affected": ["src/file1.ts", "src/file2.tsx"],
  "phases": {
    "classified": true,
    "scope": false,
    "downside_check": false,
    "plan": false,
    "plan_approved": false,
    "validated": false,
    "compliance_logged": false
  },
  "created_at": "2026-03-30T10:00:00Z"
}

Follow the playbook at .claude/agent-playbook.md — classify first, then code.
BLOCK
    exit 2
fi

# ── CHECK REQUIRED PHASES FOR TIER ──────────────────────────────────────

TIER=$(jq -r '.tier // empty' "$TASK_FILE")
CLASSIFIED=$(jq -r '.phases.classified // false' "$TASK_FILE")
SCOPE=$(jq -r '.phases.scope // false' "$TASK_FILE")
DOWNSIDE=$(jq -r '.phases.downside_check // false' "$TASK_FILE")
PLAN=$(jq -r '.phases.plan // false' "$TASK_FILE")
PLAN_APPROVED=$(jq -r '.phases.plan_approved // false' "$TASK_FILE")

if [[ "$CLASSIFIED" != "true" ]]; then
    echo "BLOCKED: Task classified but phases.classified is not true. Update .claude/current-task.json." >&2
    exit 2
fi

case "$TIER" in
    micro)
        # Micro: only classification needed — already checked above
        ;;
    small)
        if [[ "$SCOPE" != "true" ]]; then
            echo "BLOCKED: Small tier requires scope phase. Write your scope paragraph, then set phases.scope=true in .claude/current-task.json." >&2
            exit 2
        fi
        if [[ "$DOWNSIDE" != "true" ]]; then
            echo "BLOCKED: Small tier requires downside check. Answer Q1-Q3 (What do we lose? What if wrong? What assumptions?), then set phases.downside_check=true in .claude/current-task.json." >&2
            exit 2
        fi
        ;;
    medium)
        if [[ "$SCOPE" != "true" ]]; then
            echo "BLOCKED: Medium tier requires scope phase. Write your scope, then set phases.scope=true in .claude/current-task.json." >&2
            exit 2
        fi
        if [[ "$DOWNSIDE" != "true" ]]; then
            echo "BLOCKED: Medium tier requires downside check. Answer Q1-Q5 (all 5 questions), then set phases.downside_check=true in .claude/current-task.json." >&2
            exit 2
        fi
        if [[ "$PLAN" != "true" ]]; then
            echo "BLOCKED: Medium tier requires plan phase. Write your numbered plan, then set phases.plan=true in .claude/current-task.json." >&2
            exit 2
        fi
        ;;
    large)
        if [[ "$SCOPE" != "true" ]]; then
            echo "BLOCKED: Large tier requires scope phase. Write scope first." >&2
            exit 2
        fi
        if [[ "$DOWNSIDE" != "true" ]]; then
            echo "BLOCKED: Large tier requires downside check. Answer Q1-Q5 + mitigations, present to user, then set phases.downside_check=true in .claude/current-task.json." >&2
            exit 2
        fi
        if [[ "$PLAN" != "true" ]]; then
            echo "BLOCKED: Large tier requires plan phase. Write plan first." >&2
            exit 2
        fi
        if [[ "$PLAN_APPROVED" != "true" ]]; then
            echo "BLOCKED: Large tier requires user approval of the plan. Present your plan to the user and get explicit approval, then set phases.plan_approved=true in .claude/current-task.json." >&2
            exit 2
        fi
        ;;
    *)
        echo "BLOCKED: Invalid tier '$TIER' in .claude/current-task.json. Must be micro|small|medium|large." >&2
        exit 2
        ;;
esac

# ── CHECK FILE IS IN AFFECTED LIST ──────────────────────────────────────

# Extract just the relative path for matching
REL_PATH="$FILE_PATH"
if [[ -n "$PROJECT_DIR" ]]; then
    REL_PATH="${FILE_PATH#$PROJECT_DIR/}"
fi

AFFECTED_COUNT=$(jq -r '.affected | length' "$TASK_FILE" 2>/dev/null)

# If affected list exists and has entries, check the file is in it
if [[ -n "$AFFECTED_COUNT" && "$AFFECTED_COUNT" -gt 0 ]]; then
    # Check exact match or directory prefix match (affected entry ends with /)
    IN_SCOPE=$(jq -r --arg file "$REL_PATH" '.affected | map(select(
        . == $file or
        (endswith("/") and ($file | startswith(.)))
    )) | length' "$TASK_FILE")
    if [[ "$IN_SCOPE" == "0" ]]; then
        # Also check with absolute path
        IN_SCOPE_ABS=$(jq -r --arg file "$FILE_PATH" '.affected | map(select(
            . == $file or
            (endswith("/") and ($file | startswith(.)))
        )) | length' "$TASK_FILE")
        if [[ "$IN_SCOPE_ABS" == "0" ]]; then
            AFFECTED_LIST=$(jq -r '.affected | join(", ")' "$TASK_FILE")
            cat >&2 <<EOF
BLOCKED: File not in scope.

You're trying to edit: $REL_PATH
But your classified affected files are: $AFFECTED_LIST

Either:
1. This file should be in scope — update the "affected" array in .claude/current-task.json
2. This file is out of scope — you may be expanding beyond your task. Re-classify if needed.
EOF
            exit 2
        fi
    fi
fi

# ── ALL CHECKS PASSED ──────────────────────────────────────────────────

exit 0
