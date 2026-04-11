#!/usr/bin/env bash
# ============================================================
# ListingFlow — Comprehensive Test Suite
# Run: bash scripts/test-suite.sh
# Covers: Navigation, API, CRUD, Constraints, Auth, Cascade
# Skips: Third-party integrations (Twilio, Resend, Kling, Google)
# ============================================================

set -euo pipefail

# Load env
if [ -f .env.local ]; then
  set -a; source .env.local; set +a
fi

BASE="${NEXT_PUBLIC_SUPABASE_URL}"
KEY="${SUPABASE_SERVICE_ROLE_KEY}"
APP="http://localhost:3000"
PASS=0
FAIL=0
SKIP=0
FAILURES=""

# ── Helpers ─────────────────────────────────────────────────
pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); FAILURES="${FAILURES}\n  ❌ $1: $2"; echo "  ❌ $1 — $2"; }
skip() { SKIP=$((SKIP+1)); echo "  ⏭️  $1 — skipped ($2)"; }

api_get() {
  curl -s "$BASE/rest/v1/$1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
}

api_post() {
  curl -s -w "\n%{http_code}" "$BASE/rest/v1/$1" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$2"
}

api_patch() {
  curl -s -w "\n%{http_code}" "$BASE/rest/v1/$1" \
    -X PATCH -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d "$2"
}

api_delete() {
  curl -s -w "\n%{http_code}" "$BASE/rest/v1/$1" \
    -X DELETE -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
}

http_status() {
  curl -s -o /dev/null -w "%{http_code}" "$1"
}

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   ListingFlow Test Suite             ║"
echo "║   $(date '+%Y-%m-%d %H:%M:%S')               ║"
echo "╚══════════════════════════════════════╝"

# ── 1. NAVIGATION TESTS ────────────────────────────────────
echo ""
echo "━━━ 1. NAVIGATION (Page Routes) ━━━"

ROUTES=(
  "/" "/listings" "/contacts" "/showings" "/tasks" "/calendar"
  "/pipeline" "/content" "/search" "/workflow" "/import" "/forms"
  "/forms/templates" "/newsletters" "/newsletters/queue"
  "/newsletters/analytics" "/newsletters/guide" "/newsletters/activity"
  "/newsletters/control" "/newsletters/insights" "/newsletters/ghost"
  "/newsletters/suppressions" "/automations" "/automations/templates"
  "/contacts/segments" "/settings" "/inbox" "/login"
  "/signup" "/personalize" "/onboarding"
)

for route in "${ROUTES[@]}"; do
  code=$(http_status "${APP}${route}")
  if [[ "$code" == "200" || "$code" == "307" ]]; then
    pass "$route → $code"
  else
    fail "$route" "HTTP $code"
  fi
done

# Dynamic routes — need real IDs
LISTING_ID=$(api_get "listings?select=id&limit=1" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)
CONTACT_ID=$(api_get "contacts?select=id&limit=1" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)
SHOWING_ID=$(api_get "appointments?select=id&limit=1" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)

for pair in "listings/$LISTING_ID" "contacts/$CONTACT_ID" "contacts/${CONTACT_ID}?tab=intelligence" "contacts/${CONTACT_ID}?tab=activity" "contacts/${CONTACT_ID}?tab=deals" "showings/$SHOWING_ID" "pipeline/$LISTING_ID"; do
  code=$(http_status "${APP}/${pair}")
  if [[ "$code" == "200" || "$code" == "307" ]]; then
    pass "/${pair} → $code"
  else
    fail "/${pair}" "HTTP $code"
  fi
done

# ── 2. API ENDPOINT TESTS ──────────────────────────────────
echo ""
echo "━━━ 2. API ENDPOINTS ━━━"

# API routes require auth cookies — test that they enforce auth (401) and that
# exempt routes work without auth
for ep in "api/contacts" "api/listings" "api/showings" "api/tasks"; do
  code=$(http_status "${APP}/${ep}")
  if [[ "$code" == "401" ]]; then pass "GET /$ep requires auth → 401"
  elif [[ "$code" == "200" ]]; then pass "GET /$ep → 200 (session active)"
  else fail "GET /$ep" "HTTP $code (expected 401 or 200)"; fi
done

# Exempt routes should work without auth
code=$(http_status "${APP}/api/auth/session")
if [[ "$code" == "200" ]]; then pass "GET /api/auth/session → 200"
else fail "GET /api/auth/session" "HTTP $code"; fi

# ── 3. CRUD TESTS ──────────────────────────────────────────
echo ""
echo "━━━ 3. CRUD OPERATIONS ━━━"

# -- Contacts --
echo "  --- Contacts ---"
RESULT=$(api_post "contacts" '{"name":"QA Test Contact","phone":"+16045559999","type":"buyer","pref_channel":"sms"}')
CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
if [[ "$CODE" == "201" ]]; then
  CID=$(echo "$BODY" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)
  pass "Create contact ($CID)"

  # Update
  UCODE=$(api_patch "contacts?id=eq.$CID" '{"name":"QA Updated"}' | tail -1)
  [[ "$UCODE" == "204" ]] && pass "Update contact" || fail "Update contact" "HTTP $UCODE"

  # Delete
  DCODE=$(api_delete "contacts?id=eq.$CID" | tail -1)
  [[ "$DCODE" == "204" ]] && pass "Delete contact" || fail "Delete contact" "HTTP $DCODE"
else
  fail "Create contact" "HTTP $CODE"
fi

# -- Listings --
echo "  --- Listings ---"
SELLER_ID=$(api_get "contacts?select=id&type=eq.seller&limit=1" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)
RESULT=$(api_post "listings" "{\"address\":\"999 QA Test St, Vancouver\",\"seller_id\":\"$SELLER_ID\",\"lockbox_code\":\"TEST123\",\"status\":\"active\",\"list_price\":500000}")
CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
if [[ "$CODE" == "201" ]]; then
  LID=$(echo "$BODY" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)
  pass "Create listing ($LID)"
  UCODE=$(api_patch "listings?id=eq.$LID" '{"list_price":550000}' | tail -1)
  [[ "$UCODE" == "204" ]] && pass "Update listing" || fail "Update listing" "HTTP $UCODE"
  DCODE=$(api_delete "listings?id=eq.$LID" | tail -1)
  [[ "$DCODE" == "204" ]] && pass "Delete listing" || fail "Delete listing" "HTTP $DCODE"
else
  fail "Create listing" "HTTP $CODE — $(echo "$BODY" | head -1)"
fi

# -- Tasks --
echo "  --- Tasks ---"
RESULT=$(api_post "tasks" '{"title":"QA Test Task","status":"pending","priority":"high"}')
CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
if [[ "$CODE" == "201" ]]; then
  TID=$(echo "$BODY" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)
  pass "Create task ($TID)"
  UCODE=$(api_patch "tasks?id=eq.$TID" '{"status":"completed"}' | tail -1)
  [[ "$UCODE" == "204" ]] && pass "Update task" || fail "Update task" "HTTP $UCODE"
  DCODE=$(api_delete "tasks?id=eq.$TID" | tail -1)
  [[ "$DCODE" == "204" ]] && pass "Delete task" || fail "Delete task" "HTTP $DCODE"
else
  fail "Create task" "HTTP $CODE"
fi

# -- Deals --
echo "  --- Deals ---"
RESULT=$(api_post "deals" "{\"title\":\"QA Test Deal\",\"type\":\"buyer\",\"stage\":\"new_lead\",\"contact_id\":\"$CONTACT_ID\"}")
CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
if [[ "$CODE" == "201" ]]; then
  DID=$(echo "$BODY" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)
  pass "Create deal ($DID)"
  UCODE=$(api_patch "deals?id=eq.$DID" '{"stage":"qualified"}' | tail -1)
  [[ "$UCODE" == "204" ]] && pass "Update deal" || fail "Update deal" "HTTP $UCODE"
  DCODE=$(api_delete "deals?id=eq.$DID" | tail -1)
  [[ "$DCODE" == "204" ]] && pass "Delete deal" || fail "Delete deal" "HTTP $DCODE"
else
  fail "Create deal" "HTTP $CODE"
fi

# -- Households --
echo "  --- Households ---"
RESULT=$(api_post "households" '{"name":"QA Test Family","address":"123 Test St"}')
CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
if [[ "$CODE" == "201" ]]; then
  HID=$(echo "$BODY" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)
  pass "Create household ($HID)"
  DCODE=$(api_delete "households?id=eq.$HID" | tail -1)
  [[ "$DCODE" == "204" ]] && pass "Delete household" || fail "Delete household" "HTTP $DCODE"
else
  fail "Create household" "HTTP $CODE"
fi

# -- Communications --
echo "  --- Communications ---"
RESULT=$(api_post "communications" "{\"contact_id\":\"$CONTACT_ID\",\"direction\":\"outbound\",\"channel\":\"sms\",\"body\":\"QA test message\"}")
CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | sed '$d')
if [[ "$CODE" == "201" ]]; then
  COMMID=$(echo "$BODY" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)
  pass "Create communication ($COMMID)"
  DCODE=$(api_delete "communications?id=eq.$COMMID" | tail -1)
  [[ "$DCODE" == "204" ]] && pass "Delete communication" || fail "Delete communication" "HTTP $DCODE"
else
  fail "Create communication" "HTTP $CODE"
fi

# ── 4. DATA INTEGRITY CONSTRAINTS ──────────────────────────
echo ""
echo "━━━ 4. DATA INTEGRITY CONSTRAINTS ━━━"

# Contact without name
CODE=$(api_post "contacts" '{"phone":"+16045550000","type":"buyer","pref_channel":"sms"}' | tail -1)
[[ "$CODE" == "400" || "$CODE" == "409" ]] && pass "Reject contact without name" || fail "Contact without name" "HTTP $CODE (expected 400)"

# Invalid contact type
CODE=$(api_post "contacts" '{"name":"Bad Type","phone":"+16045550001","type":"invalid","pref_channel":"sms"}' | tail -1)
[[ "$CODE" == "400" || "$CODE" == "409" ]] && pass "Reject invalid contact type" || fail "Invalid contact type" "HTTP $CODE"

# Invalid appointment status
CODE=$(api_post "appointments" "{\"listing_id\":\"$LISTING_ID\",\"buyer_agent_name\":\"Test\",\"buyer_agent_phone\":\"+1604555000\",\"start_time\":\"2026-04-01T10:00:00Z\",\"end_time\":\"2026-04-01T11:00:00Z\",\"status\":\"bogus\"}" | tail -1)
[[ "$CODE" == "400" || "$CODE" == "409" ]] && pass "Reject invalid appointment status" || fail "Invalid apt status" "HTTP $CODE"

# Self-relationship
CODE=$(api_post "contact_relationships" "{\"contact_a_id\":\"$CONTACT_ID\",\"contact_b_id\":\"$CONTACT_ID\",\"relationship_type\":\"friend\"}" | tail -1)
[[ "$CODE" == "400" || "$CODE" == "409" ]] && pass "Reject self-relationship" || fail "Self-relationship" "HTTP $CODE"

# Deal with no listing or contact
CODE=$(api_post "deals" '{"title":"Orphan Deal","type":"buyer","stage":"new_lead"}' | tail -1)
[[ "$CODE" == "400" || "$CODE" == "409" ]] && pass "Reject deal without listing/contact" || fail "Orphan deal" "HTTP $CODE"

# Counter-offer without parent
CODE=$(api_post "offers" "{\"listing_id\":\"$LISTING_ID\",\"buyer_contact_id\":\"$CONTACT_ID\",\"offer_amount\":500000,\"is_counter_offer\":true,\"status\":\"draft\"}" | tail -1)
[[ "$CODE" == "400" || "$CODE" == "409" ]] && pass "Reject counter-offer without parent" || fail "Orphan counter-offer" "HTTP $CODE"

# ── 5. CRON + AUTH TESTS ───────────────────────────────────
echo ""
echo "━━━ 5. CRON + AUTH ━━━"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP}/api/cron/process-workflows" -H "Authorization: Bearer ${CRON_SECRET}")
[[ "$CODE" == "200" ]] && pass "Cron process-workflows (valid token) → 200" || fail "Cron process-workflows" "HTTP $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP}/api/cron/process-workflows")
[[ "$CODE" == "401" ]] && pass "Cron process-workflows (no token) → 401" || fail "Cron no-auth" "HTTP $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP}/api/cron/agent-scoring")
[[ "$CODE" == "401" ]] && pass "Cron agent-scoring (no token) → 401" || fail "Cron scoring no-auth" "HTTP $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP}/api/cron/agent-scoring" -H "Authorization: Bearer wrong-token")
[[ "$CODE" == "401" ]] && pass "Cron agent-scoring (wrong token) → 401" || fail "Cron scoring wrong-auth" "HTTP $CODE"

# ── 5B. EXTENDED CRON AUTH (all cron endpoints must reject no-token) ───
echo ""
echo "━━━ 5B. EXTENDED CRON AUTH ━━━"

# Test every cron endpoint rejects requests without valid token
CRON_ENDPOINTS="agent-evaluate agent-recommendations consent-expiry daily-digest greeting-automations social-publish voice-session-cleanup weekly-learning welcome-drip trial-expiry"
for ENDPOINT in $CRON_ENDPOINTS; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP}/api/cron/${ENDPOINT}")
  [[ "$CODE" == "401" ]] && pass "Cron ${ENDPOINT} (no token) → 401" || fail "Cron ${ENDPOINT} no-auth" "HTTP $CODE (expected 401)"
done

# newsletters/process and reminders/check (cron-like endpoints)
CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP}/api/newsletters/process")
[[ "$CODE" == "401" ]] && pass "newsletters/process (no token) → 401" || fail "newsletters/process no-auth" "HTTP $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP}/api/reminders/check")
[[ "$CODE" == "401" ]] && pass "reminders/check (no token) → 401" || fail "reminders/check no-auth" "HTTP $CODE"

# ── 5C. API AUTH ENFORCEMENT ───────────────────────────────
echo ""
echo "━━━ 5C. API AUTH ENFORCEMENT ━━━"

# Verify user-facing endpoints require auth (return 401 without session)
API_ENDPOINTS="deals reports dashboard/stats tasks/bulk-complete onboarding/checklist"
for ENDPOINT in $API_ENDPOINTS; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP}/api/${ENDPOINT}")
  [[ "$CODE" == "401" ]] && pass "GET /api/${ENDPOINT} requires auth → 401" || fail "/api/${ENDPOINT} auth" "HTTP $CODE"
done

# POST endpoints also require auth
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${APP}/api/deals" -H "Content-Type: application/json" -d '{"title":"Test"}')
[[ "$CODE" == "401" ]] && pass "POST /api/deals requires auth → 401" || fail "POST /api/deals auth" "HTTP $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${APP}/api/listings" -H "Content-Type: application/json" -d '{"address":"Test"}')
[[ "$CODE" == "401" ]] && pass "POST /api/listings requires auth → 401" || fail "POST /api/listings auth" "HTTP $CODE"

# ── 6. CASCADE DELETE TEST ─────────────────────────────────
echo ""
echo "━━━ 6. CASCADE DELETE ━━━"

# Create contact + communication, delete contact, verify comm gone
RESULT=$(api_post "contacts" '{"name":"Cascade Test","phone":"+16045558888","type":"buyer","pref_channel":"sms"}')
CASCADE_CID=$(echo "$RESULT" | sed '$d' | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))[0]?.id || '')" 2>/dev/null)
api_post "communications" "{\"contact_id\":\"$CASCADE_CID\",\"direction\":\"outbound\",\"channel\":\"sms\",\"body\":\"Cascade test\"}" > /dev/null 2>&1
api_delete "contacts?id=eq.$CASCADE_CID" > /dev/null 2>&1
REMAINING=$(api_get "communications?contact_id=eq.$CASCADE_CID&select=id" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).length)" 2>/dev/null)
[[ "$REMAINING" == "0" ]] && pass "Cascade delete: contact → communications" || fail "Cascade delete" "$REMAINING communications remain"

# ── 7. SAMPLE DATA VALIDATION ──────────────────────────────
echo ""
echo "━━━ 7. SAMPLE DATA VALIDATION ━━━"

# Property type diversity
PTYPES=$(api_get "listings?select=property_type" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const t=new Set(d.map(l=>l.property_type));
console.log(t.size);
" 2>/dev/null)
[[ "$PTYPES" -ge 3 ]] && pass "Listing property types: $PTYPES distinct types" || fail "Property type diversity" "Only $PTYPES types"

# Status diversity
STATUSES=$(api_get "listings?select=status" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const t=new Set(d.map(l=>l.status));
console.log(t.size);
" 2>/dev/null)
[[ "$STATUSES" -ge 3 ]] && pass "Listing statuses: $STATUSES distinct" || fail "Status diversity" "Only $STATUSES"

# Pref channel diversity
CHANNELS=$(api_get "contacts?select=pref_channel" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const t=new Set(d.map(c=>c.pref_channel));
console.log(t.size);
" 2>/dev/null)
[[ "$CHANNELS" -ge 3 ]] && pass "Contact pref_channels: $CHANNELS distinct" || fail "Channel diversity" "Only $CHANNELS"

# CASL consent
CASL=$(api_get "contacts?select=casl_consent_given&casl_consent_given=eq.true" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).length)" 2>/dev/null)
TOTAL=$(api_get "contacts?select=id" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).length)" 2>/dev/null)
[[ "$CASL" == "$TOTAL" ]] && pass "CASL consent: $CASL/$TOTAL contacts" || fail "CASL consent" "$CASL/$TOTAL"

# Households
HH=$(api_get "contacts?select=id&household_id=not.is.null" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).length)" 2>/dev/null)
[[ "$HH" -ge 10 ]] && pass "Contacts in households: $HH" || fail "Household coverage" "Only $HH"

# Relationships
RELS=$(api_get "contact_relationships?select=relationship_type" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const t=new Set(d.map(r=>r.relationship_type));
console.log(d.length+':'+t.size);
" 2>/dev/null)
REL_COUNT=$(echo "$RELS" | cut -d: -f1)
REL_TYPES=$(echo "$RELS" | cut -d: -f2)
[[ "$REL_COUNT" -ge 10 && "$REL_TYPES" -ge 4 ]] && pass "Relationships: $REL_COUNT across $REL_TYPES types" || fail "Relationships" "$REL_COUNT rels, $REL_TYPES types"

# ── SUMMARY ────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
TOTAL=$((PASS+FAIL+SKIP))
if [[ "$FAIL" -eq 0 ]]; then
  echo "  🟢 ALL CLEAR — $PASS/$TOTAL passed ($SKIP skipped)"
else
  echo "  🔴 $FAIL failure(s) — $PASS passed, $SKIP skipped"
  echo ""
  echo "  Failures:"
  echo -e "$FAILURES"
fi
echo "══════════════════════════════════════════"

exit $FAIL
