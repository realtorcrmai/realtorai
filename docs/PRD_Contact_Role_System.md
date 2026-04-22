<!-- docs-audit: none --># PRD — Contact Role System
**Version:** 1.1 | **Date:** 2026-04-08 | **Status:** Draft  
**Author:** RealtorAI Team | **Reviewers:** Rahul Mittal

---

## 1. Overview & Problem Statement

### Background
RealtorAI currently models every contact as either a `buyer` or a `seller` — a single, immutable field. In practice, BC realtors manage clients who simultaneously sell their existing home, buy a new one, hold investment properties, and co-own with partners. The current model forces a realtor to choose one role per person, losing critical context and breaking workflows.

### Problem
- A contact selling AND buying appears in only one pipeline — the other transaction is invisible
- Investors with multiple properties have no way to track their portfolio
- No linkage between a buyer's conditional purchase and their own listing
- Buyer preferences stored as a JSONB blob with no lifecycle — no stages, no offer tracking
- No way to find "which buyers in my CRM match this new listing I just took"
- Showings aren't linked to buyer contacts — buyer agent is just flat text

### Solution
Replace the single `type` field with a `roles[]` array and introduce three new data structures: **Buyer Journeys**, **Buyer Journey Properties**, and **Contact Portfolio**. A contact becomes a person-first entity whose roles are derived from their active relationships.

---

## 2. Goals & Success Metrics

### Goals
1. A single contact can hold multiple roles simultaneously
2. Buyers have a full lifecycle from search → close tracked in CRM
3. Every property a contact owns/owned is visible in their profile
4. New listing creation auto-matches to active buyer journeys
5. Selling and buying are linked when conditional on each other
6. Zero breaking changes to existing seller workflow

### Success Metrics
| Metric | Target |
|--------|--------|
| Contacts with multiple roles tracked | > 20% of contacts within 60 days |
| Buyer journeys created per realtor/month | ≥ 5 |
| Listing-to-buyer match rate | ≥ 1 match shown per new listing |
| Portfolio items per investor contact | ≥ 2 |
| Existing test suite pass rate | 100% (no regression) |

---

## 3. User Stories

| # | As a… | I want to… | So that… |
|---|-------|-----------|---------|
| US-1 | Realtor | Tag a contact as both seller and buyer | I don't lose track of their purchase while managing their sale |
| US-2 | Realtor | Create a buyer journey with budget/area criteria | I have one place to track everything about their search |
| US-3 | Realtor | Link a buyer's purchase to their active listing | I know the purchase is conditional on their sale closing |
| US-4 | Realtor | Add a property to a client's portfolio | I can see all properties they own, not just active transactions |
| US-5 | Realtor | See which buyers match a new listing I just took | I can immediately reach out to relevant buyers |
| US-6 | Realtor | Track an offer made by a buyer on a property | I have offer price, subjects, expiry, and status in one place |
| US-7 | Realtor | See when a listing closes, auto-update both buyer and seller portfolios | I don't manually update both sides of the transaction |
| US-8 | Realtor | Filter my contact list by role and buyer journey status | I can segment "active buyers in $800K–$1M Burnaby" for a campaign |
| US-9 | Buyer client | Be sent listing alerts matching my exact criteria | I don't miss properties that fit my budget and area |
| US-10 | Realtor | View a contact's full property history (bought, sold, owns) | I understand their full real estate journey before any meeting |

---

## 4. Functional Requirements

### 4.1 Contact Roles
- FR-01: `contacts.roles TEXT[]` replaces single `type` field as the source of truth
- FR-02: Allowed values: `buyer | seller | investor | landlord | tenant | co_owner | referral_partner`
- FR-03: `contacts.type` retained for backward compatibility; seeded from `type` at migration
- FR-04: Contact header displays role badge pills for each active role
- FR-05: Contacts list filterable by role (single or multi-select)
- FR-06: When a buyer journey is created, `buyer` is auto-added to `roles[]`
- FR-07: When a listing is created with this contact as seller, `seller` is auto-added to `roles[]`
- FR-07b: When a contact has both `buyer` and `seller` in `roles[]`, `lifecycle_stage` is auto-set to `dual_client`

### 4.7 Contact Lifecycle Stage
- FR-34: `contacts.lifecycle_stage TEXT` — high-level stage representing the contact's overall relationship with the realtor, computed from their active transactions
- FR-35: Allowed values (ordered): `prospect | nurture | active_buyer | active_seller | dual_client | under_contract | closed | past_client | referral_partner`
- FR-36: Default value: `prospect` (all existing contacts seeded to `prospect`)
- FR-37: Auto-advance rules (server-side, triggered on relevant mutations):
  - Buyer journey created → `active_buyer` (if not already `dual_client` or higher)
  - Listing created with contact as seller → `active_seller` (if not already `dual_client` or higher)
  - Contact has both `buyer` + `seller` in roles → `dual_client`
  - Any linked buyer journey status = `conditional` or `firm` → `under_contract`
  - All linked transactions close → `closed`, then after 30 days → `past_client`
  - No activity in 6+ months AND stage is `active_buyer`/`active_seller` → `nurture`
  - `referral_partner` role added to contact → `lifecycle_stage` = `referral_partner`
- FR-38: Realtor can manually override `lifecycle_stage` at any time; manual overrides are not auto-reverted
- FR-39: Contacts list filterable by `lifecycle_stage` (alongside role filter)
- FR-40: Dashboard shows lifecycle stage breakdown: counts per stage in a summary row

### 4.2 Buyer Journey
- FR-08: Realtor can create one or more buyer journeys per contact
- FR-09: Journey status lifecycle (ordered): `searching → viewing → offer_made → conditional → firm → closed | paused | cancelled`
- FR-10: Journey stores: price range, pre-approval amount, preferred areas (multi), property types (multi), beds/baths, must-haves, nice-to-haves, financing status, target close date, urgency
- FR-11: Journey can be marked `conditional_on_sale` with a linked `listings.id`
- FR-12: When linked listing closes (status=sold), journey's conditional flag auto-clears and realtor is notified
- FR-13: AI buyer score (1–100) auto-calculated based on: pre-approval status, urgency, search criteria specificity, engagement recency

### 4.3 Buyer Journey Properties
- FR-14: Realtor can add properties to a journey from three sources: (a) CRM listing, (b) MLS number, (c) manual address entry
- FR-15: Each property tracks: interest level (1–5 stars), status, notes, linked showing
- FR-16: Offer tracking fields: offer_price, offer_date, offer_expiry, offer_status, counter_price, subjects[], subject_removal_date
- FR-17: Offer status lifecycle: `pending → accepted | rejected | countered | withdrawn | subject_removed`
- FR-18: When offer is accepted → journey status auto-advances to `conditional`
- FR-19: When subjects removed → journey status auto-advances to `firm`
- FR-20: When firm → realtor prompted to confirm close date; on confirm → `closed` + portfolio auto-created

### 4.4 Contact Portfolio
- FR-21: Portfolio item tracks: address, city, property type, category (primary_residence | investment | vacation | commercial), ownership_pct, co_owners[], purchase_price, purchase_date, estimated_value, bc_assessed_value, mortgage_balance, monthly_rental_income
- FR-22: Portfolio item status: `owned | selling | sold | refinancing | transferred`
- FR-23: When status = `selling`, realtor can link to active CRM listing (bidirectional)
- FR-24: Portfolio items auto-created on listing close (seller side: status=sold) and buyer journey close (buyer side: status=owned)
- FR-25: Portfolio items can be manually added (for existing properties before CRM use)

### 4.5 Matching Engine
- FR-26: On new listing creation, query active buyer journeys for price/area/type overlap
- FR-27: Match criteria: `min_price ≤ list_price ≤ max_price AND area IN preferred_areas AND type IN property_types`
- FR-28: Matched buyers shown as AI Recommendation card on listing detail page
- FR-29: Realtor can one-click send listing alert email to all matched buyers
- FR-30: Match results also surfaced on dashboard AI Recommendations widget

### 4.6 Close-Loop Automation
- FR-31: Listing status changes to `sold` → trigger: add to seller's portfolio (status=sold), notify if buyer_contact_id set (add to buyer's portfolio status=owned)
- FR-32: Buyer journey closes → trigger: create portfolio item, update journey status, log activity
- FR-33: All triggers are server-side (Next.js server action + Supabase trigger or cron)

---

## 5. Database Schema

### New Table: `buyer_journeys`
```sql
CREATE TABLE buyer_journeys (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id             UUID NOT NULL REFERENCES users(id),
  contact_id             UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL DEFAULT 'searching',
  min_price              NUMERIC,
  max_price              NUMERIC,
  pre_approval_amount    NUMERIC,
  financing_status       TEXT,
  preferred_areas        TEXT[] DEFAULT '{}',
  property_types         TEXT[] DEFAULT '{}',
  min_beds               INTEGER,
  max_beds               INTEGER,
  min_baths              NUMERIC,
  must_haves             TEXT[] DEFAULT '{}',
  nice_to_haves          TEXT[] DEFAULT '{}',
  target_close_date      DATE,
  urgency                TEXT,
  conditional_on_sale    BOOLEAN DEFAULT false,
  conditional_listing_id UUID REFERENCES listings(id),
  notes                  TEXT,
  ai_buyer_score         INTEGER,
  ai_summary             TEXT,
  purchased_address      TEXT,
  purchase_price         NUMERIC,
  purchase_date          DATE,
  linked_portfolio_id    UUID,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bj_contact  ON buyer_journeys(contact_id);
CREATE INDEX idx_bj_status   ON buyer_journeys(status);
CREATE INDEX idx_bj_price    ON buyer_journeys(min_price, max_price);
CREATE INDEX idx_bj_areas    ON buyer_journeys USING GIN(preferred_areas);
CREATE INDEX idx_bj_types    ON buyer_journeys USING GIN(property_types);
ALTER TABLE buyer_journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY bj_tenant ON buyer_journeys USING (realtor_id = auth.uid());
```

### New Table: `buyer_journey_properties`
```sql
CREATE TABLE buyer_journey_properties (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id           UUID NOT NULL REFERENCES users(id),
  journey_id           UUID NOT NULL REFERENCES buyer_journeys(id) ON DELETE CASCADE,
  contact_id           UUID NOT NULL REFERENCES contacts(id),
  listing_id           UUID REFERENCES listings(id),
  mls_number           TEXT,
  address              TEXT NOT NULL,
  list_price           NUMERIC,
  property_type        TEXT,
  status               TEXT NOT NULL DEFAULT 'interested',
  interest_level       INTEGER CHECK (interest_level BETWEEN 1 AND 5),
  notes                TEXT,
  showing_id           UUID REFERENCES appointments(id),
  offer_price          NUMERIC,
  offer_date           DATE,
  offer_expiry         TIMESTAMPTZ,
  offer_status         TEXT,
  counter_price        NUMERIC,
  subjects             TEXT[] DEFAULT '{}',
  subject_removal_date DATE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_bjp_journey  ON buyer_journey_properties(journey_id);
CREATE INDEX idx_bjp_listing  ON buyer_journey_properties(listing_id);
CREATE INDEX idx_bjp_status   ON buyer_journey_properties(status);
ALTER TABLE buyer_journey_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY bjp_tenant ON buyer_journey_properties USING (realtor_id = auth.uid());
```

### New Table: `contact_portfolio`
```sql
CREATE TABLE contact_portfolio (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id            UUID NOT NULL REFERENCES users(id),
  contact_id            UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  address               TEXT NOT NULL,
  unit_number           TEXT,
  city                  TEXT,
  province              TEXT DEFAULT 'BC',
  postal_code           TEXT,
  property_type         TEXT,
  property_category     TEXT,
  ownership_pct         NUMERIC DEFAULT 100,
  co_owners             JSONB DEFAULT '[]',
  purchase_price        NUMERIC,
  purchase_date         DATE,
  estimated_value       NUMERIC,
  bc_assessed_value     NUMERIC,
  mortgage_balance      NUMERIC,
  monthly_rental_income NUMERIC,
  strata_fee            NUMERIC,
  status                TEXT DEFAULT 'owned',
  linked_listing_id     UUID REFERENCES listings(id),
  source_journey_id     UUID REFERENCES buyer_journeys(id),
  source_deal_id        UUID REFERENCES property_deals(id),
  notes                 TEXT,
  enrichment_data       JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cp_contact  ON contact_portfolio(contact_id);
CREATE INDEX idx_cp_city     ON contact_portfolio(city);
CREATE INDEX idx_cp_status   ON contact_portfolio(status);
CREATE INDEX idx_cp_addr_fts ON contact_portfolio
  USING GIN(to_tsvector('english', address));
ALTER TABLE contact_portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY cp_tenant ON contact_portfolio USING (realtor_id = auth.uid());
```

### Modifications to Existing Tables
```sql
-- contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'prospect'
  CHECK (lifecycle_stage IN ('prospect','nurture','active_buyer','active_seller','dual_client','under_contract','closed','past_client','referral_partner'));
CREATE INDEX idx_contacts_roles ON contacts USING GIN(roles);
CREATE INDEX idx_contacts_lifecycle ON contacts(lifecycle_stage);
UPDATE contacts SET roles = ARRAY[type] WHERE type IS NOT NULL AND roles = '{}';
-- Seed lifecycle_stage from existing type (buyers → active_buyer, sellers → active_seller)
UPDATE contacts SET lifecycle_stage = 'active_buyer'  WHERE type = 'buyer';
UPDATE contacts SET lifecycle_stage = 'active_seller' WHERE type = 'seller';

-- listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS buyer_contact_id UUID REFERENCES contacts(id);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS buyer_journey_id UUID REFERENCES buyer_journeys(id);

-- appointments (showings)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS buyer_contact_id UUID REFERENCES contacts(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS journey_property_id UUID REFERENCES buyer_journey_properties(id);
```

---

## 6. UI/UX Specifications

### 6.1 Contact Header
- Role badges rendered from `roles[]`: each role has colour + emoji (`🏠 Seller`, `🔍 Buyer`, `💼 Investor`, `🤝 Referral Partner`)
- Lifecycle stage pill shown next to name (e.g. `🟢 Active Buyer`, `🔵 Dual Client`, `⭐ Past Client`)
- Clicking a role badge scrolls to its section in the overview tab

### 6.2 Contact Overview Tab — New Buyer Journey Panel
- Card: "🔍 Buyer Journey" with status pill, price range, top 2 preferred areas
- Progress bar across 6 journey stages
- Sub-list: up to 3 properties of interest with interest stars and status
- CTA: "View Full Journey" expands inline OR links to journey detail
- If `conditional_on_sale`: shows linked listing address with warning if listing not yet sold

### 6.3 Contact Portfolio Tab (replaces current Properties tab)
- Grid of property cards: address, category pill, ownership %, current value estimate
- Filter bar: All | Primary | Investment | Sold
- Each card: Edit | Link to Listing | View Enrichment buttons
- "+ Add Property" button opens wizard: address → category → financials → co-owners

### 6.4 Dashboard — Dual Pipeline
- Existing seller pipeline card (unchanged)
- New: "Buyer Pipeline" card showing counts by stage: Searching | Viewing | Offer Out | Conditional | Firm | Closed (MTD)

### 6.5 Listing Detail — Buyer Match Banner
- After listing is created/saved: "🎯 3 buyers in your CRM match this listing"
- Expandable list: buyer name, budget, area preference, journey status
- One-click "Send Listing Alert" per buyer OR "Alert All"

### 6.6 New Route: `/contacts/[id]/buyer-journey/[journeyId]`
- Full journey detail: criteria, all properties of interest, offer history, activity log
- Inline editing of criteria
- Add property form: search CRM listings OR enter MLS# OR manual address
- Offer workflow per property: price → subjects → expiry → track response

---

## 7. API & Server Actions

### Server Actions (`src/actions/`)
| File | Function | Description |
|------|----------|-------------|
| `buyer-journeys.ts` | `createBuyerJourney(contactId, data)` | Create journey + add 'buyer' to contact roles + advance lifecycle_stage |
| `buyer-journeys.ts` | `updateBuyerJourney(journeyId, data)` | Update criteria or status |
| `buyer-journeys.ts` | `advanceBuyerJourneyStatus(journeyId)` | Move to next lifecycle stage |
| `buyer-journeys.ts` | `closeBuyerJourney(journeyId, closeData)` | Close + auto-create portfolio item |
| `buyer-journeys.ts` | `matchBuyersToListing(listingId)` | Query journeys for matching buyers |
| `buyer-journey-properties.ts` | `addPropertyToJourney(journeyId, data)` | Add property of interest |
| `buyer-journey-properties.ts` | `updatePropertyStatus(propertyId, status)` | Update viewed/offer/closed |
| `buyer-journey-properties.ts` | `recordOffer(propertyId, offerData)` | Log offer details |
| `contact-portfolio.ts` | `addPortfolioItem(contactId, data)` | Manual portfolio add |
| `contact-portfolio.ts` | `updatePortfolioItem(itemId, data)` | Edit value/status/notes |
| `contact-portfolio.ts` | `linkPortfolioToListing(itemId, listingId)` | Connect portfolio ↔ listing |
| `contact-portfolio.ts` | `autoCreateFromListingClose(listingId)` | Triggered on listing → sold |
| `contacts.ts` | `computeLifecycleStage(contactId)` | Re-computes and persists lifecycle_stage from current roles + active transactions |
| `contacts.ts` | `setLifecycleStage(contactId, stage)` | Manual override of lifecycle_stage |

### API Routes (`src/app/api/`)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/buyer-journeys/match` | POST | Find matching buyers for a listing (used on listing save) |
| `/api/contacts/[id]/roles` | PATCH | Update contact roles array + recompute lifecycle_stage |
| `/api/contacts/[id]/lifecycle-stage` | PATCH | Manual lifecycle stage override |
| `/api/buyer-journeys/[id]/properties` | GET/POST | List or add journey properties |
| `/api/buyer-journeys/[id]/properties/[pid]` | PATCH | Update offer/status |

---

## 8. Integration Points

| System | Current | After This PRD |
|--------|---------|----------------|
| Contact type field | `type = "buyer"\|"seller"` | `roles[] = ['buyer','seller','investor']` — type kept for compat |
| Contact overview tab | Buyer prefs panel OR seller prefs | Both shown if both roles active; plus portfolio summary |
| Properties tab | PropertyDealsTab (co-ownership) | Full portfolio: all owned/sold/buying properties |
| Deals tab | Seller closings only | Seller closings + buyer purchases |
| Dashboard pipeline | Seller pipeline only | Seller pipeline + buyer pipeline |
| Listing detail | Seller contact shown | Seller contact + matched buyers banner |
| Listing close flow | Manual only | Auto-creates/updates portfolio for both sides |
| Showings | buyer_agent as text | Optional link to buyer contact + journey property |
| Email segments | Filter by contact.type | Filter by roles[], lifecycle_stage, journey status, price range, preferred areas |
| AI Recommendations | Generic next-best-action | Role-aware: matching buyers surfaced on new listing |
| FINTRAC | Sellers only | Extended to buyer contacts (Phase 3) |
| Communications log | Tagged with contact_id | Also taggable with journey_id for context |

---

## 9. Migration Plan

### Phase 1 — Schema (Week 1, zero downtime)
- [ ] Write migration `074_contact_role_system.sql`: all new tables, all ALTER TABLE statements (incl. `lifecycle_stage`), all indexes, all RLS policies
- [ ] Seed `contacts.roles` from existing `contacts.type`
- [ ] Seed `contacts.lifecycle_stage` from existing `contacts.type` (buyer → active_buyer, seller → active_seller, else prospect)
- [ ] Migrate `buyer_preferences.properties_of_interest` JSONB → `buyer_journey_properties` rows
- [ ] Write seed data: 3 sample buyer journeys, 5 portfolio items for demo contacts
- [ ] Update `src/types/database.ts` with all new table types
- [ ] Add tenant client support for new tables in `src/lib/supabase/tenant.ts`
- [ ] Update test suite: add new table navigation routes + CRUD tests

### Phase 2 — UI & Core Features (Weeks 2–3)
- [ ] Contact header role badges
- [ ] Buyer Journey panel in contact overview tab
- [ ] Portfolio tab (replaces Properties tab)
- [ ] Buyer journey detail page `/contacts/[id]/buyer-journey/[journeyId]`
- [ ] Add property to journey form (3 sources: CRM listing, MLS#, manual)
- [ ] Offer recording form per property
- [ ] Dashboard buyer pipeline card
- [ ] Listing detail buyer match banner + "Send Alert" action
- [ ] Contact list role filter chip
- [ ] Contact list lifecycle stage filter (Prospect | Nurture | Active Buyer | Active Seller | Dual Client | Under Contract | Past Client | Referral Partner)
- [ ] Lifecycle stage pill in contact header
- [ ] Dashboard lifecycle stage breakdown row (counts per stage)

### Phase 3 — Automation & Close-Loop (Week 4)
- [ ] Listing close trigger → auto-create portfolio items for seller + buyer
- [ ] Conditional purchase trigger → notify when linked listing sells
- [ ] AI buyer score calculation server action
- [ ] `computeLifecycleStage` auto-advance: hook into listing create/close, journey create/close, role changes
- [ ] Cron: daily lifecycle stage re-evaluation (catches 6-month inactivity → nurture)
- [ ] Cron: daily buyer journey activity digest
- [ ] FINTRAC identity collection for buyer contacts
- [ ] Full test pass (73+ tests) + new buyer journey eval suite

---

## 10. Out of Scope

| Feature | Reason Deferred |
|---------|----------------|
| Offer management as full workflow | Separate PRD — involves contracts, deposits, lawyers |
| MLS API integration for property search | No Paragon/MLS API access in current plan |
| Mortgage calculator / pre-approval wizard | Third-party integration, separate scope |
| Buyer portal (client-facing) | Separate product — not a realtor tool |
| Rental management (lease tracking) | Landlord/tenant role is captured but lease lifecycle is separate |
| Multi-realtor deal sharing | Team plan feature — single-tenant for now |
| Automatic BC Assessment enrichment for portfolio | Portfolio enrichment is manual (same as listings Phase 2) |
| FINTRAC for buyers | Phase 3 — schema ready but UI deferred |
