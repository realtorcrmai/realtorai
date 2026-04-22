<!-- docs-audit: created 2026-04-21 -->
# Discovery Process — Realtors360

**Scope:** User research and discovery framework for feature development on the Realtors360 BC real estate CRM.
**When to apply:** Before any `CODING:feature` task at medium or large tier (per agent-playbook.md Section 3).

---

## 1. Who Are Realtors360 Users?

### Primary Users
| Persona | Description | Key Pain Points |
|---------|-------------|-----------------|
| **Solo Agent (Sarah)** | Licensed BC REALTOR, 5–15 transactions/yr, median age 57, uses CRM solo | Spends 6–8 hrs/week on admin; forgets follow-ups; struggles with FINTRAC paperwork |
| **Team Lead (Marcus)** | 2–5 person team, manages buyer agents, needs shared pipeline visibility | Duplicate data entry across members; no audit trail for agent activity |
| **New Agent (Priya)** | <2 years licensed, learning BCREA requirements, low transaction volume | Doesn't know what forms to file when; wants checklists and guardrails |
| **Brokerage Admin (Karen)** | Manages 10–30 agents, needs compliance reporting | Cannot audit FINTRAC status across listings; no aggregate compliance view |

### Secondary Users (affected, not primary operators)
- **Sellers** — receive SMS/WhatsApp showing notifications via Twilio
- **Buyer Agents** — receive appointment confirmation messages; not CRM users
- **BCREA compliance officers** — may audit form records; no CRM access

---

## 2. Four Research Methods for a Small Team

### Method 1: In-App NPS (Already Built)
- **Where:** `/onboarding/nps` endpoint + `OnboardingNPS.tsx` component, triggered post-checklist
- **What to collect:** Score (0–10) + open text. Tag responses by `user.plan` (free/professional/team).
- **Cadence:** Review monthly. Flag any score ≤6 for 1:1 follow-up within 48 hrs.
- **Signal:** Low scores from `professional` plan users indicate churn risk; low scores from `new_agent` persona indicate onboarding gaps.

### Method 2: Support Ticket Analysis
- **Source:** Email support + in-app contact form
- **Process:** Tag each ticket with entity (contacts/listings/showings/newsletters), action (create/update/delete/export), and regulation (FINTRAC/CASL/BCREA/none).
- **Cadence:** Weekly 15-min triage. Monthly rollup to identify top-5 friction points.
- **Signal example:** 6 tickets in Q1 2026 about "can't export contacts to CSV" → surfaced bulk export as high-priority feature.

### Method 3: Competitor Feature Comparison
Benchmark against: **Follow Up Boss**, **kvCORE**, **LionDesk**, **Realvolve**.

| Feature | Follow Up Boss | kvCORE | LionDesk | Realvolve | Realtors360 |
|---------|---------------|--------|----------|-----------|-------------|
| Bulk contact export | CSV + Zapier | CSV | CSV | CSV | Missing (backlog) |
| FINTRAC form generation | No | No | No | No | Built (Phase 5) |
| Server-side pagination | Yes | Yes | Yes | Yes | Missing (contacts) |
| AI MLS remarks | No | No | No | No | Built (Claude) |
| CASL consent tracking | No | No | No | No | Built (casl_consent_given) |

- **Run:** Before any feature in the roadmap backlog. Check if competitors have it, how they implemented it, and whether our implementation should match or differentiate.

### Method 4: Usage Analytics
- **Source:** Supabase query logs + Next.js server action call counts (log to `communications` table or a future `analytics_events` table).
- **Key metrics to track:** MAU by page (`/listings`, `/contacts`, `/newsletters`), phase completion rate on 8-phase workflow, showing-to-confirmed conversion rate.
- **Cadence:** Monthly. Compare against previous month baseline.
- **Signal:** If `/content` page has 3% of session starts, AI content studio is low adoption — deprioritize feature investment.

---

## 3. Jobs-to-Be-Done (JTBD) Framework

Three core jobs map to the main CRM modules:

### Job 1: Manage Contacts
> "When I get a new lead, I want to capture their info and set a follow-up, so I don't lose the opportunity."

- **Functional:** Add contact, set CASL consent, assign journey, schedule follow-up.
- **Emotional:** Confidence that no lead falls through the cracks.
- **Social:** Look responsive and professional to leads.
- **Current gaps:** No automated follow-up reminder; no lead deduplication; 200-contact cap.

### Job 2: Process a Listing
> "When I take on a new listing, I want to complete all required BCREA/FINTRAC steps in order, so I'm compliant and the listing goes live without delays."

- **Functional:** Complete 8-phase workflow, generate 12 BCREA forms, upload seller identity docs.
- **Emotional:** Certainty they haven't missed a compliance step.
- **Social:** Appear organized to the seller; avoid regulator scrutiny.
- **Current gaps:** Phases 9–12 missing; no offer management; DocuSign integration partial.

### Job 3: Send Newsletters / Stay Top-of-Mind
> "When I have a new listing or market update, I want to send a professional email to my contacts, so they remember me when they're ready to transact."

- **Functional:** Create newsletter, AI-draft content, segment recipients, send via Resend, track opens.
- **Emotional:** Feel like a professional marketer without hiring one.
- **Social:** Clients perceive the agent as knowledgeable and active.
- **Current gaps:** Approval queue latency; no A/B testing; no SMS newsletter channel.

---

## 4. When to Do Discovery

| Trigger | Required? | Minimum Artifact |
|---------|-----------|-----------------|
| New feature, medium tier | Yes | `discovery/<slug>.md` with problem + JTBD |
| New feature, large tier | Yes | Full discovery doc + competitive scan |
| Bug fix | No | — |
| Refactor (no behavior change) | No | — |
| Regulatory compliance change (FINTRAC/CASL) | Yes | Legal review trigger check (see `LEGAL_REVIEW_TRIGGERS.md`) |

---

## 5. Discovery Artifact Template + Filled Example

**File location:** `docs/discovery/<slug>.md`

```markdown
# Discovery: <Feature Name>

**Date:** YYYY-MM-DD
**Author:** <developer>
**Tier:** medium | large
**Status:** draft | approved | superseded

## Problem Statement
<1–2 paragraphs. What is the user unable to do today? What is the consequence?>

## User Evidence
- NPS quote: "<verbatim text>" — score 4, professional plan, 2026-03-14
- Support ticket #42: "I need to export my contacts for my broker"
- Usage data: /contacts page has 41% of all session starts; no export button present

## JTBD Mapping
**Job:** <which of the 3 core jobs, or a sub-job>
**When:** When I have 200+ contacts and my broker asks for a client list…
**I want to:** …download all contacts as a CSV with name, phone, email, CASL status…
**So I can:** …hand it over without manually copying from the screen.

## Acceptance Signal
What would tell us the problem is solved? (measurable)
- Export button present on /contacts page
- CSV includes: name, phone, email, type, casl_consent_given, created_at
- Works for all contacts (not capped at 200)
- Export completes in <3s for 500 contacts

## Scope
**In:** CSV export from contacts list view, all filtered results
**Out:** PDF export, scheduled exports, Zapier integration

## Dependencies
- Server-side pagination (REQUIREMENTS_TEMPLATE.md example) must ship first
- No new DB tables required
```

---

### Filled Example: Bulk Contact Export

**File:** `docs/discovery/bulk-contact-export.md`

**Problem Statement:**
Realtors360 contacts page hard-caps at 200 items and has no export function. When a broker asks an agent for their full client list, or an agent switches CRMs, they cannot extract their data. This violates the spirit of CASL data portability expectations and creates churn risk when agents feel "locked in."

**User Evidence:**
- Support ticket (2026-02-18): "How do I get my contacts into Excel? My broker needs a list."
- NPS open text (score 5, professional plan, 2026-03-01): "Missing basic stuff like export."
- Competitive scan: all four benchmark CRMs (Follow Up Boss, kvCORE, LionDesk, Realvolve) offer CSV export.

**JTBD:** When my broker requests a client list or I'm preparing for a CRM migration, I want to export all my contacts as a CSV so I can hand over the data without manual transcription.

**Acceptance Signal:** Export button on `/contacts` list; CSV includes name/phone/email/type/casl_consent_given/created_at; handles >200 contacts; no timeout under 1,000 rows.

**Dependencies:** Server-side pagination (remove 200-item cap first).
