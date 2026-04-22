<!-- docs-audit-reviewed: 2026-04-22 --task-mgmt -->
<!-- docs-audit: src/app/(dashboard)/settings/*, src/app/api/admin/* -->
# Implementation Plan: Super Admin Panel

**Author:** Claude (Principal Engineer perspective)
**Date:** 2026-04-12
**PRD:** `docs/PRD_Admin_Analytics_Dashboard.md`
**UI Spec:** `docs/UI_DESIGN_Admin_Panel.md`

---

## 0. Executive Summary

The PRD proposes 37 new files, 14 modified files, 3 new database tables, and 20 event types. After auditing the codebase, I am cutting this by ~40%. Here is what changes and why.

### What I Am Cutting

| PRD Item | Reason | Alternative |
|----------|--------|-------------|
| `error` event tracking | Sentry is already configured and capturing errors via `@sentry/nextjs` in `global-error.tsx` + `next.config.ts` | Use Sentry dashboard |
| `api_slow` event tracking | Adds latency to every request for minimal signal | Install `@vercel/speed-insights` (free, 2 lines of code) |
| `page_viewed` event (middleware) | High volume, low signal. 10% sampling still noisy | Install `@vercel/analytics` (free, 2 lines of code) |
| Error log page with stack traces | Building a worse version of Sentry | Link to Sentry from System page |
| API performance tab | Building a worse version of Vercel Speed Insights | Link to Vercel dashboard from System page |
| Retention cohort heatmap | Requires 3+ months of accumulated data. Useless on day 1. | Defer to v2, add when data exists |
| Impersonation system | JWT-based impersonation is a security surface. Complex read-only enforcement across 44 server action files | Use Supabase Auth "Impersonate" feature (built-in). Defer custom impersonation to v2 |
| Platform settings UI (plan config editor) | 5 plans defined in `plans.ts`. Changing them requires feature flag alignment in `features.ts` anyway. UI adds false sense of editability | Keep in code. Deploy to change. |
| Feature flag kill switches UI | 5 flags. Can toggle via env vars or a single SQL update | Add a `platform_config` table for the announcement banner only. Kill switches stay as env vars |
| `admin_audit_log` as separate table | Same RLS policy as `platform_analytics`. Same query patterns. Separate table doubles migration + query surface | Merge into `platform_analytics` with `event_name = 'admin_action'` and `metadata.before_state/after_state` |
| `session_id` column on analytics | Never joined or queried on. No UI groups by session | Remove from schema |
| Client-side analytics library + API route | Most valuable events (create contact, send email, plan change) happen server-side. Page views handled by Vercel Analytics | Server-side `trackEvent()` only. No `/api/analytics/track` route |
| `email_sent`/`email_bounced` events | `newsletter_events` table already stores opens, clicks, bounces, complaints with link classification and scoring | Query `newsletter_events` directly for email ops page |
| `drip_email_sent`/`drip_email_opened` events | Drip sequences already tracked in their own table | Not needed |
| Rate limiting on analytics API | API route is cut. Server-side tracking is internal | Not needed |
| Export CSV bulk action | Out of scope in PRD Section 21, but listed in Section 6.3 | Removed. v2 |
| Announcement banner full editor (markdown, date range, dismissible) | Over-engineered for "tell users about downtime" | Simplified: text + type (info/warning). Stored in `platform_config` |

### What I Am Adding (Not in PRD)

| Addition | Reason |
|----------|--------|
| `@vercel/analytics` + `@vercel/speed-insights` | Free. Replaces 3 custom event types + middleware instrumentation. 2 lines in layout.tsx |
| Fix `signup_events` bug | Code writes to this table in 5 files, but the table was never created. Migration needed |
| `last_active_at` column + updater in auth callback | PRD proposed it but never specified where to update it. It must be set on every session |
| External links on System page | Links to Sentry dashboard + Vercel dashboard for error/performance details we're not replicating |

### Final Scope

| Metric | PRD | This Plan |
|--------|-----|-----------|
| New database tables | 3 | 1 (`platform_analytics`) + 1 column-add migration |
| New event types | 20 | 10 |
| New files | 37 | 23 |
| Modified files | 14 | 10 |
| New npm packages | 1 (recharts) | 2 (@vercel/analytics, @vercel/speed-insights). Recharts already installed |
| Pages | 8 | 6 (defer Settings + separate Analytics page) |
| Phases | 4 | 3 |

---

## 1. Architecture Decisions

### 1.1 Single Event Table

One table for everything: user events, cron runs, admin actions.

```sql
platform_analytics (
  id          UUID PRIMARY KEY,
  event_name  TEXT NOT NULL,
  user_id     UUID,          -- who did it (null for system events)
  metadata    JSONB,         -- flexible payload
  created_at  TIMESTAMPTZ
)
```

Admin actions carry `metadata.before_state` and `metadata.after_state` for audit purposes. No separate audit log table. The RLS policy is admin-read-only regardless.

**Why not two tables?** Same RLS, same indexes, same query pattern. Two tables means two write paths, two query paths, two sets of indexes. The `event_name` filter is equivalent to a table split.

### 1.2 Server-Side Tracking Only

No client-side event tracking library. No `/api/analytics/track` route.

**Why?** The events that matter for an admin panel all happen in server actions:
- `createContact()` -> `feature_used`
- `advanceOnboardingStep()` -> `onboarding_step_completed`
- `changeUserPlan()` -> `plan_changed`

Page views and client interactions are handled by Vercel Analytics (free tier: 2,500 events/month on Hobby, unlimited on Pro).

This eliminates: `analytics-client.ts`, `api/analytics/track/route.ts`, sendBeacon logic, event allowlist validation, rate limiting.

### 1.3 Email Stats from Existing Data

The `newsletter_events` table already has complete email engagement data:
- `delivered`, `opened`, `clicked`, `bounced`, `complained` event types
- Per-contact, per-newsletter tracking
- Link classification (listing, showing, CMA, etc.)
- Engagement scoring

The Email Operations page queries this table directly. No new events needed. No data duplication.

### 1.4 Observability Strategy

| Concern | Tool | Cost |
|---------|------|------|
| Page views, user counts | `@vercel/analytics` | $0 (Pro plan) |
| Web vitals, API latency | `@vercel/speed-insights` | $0 (Pro plan) |
| Errors, stack traces | Sentry (already configured) | $0 (free tier: 5K events/mo) |
| Business metrics (signups, feature usage, MRR) | `platform_analytics` table (custom) | $0 (Supabase) |
| Cron health, admin actions | `platform_analytics` table (custom) | $0 (Supabase) |
| Email delivery | `newsletter_events` table (existing) | $0 (already built) |

Three tools, zero additional cost, zero redundancy. Each tool covers exactly one concern.

### 1.5 No Custom Charts for Sparklines

Recharts is already installed (`^3.8.0`) but sparklines don't need a charting library. A 14-point sparkline is a single SVG `<polyline>`:

```tsx
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * 80},${32 - (v / max) * 28}`
  ).join(' ');
  return (
    <svg viewBox="0 0 80 32" className="w-20 h-8">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
```

28 bytes of SVG vs 45KB of Recharts bundle for this one component. Use Recharts only for real charts (donut, area, bar).

### 1.6 Admin Layout as a Nested Layout

The admin panel uses Next.js nested layouts:

```
src/app/(admin)/layout.tsx          -- Admin shell (sidebar + header)
src/app/(admin)/admin/page.tsx      -- Overview
src/app/(admin)/admin/users/page.tsx -- User table
src/app/(admin)/admin/users/[id]/page.tsx -- User detail
src/app/(admin)/admin/revenue/page.tsx -- Revenue
src/app/(admin)/admin/system/page.tsx -- System health
src/app/(admin)/admin/emails/page.tsx -- Email ops
```

The existing `(admin)/layout.tsx` becomes the admin shell with sidebar. The `(admin)` route group already exists and is separate from `(dashboard)`.

---

## 2. Database Migration

### Migration 104: `platform_analytics` + user columns

Single migration. One file: `supabase/migrations/104_platform_analytics.sql`

```sql
-- ═══════════════════════════════════════════════════════════════
-- 104: Platform Analytics + Admin Infrastructure
-- ═══════════════════════════════════════════════════════════════

-- 1. Platform analytics (unified event table)
CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pa_event_name ON platform_analytics(event_name);
CREATE INDEX idx_pa_user_id ON platform_analytics(user_id);
CREATE INDEX idx_pa_created_at ON platform_analytics(created_at);
CREATE INDEX idx_pa_event_created ON platform_analytics(event_name, created_at);

ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read access" ON platform_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Service insert access" ON platform_analytics
  FOR INSERT WITH CHECK (true);

-- 2. User columns for admin visibility
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'organic';

CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- 3. Platform config (announcement banner + minimal flags)
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only" ON platform_config FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

INSERT INTO platform_config (key, value) VALUES
  ('announcement', 'null')
ON CONFLICT (key) DO NOTHING;

-- 4. Fix signup_events (table referenced in 5 files but never created)
CREATE TABLE IF NOT EXISTS signup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_events_user ON signup_events(user_id);
ALTER TABLE signup_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access" ON signup_events FOR ALL USING (true);
```

**Why no `plan_history`, `plan_changed_at`, `total_sessions` columns?**
- `plan_history`: Reconstructible from `platform_analytics WHERE event_name = 'plan_changed'`. Denormalizing it onto users creates a write-amplification problem and stale-data risk.
- `plan_changed_at`: Same — query the latest `plan_changed` event.
- `total_sessions`: Vanity metric. `last_active_at` is what matters for identifying churning users.

### Event Types (10, not 20)

| Event | Fired From | Metadata |
|-------|-----------|----------|
| `signup` | `auth.ts` (signIn callback, new user) | `{ method, source }` |
| `session_start` | `auth.ts` (signIn callback, existing user) | `{ user_agent }` |
| `onboarding_step` | `onboarding.ts` (advanceOnboardingStep) | `{ step: 1-7, action: "completed" \| "skipped" }` |
| `feature_used` | `contacts.ts`, `listings.ts`, `newsletters.ts`, `showings.ts` | `{ feature, action: "create" }` |
| `plan_changed` | `admin.ts` (changeUserPlan) | `{ from, to, trigger, before_features, after_features }` |
| `trial_started` | `admin.ts` (startUserTrial) | `{ plan, days }` |
| `checklist_event` | `checklist.ts` | `{ action: "completed" \| "dismissed", item_key?, items_completed? }` |
| `cron_run` | Each cron route handler | `{ cron, status, duration_ms, error? }` |
| `admin_action` | `admin.ts` (all mutations) | `{ action, target_user_id, before_state?, after_state? }` |
| `personalization` | `personalization.ts` | `{ persona, market, experience }` |

**Why only 10?**
- `page_viewed` -> Vercel Analytics
- `error` / `api_slow` -> Sentry / Vercel Speed Insights
- `email_sent` / `email_bounced` -> Already in `newsletter_events`
- `drip_email_sent` / `drip_email_opened` -> Already tracked
- `onboarding_started` / `onboarding_completed` -> Derivable from `onboarding_step` events (step 1 = started, step 7 = completed). One event type replaces three.
- `trial_expired` -> Derivable: `WHERE plan_changed AND metadata->>'trigger' = 'trial_expired'`

Every event we don't create is an instrumentation point we don't maintain, a write we don't make, and a query we don't complicate.

---

## 3. Tracking Library

### Single file: `src/lib/analytics.ts`

```typescript
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fire-and-forget event logging. Never throws. Never blocks.
 * Call from server actions and API routes only.
 */
export async function trackEvent(
  eventName: string,
  userId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("platform_analytics").insert({
      event_name: eventName,
      user_id: userId,
      metadata: metadata ?? {},
    });
  } catch {
    // Tracking must never break the app
  }
}
```

~15 lines. No client library. No API route. No allowlist. No rate limiting. The function is internal — only called from server code we control. If someone adds a bad event name, code review catches it, not a runtime allowlist.

### Instrumentation (8 files modified)

Each modification is 1-3 lines: import `trackEvent` and call it after the existing mutation.

| File | Where | Call |
|------|-------|------|
| `src/lib/auth.ts` | signIn callback, after user upsert | `trackEvent('signup', user.id, { method })` or `trackEvent('session_start', user.id, {})`. Also: `UPDATE users SET last_active_at = now()` |
| `src/actions/onboarding.ts` | `advanceOnboardingStep()`, after step update | `trackEvent('onboarding_step', userId, { step, action: 'completed' })` |
| `src/actions/checklist.ts` | `markChecklistItem()` and `dismissChecklist()` | `trackEvent('checklist_event', userId, { action, item_key })` |
| `src/actions/contacts.ts` | create contact function, after insert | `trackEvent('feature_used', userId, { feature: 'contacts', action: 'create' })` |
| `src/actions/listings.ts` | create listing function, after insert | `trackEvent('feature_used', userId, { feature: 'listings', action: 'create' })` |
| `src/actions/newsletters.ts` | send newsletter function, after send | `trackEvent('feature_used', userId, { feature: 'newsletters', action: 'send' })` |
| `src/actions/showings.ts` | create showing function, after insert | `trackEvent('feature_used', userId, { feature: 'showings', action: 'create' })` |
| `src/actions/personalization.ts` | after save | `trackEvent('personalization', userId, { persona, market })` |

Each cron route also gets a wrapper:
```typescript
// In each cron route handler, wrap the existing logic:
const start = Date.now();
try {
  /* ...existing cron logic... */
  await trackEvent('cron_run', null, {
    cron: 'process-workflows', status: 'success',
    duration_ms: Date.now() - start
  });
} catch (err) {
  await trackEvent('cron_run', null, {
    cron: 'process-workflows', status: 'error',
    duration_ms: Date.now() - start,
    error: err instanceof Error ? err.message : 'Unknown'
  });
  throw err;
}
```

5 cron routes modified with the same pattern.

### `last_active_at` Update

In `src/lib/auth.ts`, inside the signIn callback (runs on every login):

```typescript
await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id);
```

One line. Updates on every session. No separate tracking event needed — `last_active_at` is a column, not an event.

---

## 4. Vercel Analytics Setup (2 minutes)

```bash
npm install @vercel/analytics @vercel/speed-insights
```

In `src/app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Inside the <body>:
<Analytics />
<SpeedInsights />
```

This gives us — for free, forever:
- Page view counts per route
- Unique visitors
- Top pages
- Web vitals (LCP, FID, CLS)
- API route latency percentiles
- Geographic distribution
- Device/browser breakdown

Three lines of code replace ~200 lines of custom middleware instrumentation, an API route, a client library, and two event types.

---

## 5. File Manifest

### New Files (22)

| # | File | Purpose | LOC Est |
|---|------|---------|---------|
| 1 | `supabase/migrations/104_platform_analytics.sql` | Tables + indexes + RLS + user columns | ~60 |
| 2 | `src/lib/analytics.ts` | `trackEvent()` — single function | ~15 |
| 3 | `src/app/(admin)/layout.tsx` | Admin shell: sidebar + header (replaces current) | ~120 |
| 4 | `src/components/admin/AdminSidebar.tsx` | 7-item sidebar with status widget | ~100 |
| 5 | `src/app/(admin)/admin/page.tsx` | Overview dashboard (server component) | ~80 |
| 6 | `src/components/admin/OverviewKPIs.tsx` | 6 KPI cards with SVG sparklines | ~180 |
| 7 | `src/components/admin/NeedsAttention.tsx` | Users needing attention table | ~120 |
| 8 | `src/components/admin/RecentActivity.tsx` | Activity feed (from platform_analytics) | ~100 |
| 9 | `src/components/admin/QuickActions.tsx` | 5 action buttons with modals | ~150 |
| 10 | `src/app/(admin)/admin/users/page.tsx` | User management DataTable page | ~60 |
| 11 | `src/components/admin/UserTable.tsx` | DataTable config: columns, filters, bulk actions | ~250 |
| 12 | `src/app/(admin)/admin/users/[id]/page.tsx` | User detail page (5 tabs) | ~80 |
| 13 | `src/components/admin/UserDetailProfile.tsx` | Profile tab: editable fields + completeness | ~200 |
| 14 | `src/components/admin/UserDetailActivity.tsx` | Activity tab: per-user event timeline from platform_analytics | ~140 |
| 15 | `src/components/admin/UserDetailData.tsx` | Data tab: counts + links | ~120 |
| 16 | `src/components/admin/UserDetailEmails.tsx` | Emails tab: KPIs + email table | ~180 |
| 17 | `src/components/admin/UserDetailBilling.tsx` | Billing tab: plan + features + usage | ~160 |
| 18 | `src/app/(admin)/admin/revenue/page.tsx` | Revenue page | ~60 |
| 19 | `src/components/admin/RevenueView.tsx` | KPIs + donut + trial pipeline + change log | ~300 |
| 20 | `src/app/(admin)/admin/system/page.tsx` | System health page | ~50 |
| 21 | `src/components/admin/SystemView.tsx` | Cron monitor + external links | ~200 |
| 22 | `src/app/(admin)/admin/emails/page.tsx` | Email operations page | ~50 |
| 23 | `src/components/admin/EmailOpsView.tsx` | Email KPIs + per-user table + bounce table | ~250 |
| | `src/actions/analytics.ts` | Admin query actions | ~350 |
| | **Total** | | **~3,025** |

### Modified Files (10)

| # | File | Change | LOC Delta |
|---|------|--------|-----------|
| 1 | `src/lib/auth.ts` | Track signup/session_start, update last_active_at | +15 |
| 2 | `src/actions/onboarding.ts` | Track onboarding_step | +5 |
| 3 | `src/actions/checklist.ts` | Track checklist_event | +5 |
| 4 | `src/actions/contacts.ts` | Track feature_used | +3 |
| 5 | `src/actions/listings.ts` | Track feature_used | +3 |
| 6 | `src/actions/newsletters.ts` | Track feature_used | +3 |
| 7 | `src/actions/showings.ts` | Track feature_used | +3 |
| 8 | `src/actions/admin.ts` | Add 12 new actions, track admin_action | +400 |
| 9 | `src/middleware.ts` | Redirect non-admin from /admin/* | +10 |
| 10 | `src/app/layout.tsx` | Add Vercel Analytics + Speed Insights | +4 |
| | `5 cron routes` | Wrap with cron_run tracking | +50 |
| | **Total delta** | | **~501** |

> **Note (2026-04-21):** `TeamSettingsClient.tsx` now includes invite notification actions (accept/decline), inline confirmation for member removal, and decline-invite flow. These changes are outside Admin Panel scope but affect the same settings route group.

### Files NOT Created (Removed from PRD)

| PRD File | Why Removed |
|----------|-------------|
| `src/lib/analytics-client.ts` | No client tracking needed |
| `src/app/api/analytics/track/route.ts` | No client tracking needed |
| `src/components/admin/OnboardingFunnel.tsx` | Merged into analytics actions, rendered inline on Overview |
| `src/components/admin/RetentionCohorts.tsx` | Deferred to v2 |
| `src/components/admin/ErrorLog.tsx` | Using Sentry |
| `src/components/admin/APIPerformance.tsx` | Using Vercel Speed Insights |
| `src/components/admin/PlatformConfigEditor.tsx` | Deferred to v2 |
| `src/components/admin/FeatureFlagPanel.tsx` | Using env vars |
| `src/components/admin/AnnouncementEditor.tsx` | Simplified into QuickActions modal |
| `src/app/(admin)/admin/analytics/page.tsx` | Funnel + adoption folded into Overview |
| `src/app/(admin)/admin/settings/page.tsx` | Deferred to v2 |
| `src/components/admin/FeatureAdoptionTable.tsx` | Rendered inline in Overview |
| `src/components/admin/ChecklistStats.tsx` | Rendered inline in Overview |

---

## 6. Server Actions Design

### `src/actions/analytics.ts` (~350 lines)

All functions call `requireAdmin()` first, then query via `createAdminClient()`.

```typescript
// ── Overview ──
export async function getAdminOverviewKPIs(range: '7d' | '30d' | '90d')
  // Single query: COUNT signups, COUNT sessions, COUNT onboarding_completed
  // + previous period for delta calculation
  // MRR: SELECT SUM(CASE plan WHEN 'professional' THEN 29 WHEN 'studio' THEN 69 WHEN 'team' THEN 129 ELSE 0 END) FROM users WHERE is_active
  // Returns: { totalUsers, mrr, activeToday, onboardingRate, trialConversion, systemOk }

export async function getUsersNeedingAttention()
  // 5 queries, each returning max 2 rows, UNION-ed:
  // 1. trials expiring within 3 days
  // 2. onboarding started > 3 days ago, not completed
  // 3. users with bounce rate > 5% (from newsletter_events)
  // 4. users with last_active_at > 7 days ago AND last_active_at IS NOT NULL
  // 5. users with > 5 cron/error events in 24h (unlikely but safety net)

export async function getRecentAdminActivity(limit = 15)
  // SELECT * FROM platform_analytics
  // WHERE event_name IN ('signup','plan_changed','admin_action','cron_run','onboarding_step')
  // ORDER BY created_at DESC LIMIT 15
  // JOIN users ON user_id for display names

// ── Onboarding Funnel ──
export async function getOnboardingFunnel(range: '7d' | '30d' | '90d')
  // For each step 1-7:
  //   COUNT DISTINCT user_id WHERE event_name = 'onboarding_step' AND metadata->>'step' = N
  // Also count: personalization events, first feature_used per user
  // Returns: Array<{ step, label, count, percentage, dropoff }>

export async function getFunnelDropoffUsers(step: number, range: string)
  // Users who completed step N-1 but NOT step N
  // Returns: Array<{ id, name, email, signupDate }>

// ── Feature Adoption ──
export async function getFeatureAdoption(range: '7d' | '30d' | '90d')
  // GROUP BY metadata->>'feature':
  //   COUNT DISTINCT user_id, COUNT(*), plus same for previous period
  // Returns: Array<{ feature, users, actions, adoptionPct, trend, sparklineData }>

// ── Revenue ──
export async function getRevenueKPIs()
  // MRR: SUM of plan prices for active users (hardcoded plan->price map, mirrors plans.ts)
  // ARPU: MRR / count of paying users
  // Trial conversion: users where trial_ends_at < now() AND plan != 'free' / total expired trials
  // Churn: users who were paying 30d ago but are now free / total paying 30d ago
  // Returns: { mrr, arr, arpu, trialConversion, churnRate }

export async function getPlanDistribution()
  // SELECT plan, COUNT(*) FROM users WHERE is_active GROUP BY plan
  // Returns: Array<{ plan, count, mrr }>

export async function getTrialPipeline()
  // Active: WHERE trial_ends_at > now()
  // Expiring: WHERE trial_ends_at BETWEEN now() AND now() + 7 days
  // With: user name, trial_plan, days remaining, onboarding_completed, feature_used count
  // Returns: { active, expiringSoon, converted30d, churned30d, activeTrials: User[] }

export async function getPlanChangeLog(limit = 20)
  // SELECT FROM platform_analytics WHERE event_name = 'plan_changed'
  // ORDER BY created_at DESC LIMIT 20
  // Returns: Array<{ date, userName, from, to, trigger }>

// ── System Health ──
export async function getSystemHealth()
  // SELECT DISTINCT ON (metadata->>'cron')
  //   FROM platform_analytics WHERE event_name = 'cron_run'
  //   ORDER BY metadata->>'cron', created_at DESC
  // Returns: { crons: Array<{ name, lastRun, status, duration }>, systemOk: boolean }

export async function getCronHistory(cronName: string, limit = 10)
  // SELECT FROM platform_analytics
  // WHERE event_name = 'cron_run' AND metadata->>'cron' = cronName
  // ORDER BY created_at DESC LIMIT 10

export async function triggerCron(cronName: string)
  // Validate cronName against allowlist
  // POST to /api/cron/{cronName} with CRON_SECRET header
  // Track admin_action event

// ── Email Ops (queries newsletter_events, NOT platform_analytics) ──
export async function getEmailOpsKPIs(range: '7d' | '30d' | '90d')
  // "Sent" count: SELECT COUNT(*) FROM newsletters WHERE status = 'sent' AND sent_at > range
  //   (newsletter_events has no 'sent' event — only delivered/opened/clicked/bounced/complained/unsubscribed)
  // Other counts: SELECT event_type, COUNT(*) FROM newsletter_events WHERE created_at > range GROUP BY event_type
  // Returns: { sent, delivered, opened, clicked, bounced, complained }

export async function getPerUserEmailStats(range: '7d' | '30d' | '90d')
  // JOIN newsletters ON newsletter_events.newsletter_id
  // GROUP BY newsletters.realtor_id
  // Returns: Array<{ realtorId, name, sent, delivered, openRate, bounceRate, status }>

export async function getBounceLog(range: '7d' | '30d' | '90d')
  // SELECT FROM newsletter_events WHERE event_type IN ('bounced','complained')
  // JOIN contacts, newsletters for display
  // Returns: Array<{ time, recipient, type, reason, realtorName }>
```

### `src/actions/admin.ts` extensions (~400 lines added)

```typescript
// ── Keep existing ──
requireAdmin()
getUsers()
updateUserFeatures()
toggleUserActive()

// ── Add ──
export async function searchUsers(query: string, filters?: {
  plan?: string; status?: string; sort?: string;
})
  // ILIKE on name, email. Filter on plan, is_active, trial status, onboarding_completed
  // Sort options: created_at, last_active_at, name, plan

export async function getUserDetail(userId: string)
  // Fetch: user row, contact/listing/showing/task counts, recent platform_analytics events
  // Newsletter stats from newsletter_events
  // Returns full user profile + stats

export async function changeUserPlan(userId: string, newPlan: string)
  // Validate plan exists in PLANS
  // Read current plan (before_state)
  // UPDATE users SET plan = newPlan, enabled_features = getUserFeatures(newPlan)
  // Track plan_changed + admin_action events
  // Revalidate /admin

export async function startUserTrial(userId: string, plan: string, days: number)
  // UPDATE users SET trial_plan = plan, trial_ends_at = now() + days
  // Track trial_started + admin_action events

export async function extendUserTrial(userId: string, additionalDays: number)
  // UPDATE users SET trial_ends_at = trial_ends_at + additionalDays
  // Track admin_action event

export async function resetUserOnboarding(userId: string)
  // UPDATE users SET onboarding_completed = false, onboarding_step = 1
  // Track admin_action event

export async function createUser(data: { email: string; name: string; plan: string })
  // INSERT into users with plan, enabled_features from getUserFeatures(plan)
  // Track signup event with source = 'admin_created'

export async function deleteUser(userId: string)
  // Validate not self-delete, not another admin
  // DELETE FROM users WHERE id = userId (cascades via FK)
  // Track admin_action event

export async function bulkChangePlan(userIds: string[], plan: string)
  // Loop changeUserPlan (max 50 at a time to prevent timeouts)
  // Track admin_action with { action: 'bulk_plan_change', count }

export async function bulkToggleFeature(userIds: string[], feature: string, enabled: boolean)
  // Loop updateUserFeatures for each user (max 50)
  // Track admin_action with { action: 'bulk_feature_toggle', feature, count }

export async function bulkToggleActive(userIds: string[], isActive: boolean)
  // UPDATE users SET is_active WHERE id IN (...)
  // Track admin_action

export async function updateAdminUserFields(userId: string, fields: Partial<User>)
  // Allowlist: name, email, phone, brokerage, license_number, role
  // UPDATE users SET ...fields
  // Track admin_action with before/after
```

---

## 7. Query Performance Analysis

All admin queries are bounded by date range. Here is the worst case at scale:

| Query | Table | At 200 users, 30K events/mo | Index Used | Expected Time |
|-------|-------|-----------------------------|-----------|---------------|
| Signup count (30d) | platform_analytics | ~200 rows scanned | `idx_pa_event_created` | <5ms |
| Onboarding funnel | platform_analytics | ~1,400 rows (7 steps x 200 users) | `idx_pa_event_created` | <10ms |
| Feature adoption | platform_analytics | ~6,000 rows (30d feature_used) | `idx_pa_event_created` | <15ms |
| MRR calculation | users | 200 rows, full scan | `idx_users_plan` | <2ms |
| Trial pipeline | users | 200 rows, filter on trial_ends_at | `idx_users_trial` | <2ms |
| Recent activity | platform_analytics | LIMIT 15, index scan | `idx_pa_created_at` | <2ms |
| Needs attention | users + newsletter_events | 5 small queries | Various | <20ms total |
| Email ops (30d) | newsletter_events | ~3,000 events | `idx_newsletter_events_created` | <10ms |
| Cron history | platform_analytics | ~150 rows (5 crons x 30 days) | `idx_pa_event_created` | <3ms |
| Plan distribution | users | 200 rows, GROUP BY | Sequential on small table | <2ms |

**Total page load (Overview, all KPIs + feed + attention table): <50ms query time.**

No materialized views needed. No aggregation tables. No background jobs. Raw queries on indexed columns are fast enough for years at this scale.

**When to reconsider:** If `platform_analytics` exceeds 1M rows (~3 years at current rate), add a monthly rollup. But that's a v3 problem.

---

## 8. Implementation Phases

### Phase 0: Foundation (1 session)

**Goal:** Tracking infrastructure + admin shell. No visible features yet except the new layout.

| # | Task | Files | Depends On |
|---|------|-------|-----------|
| 0.1 | Run migration 104 | `supabase/migrations/104_platform_analytics.sql` | Nothing |
| 0.2 | Create `trackEvent()` | `src/lib/analytics.ts` | 0.1 |
| 0.3 | Install Vercel Analytics + Speed Insights | `package.json`, `src/app/layout.tsx` | Nothing |
| 0.4 | Instrument auth (signup, session_start, last_active_at) | `src/lib/auth.ts` | 0.2 |
| 0.5 | Instrument server actions (6 files, 1-3 lines each) | `actions/*.ts` | 0.2 |
| 0.6 | Instrument cron routes (5 files, wrapper pattern) | `api/cron/*/route.ts` | 0.2 |
| 0.7 | Build admin shell layout + sidebar | `(admin)/layout.tsx`, `AdminSidebar.tsx` | Nothing |
| 0.8 | Add middleware guard for /admin/* | `src/middleware.ts` | Nothing |
| 0.9 | Move current admin page to /admin/users temporarily | `(admin)/admin/page.tsx` redirect | 0.7 |

**Deliverable:** Admin panel has new layout with sidebar. Current user card page still works at `/admin/users`. Events are silently being tracked. Vercel Analytics + Speed Insights active.

**Validation:** Check `platform_analytics` table has rows after logging in and creating a contact.

### Phase 1: User Management (1-2 sessions)

**Goal:** Replace card grid with searchable DataTable. Build user detail page. Add plan management.

| # | Task | Files | Depends On |
|---|------|-------|-----------|
| 1.1 | Build `searchUsers()`, `getUserDetail()` actions | `src/actions/admin.ts` | 0.1 |
| 1.2 | Build `changeUserPlan()`, `startUserTrial()`, `extendUserTrial()` | `src/actions/admin.ts` | 0.1 |
| 1.3 | Build `resetUserOnboarding()`, `createUser()`, `deleteUser()` | `src/actions/admin.ts` | 0.1 |
| 1.4 | Build `bulkChangePlan()`, `bulkToggleFeature()`, `bulkToggleActive()` | `src/actions/admin.ts` | 0.1 |
| 1.5 | Build UserTable component (DataTable config) | `UserTable.tsx` | 1.1 |
| 1.6 | Build Users page | `admin/users/page.tsx` | 1.5 |
| 1.7 | Build UserDetailProfile tab | `UserDetailProfile.tsx` | 1.1 |
| 1.8 | Build UserDetailActivity tab (per-user event timeline) | `UserDetailActivity.tsx` | 1.1 |
| 1.9 | Build UserDetailData tab | `UserDetailData.tsx` | 1.1 |
| 1.10 | Build UserDetailEmails tab | `UserDetailEmails.tsx` | 1.1 |
| 1.11 | Build UserDetailBilling tab | `UserDetailBilling.tsx` | 1.1, 1.2 |
| 1.12 | Build User Detail page (5 tabs) | `admin/users/[id]/page.tsx` | 1.7-1.11 |
| 1.13 | Delete old RealtorCard component (or keep as reference) | Cleanup | 1.6 |

**Deliverable:** Full user management with search, filter, sort, bulk actions. Click any user to see their full profile, activity timeline, data counts, email history, and plan/billing info. Admin can change plans, start trials, create/delete users.

**Validation:** Search for a user by email. Change their plan. Verify the change persists. Check audit events in `platform_analytics`.

### Phase 2: Overview + Analytics + Revenue (1-2 sessions)

**Goal:** The admin landing page with KPIs, and the revenue page.

| # | Task | Files | Depends On |
|---|------|-------|-----------|
| 2.1 | Build all analytics query actions | `src/actions/analytics.ts` | Phase 0 (data needs to exist) |
| 2.2 | Build SVG Sparkline utility | Inline in OverviewKPIs.tsx | Nothing |
| 2.3 | Build OverviewKPIs (6 cards) | `OverviewKPIs.tsx` | 2.1 |
| 2.4 | Build NeedsAttention table | `NeedsAttention.tsx` | 2.1 |
| 2.5 | Build RecentActivity feed | `RecentActivity.tsx` | 2.1 |
| 2.6 | Build QuickActions panel | `QuickActions.tsx` | Phase 1 actions |
| 2.7 | Build Overview page (compose 2.3-2.6) | `admin/page.tsx` | 2.3-2.6 |
| 2.8 | Build onboarding funnel (inline on overview, collapsible) | Part of Overview | 2.1 |
| 2.9 | Build feature adoption table (inline on overview, collapsible) | Part of Overview | 2.1 |
| 2.10 | Build RevenueView (KPIs + Recharts donut + trial table + change log) | `RevenueView.tsx` | 2.1 |
| 2.11 | Build Revenue page | `admin/revenue/page.tsx` | 2.10 |

**Deliverable:** Admin landing page answers "is everything OK?" in 5 seconds. Revenue page shows MRR, plan breakdown, trial pipeline. Onboarding funnel and feature adoption are collapsible sections on the overview (not a separate page — reduces navigation overhead).

**Validation:** KPI numbers match manual Supabase queries. Funnel step counts are monotonically decreasing. MRR calculation matches manual sum.

### Phase 3: Operations (1 session)

**Goal:** System health monitoring and email operations.

| # | Task | Files | Depends On |
|---|------|-------|-----------|
| 3.1 | Build system health query actions | Part of `analytics.ts` | Phase 0 (cron data) |
| 3.2 | Build SystemView (cron table + expandable history + trigger button) | `SystemView.tsx` | 3.1 |
| 3.3 | Build System page with external links to Sentry + Vercel | `admin/system/page.tsx` | 3.2 |
| 3.4 | Build email ops query actions | Part of `analytics.ts` | Existing newsletter_events |
| 3.5 | Build EmailOpsView (KPIs + per-user table + bounce log) | `EmailOpsView.tsx` | 3.4 |
| 3.6 | Build Emails page | `admin/emails/page.tsx` | 3.5 |
| 3.7 | Move voice analytics into admin panel | Relocate + restyle | Nothing |

**Deliverable:** Cron monitor shows real status with manual trigger capability. Email ops shows delivery health queried from existing data. System page links out to Sentry and Vercel for deep debugging.

**Validation:** Trigger a cron manually. Verify it runs and status updates. Check email stats match Resend dashboard.

---

## 9. What Is Deferred to v2

| Feature | When to Build | Trigger |
|---------|--------------|---------|
| Retention cohort heatmap | After 3 months of data | `platform_analytics` has >90 days of signup + session_start events |
| Standalone Analytics page with tabs | When overview becomes crowded | Admin requests "I want to see deeper funnel analysis" |
| Impersonation | When support volume exceeds 5 tickets/week | Build JWT-based impersonation per PRD Section 17.5 |
| Platform settings UI | When plan structure changes frequently | More than 2 plan changes per month |
| Feature flag kill switches | When an incident requires instant kill | First time you need to disable email_sending globally and env var deploy is too slow |
| Announcement banner | When user count exceeds 100 | First time you need to communicate downtime |
| CSV export | When admin requests data for external analysis | Explicit user request |
| API performance monitoring | If Vercel Speed Insights is insufficient | p95 latency concerns |
| Custom error log | If Sentry free tier is exceeded | >5K errors/month |

Each v2 feature has a clear trigger condition. Don't build it until the trigger fires.

---

## 10. Cost Analysis

| Item | Cost | Notes |
|------|------|-------|
| `platform_analytics` storage | $0 | 30K rows/month = ~3MB/month. Supabase free tier: 500MB |
| `@vercel/analytics` | $0 | Included in Vercel Pro plan |
| `@vercel/speed-insights` | $0 | Included in Vercel Pro plan |
| Sentry | $0 | Free tier: 5K errors/month (more than enough) |
| Recharts bundle | +0KB | Already installed, already in bundle |
| Admin panel pages | +~45KB | 6 pages, code-split. Only loaded by admin |
| Total | **$0/month** | Zero incremental cost |

---

## 11. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| `trackEvent()` write failures silently losing data | Low | Low | try/catch swallows errors. Data loss for analytics is acceptable — not transactional |
| Admin middleware bypass (non-admin accessing /admin) | Low | High | Middleware redirect + `requireAdmin()` in every server action (defense in depth) |
| MRR calculation drift from plans.ts | Medium | Medium | Hardcode plan prices in the SQL query OR import from plans.ts. Use a constant map, not a join |
| `last_active_at` not updating for demo login | Low | Low | Demo login uses the same auth callback path. It will update |
| Cron trigger button used accidentally | Medium | Low | Confirmation dialog. Crons are idempotent by design |
| `platform_analytics` growing unbounded | Low (years away) | Medium | Add TTL policy when table exceeds 500K rows: `DELETE WHERE created_at < now() - interval '1 year'` |
| Feature adoption % misleading for new features | Medium | Low | Show "since launch" date next to each feature. Don't compare a 2-week-old feature to a 6-month-old one |

---

## 12. Definition of Done

Phase 0:
- [ ] Migration 104 applied successfully
- [ ] `trackEvent()` writes to `platform_analytics` (verify with a login + contact create)
- [ ] Vercel Analytics shows page view data in Vercel dashboard
- [ ] Admin sidebar renders with 7 nav items
- [ ] Non-admin user accessing `/admin` is redirected to `/`
- [ ] Current user management functionality preserved at `/admin/users`

Phase 1:
- [ ] User table loads all users with search by name/email
- [ ] Filter by plan and status works
- [ ] Sort by name, signup date, last active works
- [ ] Bulk select + change plan works for 2+ users
- [ ] User detail page shows 5 tabs with real data (Profile, Activity, Data, Emails, Billing)
- [ ] Admin can change a user's plan and it takes effect on next login
- [ ] Admin can start and extend trials
- [ ] Every admin mutation creates a `platform_analytics` event with before/after state

Phase 2:
- [ ] Overview page loads in <2 seconds
- [ ] 6 KPI cards show accurate numbers matching manual Supabase queries
- [ ] "Needs Attention" shows users with expiring trials, stuck onboarding
- [ ] Onboarding funnel shows correct step-by-step counts
- [ ] Feature adoption table shows real usage data
- [ ] Revenue page shows MRR matching manual calculation
- [ ] Plan distribution donut renders with correct proportions
- [ ] Trial pipeline shows active trials sorted by expiry date

Phase 3:
- [ ] Cron monitor shows last run status for all 5 crons
- [ ] Click to expand shows run history with success/failure
- [ ] "Run Now" button triggers cron and updates status
- [ ] Email KPIs match Resend dashboard numbers
- [ ] Per-user email table shows bounce rate with red/amber/green status
- [ ] System page links to Sentry and Vercel dashboard open correctly


<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->

<!-- Last reviewed: 2026-04-21 — team WIP session artifacts -->
