<!-- docs-audit-reviewed: 2026-04-25 --paragon-pdf-import -->
<!-- docs-audit: src/components/listings/*, src/actions/listings.ts -->
# Realtors360 — Comparative Gap Analysis

**Design Document vs. Current Website Implementation**

Version 1.0 — March 2026 | Prepared by: Realtors360 Product Team | CONFIDENTIAL

---

## 1. Executive Summary

This report compares the Realtors360 Realtor Workflow Design Document (12-phase BC realtor listing lifecycle) against the current Realtors360 CRM website implementation. It identifies what has been built, what is partially implemented, and what gaps remain.

### 1.1 High-Level Scorecard

| Phase | Built | Partial | Missing | Score |
|-------|:-----:|:-------:|:-------:|:-----:|
| 1. Pre-Listing & Prospecting | 2 | 1 | 3 | 35% |
| 2. Listing Agreement & Intake | 5 | 1 | 1 | 75% |
| 3. Data Enrichment | 4 | 1 | 0 | **90%** |
| 4. CMA & Pricing Strategy | 3 | 2 | 1 | 65% |
| 5. Form Preparation | 4 | 1 | 0 | **85%** |
| 6. E-Signature | 1 | 2 | 1 | 40% |
| 7. MLS Preparation | 3 | 1 | 2 | 55% |
| 8. MLS Submission | 0 | 1 | 3 | 10% |
| 9. Marketing & Showings | 4 | 2 | 2 | 60% |
| 10. Offer Management | 0 | 0 | 6 | **0%** |
| 11. Contract-to-Close | 0 | 0 | 7 | **0%** |
| 12. Post-Closing | 0 | 1 | 4 | 10% |
| **TOTAL** | **26** | **13** | **30** | **44%** |

### 1.2 Summary

- The CRM has strong foundations in Phases 2–5 (intake, enrichment, forms) — the core listing setup workflow is well-built
- Showing management (Phase 9) is robust with Twilio SMS/WhatsApp integration and Google Calendar
- Content generation via Claude AI and Kling AI is a bonus feature not in the design document
- Major gaps exist in Phases 10–12 (offer management, contract-to-close, post-closing) — the sell-side workflow is not yet built
- Phase 8 (MLS submission) has no direct Paragon integration — only data preparation
- The 8-phase workflow in the CRM maps to Phases 1–8 of the 12-phase design document; Phases 9–12 are handled outside the workflow stepper

---

## 2. Phase 1 — Pre-Listing & Prospecting

> Status Key: ✅ Fully Built · ⚠️ Partially Built · ❌ Not Built

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| Lead Generation | SOI referrals, farming, online leads, open houses | ❌ Missing | No lead gen or prospecting tools. Contacts are created manually. |
| Discovery Call Tracking | Log call notes, motivation, timeline, mortgage status | ⚠️ Partial | Contacts have notes field but no structured discovery fields (motivation, timeline, mortgage). |
| Pre-Listing Research | BC Assessment lookup, LTSA, prior MLS, neighbourhood | ✅ Built | Enrichment system covers BC Assessment, LTSA, geocoding, ParcelMap. Neighbourhood endpoint exists. |
| CMA Report Generation | 3–5 comps, price/sqft, adjustments | ✅ Built | Phase 3 (CMA) in workflow with comparable data fields and notes. |
| Pre-Listing Package | Agent bio, testimonials, marketing plan, FAQ | ❌ Missing | No pre-listing package generator. |
| Listing Presentation | CMA deck, seller net sheet, commission structure | ❌ Missing | No seller net sheet calculator or presentation builder. |

---

## 3. Phase 2 — Listing Agreement & Intake

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| DORTS Form | Agency disclosure, must be FIRST form | ✅ Built | Tracked in forms_status, generated via Realtors360 Python server. |
| Privacy Notice (PNC) | PIPA consent before collecting personal info | ✅ Built | PRIVACY form key exists, generated via form engine. |
| FINTRAC ID Verification | 3 methods: photo ID, credit file, dual-process | ✅ Built | seller_identities table: name, DOB, citizenship, ID type/number/expiry, occupation. |
| Multiple Listing Contract | Listing agreement with price, duration, commission | ✅ Built | MLC form generated; listings table stores list_price, list_duration, commissions. |
| Property Disclosure (PDS) | 5 sections: land, services, building, general, defects | ✅ Built | PDS form key tracked; PNDS alternative not yet implemented. |
| Strata Documents | Form B, bylaws, depreciation report, minutes | ⚠️ Partial | strata JSONB field in enrichment; STRATA doc_type exists. No structured strata document collection workflow. |
| Multiple Sellers | Each seller needs separate FINTRAC ID | ✅ Built | seller_identities supports multiple sellers per listing with sort_order. |

---

## 4. Phase 3 — Data Enrichment

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| BC Geocoder | Address → lat/lng, locality, confidence | ✅ Built | runGeocoderEnrichment() calls geocoder.api.gov.bc.ca REST API. |
| ParcelMap BC | Coordinates → PID, plan number, municipality | ✅ Built | runParcelMapEnrichment() calls openmaps.gov.bc.ca WFS API. |
| LTSA Title Search | PID → owner, title number, charges | ✅ Built | setLTSAData() for manual entry. Stored in listing_enrichment.ltsa JSONB. |
| BC Assessment | Assessment values, year built, lot size, zoning | ✅ Built | setAssessmentData() for manual entry with all fields (value, year, beds, baths, etc.). |
| Owner Name Validation | Fuzzy match LTSA owner vs. seller identity (Jaro-Winkler, 0.85) | ⚠️ Partial | fuzzy-match.ts exists but not confirmed as actively wired into the enrichment flow validation step. |
| Enrichment Status Tracking | Per-source status: pending/running/done/fail/manual | ✅ Built | enrich_status JSONB field tracks each source independently. |

---

## 5. Phase 4 — CMA & Pricing Strategy

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| Comparable Analysis | 3–5 recent sales, active/expired, price adjustments | ✅ Built | CMA phase exists with cma_low, cma_high, suggested_price, cma_notes fields. |
| Neighbourhood Comps | Nearby sold properties with price/sqft, DOM | ✅ Built | Neighbourhood API endpoint returns mock comps. Button on listing detail. |
| List Price Confirmation | Seller agrees on price, price lock mechanism | ✅ Built | list_price and price_locked fields on listings table. Phase 4 (Pricing) in workflow. |
| Marketing Tier Selection | Standard / Enhanced / Premium | ⚠️ Partial | marketing_tier field exists in DB. UI may not yet expose tier selection in pricing phase. |
| Seller Net Sheet | Estimated seller proceeds after costs | ❌ Missing | No net sheet calculator implemented. |
| Price Range Warning | Alert if price outside CMA range | ⚠️ Partial | CMA range fields exist but no automatic validation/warning when price is outside range. |

---

## 6. Phase 5 — Form Preparation

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| 12 BCREA Forms | DORTS, MLC, PDS, FINTRAC, Privacy, C3, DRUP, MLS Input, Marketing Auth, Agency, C3 Conf, Fair Housing | ✅ Built | All 12 form keys exist in forms_status JSONB. Generated via /api/forms/generate. |
| CDM Data Model | Flat payload combining listing + seller + enrichment + config | ✅ Built | cdm-mapper.ts transforms normalized DB data into CDM format. |
| Python Form Engine | Realtors360 server renders HTML forms from CDM | ✅ Built | POST to REALTORS360_URL/api/form/html. Proxied via /api/forms/generate. |
| Form Status Tracking | Per form: pending → generated → ready → signed | ✅ Built | forms_status JSONB on listings tracks each form independently. |
| Agent Review Step | Agent reviews pre-filled forms for accuracy before signing | ⚠️ Partial | Forms are generated and viewable but no explicit review/approve UI step before routing to e-sign. |

---

## 7. Phase 6 — E-Signature

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| DocuSign Integration | Route forms for electronic signature | ⚠️ Partial | envelopes JSONB field exists for tracking. PhaseESign component exists. No confirmed DocuSign API integration live. |
| Seller Signing Package | MLC, PDS, Privacy, Marketing Auth, Agency, Fair Housing | ⚠️ Partial | Package concept exists in UI but actual envelope routing not confirmed live. |
| Agent Signing Package | DORTS, FINTRAC record, C3 Conf | ❌ Missing | No separate agent package workflow. |
| Multiple Seller Routing | Each seller gets separate signing invitation | ❌ Missing | Not implemented — multiple sellers supported in data but not in e-sign routing. |

---

## 8. Phase 7 — MLS Preparation

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| Photo Management | Professional photos, drone, virtual tour, floor plans | ⚠️ Partial | mls_photos array field exists. Hero image upload works. No multi-photo ordering or virtual tour link field. |
| MLS Public Remarks | Max 500 chars, consumer-facing, no agent info | ✅ Built | Claude AI generates remarks via /api/mls-remarks. mls_remarks field on listings. |
| REALTOR Remarks | Max 500 chars, agent-only, showing instructions | ✅ Built | mls_realtor_remarks field. AI generates both remark types together. |
| AI Remarks Generation | Claude generates drafts from listing context | ✅ Built | Claude Sonnet generates remarks with real estate system prompt. Agent can edit. |
| MLS Data Validation | Verify all required MLS fields are complete | ❌ Missing | No pre-submission validation checklist for MLS field completeness. |
| Virtual Tour Link | Unbranded virtual tour URL for MLS | ❌ Missing | No virtual tour URL field in the listings schema. |

---

## 9. Phase 8 — MLS Submission

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| Paragon MLS Integration | Direct submit to board MLS system | ❌ Missing | No Paragon API integration. Phase 8 exists as a workflow step but is manual. |
| Board Contract Upload | Send signed listing contract to board | ❌ Missing | No automated upload to board. |
| MLS Status Tracking | FA → Active → Pending → Closed statuses | ⚠️ Partial | mls_status field exists on listings. Not synced with Paragon. |
| 3-Day Submission Rule | Must submit within 3 days of effective date | ❌ Missing | No deadline tracking or alerts for submission timing. |
| Agent Modify Access | Edit remarks/non-contractual fields after activation | ❌ Missing | Not applicable without Paragon integration. |

---

## 10. Phase 9 — Marketing & Showing Management

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| Showing Request Workflow | Buyer agent request → calendar check → SMS seller → confirm/deny | ✅ Built | Full workflow: form submit → Google Calendar check → Twilio SMS/WhatsApp to seller → webhook confirms. |
| Lockbox Code Delivery | Share lockbox code only upon confirmation | ✅ Built | Lockbox code sent to buyer agent via Twilio only after seller confirms. |
| Communication Timeline | All messages logged per showing | ✅ Built | communications table logs SMS/WhatsApp/email/notes. Timeline UI on showing detail. |
| Google Calendar Sync | Events synced for availability and scheduling | ✅ Built | Full Google Calendar integration: fetch events, check busy, create events. |
| Open House Management | Schedule, publish, sign-in, DORTS distribution, follow-up | ❌ Missing | No open house specific features (scheduling, sign-in sheets, follow-up). |
| Marketing Campaigns | Social media, email blasts, yard signs, feature sheets | ❌ Missing | No marketing campaign management. Content Engine generates AI media but no campaign distribution. |
| Showing Analytics | Activity reports, feedback tracking, volume metrics | ⚠️ Partial | Dashboard shows showing counts. No buyer agent feedback collection or detailed analytics. |
| Seller Activity Reports | Regular reports on showing activity and feedback | ⚠️ Partial | Seller is notified per showing via SMS. No aggregated activity report feature. |

---

## 11. Phase 10 — Offer Management & Negotiation

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| Offer Tracking | Record and track all written offers | ❌ Missing | No offers table or tracking system. |
| Offer Presentation Rules | Present all offers to seller in order received | ❌ Missing | Not implemented. |
| DRPO Management | Set offer submission deadline, notify agents | ❌ Missing | Not implemented. |
| DMOP Form | Disclosure of Multiple Offers Presented | ❌ Missing | Not implemented. |
| Counter-Offer Workflow | Written counters with deadlines, negotiation tracking | ❌ Missing | Not implemented. |
| HBRP Tracking | 3 business day rescission period, 0.25% fee calculation | ❌ Missing | Not implemented. |

---

## 12. Phase 11 — Contract-to-Close

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| Subject Period Tracking | Track subject conditions with deadlines | ❌ Missing | No subject tracking system. Stakeholders JSONB exists but no subject workflow. |
| Subject Removal Form | Buyer submits written removal, contract becomes firm | ❌ Missing | Not implemented. |
| Deposit Tracking | 5% deposit due within 24h of subject removal | ❌ Missing | Not implemented. |
| FINTRAC Buyer Records | Buyer ID, Receipt of Funds, third-party determination | ❌ Missing | FINTRAC only implemented for sellers currently. |
| Five Key Dates | Acceptance, subject removal, completion, possession, adjustment | ❌ Missing | Only possession_date field exists. No completion/adjustment date tracking. |
| Conveyancing Coordination | Lawyer instructions, statement of adjustments, title transfer | ⚠️ Partial | ConveyancingPackButton exists for download. Stakeholders JSONB stores lawyer info. No active coordination workflow. |
| MLS Status Update | Update to Pending after subject removal | ❌ Missing | mls_status field exists but no automated status change on subject removal. |

---

## 13. Phase 12 — Post-Closing

| Feature | Design Document Spec | Status | Current Implementation |
|---------|---------------------|--------|----------------------|
| Commission Tracking | Calculate, split, track disbursement | ❌ Missing | Commission rates stored but no disbursement tracking. |
| File Archival | Store all documents, FINTRAC 5yr + BCFSA 7yr retention | ⚠️ Partial | listing_documents table stores files. No retention policy enforcement or archival workflow. |
| Client Follow-Up | Thank you, testimonial request, referral ask | ❌ Missing | Not implemented. |
| CRM Nurture Program | Anniversary, market updates, birthday, annual valuation | ❌ Missing | No automated nurture sequences or drip campaigns. |
| Performance Tracking | Production metrics, commission analysis, marketing ROI | ❌ Missing | No agent performance dashboard or analytics. |

---

## 14. Bonus Features (Not in Design Document)

These features exist in the website but are **not covered** by the design document. They should be considered for inclusion in future document revisions.

| Feature | Status | Implementation |
|---------|--------|---------------|
| Content Engine | ✅ Bonus | Full AI content pipeline: Claude generates prompts → Kling AI generates 4K video + 8K images for social media. |
| Instagram Captions | ✅ Bonus | Claude AI generates Instagram-ready captions with hashtags per listing. |
| Hero Image Management | ✅ Bonus | Upload and manage hero images per listing for content generation. |
| Glassmorphism UI | ✅ Bonus | Full Realtors360 design system with glass effects, gradient palette, Bricolage Grotesque font. |
| WhatsApp Integration | ✅ Bonus | Dual-channel: both SMS and WhatsApp via Twilio with seller preference tracking. |

---

## 15. Compliance Gap Analysis

### 15.1 FINTRAC Compliance

| Obligation | Status | Implementation |
|------------|--------|---------------|
| Seller ID Records | ✅ Built | seller_identities table with all required fields. |
| Buyer ID Records | ❌ Missing | No buyer identity collection. Only seller side built. |
| Receipt of Funds Record | ❌ Missing | Not implemented. |
| Large Cash Transaction Report | ❌ Missing | Not implemented. |
| Suspicious Transaction Report | ❌ Missing | Not implemented. |
| 5-Year Record Retention | ❌ Missing | Records stored but no retention policy or alerts. |

### 15.2 CASL Compliance

| Obligation | Status | Implementation |
|------------|--------|---------------|
| Consent Collection | ✅ Built | C3 form key exists in forms_status. |
| Unsubscribe Mechanism | ❌ Missing | No email marketing system with unsubscribe. |
| Consent Expiry Tracking | ❌ Missing | Not implemented. |

### 15.3 PIPA Compliance

| Obligation | Status | Implementation |
|------------|--------|---------------|
| Privacy Notice | ✅ Built | PRIVACY form key in forms_status, generated via form engine. |
| Opt-Out Boxes | ❌ Missing | Form exists but no opt-out preference tracking in the system. |

---

## 16. Priority Recommendations

### 16.1 Priority 1 — Critical Gaps (Phases 10–11)

These phases represent the core sell-side transaction workflow. Without them, agents must manage offers and closing outside the system.

- Build Offer Management module: offers table, offer tracking, presentation workflow, counter-offers
- Implement HBRP (Home Buyer Rescission Period) tracking with countdown timer and fee calculator
- Build Subject Period tracking with condition deadlines and removal workflow
- Add Five Key Dates management (acceptance, subject removal, completion, possession, adjustment)
- Implement deposit tracking and trust account integration

### 16.2 Priority 2 — Compliance Gaps

Missing compliance features expose agents to regulatory risk.

- Extend FINTRAC to buyer side: buyer identity records and Receipt of Funds
- Add record retention policy enforcement with automated alerts
- Build Suspicious Transaction Report workflow
- Implement CASL consent expiry tracking and unsubscribe mechanism

### 16.3 Priority 3 — Enhancement Gaps (Phases 1, 8, 12)

These features improve the agent experience but the system is functional without them.

- Phase 1: Add seller net sheet calculator and listing presentation builder
- Phase 8: Explore Paragon MLS API integration (if available) or improve manual submission workflow
- Phase 12: Build post-closing workflow with commission tracking and client nurture automation
- Add open house management features (scheduling, sign-in, follow-up)
- Build marketing campaign management and distribution tools

### 16.4 Priority 4 — Design Document Updates

The design document should be updated to reflect bonus features already built:

- Add Content Engine section: AI-powered video/image generation for social media marketing
- Add WhatsApp as a communication channel alongside SMS
- Document the Realtors360 glassmorphism design system
- Add Claude AI integration for remarks generation and content creation
- Document Kling AI integration for property video/image generation

---

## 17. Feature Coverage Summary

| Category | Built | Partial | Missing | Coverage |
|----------|:-----:|:-------:|:-------:|:--------:|
| Core Workflow (Phases 1–8) | 22 | 9 | 11 | 52% |
| Sell-Side (Phases 9–12) | 4 | 4 | 19 | 15% |
| FINTRAC Compliance | 1 | 0 | 5 | 17% |
| CASL Compliance | 1 | 0 | 2 | 33% |
| PIPA Compliance | 1 | 0 | 1 | 50% |
| Bonus (Content Engine + AI) | 5 | 0 | 0 | 100% |
| **OVERALL TOTAL** | **34** | **13** | **38** | **40%** |

The CRM is approximately 40% complete relative to the full design document specification. The listing setup workflow (Phases 1–8) is the strongest area at ~52% coverage. The sell-side transaction workflow (Phases 9–12) represents the largest opportunity for development.

---

*End of Report*
