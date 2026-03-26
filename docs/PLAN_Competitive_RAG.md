# Competitive RAG Intelligence Agent — Implementation Plan

## Overview

Separate Python microservice that ingests competitor emails, embeds them with vector search, analyzes patterns with Claude, and feeds insights back to the CRM.

**Service:** `listingflow-rag/` (new directory at monorepo root)
**Stack:** Python + FastAPI + Voyage AI + pgvector + Claude
**Deploy:** Railway or Fly.io (Dockerized, independent from CRM)
**Communicates with CRM via:** shared Supabase DB + REST API

---

## Architecture

```
Monitoring Inbox → RAG Agent (Python) → pgvector (Supabase) → CRM reads insights
                         ↕
                    Claude API (analysis)
```

### Data Flow

1. Competitor emails arrive at `monitor+{source}@listingflow.com`
2. RAG agent ingests: parse HTML → extract text → embed → store in pgvector
3. Weekly research cron: analyze all stored emails → find patterns → write insights
4. CRM reads: `competitive_insights` + `agent_recommendations` tables
5. CRM calls RAG API on demand: before generating emails, get trending patterns

---

## Phase 1: Infrastructure (2 days)

### 1.1 Project Setup
- Create `listingflow-rag/` directory
- FastAPI app with health check
- Dockerfile + docker-compose for local dev
- `.env` with: SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY, VOYAGE_API_KEY

### 1.2 Database Schema
```sql
CREATE EXTENSION IF NOT EXISTS vector;

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
  embedding vector(1536),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON competitive_emails
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE competitive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source_emails UUID[],
  priority INTEGER DEFAULT 5,
  applicable_to TEXT DEFAULT 'all',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 API Endpoints
```
POST /ingest          — Ingest one competitor email
POST /ingest/batch    — Ingest multiple emails
POST /search          — Semantic vector search
POST /analyze         — Compare our email to competitors
POST /research        — Trigger weekly research cycle
GET  /insights        — Get latest insights
GET  /insights/:type  — Get insights by type (trend/gap/recommendation)
GET  /health          — Health check
```

---

## Phase 2: Ingestion Pipeline (2 days)

### 2.1 Email Parser
- Input: raw HTML email
- Extract: subject, sender, plain text body, CTA text, CTA URL
- Detect: email type (listing_alert, market_update, just_sold, etc.)
- Extract: design patterns (hero image, card grid, stats bar, color scheme)
- Output: structured JSON

### 2.2 Embedding Service
- Use Voyage AI (`voyage-3`) — $0.06/1M tokens, better than OpenAI for search
- Embed: subject + body_text concatenated
- Store: 1536-dimension vector in pgvector
- Batch processing for multiple emails

### 2.3 Ingestion API
```python
@app.post("/ingest")
async def ingest_email(email: EmailInput):
    # 1. Parse HTML → extract text + structure
    parsed = parse_email(email.html_body)

    # 2. Classify email type
    email_type = classify_email_type(parsed.text)

    # 3. Analyze design patterns
    design = analyze_design(email.html_body)

    # 4. Embed text
    embedding = await embed_text(f"{parsed.subject} {parsed.text}")

    # 5. Store in pgvector
    await store_email(parsed, email_type, design, embedding)

    return {"id": email_id, "type": email_type}
```

---

## Phase 3: Analysis Engine (3 days)

### 3.1 Vector Search
```python
@app.post("/search")
async def search_similar(query: SearchQuery):
    # Embed query text
    query_embedding = await embed_text(query.text)

    # pgvector cosine similarity search
    results = await supabase.rpc("match_emails", {
        "query_embedding": query_embedding,
        "match_count": query.limit or 10,
        "match_threshold": 0.7
    })

    return results
```

### 3.2 Competitive Analysis
```python
@app.post("/analyze")
async def analyze_vs_competitors(request: AnalyzeRequest):
    # 1. Find similar competitor emails (by type + area)
    similar = await search_similar(request.our_email_text, type=request.email_type)

    # 2. Claude compares our email vs competitors
    analysis = await claude.analyze(
        our_email=request.our_email_html,
        competitor_emails=similar[:5],
        our_performance=request.performance_data
    )

    # 3. Return structured comparison
    return {
        "score": analysis.score,
        "vs_competitors": analysis.summary,
        "suggestions": analysis.suggestions,
        "trending_patterns": analysis.trends
    }
```

### 3.3 Weekly Research Agent
```python
@app.post("/research")
async def weekly_research():
    # 1. Get all emails from last 7 days
    recent = await get_recent_emails(days=7)

    # 2. Cluster by topic/pattern
    clusters = cluster_emails(recent)

    # 3. Claude analyzes each cluster for trends
    trends = await claude.find_trends(clusters)

    # 4. Compare to our realtors' performance
    gaps = await claude.find_gaps(trends, our_performance)

    # 5. Write insights to DB
    for insight in trends + gaps:
        await store_insight(insight)

    # 6. Write recommendations to agent_recommendations
    for rec in gaps:
        await store_recommendation(rec)

    return {"trends": len(trends), "gaps": len(gaps)}
```

---

## Phase 4: CRM Integration (2 days)

### 4.1 CRM Reads Insights
- Analytics tab: fetch `competitive_insights` and display trending patterns
- Weekly report: include top 3 insights from RAG
- AI Agent reasoning: include trending patterns in "Why this email?" panel

### 4.2 CRM Calls RAG Before Email Generation
```typescript
// In newsletter-ai.ts, before generating email:
async function getCompetitiveContext(emailType: string, area: string) {
  const res = await fetch(`${RAG_SERVICE_URL}/analyze`, {
    method: "POST",
    body: JSON.stringify({ email_type: emailType, area }),
  });
  return res.json();
}

// Add to Claude prompt:
const competitive = await getCompetitiveContext("listing_alert", "Kitsilano");
// "Trending: video thumbnails (40%), walk score (60%), price-per-sqft comparison"
```

### 4.3 CRM Displays Insights
- Campaigns tab: "Competitive Edge" card with trending approaches
- Dashboard: subtle insight in AI digest
- Email preview: "Based on competitor analysis" note

### 4.4 Environment Variable
```
RAG_SERVICE_URL=http://localhost:8769   # Local dev
RAG_SERVICE_URL=https://lf-rag.fly.dev # Production
```

---

## Phase 5: Email Monitoring (1 day)

### 5.1 Monitoring Inbox Setup
- Create email aliases: `monitor+compass@listingflow.com`, etc.
- Subscribe to competitor newsletters manually (one-time)
- Forward rule: all monitor+ emails → RAG agent webhook

### 5.2 Competitor Sources
| Source | Email | What They Send |
|---|---|---|
| Compass | monitor+compass@ | Listing alerts, market reports |
| RE/MAX Corporate | monitor+remax@ | Brand newsletters, market data |
| Royal LePage | monitor+royallepage@ | Market updates, listing alerts |
| Sotheby's | monitor+sothebys@ | Luxury listings, editorial |
| Luxury Presence | monitor+luxpresence@ | Agent marketing examples |
| Zillow | monitor+zillow@ | Listing alerts, market reports |

### 5.3 Auto-Ingestion Webhook
```python
@app.post("/webhook/email")
async def email_webhook(email: InboundEmail):
    # Extract source from to-address (monitor+compass@ → "compass")
    source = extract_source(email.to)

    # Ingest
    await ingest_email(EmailInput(
        source=source,
        subject=email.subject,
        html_body=email.html,
        from_email=email.from_addr,
    ))
```

---

## File Structure

```
listingflow-rag/
├── main.py
├── config.py
├── services/
│   ├── parser.py           # HTML → structured text
│   ├── classifier.py       # Detect email type
│   ├── embeddings.py       # Voyage AI embeddings
│   ├── vector_search.py    # pgvector queries
│   ├── analyzer.py         # Claude competitive analysis
│   ├── researcher.py       # Weekly research agent
│   └── design_analyzer.py  # Extract design patterns from HTML
├── api/
│   ├── ingest.py
│   ├── search.py
│   ├── analyze.py
│   ├── research.py
│   └── insights.py
├── models/
│   └── schemas.py          # Pydantic models
├── tests/
│   ├── test_parser.py
│   ├── test_embeddings.py
│   └── test_analysis.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Dependencies

```
fastapi==0.115.*
uvicorn==0.34.*
supabase==2.*
anthropic==0.78.*
voyageai==0.3.*
beautifulsoup4==4.*
lxml==5.*
pydantic==2.*
httpx==0.28.*
python-dotenv==1.*
```

---

## Deployment

### Local Dev
```bash
cd listingflow-rag
pip install -r requirements.txt
uvicorn main:app --port 8769 --reload
```

### Production (Fly.io)
```bash
fly launch --name lf-rag
fly secrets set SUPABASE_URL=... SUPABASE_KEY=... ANTHROPIC_API_KEY=... VOYAGE_API_KEY=...
fly deploy
```

---

## Cost Estimate

| Service | Usage | Monthly Cost |
|---|---|---|
| Voyage AI embeddings | ~1000 emails/month | ~$0.50 |
| Claude analysis | ~100 analysis calls | ~$5 |
| Fly.io hosting | 1 shared CPU | $5-10 |
| **Total** | | **~$15/month** |

---

## Success Criteria

1. Ingest a competitor email → embedding stored in < 2 seconds
2. Search "listing alerts similar to ours" → returns relevant results
3. Weekly research produces 3-5 actionable insights
4. CRM displays insights in Analytics tab and weekly report
5. AI email generation uses competitive context in prompts
6. Realtor sees "Based on competitor analysis" in AI reasoning
