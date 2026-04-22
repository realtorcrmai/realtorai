<!-- docs-audit: none --># Contacts E2E Test Case Book

## Test Execution Guide
- **Tool:** Playwright MCP (browser automation)
- **Base URL:** http://localhost:3000
- **Pre-condition:** Logged in as demo user
- **Each test case must be checked off before moving to the next**

---

## BOOK 1: Contact Creation (New Contact Wizard)

### 1A. Navigation & Page Load
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C1-01 | Navigate to /contacts/new | Multi-step wizard loads with "Basics" step active | |
| C1-02 | Breadcrumb shows "Contacts / New Contact" | Visible and clickable | |
| C1-03 | Step indicator shows 6 steps (Basics, Type, Prefs, Address, Family, Portfolio) | All 6 visible | |
| C1-04 | "Back" button disabled on first step | Disabled state | |
| C1-05 | "Next" button disabled until required fields filled | Disabled state | |
| C1-06 | Right panel shows LivePreviewCard (desktop) | Preview card visible | |

### 1B. Step 1 — Basics (Required Fields)
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C1-07 | Name field present and empty | Input rendered, placeholder visible | |
| C1-08 | Phone field present and empty | Input type="tel" rendered | |
| C1-09 | Email field present and empty | Input type="email" rendered | |
| C1-10 | Enter name < 2 chars, try Next | Next button stays disabled | |
| C1-11 | Enter valid name (e.g. "Test Contact") | Name accepted, title-cased on blur | |
| C1-12 | Enter phone < 10 digits (e.g. "604123") | Next button stays disabled | |
| C1-13 | Enter phone with invalid chars (e.g. "abc") | Validation error or stays disabled | |
| C1-14 | Enter valid phone (e.g. "6041234567") | Phone formatted on blur (e.g. "(604) 123-4567") | |
| C1-15 | Enter invalid email (e.g. "notanemail") | Validation error shown | |
| C1-16 | Enter valid email (e.g. "test@test.com") | Email accepted, lowercased on blur | |
| C1-17 | Leave email blank | Allowed (optional field) | |
| C1-18 | Fill name + phone, click Next | Advances to Step 2 | |
| C1-19 | LivePreviewCard updates with name/phone/email | Preview shows entered data | |

### 1C. Step 2 — Type & Channel
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C1-20 | TypeSelector shows all 6 types | buyer, seller, dual, customer, partner, other visible | |
| C1-21 | Click "Buyer" type | Type selected, highlighted | |
| C1-22 | Click "Seller" type | Type changes to seller | |
| C1-23 | Click "Partner" type | Type changes to partner | |
| C1-24 | ChannelSelector shows 4 options | SMS, WhatsApp, Email, Phone visible | |
| C1-25 | Default channel is SMS | SMS pre-selected | |
| C1-26 | Click WhatsApp | Channel changes to WhatsApp | |
| C1-27 | Click Next with type selected | Advances to Step 3 | |
| C1-28 | LivePreviewCard shows type badge | Type displayed in preview | |

### 1D. Step 3 — Preferences (Type-Dependent)
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C1-29 | Buyer type: Budget min/max fields shown | Two currency inputs visible | |
| C1-30 | Buyer type: Neighbourhood chips input | Text input with Enter-to-add | |
| C1-31 | Buyer: Add neighbourhood "Kitsilano" then press Enter | Chip appears with X remove | |
| C1-32 | Buyer: Click X on chip | Chip removed | |
| C1-33 | Buyer: Property type toggles (Detached/Townhome/Condo/Duplex/Acreage/Commercial) | All 6 toggles visible | |
| C1-34 | Buyer: Select multiple property types | Multiple toggles highlighted | |
| C1-35 | Buyer: Timeline dropdown | Options available (ASAP, 1-3 months, etc.) | |
| C1-36 | Buyer: Financing dropdown | Options available | |
| C1-37 | Seller type: Motivation dropdown shown | Visible with options | |
| C1-38 | Seller type: Desired price field | Currency input visible | |
| C1-39 | Seller type: Earliest list date | Date input visible | |
| C1-40 | Partner type: Partner type dropdown | Visible with mortgage_broker, lawyer, etc. | |
| C1-41 | Partner type: Company field | Text input visible | |
| C1-42 | Partner type: Job title field | Text input visible | |
| C1-43 | Customer/Other type: "No extra preferences" message | Message displayed | |
| C1-44 | Click Next | Advances to Step 4 | |

### 1E. Step 4 — Address & Details
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C1-45 | Street address input (autocomplete) | AddressAutocompleteInput rendered | |
| C1-46 | City input | Text input visible | |
| C1-47 | Province dropdown (13 options) | All Canadian provinces/territories | |
| C1-48 | Postal code input | Formatted on blur (e.g. "V6B 1A1") | |
| C1-49 | Invalid postal code (e.g. "12345Z") | Validation error | |
| C1-50 | Valid Canadian postal (e.g. "V6B1A1") | Formatted to "V6B 1A1" | |
| C1-51 | Valid US zip (e.g. "90210") | Accepted | |
| C1-52 | Source dropdown | Options: Referral, Website, Open House, etc. | |
| C1-53 | Lead status dropdown | Options: new, contacted, qualified, etc. | |
| C1-54 | Referred by dropdown (shows existing contacts) | Contact list or empty | |
| C1-55 | Social Media picker — platform tabs | Instagram, Facebook, LinkedIn, X, TikTok, YouTube | |
| C1-56 | Add social handle with URL parsing | URL parsed to handle | |
| C1-57 | Realtor Context — type tabs | Preference, Objection, Concern, Timeline, Info | |
| C1-58 | Add context entry (type + text + Enter) | Entry appears with X remove | |
| C1-59 | Remove context entry | Entry removed | |
| C1-60 | Click Next | Advances to Step 5 | |

### 1F. Step 5 — Family Members
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C1-61 | Family member form visible | Name, Relationship, Phone, Email fields | |
| C1-62 | Relationship dropdown | Spouse, Child, Parent, Sibling, Other | |
| C1-63 | Add family member with name only | Added to list, shown below form | |
| C1-64 | Add member with all fields | All fields saved | |
| C1-65 | Remove family member (X button) | Member removed from list | |
| C1-66 | Add multiple members | All shown in list | |
| C1-67 | Click Next | Advances to Step 6 | |

### 1G. Step 6 — Portfolio
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C1-68 | Portfolio form visible | Address, City, Type, Status, Notes | |
| C1-69 | Add property with address | Added to list | |
| C1-70 | Property type dropdown | Detached, Condo, Townhouse, etc. | |
| C1-71 | Property status dropdown | Currently Owned, For Sale, Sold, etc. | |
| C1-72 | Remove property (X button) | Property removed | |
| C1-73 | "Add to Network" button visible and enabled | Large gradient button | |

### 1H. Submission
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C1-74 | Click "Add to Network" | Loading state shown | |
| C1-75 | Successful creation | Redirects to /contacts | |
| C1-76 | New contact appears in contacts list | Contact visible with correct name/type | |
| C1-77 | Contact has correct phone format | E.164 or formatted | |
| C1-78 | Contact has correct email (lowercased) | Email stored correctly | |

### 1I. Duplicate Detection
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C1-79 | Create contact with same phone as existing | Duplicate warning shown | |
| C1-80 | Duplicate card shows matching contact details | Name, phone, email of match | |
| C1-81 | Click "Cancel" on duplicate warning | Returns to form, no creation | |
| C1-82 | Click "Create Anyway" | Contact created despite duplicate | |
| C1-83 | Create with same email as existing | Duplicate warning shown | |

### 1J. Back Navigation
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C1-84 | On Step 3, click Back | Returns to Step 2 with data preserved | |
| C1-85 | On Step 2, click Back | Returns to Step 1 with data preserved | |
| C1-86 | Click completed step in breadcrumb | Jumps to that step | |

---

## BOOK 2: Contact Editing (Edit Dialog)

### 2A. Opening the Edit Dialog
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C2-01 | Navigate to /contacts/{id} | Contact detail page loads | |
| C2-02 | Click Edit button (pencil icon) | ContactForm dialog opens | |
| C2-03 | Dialog pre-fills all existing data | Name, phone, email, type, channel populated | |

### 2B. Field Editing
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C2-04 | Change name to empty | Validation error (min 2 chars) | |
| C2-05 | Change name to single char | Validation error | |
| C2-06 | Change name to valid value | Accepted | |
| C2-07 | Clear phone entirely | Validation error (required, min 10) | |
| C2-08 | Change phone to invalid format | Validation error | |
| C2-09 | Change phone to new valid number | Accepted, formatted on blur | |
| C2-10 | Change email to invalid format | Validation error | |
| C2-11 | Change email to valid new email | Accepted, lowercased on blur | |
| C2-12 | Clear email (make empty) | Allowed (optional) | |
| C2-13 | Change type from buyer to seller | Type dropdown updates | |
| C2-14 | Change type to partner | Partner-specific fields appear | |
| C2-15 | Fill partner fields (type, company, title) | Fields accept input | |
| C2-16 | Change channel to WhatsApp | Dropdown updates | |
| C2-17 | Edit notes | Text accepted | |
| C2-18 | Change lead status | Dropdown updates | |
| C2-19 | Change source | Dropdown updates | |
| C2-20 | Change referred by | Dropdown updates | |
| C2-21 | Edit address | Autocomplete input works | |
| C2-22 | Edit postal code — valid Canadian | Formatted correctly | |
| C2-23 | Edit postal code — invalid | Validation error | |
| C2-24 | Expand social media section | 6 platform inputs shown | |
| C2-25 | Add Instagram handle | Input accepts value | |
| C2-26 | Add LinkedIn URL | URL parsed to profile | |

### 2C. Save & Cancel
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C2-27 | Click "Update Contact" with valid data | Dialog closes, page refreshes with new data | |
| C2-28 | Verify name updated on detail page | New name shown in header | |
| C2-29 | Verify type badge updated | New type badge shown | |
| C2-30 | Click Cancel/X in dialog | Dialog closes, no changes saved | |
| C2-31 | Edit and save, then re-open dialog | Shows newly saved data | |

### 2D. Consistency Rules (Type Change)
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C2-32 | Change buyer to partner | stage_bar should reset to null | |
| C2-33 | Change buyer to seller | stage "active_search" should map to "active_listing" | |
| C2-34 | Change seller to buyer | stage "active_listing" should map to "active_search" | |

---

## BOOK 3: Contact List Page

### 3A. Page Load & Layout
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C3-01 | Navigate to /contacts | Page loads with table | |
| C3-02 | 4 KPI stat cards visible (when contacts exist) | New This Week, Hot Leads, In Pipeline, Closed | |
| C3-03 | PipelineSnapshot visible | Stage grouping shown | |
| C3-04 | "Create Contact" button in header | Link to /contacts/new | |
| C3-05 | "Import" button in header | Opens import modal | |

### 3B. Search & Filters
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C3-06 | Type in search box | Table filters by name/email/phone/type | |
| C3-07 | Search for existing contact name | Contact appears in results | |
| C3-08 | Search for non-existent name | Table shows no results | |
| C3-09 | Clear search | All contacts shown again | |
| C3-10 | Filter by type "Buyer" | Only buyers shown | |
| C3-11 | Filter by type "Seller" | Only sellers shown | |
| C3-12 | Filter by type "Partner" | Only partners shown | |
| C3-13 | Filter by stage "New" | Only new stage contacts | |
| C3-14 | Filter by stage "Closed" | Only closed contacts | |
| C3-15 | Filter by engagement "Hot (60+)" | Only hot leads | |
| C3-16 | Filter by engagement "Cold (<30)" | Only cold leads | |
| C3-17 | Combine type + stage filter (AND logic) | Both filters applied | |
| C3-18 | Clear button shows with filter count | "Clear (N)" visible | |
| C3-19 | Click Clear | All filters reset, URL cleaned | |

### 3C. Table Interactions
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C3-20 | Click contact row | Navigates to /contacts/{id} | |
| C3-21 | Hover row — Eye icon appears | Preview action visible | |
| C3-22 | Click Eye icon | ContactPreviewSheet opens from right | |
| C3-23 | Preview shows name, type, stage | Correct data in sheet | |
| C3-24 | Preview shows recent communications | Up to 5 shown | |
| C3-25 | Click "View Full Profile" in preview | Navigates to detail page | |
| C3-26 | Close preview sheet | Sheet closes | |
| C3-27 | Phone icon on row (if phone exists) | tel: link | |
| C3-28 | Email icon on row (if email exists) | mailto: link | |

### 3D. Bulk Actions
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C3-29 | Select single contact checkbox | Bulk action bar appears | |
| C3-30 | Select multiple contacts | Count updates in bar | |
| C3-31 | "Change Stage" dropdown | Stage options shown | |
| C3-32 | Change stage for selected contacts | Success toast, stage updated | |
| C3-33 | Change stage — some contacts incompatible | Shows skipped count | |
| C3-34 | "Export CSV" button | CSV file downloads | |
| C3-35 | CSV contains correct headers | name, email, phone, type, stage_bar, lead_status, created_at | |
| C3-36 | CSV injection protection | Fields with =,+,@,- are quoted | |
| C3-37 | "Delete" button | Confirmation dialog shown | |
| C3-38 | Confirm delete | Contacts deleted, table refreshes | |
| C3-39 | Delete blocked if contact has active listings | Error message shown | |
| C3-40 | Deselect all | Bulk bar disappears | |

### 3E. URL Param Filters
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C3-41 | Navigate to /contacts?recent=week | Filters to new this week | |
| C3-42 | Navigate to /contacts?engagement=hot | Filters to hot leads | |
| C3-43 | Navigate to /contacts?view=pipeline | Shows pipeline view | |
| C3-44 | Navigate to /contacts?stage=closed | Filters to closed stage | |

### 3F. Empty State
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C3-45 | When no contacts exist | Empty state with "Add Your First Contact" | |
| C3-46 | Click "Add Your First Contact" | Navigates to /contacts/new | |

---

## BOOK 4: Contact Detail Page

### 4A. Header Card
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C4-01 | Avatar shows initials (no photo) | Colored initials circle | |
| C4-02 | Name displayed as h1 | Correct name | |
| C4-03 | Type badge visible | Correct type label | |
| C4-04 | Lead status badge visible | Correct status | |
| C4-05 | Engagement score badge (if exists) | Color-coded score | |
| C4-06 | Phone link (tel:) | Clickable phone | |
| C4-07 | Email link (mailto:) | Clickable email | |
| C4-08 | Last contacted timestamp | Color: green/amber/red | |
| C4-09 | Social profile links (if set) | Icon links visible | |
| C4-10 | Notes text (if exists) | Italic muted text | |
| C4-11 | Edit button opens dialog | ContactForm dialog | |
| C4-12 | More button (3 dots) | Menu with delete option | |

### 4B. Pipeline StageBar
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C4-13 | Buyer contact shows buyer stages | new, qualified, active_search, under_contract, closed, Cold | |
| C4-14 | Seller contact shows seller stages | new, qualified, active_listing, under_contract, closed, Cold | |
| C4-15 | Current stage highlighted | Active indicator on current node | |
| C4-16 | Click future stage | AlertDialog "Change Pipeline Stage" | |
| C4-17 | Confirm stage change | Stage updates, page refreshes | |
| C4-18 | Cancel stage change | No change | |
| C4-19 | Click Cold button | AlertDialog to confirm | |
| C4-20 | Completed stage shows data panel | Data completeness indicators | |
| C4-21 | Customer type shows Convert buttons | "Convert to Buyer" and "Convert to Seller" | |
| C4-22 | Click "Convert to Buyer" | Type changes to buyer, StageBar appears | |

### 4C. Tags
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C4-23 | "+tag" button visible | Clickable | |
| C4-24 | Click +tag | Tag dropdown opens | |
| C4-25 | Search tags | Filtered list | |
| C4-26 | Click tag to add | Tag pill appears on contact | |
| C4-27 | Click X on tag pill | Tag removed | |
| C4-28 | Create custom tag | Type name + Enter/click Create | |
| C4-29 | Tags grouped by category | Priority, Buyer, Seller, Relationship, Status, Source | |

### 4D. Quick Actions
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C4-30 | "Log Note" button visible | Amber styled | |
| C4-31 | Click "Log Note" | NotesDialog opens | |
| C4-32 | Type note + press Enter | Note saved, appears in timeline | |
| C4-33 | "Email" button visible (if email exists) | Brand styled | |
| C4-34 | "Email" button disabled (no email) | Tooltip shown | |
| C4-35 | Click "Email" | EmailComposer dialog opens | |
| C4-36 | Fill subject + body, click Send | Email sent, success toast | |
| C4-37 | "Gmail Sync" button in composer | Syncs email history | |

### 4E. Tabs (Overview / Activity / Deals)
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C4-38 | Three tabs visible | Overview, Activity, Deals | |
| C4-39 | Click Activity tab | Activity panels shown | |
| C4-40 | Click Deals tab | Deals panels shown | |
| C4-41 | Tab from URL param (?tab=activity) | Correct tab active | |
| C4-42 | Activity tab badge (email count) | Shows count if newsletters exist | |
| C4-43 | Deals tab badge (portfolio count) | Shows count if portfolio items | |

### 4F. Overview Tab — Panels
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C4-44 | Quick Setup tiles (new contact) | Set Preferences, Add Context, etc. | |
| C4-45 | Click "Set Preferences" tile | Preferences panel expands | |
| C4-46 | Buyer Preferences panel | Shows budget, beds, areas | |
| C4-47 | Edit preferences (pencil icon) | Edit mode with all fields | |
| C4-48 | Save preferences | Updated values shown | |
| C4-49 | Context Log visible | Entries with type icons | |
| C4-50 | Add context entry | New entry appears | |
| C4-51 | Mark context as resolved | Strikethrough + resolution note | |
| C4-52 | Family Members panel | List of members | |
| C4-53 | Click "Add Member" | Navigates to family/new | |
| C4-54 | Referrals panel | Shows referred contacts | |

### 4G. Activity Tab
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C4-55 | Communication Timeline visible | Messages with direction icons | |
| C4-56 | Tasks panel visible | Task list | |
| C4-57 | Activity Log loads lazily | API call on tab click | |

### 4H. Right Sidebar
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C4-58 | IntelligencePanel (if intel exists) | Engagement stats | |
| C4-59 | ActivitySparkline (if comms exist) | 30-day pattern | |
| C4-60 | ProspectControls | Journey enroll/pause/resume | |
| C4-61 | LogInteractionDialog | "Log a call, text, or meeting" | |
| C4-62 | Click "Log a call..." button | Dialog opens with type selector | |
| C4-63 | Select interaction type + fill notes + click Log | Interaction logged | |

---

## BOOK 5: Contact Deletion

| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C5-01 | Click More (3 dots) on detail page | Menu opens | |
| C5-02 | Click Delete option | AlertDialog confirmation | |
| C5-03 | Dialog shows warning text | "This action cannot be undone" | |
| C5-04 | Click Cancel | Dialog closes, no deletion | |
| C5-05 | Click "Delete Contact" | Contact deleted, redirect to /contacts | |
| C5-06 | Contact no longer in list | Not visible in table | |
| C5-07 | Delete contact with active listing | Error: "Cannot delete contact with active listings" | |
| C5-08 | Delete contact with communications | Cascade delete (comms removed) | |

---

## BOOK 6: Contact Import

### 6A. Import Modal
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C6-01 | Click "Import" button on contacts page | Modal opens | |
| C6-02 | CSV upload option visible | File input for .csv | |
| C6-03 | vCard upload option visible | File input for .vcf | |
| C6-04 | Upload valid CSV file | Success, shows imported count | |
| C6-05 | Upload CSV with missing required fields | Skips invalid rows, shows skipped count | |
| C6-06 | Upload valid vCard | Success, shows imported count | |
| C6-07 | Click "Done" after import | Modal closes | |

### 6B. Full Import Page (/contacts/import)
| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C6-08 | Navigate to /contacts/import | Step 1 (Upload) shown | |
| C6-09 | Source cards visible | Google, Apple/vCard, CSV | |
| C6-10 | Drag and drop CSV file | File accepted, advances to Preview | |
| C6-11 | Preview table shows first 50 rows | Correct column headers | |
| C6-12 | "Import N Contacts" button | Count matches rows | |
| C6-13 | Click Import | Progress shown, then Done step | |
| C6-14 | Done step shows stats | Imported, Skipped, Referrals, Family | |
| C6-15 | File > 10MB rejected | Error or no upload | |
| C6-16 | Download CSV template | Template file downloads | |

---

## BOOK 7: Family Members (CRUD)

| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C7-01 | Navigate to contact detail, Family panel | Panel visible | |
| C7-02 | Click "Add Member" | Navigate to /contacts/{id}/family/new | |
| C7-03 | Relationship selector (5 options) | Spouse, Child, Parent, Sibling, Other | |
| C7-04 | Select "Spouse" | Highlighted | |
| C7-05 | Fill name (required) | Accept valid name | |
| C7-06 | Name < 2 chars | Button disabled | |
| C7-07 | Fill phone | Formatted on blur | |
| C7-08 | Fill email (invalid) | Validation error | |
| C7-09 | Fill email (valid) | Accepted, lowercased | |
| C7-10 | Click "Add Member" | Created, redirect to contact | |
| C7-11 | New member appears in Family panel | Grouped by relationship | |
| C7-12 | Hover member — Edit icon | Pencil icon visible | |
| C7-13 | Click Edit | Navigate to family/{id}/edit | |
| C7-14 | Edit name, save | Updated on contact page | |
| C7-15 | Hover member — Trash icon | Delete icon visible | |
| C7-16 | Click Trash | Member deleted | |
| C7-17 | Phone link on member (if phone) | tel: link works | |
| C7-18 | Email link on member (if email) | mailto: link works | |

---

## BOOK 8: Portfolio (CRUD)

| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C8-01 | Navigate to contact detail, Deals tab | Portfolio section visible | |
| C8-02 | Click "Add Property" | Navigate to /contacts/{id}/portfolio/new | |
| C8-03 | Property category selector (5 options) | Primary, Investment, Vacation, Commercial, Other | |
| C8-04 | Select "Primary" | Highlighted with visual ring | |
| C8-05 | Address autocomplete input | Renders with autocomplete | |
| C8-06 | Province dropdown (13 options) | All provinces | |
| C8-07 | Property sub-type dropdown (13 options) | Detached through Other | |
| C8-08 | Status visual buttons (5 options) | Currently Owned, For Sale, Sold, Refinancing, Gifted | |
| C8-09 | Financial details section | Purchase price, estimated value, etc. | |
| C8-10 | "Investment" shows Rental Income field | Additional field | |
| C8-11 | "Primary" shows Strata Fee field | Additional field | |
| C8-12 | Add co-owner via contact search | Search input, results dropdown | |
| C8-13 | Ownership % totals to 100% | Warning if not | |
| C8-14 | Click "Add to Portfolio" | Created, redirect to contact?tab=portfolio | |
| C8-15 | Property appears in Portfolio tab | Correct address, type | |
| C8-16 | Edit property | Navigate to portfolio/{id}/edit, pre-filled | |
| C8-17 | Save edits | Updated values shown | |

---

## BOOK 9: Segments

| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C9-01 | Navigate to /contacts/segments | Segment page loads | |
| C9-02 | Click "+ New Segment" | Builder form appears | |
| C9-03 | Segment name required | Cannot create without name | |
| C9-04 | Match operator (AND/OR) | Dropdown with 2 options | |
| C9-05 | Add rule — Field dropdown | Contact Type, Stage, Lead Status, Has Tag, Unsubscribed | |
| C9-06 | Add rule — Value dropdown | Context-appropriate values | |
| C9-07 | Add multiple rules | Rules list grows | |
| C9-08 | Remove rule (X) | Rule removed (min 1 remains) | |
| C9-09 | Click "Create Segment" | Segment created, appears in list | |
| C9-10 | Segment card shows contact count | Number displayed | |
| C9-11 | Click "Refresh Count" | Count re-evaluated | |
| C9-12 | Click "Delete" segment | Segment removed | |

---

## BOOK 10: Merge Duplicates

| ID | Test Case | Expected | Status |
|----|-----------|----------|--------|
| C10-01 | Navigate to /contacts/merge | Page loads | |
| C10-02 | Duplicate groups shown (if exist) | Cards with match type | |
| C10-03 | Match type badge (phone/email) | Correct indicator | |
| C10-04 | "Keep this one" button per contact | 2 buttons for 2-contact group | |
| C10-05 | Click "Keep this one" | Merge executed, group marked done | |
| C10-06 | All groups merged | "All duplicates merged!" message | |
| C10-07 | No duplicates | "No duplicates found" message | |

---

## Execution Notes
- Run each book sequentially
- Mark Status as PASS/FAIL/SKIP
- Screenshot any failures
- Test with both buyer and seller contact types for type-dependent UI
