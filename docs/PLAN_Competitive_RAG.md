<!-- docs-audit: realtors360-rag/**, src/lib/rag/* -->
# Competitive RAG Intelligence Agent — Implementation Plan

## Overview

Separate Python microservice that ingests competitor emails, embeds them with vector search, analyzes patterns with Claude, and feeds insights back to the CRM.

**Service:** `realtors360-rag/` (new directory at monorepo root)
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

1. Competitor emails arrive at `monitor+{source}@realtors360.com`
2. RAG agent ingests: parse HTML → extract text → embed → store in pgvector
3. Weekly research cron: analyze all stored emails → find patterns → write insights
4. CRM reads: `competitive_insights` + `agent_recommendations` tables
5. CRM calls RAG API on demand: before generating emails, get trending patterns

---

## Phase 1: Infrastructure (2 days)

### 1.1 Project Setup
- Create `realtors360-rag/` directory
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
- Create email aliases: `monitor+compass@realtors360.com`, etc.
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
realtors360-rag/
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
cd realtors360-rag
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

## Phase 6: Customer Intelligence RAG (3 days)

Same service, second vector collection. Embeds CRM data for semantic search across contacts, listings, and conversations.

### 6.1 Data Flow: CRM → RAG

**Bulk sync (every 5 min — no CRM code changes):**
```
RAG cron reads from shared Supabase:
  → SELECT * FROM contacts WHERE updated_at > last_sync
  → SELECT * FROM listings WHERE updated_at > last_sync
  → SELECT * FROM communications WHERE created_at > last_sync
  → Embed changed records → update pgvector
```

**Hot event webhooks (3 CRM additions):**
```typescript
// In actions/listings.ts — after creating listing:
await fetch(`${RAG_URL}/ingest/listing`, {
  method: "POST",
  body: JSON.stringify({ listing_id, address, description }),
});

// In actions/showings.ts — after showing feedback:
await fetch(`${RAG_URL}/ingest/feedback`, {
  method: "POST",
  body: JSON.stringify({ contact_id, listing_id, feedback }),
});

// In webhooks/resend/route.ts — after high-intent click:
await fetch(`${RAG_URL}/ingest/event`, {
  method: "POST",
  body: JSON.stringify({ contact_id, event_type, metadata }),
});
```

### 6.2 What Gets Embedded

| Data Type | Source Table | Embedding Content | Use Case |
|---|---|---|---|
| Contact profile | contacts | name + notes + buyer_preferences | "Find contacts similar to Sarah" |
| Contact notes | communications | call notes, meeting notes | "Sarah mentioned schools" → reference in emails |
| Listing descriptions | listings | address + notes + features | "Find listings matching buyer preferences" |
| MLS data | listings (imported) | Full MLS description | "Similar homes that sold recently" |
| Showing feedback | communications | Agent feedback text | "Buyers thought it was overpriced" |
| Click patterns | newsletter_events | Aggregated click history as text | "Find buyers who click Kits listings" |

### 6.3 Database Schema (additions)

```sql
CREATE TABLE contact_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  content_type TEXT NOT NULL,        -- 'profile', 'notes', 'click_pattern'
  content_text TEXT NOT NULL,
  embedding vector(1536),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON contact_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE listing_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  content_text TEXT NOT NULL,
  embedding vector(1536),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON listing_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 6.4 New API Endpoints

```
POST /sync                    — Run bulk sync from Supabase
POST /ingest/listing          — Immediate embed for new listing
POST /ingest/feedback         — Immediate embed for showing feedback
POST /ingest/event            — Immediate embed for hot click

POST /search/contacts         — "Find contacts similar to X"
POST /search/listings         — "Find listings matching buyer preferences"
POST /match/buyer-listings    — "Which active listings match this buyer?"

GET  /context/:contactId      — Full semantic context for email generation
```

### 6.5 How CRM Uses Customer Intelligence RAG

**Email generation (before Claude writes):**
```
CRM calls: GET /context/sarah-123

RAG returns:
{
  "profile_summary": "3BR buyer in Kitsilano, $1.1-1.4M, 2 kids, schools important",
  "recent_notes": "Call Mar 19: mentioned lease ends July 31, pre-approved $1.3M TD",
  "click_patterns": "Clicks Kits listings 83%, ignores market updates, responds to data",
  "similar_converted": "Contacts like Sarah converted after avg 4.2 listing alerts",
  "matching_listings": [
    { "address": "3456 W 4th Ave", "match_score": 94, "reason": "area+beds+price+school" }
  ],
  "suggested_angle": "Urgency — lease ends in 4 months, DOM avg 12 days"
}

→ Claude uses ALL of this context to write a hyper-personalized email
```

**Listing-buyer matching (when new listing created):**
```
CRM calls: POST /match/buyer-listings
{ "listing_id": "xxx" }

RAG returns:
{
  "matching_buyers": [
    { "contact_id": "sarah-123", "score": 94, "reasons": ["area", "beds", "price"] },
    { "contact_id": "tom-456", "score": 71, "reasons": ["price", "type"] }
  ]
}

→ CRM auto-generates listing alerts for these buyers
```

### 6.6 Sync Service

```python
# services/sync.py

class CRMSync:
    def __init__(self, supabase, embedder):
        self.supabase = supabase
        self.embedder = embedder
        self.last_sync = None

    async def run_sync(self):
        since = self.last_sync or (datetime.now() - timedelta(minutes=10))

        # Sync contacts
        contacts = await self.supabase.from_("contacts") \
            .select("id, name, type, notes, buyer_preferences, seller_preferences") \
            .gt("updated_at", since.isoformat()) \
            .execute()

        for contact in contacts.data:
            text = f"{contact['name']} ({contact['type']}). {contact.get('notes', '')}"
            if contact.get('buyer_preferences'):
                prefs = contact['buyer_preferences']
                text += f" Budget: {prefs.get('budget_min')}-{prefs.get('budget_max')}."
                text += f" Areas: {', '.join(prefs.get('areas', []))}."
            embedding = await self.embedder.embed(text)
            await self.upsert_embedding("contact", contact["id"], text, embedding)

        # Sync listings
        listings = await self.supabase.from_("listings") \
            .select("id, address, list_price, status, notes") \
            .gt("updated_at", since.isoformat()) \
            .execute()

        for listing in listings.data:
            text = f"{listing['address']}. ${listing.get('list_price', 'TBD')}. {listing.get('notes', '')}"
            embedding = await self.embedder.embed(text)
            await self.upsert_embedding("listing", listing["id"], text, embedding)

        self.last_sync = datetime.now()
        return {"contacts_synced": len(contacts.data), "listings_synced": len(listings.data)}
```

### 6.7 Updated File Structure

```
realtors360-rag/
├── main.py
├── config.py
├── services/
│   ├── parser.py              # HTML email parser
│   ├── classifier.py          # Email type classifier
│   ├── embeddings.py          # Voyage AI embeddings
│   ├── vector_search.py       # pgvector queries
│   ├── analyzer.py            # Claude competitive analysis
│   ├── researcher.py          # Weekly research agent
│   ├── design_analyzer.py     # Extract design patterns
│   ├── sync.py                # CRM data sync (NEW)
│   └── matcher.py             # Buyer-listing matching (NEW)
├── api/
│   ├── ingest.py              # Competitor email ingestion
│   ├── search.py              # Semantic search
│   ├── analyze.py             # Competitive analysis
│   ├── research.py            # Weekly research
│   ├── insights.py            # Get insights
│   ├── sync_api.py            # Sync endpoints (NEW)
│   ├── context.py             # Contact context for email gen (NEW)
│   └── match.py               # Buyer-listing matching (NEW)
├── models/
│   └── schemas.py
├── tests/
│   ├── test_parser.py
│   ├── test_embeddings.py
│   ├── test_analysis.py
│   ├── test_sync.py           # (NEW)
│   └── test_matcher.py        # (NEW)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Cost Estimate

| Service | Usage | Monthly Cost |
|---|---|---|
| Voyage AI embeddings | ~1000 emails + ~5000 CRM records/month | ~$3 |
| Claude analysis | ~200 analysis calls | ~$10 |
| Fly.io hosting | 1 shared CPU | $5-10 |
| pgvector storage | ~50K vectors | Free (Supabase) |
| **Total** | | **~$20/month** |

---

## Success Criteria

### Competitive RAG (Phase 1-5)
1. Ingest a competitor email → embedding stored in < 2 seconds
2. Search "listing alerts similar to ours" → returns relevant results
3. Weekly research produces 3-5 actionable insights
4. CRM displays insights in Analytics tab and weekly report
5. AI email generation uses competitive context in prompts
6. Realtor sees "Based on competitor analysis" in AI reasoning

### Customer Intelligence RAG (Phase 6)
7. Sync cron runs every 5 min — new/updated contacts + listings embedded
8. GET /context/:contactId returns full semantic profile in < 500ms
9. Buyer-listing matching finds top 5 matches with reasons
10. AI email generation uses contact context from RAG (not just JSONB)
11. New listing created → matching buyers identified within 30 seconds
12. "Find contacts similar to Sarah" returns relevant matches
