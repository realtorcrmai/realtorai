# PRD Template — ListingFlow

> **Reference PRD:** `PRD_Newsletter_Journey_Engine.md` (repo root) and the Social Media Content Studio PRD.
> Every PRD must match the reference's depth, specificity, and structure. Zero tolerance for vague language.
> Save completed PRDs to `docs/PRD_<Feature_Name>.md`.

---

## PRD Header (mandatory)

```markdown
# PRD: ListingFlow [Feature Name] — [Subtitle]

> **Version:** 1.0
> **Date:** [YYYY-MM-DD]
> **Author:** ListingFlow Product Team
> **Status:** Draft
> **Based on:** [Research scope — e.g., "Market research across X cities, Y+ sources"]
```

- "Based on" line is mandatory — cite the research scope (number of sources, markets, competitors analyzed)
- Status tracks lifecycle: Draft -> Review -> Approved -> In Progress -> Complete

---

## Section 1 — Problem Statement

Three subsections, each mandatory:

**1a. The Core Problem**
- Single dense paragraph (not bullets)
- Must include **bold inline stats**: specific dollar amounts, time costs, percentages
- Name the exact pain: how many hours, how much money, how many tools
- Example quality bar: "Real estate agents spend **5-10 hours per week** creating social media content manually... They cobble together 3-5 separate tools... costing **$100+/month**... video gets **403% more inquiries**, but only **33% of agents** are comfortable producing it."

**1b. Why This Matters**
- 5-8 bullet points, each with a **bold stat** and source citation (e.g., "NAR 2025")
- Mix: adoption stats, revenue impact, competitive gap stats, time savings potential
- Each bullet must contain a number — no vague bullets like "It's important for agents"

**1c. What Exists Today (and Why It Fails)**
- Competitor comparison table with columns: `Tool (with price)` | `What It Does` | `Why It Fails`
- Include 5-8 specific named competitors with their monthly pricing in the tool column
- Below the table: **total cost summary line** (e.g., "Total cost: $100-200/mo for 5-7 disconnected tools")
- Final line: **"No tool combines:"** followed by the unique combination this feature provides

---

## Section 2 — Vision

Three subsections:

**2a. One Sentence**
- Single sentence describing what the feature does, written as a value proposition
- Pattern: "[Product] turns [trigger] into [outcome] — [differentiator]"

**2b. The 30-Second Pitch**
- 2-3 sentences covering the full flow: trigger -> action -> benefit -> result
- Name what it replaces: "No Canva. No CapCut. No ChatGPT. No Buffer."
- End with the time savings: "30 minutes a week instead of 10 hours."

**2c. Success Metrics**
- Table: `Metric` | `Target` | `Current Baseline`
- 5-8 rows, all with specific numbers (never "improve" or "better" — always quantified)
- Include at least: time metric, output metric, adoption metric, quality metric, attribution metric

---

## Section 3 — Target Users

3 personas, each with a **real name** and **role label** in the heading:

**Format per persona:**
```markdown
### Primary: [Name] ([Role])
- **Demographics:** Age range, experience level, income range
- **Tech comfort:** Specific tools they use, what they're comfortable/nervous with
- **Pain:** Narrative sentence about their actual weekly routine and specific frustrations
- **Goal:** One sentence — what they want to achieve
- **Budget:** Dollar range per month for tools in this category
```

- Pain is a **narrative**, not a bullet list — describe their actual weekly behavior
- Tech comfort names **specific tools** they use today (iPhone, Instagram, Canva)
- Budget is always a dollar range, never vague

---

## Section 4 — High-Level Feature List

**Phased tables with named themes:**

```markdown
### Phase 1 — [Theme Name] (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| **F1: [Name]** | [Single sentence: trigger -> action -> output] | P0 |
| **F2: [Name]** | [Single sentence describing full flow] | P0 |
```

Rules:
- Feature IDs are **bold** in the table: `**F1: Listing-to-Content**`
- Each description is a **single sentence** describing the complete flow (not a vague label)
- Each phase has a **named theme** (e.g., "Content Engine", "Multi-Platform Publishing", "Intelligence & Attribution")
- Priorities: P0 = must ship in this phase, P1 = should ship, P2 = nice to have
- Features must be numbered sequentially across ALL phases (F1-F43, not restarting per phase)
- 5-12 features per phase, 3-5 phases typical

---

## Section 5 — Detailed User Stories & Acceptance Criteria

**Structure:**

```markdown
### Epic 1: [Epic Name] (F1, F2, F5, F8)

**US-1.1: [Short descriptive title]**
> As a [role], when [specific trigger], I want [specific outcome], so [specific benefit].

**Acceptance Criteria:**
- [ ] [Specific, testable criterion with exact numbers]
- [ ] [Another criterion naming exact fields, counts, timeouts]
```

Rules:
- Epic headings reference **feature IDs in parentheses**: `(F1, F2, F5)`
- User story IDs follow `US-[epic].[story]` pattern: US-1.1, US-1.2, US-2.1
- User story is in a **blockquote** (>) — not plain text
- 5-15 acceptance criteria per story
- Every AC item must be **testable with exact numbers**: "within 60 seconds", "5 variants", "max 30 hashtags", "up to 10 slides", "2,200 chars max"
- AC items reference **specific existing code** when extending: `(src/lib/voice-learning.ts)`
- AC items specify **what NOT to do** when important: "Does NOT publish automatically — goes to approval queue (client privacy)"
- AC items name **exact field values**, **exact counts**, **exact formats**, **exact pixel dimensions**
- Include 5-7 epics with 2-4 user stories each

---

## Section 6 — Technical Design

**6 subsections, each mandatory where applicable:**

**6a. Architecture**
- ASCII box diagram showing UI components -> server layer -> external services
- Label each box with technology: `CRM (Next.js 16)`, `Claude AI (content)`, `Supabase (data)`
- Show platform/API dependencies below the diagram as a tree

**6b. New Files & Modules**
- Complete file tree with **inline `#` comments** explaining every file's purpose
- Organized by layer: `app/(dashboard)/`, `app/api/`, `actions/`, `components/`, `lib/`, `emails/`
- Every file listed — no "etc." or "..."

**6c. Database Schema**
- Complete SQL wrapped in ```sql code block
- Include **migration file number** as a comment: `-- Migration: 058_social_media_studio.sql`
- Every column has an **inline comment** explaining allowed values: `-- instagram, facebook, tiktok, youtube, linkedin, pinterest`
- Include: `CREATE TABLE`, column defaults, `CREATE INDEX`, `CREATE UNIQUE INDEX`
- Include: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` for **every** table
- Group related columns with **section comments**: `-- Content`, `-- Source`, `-- Status & scheduling`, `-- AI metadata`, `-- Engagement`, `-- Attribution`

**6d. Platform API Requirements** *(if external integrations)*
- Table: `Platform` | `API` | `Auth` | `Key Limits`
- Key Limits must be **specific numbers**: "200 calls/user/hour", "3 video uploads/day for unverified apps", "10,000 units/day quota"

**6e. AI Content Generation** *(if AI-powered)*
- Complete prompt template in a code block with:
  - System prompt with role definition
  - Variable placeholders in `{curly_braces}`
  - Numbered output format specifying exact platform variants
  - Rules section within the prompt listing voice rules, constraints, banned words
- This is a **complete, copy-pasteable prompt** — not a description of what the prompt should do

**6f. Cron Jobs** *(if scheduled tasks)*
- Table: `Cron` | `Schedule` | `Purpose`
- Schedule uses **exact intervals**: "Every 5 min", "Every 4 hours", "Monday 8 AM", "Daily 2 AM"
- Purpose is a **complete sentence** describing the full action

---

## Section 7 — Launch Plan

```markdown
### Phase 1: [Name] ([X] weeks)
- [Deliverable 1]
- [Deliverable 2]
- [Deliverable N]

**Launch gate:** [Specific measurable criteria with exact numbers]
```

Rules:
- Every phase has a **duration in weeks**
- Launch gates use **exact numbers**: "5 beta agents using daily, generating 10+ posts/week each, >50% approval rate on first drafts"
- Never use vague gates: "feature works well" = X, "users are happy" = X
- Each gate should specify: who (N users), what (metric), threshold (number)

---

## Section 8 — Pricing Strategy *(if applicable)*

- Tier table: `Plan` | `Price` | `Includes`
- 3-4 tiers from free/included to premium
- Below the table: **value proposition math line** showing exact savings
- Example: "Replaces Coffee & Contracts ($54) + Canva Pro ($13) + Later ($25) + CapCut ($8) = **$100/mo saved** at $49/mo."
- If not applicable: write "N/A — included in base CRM" (section must still exist)

---

## Section 9 — Risk & Mitigation

- Table: `Risk` | `Likelihood` | `Impact` | `Mitigation`
- 5-8 risks minimum
- Likelihood and Impact use: Low / Medium / High
- Mitigation is an **actionable sentence** — not a vague strategy
- Example: "Apply for API access early (Meta, TikTok require app review). Start with Instagram (easiest approval)." — not just "Plan ahead"

---

## Section 9b — Downsides & Tradeoffs

For each major design decision in Section 6, answer these 5 questions:

| # | Question | Answer |
|---|----------|--------|
| 1 | **What do we lose or break for others?** Existing behavior removed? Other integrations affected? | |
| 2 | **What happens if we're wrong? Can we undo it?** Blast radius? Partial failure state? | |
| 3 | **What unverified assumptions does this embed?** Root cause confirmed or theory? | |
| 4 | **What gets harder to debug, test, or maintain?** New complexity, hidden state, generic errors? | |
| 5 | **What edge cases does this create?** Works for common case but fails for unusual inputs/environments? | |

Rules:
- Every non-N/A answer must have a **mitigation** (how we address or accept the tradeoff)
- If a downside has no mitigation, it's a risk — move it to Section 9
- This section forces honest assessment of what we're trading away, not just what we're building

---

## Section 10 — Competitive Moat

```markdown
What makes this different from [Competitor A] + [Competitor B] + [Competitor C]:

1. **[Bold Label]** — [One-line explanation]
2. **[Bold Label]** — [One-line explanation]
```

Rules:
- Opening line names the specific competitors being beaten
- 5-8 numbered differentiators
- Each has a **bold label** + em-dash + one-line explanation
- Focus on what's **structurally impossible** for competitors (CRM data, AI learning, full attribution)

---

## PRD Footer

```markdown
---
*PRD Version 1.0 — [Date]*
*Based on research across [N]+ sources, [markets]*
```

---

## PRD Quality Rules (all must be met):

1. **Feature ID traceability** — Every F-ID appears in Section 4 (feature list), Section 5 (epics reference them), Section 6 (files implement them), and Section 7 (phases deliver them).
2. **Numbers everywhere** — Every stat in Section 1 is a real number. Every AC in Section 5 has exact counts/limits/timeouts. Every launch gate in Section 7 has a threshold.
3. **Implementation-ready Section 6** — A developer who reads ONLY Section 6 can start coding. Complete SQL (not pseudocode), complete file tree (not "etc."), complete prompts (not descriptions).
4. **Acceptance criteria are binary** — Every `- [ ]` item can be verified as true or false with no subjective judgment. "Works well" = X. "Generates 5 variants within 60 seconds" = OK.
5. **Competitor table has prices** — Every competitor in Section 1 includes their monthly cost.
6. **Personas have narratives** — Pain points are written as a story about the user's week, not abstract bullets.
7. **All tables have RLS** — Every CREATE TABLE in Section 6 is followed by ENABLE ROW LEVEL SECURITY + CREATE POLICY.
8. **File paths follow project structure** — `src/app/(dashboard)/`, `src/actions/`, `src/components/`, `src/lib/`, `supabase/migrations/`
9. **Inline SQL comments** — Every column in the schema has a comment explaining allowed values or purpose.
10. **No section skipped** — All 10 sections present. Section 8 may say "N/A" but it must exist.
