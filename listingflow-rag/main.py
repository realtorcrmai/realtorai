"""ListingFlow RAG — Competitor email analysis sidecar."""

import os
import re
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client
import voyageai
from services.parser import parse_email, classify_email_type, extract_design_patterns

load_dotenv()

app = FastAPI(title="ListingFlow RAG", version="1.0.0")

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"],
)
voyage = voyageai.Client(api_key=os.environ.get("VOYAGE_API_KEY"))

EMBEDDING_MODEL = "voyage-3-large"


# ---------- Models ----------

class EmailInput(BaseModel):
    source: str
    subject: str
    html_body: str
    from_email: Optional[str] = None
    received_at: Optional[str] = None


class InboundEmail(BaseModel):
    to: str
    from_addr: str
    subject: str
    html: str


class SearchQuery(BaseModel):
    text: str
    limit: int = 10
    email_type: Optional[str] = None


# ---------- Endpoints ----------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "listingflow-rag", "timestamp": datetime.now().isoformat()}


@app.post("/ingest")
async def ingest_email(email: EmailInput):
    """Ingest a single competitor email: parse → classify → embed → store."""
    # 1. Parse HTML
    parsed = parse_email(email.html_body)

    # 2. Classify
    email_type = classify_email_type(parsed["text"], email.subject)

    # 3. Analyze design
    design = extract_design_patterns(email.html_body)

    # 4. Embed
    embed_text = f"{email.subject}\n\n{parsed['text']}"
    result = voyage.embed([embed_text[:32000]], model=EMBEDDING_MODEL, input_type="document")
    embedding = result.embeddings[0]

    # 5. Store in competitive_emails
    row = supabase.table("competitive_emails").insert({
        "source": email.source,
        "from_email": email.from_email,
        "subject": email.subject,
        "body_text": parsed["text"],
        "html_body": email.html_body,
        "email_type": email_type,
        "design_analysis": design,
        "received_at": email.received_at or datetime.now().isoformat(),
    }).execute()

    email_id = row.data[0]["id"]

    # 6. Store embedding in rag_embeddings
    import hashlib
    content_hash = hashlib.sha256(embed_text.encode()).hexdigest()

    supabase.table("rag_embeddings").insert({
        "source_table": "competitive_emails",
        "source_id": email_id,
        "chunk_index": 0,
        "content_text": embed_text[:5000],
        "embedding": embedding,
        "content_type": "competitor",
        "channel": "email",
        "content_hash": content_hash,
        "source_created_at": email.received_at or datetime.now().isoformat(),
    }).execute()

    return {
        "id": email_id,
        "type": email_type,
        "word_count": parsed["word_count"],
        "design_patterns": design,
    }


@app.post("/ingest/batch")
async def ingest_batch(emails: list[EmailInput]):
    """Ingest multiple competitor emails."""
    results = []
    for email in emails:
        try:
            result = await ingest_email(email)
            results.append({"status": "ok", **result})
        except Exception as e:
            results.append({"status": "error", "error": str(e), "subject": email.subject})
    return {"processed": len(results), "results": results}


@app.post("/search")
async def search_similar(query: SearchQuery):
    """Semantic search over competitor emails."""
    result = voyage.embed([query.text], model=EMBEDDING_MODEL, input_type="query")
    query_embedding = result.embeddings[0]

    # Use rag_search function
    data = supabase.rpc("rag_search", {
        "query_embedding": query_embedding,
        "filter_types": ["competitor"] if not query.email_type else [query.email_type],
        "match_count": query.limit,
        "match_threshold": 0.3,
    }).execute()

    return {"results": data.data, "count": len(data.data)}


@app.post("/webhook/email")
async def email_webhook(email: InboundEmail):
    """Auto-ingest from monitoring inbox (monitor+source@listingflow.com)."""
    # Extract source from to-address
    match = re.search(r"monitor\+(\w+)@", email.to)
    source = match.group(1) if match else "unknown"

    result = await ingest_email(EmailInput(
        source=source,
        subject=email.subject,
        html_body=email.html,
        from_email=email.from_addr,
    ))

    return {"source": source, **result}


@app.get("/insights")
async def get_insights(insight_type: Optional[str] = None, limit: int = 10):
    """Get latest competitive insights."""
    query = supabase.table("competitive_insights").select("*").order("created_at", desc=True).limit(limit)
    if insight_type:
        query = query.eq("insight_type", insight_type)
    data = query.execute()
    return {"insights": data.data}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8769)
