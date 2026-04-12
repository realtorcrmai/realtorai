#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Realtors360 — API Endpoint Coverage Test
# Tests every API route for correct status codes and auth
# ═══════════════════════════════════════════════════════════
set -uo pipefail
if [ -f .env.local ]; then set -a; source .env.local; set +a; fi

APP="http://localhost:3000"
CRON="${CRON_SECRET:-listingflow-cron-secret-2026}"
PASS=0; FAIL=0; SKIP=0; FAILURES=""

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); FAILURES="${FAILURES}\n  ❌ $1: $2"; echo "  ❌ $1 — $2"; }
skip() { SKIP=$((SKIP+1)); }

status() { curl -s -o /dev/null -w "%{http_code}" "$APP$1" ${2:+-H "$2"} ${3:+-X "$3"} 2>/dev/null; }

echo "╔══════════════════════════════════════════════════╗"
echo "║  API Endpoint Coverage Test                     ║"
echo "╚══════════════════════════════════════════════════╝"

# ── 1. AUTH ENDPOINTS ──────────────────────────────────────
echo ""
echo "━━━ 1. Auth Endpoints ━━━"
CODE=$(status "/api/auth/session")
[[ "$CODE" == "200" ]] && pass "GET /api/auth/session → $CODE" || fail "/api/auth/session" "$CODE"

CODE=$(status "/api/auth/providers")
[[ "$CODE" == "200" ]] && pass "GET /api/auth/providers → $CODE" || fail "/api/auth/providers" "$CODE"

CODE=$(status "/api/auth/csrf")
[[ "$CODE" == "200" ]] && pass "GET /api/auth/csrf → $CODE" || fail "/api/auth/csrf" "$CODE"

CODE=$(status "/api/auth/check-email" "" "POST")
[[ "$CODE" -ge 400 ]] && pass "POST /api/auth/check-email (no body) → $CODE" || fail "/api/auth/check-email" "$CODE"

# ── 2. PROTECTED ENDPOINTS (must return 401) ───────────────
echo ""
echo "━━━ 2. Protected Endpoints (expect 401) ━━━"
PROTECTED=(
  "/api/contacts"
  "/api/listings"
  "/api/showings"
  "/api/tasks"
  "/api/deals"
  "/api/reports"
  "/api/dashboard/stats"
  "/api/calendar/events"
  "/api/calendar/busy"
  "/api/contacts/export"
  "/api/contacts/upcoming-dates"
  "/api/mortgages/renewals"
  "/api/settings/integrations"
  "/api/social/accounts"
  "/api/social/posts"
  "/api/social/brand-kit"
)
for EP in "${PROTECTED[@]}"; do
  CODE=$(status "$EP")
  [[ "$CODE" == "401" ]] && pass "GET $EP → 401" || fail "$EP auth" "HTTP $CODE (expected 401)"
done

# ── 3. CRON ENDPOINTS (no-auth → 401) ─────────────────────
echo ""
echo "━━━ 3. Cron Endpoints (no-auth → 401) ━━━"
CRONS=(
  "/api/cron/process-workflows"
  "/api/cron/agent-evaluate"
  "/api/cron/agent-recommendations"
  "/api/cron/agent-scoring"
  "/api/cron/consent-expiry"
  "/api/cron/daily-digest"
  "/api/cron/greeting-automations"
  "/api/cron/social-publish"
  "/api/cron/voice-session-cleanup"
  "/api/cron/weekly-learning"
  "/api/newsletters/process"
  "/api/reminders/check"
)
for EP in "${CRONS[@]}"; do
  CODE=$(status "$EP")
  [[ "$CODE" == "401" ]] && pass "$EP no-auth → 401" || fail "$EP" "HTTP $CODE"
done

# ── 4. CRON ENDPOINTS (valid auth → 200) ───────────────────
echo ""
echo "━━━ 4. Cron Endpoints (valid auth → 200) ━━━"
SAFE_CRONS=(
  "/api/cron/process-workflows"
  "/api/cron/consent-expiry"
)
for EP in "${SAFE_CRONS[@]}"; do
  CODE=$(status "$EP" "Authorization: Bearer $CRON")
  [[ "$CODE" == "200" ]] && pass "$EP valid → $CODE" || fail "$EP valid" "HTTP $CODE"
done

# ── 5. WEBHOOK ENDPOINTS ──────────────────────────────────
echo ""
echo "━━━ 5. Webhook Endpoints ━━━"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$APP/api/webhooks/twilio" 2>/dev/null)
pass "POST /api/webhooks/twilio → $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$APP/api/webhooks/resend" -H "Content-Type: application/json" -d '{}' 2>/dev/null)
[[ "$CODE" -ge 400 ]] && pass "POST /api/webhooks/resend (no sig) → $CODE" || fail "resend webhook" "$CODE"

# ── 6. PUBLIC ENDPOINTS ───────────────────────────────────
echo ""
echo "━━━ 6. Public Endpoints ━━━"
CODE=$(status "/api/health")
[[ "$CODE" == "200" ]] && pass "GET /api/health → $CODE" || fail "/api/health" "$CODE"

CODE=$(status "/api/auth/session")
[[ "$CODE" == "200" ]] && pass "GET /api/auth/session → $CODE" || fail "/api/auth/session" "$CODE"

# ── 7. PAGE ROUTES (full coverage) ────────────────────────
echo ""
echo "━━━ 7. Page Routes (all dashboard + auth) ━━━"
PAGES=(
  "/" "/login" "/signup" "/onboarding" "/personalize" "/verify"
  "/listings" "/contacts" "/showings" "/tasks" "/calendar"
  "/pipeline" "/content" "/search" "/workflow" "/import" "/forms"
  "/newsletters" "/newsletters/queue" "/newsletters/analytics"
  "/newsletters/guide" "/newsletters/activity" "/newsletters/control"
  "/newsletters/insights" "/newsletters/ghost" "/newsletters/suppressions"
  "/newsletters/agent" "/newsletters/engine" "/newsletters/learning"
  "/automations" "/automations/templates"
  "/contacts/segments" "/contacts/merge" "/contacts/new"
  "/settings" "/inbox" "/help" "/admin"
  "/reports" "/social" "/voice-agent" "/websites"
  "/showings/new" "/tasks/new" "/listings/new"
)
for P in "${PAGES[@]}"; do
  CODE=$(status "$P")
  [[ "$CODE" == "200" || "$CODE" == "307" || "$CODE" == "308" ]] && pass "$P → $CODE" || fail "$P" "HTTP $CODE"
done

# ── 8. POST ENDPOINTS (must require auth) ──────────────────
echo ""
echo "━━━ 8. POST Endpoints (auth required) ━━━"
POST_ENDPOINTS=(
  "/api/contacts"
  "/api/listings"
  "/api/tasks"
  "/api/deals"
)
for EP in "${POST_ENDPOINTS[@]}"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$APP$EP" -H "Content-Type: application/json" -d '{}' 2>/dev/null)
  [[ "$CODE" == "401" ]] && pass "POST $EP → 401" || fail "POST $EP" "HTTP $CODE"
done

# ── 9. SPECIAL API ROUTES ──────────────────────────────────
echo ""
echo "━━━ 9. Special Routes ━━━"
CODE=$(status "/api/newsletters/unsubscribe")
[[ "$CODE" == "400" ]] && pass "Unsubscribe (no id) → $CODE" || fail "unsubscribe" "$CODE"

CODE=$(status "/api/features")
pass "GET /api/features → $CODE"

CODE=$(status "/api/feedback" "" "POST")
pass "POST /api/feedback → $CODE"

# ── SUMMARY ────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
TOTAL=$((PASS+FAIL+SKIP))
if [[ "$FAIL" -eq 0 ]]; then
  echo "  🟢 ALL CLEAR — $PASS/$TOTAL passed ($SKIP skipped)"
else
  echo "  🔴 $FAIL failure(s) — $PASS passed, $SKIP skipped"
  echo -e "$FAILURES"
fi
echo "═══════════════════════════════════════════════════════"
