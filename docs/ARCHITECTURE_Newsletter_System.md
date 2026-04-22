<!-- docs-audit: none --># Newsletter & Email Marketing System — Architecture

> **~70,000+ lines of code across ~200+ files**
> Two live services (CRM on Vercel + Newsletter Agent on Render) sharing one Supabase database.

---

## System Overview

```
                                   REALTORS360 NEWSLETTER SYSTEM
 ============================================================================================================

    REALTOR                                                                               CONTACT
   (Browser)                                                                             (Inbox)
       |                                                                                    ^
       v                                                                                    |
 +-----------+     +------------------------------------------------------------------+    |
 | Next.js   |     |                    CRM (Vercel)                                   |    |
 | Dashboard |---->|                                                                   |    |
 | /newslet- |     |  +----------------+  +----------------+  +------------------+     |    |
 | ters/*    |     |  | Server Actions  |  | API Routes     |  | Cron Jobs        |     |    |
 | (26 pages)|     |  |                 |  |                |  |                  |     |    |
 |           |     |  | newsletters.ts  |  | /editorial/*   |  | process-journeys |     |    |
 |           |     |  | editorial.ts    |  | /newsletters/* |  | weekly-draft     |     |    |
 |           |     |  | journeys.ts     |  | /webhooks/*    |  | ab-winner        |     |    |
 |           |     |  | templates.ts    |  | /cron/*        |  | welcome-drip     |     |    |
 |           |     |  | segments.ts     |  | /test/*        |  | consent-expiry   |     |    |
 |           |     |  +-------+--------+  +-------+--------+  +--------+---------+     |    |
 |           |     |          |                    |                     |               |    |
 |           |     |          v                    v                     v               |    |
 |           |     |  +--------------------------------------------------------------+  |    |
 |           |     |  |                  SHARED LIBRARY LAYER                         |  |    |
 |           |     |  |                                                              |  |    |
 |           |     |  |  +--------------+  +---------------+  +-----------------+    |  |    |
 |           |     |  |  | AI Pipeline  |  | Email Render  |  | Validation      |    |  |    |
 |           |     |  |  | newsletter-  |  | email-blocks  |  | quality-pipe    |    |  |    |
 |           |     |  |  | ai.ts       |  | .ts (13 blks) |  | validated-send  |    |  |    |
 |           |     |  |  | editorial-  |  | editorial-    |  | compliance-gate |    |  |    |
 |           |     |  |  | ai.ts       |  | renderer.tsx  |  | content-valid.  |    |  |    |
 |           |     |  |  | editorial-  |  | email-design  |  | design-valid.   |    |  |    |
 |           |     |  |  | personal.ts |  | -tokens.ts    |  | quality-scorer  |    |  |    |
 |           |     |  |  +--------------+  +---------------+  +-----------------+    |  |    |
 |           |     |  |                                                              |  |    |
 |           |     |  |  +--------------+  +---------------+  +-----------------+    |  |    |
 |           |     |  |  | Governance   |  | AI Agent      |  | Templates       |    |  |    |
 |           |     |  |  | send-govern  |  | lead-scorer   |  | 41 React Email  |    |  |    |
 |           |     |  |  | voice-learn  |  | send-advisor  |  | files in        |    |  |    |
 |           |     |  |  | editorial-   |  | next-best-act |  | src/emails/     |    |  |    |
 |           |     |  |  | billing.ts   |  | contact-eval  |  | (+ 10 editorial |    |  |    |
 |           |     |  |  | workflow-    |  | trust-gate    |  |  block files)   |    |  |    |
 |           |     |  |  | engine.ts    |  | timing-optim  |  |                 |    |  |    |
 |           |     |  |  +--------------+  +---------------+  +-----------------+    |  |    |
 |           |     |  +--------------------------------------------------------------+  |    |
 |           |     |          |                                                         |    |
 |           |     |          v                                                         |    |
 |           |     |  +------------------+                                              |    |
 |           |     |  | resend.ts        |  DEV_EMAIL_MODE=preview --> local file       |    |
 |           |     |  | sendEmail()      |  Production --> Resend API -----+            |    |
 |           |     |  | sendBatchEmails()|                                 |            |    |
 |           |     |  +------------------+                                 |            |    |
 +-----------+     +------------------------------------------------------------------+    |
                                |                                          |                |
                                v                                          v                |
 +------------------------------+-----+     +-----------------------------+                 |
 |           Supabase                  |     |       Resend API            |                 |
 |   qcohfohjihazivkforsj             |     |  (Email Delivery Service)   |-----------------+
 |                                     |     |                             |
 |  +-------------+ +--------------+   |     |  - Sends transactional &   |
 |  | newsletters | | editorial_   |   |     |    marketing emails        |
 |  |             | | editions     |   |     |  - Tracks opens/clicks     |
 |  +-------------+ +--------------+   |     |  - Webhook events back     |
 |  +-------------+ +--------------+   |     +----------+--+--------------+
 |  | newsletter_ | | editorial_   |   |                |  |
 |  | events      | | analytics    |   |                |  |
 |  +-------------+ +--------------+   |     +----------+--+--------------+
 |  +-------------+ +--------------+   |     |    Resend Webhooks         |
 |  | contact_    | | editorial_   |   |     |  open/click/bounce/spam    |
 |  | journeys    | | voice_prof.  |   |     +----------+----------------+
 |  +-------------+ +--------------+   |                |
 |  +-------------+ +--------------+   |                v
 |  | newsletter_ | | editorial_   |   |     +--------------------------+
 |  | templates   | | ab_variants  |   |     | /api/webhooks/resend     |
 |  +-------------+ +--------------+   |     | /api/editorial/webhooks  |
 |  +-------------+ +--------------+   |     |  -> updateContactIntel() |
 |  | contacts    | | editorial_   |   |     |  -> logNewsletterEvent() |
 |  | .newsletter | | usage_log    |   |     |  -> advanceJourney()     |
 |  | _intellig.  | |              |   |     +--------------------------+
 |  +-------------+ +--------------+   |
 |  +-------------+ +--------------+   |
 |  | email_events| | contact_     |   |
 |  | (v3 queue)  | | suppressions |   |
 |  +-------------+ +--------------+   |
 |  +-------------+                    |
 |  | email_event |                    |
 |  | _rules      |                    |
 |  +-------------+                    |
 +-------------------------------------+
                    |
                    | shared DB
                    |
 +------------------------------------------+
 |     Newsletter Agent (Render $7/mo)      |
 |     realtors360-newsletter/              |
 |     11,933 lines                         |
 |                                          |
 |  +------------------+  +-------------+  |
 |  | Express Server   |  | 12 Crons    |  |
 |  | /health          |  | birthday    |  |
 |  | /webhook         |  | saved-search|  |
 |  +------------------+  | listing-sold|  |
 |                         | price-drop  |  |
 |  +------------------+  | showing     |  |
 |  | Agent Orchestr.  |  | drip-seq    |  |
 |  | (Claude tool_use)|  | ...         |  |
 |  |                  |  +-------------+  |
 |  | 19 Tools:        |                   |
 |  |  READ: contact,  |  +-------------+  |
 |  |   engagement,    |  | Pipelines   |  |
 |  |   events, RAG,   |  | birthday    |  |
 |  |   listings,      |  | saved-search|  |
 |  |   market-stats   |  | listing-sold|  |
 |  |                  |  | showing     |  |
 |  |  DECIDE: copy,   |  | price-drop  |  |
 |  |   template,      |  +-------------+  |
 |  |   send-params,   |                   |
 |  |   freq-cap,      |  +-------------+  |
 |  |   trust-level,   |  | Voice       |  |
 |  |   score-intent   |  | Learning    |  |
 |  |                  |  | voice-      |  |
 |  |  WRITE: draft,   |  | learner.ts  |  |
 |  |   send, schedule,|  +-------------+  |
 |  |   approve, A/B,  |                   |
 |  |   log-decision   |  +-------------+  |
 |  +------------------+  | Trust Gate  |  |
 |                         | L0-L3      |  |
 |                         | atomic PG  |  |
 |                         +-------------+  |
 +------------------------------------------+
                    |
                    v
            +---------------+
            | Anthropic API |
            | Claude Haiku  |
            | (scoring,     |
            |  generation,  |
            |  tool_use)    |
            +---------------+
```

---

## Data Flow: Email Lifecycle

```
 1. TRIGGER                    2. GENERATE                  3. VALIDATE
 ========================      ========================     ========================

 Contact event:                AI Content Pipeline:         7-Gate Validation:
 - New contact added           - newsletter-ai.ts           - compliance-gate.ts
 - Showing confirmed             (Claude content gen)         (CASL/TCPA consent)
 - Listing sold                - editorial-ai.ts            - content-validator.ts
 - Price dropped                  (10 block types)             (spam, brand safety)
 - Birthday                   - editorial-personalizer.ts   - design-validator.ts
 - Journey phase advance         (per-contact Haiku)           (HTML structure)
 - Scheduled cron              - voice-learning.ts          - quality-scorer.ts
 - Manual send                   (tone adaptation)             (7-dim Claude score)
       |                              |                     - send-governor.ts
       v                              v                        (frequency caps)
 +-------------+              +------------------+          - validated-send.ts
 | email_events|              | email-blocks.ts  |             (unified gate)
 | table       |              | (13 modular      |                |
 | (event queue)|             |  Apple-quality   |                v
 +------+------+              |  HTML blocks)    |         +-----------+
        |                     +--------+---------+         | APPROVED  |
        v                              |                   | or        |
 Journey Engine                        v                   | HELD BACK |
 journeys.ts                  +------------------+         +-----------+
 (phase advancement)          | editorial-       |
                              | renderer.tsx     |
                              | (React Email     |
                              |  -> HTML)        |
                              +------------------+



 4. PERSONALIZE                5. SEND                      6. TRACK
 ========================      ========================     ========================

 Per-contact at send time:     Delivery:                    Webhook feedback loop:

 Subject personalization:      resend.ts                    Resend webhook events:
 - pickPersonalizedSubject()   - sendEmail()                - email.delivered
   (investor -> ROI subject)   - sendBatchEmails()          - email.opened
   (cold -> short subject)     - sendWithRetry()            - email.clicked
   (area -> area subject)        (exponential backoff)      - email.bounced
                                 (429 + 5xx retry)          - email.complained
 Block personalization:                |                           |
 - generatePersonalizedBlock()         v                           v
   (Claude Haiku per-contact)  +------------------+        +------------------+
   (cap: 50 contacts/send)    | DEV_EMAIL_MODE?  |        | /api/webhooks/   |
   (100ms rate guard)          |                  |        | resend/route.ts  |
       |                       | preview:         |        |                  |
       v                       |  -> $TMPDIR/     |        | Updates:         |
 injectPersonalizedBlock()     |     dev-emails/  |        | - newsletter_    |
 (marker replacement)          |                  |        |   events table   |
                               | production:      |        | - contacts.      |
                               |  -> Resend API   |        |   newsletter_    |
                               +------------------+        |   intelligence   |
                                                           | - journey phase  |
                                                           |   advancement    |
                                                           | - NBA overrides  |
                                                           +------------------+
```

---

## Editorial Edition Flow (Detailed)

```
 Realtor creates edition                   AI generates content
 ─────────────────────                     ────────────────────

 /newsletters/editorial/new               /api/editorial/generate
          |                                        |
          v                                        v
 createEdition()                          editorial-ai.ts
 (editorial.ts)                           generateAllBlocks()
          |                                        |
          v                                        v
 editorial_editions                       10 Block Generators:
 table (status: draft)                    +-----------------------+
          |                               | hero.ts               |
          v                               | market-commentary.ts  |
 /editorial/[id]/edit                     | just-sold.ts          |
 BlockEditor component                    | rate-watch.ts         |
 (drag-drop block editor)                 | local-intel.ts        |
          |                               | neighborhood-spot.ts  |
          v                               | quick-tip.ts          |
 updateEditionBlocks()                    | agent-note.ts         |
 (save blocks to DB)                      | cta.ts                |
          |                               | divider (structural)  |
          v                               +-----------------------+
 sendEdition()                                     |
 (editorial.ts)                                    v
          |                               Voice Profile Adaptation
          |                               editorial_voice_profiles
          v                               (tone, style, signature)
 +-----------------------+
 | Render HTML           |
 | editorial-renderer.tsx|
 | -> renderEdition()    |
 +-----------------------+
          |
          v
 +-----------------------+
 | Per-contact loop      |     For each contact with intelligence:
 | (up to 50 Haiku calls)|
 |                       |     1. Subject personalization (rule-based)
 | For each contact:     |        pickPersonalizedSubject()
 |  - Unsubscribe URL    |
 |  - Personalized block |     2. Block injection (AI)
 |  - Subject selection  |        generatePersonalizedBlock() -> Claude Haiku
 |  - A/B variant assign |        injectPersonalizedBlock() -> replace marker
 +-----------------------+
          |                    3. A/B variant assignment (random 50/50)
          v
 +-----------------------+
 | Send via Resend       |     4. Send with tags (edition_id, contact_id, ab_variant)
 | or DEV capture        |
 +-----------------------+
          |
          v
 editorial_analytics
 editorial_ab_variants
 newsletter_events
```

---

## Contact Intelligence Loop

```
                           +------------------+
                           |    Contact       |
                           |    Profile       |
                           +--------+---------+
                                    |
                     +--------------+--------------+
                     |                             |
                     v                             v
            +----------------+           +------------------+
            | contacts.      |           | contacts.        |
            | newsletter_    |           | ai_lead_score    |
            | intelligence   |           | (JSONB)          |
            | (JSONB)        |           |                  |
            |                |           | - intent         |
            | - engagement_  |           | - buying_readiness|
            |   score        |           | - hot_topic      |
            | - total_opens  |           | - price_anchor   |
            | - total_clicks |           | - relationship_  |
            | - click_history|           |   stage          |
            | - inferred_    |           +--------+---------+
            |   interests:   |                    |
            |   - areas      |                    |
            |   - prop_types |           +--------+---------+
            |   - lifestyle  |           | AI Lead Scorer   |
            | - engagement_  |           | lead-scorer.ts   |
            |   trend        |           | (periodic scan)  |
            +--------+-------+           +------------------+
                     |
                     |  Updated by:
                     |
           +---------+---------+
           |                   |
           v                   v
  +------------------+  +------------------+
  | Resend Webhooks  |  | Newsletter Agent |
  | (open/click/     |  | contact-         |
  |  bounce events)  |  | evaluator.ts     |
  +------------------+  +------------------+
```

---

## Database Tables (24 migrations)

```
 CORE NEWSLETTER                    EDITORIAL SYSTEM
 ==================                 ==================

 newsletters                        editorial_editions
   id, contact_id, template,          id, title, edition_type,
   subject, html, status,             blocks (JSONB), status,
   sent_at, ab_variant                subject_a, subject_b,
                                      scheduled_at, sent_at
 newsletter_templates
   id, name, type, html,            editorial_voice_profiles
   builder_json, is_ai                id, realtor_id, tone,
                                      writing_style, signature,
 newsletter_events                    sample_email
   id, newsletter_id, event_type,
   contact_id, metadata,            editorial_analytics
   created_at                          edition_id, contact_id,
                                      event_type, metadata
 contact_journeys
   id, contact_id, journey_type,    editorial_ab_variants
   current_phase, enrolled_at,        edition_id, variant,
   last_advanced_at                    subject, send_count,
                                      open_count, click_count
 newsletter_quality_scores
   id, newsletter_id,               editorial_content_library
   dimensions (JSONB, 7-dim),         id, type, title, content,
   overall_score                       tags, usage_count

 email_events (v3 queue)            editorial_usage_log
   id, event_type, contact_id,        id, realtor_id, action,
   payload, status, attempts           usage_date, count

 email_event_rules                  editorial_transactions
   id, event_type, action,            id, edition_id, action,
   conditions, template_id             actor, metadata, created_at

 contact_suppressions               editorial_market_data_cache
   id, contact_id, reason,            id, area, data_type,
   suppressed_at                       payload (JSONB), fetched_at

 CONTACT INTELLIGENCE (JSONB columns on `contacts` table)
 =========================================================

 contacts.newsletter_intelligence    contacts.ai_lead_score
   engagement_score                    intent
   total_opens / total_clicks          buying_readiness
   click_history (last 50)             hot_topic
   inferred_interests                  price_anchor
     .areas[]                          relationship_stage
     .property_types[]
     .lifestyle_tags[]
   engagement_trend
   timing_patterns
```

---

## Service Deployment

```
 +-------------------+          +-------------------+          +-------------------+
 |   CRM (Vercel)    |          |  Newsletter Agent |          |   Supabase        |
 |                   |          |  (Render $7/mo)   |          |                   |
 | Next.js 16        |          |  Node.js/Express  |          | PostgreSQL + RLS  |
 | App Router        |  shared  |  11,933 lines     |  shared  | 60+ tables        |
 | Server Actions    |<-------->|  19 Claude tools   |<-------->| 24 newsletter     |
 | API Routes        |    DB    |  12 cron jobs     |    DB    |   migrations      |
 | Cron (6 jobs)     |          |  Event pipelines  |          | Multi-tenant      |
 |                   |          |  Voice learning   |          |   (realtor_id)    |
 | Auto-deploy:      |          |  Trust L0-L3      |          |                   |
 |   push to dev     |          |  DLQ + retry      |          | ref: qcohfohjihaz |
 +-------------------+          |                   |          +-------------------+
                                | Auto-deploy:      |
                                |   push to dev     |                    |
                                +-------------------+                    |
                                                                         v
                                +-------------------+          +-------------------+
                                |   Resend          |          |   Anthropic API   |
                                |                   |          |                   |
                                | Email delivery    |          | Claude Haiku:     |
                                | Open/click track  |          |  - quality scoring|
                                | Webhook events    |          |  - personalization|
                                | Verified domain:  |          |  - agent tools    |
                                |  hello@realtors   |          |                   |
                                |  360.ai           |          | Claude Sonnet:    |
                                +-------------------+          |  - content gen    |
                                                               |  - editorial AI   |
                                                               +-------------------+
```

---

## File Count Summary

| Category | Files | Lines | Key Location |
|----------|-------|-------|-------------|
| Server Actions | 5 | 4,005 | `src/actions/` |
| Core Lib Modules | 19 | ~8,400 | `src/lib/` |
| Newsletter Generators | 10 | 1,148 | `src/lib/newsletter/generators/` |
| AI Agent (CRM-side) | 11 | 2,205 | `src/lib/ai-agent/` |
| Validators | 4 | 703 | `src/lib/validators/` |
| Email Templates | 41 | ~5,000 | `src/emails/` |
| UI Pages | 26 | — | `src/app/(dashboard)/newsletters/` |
| UI Components | 39 | 11,135 | `src/components/newsletters/` + `editorial/` |
| API Routes | 28 | ~2,800 | `src/app/api/` |
| DB Migrations | 24 | ~10,000 | `supabase/migrations/` |
| Newsletter Agent | multi | 11,933 | `realtors360-newsletter/` |
| Test Scripts | 14 | 6,774 | `scripts/` |
| Types | 2 | ~500 | `src/types/editorial.ts` |
| **TOTAL** | **~200+** | **~70,000+** | |
