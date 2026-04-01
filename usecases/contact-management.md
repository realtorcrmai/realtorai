---
title: " Contact Management"
slug: "contact-management"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
related_routes: ["/contacts"]
changelog: []
---

# Contact Management

## Problem Statement

BC realtors manage dozens of buyers, sellers, and professional partners simultaneously, each at different lifecycle stages and with different communication preferences. Without a structured system, leads fall through the cracks, follow-up is inconsistent, and family/referral networks go untapped. Realtors360's contact management solves this by providing a unified profile per person — covering their pipeline stage, communication history, preferences, household groupings, and relationship graph — so a realtor can see the full picture at a glance and act immediately.

## User Roles

- **Single realtor (primary user):** Creates contacts, advances stages, sends messages, manages households and relationships, reviews communication history.
- **Team lead / admin:** Same permissions. All contacts are visible to any authenticated user (single-tenant RLS policy: `auth.role() = 'authenticated'`).

## Existing System Context

### Database Tables
| Table | Purpose |
|-------|---------|
| `contacts` | Core record: name, phone, email, type, pref_channel, notes, address, source, lead_status, stage_bar, tags, buyer_preferences, seller_preferences, demographics, household_id, referred_by_id, lifecycle_stage, partner_type, company_name, job_title, newsletter_intelligence |
| `households` | Groups of related contacts (families, co-buyers) — id, name, address, notes |
| `contact_relationships` | Bi-directional graph edge between two contacts — contact_a_id, contact_b_id, relationship_type (spouse/parent/child/sibling/friend/colleague/neighbour/other), relationship_label, notes |
| `contact_dates` | Important dates per contact — label, date, recurring, notes, event_type (birthday/anniversary/move_in/closing/renewal/custom), auto_workflow |
| `contact_documents` | Uploaded files — doc_type (Pre-Approval/ID Copy/Agreement/Contract/Other), file_name, file_url |
| `communications` | Unified message log — contact_id, direction (inbound/outbound), channel (sms/whatsapp/email/note), body, related_id |
| `tasks` | Per-contact tasks — title, due_date, priority, category, status, completed_at |
| `contact_journeys` | AI email journey enrollment — journey_type (buyer/seller), current_phase, next_email_at, send_mode, trust_level |
| `newsletters` | Draft and sent email history — contact_id, subject, email_type, status, html_body, ai_context |
| `activities` | Audit log — activity_type, description, metadata |

### Server Actions (`src/actions/`)
| File | Key Functions |
|------|--------------|
| `contacts.ts` | `createContact`, `updateContact`, `deleteContact`, `sendContactMessage`, `sendContactEmail`, `syncContactEmailHistory`, `addCommunicationNote`, `createContactTask`, `updateContactTask`, `deleteContactTask`, `addContactDate`, `updateContactDate`, `deleteContactDate`, `deleteContactDocument` |
| `households.ts` | `getHouseholds`, `createHousehold`, `updateHousehold`, `addContactToHousehold`, `removeContactFromHousehold`, `getHouseholdMembers` |
| `relationships.ts` | `getContactRelationships`, `createRelationship`, `updateRelationship`, `deleteRelationship` |

### API Routes (`src/app/api/contacts/`)
| Route | Purpose |
|-------|---------|
| `GET /api/contacts` | List all contacts (search + filter) |
| `GET /api/contacts/[id]/activities` | Activity log for a contact |
| `GET /api/contacts/[id]/dates` | Contact important dates |
| `GET /api/contacts/[id]/family` | Family members |
| `GET /api/contacts/upcoming-dates` | Upcoming birthdays/anniversaries across all contacts |
| `POST /api/contacts/context` | Save context log entry |
| `GET /api/contacts/instructions` | Fetch AI instructions for a contact |
| `GET /api/contacts/journey` | Journey status for a contact |
| `POST /api/contacts/log-interaction` | Log a direct interaction |
| `GET/POST /api/contacts/watchlist` | Watchlist entries |

### Key Components (`src/components/contacts/`)
| Component | Purpose |
|-----------|---------|
| `ContactForm` | Create/edit contact (all fields, buyer/seller/partner/other types) |
| `StageBar` | Visual pipeline stages — buyer: new→qualified→active_search→under_contract→closed; seller: new→qualified→active_listing→under_contract→closed; cold state separate |
| `HouseholdBanner` | Shows household membership, lets user create/join/leave households |
| `RelationshipManager` | CRUD for contact-to-contact relationships |
| `RelationshipGraph` | Visual graph of relationship network |
| `ContactDetailTabs` | Tab container: Timeline, Intelligence, Activity, Deals, Preferences, Demographics, Referrals, Documents |
| `QuickActionBar` | One-click: Send SMS/WhatsApp, Send Email, Log Note, Add Task, Add Date |
| `TagEditor` | Add/remove predefined and custom tags (vip, hot lead, first-time buyer, pre-approved, investor, etc.) |
| `IntelligencePanel` | Email engagement score, opens, clicks, timing patterns, inferred interests |
| `JourneyProgressBar` | Current AI email journey phase (lead→active→under_contract→past_client→dormant) |
| `EmailHistoryTimeline` | Newsletters sent to this contact |
| `CommunicationTimeline` | SMS/WhatsApp/email/note history |
| `ActivityTimeline` | Audit trail of all CRM actions |
| `ContactTasksPanel` | Task list with priority, category, due date |
| `ImportantDatesPanel` | Contact dates with recurring flag and event type |
| `ContactDocumentsPanel` | Uploaded documents (Pre-Approval, ID Copy, etc.) |
| `BuyerPreferencesPanel` | Buyer search criteria: areas, property types, beds/baths, budget, financing status |
| `SellerPreferencesPanel` | Seller motivation, timeline, listing preferences |
| `DemographicsPanel` | Age, income range, occupation, languages spoken |
| `PropertiesOfInterestPanel` | Listings the buyer has shown interest in |
| `PropertyHistoryPanel` | Past transactions (buyer purchases + seller sales) |
| `ReferralsPanel` | Who referred this contact, and who they have referred |
| `NetworkStatsCard` | Referral network size and value metrics |
| `WorkflowStepperCard` | Active automation workflow enrollments |
| `ContactSidebar` | Left-side contact list with stage filter tabs |
| `DeleteContactButton` | Confirms and calls deleteContact server action |
| `EmailComposer` | Inline Gmail-backed email compose panel |
| `ContextLog` | Pinned AI context entries visible to voice agent |

### Pages
| Route | Purpose |
|-------|---------|
| `/contacts` | Redirects to latest contact (or first contact matching stage filter) |
| `/contacts?stage=new\|qualified\|active\|under_contract\|closed\|cold` | Filtered list view |
| `/contacts/[id]` | Full contact detail — all panels, tabs, actions |

### Consistency Layer
`src/lib/contact-consistency.ts` — `enforceConsistency()` is called on every `updateContact` mutation to keep `stage_bar`, `lead_status`, `type`, and `tags` coherent (e.g. promoting to `closed` stage clears hot-lead tags, type change resets stage pipeline).

### RAG Ingestion
Every `createContact` and `updateContact` fires `triggerIngest("contacts", id)` (`src/lib/rag/realtime-ingest.ts`) so the voice agent's knowledge base stays current.

---

## Features

| Feature | Description |
|---------|-------------|
| **Contact creation with duplicate detection** | Phone (last 10 digits) and email deduplication before insert; `force=true` bypasses check |
| **Contact types** | buyer, seller, partner (mortgage_broker/lawyer/inspector/agent/financial_advisor/other), other |
| **Lead statuses** | new, contacted, qualified, nurturing, active, under_contract, closed, lost |
| **Pipeline stage bar** | Visual per-type pipeline with confirmation dialogs and data completeness indicators per stage |
| **Cold/archive state** | Mark any contact Cold (snowflake) — removes from active pipeline without deleting |
| **Tags** | Predefined groups (Priority, Buyer, Seller, Relationship, Status, Source) plus custom tags; workflow triggers fire on tag_added event |
| **Lead source tracking** | Referral, Website, Open House, Social Media, Cold Call, Door Knock, Zillow, Realtor.ca, Google Ads, Sphere of Influence, Past Client, Other |
| **Preferred channel** | WhatsApp or SMS — used for all Twilio outbound messages |
| **Quick messaging** | Send SMS/WhatsApp via Twilio from contact detail, logged to communications table |
| **Gmail email** | Send plain-text email and sync inbox history via Gmail API |
| **Communication timeline** | Unified log of all SMS/WhatsApp/email/note history |
| **Activity log** | Audit trail of all CRM mutations for the contact |
| **Tasks** | Per-contact tasks with title, due date, priority (high/medium/low), category, status |
| **Important dates** | Birthday, anniversary, move-in, closing, renewal, custom — with recurring flag and auto_workflow trigger |
| **Documents** | Upload and track Pre-Approval, ID Copy, Agreement, Contract, Other documents |
| **Buyer preferences** | Areas of interest, property types, min/max beds/baths, price range, financing status, move-in timeline |
| **Seller preferences** | Motivation, desired timeline, listing expectations |
| **Demographics** | Age, income range, occupation, languages |
| **Households** | Group contacts (e.g. spouses, co-buyers) under a named household with shared address |
| **Relationships** | Bi-directional graph: spouse/parent/child/sibling/friend/colleague/neighbour/other |
| **Referral tracking** | referred_by_id links chain; ReferralsPanel shows full referral tree and network value |
| **Journey enrollment** | Auto-enrolled in buyer or seller journey on creation (phase: lead); journey tracks lifecycle phase |
| **AI intelligence panel** | Email engagement score, open/click counts, inferred interests, best send timing |
| **Email history** | All newsletters and journey emails sent to this contact |
| **Workflow enrollments** | Manual or trigger-based enrollment in email automation workflows |
| **Context log** | Pinned notes visible to the voice agent for session context |
| **Delete contact** | Blocks deletion if contact has active (non-sold/cancelled) listings as seller |

---

## End-to-End Scenarios

### Scenario 1: Create a new buyer contact

**Preconditions:** User is authenticated. Contacts page is open.

**Steps:**
1. User navigates to `/contacts`.
2. Clicks the **+ New Contact** button (rendered in `ContactSidebar` or header).
3. `ContactForm` opens — user fills in: name (required), phone (required), email (optional), type = `buyer`, pref_channel = `whatsapp`, source = `Open House`, notes (optional).
4. On submit, `createContact` server action runs:
   - Zod validates via `contactSchema` (`src/lib/schemas`).
   - Strips phone to last 10 digits and checks `contacts` table for matching phone or email.
   - Inserts new row with `lead_status = "new"`, `stage_bar = null` (renders as `new` in StageBar).
   - Fires `enrollInJourney` → inserts into `contact_journeys` with `journey_type = "buyer"`, `current_phase = "lead"`, `next_email_at = now + 3 days`.
   - Fires `fireTrigger("new_lead", id, { contactType: "buyer" })` → enrolls in any matching "Speed to Contact" workflow.
   - Calls `triggerIngest("contacts", id)` for real-time RAG update.
5. `revalidatePath("/contacts")` fires; user is redirected to `/contacts/[new-id]`.
6. Contact detail page renders with `StageBar` at `new`, empty timeline, empty tasks.

**Expected outcome:** New buyer contact record exists in `contacts` table. Journey row exists in `contact_journeys`. Contact appears in `/contacts?stage=new` filtered view.

**Edge cases:**
- **Duplicate phone:** Returns `{ error: "Duplicate contact detected", duplicates: [...] }` with matching records. UI must call `createContact(data, true)` with `force = true` to override.
- **Missing email:** Allowed — email is optional. Journey welcome email is skipped if no email.
- **Invalid type:** Zod rejects anything outside `["buyer", "seller", "partner", "other"]`.
- **Partner type:** If `type = "partner"`, `partner_type` sub-field is required (mortgage_broker, lawyer, inspector, agent, financial_advisor, other).

---

### Scenario 2: Advance contact through lifecycle stages

**Preconditions:** Contact exists with `type = "buyer"` and `stage_bar = "new"`.

**Steps:**
1. User opens `/contacts/[id]`.
2. `StageBar` renders pipeline: `new → qualified → active_search → under_contract → closed` (cold is a separate state).
3. User clicks the `qualified` step (future stage) → `confirmStage` dialog appears: "Move to Qualified?".
4. User confirms → `updateContact(id, { stage_bar: "qualified" })` is called.
5. `enforceConsistency` runs: verifies type/stage combination is valid, updates `lead_status` to `"qualified"` if it was `"new"`, audits the change.
6. `fireTrigger({ type: "lead_status_change", contactId: id, data: { oldStatus, newStatus } })` fires — triggers any enrolled workflows listening to status change.
7. `revalidatePath("/contacts/[id]")` refreshes the page.
8. `StageBar` now shows `qualified` as current (amber dot), `new` as completed (green check).
9. Repeat to advance through `active_search` → `under_contract` → `closed`.

**Seller path:** Same flow with `active_listing` instead of `active_search`.

**Cold state:** Clicking the snowflake icon sets `stage_bar = "cold"` — removes contact from all pipeline stage filters, renders with gray styling.

**Expected outcome:** `contacts.stage_bar` and `contacts.lead_status` are updated atomically. Workflow triggers fire. Stage history is visible in `ActivityTimeline`.

---

### Scenario 3: Link contacts into a household

**Preconditions:** Two buyer contacts exist — e.g. "Alice Chen" and "Bob Chen" — who are co-buying.

**Steps:**
1. Open `/contacts/[alice-id]`.
2. `HouseholdBanner` renders at top of detail page — shows "No household" state.
3. User clicks **Create Household** → inputs name: `"The Chen Family"`, optional address.
4. `createHousehold({ name: "The Chen Family", address: "123 Oak St, Vancouver" })` inserts into `households` table.
5. `addContactToHousehold(alice-id, household-id)` sets `contacts.household_id = household-id` on Alice's record.
6. User opens `/contacts/[bob-id]`.
7. `HouseholdBanner` shows **Join Household** dropdown — user selects `"The Chen Family"`.
8. `addContactToHousehold(bob-id, household-id)` sets Bob's `household_id`.
9. Both contact detail pages now show the `HouseholdBanner` with member avatars (Alice, Bob) and shared address.

**Expected outcome:** `households` row with id + name + address. Both contacts have matching `household_id`. `getHouseholdMembers(household-id)` returns both.

**Remove from household:** User clicks **Leave Household** → `removeContactFromHousehold(contact-id)` sets `household_id = null`.

---

### Scenario 4: Create a relationship between contacts

**Preconditions:** Two contacts exist — "David Patel" (seller) and "Priya Patel" (seller).

**Steps:**
1. Open `/contacts/[david-id]`.
2. Scroll to the **Relationships** section (rendered by `RelationshipManager`).
3. Click **Add Relationship** → select contact: `Priya Patel`, relationship type: `spouse`, optional notes.
4. `createRelationship({ contact_a_id: david-id, contact_b_id: priya-id, relationship_type: "spouse" })` is called.
5. Server validates both contact IDs exist (`foundContacts.length < 2` guard).
6. Inserts into `contact_relationships` with `CONSTRAINT no_self_relationship` and `CONSTRAINT unique_relationship` enforcement.
7. `revalidatePath` fires on both contact pages.
8. `RelationshipGraph` on David's page now renders a node for Priya with spouse edge. Same on Priya's page.

**Expected outcome:** One `contact_relationships` row. Both contact pages show the relationship. `getContactRelationships(david-id)` returns the row joined with both contact profiles.

**Supported relationship types:** spouse, parent, child, sibling, friend, colleague, neighbour, referral, other.

---

### Scenario 5: Delete a contact (cascade effects)

**Preconditions:** Contact "James Liu" (buyer) exists with tasks, communications, and contact_dates. He has no active listings.

**Steps:**
1. Open `/contacts/[james-id]`.
2. User clicks the **Delete** button (`DeleteContactButton` component).
3. Confirmation dialog appears: "This cannot be undone."
4. User confirms → `deleteContact(james-id)` server action runs.
5. Server checks `listings` table: `WHERE seller_id = james-id AND status NOT IN ('sold','cancelled')`. If any active listing found → returns `{ error: "Cannot delete contact with active listings" }` and aborts.
6. If no active listings: `supabase.from("contacts").delete().eq("id", james-id)` executes.
7. Cascade deletes (via DB foreign keys): `contact_relationships` (ON DELETE CASCADE on both contact_a_id and contact_b_id), `contact_dates`, `contact_documents`, tasks (contact_id FK), communications (contact_id FK).
8. `contacts.household_id` FK is ON DELETE SET NULL — household itself is not deleted, just the membership pointer.
9. `contact_journeys` rows for James are cascade-deleted.
10. `revalidatePath("/contacts")` fires; user is redirected to contacts list.

**Expected outcome:** Contact row gone. All related data gone. Household record intact. Any listings where James was buyer_agent (stored as flat text on `appointments`) are unaffected.

**Edge case — active listing:** `deleteContact` returns `{ error: "Cannot delete contact with active listings" }`. User must close or cancel the listing first.

---

### Scenario 6: Search and filter contacts

**Preconditions:** 30+ contacts exist across all stages and types.

**Steps:**
1. User navigates to `/contacts`.
2. `ContactSidebar` renders the contact list with stage filter tabs: All, New, Qualified, Active, Under Contract, Closed, Cold.
3. User clicks the **Active** tab → URL becomes `/contacts?stage=active`.
4. Server-side: `STAGE_FILTER_MAP["active"] = ["active_search", "active_listing"]` — queries `contacts WHERE stage_bar IN ('active_search','active_listing') ORDER BY created_at DESC LIMIT 1`.
5. Redirects to `/contacts/[first-match-id]?stage=active`.
6. Sidebar shows all contacts in the active stage group; detail panel shows the first one.
7. User types in the search input → filters sidebar list client-side by name/phone/email match.
8. User can also filter by type (buyer/seller/partner) via type filter pills.

**API-level search:** `GET /api/contacts?search=chen&type=buyer&stage=qualified` returns filtered contact list for programmatic or voice agent access.

**Expected outcome:** Contact list narrows to matching contacts. Clicking any contact in the sidebar navigates to `/contacts/[id]?stage=active`.

---

### Scenario 7: View contact detail with all tabs

**Preconditions:** Contact "Sarah Kim" (buyer) exists with communications, tasks, journey enrollment, and email history.

**Steps:**
1. User opens `/contacts/[sarah-id]`.
2. Page server component fires 22 parallel Supabase queries (`Promise.all`) for: contact, communications, listings, contactDates, allContacts, buyerListings, tasks, contactDocuments, referralsAsReferrer, referralsAsReferred, workflowEnrollments, availableWorkflows, activityLog, allListings, referredByContact, relationshipsData, allHouseholds, householdData, householdMembersData, allWorkflowSteps, contactJourney, contactNewsletters, contactContextEntries.
3. Page renders with:
   - **Header:** Name, type badge (blue "Buyer"), lead status badge, preferred channel icon, gradient avatar.
   - **Stage bar** (`StageBar`): Visual pipeline at current stage with data completeness indicators.
   - **Journey progress bar** (`JourneyProgressBar`): AI email journey phase (lead / active / under_contract / past_client / dormant).
   - **Quick action bar** (`QuickActionBar`): Send Message, Send Email, Log Note, Add Task, Add Date buttons.
   - **Tag editor** (`TagEditor`): Current tags with add/remove.
   - **Household banner** (`HouseholdBanner`): Membership or join prompt.
   - **Relationship manager** (`RelationshipManager`): Linked contacts with type labels.
4. Tabs in `ContactDetailTabs`:
   - **Timeline:** `CommunicationTimeline` — SMS/WhatsApp/email/note history in chronological order.
   - **Intelligence:** `IntelligencePanel` — engagement_score, email_opens, email_clicks, inferred_interests (areas/property_types/price_range/lifestyle), timing_patterns (best_day, best_hour), trend_data.
   - **Activity:** `ActivityTimeline` — audit log of every CRM action.
   - **Deals / Properties:** `PropertyHistoryPanel` + `PropertiesOfInterestPanel` — past transactions and watched listings.
   - **Preferences:** `BuyerPreferencesPanel` (or `SellerPreferencesPanel`) — full search/listing criteria.
   - **Demographics:** `DemographicsPanel` — age, income, occupation, languages.
   - **Referrals:** `ReferralsPanel` + `NetworkStatsCard` — referral chain and network value.
   - **Documents:** `ContactDocumentsPanel` — uploaded files list with delete action.
   - **Important Dates:** `ImportantDatesPanel` — dates with event type and recurring toggle.
   - **Workflows:** `WorkflowStepperCard` — active enrollments and step status.
   - **Email History:** `EmailHistoryTimeline` — all newsletters/journey emails sent.
   - **Context Log:** `ContextLog` — pinned notes for voice agent context.

**Expected outcome:** Full profile visible. All data loaded in a single server render (no client-side waterfalls). Tab switching is client-side state only.

---

## Demo Script

**Goal:** Show a stakeholder the full contact lifecycle in 5 minutes.

1. **Open Contacts** — Navigate to `/contacts`. Show the contact list sidebar with stage tabs. Click "Active" to filter.
2. **Create a new buyer** — Click **+ New Contact**. Fill in: Name: `Alex Turner`, Phone: `604-555-0199`, Type: `Buyer`, Channel: `WhatsApp`, Source: `Open House`. Submit. Point out: "System checks for duplicates by phone and email. On save, Alex is auto-enrolled in the buyer journey — first email queued in 3 days."
3. **Set buyer preferences** — In the **Preferences** tab, fill in Areas: `Kitsilano, Point Grey`, Budget: `$900K–$1.2M`, Beds: 3+, Type: `Detached`. This feeds into listing alert matching.
4. **Add a tag** — Click **+ Tag** → select `pre-approved`. Show: "Adding this tag can trigger a workflow — e.g., send pre-approval congratulations email."
5. **Advance the stage** — Click `Qualified` on the Stage Bar. Confirm dialog. Show the stage advancing with green check on `New`. "Each stage has completeness indicators — click a past stage to see what data is filled."
6. **Send a quick message** — Click **Send Message** in the Quick Action Bar. Type: `Hi Alex, just checking in!`. Submit. Switch to **Timeline** tab — show the WhatsApp message logged instantly.
7. **Link a household** — Click **Create Household** in the banner: `"The Turner Family"`. Show household banner with avatar. Open a second contact (Alex's spouse), join the same household. Show both contacts linked.
8. **Add a relationship** — In the Relationships section, link Alex to spouse. Show the `RelationshipGraph` update.
9. **Intelligence tab** — Open **Intelligence** tab. Show engagement score, email open/click history, inferred interests, best send day/time.
10. **Delete demo** — Try to delete a contact with an active listing — show the error: "Cannot delete contact with active listings." Then delete a contact with no listings — confirm cascade cleanup.

---

## Data Model

```
contacts
  id                  UUID PK
  name                TEXT NOT NULL
  phone               TEXT NOT NULL
  email               TEXT
  type                TEXT  -- buyer | seller | partner | other
  pref_channel        TEXT  -- whatsapp | sms
  notes               TEXT
  address             TEXT
  source              TEXT  -- Referral | Website | Open House | ...
  lead_status         TEXT  -- new | contacted | qualified | nurturing | active | under_contract | closed | lost
  stage_bar           TEXT  -- new | qualified | active_search | active_listing | under_contract | closed | cold
  tags                JSONB -- array of tag strings
  lifecycle_stage     TEXT
  buyer_preferences   JSONB -- { areas, property_types, min_beds, max_beds, min_price, max_price, financing_status, ... }
  seller_preferences  JSONB
  demographics        JSONB -- { age, income_range, occupation, languages }
  family_members      JSONB
  household_id        UUID FK → households(id) ON DELETE SET NULL
  referred_by_id      UUID FK → contacts(id)
  partner_type        TEXT  -- mortgage_broker | lawyer | inspector | agent | financial_advisor | other
  company_name        TEXT
  job_title           TEXT
  typical_client_profile TEXT
  referral_agreement_terms TEXT
  newsletter_intelligence JSONB  -- engagement_score, email_opens, clicks, inferred_interests, timing_patterns
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ

households
  id          UUID PK
  name        TEXT NOT NULL
  address     TEXT
  notes       TEXT
  created_at  TIMESTAMPTZ
  updated_at  TIMESTAMPTZ

contact_relationships
  id                  UUID PK
  contact_a_id        UUID FK → contacts(id) ON DELETE CASCADE
  contact_b_id        UUID FK → contacts(id) ON DELETE CASCADE
  relationship_type   TEXT CHECK (spouse|parent|child|sibling|friend|colleague|neighbour|referral|other)
  relationship_label  TEXT
  notes               TEXT
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ
  UNIQUE (contact_a_id, contact_b_id)
  CHECK (contact_a_id != contact_b_id)

contact_dates
  id            UUID PK
  contact_id    UUID FK → contacts(id)
  label         TEXT NOT NULL
  date          DATE NOT NULL
  recurring     BOOLEAN DEFAULT false
  notes         TEXT
  event_type    TEXT DEFAULT 'custom'  -- birthday | anniversary | move_in | closing | renewal | custom
  auto_workflow BOOLEAN DEFAULT false
  created_at    TIMESTAMPTZ

contact_documents
  id          UUID PK
  contact_id  UUID FK → contacts(id)
  doc_type    TEXT  -- Pre-Approval | ID Copy | Agreement | Contract | Other
  file_name   TEXT
  file_url    TEXT
  created_at  TIMESTAMPTZ

communications
  id          UUID PK
  contact_id  UUID FK → contacts(id)
  direction   TEXT  -- inbound | outbound
  channel     TEXT  -- sms | whatsapp | email | note
  body        TEXT
  related_id  UUID  -- e.g. showing ID for showing-related messages
  created_at  TIMESTAMPTZ

tasks
  id           UUID PK
  contact_id   UUID FK → contacts(id)
  title        TEXT NOT NULL
  due_date     DATE
  priority     TEXT  -- high | medium | low
  category     TEXT  -- general | follow_up | compliance | ...
  status       TEXT  -- pending | done
  notes        TEXT
  completed_at TIMESTAMPTZ
  created_at   TIMESTAMPTZ

contact_journeys
  id                    UUID PK
  contact_id            UUID FK → contacts(id) ON DELETE CASCADE
  journey_type          TEXT  -- buyer | seller
  current_phase         TEXT  -- lead | active | under_contract | past_client | dormant
  phase_entered_at      TIMESTAMPTZ
  next_email_at         TIMESTAMPTZ
  emails_sent_in_phase  INT DEFAULT 0
  send_mode             TEXT  -- review | auto
  is_paused             BOOLEAN DEFAULT false
  agent_mode            TEXT
  trust_level           INT DEFAULT 0
```

---

## Voice Agent Integration

The voice agent (`voice_agent/server/tools/realtor_tools.py`) exposes the following tools that map directly to Contact Management features:

| Tool Name | What It Does | Maps To |
|-----------|-------------|---------|
| `find_contact` | Search any contact by name or ID, filter by type | `GET /api/contacts?search=...&type=...` |
| `find_buyer` | Shorthand lookup for buyers by name or ID | Same as find_contact with type=buyer |
| `create_buyer_profile` | Create a new buyer with search criteria extracted from natural language | `createContact` server action |
| `get_contact_details` | Full profile — listings, deals, tasks, communications, journey status | Contact detail page data (`/api/contacts/[id]`) |
| `update_contact` | Update name, phone, email, type, pref_channel, stage_bar, lead_status, source, notes | `updateContact` server action |
| `delete_contact` | Permanently delete a contact (guards against active listings) | `deleteContact` server action |
| `get_communications` | Communication history filtered by channel (sms/whatsapp/email/note) | `communications` table query |
| `get_households` | List all households | `getHouseholds` action |
| `get_household_members` | Get a household with all member contacts | `getHouseholdMembers` action |
| `create_household` | Create a new household group | `createHousehold` action |
| `add_to_household` | Add a contact to a household | `addContactToHousehold` action |
| `remove_from_household` | Remove a contact from their household | `removeContactFromHousehold` action |
| `get_relationships` | Get all relationship graph edges for a contact | `getContactRelationships` action |
| `create_relationship` | Link two contacts with a typed relationship | `createRelationship` action |
| `navigate_to` | Open contacts page, contact detail, or specific tab (intelligence, activity, deals) | Client navigation |
| `enroll_in_workflow` | Enroll a contact in an automation workflow | Workflow engine |
| `get_workflows` | List available workflows for enrollment | Workflow table query |

### Voice Agent Usage Examples

- "Find Sarah Kim's contact" → `find_contact(name="Sarah Kim")`
- "Create a buyer profile for Alex Turner, looking in Kitsilano, budget 900K to 1.2M" → `create_buyer_profile(name="Alex Turner", criteria={...})`
- "What's the last message I sent to David Patel?" → `get_contact_details(contact_id=...)` or `get_communications(contact_id=..., limit=1)`
- "Move Alex to the qualified stage" → `update_contact(contact_id=..., stage_bar="qualified")`
- "Link Alex Turner and Sarah Kim as spouses" → `create_relationship(contact_a_id=..., contact_b_id=..., relationship_type="spouse")`
- "Who's in the Chen household?" → `get_household_members(household_id=...)`
- "Delete contact James Liu" → `delete_contact(contact_id=...)` — will fail with error if active listing exists
- "Open Alex's intelligence tab" → `navigate_to(page="contacts", id="...", tab="intelligence")`
