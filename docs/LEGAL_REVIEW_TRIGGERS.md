<!-- docs-audit: created 2026-04-21 -->
# Legal Review Triggers — Realtors360

**Scope:** Mandatory legal review checklist for features touching Canadian real estate regulations.
**Regulations covered:** PIPEDA, FINTRAC (PCMLTFA), CASL, BCREA Code of Ethics, BC Privacy Act (PIPA).
**Process:** Developer checks this list on every PR → product owner approves → external counsel engaged if trigger matched.

---

## 1. Process

```
Developer opens PR
  └─ Check this trigger list against the diff
        ├─ No triggers matched → note "Legal: No triggers" in PR description → proceed
        └─ Trigger matched → tag @product-owner in PR → PO reviews within 24 hrs
              ├─ PO clears (no external review needed) → proceed
              └─ PO escalates → engage external counsel (Fasken / McCarthy Tétrault)
                    └─ Counsel approval required before merge to dev
```

**Rule:** A feature that collects new PII, adds a new outbound messaging channel, or shares data with a new third party **does not merge** without a legal clearance comment in the PR.

---

## 2. Trigger List

### TRIGGER L-1: New PII Collection Field
**Definition:** Any new DB column or JSONB field that stores information that could identify a natural person — name, DOB, address, ID number, phone, email, SIN, citizenship.

**Realtors360 examples:**
- Adding `buyer_identity` table (migration 143 — `src/supabase/migrations/143_buyer_identities.sql`) → **FINTRAC trigger**: buyer identification is now required under FINTRAC amendments. Counsel must confirm which PCMLTFA provisions apply and whether existing FINTRAC flows cover buyers.
- Adding a `biometric_verification` field to `seller_identities` → PIPEDA + BC PIPA trigger.
- Storing `sin_number` on contacts → FINTRAC + PIPEDA trigger.

**Legal review needed for:** PIPEDA s.4–5 (collection limitation), FINTRAC PCMLTFA s.9.1 (identity verification requirements), BC PIPA s.11.

---

### TRIGGER L-2: New Outbound Messaging Channel
**Definition:** Any new channel through which Realtors360 sends messages to contacts (persons who may not have solicited contact).

**Realtors360 examples:**
- Adding WhatsApp as a newsletter delivery channel → **CASL trigger**: electronic commercial messages via WhatsApp require express or implied consent under CASL s.6. Must verify consent capture covers this channel. Also check TCPA (irrelevant for BC-only users but relevant if contacts have US numbers).
- Adding push notifications via browser or mobile → CASL + app store policy trigger.
- Adding automated voice calls (IVR) for showing confirmations → CASL + CRTC trigger.

**Current status:** SMS via Twilio (`pref_channel = sms`) and email via Resend are the two live channels. Both require CASL consent captured via `casl_consent_given` / `casl_consent_date` on the `contacts` table.

**Legal review needed for:** CASL s.6 (consent), s.10 (identification/unsubscribe mechanism), CRTC DNCL rules if voice calls added.

---

### TRIGGER L-3: AI-Generated Content Shown to Clients or Published
**Definition:** Any feature where AI output (from Claude or any other model) is surfaced in marketing materials, MLS listings, or communications sent to clients or the public without realtor review.

**Realtors360 examples:**
- MLS public remarks auto-published to MLS without realtor editing (`src/app/api/mls-remarks/`) → **BCREA trigger**: BCREA Code of Ethics Rule 3 (advertising must be accurate). Realtor is liable for AI-generated claims. Current implementation requires manual copy-paste to MLS — this human gate is the mitigation.
- AI-drafted newsletter sent to contacts without approval → CASL trigger (misleading content) + BCREA advertising rules.
- AI lead score shown to clients as a "priority rating" → PIPEDA + AIDA (Artificial Intelligence and Data Act, Bill C-27 when passed) trigger.

**Legal review needed for:** BCREA Code of Ethics s.3, REBBA (Real Estate Services Act BC) s.28, PIPEDA s.5(3) (accuracy principle), CASL s.6(2)(c) (false/misleading content).

---

### TRIGGER L-4: New Third-Party Data Sharing
**Definition:** Any new external service that receives Realtors360 user or contact data, or any expansion of data shared with an existing service.

**Realtors360 examples:**
- Sending contact phone + name to a new AI provider for summarization → PIPEDA s.10.3 (transfer to third party) + BC PIPA s.15.
- Integrating Zapier or Make.com for contact export → PIPEDA accountability trigger. Data leaves Realtors360's control.
- Adding a new analytics platform (e.g., Mixpanel, Amplitude) that receives contact IDs or email addresses → PIPEDA + CASL.

**Current sharing (already disclosed):**
| Service | Data shared | Basis |
|---------|-------------|-------|
| Anthropic | Listing address, property details, seller first name | AI DPA (pending — see THREAT_MODEL.md I-1) |
| Twilio | Contact phone number, message body | DPA in place via Twilio MSA |
| Resend | Contact email, name, unsubscribe token | DPA in place via Resend ToS |
| Supabase | All PII (primary database) | Supabase DPA (Data Processing Agreement) in place |

**Legal review needed for:** PIPEDA s.10.3, BC PIPA s.15, cross-border data transfer rules (see Trigger L-6).

---

### TRIGGER L-5: New Terms of Service or Privacy Policy Change
**Definition:** Any change to what Realtors360 commits to users or how it discloses data practices.

**Realtors360 examples:**
- Launching a paid `team` plan → new ToS terms around team member data access, billing, and cancellation.
- Adding AI-generated content features → Privacy Policy must disclose AI processing of user data.
- Onboarding brokerage admin (`Karen` persona) → ToS must address who owns brokerage data vs. individual realtor data.

**Legal review needed for:** PIPEDA s.5 (privacy policy must accurately describe collection/use), BC PIPA s.10, Consumer Protection BC Act if applicable.

---

### TRIGGER L-6: Cross-Border Data Transfer
**Definition:** Any scenario where Canadian personal information (PI) is processed, stored, or transmitted outside Canada.

**Realtors360 examples:**
- Anthropic API (San Francisco, CA) processes listing data + seller names → **Active, unmitigated** (see THREAT_MODEL.md I-1).
- Resend (US-based) processes contact emails → Active. Resend's DPA covers GDPR; PIPEDA coverage should be confirmed.
- Twilio (US-based) sends SMS with contact phone numbers → Active. Twilio's DPA covers PIPEDA (check Twilio Trust Center).
- If a future integration uses AWS or GCP US regions, any Canadian PI stored there triggers this.

**Legal review needed for:** PIPEDA Principle 4.1.3 (accountability for transferred data), BC PIPA s.33.2 (disclosure required when PI leaves BC).

---

### TRIGGER L-7: Automated Decision-Making Affecting Clients
**Definition:** Any feature where an algorithm (AI or rules-based) makes or significantly influences a decision about a person without human review.

**Realtors360 examples:**
- AI lead scoring (`src/lib/ai-agent/lead-scorer.ts`) ranked contacts by engagement score → the score influences which leads get realtor attention. If a lead is deprioritized based solely on this score, this is automated decision-making.
- Auto-declining a showing request based on seller availability rules (hypothetical) → BCREA fiduciary duty trigger.
- AI recommending which contacts to exclude from a campaign → CASL + PIPEDA fairness principle.

**Legal review needed for:** PIPEDA s.4.9 (individuals may challenge automated decisions about themselves), Canada's proposed Bill C-27 AIDA (when enacted), BCREA Code of Ethics Rule 2 (fiduciary duty to client).

---

## 3. Current Compliance Status

| Regulation | Status | Gap | Owner |
|-----------|--------|-----|-------|
| **PIPEDA** | Partial | No privacy policy published. No DPA with Anthropic. Cross-border disclosures missing. | Product |
| **FINTRAC (PCMLTFA)** | Partial | Seller identity collection built (migration 143). Buyer identity migration added (143_buyer_identities) but PCMLTFA buyer verification requirements not fully mapped. | Product + Counsel |
| **CASL** | Partial | `casl_consent_given` / `casl_consent_date` fields on `contacts`. No consent expiry tracking (known gap in CLAUDE.md). No unsubscribe mechanism in SMS channel (email has Resend unsubscribe). | Dev + Legal |
| **BCREA Code of Ethics** | Partial | AI-generated MLS remarks require human gate (currently manual copy-paste — acceptable). No automated publishing. | Product |
| **BC PIPA** | Not assessed | BC PIPA applies to private-sector organizations in BC. Overlaps PIPEDA but has stricter consent requirements. No PIPA-specific review done. | Counsel |
| **DNCL (Do Not Call List)** | N/A | No outbound voice calls made. Re-assess if IVR/voice feature added. | — |

---

## 4. Quick Reference for Developers

Before merging any PR, ask these five questions:

1. Does this PR add a new column or field that stores info about a person? → **L-1**
2. Does this PR add a new way to send messages to contacts? → **L-2**
3. Does this PR let AI generate content that could be shown to the public or clients? → **L-3**
4. Does this PR send contact or listing data to a new external service? → **L-4 + L-6**
5. Does this PR make automated decisions about contacts (scoring, filtering, ranking)? → **L-7**

If yes to any: add `legal-review` label to the PR and tag the product owner before requesting merge.
