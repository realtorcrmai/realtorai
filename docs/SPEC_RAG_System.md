# RAG System — Technical Design Specification

**Version:** 1.0
**Date:** 2026-03-26
**Status:** Draft → Review
**Scope:** Unified RAG system merging competitive intelligence, internal CRM retrieval, and user-facing chatbot assistant

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Completeness Audit](#3-data-completeness-audit)
4. [Model Chain Design](#4-model-chain-design)
5. [Database Schema](#5-database-schema)
6. [Ingestion Pipeline](#6-ingestion-pipeline)
7. [Retrieval Engine](#7-retrieval-engine)
8. [Conversation Manager](#8-conversation-manager)
9. [Guardrails & Safety](#9-guardrails--safety)
10. [Integration Points](#10-integration-points)
11. [UI Components](#11-ui-components)
12. [API Surface](#12-api-surface)
13. [File Structure](#13-file-structure)
14. [Performance & SLAs](#14-performance--slas)
15. [Cost Model](#15-cost-model)
16. [Implementation Phases](#16-implementation-phases)
17. [Test Plan](#17-test-plan)
18. [Decision Log](#18-decision-log)

---

## 1. Executive Summary

### What We're Building

A **RAG-powered AI assistant** embedded in the Realtors360 CRM that:

1. **Answers realtor questions** grounded in their CRM data, marketing content, and knowledge base
2. **Generates personalized content** (follow-up emails, newsletter drafts, social posts) using retrieved context
3. **Augments all existing AI modules** (lead-scorer, newsletter-ai, send-advisor, etc.) with deeper retrieval
4. **Monitors competitor emails** and surfaces competitive intelligence

### Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Vector DB | **pgvector (Supabase)** | Already using Supabase; no new infra |
| Index type | **HNSW** (not IVFFlat) | 5-10x faster for <100K vectors, no training needed |
| Embedding model | **Voyage-3-large** (1024 dims) | Best retrieval quality per dollar |
| Embedding table | **Unified** `rag_embeddings` | Cross-type search; one index to maintain |
| Model chain | **Haiku → pgvector → Sonnet** (Opus for complex) | 10x cost savings vs single-tier |
| Multi-tenant | **Application-level scoping** (single-tenant today) | No tenant_id in DB; scope by user email at app layer |
| Chat sessions | **Server-side JSONB** | Simple, no Redis needed, auditable |
| Competitor parsing | **Python sidecar** | beautifulsoup4 has no TS equivalent |

### What This Is NOT

- Not a public-facing chatbot (internal realtor tool only)
- Not an MLS/IDX search engine (no MLS integration)
- Not a replacement for existing AI modules (augmentation layer)

---

## 2. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REALTORS360 CRM                              │
│                                                                      │
│  ┌──────────────────── USER ENTRY POINTS ─────────────────────────┐ │
│  │                                                                 │ │
│  │  ┌─────────────┐  ┌────────────────┐  ┌─────────────────────┐ │ │
│  │  │ Chat Widget  │  │ Full-Page      │  │ System Calls        │ │ │
│  │  │ (floating)   │  │ /assistant     │  │ (AI modules)        │ │ │
│  │  │              │  │                │  │                     │ │ │
│  │  │ Context:     │  │ No auto-       │  │ newsletter-ai       │ │ │
│  │  │ • contact pg │  │ context;       │  │ lead-scorer         │ │ │
│  │  │ • campaign   │  │ user types     │  │ send-advisor        │ │ │
│  │  │ • newsletter │  │ freely         │  │ contact-evaluator   │ │ │
│  │  └──────┬──────┘  └───────┬────────┘  │ next-best-action    │ │ │
│  │         │                  │           │ message-generator   │ │ │
│  │         │                  │           │ quality-pipeline    │ │ │
│  │         │                  │           └──────────┬──────────┘ │ │
│  └─────────┼──────────────────┼──────────────────────┼────────────┘ │
│            │                  │                       │              │
│            ▼                  ▼                       ▼              │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │              CONVERSATION MANAGER                                ││
│  │  • Session create/resume (rag_sessions)                         ││
│  │  • UI context injection (contact_id, campaign_id, page)         ││
│  │  • Multi-turn message history (JSONB)                           ││
│  │  • Tone config from agent profile                               ││
│  │  • Guardrail pre-check (legal/tax/financial)                    ││
│  └──────────────────────────┬──────────────────────────────────────┘│
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────────┐│
│  │         TIER 1: HAIKU — Query Understanding                      ││
│  │                                                                  ││
│  │  Input: user message + UI context + conversation history         ││
│  │  Output: QueryPlan {                                             ││
│  │    intent: 'follow_up' | 'newsletter' | 'social' | 'qa'         ││
│  │           | 'search' | 'summarize' | 'competitive'              ││
│  │    search_text: string,                                          ││
│  │    filters: {                                                    ││
│  │      contact_id?, listing_id?, content_type[],                   ││
│  │      channel?, date_range?, audience_type?                       ││
│  │    },                                                            ││
│  │    top_k: number,                                                ││
│  │    needs_retrieval: boolean,                                     ││
│  │    escalate_to_opus: boolean                                     ││
│  │  }                                                               ││
│  │                                                                  ││
│  │  Cost: ~$0.001/query | Latency: ~200ms                          ││
│  └──────────────────────────┬──────────────────────────────────────┘│
│                             │                                        │
│                   ┌─────────▼─────────┐                              │
│                   │ needs_retrieval?   │                              │
│                   │  true → Tier 2     │                              │
│                   │  false → Tier 3    │                              │
│                   └─────────┬─────────┘                              │
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────────┐│
│  │         TIER 2: VECTOR RETRIEVAL (pgvector + HNSW)               ││
│  │                                                                  ││
│  │  ┌───────────────────────────────────────────────────────────┐  ││
│  │  │                 rag_embeddings (unified)                   │  ││
│  │  │                                                           │  ││
│  │  │  content_type:                                            │  ││
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │  ││
│  │  │  │ message   │ │ email    │ │ activity │ │ profile     │  │  ││
│  │  │  │(comms)    │ │(news-    │ │(calls,   │ │(contact    │  │  ││
│  │  │  │           │ │ letters) │ │ meetings)│ │ composite) │  │  ││
│  │  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │  ││
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │  ││
│  │  │  │ listing   │ │ faq      │ │ playbook │ │ competitor  │  │  ││
│  │  │  │(property) │ │(KB)      │ │(KB)      │ │(Plan A)     │  │  ││
│  │  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │  ││
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │  ││
│  │  │  │ template  │ │ recom-   │ │ social   │                 │  ││
│  │  │  │(msg tmpl) │ │ mendation│ │ _post    │                 │  ││
│  │  │  └──────────┘ └──────────┘ └──────────┘                 │  ││
│  │  └───────────────────────────────────────────────────────────┘  ││
│  │                                                                  ││
│  │  Query: SELECT content_text, source_table, source_id,           ││
│  │         1 - (embedding <=> $query_vec) AS similarity            ││
│  │         FROM rag_embeddings                                      ││
│  │         WHERE content_type = ANY($types)                         ││
│  │         AND contact_id = $contact_id (if scoped)                 ││
│  │         ORDER BY embedding <=> $query_vec                        ││
│  │         LIMIT $top_k                                             ││
│  │                                                                  ││
│  │  Cost: $0 (DB query) | Latency: ~50ms                           ││
│  └──────────────────────────┬──────────────────────────────────────┘│
│                             │ Top-K chunks + metadata                │
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────────┐│
│  │         TIER 3: GENERATION (Sonnet / Opus)                       ││
│  │                                                                  ││
│  │  Model selection:                                                ││
│  │  • Sonnet (default): follow-up, draft, Q&A, social posts        ││
│  │  • Opus (escalated): multi-contact analysis, deal strategy,      ││
│  │    6-month interaction summary, complex competitive analysis     ││
│  │                                                                  ││
│  │  System prompt includes:                                         ││
│  │  • Role: BC real estate CRM assistant                            ││
│  │  • Tone: from agent profile (formal/casual/warm)                 ││
│  │  • Voice rules: from voice_rules table                           ││
│  │  • Guardrails: no legal/tax advice, cite sources                 ││
│  │  • Retrieved context (top-K chunks with source labels)           ││
│  │  • Conversation history (multi-turn)                             ││
│  │  • UI context (contact/campaign data)                            ││
│  │                                                                  ││
│  │  Cost: Sonnet ~$0.01, Opus ~$0.05 | Latency: ~2-4s              ││
│  └──────────────────────────┬──────────────────────────────────────┘│
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────────┐│
│  │         RESPONSE LAYER                                           ││
│  │  • Format response (markdown for chat, JSON for API)             ││
│  │  • Attach source references [{table, id, snippet, similarity}]   ││
│  │  • Log to rag_audit_log (prompt, retrieved IDs, response, ms)    ││
│  │  • Check for guardrail triggers → add disclaimers                ││
│  │  • Graceful fallback if no relevant chunks found                 ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌───────────────── INGESTION PIPELINE ──────────────────────────┐  │
│  │                                                                │  │
│  │  Real-time:  DB webhook on INSERT/UPDATE →                     │  │
│  │              Edge Function → Voyage embed → rag_embeddings     │  │
│  │                                                                │  │
│  │  Batch:      Cron (daily) → scan unembedded records →          │  │
│  │              chunk → embed → upsert                            │  │
│  │                                                                │  │
│  │  Competitor: Python sidecar → parse HTML → embed → store       │  │
│  │              (via monitoring inbox webhook)                     │  │
│  │                                                                │  │
│  │  Knowledge:  Admin uploads FAQ/playbook → embed → store        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Completeness Audit

### 3.1 Embeddable Data Sources — Verified Against Actual Schema

| # | Table | Embedding Column(s) | Type | Has contact_id | Has listing_id | Est. Volume/Month |
|---|-------|---------------------|------|:-:|:-:|--:|
| 1 | `communications` | `body` | TEXT | YES | via related_id | High (~500+) |
| 2 | `activities` | `subject` + `description` | TEXT | YES | YES | High (~300+) |
| 3 | `newsletters` | `subject` + `html_body` (stripped) | TEXT | YES | NO | Medium (~100) |
| 4 | `contacts` | Composite: `notes` + `buyer_preferences` + `seller_preferences` + `demographics` + `tags` | TEXT+JSONB | IS the entity | NO | Low (~20) |
| 5 | `listings` | `notes` + enrichment data | TEXT | NO | IS the entity | Low (~10) |
| 6 | `agent_recommendations` | `reasoning` | TEXT | YES | NO | Medium (~50) |
| 7 | `offers` | `notes` | TEXT | YES (buyer) | YES | Low (~5) |
| 8 | `offer_conditions` | `description` + `notes` | TEXT | via offer | via offer | Low (~10) |
| 9 | `message_templates` | `body` + `subject` | TEXT | NO | NO | Low (~5) |
| 10 | `knowledge_articles` | `title` + `body` | TEXT | NO | NO | Low (~10) |
| 11 | `competitive_emails` | `subject` + `body_text` | TEXT | NO | NO | Low (~30) |

### 3.2 JSONB Columns Available for Structured Context (NOT Embedded — Fetched Directly)

These are too structured for embedding but critical for prompt context:

| Table | Column | Shape |
|-------|--------|-------|
| `contacts` | `ai_lead_score` | `{buying_readiness, timeline_urgency, budget_fit, intent, reasoning, personalization_hints}` |
| `contacts` | `newsletter_intelligence` | `{engagement_score, click_history[], inferred_interests}` |
| `contacts` | `buyer_preferences` | `{areas[], price_range_min/max, bedrooms, property_types[]}` |
| `contacts` | `seller_preferences` | `{staging_tips, market_expectations}` |
| `contacts` | `demographics` | `{age_range, family_status, income_range, interests[]}` |
| `newsletters` | `ai_context` | Full Claude prompt context used to generate the email |
| `workflow_step_logs` | `ai_decision` | `{decision, email_type, reasoning, relevance_score}` |
| `newsletter_events` | `metadata` | Click tracking details |

### 3.3 Missing Data Sources (Need to Create)

| Source | Status | Required For |
|--------|--------|-------------|
| `knowledge_articles` table | **DOES NOT EXIST** | Internal Q&A (Plan C §2.2.4) |
| `competitive_emails` table | **DOES NOT EXIST** | Competitor analysis (Plan A) |
| `competitive_insights` table | **DOES NOT EXIST** | Competitor insights (Plan A) |
| Social posts archive | **No table exists** | Social content generation (Plan C §2.2.3) |
| Agent tone/voice config | Partially exists in `voice_rules` | Tone matching per agent |
| Blog/website content | **No table exists** | KB enrichment (Plan C §2.3) |

### 3.4 Current Vector Infrastructure

| Component | Status |
|-----------|--------|
| pgvector extension | **NOT ENABLED** (only uuid-ossp exists) |
| Embedding columns | **NONE** in any table |
| Embedding dependencies | **NONE** in package.json |
| Vector indexes | **NONE** |
| Content hash columns | **NONE** |

### 3.5 Auth & Tenant Model

| Aspect | Current State | RAG Implication |
|--------|--------------|-----------------|
| Multi-tenant | **SINGLE-TENANT** | No tenant_id scoping needed now |
| User identification | Email-based (JWT) | Scope RAG by authenticated session |
| RLS | Permissive (`auth.role() = 'authenticated'`) | Cannot rely on RLS for data isolation |
| Admin client | Bypasses RLS entirely | All RAG queries use admin client |
| Agent isolation | No agent_id FK on data tables | All agents see all data (by design) |

**Decision:** Since the app is single-tenant, RAG queries do NOT need tenant_id filtering. All data is accessible to all authenticated users. When multi-tenant is added in the future, add `tenant_id` column to `rag_embeddings` and filter in queries.

---

## 4. Model Chain Design

### 4.1 Tier Routing Logic

```typescript
interface QueryPlan {
  intent: 'follow_up' | 'newsletter' | 'social' | 'qa' | 'search' | 'summarize' | 'competitive';
  search_text: string;
  filters: {
    contact_id?: string;
    listing_id?: string;
    content_type?: string[];
    channel?: string;
    date_range?: { from: string; to: string };
    audience_type?: string;
  };
  top_k: number;
  needs_retrieval: boolean;
  escalate_to_opus: boolean;
}
```

### 4.2 Tier 1: Haiku — Query Understanding

**Model:** `claude-haiku-4-5-20251001`
**Max tokens:** 300
**Latency target:** <300ms

**System prompt:**
```
You are a query router for a BC real estate CRM AI assistant.
Parse the user's message into a structured search plan.

UI Context: {contact/campaign/page info}
Conversation history: {last 3 turns}

Output JSON only — no explanation.
```

**Routing rules:**
- `needs_retrieval: false` → Skip Tier 2, go straight to Tier 3 (greetings, simple math, clarifications)
- `escalate_to_opus: true` → Use Opus instead of Sonnet (multi-contact analysis, 6+ month summaries, complex deal strategy)
- Default `top_k`: 5 for follow-up/Q&A, 10 for newsletter/social, 3 for competitive

### 4.3 Tier 2: pgvector — Retrieval

**No LLM cost. Pure database query.**

```sql
-- Core retrieval function
CREATE OR REPLACE FUNCTION rag_search(
    query_embedding vector(1024),
    filter_types text[] DEFAULT NULL,
    filter_contact_id uuid DEFAULT NULL,
    filter_listing_id uuid DEFAULT NULL,
    filter_after timestamptz DEFAULT NULL,
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
    id uuid,
    content_text text,
    content_summary text,
    source_table text,
    source_id uuid,
    content_type text,
    contact_id uuid,
    listing_id uuid,
    similarity float,
    source_created_at timestamptz
)
LANGUAGE sql STABLE AS $$
    SELECT
        e.id,
        e.content_text,
        e.content_summary,
        e.source_table,
        e.source_id,
        e.content_type,
        e.contact_id,
        e.listing_id,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.source_created_at
    FROM rag_embeddings e
    WHERE (filter_types IS NULL OR e.content_type = ANY(filter_types))
      AND (filter_contact_id IS NULL OR e.contact_id = filter_contact_id)
      AND (filter_listing_id IS NULL OR e.listing_id = filter_listing_id)
      AND (filter_after IS NULL OR e.source_created_at >= filter_after)
      AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;
```

### 4.4 Tier 3: Sonnet/Opus — Grounded Generation

**Model selection:**
- **Sonnet** (`claude-sonnet-4-20250514`): Default for all standard tasks
- **Opus** (`claude-opus-4-6`): Only when `escalate_to_opus: true` from Tier 1

**System prompt structure:**
```
You are a real estate AI assistant for {agent_name} at {brokerage} in BC, Canada.

TONE: {tone_preference from agent profile}
VOICE RULES: {from voice_rules table}

RETRIEVED CONTEXT (use these facts, cite [source:id] when referencing):
---
[1] (communications, 2026-03-20) "Called about Surrey townhouses, budget ~900k..."
[2] (newsletter, 2026-03-15) "Subject: New Listings in Kits — sent, opened, clicked listing #3"
[3] (activity, 2026-03-18) "Showing at 456 Main St — outcome: interested, follow-up needed"
---

CRM SNAPSHOT (structured data — do not cite, just use for context):
{contact JSON snapshot: name, type, stage, preferences, scores}

RULES:
1. ONLY state facts from the retrieved context above. If unsure, say so.
2. Distinguish clearly between facts from data and your suggestions.
3. Never invent viewings, addresses, or conversations that aren't in context.
4. For legal, tax, or financial advice — add disclaimer and recommend professional.
5. If no relevant context found — say you have limited data and suggest what to add.
6. Always end with a brief note of which sources you referenced.
```

---

## 5. Database Schema

### 5.1 New Migration: `054_rag_system.sql`

```sql
-- ============================================================
-- RAG System Tables
-- ============================================================

-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Unified embedding store
CREATE TABLE rag_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source tracking
    source_table TEXT NOT NULL,
    source_id UUID NOT NULL,
    chunk_index INTEGER DEFAULT 0,

    -- Content
    content_text TEXT NOT NULL,
    content_summary TEXT,

    -- Vector (Voyage-3-large = 1024 dimensions)
    embedding vector(1024) NOT NULL,

    -- Scoping & filtering
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    content_type TEXT NOT NULL,
    channel TEXT,
    direction TEXT,
    audience_type TEXT,
    topic TEXT,

    -- Dedup
    content_hash TEXT NOT NULL,

    -- Timestamps
    source_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(source_table, source_id, chunk_index)
);

-- HNSW index (faster than IVFFlat, no training needed)
CREATE INDEX idx_rag_embedding_hnsw
    ON rag_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Filtered search indexes
CREATE INDEX idx_rag_contact ON rag_embeddings(contact_id);
CREATE INDEX idx_rag_listing ON rag_embeddings(listing_id);
CREATE INDEX idx_rag_content_type ON rag_embeddings(content_type);
CREATE INDEX idx_rag_source ON rag_embeddings(source_table, source_id);
CREATE INDEX idx_rag_hash ON rag_embeddings(content_hash);
CREATE INDEX idx_rag_source_created ON rag_embeddings(source_created_at DESC);

-- Retrieval function
CREATE OR REPLACE FUNCTION rag_search(
    query_embedding vector(1024),
    filter_types text[] DEFAULT NULL,
    filter_contact_id uuid DEFAULT NULL,
    filter_listing_id uuid DEFAULT NULL,
    filter_after timestamptz DEFAULT NULL,
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
    id uuid,
    content_text text,
    content_summary text,
    source_table text,
    source_id uuid,
    content_type text,
    contact_id uuid,
    listing_id uuid,
    similarity float,
    source_created_at timestamptz
)
LANGUAGE sql STABLE AS $$
    SELECT
        e.id, e.content_text, e.content_summary,
        e.source_table, e.source_id, e.content_type,
        e.contact_id, e.listing_id,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.source_created_at
    FROM rag_embeddings e
    WHERE (filter_types IS NULL OR e.content_type = ANY(filter_types))
      AND (filter_contact_id IS NULL OR e.contact_id = filter_contact_id)
      AND (filter_listing_id IS NULL OR e.listing_id = filter_listing_id)
      AND (filter_after IS NULL OR e.source_created_at >= filter_after)
      AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- 3. Conversation sessions
CREATE TABLE rag_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    ui_context JSONB DEFAULT '{}',
    tone_preference TEXT DEFAULT 'professional',
    messages JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rag_sessions_user ON rag_sessions(user_email, is_active, updated_at DESC);

-- 4. Response feedback
CREATE TABLE rag_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES rag_sessions(id) ON DELETE CASCADE,
    message_index INTEGER NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Audit log
CREATE TABLE rag_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES rag_sessions(id) ON DELETE SET NULL,
    user_email TEXT,
    query_text TEXT NOT NULL,
    intent TEXT,
    query_plan JSONB,
    retrieved_ids UUID[],
    retrieved_scores FLOAT[],
    model_tier TEXT,
    response_text TEXT,
    latency_ms INTEGER,
    guardrail_triggered TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rag_audit_time ON rag_audit_log(created_at DESC);
CREATE INDEX idx_rag_audit_user ON rag_audit_log(user_email, created_at DESC);

-- 6. Knowledge base articles (new content source)
CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('faq', 'playbook', 'script', 'explainer', 'process')),
    audience_type TEXT DEFAULT 'all',
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Competitive emails (Plan A)
CREATE TABLE competitive_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    from_email TEXT,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    html_body TEXT,
    email_type TEXT,
    design_analysis JSONB,
    content_analysis JSONB,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Competitive insights (Plan A)
CREATE TABLE competitive_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    source_emails UUID[],
    priority INTEGER DEFAULT 5,
    applicable_to TEXT DEFAULT 'all',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies (single-tenant, authenticated access)
ALTER TABLE rag_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_rag_embeddings" ON rag_embeddings FOR ALL USING (true);
CREATE POLICY "auth_rag_sessions" ON rag_sessions FOR ALL USING (true);
CREATE POLICY "auth_rag_feedback" ON rag_feedback FOR ALL USING (true);
CREATE POLICY "auth_rag_audit" ON rag_audit_log FOR ALL USING (true);
CREATE POLICY "auth_knowledge" ON knowledge_articles FOR ALL USING (true);
CREATE POLICY "auth_competitive_emails" ON competitive_emails FOR ALL USING (true);
CREATE POLICY "auth_competitive_insights" ON competitive_insights FOR ALL USING (true);
```

---

## 6. Ingestion Pipeline

### 6.1 Composite Document Templates

Each source type has a template that converts a DB row into embeddable text:

```typescript
// Contact profile composite
function buildContactDoc(contact: Contact): string {
  const parts = [`${contact.name} (${contact.type}, ${contact.stage_bar})`];
  if (contact.notes) parts.push(`Notes: ${contact.notes}`);
  if (contact.tags?.length) parts.push(`Tags: ${contact.tags.join(', ')}`);
  if (contact.buyer_preferences) {
    const bp = contact.buyer_preferences;
    parts.push(`Budget: $${bp.price_range_min}-$${bp.price_range_max}`);
    if (bp.areas?.length) parts.push(`Areas: ${bp.areas.join(', ')}`);
    if (bp.property_types?.length) parts.push(`Property types: ${bp.property_types.join(', ')}`);
  }
  if (contact.demographics) {
    const d = contact.demographics;
    if (d.family_status) parts.push(`Family: ${d.family_status}`);
    if (d.interests?.length) parts.push(`Interests: ${d.interests.join(', ')}`);
  }
  return parts.join('\n');
}

// Listing composite
function buildListingDoc(listing: Listing, enrichment?: any): string {
  const parts = [`${listing.address} — $${listing.list_price} (${listing.status})`];
  if (listing.property_type) parts.push(`Type: ${listing.property_type}`);
  if (listing.notes) parts.push(`Notes: ${listing.notes}`);
  if (enrichment?.assessment) parts.push(`Assessment: ${JSON.stringify(enrichment.assessment)}`);
  return parts.join('\n');
}

// Newsletter (strip HTML)
function buildNewsletterDoc(newsletter: Newsletter): string {
  const plainText = stripHtml(newsletter.html_body);
  return `Subject: ${newsletter.subject}\n\n${plainText}`;
}
```

### 6.2 Chunking Strategy

| Source | Max Chunk Size | Overlap | Strategy |
|--------|:-:|:-:|-----|
| `communications.body` | 512 tokens | 0 | Full message (most are short) |
| `activities` | 512 tokens | 0 | Subject + description concatenated |
| `newsletters` | 1024 tokens | 128 | Strip HTML → split by paragraph |
| `contacts` (composite) | 1024 tokens | 0 | Single document per contact |
| `listings` (composite) | 1024 tokens | 0 | Single document per listing |
| `agent_recommendations` | 512 tokens | 0 | Full reasoning text |
| `knowledge_articles` | 1024 tokens | 128 | Split by section headings |
| `competitive_emails` | 1024 tokens | 128 | Subject + body concatenated |
| `message_templates` | 512 tokens | 0 | Full template body |

### 6.3 Ingestion Modes

**Real-time (API route triggered by server actions):**
```
actions/contacts.ts  → after createContact/updateContact  → POST /api/rag/ingest
actions/listings.ts  → after createListing/updateListing   → POST /api/rag/ingest
actions/showings.ts  → after createShowing                  → POST /api/rag/ingest
actions/newsletters.ts → after newsletter sent              → POST /api/rag/ingest
```

**Batch backfill (cron — daily at 2 AM):**
```
/api/cron/rag-backfill → scan all tables for records without matching rag_embeddings entry
                        → chunk → embed → upsert
```

**Dedup:** SHA-256 hash of `content_text` stored in `content_hash`. If hash matches existing row, skip re-embedding.

---

## 7. Retrieval Engine

### 7.1 Hybrid Search Flow

```
User query
    │
    ▼
Tier 1 (Haiku) → QueryPlan { search_text, filters, top_k }
    │
    ▼
Embed search_text via Voyage API → query_vector (1024 dims)
    │
    ▼
pgvector: rag_search(query_vector, filters.content_type, filters.contact_id, ...)
    │
    ▼
Top-K results with similarity scores
    │
    ▼
Format as numbered context chunks for Tier 3 prompt
```

### 7.2 Retrieval Presets by Intent

| Intent | content_type filter | top_k | date_range | Notes |
|--------|-------------------|:-:|-----|------|
| `follow_up` | message, activity | 5 | 90 days | Scoped to contact_id |
| `newsletter` | email, template, competitor | 10 | 180 days | Audience-filtered |
| `social` | email, social_post | 8 | 90 days | Recent content only |
| `qa` | faq, playbook, process | 5 | None | KB articles only |
| `search` | ALL | 10 | None | Broad search |
| `summarize` | message, activity, email | 15 | Per user request | Scoped to contact_id |
| `competitive` | competitor | 10 | 30 days | Recent competitor emails |

---

## 8. Conversation Manager

### 8.1 Session Lifecycle

```
1. User opens chat widget or /assistant page
   → Create rag_session with ui_context (contact_id, page, etc.)

2. User sends message
   → Append to session.messages (role: 'user')
   → Run model chain (Haiku → pgvector → Sonnet)
   → Append response to session.messages (role: 'assistant', sources: [...])
   → Log to rag_audit_log

3. User navigates to different page
   → Update ui_context on existing session (if widget)
   → Or create new session (if full-page)

4. Session idle > 30 min
   → Mark is_active = false
   → Next message creates new session
```

### 8.2 Context Window Management

- Include last **6 turns** (3 user + 3 assistant) in Tier 3 prompt
- Older turns: summarize via Haiku if session > 10 turns
- UI context always included (contact snapshot, campaign data)
- Retrieved chunks: max 4000 tokens total (prevents prompt bloat)

---

## 9. Guardrails & Safety

### 9.1 Pre-Generation Filters

```typescript
const GUARDRAIL_PATTERNS = [
  { pattern: /tax.*(?:strategy|advice|plan|structure)/i, type: 'tax' },
  { pattern: /legal.*(?:advice|opinion|liability)/i, type: 'legal' },
  { pattern: /(?:guarantee|guaranteed).*(?:return|appreciation|sale)/i, type: 'financial' },
  { pattern: /(?:mortgage|loan).*(?:qualify|approval|rate.*lock)/i, type: 'financial' },
];

const DISCLAIMER = `I can't provide ${type} advice — please consult a qualified professional.
Here's what I can share from your CRM data:`;
```

### 9.2 Post-Generation Validation

1. **No hallucinated facts:** If response mentions a showing, address, or date not in retrieved context → flag
2. **Source grounding:** Every factual claim should map to a retrieved chunk
3. **Tone check:** Must match agent's tone_preference (formal/casual/warm)

### 9.3 Graceful Degradation

When retrieval returns 0 results or all scores < 0.3:
```
"I don't have enough data in your CRM to answer this specifically.
Here's a general response based on BC real estate best practices:

[generic answer]

💡 To improve personalization, try:
• Add notes after calls with contacts
• Log showing feedback in the activity timeline
• Upload your playbooks to the Knowledge Base"
```

---

## 10. Integration Points

### 10.1 Existing AI Modules — Where RAG Context Injects

| # | File | Line | Current Context Source | RAG Enhancement | Priority |
|---|------|------|----------------------|-----------------|----------|
| 1 | `src/lib/newsletter-ai.ts` | 105 | Hand-built context object | Retrieve past interactions + similar successful emails | **P0** |
| 2 | `src/lib/ai-agent/lead-scorer.ts` | 68 | 30-day activity window | Full history retrieval for contact | **P0** |
| 3 | `src/lib/ai-agent/send-advisor.ts` | 104 | 14-day newsletter events | Full engagement pattern retrieval | **P1** |
| 4 | `src/lib/ai-agent/contact-evaluator.ts` | 264 | Recent events + basic profile | Retrieved context for event relevance | **P1** |
| 5 | `src/lib/ai-agent/next-best-action.ts` | 81 | Top 10 scored contacts | Retrieved outcomes from similar past recommendations | **P1** |
| 6 | `src/lib/anthropic/message-generator.ts` | 38 | Minimal contact context | Retrieve past conversations for tone continuity | **P2** |
| 7 | `src/lib/quality-pipeline.ts` | 98 | Email + contact basics | Retrieve voice rules + past successful emails | **P2** |
| 8 | `src/lib/ai-agent/voice-learner.ts` | 30 | Edit pairs only | Retrieve broader editing patterns | **P3** |
| 9 | `src/lib/voice-learning.ts` | 42 | Edit pairs only | Same as above | **P3** |
| 10 | `src/lib/validators/quality-scorer.ts` | 72 | Email + contact basics | Retrieve benchmarks from successful sends | **P3** |

### 10.2 Integration Pattern

For each AI module, the injection follows the same pattern:

```typescript
// BEFORE (current):
const prompt = `Contact: ${contact.name}...`;
const response = await anthropic.messages.create({ ... });

// AFTER (with RAG):
import { retrieveContext } from '@/lib/rag/retriever';

const ragContext = await retrieveContext({
  query: `${contact.name} engagement history and preferences`,
  filters: { contact_id: contact.id, content_type: ['message', 'activity'] },
  top_k: 5,
});

const prompt = `
Contact: ${contact.name}...

RETRIEVED CONTEXT:
${ragContext.formatted}
`;
const response = await anthropic.messages.create({ ... });
```

### 10.3 New Integration Points (Chatbot)

| Entry Point | UI Location | Auto-Loaded Context |
|-------------|-------------|---------------------|
| Contact page widget | `/contacts/[id]` | contact_id, name, type, stage, recent activity |
| Newsletter builder widget | `/newsletters` (editor) | draft content, audience segment, email_type |
| Campaign tab widget | `/newsletters` (campaigns) | campaign data, template |
| Full-page assistant | `/assistant` | None (user provides via message) |
| Dashboard widget | `/` (home) | Today's recommendations, pipeline snapshot |

---

## 11. UI Components

### 11.1 Component Tree

```
<ChatProvider>                          — React context for session state
  <ChatWidget />                        — Floating button + expandable panel
    <ContextBanner />                   — "Context: John Doe – Buyer – Warm"
    <ChatMessageList />                 — Scrollable message area
      <ChatMessage role="user" />       — User bubble
      <ChatMessage role="assistant" />  — Assistant bubble + sources
        <SourcesDrawer />               — Slide-out panel with source snippets
    <ChatInput />                       — Text input + send button
    <FeedbackButtons />                 — 👍/👎 per message
  <ChatFullPage />                      — Full /assistant page (same internals)
```

### 11.2 Context Banner Examples

```
📋 Context: John Doe — Buyer — Warm — Surrey townhouses, $800-900k
📧 Context: March Buyers Newsletter (Draft) — Segment: First-time buyers, Surrey
🏠 Context: 456 Main St, Surrey — $899,000 — Active listing
🤖 No context loaded — ask me anything!
```

---

## 12. API Surface

### 12.1 Chat API

```
POST /api/rag/chat
Body: { session_id?, message, ui_context? }
Response: {
  session_id,
  response: { text, sources: [{table, id, snippet, similarity}] },
  model_tier,
  latency_ms,
  guardrail_triggered?
}
```

### 12.2 Search API (for AI modules)

```
POST /api/rag/search
Body: { query, filters: {contact_id?, listing_id?, content_type[], date_range?}, top_k? }
Response: { results: [{content_text, source_table, source_id, similarity, source_created_at}] }
```

### 12.3 Ingestion API

```
POST /api/rag/ingest
Body: { source_table, source_id }
Response: { embedded: true, chunks: number }

POST /api/cron/rag-backfill
Header: Authorization: Bearer $CRON_SECRET
Response: { processed: number, skipped: number, errors: number }
```

### 12.4 Feedback API

```
POST /api/rag/feedback
Body: { session_id, message_index, rating: 'positive'|'negative', feedback_text? }
Response: { id }
```

### 12.5 Knowledge Base API

```
GET    /api/rag/knowledge                 — List articles
POST   /api/rag/knowledge                 — Create article (auto-embeds)
PATCH  /api/rag/knowledge/[id]            — Update article (re-embeds)
DELETE /api/rag/knowledge/[id]            — Delete article + embeddings
```

---

## 13. File Structure

```
src/lib/rag/
├── embeddings.ts           # Voyage API client: embed(text) → vector(1024)
├── chunker.ts              # splitIntoChunks(text, maxTokens, overlap) + per-source templates
├── ingestion.ts            # ingestRecord(table, id) → chunk → embed → upsert
├── retriever.ts            # retrieveContext(query, filters, top_k) → formatted chunks
├── query-planner.ts        # Haiku: parseQuery(message, context) → QueryPlan
├── synthesizer.ts          # Sonnet/Opus: generate(query, chunks, history) → response
├── conversation.ts         # createSession, addMessage, getHistory, closeSession
├── guardrails.ts           # checkGuardrails(message) → {blocked, type, disclaimer}
├── sources.ts              # formatSources(results) → [{table, id, snippet, score}]
├── feedback.ts             # saveFeedback(session_id, index, rating, text)
├── types.ts                # QueryPlan, SearchResult, RagSession, RagMessage, etc.
└── constants.ts            # CHUNK_SIZES, MODELS, TOP_K_DEFAULTS, GUARDRAIL_PATTERNS

src/actions/
├── rag.ts                  # Server actions: search, chat, ingest, backfill
├── knowledge-base.ts       # KB article CRUD + auto-embed on create/update

src/app/api/rag/
├── chat/route.ts           # POST: conversational endpoint
├── search/route.ts         # POST: retrieval-only endpoint (for AI modules)
├── ingest/route.ts         # POST: trigger ingestion for a record
├── feedback/route.ts       # POST: thumbs up/down
├── knowledge/route.ts      # GET/POST: KB article CRUD
├── knowledge/[id]/route.ts # PATCH/DELETE: single article

src/app/api/cron/
├── rag-backfill/route.ts   # Daily batch backfill

src/components/rag/
├── ChatWidget.tsx           # Floating chat bubble + expandable panel
├── ChatFullPage.tsx         # Full-page /assistant view
├── ChatMessage.tsx          # Message bubble component
├── ChatInput.tsx            # Input bar with send button
├── SourcesDrawer.tsx        # "View sources" slide-out panel
├── ContextBanner.tsx        # Active context display
└── FeedbackButtons.tsx      # 👍/👎 + optional text input

src/app/(dashboard)/
├── assistant/page.tsx       # Full-page AI Assistant route

supabase/migrations/
├── 054_rag_system.sql       # All new tables + pgvector + functions
```

---

## 14. Performance & SLAs

| Metric | Target | Measured At |
|--------|--------|------------|
| Chat response (P50) | < 3 seconds | End-to-end from send to display |
| Chat response (P95) | < 5 seconds | End-to-end from send to display |
| Embedding latency | < 500ms per record | Voyage API call |
| Vector search | < 100ms | pgvector HNSW query |
| Haiku planning | < 300ms | Tier 1 query understanding |
| Backfill throughput | > 100 records/minute | Batch ingestion |
| Session create | < 50ms | DB insert |
| Concurrent sessions | 20+ | Same Supabase instance |

---

## 15. Cost Model

### Per-Query Cost Breakdown

| Tier | Model | Input tokens | Output tokens | Cost |
|------|-------|:-:|:-:|:-:|
| 1 | Haiku | ~500 | ~200 | $0.0004 |
| 2 | pgvector | — | — | $0.0000 |
| 3a | Sonnet | ~3000 | ~800 | $0.0110 |
| 3b | Opus (rare) | ~3000 | ~800 | $0.0500 |
| Embed | Voyage | ~200 | — | $0.0000 |
| **Total (standard)** | | | | **~$0.012** |
| **Total (complex)** | | | | **~$0.051** |

### Monthly Estimate

| Component | Volume | Monthly Cost |
|-----------|--------|:-:|
| Voyage embeddings | 15K records | ~$2 |
| Haiku (Tier 1) | 8K queries | ~$3 |
| Sonnet (Tier 3) | 5K queries | ~$55 |
| Opus (Tier 3, complex) | 200 queries | ~$10 |
| Supabase pgvector storage | 500MB | Included |
| **Total** | | **~$70/month** |

---

## 16. Implementation Phases

| Phase | Scope | Files | Depends On | Est. |
|-------|-------|:-:|-----|-----|
| **1** | Migration + pgvector + embedding client + chunker + types | 5 | Nothing | 1 day |
| **2** | Ingestion pipeline (all 11 sources + backfill cron) | 3 | Phase 1 | 2 days |
| **3** | Retriever + query planner (Haiku) + synthesizer (Sonnet) | 3 | Phase 1 | 1 day |
| **4** | Conversation manager + session CRUD | 2 | Phase 3 | 1 day |
| **5** | Guardrails + source attribution + feedback | 3 | Phase 3 | 1 day |
| **6** | API routes (chat, search, ingest, feedback, knowledge) | 6 | Phase 3-5 | 1 day |
| **7** | Chat UI (widget + full page + context banner) | 7 | Phase 6 | 2 days |
| **8** | Integrate into newsletter-ai + lead-scorer (P0 modules) | 2 edits | Phase 3 | 1 day |
| **9** | Integrate into remaining AI modules (P1-P3) | 5 edits | Phase 8 | 1 day |
| **10** | Knowledge base CRUD + admin UI | 3 | Phase 6 | 1 day |
| **11** | Competitor email sidecar (Python) | 8 | Phase 1 | 2 days |
| **12** | Test scenarios (8 from chatbot spec + integration tests) | 4 | Phase 7 | 1 day |

---

## 17. Test Plan

### From Chatbot Spec (§3)

| # | Scenario | Validates |
|---|----------|-----------|
| T1 | Contact follow-up email | RAG retrieves contact interactions, no hallucinated facts |
| T2 | Newsletter intro draft | Grounds in past newsletters + KB, consistent style |
| T3 | Social posts generation | Channel-appropriate (IG vs LinkedIn), tied to content |
| T4 | Internal FAQ answer | Answers from KB only, no missing/extra steps |
| T5 | No-context fallback | Explicit "limited data" message, suggests improvements |
| T6 | Tenant/agent isolation | Zero cross-contamination (when multi-tenant added) |
| T7 | Legal/tax guardrail | Refuses advice, adds disclaimer, suggests professional |
| T8 | Performance + concurrency | P95 < 5s under 20 parallel queries |

### Additional Integration Tests

| # | Scenario | Validates |
|---|----------|-----------|
| T9 | Backfill cron processes all unembedded records | Ingestion completeness |
| T10 | Dedup: same record updated twice → single embedding | content_hash works |
| T11 | newsletter-ai uses RAG context in generation | P0 integration |
| T12 | lead-scorer uses RAG context in scoring | P0 integration |
| T13 | Widget auto-loads contact context from page | UI context injection |
| T14 | Source attribution shows correct snippets | Source panel accuracy |
| T15 | Feedback saves and is queryable | Feedback loop |

---

## 18. Decision Log

| # | Decision | Alternatives Considered | Rationale |
|---|----------|------------------------|-----------|
| D1 | pgvector in Supabase, not Pinecone/Weaviate | External vector DB | Already using Supabase; no new infra; pgvector handles <1M vectors well |
| D2 | HNSW index, not IVFFlat | IVFFlat (Plan A uses it) | HNSW: no training, faster recall, better for growing datasets |
| D3 | 1024 dims (Voyage-3-large), not 1536 or 3072 | OpenAI 3072, Voyage 1536 | Best quality/performance tradeoff; smaller index, faster queries |
| D4 | Unified table, not per-type tables | 4 separate tables (Plan A) | Enables cross-type search; single index; simpler maintenance |
| D5 | TypeScript in CRM, not separate Python service | Python microservice (Plan A) | Fewer moving parts; same deploy; Python sidecar only for HTML parsing |
| D6 | Application-level auth scoping | RLS-based | Current RLS is permissive; admin client bypasses it; app-level is honest |
| D7 | Server-side sessions (JSONB), not client-side | Redis, client localStorage | Auditable; no new infra; JSONB is fine for <100 concurrent sessions |
| D8 | Haiku for query planning | Skip planning, always retrieve | 10x cheaper; prevents unnecessary retrieval; routes to Opus when needed |
| D9 | Daily batch backfill + action-triggered real-time | DB triggers / Edge Functions | Simpler; action hooks already exist; no Supabase Edge Function setup |
| D10 | Voyage-3-large over OpenAI | OpenAI text-embedding-3-large | Voyage is purpose-built for retrieval; marginally cheaper; 1024 native dims |

---

## Environment Variables (New)

```
VOYAGE_API_KEY=              # Voyage AI embedding API key
RAG_SERVICE_URL=             # Python sidecar URL (competitor parsing only)
RAG_BACKFILL_BATCH_SIZE=50   # Records per backfill cycle
RAG_DEFAULT_TOP_K=5          # Default retrieval count
RAG_SIMILARITY_THRESHOLD=0.3 # Minimum similarity for inclusion
```

---

## Dependencies (New)

```json
{
  "voyageai": "^0.3.0"
}
```

No other new dependencies required. Anthropic SDK already installed.
