# Test Skill — ListingFlow CRM

Run this skill after every build, deploy, or significant code change. It validates the entire application works correctly.

## How to Run

Execute all test phases in order. Stop and fix any failures before proceeding to the next phase.

## Phase 1: Build Verification

```bash
cd "/Users/bigbear/reality crm/realestate-crm"
npm run build
```

**Pass criteria:** Exit code 0, no TypeScript errors, all pages compiled.

If build fails:
- Read the error message and fix the source file
- Re-run build until it passes
- Do NOT skip build errors

## Phase 2: Server Health

```bash
# Kill any existing server
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

# Start dev server
cd "/Users/bigbear/reality crm/realestate-crm"
npm run dev &>/tmp/test-server.log &

# Wait for ready
for i in $(seq 1 20); do
  grep -q "Ready in" /tmp/test-server.log 2>/dev/null && break
  sleep 2
done

# Verify server responds
curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/api/auth/csrf
```

**Pass criteria:** Server starts, CSRF endpoint returns 200.

## Phase 3: Authentication

```bash
# Get CSRF token
CSRF=$(curl -s http://localhost:3000/api/auth/csrf --max-time 10 | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")

# Login with demo credentials
curl -s -c /tmp/test-cookies -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=${CSRF}&email=demo@realestatecrm.com&password=demo1234" \
  -o /dev/null -w "%{http_code}" --max-time 15

# Verify session
curl -s -b /tmp/test-cookies http://localhost:3000/api/auth/session --max-time 10
```

**Pass criteria:** Login returns 302, session contains user with role and enabledFeatures.

## Phase 4: API Endpoint Tests

Test each API endpoint returns valid responses:

```bash
# Contacts API
curl -s -b /tmp/test-cookies http://localhost:3000/api/contacts --max-time 10 | python3 -c "import sys,json; d=json.load(sys.stdin); print('Contacts:', len(d) if isinstance(d,list) else 'error')"

# Listings API
curl -s -b /tmp/test-cookies http://localhost:3000/api/listings --max-time 10 | python3 -c "import sys,json; d=json.load(sys.stdin); print('Listings:', len(d) if isinstance(d,list) else 'error')"

# Showings API
curl -s -b /tmp/test-cookies http://localhost:3000/api/showings --max-time 10 | python3 -c "import sys,json; d=json.load(sys.stdin); print('Showings:', len(d) if isinstance(d,list) else 'error')"

# Cron endpoint (with auth)
curl -s http://localhost:3000/api/cron/process-workflows -H "Authorization: Bearer listingflow-cron-secret-2026" --max-time 15 -o /dev/null -w "%{http_code}"
```

**Pass criteria:** All endpoints return data or 200 status.

## Phase 5: Browser Page Load Tests

Use Playwright to verify every major page loads without errors:

```javascript
// Run with: cd realestate-crm && npx playwright test tests/browser/smoke.spec.ts
const PAGES = [
  '/',                          // Dashboard
  '/contacts',                  // Contacts list
  '/listings',                  // Listings list
  '/showings',                  // Showings list
  '/calendar',                  // Calendar
  '/newsletters',               // Newsletter dashboard
  '/newsletters/queue',         // Approval queue
  '/newsletters/analytics',     // Analytics
  '/newsletters/control',       // Command center
  '/newsletters/guide',         // Walkthrough
  '/tasks',                     // Tasks
  '/pipeline',                  // Pipeline
];
```

For each page verify:
1. HTTP 200 response
2. No JavaScript console errors
3. Page has content (not blank)
4. Page is scrollable (if content exceeds viewport)

**Pass criteria:** All pages load with 200 status and no JS errors.

## Phase 6: Email Marketing Engine Tests

```bash
cd "/Users/bigbear/reality crm/realestate-crm"
RESEND_API_KEY=re_irQXbNRk_ERs9PMkpZu5nSHJGh7zeSKpM \
ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env.local | cut -d= -f2) \
CRON_SECRET=listingflow-cron-secret-2026 \
node scripts/qa-test-email-engine.mjs
```

**Pass criteria:** 27/28+ tests pass.

## Phase 7: Supabase Connection

```bash
cd "/Users/bigbear/reality crm/realestate-crm"
SUPABASE_ACCESS_TOKEN=sbp_43f6400e99eebed61cb31330c485c5c9932bc0c8 \
npx supabase db query --linked --output json \
  "SELECT count(*) as total FROM contacts"
```

**Pass criteria:** Query returns a count without errors.

## Phase 8: UX Scroll Verification

After deploy, verify scrolling works on all dashboard pages:

```javascript
// Playwright check
for (const path of PAGES) {
  await page.goto('http://localhost:3000' + path);
  const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
  const windowHeight = await page.evaluate(() => window.innerHeight);
  // If page has content taller than viewport, scroll must work
  if (bodyHeight > windowHeight + 50) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const scrolled = await page.evaluate(() => window.scrollY);
    assert(scrolled > 0, `${path} is not scrollable`);
  }
}
```

**Pass criteria:** All pages with overflow can scroll to bottom.

## Phase 9: Contact Form Validation

1. Open /contacts
2. Click "Add Contact"
3. Verify dialog opens
4. Submit empty form — should show validation errors
5. Fill name + phone + select buyer type
6. Verify buyer preferences section appears
7. Fill budget, area, property type
8. Submit — should succeed
9. Verify contact appears in list
10. Open contact detail — verify preferences shown

## Phase 10: Newsletter Journey Check

1. Verify new contact was auto-enrolled in journey (check contact_journeys table)
2. Verify welcome email draft was created (check newsletters table)
3. Check approval queue shows the draft
4. Check pipeline counts updated

## Results Reporting

After running all phases, output a summary:

```
═══════════════════════════════════════
TEST RESULTS — [date]
═══════════════════════════════════════
Phase 1 (Build):          PASS/FAIL
Phase 2 (Server):         PASS/FAIL
Phase 3 (Auth):           PASS/FAIL
Phase 4 (APIs):           PASS/FAIL (N/N endpoints)
Phase 5 (Pages):          PASS/FAIL (N/N pages)
Phase 6 (Email Engine):   PASS/FAIL (N/28 tests)
Phase 7 (Supabase):       PASS/FAIL
Phase 8 (UX Scroll):      PASS/FAIL
Phase 9 (Contact Form):   PASS/FAIL
Phase 10 (Journeys):      PASS/FAIL
═══════════════════════════════════════
OVERALL: PASS/FAIL
═══════════════════════════════════════
```

If any phase fails, stop and fix before deploying.
