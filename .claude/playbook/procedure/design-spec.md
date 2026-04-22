# DESIGN_SPEC Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Phase 0 — Feature Justification**
- Describe existing behavior and related components. Extension or new capability?
- Answer: What problem does this solve for BC realtors? What measurable benefit?
- Compare against 2-3 reference products (Follow Up Boss, LionDesk, kvCORE, Realvolve):
  - What do they do here? Are we copying, differentiating, or staying simpler?
  - What's our unique angle? (BC compliance, voice agent, AI content)
- Conclude: "Does this fit Realtors360's vision?" If unclear → ask the product owner.
- Document in `usecases/<feature-name>.md` with problem statement + 3 scenarios + demo script

**Phase 1** — Goals, non-goals, constraints, success metrics, dependencies

**Phase 2** — Current state audit. What exists that we can reuse?

**Phase 3** — 2+ design options with pros/cons/risks

**Phase 4** — Detailed design: data model, API surface, components, data flow, error handling, security. **Verify against Architectural Principles (Section 1.2.1).**

**Phase 5** — Operational: deployment plan, monitoring, failure modes, cost. **Verify against Principle 4 (Rollout & Operations).**

**Phase 6** — Implementation plan (use template below)

---

## PRD Template (10 Sections — Required for Large Tier Tasks)

Before building any large feature, create `docs/PRD_<feature>.md` with these 10 sections:

| # | Section | Content |
|---|---------|---------|
| 1 | **Problem Statement** | What pain exists? Who feels it? What's the cost of inaction? |
| 2 | **Goals & Success Metrics** | 3-5 measurable outcomes (e.g. "reduce listing time from 4h to 1h") |
| 3 | **Non-Goals** | What this feature explicitly will NOT do (scope fence) |
| 4 | **User Stories** | As a [role], I want [action], so that [benefit] — minimum 5 stories |
| 5 | **Current State** | What exists today? What works? What's broken? (link to gap analysis if exists) |
| 6 | **Proposed Solution** | Architecture, data model, UI wireframes, API surface. 2+ design options with trade-offs. |
| 7 | **Implementation Plan** | Phased rollout (see template below). Files per phase. Dependencies between phases. |
| 8 | **Test Strategy** | Test types needed, acceptance criteria per story, eval metrics |
| 9 | **Risks & Mitigations** | Technical risks, compliance risks, cost risks — each with mitigation |
| 10 | **Timeline & Resources** | Phases with effort estimates, who does what, dependencies on external teams |

PRD must be **user-approved** before implementation begins.

---

## Implementation Plan Template

Every implementation plan (PRD Section 7 or DESIGN_SPEC Phase 6) must follow this structure:

**Phase boundary criteria** — Split into phases when:
- A phase delivers a testable, demoable increment
- A phase has no more than 5-8 files changed
- Each phase can be merged independently without breaking existing features

**Template:**
```markdown
## Phase N: [Name] (Est: X hours)

**Goal:** [One sentence — what's demoable after this phase?]

**Files:**
- CREATE: [new files]
- MODIFY: [existing files]

**Dependencies:** [What must be done before this phase?]

**Database:** [New tables/columns/migrations? List them]

**Test plan:** [Which tests to write + which existing tests to run]

**Rollout:** [Feature flag? Migration? Config change?]

**Done when:** [Specific acceptance criteria — not "it works"]
```

**Rules:** Phase 1 = data layer. Phase 2 = API/backend. Phase 3+ = UI. Last = integration test + docs. Max 5 phases without user checkpoint.

---

## Test Execution Decision Matrix

**Which tests to run and when:**

| Trigger | What to Run | Command | SLA |
|---------|-------------|---------|-----|
| **Any code change** | TypeScript check | `npx tsc --noEmit` | 30s |
| **Before every commit** | Smoke test | `bash scripts/test-suite.sh` | 2 min |
| **Schema/migration change** | Full test suite + constraint tests | `bash scripts/test-suite.sh` | 2 min |
| **Email marketing change** | Email engine QA | `node scripts/qa-test-email-engine.mjs` | 5 min |
| **UI change** | Playwright e2e | `npx playwright test` | 3 min |
| **Agent/prompt/tool change** | Agent eval suite | Golden tasks (tests/agent-evals/) | 10 min |
| **Before deploy** | Full suite + email QA + Playwright | All of the above | 15 min |
| **Domain-specific change** | Relevant eval script | `node scripts/eval-<domain>.mjs` | 5 min |

**Test tool inventory:**

| Tool | Location | Tests | What It Covers |
|------|----------|-------|---------------|
| `test-suite.sh` | `scripts/` | 73+ | Navigation (35 routes), CRUD (7 entities), data integrity, auth, cascade delete |
| `qa-test-email-engine.mjs` | `scripts/` | 28 | Email pipeline: text, blocks, quality, send, webhooks, crons |
| `eval-*.mjs` (8 scripts) | `scripts/` | Varies | Domain evals: RAG, content, workflow, recommendations, etc. |
| Playwright | `tests/` | Varies | Browser e2e: login, navigation, form submission, UI rendering |
| `evals.md` | repo root | 200 | Manual QA test cases (reference, not automated) |

**Reading test output:**
- `test-suite.sh`: Look for `PASS`/`FAIL` per category. Any FAIL = investigate before commit.
- Playwright: `npx playwright test --reporter=list` for verbose. Screenshots in `test-results/` on failure.
- Eval scripts: Output score per test case. Check for regressions against previous run.

---

## 7-Pass Iterative Analysis (Mandatory for DESIGN_SPEC & GAP_ANALYSIS)

Every gap analysis, PRD, architecture doc, or design spec MUST go through 7 iterative passes. Never present a single-pass output as final. Each pass takes **2-5 minutes of genuine thinking** — not a 30-second skim.

| Pass | Focus | Key Question | Anti-Rush Gate (HC-15) |
|------|-------|-------------|----------------------|
| **1. Self-Analysis** | Read the subject thoroughly (every file, every line). Document findings with file:line references. Categorize by severity. | "What gaps exist right now?" | **Read twice before writing.** Don't start documenting after skimming — read the full subject end-to-end, then re-read for what you missed, then write. |
| **2. Best-in-Market** | Compare against industry best practices and competitor implementations. Use structured frameworks (SWOT, COBIT, CMMI, MoSCoW, RACI) for each section. Find what Pass 1 missed. | "What would the best version look like?" | **Consider 2+ frameworks before picking.** Don't default to bullet points — choose the right analysis framework for each section. |
| **3. Code Verification** | Cross-check EVERY claim against actual source code. Are file paths real? Do referenced functions exist? Are stats accurate? Find contradictions. **HC-13 enforced here.** | "Is what I wrote actually true in the code?" | **Never propose changes to code you haven't read.** For each claim, run the grep/read/check. |
| **4. Depth Check** | Re-read looking for surface-level sections. Every section should demonstrate deep knowledge, not just list items. Are acceptance criteria testable? Are designs implementable? | "Did I go deep enough or just skim?" | **If a section took <1 minute to write, it's probably surface-level.** Go back and add evidence, examples, or specifics. |
| **5. Completeness** | Final read-through for gaps, formatting, numbering, cross-references. Check nothing was missed. | "Is anything still missing?" | **Re-read the ORIGINAL request.** Did you answer what was ASKED, or what you assumed? |
| **6. Gap Reconciliation** | Compare the document against the ORIGINAL requirements/spec. Identify any requirement that was asked for but not addressed. List remaining gaps explicitly. | "Does this actually cover everything that was asked?" | **Carefully consider the blast radius.** What happens if someone acts on your recommendations and they're wrong? |
| **7. Implementation Sanity** | For every recommendation/fix proposed: Does it actually make sense? Is it feasible? Is the effort estimate realistic? Challenge your own suggestions. | "Would I bet my reputation on these recommendations?" | **Re-read your entire output before presenting.** If any recommendation feels "good enough" — it isn't. |

**Rules:**
- Each pass MUST read the output of the previous pass — not rubber-stamp it
- Passes are sequential — each builds on the previous
- **L3 checkpoint MANDATORY between every pass** (see governance.md §15.3 for format)
- Present the final version only after all 7 passes
- Note the pass count in the document header
- "Each pass takes 2-5 minutes" means real thinking — if a pass takes 30 seconds, redo it
- If L3 "Am I rubber-stamping?" = yes → redo the pass

**When to use 7-pass:** Gap analyses, PRDs, architecture specs, audit documents.
**When NOT to use:** INFO tasks, simple code changes, bug fixes, micro/small tier tasks.
