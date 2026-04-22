<!-- docs-audit-reviewed: 2026-04-21 --task-mgmt -->
<!-- docs-audit: src/components/contacts/**, src/components/listings/**, src/components/showings/**, src/app/(dashboard)/** -->
# Test Plan: UI/UX Sprint Changes

**Version:** 1.0
**Date:** 2026-04-12
**Scope:** All features built across the UI/UX improvement sprints: mobile collapsible sidebars, contact filter bar, bulk operations, communication timeline pagination, form responsive grids, loading skeletons, newsletter queue fix, dashboard newLeadsToday, workflow auto-expand, accessibility improvements, print styles, and document query limit.
**Total Test Cases:** 101

---

## Summary Table

| # | Category | Test Cases | P0 | P1 | P2 |
|---|----------|------------|----|----|-----|
| 1 | Mobile Collapsible Sidebars | 8 | 3 | 3 | 2 |
| 2 | Contact Filter Bar | 8 | 3 | 3 | 2 |
| 3 | Bulk Operations — Stage Change | 8 | 4 | 3 | 1 |
| 4 | Bulk Operations — CSV Export | 7 | 3 | 3 | 1 |
| 5 | Bulk Operations — Delete | 7 | 4 | 2 | 1 |
| 6 | Communication Timeline Load More | 6 | 2 | 3 | 1 |
| 7 | Form Responsive Grids | 6 | 2 | 3 | 1 |
| 8 | Loading Skeletons | 4 | 1 | 2 | 1 |
| 9 | Newsletter Queue Fix | 4 | 2 | 1 | 1 |
| 10 | Dashboard newLeadsToday | 4 | 2 | 1 | 1 |
| 11 | Workflow Auto-Expand | 5 | 2 | 2 | 1 |
| 12 | Accessibility | 10 | 4 | 4 | 2 |
| 13 | Print Styles | 5 | 1 | 3 | 1 |
| 14 | Document Query Limit | 3 | 2 | 1 | 0 |
| 15 | Integration Tests (Server Actions) | 8 | 5 | 3 | 0 |
| 16 | Regression Tests | 8 | 4 | 3 | 1 |
| **Total** | | **101** | **44** | **43** | **14** |

---

## 1. Mobile Collapsible Sidebars

### SP-001: Listing detail sidebar collapses on mobile
- **Category:** Mobile Collapsible Sidebars
- **Priority:** P0
- **Precondition:** Logged in, navigate to /listings/[id], viewport 375px wide
- **Steps:**
  1. Open a listing detail page on a 375px viewport
  2. Look for a `<details>` element containing sidebar content (documents, enrichment, etc.)
  3. Tap the `<summary>` element to expand
  4. Tap again to collapse
- **Expected:** Sidebar content is hidden by default inside a collapsed `<details>` element. Tapping `<summary>` expands to show the full sidebar content. Tapping again collapses it. No horizontal overflow.
- **Automated:** Yes (Playwright)

### SP-002: Showing detail sidebar collapses on mobile
- **Category:** Mobile Collapsible Sidebars
- **Priority:** P0
- **Precondition:** Logged in, navigate to /showings/[id], viewport 375px wide
- **Steps:**
  1. Open a showing detail page on a 375px viewport
  2. Locate the `<details>` element for sidebar content
  3. Toggle open and closed
- **Expected:** Sidebar info (showing status, contact details, calendar link) is inside a collapsible `<details>`. Collapsed by default. Expands on tap. Content is fully readable without horizontal scroll.
- **Automated:** Yes (Playwright)

### SP-003: Contact detail sidebar collapses on mobile
- **Category:** Mobile Collapsible Sidebars
- **Priority:** P0
- **Precondition:** Logged in, navigate to /contacts/[id], viewport 375px wide
- **Steps:**
  1. Open a contact detail page on a 375px viewport
  2. Locate the `<details>` element for sidebar content
  3. Toggle open and closed
- **Expected:** Sidebar content (contact info, tags, notes) is inside a collapsible `<details>`. Hidden by default. Expands on tap. No layout breakage.
- **Automated:** Yes (Playwright)

### SP-004: Desktop listing detail shows sidebar as aside
- **Category:** Mobile Collapsible Sidebars
- **Priority:** P1
- **Precondition:** Logged in, navigate to /listings/[id], viewport 1280px wide
- **Steps:**
  1. Open a listing detail page on desktop viewport
  2. Observe the layout
- **Expected:** Sidebar renders as a visible `<aside>` element alongside the main content in a two-column layout. No `<details>` wrapper is visible or the `<details>` is permanently open. Full sidebar content visible without clicking.
- **Automated:** Yes (Playwright)

### SP-005: Desktop showing detail shows sidebar as aside
- **Category:** Mobile Collapsible Sidebars
- **Priority:** P1
- **Precondition:** Logged in, navigate to /showings/[id], viewport 1280px wide
- **Steps:**
  1. Open a showing detail page on desktop viewport
- **Expected:** Sidebar visible as `<aside>` in two-column layout. No toggling needed.
- **Automated:** Yes (Playwright)

### SP-006: Desktop contact detail shows sidebar as aside
- **Category:** Mobile Collapsible Sidebars
- **Priority:** P1
- **Precondition:** Logged in, navigate to /contacts/[id], viewport 1280px wide
- **Steps:**
  1. Open a contact detail page on desktop viewport
- **Expected:** Sidebar visible as `<aside>` in two-column layout. No toggling needed.
- **Automated:** Yes (Playwright)

### SP-007: Mobile sidebar summary has descriptive label
- **Category:** Mobile Collapsible Sidebars
- **Priority:** P2
- **Precondition:** Mobile viewport, detail page
- **Steps:**
  1. Inspect the `<summary>` element text
- **Expected:** Summary element has a descriptive label (e.g., "Details", "Sidebar Info", or similar) rather than a generic icon only. Readable by screen readers.
- **Automated:** No

### SP-008: Sidebar toggle does not cause layout shift
- **Category:** Mobile Collapsible Sidebars
- **Priority:** P2
- **Precondition:** Mobile viewport, detail page
- **Steps:**
  1. Open sidebar via `<details>` toggle
  2. Observe if main content jumps or shifts unexpectedly
- **Expected:** Content below the sidebar section smoothly pushes down. No horizontal overflow. No jarring layout shift above the fold.
- **Automated:** No

---

## 2. Contact Filter Bar

### SP-009: Filter bar renders with type, stage, engagement dropdowns
- **Category:** Contact Filter Bar
- **Priority:** P0
- **Precondition:** Logged in, navigate to /contacts
- **Steps:**
  1. Observe the area above or within the contacts table
- **Expected:** Three dropdown/select elements visible: Type (buyer/seller/both/other), Stage (lead/active/past client/dormant), and Engagement (hot/warm/cold or score ranges). A "Clear" button is also present.
- **Automated:** Yes (Playwright)

### SP-010: Type filter restricts contacts table
- **Category:** Contact Filter Bar
- **Priority:** P0
- **Precondition:** Contacts exist with different types (buyer, seller)
- **Steps:**
  1. Select "buyer" from the Type dropdown
  2. Observe the table
  3. Select "seller" from the Type dropdown
- **Expected:** Table shows only contacts matching the selected type. Row count updates. Selecting a different value immediately re-filters. Selecting "All" or clearing shows all contacts.
- **Automated:** Yes (Playwright)

### SP-011: Stage filter restricts contacts table
- **Category:** Contact Filter Bar
- **Priority:** P0
- **Precondition:** Contacts exist with different stages
- **Steps:**
  1. Select "lead" from the Stage dropdown
  2. Observe the table
- **Expected:** Only contacts with stage "lead" are displayed. Changing stage re-filters immediately.
- **Automated:** Yes (Playwright)

### SP-012: Engagement filter restricts contacts table
- **Category:** Contact Filter Bar
- **Priority:** P1
- **Precondition:** Contacts exist with varying engagement scores
- **Steps:**
  1. Select "hot" (or high engagement) from the Engagement dropdown
  2. Observe the table
- **Expected:** Only contacts matching the engagement criteria are shown. Row count reflects the filter.
- **Automated:** Yes (Playwright)

### SP-013: Multiple filters combine (AND logic)
- **Category:** Contact Filter Bar
- **Priority:** P1
- **Precondition:** Contacts exist with varied type, stage, engagement
- **Steps:**
  1. Set Type = "buyer"
  2. Set Stage = "lead"
  3. Observe the table
- **Expected:** Only contacts matching BOTH filters are shown (buyer AND lead). All three filters combine with AND logic.
- **Automated:** Yes (Playwright)

### SP-014: Clear button resets all filters
- **Category:** Contact Filter Bar
- **Priority:** P1
- **Precondition:** One or more filters active
- **Steps:**
  1. Apply Type = "seller" and Stage = "active"
  2. Click the "Clear" button
- **Expected:** All filter dropdowns reset to their default (All/Any) value. Table shows all contacts. URL search params cleared if filters are URL-driven.
- **Automated:** Yes (Playwright)

### SP-015: Filter bar empty state
- **Category:** Contact Filter Bar
- **Priority:** P2
- **Precondition:** Filter combination matches zero contacts
- **Steps:**
  1. Set a filter combination that yields no results
- **Expected:** Table shows empty state message (e.g., "No contacts found"). Filter dropdowns remain set to the selected values. Clear button is available.
- **Automated:** Yes (Playwright)

### SP-016: Filter bar accessible via keyboard
- **Category:** Contact Filter Bar
- **Priority:** P2
- **Precondition:** Navigate to /contacts
- **Steps:**
  1. Tab to the Type dropdown
  2. Use arrow keys to select a value
  3. Tab to Stage dropdown, select
  4. Tab to Clear button, press Enter
- **Expected:** All dropdowns are keyboard-accessible. Focus order is Type > Stage > Engagement > Clear. Selected values apply on change. Clear button activates on Enter/Space.
- **Automated:** No

---

## 3. Bulk Operations — Stage Change

### SP-017: Bulk stage change with valid stage
- **Category:** Bulk Operations — Stage Change
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** 3 contacts of type "buyer" in stage "lead"
- **Steps:**
  1. Call `bulkUpdateContactStage(contactIds, "active")` with the 3 contact IDs
- **Expected:** All 3 contacts updated to stage "active". Function returns success. Database reflects the change on all 3 rows.
- **Automated:** Yes

### SP-018: Bulk stage change with empty array
- **Category:** Bulk Operations — Stage Change
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** None
- **Steps:**
  1. Call `bulkUpdateContactStage([], "active")`
- **Expected:** Function returns early with an appropriate message (e.g., "No contacts selected") or throws a validation error. No database changes.
- **Automated:** Yes

### SP-019: Bulk stage change with invalid stage value
- **Category:** Bulk Operations — Stage Change
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** Valid contact IDs
- **Steps:**
  1. Call `bulkUpdateContactStage(contactIds, "nonexistent_stage")`
- **Expected:** Function rejects with a validation error. No contacts are updated. The invalid stage value is not written to the database.
- **Automated:** Yes

### SP-020: Bulk stage change with type incompatibility
- **Category:** Bulk Operations — Stage Change
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** Contacts include both buyers and sellers, target stage only valid for one type
- **Steps:**
  1. Select contacts of mixed types (buyer + seller)
  2. Attempt to set a type-specific stage (e.g., "active_listing" for sellers only)
- **Expected:** Function rejects with a type validation error explaining that the selected stage is not compatible with all selected contacts. No contacts are updated.
- **Automated:** Yes

### SP-021: Bulk stage change UI — select and apply
- **Category:** Bulk Operations — Stage Change
- **Priority:** P1
- **Type:** Browser/E2E
- **Precondition:** Logged in, multiple contacts visible
- **Steps:**
  1. Select 3 contacts via checkboxes
  2. Click "Change Stage" in the bulk actions bar
  3. Select "active" from the stage dropdown
  4. Confirm the action
- **Expected:** Bulk actions bar shows "3 selected". Stage change dialog appears. After confirmation, all 3 contacts show "active" stage. Success toast displayed.
- **Automated:** Yes (Playwright)

### SP-022: Bulk stage change preserves other contact data
- **Category:** Bulk Operations — Stage Change
- **Priority:** P1
- **Precondition:** Contacts have various fields populated (phone, email, notes, etc.)
- **Steps:**
  1. Note the full data of 2 contacts
  2. Perform a bulk stage change
  3. Reload and compare all fields
- **Expected:** Only the stage field changed. All other fields (name, phone, email, notes, type, engagement score, etc.) remain identical.
- **Automated:** Yes

### SP-023: Bulk stage change with single contact
- **Category:** Bulk Operations — Stage Change
- **Priority:** P1
- **Precondition:** One contact selected
- **Steps:**
  1. Select 1 contact via checkbox
  2. Perform stage change to "dormant"
- **Expected:** Works correctly with a single selection. Contact updated to "dormant".
- **Automated:** Yes

### SP-024: Bulk stage change with large selection
- **Category:** Bulk Operations — Stage Change
- **Priority:** P2
- **Precondition:** 50+ contacts available
- **Steps:**
  1. Select all contacts (via header checkbox)
  2. Perform stage change
- **Expected:** All selected contacts updated. Operation completes within reasonable time (< 5 seconds). No timeout or partial update.
- **Automated:** No

---

## 4. Bulk Operations — CSV Export

### SP-025: CSV export with normal data
- **Category:** Bulk Operations — CSV Export
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** 3 contacts with standard alphanumeric data
- **Steps:**
  1. Call `bulkExportContacts(contactIds)` with the 3 IDs
- **Expected:** Returns a valid CSV string. Header row includes column names (name, email, phone, type, stage, etc.). 3 data rows present. Fields properly quoted. UTF-8 encoded.
- **Automated:** Yes

### SP-026: CSV export with injection characters
- **Category:** Bulk Operations — CSV Export
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** Contact with name `=cmd|'/C calc'!A0` and email `+1234@evil.com`
- **Steps:**
  1. Create a contact with CSV injection payload in the name field
  2. Call `bulkExportContacts([contactId])`
  3. Inspect the CSV output
- **Expected:** Dangerous characters (`=`, `+`, `-`, `@`, `\t`, `\r`) at the start of cell values are escaped (prefixed with a single quote `'` or tab character). The CSV does not contain executable formulas. Opening in Excel/Sheets does not trigger formula execution.
- **Automated:** Yes

### SP-027: CSV export with empty selection
- **Category:** Bulk Operations — CSV Export
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** None
- **Steps:**
  1. Call `bulkExportContacts([])`
- **Expected:** Function returns an error or empty result with a message like "No contacts selected". Does not generate a CSV with only headers.
- **Automated:** Yes

### SP-028: CSV export UI triggers download
- **Category:** Bulk Operations — CSV Export
- **Priority:** P1
- **Type:** Browser/E2E
- **Precondition:** Logged in, contacts selected
- **Steps:**
  1. Select 3 contacts via checkboxes
  2. Click "Export CSV" in bulk actions bar
- **Expected:** Browser initiates a file download. File name includes "contacts" and a date stamp. Downloaded file opens correctly in a spreadsheet application with proper columns.
- **Automated:** Yes (Playwright — check download event)

### SP-029: CSV export handles special characters in data
- **Category:** Bulk Operations — CSV Export
- **Priority:** P1
- **Precondition:** Contact with name containing commas, quotes, newlines (e.g., `O'Brien, Jr.`)
- **Steps:**
  1. Export a contact with special characters in fields
- **Expected:** Fields containing commas are double-quoted. Fields containing double quotes have quotes escaped (`""`). Fields with newlines are properly enclosed. CSV parses correctly.
- **Automated:** Yes

### SP-030: CSV export includes all selected contacts only
- **Category:** Bulk Operations — CSV Export
- **Priority:** P1
- **Precondition:** 10 contacts visible, 3 selected
- **Steps:**
  1. Select 3 specific contacts
  2. Export CSV
  3. Count rows in output
- **Expected:** CSV contains exactly 3 data rows (plus 1 header row). Only the selected contacts appear. Non-selected contacts are absent.
- **Automated:** Yes

### SP-031: CSV export with unicode characters
- **Category:** Bulk Operations — CSV Export
- **Priority:** P2
- **Precondition:** Contact with name in non-Latin script (e.g., Chinese, Arabic)
- **Steps:**
  1. Export a contact with unicode characters
- **Expected:** CSV is UTF-8 encoded. Unicode characters preserved correctly. No mojibake or encoding errors.
- **Automated:** No

---

## 5. Bulk Operations — Delete

### SP-032: Bulk delete with no linked listings
- **Category:** Bulk Operations — Delete
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** 3 contacts with no associated listings (not a seller_id on any listing)
- **Steps:**
  1. Call `bulkDeleteContacts(contactIds)` with the 3 IDs
- **Expected:** All 3 contacts deleted from the database. Function returns success. Contacts no longer appear in queries.
- **Automated:** Yes

### SP-033: Bulk delete with linked listings (listing guard)
- **Category:** Bulk Operations — Delete
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** 1 contact is a seller linked to an active listing
- **Steps:**
  1. Call `bulkDeleteContacts([contactIdWithListing])`
- **Expected:** Function rejects the deletion with an error message identifying the contact and its linked listing(s). No contacts are deleted. The listing remains intact with its seller reference.
- **Automated:** Yes

### SP-034: Bulk delete mixed — some with listings, some without
- **Category:** Bulk Operations — Delete
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** 3 contacts: 2 with no listings, 1 with a linked listing
- **Steps:**
  1. Call `bulkDeleteContacts([id1_noListing, id2_noListing, id3_withListing])`
- **Expected:** Function either: (a) rejects the entire batch identifying the blocked contact, or (b) deletes the 2 unlinked contacts and returns a partial failure report for the blocked one. Behavior must be consistent (all-or-nothing or partial with clear reporting).
- **Automated:** Yes

### SP-035: Bulk delete with empty array
- **Category:** Bulk Operations — Delete
- **Priority:** P0
- **Type:** Integration Test (Server Action)
- **Precondition:** None
- **Steps:**
  1. Call `bulkDeleteContacts([])`
- **Expected:** Function returns early with validation error. No database changes.
- **Automated:** Yes

### SP-036: Bulk delete UI — confirm dialog
- **Category:** Bulk Operations — Delete
- **Priority:** P1
- **Type:** Browser/E2E
- **Precondition:** Logged in, 2 contacts selected
- **Steps:**
  1. Select 2 contacts
  2. Click "Delete" in bulk actions bar
  3. Observe confirmation dialog
  4. Confirm deletion
- **Expected:** Confirmation dialog appears with count of contacts to delete and a warning. After confirmation, contacts removed from table. Success toast displayed. Table row count decremented.
- **Automated:** Yes (Playwright)

### SP-037: Bulk delete UI — cancel does not delete
- **Category:** Bulk Operations — Delete
- **Priority:** P1
- **Type:** Browser/E2E
- **Precondition:** Logged in, contacts selected, delete dialog open
- **Steps:**
  1. Open delete confirmation dialog
  2. Click "Cancel"
- **Expected:** Dialog closes. No contacts deleted. Selection preserved. Table unchanged.
- **Automated:** Yes (Playwright)

### SP-038: Bulk delete cascades communications
- **Category:** Bulk Operations — Delete
- **Priority:** P2
- **Type:** Integration Test
- **Precondition:** Contact has associated communications records
- **Steps:**
  1. Delete a contact with communications
  2. Query communications table for that contact_id
- **Expected:** Communications records for the deleted contact are either cascade-deleted or have their contact_id set to null, depending on FK constraint. No orphaned references.
- **Automated:** Yes

---

## 6. Communication Timeline Load More

### SP-039: Initial load shows 10 items
- **Category:** Communication Timeline Load More
- **Priority:** P0
- **Precondition:** Contact has 25+ communications
- **Steps:**
  1. Navigate to a contact detail page with communications timeline
  2. Count visible communication items
- **Expected:** Exactly 10 communication items visible initially. A "Load More" button is visible below the list.
- **Automated:** Yes (Playwright)

### SP-040: Load More adds 10 more items
- **Category:** Communication Timeline Load More
- **Priority:** P0
- **Precondition:** Contact has 25+ communications, initial 10 loaded
- **Steps:**
  1. Click the "Load More" button
  2. Count visible items
  3. Click "Load More" again
- **Expected:** After first click: 20 items visible. After second click: 25 items visible (all). Load More button disappears when all items are loaded.
- **Automated:** Yes (Playwright)

### SP-041: Load More disappears when all loaded
- **Category:** Communication Timeline Load More
- **Priority:** P1
- **Precondition:** Contact has exactly 15 communications
- **Steps:**
  1. Observe initial 10 items + Load More button
  2. Click Load More
- **Expected:** After clicking, all 15 items shown. Load More button is no longer rendered.
- **Automated:** Yes (Playwright)

### SP-042: Filter change resets to initial 10
- **Category:** Communication Timeline Load More
- **Priority:** P1
- **Precondition:** 20 items loaded (after one Load More click), filter available
- **Steps:**
  1. Load 20 items
  2. Change the filter (e.g., channel = "sms")
  3. Count visible items
- **Expected:** Item count resets to at most 10. Load More button reappears if filtered results exceed 10. Previously loaded extra items are discarded.
- **Automated:** Yes (Playwright)

### SP-043: Contact with fewer than 10 communications
- **Category:** Communication Timeline Load More
- **Priority:** P1
- **Precondition:** Contact has exactly 5 communications
- **Steps:**
  1. Navigate to contact detail
  2. Observe timeline
- **Expected:** All 5 items visible. No Load More button rendered (unnecessary).
- **Automated:** Yes (Playwright)

### SP-044: Contact with zero communications
- **Category:** Communication Timeline Load More
- **Priority:** P2
- **Precondition:** Contact has no communications
- **Steps:**
  1. Navigate to contact detail
- **Expected:** Empty state message displayed (e.g., "No communications yet"). No Load More button. No errors.
- **Automated:** Yes (Playwright)

---

## 7. Form Responsive Grids

### SP-045: ContactForm grid stacks on mobile
- **Category:** Form Responsive Grids
- **Priority:** P0
- **Precondition:** Navigate to contact creation/edit, viewport 375px
- **Steps:**
  1. Open the contact form on a 375px viewport
  2. Observe field layout
- **Expected:** Form fields stack in a single column (`grid-cols-1`). Each input takes full width. No horizontal scrolling. Labels above inputs.
- **Automated:** Yes (Playwright)

### SP-046: ContactForm grid side-by-side on desktop
- **Category:** Form Responsive Grids
- **Priority:** P0
- **Precondition:** Navigate to contact creation/edit, viewport 1280px
- **Steps:**
  1. Open the contact form on desktop viewport
  2. Observe field layout
- **Expected:** Form fields arranged in a 2-column grid (`sm:grid-cols-2`). Related fields (e.g., first name / last name, phone / email) are side by side. Full-width fields (notes, address) span both columns where appropriate.
- **Automated:** Yes (Playwright)

### SP-047: ShowingRequestForm grid stacks on mobile
- **Category:** Form Responsive Grids
- **Priority:** P1
- **Precondition:** Navigate to showing creation, viewport 375px
- **Steps:**
  1. Open the showing request form on 375px viewport
- **Expected:** All form fields stack in single column. Date/time pickers are full width. No overflow.
- **Automated:** Yes (Playwright)

### SP-048: ListingCreator grid stacks on mobile
- **Category:** Form Responsive Grids
- **Priority:** P1
- **Precondition:** Navigate to listing creation, viewport 375px
- **Steps:**
  1. Open the listing creation form on 375px viewport
- **Expected:** All fields single column. Price, beds, baths, sqft fields stack vertically instead of side-by-side.
- **Automated:** Yes (Playwright)

### SP-049: ShowingCreator grid responsive
- **Category:** Form Responsive Grids
- **Priority:** P1
- **Precondition:** Navigate to showing creation, viewport 375px then 1280px
- **Steps:**
  1. Observe form at 375px (mobile)
  2. Resize to 1280px (desktop)
- **Expected:** Mobile: single column. Desktop: 2-column grid. Transition is smooth at the `sm` breakpoint (640px).
- **Automated:** Yes (Playwright)

### SP-050: Form grids maintain label alignment
- **Category:** Form Responsive Grids
- **Priority:** P2
- **Precondition:** Desktop viewport, any form with 2-column grid
- **Steps:**
  1. Observe label positions in the 2-column layout
- **Expected:** Labels in both columns are vertically aligned. Input heights match across columns. No visual misalignment between left and right column fields.
- **Automated:** No

---

## 8. Loading Skeletons

### SP-051: Listings loading skeleton renders during navigation
- **Category:** Loading Skeletons
- **Priority:** P0
- **Precondition:** Logged in, navigating to /listings (slow connection or throttled)
- **Steps:**
  1. Navigate to /listings from another page
  2. Observe the loading state
- **Expected:** A skeleton UI appears with placeholder cards/rows matching the expected layout shape. Skeleton has animated pulse effect. Replaced by real content when data loads.
- **Automated:** Yes (Playwright — intercept and delay API responses)

### SP-052: Showings loading skeleton renders during navigation
- **Category:** Loading Skeletons
- **Priority:** P1
- **Precondition:** Logged in, navigating to /showings
- **Steps:**
  1. Navigate to /showings from another page
- **Expected:** Skeleton UI with placeholder rows matching the showings table layout. Animated pulse. Replaced by real data on load.
- **Automated:** Yes (Playwright)

### SP-053: Skeleton layout matches final content layout
- **Category:** Loading Skeletons
- **Priority:** P1
- **Precondition:** Compare skeleton and loaded state
- **Steps:**
  1. Screenshot the skeleton state
  2. Screenshot the loaded state
  3. Compare structural layout
- **Expected:** Skeleton has same number of "rows" or "cards" as the first page of data (or a reasonable placeholder count). Width and positioning of skeleton blocks match the real content. No jarring layout shift when real content replaces skeleton.
- **Automated:** No

### SP-054: Skeleton does not flash on fast loads
- **Category:** Loading Skeletons
- **Priority:** P2
- **Precondition:** Fast network, data loads quickly
- **Steps:**
  1. Navigate to /listings with normal network speed
- **Expected:** If data loads within ~100ms, skeleton either does not appear at all (deferred rendering) or appears so briefly it is not distracting. No flicker between skeleton and real content.
- **Automated:** No

---

## 9. Newsletter Queue Fix

### SP-055: Preview button exists on draft newsletters
- **Category:** Newsletter Queue Fix
- **Priority:** P0
- **Precondition:** Logged in, navigate to /newsletters/queue, at least 1 draft newsletter
- **Steps:**
  1. Navigate to the newsletter approval queue
  2. Locate a draft newsletter card/row
  3. Find the Preview button
- **Expected:** Each draft newsletter has a visible "Preview" button or link.
- **Automated:** Yes (Playwright)

### SP-056: Preview button opens correct URL in new tab
- **Category:** Newsletter Queue Fix
- **Priority:** P0
- **Precondition:** Draft newsletter with known ID
- **Steps:**
  1. Click the "Preview" button on a draft newsletter
  2. Observe browser behavior
- **Expected:** A new browser tab opens with URL `/api/newsletters/preview/[id]` where `[id]` matches the newsletter's ID. The original queue page remains open.
- **Automated:** Yes (Playwright — check target="_blank" or window.open)

### SP-057: Preview endpoint returns rendered HTML
- **Category:** Newsletter Queue Fix
- **Priority:** P1
- **Type:** Endpoint Test
- **Precondition:** Valid newsletter ID exists
- **Steps:**
  1. Send GET request to `/api/newsletters/preview/[id]`
- **Expected:** Response status 200. Content-Type is `text/html`. Response body contains rendered HTML email content. No raw JSON or error page.
- **Automated:** Yes

### SP-058: Preview endpoint returns 404 for invalid ID
- **Category:** Newsletter Queue Fix
- **Priority:** P2
- **Type:** Endpoint Test
- **Precondition:** None
- **Steps:**
  1. Send GET request to `/api/newsletters/preview/nonexistent-uuid`
- **Expected:** Response status 404 or appropriate error. No server crash. Error message indicates newsletter not found.
- **Automated:** Yes

---

## 10. Dashboard newLeadsToday

### SP-059: Dashboard shows newLeadsToday count
- **Category:** Dashboard newLeadsToday
- **Priority:** P0
- **Precondition:** Logged in, at least 1 contact created today
- **Steps:**
  1. Navigate to / (dashboard home)
  2. Locate the "New Leads Today" KPI or metric
- **Expected:** A card or metric shows a count > 0 matching the actual number of contacts created today (based on `created_at` date matching current date).
- **Automated:** Yes (Playwright + Supabase verification)

### SP-060: Dashboard newLeadsToday shows 0 when no contacts today
- **Category:** Dashboard newLeadsToday
- **Priority:** P0
- **Precondition:** No contacts created today
- **Steps:**
  1. Navigate to / (dashboard home)
- **Expected:** The "New Leads Today" metric shows 0. No error or missing card. The card renders normally with zero value.
- **Automated:** Yes (Playwright)

### SP-061: newLeadsToday uses real query, not mock
- **Category:** Dashboard newLeadsToday
- **Priority:** P1
- **Type:** Integration Test
- **Precondition:** Known number of contacts created today
- **Steps:**
  1. Create 3 new contacts via API
  2. Load dashboard
  3. Verify count matches
  4. Delete the test contacts
  5. Reload and verify count decremented
- **Expected:** Count accurately reflects the real database state. Creating contacts increments the count. Deleting contacts decrements it. No caching delay beyond page reload.
- **Automated:** Yes

### SP-062: newLeadsToday counts only today, not yesterday
- **Category:** Dashboard newLeadsToday
- **Priority:** P2
- **Type:** Integration Test
- **Precondition:** Contacts exist with various created_at dates
- **Steps:**
  1. Verify that contacts with `created_at` from yesterday are NOT counted
  2. Verify contacts with `created_at` from today ARE counted
- **Expected:** Query uses date comparison (not timestamp within last 24h) matching the current calendar date. A contact created at 11:59 PM yesterday is NOT counted today. A contact created at 12:01 AM today IS counted.
- **Automated:** Yes

---

## 11. Workflow Auto-Expand

### SP-063: First pending phase auto-expands on load
- **Category:** Workflow Auto-Expand
- **Priority:** P0
- **Precondition:** Listing with phases 1-3 completed, phase 4 pending
- **Steps:**
  1. Navigate to /listings/[id]/workflow (or the workflow view)
  2. Observe which phase is expanded
- **Expected:** Phase 4 (the first pending phase) is automatically expanded/open when the page loads. Phases 1-3 (completed) are collapsed. Phases 5-8 (future) are collapsed.
- **Automated:** Yes (Playwright)

### SP-064: All phases completed — none auto-expanded
- **Category:** Workflow Auto-Expand
- **Priority:** P0
- **Precondition:** Listing with all 8 phases completed
- **Steps:**
  1. Navigate to the workflow view
- **Expected:** No phase is auto-expanded (or all are collapsed by default). A completion message or summary may be shown. No error.
- **Automated:** Yes (Playwright)

### SP-065: Phase 1 pending — first phase auto-expanded
- **Category:** Workflow Auto-Expand
- **Priority:** P1
- **Precondition:** New listing, phase 1 is pending (no phases completed)
- **Steps:**
  1. Navigate to the workflow view
- **Expected:** Phase 1 is auto-expanded since it is the first pending phase. All subsequent phases are collapsed.
- **Automated:** Yes (Playwright)

### SP-066: Manual expand/collapse overrides auto-expand
- **Category:** Workflow Auto-Expand
- **Priority:** P1
- **Precondition:** Phase 4 auto-expanded on load
- **Steps:**
  1. Collapse phase 4 by clicking its header
  2. Expand phase 2 by clicking its header
- **Expected:** Phase 4 collapses. Phase 2 expands. User's manual interaction takes precedence over auto-expand. No phase snaps back to auto-expanded state.
- **Automated:** Yes (Playwright)

### SP-067: Auto-expand updates after phase advancement
- **Category:** Workflow Auto-Expand
- **Priority:** P2
- **Precondition:** Phase 4 auto-expanded, user completes phase 4
- **Steps:**
  1. Complete phase 4 (advance to next)
  2. Observe which phase is now expanded
- **Expected:** After advancement, phase 5 becomes the new first pending phase and auto-expands. Phase 4 shows completed state and collapses.
- **Automated:** No

---

## 12. Accessibility

### SP-068: aria-describedby on ContactForm fields
- **Category:** Accessibility
- **Priority:** P0
- **Precondition:** Navigate to contact creation/edit form
- **Steps:**
  1. Inspect form fields in DOM
  2. Check for `aria-describedby` attributes on inputs with help text or validation errors
- **Expected:** Input fields that have help text or error messages reference them via `aria-describedby` pointing to the ID of the help/error element. Screen readers announce the description when the field is focused.
- **Automated:** Yes (DOM inspection)

### SP-069: aria-labels on workflow step buttons
- **Category:** Accessibility
- **Priority:** P0
- **Precondition:** Navigate to workflow view
- **Steps:**
  1. Inspect each workflow step button/header in the DOM
- **Expected:** Each workflow step button has an `aria-label` (e.g., "Phase 1: Seller Intake - Completed" or "Phase 4: Pricing & Review - Pending"). Labels include both the phase name and its current status.
- **Automated:** Yes (DOM inspection)

### SP-070: Lock emoji has aria-hidden
- **Category:** Accessibility
- **Priority:** P0
- **Precondition:** Workflow view or any page with lock emoji (locked phases)
- **Steps:**
  1. Find lock emoji elements in DOM
  2. Check for `aria-hidden="true"` attribute
- **Expected:** Lock emoji (`🔒` or similar) has `aria-hidden="true"` so screen readers skip it. The locked status is conveyed via the parent element's `aria-label` instead.
- **Automated:** Yes (DOM inspection)

### SP-071: Color contrast passes WCAG AA (4.5:1)
- **Category:** Accessibility
- **Priority:** P0
- **Precondition:** Any page with muted-foreground text
- **Steps:**
  1. Identify all text using `text-muted-foreground` or similar muted colors
  2. Calculate contrast ratio against their background
- **Expected:** All text at normal size (< 18px / 14px bold) meets 4.5:1 minimum contrast ratio. Large text (>= 18px / 14px bold) meets 3:1 minimum. Specifically the `--muted-foreground` variable must yield >= 4.5:1 against `--background` and `--card`.
- **Automated:** Yes (axe-core or manual calculation)

### SP-072: Screen reader announces workflow step labels
- **Category:** Accessibility
- **Priority:** P1
- **Precondition:** Screen reader active (VoiceOver on macOS)
- **Steps:**
  1. Navigate to workflow view
  2. Tab to each workflow step button
  3. Listen to screen reader output
- **Expected:** Screen reader announces the full aria-label for each step, including phase number, name, and status. No unlabeled buttons. Focus order matches visual order (phase 1 through 8).
- **Automated:** No (manual with screen reader)

### SP-073: Keyboard tab order through filter dropdowns
- **Category:** Accessibility
- **Priority:** P1
- **Precondition:** Navigate to /contacts
- **Steps:**
  1. Press Tab repeatedly to move through the filter bar
  2. Note the order of focused elements
- **Expected:** Tab order is logical: search input > Type filter > Stage filter > Engagement filter > Clear button > table header. No focus traps. Focus ring visible on each element.
- **Automated:** Yes (Playwright)

### SP-074: Keyboard tab order through bulk action buttons
- **Category:** Accessibility
- **Priority:** P1
- **Precondition:** Contacts selected, bulk actions bar visible
- **Steps:**
  1. Tab through the bulk actions bar
- **Expected:** Tab moves through: selection count > Change Stage button > Export CSV button > Delete button > Clear selection. Each button is keyboard-activatable (Enter/Space).
- **Automated:** Yes (Playwright)

### SP-075: Skip-to-content link on detail pages
- **Category:** Accessibility
- **Priority:** P1
- **Precondition:** Any dashboard page
- **Steps:**
  1. Press Tab once on page load (before any other interaction)
- **Expected:** A "Skip to content" link appears (visible on focus). Pressing Enter scrolls/moves focus to the main content area, bypassing sidebar and header navigation.
- **Automated:** Yes (Playwright)

### SP-076: Focus management after bulk action dialogs
- **Category:** Accessibility
- **Priority:** P2
- **Precondition:** Bulk action dialog open
- **Steps:**
  1. Open a bulk action dialog (e.g., delete confirmation)
  2. Complete or cancel the action
  3. Observe where focus moves
- **Expected:** After dialog closes, focus returns to the trigger button or the table. Focus does not get lost at the top of the page.
- **Automated:** No

### SP-077: Form error announcements for screen readers
- **Category:** Accessibility
- **Priority:** P2
- **Precondition:** ContactForm with required fields
- **Steps:**
  1. Submit the form with empty required fields
  2. Observe error behavior with screen reader
- **Expected:** Error messages appear with `role="alert"` or are linked via `aria-describedby`. Screen reader announces errors when they appear. Focus moves to the first errored field or error summary.
- **Automated:** No

---

## 13. Print Styles

### SP-078: Print hides navigation sidebar
- **Category:** Print Styles
- **Priority:** P0
- **Precondition:** Any dashboard page
- **Steps:**
  1. Open print preview (Cmd+P / Ctrl+P)
  2. Observe the layout
- **Expected:** The sidebar navigation is hidden (`display: none` in `@media print`). Full page width is used for content. No wasted whitespace where the sidebar was.
- **Automated:** Yes (Playwright — emulate print media)

### SP-079: Print hides mobile bottom nav
- **Category:** Print Styles
- **Priority:** P1
- **Precondition:** Page with mobile bottom nav visible
- **Steps:**
  1. Open print preview
- **Expected:** Mobile bottom navigation bar is hidden in print. No floating bars or fixed-position elements appear in the printed output.
- **Automated:** Yes (Playwright — emulate print media)

### SP-080: Print resets backgrounds to white
- **Category:** Print Styles
- **Priority:** P1
- **Precondition:** Page with colored backgrounds (cards, headers)
- **Steps:**
  1. Open print preview
- **Expected:** Background colors reset to white or transparent for ink conservation. Text remains dark (black/near-black). Card borders may remain for structure but backgrounds are removed.
- **Automated:** Yes (Playwright — emulate print media)

### SP-081: Print preserves data content
- **Category:** Print Styles
- **Priority:** P1
- **Precondition:** Contact detail or listing detail page with data
- **Steps:**
  1. Open print preview on a detail page
- **Expected:** All data content (names, addresses, phone numbers, status badges text) is visible in print. Tables are not cut off. Long text is not hidden by overflow.
- **Automated:** Yes (Playwright — emulate print media)

### SP-082: Print hides action buttons
- **Category:** Print Styles
- **Priority:** P2
- **Precondition:** Page with action buttons (Edit, Delete, etc.)
- **Steps:**
  1. Open print preview
- **Expected:** Interactive action buttons (Edit, Delete, Send, etc.) are hidden in print output. Only informational content remains.
- **Automated:** No

---

## 14. Document Query Limit

### SP-083: listing_documents query returns up to 2000 rows
- **Category:** Document Query Limit
- **Priority:** P0
- **Type:** Integration Test
- **Precondition:** Listing with documents in listing_documents table
- **Steps:**
  1. Locate the query for listing_documents in the listing detail page or server action
  2. Verify the `.limit(2000)` call is present
- **Expected:** The Supabase query includes `.limit(2000)`. This prevents the default 1000-row limit from silently truncating results for listings with many documents.
- **Automated:** Yes (code inspection / grep)

### SP-084: Listing with many documents loads all
- **Category:** Document Query Limit
- **Priority:** P0
- **Type:** Integration Test
- **Precondition:** Listing with 1500+ documents (synthetic test data)
- **Steps:**
  1. Insert 1500 document records for a single listing
  2. Load the listing detail page
  3. Count rendered document entries
- **Expected:** All 1500 documents are returned and displayed (or available for scrolling). No silent truncation at 1000. Performance remains acceptable (< 3 second load).
- **Automated:** Yes

### SP-085: Listing with zero documents shows empty state
- **Category:** Document Query Limit
- **Priority:** P1
- **Precondition:** Listing with no documents
- **Steps:**
  1. Load listing detail page
- **Expected:** Empty state message for documents (e.g., "No documents uploaded yet"). No error from the limit(2000) query. Clean UI.
- **Automated:** Yes

---

## 15. Integration Tests (Server Actions)

### SP-086: bulkUpdateContactStage returns success on valid input
- **Category:** Integration Tests
- **Priority:** P0
- **Type:** Server Action
- **Precondition:** 2 valid contact IDs, valid stage "active"
- **Steps:**
  1. Call `bulkUpdateContactStage([id1, id2], "active")`
- **Expected:** Returns `{ success: true }` or similar. Both contacts updated in DB. No errors thrown.
- **Automated:** Yes

### SP-087: bulkDeleteContacts respects listing guard
- **Category:** Integration Tests
- **Priority:** P0
- **Type:** Server Action
- **Precondition:** Contact linked to listing as seller_id
- **Steps:**
  1. Call `bulkDeleteContacts([sellerContactId])`
- **Expected:** Returns error: contact is linked to listing. Contact not deleted. Listing still references the seller.
- **Automated:** Yes

### SP-088: bulkExportContacts sanitizes injection payloads
- **Category:** Integration Tests
- **Priority:** P0
- **Type:** Server Action
- **Precondition:** Contact with name `=SUM(A1:A10)` and email `-cmd@test.com`
- **Steps:**
  1. Call `bulkExportContacts([injectionContactId])`
  2. Parse CSV output
- **Expected:** Cell values starting with `=`, `+`, `-`, `@` are escaped. Leading dangerous characters are prefixed with `'` or equivalent protection. Raw formulas do not appear in output.
- **Automated:** Yes

### SP-089: getContactCommunications respects limit parameter
- **Category:** Integration Tests
- **Priority:** P0
- **Type:** Server Action
- **Precondition:** Contact with 60 communications
- **Steps:**
  1. Call `getContactCommunications(contactId, { limit: 50 })`
- **Expected:** Returns exactly 50 communication records. Records ordered by most recent first. No more than 50 returned even though 60 exist.
- **Automated:** Yes

### SP-090: bulkUpdateContactStage rejects empty array
- **Category:** Integration Tests
- **Priority:** P0
- **Type:** Server Action
- **Steps:**
  1. Call `bulkUpdateContactStage([], "lead")`
- **Expected:** Returns validation error. No database writes. Fast return (< 100ms).
- **Automated:** Yes

### SP-091: bulkExportContacts with empty set
- **Category:** Integration Tests
- **Priority:** P1
- **Type:** Server Action
- **Steps:**
  1. Call `bulkExportContacts([])`
- **Expected:** Returns error or empty result with message. No CSV generated with only headers.
- **Automated:** Yes

### SP-092: bulkDeleteContacts with empty array
- **Category:** Integration Tests
- **Priority:** P1
- **Type:** Server Action
- **Steps:**
  1. Call `bulkDeleteContacts([])`
- **Expected:** Returns validation error. No database writes.
- **Automated:** Yes

### SP-093: getContactCommunications with limit=50 default
- **Category:** Integration Tests
- **Priority:** P1
- **Type:** Server Action
- **Precondition:** Contact with 100+ communications
- **Steps:**
  1. Call `getContactCommunications(contactId)` without explicit limit
- **Expected:** Returns at most 50 records (the new default limit). Previously returned all records or had no limit — now capped at 50.
- **Automated:** Yes

---

## 16. Regression Tests

### SP-094: Contact CRUD still works after sprint changes
- **Category:** Regression Tests
- **Priority:** P0
- **Precondition:** Logged in
- **Steps:**
  1. Create a new contact via the UI
  2. Edit the contact's name and phone
  3. View the contact detail page
  4. Delete the contact
- **Expected:** All CRUD operations succeed. No regressions from filter bar, bulk ops, or responsive grid changes. Form validation works. Toast notifications appear.
- **Automated:** Yes (E2E)

### SP-095: Listing workflow still advances phases
- **Category:** Regression Tests
- **Priority:** P0
- **Precondition:** Listing at phase 1
- **Steps:**
  1. Navigate to listing workflow
  2. Complete phase 1 tasks
  3. Advance to phase 2
- **Expected:** Phase advances correctly. Audit trail logged. Phase 2 auto-expands after advancement. No regressions from auto-expand or accessibility changes.
- **Automated:** Yes (E2E)

### SP-096: Showing creation still works
- **Category:** Regression Tests
- **Priority:** P0
- **Precondition:** Active listing exists
- **Steps:**
  1. Navigate to /showings
  2. Click "New Showing"
  3. Fill in the showing form (verify responsive grid)
  4. Submit
- **Expected:** Showing created successfully. Form fields stack on mobile, side-by-side on desktop. Showing appears in the list. Status badge renders correctly.
- **Automated:** Yes (E2E)

### SP-097: Communication timeline displays messages
- **Category:** Regression Tests
- **Priority:** P0
- **Precondition:** Contact with existing communications
- **Steps:**
  1. Navigate to contact detail
  2. View the communications timeline
  3. Verify messages are displayed chronologically
  4. Click Load More if available
- **Expected:** All communications visible (within pagination limits). Most recent first. SMS, email, WhatsApp channels displayed with correct icons. No regressions from Load More changes.
- **Automated:** Yes (E2E)

### SP-098: Newsletter list page loads correctly
- **Category:** Regression Tests
- **Priority:** P1
- **Precondition:** Newsletters exist in database
- **Steps:**
  1. Navigate to /newsletters
  2. Navigate to /newsletters/queue
  3. Click Preview on a draft
- **Expected:** Newsletter dashboard loads with all tabs. Queue shows drafts. Preview opens in new tab with rendered HTML. No regressions from the preview fix.
- **Automated:** Yes (E2E)

### SP-099: Dashboard widgets render with real data
- **Category:** Regression Tests
- **Priority:** P1
- **Precondition:** Contacts, listings, and showings exist
- **Steps:**
  1. Navigate to / (dashboard)
  2. Verify KPI cards show data
  3. Verify newLeadsToday reflects today's contacts
  4. Verify pipeline widget shows listings
- **Expected:** All dashboard widgets render. No "NaN" or "undefined" values. newLeadsToday is a real number. Pipeline shows correct listing counts by status.
- **Automated:** Yes (E2E)

### SP-100: Loading skeletons do not break existing pages
- **Category:** Regression Tests
- **Priority:** P1
- **Precondition:** Navigate between pages rapidly
- **Steps:**
  1. Navigate from /contacts to /listings to /showings rapidly
  2. Observe loading states
- **Expected:** Skeleton loading states appear and are replaced by real content. No stuck loading states. No error boundaries triggered. Pages render correctly after navigation.
- **Automated:** Yes (E2E)

### SP-101a: Decline team invite removes invite from list
- **Category:** Regression Tests
- **Priority:** P1
- **Precondition:** Logged in, user has a pending team invite
- **Steps:**
  1. Navigate to /settings/team
  2. Locate the pending invite notification
  3. Click "Decline"
- **Expected:** Invite is removed from the pending list. No error toast. Team membership is not created. UI updates immediately without full page reload.
- **Automated:** Yes (Playwright)

### SP-101b: Inline confirm for team member removal
- **Category:** Regression Tests
- **Priority:** P1
- **Precondition:** Logged in as team owner, team has at least 1 other member
- **Steps:**
  1. Navigate to /settings/team
  2. Click the remove/delete button next to a team member
  3. Observe inline confirmation prompt
  4. Confirm removal
- **Expected:** An inline confirmation appears (not a modal dialog). Confirming removes the member from the team. Cancelling keeps the member. Success toast displayed after removal.
- **Automated:** Yes (Playwright)

### SP-101: Print stylesheet does not affect screen display
- **Category:** Regression Tests
- **Priority:** P2
- **Precondition:** Any dashboard page
- **Steps:**
  1. Navigate to various pages
  2. Verify sidebar, header, buttons all visible
  3. Open print preview and verify print styles apply
  4. Close print preview and verify screen styles restored
- **Expected:** `@media print` styles only apply during print. Screen display is completely unaffected. Sidebar, header, action buttons all remain visible on screen. No CSS specificity conflicts.
- **Automated:** No

---

## Test Execution Notes

### Environment Requirements
- **Local dev server** running on `localhost:3000`
- **Supabase** connected with test data (contacts, listings, showings, communications)
- **Playwright** configured for browser tests (375px mobile viewport + 1280px desktop)
- **Screen reader** (VoiceOver) for manual accessibility tests (SP-072, SP-077)

### Priority Definitions
- **P0:** Must pass before any deployment. Blocking issues if failed. Core functionality.
- **P1:** Must pass before production release. Important but not blocking staging deploys.
- **P2:** Should pass. Nice-to-have validation. Can be deferred if schedule is tight.

### Test Data Requirements
- At least 30 contacts with varied types (buyer, seller, both), stages (lead, active, past client, dormant), and engagement scores
- At least 5 listings with varied phases (1-8) and statuses
- At least 3 contacts with 25+ communications each
- At least 1 contact linked as seller_id on a listing (for delete guard testing)
- At least 1 contact with CSV injection characters in name/email fields
- At least 1 newsletter in "draft" status (for preview testing)

### Automation Coverage
- **Automated (Playwright + Server Actions):** 81 of 101 test cases (80%)
- **Manual only:** 20 of 101 test cases (20%) — screen reader tests, visual alignment checks, performance edge cases

<!-- Last reviewed: 2026-04-21 -->

<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->
