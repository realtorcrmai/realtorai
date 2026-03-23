#!/usr/bin/env bash
# save-state.sh — snapshot current known-good project state
# Output: .claude-state.json in project root

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_FILE="$PROJECT_ROOT/.claude-state.json"
ENV_FILE="$PROJECT_ROOT/.env.local"

# Git info
GIT_COMMIT=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Migrations
MIGRATION_DIR="$PROJECT_ROOT/supabase/migrations"
MIGRATION_COUNT=$(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
LATEST_MIGRATION=$(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort | tail -1 | xargs basename 2>/dev/null || echo "none")

# node_modules hash (hash of package-lock.json as proxy)
if [ -f "$PROJECT_ROOT/package-lock.json" ]; then
  NODE_MODULES_HASH=$(md5 -q "$PROJECT_ROOT/package-lock.json" 2>/dev/null || md5sum "$PROJECT_ROOT/package-lock.json" | awk '{print $1}')
else
  NODE_MODULES_HASH="unknown"
fi

# Env vars count (non-blank, non-comment lines)
ENV_VARS_COUNT=0
if [ -f "$ENV_FILE" ]; then
  ENV_VARS_COUNT=$(grep -v '^#' "$ENV_FILE" | grep -v '^[[:space:]]*$' | wc -l | tr -d ' ')
fi

# Supabase contacts count via REST API
CONTACTS_COUNT=0
if [ -f "$ENV_FILE" ]; then
  SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
  SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"')
  if [ -n "$SUPABASE_URL" ] && [ -n "$SERVICE_ROLE_KEY" ]; then
    CONTACTS_COUNT=$(curl -sf \
      -H "apikey: $SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Prefer: count=exact" \
      -o /dev/null -D - \
      "$SUPABASE_URL/rest/v1/contacts?select=id" 2>/dev/null \
      | grep -i 'content-range:' | grep -oE '[0-9]+$' || echo "0")
  fi
fi

# Build time from .next/BUILD_ID mtime
BUILD_TIME="unknown"
if [ -f "$PROJECT_ROOT/.next/BUILD_ID" ]; then
  BUILD_TIME=$(stat -f '%Sm' -t '%Y-%m-%dT%H:%M:%SZ' "$PROJECT_ROOT/.next/BUILD_ID" 2>/dev/null \
    || stat -c '%y' "$PROJECT_ROOT/.next/BUILD_ID" 2>/dev/null | sed 's/ /T/;s/ .*/Z/' \
    || echo "unknown")
fi

# Netlify deploy ID from .netlify/state.json
NETLIFY_DEPLOY_ID="unknown"
if [ -f "$PROJECT_ROOT/.netlify/state.json" ]; then
  NETLIFY_DEPLOY_ID=$(node -e "const s=require('$PROJECT_ROOT/.netlify/state.json'); console.log(s.siteId || s.deployId || 'unknown')" 2>/dev/null || echo "unknown")
fi

TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

node -e "
const state = {
  timestamp: '$TIMESTAMP',
  git_commit: '$GIT_COMMIT',
  git_branch: '$GIT_BRANCH',
  migration_count: parseInt('$MIGRATION_COUNT') || 0,
  latest_migration: '$LATEST_MIGRATION',
  node_modules_hash: '$NODE_MODULES_HASH',
  env_vars_count: parseInt('$ENV_VARS_COUNT') || 0,
  contacts_count: parseInt('$CONTACTS_COUNT') || 0,
  build_time: '$BUILD_TIME',
  netlify_deploy_id: '$NETLIFY_DEPLOY_ID',
  qa_pass_count: null,
  qa_fail_count: null,
  qa_run_time: null
};
console.log(JSON.stringify(state, null, 2));
" > "$STATE_FILE"

echo "State saved to $STATE_FILE"
cat "$STATE_FILE"
