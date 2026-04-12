<!-- docs-audit: src/lib/ai-agent/*, src/lib/voice-learning.ts -->
# Design: Self-Learning Agent Playbook

**Date:** 2026-04-01 | **Type:** DESIGN_SPEC:architecture | **Status:** Analysis (pre-PRD)

---

## The Problem

Our playbook is static. It has 312 lines in the core + 1148 in modules + 17 hard constraints — but it only changes when a human manually edits it. Meanwhile:

- Developers make the same mistakes repeatedly (compliance log shows patterns)
- New best practices emerge globally but never reach the playbook
- Task archive stores rich execution data that nobody analyzes
- Hooks enforce rules but never adapt their thresholds
- The playbook grows bigger over time (ETH Zurich research shows long context files HURT agent performance by 3%)

**The playbook should get SMALLER and SMARTER over time, not bigger.**

---

## What We Already Have (Underutilized Signals)

| Signal | What It Captures | Currently Used? | Learning Potential |
|--------|-----------------|-----------------|-------------------|
| Compliance log | Task type, phases skipped, pass/fail | Audit only | HIGH — reveals which phases get skipped and why |
| Task archive | Full task JSON with decisions, tier, phases | NOT analyzed | HIGH — patterns in failures, rework, duration |
| Hook trigger data | Gate blocks, secret detections, lint findings | Block only | MEDIUM — could tune thresholds |
| Gap analysis versions | Scorecard progression, closed/open gaps | Reference only | MEDIUM — tracks improvement velocity |
| Voice learning engine | Edit patterns → voice rules with confidence | YES (for emails) | HIGH — proven pattern we can reuse |
| Agent decisions table | Decision type, reasoning, outcome | NOT consumed | HIGH — systematic decision failure detection |
| Golden task eval scores | Quality regression data | Run manually | MEDIUM — could trigger playbook updates |
| Git commit patterns | Which files change together, PR size, rework | NOT tracked | MEDIUM — identifies coupling |

**Key insight:** We already have the infrastructure. The learning engine (`src/lib/learning-engine.ts`) does exactly what we need — but for email marketing, not the playbook. The pattern is proven.

---

## Three Learning Speeds

Not everything should learn at the same rate.

### Speed 1: Real-Time (Per Task)

**What:** After each task, capture what went right/wrong.

**Mechanism:** The completion-gate hook already runs on every task stop. Extend it to:
1. Read the task archive JSON
2. Compare planned phases vs actual phases
3. If phases were skipped → log the reason
4. If rework happened (task restarted) → log what caused it
5. Write a 1-line "lesson" to `.claude/playbook/lessons-learned.md`

**Example lessons:**
```
2026-04-01 | CODING:bugfix | "Skipped scope analysis for 'small' fix — turned out to touch 4 files. Always scope."
2026-04-01 | GAP_ANALYSIS | "Collapsed 7 passes into 1 output — user caught it. Each pass must be sequential."
2026-04-01 | CODING:feature | "Used admin client for user data query — tenant leak. Always use tenant client."
```

**How it improves the playbook:** These lessons load into agent memory at session start. Claude reads them before starting work. High-recurrence lessons get promoted to HC rules during monthly review.

**Industry parallel:** Reflexion pattern (NeurIPS 2023) — verbal self-critique stored as episodic memory. Proven to improve agent performance by 10-15% on coding tasks.

---

### Speed 2: Weekly (Pattern Analysis)

**What:** Analyze the week's tasks for systematic patterns.

**Mechanism:** A scheduled job (Claude Code `/schedule` or cron) that runs weekly:

```
Input: .claude/task-archive/*.json + .claude/compliance-log.md (last 7 days)
Analysis:
  1. Tasks by type — which types are most common?
  2. Compliance rate — which phases get skipped most?
  3. Duration by type — are estimates in the playbook accurate?
  4. Rework rate — how often do tasks restart?
  5. Hook triggers — which gates block most? False positives?
  6. Model usage — are we using the right model for each task type?
Output: .claude/playbook/weekly-insights.md (overwritten each week)
```

**Example weekly insight:**
```markdown
## Week of 2026-03-25

**Tasks:** 14 total (5 CODING, 3 GAP_ANALYSIS, 2 TESTING, 2 DEPLOY, 1 DESIGN_SPEC, 1 DOCS)
**Compliance:** 12/14 PASS (86%) — 2 FAILs were both CODING:bugfix skipping scope analysis
**Recommendation:** Add auto-scope-check to CODING:bugfix (currently optional). Both failures were >100 lines.
**Duration:** GAP_ANALYSIS average 52 min (playbook says "medium tier" = ~30 min estimate). Update estimate.
**Model:** 3 tasks used Opus where Sonnet would suffice. Savings: ~$2.50/week.
```

**How it improves the playbook:** Weekly insights feed into the monthly review. Recurring patterns (3+ weeks) become playbook amendments.

**Industry parallel:** Rootly AI runbooks — "each incident makes your runbook stronger." Sleuth auto-generates sprint retrospectives from commit data.

---

### Speed 3: Monthly (Structural Review)

**What:** Propose specific playbook amendments based on accumulated data.

**Mechanism:** Monthly (1st of each month), generate a playbook review document:

```
Input: 4 weekly insights + compliance archive + gap analysis versions + eval results
Analysis:
  1. Rules that were NEVER violated → consider removing (playbook bloat)
  2. Rules violated 3+ times → strengthen enforcement (add hook? make HC?)
  3. New patterns discovered → propose new rules
  4. ETH Zurich principle: is the playbook getting bigger? Trim what's inferable.
  5. Industry scan: any new best practice relevant to our stack?
Output: .claude/playbook/monthly-review-YYYY-MM.md (proposed changes for human approval)
```

**Example monthly review:**
```markdown
## April 2026 Playbook Review

### Propose ADDING:
- HC-18: "CODING:bugfix with >50 lines MUST do scope analysis" — 4 incidents where bugfix scope was underestimated

### Propose REMOVING:
- Section 4.8 Phase 5 "Align terminology with CLAUDE.md" — 0 violations in 60 days. Developers already do this naturally.

### Propose UPDATING:
- GAP_ANALYSIS time estimate: "medium tier ~30 min" → "medium tier ~50 min" based on 8 task durations
- Model chaining: Opus used 12 times where Sonnet scored equally. Update guidance.

### Propose TRIMMING:
- CLAUDE.md reduced from 496 → 420 lines (removed inferable project structure)
- Playbook core: 312 lines, no change needed
```

**Critical rule:** Monthly reviews PROPOSE changes. A human reviews and approves before any playbook edit. The playbook never self-modifies without human approval.

**Industry parallel:** Constitutional AI (Anthropic) — principles evolve but through deliberate review, not automatic mutation. Braintrust prompt versioning — changes go through staging before production.

---

## External Knowledge Acquisition

The playbook should also learn from the outside world, not just internal execution.

### Mechanism: Best Practice Scanner

A monthly (or quarterly) scheduled task that:

1. **Scans for relevant updates:**
   - Anthropic blog/docs — new Claude features, API changes, best practices
   - Vercel AI SDK changelog — new patterns for `useChat`, `streamText`
   - Next.js release notes — new features relevant to our stack
   - Supabase changelog — RLS improvements, new functions
   - Security advisories — OWASP updates, new attack patterns

2. **Evaluates relevance:**
   - Does this affect any file in our codebase?
   - Does it contradict any existing HC rule?
   - Does it offer a better approach than what we currently do?

3. **Proposes updates:**
   - "Anthropic released extended thinking for Haiku — could replace our query planner approach"
   - "New Supabase RLS syntax simplifies our migration pattern"
   - "OWASP updated prompt injection guidance — 3 new patterns to add to guardrails"

**Where this lives:** `.claude/playbook/external-updates.md` — reviewed monthly alongside the playbook review.

**Industry parallel:** DSPy (Stanford) auto-optimizes prompts based on metrics. We're not auto-optimizing, but we're auto-detecting when optimization is needed.

---

## Architecture Summary

```
                    ┌─────────────────────────┐
                    │  Developer works on task  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Hooks enforce playbook   │
                    │  (L1-L5, existing)        │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │       Task completes → Archive       │
              │  completion-gate.sh writes task JSON  │
              └──────────┬──────────────┬───────────┘
                         │              │
            ┌────────────▼───┐  ┌───────▼────────────┐
            │ REAL-TIME (S1)  │  │                    │
            │ Lesson learned  │  │  .claude/task-     │
            │ → lessons.md    │  │  archive/*.json    │
            └────────────────┘  └───────┬────────────┘
                                        │
                           ┌────────────▼────────────┐
                           │   WEEKLY (S2) — cron     │
                           │   Analyze task patterns   │
                           │   → weekly-insights.md    │
                           └────────────┬────────────┘
                                        │
                           ┌────────────▼────────────┐
                           │  MONTHLY (S3) — cron     │
                           │  Propose playbook edits   │
                           │  + External knowledge     │
                           │  → monthly-review.md      │
                           └────────────┬────────────┘
                                        │
                           ┌────────────▼────────────┐
                           │  HUMAN REVIEWS & APPROVES │
                           │  Edits playbook manually   │
                           └──────────────────────────┘
```

**Key principle:** The system PROPOSES, the human DECIDES. No auto-modification of the playbook.

---

## What This Gets Us

| Capability | Current | With Self-Learning |
|-----------|---------|-------------------|
| Learns from mistakes | Manual (human notices, edits playbook) | Auto-captured per task, surfaced weekly |
| Adapts thresholds | Static (hardcoded in hooks) | Data-driven proposals monthly |
| Tracks best practices | Manual (human reads blogs, updates) | Quarterly external scan with relevance check |
| Playbook size management | Grows over time (2032 → split → 312+1148) | Monthly trim review (remove unused rules) |
| Time estimates | Guesses in playbook | Data-driven from task archive |
| Model selection | Guidelines in Section 5 | Actual usage data → cost optimization proposals |

---

## Implementation Plan

### Phase 1: Lessons Learned (1 day)
- Extend `completion-gate.sh` to write lesson to `lessons-learned.md`
- Create `.claude/playbook/lessons-learned.md` (loaded at session start)
- Lessons format: date | task type | one-line lesson

### Phase 2: Weekly Insights (2 days)
- Build `scripts/analyze-task-patterns.mjs` — reads archive + compliance log
- Schedule via `/schedule` or manual weekly run
- Output: `.claude/playbook/weekly-insights.md`

### Phase 3: Monthly Review (1 day)
- Build `scripts/generate-playbook-review.mjs` — reads weekly insights + eval results
- Proposes additions, removals, updates, trims
- Output: `.claude/playbook/monthly-review-YYYY-MM.md`

### Phase 4: External Scanner (2 days)
- Build `scripts/scan-external-updates.mjs` — checks relevant changelogs/blogs
- Maps updates to affected codebase files
- Output: `.claude/playbook/external-updates.md`

**Total: ~6 days across 4 phases.**

---

## What NOT to Build

Based on the research, these are tempting but wrong for our stage:

1. **Auto-modifying playbook** (DGM/Hyperagents pattern) — Too risky. The playbook is our safety net. It must not modify itself.
2. **Full RLHF pipeline** — Requires model training. We use frozen API models.
3. **Complex memory schemas** (ALMA) — Over-engineering. File-based memory is sufficient.
4. **Multi-agent evolution** (Hyperagents) — Fascinating research but non-commercial license and too complex for 1-3 devs.

**What TO build:** The simple loop — capture lessons, analyze patterns, propose changes, human approves. This is the Reflexion + Rootly pattern and it works.

---

## Research Sources

- ETH Zurich AGENTS.md Study (Feb 2026) — LLM-generated context files degrade performance 3%
- Reflexion (NeurIPS 2023) — Verbal self-correction improves coding agents 10-15%
- CrewAI Memory System — Four memory types with auto-consolidation
- DSPy (Stanford) — Programmatic prompt optimization
- Rootly AI Runbooks — "Each incident makes your runbook stronger"
- MemRL (arXiv 2601.03192) — Runtime learning without weight updates
- Claude Code Auto-Dream — Memory consolidation during idle
- Addy Osmani — Self-improving coding agents via AGENTS.md loop
- Constitutional AI (Anthropic) — Principles evolve through deliberate review
- Braintrust — Prompt versioning with eval gates
