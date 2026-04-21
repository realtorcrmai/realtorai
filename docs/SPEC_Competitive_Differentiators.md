<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- docs-audit: docs/SPEC_*, docs/PLAN_*, src/actions/*, src/components/*, src/lib/* -->
# Competitive Differentiators — Complete Specification

**Version:** 1.1
**Date:** 2026-04-20
**Status:** Draft — Design Document
**Author:** Rahul Mittal + Claude

## Related Specs
- `docs/MASTER_IMPLEMENTATION_PLAN.md`
- `docs/SPEC_Prospect_360.md`
- `docs/ANALYSIS_Final_Gap_Report.md`
- `docs/MARKET_RESEARCH_Global_Realtor_Needs_2026.md`
- `docs/GTM_Strategy_Realtors360.md`

---

## Executive Summary

This specification defines **4 game-changing features** that no competing real estate CRM offers. These are not incremental improvements — they are fundamentally new capabilities drawn from cross-industry innovation (B2B sales rooms, healthcare patient portals, enterprise relationship intelligence, autonomous AI agents).

The real estate CRM market splits into two failing camps:
1. **Legacy CRMs** (Follow Up Boss, Sierra, Wise Agent) — good lead management, zero AI, terrible UX
2. **Expensive all-in-ones** (kvCORE, BoomTown, CINC, Lofty) — bloated, overpriced, stagnant

Nobody occupies the middle ground of **affordable, AI-native, full-lifecycle CRM with world-class UX**. These 4 features stake that claim.

| # | Feature | Novelty | Competitors | Build Effort |
|---|---------|---------|-------------|-------------|
| 1 | Commission Value Proof Engine | No CRM has this | 0 / 10 CRMs | Medium (2-3 weeks) |
| 2 | Client Deal Portal | Only 2 startups (partial) | 0 / 10 CRMs | High (4-6 weeks) |
| 3 | Relationship Graph Intelligence | Cloze has ~30% of this | 1 / 10 CRMs (partial) | High (4-6 weeks) |
| 4 | Autonomous Transaction Coordinator | ListedKit "Ava" does ~15% | 0 / 10 CRMs | Very High (6-8 weeks) |

**Key data points driving this design:**
- 82-87% of real estate business comes from repeat/referral (NAR) — yet every CRM treats contacts as a flat list
- 15.1% of deals fall through (Aug 2025, record high) — no CRM helps prevent this
- Post-NAR settlement, agents must justify their 2.5-3% fee — no CRM generates value proof
- Agents spend 30% of their time on transaction coordination — no CRM automates this
- FSBO homes sell for $65,000 less than agent-assisted — agents need data to prove this

---

## Table of Contents

1. [Feature 1: Commission Value Proof Engine](#feature-1-commission-value-proof-engine)
2. [Feature 2: Client Deal Portal](#feature-2-client-deal-portal)
3. [Feature 3: Relationship Graph Intelligence](#feature-3-relationship-graph-intelligence)
4. [Feature 4: Autonomous Transaction Coordinator Agent](#feature-4-autonomous-transaction-coordinator-agent)
5. [Database Schema](#database-schema)
6. [Implementation Order](#implementation-order)
7. [Success Criteria](#success-criteria)

---

# Feature 1: Commission Value Proof Engine

## Problem Statement

After the NAR settlement (August 2024), buyer agents must sign written agreements specifying exact compensation before touring homes. Commission rates actually *rose* to 5.44% (from 5.32%) — agents who articulate their value are thriving. Yet **zero CRMs** generate a client-facing report showing what the agent actually did.

Today, agents send a static commission invoice: "3% of $850,000 = $25,500." The client sees a number with no context. Meanwhile:
- Average agent invests **40 hours per transaction** (NAR)
- Average marketing spend is **$1,000-$10,000/listing** (WebFX)
- Agent-assisted homes sell for **$65,000 more** than FSBO ($425K vs $360K) — an 18% gap (NAR 2025)
- FSBO market share hit an **all-time low of 5%** (NAR 2025)

The data proves agents deliver massive value. They just have no tool to show it.

## Overview

The Commission Value Proof Engine auto-generates a branded, data-driven report showing everything the agent did for the client. It pulls from data already tracked in Realtors360 — showings, communications, content generation, workflow phases, marketing activities — and renders it as a professional PDF or interactive web page.

**Route:** `/reports/value-proof/[dealId]` (agent view) + `/portal/[token]/value-report` (client-facing)
**Trigger:** Auto-generated when a deal moves to "Closed" status, also available on-demand

---

## User Stories

### US-1: Auto-Generated Value Report

**As a** realtor,
**I want** a professional report auto-generated when I close a deal,
**So that** my client sees the full scope of what I did and feels confident in the commission paid.

**Acceptance Criteria:**
- [ ] Report auto-generates when deal status → "closed"
- [ ] Agent can also trigger manually from deal detail page ("Generate Value Report" button)
- [ ] Report includes all 8 sections (see Report Sections below)
- [ ] Data is pulled automatically from existing CRM records — no manual entry required
- [ ] Agent can preview and edit before sharing with client
- [ ] Report renders as branded PDF (download) and interactive web page (shareable link)
- [ ] Web page link expires after 90 days (configurable)
- [ ] Report includes agent's headshot, brokerage logo, and contact info

**UI Mockup — Agent Preview:**
```
┌─────────────────────────────────────────────────────────────┐
│  📊 Value Report — 1234 Oak Street, Vancouver               │
│  Client: Sarah & Mike Chen  ·  Closed: April 10, 2026       │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  YOUR RESULTS AT A GLANCE                               │ │
│  │                                                          │ │
│  │  Sale Price        Days on Market    vs. Area Average    │ │
│  │  $892,000          12 days           +$47,000 (+5.6%)    │ │
│  │                                                          │ │
│  │  Marketing Views   Showings          Hours Invested      │ │
│  │  14,200            23                38.5 hrs             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Edit Report]  [Preview PDF]  [Share with Client]           │
└─────────────────────────────────────────────────────────────┘
```

---

### US-2: Report Sections (8 Sections)

**As a** realtor,
**I want** the report to cover every aspect of my work,
**So that** the client understands the full value delivered.

#### Section 1: Results Summary
```
┌─────────────────────────────────────────────────────────────┐
│  🏆 RESULTS SUMMARY                                         │
│                                                              │
│  Listed at:        $879,000                                  │
│  Sold at:          $892,000  (+$13,000 over asking)          │
│  Days on market:   12 days   (area avg: 34 days)             │
│  vs. comparable:   +$47,000  above recent comps              │
│                                                              │
│  "Homes sold with a licensed agent sell for $65,000 more     │
│   than FSBO homes on average." — NAR 2025                    │
└─────────────────────────────────────────────────────────────┘
```
**Data sources:** `listings.list_price`, `listings.sold_price`, `listings.sold_date`, `listings.created_at`, neighborhood comps from `listing_enrichment.assessment`

#### Section 2: Marketing Investment
```
┌─────────────────────────────────────────────────────────────┐
│  📣 MARKETING YOUR PROPERTY                                  │
│                                                              │
│  Professional photography        ✅  24 photos               │
│  Virtual tour / 3D walkthrough   ✅  Matterport              │
│  AI-generated video              ✅  4K property video        │
│  MLS listing                     ✅  Listed day 1             │
│  Social media campaigns          ✅  3 posts, 8,400 reach     │
│  Email campaigns                 ✅  Sent to 234 buyers       │
│  Open houses                     ✅  2 events, 47 visitors    │
│  Print marketing                 ✅  Flyers, feature sheets   │
│                                                              │
│  Total marketing impressions:    14,200                       │
│  Estimated marketing value:      $3,800                       │
└─────────────────────────────────────────────────────────────┘
```
**Data sources:** `media_assets` (photos, videos), `prompts` (AI content), `newsletters` (email campaigns), open house records, `communications` (social posts)

#### Section 3: Showing Management
```
┌─────────────────────────────────────────────────────────────┐
│  🏠 SHOWING ACTIVITY                                         │
│                                                              │
│  Total showing requests:   31                                │
│  Showings completed:       23                                │
│  Showing feedback collected: 19 (83%)                        │
│  Average time to confirm:  18 minutes                        │
│                                                              │
│  Timeline:                                                    │
│  Week 1: ████████████ 14 showings                            │
│  Week 2: ████████   9 showings                               │
│  Week 3: Offer accepted — showings stopped                   │
└─────────────────────────────────────────────────────────────┘
```
**Data sources:** `appointments` (all showing records), `communications` (confirmation messages)

#### Section 4: Communication & Responsiveness
```
┌─────────────────────────────────────────────────────────────┐
│  💬 COMMUNICATION LOG                                        │
│                                                              │
│  Total touchpoints:        84                                │
│  Calls:                    12                                │
│  Emails:                   34                                │
│  Text messages:            28                                │
│  In-person meetings:       10                                │
│                                                              │
│  Average response time:    14 minutes                        │
│  Fastest response:         2 minutes                         │
│  Weekend/evening responses: 23 (27%)                         │
└─────────────────────────────────────────────────────────────┘
```
**Data sources:** `communications` table (channel, direction, created_at)

#### Section 5: Negotiation & Deal Protection
```
┌─────────────────────────────────────────────────────────────┐
│  🤝 NEGOTIATION OUTCOMES                                     │
│                                                              │
│  Offers received:          4                                 │
│  Competing offer leverage:  Used 3 offers to drive up price  │
│  Final price vs. initial:  +$13,000 above asking             │
│  Inspection issues resolved: 3 items negotiated              │
│  Conditions managed:       5 (financing, inspection,         │
│                            strata, insurance, title)         │
│  Deposit secured:          $45,000 within 24 hours           │
│                                                              │
│  Deal protection events:                                     │
│  · Financing deadline extended by 3 days (lender delay)      │
│  · Inspection repair credit negotiated ($2,800 saved)        │
│  · Strata document issue flagged and resolved pre-closing    │
└─────────────────────────────────────────────────────────────┘
```
**Data sources:** `deals` (offers, parties), `deal_checklist` (conditions), agent notes in `communications`

#### Section 6: Time Investment
```
┌─────────────────────────────────────────────────────────────┐
│  ⏱️  TIME INVESTED                                           │
│                                                              │
│  Total hours:              38.5 hours                        │
│                                                              │
│  Listing preparation:      8.0 hrs  ██████████               │
│  Marketing & content:      6.5 hrs  ████████                 │
│  Showing coordination:     7.0 hrs  █████████                │
│  Communication:            5.5 hrs  ███████                  │
│  Negotiation:              4.0 hrs  █████                    │
│  Paperwork & compliance:   5.0 hrs  ██████                   │
│  Closing coordination:     2.5 hrs  ███                      │
│                                                              │
│  At $150/hr professional rate: $5,775 equivalent             │
│  Commission paid: $22,300 (2.5%)                             │
│  Value delivered: $47,000 above-market sale price            │
│  Net ROI: $24,700 net gain for the client                    │
└─────────────────────────────────────────────────────────────┘
```
**Data sources:** Computed from activity timestamps across `communications`, `appointments`, `deal_checklist`, `workflow_phases`. Time tracking is estimated from activity density (configurable per-agent override).

#### Section 7: Compliance & Documentation
```
┌─────────────────────────────────────────────────────────────┐
│  📋 DOCUMENTS & COMPLIANCE                                   │
│                                                              │
│  Documents prepared:       12                                │
│  ✅ DORTS (Disclosure of Representation)                     │
│  ✅ MLC (Multiple Listing Contract)                          │
│  ✅ PDS (Property Disclosure Statement)                      │
│  ✅ FINTRAC Identity Verification                            │
│  ✅ Privacy Notice & Consent                                 │
│  ✅ Agency Disclosure                                        │
│  ✅ Contract of Purchase & Sale                              │
│  ✅ Amendment — Inspection Credit                            │
│  ✅ Amendment — Completion Date                              │
│  ✅ Subject Removal                                          │
│  ✅ Property Transfer Tax Return                             │
│  ✅ Title Documents                                          │
│                                                              │
│  Regulatory compliance: FINTRAC ✅  BCREA ✅  BCFSA ✅        │
└─────────────────────────────────────────────────────────────┘
```
**Data sources:** `listing_documents`, `seller_identities`, `forms_status` JSONB on listings

#### Section 8: Market Context
```
┌─────────────────────────────────────────────────────────────┐
│  📈 MARKET CONTEXT                                           │
│                                                              │
│  Your sale vs. the market:                                   │
│                                                              │
│  Metric              Your Sale    Area Average    Delta      │
│  ─────────────────   ──────────   ────────────   ──────     │
│  Sale-to-list ratio  101.5%       97.2%          +4.3%      │
│  Days on market      12           34             -22 days   │
│  Price per sqft      $623         $589           +$34       │
│                                                              │
│  "Your home sold 22 days faster and for 4.3% more than       │
│   comparable properties in this neighborhood."               │
└─────────────────────────────────────────────────────────────┘
```
**Data sources:** `listing_enrichment.assessment`, neighborhood comps, MLS data

---

### US-3: Sharing & Distribution

**As a** realtor,
**I want to** share the report with my client in multiple formats,
**So that** they can reference it and share with friends considering selling.

**Acceptance Criteria:**
- [ ] "Share with Client" button sends branded email with report link
- [ ] PDF download with agent branding (headshot, logo, colors)
- [ ] Shareable web link with expiry (90 days default)
- [ ] Client can forward/share the link — it acts as a referral touchpoint
- [ ] Footer includes: "Thinking of buying or selling? [Agent Name] can help." with contact info
- [ ] Track when client opens the report (via `value_report_events`)

---

### US-4: Pre-Transaction Value Proposition

**As a** realtor,
**I want to** show a prospective seller what I did for my last 3 clients,
**So that** I can win the listing with data, not just promises.

**Acceptance Criteria:**
- [ ] Agent can select 3-5 past reports to create a "Portfolio" view
- [ ] Portfolio shows aggregated stats: "Across 47 transactions, I sold homes for an average of $52K above market"
- [ ] Portfolio shareable as PDF or web link
- [ ] Agent can choose which reports to include (privacy — only with client consent)
- [ ] Works as listing presentation supplement

**UI Mockup — Portfolio Summary:**
```
┌─────────────────────────────────────────────────────────────┐
│  📊 Agent Performance Portfolio — Jane Smith, REALTOR®       │
│                                                              │
│  47 Transactions  ·  $38.2M Total Volume  ·  Since 2019     │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ Avg Days   │  │ Avg Above  │  │ Client     │             │
│  │ on Market  │  │ Market     │  │ Rating     │             │
│  │   16       │  │  +$52K     │  │  4.9/5.0   │             │
│  │ (avg: 34)  │  │            │  │  (42 rev)  │             │
│  └────────────┘  └────────────┘  └────────────┘             │
│                                                              │
│  Recent Sales:                                               │
│  · 1234 Oak St — Sold $892K (+$47K) in 12 days             │
│  · 567 Elm Ave — Sold $1.1M (+$63K) in 8 days              │
│  · 890 Pine Rd — Sold $725K (+$38K) in 21 days             │
└─────────────────────────────────────────────────────────────┘
```

---

### US-5: Time Tracking (Lightweight)

**As a** realtor,
**I want** time tracking to be automatic, not manual,
**So that** I get accurate data without extra work.

**Acceptance Criteria:**
- [ ] System estimates time from activity patterns (no manual timer required)
- [ ] Time categories auto-assigned: showing coordination (appointment activity), communication (messages), marketing (content generation), paperwork (form activity), negotiation (offer activity)
- [ ] Agent can adjust/override any time estimate before report generation
- [ ] Default hourly rate configurable in agent settings ($100-$300/hr range)
- [ ] Time estimates use industry benchmarks as floor: min 4 hrs listing prep, min 2 hrs per showing coordination, etc.

**Time Estimation Algorithm:**
```typescript
// Estimate time from activity density
function estimateTimeInvested(dealId: string): TimeBreakdown {
  const activities = await getActivitiesByDeal(dealId);

  return {
    listing_prep: Math.max(4, countFormActivities(activities) * 0.5),
    marketing: Math.max(3, countContentActivities(activities) * 0.75),
    showings: Math.max(0, countShowings(activities) * 0.5 + countShowingComms(activities) * 0.1),
    communication: Math.max(2, countMessages(activities) * 0.05),
    negotiation: Math.max(2, countOfferActivities(activities) * 1.0),
    paperwork: Math.max(3, countDocuments(activities) * 0.4),
    closing: Math.max(1.5, countClosingActivities(activities) * 0.5),
  };
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Agent Dashboard                      │
│  /reports/value-proof/[dealId]                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │ Preview  │ │ Edit     │ │ Share with Client    │ │
│  └──────────┘ └──────────┘ └──────────────────────┘ │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│            Value Report Generator                     │
│  src/lib/value-proof/generator.ts                    │
│                                                       │
│  1. Pull data from 8 tables                           │
│  2. Compute metrics (time, ROI, comparisons)          │
│  3. Generate narrative with Claude AI                 │
│  4. Render as React component → PDF + HTML            │
└───────────────────────┬─────────────────────────────┘
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ PDF      │ │ Web Page │ │ Email    │
    │ @react-  │ │ /portal/ │ │ Resend   │
    │ pdf/     │ │ [token]  │ │ delivery │
    │ renderer │ │          │ │          │
    └──────────┘ └──────────┘ └──────────┘
```

**Data Flow:**
```
listings + appointments + communications + deals + deal_checklist
+ listing_documents + media_assets + listing_enrichment
                    │
                    ▼
        ValueReportGenerator.generate(dealId)
                    │
                    ├──→ computeMetrics()      → numbers, percentages, comparisons
                    ├──→ generateNarrative()    → Claude AI personalized summary
                    └──→ renderReport()         → React component tree
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                  PDF       HTML      Email
```

---

## File Structure

```
src/
├── app/
│   ├── (dashboard)/reports/
│   │   └── value-proof/
│   │       ├── page.tsx                   # List of all value reports
│   │       └── [dealId]/
│   │           └── page.tsx               # Report preview + edit + share
│   ├── portal/
│   │   └── [token]/
│   │       └── value-report/
│   │           └── page.tsx               # Client-facing report (public, token-gated)
│   └── api/
│       └── value-proof/
│           ├── route.ts                   # GET list, POST generate
│           ├── [id]/route.ts              # GET/PATCH report
│           ├── [id]/pdf/route.ts          # GET PDF download
│           └── [id]/share/route.ts        # POST share via email
├── actions/
│   └── value-proof.ts                     # Server actions (generate, update, share)
├── components/
│   └── value-proof/
│       ├── ValueReportPreview.tsx          # Full report renderer
│       ├── ValueReportEditor.tsx           # Edit overrides (time, notes)
│       ├── ValueReportPDF.tsx              # PDF-specific layout
│       ├── ResultsSummaryCard.tsx          # Section 1
│       ├── MarketingCard.tsx              # Section 2
│       ├── ShowingActivityCard.tsx        # Section 3
│       ├── CommunicationCard.tsx          # Section 4
│       ├── NegotiationCard.tsx            # Section 5
│       ├── TimeInvestmentCard.tsx         # Section 6
│       ├── ComplianceCard.tsx             # Section 7
│       ├── MarketContextCard.tsx          # Section 8
│       └── AgentPortfolioView.tsx         # Multi-deal portfolio
└── lib/
    └── value-proof/
        ├── generator.ts                   # Core report generation logic
        ├── metrics.ts                     # Metric computations
        ├── time-estimator.ts              # Activity → hours estimation
        ├── narrative.ts                   # Claude AI narrative generation
        └── pdf-renderer.ts                # React-PDF rendering
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/value-proof` | List all reports for realtor |
| `POST` | `/api/value-proof` | Generate report for a deal |
| `GET` | `/api/value-proof/[id]` | Get report data |
| `PATCH` | `/api/value-proof/[id]` | Update overrides (time, notes) |
| `GET` | `/api/value-proof/[id]/pdf` | Download PDF |
| `POST` | `/api/value-proof/[id]/share` | Send to client via email |
| `GET` | `/portal/[token]/value-report` | Public client view (token-gated) |

---

# Feature 2: Client Deal Portal

## Problem Statement

The #1 client complaint during a real estate transaction is **"I don't know what's happening."** The average transaction involves **150-200 pages of paperwork**, **8-12 parties**, and **52 touchpoints** from search to close. Clients track status via scattered text messages, emails, and phone calls.

Meanwhile:
- B2B sales has **digital deal rooms** (Dock, DealHub, Aligned) — Gartner says 30% of B2B cycles will use them by 2026
- Healthcare has **patient portals** — real-time lab results, appointment scheduling, secure messaging
- Real estate has... emailed PDFs

Only 2 startups attempt client portals (Shaker, Trackxi) and neither has CRM integration, AI, or full-lifecycle coverage. **Deal fall-through rates hit a record 15.1% in August 2025** — better transparency directly reduces deal failures by catching issues earlier.

**Wire fraud is the #1 security threat:** FBI reported $12.5B in cybercrime losses in 2024, with real estate wire fraud at ~$500M. Moving communications from email to a secure portal is a direct mitigation.

## Overview

A white-labeled, token-gated portal for each transaction where buyers and sellers see real-time status, upcoming milestones, documents, and can message their agent — all in one place. The portal is the client-facing mirror of the agent's deal pipeline.

**Route:** `/portal/[token]` (client-facing, public, token-gated)
**Admin:** `/deals/[id]/portal` (agent controls what client sees)

---

## User Stories

### US-1: Transaction Progress Dashboard

**As a** buyer or seller,
**I want to** see where my transaction stands at a glance,
**So that** I don't have to text my agent "Any updates?" every day.

**Acceptance Criteria:**
- [ ] Visual progress bar showing transaction phases (Offer → Subjects → Inspection → Financing → Closing → Keys)
- [ ] Current phase highlighted with description of what's happening
- [ ] Each completed phase shows completion date
- [ ] Upcoming milestones with countdown timers ("Subject removal in 3 days")
- [ ] Color coding: green = complete, blue = in progress, amber = attention needed, red = at risk
- [ ] Mobile-responsive — clients primarily check on phones
- [ ] No login required — access via secure token link (sent by agent)

**UI Mockup — Client Portal Home:**
```
┌─────────────────────────────────────────────────────────────┐
│  🏠 1234 Oak Street, Vancouver                              │
│  Your agent: Jane Smith  ·  Listed: March 15, 2026          │
│                                                              │
│  ●━━━━●━━━━●━━━━●━━━━◐━━━━○━━━━○                            │
│  Offer Subjects Inspect Finance Apprais Closing Keys        │
│   ✅     ✅      ✅     NOW     ─       ─       ─            │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📍 CURRENT: Financing Review                           │ │
│  │                                                          │ │
│  │  Your lender (TD Bank) is reviewing the appraisal.      │ │
│  │  Expected completion: April 18, 2026                     │ │
│  │                                                          │ │
│  │  ⏰ Financing condition expires in: 4 days               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  UPCOMING                                                    │
│  ├─ April 18 — Financing confirmation due                   │
│  ├─ April 22 — Final walk-through                           │
│  └─ April 25 — Closing day (get your keys!)                 │
│                                                              │
│  [📄 Documents]  [💬 Message Agent]  [📊 Value Report]       │
└─────────────────────────────────────────────────────────────┘
```

---

### US-2: Document Hub

**As a** buyer or seller,
**I want** all my transaction documents in one place,
**So that** I can find the inspection report at 10 PM without texting my agent.

**Acceptance Criteria:**
- [ ] All documents grouped by category: Contract, Disclosures, Inspection, Financing, Title, Closing
- [ ] Each document shows: name, date added, status (pending/signed/complete)
- [ ] Download individual documents as PDF
- [ ] Client can upload documents (pre-approval letter, identity docs) via portal
- [ ] Agent controls which documents are visible to client
- [ ] Upload notifications sent to agent when client adds a document
- [ ] Documents encrypted at rest and in transit

**UI Mockup — Document Hub:**
```
┌─────────────────────────────────────────────────────────────┐
│  📄 DOCUMENTS                                                │
│                                                              │
│  Contract & Amendments                                       │
│  ├─ Contract of Purchase & Sale      ✅ Signed   Mar 20     │
│  ├─ Amendment #1 — Inspection Credit ✅ Signed   Apr 2      │
│  └─ Subject Removal Notice           ✅ Complete Apr 5      │
│                                                              │
│  Inspection & Reports                                        │
│  ├─ Home Inspection Report           ✅ Complete Apr 1      │
│  ├─ Strata Documents (Form B)        ✅ Complete Mar 25     │
│  └─ Property Disclosure Statement    ✅ Complete Mar 22     │
│                                                              │
│  Financing                                                   │
│  ├─ Pre-Approval Letter              ✅ Complete Mar 18     │
│  └─ Appraisal Report                 ⏳ Pending              │
│                                                              │
│  [⬆️ Upload Document]                                        │
└─────────────────────────────────────────────────────────────┘
```

---

### US-3: Secure Messaging

**As a** buyer or seller,
**I want to** message my agent through the portal,
**So that** all transaction communication is in one place (not scattered across text/email/WhatsApp).

**Acceptance Criteria:**
- [ ] Threaded messaging within the portal
- [ ] Messages appear in agent's CRM as `communications` entries
- [ ] Agent can reply from CRM — response appears in portal
- [ ] Push notification to agent's phone when client sends a message
- [ ] File attachment support (photos, documents)
- [ ] Read receipts (agent sees when client read the message)
- [ ] No client login required — portal token authenticates

---

### US-4: Milestone Checklist (Client View)

**As a** buyer or seller,
**I want to** see what I need to do and when,
**So that** I don't miss a deadline that could kill my deal.

**Acceptance Criteria:**
- [ ] Client-facing task list showing only their responsibilities
- [ ] Each task: title, due date, status (todo/done/overdue), description
- [ ] Overdue tasks highlighted in red with urgency messaging
- [ ] Agent can add custom tasks visible to client ("Arrange homeowners insurance by April 20")
- [ ] Client can mark tasks complete (agent gets notified)
- [ ] Automatic tasks from deal template (e.g., "Provide pre-approval letter" auto-added)

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│  ✅ YOUR TO-DO LIST                                          │
│                                                              │
│  ✅ Sign Contract of Purchase & Sale         Done Mar 20     │
│  ✅ Provide pre-approval letter               Done Mar 18     │
│  ✅ Attend home inspection                    Done Apr 1      │
│  🔲 Arrange homeowners insurance              Due Apr 20      │
│  🔲 Schedule utility transfers                Due Apr 23      │
│  🔲 Confirm wire transfer details (⚠️ fraud)  Due Apr 24      │
│  🔲 Final walk-through                        Due Apr 22      │
│                                                              │
│  ⚠️ Wire fraud alert: Your agent will NEVER send wire        │
│  instructions via email. Always call to verify.              │
└─────────────────────────────────────────────────────────────┘
```

---

### US-5: Agent Portal Controls

**As a** realtor,
**I want to** control what my client sees in their portal,
**So that** I can manage information flow and avoid sharing premature updates.

**Acceptance Criteria:**
- [ ] Agent dashboard at `/deals/[id]/portal` showing portal settings
- [ ] Toggle visibility for each document, milestone, and update
- [ ] "Publish Update" button — push a custom status message to client portal
- [ ] Customize portal branding (agent photo, brokerage colors, logo)
- [ ] View client engagement analytics (when they last viewed, what they clicked)
- [ ] Revoke portal access at any time
- [ ] Multiple portals per deal (separate for buyer and seller in dual agency)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent CRM Dashboard                        │
│  /deals/[id]/portal — controls, visibility, branding         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Publish  │  │ Toggle   │  │ Upload   │  │ Revoke   │    │
│  │ Update   │  │ Docs     │  │ Doc      │  │ Access   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└───────────────────────┬─────────────────────────────────────┘
                        │ manages
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    deal_portals table                         │
│  token, deal_id, client_type, branding, visibility_config    │
│  + deal_portal_messages, deal_portal_documents               │
└───────────────────────┬─────────────────────────────────────┘
                        │ serves
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Client Portal (Public)                     │
│  /portal/[token] — no login, token-gated                     │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Progress │  │ Docs     │  │ Messages │  │ Tasks    │    │
│  │ Tracker  │  │ Hub      │  │          │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── app/
│   ├── (dashboard)/deals/
│   │   └── [id]/portal/
│   │       └── page.tsx                   # Agent portal controls
│   ├── portal/
│   │   └── [token]/
│   │       ├── layout.tsx                 # Portal layout (branded, no sidebar)
│   │       ├── page.tsx                   # Portal home (progress + milestones)
│   │       ├── documents/page.tsx         # Document hub
│   │       ├── messages/page.tsx          # Secure messaging
│   │       ├── tasks/page.tsx             # Client task list
│   │       └── value-report/page.tsx      # Links to Feature 1
│   └── api/
│       └── portal/
│           ├── [token]/route.ts           # GET portal data
│           ├── [token]/messages/route.ts  # GET/POST messages
│           ├── [token]/documents/route.ts # GET/POST documents
│           └── [token]/tasks/route.ts     # GET/PATCH tasks
├── actions/
│   └── deal-portal.ts                     # Server actions
├── components/
│   └── portal/
│       ├── PortalLayout.tsx               # Branded layout (no sidebar)
│       ├── ProgressTracker.tsx            # Visual phase progress
│       ├── MilestoneTimeline.tsx          # Upcoming deadlines
│       ├── DocumentHub.tsx                # Document list + upload
│       ├── SecureMessaging.tsx            # Chat interface
│       ├── ClientTaskList.tsx             # To-do list
│       ├── WireFraudAlert.tsx             # Security warning banner
│       └── PortalControls.tsx             # Agent-side controls
└── lib/
    └── portal/
        ├── token.ts                        # Token generation + validation
        ├── visibility.ts                   # Document/milestone visibility logic
        └── notifications.ts                # Portal activity → agent notifications
```

---

## Security Requirements

| Requirement | Implementation |
|-------------|---------------|
| Token authentication | 256-bit random tokens, URL-safe, non-guessable |
| Token expiry | Configurable (default: 90 days post-close) |
| Rate limiting | 100 requests/hour per token |
| Wire fraud protection | Permanent banner: "Your agent will NEVER send wire instructions via email" |
| Document encryption | AES-256 at rest, TLS 1.3 in transit |
| Audit trail | Every portal access logged with IP, timestamp, action |
| Data scoping | RLS ensures portal only sees its own deal data |
| Revocation | Agent can instantly revoke portal access |
| No PII in URLs | Token is opaque, no deal ID or client name in URL |

---

# Feature 3: Relationship Graph Intelligence

## Problem Statement

82-87% of real estate business comes from repeat clients and referrals (NAR). Yet every CRM — including ours — treats contacts as a **flat list**. No CRM computes relationship health, visualizes referral chains, or alerts when key relationships are cooling.

**Dunbar's number** limits meaningful relationships to ~150 people. The average agent's SOI (sphere of influence) is 200-500 contacts. Without intelligence, agents can't prioritize who to nurture.

**Referral leads convert at 15-25%** (vs. 1-6% for paid leads like Zillow) and have **25% higher lifetime value**. Yet no CRM tracks referral chains or relationship strength.

Enterprise tools do this — Affinity ($2,700/user/year), Introhive (enterprise pricing), Cloze ($500/month brokerage) — but none are built for real estate solo agents at an accessible price point. Cloze comes closest (~30% of this spec) with its AI daily agenda and cold-relationship detection, but lacks graph visualization, referral chain tracking, and relationship health dashboards.

## Overview

A relationship intelligence layer that maps the agent's entire SOI as a living social graph. It computes relationship health scores, detects cooling relationships, tracks referral chains, and surfaces AI-powered touchpoint suggestions — turning a flat contact list into a strategic relationship network.

**Route:** `/relationships` (graph view) + widget on `/contacts/[id]` (per-contact) + widget on dashboard
**Integration:** Enhances existing contacts, communications, deals, and households tables

---

## User Stories

### US-1: Relationship Health Score

**As a** realtor,
**I want** each contact to have a health score showing how strong our relationship is,
**So that** I can prioritize who needs attention before I lose them.

**Acceptance Criteria:**
- [ ] Health score: 0-100, computed from 6 signals (see algorithm below)
- [ ] Score displayed as colored badge on contact list and detail page
- [ ] Green (80-100): Strong — recent contact, mutual engagement
- [ ] Amber (50-79): Warm — some recent activity, but declining
- [ ] Red (20-49): Cooling — no contact in 60+ days, engagement dropping
- [ ] Gray (0-19): Cold — no contact in 120+ days, at risk of losing
- [ ] Score updates daily via cron job
- [ ] Hover tooltip shows breakdown of score components

**Health Score Algorithm:**
```typescript
interface RelationshipHealthScore {
  total: number;          // 0-100
  components: {
    recency: number;      // 0-25 — when was last meaningful contact?
    frequency: number;    // 0-20 — how often do we interact?
    reciprocity: number;  // 0-20 — do they initiate, or is it one-way?
    depth: number;        // 0-15 — multi-channel (call+email+meeting) vs single-channel?
    referrals: number;    // 0-10 — have they referred anyone?
    milestones: number;   // 0-10 — do we acknowledge their life events?
  };
  trend: 'rising' | 'stable' | 'declining';
  last_updated: string;
}

// Recency scoring (0-25)
function scoreRecency(daysSinceContact: number): number {
  if (daysSinceContact <= 7) return 25;
  if (daysSinceContact <= 14) return 22;
  if (daysSinceContact <= 30) return 18;
  if (daysSinceContact <= 60) return 12;
  if (daysSinceContact <= 90) return 6;
  if (daysSinceContact <= 180) return 2;
  return 0;
}

// Frequency scoring (0-20)
function scoreFrequency(contactsPerMonth: number): number {
  if (contactsPerMonth >= 4) return 20;
  if (contactsPerMonth >= 2) return 16;
  if (contactsPerMonth >= 1) return 12;
  if (contactsPerMonth >= 0.5) return 8;
  if (contactsPerMonth >= 0.25) return 4;
  return 0;
}

// Reciprocity scoring (0-20)
function scoreReciprocity(inbound: number, outbound: number): number {
  if (inbound === 0 && outbound === 0) return 0;
  const ratio = inbound / (inbound + outbound);
  // Best: 40-60% ratio (balanced). Worst: 0% (all outbound, no response)
  if (ratio >= 0.3 && ratio <= 0.7) return 20;
  if (ratio >= 0.15 || ratio <= 0.85) return 12;
  if (ratio > 0) return 6;
  return 0; // all outbound, zero response
}
```

---

### US-2: Cooling Relationship Alerts

**As a** realtor,
**I want** automatic alerts when key relationships are going cold,
**So that** I can reach out before I lose a referral source forever.

**Acceptance Criteria:**
- [ ] Daily check: flag contacts whose health score dropped below threshold
- [ ] Threshold: "Strong → Warm" or "Warm → Cooling" triggers alert
- [ ] Alert includes: contact name, score drop, last interaction date, suggested action
- [ ] Alerts surfaced in: notification center, dashboard "Today's Priorities" widget, daily digest email
- [ ] "Reconnect" CTA on alert → opens contact with AI-suggested message
- [ ] Agent can dismiss alert or snooze for 30 days
- [ ] Priority weighting: referral sources and past clients weighted 3x higher than cold leads

**UI Mockup — Dashboard Alert:**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ RELATIONSHIPS COOLING                                    │
│                                                              │
│  Sarah Chen — Score dropped 72 → 48 (was Strong, now Cool)  │
│  Last contact: 67 days ago  ·  Referred you 2 clients        │
│  💡 Suggested: "Congrats on 2 years in your home! Here's     │
│     your equity update..."                                    │
│  [Reconnect]  [Snooze 30d]  [Dismiss]                        │
│                                                              │
│  Mike Patel — Score dropped 65 → 41                          │
│  Last contact: 82 days ago  ·  Past buyer client             │
│  💡 Suggested: "Checking in — how's the neighborhood?"       │
│  [Reconnect]  [Snooze 30d]  [Dismiss]                        │
└─────────────────────────────────────────────────────────────┘
```

---

### US-3: Referral Chain Tracking

**As a** realtor,
**I want to** see who referred whom across my entire network,
**So that** I know which relationships generate the most business.

**Acceptance Criteria:**
- [ ] Track referral source on every contact (who introduced them)
- [ ] Visualize referral chains: "Sarah → Mike → Priya → 2 more contacts"
- [ ] Compute "referral value": total commission generated from a referral chain
- [ ] Identify "super-connectors": contacts who have referred 3+ people
- [ ] Show referral chain on contact detail page
- [ ] Aggregate stats: "Sarah's referral chain has generated $127,000 in commissions"
- [ ] Alert when a super-connector's relationship health drops

**UI Mockup — Referral Chain:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔗 REFERRAL CHAIN — Sarah Chen                             │
│                                                              │
│  Sarah Chen (★ Super Connector)                              │
│  ├─ Mike Patel         Closed $725K    Commission: $18,125  │
│  │  └─ Priya Singh     Active buyer                         │
│  ├─ Lisa Wong          Closed $892K    Commission: $22,300  │
│  └─ James & Amy Liu    In pipeline     Est: $15,000         │
│                                                              │
│  Total chain value: $55,425 in commissions                   │
│  Sarah's relationship health: 72 (Warm — ⚠️ declining)       │
└─────────────────────────────────────────────────────────────┘
```

---

### US-4: SOI Network Visualization

**As a** realtor,
**I want** a visual map of my entire sphere of influence,
**So that** I can see the big picture of my relationship network.

**Acceptance Criteria:**
- [ ] Interactive graph visualization (D3.js or similar)
- [ ] Nodes = contacts, sized by relationship health score
- [ ] Edges = relationships (referral, household, colleague, friend)
- [ ] Color by health: green/amber/red/gray
- [ ] Cluster by type: past clients, active clients, referral sources, vendors, colleagues
- [ ] Click node → opens contact detail
- [ ] Filter: show only cooling, show only super-connectors, show only past clients
- [ ] Stats sidebar: total SOI size, average health, cooling count, referral chains

**UI Mockup — Network View:**
```
┌─────────────────────────────────────────────────────────────┐
│  🕸️ YOUR NETWORK — 234 contacts                             │
│                                                              │
│  ┌──────────────────────────────────┐  ┌──────────────────┐ │
│  │                                  │  │ STATS            │ │
│  │        ●Sarah                    │  │                  │ │
│  │       / | \                      │  │ Total: 234       │ │
│  │     ●M  ●L  ●J                  │  │ Strong: 45       │ │
│  │     |        \                   │  │ Warm: 89         │ │
│  │     ●P        ●A                │  │ Cooling: 67      │ │
│  │                                  │  │ Cold: 33         │ │
│  │  (interactive D3.js graph)       │  │                  │ │
│  │                                  │  │ ⚠️ 12 need       │ │
│  │                                  │  │    attention     │ │
│  └──────────────────────────────────┘  └──────────────────┘ │
│                                                              │
│  [All] [Cooling Only] [Super Connectors] [Past Clients]      │
└─────────────────────────────────────────────────────────────┘
```

---

### US-5: AI-Powered Reconnect Suggestions

**As a** realtor,
**I want** personalized outreach suggestions for cooling contacts,
**So that** my reconnection feels natural, not robotic.

**Acceptance Criteria:**
- [ ] Claude AI generates personalized message suggestions based on:
  - Contact's interests and history
  - Time since last interaction
  - Life events (home anniversary, birthday coming up)
  - Market context (their home's value has increased)
  - Relationship type (past client vs. referral source vs. sphere)
- [ ] 3 message options per contact: casual check-in, value-add (market update), milestone (anniversary)
- [ ] Agent can edit before sending
- [ ] Sends via preferred channel (email, text, or call script)
- [ ] "Quick reconnect" button on contact list for cooling contacts

---

## Architecture

**Implementation approach: PostgreSQL (not graph DB)**

Agent networks are 200-500 contacts — not millions. PostgreSQL with JSONB and recursive CTEs is sufficient and avoids adding new infrastructure. The relationship graph is computed and cached, not stored as a graph database.

```
┌──────────────────────────────────────────────────────────────┐
│                    Relationship Engine                         │
│  src/lib/relationships/                                       │
│                                                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ Health     │  │ Referral   │  │ Reconnect  │             │
│  │ Scorer     │  │ Tracker    │  │ AI         │             │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘             │
│        │               │               │                      │
│        ▼               ▼               ▼                      │
│  ┌─────────────────────────────────────────────────┐         │
│  │           relationship_health table              │         │
│  │  contact_id, score, components (JSONB),           │         │
│  │  trend, referral_chain_value                      │         │
│  └─────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Contact  │  │ Dashboard│  │ Network  │
   │ Detail   │  │ Widget   │  │ Graph    │
   │ Badge    │  │ Alerts   │  │ D3.js    │
   └──────────┘  └──────────┘  └──────────┘
```

**Cron Schedule:**
- Health score recomputation: daily at 2 AM (`/api/cron/relationship-health`)
- Cooling alerts generation: daily at 7 AM (`/api/cron/relationship-alerts`)
- Referral chain value recomputation: weekly Sunday 3 AM (`/api/cron/referral-chains`)

---

## File Structure

```
src/
├── app/
│   ├── (dashboard)/relationships/
│   │   └── page.tsx                       # Network graph view
│   └── api/
│       ├── relationships/
│       │   ├── route.ts                   # GET network data
│       │   ├── health/route.ts            # GET/POST health scores
│       │   └── referral-chains/route.ts   # GET referral chains
│       └── cron/
│           ├── relationship-health/route.ts
│           ├── relationship-alerts/route.ts
│           └── referral-chains/route.ts
├── actions/
│   └── relationship-intelligence.ts       # Server actions
├── components/
│   ├── relationships/
│   │   ├── NetworkGraph.tsx               # D3.js interactive graph
│   │   ├── HealthScoreBadge.tsx           # Color-coded score badge
│   │   ├── CoolingAlerts.tsx              # Dashboard alert cards
│   │   ├── ReferralChainView.tsx          # Chain visualization
│   │   ├── ReconnectSuggestions.tsx       # AI message suggestions
│   │   └── SOIStats.tsx                   # Network statistics sidebar
│   └── contacts/
│       └── RelationshipHealthCard.tsx     # Card on contact detail page
└── lib/
    └── relationships/
        ├── health-scorer.ts               # Score computation engine
        ├── referral-tracker.ts            # Chain traversal + value
        ├── cooling-detector.ts            # Threshold monitoring
        ├── reconnect-ai.ts                # Claude AI suggestions
        └── graph-builder.ts               # Network data for D3.js
```

---

# Feature 4: Autonomous Transaction Coordinator Agent

## Problem Statement

Transaction coordination is the **most time-consuming, error-prone, and stressful** part of a real estate deal. Agents spend 30% of their time chasing documents, tracking deadlines, and coordinating between 8-12 parties. A human TC costs $300-$500 per transaction. The average deal involves:

- **40+ distinct deadlines** (subjects, financing, inspection, appraisal, title, closing)
- **150-200 pages** of documentation
- **8-12 parties** (buyer, seller, agents, lender, appraiser, inspector, title, lawyer)
- **30% of agent time** on administrative coordination

**Critical failure statistics:**
- **15.1%** of deals fall through (August 2025, record high)
- **70.4%** of failures are due to inspection/repair disputes
- **27.8-45%** due to financing collapse
- **21%** due to buyer unable to sell current home

ListedKit's "Ava" AI reads purchase agreements ($9.99/intake) but does **not** send reminders, chase documents, or coordinate parties. It's document-in, data-out only. No CRM has an autonomous coordinator.

**Industry projections:** AI deal-tracking agents shorten deal cycles by **25-35%** and reduce documentation errors by **40%** (2026 estimates).

## Overview

An AI agent that actively manages the offer-to-close lifecycle. It tracks every deadline, proactively contacts parties for updates, escalates risks, and gives the agent a single dashboard view of all deal health — across all active transactions simultaneously.

**Route:** `/deals/[id]/coordinator` (per-deal view) + `/coordinator` (all-deals overview)
**Integration:** Works with existing deals, communications, and workflow infrastructure

---

## User Stories

### US-1: Intelligent Deadline Tracking

**As a** realtor,
**I want** every deadline in my deal automatically tracked with countdown timers,
**So that** nothing slips through the cracks.

**Acceptance Criteria:**
- [ ] Auto-extract deadlines from deal creation (configurable template per province/state)
- [ ] BC-specific defaults: subject removal (5-7 days), HBRP (3 business days), deposit (24 hrs post-subjects), completion (30-90 days)
- [ ] Working-backward logic: "Appraisal needed by Day 21 → appraiser needs 5 days → order must go out by Day 16"
- [ ] Visual timeline with color-coded status: green (on track), amber (approaching), red (at risk), black (overdue)
- [ ] Dashboard shows all active deals' deadlines in a unified view
- [ ] Countdown timers on each deadline (days + hours remaining)
- [ ] Calendar integration: deadlines appear in Google Calendar

**UI Mockup — Deal Coordinator Dashboard:**
```
┌─────────────────────────────────────────────────────────────┐
│  🤖 TRANSACTION COORDINATOR — 1234 Oak Street               │
│  Deal health: 🟢 On Track (87/100)                           │
│                                                              │
│  DEADLINE TIMELINE                                           │
│                                                              │
│  ✅ Mar 20 — Contract signed                                 │
│  ✅ Mar 22 — HBRP cooling-off complete (3 bus. days)         │
│  ✅ Mar 25 — Home inspection completed                       │
│  ✅ Mar 27 — Subject removal — ALL subjects removed          │
│  ✅ Mar 28 — Deposit received ($45,000)                      │
│  🟡 Apr 15 — Appraisal due (2 days remaining)               │
│     └─ Status: Appraiser scheduled for Apr 14                │
│  🔵 Apr 18 — Financing confirmation due (5 days)             │
│  ⚪ Apr 22 — Final walk-through                              │
│  ⚪ Apr 25 — Completion (title transfer)                     │
│  ⚪ Apr 26 — Possession (keys!)                              │
│                                                              │
│  RISK ALERTS                                                 │
│  ⚠️ Appraisal: TD Bank appraiser typically takes 7 days.     │
│     Ordered on Apr 8 — may need follow-up if not done by     │
│     Apr 14. [Send reminder to lender]                        │
└─────────────────────────────────────────────────────────────┘
```

---

### US-2: Proactive Party Coordination

**As a** realtor,
**I want** the system to automatically follow up with lenders, inspectors, and other parties,
**So that** I don't have to chase people manually.

**Acceptance Criteria:**
- [ ] Escalation ladder for each deadline:
  - T-5 days: Friendly status check email
  - T-3 days: Follow-up email with urgency
  - T-1 day: Text message + alert to agent
  - T+0 (overdue): Agent phone call alert + flag deal as "at risk"
- [ ] Message templates per party type (lender, inspector, title, lawyer)
- [ ] Agent approves all external messages before they send (human-in-the-loop)
- [ ] Option to enable auto-send for trusted parties (agent configurable)
- [ ] All communications logged in `communications` table
- [ ] Party contact info pulled from `deal_parties` table

**Escalation Ladder:**
```
           T-5 days        T-3 days       T-1 day        T+0 (overdue)
              │                │              │               │
              ▼                ▼              ▼               ▼
         ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────┐
         │ Email   │    │ Email   │    │ SMS +   │    │ AGENT ALERT │
         │ check-in│    │ urgent  │    │ Agent   │    │ + Deal      │
         │         │    │         │    │ alert   │    │ "At Risk"   │
         └─────────┘    └─────────┘    └─────────┘    └─────────────┘
         
         "Hi [Lender],   "Following up   "Urgent:        "⚠️ OVERDUE:
          checking on     — appraisal     appraisal due   Appraisal for
          appraisal       due in 3 days.  tomorrow for    1234 Oak St
          status for      Can you         1234 Oak St.    is overdue.
          1234 Oak St."   confirm?"       Status?"        Call lender."
```

---

### US-3: Deal Health Score

**As a** realtor,
**I want** a single "health score" for each deal showing likelihood of closing,
**So that** I can prioritize my attention on deals that need help.

**Acceptance Criteria:**
- [ ] Deal health score: 0-100, computed from multiple signals
- [ ] Factors: deadline compliance, party responsiveness, document completion, financing status, comparable deal success rate
- [ ] Score updates in real-time as events occur
- [ ] Color-coded: green (80+), amber (50-79), red (<50)
- [ ] Historical chart: score over time shows trajectory
- [ ] All-deals view: sorted by health score (sickest first)
- [ ] Predictive: "Deals with this profile close 73% of the time"

**Deal Health Algorithm:**
```typescript
interface DealHealthScore {
  total: number;           // 0-100
  components: {
    deadline_compliance: number;  // 0-30 — are deadlines being met?
    document_completion: number;  // 0-25 — % of required docs received
    party_responsiveness: number; // 0-20 — are parties responding to outreach?
    financing_status: number;     // 0-15 — lender progress signals
    risk_flags: number;           // 0-10 — deductions for red flags
  };
  prediction: {
    close_probability: number;    // 0-100%
    based_on: string;             // "47 similar deals, 73% closed"
  };
  trajectory: 'improving' | 'stable' | 'declining';
}
```

---

### US-4: Document Tracking Matrix

**As a** realtor,
**I want** a single view showing every required document and its status,
**So that** I know exactly what's missing across all my deals.

**Acceptance Criteria:**
- [ ] Matrix: rows = document types, columns = status (required/requested/received/reviewed/signed)
- [ ] Auto-populated from deal template (BC residential transaction requires ~15 document types)
- [ ] Status badges: pending (gray), requested (blue), received (amber), complete (green), overdue (red)
- [ ] "Request Document" button sends templated email to responsible party
- [ ] Upload documents inline → status auto-updates
- [ ] Cross-deal view: see all deals' document status in one grid

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────┐
│  📋 DOCUMENT TRACKER — 1234 Oak Street                       │
│                                                              │
│  Document                  Responsible    Status    Due      │
│  ─────────────────────────────────────────────────────────   │
│  Contract of P&S           Both agents    ✅ Signed  Mar 20  │
│  Property Disclosure       Seller         ✅ Done    Mar 22  │
│  Strata Form B             Strata mgr     ✅ Done    Mar 25  │
│  Home Inspection Report    Inspector      ✅ Done    Mar 25  │
│  Pre-Approval Letter       Buyer/Lender   ✅ Done    Mar 20  │
│  Appraisal Report          Appraiser      🟡 Pending Apr 15  │
│  Title Search              Title company  🟡 Pending Apr 20  │
│  Homeowners Insurance      Buyer          ⚪ Not yet Apr 23  │
│  Wire Transfer Confirm     Buyer          ⚪ Not yet Apr 24  │
│  Closing Documents         Lawyer         ⚪ Not yet Apr 25  │
│                                                              │
│  Completion: ████████████░░░░  60% (6/10 documents)         │
│                                                              │
│  [Request Missing Docs]  [Upload Document]                   │
└─────────────────────────────────────────────────────────────┘
```

---

### US-5: Cross-Deal Command Center

**As a** realtor managing multiple transactions,
**I want** a single view of all my active deals with health scores and upcoming deadlines,
**So that** I can prioritize my day across 5-10 concurrent transactions.

**Acceptance Criteria:**
- [ ] Card view: one card per active deal showing health score, next deadline, document completion %
- [ ] Sort by: health score (lowest first = needs attention), next deadline (soonest first), close date
- [ ] Quick actions per card: view coordinator, message party, upload document
- [ ] Summary stats: total active deals, average health, deals closing this week, overdue items count
- [ ] Click card → navigates to deal coordinator detail
- [ ] Alerts banner at top for any deal with health < 50 or overdue deadline

**UI Mockup — All Deals:**
```
┌─────────────────────────────────────────────────────────────┐
│  🤖 TRANSACTION COMMAND CENTER                               │
│  5 active deals  ·  Avg health: 78  ·  2 closing this week  │
│                                                              │
│  ⚠️ 1 deal needs attention: 567 Elm Ave (health: 42)        │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ 1234 Oak St      │  │ 567 Elm Ave      │                 │
│  │ 🟢 Health: 87    │  │ 🔴 Health: 42    │                 │
│  │ Next: Appraisal  │  │ ⚠️ Financing     │                 │
│  │ Due: 2 days      │  │ OVERDUE 1 day    │                 │
│  │ Docs: 60%        │  │ Docs: 35%        │                 │
│  │ Close: Apr 25    │  │ Close: Apr 20    │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ 890 Pine Rd      │  │ 234 Birch Lane   │                 │
│  │ 🟢 Health: 91    │  │ 🟡 Health: 68    │                 │
│  │ Next: Final walk │  │ Next: Inspection │                 │
│  │ Due: Tomorrow    │  │ Due: 4 days      │                 │
│  │ Docs: 85%        │  │ Docs: 45%        │                 │
│  │ Close: Apr 15    │  │ Close: May 5     │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

### US-6: Learning from Past Deals (Cross-Deal Knowledge)

**As a** realtor,
**I want** the system to learn from my closed deals and apply that knowledge to new ones,
**So that** I get better predictions and earlier warnings.

**Acceptance Criteria:**
- [ ] After each deal closes, AI analyzes: what went well, what was delayed, what almost failed
- [ ] Pattern detection: "TD Bank appraisals average 8 days (your deals), not the stated 5"
- [ ] Neighborhood insights: "Deals in Kitsilano take 15% longer to close due to strata complexity"
- [ ] Seasonal patterns: "March closings have 20% more financing delays"
- [ ] Insights surfaced as coaching tips on new similar deals
- [ ] Agent can add manual notes ("Always follow up with [inspector name] after 3 days")

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Transaction Coordinator Agent                  │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Deadline │  │ Party    │  │ Document │  │ Health   │    │
│  │ Engine   │  │ Comms    │  │ Tracker  │  │ Scorer   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │              │              │              │          │
│       ▼              ▼              ▼              ▼          │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              deal_coordinator table                  │     │
│  │  deal_id, deadlines (JSONB), health_score,           │     │
│  │  document_matrix (JSONB), escalation_log (JSONB)     │     │
│  └─────────────────────────────────────────────────────┘     │
│       │              │              │                          │
│       ▼              ▼              ▼                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Cron:    │  │ Cron:    │  │ AI:      │                   │
│  │ Check    │  │ Send     │  │ Learning │                   │
│  │ deadlines│  │ reminders│  │ engine   │                   │
│  │ (hourly) │  │ (daily)  │  │ (close)  │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

**Human-in-the-Loop Requirement:**
All external communications (emails/texts to lenders, inspectors, etc.) require agent approval before sending. This is a legal/compliance requirement — AI cannot practice real estate or make deadline-affecting decisions autonomously. The agent reviews and clicks "Send" or "Edit" for each outbound message.

**Exception:** Agent can enable "auto-send" for specific trusted parties and message types (e.g., routine status checks to a lender they work with regularly).

---

## File Structure

```
src/
├── app/
│   ├── (dashboard)/coordinator/
│   │   ├── page.tsx                       # All-deals command center
│   │   └── [dealId]/
│   │       └── page.tsx                   # Per-deal coordinator view
│   └── api/
│       ├── coordinator/
│       │   ├── route.ts                   # GET all deals health
│       │   ├── [dealId]/route.ts          # GET/POST deal coordinator
│       │   ├── [dealId]/deadlines/route.ts
│       │   ├── [dealId]/documents/route.ts
│       │   └── [dealId]/outreach/route.ts # POST send reminder (human approved)
│       └── cron/
│           ├── deadline-check/route.ts     # Hourly deadline monitoring
│           ├── coordinator-reminders/route.ts  # Daily reminder generation
│           └── deal-learning/route.ts      # Post-close analysis
├── actions/
│   └── coordinator.ts                     # Server actions
├── components/
│   └── coordinator/
│       ├── CommandCenter.tsx              # All-deals overview
│       ├── DealCoordinatorView.tsx        # Per-deal detail
│       ├── DeadlineTimeline.tsx           # Visual timeline
│       ├── DealHealthCard.tsx             # Health score display
│       ├── DocumentMatrix.tsx             # Document status grid
│       ├── EscalationQueue.tsx            # Pending outreach approvals
│       ├── PartyDirectory.tsx             # All parties + contact info
│       ├── DealInsights.tsx               # AI learning insights
│       └── RiskAlertBanner.tsx            # Critical alerts
└── lib/
    └── coordinator/
        ├── deadline-engine.ts             # Deadline computation + backward logic
        ├── health-scorer.ts               # Deal health computation
        ├── escalation.ts                  # Reminder generation + ladder
        ├── document-tracker.ts            # Document matrix management
        ├── party-outreach.ts              # Template messages per party type
        ├── deal-learner.ts                # Post-close AI analysis
        └── bc-templates.ts                # BC-specific deadline templates
```

---

# Database Schema

## New Tables

```sql
-- ═══════════════════════════════════════════════════════════
-- FEATURE 1: Commission Value Proof Engine
-- ═══════════════════════════════════════════════════════════

CREATE TABLE value_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID NOT NULL REFERENCES users(id),
  deal_id UUID NOT NULL REFERENCES deals(id),
  listing_id UUID REFERENCES listings(id),
  
  -- Report data (computed + cached)
  report_data JSONB NOT NULL DEFAULT '{}',
  -- {
  --   results_summary: { listed_at, sold_at, days_on_market, area_avg_dom, vs_comps },
  --   marketing: { photos_count, videos, social_posts, email_campaigns, open_houses, impressions },
  --   showings: { total_requests, completed, feedback_rate, avg_confirm_time },
  --   communication: { total_touchpoints, calls, emails, texts, meetings, avg_response_min },
  --   negotiation: { offers_received, final_vs_asking, conditions_managed, repairs_negotiated },
  --   time_invested: { total_hours, breakdown: { listing_prep, marketing, showings, ... } },
  --   compliance: { documents_prepared, regulatory_checks },
  --   market_context: { sale_to_list_ratio, vs_area_avg, price_per_sqft }
  -- }
  
  -- Agent overrides
  overrides JSONB DEFAULT '{}',           -- Agent can adjust time estimates, add notes
  hourly_rate DECIMAL(10,2) DEFAULT 150,  -- For ROI calculation
  
  -- Sharing
  share_token VARCHAR(64) UNIQUE,
  share_expires_at TIMESTAMPTZ,
  
  -- Metadata
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'shared', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE value_report_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES value_reports(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL,        -- 'viewed', 'downloaded', 'shared', 'link_clicked'
  viewer_ip VARCHAR(45),
  viewer_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_value_reports_realtor ON value_reports(realtor_id);
CREATE INDEX idx_value_reports_deal ON value_reports(deal_id);
CREATE INDEX idx_value_reports_token ON value_reports(share_token);

-- ═══════════════════════════════════════════════════════════
-- FEATURE 2: Client Deal Portal
-- ═══════════════════════════════════════════════════════════

CREATE TABLE deal_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID NOT NULL REFERENCES users(id),
  deal_id UUID NOT NULL REFERENCES deals(id),
  
  -- Access
  token VARCHAR(64) NOT NULL UNIQUE,
  client_type VARCHAR(10) NOT NULL CHECK (client_type IN ('buyer', 'seller')),
  client_name VARCHAR(200),
  client_email VARCHAR(200),
  
  -- Branding
  branding JSONB DEFAULT '{}',
  -- { logo_url, primary_color, agent_photo_url, brokerage_name }
  
  -- Visibility controls
  visibility_config JSONB DEFAULT '{}',
  -- { documents: { [doc_id]: true/false }, milestones: { [milestone_id]: true/false } }
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deal_portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES deal_portals(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('agent', 'client')),
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deal_portal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES deal_portals(id) ON DELETE CASCADE,
  document_name VARCHAR(200) NOT NULL,
  document_category VARCHAR(50),          -- 'contract', 'inspection', 'financing', 'title', 'closing'
  file_url TEXT,
  uploaded_by VARCHAR(10) CHECK (uploaded_by IN ('agent', 'client')),
  status VARCHAR(20) DEFAULT 'pending',   -- 'pending', 'received', 'reviewed', 'signed', 'complete'
  due_date TIMESTAMPTZ,
  is_visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deal_portal_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES deal_portals(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(10),               -- 'agent' or 'client'
  is_visible_to_client BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deal_portal_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES deal_portals(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL,            -- 'viewed', 'document_downloaded', 'message_sent', 'task_completed'
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_portals_token ON deal_portals(token);
CREATE INDEX idx_deal_portals_deal ON deal_portals(deal_id);
CREATE INDEX idx_deal_portal_messages_portal ON deal_portal_messages(portal_id);

-- ═══════════════════════════════════════════════════════════
-- FEATURE 3: Relationship Graph Intelligence
-- ═══════════════════════════════════════════════════════════

CREATE TABLE relationship_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID NOT NULL REFERENCES users(id),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Health score
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  components JSONB NOT NULL DEFAULT '{}',
  -- {
  --   recency: 18,        -- 0-25
  --   frequency: 12,      -- 0-20
  --   reciprocity: 15,    -- 0-20
  --   depth: 10,          -- 0-15
  --   referrals: 5,       -- 0-10
  --   milestones: 8       -- 0-10
  -- }
  trend VARCHAR(10) DEFAULT 'stable' CHECK (trend IN ('rising', 'stable', 'declining')),
  
  -- Referral tracking
  referred_by UUID REFERENCES contacts(id),
  referral_chain_value DECIMAL(12,2) DEFAULT 0,  -- Total commission from this chain
  referral_count INTEGER DEFAULT 0,
  is_super_connector BOOLEAN DEFAULT false,       -- 3+ referrals
  
  -- Alerts
  last_alert_sent_at TIMESTAMPTZ,
  alert_snoozed_until TIMESTAMPTZ,
  
  -- History
  score_history JSONB DEFAULT '[]',
  -- [{ date: '2026-03-01', score: 85 }, { date: '2026-04-01', score: 72 }, ...]
  
  last_interaction_at TIMESTAMPTZ,
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(realtor_id, contact_id)
);

CREATE INDEX idx_rel_health_realtor ON relationship_health(realtor_id);
CREATE INDEX idx_rel_health_score ON relationship_health(realtor_id, score);
CREATE INDEX idx_rel_health_referred_by ON relationship_health(referred_by);
CREATE INDEX idx_rel_health_connector ON relationship_health(realtor_id, is_super_connector) WHERE is_super_connector = true;

-- ═══════════════════════════════════════════════════════════
-- FEATURE 4: Autonomous Transaction Coordinator
-- ═══════════════════════════════════════════════════════════

CREATE TABLE deal_coordinator (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID NOT NULL REFERENCES users(id),
  deal_id UUID NOT NULL REFERENCES deals(id),
  
  -- Health
  health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  health_components JSONB DEFAULT '{}',
  -- {
  --   deadline_compliance: 28,    -- 0-30
  --   document_completion: 20,    -- 0-25
  --   party_responsiveness: 18,   -- 0-20
  --   financing_status: 12,       -- 0-15
  --   risk_flags: -3              -- 0 to -10 (deductions)
  -- }
  trajectory VARCHAR(10) DEFAULT 'stable',
  close_probability INTEGER DEFAULT 75,
  
  -- Deadlines
  deadlines JSONB NOT NULL DEFAULT '[]',
  -- [{
  --   id: 'uuid', name: 'Subject Removal', due_date: '2026-04-05',
  --   status: 'completed', completed_at: '2026-04-04',
  --   responsible_party: 'buyer', category: 'condition',
  --   backward_deps: [{ name: 'Order Inspection', days_before: 3 }]
  -- }]
  
  -- Document matrix
  document_matrix JSONB NOT NULL DEFAULT '[]',
  -- [{
  --   doc_type: 'inspection_report', name: 'Home Inspection Report',
  --   responsible: 'inspector', status: 'received',
  --   due_date: '2026-03-25', received_at: '2026-03-25'
  -- }]
  
  -- Party directory
  parties JSONB DEFAULT '[]',
  -- [{
  --   role: 'lender', name: 'John at TD Bank', email: '...', phone: '...',
  --   responsiveness_score: 72, avg_response_hours: 18
  -- }]
  
  -- Escalation log
  escalation_log JSONB DEFAULT '[]',
  -- [{
  --   deadline_id: 'uuid', level: 1, sent_at: '...', method: 'email',
  --   recipient: 'lender', message_preview: '...', response_received: true
  -- }]
  
  -- Learning
  deal_insights JSONB DEFAULT '{}',
  -- Post-close: { lessons: [...], party_ratings: {...}, timeline_accuracy: 0.85 }
  
  -- Config
  auto_send_enabled BOOLEAN DEFAULT false,
  auto_send_parties JSONB DEFAULT '[]',   -- Party roles with auto-send enabled
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(realtor_id, deal_id)
);

CREATE TABLE deal_coordinator_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID REFERENCES users(id),   -- NULL = system template
  name VARCHAR(100) NOT NULL,
  province_state VARCHAR(50),             -- 'BC', 'ON', 'AB', etc.
  transaction_type VARCHAR(30),           -- 'residential_purchase', 'residential_sale', 'condo'
  
  deadlines_template JSONB NOT NULL,      -- Template deadlines with relative days
  documents_template JSONB NOT NULL,      -- Required documents list
  parties_template JSONB NOT NULL,        -- Expected parties
  
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_coord_realtor ON deal_coordinator(realtor_id);
CREATE INDEX idx_deal_coord_deal ON deal_coordinator(deal_id);
CREATE INDEX idx_deal_coord_health ON deal_coordinator(realtor_id, health_score);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES (all tables scoped to realtor_id)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE value_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_coordinator ENABLE ROW LEVEL SECURITY;

-- (RLS policies follow standard pattern: realtor_id = auth.uid())
```

---

# Implementation Order

| Phase | Feature | Duration | Dependencies | Priority |
|-------|---------|----------|-------------|----------|
| **Phase 1** | Commission Value Proof Engine | 2-3 weeks | Existing: deals, listings, communications, appointments | **BUILD FIRST** — fastest to build, highest demo impact |
| **Phase 2** | Client Deal Portal | 4-6 weeks | Existing: deals, listing_documents. New: deal_portals tables | **BUILD SECOND** — client-facing, reduces support burden |
| **Phase 3** | Relationship Graph Intelligence | 4-6 weeks | Existing: contacts, communications, referrals. New: relationship_health table | **BUILD THIRD** — drives long-term retention |
| **Phase 4** | Autonomous Transaction Coordinator | 6-8 weeks | Phase 2 portal. New: deal_coordinator tables + cron jobs | **BUILD FOURTH** — most complex, highest long-term value |

### Phase 1 Detailed Breakdown (Commission Value Proof)

| Week | Deliverables |
|------|-------------|
| Week 1 | DB migration, data aggregation engine (`generator.ts`, `metrics.ts`, `time-estimator.ts`), API endpoints |
| Week 2 | Report UI components (8 section cards), preview page, edit overrides |
| Week 3 | PDF rendering, email sharing, client-facing portal page, portfolio view |

### Phase 2 Detailed Breakdown (Client Deal Portal)

| Week | Deliverables |
|------|-------------|
| Week 1 | DB migration, token auth, portal layout, progress tracker |
| Week 2 | Document hub (upload + download), milestone checklist |
| Week 3 | Secure messaging (agent ↔ client), push notifications |
| Week 4 | Agent controls dashboard, branding customization, engagement analytics |
| Week 5-6 | Wire fraud security, mobile responsive polish, integration testing |

### Phase 3 Detailed Breakdown (Relationship Intelligence)

| Week | Deliverables |
|------|-------------|
| Week 1 | DB migration, health score algorithm, daily cron job |
| Week 2 | Health badges on contact list/detail, cooling alerts dashboard widget |
| Week 3 | Referral chain tracking, super-connector identification |
| Week 4 | D3.js network graph visualization |
| Week 5-6 | AI reconnect suggestions (Claude), integration with notifications + daily digest |

### Phase 4 Detailed Breakdown (Transaction Coordinator)

| Week | Deliverables |
|------|-------------|
| Week 1 | DB migration, BC deadline templates, deadline engine |
| Week 2 | Deal health scorer, document matrix tracker |
| Week 3 | Escalation ladder, message templates, human-in-the-loop approval UI |
| Week 4 | Command center (all-deals view), per-deal coordinator view |
| Week 5-6 | Party outreach automation, cron jobs (hourly check, daily reminders) |
| Week 7-8 | Cross-deal learning engine, Google Calendar integration, testing |

---

# Success Criteria

### Feature 1: Commission Value Proof Engine
1. Agent can generate a value report from any closed deal in < 5 seconds
2. Report accurately pulls data from 8+ CRM tables without manual entry
3. PDF renders professionally with agent branding
4. Client-facing web link works without login (token-gated)
5. Time estimates are within 20% of actual (agent can override)
6. Portfolio view aggregates 3+ reports with summary stats

### Feature 2: Client Deal Portal
7. Client can view transaction status without contacting agent
8. Document upload/download works on mobile (iOS Safari, Chrome)
9. Secure messaging delivers to agent's CRM within 30 seconds
10. Wire fraud warning banner appears on every portal page
11. Agent can control visibility of every document and milestone
12. Portal access is revocable and expires automatically

### Feature 3: Relationship Graph Intelligence
13. Health scores recompute daily for all contacts (< 60 seconds for 500 contacts)
14. Cooling alerts fire within 24 hours of score crossing threshold
15. Referral chains accurately compute across 3+ degrees
16. Network graph renders interactively for 500+ contacts
17. AI reconnect suggestions are personalized (not generic)
18. Super-connectors are identified and prioritized

### Feature 4: Autonomous Transaction Coordinator
19. All BC-specific deadlines auto-populate when deal is created
20. Escalation ladder generates appropriate messages at T-5, T-3, T-1
21. Human-in-the-loop: no external message sends without agent approval (unless auto-send enabled)
22. Deal health score updates within 1 hour of any status change
23. Cross-deal command center shows all active deals sorted by health
24. Post-close learning generates at least 3 actionable insights per deal

### Cross-Cutting
25. All 4 features respect multi-tenancy (RLS + tenant client)
26. All new pages use PageHeader + DataTable components (design system)
27. Mobile responsive on all client-facing pages
28. 90%+ test coverage on core algorithms (health scorer, time estimator, deadline engine)
29. Lighthouse accessibility score ≥ 90 on all new pages

---

# Appendix A: Competitive Landscape Summary

| CRM | Price | Value Proof | Client Portal | Relationship Intelligence | TX Coordinator |
|-----|-------|-------------|---------------|--------------------------|----------------|
| Follow Up Boss | $69-1000/mo | ❌ | ❌ | ❌ | ❌ |
| kvCORE/BoldTrail | $749-1800/mo | ❌ | ❌ | ❌ | ❌ |
| Lofty/Chime | $499-700/mo | ❌ | ❌ | Partial (AI agenda) | ❌ |
| CINC | $400-1500/mo | ❌ | ❌ | ❌ | ❌ |
| BoomTown | $1000-1500/mo | ❌ | ❌ | ❌ | ❌ |
| Sierra Interactive | Quote | ❌ | ❌ | ❌ | ❌ |
| Wise Agent | $30-60/mo | ❌ | ❌ | ❌ | ❌ |
| Real Geeks | Mid | ❌ | ❌ | ❌ | ❌ |
| Cloze | $29-500/mo | ❌ | ❌ | Partial (~30%) | ❌ |
| Rechat | Quote | ❌ | ❌ | ❌ | ❌ |
| **Shaker** (startup) | Quote | ❌ | Partial | ❌ | ❌ |
| **ListedKit** | $40/mo | ❌ | ❌ | ❌ | Partial (~15%) |
| **Realtors360** | TBD | ✅ **FULL** | ✅ **FULL** | ✅ **FULL** | ✅ **FULL** |

# Appendix B: Key Statistics & Sources

| Statistic | Value | Source |
|-----------|-------|--------|
| Business from repeat/referral | 82-87% | NAR |
| FSBO vs agent price gap | $65,000 (18%) | NAR 2025 |
| FSBO market share | 5% (all-time low) | NAR 2025 |
| Commission rates post-settlement | Rose to 5.44% | Redfin/PR Newswire |
| Deal fall-through rate | 15.1% (record high) | Redfin Aug 2025 |
| Inspection dispute failures | 70.4% | Industry survey |
| Financing failures | 27.8-45% | Industry survey |
| Agent hours per transaction | 40 hours | NAR |
| Human TC cost | $300-500/deal | Industry average |
| Referral lead conversion | 15-25% vs 1-6% paid | NAR |
| Referral LTV premium | 25% higher | Industry data |
| Pages per closing | 150-200 | Industry average |
| Parties per transaction | 8-12 | Industry average |
| Wire fraud losses (2024) | $12.5B cyber, ~$500M real estate | FBI |
| Dunbar's number | 148 (range: 100-250) | Dunbar |
| AI deal cycle reduction | 25-35% | 2026 projections |
| AI documentation error reduction | 40% | 2026 projections |

---

*Version 1.1 — 2026-04-20*

<!-- changelog: added team-permissions.ts (RBAC for team collaboration), MondaySidebar team nav -->

<!-- Last reviewed: 2026-04-21 -->


