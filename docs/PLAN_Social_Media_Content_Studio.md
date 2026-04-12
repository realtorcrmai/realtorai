<!-- docs-audit: realtors360-social/** -->
# Implementation Plan: Realtors360 Social — AI Content Studio

> **Date:** March 30, 2026
> **PRD:** `docs/PRD_Social_Media_Content_Studio.md`
> **Status:** Implementation-ready
> **Timeline:** 13 sprints (26 weeks)
> **Dependencies:** Existing CRM email engine, Claude AI, Kling AI
> **Architecture:** Standalone module at `realtors360-social/` — separate tier, sellable independently

## 0. Architecture: Standalone Module

```
/Users/bigbear/reality crm/
├── realestate-crm/          # Core CRM (existing)
│   └── src/app/api/social-bridge/  # Thin API bridge for CRM data
├── realtors360-social/       # Social Media Studio (NEW — standalone)
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # Social-specific UI components
│   │   ├── lib/              # AI generators, platform APIs, engines
│   │   └── actions/          # Server actions
│   ├── supabase/migrations/  # Social-specific tables
│   ├── package.json          # Own dependencies
│   ├── next.config.ts
│   └── tailwind.config.ts
├── realtors360-agent/        # Website generation agent (existing)
├── realtors360-rag/          # Competitive intelligence (existing)
└── voice_agent/              # Voice agent (existing)
```

### Separation Principles
1. **Own package** — `realtors360-social/` has its own `package.json`, `node_modules`, build
2. **API boundary** — consumes CRM data via REST API (`/api/social-bridge/*`), NOT direct imports
3. **Shared DB** — same Supabase instance, but social tables are self-contained
4. **Own deployment** — separate Vercel project, own domain (e.g. `social.realtors360.com`)
5. **Embeddable** — CRM dashboard embeds social UI via iframe or micro-frontend pattern
6. **Auth bridge** — shares NextAuth session via shared cookie domain or API key auth
7. **Sellable standalone** — can be sold to agents who don't use Realtors360 CRM (API key auth to any CRM)

### CRM Bridge API (thin layer in realestate-crm)
```
GET  /api/social-bridge/listings      # Active listings with photos
GET  /api/social-bridge/listings/:id  # Single listing detail
GET  /api/social-bridge/contacts      # Contacts for attribution
GET  /api/social-bridge/testimonials  # Client testimonials
GET  /api/social-bridge/agent-profile # Agent name, brokerage, photo
POST /api/social-bridge/lead          # Create lead from social attribution
GET  /api/social-bridge/market-data   # Market stats for content
```
Auth: `X-LF-Social-Key` header (API key per realtor, stored in `social_brand_kits`)

---

---

## 1. Reusable Code Audit

**15 existing modules can be reused directly — no rebuild needed:**

| Module | File | Reuse For |
|--------|------|-----------|
| Claude AI client | `src/lib/anthropic/creative-director.ts` | Social caption generation |
| Claude retry logic | `src/lib/anthropic/retry.ts` | All AI API calls |
| Newsletter AI | `src/lib/newsletter-ai.ts` | Personalization + RAG context |
| Message generator | `src/lib/anthropic/message-generator.ts` | Platform-specific content |
| Kling AI client | `src/lib/kling/client.ts` | Photo-to-video, text-to-image |
| Voice learning | `src/lib/voice-learning.ts` | Learn from caption edits |
| Quality pipeline | `src/lib/quality-pipeline.ts` | Content scoring (adapt dimensions) |
| Text pipeline | `src/lib/text-pipeline.ts` | Caption validation, compliance |
| Approval queue UI | `src/components/newsletters/AIAgentQueue.tsx` | Social approval flow |
| Learning engine | `src/lib/learning-engine.ts` | Optimize content strategy weekly |
| Workflow triggers | `src/lib/workflow-triggers.ts` | Auto-generate on CRM events |
| Compliance gate | `src/lib/validators/compliance-gate.ts` | Block misleading claims |
| Send governor | `src/lib/send-governor.ts` | Posting frequency caps |
| Google OAuth | `src/lib/google-calendar.ts` | Token refresh pattern |
| Cron framework | `src/app/api/cron/*.ts` | Publishing + analytics crons |

**Estimated time saved by reuse: 8-10 weeks.**

---

## 2. Gap Analysis (27 Gaps Identified)

### Critical Gaps (Must fix before building)

| # | Gap | Impact | Resolution |
|---|-----|--------|-----------|
| G1 | Image/carousel rendering pipeline undefined | Phase 1 blocked | Use Sharp for image composition. Puppeteer screenshot as fallback. Bannerbear API ($49/mo) as managed alternative. |
| G2 | Video post-processing needs FFmpeg (can't run on Vercel) | Phase 3 blocked | Deploy separate video worker on Railway ($5-20/mo) or use Creatomate API ($15/mo). |
| G3 | Meta App Review takes 4-12 weeks | Phase 2 timeline at risk | Apply for Meta app review in Sprint 1 (week 1). Build clipboard-copy fallback for Phase 1. |
| G5 | OAuth token encryption not specified | Security risk | Use `crypto.createCipheriv` with AES-256-GCM, key from env var. Build from Sprint 1. |
| G12 | `social_accounts` FK references `realtor_sites` (not all agents have one) | Schema broken for non-Sites users | Use auth user ID or create a lightweight `realtor_profiles` join table. |
| G17 | Meta App Review is 4-12 week process | Phase 1 cannot include direct Instagram publishing | Decouple: Phase 1 = content generation + approval. Phase 2 = publishing (after Meta approval). |
| G22 | Template rendering architecture undefined | Can't build templates without this | Define JSON schema for template layouts in Sprint 1. |

### High Gaps (Address during build)

| # | Gap | Resolution |
|---|-----|-----------|
| G4 | No rate limiting/retry queue | Build publish queue with exponential backoff in Sprint 5 |
| G6 | No webhook receivers for platform callbacks | Add in Sprint 7 |
| G7 | No retry for failed publishes | Build into publish queue (max 3 retries) |
| G8 | Content editor UX undefined | Phase 1 = text editing only. Image editing deferred to Phase 3. |
| G9 | Mobile experience not addressed | Use existing responsive patterns. Calendar = list view on mobile. |
| G10 | No onboarding flow | Adapt `NewsletterWalkthrough` pattern in Sprint 4 |
| G13 | Brand kit duplicates Sites config | Sync mechanism: if `realtor_sites` exists, auto-populate brand kit |
| G16 | No audit log for AI content changes | Store original + edited caption diffs for voice learning |
| G21 | OAuth token refresh differs per platform | Just-in-time refresh before every API call, not just daily cron |
| G25 | AI cost per agent not modeled | Track costs in `social_usage_tracking` table from Sprint 2 |
| G26 | Multi-market advertising compliance | Brand kit must require brokerage name. Templates include mandatory compliance footer. |

### Medium Gaps (Address in later phases)

| # | Gap | Resolution |
|---|-----|-----------|
| G11 | Template customization depth undefined | Start with variable-slot templates (text swap only). Visual editor is Phase 6+. |
| G14 | Content score scale inconsistent (0-100 vs 1-10) | Normalize to 0-100 for social, convert internally for email compatibility |
| G15 | Missing database indexes | Add during schema creation |
| G23 | Carousel slide generation complex | Use Sharp for composition in Sprint 6 |
| G24 | Video template system undefined | Use Kling prompts + post-processing, not a template engine |
| G27 | Content liability undefined | Add disclaimer in settings: "AI-generated content requires agent review" |

---

## 3. Risk Register (16 Risks)

### Red Risks (High likelihood + High impact)

| Risk | Mitigation |
|------|-----------|
| **R1: Meta App Review rejection** | Apply week 1. Prepare demo video, privacy policy, data deletion callback. Build clipboard fallback for launch without direct publishing. |
| **R8: Video processing can't run on Vercel** | Use Railway/Fly.io worker ($5-20/mo) or Creatomate managed API ($15/mo). Decision by Sprint 7. |
| **R16: Phase 1 scope too large (10 features in 4 weeks)** | Reduce Phase 1 MVP to: brand kit, AI captions (text-only), approval queue, calendar (list view). Defer image composition + direct publishing to Phase 2. |

### Amber Risks (Medium likelihood or impact)

| Risk | Mitigation |
|------|-----------|
| **R3: TikTok 3-upload/day limit for unverified apps** | Launch TikTok as Phase 2. Apply for verification with Instagram usage data. |
| **R4: OAuth tokens expire during business hours** | Just-in-time refresh before every API call (not just daily cron). |
| **R5: AI generates inaccurate property claims** | Cross-reference generated content against DB. Price/beds/baths must match exactly. Quality pipeline blocks low-scoring content. |
| **R7: AI cost overruns in auto-pilot mode** | Hard monthly limits per tier. Track costs. Alert at 80%. Auto-pause at 100%. |
| **R10: Storage costs scale with adoption** | Use Cloudflare R2 (no egress fees). WebP compression. 90-day retention for drafts. |
| **R11: Low adoption due to OAuth friction** | Design <60s connection flow. Video guides. Clipboard fallback if OAuth fails. |
| **R12: Free tier cannibalization** | Free tier = content generation only (no direct publishing). Must copy-paste. |
| **R13: Canva competition** | Position on CRM integration + auto-triggers + attribution. Not "better Canva." |
| **R14: RECBC advertising compliance** | Brand kit requires brokerage name. Templates include mandatory attribution. |

### Green Risks (Low likelihood or impact)

| Risk | Mitigation |
|------|-----------|
| **R2: Platform API deprecation** | Adapter pattern isolates changes to one file per platform. |
| **R6: Voice learning inconsistency email vs social** | Separate namespaces: `voice_rules.email` and `voice_rules.social`. |
| **R9: Publishing cron Vercel cost** | Edge runtime + early-exit if no posts due. |
| **R15: PIPEDA for social analytics** | Only track aggregate data. No individual follower profiles imported. |

---

## 4. Sprint Plan (13 Sprints, 26 Weeks)

### Immediate Action Items (Before Sprint 1)
- [ ] Apply for Meta App Review (Instagram + Facebook publishing permissions)
- [ ] Apply for TikTok Content Posting API access
- [ ] Apply for LinkedIn Marketing Developer Platform
- [ ] Apply for Pinterest API access
- [ ] Set up Supabase Storage bucket for social media assets
- [ ] Decide on image composition approach: Sharp vs Bannerbear vs Puppeteer

---

### Phase 0: Foundation (Sprints 1-2, Weeks 1-4)

#### Sprint 1: Scaffold + Database + Brand Kit (2 weeks)
**Goal:** Standalone app scaffold, data layer, brand configuration

**Create (realtors360-social/):**
- `realtors360-social/package.json` — Own deps (next, react, tailwindcss, @anthropic-ai/sdk, sharp, zod)
- `realtors360-social/next.config.ts` — Standalone Next.js config
- `realtors360-social/tailwind.config.ts` — Reuse LF design system variables
- `realtors360-social/tsconfig.json` — TypeScript config with `@/` alias
- `realtors360-social/src/app/layout.tsx` — Root layout with LF design system
- `realtors360-social/src/app/globals.css` — Import LF design tokens
- `realtors360-social/src/lib/supabase/client.ts` — Supabase client (shared instance)
- `realtors360-social/src/lib/supabase/admin.ts` — Admin client
- `realtors360-social/src/lib/types.ts` — All social TypeScript types
- `realtors360-social/src/lib/crypto.ts` — AES-256-GCM token encryption
- `realtors360-social/src/lib/crm-bridge.ts` — API client to call CRM bridge endpoints
- `realtors360-social/src/actions/brand-kit.ts` — Brand kit CRUD
- `realtors360-social/src/app/(dashboard)/settings/page.tsx` — Brand kit page
- `realtors360-social/src/components/BrandKitEditor.tsx` — Logo, colours, fonts, voice
- `realtors360-social/.env.example` — Required env vars

**Create (realestate-crm/ — bridge only):**
- `realestate-crm/src/app/api/social-bridge/listings/route.ts` — Active listings API
- `realestate-crm/src/app/api/social-bridge/agent-profile/route.ts` — Agent profile API
- `realestate-crm/src/app/api/social-bridge/testimonials/route.ts` — Testimonials API
- `realestate-crm/src/app/api/social-bridge/market-data/route.ts` — Market stats API

**Create (shared DB):**
- `realestate-crm/supabase/migrations/058_social_media_studio.sql` — 7 tables (social_brand_kits, social_accounts, social_posts, social_post_publishes, social_templates, social_analytics_daily, social_hashtag_performance)

**Modify (realestate-crm/):**
- `src/middleware.ts` — Exempt `/api/social-bridge/*`
- `src/components/layout/AppHeader.tsx` — Add "Social" nav item linking to social app

**Acceptance Criteria:**
- [ ] `realtors360-social/` scaffolded, `npm run dev` starts on port 3002
- [ ] Brand kit create/read/update works
- [ ] Logo + headshot upload to Supabase Storage
- [ ] Colour picker, font selector, voice tone functional
- [ ] CRM bridge endpoints return data with API key auth
- [ ] Token encryption utility tested
- [ ] Migration runs cleanly with all indexes
- [ ] `.claude/launch.json` updated with social dev server

---

#### Sprint 2: AI Content Generation (2 weeks)
**Goal:** Generate social captions from listing data via CRM bridge

**Create (realtors360-social/):**
- `src/lib/content-generator.ts` — Claude-based generation (port pattern from CRM's `creative-director.ts`)
- `src/lib/content-scorer.ts` — Quality scoring for social (0-100, Claude Haiku)
- `src/lib/voice-learning.ts` — Voice rule extraction from caption edits
- `src/actions/social-content.ts` — Content CRUD, generation, approval
- `src/app/(dashboard)/page.tsx` — Social dashboard home
- `src/app/(dashboard)/studio/page.tsx` — Content creation studio
- `src/components/ContentCard.tsx` — Post preview card
- `src/components/ContentEditor.tsx` — Caption editor (text-only)
- `src/components/ContentScore.tsx` — Quality score badge

**Acceptance Criteria:**
- [ ] Fetches listings via CRM bridge API
- [ ] Given listing ID → generates 5 platform-specific captions via Claude
- [ ] Captions respect brand kit voice tone
- [ ] Content scores generated (Claude Haiku)
- [ ] Drafts saved to `social_posts` table
- [ ] Agent can edit captions, changes saved
- [ ] AI cost tracked per generation in `social_usage_tracking`

---

### Phase 1: Calendar + Approval (Sprints 3-4, Weeks 5-8)

#### Sprint 3: Calendar + Approval Queue (2 weeks)
**Goal:** Visual calendar and batch approval

**Create:**
- `src/components/social/ContentCalendar.tsx` — Week/list view (defer drag-and-drop)
- `src/components/social/ApprovalQueue.tsx` — Batch review (reuse `AIAgentQueue` pattern)
- `src/components/social/PlatformPreview.tsx` — Mock platform frames
- `src/actions/social-schedule.ts` — Schedule, reschedule, cancel
- `src/emails/WeeklyContentBrief.tsx` — React Email template

**Modify:**
- `vercel.json` — Add `social-weekly-brief` cron

**Acceptance Criteria:**
- [ ] Calendar shows drafts + scheduled posts in week view
- [ ] Approve/edit/skip/regenerate from queue
- [ ] "Approve All" batch action works
- [ ] Platform previews show mock frames
- [ ] Weekly email brief sent

---

#### Sprint 4: Templates + Content Triggers (2 weeks)
**Goal:** Template library and auto-generation on CRM events

**Create:**
- `src/components/social/TemplateGallery.tsx` — Category browser
- `src/app/(dashboard)/social/templates/page.tsx` — Templates page
- `src/lib/social/content-triggers.ts` — Event-driven generation
- `src/lib/social/template-renderer.ts` — Variable resolution
- `supabase/migrations/059_seed_social_templates.sql` — 30 caption templates

**Modify:**
- `src/lib/workflow-triggers.ts` — Add `social_content_trigger` event
- `src/actions/listings.ts` — Fire trigger on status changes

**Acceptance Criteria:**
- [ ] 30 templates browsable by 12 categories
- [ ] "Use Template" fills listing data + brand kit
- [ ] New listing → auto-generates 5 drafts
- [ ] Sold → "Just Sold" draft
- [ ] Price change → "Price Reduced" draft
- [ ] All triggered content goes to approval queue

**Beta gate:** Begin private beta with 5 agents (text-only generation + approval)

---

### Phase 2: Publishing (Sprints 5-7, Weeks 9-14)

#### Sprint 5: OAuth + Meta Publishing (2 weeks)
**Goal:** Connect Instagram/Facebook and publish

**Create:**
- `src/lib/social/oauth-manager.ts` — Unified OAuth with encryption + JIT refresh
- `src/lib/social/instagram-api.ts` — Meta Graph API wrapper
- `src/lib/social/facebook-api.ts` — Facebook Pages wrapper
- `src/lib/social/platform-publisher.ts` — Adapter pattern for all platforms
- `src/lib/social/publish-queue.ts` — Queue with retry + backoff + rate tracking
- `src/app/api/social/oauth/callback/route.ts` — OAuth callback
- `src/app/api/social/publish/route.ts` — Publish endpoint
- `src/app/api/cron/social-publish/route.ts` — 5-min publishing cron
- `src/app/api/cron/social-token-refresh/route.ts` — Token refresh cron
- `src/components/social/AccountConnector.tsx` — Connection UI

**Fallback:** If Meta review pending → clipboard mode (copy caption + download image)

**Acceptance Criteria:**
- [ ] Agent connects Instagram Business + Facebook Page
- [ ] Connection status: green/yellow/red
- [ ] Scheduled post publishes at correct time
- [ ] Failed publishes retry 3x with backoff
- [ ] Token auto-refreshes before expiry
- [ ] Published post URL shown in CRM

---

#### Sprint 6: Image Composition + Carousels (2 weeks)
**Goal:** Server-side branded image generation

**Create:**
- `src/lib/social/image-generator.ts` — Sharp-based composition (text overlay, logos, brand colours)
- `src/lib/social/carousel-builder.ts` — 5-slide Instagram carousel generation
- `src/app/api/social/render/route.ts` — Image render endpoint
- `src/lib/social/templates/` — Template layout definitions (JSON schemas)

**Acceptance Criteria:**
- [ ] Branded carousel: hero + price overlay, features, CTA with agent photo
- [ ] 1080x1080 images with correct brand kit styling
- [ ] Stored in Supabase Storage
- [ ] Carousel publishes to Instagram end-to-end

---

#### Sprint 7: TikTok + YouTube + LinkedIn (2 weeks)
**Goal:** Expand publishing to 3 more platforms

**Create:**
- `src/lib/social/tiktok-api.ts` — TikTok Content Posting API
- `src/lib/social/youtube-api.ts` — YouTube Data API v3
- `src/lib/social/linkedin-api.ts` — LinkedIn Marketing API
- `src/app/api/social/webhooks/[platform]/route.ts` — Platform callback handlers

**Modify:**
- `src/lib/social/platform-publisher.ts` — Register new adapters
- `src/components/social/AccountConnector.tsx` — Add 3 platforms

**Acceptance Criteria:**
- [ ] Connect TikTok, YouTube, LinkedIn accounts
- [ ] Video publishes to TikTok
- [ ] Shorts publish to YouTube
- [ ] Text + image publish to LinkedIn
- [ ] Platform-specific caption/hashtag variants respected

**If API approvals pending:** Gray out with "Coming Soon" badge

---

### Phase 3: Video Studio (Sprints 8-9, Weeks 15-18)

#### Sprint 8: Video Generation (2 weeks)
**Goal:** Listing photos → cinematic video via Kling AI

**Create:**
- `src/lib/social/video-generator.ts` — Extended Kling pipeline
- `src/app/(dashboard)/social/video/page.tsx` — Video studio page
- `src/components/social/VideoStudio.tsx` — Upload, preview, controls
- `src/app/api/social/video/route.ts` — Video generation API

**Acceptance Criteria:**
- [ ] Upload 5-20 photos or pull from listing
- [ ] Generate 15s/30s/60s video via Kling
- [ ] Video preview in CRM
- [ ] Regenerate with different prompt
- [ ] Output: 9:16, 16:9, 1:1 variants

---

#### Sprint 9: Captions + Resize + Music (2 weeks)
**Goal:** Video post-processing pipeline

**Create:**
- `src/lib/social/video-processor.ts` — FFmpeg pipeline (separate service)
- Video worker Dockerfile (Railway/Fly.io deployment)
- `src/lib/social/music-library.ts` — Royalty-free tracks metadata

**Acceptance Criteria:**
- [ ] Auto-generated captions burned into video
- [ ] One video → 4 aspect ratio variants
- [ ] Music track selectable + overlaid
- [ ] Processing <3 min for 15s video
- [ ] Captions follow brand kit styling

---

### Phase 4: Intelligence (Sprints 10-11, Weeks 19-22)

#### Sprint 10: Analytics Dashboard (2 weeks)
**Create:**
- `src/lib/social/analytics-sync.ts` — Pull data from all platform APIs
- `src/app/api/cron/social-analytics-sync/route.ts` — 4-hour sync cron
- `src/app/(dashboard)/social/analytics/page.tsx` — Dashboard
- `src/components/social/AnalyticsDashboard.tsx` — Charts + stats
- `src/actions/social-analytics.ts` — Aggregation queries

**Acceptance Criteria:**
- [ ] Total posts, impressions, engagement, clicks, leads (30d)
- [ ] Platform breakdown chart
- [ ] Content type performance comparison
- [ ] Top 5 posts, best posting times heatmap
- [ ] Data refreshes every 4 hours

---

#### Sprint 11: Attribution + Hashtags (2 weeks)
**Create:**
- `src/lib/social/attribution-tracker.ts` — UTM generation + lead mapping
- `src/lib/social/hashtag-engine.ts` — AI hashtag suggestions with tracking
- `src/components/social/HashtagSuggester.tsx` — Hashtag panel

**Modify:**
- `src/actions/contacts.ts` — Capture UTM on lead creation
- `src/app/(dashboard)/contacts/[id]/page.tsx` — Show social attribution

**Acceptance Criteria:**
- [ ] Every post link includes UTM params
- [ ] Lead form captures UTM → stored on contact
- [ ] Contact shows "Source: Instagram — Just Listed (date)"
- [ ] Hashtags suggested in 3 tiers + banned tag detection
- [ ] Hashtag performance tracked

---

### Phase 5: Automation (Sprints 12-13, Weeks 23-26)

#### Sprint 12: Auto-Pilot + Expanded Triggers (2 weeks)
**Create:**
- `src/lib/social/trust-manager.ts` — Progressive trust (Manual → Review → Auto)
- `src/lib/social/auto-pilot.ts` — Guardrails (no names, quiet hours, brokerage)
- `src/app/api/cron/social-content-triggers/route.ts` — 15-min event checker

**Acceptance Criteria:**
- [ ] 3 trust levels functional
- [ ] Auto-pilot publishes with guardrails
- [ ] Emergency stop pauses all scheduled posts
- [ ] Weekly summary email in auto-pilot mode

---

#### Sprint 13: Learning + Recycling + A/B Testing (2 weeks)
**Create:**
- `src/lib/social/learning-engine.ts` — Weekly content analysis
- `src/lib/social/content-recycler.ts` — Evergreen reshare logic
- `src/lib/social/ab-testing.ts` — Caption variant testing

**Acceptance Criteria:**
- [ ] Weekly recommendations generated ("Post more neighbourhood content")
- [ ] Evergreen posts queued for reshare after 3+ months
- [ ] A/B test: 2 variants, auto-pick winner
- [ ] Monthly content report email

---

## 5. Cost Model

### AI Costs Per Agent Per Month

| Operation | Cost Per Call | Monthly Volume | Monthly Cost |
|-----------|-------------|----------------|-------------|
| Caption generation (Claude Sonnet) | ~$0.03 | 80 generations | $2.40 |
| Content scoring (Claude Haiku) | ~$0.0005 | 80 scores | $0.04 |
| Hashtag suggestions (Claude Haiku) | ~$0.001 | 20 suggestions | $0.02 |
| Voice learning (Claude Haiku) | ~$0.001 | 10 edits | $0.01 |
| Video generation (Kling AI) | ~$1.00 | 4 videos | $4.00 |
| **Total AI cost per agent** | | | **~$6.50/mo** |

### Infrastructure Costs

| Service | Monthly Cost | Scales With |
|---------|-------------|-------------|
| Supabase (DB + Storage) | $25 base | Storage volume |
| Cloudflare R2 (media) | ~$0.015/GB | Media files generated |
| Railway (video worker) | $5-20 | Video processing volume |
| Vercel (hosting + crons) | $20 base | API invocations |
| **Total infrastructure** | **~$70-85/mo** | |

### Margin Analysis

| Tier | Revenue/Agent | AI Cost/Agent | Infra Cost/Agent (at 100 agents) | Margin |
|------|-------------|--------------|--------------------------------|--------|
| Free (5 posts/wk) | $0 | ~$2/mo | ~$0.70 | -$2.70 |
| Social Pro ($29) | $29 | ~$5/mo | ~$0.70 | +$23.30 (80%) |
| Social Studio ($49) | $49 | ~$10/mo | ~$0.70 | +$38.30 (78%) |
| Team Studio ($99) | $99 | ~$25/mo | ~$2.00 | +$72.00 (73%) |

**Recommendation:** Free tier limit to 3 posts/week (not 5) to control losses. Require copy-paste (no direct publishing) to motivate upgrade.

---

## 6. Go-To-Market Plan

### Beta Program (Week 8-12)

**Selection:** 5-8 existing CRM users
- 3 BC agents (home market, compliance testing)
- 2 Ontario agents (volume market)
- 2 US agents (largest TAM)
- 1 UK agent (international validation)

**Requirements:** Active CRM user, posts 2x/week already, willing to do weekly 15-min check-in

**Track:**
- Posts generated/week, approval rate, edit rate
- Time-to-approve, connection success rate
- Feature requests, bugs, NPS

**Beta exit criteria:** 5+ agents generating 10+ posts/week, >50% first-draft approval rate, <2 critical bugs/week

### Launch Strategy (Week 14+)

**Positioning:** "The only social media tool built into your CRM."

**Key Messages:**
1. "New listing? Your Instagram post is already ready."
2. "One click from listing to 5-platform content."
3. "Know exactly which post brought you that client."
4. "Your AI learns YOUR voice, not generic templates."

**Channels:**
| Channel | Action | Timeline |
|---------|--------|----------|
| Existing users | Email + in-app banner | Week 14 |
| RE Facebook groups | Value-demo posts | Week 15-20 |
| YouTube | "Listing-to-post" demo video | Week 14 |
| RE influencer partnerships | 3-5 coaches/creators | Week 16-20 |
| ProductHunt | Launch for tech audience | Week 18 |
| Real estate conferences | Demo booth / presentation | Ongoing |

### Pricing Validation

| Test | Method | When |
|------|--------|------|
| Willingness to pay | Survey 20 beta agents | Week 10 |
| Tier boundaries | Track feature usage by tier | Week 12 |
| Price elasticity | A/B test: $29/$49 vs $39/$59 | Week 16 |
| Free → paid conversion | Monitor 5-post limit hits | Week 14+ |

### Success Metrics

| Timeframe | Metric | Target |
|-----------|--------|--------|
| **30 days** | CRM users activating Social | 25% |
| **30 days** | Posts/week per active user | 8 |
| **30 days** | First-draft approval rate | 60%+ |
| **30 days** | Time from draft to approval | <5 min |
| **60 days** | Paid tier conversion | 40% of active |
| **60 days** | Posts/week per paid user | 15 |
| **60 days** | Platforms connected per user | 3+ |
| **60 days** | Social leads attributed | 1+ per user |
| **90 days** | Agents on auto-pilot | 5+ |
| **90 days** | Total social leads attributed | 50+ |
| **90 days** | Monthly churn (paid) | <5% |
| **90 days** | NPS | 50+ |
| **90 days** | Revenue per social user | $35+/mo |

### Competitive Win Strategy

| Competitor | Their Weakness | Our Advantage | Win Message |
|-----------|---------------|--------------|-------------|
| Coffee & Contracts ($54/mo) | Generic templates, no CRM, no video | Auto-generate from listings, video, attribution | "We don't give you templates. We give you a content engine." |
| Canva + Later ($38+/mo) | Manual, no real estate data, no attribution | CRM-connected, auto-triggers, lead tracking | "Canva makes you a designer. We make you a marketer." |
| Buffer ($18-25/mo) | Scheduling only, no content creation | Full pipeline: create → schedule → publish → track | "Buffer posts what you make. We make what you need." |
| Breakthrough Broker ($15-20/mo) | Basic designs, no AI, no video | AI generation, video studio, voice learning | "They give you clip art. We give you intelligence." |

---

## 7. Architecture Diagram

```
CRM Events                    Agent Actions
   │                              │
   ├─ New Listing                 ├─ Manual Create
   ├─ Sold                        ├─ Use Template
   ├─ Price Change                ├─ Upload Photos
   ├─ Open House                  └─ Edit/Approve
   ├─ Testimonial
   └─ Deal Closed
         │                              │
         ▼                              ▼
   ┌──────────────────────────────────────┐
   │         Content Generator            │
   │  Claude AI + Brand Kit + Voice Rules │
   │  → 5 platform-specific captions      │
   │  → Content score (0-100)             │
   └──────────────┬───────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────┐
   │         Approval Queue               │
   │  Draft → Review → Approve/Edit/Skip  │
   │  (or Auto-Pilot if trust level 3)    │
   └──────────────┬───────────────────────┘
                  │
         ┌────────┼────────┐
         ▼        ▼        ▼
   ┌──────┐ ┌──────┐ ┌──────┐
   │Image │ │Video │ │Text  │
   │Sharp │ │Kling │ │Only  │
   │      │ │+FFmpeg│ │      │
   └──┬───┘ └──┬───┘ └──┬───┘
      │        │        │
      ▼        ▼        ▼
   ┌──────────────────────────────────────┐
   │       Publishing Queue               │
   │  Schedule → Rate Limit → Retry       │
   │  → Publish to 6 platforms            │
   └──────────────┬───────────────────────┘
                  │
   ┌──────┬──────┬──────┬──────┬──────┐
   │ IG   │ FB   │ TT   │ YT   │ LI   │
   │ Meta │ Meta │TikTok│Google│LinkedIn│
   └──┬───┘└──┬──┘└──┬──┘└──┬──┘└──┬───┘
      │       │      │      │      │
      ▼       ▼      ▼      ▼      ▼
   ┌──────────────────────────────────────┐
   │      Analytics Sync (4-hourly)       │
   │  Impressions, Engagement, Clicks     │
   │  → Lead Attribution (UTM → Contact)  │
   │  → Learning Engine (weekly)          │
   │  → Voice Learning (from edits)       │
   └──────────────────────────────────────┘
```

---

## 8. Critical Dependencies Timeline

```
Week 1 ──── Apply for Meta/TikTok/LinkedIn/Pinterest API access
             │
Week 4 ──── Sprint 2 complete (AI generation working)
             │
Week 8 ──── Sprint 4 complete (templates + triggers)
             │── BEGIN BETA (text-only, 5 agents)
             │
Week 10 ─── Meta App Review expected (earliest)
             │
Week 12 ─── Sprint 6 complete (image composition)
             │── EXPAND BETA (images + carousel)
             │
Week 14 ─── Sprint 7 complete (multi-platform)
             │── PUBLIC LAUNCH (if Meta approved)
             │── Fallback: clipboard mode launch
             │
Week 18 ─── Sprint 9 complete (video studio)
             │── FULL LAUNCH (all features)
             │
Week 22 ─── Sprint 11 complete (analytics + attribution)
             │
Week 26 ─── Sprint 13 complete (auto-pilot + learning)
             │── V1.0 COMPLETE
```

---

## 9. Decision Log

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| Image composition | Sharp, Puppeteer, Bannerbear, Placid | Sharp (primary), Bannerbear (fallback) | Sharp is free, runs in Node.js. Bannerbear if quality insufficient. |
| Video processing | Vercel serverless, Railway worker, Creatomate | Railway worker | Vercel can't run FFmpeg. Railway is cheapest self-hosted. Creatomate as managed fallback. |
| Publishing architecture | Direct API calls, Queue-based, Third-party (Ayrshare) | Queue-based with adapter pattern | Retry logic, rate limiting, and platform abstraction needed. |
| Free tier limit | 3 posts/wk, 5 posts/wk, unlimited with watermark | 3 posts/wk, no direct publishing | Controls AI costs, motivates upgrade, still demonstrates value. |
| Template system | HTML/CSS, SVG, Canvas API, Figma SDK | JSON schema + Sharp rendering | Simplest to implement, no external dependencies, good enough quality. |
| OAuth encryption | Supabase vault, AES-256-GCM, AWS KMS | AES-256-GCM (env key) | No external dependency. Key rotation via env var. Good enough for current scale. |

---

*Implementation Plan v1.0 — March 30, 2026*
*Based on PRD_Social_Media_Content_Studio.md + 200+ source market research*
