<!-- docs-audit: src/actions/contacts.ts, src/components/contacts/PropertyDeals* -->
# PRD: Property Co-Ownership & Partner Network

**Status:** Approved for development  
**Author:** Claude (Rahul Mittal)  
**Date:** 2026-04-07

---

## 1. Overview

Realtors frequently work with clients who co-own properties with other people — spouses, business partners, investors. Today there is no way to model this in the CRM. This feature lets a contact own/invest in multiple properties alongside other people, auto-creates contact records for co-owners, and surfaces the shared property on every partner's profile.

---

## 2. Problem Statement

- Realtors can't track which properties a contact co-owns or has invested in
- When multiple people co-own a property, there's no way to link those people together via the asset
- Co-owners discovered through a deal get added as loose unrelated contacts with no context
- No distinction between direct clients and contacts who are only in the system as a result of a property connection

---

## 3. User Stories

- As a realtor, I want to add a property to a contact's profile so I can track their real estate portfolio
- As a realtor, when I add a property I want to list all co-owners so those people are automatically created as contacts
- As a realtor, I want to see all co-owners of a property when viewing any one partner's profile
- As a realtor, I want to know which contacts are "indirect" (in my CRM only because of a property link, not as direct clients)
- As a realtor, I want to be able to "upgrade" an indirect contact to a direct client when I start working with them personally

---

## 4. Functional Requirements

### 4.1 Property Deals
- A property deal has: address, property type, optional link to a listing, optional notes
- May or may not be an active listing in the CRM
- Belongs to the realtor (multi-tenant scoped)

### 4.2 Partners
- A property deal has 2+ partners (contacts)
- Each partner has a role: owner / co-owner / investor / trustee / other
- Optional ownership percentage
- One partner is designated "primary" (the one you're actively working with)

### 4.3 Auto-Create Contacts
- When adding a partner who doesn't exist, the wizard collects name + phone + optional email
- The auto-created contact is flagged `is_indirect = true` with `indirect_source = "property_partner"`
- The note on the auto-created contact reads: "Added as partner on [address] — not a direct client"
- Indirect contacts appear in the contacts list with a distinct badge

### 4.4 Upgrade to Direct Client
- Any indirect contact can be "upgraded" — sets `is_indirect = false`, clears the indirect badge
- A note is added to the contact's activity log when upgraded

### 4.5 UI Surface
- New "🏠 Properties" tab on contact detail page
- Shows all property deals the contact is part of, with co-owners listed
- "Add Property" button opens a 3-step wizard: Property Details → Add Partners → Review
- Partners link to their own contact detail pages

---

## 5. Data Model

```sql
-- property_deals: a co-owned property (may or may not be an active listing)
CREATE TABLE property_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID NOT NULL REFERENCES users(id),
  address TEXT NOT NULL,
  property_type TEXT DEFAULT 'residential',
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- property_deal_partners: many-to-many contacts <-> property_deals
CREATE TABLE property_deal_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES property_deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'co-owner',         -- owner/co-owner/investor/trustee/other
  ownership_pct NUMERIC(5,2),           -- optional %
  is_primary BOOLEAN DEFAULT false,     -- the contact you're directly working with
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, contact_id)
);
```

Contacts table additions (migration):
```sql
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_indirect BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS indirect_source TEXT; -- 'property_partner'
```

---

## 6. API Design

- `GET  /api/contacts/[id]/property-deals` — list deals for a contact
- `POST /api/contacts/[id]/property-deals` — create deal + link partners (auto-creates missing contacts)
- `PATCH /api/contacts/[id]/property-deals?deal_id=X` — update deal details
- `DELETE /api/contacts/[id]/property-deals?deal_id=X` — remove deal
- `POST /api/contacts/[id]/upgrade-indirect` — upgrade indirect → direct client

---

## 7. UI/UX Design

### Properties Tab
```
🏠 Properties (2)                          [+ Add Property]

┌─ 123 Main St, Vancouver  ──────────────────────────────┐
│  Condo · 3 partners · Linked to listing #MLS-1234       │
│                                                         │
│  👤 Sarah Johnson    Owner     40%   [You]              │
│  👤 Mike Johnson     Co-owner  40%   → contact link     │
│  👤 David Lee        Investor  20%   → contact link     │
└─────────────────────────────────────────────────────────┘

┌─ 456 Oak Ave, Burnaby  ────────────────────────────────┐
│  House · 2 partners · No active listing                 │
│                                                         │
│  👤 Sarah Johnson    Owner     50%   [You]              │
│  👤 Tom Chen         Co-owner  50%   → contact link     │
└─────────────────────────────────────────────────────────┘
```

### Indirect Contact Badge
In contacts list and on contact card:
`🔗 Via property` badge in amber, with tooltip showing the property address

---

## 8. Edge Cases

- Partner already exists as a contact → link them, don't duplicate
- Same person added twice to same deal → reject (UNIQUE constraint)
- Deal deleted → partners remain as contacts, just the deal link is removed
- Contact deleted → remove from all deals (cascade via FK)
- Ownership % may not sum to 100 — allowed (partial/unknown ownership)

---

## 9. Testing Plan

- Add property deal with 3 partners (mix of existing and new contacts) → verify all created/linked
- View each partner's contact page → verify property shows up on all 3
- Delete deal → verify contacts remain, deal link gone
- Upgrade indirect contact → verify badge removed, activity log entry added
- Add partner who already exists → verify no duplicate contact created
- Empty ownership % → allowed, no error

---

## 10. Out of Scope

- Financial details (purchase price, mortgage, title search)
- Legal co-ownership documents / FINTRAC for all partners
- Offer management on co-owned properties
- Notifications to partners
<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->

<!-- Last reviewed: 2026-04-21 — AGENTS.md v0.6 + violation logging -->
