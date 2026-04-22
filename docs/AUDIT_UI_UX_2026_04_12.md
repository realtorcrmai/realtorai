<!-- docs-audit-reviewed: 2026-04-21T18 -->
<!-- docs-audit: src/components/** -->
# Realtors360 UI/UX Audit — Full Application Review

**Date:** 2026-04-12
**Scope:** 67 dashboard pages, 5 user journeys, all components
**Method:** Deep code analysis of every route, component, action, and style

---

## Executive Summary

Realtors360 is a **feature-rich CRM with 67 pages** covering contacts, listings, showings, email marketing, AI content, calendar, forms, pipeline, tasks, and more. The foundation is solid — server-side data fetching, Zod validation, RLS security, responsive sidebar layout, and a cohesive design system. However, the rapid feature velocity has created **UX debt** across several journeys.

### Scorecard

| Area | Score | Key Issues |
|------|-------|------------|
| Dashboard & Navigation | 8/10 | Strong widgets, good KPIs, minor mobile gaps |
| Listings & Workflow | 6/10 | 1,138-line monolith, mobile sidebar hidden, hardcoded data |
| Contacts | 7/10 | Good CRUD, weak filtering/sorting, bulk ops disabled |
| Showings | 7/10 | Solid flow, limited mobile access to sidebar panels |
| Email/Newsletter | 8/10 | Excellent AI integration, broken edit link in queue, no rich editor |
| Content Engine | 7/10 | AI generation works, gallery UX needs polish |
| Auth & Onboarding | 9/10 | Clean flow, good personalization, rate limiting |
| Accessibility | 5/10 | Skip link exists, but many forms lack aria-describedby, contrast issues |
| Performance | 6/10 | Large components, no pagination on lists, Promise.all waterfalls |
| Mobile | 5/10 | Bottom nav exists, but sidebars hidden, grids don't collapse |

---

## Priority 1 — Critical UX Issues (High Impact, High Frequency)

### 1.1 Mobile Sidebar Panels Inaccessible
**Affected:** Listings detail, Contacts detail, Showings detail
**Problem:** Right sidebar panels use `hidden lg:block` — on mobile/tablet, FINTRAC intake, form readiness, seller contact info, and document panels are completely invisible.
**Impact:** Realtors in the field (majority use case) cannot verify seller identity or check form status on their phone.
**Fix:** Convert sidebars to collapsible accordion sections that stack below main content on mobile, or add a "More Details" sheet/drawer triggered by a floating button.

### 1.2 No Server-Side Pagination
**Affected:** Contacts (200 limit), Listings (200 limit), Showings, Communications
**Problem:** All list pages fetch a fixed number of rows with no pagination. A realtor with 500+ contacts sees only the first 200.
**Impact:** Data loss for power users. Client-side filtering operates on truncated data.
**Fix:** Implement cursor-based pagination with "Load More" or page numbers. Add server-side search via Supabase `ilike` or full-text search.

### 1.3 ListingWorkflow.tsx — 1,138 Line Monolith
**Affected:** Listing workflow page (most-used feature)
**Problem:** Single component handles 9 phases x 4 substeps = 36 status permutations, all rendering logic, status derivation, and 200+ lines of hardcoded messages.
**Impact:** Slow initial render, difficult to maintain, poor code splitting.
**Fix:** Extract `PhaseCard`, `SubstepList`, `StatusDerivation`, and `ActivityMessage` into separate files. Lazy-load phases not currently visible.

### 1.4 Form Fields Don't Collapse on Mobile
**Affected:** ContactForm, ListingCreator, ShowingRequestForm
**Problem:** `grid-cols-2` hardcoded without responsive breakpoints (e.g., `sm:grid-cols-1`).
**Impact:** Fields overlap or get compressed on small screens.
**Fix:** Change all form grids to `grid-cols-1 sm:grid-cols-2`.

### 1.5 No Loading Skeletons on List Pages
**Affected:** Contacts list, Listings list, Showings list
**Problem:** Server-side fetches block rendering. User sees nothing until data loads.
**Impact:** Perceived performance feels slow, especially on mobile networks.
**Fix:** Add `loading.tsx` files with skeleton cards/rows for each list page. The dashboard already has this pattern — replicate it.

---

## Priority 2 — Significant UX Improvements (Medium Impact)

### 2.1 Contacts: Filtering & Sorting Gaps
**Current state:** Client-side text search only. No filters for type, stage, lead_status, tags, date range, or engagement score.
**Enhancement:** Add a filter bar with:
- Type dropdown (buyer/seller/dual/partner)
- Stage pills (new → closed → cold)
- Lead status (hot/warm/cold based on engagement_score)
- Date range picker (created, last contacted)
- Tag filter (multi-select)
- Sort by: name, created, last_activity, engagement_score

### 2.2 Contacts: Bulk Operations Disabled
**Current state:** "Add Tag" and "Change Stage" buttons show "Coming soon" tooltip.
**Enhancement:** Wire up bulk actions:
- Bulk tag assignment
- Bulk stage change
- Bulk email (enroll in journey)
- Bulk export (CSV)
- Bulk delete (with confirmation)

### 2.3 Communication Timeline: No Pagination or Threading
**Current state:** Hardcoded limit of 5 messages per filter. No "Load more". No conversation threading.
**Enhancement:**
- Add "Load more" with cursor pagination
- Group messages by conversation (same contact + same day)
- Add inline reply capability (at minimum for notes)
- Add phone call logging button

### 2.4 Newsletter Queue: Broken Edit Link
**Current state:** Edit button in AIAgentQueue navigates to `/newsletters/queue/:id/edit` — route doesn't exist.
**Fix:** Either create the edit route or open an inline editor/modal.

### 2.5 Email Builder: No Rich HTML Editor
**Current state:** Plain textarea for HTML body editing. No blocks, no drag-drop, no visual preview.
**Enhancement:** Integrate a block-based email editor (e.g., React Email visual editor or Unlayer). The template system already supports `builder_json` — connect it to a visual builder.

### 2.6 Dashboard Calendar: Date-Specific Drill-Down
**Current state:** Calendar widget shows events but the AI Brief and Day Activity require clicking a date.
**Enhancement:** Auto-load today's brief on first render. Add inline event creation. Show task deadlines on calendar alongside showings and Google events.

### 2.7 Showing Status Actions: Channel Preference Ignored
**Current state:** Buyer agent messages hardcoded to SMS regardless of contact's `pref_channel`.
**Fix:** Check `pref_channel` and route through WhatsApp/SMS/Email accordingly.

### 2.8 Listings Detail: Promise.all Waterfall
**Current state:** 6 parallel queries via `Promise.all` — if one is slow, entire page blocks.
**Enhancement:** Use React Suspense boundaries to show workflow immediately while documents/showings/forms load in the background. Each section can have its own loading skeleton.

---

## Priority 3 — UX Polish & Enhancement (Lower Priority, High Value)

### 3.1 Accessibility Improvements

| Issue | Location | Fix |
|-------|----------|-----|
| Form error messages not linked to inputs | ContactForm, ListingCreator | Add `aria-describedby` on inputs pointing to error `<span id="...">` |
| Workflow step buttons lack aria-labels | ListingWorkflow.tsx | Add `aria-label="Phase 1: Seller Intake - Complete"` |
| No `required` attribute on required inputs | All forms | Add HTML `required` alongside Zod validation |
| Muted text contrast fails WCAG AA | globals.css `--muted-foreground` | Change `#516F90` → `#4A6380` (darker) or adjust bg |
| Lock emoji not announced | ListingWorkflow.tsx | Add `aria-label="Locked"` or `role="img" aria-label="..."` |
| Focus ring missing on mobile selects | ManualStatusOverride, form selects | Add `focus-visible:ring-2` to all interactive elements |
| Tab navigation on newsletter tabs | EmailMarketingTabs | Ensure `role="tablist"`, `role="tab"`, arrow key navigation |

### 3.2 Performance Optimizations

| Issue | Location | Fix |
|-------|----------|-----|
| ListingWorkflow 1,138 lines | `components/listings/ListingWorkflow.tsx` | Split into PhaseCard + SubstepList + StatusEngine |
| No React.memo on heavy components | Dashboard widgets, timeline items | Memoize PipelineSnapshot, ActivityFeed, TodaysPriorities |
| Contacts fetch all 200 on mount | `contacts/page.tsx` | Server-side pagination + search |
| Communication timeline refetches on every filter | CommunicationTimeline.tsx | Use TanStack Query with cache keys per filter |
| Sidebar notification polling every 30s | MondaySidebar.tsx | Use WebSocket or increase to 60s; add `visibilitychange` listener to pause when tab hidden |
| 500 listing documents fetched for dashboard | `(dashboard)/page.tsx` line 50 | Use COUNT query instead of fetching all rows |
| No image optimization | Various | Replace `<img>` with `next/image` where photos are rendered |

### 3.3 Empty State Improvements

| Page | Current | Enhancement |
|------|---------|-------------|
| Listings (0 listings) | Generic "No data" | Illustrated empty state: "Create your first listing" with CTA button + quick-start guide link |
| Showings (0 showings) | Generic table empty | "No showings yet. Showings appear when buyers request viewings." + link to listings |
| Tasks (0 tasks) | Likely generic | "All caught up!" with confetti animation (reuse WelcomeConfetti) |
| Content (0 content) | Unknown | "Generate your first AI content" with listing selector |
| Communications (0 comms) | "No recent communications" | "Start a conversation" with quick-send buttons (SMS, WhatsApp, Email) |
| Documents (0 docs on listing) | No message shown | "Upload required documents: FINTRAC, DORTS, PDS" with checklist |

### 3.4 Navigation Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Breadcrumb consistency** | Some pages have breadcrumbs (listings detail), others don't (contacts detail). Standardize across all detail pages. |
| **Back button** | Add "Back to [list]" button on all detail pages (currently relies on browser back) |
| **Recent items in Cmd+K** | Cmd+K shows contacts/listings search but not recent items. Add "Recent" section at top. |
| **Keyboard shortcuts** | Add `N` for new, `S` for search, `?` for help overlay. Currently only Cmd+K exists. |
| **Mobile quick actions** | QuickAddButton is good but limited. Add "Quick Call", "Quick Note", "Quick Show" for contacts. |

### 3.5 Data Visualization Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Pipeline Kanban view** | Current pipeline is list-based. Add drag-and-drop Kanban board (New → Qualified → Active → Contract → Closed) |
| **Showing calendar heatmap** | Show which days/times have most showings to help realtors spot patterns |
| **Contact engagement sparklines** | Tiny inline charts showing engagement trend (last 30 days) in contact list |
| **Revenue forecast** | Dashboard widget showing projected GCI based on pipeline stage probabilities |
| **Email performance trends** | Line chart showing open/click rates over time (currently just numbers) |

### 3.6 Workflow UX Improvements

| Enhancement | Description |
|-------------|-------------|
| **Progress percentage in list** | Show workflow % complete as a progress bar in the listings table |
| **Phase skip confirmation** | Current: AlertDialog warning. Add: show what data will be lost and which steps will be reset |
| **Auto-save indicator** | Workflow changes auto-save but user has no visual confirmation. Add "Saved" toast or checkmark |
| **Phase prerequisites** | Show what's needed before a phase can start (e.g., "Upload FINTRAC to unlock Phase 5") |
| **Workflow templates** | Allow saving/loading workflow configurations for different listing types |

### 3.7 Hardcoded Values to Make Dynamic

| Value | Location | Fix |
|-------|----------|-----|
| Timezone `America/Vancouver` | Listing detail page | Store in user settings, fall back to browser timezone |
| Required forms `["fintrac","dorts","pds","mlc"]` | ListingWorkflow.tsx:172 | Make configurable per province/property type |
| 200 item fetch limits | All list pages | Replace with paginated queries |
| `newLeadsToday: 0` hardcoded | Dashboard page.tsx:128 | Actually query contacts created today |
| Currency formatting CAD | Multiple locations | Store in user/brokerage settings |
| Communication limit: 5 | CommunicationTimeline.tsx | Make configurable, add pagination |
| Demo passwords `"demo1234"` | Login page | Already env-driven, but visible in UI buttons |

---

## Priority 4 — New Feature Opportunities

### 4.1 Inline Editing
Allow editing contact name, phone, stage directly from the list view (click to edit) without navigating to detail page. HubSpot-style inline editing.

### 4.2 Activity Timeline (Global)
Unified timeline across all entities: "John Doe opened email → Sarah booked showing → Listing 123 received offer". Currently exists as a widget but could be a full page with filters.

### 4.3 Smart Notifications
Current: Polling every 30s for unread count. Enhancement: Categorize notifications (showings, emails, tasks, system) with snooze, mark-as-read, and action buttons inline.

### 4.4 Saved Views
Let realtors save filtered views: "My Hot Leads", "Pending Showings This Week", "Listings Missing Docs". Appear as quick-access tabs or sidebar bookmarks.

### 4.5 Onboarding Checklist Improvements
Current OnboardingChecklist exists but could:
- Show completion percentage prominently
- Auto-dismiss completed items
- Link to relevant help articles
- Celebrate milestones (first contact, first listing, first showing)

### 4.6 Dark Mode Polish
Theme variables exist for dark mode but some components may not respect them. Audit all components for hardcoded colors (especially in email templates and workflow timeline).

### 4.7 Offline Support
PWA manifest exists (`manifest.json`). Add:
- Service worker for offline page caching
- Offline indicator with queue for actions (create contact, add note)
- Sync when back online

### 4.8 Print Views
Realtors often print listing sheets, showing schedules, and CMA reports. Add `@media print` styles for:
- Listing detail (property sheet)
- Showing schedule (day/week view)
- Contact card (with communication history)

---

## User Journey Analysis

### Journey 1: New Listing Creation (Most Critical)
```
Login → Dashboard → "Create Listing" → ListingCreator form → Save
→ Listing Detail → Start Workflow → Phase 1 (Seller Intake)
→ Phase 2 (Enrichment) → ... → Phase 7 (MLS Prep) → Phase 8 (Submit)
```

**Friction points:**
1. ListingCreator requires selecting a seller contact first — no way to create one inline
2. After creation, user lands on detail page but must scroll down to find workflow
3. Workflow phases are all collapsed — user doesn't know where to start
4. FINTRAC panel only visible on desktop (hidden on mobile)
5. No "what's next" guidance after completing a phase

**Recommended improvements:**
- Add "Create new seller" option in the seller dropdown
- Auto-expand the current (first incomplete) workflow phase
- Add a "Next Step" floating button that scrolls to the next action needed
- Make FINTRAC a modal/drawer accessible on all screen sizes
- Add a completion celebration when listing goes active

### Journey 2: Showing Management
```
Buyer agent calls → Realtor opens Showings → "New Showing" →
Select listing + time → Send SMS to seller → Seller replies YES/NO →
Status updates → Calendar event created → Lockbox code sent
```

**Friction points:**
1. No way to create a showing from the listing detail page (must go to /showings/new)
2. SMS always sent regardless of seller's preferred channel
3. No inline showing creation — always a full page form
4. No batch scheduling (3 showings on same day = 3 separate forms)

**Recommended improvements:**
- Add "Schedule Showing" button on listing detail page
- Respect `pref_channel` for notifications
- Add quick-schedule modal (select time slot from calendar availability)
- Add batch mode for multiple showings

### Journey 3: Email Marketing Setup
```
Dashboard → Email Marketing → Enable AI Agent → Set frequency/preferences →
AI generates drafts → Queue → Review/Approve → Send → Track analytics
```

**Friction points:**
1. 13 newsletter sub-pages are overwhelming — new users don't know where to start
2. Edit button in queue links to non-existent route
3. No visual email editor (plain textarea)
4. Analytics split across 3 pages without clear navigation

**Recommended improvements:**
- Add a guided "Get Started" wizard for first-time email setup
- Fix the broken edit route
- Consolidate analytics into a single page with expandable sections
- Add email preview alongside the approval action

### Journey 4: Contact Management
```
Dashboard → Contacts → Search/Filter → Contact Detail →
View timeline → Send message → Update stage → Manage journey
```

**Friction points:**
1. No filtering by stage, type, or engagement — only text search
2. Bulk operations disabled ("Coming soon")
3. Communication timeline limited to 5 items, no load more
4. Stage transitions don't explain what each stage means

**Recommended improvements:**
- Add filter bar with faceted search
- Enable bulk tag/stage/email operations
- Add pagination to communication timeline
- Add stage descriptions and transition rules visible to user

### Journey 5: Daily Realtor Workflow
```
Login → Dashboard → Check priorities → Handle showings →
Update listings → Send messages → Review AI emails → End of day
```

**Friction points:**
1. `newLeadsToday` hardcoded to 0 — priority widget shows stale data
2. No "daily digest" email summary of what happened overnight
3. Calendar integration requires manual Google OAuth setup
4. No way to mark priorities as "handled" without navigating to each entity

**Recommended improvements:**
- Fix newLeadsToday query
- Add morning digest email (auto-generated by AI)
- Streamline Google Calendar OAuth into onboarding flow
- Add quick-action buttons on priority items (snooze, dismiss, go to)

---

## Implementation Roadmap

### Sprint 1: Mobile & Core UX (1-2 weeks)
- [ ] Mobile sidebar → collapsible accordion on all detail pages
- [ ] Form grids: `grid-cols-1 sm:grid-cols-2` across all forms
- [ ] Loading skeletons for all list pages
- [ ] Fix newsletter queue edit link
- [ ] Fix `newLeadsToday` hardcoded value
- [ ] Breadcrumb consistency across all detail pages

### Sprint 2: Data & Filtering (1-2 weeks)
- [ ] Server-side pagination for contacts, listings, showings
- [ ] Contact filter bar (type, stage, engagement, date)
- [ ] Server-side search via Supabase ilike/FTS
- [ ] Communication timeline pagination ("Load more")
- [ ] Sort persistence in list views

### Sprint 3: Accessibility & Performance (1 week)
- [ ] aria-describedby on all form error messages
- [ ] aria-labels on workflow steps and emoji icons
- [ ] Color contrast fixes (muted foreground)
- [ ] Split ListingWorkflow.tsx into sub-components
- [ ] React.memo on heavy dashboard widgets
- [ ] Replace 500-doc fetch with COUNT query

### Sprint 4: Workflow Polish (1 week)
- [ ] Auto-expand current workflow phase
- [ ] "Next Step" floating action button
- [ ] Auto-save visual indicator
- [ ] Phase prerequisites display
- [ ] Dynamic timezone from user settings
- [ ] Configurable required forms per property type

### Sprint 5: Enhanced Features (2 weeks)
- [ ] Bulk contact operations (tag, stage, email, export)
- [ ] Inline editing on list views
- [ ] Saved views / smart filters
- [ ] Showing channel preference respect
- [ ] Quick-schedule showing modal
- [ ] Rich email editor integration

### Sprint 6: Advanced (2 weeks)
- [ ] Pipeline Kanban board (drag-and-drop)
- [ ] Contact engagement sparklines
- [ ] Revenue forecast widget
- [ ] Dark mode polish audit
- [ ] Print styles for listing sheets
- [ ] Offline support (PWA service worker)

---

## Appendix: Files Audited

### Dashboard & Navigation
- `src/app/(dashboard)/page.tsx` (283 lines) — 10 parallel queries, 12+ widgets
- `src/app/(dashboard)/layout.tsx` (49 lines) — onboarding gate, 9 providers
- `src/components/layout/MondaySidebar.tsx` (270 lines) — 3 nav groups + team nav (owner/admin only), recent items, logo glow
- `src/components/layout/MondayHeader.tsx` (40 lines) — search, notifications, avatar
- `src/components/layout/MobileNav.tsx` (84 lines) — 5 items + QuickAdd FAB
- `src/components/layout/DashboardShellClient.tsx` (32 lines) — skip link, flex layout
- `src/components/dashboard/PipelineSnapshot.tsx` (105 lines) — 5-stage bar
- `src/components/dashboard/TodaysPriorities.tsx` (66 lines) — 5 priority types
- `src/components/dashboard/ActivityFeed.tsx` (62 lines) — unified feed
- `src/components/dashboard/DashboardPipelineWidget.tsx` (115 lines) — 3-col Kanban

### Listings & Workflow
- `src/app/(dashboard)/listings/page.tsx` — 200-listing limit
- `src/app/(dashboard)/listings/[id]/page.tsx` — 6 parallel fetches, 3-col layout
- `src/components/listings/ListingWorkflow.tsx` (1,138 lines) — 9 phases, monolith
- `src/components/listings/create/ListingCreator.tsx` — seller fetch, Zod validation
- `src/components/listings/FormReadinessPanel.tsx` — 12 BC forms, upload
- `src/actions/listings.ts` — FINTRAC gate, status transitions
- `src/actions/workflow.ts` — step save, cascade reset

### Contacts & Showings
- `src/app/(dashboard)/contacts/page.tsx` — 200-contact limit
- `src/app/(dashboard)/contacts/[id]/page.tsx` (802 lines) — RPC optimization
- `src/components/contacts/ContactsTableClient.tsx` — search only, no filters
- `src/components/contacts/ContactForm.tsx` (544 lines) — Zod, grid-cols-2
- `src/components/contacts/CommunicationTimeline.tsx` (223 lines) — 5-item limit
- `src/actions/contacts.ts` — duplicate detection, consistency enforcement

### Email/Newsletter
- `src/app/(dashboard)/newsletters/page.tsx` (492 lines) — 6 tabs
- 11 newsletter sub-pages (queue, analytics, control, engine, ghost, insights, learning, activity, suppressions, guide)
- `src/components/newsletters/` — 18+ components
- `src/components/email-builder/EmailEditorClient.tsx` — plain textarea
- `src/actions/newsletters.ts` — frequency cap, dedup, approval workflow

### Auth & Global
- `src/app/(auth)/login/page.tsx` (182 lines) — 5 demo users, OAuth
- `src/lib/auth.ts` (269 lines) — NextAuth v5, rate limiting, Google OAuth
- `src/middleware.ts` (77 lines) — public/protected routing
- `src/app/globals.css` (357 lines) — full design system
- `src/app/layout.tsx` (67 lines) — PWA, fonts, providers

<!-- Last reviewed: 2026-04-21 -->

<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->

<!-- Last reviewed: 2026-04-21 — AGENTS.md v0.6 + violation logging -->

<!-- Last reviewed: 2026-04-21 — team WIP session artifacts -->
