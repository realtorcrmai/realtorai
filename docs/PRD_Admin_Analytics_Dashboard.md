<!-- docs-audit: src/app/(dashboard)/settings/*, src/app/api/admin/* -->
# PRD: Super Admin Panel — Realtors360 Platform Administration

**Author:** Claude (on behalf of Bigbear)
**Date:** 2026-04-12
**Priority:** P0
**Status:** Ready for Implementation
**Audience:** Platform owner managing multiple realtor clients

---

## 1. Problem Statement

Realtors360 is evolving from a single-user tool to a multi-client SaaS platform. The current admin panel is a single page that lists users with feature toggles. That is insufficient for running a real business with paying clients.

Today, the platform owner cannot answer basic operational questions:

- **Revenue:** How much MRR do I have? Who is on which plan? Who is trialing and about to churn?
- **Health:** Is any realtor's account broken? Are cron jobs running? Are APIs responding?
- **Onboarding:** Where do new signups drop off? What is time-to-value?
- **Adoption:** Which features justify their engineering cost? Which are shelfware?
- **Support:** A realtor says "my emails aren't sending" -- how do I diagnose that without SSH?
- **Growth:** What does my funnel look like? Signup -> Onboarding -> Activation -> Retention -> Revenue?

Without this, product and business decisions are made blind. Every SaaS at scale needs an internal admin panel that is as polished as the customer-facing product. Facebook calls this "admin tools are the product." We need to build ours.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|---------------|
| 1 | **Single pane of glass** for all platform operations | Admin never needs to open Supabase dashboard for routine work |
| 2 | **Revenue visibility** -- MRR, plan distribution, trial conversion | Can answer "what's our MRR?" in 2 seconds |
| 3 | **User lifecycle tracking** -- signup to churn | Can see exactly where every user is in their journey |
| 4 | **Operational health** -- crons, errors, API latency | Know about system issues before users report them |
| 5 | **Feature adoption intelligence** -- what's used, what's not | Data-driven prioritization of engineering effort |
| 6 | **Self-serve diagnostics** -- impersonation, event log, email history | Resolve 90% of support tickets without touching the database |
| 7 | **Zero external dependencies** -- all in Supabase, no PostHog/Amplitude | No vendor lock-in, no additional cost, no data leaving the platform |

---

## 3. What Already Exists (Audit)

### 3.1 Admin Panel

| Component | Location | What It Does | Issues |
|-----------|----------|-------------|--------|
| Admin page | `src/app/(admin)/admin/page.tsx` | Lists users, shows total/active/inactive counts | No tabs, no navigation, glass styling (deprecated), no search/filter |
| Admin layout | `src/app/(admin)/layout.tsx` | Header with "Back to Dashboard" link + Shield icon | No sidebar, no tab navigation between admin sections |
| RealtorCard | `src/components/admin/RealtorCard.tsx` | Toggle 16 features per user, activate/deactivate | Glass styling, no plan display, no usage stats, no last-active date |
| Admin actions | `src/actions/admin.ts` | `requireAdmin()`, `getUsers()`, `updateUserFeatures()`, `toggleUserActive()` | 3 functions only. No search, no plan change, no impersonation, no audit log |
| Voice analytics | `src/app/(dashboard)/admin/voice-analytics/page.tsx` | Voice session/call metrics (7d/30d/90d) | Wrong route (under dashboard, not admin). No auth guard. Hardcoded tenant ID. Legacy glass styling |

### 3.2 Auth & Roles

| Component | Location | What It Does | Issues |
|-----------|----------|-------------|--------|
| Role system | `users.role` column | `"admin"` or `"realtor"` | Binary -- no brokerage admin, no support role, no read-only |
| Admin gate | `requireAdmin()` in `src/actions/admin.ts` | Checks `session.user.role === "admin"` | Client-side redirect on page, not middleware-enforced |
| Admin email | `ADMIN_EMAIL` env var | Auto-assigns admin role on first login | Only one admin email supported |
| Admin client | `src/lib/supabase/admin.ts` | Service-role Supabase client (bypasses RLS) | No audit trail of admin actions |

### 3.3 Feature Flags & Plans

| Component | Location | What It Does | Issues |
|-----------|----------|-------------|--------|
| Feature keys | `src/lib/features.ts` | 16 feature keys with plan-to-feature mapping | No admin UI to change plan-level defaults. Can only toggle per-user |
| Plans | `src/lib/plans.ts` | 5 plans (free/professional/studio/team/admin) with prices + limits | No payment integration. "Upgrade" button sends email |
| Trial system | `plans.ts` | `isTrialActive()`, `getEffectivePlan()`, `trialDaysRemaining()` | No admin UI to manage trials. No conversion tracking |
| Billing page | `src/app/(dashboard)/settings/billing/page.tsx` | User-facing plan comparison + upgrade CTAs | Links to mailto: -- no Stripe integration |

### 3.4 Multi-Tenancy

| Component | Location | What It Does | Issues |
|-----------|----------|-------------|--------|
| Tenant client | `src/lib/supabase/tenant.ts` | Auto-injects `.eq("realtor_id", userId)` on all queries | App-level only. RLS policies still allow `auth.role() = 'authenticated'` (no DB enforcement) |
| Global tables | `tenant.ts` GLOBAL_TABLES set | Exempts system tables from tenant scoping | Good foundation |
| Voice multi-tenant | `supabase/migrations/061_multi_tenant_voice.sql` | Full tenants/memberships/API keys/audit tables | Only used by voice agent. Main CRM doesn't use it |

### 3.5 Onboarding & Activation

| Component | Location | What It Does | Issues |
|-----------|----------|-------------|--------|
| Onboarding wizard | `src/app/(auth)/onboarding/page.tsx` | 6-step wizard (profile, about, contacts, details, MLS, start) | No analytics on where users drop off |
| Onboarding actions | `src/actions/onboarding.ts` | Step advancement, headshot upload, sample data seeding | Writes to `signup_events` on completion but nowhere else |
| Profile completeness | `onboarding.ts` | 10-point scoring (name, email, phone, avatar, brokerage, license, calendar, timezone, bio, contacts) | Only recalculated on onboarding actions, not visible to admin |
| Checklist | `src/actions/checklist.ts` | Post-onboarding activation checklist | No tracking of completion rates |

### 3.6 Cron Jobs

| Route | Purpose | Issues |
|-------|---------|--------|
| `/api/cron/process-workflows` | Advance newsletter journeys | No admin UI, no run history, no error visibility |
| `/api/cron/greeting-automations` | Birthday/anniversary messages | Same |
| `/api/cron/social-publish` | Auto-publish social posts | Same |
| `/api/cron/agent-scoring` | Lead scoring | Same |
| `/api/cron/agent-recommendations` | AI recommendations | Same |

All require `Bearer CRON_SECRET`. No UI to see last run, success/failure, or manually trigger.

### 3.7 What's Completely Missing

| Capability | Status | Impact |
|-----------|--------|--------|
| Revenue dashboard (MRR, plan breakdown) | Not built | Can't track business health |
| User search, filter, sort | Not built | Can't find a specific user quickly |
| Plan management (change a user's plan) | Not built | Must edit database directly |
| Trial management (extend, start, cancel) | Not built | Must edit database directly |
| User detail view (full profile + activity) | Not built | Can't diagnose user issues |
| Impersonation ("view as user") | Not built | Can't reproduce user-reported bugs |
| Audit log (who changed what) | Not built | No accountability for admin actions |
| System health dashboard | Not built | Learn about issues from user complaints |
| Email delivery monitoring | Not built | Can't debug "my emails aren't sending" |
| Cron job monitoring UI | Not built | Must check server logs to verify crons ran |
| Platform analytics (funnel, retention) | Not built | Can't measure growth or identify bottlenecks |
| Feature adoption metrics | Not built | Can't prioritize engineering work |
| Bulk operations (mass plan change, feature toggle) | Not built | Tedious one-by-one management |
| API key management for tenants | Tables exist, no UI | Voice tenant infrastructure unused |
| Notification/announcement system (admin -> all users) | Not built | No way to communicate platform updates |

---

## 4. Information Architecture

The Super Admin Panel is a standalone section at `/admin` with its own sidebar navigation. It has **7 sections**, each a tab/page:

```
/admin
  /admin                     -- Overview (KPIs + quick actions)
  /admin/users               -- User Management (current page, upgraded)
  /admin/users/[id]          -- User Detail (drill-down)
  /admin/analytics           -- Platform Analytics (funnel, adoption, retention)
  /admin/revenue             -- Revenue & Plans (MRR, trials, plan distribution)
  /admin/system              -- System Health (crons, errors, APIs)
  /admin/emails              -- Email Operations (delivery, bounces, per-user)
  /admin/settings            -- Platform Settings (feature defaults, plan config)
```

### Navigation

Replace the current admin layout with a proper admin shell:

```
+--------------------------------------------------+
| [Shield] Realtors360 Admin    [Back to Dashboard] |
+------+-------------------------------------------+
| Over |                                           |
| view |         Content Area                      |
| Users|                                           |
| Analy|                                           |
| Reven|                                           |
| Syste|                                           |
| Email|                                           |
| Setti|                                           |
+------+-------------------------------------------+
```

On mobile: horizontal tab bar at top (scrollable).

---

## 5. Section 1: Overview Dashboard (`/admin`)

The landing page. Answers "is everything OK?" in 5 seconds.

### 5.1 KPI Cards (top row, 6 cards)

| Card | Metric | Source |
|------|--------|--------|
| Total Users | Count of users | `users` table |
| MRR | Sum of active plan prices | `users.plan` joined with `PLANS` prices |
| Active Today | Users with session in last 24h | `platform_analytics.session_start` |
| Onboarding Rate | % completed onboarding (last 30d) | `users.onboarding_completed` / signups |
| Trial Conversions | % of expired trials that upgraded (30d) | `users.trial_ends_at` + `users.plan` |
| System Status | Green/Amber/Red | Composite: crons + error rate + API latency |

Each card: big number, delta vs previous period (arrow + %), sparkline (last 14 data points).

### 5.2 Recent Activity Feed (left 60%)

Real-time-ish feed of platform activity:
- New signups (with plan)
- Onboarding completions
- Plan upgrades/downgrades
- Trial expirations
- Feature flag changes (by admin)
- System errors

### 5.3 Quick Actions Panel (right 40%)

| Action | What It Does |
|--------|-------------|
| Create User | Open create user modal |
| Extend Trial | Search user -> extend trial |
| Toggle Feature | Search user -> toggle specific feature |
| Trigger Cron | Run a cron job manually |
| Send Announcement | Push notification to all users |

---

## 6. Section 2: User Management (`/admin/users`)

### 6.1 User Table

Replace the current card grid with a proper DataTable:

| Column | Type | Sortable | Filterable |
|--------|------|----------|-----------|
| User | Avatar + name + email | Yes (name) | Search by name/email |
| Plan | Badge (free/pro/studio/team) | Yes | Multi-select filter |
| Status | Active/Inactive/Trial/Onboarding | Yes | Multi-select filter |
| Signed Up | Relative date | Yes | Date range picker |
| Last Active | Relative date | Yes | Date range picker |
| Onboarding | Progress bar (0-100%) | Yes | Filter: completed / incomplete |
| Features | Count badge (e.g. "12/16") | No | Filter by specific feature |
| MRR | Dollar amount | Yes | Range filter |
| Actions | Dropdown menu | No | No |

### 6.2 Row Actions Menu

| Action | Description |
|--------|------------|
| View Details | Navigate to `/admin/users/[id]` |
| Change Plan | Modal: select new plan, effective immediately |
| Start Trial | Modal: select plan + duration (7/14/30 days) |
| Extend Trial | Modal: add days to existing trial |
| Toggle Active | Activate/deactivate with confirmation |
| Manage Features | Modal: toggle individual features (current RealtorCard UI) |
| Impersonate | Open the dashboard as this user (read-only, banner shown) |
| Reset Onboarding | Re-trigger onboarding wizard for user |
| Delete User | Confirmation modal with data deletion warning |

### 6.3 Bulk Actions

Select multiple users via checkbox column:
- **Bulk plan change** -- set all selected to a plan
- **Bulk feature toggle** -- enable/disable a specific feature for all selected
- **Bulk activate/deactivate** -- toggle active status

### 6.4 User Detail Page (`/admin/users/[id]`)

Full-page drill-down for a single user. 5 tabs:

#### Tab 1: Profile
- All user fields (name, email, phone, brokerage, license, plan, role, avatar)
- Editable inline (admin can update any field)
- Profile completeness score with breakdown
- Account creation date, last login, total sessions
- Plan history timeline

#### Tab 2: Activity
- Timeline of all `platform_analytics` events for this user
- Filterable by event type
- Shows: page views, feature usage, onboarding steps, errors
- Date range selector

#### Tab 3: Data
- Summary counts: contacts, listings, showings, newsletters, tasks
- Quick links to view their data (via impersonation)
- Storage usage (uploaded files, avatars)

#### Tab 4: Emails
- All newsletters sent to/by this user
- Delivery status per email (sent/delivered/opened/clicked/bounced)
- Engagement score and intelligence data
- Drip email sequence progress

#### Tab 5: Billing
- Current plan and effective features
- Trial status and history
- Plan change history with timestamps
- Future: payment history (when Stripe integrated)

---

## 7. Section 3: Platform Analytics (`/admin/analytics`)

### 7.1 Date Range Control

Global picker at top: **7d / 30d / 90d / All Time**. Controls all charts on the page.

### 7.2 Growth Metrics (top row, 4 cards)

| Card | Metric | Calculation |
|------|--------|-------------|
| New Signups | Count in range | `WHERE event_name = 'signup'` |
| Onboarding Completion | % completed | `completed / started * 100` |
| Time to First Value | Median time from signup to first `feature_used` | Median of `first_feature.created_at - signup.created_at` |
| 7-Day Retention | % with session on day 7+ | Standard cohort retention |

### 7.3 Onboarding Funnel (left 60%)

Horizontal bar chart showing step-by-step drop-off:

```
Step 1: Profile        ████████████████████████  100% (250)
Step 2: About You      ██████████████████████    88% (220)   -12%
Step 3: Contacts       ████████████████████      80% (200)   -8%
Step 4: Details        ██████████████████        72% (180)   -8%
Step 5: MLS            ████████████████          64% (160)   -8%
Step 6: Complete       ██████████████            56% (140)   -8%
Personalization        ████████████              48% (120)   -8%
First Feature Used     ██████████                40% (100)   -8%
```

- CSS horizontal bars (no chart library needed for this)
- Show absolute count + percentage + drop-off delta
- Click a step to see the users who dropped off at that step

### 7.4 Activation Checklist Stats (right 40%)

Donut chart showing checklist completion distribution:
- How many users completed 0/5, 1/5, 2/5... 5/5 items
- Average days to complete all items
- Most skipped checklist item highlighted
- Table below: per-item completion rate

### 7.5 Feature Adoption Table

| Feature | Unique Users (range) | Total Actions (range) | Adoption % | Trend (vs prev period) |
|---------|---------------------|----------------------|------------|----------------------|
| Contacts | 180 | 450 | 72% | +5% |
| Listings | 120 | 200 | 48% | +3% |
| Email Marketing | 45 | 80 | 18% | +12% |
| Showings | 30 | 55 | 12% | -2% |
| AI Content | 25 | 40 | 10% | +8% |
| Calendar | 60 | 120 | 24% | 0% |
| AI Assistant | 15 | 35 | 6% | +15% |
| Website | 8 | 12 | 3% | +2% |

- Sortable by any column
- Click a feature row to expand a line chart showing usage over time
- Color-coded adoption %: green (>50%), amber (20-50%), red (<20%)

### 7.6 Retention Cohorts (collapsible)

Triangle heatmap:

```
          Wk 0   Wk 1   Wk 2   Wk 3   Wk 4
Mar 1-7    100%   72%    58%    45%    40%
Mar 8-14   100%   68%    52%    41%     --
Mar 15-21  100%   75%    55%     --     --
Mar 22-28  100%   70%     --     --     --
Mar 29-Apr 4  100%  --     --     --     --
```

- Green cells > 60%, amber 30-60%, red < 30%
- Rows grouped by signup week
- Click a cell to see which users retained/churned

---

## 8. Section 4: Revenue & Plans (`/admin/revenue`)

### 8.1 Revenue KPIs (top row)

| Card | Metric |
|------|--------|
| MRR | Sum of all active plan prices |
| ARR | MRR * 12 |
| Avg Revenue Per User (ARPU) | MRR / active paying users |
| Trial Conversion Rate | Expired trials that upgraded / total expired trials |
| Churn Rate (30d) | Users who downgraded to free / total paying at start of period |

### 8.2 Plan Distribution

Donut chart + table:

| Plan | Users | % of Total | MRR Contribution |
|------|-------|-----------|-----------------|
| Free | 120 | 48% | $0 |
| Professional | 80 | 32% | $2,320 |
| Studio | 35 | 14% | $2,415 |
| Team | 15 | 6% | $1,935 |

### 8.3 Trial Pipeline

| Status | Count | Conversion Rate |
|--------|-------|----------------|
| Active Trials | 25 | -- |
| Expiring This Week | 8 | -- |
| Converted (30d) | 18 | 42% |
| Churned (30d) | 25 | 58% |

Table of active trials with: user name, trial plan, days remaining, onboarding status, feature usage count. Sorted by "expiring soonest."

### 8.4 Revenue Timeline

Line chart showing MRR over time (monthly). Stacked by plan tier.

### 8.5 Plan Change Log

Table of all plan changes (upgrades, downgrades, trial starts, expirations) with timestamps:

| Date | User | From | To | Trigger |
|------|------|------|-----|---------|
| Apr 10 | Sarah Chen | Professional Trial | Professional | Trial converted |
| Apr 9 | James Patel | Studio | Free | Downgrade (manual) |
| Apr 8 | Lisa Wong | Free | Professional Trial | Admin started trial |

---

## 9. Section 5: System Health (`/admin/system`)

### 9.1 Status Overview

Traffic light at top: **All Systems Operational** / **Degraded** / **Outage**

Computed from:
- All crons ran successfully in their expected interval
- Error rate < 1% in last hour
- No API route with p95 > 5s

### 9.2 Cron Job Monitor

| Cron | Schedule | Last Run | Status | Duration | Next Run |
|------|----------|----------|--------|----------|----------|
| process-workflows | Daily 9 AM | 2h ago | Success | 1.2s | Tomorrow 9 AM |
| greeting-automations | Daily 8 AM | 3h ago | Success | 0.8s | Tomorrow 8 AM |
| agent-scoring | Daily | 5h ago | Error | 0.3s | Tomorrow |
| social-publish | Hourly | 45m ago | Success | 2.1s | 15m |

- Green/amber/red status indicators
- Amber if last run was > 2x the expected interval
- Red if last run failed
- Click to see last 20 run logs (timestamp, duration, status, error message if failed)
- **Manual trigger button** per cron (POST to cron route with CRON_SECRET)

### 9.3 Error Log — [v2] (Using Sentry in v1)

| Time | Route | Message | User | Count |
|------|-------|---------|------|-------|
| 2m ago | /api/listings | Supabase timeout | james@ | 3 |
| 15m ago | /actions/newsletters | Resend rate limit | system | 1 |
| 1h ago | /api/calendar | Google token expired | sarah@ | 5 |

- Grouped by unique error (message + route)
- Expandable to see full stack trace
- Filter by severity (error, warning), date range, user

### 9.4 API Performance — [v2] (Using Vercel Speed Insights in v1)

| Route | Requests (24h) | p50 | p95 | p99 | Error Rate |
|-------|---------------|-----|-----|-----|-----------|
| /api/contacts | 1,200 | 80ms | 250ms | 800ms | 0.2% |
| /api/listings | 800 | 120ms | 400ms | 1.2s | 0.5% |
| /api/calendar | 200 | 200ms | 1.5s | 3.2s | 2.1% |

- Amber if p95 > 2s, red if p95 > 5s or error rate > 5%
- Click route to see latency distribution chart

---

## 10. Section 6: Email Operations (`/admin/emails`)

### 10.1 Email KPIs

| Card | Metric |
|------|--------|
| Sent (24h) | Total emails sent across all users |
| Delivery Rate | Delivered / sent * 100 |
| Open Rate | Opened / delivered * 100 |
| Bounce Rate | Bounced / sent * 100 |
| Complaint Rate | Complaints / sent * 100 (must stay < 0.1%) |

### 10.2 Delivery Pipeline

| Status | Count (24h) |
|--------|------------|
| Queued | 12 |
| Sent | 340 |
| Delivered | 335 |
| Opened | 180 |
| Clicked | 45 |
| Bounced | 3 |
| Complained | 1 |

Visual funnel similar to onboarding.

### 10.3 Per-User Email Table

| Realtor | Sent (7d) | Delivered | Opens | Clicks | Bounces | Status |
|---------|----------|-----------|-------|--------|---------|--------|
| Sarah Chen | 45 | 44 | 28 | 12 | 1 | Healthy |
| James Patel | 120 | 110 | 35 | 8 | 10 | Warning |

- Warning if bounce rate > 5% or complaint rate > 0.1%
- Click user to see their email log detail (per-email status)

### 10.4 Bounce/Complaint Drill-Down

Table of bounced/complained emails with:
- Recipient email
- Bounce type (hard/soft)
- Error message
- Realtor who sent it
- Date

---

## 11. Section 7: Platform Settings (`/admin/settings`)

### 11.1 Plan Configuration

Edit plan definitions (prices, feature sets, limits) from the UI instead of code:

| Setting | Current | Editable |
|---------|---------|----------|
| Professional price | $29/mo | Yes |
| Professional email limit | 500/mo | Yes |
| Studio features | [list] | Yes (toggle) |
| Default trial duration | 14 days | Yes |
| Default trial plan | Professional | Yes (dropdown) |

Changes saved to a `platform_config` table and read at runtime. Code-level `PLANS` object becomes the fallback.

### 11.2 Feature Flag Defaults

Global feature flag overrides that apply to ALL users regardless of plan:

| Flag | Status | Description |
|------|--------|------------|
| maintenance_mode | OFF | Show maintenance banner to all users |
| new_user_signup | ON | Allow new account creation |
| ai_content_generation | ON | Enable Claude API calls |
| email_sending | ON | Enable Resend email delivery |
| voice_agent | ON | Enable voice agent sessions |

Kill switches for the platform. Toggling `email_sending` OFF immediately stops all outbound email.

### 11.3 Announcement Banner

Create a banner message that appears at the top of every user's dashboard:
- Message text (markdown)
- Type: info / warning / critical
- Start date + end date (auto-dismiss)
- Dismissible or persistent

---

## 12. Database Architecture

### 12.1 New Table: `platform_analytics`

```sql
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
CREATE POLICY "Admin read" ON platform_analytics FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Service write" ON platform_analytics FOR INSERT WITH CHECK (true);
```

### 12.2 Audit Logging (via `platform_analytics`)

> **Implementation decision:** No separate `admin_audit_log` table. Admin actions are stored in `platform_analytics` with `event_name = 'admin_action'` and `metadata` containing `before_state`/`after_state`. Same RLS, same indexes, same query pattern — a separate table doubles migration and query surface for zero benefit. See `IMPL_Admin_Panel.md` Section 1.1 for rationale.

### 12.3 New Table: `platform_config`

```sql
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only" ON platform_config FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Seed defaults
INSERT INTO platform_config (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('new_user_signup', 'true'),
  ('ai_content_generation', 'true'),
  ('email_sending', 'true'),
  ('voice_agent', 'true'),
  ('default_trial_days', '14'),
  ('default_trial_plan', '"professional"'),
  ('announcement', 'null')
ON CONFLICT (key) DO NOTHING;
```

### 12.4 New Columns on `users`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'organic';
-- Updated on every login via auth.ts signIn callback
-- plan_history, plan_changed_at, total_sessions NOT added — derivable from platform_analytics events
```

> **Implementation note:** `plan_history` is reconstructible from `platform_analytics WHERE event_name = 'plan_changed'`. Denormalizing it onto users creates write-amplification and stale-data risk. See `IMPL_Admin_Panel.md` Section 2 for rationale.

### 12.5 Event Schema (10 Event Types)

> **Implementation decision:** Reduced from 20 to 10 event types. Page views use Vercel Analytics. Errors use Sentry. Email events use existing `newsletter_events` table. Onboarding start/complete are derivable from step events. See `IMPL_Admin_Panel.md` Section 2 for full rationale.

| Event Name | When Fired | Metadata |
|-----------|------------|----------|
| `signup` | User creates account (auth.ts signIn callback, new user) | `{ method: "email" \| "google", source }` |
| `session_start` | Existing user logs in (auth.ts signIn callback) | `{ user_agent }` |
| `onboarding_step` | User advances or skips a step (onboarding.ts) | `{ step: 1-7, action: "completed" \| "skipped" }` |
| `feature_used` | User creates a contact, listing, showing, or sends newsletter | `{ feature: "contacts" \| "listings" \| "showings" \| "newsletters", action: "create" \| "send" }` |
| `plan_changed` | Plan upgraded/downgraded (admin.ts) | `{ from, to, trigger: "admin" \| "trial_convert", before_features, after_features }` |
| `trial_started` | Trial activated (admin.ts) | `{ plan, days }` |
| `checklist_event` | Checklist item completed or checklist dismissed | `{ action: "completed" \| "dismissed", item_key?, items_completed? }` |
| `cron_run` | Cron job executes (each cron route handler) | `{ cron, status: "success" \| "error", duration_ms, error? }` |
| `admin_action` | Admin performs any mutation (admin.ts) | `{ action, target_user_id, before_state?, after_state? }` |
| `personalization` | User finishes personalization (personalization.ts) | `{ persona, market, experience }` |

**Not tracked (handled by existing tools):**
- `page_viewed` -> Vercel Analytics (free, already installed)
- `error` / `api_slow` -> Sentry (already configured) + Vercel Speed Insights (free)
- `email_sent` / `email_bounced` -> Already in `newsletter_events` table
- `drip_email_sent` / `drip_email_opened` -> Already tracked in drip sequences
- `onboarding_started` / `onboarding_completed` -> Derivable from `onboarding_step` (step 1 = started, step 7 = completed)
- `trial_expired` -> Derivable from `plan_changed` with `trigger = 'trial_expired'`

---

## 13. Event Tracking Library

> **Implementation decision:** Server-side only. No client-side library, no API route, no rate limiting. Page views handled by Vercel Analytics. See `IMPL_Admin_Panel.md` Section 1.2.

### 13.1 Server-Side (`src/lib/analytics.ts`)

```typescript
import { createAdminClient } from "@/lib/supabase/admin";

// Fire-and-forget event logging. Never throws. Never blocks.
// Call from server actions and API routes only.
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

### 13.2 Instrumentation Map (8 files + 5 cron routes)

| File | Event | Call |
|------|-------|------|
| `src/lib/auth.ts` | `signup` / `session_start` | In signIn callback. Also updates `users.last_active_at` |
| `src/actions/onboarding.ts` | `onboarding_step` | In `advanceOnboardingStep()` after step update |
| `src/actions/checklist.ts` | `checklist_event` | In `markChecklistItem()` and `dismissChecklist()` |
| `src/actions/contacts.ts` | `feature_used` | After contact create |
| `src/actions/listings.ts` | `feature_used` | After listing create |
| `src/actions/newsletters.ts` | `feature_used` | After newsletter send |
| `src/actions/showings.ts` | `feature_used` | After showing create |
| `src/actions/personalization.ts` | `personalization` | After save |
| `src/actions/admin.ts` | `admin_action` / `plan_changed` / `trial_started` | All admin mutations |
| `src/app/api/cron/*/route.ts` (5 files) | `cron_run` | Wrap handler with timing + status |

**Not instrumented (handled by existing tools):**
- `src/middleware.ts` — No `page_viewed` event. Use `@vercel/analytics` instead.
- `src/lib/resend.ts` — No `email_sent`/`email_bounced`. Use existing `newsletter_events` table.
- `src/actions/drip.ts` — No `drip_email_sent`. Already tracked in drip sequences.
- `src/app/(auth)/onboarding/page.tsx` — No client-side events. Server action covers step tracking.

---

## 14. Server Actions

> **Authoritative action list:** `IMPL_Admin_Panel.md` Section 6. Items marked **[v2]** below are deferred.

### 14.1 New File: `src/actions/analytics.ts`

```typescript
// All require admin role

// ── v1 ──
export async function getAdminOverviewKPIs(range: '7d' | '30d' | '90d')
export async function getRecentAdminActivity(limit?: number)
export async function getUsersNeedingAttention()
export async function getOnboardingFunnel(range: '7d' | '30d' | '90d')
export async function getFunnelDropoffUsers(step: number, range: string)
export async function getFeatureAdoption(range: '7d' | '30d' | '90d')
export async function getRevenueKPIs()
export async function getPlanDistribution()
export async function getTrialPipeline()
export async function getPlanChangeLog(limit?: number)
export async function getSystemHealth()
export async function getCronHistory(cronName: string, limit?: number)
export async function triggerCron(cronName: string)
export async function getEmailOpsKPIs(range: '7d' | '30d' | '90d')
export async function getPerUserEmailStats(range: '7d' | '30d' | '90d')
export async function getBounceLog(range: '7d' | '30d' | '90d')

// ── [v2] Deferred ──
// getChecklistStats()      — when checklist has tracking data
// getFeatureTimeline()     — per-feature drill-down chart
// getRetentionCohorts()    — after 90 days of data
// getRevenueTimeline()     — MRR over time chart
// getErrorLog()            — using Sentry in v1
// getAPIPerformance()      — using Vercel Speed Insights in v1
```

### 14.2 Extended: `src/actions/admin.ts`

```typescript
// Existing (keep)
export async function requireAdmin()
export async function getUsers()
export async function updateUserFeatures(userId, features)
export async function toggleUserActive(userId, isActive)

// ── v1 ──
export async function searchUsers(query: string, filters?: UserFilters)
export async function getUserDetail(userId: string)
export async function changeUserPlan(userId: string, newPlan: string)
export async function startUserTrial(userId: string, plan: string, days: number)
export async function extendUserTrial(userId: string, additionalDays: number)
export async function resetUserOnboarding(userId: string)
export async function deleteUser(userId: string)
export async function createUser(data: { email: string; name: string; plan: string })
export async function bulkChangePlan(userIds: string[], plan: string)
export async function bulkToggleFeature(userIds: string[], feature: string, enabled: boolean)
export async function bulkToggleActive(userIds: string[], isActive: boolean)
export async function updateAdminUserFields(userId: string, fields: Partial<User>)

// ── [v2] Deferred ──
// impersonateUser(userId)            — use Supabase impersonate in v1
// getAuditLog(filters)               — query platform_analytics directly
// getPlatformConfig/updatePlatformConfig — settings page deferred
// setAnnouncementBanner(...)          — simplified into QuickActions modal
```

---

## 15. Implementation Plan

> **Note:** The authoritative implementation plan is `IMPL_Admin_Panel.md`, which consolidates these 4 phases into 3 (Phase 0 Foundation + Phases 1-3), cuts scope per engineering review, and includes task-level dependencies. The phases below reflect the original PRD scope; see IMPL for what's actually being built in v1.

### Phase 1: Foundation (Must have first)

| # | Deliverable | Files |
|---|------------|-------|
| 1.1 | Migration 104: `platform_analytics`, `platform_config` tables + `users` columns + `signup_events` bug fix | `supabase/migrations/104_platform_analytics.sql` |
| 1.2 | Event tracking library (server-side only) | `src/lib/analytics.ts` |
| 1.3 | Instrument existing code (all files in instrumentation map) | ~12 files modified |
| 1.4 | Admin layout upgrade (sidebar nav, mobile tabs) | `src/app/(admin)/layout.tsx` |
| 1.5 | Admin middleware guard | `src/middleware.ts` (add `/admin/*` role check) |

### Phase 2: User Management (Highest operational value)

| # | Deliverable | Files |
|---|------------|-------|
| 2.1 | User table with search, filter, sort, bulk actions | `src/app/(admin)/admin/users/page.tsx`, `src/components/admin/UserTable.tsx` |
| 2.2 | User detail page (5 tabs) | `src/app/(admin)/admin/users/[id]/page.tsx`, `src/components/admin/UserDetail*.tsx` |
| 2.3 | Plan management actions (change, trial start/extend) | `src/actions/admin.ts` (extend) |
| 2.4 | Audit logging on all admin mutations | `src/actions/admin.ts` (wrap mutations) |
| 2.5 | Migrate existing admin page to `/admin/users` | `src/app/(admin)/admin/page.tsx` becomes overview |

### Phase 3: Analytics & Revenue

| # | Deliverable | Files |
|---|------------|-------|
| 3.1 | Overview dashboard (KPIs, activity feed, quick actions) | `src/app/(admin)/admin/page.tsx` |
| 3.2 | Platform analytics page (funnel, adoption, retention) | `src/app/(admin)/admin/analytics/page.tsx`, 4 components |
| 3.3 | Revenue page (MRR, plan distribution, trials, timeline) | `src/app/(admin)/admin/revenue/page.tsx`, 4 components |
| 3.4 | Install Recharts, build chart components | `package.json`, `src/components/admin/charts/` |

### Phase 4: Operations

| # | Deliverable | Files |
|---|------------|-------|
| 4.1 | System health page (cron monitor, errors, API perf) | `src/app/(admin)/admin/system/page.tsx`, 3 components |
| 4.2 | Email operations page (delivery stats, per-user, bounces) | `src/app/(admin)/admin/emails/page.tsx`, 3 components |
| 4.3 | Platform settings page (config, feature flags, announcements) | `src/app/(admin)/admin/settings/page.tsx`, 3 components |
| 4.4 | Move voice analytics under admin panel | Relocate from `(dashboard)/admin/` to `(admin)/admin/voice/` |

---

## 16. Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/104_platform_analytics.sql` | Tables: platform_analytics, platform_config + users columns + signup_events fix |
| `src/lib/analytics.ts` | Server-side event tracking (trackEvent) |
| `src/actions/analytics.ts` | All admin analytics query actions |
| `src/app/(admin)/admin/page.tsx` | Overview dashboard (replace current user list) |
| `src/app/(admin)/admin/users/page.tsx` | User management table |
| `src/app/(admin)/admin/users/[id]/page.tsx` | User detail page |
| `src/app/(admin)/admin/analytics/page.tsx` | Platform analytics |
| `src/app/(admin)/admin/revenue/page.tsx` | Revenue & plans |
| `src/app/(admin)/admin/system/page.tsx` | System health |
| `src/app/(admin)/admin/emails/page.tsx` | Email operations |
| `src/app/(admin)/admin/settings/page.tsx` | Platform settings |
| `src/components/admin/AdminSidebar.tsx` | Admin panel sidebar navigation |
| `src/components/admin/OverviewKPIs.tsx` | 6 KPI cards with sparklines |
| `src/components/admin/RecentActivity.tsx` | Activity feed |
| `src/components/admin/QuickActions.tsx` | Quick action panel |
| `src/components/admin/UserTable.tsx` | Searchable, filterable user DataTable |
| `src/components/admin/UserDetailProfile.tsx` | User detail: Profile tab |
| `src/components/admin/UserDetailActivity.tsx` | User detail: Activity tab |
| `src/components/admin/UserDetailData.tsx` | User detail: Data tab |
| `src/components/admin/UserDetailEmails.tsx` | User detail: Emails tab |
| `src/components/admin/UserDetailBilling.tsx` | User detail: Billing tab |
| `src/components/admin/OnboardingFunnel.tsx` | Funnel visualization |
| `src/components/admin/ChecklistStats.tsx` | Checklist donut chart |
| `src/components/admin/FeatureAdoptionTable.tsx` | Feature usage table |
| `src/components/admin/RetentionCohorts.tsx` | Retention heatmap |
| `src/components/admin/RevenueKPIs.tsx` | Revenue cards |
| `src/components/admin/PlanDistribution.tsx` | Plan donut + table |
| `src/components/admin/TrialPipeline.tsx` | Trial status table |
| `src/components/admin/CronMonitor.tsx` | Cron job status table |
| `src/components/admin/ErrorLog.tsx` | Error log table |
| `src/components/admin/APIPerformance.tsx` | API latency table |
| `src/components/admin/EmailKPIs.tsx` | Email delivery stats |
| `src/components/admin/EmailUserTable.tsx` | Per-user email stats |
| `src/components/admin/PlatformConfigEditor.tsx` | Config key-value editor |
| `src/components/admin/FeatureFlagPanel.tsx` | Global feature flag toggles |
| `src/components/admin/AnnouncementEditor.tsx` | Banner message editor |

### Files to Modify

| File | Change |
|------|--------|
| `src/app/(admin)/layout.tsx` | Replace simple header with sidebar layout |
| `src/middleware.ts` | Add `/admin/*` route protection (redirect non-admin) |
| `src/actions/admin.ts` | Add 15+ new actions (search, plan mgmt, bulk ops, impersonation) |
| `src/app/(auth)/onboarding/page.tsx` | Add trackEvent calls for step transitions |
| `src/actions/onboarding.ts` | Track onboarding_completed |
| `src/actions/checklist.ts` | Track checklist events |
| `src/actions/contacts.ts` | Track feature_used (create) |
| `src/actions/listings.ts` | Track feature_used (create) |
| `src/actions/newsletters.ts` | Track feature_used (send) |
| `src/actions/showings.ts` | Track feature_used (create) |
| `src/lib/auth.ts` | Track signup, session_start, update last_active_at |
| `src/lib/resend.ts` | Track email_sent, email_bounced |
| `src/app/api/cron/*/route.ts` | Wrap handlers with cron_run tracking |
| `package.json` | Add recharts dependency |

---

## 17. Design Guidelines

- **Follow existing admin layout pattern**: `bg-card border-border rounded-lg`, no glassmorphism
- Use `PageHeader` component with tabs where applicable
- Use `DataTable` component for all tables (sorting, filtering, pagination built in)
- Cards: `bg-card border border-border rounded-lg p-4 shadow-sm`
- Status badges: green (`bg-emerald-50 text-emerald-700`), amber (`bg-amber-50 text-amber-700`), red (`bg-red-50 text-red-700`)
- Charts: Recharts with `--primary` (navy) and `--brand` (coral) color palette
- Sparklines: KPI cards = 80px wide, 32px tall; adoption table = 60px wide, 24px tall. No axes, no labels, just the line.
- All numbers use `Intl.NumberFormat` for proper formatting
- Currency: USD for plan/subscription amounts (format as `$1,234`). Note: CRM listing prices use CAD (`en-CA` locale). Admin panel only displays plan revenue, so USD is correct here.
- Percentages: one decimal place (`42.5%`)
- Dates: relative where recent (`2h ago`), absolute where historic (`Apr 10, 2026`)

---

## 17.5 Impersonation — Technical Spec [v2]

> **Deferred to v2.** Use Supabase Auth dashboard impersonation in v1. Build this when support volume exceeds 5 tickets/week. Spec preserved for v2 implementation.

Impersonation allows the admin to view the CRM as a specific user without knowing their credentials.

**Mechanism:**
1. Admin clicks "Impersonate" on a user row or user detail page
2. Server action `impersonateUser(userId)` validates admin role, creates a signed JWT containing `{ impersonating: userId, adminId: session.user.id, expiresAt: now + 30min }`
3. JWT is stored in a `__impersonate` cookie (httpOnly, secure, 30-min TTL)
4. `getAuthenticatedTenantClient()` checks for the impersonate cookie — if present, uses the target `userId` as `realtorId` instead of the admin's
5. All mutations are **blocked** during impersonation (return `{ error: "Read-only: impersonation mode" }`)
6. A banner renders at the top of every page: `bg-amber-50 border-amber-200 text-amber-800` — "You are viewing as [user name]. [Exit Impersonation]"
7. "Exit" clears the cookie and redirects to `/admin/users/[id]`
8. Every impersonation start/end is logged to `platform_analytics` as `admin_action` events

**Security:**
- Impersonation cookie is separate from the admin's auth session (admin stays logged in as admin)
- Max duration: 30 minutes, non-renewable
- Cannot impersonate another admin

## 17.6 Announcement Banner — Consumer Spec

The announcement set by admin in `/admin/settings` must render for all users.

**Consumer component:** `src/components/layout/AnnouncementBanner.tsx`
- Reads `platform_config` key `announcement` via a lightweight API route `GET /api/platform/announcement`
- Renders above the main content area in `DashboardShellClient.tsx`, below the header
- Does NOT push sidebar or header — sits between header and content
- Cached for 5 minutes (SWR or server-side cache) to avoid per-request DB hits
- Types: `bg-blue-50 border-blue-200 text-blue-800` (info), `bg-amber-50` (warning), `bg-red-50` (critical)
- Dismissible: if enabled, dismiss state stored in `localStorage` keyed by announcement hash
- Auto-remove: if `endDate` is past, component renders nothing

## 17.7 Error & API Latency Capture

Events `error` and `api_slow` require instrumentation at the framework level, not per-file.

**Error capture:**
- Create `src/app/error.tsx` (Next.js App Router global error boundary) that calls `trackEvent('error', userId, { message, stack, route })`
- For API routes: wrap existing handlers with a try/catch utility that logs to `platform_analytics` on unhandled exceptions
- For server actions: errors returned as `{ error: string }` are NOT tracked (expected behavior). Only unhandled throws are captured.

**API latency capture:**
- Add timing logic in `src/middleware.ts`: record `Date.now()` at request start, and on response, if `duration > 3000ms`, fire `trackEvent('api_slow', ...)` asynchronously
- Only instrument `/api/*` routes (not page navigations)
- Sample rate: 100% for slow requests (>3s), since they're rare

## 17.8 Migration Transition Plan

During implementation, the admin panel must remain functional between phases:

- **Phase 1:** Current `/admin` page (user cards) stays as-is. New sidebar layout wraps it. Analytics tracking starts collecting data silently.
- **Phase 2:** User cards page moves to `/admin/users`. `/admin` still shows user cards as a redirect/fallback until Phase 3.
- **Phase 3:** `/admin` becomes the Overview dashboard. All sections go live.
- **Phase 4:** Operational pages added. Voice analytics relocated.

At no point should the admin panel be broken or empty during the rollout.

---

## 18. Performance Considerations

- All analytics queries are date-range-bounded (never full table scans)
- KPI queries use `COUNT` with `WHERE created_at > now() - interval '7 days'`
- Retention calculation uses a CTE joining signup events with subsequent sessions
- Event volume estimate: ~10 events/user/session, ~100 users = ~1,000 events/day = ~30K/month (well within Supabase limits)
- No aggregation tables needed at this scale -- raw queries are fast enough
- Client-side event tracking is fire-and-forget (sendBeacon fallback, never blocks UI)
- Analytics page components use `Suspense` boundaries so sections load independently
- Consider adding `platform_analytics_monthly` materialized view if query times exceed 500ms

---

## 19. Security & Privacy

- All admin routes protected by `requireAdmin()` + middleware redirect
- No PII in `platform_analytics.metadata` (no names, emails, phones in JSONB)
- `user_id` is a UUID reference, not an email
- Admin audit log records every mutation with admin ID, target, before/after state
- Impersonation creates a read-only session with visible "Viewing as [user]" banner
- Impersonation sessions logged in audit trail (who, when, duration)
- Platform config changes logged in audit trail
- Event ingestion API validates event names against allowlist
- Client event API rate-limited to 100/min per user

---

## 20. Acceptance Criteria

### Phase 1: Foundation
1. `platform_analytics` table created with indexes + RLS
2. `trackEvent()` fires from all instrumented locations without blocking the UI
3. Admin layout has sidebar with 7 navigation items
4. Non-admin users redirected away from `/admin/*` via middleware
5. `platform_analytics` records all admin mutations as `admin_action` events with before/after state

### Phase 2: User Management
6. User table supports search by name/email, filter by plan/status, sort by any column
7. User detail page shows all 5 tabs with real data
8. Admin can change a user's plan and it takes effect immediately
9. Admin can start/extend trials with configurable duration
10. Bulk actions work for plan change, feature toggle, and activate/deactivate
11. Every admin action creates an audit log entry

### Phase 3: Analytics & Revenue
12. Overview dashboard shows 6 KPI cards with real data + sparklines
13. Onboarding funnel shows accurate step-by-step drop-off
14. Feature adoption table shows real usage data sorted by adoption %
15. Revenue page shows accurate MRR, plan distribution, trial pipeline
16. Retention cohort heatmap renders with correct cell colors

### Phase 4: Operations
17. Cron monitor shows real last-run data for all cron jobs
18. Error log shows grouped errors with stack traces
19. Email operations shows delivery rates from Resend webhook data
20. Platform settings page can toggle kill switches and update config
21. Announcement banner appears for all users when set

---

## 21. Out of Scope (v1)

- Stripe/payment integration (upgrade still via email/manual)
- Real-time WebSocket updates (polling with refresh is fine)
- Multi-admin roles (support, read-only) -- binary admin/realtor is sufficient for now
- White-label per-brokerage theming
- Data export to CSV/JSON
- Automated alerting (email admin on spike)
- A/B test management
- Custom report builder
- Tenant API key management UI (tables exist, UI deferred)
