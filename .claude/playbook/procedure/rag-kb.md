# RAG_KB Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Phase 1** — Use case: question types, data sources, privacy, freshness, accuracy bar

**Phase 2** — Content prep: chunking strategy, metadata schema, embedding cost. Primary RAG system: TypeScript (`src/lib/rag/`).

**Phase 3** — Retrieval config: search mode, top_k, similarity threshold, context budget

**Phase 4** — Prompting: system prompt, context layout, guardrails, fallback

**Phase 5** — Evaluation: 20+ test queries, guardrail testing, cross-contact isolation, latency P95 < 5s
