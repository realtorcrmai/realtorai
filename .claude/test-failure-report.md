# Playwright Failure Report — Components + Journeys

**Run:** desktop project, 8 workers, trace/video off
**Result:** 188 tests → **76 passed / 78 failed / 34 skipped** (16.7m)

---

## Failure taxonomy

| Category | Count | Root cause |
|---|---|---|
| **Turbopack cold-compile** | **~49** | Page was still `Compiling...` / showing `Loading` spinner when the test timed out. 2s fixed wait is insufficient with 8 parallel workers racing for cold-compile. |
| **Genuine UI mismatch** | **~29** | Spec expects elements that no longer exist in the current UI. |

47 of 76 captured page snapshots show `Compiling` or `Loading` still active — these aren't UI bugs, they're test infrastructure problems.

---

## Genuine UI mismatches (test says X, UI has Y)

### 1. Contact detail — "Intelligence" tab (5+ failures)
- **Test expects:** tab labelled *Intelligence*
- **Actual UI has:** 3 tabs only — `📋 Overview`, `💬 Activity`, `🏠 Deals`
- **Affected tests:**
  - `contact-communication.spec.ts:51, 107, 119` (Intelligence tab, demographics section, relationship graph)
  - `contacts.spec.ts:65` (Intelligence tab is visible)
  - `contact-crud-4layer.spec.ts:94` (all contact tabs present)

### 2. Dashboard — feature tile text (6 failures)
- **Test expects tiles with literal text:** `Manage property`, `Buyers`, `Showing`, `schedule`, `Your Workspace`
- **Actual UI has:** stat tiles `Active Listings 44`, `Pending Showings 14`, `Open Tasks 53`, `Total Contacts 715`; no `Your Workspace` heading anywhere
- **Affected tests:** `dashboard.spec.ts:30, 38, 47, 55, 63` + `listing-lifecycle.spec.ts:187` (expects `:has-text('Manage property')` tile)

### 3. Newsletters — tab button shape (5 failures)
- **Test expects:** `<button>AI Workflows</button>` with `bg-primary|text-white` active class
- **Actual UI:** tab bar uses different markup. Tests looking for `Overview`, `AI Workflows`, `Performance`, `Campaigns` as plain buttons, and `[class*='overflow-x-auto']` tab container, don't find them
- **Affected tests:** `newsletters.spec.ts:35, 43, 59, 75, 140` + `newsletter-pipeline.spec.ts:174, 184`

### 4. Navigation — sidebar link selector (4 failures)
- **Test expects:** `header nav` links for `Contacts`/`Listings`/`Showings`/`Calendar`
- **Actual UI:** sidebar nav (`complementary` landmark), not a header `nav`
- **Affected tests:** `navigation-flow.spec.ts:40, 51, 62, 84` (header nav Contacts/Listings/Showings/Calendar links)

### 5. Contact sidebar — desktop contact list (2 failures)
- **Test expects:** `.border-r a[href^='/contacts/']` returning >1 link
- **Actual UI:** contact detail page has no left-hand contact list sidebar (replaced by breadcrumb)
- **Affected tests:** `contact-communication.spec.ts:186` (sidebar reachability)

### 6. Other specific mismatches
- `showing-workflow.spec.ts:98` — notes section not found on showing detail
- `showing-workflow.spec.ts:168` — desktop showing sidebar (`.border-r a[href^='/showings/']`)
- `calendar.spec.ts:17` — calendar legend badges selector
- `contacts.spec.ts:e1912` — invalid contact ID error page format

---

## Turbopack-timing failures (fix is infrastructure, not UI)

49 tests failed because `/` or `/newsletters` or similar was still cold-compiling when the 5-10s assertion timeout hit. The page snapshot literally shows:

```yaml
- main:
  - img "Loading"
  - paragraph: Loading...
- button "Open Next.js Dev Tools":
    - text: Compiling
```

**Fix options:**
1. Pre-warm routes in `global-setup.ts` (hit each route once before tests start)
2. Increase `test.waitForTimeout(2000)` to 15000 on first-navigation tests
3. Use `page.waitForSelector('h1', { timeout: 20000 })` instead of fixed sleep
4. Reduce worker count (8 → 2) to avoid parallel cold-compiles saturating the dev server

---

## Recommendation

Two-track cleanup:

**Track A — infrastructure (quick win, recovers ~49 failures):**
- Pre-warm routes in globalSetup by hitting `/`, `/contacts`, `/listings`, `/showings`, `/newsletters`, `/calendar`, `/content`, `/tasks`, `/settings` with a fetch before the suite starts.
- Replace `waitForTimeout(2000)` with `waitForSelector('h1, main [role="main"]', { timeout: 30000 })` on initial navigations.

**Track B — rewrite ~29 stale specs against current UI:**
- Delete / rewrite assertions for Intelligence tab, Your Workspace, Manage property tile, header nav sidebar, etc.
- Source of truth: read the actual DOM snapshot in `test-results/*/error-context.md`.

Full list of 78 failing tests preserved at `/tmp/pw-failures.txt`.
Genuine UI mismatches (29) at `/tmp/genuine-fails.txt`.
