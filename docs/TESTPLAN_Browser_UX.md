<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- docs-audit: tests/e2e/*, scripts/eval-browser* -->
<!-- last-verified: 2026-04-13 -->
# Browser & UX Test Plan — Realtors360 CRM

## Purpose

Catch every UX issue a real realtor would hit. No API-only testing — every test runs in a real browser via Playwright. Tests are grouped by severity: P0 (blocks usage), P1 (degrades experience), P2 (polish).

---

## Test Infrastructure

```bash
# Run all browser tests
npx playwright test tests/browser/

# Run specific suite
npx playwright test tests/browser/layout.spec.ts

# Run with visible browser
npx playwright test --headed

# Generate HTML report
npx playwright test --reporter=html
```

### Browsers
- Chromium (primary)
- WebKit (Safari — realtors use Macs)
- Mobile Chrome (375px viewport)

### Test Data Prerequisite
- 20 seeded contacts in various journey phases
- Newsletters in sent/draft/failed states
- Journey enrollments across all phases

---

## Suite 1: Page Load & Scroll (P0)

Every page must load and scroll. If a page can't scroll, it's broken.

| # | Test | Route | Assert |
|---|------|-------|--------|
| 1.1 | Dashboard loads | `/` | Status 200, h1 visible |
| 1.2 | Dashboard scrollable | `/` | scrollHeight > clientHeight OR content fits viewport |
| 1.3 | Listings loads | `/listings` | Status 200, listing cards visible |
| 1.4 | Listings scrollable | `/listings` | Can scroll to last listing |
| 1.5 | Contacts loads | `/contacts` | Status 200, contact rows visible |
| 1.6 | Contacts scrollable | `/contacts` | Can scroll to last contact |
| 1.7 | Showings loads | `/showings` | Status 200 |
| 1.8 | Calendar loads | `/calendar` | Status 200 |
| 1.9 | Content loads | `/content` | Status 200 |
| 1.10 | Newsletter dashboard loads | `/newsletters` | Status 200, stats visible |
| 1.11 | Newsletter dashboard scrollable | `/newsletters` | Can scroll to Recent Activity section |
| 1.12 | Approval queue loads | `/newsletters/queue` | Status 200 |
| 1.13 | Newsletter analytics loads | `/newsletters/analytics` | Status 200 |
| 1.14 | Newsletter analytics scrollable | `/newsletters/analytics` | Can scroll to Performance by Type table |
| 1.15 | Command center loads | `/newsletters/control` | Status 200, tabs visible |
| 1.16 | Command center scrollable | `/newsletters/control` | Can scroll within each tab |
| 1.17 | Newsletter guide loads | `/newsletters/guide` | Status 200, step content visible |
| 1.18 | Walkthrough opens in new tab | `/newsletters` → click Walkthrough | New tab opens at `/walkthrough/index.html` |
| 1.19 | Walkthrough scrollable | `/walkthrough/index.html` | Can scroll to footer |
| 1.20 | Tasks loads | `/tasks` | Status 200 |
| 1.21 | Pipeline loads | `/pipeline` | Status 200 |
| 1.22 | Search loads | `/search` | Status 200 |
| 1.23 | Settings loads | `/settings` | Status 200 |
| 1.24 | Admin loads (admin user) | `/admin` | Status 200 |

---

## Suite 2: Navigation (P0)

Every link and button must be clickable and go to the right place.

| # | Test | Action | Assert |
|---|------|--------|--------|
| 2.1 | Desktop nav — all items clickable | Click each nav pill | Navigates to correct route |
| 2.2 | Mobile nav — all items clickable | At 375px, click each bottom nav item | Navigates correctly |
| 2.3 | Dashboard tiles clickable | Click each feature tile | Navigates to correct route |
| 2.4 | Newsletter header buttons | Click Queue, Analytics, Command Center | Each navigates correctly |
| 2.5 | Walkthrough button opens new tab | Click Walkthrough on `/newsletters` | `target="_blank"` works |
| 2.6 | Back buttons work | Click back on queue, analytics, control | Returns to `/newsletters` |
| 2.7 | Breadcrumb/back links | Every sub-page has a way back | Not a dead end |
| 2.8 | Logo/brand click | Click Realtors360 logo | Goes to dashboard |
| 2.9 | 404 page | Navigate to `/nonexistent` | Shows 404, not blank |
| 2.10 | Auth redirect | Access `/newsletters` when logged out | Redirects to `/login` |

---

## Suite 3: Newsletter Dashboard (P0)

| # | Test | Action | Assert |
|---|------|--------|--------|
| 3.1 | Stats cards show data | Load `/newsletters` | 4 stat cards with numbers (not NaN, not undefined) |
| 3.2 | Pipeline shows phases | Load `/newsletters` | Buyer + Seller pipelines with 5 phases each |
| 3.3 | Pipeline numbers match DB | Compare UI numbers to `contact_journeys` query | Counts match |
| 3.4 | Pending approvals visible | Have draft newsletters | "Pending Approvals" card shows with count |
| 3.5 | Pending approvals hidden when empty | Delete all drafts | "Pending Approvals" card not rendered |
| 3.6 | Recent activity shows events | Have newsletter events | Events listed with correct icons |
| 3.7 | Empty state | No data at all | Helpful message, not blank/broken |
| 3.8 | Open rate color coding | Open rate > 40% | Shows green; < 40% shows amber |
| 3.9 | Click rate color coding | Click rate > 10% | Shows green; < 10% shows amber |

---

## Suite 4: Approval Queue (P0)

| # | Test | Action | Assert |
|---|------|--------|--------|
| 4.1 | Draft emails listed | Have draft newsletters | Each shows contact name, subject, type badge |
| 4.2 | Click email shows preview | Click a draft item | Preview panel opens with iframe showing HTML |
| 4.3 | Close preview | Click X on preview | Panel closes |
| 4.4 | Approve email | Click approve button | Email status changes to "sent", disappears from queue |
| 4.5 | Skip email | Click skip button | Email removed from queue |
| 4.6 | Bulk approve | Click "Approve All" | All emails sent, queue empties |
| 4.7 | Empty queue state | No draft emails | Shows "No pending emails" message |
| 4.8 | Badge shows correct type | Various email types | "market update", "new listing alert", etc. displayed |
| 4.9 | Contact name displayed | Email has contact_id | Contact name shown, not "Unknown" |
| 4.10 | Preview renders HTML correctly | Email with full HTML | Renders in iframe without errors |

---

## Suite 5: Command Center (P0)

| # | Test | Action | Assert |
|---|------|--------|--------|
| 5.1 | Default tab loads | Load `/newsletters/control` | First tab (Email Activity) visible |
| 5.2 | Tab switching works | Click each tab | Content changes, active tab highlighted |
| 5.3 | Email Activity tab | Click "Activity" tab | Sent/draft emails listed with status |
| 5.4 | Workflows tab | Click "Workflows" tab | Journey templates listed |
| 5.5 | Contact Journeys tab | Click "Contacts" tab | Contacts with phase, score, next email |
| 5.6 | Schedule tab | Click "Schedule" tab | Upcoming emails grouped by date |
| 5.7 | Tab content scrollable | Long list in any tab | Can scroll within tab content |
| 5.8 | Contact details expandable | Click a contact row | Shows email history, engagement details |
| 5.9 | Pause/resume journey | Click pause on active journey | Status changes to paused |
| 5.10 | Data matches DB | Compare UI to Supabase query | Counts, names, phases all match |

---

## Suite 6: Analytics (P1)

| # | Test | Action | Assert |
|---|------|--------|--------|
| 6.1 | Stats show correct numbers | Load `/newsletters/analytics` | Sent, opened, clicked counts match DB |
| 6.2 | Performance by type table | Have various email types sent | Table rows for each type with rates |
| 6.3 | Brand score calculation | Various engagement data | Score between 0-100, label matches range |
| 6.4 | Deliverability stats | Have sent emails | Delivered %, bounce %, complaint % shown |
| 6.5 | Zero data state | No newsletters sent | Shows zeros, not errors or NaN |
| 6.6 | Large numbers display | 1000+ emails | Numbers format correctly (not overflow) |

---

## Suite 7: Newsletter Guide / Walkthrough (P1)

| # | Test | Action | Assert |
|---|------|--------|--------|
| 7.1 | Guide loads step 1 | Load `/newsletters/guide` | Welcome step visible |
| 7.2 | Next button works | Click Next | Advances to step 2 |
| 7.3 | Previous button works | On step 2, click Previous | Returns to step 1 |
| 7.4 | Previous disabled on step 1 | On step 1 | Previous button disabled/dimmed |
| 7.5 | Step dots clickable | Click dot 4 | Jumps to step 4 |
| 7.6 | Progress bar updates | Navigate through steps | Bar width increases proportionally |
| 7.7 | Last step shows "Get Started" | Navigate to final step | "Get Started" link instead of Next |
| 7.8 | All 8 steps render | Click through all | No blank/error steps |
| 7.9 | Walkthrough HTML loads | Open `/walkthrough/index.html` | Full page with screenshots |
| 7.10 | Screenshots load | Open walkthrough | All 13 images load (no broken images) |
| 7.11 | Walkthrough scrollable | Open walkthrough | Can scroll to bottom |

---

## Suite 8: Responsive / Mobile (P1)

Test at 3 viewports: 375px (phone), 768px (tablet), 1440px (desktop)

| # | Test | Viewport | Assert |
|---|------|----------|--------|
| 8.1 | Dashboard readable | 375px | Cards stack vertically, text readable |
| 8.2 | Newsletter dashboard | 375px | Stats stack 2x2, pipeline cards stack |
| 8.3 | Header buttons wrap | 375px | Buttons wrap or collapse to menu |
| 8.4 | Approval queue usable | 375px | List scrollable, preview panel full-width |
| 8.5 | Command center tabs | 375px | Tabs scroll horizontally or stack |
| 8.6 | Analytics table readable | 375px | Table scrolls horizontally or stacks |
| 8.7 | Contact cards readable | 375px | Name, email, phase visible |
| 8.8 | Walkthrough guide | 375px | Images resize, text readable |
| 8.9 | No horizontal scroll | 375px | No content overflows viewport width |
| 8.10 | Touch targets 44px+ | 375px | All buttons/links min 44x44px tap target |
| 8.11 | Desktop full width | 1440px | Content uses available space, no tiny centered column |
| 8.12 | Tablet grid | 768px | 2-column grids where appropriate |

---

## Suite 9: Forms & Inputs (P1)

| # | Test | Action | Assert |
|---|------|--------|--------|
| 9.1 | Contact form submits | Fill and submit `/contacts/new` | Contact created, redirect to list |
| 9.2 | Contact form validation | Submit empty form | Error messages shown |
| 9.3 | Listing form submits | Fill and submit `/listings/new` | Listing created |
| 9.4 | Showing form submits | Fill showing request | Showing created |
| 9.5 | Search works | Type in search bar | Results filter in real-time |
| 9.6 | Segment builder | Create segment with filters | Contacts filtered correctly |
| 9.7 | Login form | Submit demo credentials | Redirects to dashboard |
| 9.8 | Login form — wrong password | Submit bad credentials | Error message, no redirect |

---

## Suite 10: Visual Consistency (P2)

| # | Test | Assert |
|---|------|--------|
| 10.1 | All pages use same font | Bricolage Grotesque or system font stack |
| 10.2 | All cards use shadcn Card | No raw `div` with manual border/shadow |
| 10.3 | All buttons use shadcn Button | No raw `button` with inline styles |
| 10.4 | All badges use shadcn Badge | No `span` with manual badge styles |
| 10.5 | No inline style objects | Grep for `style={{` — should be zero on pages |
| 10.6 | Color palette consistent | No hardcoded hex outside globals.css |
| 10.7 | Spacing consistent | Tailwind spacing units (4px base), no arbitrary px |
| 10.8 | Icons consistent | Lucide React on all pages (emoji OK for phase indicators) |
| 10.9 | Empty states consistent | All empty states have icon + message + CTA |
| 10.10 | Loading states exist | Data-fetching pages show skeleton/spinner |
| 10.11 | Error states exist | Failed data fetch shows error message, not blank |
| 10.12 | Dark mode support | If user has dark OS theme, app doesn't break |

---

## Suite 11: Performance (P2)

| # | Test | Assert |
|---|------|--------|
| 11.1 | Dashboard < 2s LCP | Largest Contentful Paint under 2 seconds |
| 11.2 | Newsletter pages < 3s LCP | All newsletter routes under 3 seconds |
| 11.3 | No layout shift | CLS < 0.1 on all pages |
| 11.4 | Images optimized | All images use Next.js Image or are compressed |
| 11.5 | No memory leaks | Navigate between pages 20x — memory stable |
| 11.6 | Bundle size | No single route JS > 200KB |

---

## Suite 12: Accessibility (P2)

| # | Test | Assert |
|---|------|--------|
| 12.1 | All images have alt text | `img` tags have `alt` attribute |
| 12.2 | Buttons have labels | Icon-only buttons have `aria-label` |
| 12.3 | Color contrast | Text meets WCAG AA (4.5:1 ratio) |
| 12.4 | Keyboard navigation | Can tab through all interactive elements |
| 12.5 | Focus visible | Tab focus ring visible on all elements |
| 12.6 | Screen reader headings | h1 → h2 → h3 hierarchy, no skipped levels |
| 12.7 | Form labels | All inputs have associated `label` or `aria-label` |

---

## Suite 13: Auth & Security (P0)

| # | Test | Assert |
|---|------|--------|
| 13.1 | Protected routes redirect | Access `/newsletters` unauthenticated → `/login` |
| 13.2 | Admin routes blocked for non-admin | Realtor role user → cannot access `/admin` |
| 13.3 | API routes require auth | `GET /api/contacts` without session → 401 |
| 13.4 | Cron routes require secret | `GET /api/cron/process-workflows` without bearer → 401 |
| 13.5 | Webhook routes skip auth | `POST /api/webhooks/resend` → 200 (no session needed) |
| 13.6 | CSRF token present | Login form includes CSRF token |
| 13.7 | Session expiry | Expired JWT → redirect to login |

---

## Execution Order

1. **P0 suites first** (1-5, 13) — if these fail, nothing else matters
2. **P1 suites** (6-9) — degraded experience but usable
3. **P2 suites** (10-12) — polish and optimization

## Running the Tests

```bash
# Full P0 suite
npx playwright test tests/browser/ --grep "@P0"

# Specific suite
npx playwright test tests/browser/scroll.spec.ts

# Visual regression (screenshot comparison)
npx playwright test tests/browser/ --update-snapshots

# Mobile only
npx playwright test tests/browser/ --project=mobile
```

---

---

## Suite 14: MLS Browse Page (`/mls-browse`)

| # | Test | Route | Assert |
|---|------|-------|--------|
| 14.1 | mls-browse page loads | `/mls-browse` | Status 200, search/filter controls visible |
| 14.2 | mls-browse search filters listings | `/mls-browse` | Enter search term, results update |
| 14.3 | mls-browse listing card click | `/mls-browse` | Click card opens listing detail |

---

*Total: 14 suites, 123+ test cases*
*Last updated: 2026-04-13*

<!-- Last reviewed: 2026-04-21 -->
