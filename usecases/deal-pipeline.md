# Usecase: Deal Pipeline

## Problem Statement

Real estate transactions are high-stakes and time-sensitive. A realtor working multiple buyers and sellers simultaneously needs a single place to see every deal's stage, track all parties involved (buyer agent, seller agent, lawyers), manage competing offers, monitor subject conditions with hard deadlines, and calculate commission at close.

Without a structured pipeline, deals fall through cracks: a subject removal deadline is missed, a counter-offer isn't relayed in time, or the deposit amount is misremembered. ListingFlow's Deal Pipeline provides a stage-managed Kanban view, full offer lifecycle management (create, counter, accept, reject, withdraw), subject condition tracking with due dates, per-deal party records, checklist items for closing tasks, and commission calculation — all connected to the contact and listing records.

---

## User Roles

| Role | Description |
|------|-------------|
| Listing Agent (Realtor) | Creates and manages deals, records offers and counter-offers, tracks subject conditions, completes checklists, closes deals |
| System | Calculates `commission_amount` from `value * commission_pct / 100`, maintains `offer_history` audit trail, fires workflow triggers on status changes |

---

## Existing System Context

### Key Tables
| Table | Purpose |
|-------|---------|
| `deals` | Core deal record: stage, status, value, commission, dates |
| `deal_parties` | Named parties on a deal (buyer agent, seller agent, lawyer, notary) |
| `deal_checklist` | Per-deal task checklist with due dates and completion tracking |
| `offers` | Individual offer records with financials, status lifecycle, counter-offer chain |
| `offer_conditions` | Subject conditions on an offer (financing, inspection, strata docs, etc.) |
| `offer_history` | Full audit trail of every action taken on an offer |

### Linked Tables
| Table | Relationship |
|-------|-------------|
| `listings` | `deals.listing_id` FK — associates deal with a property |
| `contacts` | `deals.contact_id` FK — links to buyer or seller contact |

### Key Files
| File | Purpose |
|------|---------|
| `src/app/(dashboard)/pipeline/page.tsx` | Pipeline Kanban board (all deals by stage) |
| `src/app/(dashboard)/pipeline/[id]/page.tsx` | Deal detail: parties, checklist, offers, offer conditions, history |
| `src/app/api/voice-agent/deals/route.ts` | Voice agent GET/POST/PATCH for deals |
| `src/app/api/voice-agent/offers/route.ts` | Voice agent GET/POST/PATCH for offers |

### Routes
| Route | Purpose |
|-------|---------|
| `/pipeline` | Kanban-style board, deals grouped by stage |
| `/pipeline/[id]` | Deal detail: full profile, parties, checklist, offers, conditions |

---

## Features

### 1. Deal Stages
Deals progress through stages stored in `deals.stage` (TEXT, no enum constraint — flexible):

| Stage | Description |
|-------|-------------|
| `new_lead` | Initial contact, not yet qualified |
| `qualified` | Lead has confirmed intent and criteria |
| `showing` | Active showings scheduled or completed |
| `offer` | Offer submitted by buyer |
| `conditional` | Offer accepted with subject conditions outstanding |
| `closing` | Subjects removed, deal is firm, closing tasks in progress |
| `won` | Transaction completed (`deals.status = "won"`) |
| `lost` | Deal fell through (`deals.status = "lost"`, `lost_reason` populated) |

### 2. Deal Creation
- `deals` record created with: `title`, `type` (`buyer`/`seller`), `contact_id`, `listing_id` (optional at creation), `stage` (default: `new_lead`), `value`, `commission_pct`
- `commission_amount` auto-calculated: `value * commission_pct / 100`
- Status defaults to `"active"`

### 3. Deal Parties
- `deal_parties` table stores all named third parties on a deal
- `role` field is free text: examples include `"buyer_agent"`, `"seller_agent"`, `"buyers_lawyer"`, `"notary"`, `"seller_lawyer"`, `"mortgage_broker"`
- Fields: `name`, `phone`, `email`, `company`
- Multiple parties per deal; deleted via CASCADE on deal delete

### 4. Deal Checklist
- `deal_checklist` items are per-deal tasks with `due_date`, `completed` boolean, `completed_at` timestamp, and `sort_order`
- Example items: "Receive signed counter-offer", "Send deposit instructions", "Order title search", "Confirm strata docs received", "Book home inspection"
- Realtor checks off items as closing progresses

### 5. Offer Management

#### Offer Lifecycle
```
draft → submitted → [countered → submitted (new offer)] → accepted | rejected | withdrawn | expired | cancelled
```

#### `offers` table fields
| Field | Type | Notes |
|-------|------|-------|
| `listing_id` | UUID | FK → `listings.id` |
| `buyer_contact_id` | UUID | FK → `contacts.id` |
| `seller_contact_id` | UUID | FK → `contacts.id` (optional) |
| `offer_amount` | NUMERIC(12,2) | Offer price |
| `earnest_money` | NUMERIC(12,2) | Initial deposit |
| `down_payment` | NUMERIC(12,2) | Buyer's down payment |
| `status` | TEXT | `draft`/`submitted`/`countered`/`accepted`/`rejected`/`withdrawn`/`expired`/`cancelled` |
| `is_counter_offer` | BOOLEAN | True if this offer is a counter |
| `parent_offer_id` | UUID | FK → `offers.id` — links counter back to original |
| `submitted_at` | TIMESTAMPTZ | When offer was formally submitted |
| `expiry_date` | TIMESTAMPTZ | Offer irrevocability deadline |
| `closing_date` | DATE | Proposed completion date |
| `possession_date` | DATE | Proposed possession date |
| `financing_type` | TEXT | `conventional`/`cash`/`fha`/`va`/`seller_financing`/`other` |
| `notes` | TEXT | Internal notes |
| `metadata` | JSONB | Flexible additional data |

### 6. Offer Conditions (Subject Clauses)
`offer_conditions` records individual subject clauses attached to an offer:

| Field | Type | Notes |
|-------|------|-------|
| `offer_id` | UUID | FK → `offers.id`, CASCADE delete |
| `condition_type` | TEXT | `financing`/`inspection`/`appraisal`/`title_search`/`sale_of_buyers_home`/`insurance`/`strata_documents`/`property_disclosure`/`fintrac`/`other` |
| `description` | TEXT | Human-readable condition text |
| `status` | TEXT | `pending`/`satisfied`/`waived`/`failed` |
| `due_date` | DATE | Subject removal deadline |
| `satisfied_at` | TIMESTAMPTZ | When condition was cleared |
| `notes` | TEXT | Condition notes |

### 7. Offer History Audit Trail
Every action on an offer creates an `offer_history` row:

| Action | Triggered by |
|--------|-------------|
| `created` | Offer inserted |
| `submitted` | Status changes to `submitted` |
| `countered` | Counter-offer created |
| `accepted` | Status → `accepted` |
| `rejected` | Status → `rejected` |
| `withdrawn` | Buyer withdraws |
| `expired` | Expiry date passes without response |
| `condition_added` | New `offer_conditions` row inserted |
| `condition_satisfied` | Condition status → `satisfied` |
| `condition_waived` | Condition status → `waived` |
| `condition_failed` | Condition status → `failed` |
| `price_changed` | `offer_amount` updated on counter |

### 8. Commission Tracking
- `deals.commission_pct` stores the percentage (e.g. `3.5`)
- `deals.commission_amount` stores the computed dollar amount
- Updated when `value` or `commission_pct` changes via `update_deal`
- Both buyer and seller sides can be tracked (two separate deal records, one per side)

---

## End-to-End Scenarios

### Scenario 1: Create Deal from Contact and Progress Through Stages

1. Realtor qualifies a new buyer contact "Wei Zhang" — `type: "buyer"`, looking for a condo in Burnaby under $900K
2. Realtor opens `/pipeline`, clicks "New Deal"
3. Deal created: `title: "Wei Zhang — Condo Search"`, `type: "buyer"`, `contact_id: wei_id`, `stage: "new_lead"`, `value: 850000`, `commission_pct: 3.5`
4. `commission_amount` calculated: `$29,750`
5. Showing is booked for `678 Imperial St` → realtor advances deal stage to `"showing"` via `update_deal`
6. Wei submits an offer → realtor advances to `"offer"` stage

### Scenario 2: Submit Offer with Subject Conditions

1. Realtor creates offer: `listing_id: 678_imperial`, `buyer_contact_id: wei_id`, `offer_amount: 875000`, `expiry_date: "2026-04-02T20:00:00"`, `financing_type: "conventional"`, `closing_date: "2026-05-15"`, `possession_date: "2026-05-16"`
2. Offer inserted with `status: "submitted"`, `submitted_at` timestamped
3. `offer_history` row created: `action: "submitted"`
4. Realtor adds conditions:
   - `condition_type: "financing"`, `due_date: "2026-04-09"`, `description: "Subject to buyer obtaining satisfactory mortgage financing"`
   - `condition_type: "inspection"`, `due_date: "2026-04-07"`, `description: "Subject to satisfactory home inspection"`
   - `condition_type: "strata_documents"`, `due_date: "2026-04-09"`, `description: "Subject to review of strata documents including Form B and depreciation report"`
5. `offer_history` rows: `condition_added` × 3
6. Deal stage advances to `"conditional"`

### Scenario 3: Seller Counter-Offers

1. Seller's agent calls back — seller counters at `$898,000`, same conditions, possession pushed to `2026-05-20`
2. Realtor creates new offer: `is_counter_offer: true`, `parent_offer_id: wei_first_offer_id`, `offer_amount: 898000`, `possession_date: "2026-05-20"`, `status: "submitted"`
3. Original offer status updated to `"countered"`
4. `offer_history` rows: `countered` on original, `created` on counter
5. Offer chain is now visible in `/pipeline/[id]`
6. Wei accepts the counter → `update_offer({ offer_id: counter_id, action: "accept" })`
7. `offer_history`: `accepted`

### Scenario 4: Track and Clear Subject Conditions

1. Deal is in `"conditional"` stage with 3 pending conditions
2. Home inspection passes → realtor updates: `offer_conditions.status` → `"satisfied"`, `satisfied_at` timestamped
3. Strata documents reviewed — realtor decides to waive: `status: "waived"`
4. Financing approved → `status: "satisfied"`
5. All conditions cleared → realtor advances deal to `"closing"` stage
6. `offer_history`: `condition_satisfied` × 2, `condition_waived` × 1
7. Realtor works through `deal_checklist`: "Send deposit instructions" checked off, "Book notary" checked off

### Scenario 5: Deal Lost — Inspection Failure

1. Inspection reveals major structural issue
2. Buyer decides to walk away — condition cannot be satisfied
3. Realtor updates `offer_conditions`: `status: "failed"`, `notes: "Foundation issue — buyer unwilling to proceed"`
4. `offer_history`: `condition_failed`
5. Offer updated: `status: "withdrawn"` (buyer withdraws before expiry)
6. Deal updated: `status: "lost"`, `lost_reason: "Inspection — foundation issue"`
7. Deal moved to `won`/`lost` column on Kanban board
8. Realtor adds note to Wei's contact record, begins new property search

### Scenario 6: Voice Agent — Create Deal and Submit Offer

1. Realtor says: "Create a buyer deal for Maria Chen on 456 Oak Street, offer price 1.2 million, 3.5% commission"
2. Voice agent calls `find_contact({ name: "Maria Chen" })` → resolves `contact_id`
3. Voice agent calls `find_listing({ address: "456 Oak" })` → resolves `listing_id`
4. Voice agent calls `create_deal({ title: "Maria Chen — 456 Oak St", type: "buyer", contact_id, listing_id, value: 1200000, commission_pct: 3.5 })`
5. Agent responds: "Deal created. Commission on a $1.2M sale at 3.5% is $42,000. Want me to submit an offer?"
6. Realtor: "Yes, offer $1.18 million, subject to financing and inspection, expires Friday at 8pm"
7. Voice agent calls `create_offer({ listing_id, buyer_contact_id, offer_amount: 1180000, expiry_date: "2026-04-04T20:00:00", conditions_text: "financing, inspection" })`
8. Agent responds: "Offer submitted for $1,180,000. Expiry Friday at 8pm. Do you want to add the conditions now?"

---

## Demo Script

**Setup:** Have one deal in `"conditional"` stage with pending offer conditions. Have a second deal in `"showing"` stage ready to receive a new offer.

1. **Open `/pipeline`** — show Kanban board: deals grouped by stage, deal cards showing value, contact name, days in stage
2. **Click into a deal** — show `/pipeline/[id]`: parties panel, checklist, linked listing
3. **Show offers tab** — view submitted offer with financials; click into offer to see `offer_conditions` list with due dates
4. **Satisfy a condition** — mark inspection as "Satisfied"; observe `offer_history` audit trail update
5. **Create a counter-offer** — show `is_counter_offer` flag and parent offer link
6. **Show commission tracking** — point out `commission_amount` auto-calculated from `value × commission_pct`
7. **Voice demo:** Say "What deals do I have in the conditional stage?" → `get_deals({ stage: "conditional" })`; "Tell me about the Wei Zhang deal" → `get_deal_details({ deal_id })`

---

## Data Model

### `deals`
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `listing_id` | UUID | FK → `listings.id` ON DELETE SET NULL |
| `contact_id` | UUID | FK → `contacts.id` ON DELETE SET NULL |
| `type` | TEXT | `buyer` \| `seller` |
| `stage` | TEXT | `new_lead`/`qualified`/`showing`/`offer`/`conditional`/`closing` |
| `status` | TEXT | `active` \| `won` \| `lost` |
| `title` | TEXT | Deal display name |
| `value` | NUMERIC(14,2) | Expected transaction price |
| `commission_pct` | NUMERIC(5,2) | Commission % |
| `commission_amount` | NUMERIC(14,2) | Computed: value × pct / 100 |
| `close_date` | DATE | Actual completion date |
| `possession_date` | DATE | Possession date |
| `subject_removal_date` | DATE | Subject removal deadline |
| `lost_reason` | TEXT | Reason if status = lost |
| `notes` | TEXT | Internal notes |

### `deal_parties`
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `deal_id` | UUID | FK → `deals.id` CASCADE |
| `role` | TEXT | `buyer_agent`/`seller_agent`/`buyers_lawyer`/`notary`/etc. |
| `name` | TEXT | Party name |
| `phone` | TEXT | Contact phone |
| `email` | TEXT | Contact email |
| `company` | TEXT | Brokerage or firm |

### `deal_checklist`
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `deal_id` | UUID | FK → `deals.id` CASCADE |
| `item` | TEXT | Checklist item text |
| `due_date` | DATE | Optional deadline |
| `completed` | BOOLEAN | Default false |
| `completed_at` | TIMESTAMPTZ | Set when completed = true |
| `sort_order` | INT | Display order |

### `offers`
See Features section above for full field list.

### `offer_conditions`
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `offer_id` | UUID | FK → `offers.id` CASCADE |
| `condition_type` | TEXT | `financing`/`inspection`/`appraisal`/`title_search`/`sale_of_buyers_home`/`insurance`/`strata_documents`/`property_disclosure`/`fintrac`/`other` |
| `status` | TEXT | `pending`/`satisfied`/`waived`/`failed` |
| `due_date` | DATE | Subject removal deadline |
| `satisfied_at` | TIMESTAMPTZ | When cleared |

### `offer_history`
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `offer_id` | UUID | FK → `offers.id` CASCADE |
| `action` | TEXT | Full action enum (see Features section) |
| `from_status` | TEXT | Previous offer status |
| `to_status` | TEXT | New offer status |
| `description` | TEXT | Human-readable description |
| `performed_by` | TEXT | Who took the action |
| `metadata` | JSONB | Additional structured data |

---

## Voice Agent Integration

### Available Tools (Realtor Mode)

| Tool | Parameters | Action |
|------|-----------|--------|
| `get_deals` | `stage`, `type`, `contact_id`, `listing_id`, `limit` | List deals with filters |
| `create_deal` | `title`, `type`, `contact_id`, `listing_id`, `stage`, `value`, `commission_pct` | Create new deal |
| `update_deal` | `deal_id`, `stage`, `status`, `value`, `commission_pct`, `listing_id` | Update deal stage or financials |
| `get_deal_details` | `deal_id` | Full deal profile including parties, checklist, linked listing |
| `get_offers` | `listing_id`, `buyer_contact_id`, `status`, `limit` | List offers with filters |
| `create_offer` | `listing_id`, `buyer_contact_id`, `offer_amount`, `expiry_date`, `financing_type`, `deposit_amount`, `conditions_text`, `possession_date` | Submit new offer |
| `update_offer` | `offer_id`, `action` (`accept`/`reject`/`counter`/`withdraw`), `notes` | Take action on an offer |

### API Bridge Routes
- `GET /api/voice-agent/deals` — list deals (params: `stage`, `type`, `contact_id`, `listing_id`)
- `POST /api/voice-agent/deals` — create deal
- `PATCH /api/voice-agent/deals` — update deal
- `GET /api/voice-agent/offers` — list offers (params: `listing_id`, `status`)
- `POST /api/voice-agent/offers` — create offer
- `PATCH /api/voice-agent/offers` — accept/reject/counter/withdraw

### Example Voice Interactions
- "What deals are in the closing stage?" → `get_deals({ stage: "closing" })`
- "Create a seller deal for the Maple Street listing, 3% commission" → `create_deal({ type: "seller", ... })`
- "Show me all offers on 456 Oak Street" → `get_offers({ listing_id: ... })`
- "Accept the offer from Wei Zhang" → `get_offers` → `update_offer({ action: "accept" })`
- "What are the subject conditions on the Oak Street deal?" → `get_deal_details({ deal_id })`
- "Move the Wei Zhang deal to conditional" → `update_deal({ deal_id, stage: "conditional" })`
