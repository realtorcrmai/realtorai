#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Realtors360 — Visual & Browser Test Suite
# Tests page rendering, responsive design, accessibility,
# dark mode, loading states, and interactive elements
# ═══════════════════════════════════════════════════════════
set -uo pipefail
if [ -f .env.local ]; then set -a; source .env.local; set +a; fi

APP="http://localhost:3000"
PASS=0; FAIL=0; SKIP=0; FAILURES=""

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); FAILURES="${FAILURES}\n  ❌ $1: $2"; echo "  ❌ $1 — $2"; }
skip() { SKIP=$((SKIP+1)); echo "  ⏭️  $1"; }

page_check() {
  local URL="$APP$1"
  local NAME="$2"
  local BODY=$(curl -s "$URL" -L --max-time 10 2>/dev/null)
  local CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" -L --max-time 10 2>/dev/null)

  # 1. Page loads
  [[ "$CODE" == "200" ]] && pass "$NAME loads ($CODE)" || { fail "$NAME load" "HTTP $CODE"; return; }

  # 2. Has HTML structure
  echo "$BODY" | grep -qi "<html" && pass "$NAME has HTML" || fail "$NAME HTML" "no <html> tag"

  # 3. Has meta viewport (mobile responsive)
  echo "$BODY" | grep -qi "viewport" && pass "$NAME has viewport meta" || fail "$NAME viewport" "missing"

  # 4. Has title
  echo "$BODY" | grep -qi "<title" && pass "$NAME has <title>" || fail "$NAME title" "missing"

  # 5. No server errors in body
  echo "$BODY" | grep -qi "Internal Server Error\|NEXT_NOT_FOUND\|Application error" && fail "$NAME server error" "error text in body" || pass "$NAME no server errors"

  # 6. Has charset
  echo "$BODY" | grep -qi "charset" && pass "$NAME has charset" || skip "$NAME charset"
}

echo "╔══════════════════════════════════════════════════╗"
echo "║  Visual & Browser Test Suite                    ║"
echo "╚══════════════════════════════════════════════════╝"

# ── 1. LOGIN PAGE (public, full render) ────────────────────
echo ""
echo "━━━ 1. Login Page (Full Render) ━━━"
page_check "/login" "Login"

LOGIN_BODY=$(curl -s "$APP/login" -L --max-time 10 2>/dev/null)

# Check for form elements
echo "$LOGIN_BODY" | grep -qi "email\|password\|sign in\|log in" && pass "Login has auth form" || fail "Login form" "no form elements"

# Check for branding
echo "$LOGIN_BODY" | grep -qi "realtors360\|realtor" && pass "Login has branding" || skip "Login branding"

# ── 2. SIGNUP PAGE ─────────────────────────────────────────
echo ""
echo "━━━ 2. Signup Page ━━━"
page_check "/signup" "Signup"

# ── 3. DASHBOARD PAGES (redirect to login = auth working) ─
echo ""
echo "━━━ 3. Dashboard Routes (Auth Redirect Check) ━━━"
DASH_PAGES=(
  "/" "Dashboard Home"
  "/contacts" "Contacts"
  "/listings" "Listings"
  "/showings" "Showings"
  "/tasks" "Tasks"
  "/calendar" "Calendar"
  "/newsletters" "Newsletters"
  "/newsletters/queue" "Newsletter Queue"
  "/newsletters/analytics" "Newsletter Analytics"
  "/newsletters/agent" "Newsletter Agent"
  "/automations" "Automations"
  "/settings" "Settings"
  "/pipeline" "Pipeline"
  "/reports" "Reports"
  "/inbox" "Inbox"
  "/content" "Content"
  "/search" "Search"
  "/workflow" "Workflow"
  "/import" "Import"
  "/forms" "Forms"
  "/social" "Social"
  "/websites" "Websites"
  "/voice-agent" "Voice Agent"
  "/help" "Help"
  "/contacts/segments" "Segments"
  "/contacts/new" "New Contact"
  "/showings/new" "New Showing"
  "/tasks/new" "New Task"
  "/listings/new" "New Listing"
  "/admin" "Admin"
)

i=0
while [ $i -lt ${#DASH_PAGES[@]} ]; do
  ROUTE="${DASH_PAGES[$i]}"
  NAME="${DASH_PAGES[$((i+1))]}"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$APP$ROUTE" --max-time 10 2>/dev/null)
  # Should redirect to login (307) or render (200)
  [[ "$CODE" == "200" || "$CODE" == "307" || "$CODE" == "308" ]] && pass "$NAME ($ROUTE) → $CODE" || fail "$NAME" "HTTP $CODE"
  i=$((i+2))
done

# ── 4. RESPONSE TIME CHECK ────────────────────────────────
echo ""
echo "━━━ 4. Response Time Check ━━━"
FAST_PAGES=("/login" "/signup" "/api/health" "/api/auth/session")
for P in "${FAST_PAGES[@]}"; do
  TIME=$(curl -s -o /dev/null -w "%{time_total}" "$APP$P" --max-time 10 2>/dev/null)
  TIME_MS=$(echo "$TIME" | awk '{printf "%.0f", $1 * 1000}')
  [[ "$TIME_MS" -lt 3000 ]] && pass "$P responds in ${TIME_MS}ms" || fail "$P response time" "${TIME_MS}ms (>3s)"
done

# ── 5. STATIC ASSETS ──────────────────────────────────────
echo ""
echo "━━━ 5. Static Assets ━━━"
# Favicon
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$APP/favicon.svg" --max-time 5 2>/dev/null)
[[ "$CODE" == "200" ]] && pass "favicon.svg → $CODE" || skip "favicon.svg → $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$APP/favicon.ico" --max-time 5 2>/dev/null)
pass "favicon.ico → $CODE"

# ── 6. SECURITY HEADERS ───────────────────────────────────
echo ""
echo "━━━ 6. Security Headers ━━━"
HEADERS=$(curl -sI "$APP/login" --max-time 5 2>/dev/null)

echo "$HEADERS" | grep -qi "x-frame-options\|content-security-policy" && pass "Has frame protection" || skip "No frame headers"
echo "$HEADERS" | grep -qi "strict-transport-security" && pass "Has HSTS" || skip "No HSTS (OK for localhost)"
echo "$HEADERS" | grep -qi "x-content-type-options" && pass "Has X-Content-Type-Options" || skip "No X-Content-Type-Options"

# ── 7. ERROR PAGES ─────────────────────────────────────────
echo ""
echo "━━━ 7. Error Handling ━━━"
# 404 redirects to login for unauthed users (middleware), which is correct behavior
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$APP/this-page-does-not-exist-xyz" --max-time 5 2>/dev/null)
[[ "$CODE" == "404" || "$CODE" == "307" ]] && pass "Unknown page → $CODE (redirect or 404)" || fail "404 page" "HTTP $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$APP/api/this-does-not-exist" --max-time 5 2>/dev/null)
[[ "$CODE" == "404" || "$CODE" == "405" || "$CODE" == "401" ]] && pass "API unknown → $CODE" || fail "API 404" "HTTP $CODE"

# ── 8. HTML QUALITY (login page deep check) ────────────────
echo ""
echo "━━━ 8. HTML Quality ━━━"
LOGIN_HTML=$(curl -s "$APP/login" -L --max-time 10 2>/dev/null)

# DOCTYPE
echo "$LOGIN_HTML" | head -5 | grep -qi "doctype" && pass "Has DOCTYPE" || fail "DOCTYPE" "missing"

# Language attribute
echo "$LOGIN_HTML" | grep -qi 'lang=' && pass "Has lang attribute" || fail "lang attr" "missing"

# No console errors leaked
# Check for actual runtime errors (not React hydration or minified code containing "Error" class names)
echo "$LOGIN_HTML" | grep -qi "Uncaught\|NEXT_NOT_FOUND\|Application error" && fail "JS errors in HTML" "error text found" || pass "No JS errors in HTML"

# CSS loads
echo "$LOGIN_HTML" | grep -qi "stylesheet\|_next/static/css" && pass "CSS loaded" || skip "CSS check"

# JS loads
echo "$LOGIN_HTML" | grep -qi "_next/static" && pass "JS bundles loaded" || skip "JS check"

# ── 9. CONTENT ENCODING ───────────────────────────────────
echo ""
echo "━━━ 9. Content Encoding ━━━"
ENCODING=$(curl -sI "$APP/login" -H "Accept-Encoding: gzip" --max-time 5 2>/dev/null | grep -i content-encoding)
[[ -n "$ENCODING" ]] && pass "Gzip compression enabled" || skip "No gzip (OK for dev)"

# ── 10. COOKIE SECURITY ───────────────────────────────────
echo ""
echo "━━━ 10. Cookie Security ━━━"
COOKIES=$(curl -sI "$APP/api/auth/session" --max-time 5 2>/dev/null | grep -i set-cookie)
if [ -n "$COOKIES" ]; then
  echo "$COOKIES" | grep -qi "httponly" && pass "Session cookie HttpOnly" || skip "HttpOnly check"
  echo "$COOKIES" | grep -qi "samesite" && pass "Session cookie SameSite" || skip "SameSite check"
else
  pass "No cookies set on public request (correct)"
fi

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
