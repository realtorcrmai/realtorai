<!-- docs-audit: docs/* -->
# Realtors360 — Phased Release GTM Strategy

## Context

Realtors360 has multiple modules at different stages of readiness. Rather than launching everything at once, we'll do phased releases — starting with the most stable, revenue-ready modules (CRM + Newsletter) and adding modules in subsequent releases. This reduces risk, focuses marketing messaging, and lets us validate product-market fit incrementally.

---

## Release Timeline

| Release | Codename | Modules | Target Date | Market |
|---------|----------|---------|-------------|--------|
| **R1** | **Foundation** | Core CRM + Email Marketing | Immediate | BC realtors |
| **R2** | **Social** | + Social Media Studio | R1 + 6 weeks | BC + Ontario |
| **R3** | **Sites** | + Website Platform | R2 + 6 weeks | Canada-wide |
| **R4** | **Intelligence** | + Voice Agent + RAG Assistant | R3 + 8 weeks | Canada + US pilot |
| **R5** | **Enterprise** | + Home Services + White-Label | R4 + 8 weeks | US expansion |

---

## Release 1: Foundation (CRM + Email Marketing)

### What Ships
| Feature | Status | Details |
|---------|--------|---------|
| Contact Management | Ready | CRUD, import/export, merge, relationships, segments, stage bar |
| Listing Management | Ready | 8-phase workflow, enrichment, forms, MLS remarks |
| Showing Management | Ready | Twilio SMS/WhatsApp, Google Calendar, approval flow |
| Email Marketing | Ready | AI newsletters (6 types), journey engine, approval queue, voice learning, send governor |
| BCREA Forms | Ready | 12 auto-filled BC forms via Python server |
| FINTRAC Compliance | Ready | Seller identity collection, audit trail |
| CASL Consent | Ready | Consent tracking, expiry cron |
| Data Enrichment | Ready | BC Geocoder, ParcelMap, Assessment |
| Multi-Tenancy | Ready | Tenant isolation on all tables, 61 tests passing |
| Tasks & Reminders | Ready | To-do management with contact/listing linking |
| Deal Pipeline | Ready | Deal tracking, parties, checklist |

### What Does NOT Ship in R1
- Social Media Studio (R2)
- Website Platform / SDK (R3)
- Voice Agent (R4)
- RAG Assistant (R4)
- DDF/MLS Import (R3)
- Home Services Marketplace (R5)
- Content Engine / Kling AI video (R3)

### R1 Pricing

| Tier | Price | Includes |
|------|-------|---------|
| **Free** | $0/mo | 50 contacts, 3 listings, 100 emails/mo |
| **Professional** | $29/mo | Unlimited contacts + listings, 500 emails/mo, BCREA forms, FINTRAC, showing management |
| **Team** | $79/mo | 3 seats (+$19/seat), deal pipeline, team analytics |

### R1 Target Market
- **Who:** 50-100 BC realtors (FVREB, REBGV, Fraser Valley)
- **Why BC:** FINTRAC + BCREA forms = built-in moat. No US CRM has this.
- **Goal:** 50 signups, 15 paying, $500 MRR by end of month 2

### R1 Launch Channels
| Channel | Action | Week |
|---------|--------|------|
| Direct outreach | Email/call 50 agents from network | 1 |
| FVREB presentation | 15-min demo at board meeting | 2 |
| BC realtor Facebook groups | "Built by a BC realtor, for BC realtors" post | 1-2 |
| LinkedIn | 3 posts: FINTRAC pain, CRM comparison, demo video | 1-4 |
| Referral program | $50 credit per referred agent | 3+ |

### R1 Launch Messaging
**Headline:** "The only CRM built for BC realtors — FINTRAC, BCREA forms, AI newsletters included."

**Key messages:**
1. "FINTRAC compliance built in — not bolted on"
2. "12 BCREA forms auto-filled from your listing data"
3. "AI writes your newsletters — you just approve and send"
4. "Replace Follow Up Boss + Mailchimp for $29/mo"

### R1 Success Metrics (60 days)
| Metric | Target |
|--------|--------|
| Total signups | 50 |
| Paying customers | 15 |
| MRR | $500 |
| Daily active users | 60%+ of signups |
| Email newsletters sent | 100+ |
| NPS | 40+ |
| Churn | <10% |

### R1 Pre-Launch Checklist
- [x] Multi-tenancy (tenant isolation)
- [x] Security hardening (no hardcoded secrets)
- [x] Build passes (142 pages)
- [x] DB migrations applied to Supabase
- [ ] Set NEXT_PUBLIC_APP_URL in Vercel
- [ ] Set CRON_SECRET in Vercel
- [ ] Delete test endpoint (api/test/generate-newsletter)
- [ ] Verify demo login works
- [ ] Seed sample data for demo
- [ ] Record 2-min demo video
- [ ] Write landing page copy
- [ ] Set up Stripe billing

---

## Release 2: Social (+ Social Media Studio)

### What Ships (on top of R1)
| Feature | Status | Details |
|---------|--------|---------|
| Social Media Studio | Built | 6-tab dashboard, AI content generation, approval queue, calendar |
| Facebook Publishing | Built | OAuth + Meta Graph API, page posts, multi-image |
| Instagram Publishing | Built | Carousels, Reels, Stories via Meta API |
| Brand Kit | Built | Logo, colours, fonts, voice tone, brokerage compliance |
| Template Library | Built | 30+ templates across 12 categories |
| Content Scoring | Built | 6-dimension quality score (0-100) |
| Publishing Cron | Built | Every 5 min, retry with backoff |

### R2 Pricing Update

| Tier | Price | Change from R1 |
|------|-------|---------------|
| **Free** | $0/mo | + 3 social posts/week (copy-paste only) |
| **Professional** | $39/mo | + Social Pro: unlimited posts, 3 platforms, scheduling |
| **Studio** | $69/mo | NEW: + Video, all platforms, auto-pilot, analytics |
| **Team** | $129/mo | + Team brand lock, approval workflows |

### R2 Target
- **Expand to:** Ontario (TRREB, OREA)
- **Goal:** 200 total users, 80 paying, $4K MRR
- **Timeline:** 6 weeks after R1

### R2 Launch Messaging
**Headline:** "New listing? Your Instagram post is already ready."

---

## Release 3: Sites (+ Website Platform)

### What Ships (on top of R2)
| Feature | Details |
|---------|---------|
| AI Website Generation | 3 style variants, Cloudflare Pages deployment |
| Custom Domains | CNAME setup, auto-SSL |
| Website SDK | Embeddable widgets (chat, listings, newsletter, booking) |
| Content Engine | Kling AI video/image generation |
| DDF/MLS Import | MLS data import + sync |
| Website Analytics | Visitor tracking, session recording, lead attribution |

### R3 Pricing Update

| Tier | Price | Change from R2 |
|------|-------|---------------|
| **Professional** | $49/mo | + Basic website (subdomain) |
| **Studio** | $99/mo | + Custom domain, video studio, DDF import |
| **Team** | $199/mo | + Multi-agent websites |

### R3 Target
- **Expand to:** All of Canada
- **Goal:** 500 total users, 200 paying, $15K MRR
- **Timeline:** 6 weeks after R2

### R3 Launch Messaging
**Headline:** "Your AI-powered website updates itself when you add a listing."

---

## Release 4: Intelligence (+ Voice Agent + RAG)

### What Ships (on top of R3)
| Feature | Details |
|---------|---------|
| Voice Agent | 46 tools, 3 modes (realtor/client/generic), STT/TTS |
| RAG Assistant | Knowledge base, semantic search, 3-tier LLM pipeline |
| AI Lead Scoring | Claude-powered contact scoring |
| Next Best Action | AI recommendations on dashboard |
| Competitive Intelligence | Email monitoring + analysis |

### R4 Pricing Update

| Tier | Price | Change from R3 |
|------|-------|---------------|
| **Studio** | $99/mo | + RAG assistant |
| **Team** | $249/mo | + Voice agent, AI lead scoring |
| **Brokerage** | $499/mo | NEW: 25 seats, white-label, SSO |

### R4 Target
- **Expand to:** US pilot (Seattle, Texas)
- **Goal:** 1,000 total users, 400 paying, $40K MRR
- **Timeline:** 8 weeks after R3

### R4 Launch Messaging
**Headline:** "Talk to your CRM. It talks back — and takes action."

---

## Release 5: Enterprise (+ Home Services + White-Label)

### What Ships (on top of R4)
| Feature | Details |
|---------|---------|
| Home Services Marketplace | Vendor directory, referrals, post-closing automation |
| White-Label | Brokerages rebrand as their own CRM |
| Multi-Office | Multiple locations, office-level reporting |
| API Marketplace | Third-party integrations |
| Affiliate Program | 20% recurring for RE coaches |

### R5 Target
- **Expand to:** Full US + UK pilot
- **Goal:** 5,000 total users, 2,500 paying, $200K MRR
- **Timeline:** 8 weeks after R4

---

## Revenue Projection by Release

| Release | Timeline | Users | Paying | MRR | ARR |
|---------|----------|-------|--------|-----|-----|
| R1 (CRM + Email) | Month 1-2 | 50 | 15 | $500 | $6K |
| R2 (+ Social) | Month 3-4 | 200 | 80 | $4K | $48K |
| R3 (+ Sites) | Month 5-6 | 500 | 200 | $15K | $180K |
| R4 (+ Intelligence) | Month 7-9 | 1,000 | 400 | $40K | $480K |
| R5 (+ Enterprise) | Month 10-14 | 5,000 | 2,500 | $200K | $2.4M |

---

## Feature Gating by Release

Features not included in a release should be **hidden, not broken**:
- Nav items for unreleased modules: hidden via `features.ts` + `enabled_features` on user record
- API routes for unreleased modules: still deployed but return 404 if feature not enabled
- Database tables for unreleased modules: exist but empty (migrations already applied)
- Cron jobs for unreleased modules: skip if no data exists (already do this)

### R1 Feature Flags
```typescript
// For R1, only enable these features:
const R1_FEATURES = [
  "listings", "contacts", "showings", "calendar",
  "tasks", "forms", "newsletters", "automations",
];
// Hide: "social", "website", "content", "search", "workflow", "import"
```

---

## Marketing Calendar

### Month 1 (R1 Launch)
| Week | Action |
|------|--------|
| 1 | Soft launch to 10 beta agents from network |
| 2 | FVREB board presentation + demo |
| 3 | Open signups, activate referral program |
| 4 | First case study, LinkedIn campaign |

### Month 2 (R1 Growth)
| Week | Action |
|------|--------|
| 5 | REBGV presentation |
| 6 | First YouTube demo video |
| 7 | Google Ads campaign (FINTRAC CRM, BC realtor CRM) |
| 8 | Prep R2 launch (social module polish) |

### Month 3 (R2 Launch)
| Week | Action |
|------|--------|
| 9 | R2 launch email to all R1 users |
| 10 | Ontario outreach begins |
| 11 | "I replaced 5 tools" case study video |
| 12 | RE influencer partnerships (3 creators) |

### Month 4-6 (R2 Growth + R3 Launch)
- Expand to Alberta
- R3 launch with website platform
- ProductHunt launch
- Conference presence planning

---

## Risk Mitigation per Release

| Release | Key Risk | Mitigation |
|---------|---------|-----------|
| R1 | Low adoption | Free tier removes friction. Direct outreach to warm network. |
| R1 | Email deliverability | Resend handles SPF/DKIM. Start with low volume. |
| R2 | Meta API rejection | Clipboard fallback (copy caption + download image). |
| R2 | Social content quality | Approval queue default. Voice learning improves over time. |
| R3 | Website complexity | Start with subdomain sites. Custom domains in later sprint. |
| R4 | Voice agent reliability | Beta flag. Optional add-on, not default. |
| R5 | Enterprise sales cycle | Bottom-up adoption. Agents → team lead → brokerage. |

---

*Phased Release GTM v1.0 — April 1, 2026*
