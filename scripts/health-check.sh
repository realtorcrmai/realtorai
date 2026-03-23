#!/usr/bin/env bash
# health-check.sh — ListingFlow project health check
# Safe to run anytime. Idempotent. Read-only (no mutations).

set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.local"
ISSUES=0

# ── helpers ───────────────────────────────────────────────────────────────────
pass()  { echo "  ✅ $1"; }
fail()  { echo "  ❌ $1"; ISSUES=$((ISSUES + 1)); }
warn()  { echo "  ⚠️  $1"; }
header(){ echo ""; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; echo "  $1"; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }

# Source env vars silently (values stay in memory, never printed)
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   ListingFlow Health Check           ║"
echo "║   $(date '+%Y-%m-%d %H:%M:%S')               ║"
echo "╚══════════════════════════════════════╝"

# ── 1. GIT STATUS ─────────────────────────────────────────────────────────────
header "1. GIT STATUS"

cd "$PROJECT_DIR"

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "UNKNOWN")
echo "  Branch: $BRANCH"

MODIFIED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

if [[ "$MODIFIED" -eq 0 && "$STAGED" -eq 0 && "$UNTRACKED" -eq 0 ]]; then
  pass "Working tree clean"
else
  warn "Uncommitted changes — staged: $STAGED  modified: $MODIFIED  untracked: $UNTRACKED"
fi

# Ahead/behind vs origin
if git remote get-url origin &>/dev/null; then
  AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "?")
  BEHIND=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "?")
  if [[ "$AHEAD" == "0" && "$BEHIND" == "0" ]]; then
    pass "In sync with origin ($BRANCH)"
  elif [[ "$AHEAD" != "0" ]]; then
    warn "Ahead of origin by $AHEAD commit(s) — push needed"
  else
    warn "Behind origin by $BEHIND commit(s) — pull recommended"
  fi
else
  warn "No origin remote configured"
fi

echo "  Last 3 commits:"
git log --oneline -3 2>/dev/null | while IFS= read -r line; do echo "    $line"; done

# Origin reachability
if git fetch --dry-run 2>/dev/null; then
  pass "Origin reachable (git fetch --dry-run)"
else
  warn "Origin not reachable (offline or auth issue)"
fi

# ── 2. ENVIRONMENT ─────────────────────────────────────────────────────────────
header "2. ENVIRONMENT"

if [[ ! -f "$ENV_FILE" ]]; then
  fail ".env.local not found at $ENV_FILE"
else
  pass ".env.local exists"
fi

REQUIRED_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  NEXTAUTH_URL
  NEXTAUTH_SECRET
  ANTHROPIC_API_KEY
  RESEND_API_KEY
  RESEND_FROM_EMAIL
  CRON_SECRET
  DEMO_EMAIL
  DEMO_PASSWORD
  NEXT_PUBLIC_APP_URL
)

for var in "${REQUIRED_VARS[@]}"; do
  val="${!var:-}"
  if [[ -n "$val" ]]; then
    pass "$var is set"
  else
    fail "$var is MISSING or empty"
  fi
done

# node_modules
if [[ -d "$PROJECT_DIR/node_modules" ]]; then
  pass "node_modules exists"
else
  fail "node_modules missing — run: npm install"
fi

# Node version
if command -v node &>/dev/null; then
  NODE_VER=$(node --version | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [[ "$NODE_MAJOR" -ge 20 ]]; then
    pass "Node.js v$NODE_VER (>= 20 required)"
  else
    fail "Node.js v$NODE_VER is too old — v20+ required"
  fi
else
  fail "node not found in PATH"
fi

# ── 3. DATABASE ────────────────────────────────────────────────────────────────
header "3. DATABASE"

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SVC_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$SUPABASE_URL" || -z "$SVC_KEY" ]]; then
  fail "Supabase credentials not set — skipping DB checks"
else
  # Ping REST API
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 8 \
    -H "apikey: $SVC_KEY" \
    -H "Authorization: Bearer $SVC_KEY" \
    "$SUPABASE_URL/rest/v1/" 2>/dev/null || echo "000")

  if [[ "$HTTP_STATUS" == "200" ]]; then
    pass "Supabase REST API reachable (HTTP $HTTP_STATUS)"
  else
    fail "Supabase REST API returned HTTP $HTTP_STATUS (expected 200)"
  fi

  # Check key tables exist
  KEY_TABLES=(contacts listings appointments newsletters contact_journeys workflows offers activities agent_recommendations)
  for table in "${KEY_TABLES[@]}"; do
    RESP=$(curl -s -o /dev/null -w "%{http_code}" \
      --max-time 8 \
      -H "apikey: $SVC_KEY" \
      -H "Authorization: Bearer $SVC_KEY" \
      -H "Range: 0-0" \
      "$SUPABASE_URL/rest/v1/$table?limit=1" 2>/dev/null || echo "000")
    if [[ "$RESP" == "200" || "$RESP" == "206" ]]; then
      pass "Table '$table' exists"
    else
      fail "Table '$table' — unexpected HTTP $RESP (missing or RLS issue)"
    fi
  done

  # Count rows in contacts
  CONTACTS_JSON=$(curl -s \
    --max-time 8 \
    -H "apikey: $SVC_KEY" \
    -H "Authorization: Bearer $SVC_KEY" \
    -H "Prefer: count=exact" \
    -H "Range: 0-0" \
    -D - \
    "$SUPABASE_URL/rest/v1/contacts?select=id" 2>/dev/null || echo "")
  CONTACT_COUNT=$(echo "$CONTACTS_JSON" | grep -i "content-range:" | grep -oE '[0-9]+$' || echo "?")
  if [[ "$CONTACT_COUNT" != "?" && "$CONTACT_COUNT" -gt 0 ]]; then
    pass "contacts table has $CONTACT_COUNT row(s)"
  elif [[ "$CONTACT_COUNT" == "0" ]]; then
    warn "contacts table is empty — seed data may be missing"
  else
    warn "Could not determine contacts row count"
  fi
fi

# ── 4. BUILD ───────────────────────────────────────────────────────────────────
header "4. BUILD"

BUILD_ID_FILE="$PROJECT_DIR/.next/BUILD_ID"
if [[ -f "$BUILD_ID_FILE" ]]; then
  BUILD_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BUILD_ID_FILE" 2>/dev/null || \
               stat -c "%y" "$BUILD_ID_FILE" 2>/dev/null | cut -d. -f1 || echo "unknown")
  BUILD_ID=$(cat "$BUILD_ID_FILE" 2>/dev/null || echo "unknown")
  pass ".next build exists (built: $BUILD_DATE, id: $BUILD_ID)"

  # Check if build is older than latest commit
  LAST_COMMIT_TS=$(git log -1 --format="%ct" 2>/dev/null || echo "0")
  BUILD_TS=$(stat -f "%m" "$BUILD_ID_FILE" 2>/dev/null || \
             stat -c "%Y" "$BUILD_ID_FILE" 2>/dev/null || echo "0")
  if [[ "$BUILD_TS" -ge "$LAST_COMMIT_TS" ]]; then
    pass "Build is current (newer than latest commit)"
  else
    warn "Build is stale — last commit is newer than last build"
  fi
else
  warn ".next directory missing — run: npm run build"
fi

# TypeScript error count (src/ only, exclude backup dirs)
echo "  Checking TypeScript errors in src/ (this may take ~15s)..."
if [[ -f "$PROJECT_DIR/tsconfig.json" ]] && command -v npx &>/dev/null; then
  TSC_OUT=$(cd "$PROJECT_DIR" && npx tsc --noEmit 2>&1 || true)
  TS_ERRORS=$(echo "$TSC_OUT" | grep -E "^src/.*error TS|error TS[0-9]+" | wc -l | tr -d ' ')
  if [[ "$TS_ERRORS" == "0" ]]; then
    pass "No TypeScript errors in src/"
  else
    fail "$TS_ERRORS TypeScript error(s) detected — run: npx tsc --noEmit"
  fi
else
  warn "TypeScript check skipped (tsconfig.json or npx not found)"
fi

# ── 5. DEV SERVER ──────────────────────────────────────────────────────────────
header "5. DEV SERVER"

# Check if localhost:3000 actually responds (regardless of what process owns it)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "307" || "$HTTP_CODE" == "302" || "$HTTP_CODE" == "308" ]]; then
  # Verify it's a Next.js server by checking response headers
  SERVER_HEADER=$(curl -s -I --max-time 5 http://localhost:3000 2>/dev/null | grep -i "x-powered-by\|server:" | head -1 || echo "")
  pass "localhost:3000 responds (HTTP $HTTP_CODE) — $SERVER_HEADER"
elif [[ "$HTTP_CODE" == "000" ]]; then
  warn "Nothing listening on port 3000 — run: npm run dev"
else
  warn "localhost:3000 returned HTTP $HTTP_CODE"
fi

# Show which process owns port 3000 (informational)
PORT_PIDS=$(lsof -ti:3000 2>/dev/null | tr '\n' ' ' || echo "")
if [[ -n "$PORT_PIDS" ]]; then
  for pid in $PORT_PIDS; do
    PROC_CMD=$(ps -p "$pid" -o args= 2>/dev/null | cut -c1-80 || echo "unknown")
    echo "    pid $pid: $PROC_CMD"
  done
fi

# ── 6. DEPLOY (Netlify) ────────────────────────────────────────────────────────
header "6. DEPLOY (Netlify)"

NETLIFY_SITE_ID="2f3b530e-0a8d-46db-ae0c-b9ff87b1d2b9"
NETLIFY_CONFIG="$HOME/Library/Preferences/netlify/config.json"

if command -v netlify &>/dev/null; then
  NETLIFY_VER=$(netlify --version 2>/dev/null | head -1 || echo "unknown")
  pass "Netlify CLI available ($NETLIFY_VER)"
else
  warn "Netlify CLI not installed (npm i -g netlify-cli)"
fi

if [[ -f "$NETLIFY_CONFIG" ]]; then
  NETLIFY_TOKEN=$(python3 -c "
import json, sys
try:
    d = json.load(open('$NETLIFY_CONFIG'))
    u = d.get('users', {})
    for uid, udata in u.items():
        tok = udata.get('auth', {}).get('token', '')
        if tok:
            print(tok)
            break
except:
    pass
" 2>/dev/null || echo "")

  if [[ -n "$NETLIFY_TOKEN" ]]; then
    DEPLOY_JSON=$(curl -s --max-time 10 \
      -H "Authorization: Bearer $NETLIFY_TOKEN" \
      "https://api.netlify.com/api/v1/sites/$NETLIFY_SITE_ID/deploys?per_page=1" 2>/dev/null || echo "[]")

    DEPLOY_STATE=$(python3 -c "
import json, sys
try:
    data = json.loads('''$DEPLOY_JSON''')
    if data and isinstance(data, list):
        d = data[0]
        print(d.get('state','unknown'))
except:
    print('parse_error')
" 2>/dev/null || echo "error")

    DEPLOY_URL=$(python3 -c "
import json, sys
try:
    data = json.loads('''$DEPLOY_JSON''')
    if data and isinstance(data, list):
        d = data[0]
        print(d.get('ssl_url', d.get('url', 'unknown')))
except:
    print('unknown')
" 2>/dev/null || echo "unknown")

    DEPLOY_TIME=$(python3 -c "
import json, sys
try:
    data = json.loads('''$DEPLOY_JSON''')
    if data and isinstance(data, list):
        d = data[0]
        print(d.get('created_at','unknown'))
except:
    print('unknown')
" 2>/dev/null || echo "unknown")

    if [[ "$DEPLOY_STATE" == "ready" ]]; then
      pass "Latest deploy: $DEPLOY_STATE — $DEPLOY_URL"
      echo "    Deployed at: $DEPLOY_TIME"
    elif [[ "$DEPLOY_STATE" == "building" || "$DEPLOY_STATE" == "enqueued" ]]; then
      warn "Deploy in progress: $DEPLOY_STATE"
    elif [[ "$DEPLOY_STATE" == "error" ]]; then
      fail "Latest deploy failed — check Netlify dashboard"
    else
      warn "Deploy state: $DEPLOY_STATE — $DEPLOY_URL"
    fi
  else
    warn "Netlify auth token not found in config.json — run: netlify login"
  fi
else
  warn "Netlify config not found at $NETLIFY_CONFIG — run: netlify login"
fi

# ── 7. MIGRATIONS ──────────────────────────────────────────────────────────────
header "7. MIGRATIONS"

MIGRATION_DIR="$PROJECT_DIR/supabase/migrations"
if [[ -d "$MIGRATION_DIR" ]]; then
  TOTAL_MIGRATIONS=$(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | wc -l | tr -d ' ')
  pass "$TOTAL_MIGRATIONS migration file(s) in supabase/migrations/"

  # Latest migration file
  LATEST_MIG=$(ls -t "$MIGRATION_DIR"/*.sql 2>/dev/null | head -1)
  LATEST_MIG_NAME=$(basename "$LATEST_MIG" 2>/dev/null || echo "none")
  echo "    Latest: $LATEST_MIG_NAME"

  # Check if any migration is newer than the build
  if [[ -f "$BUILD_ID_FILE" ]]; then
    BUILD_TS2=$(stat -f "%m" "$BUILD_ID_FILE" 2>/dev/null || \
                stat -c "%Y" "$BUILD_ID_FILE" 2>/dev/null || echo "0")
    NEW_MIGS=$(find "$MIGRATION_DIR" -name "*.sql" -newer "$BUILD_ID_FILE" 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$NEW_MIGS" -gt 0 ]]; then
      warn "$NEW_MIGS migration(s) are newer than the last build — schema may have changed"
    else
      pass "All migrations predate last build"
    fi
  fi
else
  fail "supabase/migrations/ directory not found"
fi

# ── SUMMARY ────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
if [[ "$ISSUES" -eq 0 ]]; then
  echo "  🟢 ALL CLEAR — ready to work"
else
  echo "  🔴 $ISSUES issue(s) found — fix before proceeding"
fi
echo "══════════════════════════════════════════"
echo ""
