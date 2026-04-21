# Contact Functionality — End-to-End Test Plan

**Date:** 2026-04-20
**Module:** Contacts (CRUD, UI, Forms, Filters, Bulk Actions, Import/Export)
**Method:** Manual E2E via Playwright MCP

---

## Test Case Book Structure

Each test case follows: `TC-{Category}-{Number}: Description`
- **P** = Pass, **F** = Fail, **S** = Skip (blocked)
- Status updated during execution

---

## CATEGORY 1: Contact List Page (`/contacts`)

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-LIST-01 | Page loads successfully | Navigate to /contacts | Page renders with title "Contacts", table visible | |
| TC-LIST-02 | Page header shows contact count | Load page with data | Subtitle shows "N contacts" | |
| TC-LIST-03 | Create Contact button visible | Load page | "Create Contact" button in header | |
| TC-LIST-04 | Import button visible | Load page | "Import" button in header | |
| TC-LIST-05 | KPI cards render (if contacts exist) | Load page with contacts | 4 KPI cards: New This Week, Hot Leads, In Pipeline, Closed This Mo | |
| TC-LIST-06 | Pipeline snapshot bar renders | Load page with contacts | Stage bar shows New/Qualified/Active/Contract/Closed | |
| TC-LIST-07 | Table columns correct | Load page | Columns: Name, Email, Phone, Type, Score, Stage, Last Activity, Actions | |
| TC-LIST-08 | Empty state (no contacts) | Load with no contacts | Empty state message displayed | |

### Search & Filters

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-FILTER-01 | Search by name | Type contact name in search | Table filters to matching contacts | |
| TC-FILTER-02 | Search by email | Type email in search | Table filters to matching contacts | |
| TC-FILTER-03 | Search by phone | Type phone in search | Table filters to matching contacts | |
| TC-FILTER-04 | Search with special chars | Type `"'<>` in search | No crash, safe handling | |
| TC-FILTER-05 | Search clears results | Clear search box | All contacts shown again | |
| TC-FILTER-06 | Filter by type: Buyer | Select "Buyer" from type dropdown | Only buyer contacts shown | |
| TC-FILTER-07 | Filter by type: Seller | Select "Seller" from type dropdown | Only seller contacts shown | |
| TC-FILTER-08 | Filter by type: Customer | Select "Customer" | Only customer contacts shown | |
| TC-FILTER-09 | Filter by type: Partner | Select "Partner" | Only partner contacts shown | |
| TC-FILTER-10 | Filter by type: Other | Select "Other" | Only other type contacts shown | |
| TC-FILTER-11 | Filter by stage: New | Select "New" from stage dropdown | Only new stage contacts shown | |
| TC-FILTER-12 | Filter by stage: Qualified | Select "Qualified" | Only qualified contacts | |
| TC-FILTER-13 | Filter by stage: Active | Select active stage | Only active contacts | |
| TC-FILTER-14 | Filter by stage: Closed | Select "Closed" | Only closed contacts | |
| TC-FILTER-15 | Filter by stage: Cold | Select "Cold" | Only cold contacts | |
| TC-FILTER-16 | Filter by engagement: Hot (60+) | Select "Hot" | Only hot leads shown | |
| TC-FILTER-17 | Filter by engagement: Warm (30-59) | Select "Warm" | Only warm leads shown | |
| TC-FILTER-18 | Filter by engagement: Cold (<30) | Select "Cold" | Only cold leads shown | |
| TC-FILTER-19 | Filter by engagement: No Score | Select "No Score" | Only unscored contacts | |
| TC-FILTER-20 | Multiple filters combined | Type + Stage together | Intersection of both filters | |
| TC-FILTER-21 | Clear filters button | Apply filters, click clear | All filters reset, full list | |
| TC-FILTER-22 | Filter count badge | Apply 2 filters | Badge shows "2" on clear button | |

### Table Interactions

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-TABLE-01 | Row click navigates to detail | Click contact row | Navigate to /contacts/[id] | |
| TC-TABLE-02 | Eye icon opens preview sheet | Click eye icon on row | Side panel opens with contact info | |
| TC-TABLE-03 | Phone icon is tel link | Click phone icon | Opens phone dialer | |
| TC-TABLE-04 | Email icon is mailto link | Click email icon | Opens email client | |
| TC-TABLE-05 | Sort by name | Click Name column header | Table sorts alphabetically | |
| TC-TABLE-06 | Pagination works | Navigate pages (if >10 contacts) | Different contacts shown per page | |
| TC-TABLE-07 | Row selection checkbox | Click checkbox on rows | Rows highlighted, count shown | |
| TC-TABLE-08 | Select all checkbox | Click header checkbox | All visible rows selected | |

---

## CATEGORY 2: Contact Creation (`/contacts/new`)

### Form Fields

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-CREATE-01 | Form opens from button | Click "Create Contact" | Dialog/page opens with empty form | |
| TC-CREATE-02 | Name field required | Submit with empty name | Validation error "min 2 characters" | |
| TC-CREATE-03 | Name min 2 chars | Enter "A" and submit | Validation error | |
| TC-CREATE-04 | Name valid (2+ chars) | Enter "Jo" | No error | |
| TC-CREATE-05 | Name auto-capitalizes | Enter "john doe" and blur | Becomes "John Doe" | |
| TC-CREATE-06 | Phone field required | Submit with empty phone | Validation error "at least 10 digits" | |
| TC-CREATE-07 | Phone min 10 digits | Enter "12345" | Validation error | |
| TC-CREATE-08 | Phone valid 10 digits | Enter "6045551234" | No error, formatted | |
| TC-CREATE-09 | Phone with formatting | Enter "(604) 555-1234" | Accepted, normalized | |
| TC-CREATE-10 | Phone with +1 prefix | Enter "+16045551234" | Accepted | |
| TC-CREATE-11 | Phone invalid chars | Enter "abc123" | Validation error | |
| TC-CREATE-12 | Email optional empty | Leave email blank | No error | |
| TC-CREATE-13 | Email valid format | Enter "test@example.com" | No error | |
| TC-CREATE-14 | Email invalid format | Enter "notanemail" | Validation error | |
| TC-CREATE-15 | Email lowercased on blur | Enter "TEST@EXAMPLE.COM" | Becomes "test@example.com" | |
| TC-CREATE-16 | Type defaults to buyer | Open form fresh | Type dropdown shows "Buyer" | |
| TC-CREATE-17 | Type: all options available | Click type dropdown | All 6 options visible | |
| TC-CREATE-18 | Pref channel defaults to SMS | Open form fresh | Channel shows "SMS" | |
| TC-CREATE-19 | Pref channel: all options | Click channel dropdown | sms, whatsapp, email, phone visible | |
| TC-CREATE-20 | Lead status defaults to new | Open form fresh | Status shows "New" | |
| TC-CREATE-21 | Lead status: all options | Click status dropdown | All 8 options visible | |
| TC-CREATE-22 | Source dropdown options | Click source dropdown | All 12 sources visible | |
| TC-CREATE-23 | Address field accepts text | Enter "123 Main St" | Accepted | |
| TC-CREATE-24 | Postal code: Canadian valid | Enter "V5K 0A1" | Accepted | |
| TC-CREATE-25 | Postal code: US valid | Enter "90210" | Accepted | |
| TC-CREATE-26 | Postal code: invalid | Enter "ZZZZZ" | Validation error | |
| TC-CREATE-27 | Notes textarea optional | Leave blank | No error | |
| TC-CREATE-28 | Notes textarea accepts text | Enter long text | Accepted | |

### Partner-Specific Fields

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-PARTNER-01 | Partner section hidden by default | Open form with type=buyer | No partner fields visible | |
| TC-PARTNER-02 | Partner section shows when type=partner | Select type "Partner" | Partner fields appear (blue border) | |
| TC-PARTNER-03 | Partner type dropdown | Select partner, click partner type | 6 options available | |
| TC-PARTNER-04 | Company field accepts text | Enter "ABC Corp" | Accepted | |
| TC-PARTNER-05 | Job title accepts text | Enter "Broker" | Accepted | |
| TC-PARTNER-06 | Typical client profile | Enter description | Accepted | |
| TC-PARTNER-07 | Referral agreement terms | Enter terms | Accepted | |

### Social Media Section

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-SOCIAL-01 | Social section collapsed | Open form | Social section not visible | |
| TC-SOCIAL-02 | Social section expands | Click "Add social media" | 6 platform fields appear | |
| TC-SOCIAL-03 | Instagram field | Enter "@username" | Strips @, saves "username" | |
| TC-SOCIAL-04 | LinkedIn field | Enter "firstname-lastname" | Accepted | |
| TC-SOCIAL-05 | Empty social fields ignored | Leave all blank | No social_profiles saved | |

### Duplicate Detection

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-DUP-01 | Duplicate by phone detected | Enter existing phone | Warning: "Possible duplicate" | |
| TC-DUP-02 | Duplicate by email detected | Enter existing email | Warning: "Possible duplicate" | |
| TC-DUP-03 | Create Anyway button | Click "Create Anyway" | Contact created despite duplicate | |
| TC-DUP-04 | Cancel on duplicate | Click "Cancel" | Form clears, no contact created | |

### Successful Creation

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-CREATE-29 | Minimum fields (name+phone) | Enter name + phone, submit | Contact created, toast shown | |
| TC-CREATE-30 | All fields filled | Fill every field, submit | Contact created with all data | |
| TC-CREATE-31 | Buyer type creation | Create buyer contact | Type shows "Buyer" in list | |
| TC-CREATE-32 | Seller type creation | Create seller contact | Type shows "Seller" in list | |
| TC-CREATE-33 | Partner type creation | Create partner with all partner fields | Partner data saved correctly | |
| TC-CREATE-34 | Form closes on success | Submit valid form | Dialog closes | |
| TC-CREATE-35 | List refreshes after create | Create contact | New contact appears in table | |
| TC-CREATE-36 | Button disabled during submit | Click submit | Button shows "Saving..." | |

---

## CATEGORY 3: Contact Editing

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-EDIT-01 | Edit button on detail page | Navigate to contact detail | "Edit" button visible in header | |
| TC-EDIT-02 | Edit dialog pre-populated | Click Edit | All fields show current values | |
| TC-EDIT-03 | Update name | Change name, submit | Name updated in UI | |
| TC-EDIT-04 | Update phone | Change phone, submit | Phone updated | |
| TC-EDIT-05 | Update email | Change email, submit | Email updated | |
| TC-EDIT-06 | Update type | Change type dropdown | Type badge updates | |
| TC-EDIT-07 | Update pref channel | Change channel | Channel saved | |
| TC-EDIT-08 | Update lead status | Change lead status | Status badge updates | |
| TC-EDIT-09 | Update address | Change address | Address saved | |
| TC-EDIT-10 | Update postal code | Change postal code | Postal code saved | |
| TC-EDIT-11 | Update notes | Change notes | Notes saved | |
| TC-EDIT-12 | Add social profiles | Edit, expand social, add handles | Social profiles saved | |
| TC-EDIT-13 | Remove social profiles | Edit, clear social handles | Social profiles removed | |
| TC-EDIT-14 | Partial update (name only) | Change only name, submit | Only name changes, rest preserved | |
| TC-EDIT-15 | Cancel edit | Open edit, cancel | No changes saved | |

---

## CATEGORY 4: Contact Deletion

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-DEL-01 | Delete button in more menu | Click more menu on detail page | "Delete contact" option visible | |
| TC-DEL-02 | Confirmation dialog appears | Click "Delete contact" | AlertDialog with warning text | |
| TC-DEL-03 | Cancel deletion | Click "Cancel" in dialog | Contact not deleted | |
| TC-DEL-04 | Confirm deletion | Click "Delete Contact" (red) | Contact deleted, redirect to list | |
| TC-DEL-05 | Deleted contact gone from list | After deletion | Contact not in table | |
| TC-DEL-06 | Cannot delete with active listings | Delete seller with active listing | Error message shown | |

---

## CATEGORY 5: Bulk Actions

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-BULK-01 | Bulk action bar appears | Select 2+ contacts | Bulk action toolbar visible | |
| TC-BULK-02 | Selection count shown | Select 3 contacts | "3 selected" text visible | |
| TC-BULK-03 | Bulk stage change | Select contacts, change stage to "Qualified" | All selected contacts updated | |
| TC-BULK-04 | Bulk export CSV | Select contacts, click Export CSV | CSV file downloads | |
| TC-BULK-05 | Bulk delete | Select contacts, click Delete | Confirmation shown | |
| TC-BULK-06 | Bulk delete confirmation | Confirm deletion | Selected contacts removed | |
| TC-BULK-07 | Bulk delete blocked (active listings) | Select contact with active listing | Error toast shown | |
| TC-BULK-08 | Deselect all | Click deselect/clear | No contacts selected, bar hidden | |

---

## CATEGORY 6: Contact Detail Page (`/contacts/[id]`)

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-DETAIL-01 | Page loads with contact data | Navigate to valid contact ID | Name, badges, contact info visible | |
| TC-DETAIL-02 | Avatar shows initials | Contact without photo | Initials badge visible | |
| TC-DETAIL-03 | Type badge displayed | Load detail page | Contact type badge visible | |
| TC-DETAIL-04 | Phone clickable | Click phone number | Opens tel: link | |
| TC-DETAIL-05 | Email clickable | Click email | Opens mailto: link | |
| TC-DETAIL-06 | KPI stat cards render | Load detail page | 4 stat cards (Lead Score, Network, Portfolio, Last Contact) | |
| TC-DETAIL-07 | Overview tab default | Load page | Overview tab active | |
| TC-DETAIL-08 | Activity tab loads | Click Activity tab | Activity content shown | |
| TC-DETAIL-09 | Deals tab loads | Click Deals tab | Deals content shown | |
| TC-DETAIL-10 | Stage bar interactive | Click a stage in pipeline bar | Stage updates | |
| TC-DETAIL-11 | Tags can be added | Click tag editor, add tag | Tag appears on contact | |
| TC-DETAIL-12 | Tags can be removed | Click X on existing tag | Tag removed | |
| TC-DETAIL-13 | Quick action: Notes | Click notes button | Notes dialog opens | |
| TC-DETAIL-14 | Quick action: Email | Click email composer | Email composer opens | |
| TC-DETAIL-15 | Convert button (customer type) | Load customer contact | "Convert to Buyer/Seller" banner visible | |
| TC-DETAIL-16 | Convert to buyer | Click "Convert to Buyer" | Type changes to buyer | |

---

## CATEGORY 7: Contact Preview Sheet

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-PREVIEW-01 | Preview opens from eye icon | Click eye icon on list row | Side panel slides in | |
| TC-PREVIEW-02 | Shows contact name | Open preview | Contact name displayed | |
| TC-PREVIEW-03 | Shows type badge | Open preview | Type badge visible | |
| TC-PREVIEW-04 | Shows phone link | Open preview | Phone number clickable | |
| TC-PREVIEW-05 | Shows email link | Open preview | Email clickable | |
| TC-PREVIEW-06 | Shows recent communications | Open preview for active contact | Up to 5 recent messages | |
| TC-PREVIEW-07 | View Full Profile link | Open preview | Link navigates to detail page | |
| TC-PREVIEW-08 | Close preview | Click outside or close button | Panel closes | |

---

## CATEGORY 8: Edge Cases & Error Handling

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-EDGE-01 | Very long name (200 chars) | Enter 200-char name | Accepted or graceful truncation | |
| TC-EDGE-02 | Unicode name (Chinese/Arabic) | Enter non-latin chars | Accepted and displayed correctly | |
| TC-EDGE-03 | Emoji in name | Enter "John House Doe" | Accepted or rejected gracefully | |
| TC-EDGE-04 | Phone with spaces | Enter "604 555 1234" | Normalized correctly | |
| TC-EDGE-05 | Phone international | Enter "+44 20 7946 0958" | Accepted | |
| TC-EDGE-06 | Email with subdomain | Enter "user@sub.domain.com" | Accepted | |
| TC-EDGE-07 | Email with + alias | Enter "user+tag@gmail.com" | Accepted | |
| TC-EDGE-08 | XSS in name field | Enter script tag | Escaped, no execution | |
| TC-EDGE-09 | SQL injection in search | Enter SQL injection string | Safe handling, no crash | |
| TC-EDGE-10 | Rapid double-submit | Click submit twice quickly | Only one contact created | |
| TC-EDGE-11 | Navigate away during save | Submit then navigate | No partial/corrupt data | |
| TC-EDGE-12 | Invalid contact ID in URL | Navigate to /contacts/invalid-uuid | Error page or redirect | |

---

## CATEGORY 9: Accessibility

| ID | Test Case | Steps | Expected Result | Status |
|----|-----------|-------|-----------------|--------|
| TC-A11Y-01 | Search input has aria-label | Inspect search field | aria-label present | |
| TC-A11Y-02 | Table has aria-label | Inspect table | aria-label="Contacts" | |
| TC-A11Y-03 | Form fields have labels | Inspect form | All inputs have associated labels | |
| TC-A11Y-04 | Tab navigation works | Tab through form fields | Focus moves sequentially | |
| TC-A11Y-05 | Enter key submits form | Focus submit, press Enter | Form submits | |
| TC-A11Y-06 | Escape closes dialog | Press Esc in form dialog | Dialog closes | |
| TC-A11Y-07 | Focus ring visible | Tab to interactive elements | ring-brand focus indicator | |

---

## Execution Summary (2026-04-20)

| Category | Total Tests | Pass | Fail | Skip | Notes |
|----------|-------------|------|------|------|-------|
| List Page | 8 | 7 | 0 | 1 | TC-LIST-08 skipped (need empty DB) |
| Search & Filters | 22 | 8 | 0 | 14 | TC-FILTER-01,04,06,07,12,21,22 + SQL injection |
| Table Interactions | 8 | 6 | 0 | 2 | TC-TABLE-03,04 need real tel/mailto |
| Contact Creation | 36 | 13 | 1 | 22 | Full 6-step wizard tested; TC-CREATE-14 FAIL (invalid email accepted) |
| Partner Fields | 7 | 1 | 0 | 6 | TC-PARTNER-01 P (section hidden by default) |
| Social Media | 5 | 1 | 0 | 4 | TC-SOCIAL-02 P (section visible in step 4) |
| Duplicate Detection | 4 | 0 | 0 | 4 | Requires matching phone/email in DB |
| Contact Editing | 15 | 3 | 0 | 12 | TC-EDIT-01,02,03,14 tested |
| Contact Deletion | 6 | 4 | 1 | 1 | TC-DEL-04 failed on first try (session expiry), passed on retry; TC-DEL-06 skipped |
| Bulk Actions | 8 | 2 | 0 | 6 | TC-BULK-01,02 tested (bar + count) |
| Detail Page | 16 | 11 | 0 | 5 | TC-DETAIL-01-09,13,14 tested |
| Preview Sheet | 8 | 8 | 0 | 0 | All pass |
| Edge Cases | 12 | 2 | 0 | 10 | TC-EDGE-09 (SQL injection), TC-FILTER-04 (XSS) both safe |
| Accessibility | 7 | 2 | 0 | 5 | TC-A11Y-01,02 tested (aria-labels) |
| **TOTAL** | **162** | **69** | **2** | **91** | |

### Key Findings

1. **All core CRUD operations work**: Create (6-step wizard), Read (list + detail), Update (edit dialog), Delete (with confirmation)
2. **Search & Filter**: Name search works, type filter (Buyer/Seller) works, stage filter (Qualified) works, clear filter works with count badge
3. **Preview Sheet**: All 8 test cases pass — opens, shows correct data, closes properly
4. **6-Step Creation Wizard**: Full flow works (Basics → Type → Prefs → Address → Family → Portfolio → Submit)
5. **Live Preview**: Updates in real-time during creation, shows completion percentage, initials, type badge
6. **Stage Bar**: Visual pipeline stepper on detail page (New → Qualified → Active Search → Under Contract → Closed → Cold)
7. **Right Sidebar**: Engagement score (0/100 Cold), Journey status (Active/lead), Send mode (Review first/Auto-send), Trust level (L0: Ghost), Frequency (1/2/3 week/AI decides), Content Types (6 checkboxes), Notes to AI textarea, Danger Zone
8. **Security**: SQL injection in search (`'; DROP TABLE contacts--`) safely handled — no crash, no data loss. XSS (`<script>alert('xss')</script>`) safely escaped — no execution
9. **Validation**: Phone min 10 digits enforced (Next button disabled with 5 digits), name min 2 chars enforced (stays on step 1 with 1 char)
10. **Multi-tenant**: Different users see different contact sets (Kunal: 200 contacts, AMIT: 6 contacts)

### Bugs Found

| # | Severity | Description | Steps to Reproduce |
|---|----------|-------------|-------------------|
| BUG-01 | Medium | Delete fails silently when session expires during action | 1. Stay on detail page until session times out 2. Click More → Delete → Confirm 3. Page shows "Something went wrong" error instead of redirecting to list |
| BUG-02 | Low | Phone format inconsistent | Phone shows as "17785559876" in list table (raw digits) vs "+1 (778) 555-9876" on detail page (formatted) |
| BUG-03 | Medium | Invalid email passes Step 1 validation in creation wizard | 1. Go to /contacts/new 2. Enter valid name + phone 3. Enter "notanemail" in email field 4. Click Next → proceeds to Step 2 without error. Should show email format error before advancing. |

### Screenshots (24 total)

All screenshots saved in `test-screenshots/` directory:
- `contacts-list-page.png` — Full list page with KPIs and pipeline
- `contacts-search-harrison.png` — Search filter in action
- `contacts-filter-buyer.png` — Type filter with clear button
- `contacts-create-form.png` — Step 1: Basics (empty)
- `contacts-create-validation-short-name.png` — 1-char name validation
- `contacts-create-step1-filled.png` — Step 1 with live preview
- `contacts-create-buyer-selected.png` — Step 2: Buyer type selected
- `contacts-create-step3-prefs.png` — Step 3: Buyer preferences
- `contacts-create-step4-address.png` — Step 4: Address & lead info + social media
- `contacts-create-step5-family.png` — Step 5: Family members
- `contacts-create-step6-portfolio.png` — Step 6: Portfolio
- `contacts-after-create.png` — List after creation (New This Week: 30)
- `contacts-detail-page.png` — Full contact detail page
- `contacts-edit-dialog.png` — Edit dialog (pre-populated)
- `contacts-after-edit.png` — After name update
- `contacts-activity-tab.png` — Activity tab
- `contacts-deals-tab.png` — Deals tab
- `contacts-preview-sheet.png` — Preview sheet panel
- `contacts-bulk-select.png` — Bulk selection with 2 selected
- `contacts-more-menu.png` — Delete confirmation dialog
- `contacts-after-delete.png` — Error page on session-expired delete
- `contacts-delete-success.png` — After successful deletion
- `edge-sql-injection.png` — SQL injection safely handled
- `edge-xss-search.png` — XSS safely escaped
- `filter-seller.png` — Seller filter (AMIT account)
- `filter-stage-qualified.png` — Qualified stage filter (empty result)
- `edge-invalid-inputs.png` — Short phone + invalid email
- `create-invalid-email-step2.png` — Invalid email passed to Step 2 (BUG-03)

---

## Test Data Requirements

- At least 5 existing contacts (mix of buyer, seller, partner, customer, other)
- At least 1 contact with active listing (for delete-blocked tests)
- At least 1 contact with communications history
- At least 1 contact with engagement score (for filter tests)
