# AI Email Marketing Engine

### How It Works (Simple)

```
Contact added → AI writes email → Realtor approves → Email sent → Track engagement → Repeat
```

### Email Flow (All Paths)

Every email in the system goes through the same process:

```
1. SOURCE generates content (auto-enroll, workflow cron, AI agent, manual blast)
2. TEXT PIPELINE (src/lib/text-pipeline.ts)
   → Personalization, voice rules, compliance check, subject dedup, length check
3. HTML RENDER (src/lib/email-blocks.ts)
   → Pick blocks based on email type → assemble Apple-quality HTML
4. QUALITY SCORE (src/lib/quality-pipeline.ts)
   → Claude Haiku rates 7 dimensions (1-10) → block if <4, regenerate if <6
5. SAVE as draft in newsletters table → appears in AI Agent approval queue
6. REALTOR approves → sendNewsletter() → validated send via Resend
7. TRACK → Resend webhooks → update contact intelligence → adapt next email
```

### Email Block System (src/lib/email-blocks.ts)

Modular blocks assembled per email type. Apple-quality design: SF Pro font, 20px radius, pill CTAs, dark mode.

| Block | Purpose |
|-------|---------|
| `heroImage` | Full-width photo with overlay text |
| `heroGradient` | Gradient background for non-listing emails |
| `priceBar` | Price + beds/baths/sqft specs |
| `personalNote` | AI-written personalized text |
| `featureList` | Icon + title + description rows |
| `photoGallery` | 2x2 image grid |
| `statsRow` | Market stats with trend arrows |
| `recentSales` | Sold properties table |
| `priceComparison` | This listing vs area average |
| `openHouse` | Event card with date/time |
| `cta` | Pill-shaped call-to-action button |
| `agentCard` | Realtor photo + name + phone |
| `footer` | Unsubscribe + physical address (CASL) |

Usage: `assembleEmail("listing_alert", { contact, agent, content, listing, market })`

### Cron Jobs (Automated via Vercel Cron — vercel.json)

| Cron | Schedule | What It Does |
|------|----------|-------------|
| `/api/cron/process-workflows` | Daily 9 AM | Check journeys + workflows → generate email drafts → AI Agent queue |
| `/api/cron/daily-digest` | Daily 8 AM | Email realtor: overnight summary, hot buyers, pending drafts |
| `/api/cron/consent-expiry` | Weekly Mon 6 AM | Check CASL consent expiring → queue re-confirmation |

All crons require `Authorization: Bearer CRON_SECRET` header.

### Email Marketing UI (Single Page — /newsletters)

7 tabs on one page:

| Tab | Purpose |
|-----|---------|
| Overview | Stat pills, hot buyers/sellers, pipeline, AI activity |
| AI Agent | Approval queue + sent emails with engagement + held back |
| Campaigns | Listing blast automation + custom campaigns + blast history |
| Relationships | Health snapshot, pipeline drilldown, activity velocity |
| Journeys | Contact journey list with search/filter/expand |
| Analytics | Open/click rates, brand score, AI insights, email log |
| Settings | Master switch, frequency cap, quiet hours, compliance |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/email-blocks.ts` | Modular email block builder (Apple-quality) |
| `src/lib/text-pipeline.ts` | Pre-send text processing (personalize, voice, compliance) |
| `src/lib/quality-pipeline.ts` | 7-dimension quality scoring via Claude Haiku |
| `src/lib/validated-send.ts` | Full validation wrapper around Resend send |
| `src/lib/send-governor.ts` | Frequency caps, engagement throttle, auto-sunset |
| `src/lib/newsletter-ai.ts` | Claude content generation with reasoning |
| `src/lib/workflow-engine.ts` | Workflow step executor (sends via blocks + Resend) |
| `src/actions/newsletters.ts` | Newsletter CRUD, send, approve, bulk, skip |
| `src/actions/journeys.ts` | Journey enrollment, phase advancement |
| `src/lib/validators/*.ts` | 4 validators: content, design, compliance-gate, quality-scorer |
| `src/lib/voice-learning.ts` | Extract writing rules from realtor edits |
| `src/lib/learning-engine.ts` | Weekly learning cycle — analyze outcomes, adjust config |
| `src/app/api/webhooks/resend/route.ts` | Click/open/bounce tracking (12 click categories) |
| `src/app/api/templates/preview/route.ts` | Apple-quality template previews (3 designs) |
| `src/app/api/listings/blast/route.ts` | Listing blast batch send to agents |
| `src/app/api/cron/daily-digest/route.ts` | Morning digest email to realtor |
| `src/app/api/cron/consent-expiry/route.ts` | CASL consent expiry checker |
| `src/components/newsletters/*.tsx` | All 7 tab components + PipelineCard |
| `scripts/seed-demo.mjs` | Demo seed data (29 contacts, 84 emails, 129 events) |

### Seed Data

Single source of truth: `scripts/seed-demo.mjs`. Run: `node scripts/seed-demo.mjs`

All demo contacts use phone prefix `+1604555` for easy cleanup. Idempotent — safe to run multiple times.

### Production Deployment

```bash
# 1. Deploy to Vercel (includes cron jobs from vercel.json)
vercel --prod

# 2. Set env vars in Vercel dashboard (from vault)
./scripts/vault.sh status  # see all keys

# 3. Configure Resend webhook in Resend dashboard
# URL: https://your-app.vercel.app/api/webhooks/resend
# Events: email.opened, email.clicked, email.bounced, email.delivered
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `newsletters` | Email drafts, sent, suppressed — with quality_score + ai_context |
| `newsletter_events` | Open/click/bounce with link_type classification |
| `contact_journeys` | Journey enrollment, phase, trust_level, next_email_at |
| `contacts.newsletter_intelligence` | Per-contact engagement score, click history, interests |
| `realtor_agent_config` | Voice rules, frequency caps, brand config |
| `competitive_insights` | RAG-generated insights (future) |

### Specs & Plans

| Document | Location |
|----------|----------|
| Master Implementation Plan | `docs/MASTER_IMPLEMENTATION_PLAN.md` |
| Prospect 360 Spec | `docs/SPEC_Prospect_360.md` |
| Content Intelligence Spec | `docs/SPEC_Email_Content_Intelligence.md` |
| Validation Pipeline Spec | `docs/SPEC_Validation_Pipeline.md` |
| Competitive RAG Plan | `docs/PLAN_Competitive_RAG.md` |
| User Journey Maps | `docs/user-journeys.md` |
| Pending Work | `pendingwork.md` (repo root) |
