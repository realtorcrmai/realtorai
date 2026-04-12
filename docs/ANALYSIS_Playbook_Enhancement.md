<!-- docs-audit: .claude/agent-playbook.md -->
# Agent Playbook Enhancement Analysis

> **Date:** March 30, 2026
> **Version:** 1.0 — 5-pass iterative analysis
> **Scope:** Compare ListingFlow agent-playbook.md v7.2 against best-in-market AI agent configurations (2025-2026)
> **Sources:** Anthropic 2026 Agentic Coding Trends Report, GitHub spec-kit, McKinsey/QuantumBlack, HumanLayer, harness-engineering, Linear, AGENTS.md standard, 50+ community repos
>
> **Pass history:**
> - Pass 1: Identified 18 gaps across 6 categories
> - Pass 2: Compared against 8 best-in-market systems, found 7 new gaps (25 total)
> - Pass 3: Verified all claims against actual codebase (hooks, scripts, settings)
> - Pass 4: Depth check — expanded surface-level recommendations into implementable specs
> - Pass 5: Final priority matrix, effort estimates, implementation plan

---

## CURRENT STATE ASSESSMENT

### What's Already Excellent (Keep)

| Feature | Why It's Good | Competitive Benchmark |
|---------|--------------|----------------------|
| **4-tier task classification** (micro/small/medium/large) | Clear ceremony scaling. Most agent configs are one-size-fits-all. | Better than 90% of .cursorrules and CLAUDE.md files analyzed |
| **5-pass analysis process** | No other agent config mandates iterative analysis. Unique differentiator. | No competitive equivalent found |
| **Mechanical hooks** (4 hooks in settings.json) | Blocking PreToolUse gates, state-file tracking, auto-archive. Best practice per Anthropic. | Top 5% — most teams use prose only |
| **Downside check** (Q1-Q5) | Structured risk assessment before coding. Catches misdiagnosis, irreversibility. | Comparable to GitHub spec-kit phase gates |
| **Self-healing protocol** (3 retries, hypothesis-driven) | Prevents blind retries and error suppression. | Better than default agent behavior |
| **Domain rules** (Sections 6.1-6.6) | Real-estate-specific guard rails (FINTRAC, CASL, E.164 phones). | Domain-specific rules are rare; this is ahead |
| **Compliance logging** | Append-only audit trail for Medium+ tasks. | Comparable to enterprise CI/CD audit requirements |

### What's Missing (18 Gaps)

---

## GAP 1: No SDLC State Machine — Tasks Jump Straight to Code

**Severity: HIGH | Current:** The playbook has tiers and phases (classify → scope → plan → code → validate). But there's no **explicit state machine** with enforced transitions.

**Best-in-market (Anthropic 2026 Report + McKinsey):**
```
INTENT → SPEC → PLAN → IMPLEMENT → VERIFY → DOCS → REVIEW → RELEASE → MONITOR
```
Agents may only advance states when deterministic gates pass. The key insight: **agents don't decide what phase they're in** — the orchestration layer does.

**What to add:** Formalize the state machine in the playbook. The current `current-task.json` phases are close but don't include SPEC (PRD) as a tracked phase or REVIEW as a required step.

**Fix:** Add `phases.spec_written`, `phases.review_complete` to current-task.json. Update playbook-gate.sh to enforce SPEC phase for Large tasks.

---

## GAP 2: No Verification Lattice — Only 2 of 5 Layers

**Severity: HIGH | Current:** Validation is `tsc --noEmit` + `test-suite.sh`. That covers Layer 1 (deterministic) only.

**Best-in-market (5-layer verification lattice):**

| Layer | What | Current Status |
|-------|------|---------------|
| 1. Deterministic | build, typecheck, lint, unit tests | **HAVE** (tsc + test-suite) |
| 2. Semantic | contract tests, snapshot tests, golden tests | **MISSING** |
| 3. Security | SAST, dependency scan, secret scan | **MISSING** |
| 4. Agentic | AI review agent checks style, spec adherence | **MISSING** |
| 5. Human | Risk-based escalation, final acceptance | **PARTIAL** (human-in-the-loop for Critical/High, but no risk scoring) |

**What to add:**
- Layer 3: Add `npm audit --audit-level=high` and a secret pattern scanner to pre-commit/pre-push
- Layer 4: Add a `security-reviewer` subagent that runs on Medium+ tasks
- Layer 5: Add risk scoring to PR descriptions

---

## GAP 3: No Secret Detection Hook

**Severity: CRITICAL | Current:** `git-protection.sh` blocks force push and push to main — but has **zero secret detection**. The playbook says "NEVER commit .env.local" but doesn't enforce it.

**Best-in-market:** Pre-commit hooks with TruffleHog, detect-secrets, or git-secrets. The harness-engineering approach uses `check-secrets.js` that pattern-matches API keys, tokens, and private keys.

**What to add:** New hook `secret-scan.sh` on PreToolUse (Bash) that blocks `git commit` if staged files contain secret patterns (`sk-`, `AKIA`, `-----BEGIN`, `Bearer `, API key patterns).

---

## GAP 4: No Auto-Lint/Format Hook

**Severity: MEDIUM | Current:** No PostToolUse hooks at all. After writing code, formatting is manual.

**Best-in-market:** harness-engineering runs auto-format after every edit. Anthropic docs recommend PostToolUse hooks for auto-lint.

**What to add:** PostToolUse hook on Edit/Write that runs `npx eslint --fix` on changed .ts/.tsx files. Lightweight, prevents style drift.

---

## GAP 5: No Subagent Definitions

**Severity: HIGH | Current:** No `.claude/agents/` directory. All work is done by a single agent context.

**Best-in-market:** Define specialized subagents with explicit model selection and tool restrictions:

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| `security-reviewer` | Opus | Read, Grep, Glob | Scan for OWASP Top 10, XSS, SQL injection, auth bypass |
| `code-reviewer` | Sonnet | Read, Grep, Glob | Fresh-eye review: naming, complexity, error handling, edge cases |
| `test-writer` | Sonnet | Read, Grep, Write | Generate tests for new code (unit + integration) |
| `migration-reviewer` | Opus | Read, Grep | Check migration safety: rollback plan, idempotency, index coverage |

**What to add:** Create `.claude/agents/` with 4 agent definitions. Reference in playbook for Medium+ tasks.

---

## GAP 6: No AGENTS.md (Cross-Tool Standard)

**Severity: MEDIUM | Current:** Instructions are in CLAUDE.md (Claude Code specific) only.

**Best-in-market:** AGENTS.md is the vendor-neutral standard (Linux Foundation, adopted by OpenAI Codex, GitHub Copilot, Cursor, Windsurf). Over 60,000 repos include one.

**What to add:** Create `AGENTS.md` at repo root with universal instructions that any AI coding tool can read. Keep tool-specific nuances in CLAUDE.md.

---

## GAP 7: No Writer/Reviewer Pattern

**Severity: MEDIUM | Current:** Same agent context writes and reviews code. Confirmation bias is guaranteed.

**Best-in-market (Addy Osmani):** Writer/Reviewer pattern — one session implements, a fresh session reviews. This avoids the agent rubber-stamping its own work.

**What to add:** For Medium+ tasks, the playbook should mandate spawning a `code-reviewer` subagent (Gap 5) before the PR. The reviewer runs in a separate context with no access to the implementation reasoning.

---

## GAP 8: No Interview Pattern for Large Specs

**Severity: LOW | Current:** Large tasks require a PRD from `docs/templates/PRD_TEMPLATE.md`. But the PRD is written by the agent based on a brief user prompt.

**Best-in-market (GitHub spec-kit + Addy Osmani):** For larger features, have the AI **interview** the user first:
```
I want to build [brief description]. Interview me using AskUserQuestion.
Ask about technical implementation, UI/UX, edge cases, concerns, and tradeoffs.
Keep interviewing until we've covered everything, then write a complete spec.
```

**What to add:** Add interview step to Large tier: before writing PRD, ask 5-8 clarifying questions using AskUserQuestion.

---

## GAP 9: No Risk Scoring for PRs

**Severity: MEDIUM | Current:** PR descriptions include classification + what changed + test results. No risk score.

**Best-in-market (Anthropic 2026 Report):**
```
Risk Score = lines_changed * file_criticality * auth_touched * schema_changed * new_deps
Score 0-2: auto-merge after gates
Score 3-6: human review required
Score 7-10: 2-person review + staged rollout
```

**What to add:** Calculate risk score in PR description. Factors: lines changed, critical files (auth.ts, supabase/, migrations/), schema changes, new dependencies. Display as "Risk: LOW/MEDIUM/HIGH" in PR template.

---

## GAP 10: No Property-Based / Mutation Testing

**Severity: MEDIUM | Current:** Tests are assertion-based (test-suite.sh, eval scripts). No property-based testing, no mutation testing.

**Best-in-market:**
- **Property-based (fast-check):** Generates random inputs to find edge cases AI code misses
- **Mutation testing (Stryker):** Measures test effectiveness by introducing faults. 70%+ mutation score for critical paths.

**What to add:** Add `fast-check` for server actions that process user input (contacts, listings, showings). Add Stryker for critical paths (auth, workflow advancement, email send). Target: 70% mutation score on `src/actions/` and `src/lib/validated-send.ts`.

---

## GAP 11: No Progressive Disclosure in CLAUDE.md

**Severity: MEDIUM | Current:** CLAUDE.md is 600+ lines. Research says <300 lines for optimal agent performance.

**Best-in-market (HumanLayer):** Three-tier progressive disclosure:
- **Tier 1** (CLAUDE.md): Universal rules only, <300 lines
- **Tier 2** (`.claude/skills/` + `docs/`): On-demand domain knowledge
- **Tier 3** (`docs/plans/`): Deep specs loaded when relevant

**What to add:** Move domain-specific sections (Email Engine, Sites Platform, Voice Agent) from CLAUDE.md to separate skill/reference files. Keep CLAUDE.md focused on: tech stack, project structure, coding conventions, commands.

---

## GAP 12: No Automated TypeScript Check on Stop

**Severity: HIGH | Current:** `completion-gate.sh` checks `phases.validated == true` but relies on the agent self-reporting. No automated `tsc --noEmit` execution.

**Best-in-market:** Stop hooks should run deterministic checks automatically, not trust the agent's self-report.

**What to add:** Modify `completion-gate.sh` to actually run `npx tsc --noEmit` and check exit code, rather than trusting `phases.validated`.

---

## GAP 13: No Observability / Decision Trail

**Severity: LOW | Current:** Compliance log captures task summaries. But no per-decision audit trail (why the agent chose approach X over Y).

**Best-in-market (OpenTelemetry, Braintrust):** Log every tool call with timestamp, args hash, result hash. Track token consumption per task.

**What to add:** This is infrastructure-heavy. For now, add a lightweight version: append reasoning to `current-task.json` as a `decisions` array. Each entry: `{ step, decision, rationale, timestamp }`.

---

## GAP 14: Deploy Skill Contains Hardcoded Secrets

**Severity: CRITICAL | Current:** `.claude/skills/deploy.md:127-136` contains the actual Supabase URL (`ybgiljuclpsuhbmdhust.supabase.co`). This file is committed to git.

**Fix:** Replace with `<from-vault>` placeholders. Reference `scripts/vault.sh decrypt` for actual values.

---

## GAP 15: No Visual Regression Testing

**Severity: LOW | Current:** No screenshot comparison for UI changes.

**Best-in-market:** Playwright screenshots + Chromatic for visual regression. Catches UI drift that functional tests miss.

**What to add:** Add Playwright screenshot tests for key pages (dashboard, listings, contacts, newsletters). Compare against golden screenshots.

---

## GAP 16: Playbook Section Numbering Is Broken

**Severity: LOW | Current:** Section 6 header says "6. Validation" but subsections say "5.2", "5.3". Section 7 says "7. Domain Rules" but subsections say "6.1", "6.2".

**Fix:** Renumber all sections consistently.

---

## GAP 17: No npm Scripts for Common Agent Tasks

**Severity: MEDIUM | Current:** Only 4 npm scripts: `dev`, `build`, `start`, `lint`. Agent must remember raw commands.

**Best-in-market (Makefile/scripts pattern):**
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "bash scripts/test-suite.sh",
  "test:quick": "npx vitest run",
  "health": "bash scripts/health-check.sh",
  "seed": "node scripts/seed-demo.mjs",
  "audit": "npm audit --audit-level=high"
}
```

**What to add:** Standard entrypoints so the agent (and humans) can run `npm test`, `npm run typecheck`, `npm run health`.

---

## GAP 18: No Model Routing Table in Playbook

**Severity: LOW | Current:** Section 9.3 lists approved models but doesn't specify routing rules per task phase.

**Best-in-market:**

| Task Phase | Model | Why |
|-----------|-------|-----|
| Classification/triage | Haiku | Fast, cheap, sufficient |
| Scope/plan writing | Sonnet | Good quality/cost for text generation |
| Architecture/security review | Opus | Deep reasoning needed |
| Code implementation | Sonnet | Best quality/speed ratio |
| 5-pass analysis (at least 1 pass) | Different model | Fresh perspective requirement |

**What to add:** Add explicit model routing table to playbook Section 9.3.

---

## PRIORITY MATRIX

### P0 — Fix Immediately (Security/Correctness)

| # | Gap | Effort | Impact |
|---|-----|--------|--------|
| 3 | Secret detection hook | 2 hours | Prevents credential leaks |
| 14 | Deploy skill hardcoded secrets | 30 min | Remove committed secrets |
| 16 | Section numbering broken | 30 min | Readability/trust |

### P1 — High Value Enhancements

| # | Gap | Effort | Impact |
|---|-----|--------|--------|
| 2 | Verification lattice (add Layer 3: security) | 2 hours | Catches vulnerabilities pre-commit |
| 5 | Subagent definitions | 2 hours | Specialized review, fresh-eye pattern |
| 7 | Writer/Reviewer pattern | 30 min | Catches confirmation bias |
| 12 | Automated tsc on Stop | 1 hour | Deterministic validation, not self-report |
| 17 | npm scripts for agent tasks | 30 min | Ergonomics for agent + humans |

### P2 — Strategic Improvements

| # | Gap | Effort | Impact |
|---|-----|--------|--------|
| 1 | SDLC state machine | 2 hours | Formalized workflow |
| 4 | Auto-lint hook | 1 hour | Style consistency |
| 6 | AGENTS.md | 1 hour | Cross-tool compatibility |
| 9 | Risk scoring for PRs | 1 hour | Better review decisions |
| 11 | Progressive disclosure (trim CLAUDE.md) | 3 hours | Better agent performance |
| 18 | Model routing table | 30 min | Optimal model usage |

### P3 — Future Enhancement

| # | Gap | Effort | Impact |
|---|-----|--------|--------|
| 8 | Interview pattern for specs | 30 min (playbook text only) | Better spec quality |
| 10 | Property-based + mutation testing | 1-2 days | Test effectiveness |
| 13 | Decision trail / observability | 2-3 hours | Audit/debugging |
| 15 | Visual regression testing | 1 day | Catches UI drift |

---

## IMPLEMENTATION PLAN

### Sprint 1: Security + Core (Today)

1. Create `secret-scan.sh` hook → add to settings.json
2. Fix deploy.md hardcoded secrets
3. Fix playbook section numbering
4. Add `npm audit` to validation, add npm scripts
5. Create 4 subagent definitions in `.claude/agents/`
6. Update `completion-gate.sh` to run `tsc --noEmit` automatically
7. Add Writer/Reviewer pattern to playbook
8. Update playbook with model routing table, SDLC state machine, verification lattice

### Sprint 2: Polish + Standards

9. Create `AGENTS.md` at repo root
10. Add auto-lint PostToolUse hook
11. Add risk scoring to PR template
12. Add interview pattern to Large tier
13. Trim CLAUDE.md (progressive disclosure)

### Sprint 3: Advanced Testing

14. Add `fast-check` for property-based testing
15. Add Playwright visual regression
16. Add decision trail logging
17. Evaluate Stryker for mutation testing
