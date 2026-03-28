# ListingFlow CRM — Production Test Plan (1000+ Test Cases)

**Version:** 1.0
**Date:** 2026-03-26
**Run with every production deployment**

---

## How to Use This Document

Each test case follows this format:
- **ID**: Category-Number (e.g., AUTH-001)
- **User Story**: As a [role], I want to [action], so that [outcome]
- **Acceptance Criteria**: Specific conditions that must be true
- **Test Steps**: Step-by-step browser actions
- **Expected Result**: What should happen
- **Priority**: P0 (blocker), P1 (critical), P2 (important), P3 (nice-to-have)

Automated test script: `node scripts/test-email-marketing-ui.mjs` (1833 tests)
Email delivery test: `node scripts/test-workflow-emails.mjs` (46 emails across 7 workflows)

---

## CATEGORY 1: AUTHENTICATION & SESSION (AUTH) — 25 Tests

### AUTH-001: Credentials Login Success
**Story:** As a realtor, I want to log in with email and password, so I can access my CRM.
**Acceptance Criteria:**
- Email and password fields are visible
- Submit button says "Sign In"
- Successful login redirects to dashboard `/`
- Session cookie is set with 1-hour expiry
- User name appears in session
**Steps:** Navigate to `/login` → Enter demo credentials → Click "Sign In"
**Expected:** Redirect to `/`, session shows user name
**Priority:** P0

### AUTH-002: Credentials Login Failure
**Story:** As the system, I want to reject invalid credentials, so unauthorized users can't access the CRM.
**Acceptance Criteria:**
- Red error banner appears: "Invalid email or password"
- No session cookie set
- User remains on `/login`
- Rate limiting kicks in after 5 failed attempts from same IP
**Steps:** Navigate to `/login` → Enter wrong password → Click "Sign In"
**Expected:** Error banner, no redirect
**Priority:** P0

### AUTH-003: Google OAuth Login
**Story:** As a realtor, I want to sign in with Google, so I can also sync my calendar.
**Acceptance Criteria:**
- "Sign in with Google" button visible
- Clicking opens Google OAuth consent screen
- After consent, redirects back to `/`
- Google tokens stored in `google_tokens` table
- Calendar + Gmail scopes granted
**Priority:** P0

### AUTH-004: Session Expiry
**Story:** As the system, I want sessions to expire after 1 hour, for security.
**Acceptance Criteria:**
- After 1 hour of inactivity, next page load redirects to `/login`
- Session cookie `maxAge` is 3600 seconds
**Priority:** P1

### AUTH-005: Unauthenticated Access Redirect
**Story:** As the system, I want to redirect unauthenticated users to login.
**Acceptance Criteria:**
- Accessing `/newsletters` without session returns 307 redirect to `/login`
- Accessing `/contacts` without session redirects
- Accessing `/listings` without session redirects
- API routes return 401 when no session
**Priority:** P0

### AUTH-006: Session Persistence Across Pages
**Story:** As a realtor, I want my session to persist as I navigate between pages.
**Acceptance Criteria:**
- After login, navigating to `/contacts`, `/listings`, `/newsletters` all work
- Session data (name, email, role) available on every page
- No re-login required between navigations
**Priority:** P0

### AUTH-007: Feature Flags in Session
**Story:** As the system, I want feature flags loaded into the session, so the UI shows only enabled features.
**Acceptance Criteria:**
- Session includes `enabledFeatures` array
- Features include: listings, contacts, tasks, showings, calendar, content, search, workflow, import, forms, website, newsletters, pipeline
- Dashboard tiles only show for enabled features
**Priority:** P1

### AUTH-008: Admin Role Guard
**Story:** As the system, I want to restrict `/admin` to admin users only.
**Acceptance Criteria:**
- Non-admin users accessing `/admin` are redirected to `/`
- Admin users can access `/admin` and see realtor management panel
**Priority:** P1

### AUTH-009–AUTH-025: Additional Auth Tests
- AUTH-009: Logout clears session and redirects to `/login`
- AUTH-010: Multiple concurrent sessions (same user, different browsers)
- AUTH-011: CSRF token present on login form
- AUTH-012: Password field masks input
- AUTH-013: Email field validates format before submit
- AUTH-014: Loading spinner shows during login submission
- AUTH-015: Google OAuth with missing calendar scope
- AUTH-016: Login page responsive on mobile
- AUTH-017: Login page shows branding panel on desktop only
- AUTH-018: Session refreshes on tab focus
- AUTH-019: API routes return 401 with proper JSON error (not HTML redirect)
- AUTH-020: Webhook routes bypass auth (Twilio, Resend)
- AUTH-021: Cron routes require Bearer token
- AUTH-022: Rate limiting after 5 failed login attempts
- AUTH-023: Demo credentials work when env vars unset
- AUTH-024: Google tokens refresh automatically when expired
- AUTH-025: Logout from mobile navigation works

---

## CATEGORY 2: PAGE LOAD & NAVIGATION (NAV) — 50 Tests

### NAV-001: Dashboard Loads
**Story:** As a realtor, I want the dashboard to load quickly with all my key metrics.
**Acceptance Criteria:**
- Page returns 200
- Greeting shows correct time of day
- Pipeline snapshot with 5 stages visible
- Feature hub shows 12 tiles (filtered by enabled features)
- Active listing count badge on Listings tile
- Open task count badge on Tasks tile
**Steps:** Login → Navigate to `/`
**Expected:** Dashboard fully rendered with live data
**Priority:** P0

### NAV-002–NAV-041: All Route Loads (200 status)
Each route must return 200 for authenticated users:
- NAV-002: `/contacts` (redirects to first contact)
- NAV-003: `/contacts/{valid_id}`
- NAV-004: `/contacts/segments`
- NAV-005: `/listings` (redirects to first listing)
- NAV-006: `/listings/{valid_id}`
- NAV-007: `/showings`
- NAV-008: `/showings/{valid_id}`
- NAV-009: `/calendar`
- NAV-010: `/tasks`
- NAV-011: `/pipeline`
- NAV-012: `/pipeline/{valid_id}`
- NAV-013: `/content`
- NAV-014: `/content/{valid_id}`
- NAV-015: `/search`
- NAV-016: `/workflow`
- NAV-017: `/import`
- NAV-018: `/forms`
- NAV-019: `/inbox`
- NAV-020: `/reports`
- NAV-021: `/settings`
- NAV-022: `/newsletters`
- NAV-023: `/newsletters/queue`
- NAV-024: `/newsletters/analytics`
- NAV-025: `/newsletters/control`
- NAV-026: `/newsletters/activity`
- NAV-027: `/newsletters/suppressions`
- NAV-028: `/newsletters/ghost`
- NAV-029: `/newsletters/insights`
- NAV-030: `/newsletters/guide`
- NAV-031: `/automations`
- NAV-032: `/automations/templates`
- NAV-033: `/automations/notifications`
- NAV-034: `/automations/workflows/{valid_id}`
- NAV-035: `/automations/workflows/{valid_id}/edit`
- NAV-036: `/automations/templates/{valid_id}/edit`
- NAV-037: `/admin` (admin user)
- NAV-038: Invalid contact ID returns 404
- NAV-039: Invalid listing ID returns 404
- NAV-040: Invalid workflow ID handled gracefully
- NAV-041: Sidebar navigation links all work

### NAV-042–NAV-050: Mobile Navigation
- NAV-042: Mobile bottom nav bar visible on small screens
- NAV-043: Sidebar hidden on mobile, bottom nav shows
- NAV-044: All tabs in email marketing scroll horizontally on mobile
- NAV-045: Contact detail opens MobileDetailSheet on small screens
- NAV-046: Calendar defaults to agenda view on mobile
- NAV-047: Pipeline board scrolls horizontally on mobile
- NAV-048: Forms readable on mobile
- NAV-049: Task list checkboxes tappable on touch devices
- NAV-050: Back buttons work correctly on mobile

---

## CATEGORY 3: CONTACT MANAGEMENT (CONTACT) — 120 Tests

### CONTACT-001: Create Contact
**Story:** As a realtor, I want to add a new contact with name, phone, email, and type.
**Acceptance Criteria:**
- Contact form in sidebar has: name (required), phone, email, type dropdown (buyer/seller/partner)
- Submitting creates contact in database
- New contact appears in contact list
- Auto-redirects to new contact's detail page
**Priority:** P0

### CONTACT-002: View Contact Detail
**Story:** As a realtor, I want to see all information about a contact on one page.
**Acceptance Criteria:**
- Header shows: avatar, name, type badge, lead status badge, tags, phone, email
- StageBar shows pipeline progress (5 stages)
- 4 tabs: Overview, Intelligence, Activity, Deals
- Correct data loads for each tab
**Priority:** P0

### CONTACT-003: Edit Contact
**Story:** As a realtor, I want to update a contact's information.
**Acceptance Criteria:**
- Edit button opens ContactForm dialog
- All fields pre-filled with current values
- Saving updates the database and refreshes the page
**Priority:** P0

### CONTACT-004: Delete Contact
**Story:** As a realtor, I want to delete a contact I no longer need.
**Acceptance Criteria:**
- Delete button shows confirmation dialog
- Confirming deletes contact and all related records (cascade)
- Redirects to contact list
**Priority:** P1

### CONTACT-005: Contact Type Filtering
**Story:** As a realtor, I want to filter contacts by type (buyer/seller/customer/agent/partner/other).
**Priority:** P1

### CONTACT-005a–005f: Contact Type Behavior
- CONTACT-005a: Customer (lead) type — receives generic nurture, no buyer/seller specific content
- CONTACT-005b: Buyer type — receives listing alerts, mortgage guides, showing follow-ups
- CONTACT-005c: Seller type — receives market updates, showing summaries, sale congrats
- CONTACT-005d: Agent type — receives listing blasts ONLY, no greetings, no nurture emails
- CONTACT-005e: Partner type — receives referral partner workflow emails
- CONTACT-005f: Lead capture webhook defaults to "customer" type (not buyer)

### CONTACT-006–CONTACT-020: Contact Data Fields
- CONTACT-006: Name displays correctly (first + last)
- CONTACT-007: Phone number formatted with +1 prefix
- CONTACT-008: Email displayed and clickable (mailto:)
- CONTACT-009: Preferred channel shown (SMS/WhatsApp/Email)
- CONTACT-010: Notes displayed below contact info
- CONTACT-011: Tags displayed as badges, editable inline
- CONTACT-012: Lead status badge color-coded (new=green, qualified=blue, active=purple, etc.)
- CONTACT-013: Created date shown
- CONTACT-014: Last activity date calculated from communications
- CONTACT-015: Household banner shown when assigned to household
- CONTACT-016: Journey progress bar shown when enrolled in journey
- CONTACT-017: Engagement score displayed in Intelligence tab
- CONTACT-018: Click history timeline in Intelligence tab
- CONTACT-019: Inferred interests (areas, property types, price range) shown
- CONTACT-020: Network stats (connections, referrals, network value)

### CONTACT-021–CONTACT-040: StageBar & Pipeline
- CONTACT-021: Buyer stages: New → Qualified → Active Search → Under Contract → Closed
- CONTACT-022: Seller stages: New → Qualified → Pre-Listing → Active Listing → Under Contract → Closed
- CONTACT-023: Clicking stage scrolls to relevant section
- CONTACT-024: Stage completeness checklist shows per-stage requirements
- CONTACT-025: Stage advancement updates `stage_bar` field
- CONTACT-026–CONTACT-040: Individual stage requirement checks (15 tests)

### CONTACT-041–CONTACT-060: Communication
- CONTACT-041: QuickActionBar shows Call, SMS, WhatsApp buttons
- CONTACT-042: Call button opens tel: link
- CONTACT-043: SMS sends via Twilio
- CONTACT-044: WhatsApp sends via Twilio with whatsapp: prefix
- CONTACT-045: EmailComposer visible and functional
- CONTACT-046: Email compose sends via Gmail API
- CONTACT-047: Communication logged to communications table
- CONTACT-048: Communication timeline shows all messages
- CONTACT-049: Inbound messages displayed (from webhooks)
- CONTACT-050: Outbound messages displayed
- CONTACT-051–CONTACT-060: Message template variables resolve correctly (10 tests)

### CONTACT-061–CONTACT-080: Relationships & Family
- CONTACT-061: Add relationship between contacts
- CONTACT-062: Relationship types: spouse, referral, agent, lawyer, mortgage broker
- CONTACT-063: Relationship graph visualizes connections
- CONTACT-064: Family member CRUD (add/edit/delete)
- CONTACT-065: Important dates CRUD (birthdays, anniversaries)
- CONTACT-066: Recurring dates auto-calculate next occurrence
- CONTACT-067: Reminder tasks auto-created for important dates
- CONTACT-068–CONTACT-080: Edge cases (orphan relationships, self-reference prevention, etc.)

### CONTACT-081–CONTACT-100: Documents & Tasks
- CONTACT-081: Upload document to contact
- CONTACT-082: View document list
- CONTACT-083: Delete document
- CONTACT-084: Tasks linked to contact show in Overview tab
- CONTACT-085: Create task from contact page
- CONTACT-086: Complete task from contact page
- CONTACT-087: Referrals panel shows/creates referrals
- CONTACT-088: Properties of interest (buyer) — add/remove listings
- CONTACT-089: Buyer preferences panel (budget, areas, property types)
- CONTACT-090: Seller preferences panel (motivation, desired price, timeline)
- CONTACT-091–CONTACT-100: Context log entries (add, resolve, view history)

### CONTACT-101–CONTACT-120: Segments & Bulk
- CONTACT-101: Segment builder page loads
- CONTACT-102: Create segment with filters (type, stage, engagement score, area)
- CONTACT-103: Preview segment shows matching contacts
- CONTACT-104: Bulk enroll segment in journey
- CONTACT-105: Search contacts by name
- CONTACT-106: Search contacts by phone
- CONTACT-107: Search contacts by email
- CONTACT-108: Contact list pagination/infinite scroll
- CONTACT-109: Contact auto-redirect to most recent
- CONTACT-110: Contact with no email shows warning for newsletter
- CONTACT-111: Unsubscribed contact badge displayed
- CONTACT-112: Contact with high engagement score (>60) shows hot lead indicator
- CONTACT-113–CONTACT-120: Data validation (required name, phone format, email format, etc.)

---

## CATEGORY 4: LISTING MANAGEMENT (LISTING) — 100 Tests

### LISTING-001: Create Listing
**Story:** As a realtor, I want to add a new property listing with address, price, and seller.
**Acceptance Criteria:**
- Listing form in sidebar has: address (required), seller dropdown, list price, lockbox code, MLS number
- Submitting creates listing with `status: active`, `current_phase: 1`
- Auto-redirects to new listing detail page
**Priority:** P0

### LISTING-002: View Listing Detail
**Story:** As a realtor, I want to see all listing information including workflow progress.
**Acceptance Criteria:**
- Header shows: address, status badge, price, lockbox, MLS#, seller link
- 8-phase workflow stepper visible
- Current phase highlighted
- Showing history listed
- Form readiness panel in sidebar
**Priority:** P0

### LISTING-003–LISTING-020: Listing Workflow (8 Phases)
- LISTING-003: Phase 1 — Seller Intake (FINTRAC identity, property details, commissions)
- LISTING-004: Phase 1 — FINTRAC identity collection form
- LISTING-005: Phase 2 — Data Enrichment (BC Geocoder API call works)
- LISTING-006: Phase 2 — ParcelMap BC API call works
- LISTING-007: Phase 2 — LTSA manual entry
- LISTING-008: Phase 2 — BC Assessment manual entry
- LISTING-009: Phase 3 — CMA Analysis fields
- LISTING-010: Phase 4 — Pricing & Review, price lock
- LISTING-011: Phase 5 — Form Generation (12 BCREA forms button)
- LISTING-012: Phase 5 — Each form pre-fills from CRM data
- LISTING-013: Phase 6 — E-Signature status tracking
- LISTING-014: Phase 7 — MLS remarks generation (Claude AI)
- LISTING-015: Phase 7 — Photo management
- LISTING-016: Phase 8 — MLS submission confirmation
- LISTING-017: Phase advancement is sequential
- LISTING-018: Audit trail logged on phase change
- LISTING-019: Missing documents alert banner
- LISTING-020: Status override dropdown (active/pending/sold)

### LISTING-021–LISTING-040: Showings
- LISTING-021: Create showing request from listing page
- LISTING-022: Showing blocked when required docs missing
- LISTING-023: Seller notified via SMS/WhatsApp on new showing
- LISTING-024: Seller confirms via YES reply → lockbox code sent
- LISTING-025: Seller denies via NO reply → denial notification
- LISTING-026: Showing status badges color-coded
- LISTING-027: Calendar event created on confirmation
- LISTING-028: Showing history chronological order
- LISTING-029–LISTING-040: Edge cases (duplicate showings, past dates, etc.)

### LISTING-041–LISTING-060: Forms (12 BCREA)
- LISTING-041: DORTS form pre-fills correctly
- LISTING-042: MLC form pre-fills correctly
- LISTING-043: PDS form pre-fills correctly
- LISTING-044: FINTRAC form pre-fills correctly
- LISTING-045: PRIVACY form pre-fills correctly
- LISTING-046: Form save as draft
- LISTING-047: Form complete generates PDF
- LISTING-048: PDF uploaded to Supabase storage
- LISTING-049: Document tracker shows completion status
- LISTING-050: Field mapping configurable per template
- LISTING-051–LISTING-060: Each remaining form type

### LISTING-061–LISTING-080: Content Engine
- LISTING-061: MLS public remarks generated by Claude (<500 chars)
- LISTING-062: MLS REALTOR remarks generated by Claude (<500 chars)
- LISTING-063: Video prompt generated
- LISTING-064: Image prompt generated
- LISTING-065: Instagram caption generated
- LISTING-066: Kling video generation initiated
- LISTING-067: Kling image generation initiated
- LISTING-068: Kling task polling works
- LISTING-069: Media gallery shows generated assets
- LISTING-070: Content stepper (Prompts → Generate → Gallery)
- LISTING-071–LISTING-080: Edge cases (no seller data, missing photos, etc.)

### LISTING-081–LISTING-100: Search, Import, Pipeline
- LISTING-081: Property search by address
- LISTING-082: Search by MLS number
- LISTING-083: Search filter by status
- LISTING-084: Search filter by price range
- LISTING-085: No results empty state
- LISTING-086: Excel import template download
- LISTING-087: Excel file upload and preview
- LISTING-088: Import creates listings with seller contacts
- LISTING-089: Import error per-row display
- LISTING-090: MLS workflow 7-phase view
- LISTING-091: Listings grouped by workflow phase
- LISTING-092: Open house creation
- LISTING-093: Open house visitor tracking
- LISTING-094: Listing activity statistics
- LISTING-095: Neighborhood comparables mock data
- LISTING-096–LISTING-100: Data validation (address required, price numeric, etc.)

---

## CATEGORY 5: EMAIL MARKETING (EMAIL) — 250 Tests

### EMAIL-001: Email Marketing Page Loads
**Story:** As a realtor, I want to see my email marketing dashboard with all tabs.
**Acceptance Criteria:**
- Page returns 200
- 6 tabs visible: Overview, AI Workflows, Performance, Campaigns, Automation, Settings
- Default tab is Overview
- Page title: "Email Marketing"
**Priority:** P0

### EMAIL-002–EMAIL-020: Overview Tab
- EMAIL-002: Health stat pills show Hot Buyers, Hot Sellers, Warm, Cold counts
- EMAIL-003: Sent count, open rate %, click rate % displayed
- EMAIL-004: "Act Now" card shows top 4 urgent contacts
- EMAIL-005: Urgent contacts have Call button (tel: link)
- EMAIL-006: Urgent contacts show engagement score
- EMAIL-007: Pulsing dot on contacts active in last 2 days
- EMAIL-008: Pipeline card shows 5 phases with buyer+seller counts
- EMAIL-009: AI Activity card shows emails sent this month
- EMAIL-010: AI Activity shows drafts pending count
- EMAIL-011: AI Activity shows suppressed count
- EMAIL-012: AI Activity shows recent open/click events
- EMAIL-013: Empty state when no contacts enrolled
- EMAIL-014: Hot buyers filtered correctly (engagement_score >= 60, type=buyer)
- EMAIL-015: Hot sellers filtered correctly (engagement_score >= 60, type=seller)
- EMAIL-016: Warm contacts (score 30-59) counted correctly
- EMAIL-017: Cold contacts (score <30 including dormant) counted correctly
- EMAIL-018: Pipeline totals match dashboard totalContacts
- EMAIL-019: Click "View" on contact navigates to `/contacts/{id}`
- EMAIL-020: Overview responsive on mobile

### EMAIL-021–EMAIL-040: AI Workflows Tab
- EMAIL-021: 7 workflow cards displayed in grid
- EMAIL-022: Each card shows icon, name, description
- EMAIL-023: Each card shows step count (non-zero after seeding)
- EMAIL-024: Each card shows Active/Paused badge
- EMAIL-025: Each card shows contact type badge (Buyer/Seller/Any)
- EMAIL-026: Clicking card navigates to `/automations/workflows/{id}`
- EMAIL-027: "Manage All" link goes to `/automations`
- EMAIL-028: No zombie workflows (buyer_lifecycle, seller_lifecycle deleted)
- EMAIL-029: Workflow cards responsive (1 col mobile, 2 tablet, 3 desktop)
- EMAIL-030: Buyer Nurture Plan shows 24 steps
- EMAIL-031: Post-Close Buyer shows 19 steps
- EMAIL-032: Post-Close Seller shows 19 steps
- EMAIL-033: Lead Speed-to-Contact shows 12 steps
- EMAIL-034: Lead Re-Engagement shows 11 steps
- EMAIL-035: Open House Follow-Up shows 11 steps
- EMAIL-036: Referral Partner shows 12 steps
- EMAIL-037: Empty state when no workflows
- EMAIL-038: Blueprint icons match (🏠, ⚡, 🎉, 🤝, 🔁, 🏡)
- EMAIL-039: Trigger type displayed on each card
- EMAIL-040: All 7 workflow detail pages load (200 status)

### EMAIL-041–EMAIL-070: Performance Tab
- EMAIL-041: "AI Working For You" card shows 4 stats
- EMAIL-042: Total emails sent count matches DB
- EMAIL-043: Time saved calculated at 15 min/email
- EMAIL-044: Open rate shows with industry avg comparison (if >21%)
- EMAIL-045: Hot lead count matches contacts with score >= 60
- EMAIL-046: Success stories show up to 5 contact stories
- EMAIL-047: Success stories link to contact pages
- EMAIL-048: "Coming Up Next" shows scheduled sends within 7 days
- EMAIL-049: AI Agent Queue shows pending draft count in tab badge
- EMAIL-050: Draft cards show contact name, email type, subject
- EMAIL-051: "Approve & Send" button triggers `sendNewsletter()`
- EMAIL-052: "Skip" button triggers `skipNewsletter()`
- EMAIL-053: "Bulk Approve All" button approves all pending
- EMAIL-054: Edit button enables subject editing inline
- EMAIL-055: Preview button opens email HTML in modal
- EMAIL-056: Sent result badge (green checkmark) on success
- EMAIL-057: Error result badge (red) on failure
- EMAIL-058: "Sent by AI" section groups emails by contact
- EMAIL-059: Expandable contact rows show email engagement timeline
- EMAIL-060: Individual email rows expandable with opened/clicked/bounced events
- EMAIL-061: Open rate bar color-coded (emerald >= 70%, amber >= 40%, red < 40%)
- EMAIL-062: "Held Back by AI" shows suppressed emails
- EMAIL-063: Suppression reasons categorized (frequency cap, auto-sunset, low engagement, quiet hours)
- EMAIL-064: Suppressed email detail shows full reason
- EMAIL-065: "View Contact" link on suppressed emails
- EMAIL-066: Empty queue state: "All caught up!"
- EMAIL-067: Empty sent list state
- EMAIL-068: Empty held back state
- EMAIL-069: Performance tab responsive on mobile
- EMAIL-070: Queue badge updates after approve/skip

### EMAIL-071–EMAIL-100: Campaigns Tab
- EMAIL-071: Two action cards visible: Manual Listing Blast + Custom Campaign
- EMAIL-072: Blast History shows previous blasts
- EMAIL-073: Clicking Manual Blast opens 4-step wizard
- EMAIL-074: Step 1: Active listings shown as selectable cards
- EMAIL-075: Step 1: Next button disabled until listing selected
- EMAIL-076: Step 2: Subject and notes fields pre-filled by AI
- EMAIL-077: Step 2: Checkboxes for photos, open house, commission, floor plan
- EMAIL-078: Step 3: Recipients (all agents, area agents, import list)
- EMAIL-079: Step 4: Review shows listing + recipient + send summary
- EMAIL-080: Step 4: "Send to N Agents" button calls `sendListingBlast()`
- EMAIL-081: Blast success screen with checkmark
- EMAIL-082: "Send Another" button resets wizard
- EMAIL-083: "Back to Campaigns" button returns to home
- EMAIL-084: Custom Campaign wizard opens 4-step wizard
- EMAIL-085: Step 1: 8 template cards with open rate badges
- EMAIL-086: Step 2: Recipient selection (all buyers, sellers, etc.)
- EMAIL-087: Step 3: Subject + message customization
- EMAIL-088: Step 4: Send Now vs Schedule toggle
- EMAIL-089: Campaign sent success screen
- EMAIL-090: Blast History expandable rows with stats
- EMAIL-091: Blast stats: recipients, opens, clicks, replies, open rate
- EMAIL-092: Blast detail shows listing info, template, date
- EMAIL-093: Navigation between wizard steps (Back/Next)
- EMAIL-094: Empty listings state (no active listings for blast)
- EMAIL-095–EMAIL-100: Edge cases (empty subject, no recipients, etc.)

### EMAIL-101–EMAIL-130: Automation Tab
- EMAIL-101: Listing Blast Automation section header visible
- EMAIL-102: Default rule created for "Listing Goes Active"
- EMAIL-103: "Add Automation" button creates new rule
- EMAIL-104: Each rule shows collapsed summary
- EMAIL-105: Click to expand rule settings
- EMAIL-106: Trigger selection: 3 options (Active, Created, Price Change)
- EMAIL-107: Template selection: 4 options (AI Chooses, Alert, Luxury, Open House)
- EMAIL-108: Template preview buttons open in new tab
- EMAIL-109: Preview renders Apple-quality HTML email
- EMAIL-110: Recipients dropdown: 5 options
- EMAIL-111: Approval toggle: Review First vs Auto-send
- EMAIL-112: Enable/disable toggle per rule
- EMAIL-113: Delete automation button with confirmation
- EMAIL-114: Active/Paused badge on collapsed card
- EMAIL-115: Saving status indicator ("Saving..." → "Saved")
- EMAIL-116: **Rules persist after page refresh** (saved to DB)
- EMAIL-117: Multiple rules can exist simultaneously
- EMAIL-118: Each rule independent (different trigger, template, recipients)
- EMAIL-119: Empty state when all rules deleted
- EMAIL-120: Rules loaded from `realtor_agent_config.brand_config.automation_rules`
- EMAIL-121–EMAIL-130: Edge cases (max rules, duplicate triggers, etc.)

### EMAIL-131–EMAIL-155: Greeting Automations
- EMAIL-131: Greeting Automations section visible in Automation tab
- EMAIL-132: Empty state shows "Quick Start" button
- EMAIL-133: Quick Start enables Birthday, Anniversary, Christmas, New Year, Diwali
- EMAIL-134: "Add Greeting" button creates new greeting rule
- EMAIL-135: 12 occasion options available (Birthday through Custom)
- EMAIL-136: Birthday occasion: recipients default to "with_date"
- EMAIL-137: Home Anniversary: recipients default to "with_date"
- EMAIL-138: Holiday occasions: recipients default to "all_contacts"
- EMAIL-139: Occasion selector shows all 12 options in grid
- EMAIL-140: Recipient dropdown: 6 options (all contacts, buyers, sellers, past, active, with date)
- EMAIL-141: Approval toggle: Review first vs Auto-send
- EMAIL-142: Personal note textarea (optional AI hint)
- EMAIL-143: "How it works" explanation per occasion
- EMAIL-144: Enable/disable toggle per greeting
- EMAIL-145: Delete greeting with confirmation
- EMAIL-146: Active/Paused badge on collapsed card
- EMAIL-147: Save status indicator ("Saving..." → "Saved")
- EMAIL-148: **Rules persist after page refresh** (saved to DB)
- EMAIL-149: Multiple greetings can coexist
- EMAIL-150: Christmas greeting explains "AI personalizes per contact type"
- EMAIL-151: Diwali greeting culturally respectful description
- EMAIL-152: Custom occasion allows any name
- EMAIL-153: Greeting rules stored in realtor_agent_config.brand_config.greeting_rules
- EMAIL-154: Lunar New Year, Thanksgiving, Valentine's, Mother's/Father's Day available
- EMAIL-155: Canada Day greeting available

### EMAIL-131–EMAIL-160: Settings Tab
- EMAIL-131: AI Email Sending master toggle
- EMAIL-132: Toggle **persists after refresh** (saved to DB)
- EMAIL-133: Frequency cap spinner (1-7 per week)
- EMAIL-134: Frequency cap persists to `realtor_agent_config.frequency_caps`
- EMAIL-135: Quiet hours start/end time inputs
- EMAIL-136: Quiet hours persist to DB
- EMAIL-137: Weekend sending toggle
- EMAIL-138: Weekend toggle persists to `realtor_agent_config.skip_weekends`
- EMAIL-139: Default send mode (Review First / Auto-Send)
- EMAIL-140: "Save Changes" button triggers `updateRealtorSettings()`
- EMAIL-141: "Saved!" confirmation after successful save
- EMAIL-142: "Saving..." state while persisting
- EMAIL-143: Compliance section shows CASL + CAN-SPAM compliant
- EMAIL-144: Unsubscribe count (this month)
- EMAIL-145: Complaint count (this month)
- EMAIL-146: Settings loaded from `realtor_agent_config` on page load
- EMAIL-147: Settings tab responsive on mobile
- EMAIL-148–EMAIL-160: Edge cases (simultaneous edits, invalid values, etc.)

### EMAIL-161–EMAIL-200: Newsletter Sub-Pages
- EMAIL-161: `/newsletters/queue` loads approval queue
- EMAIL-162: Queue shows pending draft count
- EMAIL-163: Each draft has approve/skip/edit actions
- EMAIL-164: `/newsletters/analytics` loads with 5 stat cards
- EMAIL-165: Analytics shows open rate, click rate, sent count
- EMAIL-166: Brand Score calculated correctly (0-100)
- EMAIL-167: Performance by email type table
- EMAIL-168: `/newsletters/control` loads command center
- EMAIL-169: Activity feed, workflow center, journey tracker visible
- EMAIL-170: `/newsletters/activity` loads 7-day agent activity feed
- EMAIL-171: `/newsletters/suppressions` loads 14-day suppression log
- EMAIL-172: Suppression override capability
- EMAIL-173: `/newsletters/ghost` loads ghost mode comparison
- EMAIL-174: Match rate percentage displayed
- EMAIL-175: Side-by-side ghost draft vs actual email
- EMAIL-176: `/newsletters/insights` loads agent insights
- EMAIL-177: Trust level displayed (ghost/supervised/autonomous)
- EMAIL-178: Edit rate trend chart
- EMAIL-179: Voice learning section
- EMAIL-180: `/newsletters/guide` loads walkthrough
- EMAIL-181–EMAIL-200: Edge cases per sub-page

### EMAIL-201–EMAIL-250: Email Delivery & Tracking
- EMAIL-201: Email sent via Resend with correct subject
- EMAIL-202: Email HTML rendered from blocks system
- EMAIL-203: BCC sent to monitor email (EMAIL_MONITOR_BCC)
- EMAIL-204: BCC includes metadata banner (workflow, step, phase, contact)
- EMAIL-205: List-Unsubscribe header present
- EMAIL-206: Resend message ID stored in newsletters table
- EMAIL-207: Resend webhook fires on email open
- EMAIL-208: Open event logged to newsletter_events
- EMAIL-209: Contact engagement_score updated on open
- EMAIL-210: Resend webhook fires on email click
- EMAIL-211: Click classified into 11 categories
- EMAIL-212: Click history updated (last 50 retained)
- EMAIL-213: High-intent click (book_showing, get_cma) triggers agent alert
- EMAIL-214: Bounce auto-unsubscribes contact
- EMAIL-215: Complaint auto-unsubscribes contact
- EMAIL-216: Unsubscribe pauses all active journeys
- EMAIL-217: Unsubscribe endpoint (`/api/newsletters/unsubscribe?id=X`) works
- EMAIL-218: Unsubscribe shows confirmation HTML page
- EMAIL-219: Send governor checks frequency cap before send
- EMAIL-220: Send governor checks engagement decline
- EMAIL-221: Send governor auto-sunset after 5 emails with 0 opens in 90 days
- EMAIL-222: Send governor respects weekend skip setting
- EMAIL-223: Send governor respects master switch
- EMAIL-224: Send governor respects quiet hours
- EMAIL-225: Validated send pipeline: content → design → compliance → quality
- EMAIL-226: Quality score blocks emails below threshold (< 4/10)
- EMAIL-227: Quality score requests regeneration for low scores (< 6/10)
- EMAIL-228: Deduplication prevents same email type within 7 days
- EMAIL-229: Frequency cap prevents > 2 emails per contact per 24h
- EMAIL-230: All 6 email types render correctly (welcome, listing_alert, market_update, etc.)
- EMAIL-231–EMAIL-250: Per-email-type acceptance tests (subject, body, CTA, personalization)

---

## CATEGORY 6: WORKFLOW & AUTOMATION ENGINE (WF) — 150 Tests

### WF-001–WF-020: Workflow CRUD
- WF-001: 7 workflows exist with correct slugs
- WF-002: Each workflow has correct step count per blueprint
- WF-003: Workflow detail page shows all steps
- WF-004: Step numbering sequential (action steps only, waits unnumbered)
- WF-005: Wait steps show correct delay ("1 day", "2 days", etc.)
- WF-006: Add Step dialog works
- WF-007: Edit Step dialog pre-fills values
- WF-008: Delete Step removes from DB
- WF-009: Seed Default Steps button populates from blueprint
- WF-010: Active/Paused toggle updates DB
- WF-011: Inline name editing
- WF-012: Inline description editing
- WF-013: Visual editor (React Flow) loads
- WF-014: Nodes rendered for each step
- WF-015: Save flow JSON persists
- WF-016: Enrollment panel shows enrolled contacts
- WF-017: Enroll Contact dropdown works
- WF-018: Pause/Resume enrollment
- WF-019: Exit enrollment
- WF-020: Completed enrollment badge

### WF-021–WF-060: Workflow Step Execution (7 step types)
- WF-021: `auto_email` generates AI content + sends via Resend
- WF-022: `auto_email` with template renders from email-blocks
- WF-023: `auto_email` subject personalized with contact name
- WF-024: `auto_sms` sends via Twilio
- WF-025: `auto_sms` message personalized
- WF-026: `auto_whatsapp` sends via Twilio with whatsapp: prefix
- WF-027: `manual_task` creates task in DB
- WF-028: `manual_task` sets priority and category from config
- WF-029: `auto_alert` creates agent notification
- WF-030: `system_action` change_lead_status updates contact
- WF-031: `system_action` add_tag adds tag to contact
- WF-032: `system_action` change_stage updates stage_bar
- WF-033: `system_action` remove_tag removes from contact
- WF-034: `wait` step delays next step by configured minutes
- WF-035: `exit_on_reply` exits enrollment when contact responds
- WF-036: Step execution logged to workflow_step_logs
- WF-037: Step execution logged to activity_log
- WF-038: Failed step does NOT advance (retry next cycle)
- WF-039: Successful step advances to next
- WF-040: Last step marks enrollment as completed
- WF-041–WF-060: Per-workflow acceptance tests (each of 7 workflows × 3 step types minimum)

### WF-061–WF-090: Workflow Cron Processing
- WF-061: Cron endpoint requires Bearer token
- WF-062: Cron processes up to 50 enrollments per run
- WF-063: Only processes enrollments where `next_run_at <= now`
- WF-064: Send governor check before message steps
- WF-065: Suppressed sends logged as status "suppressed"
- WF-066: Next step scheduled with correct delay_minutes
- WF-067: Contact with no email skips email step (doesn't fail)
- WF-068: AI content generation used when no template
- WF-069: Template fallback when AI fails
- WF-070: Multiple enrollments processed in single cron run
- WF-071–WF-090: Edge cases (concurrent execution, missing steps, etc.)

### WF-091–WF-120: Contact Journeys
- WF-091: Auto-enrollment on contact create (buyer → buyer journey, NO workflow enrollment)
- WF-092: Auto-enrollment on contact create (seller → seller journey, NO workflow enrollment)
- WF-092a: Speed-to-Contact is INACTIVE by default — new contacts do NOT auto-enroll
- WF-092b: Realtor can manually activate Speed-to-Contact from /automations/workflows/{id}
- WF-092c: Realtor can manually enroll specific contacts from workflow detail page
- WF-093: Journey phase starts at "lead"
- WF-094: Phase advancement: lead → active (event-driven)
- WF-095: Phase advancement: active → under_contract
- WF-096: Phase advancement: under_contract → past_client
- WF-097: Phase advancement: past_client → dormant (60 days inactivity)
- WF-098: Journey pause sets `is_paused=true`
- WF-099: Journey resume sets `is_paused=false`, resets next_email_at
- WF-100: No duplicate journeys (same contact + type)
- WF-101: Journey email generation uses correct email type per phase
- WF-102: Journey frequency cap enforced
- WF-103: Journey deduplication within 7 days
- WF-104: Journey cron processes due journeys
- WF-105: Contact unsubscribe pauses all journeys
- WF-106–WF-120: Per-phase email sequence tests

### WF-121–WF-150: Triggers & Automation Rules
- WF-121: "Listing Goes Active" trigger fires on status change
- WF-122: "Listing Created" trigger fires on new listing
- WF-123: "Price Change" trigger fires on price update
- WF-124: Automation rule with AI Chooses template
- WF-125: Automation rule with specific template
- WF-126: Automation rule sends to all agents
- WF-127: Automation rule sends to area agents
- WF-128: Automation rule with review approval
- WF-129: Automation rule with auto-send
- WF-130: Multiple automation rules fire independently
- WF-131: Disabled rule does not fire
- WF-132: Rules persist after page refresh
- WF-133: Backfill button enrolls eligible contacts
- WF-134: Re-engagement workflow fires after 60 days inactivity
- WF-135: Speed-to-contact fires for new leads
- WF-136: Post-close fires on deal completion
- WF-137: Referral partner fires on tag_added
- WF-138: Open house follow-up fires on showing_completed
- WF-139–WF-150: Edge cases (trigger on already-enrolled contact, etc.)

---

## CATEGORY 7: DEAL PIPELINE (DEAL) — 80 Tests

### DEAL-001–DEAL-020: Deal CRUD
- DEAL-001: Create deal with title, type, value, contact, listing
- DEAL-002: Deal appears on pipeline board in correct stage
- DEAL-003: Drag deal between stages
- DEAL-004: Deal detail page loads with parties, checklist, mortgages
- DEAL-005: Edit deal updates fields
- DEAL-006: Delete deal with confirmation
- DEAL-007: Deal value auto-calculates commission
- DEAL-008: Buyer stages: 8 stages from new_lead to closed
- DEAL-009: Seller stages: 9 stages from new_lead to closed
- DEAL-010: View filter: All / Buyer / Seller
- DEAL-011: Pipeline value totals per stage
- DEAL-012–DEAL-020: Deal party and checklist management

### DEAL-021–DEAL-040: Deal Checklist & Mortgages
- DEAL-021: Create checklist item with due date
- DEAL-022: Toggle checklist completion
- DEAL-023: Completed items show completed_at timestamp
- DEAL-024: Checklist sorted by sort_order
- DEAL-025: Add mortgage record with lender, rate, term
- DEAL-026: Mortgage renewal date validation (after start date)
- DEAL-027: Auto-create renewal reminder task 90 days before renewal
- DEAL-028: Edit mortgage
- DEAL-029: Delete mortgage
- DEAL-030–DEAL-040: Edge cases

### DEAL-041–DEAL-080: Pipeline Board
- DEAL-041: Kanban board renders all stages
- DEAL-042: Deal cards show contact name, address, value
- DEAL-043: Cards color-coded by status
- DEAL-044: Drag-and-drop updates deal stage in DB
- DEAL-045: Stage transition logged
- DEAL-046: Closed deals view
- DEAL-047: GCI calculation across all deals
- DEAL-048–DEAL-080: Stage-specific validation and workflow tests

---

## CATEGORY 8: TASK MANAGEMENT (TASK) — 40 Tests

### TASK-001: Create Task
**Acceptance Criteria:**
- Task form: title (required), description, status, priority, category, due date, linked contact/listing
- New task appears in list sorted by priority then due date
**Priority:** P0

### TASK-002–TASK-040: Task Operations
- TASK-002: View task list sorted (overdue first, then priority, then due date)
- TASK-003: Task pipeline summary (pending/in_progress/completed counts)
- TASK-004: Select individual tasks via checkbox
- TASK-005: Select all tasks via header checkbox
- TASK-006: Bulk "Mark Complete" button
- TASK-007: Inline status change on task card
- TASK-008: Edit task opens form
- TASK-009: Delete task with confirmation
- TASK-010: Priority badges (low=gray, medium=blue, high=amber, urgent=red)
- TASK-011: Category labels
- TASK-012: Due date display with overdue highlighting
- TASK-013: Linked contact shown on task
- TASK-014: Linked listing shown on task
- TASK-015: Empty state: "No tasks yet"
- TASK-016: Loading state: spinning clock icon
- TASK-017: Auto-created tasks from workflow steps
- TASK-018: Auto-created tasks from important date reminders
- TASK-019: Auto-created tasks from mortgage renewal reminders
- TASK-020: Task count badge on dashboard tile
- TASK-021–TASK-040: Edge cases (past due date, bulk operations, concurrent edits)

---

## CATEGORY 9: CALENDAR & SHOWINGS (CAL) — 50 Tests

### CAL-001–CAL-020: Calendar
- CAL-001: Calendar page loads with events
- CAL-002: Month view shows all events
- CAL-003: Week view shows all events
- CAL-004: Day view shows all events
- CAL-005: Agenda view shows all events
- CAL-006: Google Calendar events in blue
- CAL-007: Showing events color-coded by status
- CAL-008: Click showing event opens popover
- CAL-009: Popover shows agent name, phone, time, status
- CAL-010: Navigate forward/backward in time
- CAL-011: "Today" button returns to current date
- CAL-012: Events fetch updates on date range change
- CAL-013: Mobile defaults to agenda view
- CAL-014: Legend badges visible
- CAL-015–CAL-020: Edge cases (no Google token, no events)

### CAL-021–CAL-050: Showing Workflow
- CAL-021: Create showing request
- CAL-022: SMS sent to seller on request
- CAL-023: Seller YES reply → confirmed
- CAL-024: Seller NO reply → denied
- CAL-025: Lockbox code sent on confirmation
- CAL-026: Calendar event created on confirmation
- CAL-027: STOP reply opts out of SMS
- CAL-028: Showing detail page loads
- CAL-029: Status workflow transitions (requested → confirmed/denied)
- CAL-030: Notes & feedback section
- CAL-031–CAL-050: Edge cases (WhatsApp, timezone, past dates)

---

## CATEGORY 10: EXTERNAL INTEGRATIONS (INT) — 60 Tests

### INT-001–INT-015: Twilio SMS/WhatsApp
- INT-001: SMS send with correct +1 formatting
- INT-002: WhatsApp send with whatsapp: prefix
- INT-003: Inbound SMS webhook processes YES/NO/STOP
- INT-004: STOP marks contact as opted-out
- INT-005: SMS includes "Reply STOP to opt out"
- INT-006: Phone validation (strip non-digits, add prefix)
- INT-007–INT-015: Edge cases

### INT-016–INT-030: Google Calendar
- INT-016: Calendar events fetch with date range
- INT-017: Google token refresh on expiry
- INT-018: Calendar event created for confirmed showing
- INT-019: Busy times API returns blocks
- INT-020: Empty calendar returns empty array
- INT-021–INT-030: Edge cases (no token, expired token, API failure)

### INT-031–INT-045: Resend Email
- INT-031: Email send with retry logic (3 retries, exponential backoff)
- INT-032: 429 rate limit triggers retry
- INT-033: 5xx server error triggers retry
- INT-034: Non-retryable error throws immediately
- INT-035: Email validation rejects invalid addresses
- INT-036: BCC added when EMAIL_MONITOR_BCC set
- INT-037: Metadata banner injected when BCC active
- INT-038: List-Unsubscribe header on every email
- INT-039: Batch send (10 per batch, 500ms delay)
- INT-040: Tags attached to emails for tracking
- INT-041–INT-045: Edge cases

### INT-046–INT-060: Anthropic Claude AI
- INT-046: Newsletter content generation returns structured JSON
- INT-047: MLS remarks < 500 characters
- INT-048: Quality scoring returns 7 dimensions
- INT-049: Fallback when JSON parsing fails
- INT-050: API key validation
- INT-051: Credit exhaustion handling
- INT-052–INT-060: Edge cases (timeout, malformed response)

---

## CATEGORY 11: WEBHOOK HANDLERS (HOOK) — 40 Tests

### HOOK-001–HOOK-015: Resend Webhook
- HOOK-001: Signature verification succeeds with valid key
- HOOK-002: 401 returned for invalid signature
- HOOK-003: `email.delivered` logged correctly
- HOOK-004: `email.opened` updates engagement score
- HOOK-005: `email.clicked` classifies link into 11 categories
- HOOK-006: Click score impact: book_showing=30, get_cma=30
- HOOK-007: Click history truncated at 50 items
- HOOK-008: Engagement score capped at 100
- HOOK-009: `email.bounced` auto-unsubscribes
- HOOK-010: `email.complained` auto-unsubscribes
- HOOK-011: High-intent click creates agent notification
- HOOK-012: Event deduplication within 60s window
- HOOK-013: Unknown newsletter_id silently handled
- HOOK-014: AI agent events emitted
- HOOK-015: Inferred interests updated from clicks

### HOOK-016–HOOK-030: Twilio Webhook
- HOOK-016: Inbound SMS parsed correctly
- HOOK-017: WhatsApp prefix stripped
- HOOK-018: Phone lookup by last 10 digits
- HOOK-019: YES confirms showing
- HOOK-020: NO denies showing
- HOOK-021: STOP opts out contact
- HOOK-022: Unknown phone returns empty response
- HOOK-023: No pending appointment returns empty response
- HOOK-024: Calendar event created on YES
- HOOK-025: Lockbox code sent on YES
- HOOK-026: Exit on reply triggers workflow exit
- HOOK-027: Communication logged
- HOOK-028: Signature validation in production
- HOOK-029–HOOK-030: Edge cases

### HOOK-031–HOOK-040: Lead Capture Webhook
- HOOK-031: Valid payload creates contact
- HOOK-032: Phone validation regex
- HOOK-033: Type defaults to "buyer"
- HOOK-034: 422 for Zod validation failure
- HOOK-035: 401 for invalid webhook secret
- HOOK-036: Speed-to-contact workflow auto-enrolls
- HOOK-037: Duplicate contact not prevented (known behavior)
- HOOK-038–HOOK-040: Edge cases

---

## CATEGORY 12: CRON JOBS (CRON) — 35 Tests

### CRON-001–CRON-010: Process Workflows
- CRON-001: Bearer token required
- CRON-002: Processes up to 50 enrollments
- CRON-003: Only processes where next_run_at <= now
- CRON-004: Step execution creates communications
- CRON-005: Next step scheduled with delay
- CRON-006: Completed enrollment marked
- CRON-007: Failed step retried next cycle
- CRON-008: Send governor blocks suppressed sends
- CRON-009: Batch limit prevents runaway
- CRON-010: Error in one enrollment doesn't stop others

### CRON-011–CRON-020: Daily Digest
- CRON-011: Digest email sent to realtor
- CRON-012: Shows emails sent in last 24h
- CRON-013: Shows pending drafts
- CRON-014: Shows top 5 hot leads
- CRON-015: Shows open rate
- CRON-016: HTML email rendered correctly
- CRON-017: Handles zero stats gracefully
- CRON-018–CRON-020: Edge cases

### CRON-021–CRON-035: Other Crons
- CRON-021: Consent expiry finds expiring consents
- CRON-022: Expired consents pause journeys
- CRON-023: Weekly learning updates realtor config
- CRON-024: Weekly learning updates contact intelligence
- CRON-025: Agent scoring processes 50 contacts max
- CRON-026: Agent scoring skips recently scored
- CRON-027: Agent recommendations generates next-best-actions
- CRON-028: Agent evaluation processes event batch
- CRON-029: Missing CRON_SECRET handled (some fail-open, some fail-closed)
- CRON-030–CRON-035: Edge cases

---

## CATEGORY 13: DATA INTEGRITY (DATA) — 80 Tests

### DATA-001–DATA-020: Cross-Reference Integrity
- DATA-001: All newsletter.contact_id references valid contacts
- DATA-002: All newsletter_events.newsletter_id references valid newsletters
- DATA-003: All newsletter_events.contact_id references valid contacts
- DATA-004: All contact_journeys.contact_id references valid contacts
- DATA-005: All workflow_steps.workflow_id references valid workflows
- DATA-006: All workflow_enrollments.workflow_id references valid workflows
- DATA-007: All workflow_enrollments.contact_id references valid contacts
- DATA-008: All appointments.listing_id references valid listings
- DATA-009: All communications.contact_id references valid contacts
- DATA-010: All listing_documents.listing_id references valid listings
- DATA-011: No orphaned workflow steps
- DATA-012: No duplicate contact+journey_type in contact_journeys
- DATA-013: No duplicate newsletter for same contact+type+phase within 7 days
- DATA-014: Engagement scores between 0-100
- DATA-015: All newsletter statuses valid (draft/approved/sending/sent/failed/skipped/suppressed)
- DATA-016: All journey phases valid (lead/active/under_contract/past_client/dormant)
- DATA-017: All workflow steps have valid action_type
- DATA-018: Wait steps have non-zero delay
- DATA-019: Manual task steps have task_config with title
- DATA-020: System action steps have action_config with action

### DATA-021–DATA-040: Newsletter Data
- DATA-021: Sent newsletters have sent_at timestamp
- DATA-022: Sent newsletters have resend_message_id
- DATA-023: Sent newsletters have HTML body > 50 characters
- DATA-024: Suppressed newsletters have ai_context with reason
- DATA-025: Draft newsletters have subject and email_type
- DATA-026: All email_types in valid set
- DATA-027: All send_modes in valid set (auto/review)
- DATA-028–DATA-040: Per-field validation tests

### DATA-041–DATA-060: Contact Data
- DATA-041: All contacts have name
- DATA-042: All contacts have valid type
- DATA-043: All contacts have newsletter_unsubscribed boolean
- DATA-044: Contacts with email can receive newsletters
- DATA-045: Contacts with newsletter_intelligence have valid structure
- DATA-046: Engagement scores are numbers
- DATA-047: Click history is array
- DATA-048: Inferred interests has areas, property_types arrays
- DATA-049–DATA-060: Per-field validation tests

### DATA-061–DATA-080: Workflow Data
- DATA-061: 7 workflows exist (no zombies)
- DATA-062: Blueprint step counts match DB step counts
- DATA-063: Step order sequential (1, 2, 3...)
- DATA-064: delay_minutes matches delay_value × unit conversion
- DATA-065: All workflows have is_active boolean
- DATA-066: All workflows have trigger_type
- DATA-067: All workflows have contact_type
- DATA-068: Enrollments have valid status
- DATA-069: Enrollments have next_run_at when active
- DATA-070–DATA-080: Template and config data validation

---

## CATEGORY 14: SECURITY (SEC) — 30 Tests

### SEC-001–SEC-015: Authentication
- SEC-001: Unauthenticated access to `/newsletters` returns 307
- SEC-002: Unauthenticated access to `/contacts` returns 307
- SEC-003: API routes return 401 without session
- SEC-004: Cron routes return 401 without Bearer token
- SEC-005: Admin page rejects non-admin users
- SEC-006: Session JWT properly signed
- SEC-007: CSRF token required for form submissions
- SEC-008: Rate limiting on login endpoint
- SEC-009: Password not returned in session data
- SEC-010: Google tokens not exposed in client
- SEC-011–SEC-015: Token expiry and refresh tests

### SEC-016–SEC-030: Data Security
- SEC-016: Supabase anon key permissions (KNOWN ISSUE: too broad)
- SEC-017: Service role key not exposed in client bundles
- SEC-018: Email content not logged in production
- SEC-019: Integration secrets masked in API response
- SEC-020: Webhook signature verification (Resend, Twilio)
- SEC-021: Unsubscribe endpoint doesn't leak contact data
- SEC-022: Template preview doesn't expose real data
- SEC-023: Phone numbers formatted consistently
- SEC-024: No raw SQL injection vectors
- SEC-025: No dangerouslySetInnerHTML usage
- SEC-026: CASL compliance (unsubscribe in every email)
- SEC-027: CAN-SPAM compliance (physical address in footer)
- SEC-028: STOP processing for SMS opt-out
- SEC-029: Auto-sunset for unengaged contacts
- SEC-030: Consent expiry enforcement

---

## CATEGORY 15: RESPONSIVE & UX (UX) — 40 Tests

### UX-001–UX-020: Mobile
- UX-001: Dashboard renders on 375px width
- UX-002: Sidebar hidden, bottom nav visible on mobile
- UX-003: Contact detail uses MobileDetailSheet
- UX-004: Calendar defaults to agenda view
- UX-005: Email marketing tabs scroll horizontally
- UX-006: Pipeline board horizontal scroll
- UX-007: Form fields usable on touch
- UX-008: Buttons large enough for touch (min 44px)
- UX-009: No horizontal overflow on any page
- UX-010: Loading states show spinner
- UX-011–UX-020: Per-page responsive tests

### UX-021–UX-040: Error & Empty States
- UX-021: No contacts → "No Contacts Yet" card
- UX-022: No listings → "No Listings Yet" card
- UX-023: No tasks → "No tasks yet" message
- UX-024: No showings → "No Showings Yet" card
- UX-025: No workflows → "No Workflows Yet" card
- UX-026: No notifications → "No Notifications" message
- UX-027: No search results → "No properties match" with clear filters
- UX-028: No email queue → "All caught up!"
- UX-029: No sent emails → empty sent section
- UX-030: No suppressed emails → empty held back section
- UX-031: 404 page renders for invalid routes
- UX-032: Error boundary catches component errors
- UX-033: Dashboard error boundary works
- UX-034: Global error boundary works
- UX-035: Loading states for all async operations
- UX-036–UX-040: Animation and transition tests

---

## CATEGORY 16: PERFORMANCE & RELIABILITY (PERF) — 20 Tests

### PERF-001–PERF-020
- PERF-001: Dashboard loads in < 3 seconds
- PERF-002: Newsletter page loads in < 5 seconds
- PERF-003: Contact detail loads in < 3 seconds
- PERF-004: API endpoints respond in < 2 seconds
- PERF-005: Batch email send (10 emails) completes in < 30 seconds
- PERF-006: Cron processes 50 enrollments in < 120 seconds
- PERF-007: Search returns results in < 1 second
- PERF-008: Calendar events fetch in < 2 seconds
- PERF-009: Pipeline board renders 50+ deals without lag
- PERF-010: Email HTML rendering < 500ms
- PERF-011: Concurrent users (5) don't cause errors
- PERF-012: Database connection pooling works
- PERF-013: Resend retry logic handles 429s
- PERF-014: Webhook processing < 1 second
- PERF-015: No memory leaks on page navigation
- PERF-016: Build size reasonable (< 5MB first load)
- PERF-017: Image lazy loading on listing cards
- PERF-018: Infinite scroll on contact list
- PERF-019: Debounced search input
- PERF-020: Optimistic UI updates for toggles

---

## TEST EXECUTION SUMMARY

| Category | Count | Automated | Manual |
|----------|-------|-----------|--------|
| AUTH: Authentication | 25 | 15 | 10 |
| NAV: Navigation | 50 | 40 | 10 |
| CONTACT: Contacts | 120 | 60 | 60 |
| LISTING: Listings | 100 | 40 | 60 |
| EMAIL: Email Marketing | 250 | 150 | 100 |
| WF: Workflows | 150 | 80 | 70 |
| DEAL: Pipeline | 80 | 30 | 50 |
| TASK: Tasks | 40 | 20 | 20 |
| CAL: Calendar | 50 | 20 | 30 |
| INT: Integrations | 60 | 30 | 30 |
| HOOK: Webhooks | 40 | 30 | 10 |
| CRON: Cron Jobs | 35 | 25 | 10 |
| DATA: Data Integrity | 80 | 80 | 0 |
| SEC: Security | 30 | 15 | 15 |
| UX: Responsive/UX | 40 | 10 | 30 |
| PERF: Performance | 20 | 10 | 10 |
| **TOTAL** | **1170** | **655** | **515** |

### Automated Test Scripts

| Script | Tests | What it covers |
|--------|-------|----------------|
| `scripts/test-email-marketing-ui.mjs` | 1833 | Page loads, DB integrity, cross-references, templates, workflows, settings |
| `scripts/test-workflow-emails.mjs` | 49 | Real email delivery for all 46 workflow steps across 7 workflows |
| `scripts/qa-test-email-engine.mjs` | 27 | Email pipeline end-to-end (AI generation, send, track) |

### Pre-Deployment Checklist

```bash
# 1. Build succeeds
npm run build

# 2. Type check passes
npx tsc --noEmit

# 3. Automated UI tests pass
node scripts/test-email-marketing-ui.mjs

# 4. Email delivery tests pass (sends 46 real emails)
node scripts/test-workflow-emails.mjs

# 5. Manual smoke test
# - Login with demo credentials
# - Verify each tab in /newsletters loads
# - Create a contact → verify journey enrollment
# - Approve a draft → verify email sent
# - Open an email → verify webhook fires
```

---

## CATEGORY 17: WEBSITE INTEGRATION PLATFORM (WEB) — 127 Tests

### WEB-001: SDK Script Loading
**User Story:** US-WEB-001
**Steps:** Add `<script src="/sdk/listingflow.js" data-key="lf_test">` to test HTML page
**Expected:** Script loads async, `window.ListingFlow` available, no page blocking
**Automated:** Manual

### WEB-002: API Key Authentication — Valid
**Steps:** `curl -H "X-LF-Key: valid_key" /api/websites/listings`
**Expected:** 200 with listings JSON
**Automated:** `scripts/test-website-api.mjs`

### WEB-003: API Key Authentication — Invalid
**Steps:** `curl -H "X-LF-Key: bad_key" /api/websites/listings`
**Expected:** 401 `{ "error": "Invalid API key" }`
**Automated:** `scripts/test-website-api.mjs`

### WEB-004: API Key Authentication — Missing
**Steps:** `curl /api/websites/listings` (no header)
**Expected:** 401 `{ "error": "API key required" }`
**Automated:** `scripts/test-website-api.mjs`

### WEB-005: Domain Whitelist — Allowed
**Steps:** Request from whitelisted domain
**Expected:** CORS headers set, request allowed
**Automated:** `scripts/test-website-api.mjs`

### WEB-006: Domain Whitelist — Blocked
**Steps:** Request from non-whitelisted domain
**Expected:** 403 `{ "error": "Domain not whitelisted" }`
**Automated:** `scripts/test-website-api.mjs`

### WEB-010: Listings API — All
**Steps:** `GET /api/websites/listings`
**Expected:** JSON array of active listings with id, address, list_price, beds, baths, sqft, hero_image_url
**Automated:** `scripts/test-website-api.mjs`

### WEB-011: Listings API — Filtered
**Steps:** `GET /api/websites/listings?type=condo&maxPrice=700000&limit=5`
**Expected:** Filtered results, max 5 items, all condos under $700K
**Automated:** `scripts/test-website-api.mjs`

### WEB-012: Listings API — Empty
**Steps:** `GET /api/websites/listings?maxPrice=1` (no listings match)
**Expected:** 200 with empty array `[]`
**Automated:** `scripts/test-website-api.mjs`

### WEB-020: Lead Capture — Success
**Steps:** `POST /api/websites/lead` with name, phone, email
**Expected:** 201, contact created in DB with `source: "website"`, journey enrolled
**Automated:** `scripts/test-website-api.mjs`

### WEB-021: Lead Capture — Missing Required Fields
**Steps:** `POST /api/websites/lead` with only email (no name/phone)
**Expected:** 422 validation error
**Automated:** `scripts/test-website-api.mjs`

### WEB-022: Lead Capture — Duplicate Phone
**Steps:** POST lead with phone that already exists
**Expected:** Updates existing contact, does not create duplicate
**Automated:** `scripts/test-website-api.mjs`

### WEB-023: Lead Capture — Journey Enrollment
**Steps:** POST lead → check contact_journeys table
**Expected:** Contact enrolled in journey with `current_phase: "lead"`
**Automated:** `scripts/test-website-api.mjs`

### WEB-030: Newsletter Signup — Success
**Steps:** `POST /api/websites/newsletter` with email and consent=true
**Expected:** Contact created with `newsletter_opt_in: true`, enrolled in journey
**Automated:** `scripts/test-website-api.mjs`

### WEB-031: Newsletter Signup — No Consent
**Steps:** `POST /api/websites/newsletter` with consent=false
**Expected:** 422 "CASL consent required"
**Automated:** `scripts/test-website-api.mjs`

### WEB-032: Newsletter Signup — Existing Email
**Steps:** POST with email that exists
**Expected:** Updates existing contact, sets newsletter_opt_in=true
**Automated:** `scripts/test-website-api.mjs`

### WEB-040: Booking — Success
**Steps:** `POST /api/websites/booking` with name, phone, date, time, type
**Expected:** Contact created, task created in CRM
**Automated:** `scripts/test-website-api.mjs`

### WEB-050: Analytics — Page View
**Steps:** `POST /api/websites/analytics` with event_type="page_view", page_url, session_id
**Expected:** Event stored in site_analytics_events table
**Automated:** `scripts/test-website-api.mjs`

### WEB-051: Analytics — Batch Events
**Steps:** POST array of 10 events
**Expected:** All 10 stored, 200 response
**Automated:** `scripts/test-website-api.mjs`

### WEB-060: Valuation — Success
**Steps:** `POST /api/websites/valuation` with address, beds, baths, name, phone
**Expected:** Contact created with type="seller", source="website_valuation", high-priority task created
**Automated:** `scripts/test-website-api.mjs`

### WEB-070: Chat — Property Search
**Steps:** `POST /api/websites/chat` with message "Show 3BR homes under 700K"
**Expected:** Streaming response with listing cards from CRM
**Automated:** Manual

### WEB-071: Chat — Lead Capture
**Steps:** Chat "I want to book a showing" → provide name/phone when asked
**Expected:** Contact created in CRM, showing request created
**Automated:** Manual

### WEB-072: Chat — Rate Limit
**Steps:** Send 21 messages in one session
**Expected:** 429 "Rate limit exceeded" on 21st message
**Automated:** `scripts/test-website-api.mjs`

### WEB-080: Dashboard Page Load
**Steps:** Navigate to /websites
**Expected:** Page loads with 4 tabs, glass header, 200 status
**Automated:** `scripts/test-email-marketing-ui.mjs`

### WEB-081: Integration Codes Tab
**Steps:** Click Integration Codes tab
**Expected:** 7 embed code cards visible, each with copy button
**Automated:** Manual

### WEB-082: Analytics Tab
**Steps:** Click Analytics tab (with seeded events)
**Expected:** Visitor chart, stats pills, top pages table visible
**Automated:** Manual

### WEB-083: Leads Tab
**Steps:** Click Leads tab (with website-sourced contacts)
**Expected:** Table of contacts with source="website", clickable rows
**Automated:** Manual

### WEB-084: Settings Tab
**Steps:** Click Settings tab
**Expected:** API key field, domain whitelist, chatbot config, feature toggles
**Automated:** Manual

### WEB-085: API Key Generation
**Steps:** Click "Generate API Key" in Settings
**Expected:** Key generated, displayed once, stored hashed in DB
**Automated:** Manual

### WEB-090–WEB-127: Additional Tests
**Covers:** SDK widget mounting (chat, listings, newsletter, booking), session recording, FullStory integration, contact detail website activity section, CORS edge cases, rate limiting, input sanitization, mobile responsive widgets, error states, offline handling.
**Total:** 38 additional test cases
**Automated:** Mix of `scripts/test-website-api.mjs` and manual
