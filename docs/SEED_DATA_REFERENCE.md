<!-- docs-audit: none --># Seed Data Reference

Complete reference for all demo/seed data in Realtors360. This document covers realtors (users), contacts, listings, showings, newsletters, and photos across all seed scripts.

**Last updated:** 2026-04-18

---

## Quick Reference

| Entity | Total Count | Scripts |
|--------|-------------|---------|
| Realtors (users) | 4 | `seed-demo-users.mjs` |
| Contacts (newsletter) | 29 | `seed-demo.mjs` |
| Contacts (luxury sellers) | 20 | `seed-luxury-listings.mjs` |
| Listings (standard) | 12 | `seed-demo-users.mjs` |
| Listings (luxury) | 20 | `seed-luxury-listings.mjs` |
| Listing photos | 100 | `seed-luxury-listings.mjs` |
| Showings | ~16 | `seed-demo-users.mjs` |
| Newsletters | ~84 | `seed-demo.mjs` |
| Newsletter events | ~129 | `seed-demo.mjs` |

**Phone prefix:** All demo contacts use `+1604555` for easy cleanup.

---

## Seed Scripts

| Script | Purpose | Run Command |
|--------|---------|-------------|
| `scripts/seed-demo.mjs` | Newsletter contacts, journeys, emails, events | `node --env-file=.env.local scripts/seed-demo.mjs` |
| `scripts/seed-demo-users.mjs` | Standard listings, showings, newsletters, comms for Sarah/Mike/Priya | `node scripts/seed-demo-users.mjs` |
| `scripts/seed-luxury-listings.mjs` | 20 luxury listings + 20 seller contacts + 100 photos | `node --env-file=.env.local scripts/seed-luxury-listings.mjs` |
| `scripts/seed-complete-demo.mjs` | Enriches existing listings with photos + MLS remarks | `node scripts/seed-complete-demo.mjs` |
| `scripts/seed-comprehensive.mjs` | Additional comprehensive data | `node scripts/seed-comprehensive.mjs` |
| `scripts/seed-email-marketing.mjs` | Email marketing demo data | `node scripts/seed-email-marketing.mjs` |
| `scripts/seed-admin-analytics.mjs` | Admin analytics dashboard data | `node scripts/seed-admin-analytics.mjs` |

**Recommended seed order:** `seed-demo.mjs` → `seed-demo-users.mjs` → `seed-luxury-listings.mjs` → `seed-complete-demo.mjs`

---

## 1. Realtors (Demo Users)

4 demo accounts with different plan tiers for testing feature gates.

| Name | Email | Plan | UUID | Role |
|------|-------|------|------|------|
| **Kunal** | `demo@realestatecrm.com` | Professional | `e044c0c6-...` (dynamic) | Primary demo account |
| **Sarah Chen** | `sarah@realtors360.com` | Studio | `b0000000-0000-0000-0000-000000000002` | Luxury market focus |
| **Mike Johnson** | `mike@realtors360.com` | Professional | `c0000000-0000-0000-0000-000000000003` | Residential mix |
| **Priya Patel** | `priya@realtors360.com` | Free | `d0000000-0000-0000-0000-000000000004` | Starter/budget tier |

**Script:** `seed-demo-users.mjs` (hardcoded UUIDs for Sarah/Mike/Priya; Kunal's ID fetched dynamically)

---

## 2. Contacts

### 2a. Newsletter Contacts (seed-demo.mjs) — 29 contacts

Seeded for Kunal's account. Used for newsletter/journey engine demos.

#### Hot Buyers (3)

| Name | Email | Phone | Notes | Phase | Score |
|------|-------|-------|-------|-------|-------|
| Aman Singh | amandhindsa@outlook.com | +16045559100 | 3BR Kitsilano, $1.1-1.4M. Pre-approved $1.3M TD | active | 72 |
| Sarah Chen | sarah.c@demo.com | +16045559101 | 3BR Kits/Pt Grey, $1.1-1.4M. Family, schools | active | 78 |
| Tom Richards | tom.r@demo.com | +16045559102 | Mt Pleasant townhouses, $900K-$1.1M. Pre-approved | active | 68 |

#### Warm Buyers (4)

| Name | Email | Phone | Notes | Phase | Score |
|------|-------|-------|-------|-------|-------|
| David Kim | david.k@demo.com | +16045559103 | First-time, East Van. $800K-$1M | active | 52 |
| Emily Wang | emily.w@demo.com | +16045559104 | Yaletown 1BR condo. $550-700K | lead | 45 |
| Priya Sharma | priya.s@demo.com | +16045559105 | Investor, Burnaby/Surrey rentals. $600-800K | active | 52 |
| Mike Thompson | mike.t@demo.com | +16045559106 | Downsizing, West/North Van condo. $1.2M+ | under_contract | 90 |

#### New Leads (3)

| Name | Email | Phone | Notes | Phase | Score |
|------|-------|-------|-------|-------|-------|
| Jessica Liu | jessica.l@demo.com | +16045559107 | Relocating Toronto, 3BR school district. $1-1.3M | lead | 22 |
| Rachel Martinez | rachel.m@demo.com | +16045559108 | Signed up yesterday. Dog-friendly near transit | lead | 5 |
| Alex Turner | alex.t@demo.com | +16045559109 | Website form 3 days ago. East Van | lead | 15 |

#### Past Clients (2)

| Name | Email | Phone | Notes | Phase | Score |
|------|-------|-------|-------|-------|-------|
| Amanda Foster | amanda.f@demo.com | +16045559110 | Bought 6mo ago Kits. Quarterly updates | past_client | 55 |
| Kevin Ng | kevin.n@demo.com | +16045559111 | Bought 1yr ago. Anniversary due | past_client | 48 |

#### Dormant (2)

| Name | Email | Phone | Notes | Phase | Score |
|------|-------|-------|-------|-------|-------|
| Raj Patel | raj.p@demo.com | +16045559112 | Family of 5, Surrey. Quiet 90 days | dormant | 12 |
| Chris Wong | chris.w@demo.com | +16045559113 | Investment condos. No response 45d. **Paused** | dormant | 8 |

#### Sellers (10)

| Name | Email | Phone | Notes | Phase | Score |
|------|-------|-------|-------|-------|-------|
| Linda Martinez | linda.m@demo.com | +16045559201 | 3BR Dunbar $2.1M. Moving to Victoria | active | 70 |
| Susan Park | susan.p@demo.com | +16045559202 | Estate sale Kerrisdale 4BR. Slow traffic | active | 55 |
| Robert Chang | robert.c@demo.com | +16045559203 | Yaletown condo, CMA requested | lead | 38 |
| Karen White | karen.w@demo.com | +16045559204 | Divorce, sell Coquitlam home. Sensitive | lead | 25 |
| Mohammed Al-Rashid | moh.ar@demo.com | +16045559205 | Burnaby townhouse, offer accepted | under_contract | 85 |
| Patricia Wilson | pat.w@demo.com | +16045559206 | Pt Grey family home 30yrs. Closing 3wk | under_contract | 60 |
| George Nakamura | george.n@demo.com | +16045559207 | Sold 1yr ago. Investment updates | past_client | 50 |
| William Hughes | will.h@demo.com | +16045559208 | Sold 2yr ago. Quarterly. Kelowna | past_client | 45 |
| Maria Santos | maria.s@demo.com | +16045559209 | Sold 6mo ago. Considering buying | past_client | 58 |
| Daniel Lee | daniel.l@demo.com | +16045559210 | Developer, Cambie pre-sales | lead | 30 |

#### Partner Agents (5)

| Name | Email | Phone | Notes |
|------|-------|-------|-------|
| John Smith | john@rlp.demo | +16045559301 | Royal LePage buyer agent |
| Lisa Wong | lisa@sutton.demo | +16045559302 | Sutton Group, Kits market |
| Mark Chen | mark@mac.demo | +16045559303 | Macdonald Realty. Referral partner |
| Deepak Gill | deepak@remax.demo | +16045559304 | RE/MAX co-listing |
| Nancy Kim | nancy@c21.demo | +16045559305 | Century 21, 2 offers last qtr |

---

### 2b. Luxury Seller Contacts (seed-luxury-listings.mjs) — 20 contacts

Seeded for **all 4 demo accounts**. Each contact has a headshot photo from Unsplash.

#### BC Sellers (10)

| Name | Email | Phone | Notes |
|------|-------|-------|-------|
| Catherine Beaumont | c.beaumont@demo.com | +16045558001 | West Vancouver. Relocating to Victoria |
| Harrison Wolfe | h.wolfe@demo.com | +16045558002 | North Vancouver. Downsizing |
| Margaret Liu | m.liu@demo.com | +16045558003 | Point Grey estate. Family moving to London |
| Robert Ashford | r.ashford@demo.com | +16045558004 | Whistler vacation property. Selling investment |
| Diana Sinclair | d.sinclair@demo.com | +16045558005 | Victoria oceanfront. Estate sale |
| Vincent Okonkwo | v.okonkwo@demo.com | +16045558006 | Kelowna lakefront. Relocating to Vancouver |
| Evelyn Crawford | e.crawford@demo.com | +16045558007 | British Properties estate. Moving abroad |
| Philip Nakamura | p.nakamura@demo.com | +16045558008 | Caulfeild Cove. Downsizing to condo |
| Sarah Whitfield | s.whitfield@demo.com | +16045558009 | Tsawwassen beachfront. Retiring |
| James Thornton | j.thornton@demo.com | +16045558010 | West Vancouver penthouse. Upgrading |

#### Seattle Sellers (10)

| Name | Email | Phone | Notes |
|------|-------|-------|-------|
| Alexandra Mercer | a.mercer@demo.com | +16045558011 | Mercer Island waterfront. Relocating to SF |
| William Prescott III | w.prescott@demo.com | +16045558012 | Broadmoor estate. Downsizing after retirement |
| Jennifer Castellano | j.castellano@demo.com | +16045558013 | Magnolia craftsman. Moving to Portland |
| Richard Bellevue | r.bellevue@demo.com | +16045558014 | Bridle Trails new construction. Builder sale |
| Nicole Park | n.park@demo.com | +16045558015 | Capitol Hill townhome. Upgrading to house |
| Edward Quinn | e.quinn@demo.com | +16045558016 | Queen Anne Victorian. Estate sale |
| Sophia Eastman | s.eastman@demo.com | +16045558017 | Mercer Island east shore. Moving to Bellevue |
| Andrew Madison | a.madison@demo.com | +16045558018 | Madison Park mid-century. Relocating to LA |
| Lisa Somerset | l.somerset@demo.com | +16045558019 | Bellevue Somerset. Empty nesters downsizing |
| Daniel Lakewood | d.lakewood@demo.com | +16045558020 | Madison Park condo. Investment sale |

**All luxury contacts:** type=`seller`, pref_channel=`email`, lead_status=`qualified`, source=`Referral`

---

## 3. Listings

### 3a. Standard Listings (seed-demo-users.mjs) — 12 listings

#### Sarah Chen's Listings (Studio plan — luxury focus) — 4 listings

| Address | MLS# | Price | Type | Status | Phase |
|---------|-------|-------|------|--------|-------|
| 3402 Point Grey Road, Vancouver | V4100001 | $3,250,000 | Residential | active | 7 |
| 1501 West 6th Avenue #802, Vancouver | V4100002 | $1,150,000 | Condo/Apartment | active | 5 |
| 4788 Blenheim Street, Vancouver | V4100003 | $2,450,000 | Residential | pending | 6 |
| 1233 West Cordova Street #3101, Vancouver | V4100004 | $1,850,000 | Condo/Apartment | sold ($1.82M) | 8 |

#### Mike Johnson's Listings (Pro plan — residential mix) — 5 listings

| Address | MLS# | Price | Type | Status | Phase |
|---------|-------|-------|------|--------|-------|
| 15230 Thrift Avenue, White Rock | V4200001 | $1,650,000 | Residential | active | 4 |
| 6888 Southpoint Drive #1205, Burnaby | V4200002 | $620,000 | Condo/Apartment | active | 3 |
| 7234 132nd Street, Surrey | V4200003 | $899,000 | Townhouse | active | 2 |
| 4521 Hastings Street, Burnaby | V4200004 | $785,000 | Townhouse | sold ($810K) | 8 |
| 10123 King George Blvd #405, Surrey | V4200005 | $480,000 | Condo/Apartment | conditional | 6 |

#### Priya Patel's Listings (Free plan — starter) — 3 listings

| Address | MLS# | Price | Type | Status | Phase |
|---------|-------|-------|------|--------|-------|
| 8891 Lansdowne Road #308, Richmond | V4300001 | $558,000 | Condo/Apartment | active | 4 |
| 12567 72nd Avenue, Surrey | V4300002 | $1,350,000 | Residential | active | 1 |
| 3455 Ascot Place #1802, Vancouver | V4300003 | $425,000 | Condo/Apartment | sold ($435K) | 8 |

---

### 3b. Luxury Listings (seed-luxury-listings.mjs) — 20 listings

Seeded for **all 4 demo accounts** (each gets all 20). Total portfolio value: ~$103.9M per realtor.

#### BC Canada (10)

| # | Address | MLS# | Price | Type | Status |
|---|---------|-------|-------|------|--------|
| 1 | 4821 Belmont Avenue, West Vancouver | R2901234 | $8,950,000 | Residential | active |
| 2 | 1295 Marine Drive, North Vancouver | R2901235 | $4,875,000 | Residential | active |
| 3 | 3740 Point Grey Road, Vancouver | R2901236 | $12,500,000 | Residential | active |
| 4 | 8520 Mountainview Lane, Whistler | R2901237 | $6,750,000 | Residential | active |
| 5 | 2180 Dallas Road, Victoria | R2901238 | $5,200,000 | Residential | active |
| 6 | 4650 Lakeshore Drive, Kelowna | R2901239 | $3,950,000 | Residential | active |
| 7 | 725 Eyremount Drive, West Vancouver | R2901240 | $15,900,000 | Residential | pending |
| 8 | 1810 Caulfeild Cove Trail, West Vancouver | R2901241 | $7,250,000 | Residential | active |
| 9 | 560 Tsawwassen Beach Road, Tsawwassen | R2901242 | $3,200,000 | Residential | active |
| 10 | 2305 Queens Avenue, West Vancouver | R2901243 | $2,800,000 | Condo/Apartment | sold |

#### Seattle USA (10)

| # | Address | MLS# | Price | Type | Status |
|---|---------|-------|-------|------|--------|
| 11 | 4512 92nd Avenue SE, Mercer Island | NW2401001 | $5,750,000 | Residential | active |
| 12 | 1823 Broadmoor Drive E, Seattle | NW2401002 | $4,950,000 | Residential | active |
| 13 | 3407 W McGraw Street, Seattle (Magnolia) | NW2401003 | $3,850,000 | Residential | active |
| 14 | 10240 NE 24th Street, Bellevue | NW2401004 | $6,200,000 | Residential | active |
| 15 | 935 Harvard Avenue E, Seattle (Capitol Hill) | NW2401005 | $1,850,000 | Townhouse | active |
| 16 | 714 W Highland Drive, Seattle (Queen Anne) | NW2401006 | $4,100,000 | Residential | active |
| 17 | 6815 SE 75th Place, Mercer Island | NW2401007 | $7,800,000 | Residential | pending |
| 18 | 2290 Parkside Drive E, Seattle (Madison Park) | NW2401008 | $3,450,000 | Residential | active |
| 19 | 15620 SE 56th Street, Bellevue (Somerset) | NW2401009 | $4,500,000 | Residential | active |
| 20 | 4019 E Madison Street, Seattle | NW2401010 | $1,650,000 | Condo/Apartment | sold |

#### Status Distribution

| Status | BC | Seattle | Total |
|--------|-----|---------|-------|
| Active | 8 | 8 | 16 |
| Pending | 1 | 1 | 2 |
| Sold | 1 | 1 | 2 |

#### Property Type Distribution

| Type | Count |
|------|-------|
| Residential | 16 |
| Condo/Apartment | 2 |
| Townhouse | 2 |

---

## 4. Listing Photos (seed-luxury-listings.mjs)

**5 photos per listing** (1 exterior + 4 interior) = 100 photos per realtor.

All photos sourced from Unsplash (free, no auth). Stored in `listing_photos` table.

| Role | Caption | Sort Order | Description |
|------|---------|------------|-------------|
| `exterior` | Front Exterior | 0 | Same as listing hero_image_url |
| `living` | Living Room | 1 | Interior living/great room |
| `kitchen` | Kitchen | 2 | Kitchen/cooking area |
| `bedroom` | Primary Bedroom | 3 | Master/primary bedroom |
| `outdoor` | Outdoor Living | 4 | Patio/deck/pool/garden |

Photos are style-matched to the exterior (e.g., mountain chalet gets rustic interiors, modern glass gets minimalist interiors).

---

## 5. Showings (seed-demo-users.mjs)

**2 showings per active listing** (1 past confirmed + 1 future requested).

#### Buyer Agents (used for showing requests)

| Name | Phone | Email | Brokerage |
|------|-------|-------|-----------|
| Jennifer Park | +16045559001 | jpark@sutton.demo | Sutton |
| David Rodriguez | +16045559002 | drodriguez@remax.demo | RE/MAX |
| Amanda Foster | +16045559003 | afoster@royallepage.demo | Royal LePage |
| Ryan Nakamura | +16045559004 | rnakamura@kw.demo | Keller Williams |
| Michelle Leung | +16045559005 | mleung@century21.demo | Century 21 |
| Brandon Stewart | +16045559006 | bstewart@exp.demo | eXp Realty |

#### Showing Pattern

| Type | Status | Timing | Notes |
|------|--------|--------|-------|
| Past | confirmed | 3-7 days ago, 2-6 PM | "Liked the property. Wants to bring partner." |
| Future | requested | 1-5 days out, 10:30 AM-2:30 PM | "First-time buyer client. Very interested." |

---

## 6. Newsletters & Events (seed-demo.mjs)

#### Email Sequences by Contact Phase

| Contact Phase | Emails Generated | Types |
|---------------|-----------------|-------|
| buyer_lead | 2 | welcome, neighbourhood_guide |
| buyer_active | 5+ | welcome, new_listing_alert, market_update, neighbourhood_guide, open_house_invite |
| buyer_under_contract | 3+ | welcome, market_update, home_anniversary |
| seller_lead | 2 | welcome, market_update |
| seller_active | 4+ | welcome, market_update, just_sold, open_house_invite |
| seller_under_contract | 3+ | welcome, market_update, just_sold |
| past_client | 3+ | welcome, home_anniversary, market_update |
| dormant | 2-3 | welcome, neighbourhood_guide, market_update |

#### Event Types Seeded

| Event Type | Description |
|------------|-------------|
| `delivered` | Email successfully delivered |
| `opened` | Email opened by contact |
| `clicked` | Link clicked in email |
| `bounced` | Email bounced (rare) |

---

## 7. Idempotency & Cleanup

All seed scripts are **idempotent** — safe to run multiple times.

| Script | Cleanup Strategy |
|--------|-----------------|
| `seed-demo.mjs` | Deletes by phone prefix `+1604555` before inserting |
| `seed-demo-users.mjs` | Skips if realtor already has listings |
| `seed-luxury-listings.mjs` | Deletes by MLS number + phone prefix before inserting |
| `seed-complete-demo.mjs` | Updates existing listings (upsert) |

**Manual cleanup query:**
```sql
-- Delete all demo contacts
DELETE FROM contacts WHERE phone LIKE '+1604555%';

-- Delete all demo listings by MLS prefix
DELETE FROM listings WHERE mls_number LIKE 'R290%' OR mls_number LIKE 'NW240%';
DELETE FROM listings WHERE mls_number LIKE 'V41%' OR mls_number LIKE 'V42%' OR mls_number LIKE 'V43%';
```

---

## 8. Price Range Summary

| Segment | Range | Count | Avg Price |
|---------|-------|-------|-----------|
| Ultra-luxury | $7M+ | 5 | $11.3M |
| Luxury | $4M-$7M | 7 | $5.3M |
| Premium | $2M-$4M | 8 | $3.0M |
| Mid-market | $800K-$2M | 7 | $1.3M |
| Entry-level | <$800K | 5 | $573K |

**Total portfolio value (all listings):** ~$130M across all demo accounts
