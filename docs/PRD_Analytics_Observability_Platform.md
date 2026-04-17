<!-- docs-audit: src/lib/analytics/**, src/app/layout.tsx, src/middleware.ts, src/instrumentation.ts, sentry.*.config.ts, src/lib/ai-agent/event-emitter.ts, src/lib/newsletter-events.ts, src/app/api/webhooks/resend/route.ts, realtors360-newsletter/src/lib/logger.ts -->
# PRD: Analytics & Observability Platform — Realtors360

**Author:** Claude (on behalf of Bigbear)
**Date:** 2026-04-12
**Priority:** P1
**Status:** Ready for Implementation
**Version:** 1.1 (reviewed 5x — factual accuracy, scope, technical, edge cases, polish)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Non-Goals](#3-non-goals)
4. [Current State Audit](#4-current-state-audit)
5. [Target Users & Personas](#5-target-users--personas)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Architecture](#8-architecture)
9. [Data Model](#9-data-model)
10. [Analytics Events Taxonomy](#10-analytics-events-taxonomy)
11. [Dashboard Specifications](#11-dashboard-specifications)
12. [Privacy, Compliance & Data Governance](#12-privacy-compliance--data-governance)
13. [Integration Points](#13-integration-points)
14. [Implementation Phases](#14-implementation-phases)
15. [Risk Assessment](#15-risk-assessment)
16. [Appendices](#16-appendices)

---

## 1. Problem Statement

### The Core Problem

Realtors360 is a multi-tenant SaaS platform serving BC realtors, but **we have no visibility into how users actually use the product, where they get stuck, or what drives retention.** The platform generates revenue, serves multiple clients, and runs critical AI agent infrastructure (newsletter service, RAG, voice agent) — yet business and engineering decisions are made blind.

### What We Cannot Answer Today

**Product Questions (Zero Visibility):**
- Which features do realtors actually use? Which are shelfware?
- Where do users drop off in the 8-phase listing workflow?
- What is our activation rate (signup → first listing created)?
- What is our retention curve? DAU/WAU/MAU ratios?
- Which pages take too long to load? Where do users rage-click?
- Does the Cmd+K command palette get used, or was it wasted effort?
- How long does it take a new realtor to create their first contact?

**Business Questions (Partially Visible):**
- What is our MRR by plan tier? (We have plans but no Stripe — no real tracking)
- Which email types drive the most showing bookings? (Resend tracks clicks, but no conversion attribution)
- What is our cost-per-AI-call? (agent_runs has estimated_cost_usd but no dashboard)
- Are cron jobs running reliably? (Console logs only — invisible unless SSH'd in)
- How many API errors are users hitting? (Sentry captures, but no product-level alerting)

**Engineering Questions (Fragmented):**
- What is our p95 API latency? (No tracking)
- Are Supabase queries degrading? (No monitoring)
- How much does each Claude API call cost? (Partial — agent_runs only, not CRM-side calls)
- Which crons are slow? Which are failing silently? (Console.error only)
- What is our error rate by endpoint? (Sentry aggregates, but no per-route dashboard)

### Why This Matters Now

1. **Multi-tenancy is live** — we need per-tenant usage metrics to justify pricing tiers
2. **AI costs are growing** — Claude, Voyage, Kling API calls need cost attribution per realtor
3. **Newsletter agent is autonomous** — 19 tools, 12 crons, live on Render — zero usage dashboard
4. **Feature bloat risk** — 12 competitive UX features shipped with no adoption data
5. **Investor/stakeholder readiness** — "How many active users?" should be a 2-second answer

### What Exists vs. What's Needed

| Capability | Current State | Target State |
|-----------|--------------|-------------|
| Error tracking | Sentry (production, 10% sample) | Sentry + custom alerting per severity |
| Email analytics | Resend webhooks → newsletter_events (strong) | Same + conversion attribution |
| Event tracking | 10+ DB tables (fragmented, server-only) | Unified event bus + client-side tracking |
| User behavior | Nothing | PostHog: funnels, retention, session replay |
| API monitoring | Console.error in catch blocks | Structured logging + latency percentiles |
| Business metrics | Manual Supabase queries | Real-time admin dashboard |
| AI cost tracking | agent_runs.estimated_cost_usd (partial) | Per-call, per-realtor, per-model attribution |
| Performance | Sentry traces (10% sample) | Web Vitals + Vercel Speed Insights |
| Cron monitoring | Console logs (invisible) | Execution dashboard with alerting |
| Compliance audit | 5 audit tables (sparse usage) | Immutable append-only audit trail |

---

## 2. Goals & Success Metrics

| # | Goal | Success Metric | Timeline |
|---|------|---------------|----------|
| G1 | **Product usage visibility** — know which features are used, by whom, and how often | Can answer "what % of realtors used [feature] this week" in <5 seconds | Phase 1 |
| G2 | **User journey tracking** — understand activation, engagement, retention, churn | Funnel from signup → first listing → first email sent → retained at 30d visible | Phase 1 |
| G3 | **Business metrics dashboard** — MRR, plan distribution, feature adoption, AI costs | Admin dashboard shows real-time business KPIs | Phase 2 |
| G4 | **Engineering observability** — API latency, error rates, cron health, DB performance | p50/p95/p99 latency per endpoint visible; alert on degradation | Phase 2 |
| G5 | **AI cost attribution** — per-realtor, per-model, per-feature cost tracking | Can answer "how much does the newsletter agent cost per realtor per month" | Phase 2 |
| G6 | **Conversion attribution** — email → showing → deal closed pipeline | Can attribute revenue to specific email campaigns | Phase 3 |
| G7 | **Self-improving product** — data-driven feature prioritization | Ship/kill/invest decisions backed by adoption data | Phase 3 |

---

## 3. Non-Goals

| # | Non-Goal | Rationale |
|---|----------|-----------|
| NG1 | Replace Sentry with a custom error tracking solution | Sentry is working well — enhance it, don't replace it |
| NG2 | Build a custom analytics platform from scratch | Use PostHog (self-hostable, generous free tier, one SDK) |
| NG3 | Real-time streaming analytics (sub-second) | Batch/near-real-time (seconds to minutes) is sufficient for a CRM |
| NG4 | External data warehouse (BigQuery, Snowflake) | Supabase PostgreSQL handles our scale; revisit at 1000+ tenants |
| NG5 | Marketing attribution for external campaigns (Google Ads, Facebook) | Focus on internal product analytics first |
| NG6 | Replace the existing newsletter_events / agent_events system | These work — integrate them into the unified view |
| NG7 | HIPAA or SOC2 compliance | Not required for BC real estate — PIPEDA and CASL are our compliance targets |

---

## 4. Current State Audit

### 4.1 Error Tracking — Sentry (Production Only)

| Component | File | Configuration |
|-----------|------|--------------|
| Client SDK | `sentry.client.config.ts` | DSN: `NEXT_PUBLIC_SENTRY_DSN`, 10% traces, 100% replay on error |
| Server SDK | `sentry.server.config.ts` | DSN: `SENTRY_DSN`, 10% traces |
| Edge SDK | `sentry.edge.config.ts` | DSN: `SENTRY_DSN`, 10% traces |
| Instrumentation | `src/instrumentation.ts` | `onRequestError` hook captures unhandled exceptions with route context |
| Global boundary | `src/app/global-error.tsx` | Captures React errors → `Sentry.captureException()` |
| Dashboard boundary | `src/app/(dashboard)/error.tsx` | **BUG: Logs to console only — does NOT send to Sentry** |
| Newsletter service | `realtors360-newsletter/src/lib/sentry.ts` | Optional DSN, wraps `captureException()` with scope context |

**Gaps:**
- Dashboard error boundary silently swallows errors (never reaches Sentry)
- No unhandled promise rejection handler (`process.on('unhandledRejection')`)
- No user/tenant context enrichment on Sentry events
- Disabled entirely in development — errors during dev are invisible to Sentry

### 4.2 Server-Side Logging

| Service | Technology | Quality |
|---------|-----------|---------|
| CRM (Vercel) | `console.log` / `console.error` (50+ files) | Ad-hoc, unstructured, no correlation IDs |
| Newsletter (Render) | Pino v9.5.0 (JSON in prod, pretty in dev) | Structured, service-tagged, log-level configurable |

**Gaps:**
- CRM has no structured logging library — Pino exists in newsletter service but not in the main app
- No request correlation IDs / trace IDs propagated across services
- No log aggregation service — logs are ephemeral in Vercel's function logs (72h retention)
- No performance timing in logs — API response times not recorded

### 4.3 Database Event Tables (10+ Tables)

| Table | Purpose | Insert Points | Migration |
|-------|---------|--------------|-----------|
| `activity_log` | Generic CRM activity | 11 files (sparse) | 014 |
| `agent_events` | AI agent event pipeline (18 types) | event-emitter.ts, Resend webhook | 041 |
| `newsletter_events` | Email engagement (opens, clicks, bounces) | Resend webhook handler | 016 |
| `email_events` | Event queue for newsletter service | newsletter-events.ts | 074 |
| `agent_runs` | Agent execution + cost tracking | Newsletter service orchestrator | 087/089 |
| `agent_decisions` | Per-decision audit trail | Newsletter service tools | 087 |
| `site_analytics_events` | Website visitor tracking | Website integration SDK | 055 |
| `site_sessions` / `site_session_recordings` | Website session replay | Website integration SDK | 055 |
| `trust_audit_log` | Trust score changes | Trust engine | 044 |
| `rag_audit_log` | RAG system usage (PII-redacted) | RAG API routes | 055 |
| `tenant_audit_log` | API key lifecycle | Voice agent keys endpoint | 061 |
| `social_audit_log` | Social content publishing | Social module | 058 |
| `ab_test_tracking` | A/B variant outcomes | Newsletter service | 091 |

**Gaps:**
- `activity_log` is used sporadically (11 locations) — most CRM mutations are NOT logged
- No unified event schema — each table has different columns and semantics
- No data retention policy — tables grow indefinitely
- No change audit (before/after snapshots) — only inserts, not update tracking
- No client-side events captured — all tracking is server-side

### 4.4 Email Analytics (Strongest Area)

| Capability | Status | Location |
|-----------|--------|----------|
| Delivery tracking | Active | Resend webhook → `newsletter_events` |
| Open tracking | Active | Resend webhook, deduplication (60s window) |
| Click classification | Active | 11 categories, score impact 5-30 points |
| Bounce/complaint handling | Active | Auto-unsubscribe on bounce/complaint |
| Contact intelligence | Active | `contacts.newsletter_intelligence` JSONB — engagement score, click history, inferred interests |
| High-intent detection | Active | score_impact >= 30 → agent notification + communications log |
| Analytics dashboard | Active | `/newsletters/analytics` — 30-day view, per-email drill-down, contact engagement |

**Gaps:**
- No conversion attribution (email click → showing booked → deal closed)
- No aggregate deliverability monitoring (bounce rate trends, complaint rate SLOs)
- No A/B test statistical significance calculation
- No subscriber lifecycle analytics (new → engaged → dormant → churned)

### 4.5 Frontend Analytics

**Status: ZERO**

- No Google Analytics, PostHog, Mixpanel, Amplitude, Segment, or any analytics SDK
- No client-side event tracking (page views, clicks, form interactions)
- No funnel analysis, retention curves, or feature adoption metrics
- No session replay for UX debugging
- No Web Vitals collection (LCP, FID, CLS)
- No Vercel Analytics or Speed Insights

### 4.6 API & Performance Monitoring

| Capability | Status | Details |
|-----------|--------|---------|
| API error handling | Partial | `withErrorHandling()` in `src/lib/errors/api-handler.ts` — logs method + pathname on error |
| Request timing | None | No latency tracking per endpoint |
| Rate limiting | None | No rate limit tracking or logging |
| Web Vitals | None | No Core Web Vitals collection |
| DB query monitoring | None | No slow query tracking |
| Cron monitoring | Minimal | Console.error on failure, no timing, no success tracking, no dashboard |

### 4.7 AI Cost Tracking

| Capability | Status | Details |
|-----------|--------|---------|
| Agent run cost | Partial | `agent_runs.estimated_cost_usd` column (migration 089) |
| Voyage embeddings | Partial | `trackVoyageUsage()` in `src/lib/rag/embeddings.ts` ($0.05/1M tokens) |
| RAG session cost | Partial | Cost estimation per model tier in `src/lib/rag/feedback.ts` |
| CRM Claude calls | None | MLS remarks, content generation — no token/cost tracking |
| Kling API costs | None | Video/image generation — no cost tracking |
| Per-realtor attribution | None | No way to see "Realtor X costs us $Y/month in AI" |

---

## 5. Target Users & Personas

### 5.1 Platform Owner (Admin)

**Who:** Bigbear — builds, operates, and monetizes Realtors360
**Needs:**
- Business KPIs at a glance: MRR, active users, plan distribution, churn rate
- Feature adoption data to prioritize engineering effort
- AI cost tracking to understand unit economics per realtor
- System health monitoring without SSHing into servers
- Conversion funnels: signup → activation → retention → revenue

**Key questions this PRD must answer:**
- "Is the product growing?"
- "Which features justify their cost?"
- "Is any realtor's account broken?"
- "How much does each AI feature cost me?"

### 5.2 Individual Realtor (End User)

**Who:** Licensed BC realtors using the CRM daily
**Needs:**
- Personal analytics dashboard: my listings, my email performance, my showings
- Understand which of their emails are performing best
- See their lead engagement trends over time
- Know their response times (speed-to-lead metrics)

**Key questions:**
- "How are my emails performing?"
- "Which contacts are most engaged?"
- "How quickly am I responding to new leads?"

### 5.3 Engineering Team (Internal)

**Who:** Developers maintaining and extending the platform
**Needs:**
- Error rates and stack traces by route
- API latency percentiles (p50, p95, p99)
- Cron job execution dashboard
- Slow query identification
- Deploy impact analysis (error rate before/after)

**Key questions:**
- "Did that deploy break anything?"
- "Which endpoint is slowest?"
- "Are all crons running on schedule?"

---

## 6. Functional Requirements

### FR-1: Product Analytics (PostHog Integration)

**Priority: P0 — Phase 1**

#### FR-1.1: SDK Integration

| Requirement | Details |
|------------|---------|
| **FR-1.1.1** | Install `posthog-js` (client) and `posthog-node` (server) packages |
| **FR-1.1.2** | Create `PostHogProvider` in `src/app/layout.tsx` — initialized on mount, disabled in development unless `POSTHOG_DEV=true` |
| **FR-1.1.3** | Auto-capture page views on route change (Next.js App Router compatible) |
| **FR-1.1.4** | Identify users on login with `posthog.identify(hashedUserId, { plan, role, created_at, tenant_id: hashedRealtorId })` — **NO raw email or name** (see NFR-4.5). Use SHA-256 hash of userId as the distinct_id. Store plan and role as group properties for segmentation. |
| **FR-1.1.5** | Reset identity on logout with `posthog.reset()` |
| **FR-1.1.6** | Respect Do Not Track (DNT) browser setting |
| **FR-1.1.7** | Create `src/lib/analytics/posthog.ts` — typed wrapper with `trackEvent()`, `identifyUser()`, `setUserProperties()` |
| **FR-1.1.8** | Create `src/lib/analytics/server.ts` — server-side PostHog client for API routes and server actions |

#### FR-1.2: Automatic Page View Tracking

| Requirement | Details |
|------------|---------|
| **FR-1.2.1** | Track every client-side navigation with `$pageview` event |
| **FR-1.2.2** | Include properties: `path`, `referrer`, `viewport_width`, `viewport_height`, `is_mobile` |
| **FR-1.2.3** | Track time-on-page via `$pageleave` event |
| **FR-1.2.4** | Exclude admin routes from standard analytics (separate admin analytics group) |

#### FR-1.3: Feature Usage Tracking

Track explicit user actions at these critical points:

| Event Name | Trigger Point | Properties |
|-----------|--------------|------------|
| `listing_created` | `src/actions/listings.ts` → createListing() | property_type, status, has_seller |
| `listing_phase_advanced` | `src/actions/workflow.ts` → advancePhase() | listing_id, from_phase, to_phase |
| `contact_created` | `src/actions/contacts.ts` → createContact() | contact_type, source, has_email, has_phone |
| `contact_imported` | Contact import action | count, source_format |
| `showing_requested` | `src/actions/showings.ts` → createShowing() | listing_id, channel (sms/whatsapp) |
| `showing_confirmed` | Twilio webhook → YES response | listing_id, response_time_minutes |
| `showing_denied` | Twilio webhook → NO response | listing_id, reason |
| `email_composed` | Newsletter draft created | email_type, is_ai_generated, word_count |
| `email_sent` | Newsletter approved and sent | email_type, recipient_count, is_ab_test |
| `email_opened` | Resend webhook → opened | email_type, time_to_open_hours |
| `email_clicked` | Resend webhook → clicked | email_type, click_type, score_impact |
| `form_generated` | BCREA form generation | form_type (12 types), listing_id |
| `mls_remarks_generated` | Claude AI MLS remarks | word_count, listing_id |
| `content_created` | AI content engine | content_type (video_prompt/image_prompt/caption) |
| `calendar_event_created` | Google Calendar integration | event_type (showing/personal) |
| `cmd_k_opened` | CommandPalette opened | trigger (keyboard/click) |
| `cmd_k_selected` | CommandPalette item selected | item_type (contact/listing/page), search_query_length |
| `notification_clicked` | NotificationDropdown click | notification_type, time_since_created_minutes |
| `bulk_action_executed` | DataTable bulk action | action_type (email/delete/tag/export), selected_count |
| `contact_preview_opened` | ContactPreviewSheet opened | source (table/search/notification) |
| `workflow_step_executed` | Workflow engine step completed | step_type, workflow_id, is_automated |
| `rag_query` | RAG assistant query | query_length, result_count, duration_ms |
| `voice_call_started` | Voice agent call | tenant_id, duration_seconds |
| `website_generated` | Sites platform generation | variant_count, style_preset |
| `social_content_generated` | Social media content | platform, content_type |
| `document_uploaded` | Document management | doc_type, file_size_kb |
| `search_performed` | Any search (contacts, listings) | entity_type, query_length, result_count |
| `filter_applied` | DataTable filter change | filter_type, entity_type |
| `export_triggered` | Data export action | entity_type, format, row_count |
| `onboarding_completed` | 5-step wizard finished | steps_completed, duration_minutes |
| `personalization_completed` | 6-screen personalization done | persona, selected_features |
| `tour_step_completed` | Guided tour step | step_name, step_index, total_steps |
| `nps_submitted` | NPS survey after checklist | score (0-10), feedback_text_length |
| `sample_data_seeded` | Demo data created on signup | contacts_count, listings_count |
| `checklist_item_completed` | Onboarding checklist item | item_name, items_remaining |

#### FR-1.4: Session Recording

| Requirement | Details |
|------------|---------|
| **FR-1.4.1** | Enable PostHog session recording for 10% of sessions (configurable via env var) |
| **FR-1.4.2** | Record 100% of sessions where an error boundary triggers |
| **FR-1.4.3** | Mask sensitive fields: phone numbers, email addresses, financial amounts |
| **FR-1.4.4** | Do NOT record on `/login` page (credentials visible) |
| **FR-1.4.5** | Recordings retained for 30 days |

#### FR-1.5: Feature Flags (Future — Phase 3)

| Requirement | Details |
|------------|---------|
| **FR-1.5.1** | Migrate current `src/lib/features.ts` flags to PostHog feature flags |
| **FR-1.5.2** | Enable gradual rollout of new features by plan tier |
| **FR-1.5.3** | A/B test UI variants (e.g., new dashboard layout vs old) |
| **FR-1.5.4** | Evaluate flags server-side in middleware for gating entire routes |

---

### FR-2: Structured Logging (CRM Pino Integration)

**Priority: P0 — Phase 1**

#### FR-2.1: Logger Setup

| Requirement | Details |
|------------|---------|
| **FR-2.1.1** | Create `src/lib/logger.ts` — Pino instance matching newsletter service config |
| **FR-2.1.2** | Service name: `realtors360-crm` (distinct from `realtors360-newsletter`) |
| **FR-2.1.3** | Log level configurable via `LOG_LEVEL` env var (default: `info` in prod, `debug` in dev) |
| **FR-2.1.4** | Pretty-print in development via `pino-pretty` |
| **FR-2.1.5** | JSON output in production (structured, machine-parseable) |
| **FR-2.1.6** | Include `traceId` (generated per request) in all log entries |
| **FR-2.1.7** | Include `realtorId` from session in all log entries (when available) |

#### FR-2.2: Request Logging (API Route Wrapper)

> **Note:** Next.js middleware runs on the Edge runtime, which Pino does not support. Instead of middleware-based logging, use a **higher-order function wrapper** (`withLogging()`) applied to each API route handler. This matches the existing `withErrorHandling()` pattern in `src/lib/errors/api-handler.ts`.

| Requirement | Details |
|------------|---------|
| **FR-2.2.1** | Create `withLogging(handler)` wrapper that logs: `method`, `path`, `status`, `duration_ms`, `realtor_id` |
| **FR-2.2.2** | Log at `info` level for 2xx, `warn` for 4xx, `error` for 5xx |
| **FR-2.2.3** | Do NOT log request/response bodies (privacy) — only metadata |
| **FR-2.2.4** | Generate `traceId` per request (UUID v4), include in all log entries. Pass `x-trace-id` header on outbound calls to newsletter service. |
| **FR-2.2.5** | Exclude health check endpoints (`/api/health`) from access logs |
| **FR-2.2.6** | Compose with existing `withErrorHandling()`: `export const GET = withLogging(withErrorHandling(handler))` |

#### FR-2.3: Migration Plan

| Requirement | Details |
|------------|---------|
| **FR-2.3.1** | Replace all `console.log` / `console.error` in `src/app/api/**` with `logger.info()` / `logger.error()` |
| **FR-2.3.2** | Replace all `console.log` / `console.error` in `src/actions/**` with structured logger calls |
| **FR-2.3.3** | Replace all `console.log` / `console.error` in `src/lib/**` with structured logger calls |
| **FR-2.3.4** | Maintain backward compatibility — no behavioral changes, only logging format change |
| **FR-2.3.5** | Lint rule: `no-console` ESLint rule (warn) to prevent future console.log usage |

---

### FR-3: Performance Monitoring

**Priority: P1 — Phase 1**

#### FR-3.1: Web Vitals

| Requirement | Details |
|------------|---------|
| **FR-3.1.1** | Collect Core Web Vitals: LCP, FID/INP, CLS |
| **FR-3.1.2** | Send Web Vitals to PostHog as `$web_vitals` event |
| **FR-3.1.3** | Also send to Sentry for correlation with error traces |
| **FR-3.1.4** | Track navigation type (hard load vs. client-side transition) |

#### FR-3.2: Vercel Speed Insights

| Requirement | Details |
|------------|---------|
| **FR-3.2.1** | Install `@vercel/speed-insights` package |
| **FR-3.2.2** | Add `<SpeedInsights />` component to root layout |
| **FR-3.2.3** | Enable route-level performance breakdown in Vercel dashboard |

#### FR-3.3: API Latency Tracking

| Requirement | Details |
|------------|---------|
| **FR-3.3.1** | Record `duration_ms` for every API route handler (via request logging middleware from FR-2.2) |
| **FR-3.3.2** | Record `duration_ms` for every server action invocation |
| **FR-3.3.3** | ~~Record `duration_ms` for every Supabase query~~ **Deferred to Phase 3** — wrapping every Supabase call is too invasive. Instead, log slow queries via Supabase's built-in `pg_stat_statements` (query from admin dashboard). |
| **FR-3.3.4** | Record `duration_ms` for every external API call (Claude, Twilio, Resend, Google Calendar, Kling) — wrap each client library's call function |
| **FR-3.3.5** | Log warning when any single operation exceeds 5s |
| **FR-3.3.6** | Log error when any single operation exceeds 10s (Vercel function timeout approaching) |

---

### FR-4: Business Metrics Dashboard

**Priority: P1 — Phase 2**

#### FR-4.1: Admin Analytics Page

| Requirement | Details |
|------------|---------|
| **FR-4.1.1** | New admin page at `/admin/analytics` — accessible only to `role=admin` users |
| **FR-4.1.2** | Time range selector: 7d / 30d / 90d / custom |
| **FR-4.1.3** | Auto-refresh every 60 seconds (configurable) |

#### FR-4.2: KPI Cards (Top Row)

| Metric | Source | Calculation |
|--------|--------|------------|
| **Active Users (DAU/WAU/MAU)** | PostHog | Distinct users with any event in period |
| **MRR** | `users` table (plan + is_active) | Sum of plan prices for active users |
| **Plan Distribution** | `users` table | Count per plan tier (pie chart) |
| **Trial Conversion Rate** | `users` table (trial_start, plan changes) | Trials that converted / total trials in period |
| **AI Cost (Total)** | `agent_runs` + new cost tracking | Sum of estimated_cost_usd in period |
| **Email Volume** | `newsletters` table | Emails sent in period |
| **Error Rate** | Sentry API or local tracking | Errors / total requests in period |
| **Avg. Response Time** | Request logging (FR-2.2) | Mean API latency in period |

#### FR-4.3: Feature Adoption Table

| Column | Source |
|--------|--------|
| Feature Name | Hardcoded list of 20+ features |
| Users (% of active) | PostHog: distinct users with feature events / total active |
| Events (total) | PostHog: count of feature events in period |
| Trend (7d sparkline) | PostHog: daily event counts |
| Last Used | PostHog: max timestamp for feature event |

#### FR-4.4: User Lifecycle Funnel

| Stage | Definition | Source |
|-------|-----------|--------|
| Signed Up | User record created | `users.created_at` |
| Onboarded | Completed onboarding wizard + personalization | PostHog `onboarding_completed` + `personalization_completed` |
| Activated | First listing OR first contact created (excluding sample data) | PostHog `listing_created` / `contact_created` where `is_sample != true` |
| Engaged | 3+ sessions in first 7 days | PostHog session count |
| Retained (30d) | Active in day 25-30 after signup | PostHog activity |
| Paying | Plan != 'free' | `users.plan` |

> **Note:** "Churned" is not a funnel stage (funnels are progressive). Churn is tracked as a **separate cohort metric** in the retention curve, defined as: no activity in 30+ days after previously being Engaged.

#### FR-4.5: AI Cost Breakdown

| Dimension | Metrics |
|-----------|---------|
| By Realtor | Total cost, avg cost/month, cost trend |
| By Model | Claude Sonnet, Claude Haiku, Voyage embeddings, Kling |
| By Feature | Newsletter agent, MLS remarks, RAG chat, content engine, voice agent |
| By Time | Daily cost chart with 30-day rolling average |

#### FR-4.6: Cron Job Health Dashboard

| Column | Source |
|--------|--------|
| Cron Name | 13 Vercel crons + 12 newsletter crons |
| Last Run | Timestamp of last execution |
| Status | Success / Failed / Overdue |
| Duration (avg) | Mean execution time over last 7 days |
| Failure Rate (7d) | Failed / total runs |
| Next Scheduled | Based on cron expression |

**Implementation:** New `cron_execution_log` table — each cron endpoint inserts a row at start and updates with status + duration at completion.

---

### FR-5: Realtor-Facing Analytics

**Priority: P2 — Phase 2**

#### FR-5.1: Personal Dashboard Widgets

| Widget | Metrics | Location |
|--------|---------|----------|
| **My Email Performance** | Open rate, click rate, best email type, engagement trend | Dashboard home |
| **My Response Time** | Average time from new lead → first contact | Dashboard home |
| **My Pipeline Health** | Listings by phase, days-in-phase, blocked items | Dashboard home |
| **My Contact Engagement** | Top 5 most engaged contacts, engagement score trend | Dashboard home |

#### FR-5.2: Email Analytics Enhancement

| Requirement | Details |
|------------|---------|
| **FR-5.2.1** | Add conversion tracking: email click → showing booked → deal closed |
| **FR-5.2.2** | Show subscriber lifecycle funnel: subscribed → engaged → dormant → churned |
| **FR-5.2.3** | Aggregate deliverability metrics: bounce rate %, complaint rate %, delivery rate % |
| **FR-5.2.4** | A/B test results with statistical significance indicator (chi-squared test) |
| **FR-5.2.5** | Best send time analysis based on open/click data per realtor |

---

### FR-6: Sentry Enhancement

**Priority: P0 — Phase 1**

| Requirement | Details |
|------------|---------|
| **FR-6.1** | Fix dashboard error boundary (`src/app/(dashboard)/error.tsx`) to call `Sentry.captureException(error)` |
| **FR-6.2** | Enrich all Sentry events with `realtor_id`, `plan`, `role` via `Sentry.setUser()` on login |
| **FR-6.3** | Add `Sentry.setTag("feature", featureName)` in feature entry points for error grouping |
| **FR-6.4** | Add custom Sentry breadcrumbs for CRM actions (listing created, email sent, etc.) |
| **FR-6.5** | Create Sentry alerts for: error rate spike (>5x baseline), new error type in production |
| **FR-6.6** | Link PostHog session recordings to Sentry error events via shared session ID |

---

### FR-7: Audit Trail Enhancement

**Priority: P2 — Phase 2**

| Requirement | Details |
|------------|---------|
| **FR-7.1** | Create unified `audit_log` table (append-only, no UPDATE/DELETE via RLS) |
| **FR-7.2** | Log all authentication events: login, logout, session refresh, failed login |
| **FR-7.3** | Log all data mutations: entity_type, entity_id, action (create/update/delete), changed_fields, before_snapshot, after_snapshot, realtor_id |
| **FR-7.4** | Log all admin actions: plan change, feature toggle, user activate/deactivate, impersonation |
| **FR-7.5** | Data retention: 365 days for audit log, auto-archive older records to cold storage |
| **FR-7.6** | Admin UI: searchable, filterable audit log viewer at `/admin/audit` |

---

### FR-8: Email Analytics → Business Attribution

**Priority: P2 — Phase 3**

| Requirement | Details |
|------------|---------|
| **FR-8.1** | Track attribution chain: email_sent → email_clicked → showing_booked → deal_closed. Use **last-touch attribution model** (the last email clicked before a showing is booked gets credit). Document this choice and revisit for multi-touch when data volume justifies it. |
| **FR-8.2** | Assign `attribution_id` (UUID) to each email send. Propagate via: click URL params → `appointments.attribution_id` → `listings.deal_attribution_id`. Each entity stores the last attribution_id that touched it. |
| **FR-8.3** | "Revenue attributed to email" metric on newsletter analytics dashboard |
| **FR-8.4** | Per-email-type ROI calculation: (revenue attributed / AI generation cost) |
| **FR-8.5** | "Best performing email type" ranking by attributed revenue |

---

## 7. Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target | Measurement |
|----|------------|--------|-------------|
| NFR-1.1 | Analytics SDK must not increase page load time (LCP) by more than 100ms | LCP delta < 100ms | Web Vitals before/after comparison |
| NFR-1.2 | Event tracking calls must be non-blocking (fire-and-forget) | Zero impact on user action latency | PostHog async queue |
| NFR-1.3 | Server-side logging must add <5ms per request | Pino overhead < 5ms | Benchmark in staging |
| NFR-1.4 | PostHog SDK bundle size must be <50KB gzip | <50KB gzip | Bundle analyzer |
| NFR-1.5 | Analytics database queries must not affect CRM query performance | No cross-join with analytics tables in CRM queries | Query plan review |
| NFR-1.6 | Session recording must not cause visible frame drops | No jank reported in Lighthouse | Lighthouse performance audit |
| NFR-1.7 | Admin dashboard must load in <3 seconds with 50 realtors | p95 load time < 3s | Load testing |

### NFR-2: Reliability

| ID | Requirement | Target | Measurement |
|----|------------|--------|-------------|
| NFR-2.1 | Analytics tracking failure must NEVER affect CRM functionality | Zero CRM errors caused by analytics | Error boundary isolation + try/catch |
| NFR-2.2 | Event loss rate must be <1% under normal conditions | >99% event delivery | PostHog event count vs expected |
| NFR-2.3 | PostHog client must queue events offline and replay on reconnect | Events survived during 30s offline period | Offline simulation test |
| NFR-2.4 | Server-side logger must never throw — all errors caught internally | Zero logger-caused 500s | Error monitoring |
| NFR-2.5 | Cron monitoring must detect missed executions within 2x the cron interval | Alert within 2x interval | Cron watchdog test |
| NFR-2.6 | Sentry must capture 100% of unhandled exceptions (not just 10%) | 100% error capture (trace sampling is separate) | Sentry error count audit |

### NFR-3: Scalability

| ID | Requirement | Target | Measurement |
|----|------------|--------|-------------|
| NFR-3.1 | Event tracking must handle 100 realtors generating 1000 events/day each | 100K events/day | PostHog free tier: 1M events/month |
| NFR-3.2 | `cron_execution_log` table must handle 25 crons x 365 days without performance degradation | ~9K rows/year | Partition by month if needed |
| NFR-3.3 | `audit_log` table must handle 500K rows/year without query degradation | p95 query < 200ms at 500K rows | Index on (realtor_id, created_at, entity_type) |
| NFR-3.4 | Analytics must not increase Supabase storage costs by more than 20% | <20% storage increase | Supabase dashboard monitoring |
| NFR-3.5 | PostHog usage must stay within free tier (1M events/mo, 5K recordings/mo) at current scale | Stay within free tier for first 12 months | Monthly usage review |

### NFR-4: Security

| ID | Requirement | Target |
|----|------------|--------|
| NFR-4.1 | PostHog API key must be `NEXT_PUBLIC_POSTHOG_KEY` (write-only, public) — no read access from client |
| NFR-4.2 | PostHog personal API key for server-side must be stored in env var `POSTHOG_PERSONAL_API_KEY` (never exposed to client) |
| NFR-4.3 | Session recordings must mask: password fields, credit card inputs, phone numbers in contact forms |
| NFR-4.4 | Audit log must be append-only — RLS policy: INSERT allowed, UPDATE/DELETE denied for all roles |
| NFR-4.5 | No PII in PostHog event properties — use SHA-256 hashed userId as distinct_id. Never send raw emails, names, phone numbers, or addresses. Plan and role are acceptable (non-PII metadata). |
| NFR-4.6 | PostHog data must be hosted in US or Canada (PIPEDA compliance) — use PostHog Cloud US region |
| NFR-4.7 | Analytics endpoints must require admin authentication — no public analytics access |
| NFR-4.8 | `x-trace-id` header must not leak internal information in client-facing responses |

### NFR-5: Privacy & Compliance

| ID | Requirement | Target |
|----|------------|--------|
| NFR-5.1 | Respect browser Do Not Track (DNT) setting — disable PostHog if DNT is enabled |
| NFR-5.2 | PIPEDA compliance: collect only what's necessary, purpose-limited, retain only as long as needed |
| NFR-5.3 | CASL alignment: analytics tracking of email engagement must align with existing CASL consent framework |
| NFR-5.4 | Data retention: 90 days for session recordings, 365 days for audit logs, 2 years for aggregate metrics |
| NFR-5.5 | Right to erasure: ability to delete all analytics data for a specific realtor on request |
| NFR-5.6 | Cookie consent: PostHog uses first-party cookies — document in privacy policy, no consent banner needed (legitimate interest under PIPEDA for B2B SaaS) |
| NFR-5.7 | No cross-tenant data leakage — all analytics queries scoped by realtor_id |

### NFR-6: Maintainability

| ID | Requirement | Target |
|----|------------|--------|
| NFR-6.1 | All analytics event names must follow snake_case convention (matching existing agent_events) |
| NFR-6.2 | Event taxonomy must be documented in `docs/ANALYTICS_EVENTS.md` with name, properties, trigger point |
| NFR-6.3 | PostHog wrapper must be typed — TypeScript interfaces for all event names and property shapes |
| NFR-6.4 | Adding a new tracked event must require only 1 line of code at the tracking point |
| NFR-6.5 | Analytics provider must be swappable — abstract behind `src/lib/analytics/` interface |
| NFR-6.6 | ESLint rule `no-console` (warn) must be added to prevent regression to console.log |

### NFR-7: Observability of Observability

| ID | Requirement | Target |
|----|------------|--------|
| NFR-7.1 | PostHog SDK initialization failure must be logged to Sentry |
| NFR-7.2 | Pino logger initialization failure must not crash the application — fall back to console |
| NFR-7.3 | Analytics pipeline health must be monitored: events emitted vs. events received in PostHog |
| NFR-7.4 | Dead letter queue for failed analytics events (retry 3x, then discard with Sentry alert) |

### NFR-8: Data Quality

| ID | Requirement | Target |
|----|------------|--------|
| NFR-8.1 | Events from sample/demo data must be excluded from analytics. All events triggered by entities with `is_sample = true` must include property `is_sample: true` and be filtered out of dashboards. |
| NFR-8.2 | Admin impersonation must track actions under the admin's identity with an `impersonating_realtor_id` property — never attribute admin actions to the realtor being impersonated. |
| NFR-8.3 | Server-side PostHog calls from high-volume paths (Resend webhooks) must use `posthog.capture()` with batch mode (flush every 30s or 50 events, whichever comes first) to avoid rate limiting. |
| NFR-8.4 | Onboarding flow events must be tracked as a separate funnel. NPS scores must be captured as a `$survey` event compatible with PostHog's built-in survey analysis. |

---

## 8. Architecture

### 8.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ PostHog SDK  │  │  Sentry SDK  │  │ Web Vitals Reporter│    │
│  │ (posthog-js) │  │ (@sentry/*)  │  │ (web-vitals)       │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘    │
│         │                 │                    │                │
│         │    ┌────────────┴────────────────────┘                │
│         │    │  Shared session ID for linking                   │
└─────────┼────┼──────────────────────────────────────────────────┘
          │    │
          ▼    ▼
┌─────────────────────┐  ┌──────────────┐  ┌──────────────────┐
│   PostHog Cloud     │  │ Sentry Cloud │  │ Vercel Speed     │
│   (US region)       │  │              │  │ Insights         │
│                     │  │              │  │                  │
│ - Events            │  │ - Errors     │  │ - Web Vitals     │
│ - Session replay    │  │ - Traces     │  │ - Route perf     │
│ - Funnels           │  │ - Replays    │  │                  │
│ - Feature flags     │  │              │  │                  │
└─────────────────────┘  └──────────────┘  └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Server (Vercel + Render)                    │
│                                                                 │
│  ┌─────────────────────────────────┐                            │
│  │       CRM (Next.js / Vercel)    │                            │
│  │                                 │                            │
│  │  ┌───────────┐ ┌─────────────┐  │                            │
│  │  │ Pino      │ │ PostHog     │  │                            │
│  │  │ Logger    │ │ (server)    │  │                            │
│  │  └─────┬─────┘ └──────┬──────┘  │                            │
│  │        │               │         │                            │
│  │  ┌─────▼───────────────▼──────┐  │                            │
│  │  │  Request Middleware        │  │                            │
│  │  │  (trace ID, latency, log) │  │                            │
│  │  └────────────────────────────┘  │                            │
│  └──────────────────────────────────┘                            │
│                                                                 │
│  ┌─────────────────────────────────┐                            │
│  │  Newsletter Agent (Render)      │                            │
│  │  (Already has Pino + Sentry)    │                            │
│  └─────────────────────────────────┘                            │
│                                                                 │
│         ┌──────────────────────────┐                            │
│         │   Supabase (PostgreSQL)  │                            │
│         │                          │                            │
│         │  Existing:               │                            │
│         │  - agent_events          │                            │
│         │  - newsletter_events     │                            │
│         │  - activity_log          │                            │
│         │  - agent_runs            │                            │
│         │  - 5x audit_log tables   │                            │
│         │                          │                            │
│         │  New:                    │                            │
│         │  - cron_execution_log    │                            │
│         │  - unified_audit_log     │                            │
│         │  - api_cost_tracking     │                            │
│         └──────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Data Flow

```
User Action (click, navigate, submit)
    │
    ├─→ PostHog SDK (client) ──→ PostHog Cloud (product analytics)
    │
    ├─→ Server Action / API Route
    │       │
    │       ├─→ Pino Logger (structured JSON log)
    │       │       └─→ Vercel Logs (72h) / Render Logs
    │       │
    │       ├─→ PostHog (server) ──→ PostHog Cloud (server-side events)
    │       │
    │       ├─→ Supabase (business data + existing event tables)
    │       │
    │       └─→ External API (Claude, Resend, Twilio, etc.)
    │               └─→ api_cost_tracking table (cost + duration)
    │
    └─→ Sentry SDK (errors only) ──→ Sentry Cloud
```

### 8.3 Event Pipeline (Existing → Enhanced)

```
                    EXISTING (keep as-is)
                    ─────────────────────
Resend Webhook ──→ newsletter_events (opens, clicks, bounces)
                   │
                   ├─→ contact.newsletter_intelligence (engagement score)
                   └─→ agent_events (high-intent clicks)

CRM Mutations ──→ activity_log (sparse — 11 insert points)
                   └─→ agent_events (via event-emitter.ts)

Newsletter Agent ──→ agent_runs + agent_decisions (cost + audit)


                    NEW (added by this PRD)
                    ───────────────────────
All User Actions ──→ PostHog Cloud (product analytics)
                     ├─→ Funnels, retention, feature adoption
                     ├─→ Session recordings
                     └─→ Admin dashboard data source

All API Requests ──→ Pino Logger (structured logs)
                     └─→ Request timing, error context, trace IDs

All AI API Calls ──→ api_cost_tracking table
                     └─→ Per-realtor, per-model, per-feature cost

All Cron Runs ──→ cron_execution_log table
                   └─→ Duration, status, error details

All Data Mutations ──→ unified_audit_log table
                       └─→ Append-only, before/after snapshots
```

---

## 9. Data Model

### 9.1 New Tables

#### `cron_execution_log`

```sql
CREATE TABLE cron_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name TEXT NOT NULL,              -- e.g., 'process-workflows', 'daily-digest'
  service TEXT NOT NULL DEFAULT 'crm',  -- 'crm' or 'newsletter'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- running, success, failed, timeout
  duration_ms INTEGER,
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cron_exec_name_started ON cron_execution_log(cron_name, started_at DESC);
CREATE INDEX idx_cron_exec_status ON cron_execution_log(status) WHERE status != 'success';
```

#### `unified_audit_log`

```sql
CREATE TABLE unified_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID REFERENCES users(id),  -- nullable: system events (cron, auth failures) may not have a user
  actor_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'system', 'admin', 'cron'
  entity_type TEXT NOT NULL,             -- 'contact', 'listing', 'newsletter', 'user', 'session', etc.
  entity_id UUID,
  action TEXT NOT NULL,                  -- 'create', 'update', 'delete', 'login', 'logout', 'admin_action'
  changed_fields TEXT[],                 -- ['status', 'list_price'] for updates
  before_snapshot JSONB,                 -- Previous state (for updates/deletes)
  after_snapshot JSONB,                  -- New state (for creates/updates)
  ip_address INET,
  user_agent TEXT,
  trace_id TEXT,                         -- Correlation with Pino logs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only enforcement via TRIGGER (RLS alone doesn't block admin client)
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is append-only. UPDATE and DELETE are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON unified_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- RLS for authenticated reads
ALTER TABLE unified_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_insert ON unified_audit_log FOR INSERT WITH CHECK (true);
CREATE POLICY audit_read_admin ON unified_audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE INDEX idx_audit_realtor_time ON unified_audit_log(realtor_id, created_at DESC);
CREATE INDEX idx_audit_entity ON unified_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON unified_audit_log(action, created_at DESC);
```

#### `api_cost_tracking`

```sql
CREATE TABLE api_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID REFERENCES users(id),
  service TEXT NOT NULL,                -- 'anthropic', 'resend', 'twilio', 'kling', 'voyage', 'google'
  model TEXT,                           -- 'claude-sonnet-4-6', 'voyage-3', etc.
  feature TEXT NOT NULL,                -- 'mls_remarks', 'newsletter_agent', 'rag_chat', 'content_engine', etc.
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd NUMERIC(10,6),
  duration_ms INTEGER,
  request_metadata JSONB DEFAULT '{}'::jsonb, -- Non-PII request context
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_realtor_time ON api_cost_tracking(realtor_id, created_at DESC);
CREATE INDEX idx_cost_service ON api_cost_tracking(service, created_at DESC);
CREATE INDEX idx_cost_feature ON api_cost_tracking(feature, created_at DESC);
```

### 9.2 Existing Tables — No Changes Required

These tables remain as-is. PostHog handles product analytics. The existing event tables continue serving their current roles:

| Table | Continues Serving |
|-------|------------------|
| `newsletter_events` | Email engagement analytics (Resend webhooks) |
| `agent_events` | AI agent event pipeline (18 event types) |
| `activity_log` | CRM activity tracking (gradually increase coverage) |
| `agent_runs` + `agent_decisions` | Newsletter agent audit trail |
| `ab_test_tracking` | A/B test variant outcomes |
| `trust_audit_log`, `rag_audit_log`, etc. | Domain-specific audit trails |

---

## 10. Analytics Events Taxonomy

### 10.1 Naming Convention

```
{entity}_{action}

Examples:
  listing_created
  contact_imported
  email_sent
  showing_confirmed
  cmd_k_opened
```

Rules:
- All `snake_case`
- Entity first, then past-tense action verb
- Matches existing `agent_events.event_type` convention
- Properties are always an object with typed keys

### 10.2 Event Categories

| Category | Events | Priority |
|----------|--------|----------|
| **Listings** | listing_created, listing_updated, listing_phase_advanced, listing_sold, listing_expired, listing_withdrawn | P0 |
| **Contacts** | contact_created, contact_updated, contact_imported, contact_deleted, contact_merged | P0 |
| **Showings** | showing_requested, showing_confirmed, showing_denied, showing_completed, showing_feedback_received | P0 |
| **Email** | email_composed, email_sent, email_opened, email_clicked, email_bounced, email_unsubscribed | P0 (server-side, already tracked — add PostHog mirror) |
| **Communication** | sms_sent, whatsapp_sent, email_1to1_sent, note_added | P1 |
| **Workflow** | workflow_step_executed, workflow_phase_advanced, form_generated, form_signed | P1 |
| **Content** | mls_remarks_generated, content_prompt_created, media_generated | P1 |
| **Calendar** | calendar_event_created, calendar_synced | P2 |
| **UX** | cmd_k_opened, cmd_k_selected, notification_clicked, bulk_action_executed, contact_preview_opened, search_performed, filter_applied, export_triggered | P0 |
| **Navigation** | page_viewed (auto-captured), tab_changed, sidebar_clicked | Auto (PostHog) |
| **RAG** | rag_query, rag_result_clicked, rag_feedback_submitted | P2 |
| **Voice** | voice_call_started, voice_call_ended, voice_tool_used | P2 |
| **Websites** | website_generated, website_variant_selected, website_published | P2 |
| **Social** | social_content_generated, social_content_published | P2 |
| **Onboarding** | onboarding_completed, personalization_completed, tour_step_completed, nps_submitted, sample_data_seeded, checklist_item_completed | P0 |
| **Admin** | user_plan_changed, user_feature_toggled, user_impersonated, admin_login | P1 |
| **System** | cron_executed, api_error, rate_limit_hit | Automatic (server-side) |

### 10.3 Standard Event Properties

Every event includes these base properties (auto-injected by wrapper):

```typescript
interface BaseEventProperties {
  // Auto-populated by PostHog
  $current_url: string;
  $session_id: string;
  $device_type: 'desktop' | 'mobile' | 'tablet';
  $browser: string;
  $os: string;
  
  // Auto-populated by our wrapper
  realtor_id: string;         // From session (hashed for privacy)
  plan: string;               // User's current plan
  timestamp: string;          // ISO 8601
  trace_id?: string;          // If available from server
}
```

---

## 11. Dashboard Specifications

### 11.1 Admin Analytics Dashboard (`/admin/analytics`)

**Layout:** Full-width page with date range selector at top, 4 rows of content.

**Row 1 — KPI Cards (8 cards):**
| Card | Value | Trend | Source |
|------|-------|-------|--------|
| Active Users (MAU) | Number | % change vs prior period | PostHog |
| MRR | Dollar amount | % change | users table |
| Trial Conversion | Percentage | % change | users table |
| AI Cost (MTD) | Dollar amount | % change | api_cost_tracking |
| Emails Sent (MTD) | Number | % change | newsletters table |
| Error Rate | Percentage | % change | Sentry / logs |
| Avg API Latency | Milliseconds | % change | request logs |
| Cron Health | X/Y passing | color indicator | cron_execution_log |

**Row 2 — Charts (2 columns):**
- Left: **User Activity** — line chart, DAU/WAU/MAU over time (PostHog)
- Right: **AI Cost Breakdown** — stacked bar chart by feature over time (api_cost_tracking)

**Row 3 — Tables:**
- Left: **Feature Adoption** — table with feature name, users %, events count, trend sparkline (PostHog)
- Right: **Activation Funnel** — horizontal funnel chart: Signed Up → Onboarded → Activated → Retained → Paying (PostHog)

**Row 4 — Operational:**
- Left: **Cron Execution Log** — last 24h, sortable by status/duration (cron_execution_log)
- Right: **Recent Errors** — top 5 Sentry issues with count, last seen, affected users (Sentry API)

### 11.2 Realtor Personal Analytics (`/dashboard` widgets)

**Email Performance Widget:**
- Open rate (%) vs industry benchmark (21.3% for real estate)
- Click rate (%) vs benchmark (2.6%)
- Best email type by engagement
- 7-day engagement trend sparkline

**Response Time Widget:**
- Average minutes from new contact → first communication
- Color-coded: green <5min, amber 5-30min, red >30min
- Industry benchmark comparison

**Pipeline Widget (existing — enhanced):**
- Add "days in current phase" indicator
- Add "blocked items" count with red badge
- Add phase-over-phase advancement rate

### 11.3 Newsletter Analytics Enhancement (`/newsletters/analytics`)

**New additions to existing page:**
- Conversion funnel: email_clicked → showing_booked → deal_closed (FR-8)
- Subscriber lifecycle: new → active → dormant → churned (counts + trend)
- Deliverability health: bounce rate, complaint rate, delivery rate with SLO indicators
- A/B test significance: p-value display, "statistically significant" badge when p < 0.05

---

## 12. Privacy, Compliance & Data Governance

### 12.1 PIPEDA Compliance

| Principle | Implementation |
|-----------|---------------|
| **Accountability** | Privacy policy updated to describe analytics data collection |
| **Purpose** | Analytics collected for: product improvement, service reliability, cost optimization |
| **Consent** | Implied consent for B2B SaaS analytics (legitimate interest); honor DNT |
| **Limiting Collection** | No PII in PostHog properties — hashed user IDs only |
| **Limiting Use** | Analytics data used only for stated purposes — never sold or shared |
| **Accuracy** | Real-time data; no stale caches for decision-making |
| **Safeguards** | PostHog Cloud US (SOC2 compliant); Supabase RLS on all tables |
| **Openness** | Documented in privacy policy and this PRD |
| **Individual Access** | Realtor can request their analytics data export |
| **Challenging Compliance** | Support email for privacy inquiries |

### 12.2 Data Classification

| Data Type | Sensitivity | Storage | Retention | PII? |
|-----------|------------|---------|-----------|------|
| Page views | Low | PostHog Cloud | 12 months | No (hashed user ID) |
| Feature events | Low | PostHog Cloud | 12 months | No |
| Session recordings | Medium | PostHog Cloud | 90 days | Masked (sensitive fields) |
| API request logs | Medium | Vercel/Render logs | 72 hours (Vercel) / 7 days (Render) | No (no body logged) |
| Audit log | High | Supabase (unified_audit_log) | 365 days | Yes (realtor_id, entity data) |
| Cost tracking | Medium | Supabase (api_cost_tracking) | 2 years | No (aggregated by realtor_id) |
| Cron logs | Low | Supabase (cron_execution_log) | 90 days | No |
| Error traces | Medium | Sentry Cloud | 90 days | Possible (stack traces) |

### 12.3 Data Retention & Cleanup

```
┌──────────────────────────────────┐
│        Retention Schedule        │
├──────────────┬───────────────────┤
│ 72 hours     │ Vercel function logs           │
│ 7 days       │ Render application logs        │
│ 90 days      │ Sentry errors + traces         │
│ 90 days      │ Session recordings (PostHog)   │
│ 90 days      │ cron_execution_log             │
│ 12 months    │ PostHog events                 │
│ 12 months    │ unified_audit_log              │
│ 24 months    │ api_cost_tracking              │
│ Indefinite   │ Aggregate metrics (dashboard)  │
│ Indefinite   │ newsletter_events (existing)   │
│ Indefinite   │ agent_events (existing)        │
└──────────────┴───────────────────┘
```

**Cleanup cron:** Weekly job to delete records past retention period from `cron_execution_log` (>90d) and `unified_audit_log` (>365d). Archive to compressed JSONB backup before deletion.

### 12.4 Right to Erasure

On realtor account deletion request:
1. Delete all PostHog data for user via PostHog API (`/api/person/{id}/delete`)
2. Delete all Sentry user data via Sentry API
3. Anonymize `unified_audit_log` entries (replace realtor_id with `DELETED_USER`)
4. Delete `api_cost_tracking` entries for realtor
5. Existing cascade deletes handle CRM data (contacts, listings, etc.)

---

## 13. Integration Points

### 13.1 PostHog

| Config | Value |
|--------|-------|
| **Host** | `https://us.i.posthog.com` (US region for PIPEDA) |
| **Client Key** | `NEXT_PUBLIC_POSTHOG_KEY` (write-only, safe for client) |
| **Server Key** | `POSTHOG_PERSONAL_API_KEY` (read+write, server only) |
| **Project ID** | Created during setup |
| **Free tier limits** | 1M events/mo, 5K session recordings/mo, 1M feature flag evaluations/mo |
| **Estimated usage (50 realtors)** | ~150K events/mo, ~500 recordings/mo — well within free tier |

### 13.2 Vercel Speed Insights

| Config | Value |
|--------|-------|
| **Package** | `@vercel/speed-insights` |
| **Integration** | `<SpeedInsights />` in `layout.tsx` |
| **Cost** | Free (included in Vercel plan) |
| **Data** | Route-level Web Vitals in Vercel dashboard |

### 13.3 Sentry (Enhanced)

| Enhancement | Change |
|-------------|--------|
| User context | `Sentry.setUser({ id: realtorId, plan, role })` on login |
| Feature tags | `Sentry.setTag("feature", name)` at feature entry points |
| Session linking | Share `posthog.get_session_id()` → Sentry breadcrumb |
| Custom alerts | Error rate > 5x baseline in 5 min → Sentry alert |

### 13.4 Pino Logger (New for CRM)

| Config | Value |
|--------|-------|
| **Package** | `pino` v9.5.0, `pino-pretty` v11.3.0 (match newsletter service) |
| **Log level** | `LOG_LEVEL` env var (default: `info` prod, `debug` dev) |
| **Service name** | `realtors360-crm` |
| **Output** | JSON in production, pretty-printed in development |
| **Trace ID** | Generated per request, propagated via `x-trace-id` header |

### 13.5 Existing Systems (No Changes)

| System | Status |
|--------|--------|
| Resend webhooks → `newsletter_events` | Keep as-is (add PostHog mirror for email events) |
| `event-emitter.ts` → `agent_events` | Keep as-is |
| `newsletter-events.ts` → `email_events` | Keep as-is |
| `activity_log` inserts | Keep as-is (gradually increase coverage) |

---

## 14. Implementation Phases

### Phase 1: Foundation (Week 1-2) — P0

| # | Deliverable | Effort | Dependencies |
|---|------------|--------|-------------|
| 1.1 | PostHog account setup (US region) + API keys | 30 min | None |
| 1.2 | `src/lib/analytics/posthog.ts` — typed client wrapper | 2h | 1.1 |
| 1.3 | `src/lib/analytics/server.ts` — server-side PostHog client | 1h | 1.1 |
| 1.4 | `PostHogProvider` in `layout.tsx` with auto page views | 1h | 1.2 |
| 1.5 | User identification on login/logout | 1h | 1.2 |
| 1.6 | `src/lib/logger.ts` — Pino logger for CRM (match newsletter service) | 1h | None |
| 1.7 | `withLogging()` API route wrapper (composes with `withErrorHandling()`) | 2h | 1.6 |
| 1.8 | Replace `console.log/error` in `src/app/api/**` (13 cron + ~20 API routes) | 4h | 1.6 |
| 1.9 | Fix dashboard error boundary → Sentry | 15 min | None |
| 1.10 | Sentry user context enrichment on login | 30 min | None |
| 1.11 | `@vercel/speed-insights` integration | 15 min | None |
| 1.12 | Web Vitals → PostHog | 1h | 1.2 |
| 1.13 | P0 feature events (listings, contacts, showings, UX, onboarding — 20 events) | 4h | 1.2, 1.3 |
| 1.14 | `docs/ANALYTICS_EVENTS.md` — event taxonomy documentation | 1h | 1.13 |
| 1.15 | ESLint `no-console` rule (warn level) | 15 min | None |

**Phase 1 total: ~20h (revised up from 17h — more realistic for console.log migration + onboarding events)**

### Phase 2: Business Intelligence (Week 3-4) — P1

| # | Deliverable | Effort | Dependencies |
|---|------------|--------|-------------|
| 2.1 | `cron_execution_log` migration + RLS | 1h | None |
| 2.2 | Cron execution tracking (all 13 Vercel crons) | 2h | 2.1 |
| 2.3 | `api_cost_tracking` migration + RLS | 1h | None |
| 2.4 | AI cost tracking wrapper for Claude, Voyage, Kling API calls | 3h | 2.3 |
| 2.5 | `unified_audit_log` migration + append-only RLS | 1h | None |
| 2.6 | Audit log inserts for key mutations (contacts, listings, users) — create `withAuditLog()` helper for server actions | 5h | 2.5 |
| 2.7 | Admin analytics page (`/admin/analytics`) — KPI cards + charts | 6h | Phase 1 |
| 2.8 | Cron health dashboard widget | 2h | 2.2 |
| 2.9 | Feature adoption table (PostHog query API) | 2h | Phase 1 |
| 2.10 | P1 feature events (communication, workflow, content — 12 events) | 2h | Phase 1 |
| 2.11 | Replace `console.log/error` in `src/actions/**` and `src/lib/**` (~30 files) | 5h | 1.6 |
| 2.12 | Realtor personal analytics widgets (email perf, response time) | 3h | Phase 1 |
| 2.13 | Retention policy cron (cleanup old cron_execution_log, audit entries) | 1h | 2.1, 2.5 |

**Phase 2 total: ~34h (revised up — audit log integration and console migration are larger than estimated)**

### Phase 3: Intelligence & Attribution (Week 5-6) — P2

| # | Deliverable | Effort | Dependencies |
|---|------------|--------|-------------|
| 3.1 | Activation funnel dashboard (PostHog) | 2h | Phase 1 |
| 3.2 | Retention curves dashboard (PostHog) | 2h | Phase 1 |
| 3.3 | Email → showing → deal attribution tracking (FR-8) | 4h | Phase 2 |
| 3.4 | Newsletter analytics enhancements (conversion funnel, A/B significance) | 3h | 3.3 |
| 3.5 | Audit log admin viewer (`/admin/audit`) | 3h | 2.5 |
| 3.6 | PostHog feature flags migration (replace `src/lib/features.ts`) — requires updating middleware auth guards, plan-to-feature mapping, and all `isFeatureEnabled()` call sites | 6h | Phase 1 |
| 3.7 | P2 feature events (RAG, voice, websites, social — 10 events) | 2h | Phase 1 |
| 3.8 | Right-to-erasure implementation (PostHog + Sentry + Supabase) | 2h | Phase 2 |
| 3.9 | Sentry ↔ PostHog session linking | 1h | Phase 1 |
| 3.10 | AI cost attribution dashboard (per-realtor, per-feature) | 3h | 2.4 |

**Phase 3 total: ~28h (revised up — feature flags migration is larger)**

### Total Implementation: ~82 hours across 6 weeks (revised from 73h)

---

## 15. Risk Assessment

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|-----------|------------|
| R1 | PostHog SDK increases page load time | Medium | Low | Async loading, defer init, measure LCP before/after |
| R2 | PostHog free tier exceeded | Medium | Low | 1M events/mo is generous; implement sampling if approaching 80% |
| R3 | Analytics tracking breaks CRM functionality | High | Low | All tracking wrapped in try/catch; analytics is fire-and-forget |
| R4 | Session recordings capture sensitive data | High | Medium | Mask CSS classes on all form fields; disable on login page; QA review |
| R5 | Audit log table grows unbounded | Medium | Medium | Retention policy cron (Phase 2); archive before delete |
| R6 | API cost tracking adds latency | Low | Low | Async insert after response sent; batch inserts |
| R7 | Console.log → Pino migration introduces regressions | Medium | Low | No behavioral changes — only log format changes; incremental rollout |
| R8 | PostHog Cloud downtime affects analytics | Low | Low | PostHog has 99.9% SLA; client SDK queues events offline |
| R9 | PIPEDA compliance concern with session recordings | Medium | Low | US hosting (SOC2), masking, 90-day retention, DNT respect |
| R10 | Engineering time spent building dashboards instead of features | Medium | Medium | Phase 2 dashboards use PostHog's built-in UI where possible; custom admin page is essential for business |

---

## 16. Appendices

### Appendix A: Environment Variables (New)

```bash
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=        # PostHog project API key (write-only, public)
NEXT_PUBLIC_POSTHOG_HOST=       # https://us.i.posthog.com
POSTHOG_PERSONAL_API_KEY=       # Server-side API key (read+write, secret)

# Logging
LOG_LEVEL=                      # info (default in prod), debug (dev)

# Feature flags
POSTHOG_DEV=                    # Set to 'true' to enable PostHog in dev mode
```

### Appendix B: PostHog vs GA4 vs Mixpanel Decision Matrix

| Criteria | PostHog | GA4 | Mixpanel |
|----------|---------|-----|---------|
| **SaaS product analytics** | Excellent | Poor (web marketing focus) | Good |
| **Session replay** | Included | Not included | Not included |
| **Feature flags** | Included | Not included | Not included |
| **Self-hostable** | Yes (Docker) | No | No |
| **Free tier** | 1M events/mo | 10M events/mo | 20M events/mo |
| **Real-time** | Yes | 24-48h delay | Yes |
| **Funnel analysis** | Built-in | Limited | Built-in |
| **Retention analysis** | Built-in | Limited | Built-in |
| **PIPEDA-friendly** | Yes (US/EU hosting, self-host option) | Concerning (Google data practices) | Yes (US hosting) |
| **Single SDK** | Yes (analytics + replay + flags) | No (needs LogRocket + LaunchDarkly) | No (needs separate tools) |
| **Open source** | Yes (MIT) | No | No |
| **Cost at scale (1M events)** | Free | Free | Free |
| **Cost at scale (5M events)** | ~$450/mo | Free | ~$800/mo |

**Decision: PostHog** — best fit for SaaS product analytics, includes session replay and feature flags, self-hostable for future PIPEDA compliance, generous free tier, single SDK replaces 3+ tools.

### Appendix C: Migration Numbering

Based on current migration count (latest: 103 — onboarding system), new migrations will be:

| Migration | Table | Purpose |
|-----------|-------|---------|
| 104 | `cron_execution_log` | Cron job execution tracking |
| 105 | `api_cost_tracking` | AI/API cost attribution |
| 106 | `unified_audit_log` | Immutable audit trail (with trigger-based immutability) |

### Appendix D: PostHog SDK Bundle Impact

| Package | Gzip Size | Impact |
|---------|----------|--------|
| `posthog-js` (core) | ~25KB | Main analytics |
| `posthog-js` (with recordings) | ~45KB | +session replay |
| `posthog-node` | Server-side only | Zero client impact |
| `@vercel/speed-insights` | ~2KB | Negligible |
| `pino` | Server-side only | Zero client impact |

Total client-side addition: ~47KB gzip (well under NFR-1.4 limit of 50KB).

### Appendix E: Existing Event Tables — Reference

For developers adding new tracking: these are the existing tables that already capture events. Check if your event type already exists here before creating a PostHog event.

| Table | Event Types | Insert Function |
|-------|------------|----------------|
| `agent_events` | 18 types (listing_*, contact_*, showing_*, email_*, engagement_*) | `emitEvent()` in `src/lib/ai-agent/event-emitter.ts` |
| `newsletter_events` | delivered, opened, clicked, bounced, complained | Resend webhook handler |
| `activity_log` | Freeform `activity_type` text | Direct Supabase insert |
| `email_events` | Event queue entries for newsletter service processing | `emitNewsletterEvent()` in `src/lib/newsletter-events.ts` |
| `agent_runs` | Agent execution records | Newsletter service orchestrator |

**Rule:** Server-side events go to existing Supabase tables AND PostHog (dual-write). Client-side events go to PostHog only.

---

*End of PRD*
