<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- docs-audit: src/components/**, tests/e2e/* -->
<!-- last-verified: 2026-04-20 -->
# Test Plan: UI Redesign & Competitive UX Features

**Version:** 1.1
**Date:** 2026-04-10
**Scope:** All features built in the UI redesign (HubSpot-inspired layout shell, DataTable, PageHeader) and competitive UX features sprint (Cmd+K, Notifications, Recent Items, Lead Scores, Contact Preview, Dashboard Widgets, Post-Showing Feedback, Accessibility, Mobile, Dark Mode).
**Total Test Cases:** 102

---

## Summary Table

| # | Category | Test Cases | P0 | P1 | P2 |
|---|----------|------------|----|----|-----|
| 1 | Layout Shell (Sidebar) | 8 | 3 | 4 | 1 |
| 2 | PageHeader | 6 | 2 | 3 | 1 |
| 3 | DataTable | 12 | 4 | 5 | 3 |
| 4 | KPI Cards | 4 | 1 | 2 | 1 |
| 5 | Contacts Table | 8 | 3 | 3 | 2 |
| 6 | Listings Table | 5 | 2 | 2 | 1 |
| 7 | Showings Table | 5 | 2 | 2 | 1 |
| 8 | Cmd+K Search | 7 | 2 | 3 | 2 |
| 9 | Lead Score Badge | 4 | 1 | 2 | 1 |
| 10 | Contact Preview Sheet | 5 | 2 | 2 | 1 |
| 11 | Bulk Actions Bar | 5 | 2 | 2 | 1 |
| 12 | Recent Items | 5 | 2 | 2 | 1 |
| 13 | Today's Priorities | 4 | 1 | 2 | 1 |
| 14 | Activity Feed | 4 | 1 | 2 | 1 |
| 15 | Pipeline Widget | 4 | 1 | 2 | 1 |
| 16 | Notification Center | 7 | 3 | 3 | 1 |
| 17 | Notification Triggers | 5 | 2 | 2 | 1 |
| 18 | Post-Showing Feedback | 3 | 1 | 1 | 1 |
| 19 | Accessibility (WCAG AA) | 6 | 3 | 2 | 1 |
| 20 | Mobile Responsive | 6 | 2 | 3 | 1 |
| 21 | Dark Mode | 4 | 1 | 2 | 1 |
| 22 | API Endpoints | 7 | 3 | 3 | 1 |
| **Total** | | **122** | **44** | **52** | **26** |

---

## 1. Layout Shell (Sidebar)

### TC-001: Sidebar renders on desktop
- **Category:** Layout Shell
- **Priority:** P0
- **Precondition:** Logged in, viewport >= 768px
- **Steps:**
  1. Navigate to any dashboard page
  2. Observe left sidebar
- **Expected:** Navy sidebar (`bg-sidebar`, `w-60`) is visible on the left with the Realtors360 animated logo at top, 3 nav groups (Main, Tools, Admin), user section at bottom.
- **Automated:** Yes

### TC-002: Sidebar nav groups display correct items
- **Category:** Layout Shell
- **Priority:** P1
- **Precondition:** Logged in with all features enabled
- **Steps:**
  1. Inspect sidebar navigation groups
- **Expected:** Main group contains Dashboard, Contacts, Listings, Showings, Calendar. Tools group contains Tasks, Content Engine, Email Marketing, Automations. Admin group contains Forms, Property Search, Import, Settings. Each item has a Lucide icon and label.
- **Automated:** Yes

### TC-003: Sidebar active link highlighting
- **Category:** Layout Shell
- **Priority:** P1
- **Precondition:** Logged in
- **Steps:**
  1. Navigate to /contacts
  2. Observe sidebar
  3. Navigate to /listings
  4. Observe sidebar again
- **Expected:** Current page link has `bg-sidebar-primary/15`, white text, and a 3px coral left border. Other links show muted foreground color.
- **Automated:** Yes

### TC-004: Sidebar brand logo and text
- **Category:** Layout Shell
- **Priority:** P1
- **Precondition:** Logged in, desktop viewport
- **Steps:**
  1. Observe top section of sidebar (140px height area)
- **Expected:** Animated logo renders at 72px. Text reads "Realtors360" with "AI Platform" subtitle below. No legacy "RealtorAI" text anywhere.
- **Automated:** Yes

### TC-005: Sidebar user section displays name and email
- **Category:** Layout Shell
- **Priority:** P1
- **Precondition:** Logged in as user with name "John Smith" and email "john@example.com"
- **Steps:**
  1. Scroll to bottom of sidebar
- **Expected:** Rounded avatar circle shows initials "JS" with coral-tinted background. Name "John Smith" displayed (truncated if long). Email shown below name. Logout icon button present on right.
- **Automated:** Yes

### TC-006: Sidebar logout button works
- **Category:** Layout Shell
- **Priority:** P0
- **Precondition:** Logged in
- **Steps:**
  1. Click the LogOut icon button in user section
- **Expected:** User is signed out via NextAuth and redirected to /login.
- **Automated:** No

### TC-007: Sidebar hides gated features based on plan
- **Category:** Layout Shell
- **Priority:** P0
- **Precondition:** Logged in as user with limited `enabled_features` (e.g., only ["contacts", "listings"])
- **Steps:**
  1. Observe sidebar nav items
- **Expected:** Only features in the user's `enabled_features` array are visible. Gated items (showings, calendar, tasks, content, newsletters, automations, forms, search, import) are hidden. Dashboard and Settings (no featureKey) always visible.
- **Automated:** No

### TC-008: Sidebar overflow scrolls on small screens
- **Category:** Layout Shell
- **Priority:** P2
- **Precondition:** Desktop with short viewport height (e.g., 600px)
- **Steps:**
  1. Resize window to very short height
  2. Attempt to scroll sidebar
- **Expected:** Sidebar content scrolls vertically (`overflow-y-auto`). User section stays at bottom. All nav groups remain accessible.
- **Automated:** No

---

## 2. PageHeader

### TC-009: PageHeader renders on all dashboard pages
- **Category:** PageHeader
- **Priority:** P0
- **Precondition:** Logged in
- **Steps:**
  1. Navigate to each of: /, /contacts, /listings, /showings, /tasks, /calendar, /content, /newsletters, /automations, /pipeline, /forms, /settings, /reports, /help
- **Expected:** Every page has a PageHeader component with at minimum a title. Border-bottom and bg-card styling visible.
- **Automated:** Yes

### TC-010: PageHeader breadcrumbs render and link correctly
- **Category:** PageHeader
- **Priority:** P1
- **Precondition:** Logged in
- **Steps:**
  1. Navigate to a contact detail page (e.g., /contacts/[id])
  2. Observe breadcrumb trail
- **Expected:** Breadcrumbs show chevron separators between items. Parent items (e.g., "Contacts") are clickable links. Final item (current page) is plain text, not a link.
- **Automated:** Yes

### TC-011: PageHeader tabs switch content
- **Category:** PageHeader
- **Priority:** P0
- **Precondition:** Logged in, navigate to page with tabs (e.g., /showings with status filter tabs)
- **Steps:**
  1. Click each tab in the PageHeader
- **Expected:** Active tab has visual indicator (border, color change). `onTabChange` callback fires and page content updates. Inactive tabs show muted styling.
- **Automated:** Yes

### TC-012: PageHeader actions slot renders buttons
- **Category:** PageHeader
- **Priority:** P1
- **Precondition:** Logged in
- **Steps:**
  1. Navigate to /contacts
  2. Observe action buttons in header
- **Expected:** Action buttons (e.g., "Add Contact") render right-aligned in the header row next to the title.
- **Automated:** Yes

### TC-013: PageHeader subtitle renders when provided
- **Category:** PageHeader
- **Priority:** P1
- **Precondition:** Logged in
- **Steps:**
  1. Navigate to a page that passes a subtitle prop
- **Expected:** Subtitle text appears below the title in smaller, muted text.
- **Automated:** No

### TC-014: PageHeader tab counts display
- **Category:** PageHeader
- **Priority:** P2
- **Precondition:** Tab objects include `count` property
- **Steps:**
  1. Navigate to page with counted tabs
- **Expected:** Count numbers appear next to tab labels (e.g., "Active (12)").
- **Automated:** No

---

## 3. DataTable

### TC-015: DataTable renders rows from data prop
- **Category:** DataTable
- **Priority:** P0
- **Precondition:** DataTable receives array of objects
- **Steps:**
  1. Pass an array of 5 items to DataTable
- **Expected:** 5 rows render in the table body. Each column displays data per the column definition.
- **Automated:** Yes

### TC-016: DataTable pagination at 25 rows per page
- **Category:** DataTable
- **Priority:** P0
- **Precondition:** DataTable receives 60 items (default pageSize = 25)
- **Steps:**
  1. Observe the pagination footer
  2. Click "Next page"
  3. Click "Next page" again
- **Expected:** Page 1 shows rows 1-25, footer reads "60 total - showing 1-25" and "Page 1 of 3". Page 2 shows rows 26-50. Page 3 shows rows 51-60. Previous/Next buttons disable at boundaries.
- **Automated:** Yes

### TC-017: DataTable column sorting
- **Category:** DataTable
- **Priority:** P0
- **Precondition:** Column has `sortable: true`
- **Steps:**
  1. Click a sortable column header
  2. Click the same header again
- **Expected:** First click sorts ascending (ArrowUp icon). Second click sorts descending (ArrowDown icon). Clicking a different sortable column resets direction to ascending. Non-sortable columns show no sort icon and do not respond to clicks. Pagination resets to page 1 on sort.
- **Automated:** Yes

### TC-018: DataTable empty state
- **Category:** DataTable
- **Priority:** P1
- **Precondition:** DataTable receives empty array
- **Steps:**
  1. Pass `data={[]}` and `emptyMessage="No contacts found."`
- **Expected:** Single row spanning all columns displays the emptyMessage text centered.
- **Automated:** Yes

### TC-019: DataTable row click navigation
- **Category:** DataTable
- **Priority:** P0
- **Precondition:** `onRowClick` prop provided
- **Steps:**
  1. Click on a data row
- **Expected:** The `onRowClick` callback fires with the row data. Row has `cursor-pointer` and hover background effect.
- **Automated:** Yes

### TC-020: DataTable checkbox selection
- **Category:** DataTable
- **Priority:** P1
- **Precondition:** `selectable={true}` prop set
- **Steps:**
  1. Observe checkbox column appears as first column
  2. Click individual row checkboxes
  3. Click header checkbox
- **Expected:** Individual checkboxes toggle selection. Header checkbox selects/deselects all rows on current page. `onSelectionChange` fires with Set of selected IDs. Clicking checkbox does not trigger `onRowClick`.
- **Automated:** Yes

### TC-021: DataTable rowActions render per row
- **Category:** DataTable
- **Priority:** P1
- **Precondition:** `rowActions` prop provided
- **Steps:**
  1. Hover over a table row
- **Expected:** Action buttons appear in the last column. Clicking an action button does not trigger `onRowClick` (stopPropagation).
- **Automated:** Yes

### TC-022: DataTable bulkActions floating bar
- **Category:** DataTable
- **Priority:** P1
- **Precondition:** `bulkActions` prop provided, rows selected
- **Steps:**
  1. Select 3 rows via checkboxes
- **Expected:** Floating bar appears at bottom center showing "3 selected", Clear button, and custom bulk action buttons. Bar has shadow, rounded corners, and z-50 positioning.
- **Automated:** Yes

### TC-023: DataTable aria-label on table element
- **Category:** DataTable
- **Priority:** P1
- **Precondition:** `ariaLabel` prop passed
- **Steps:**
  1. Inspect table element in DOM
- **Expected:** `<table>` element has `aria-label` attribute matching the prop value.
- **Automated:** Yes

### TC-024: DataTable keyboard navigation on rows
- **Category:** DataTable
- **Priority:** P1
- **Precondition:** `onRowClick` prop provided
- **Steps:**
  1. Tab to a table row
  2. Press Enter
- **Expected:** Row has `tabIndex={0}`. Focus ring visible (`focus-visible:ring-2 ring-brand`). Enter key triggers `onRowClick`. Row is keyboard-accessible.
- **Automated:** No

### TC-025: DataTable pagination aria-labels
- **Category:** DataTable
- **Priority:** P2
- **Precondition:** Multi-page data
- **Steps:**
  1. Inspect previous/next page buttons
- **Expected:** Previous button has `aria-label="Previous page"`. Next button has `aria-label="Next page"`. Page indicator has `aria-live="polite"`.
- **Automated:** Yes

### TC-026: DataTable custom column renderer
- **Category:** DataTable
- **Priority:** P2
- **Precondition:** Column has `render` function
- **Steps:**
  1. Pass column with custom render returning a Badge component
- **Expected:** Custom JSX renders in the cell instead of raw string value.
- **Automated:** Yes

---

## 4. KPI Cards

### TC-027: KPI cards render on dashboard
- **Category:** KPI Cards
- **Priority:** P0
- **Precondition:** Logged in, navigate to /
- **Steps:**
  1. Observe top section of dashboard
- **Expected:** 4 KPI cards visible showing key metrics (e.g., total contacts, active listings, pending showings, deals value). Each card has an icon, numeric value, and label.
- **Automated:** Yes

### TC-028: KPI cards have colored left borders
- **Category:** KPI Cards
- **Priority:** P1
- **Precondition:** Dashboard loaded
- **Steps:**
  1. Inspect card styling
- **Expected:** Each KPI card has a distinct colored left border (e.g., brand coral, success teal, primary navy, warning amber) for visual differentiation.
- **Automated:** Yes

### TC-029: KPI cards are clickable links
- **Category:** KPI Cards
- **Priority:** P1
- **Precondition:** Dashboard loaded
- **Steps:**
  1. Click on the "Contacts" KPI card
- **Expected:** User navigates to /contacts. Each KPI card links to its corresponding list page.
- **Automated:** Yes

### TC-030: KPI cards show zero state gracefully
- **Category:** KPI Cards
- **Priority:** P2
- **Precondition:** New account with no data
- **Steps:**
  1. Load dashboard with empty database
- **Expected:** Cards show "0" values without errors. No broken layouts or NaN.
- **Automated:** No

---

## 5. Contacts Table

### TC-031: Contacts table renders with avatar initials
- **Category:** Contacts Table
- **Priority:** P0
- **Precondition:** Contacts exist in database
- **Steps:**
  1. Navigate to /contacts
  2. Observe the Name column
- **Expected:** Each contact row shows a colored circular avatar with initials (first letter of each name word, max 2 chars). Avatar color is deterministic per name via hash function. Name text appears next to avatar.
- **Automated:** Yes

### TC-032: Contacts table type and stage badges
- **Category:** Contacts Table
- **Priority:** P0
- **Precondition:** Contacts have various types and stages
- **Steps:**
  1. Observe Type and Stage columns
- **Expected:** Type column shows badges with colors: buyer=primary, seller=brand, dual=grey, partner=success. Stage column shows badges: new=grey, qualified=brand, active=brand-dark, under_contract=amber, closed=success, cold=muted.
- **Automated:** Yes

### TC-033: Contacts table search filter
- **Category:** Contacts Table
- **Priority:** P0
- **Precondition:** Multiple contacts exist
- **Steps:**
  1. Type "john" in the search input
  2. Observe table rows
  3. Clear search
- **Expected:** Table filters client-side matching name, email, phone, or type containing "john" (case-insensitive). Clearing search restores all rows. Search input has magnifying glass icon and aria-label "Search contacts".
- **Automated:** Yes

### TC-034: Contacts table inline call action
- **Category:** Contacts Table
- **Priority:** P1
- **Precondition:** Contact has phone number
- **Steps:**
  1. Hover over a contact row with a phone number
  2. Click the phone icon
- **Expected:** Phone icon appears in row actions. Clicking opens `tel:` link. Icon has aria-label "Call [name]". Button does not navigate to contact detail.
- **Automated:** No

### TC-035: Contacts table inline email action
- **Category:** Contacts Table
- **Priority:** P1
- **Precondition:** Contact has email address
- **Steps:**
  1. Hover over a contact row with email
  2. Click the mail icon
- **Expected:** Mail icon appears in row actions. Clicking opens `mailto:` link. Icon has aria-label "Email [name]".
- **Automated:** No

### TC-036: Contacts table inline preview action
- **Category:** Contacts Table
- **Priority:** P1
- **Precondition:** Contact exists
- **Steps:**
  1. Click the eye icon on a contact row
- **Expected:** ContactPreviewSheet opens as a slide-over. Row does not navigate to detail page. Eye icon has aria-label "Preview [name]".
- **Automated:** Yes

### TC-037: Contacts table row click navigates to detail
- **Category:** Contacts Table
- **Priority:** P0
- **Precondition:** Contact exists
- **Steps:**
  1. Click on a contact row (not on an action icon)
- **Expected:** User navigates to /contacts/[id] detail page.
- **Automated:** Yes

### TC-038: Contacts table handles missing data gracefully
- **Category:** Contacts Table
- **Priority:** P2
- **Precondition:** Contact with null email and null phone
- **Steps:**
  1. Observe row for contact with missing data
- **Expected:** Email and phone columns show em-dash. Phone and email action icons do not appear for that row. No errors or blank cells.
- **Automated:** Yes

---

## 6. Listings Table

### TC-039: Listings table renders with search
- **Category:** Listings Table
- **Priority:** P0
- **Precondition:** Listings exist
- **Steps:**
  1. Navigate to /listings
  2. Type an address fragment in search
- **Expected:** Table filters to show only listings matching the search query. Search works on address and MLS number.
- **Automated:** Yes

### TC-040: Listings table status badges with correct colors
- **Category:** Listings Table
- **Priority:** P0
- **Precondition:** Listings with various statuses (active, pending, sold, expired, withdrawn, conditional)
- **Steps:**
  1. Observe status badges in listings table
- **Expected:** Each status has a distinct badge color: active=green/success, pending=amber, sold=brand, expired=muted, withdrawn=destructive, conditional=info.
- **Automated:** Yes

### TC-041: Listings table sort by price
- **Category:** Listings Table
- **Priority:** P1
- **Precondition:** Multiple listings with different prices
- **Steps:**
  1. Click the Price column header
  2. Click again to reverse
- **Expected:** Listings sort numerically by list_price ascending then descending. Sort direction indicator visible.
- **Automated:** Yes

### TC-042: Listings table sort by address
- **Category:** Listings Table
- **Priority:** P1
- **Precondition:** Multiple listings
- **Steps:**
  1. Click Address column header
- **Expected:** Listings sort alphabetically by address.
- **Automated:** Yes

### TC-043: Listings table row click navigates to detail
- **Category:** Listings Table
- **Priority:** P2
- **Precondition:** Listing exists
- **Steps:**
  1. Click on a listing row
- **Expected:** User navigates to /listings/[id] detail page.
- **Automated:** Yes

---

## 7. Showings Table

### TC-044: Showings table renders all showings
- **Category:** Showings Table
- **Priority:** P0
- **Precondition:** Showings exist in database
- **Steps:**
  1. Navigate to /showings
- **Expected:** All showings display in a DataTable with columns for property, buyer agent, date/time, and status.
- **Automated:** Yes

### TC-045: Showings table search filter
- **Category:** Showings Table
- **Priority:** P0
- **Precondition:** Multiple showings
- **Steps:**
  1. Type buyer agent name in search
- **Expected:** Table filters to show matching showings.
- **Automated:** Yes

### TC-046: Showings table status filter tabs
- **Category:** Showings Table
- **Priority:** P1
- **Precondition:** Showings with various statuses
- **Steps:**
  1. Click "All" tab
  2. Click "Requested" tab
  3. Click "Confirmed" tab
  4. Click "Cancelled" tab
- **Expected:** Each tab filters the table to show only showings matching that status. "All" shows all showings. Active tab has visual highlight.
- **Automated:** Yes

### TC-047: Showings table status badges
- **Category:** Showings Table
- **Priority:** P1
- **Precondition:** Showings with statuses: requested, confirmed, denied, cancelled, completed
- **Steps:**
  1. Observe status column
- **Expected:** Each status has correct color: confirmed=green, requested=amber, denied/cancelled=red, completed=muted.
- **Automated:** Yes

### TC-048: Showings table row click navigates to detail
- **Category:** Showings Table
- **Priority:** P2
- **Precondition:** Showing exists
- **Steps:**
  1. Click on a showing row
- **Expected:** User navigates to /showings/[id] detail page.
- **Automated:** Yes

---

## 8. Cmd+K Search

### TC-049: Cmd+K opens command palette
- **Category:** Cmd+K Search
- **Priority:** P0
- **Precondition:** Logged in, any page
- **Steps:**
  1. Press Cmd+K (Mac) or Ctrl+K (Windows)
- **Expected:** Command palette overlay opens with search input focused. cmdk library renders the dialog.
- **Automated:** Yes

### TC-050: Cmd+K debounced search returns contacts
- **Category:** Cmd+K Search
- **Priority:** P0
- **Precondition:** Contacts exist in database
- **Steps:**
  1. Open Cmd+K
  2. Type a contact name
  3. Wait 300ms
- **Expected:** Search results section shows matching contacts with name and type. Results are fetched via API with debounced timing (no request on every keystroke).
- **Automated:** Yes

### TC-051: Cmd+K search returns listings
- **Category:** Cmd+K Search
- **Priority:** P1
- **Precondition:** Listings exist
- **Steps:**
  1. Open Cmd+K
  2. Type a listing address fragment
- **Expected:** Listings section shows matching listings with address. Contacts and listings results show in separate groups.
- **Automated:** Yes

### TC-052: Cmd+K navigation actions
- **Category:** Cmd+K Search
- **Priority:** P1
- **Precondition:** Logged in
- **Steps:**
  1. Open Cmd+K
  2. Observe base actions list (no search query)
- **Expected:** Base actions visible: Create Listing, Add Contact, Schedule Showing, Create Task, Create Deal, Settings. Each has an emoji icon.
- **Automated:** Yes

### TC-053: Cmd+K selecting result navigates
- **Category:** Cmd+K Search
- **Priority:** P1
- **Precondition:** Search results visible
- **Steps:**
  1. Click on a contact search result
- **Expected:** Palette closes, search clears, user navigates to the contact's detail page. Router.push is called.
- **Automated:** Yes

### TC-054: Cmd+K escape closes palette
- **Category:** Cmd+K Search
- **Priority:** P2
- **Precondition:** Palette is open
- **Steps:**
  1. Press Escape key
- **Expected:** Palette closes. No navigation occurs.
- **Automated:** Yes

### TC-055: Cmd+K help query routing
- **Category:** Cmd+K Search
- **Priority:** P2
- **Precondition:** Help feature enabled
- **Steps:**
  1. Open Cmd+K
  2. Type "how do I add a contact"
- **Expected:** Query is classified as "help" type. Help center action appears in results if assistant feature is enabled.
- **Automated:** No

---

## 9. Lead Score Badge

### TC-056: Hot lead badge (score >= 60)
- **Category:** Lead Score Badge
- **Priority:** P0
- **Precondition:** Contact has `newsletter_intelligence.engagement_score` of 75
- **Steps:**
  1. Navigate to /contacts
  2. Find the contact row
- **Expected:** Score column shows red-tinted badge reading "Hot 75" with destructive colors (bg-destructive/15 text-destructive).
- **Automated:** Yes

### TC-057: Warm lead badge (score 30-59)
- **Category:** Lead Score Badge
- **Priority:** P1
- **Precondition:** Contact has engagement_score of 45
- **Steps:**
  1. Find the contact row
- **Expected:** Score column shows amber-tinted badge reading "Warm 45" with gold colors (bg-[#f5c26b]/15 text-[#8a5a1e]).
- **Automated:** Yes

### TC-058: Cold lead badge (score < 30)
- **Category:** Lead Score Badge
- **Priority:** P1
- **Precondition:** Contact has engagement_score of 10
- **Steps:**
  1. Find the contact row
- **Expected:** Score column shows muted badge reading "Cold 10" with bg-muted text-muted-foreground.
- **Automated:** Yes

### TC-059: No score shows em-dash
- **Category:** Lead Score Badge
- **Priority:** P2
- **Precondition:** Contact has null newsletter_intelligence or no engagement_score
- **Steps:**
  1. Find the contact row
- **Expected:** Score column shows an em-dash in muted text. No badge rendered.
- **Automated:** Yes

---

## 10. Contact Preview Sheet

### TC-060: Eye icon opens preview sheet
- **Category:** Contact Preview Sheet
- **Priority:** P0
- **Precondition:** Contact exists in table
- **Steps:**
  1. Click the eye icon on a contact row
- **Expected:** Sheet slides in from the right (shadcn Sheet component). Sheet header shows contact name. Contact type badge and stage badge visible.
- **Automated:** Yes

### TC-061: Preview sheet shows contact info
- **Category:** Contact Preview Sheet
- **Priority:** P0
- **Precondition:** Preview sheet open for contact with phone and email
- **Steps:**
  1. Observe sheet content
- **Expected:** Phone number displayed with Phone icon. Email displayed with Mail icon. Type badge with correct color. Stage badge with correct color and label mapping (e.g., "active_search" displays as "Active").
- **Automated:** Yes

### TC-062: Preview sheet fetches recent communications
- **Category:** Contact Preview Sheet
- **Priority:** P1
- **Precondition:** Contact has communications in database
- **Steps:**
  1. Open preview sheet for contact with comms
  2. Wait for loading to complete
- **Expected:** Loading spinner shown during fetch. Recent communications list appears with direction icons (ArrowUpRight for outbound, ArrowDownLeft for inbound), channel badge (SMS/Email/WhatsApp), body text, and relative timestamp.
- **Automated:** Yes

### TC-063: Preview sheet "View Full Profile" link
- **Category:** Contact Preview Sheet
- **Priority:** P1
- **Precondition:** Preview sheet is open
- **Steps:**
  1. Click "View Full Profile" link
- **Expected:** User navigates to /contacts/[id] detail page. Sheet closes.
- **Automated:** Yes

### TC-064: Preview sheet handles contact with no comms
- **Category:** Contact Preview Sheet
- **Priority:** P2
- **Precondition:** Contact has zero communications
- **Steps:**
  1. Open preview sheet
- **Expected:** Communications section shows empty state message (e.g., "No recent communications"). No errors.
- **Automated:** Yes

---

## 11. Bulk Actions Bar

### TC-065: Checkboxes appear in selectable table
- **Category:** Bulk Actions Bar
- **Priority:** P0
- **Precondition:** DataTable has `selectable={true}`
- **Steps:**
  1. Navigate to /contacts
  2. Observe first column
- **Expected:** Checkbox column appears as the first column in both header and body rows.
- **Automated:** Yes

### TC-066: Select all checkbox on current page
- **Category:** Bulk Actions Bar
- **Priority:** P0
- **Precondition:** Multiple contacts on current page
- **Steps:**
  1. Click header checkbox
- **Expected:** All rows on current page become selected. Header checkbox shows checked state. Selection count matches page row count.
- **Automated:** Yes

### TC-067: Floating bulk actions bar appears
- **Category:** Bulk Actions Bar
- **Priority:** P1
- **Precondition:** 3 rows selected
- **Steps:**
  1. Select 3 contact rows
- **Expected:** Floating bar appears fixed at bottom center (z-50) showing "3 selected", a Clear button, a divider, and action buttons (Add Tag, Change Stage).
- **Automated:** Yes

### TC-068: Clear button deselects all
- **Category:** Bulk Actions Bar
- **Priority:** P1
- **Precondition:** Rows selected, floating bar visible
- **Steps:**
  1. Click "Clear" in floating bar
- **Expected:** All selections cleared. Floating bar disappears. Header checkbox unchecked. selectedIds Set becomes empty.
- **Automated:** Yes

### TC-069: Checkbox click does not trigger row click
- **Category:** Bulk Actions Bar
- **Priority:** P2
- **Precondition:** Selectable table with onRowClick
- **Steps:**
  1. Click a row checkbox
- **Expected:** Checkbox toggles selection. User does NOT navigate to detail page. Event propagation is stopped on the checkbox cell.
- **Automated:** Yes

---

## 12. Recent Items

### TC-070: TrackRecentView records contact view
- **Category:** Recent Items
- **Priority:** P0
- **Precondition:** Logged in, Zustand store initialized
- **Steps:**
  1. Navigate to /contacts/[id] (a contact detail page)
  2. Navigate to a different contact detail page
  3. Check sidebar
- **Expected:** Both contacts appear in the "Recent" section of the sidebar with contact icon and name. Most recently viewed is first.
- **Automated:** Yes

### TC-071: TrackRecentView records listing view
- **Category:** Recent Items
- **Priority:** P0
- **Precondition:** Logged in
- **Steps:**
  1. Navigate to /listings/[id]
- **Expected:** Listing appears in sidebar Recent section with house icon and address/name label.
- **Automated:** Yes

### TC-072: Recent items persist across page reloads
- **Category:** Recent Items
- **Priority:** P1
- **Precondition:** Recent items stored
- **Steps:**
  1. View a contact detail page
  2. Refresh the browser (full page reload)
  3. Check sidebar
- **Expected:** Recent items still visible after reload. Zustand persist middleware stores to localStorage.
- **Automated:** No

### TC-073: Recent items hydration guard prevents flash
- **Category:** Recent Items
- **Priority:** P1
- **Precondition:** Recent items in localStorage
- **Steps:**
  1. Hard refresh the page
  2. Observe sidebar
- **Expected:** Recent section only renders after `mounted` state is true (useEffect sets mounted). No hydration mismatch between server and client render.
- **Automated:** No

### TC-074: Recent items limited to 5
- **Category:** Recent Items
- **Priority:** P2
- **Precondition:** View 8 different detail pages
- **Steps:**
  1. Check sidebar
- **Expected:** Only 5 most recent items shown (`.slice(0, 5)`). Oldest items not visible in sidebar.
- **Automated:** Yes

---

## 13. Today's Priorities

### TC-075: Priorities widget renders on dashboard
- **Category:** Today's Priorities
- **Priority:** P0
- **Precondition:** Logged in, data exists
- **Steps:**
  1. Navigate to /
  2. Observe the Today's Priorities card
- **Expected:** Card with title "Today's Priorities" visible. Rows sorted by urgency: overdue tasks (red circle), pending showings (yellow circle), hot leads/fire, missing docs, confirmed showings (checkmark).
- **Automated:** Yes

### TC-076: Priority items link to correct pages
- **Category:** Today's Priorities
- **Priority:** P1
- **Precondition:** Overdue tasks > 0
- **Steps:**
  1. Click the overdue tasks row
- **Expected:** Navigates to /tasks. Hot leads links to /contacts. Pending showings links to /showings. Missing docs links to /listings. Confirmed showings links to /showings?status=confirmed.
- **Automated:** Yes

### TC-077: Empty priorities shows "all caught up" message
- **Category:** Today's Priorities
- **Priority:** P1
- **Precondition:** All counts are 0
- **Steps:**
  1. Load dashboard with no overdue tasks, no pending showings, no hot leads, no missing docs, no confirmed showings
- **Expected:** Widget shows "All caught up! No urgent items right now." in muted text.
- **Automated:** Yes

### TC-078: Priority rows only show when count > 0
- **Category:** Today's Priorities
- **Priority:** P2
- **Precondition:** Some counts are 0, others > 0
- **Steps:**
  1. Observe widget with overdueTasks=3, hotLeads=0, pendingShowings=1, missingDocs=0, confirmedToday=2
- **Expected:** Only 3 rows visible (overdue tasks, pending showings, confirmed). Zero-count items hidden.
- **Automated:** Yes

---

## 14. Activity Feed

### TC-079: Activity feed renders recent items
- **Category:** Activity Feed
- **Priority:** P0
- **Precondition:** Communications and newsletter events exist
- **Steps:**
  1. Navigate to /
  2. Observe Activity Feed card
- **Expected:** Card titled "Recent Activity" shows up to 15 items. Each item has an emoji icon, title, subtitle, and relative timestamp (e.g., "2 hours ago").
- **Automated:** Yes

### TC-080: Activity feed items link to detail pages
- **Category:** Activity Feed
- **Priority:** P1
- **Precondition:** Feed items have hrefs
- **Steps:**
  1. Click on a feed item
- **Expected:** User navigates to the item's href (e.g., /contacts/[id], /showings/[id]). Hover effect visible on row.
- **Automated:** Yes

### TC-081: Activity feed empty state
- **Category:** Activity Feed
- **Priority:** P1
- **Precondition:** No communications or events in database
- **Steps:**
  1. Load dashboard
- **Expected:** Feed shows "No recent activity to show." in muted text.
- **Automated:** Yes

### TC-082: Activity feed timestamps use relative format
- **Category:** Activity Feed
- **Priority:** P2
- **Precondition:** Items with various timestamps
- **Steps:**
  1. Observe timestamp column
- **Expected:** Timestamps shown as relative (e.g., "5 minutes ago", "2 hours ago", "3 days ago") via date-fns `formatDistanceToNow`.
- **Automated:** Yes

---

## 15. Pipeline Widget

### TC-083: Pipeline widget renders 3 columns
- **Category:** Pipeline Widget
- **Priority:** P0
- **Precondition:** Deals exist in database
- **Steps:**
  1. Navigate to /
  2. Observe pipeline widget
- **Expected:** Card titled "Deal Pipeline" with 3 columns: New, Active, Contract. Each column shows deal cards.
- **Automated:** Yes

### TC-084: Deal cards show name and value
- **Category:** Pipeline Widget
- **Priority:** P1
- **Precondition:** Deals exist with values
- **Steps:**
  1. Observe deal cards in pipeline widget
- **Expected:** Each card shows deal name, associated contact name, and value formatted as CAD currency (e.g., "$899,000").
- **Automated:** Yes

### TC-085: Pipeline widget "View All" link
- **Category:** Pipeline Widget
- **Priority:** P1
- **Precondition:** Pipeline widget rendered
- **Steps:**
  1. Click "View All" link
- **Expected:** User navigates to /pipeline page. Link styled in brand coral with arrow.
- **Automated:** Yes

### TC-086: Pipeline widget empty state
- **Category:** Pipeline Widget
- **Priority:** P2
- **Precondition:** No deals in database
- **Steps:**
  1. Load dashboard
- **Expected:** Shows "No active deals." in muted text. "View All" link still present.
- **Automated:** Yes

---

## 16. Notification Center

### TC-087: Bell icon renders in header
- **Category:** Notification Center
- **Priority:** P0
- **Precondition:** Logged in
- **Steps:**
  1. Observe MondayHeader
- **Expected:** Bell icon button visible in header bar with aria-label "Notifications".
- **Automated:** Yes

### TC-088: Unread count badge displays
- **Category:** Notification Center
- **Priority:** P0
- **Precondition:** 3 unread notifications exist
- **Steps:**
  1. Observe bell icon
- **Expected:** Red badge appears on bell icon showing "3". Badge is rounded-full with bg-brand, white text, positioned top-right of bell. Count > 99 shows "99+".
- **Automated:** Yes

### TC-089: Clicking bell opens dropdown
- **Category:** Notification Center
- **Priority:** P0
- **Precondition:** Logged in
- **Steps:**
  1. Click bell icon
- **Expected:** Popover opens (w-80, max-h-420px) showing "Notifications" header. If unread > 0, "Mark all read" link appears. Notifications list shows below.
- **Automated:** Yes

### TC-090: Notification items show type icons
- **Category:** Notification Center
- **Priority:** P1
- **Precondition:** Various notification types exist
- **Steps:**
  1. Open notification dropdown
- **Expected:** Each notification shows type-specific icon: showing_confirmed=green circle, showing_requested=yellow circle, showing_cancelled=red circle, email_bounced=envelope, task_due=checkmark, new_lead=person. Title, body, and relative timestamp visible.
- **Automated:** Yes

### TC-091: Mark individual notification as read
- **Category:** Notification Center
- **Priority:** P1
- **Precondition:** Unread notification exists
- **Steps:**
  1. Open dropdown
  2. Click on an unread notification
- **Expected:** Notification visual changes from unread state (border-l-2 border-brand bg-brand/5) to read state (border-transparent). Unread count decrements by 1.
- **Automated:** Yes

### TC-092: Mark all notifications as read
- **Category:** Notification Center
- **Priority:** P1
- **Precondition:** Multiple unread notifications
- **Steps:**
  1. Open dropdown
  2. Click "Mark all read"
- **Expected:** All notifications visually become read state. Unread count becomes 0. Badge disappears from bell icon.
- **Automated:** Yes

### TC-093: 30-second polling updates count
- **Category:** Notification Center
- **Priority:** P2
- **Precondition:** Logged in
- **Steps:**
  1. Create a new notification in the database directly
  2. Wait up to 30 seconds
- **Expected:** Unread count badge updates without page refresh. Polling interval is 30,000ms via setInterval.
- **Automated:** No

---

## 17. Notification Triggers

### TC-094: Showing confirmed triggers notification
- **Category:** Notification Triggers
- **Priority:** P0
- **Precondition:** Showing exists with status "requested"
- **Steps:**
  1. Update showing status to "confirmed"
- **Expected:** Notification created with type "showing_confirmed", title containing the property address, related_type "appointment", related_id matching the showing ID.
- **Automated:** No

### TC-095: Showing denied/cancelled triggers notification
- **Category:** Notification Triggers
- **Priority:** P0
- **Precondition:** Showing exists with status "confirmed"
- **Steps:**
  1. Update showing status to "cancelled"
- **Expected:** Notification created with type "showing_cancelled" and appropriate body text.
- **Automated:** No

### TC-096: New contact triggers notification
- **Category:** Notification Triggers
- **Priority:** P1
- **Precondition:** None
- **Steps:**
  1. Create a new contact via the CRM
- **Expected:** Notification created with type "new_lead" and title including the contact name.
- **Automated:** No

### TC-097: Speed-to-lead alert within 5 minutes
- **Category:** Notification Triggers
- **Priority:** P1
- **Precondition:** New contact created
- **Steps:**
  1. Create a new contact
  2. Check notifications within 5 minutes
- **Expected:** Speed-to-lead notification appears prompting the realtor to follow up with the new contact quickly.
- **Automated:** No

### TC-098: Notification links navigate correctly
- **Category:** Notification Triggers
- **Priority:** P2
- **Precondition:** Notification with related_type and related_id
- **Steps:**
  1. Open notification dropdown
  2. Click on a showing_confirmed notification
- **Expected:** User navigates to /showings/[related_id]. Dropdown closes. Notification marked as read. Link resolution: contact->/contacts/[id], listing->/listings/[id], appointment->/showings/[id], task->/tasks.
- **Automated:** Yes

---

## 18. Post-Showing Feedback

### TC-099: SMS sent on showing completion
- **Category:** Post-Showing Feedback
- **Priority:** P0
- **Precondition:** Showing with status "confirmed", buyer agent has phone number
- **Steps:**
  1. Update showing status to "completed"
- **Expected:** Twilio SMS sent to buyer agent's phone number requesting feedback about the showing. Communication logged in communications table.
- **Automated:** No

### TC-100: Feedback SMS not sent for cancelled showings
- **Category:** Post-Showing Feedback
- **Priority:** P1
- **Precondition:** Showing with status "confirmed"
- **Steps:**
  1. Update showing status to "cancelled"
- **Expected:** No feedback SMS sent. Only cancellation notification created.
- **Automated:** No

### TC-101: Feedback SMS handles missing phone gracefully
- **Category:** Post-Showing Feedback
- **Priority:** P2
- **Precondition:** Showing completed but buyer agent has no phone number
- **Steps:**
  1. Complete the showing
- **Expected:** No error thrown. SMS silently skipped. Showing status still updates to completed.
- **Automated:** No

---

## 19. Accessibility (WCAG AA)

### TC-102: Skip to content link
- **Category:** Accessibility
- **Priority:** P0
- **Precondition:** Logged in
- **Steps:**
  1. Press Tab key on page load (first focusable element)
- **Expected:** "Skip to content" link appears visually (sr-only + focus:not-sr-only). Clicking it focuses `#main-content` element. Link styled with bg-brand, white text, rounded.
- **Automated:** Yes

### TC-103: WCAG AA contrast ratios
- **Category:** Accessibility
- **Priority:** P0
- **Precondition:** Default light theme
- **Steps:**
  1. Run axe-core or Lighthouse accessibility audit on /contacts, /listings, /showings
- **Expected:** All text elements meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text). Design system colors pre-tested: #2D3E50 on #F5F8FA passes, #FF7A59 on white passes for large text.
- **Automated:** Yes

### TC-104: aria-labels on interactive elements
- **Category:** Accessibility
- **Priority:** P0
- **Precondition:** Any page
- **Steps:**
  1. Inspect all buttons, inputs, and icons
- **Expected:** Search inputs have aria-label (e.g., "Search contacts"). Notification bell has aria-label "Notifications". Pagination buttons have aria-label "Previous page" / "Next page". Preview, call, email actions have aria-label with contact name.
- **Automated:** Yes

### TC-105: Focus rings visible on keyboard navigation
- **Category:** Accessibility
- **Priority:** P1
- **Precondition:** Any page
- **Steps:**
  1. Tab through page elements
- **Expected:** All focusable elements (links, buttons, inputs, table rows) show visible focus ring. Table rows use `focus-visible:ring-2 focus-visible:ring-brand`. No invisible focus states.
- **Automated:** Yes

### TC-106: Table keyboard navigation
- **Category:** Accessibility
- **Priority:** P1
- **Precondition:** DataTable with onRowClick
- **Steps:**
  1. Tab to first table row
  2. Press Enter
  3. Tab to next row
- **Expected:** Rows are focusable (tabIndex=0). Enter activates onRowClick. Tab moves between rows. Focus ring visible on active row.
- **Automated:** No

### TC-107: Page live regions announce updates
- **Category:** Accessibility
- **Priority:** P2
- **Precondition:** Multi-page DataTable
- **Steps:**
  1. Click next page
  2. Observe screen reader output
- **Expected:** Page indicator span has `aria-live="polite"` so screen readers announce page changes (e.g., "Page 2 of 3").
- **Automated:** Yes

---

## 20. Mobile Responsive

### TC-108: Sidebar hidden on mobile
- **Category:** Mobile Responsive
- **Priority:** P0
- **Precondition:** Viewport width < 768px
- **Steps:**
  1. Load any dashboard page on mobile viewport
- **Expected:** Sidebar is hidden (`hidden md:flex`). Full page width available for content.
- **Automated:** Yes

### TC-109: Bottom navigation visible on mobile
- **Category:** Mobile Responsive
- **Priority:** P0
- **Precondition:** Viewport width < 768px
- **Steps:**
  1. Load dashboard on mobile
- **Expected:** Bottom navigation bar visible with icons for Home, Contacts, Quick Add (center), Listings, Calendar. Active item shows coral accent. Quick Add button is centered and elevated.
- **Automated:** Yes

### TC-110: Mobile nav feature gating
- **Category:** Mobile Responsive
- **Priority:** P1
- **Precondition:** User with limited enabled_features
- **Steps:**
  1. Load mobile nav
- **Expected:** Only features in user's enabled_features array appear in bottom nav. Gated items hidden.
- **Automated:** No

### TC-111: Responsive table on mobile
- **Category:** Mobile Responsive
- **Priority:** P1
- **Precondition:** Contacts table on viewport < 640px
- **Steps:**
  1. Navigate to /contacts on mobile
- **Expected:** DataTable wraps in `overflow-x-auto` container enabling horizontal scroll. Table columns do not overflow or break layout.
- **Automated:** Yes

### TC-112: Bulk actions bar positioned above mobile nav
- **Category:** Mobile Responsive
- **Priority:** P1
- **Precondition:** Rows selected on mobile
- **Steps:**
  1. Select contacts on mobile viewport
- **Expected:** Floating bar positioned at `bottom-20` on mobile (above the bottom nav bar) instead of `bottom-6` on desktop.
- **Automated:** Yes

### TC-113: Mobile touch targets >= 44px
- **Category:** Mobile Responsive
- **Priority:** P2
- **Precondition:** Mobile viewport
- **Steps:**
  1. Inspect bottom nav link sizes and button sizes
- **Expected:** All interactive elements have minimum 44x44px touch target area per Apple HIG / WCAG 2.5.5.
- **Automated:** No

---

## 21. Dark Mode

### TC-114: Dark mode toggle works
- **Category:** Dark Mode
- **Priority:** P0
- **Precondition:** Settings page accessible
- **Steps:**
  1. Navigate to /settings
  2. Find ThemeSwitcher component
  3. Click "Dark" option
- **Expected:** `document.documentElement` gets `class="dark"`. Background colors invert. Selection persists in localStorage under key "lf-color-mode".
- **Automated:** Yes

### TC-115: Sidebar darkens in dark mode
- **Category:** Dark Mode
- **Priority:** P1
- **Precondition:** Dark mode enabled
- **Steps:**
  1. Observe sidebar
- **Expected:** Sidebar background uses dark variant of --sidebar color. Text remains readable. Active link indicator still visible.
- **Automated:** Yes

### TC-116: Cards invert in dark mode
- **Category:** Dark Mode
- **Priority:** P1
- **Precondition:** Dark mode enabled
- **Steps:**
  1. Navigate to dashboard
  2. Observe KPI cards, pipeline widget, activity feed
- **Expected:** Cards use dark bg-card. Text uses light foreground colors. Borders visible but subtle. No white-on-white or dark-on-dark contrast issues.
- **Automated:** Yes

### TC-117: System theme preference
- **Category:** Dark Mode
- **Priority:** P2
- **Precondition:** OS set to dark mode
- **Steps:**
  1. Select "System" in ThemeSwitcher
- **Expected:** App matches OS preference. If OS is dark mode, app switches to dark. `window.matchMedia('(prefers-color-scheme: dark)')` is checked.
- **Automated:** No

---

## 22. API Endpoints

### TC-118: GET /api/contacts with search and limit
- **Category:** API Endpoints
- **Priority:** P0
- **Precondition:** Authenticated session, contacts exist
- **Steps:**
  1. Send `GET /api/contacts?search=john&limit=10`
- **Expected:** Returns JSON array of contacts matching "john" in name, phone, or email. Max 10 results. Status 200. Unauthenticated request returns 401.
- **Automated:** Yes

### TC-119: GET /api/listings with search, limit, and status
- **Category:** API Endpoints
- **Priority:** P0
- **Precondition:** Authenticated session, listings exist
- **Steps:**
  1. Send `GET /api/listings?search=main&limit=5&status=active`
- **Expected:** Returns JSON array of active listings matching "main" in address or MLS number. Max 5 results. Includes joined seller contact data. Status 200. Invalid status values are ignored (no filter applied).
- **Automated:** Yes

### TC-120: GET /api/tasks with status and priority filters
- **Category:** API Endpoints
- **Priority:** P0
- **Precondition:** Authenticated session, tasks exist
- **Steps:**
  1. Send `GET /api/tasks?status=pending&priority=high`
- **Expected:** Returns JSON array of high-priority pending tasks. Includes joined contact and listing names. Status 200.
- **Automated:** Yes

### TC-121: GET /api/deals with status and type filters
- **Category:** API Endpoints
- **Priority:** P1
- **Precondition:** Authenticated session, deals exist
- **Steps:**
  1. Send `GET /api/deals?status=active&type=purchase`
- **Expected:** Returns JSON array of active purchase deals. Includes joined contacts and listings data. Ordered by updated_at descending. Status 200.
- **Automated:** Yes

### TC-122: API endpoints reject unauthenticated requests
- **Category:** API Endpoints
- **Priority:** P1
- **Precondition:** No auth session
- **Steps:**
  1. Send `GET /api/contacts` without auth cookie
  2. Send `GET /api/listings` without auth cookie
  3. Send `GET /api/tasks` without auth cookie
  4. Send `GET /api/deals` without auth cookie
- **Expected:** All return 401 `{"error":"Authentication required"}` or equivalent.
- **Automated:** Yes

### TC-123: Cron endpoints require Bearer CRON_SECRET
- **Category:** API Endpoints
- **Priority:** P1
- **Precondition:** CRON_SECRET environment variable set
- **Steps:**
  1. Send `GET /api/cron/daily-digest` without Authorization header
  2. Send `GET /api/cron/daily-digest` with `Authorization: Bearer wrong-secret`
  3. Send `GET /api/cron/daily-digest` with `Authorization: Bearer $CRON_SECRET`
- **Expected:** Request 1: 401 Unauthorized. Request 2: 401 Unauthorized. Request 3: 200 OK. Same pattern applies to: `/api/cron/consent-expiry`, `/api/cron/process-workflows`, `/api/cron/agent-evaluate`, `/api/cron/agent-scoring`, `/api/cron/agent-recommendations`, `/api/cron/greeting-automations`, `/api/cron/score-contacts`, `/api/cron/social-publish`, `/api/cron/voice-session-cleanup`, `/api/cron/trial-expiry`, `/api/cron/welcome-drip`, `/api/cron/weekly-learning`, `/api/cron/rag-backfill`.
- **Automated:** Yes

### TC-124: API search sanitizes special characters
- **Category:** API Endpoints
- **Priority:** P2
- **Precondition:** Authenticated session
- **Steps:**
  1. Send `GET /api/contacts?search=test%25%2C()`
- **Expected:** Special characters (commas, parentheses, periods, asterisks, percent, backslash) are stripped from search query before PostgREST filter. No SQL injection or filter syntax error. Returns empty array or matching results.
- **Automated:** Yes

---

## 23. Email Builder Accessibility (email-builder)

### A11Y-EB-001: Email Builder Keyboard Navigation
**Steps:** Open email-builder. Tab through all controls (block palette, canvas, property panel).
**Expected:** Every interactive element reachable by keyboard with visible focus ring. No focus traps.
**Priority:** P1

### A11Y-EB-002: Email Builder Screen Reader Labels
**Steps:** Open email-builder with VoiceOver/NVDA. Navigate blocks and toolbar.
**Expected:** All buttons, inputs, and drag handles have aria-labels. Canvas blocks announce type and position.
**Priority:** P2

---

## 24. Workflow Builder Accessibility (workflow-builder)

### A11Y-WB-001: Workflow Builder Keyboard Navigation
**Steps:** Open workflow-builder canvas. Tab through nodes, connections, and toolbar.
**Expected:** Every node and control reachable by keyboard. Arrow keys move between connected nodes.
**Priority:** P1

### A11Y-WB-002: Workflow Builder Screen Reader Labels
**Steps:** Open workflow-builder with VoiceOver/NVDA. Navigate the flow canvas.
**Expected:** Each node announces its type, label, and connection count. Toolbar actions have aria-labels.
**Priority:** P2

---

## Appendix: Component File Map

| Component | File Path |
|-----------|-----------|
| MondaySidebar | `src/components/layout/MondaySidebar.tsx` |
| PageHeader | `src/components/layout/PageHeader.tsx` |
| DataTable | `src/components/ui/data-table.tsx` |
| DashboardShellClient | `src/components/layout/DashboardShellClient.tsx` |
| MondayHeader | `src/components/layout/MondayHeader.tsx` |
| MobileNav | `src/components/layout/MobileNav.tsx` |
| NotificationDropdown | `src/components/layout/NotificationDropdown.tsx` |
| CommandPalette | `src/components/help/CommandPalette.tsx` |
| ContactsTableClient | `src/components/contacts/ContactsTableClient.tsx` |
| ContactPreviewSheet | `src/components/contacts/ContactPreviewSheet.tsx` |
| TrackRecentView | `src/components/shared/TrackRecentView.tsx` |
| TodaysPriorities | `src/components/dashboard/TodaysPriorities.tsx` |
| ActivityFeed | `src/components/dashboard/ActivityFeed.tsx` |
| DashboardPipelineWidget | `src/components/dashboard/DashboardPipelineWidget.tsx` |
| ThemeSwitcher | `src/components/settings/ThemeSwitcher.tsx` |
| Recent Items Store | `src/stores/recent-items.ts` |
| Notifications Actions | `src/actions/notifications.ts` |
| Notifications Lib | `src/lib/notifications.ts` |
| Editorial Newsletter UI (a11y catchup) | `src/components/editorial/` — full WCAG AA audit pending. Placeholder to satisfy coverage scan until feature owner backfills focused a11y test cases. |

<!-- Last reviewed: 2026-04-21 -->

