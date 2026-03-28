# Simple Task Type Playbooks

> Covers: DOCS, EVAL, INFO_QA, RAG_KB

---

## DOCS

> Task type: `DOCS:spec`, `DOCS:guide`, `DOCS:runbook`, `DOCS:changelog`

**Phase 1** — Audience (developer/user/admin). What action does it enable?
**Phase 2** — Outline structure before writing
**Phase 3** — Draft with real file paths, table names, commands
**Phase 4** — Verify all paths exist, commands work, names are current
**Phase 5** — Align terminology with CLAUDE.md

---

## EVAL

> Task type: `EVAL:metrics`, `EVAL:golden_set`, `EVAL:ab_test`, `EVAL:quality_gate`

**Phase 1** — Define metrics: accuracy, latency, cost, groundedness
**Phase 2** — Check existing `evals.md` (200 cases) and `scripts/eval-*.mjs` (8 suites) first
**Phase 3** — Scoring: automatic or manual review
**Phase 4** — Run, record, identify failure patterns
**Phase 5** — Decision: ship / iterate / redesign

---

## INFO_QA

> Task type: `INFO_QA:explain`, `INFO_QA:compare`, `INFO_QA:recommend`

**Phase 1** — Restate question, identify sub-questions
**Phase 2** — Research: codebase, CLAUDE.md, memory, git log
**Phase 3** — Answer with citations (file:line), call out assumptions
**Phase 4** — Examples and edge cases. State limitations.

---

## RAG_KB

> Task type: `RAG_KB:pipeline`, `RAG_KB:tuning`, `RAG_KB:evaluation`, `RAG_KB:content`

**Phase 1** — Use case: question types, data sources, privacy, freshness, accuracy bar
**Phase 2** — Content prep: chunking strategy, metadata schema, embedding cost. Two RAG systems: TypeScript (`src/lib/rag/`) and Python (`listingflow-rag/`) — identify target
**Phase 3** — Retrieval config: search mode, top_k, similarity threshold, context budget
**Phase 4** — Prompting: system prompt, context layout, guardrails, fallback
**Phase 5** — Evaluation: 20+ test queries, guardrail testing, cross-contact isolation, latency P95 < 5s
