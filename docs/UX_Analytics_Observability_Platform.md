<!-- docs-audit-reviewed: 2026-04-25 --sidebar-a11y-contrast -->
<!-- docs-audit: src/app/(admin)/admin/analytics/**, src/app/(dashboard)/page.tsx, src/components/analytics/**, src/components/admin/** -->
# UX Design Document: Analytics & Observability Platform — Realtors360

**Author:** Claude (Senior UX Designer, on behalf of Bigbear)
**Date:** 2026-04-12
**PRD Reference:** `docs/PRD_Analytics_Observability_Platform.md`
**Status:** Reviewed (5 passes — accuracy, scope, technical, edge cases, polish)
**Version:** 1.1
**Design System:** Realtors360 HubSpot-inspired flat design (Tailwind v4 + CSS custom properties)

---

## Table of Contents

1. [UX Review of PRD](#1-ux-review-of-prd)
2. [Information Architecture](#2-information-architecture)
3. [User Flows](#3-user-flows)
4. [Component Inventory](#4-component-inventory)
5. [Page Layouts — Super Admin Analytics](#5-page-layouts--super-admin-analytics)
6. [Page Layouts — Realtor Dashboard Widgets](#6-page-layouts--realtor-dashboard-widgets)
7. [Page Layouts — Newsletter Analytics Enhancement](#7-page-layouts--newsletter-analytics-enhancement)
8. [Shared Component Specifications](#8-shared-component-specifications)
9. [Interaction Design](#9-interaction-design)
10. [Responsive Design](#10-responsive-design)
11. [Accessibility](#11-accessibility)
12. [Empty, Loading, and Error States](#12-empty-loading-and-error-states)
13. [Dark Mode Considerations](#13-dark-mode-considerations)
14. [Motion & Animation](#14-motion--animation)
15. [Design Tokens Reference](#15-design-tokens-reference)
16. [Implementation Priority Map](#16-implementation-priority-map)

---

## 1. UX Review of PRD

### 1.1 Strengths

| PRD Section | UX Assessment |
|-------------|--------------|
| FR-4 (Admin Dashboard) | Clear KPI hierarchy — 8 cards → charts → tables → operational is a proven analytics layout pattern |
| FR-5 (Realtor Widgets) | Smart to embed analytics into existing dashboard rather than a separate page — reduces navigation friction |
| FR-6 (Sentry Enhancement) | Invisible to users — pure engineering win, no UX surface needed |
| Event Taxonomy (Section 10) | Well-structured naming convention — enables clean filtering UI |
| Phase 2/3 separation | Correctly prioritizes foundation (tracking) before visualization (dashboards) |

### 1.2 UX Gaps & Recommendations

| # | PRD Gap | UX Recommendation | Impact |
|---|---------|-------------------|--------|
| UX-1 | Admin dashboard specifies 8 KPI cards in a row — that's too dense on 1024px screens | Use a **2-row x 4-column grid** that collapses to **2x2 on tablet**, **1x4 stack on mobile**. Group cards: Row 1 = Business (MAU, MRR, Trial, AI Cost), Row 2 = Operations (Email, Errors, Latency, Crons) | High |
| UX-2 | Feature adoption table has no visual weight hierarchy | Add **colored usage bars** (horizontal fill) next to percentages — humans process visual length faster than numbers | High |
| UX-3 | Activation funnel described as "horizontal funnel chart" — unclear spec | Design as a **vertical step funnel** with dropout percentages between stages (HubSpot/Amplitude pattern) — horizontal funnels waste space | Medium |
| UX-4 | No specification for date range picker interaction | Design a **preset + custom** date picker: quick pills (7d, 30d, 90d) + calendar range selector | Medium |
| UX-5 | Cron health dashboard has no visual urgency hierarchy | Use **traffic light indicators** (green/amber/red dots) + **overdue row highlighting** (red-tinted background) | Medium |
| UX-6 | No mention of data refresh behavior or staleness indicators | Add **"Last updated X ago"** timestamp + **auto-refresh toggle** (60s default) with visual pulse on refresh | Low |
| UX-7 | Realtor personal widgets lack comparison benchmarks | Show **"vs. industry average"** inline comparisons (e.g., "Your open rate: 28% vs. 21% avg") with green/red delta arrows | High |
| UX-8 | PRD specifies audit log viewer but no interaction design | Design as a **filterable activity feed** with entity-type icons, not a raw database table — humans scan icons faster than text columns | Medium |
| UX-9 | No onboarding/empty state for new admin with zero data | Design **"Getting Started" card** that shows when <7 days of data exists — explains what analytics will show once data accumulates | Low |
| UX-10 | AI cost breakdown has no alert/budget threshold UI | Add optional **budget line** on cost chart + **"Set alert"** button that warns when monthly AI cost exceeds threshold | Medium |

### 1.3 Surfaces That Need UI (Complete List)

| Surface | Location | Type | PRD Reference |
|---------|----------|------|--------------|
| **Admin Analytics Dashboard** | `/admin/analytics` | New page (4 tabs) | FR-4 |
| **Admin Audit Log Viewer** | `/admin/audit` | New page | FR-7 |
| **Dashboard Email Widget** | `/dashboard` (existing page) | New widget | FR-5.1 |
| **Dashboard Response Time Widget** | `/dashboard` (existing page) | New widget | FR-5.1 |
| **Dashboard Pipeline Enhancement** | `/dashboard` (existing page) | Widget modification | FR-5.1 |
| **Newsletter Conversion Funnel** | `/newsletters/analytics` (existing page) | New section | FR-5.2, FR-8 |
| **Newsletter Deliverability Health** | `/newsletters/analytics` (existing page) | New section | FR-5.2 |
| **Newsletter A/B Significance** | `/newsletters/analytics` (existing page) | Component enhancement | FR-5.2 |
| **Date Range Picker** | Shared component | Reusable | Multiple |
| **KPI Card** | Shared component | Reusable | Multiple |
| **Metric Sparkline** | Shared component | Reusable | Multiple |
| **Funnel Chart** | Shared component | Reusable | FR-4.4 |
| **Usage Bar** | Shared component | Reusable | FR-4.3 |
| **Traffic Light Indicator** | Shared component | Reusable | FR-4.6 |
| **Trend Arrow** | Shared component | Reusable | Multiple |

---

## 2. Information Architecture

### 2.1 Admin Analytics — Tab Structure

The admin analytics page uses PageHeader tabs (matching existing CRM pattern in newsletters, contacts, etc.).

```
/admin/analytics
├── Overview (default tab)      ← KPI cards + charts + feature adoption
├── Users                       ← Lifecycle funnel + retention + per-user table
├── Costs                       ← AI cost breakdown + per-realtor + budget
└── Operations                  ← Cron health + error log + API latency
```

**Rationale:** Four tabs keep each view focused. The Overview tab answers "how is the business doing?" in one glance. Users, Costs, and Operations are drill-downs for specific questions.

### 2.2 Admin Audit Log — Separate Page

```
/admin/audit
├── Activity Feed (default)     ← Filterable timeline of all audit events
└── Filters sidebar             ← Entity type, action, realtor, date range
```

**Rationale:** Audit log is a compliance/debugging tool — separate from analytics to avoid cluttering the business dashboard. Linked from admin sidebar and from admin analytics → Operations tab.

### 2.3 Realtor Dashboard — Widget Placement

```
/dashboard (existing page)
├── Row 1: TodaysPriorities (existing, full width)
├── Row 2: [AIRecommendations (existing)] [DashboardPipelineWidget (ENHANCED)]
├── Row 3: [Email Performance Widget (NEW)] [Response Time Widget (NEW)]
├── Row 4: [ActivityFeed (existing, full width)]
```

**Rationale:** Existing AI recommendations and pipeline widgets stay in Row 2 (they are already in production). New analytics widgets slot into Row 3, between pipeline (status) and activity feed (history). This follows the information scent: "What should I do?" → "Where are my deals?" → "How am I performing?" → "What happened recently?"

> **Note:** The existing dashboard also renders `PipelineSnapshot` and `RemindersWidget` conditionally. The layout must account for these without breaking existing content.

### 2.4 Sidebar Navigation Updates

**Admin section in MondaySidebar (existing "Admin" group):**

```
Admin
├── Users           (existing)
├── Analytics       (NEW — BarChart3 icon)
├── Audit Log       (NEW — ScrollText icon)
└── Voice Analytics (existing, moved from dashboard)
```

---

## 3. User Flows

### 3.1 Admin Checks Business Health (Daily Ritual)

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│ Admin opens  │────→│ /admin/analytics │────→│ Scans 8 KPI cards  │
│ admin panel  │     │ (Overview tab)   │     │ (5-second glance)  │
└─────────────┘     └──────────────────┘     └────────┬───────────┘
                                                       │
                    ┌──────────────────┐               │
                    │ Notices error     │←── Red KPI ──┘
                    │ rate card is red  │    card catches
                    └────────┬─────────┘    attention
                             │
                    ┌────────▼─────────┐     ┌────────────────────┐
                    │ Clicks "Ops" tab │────→│ Sees recent errors │
                    │                  │     │ + failing cron      │
                    └──────────────────┘     └────────┬───────────┘
                                                       │
                    ┌──────────────────┐               │
                    │ Clicks error row │←──────────────┘
                    │ → opens Sentry   │
                    └──────────────────┘
```

### 3.2 Admin Evaluates Feature Investment

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ Admin opens  │────→│ Overview tab     │────→│ Scrolls to Feature  │
│ analytics    │     │                  │     │ Adoption table      │
└─────────────┘     └──────────────────┘     └────────┬────────────┘
                                                       │
                    ┌──────────────────┐               │
                    │ Sorts by "Users" │←──────────────┘
                    │ column (asc)     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐     ┌────────────────────┐
                    │ Sees "Voice Agent"│────→│ Decision: pause     │
                    │ used by 2% of    │     │ voice agent dev,    │
                    │ realtors         │     │ invest in email     │
                    └──────────────────┘     └────────────────────┘
```

### 3.3 Realtor Checks Email Performance

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────────┐
│ Realtor logs │────→│ /dashboard       │────→│ Sees Email Perf    │
│ in           │     │ (home page)      │     │ widget in Row 2    │
└──────────────┘     └──────────────────┘     └────────┬───────────┘
                                                        │
                     ┌──────────────────┐               │
                     │ Sees "28% open   │←──────────────┘
                     │ rate (↑ vs 21%   │
                     │ industry avg)"   │
                     └────────┬─────────┘
                              │
                     ┌────────▼──────────┐     ┌────────────────────┐
                     │ Clicks "View all" │────→│ /newsletters/      │
                     │ link              │     │ analytics          │
                     └───────────────────┘     └────────────────────┘
```

### 3.4 Admin Investigates Compliance Event

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│ Admin opens  │────→│ /admin/audit     │────→│ Sees timeline of   │
│ audit log    │     │                  │     │ all events         │
└─────────────┘     └──────────────────┘     └────────┬───────────┘
                                                       │
                    ┌──────────────────┐               │
                    │ Filters by       │←──────────────┘
                    │ entity="contact" │
                    │ action="delete"  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐     ┌─────────────────────┐
                    │ Sees: "John D.   │────→│ Expands row → sees  │
                    │ deleted contact  │     │ before_snapshot +   │
                    │ #1234 at 3:14pm" │     │ who + why           │
                    └──────────────────┘     └─────────────────────┘
```

---

## 4. Component Inventory

### 4.1 New Shared Components (Reusable)

| Component | File Path | Used In | Props |
|-----------|----------|---------|-------|
| `DateRangePicker` | `src/components/analytics/DateRangePicker.tsx` | Admin analytics, newsletter analytics | `value`, `onChange`, `presets` |
| `KpiCard` | `src/components/analytics/KpiCard.tsx` | Admin analytics, dashboard widgets | `label`, `value`, `trend`, `trendDirection`, `icon`, `status` |
| `Sparkline` | `src/components/analytics/Sparkline.tsx` | KpiCard, feature table | `data`, `color`, `width`, `height` |
| `TrendArrow` | `src/components/analytics/TrendArrow.tsx` | KpiCard, email widget | `value`, `direction`, `suffix` |
| `FunnelChart` | `src/components/analytics/FunnelChart.tsx` | Admin users tab, newsletter analytics | `stages`, `showDropoff` |
| `UsageBar` | `src/components/analytics/UsageBar.tsx` | Feature adoption table | `value`, `max`, `color`, `label` |
| `TrafficLight` | `src/components/analytics/TrafficLight.tsx` | Cron health table | `status` |
| `MetricComparison` | `src/components/analytics/MetricComparison.tsx` | Realtor widgets | `value`, `benchmark`, `label`, `unit` |
| `TimeAgo` | `src/components/analytics/TimeAgo.tsx` | Cron table, audit log | `timestamp` |
| `RefreshIndicator` | `src/components/analytics/RefreshIndicator.tsx` | Admin analytics header | `lastUpdated`, `isAutoRefresh`, `onToggle` |

### 4.2 New Page Components

| Component | File Path | Description |
|-----------|----------|-------------|
| `AdminAnalyticsPage` | `src/app/(admin)/admin/analytics/page.tsx` | Server component — data fetching + layout |
| `AdminAnalyticsClient` | `src/components/admin/AdminAnalyticsClient.tsx` | Client component — tabs, charts, interactivity |
| `OverviewTab` | `src/components/admin/analytics/OverviewTab.tsx` | KPIs + charts + feature adoption |
| `UsersTab` | `src/components/admin/analytics/UsersTab.tsx` | Funnel + retention + user table |
| `CostsTab` | `src/components/admin/analytics/CostsTab.tsx` | AI cost breakdown + per-realtor |
| `OperationsTab` | `src/components/admin/analytics/OperationsTab.tsx` | Cron health + errors + latency |
| `AdminAuditPage` | `src/app/(admin)/admin/audit/page.tsx` | Audit log viewer |
| `AuditFeed` | `src/components/admin/AuditFeed.tsx` | Filterable audit timeline |
| `EmailPerformanceWidget` | `src/components/dashboard/EmailPerformanceWidget.tsx` | Realtor dashboard widget |
| `ResponseTimeWidget` | `src/components/dashboard/ResponseTimeWidget.tsx` | Realtor dashboard widget |
| `ConversionFunnel` | `src/components/newsletters/ConversionFunnel.tsx` | Newsletter analytics section |
| `DeliverabilityHealth` | `src/components/newsletters/DeliverabilityHealth.tsx` | Newsletter analytics section |

### 4.3 Existing Components to Modify

| Component | Change | Reason |
|-----------|--------|--------|
| `MondaySidebar.tsx` | Add "Analytics" and "Audit Log" nav links in Admin group | Navigation |
| `src/app/(dashboard)/page.tsx` | Add EmailPerformanceWidget + ResponseTimeWidget to grid | New widgets |
| `DashboardPipelineWidget.tsx` | Add "days in phase" indicator + "blocked" badge | Enhancement |
| `src/app/(dashboard)/newsletters/analytics/page.tsx` | Add ConversionFunnel + DeliverabilityHealth sections | Enhancement |

---

## 5. Page Layouts — Super Admin Analytics

### 5.1 Admin Analytics — Overview Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ PageHeader                                                       │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 📊 Platform Analytics         [DateRangePicker] [↻ Auto 60s]│  │
│ ├─────────────────────────────────────────────────────────────┤  │
│ │ [Overview] [Users] [Costs] [Operations]                     │  │
│ └─────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Row 1 — Business KPIs (grid-cols-4, gap-4)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 👥 MAU   │ │ 💰 MRR   │ │ 🔄 Trial │ │ 🤖 AI    │           │
│  │ 47       │ │ $2,350   │ │ Conv     │ │ Cost     │           │
│  │ ↑12%     │ │ ↑8%      │ │ 34%      │ │ $127     │           │
│  │ ▁▂▃▄▅▆▇ │ │ ▁▂▃▃▄▅▆ │ │ ↓2%      │ │ ↑15%     │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  Row 2 — Operations KPIs (grid-cols-4, gap-4)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 📧 Email │ │ ⚠️ Error │ │ ⚡ Avg   │ │ ⏱ Crons  │           │
│  │ Sent     │ │ Rate     │ │ Latency  │ │ Health   │           │
│  │ 1,234    │ │ 0.3%     │ │ 142ms    │ │ 24/25 ✓  │           │
│  │ ↑22%     │ │ ↓0.1%    │ │ ↓12ms    │ │ 1 failed │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  Row 3 — Charts (grid-cols-2, gap-6)                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐        │
│  │ User Activity (30d)     │ │ AI Cost Breakdown       │        │
│  │                         │ │                         │        │
│  │  ╭────╮                 │ │  ┌─┐                    │        │
│  │ ─╯    ╰──╮    ╭───     │ │  │ │ ┌─┐                │        │
│  │          ╰────╯         │ │  │ │ │ │ ┌─┐ ┌─┐       │        │
│  │                         │ │  │ │ │ │ │ │ │ │       │        │
│  │ — DAU  — WAU  — MAU    │ │  █ Newsletter  █ MLS    │        │
│  │                         │ │  █ RAG  █ Content       │        │
│  └─────────────────────────┘ └─────────────────────────┘        │
│                                                                  │
│  Row 4 — Feature Adoption Table (full width)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Feature Adoption                              [Sort ▾]   │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Feature          │ Users    │ Usage Bar   │ Events │ 7d  │   │
│  ├──────────────────┼──────────┼─────────────┼────────┼─────┤   │
│  │ 📧 Email Engine  │ 89% ████████████████░░│ 3,421  │ ▅▆▇ │   │
│  │ 👥 Contacts      │ 94% █████████████████░│ 5,102  │ ▆▆▇ │   │
│  │ 🏠 Listings      │ 76% ██████████████░░░░│ 1,847  │ ▄▅▅ │   │
│  │ 📅 Showings      │ 52% ██████████░░░░░░░░│   892  │ ▃▃▄ │   │
│  │ 🔍 Cmd+K Search  │ 31% ██████░░░░░░░░░░░│   421  │ ▂▃▃ │   │
│  │ 🎤 Voice Agent   │  2% █░░░░░░░░░░░░░░░░│    18  │ ▁▁▁ │   │
│  └──────────────────┴──────────┴─────────────┴────────┴─────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**KPI Card Specification:**

```
┌─────────────────────────────────┐
│  ┌────┐                        │
│  │ 👥 │  Monthly Active Users  │   ← icon (emoji) + label (text-xs text-muted-foreground)
│  └────┘                        │
│                                │
│  47                            │   ← value (text-2xl font-bold text-foreground)
│                                │
│  ↑ 12% vs prior period        │   ← trend (text-xs, green if positive, red if negative)
│  ▁▂▃▄▅▆▇                      │   ← sparkline (24px height, chart-1 color)
└─────────────────────────────────┘

Card container:
  class="bg-card border border-border rounded-xl p-4 space-y-2 elevation-2"
  hover: "hover:elevation-4 transition-shadow duration-200"
  
Status-based left border:
  healthy:  "border-l-4 border-l-success"       (green)
  warning:  "border-l-4 border-l-[#f5c26b]"     (amber)  
  critical: "border-l-4 border-l-destructive"    (red)
  neutral:  "border-l-4 border-l-border"         (grey — default)
```

### 5.2 Admin Analytics — Users Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ [Overview] [Users*] [Costs] [Operations]                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Activation Funnel (full width card)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  Signed Up  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  52      │   │
│  │                                        ↓ 81% converted   │   │
│  │  Onboarded  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    42      │   │
│  │  (wizard + personalization complete)  ↓ 74% converted    │   │
│  │  Activated  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       31      │   │
│  │  (first non-sample listing or contact)                    │   │
│  │                                        ↓ 68% converted   │   │
│  │  Engaged   ━━━━━━━━━━━━━━━━━━━━━                21      │   │
│  │                                        ↓ 81% converted   │   │
│  │  Retained  ━━━━━━━━━━━━━━━━━                    17      │   │
│  │                                        ↓ 71% converted   │   │
│  │  Paying    ━━━━━━━━━━━━━━                       12      │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Two-column layout (grid-cols-2, gap-6)                          │
│  ┌─────────────────────────┐ ┌─────────────────────────┐        │
│  │ Retention Curve         │ │ Plan Distribution       │        │
│  │                         │ │                         │        │
│  │  100%─╮                 │ │      ┌────────────┐     │        │
│  │   80% ╰─╮              │ │      │ Free   42% │     │        │
│  │   60%   ╰──╮           │ │      │ Pro    31% │     │        │
│  │   40%      ╰────       │ │      │ Studio 19% │     │        │
│  │   20%                   │ │      │ Team    8% │     │        │
│  │    D1  D7  D14  D30    │ │      └────────────┘     │        │
│  └─────────────────────────┘ └─────────────────────────┘        │
│                                                                  │
│  User Table (full width, DataTable)                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [Search users...]                    [Plan ▾] [Status ▾] │   │
│  ├──────────┬────────┬────────┬────────┬────────┬───────────┤   │
│  │ Name     │ Plan   │ Status │ DAU/7d │ Top    │ Last Seen │   │
│  │          │        │        │        │Feature │           │   │
│  ├──────────┼────────┼────────┼────────┼────────┼───────────┤   │
│  │ Jane R.  │ Pro    │ 🟢 Act │ 5/7    │ Email  │ 2h ago    │   │
│  │ Mike T.  │ Free   │ 🟡 Trial│ 2/7   │ Listings│ 1d ago   │   │
│  │ Sarah P. │ Studio │ 🔴 Idle│ 0/7    │ —      │ 14d ago   │   │
│  └──────────┴────────┴────────┴────────┴────────┴───────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Funnel Bar Specification:**

```
Each funnel stage:
┌─────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────┐      │
│ │ Stage Label ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Count    │      │
│ └────────────────────────────────────────────────────┘      │
│                                  ↓ XX% converted             │
└─────────────────────────────────────────────────────────────┘

Bar container:
  class="h-10 rounded-lg overflow-hidden bg-muted"
  
Fill bar:
  class="h-full rounded-lg bg-brand transition-all duration-500"
  style="width: {percentage}%"

Conversion dropout text:
  class="text-xs text-muted-foreground text-right py-1"
  
  If conversion < 50%: text-destructive (red — needs attention)
  If conversion 50-75%: text-[#8a5a1e] (amber — monitor)
  If conversion > 75%: text-success (green — healthy)
```

### 5.3 Admin Analytics — Costs Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ [Overview] [Users] [Costs*] [Operations]                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cost Summary KPIs (grid-cols-4)                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Total    │ │ Per User │ │ Per Email│ │ Budget   │           │
│  │ $127.42  │ │ $2.71    │ │ $0.08    │ │ 64% used │           │
│  │ ↑15%     │ │ ↓3%      │ │ ↓12%     │ │ ██████░░ │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  Cost Over Time (full width — Recharts AreaChart)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  $                                 ---- Budget line ($200)│   │
│  │  150 ─                    ╭──╮                            │   │
│  │  100 ─              ╭────╯  ╰──╮                         │   │
│  │   50 ─  ╭──────────╯          ╰───                       │   │
│  │    0 ───╯                                                 │   │
│  │     Mar 12    Mar 19    Mar 26    Apr 2     Apr 9         │   │
│  │                                                           │   │
│  │  █ Newsletter  █ MLS Remarks  █ RAG Chat                  │   │
│  │  █ Content     █ Voice        █ Embeddings                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Two-column (grid-cols-2, gap-6)                                 │
│  ┌─────────────────────────┐ ┌─────────────────────────┐        │
│  │ Cost by Feature (donut) │ │ Cost by Model (donut)   │        │
│  │                         │ │                         │        │
│  │      ╭──────╮          │ │      ╭──────╮          │        │
│  │    ╭─╯ 41%  ╰─╮       │ │    ╭─╯ 68%  ╰─╮       │        │
│  │    │Newsletter │       │ │    │ Sonnet 4  │       │        │
│  │    ╰─╮  $52  ╭─╯       │ │    ╰─╮ $87  ╭─╯       │        │
│  │      ╰──────╯          │ │      ╰──────╯          │        │
│  │                         │ │                         │        │
│  │  Legend with amounts    │ │  Legend with amounts    │        │
│  └─────────────────────────┘ └─────────────────────────┘        │
│                                                                  │
│  Per-Realtor Cost Table (full width, DataTable)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Realtor   │ Plan   │ Total  │ Newsletter │ RAG  │ Other  │   │
│  ├───────────┼────────┼────────┼────────────┼──────┼────────┤   │
│  │ Jane R.   │ Pro    │ $34.21 │ $28.10     │ $4.00│ $2.11  │   │
│  │ Mike T.   │ Free   │ $18.90 │ $15.22     │ $2.50│ $1.18  │   │
│  └───────────┴────────┴────────┴────────────┴──────┴────────┘   │
│                                                                  │
│  [Set Budget Alert]  ← opens modal to set monthly limit         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Budget Progress Bar Specification:**

```
┌───────────────────────────────────────────┐
│ Budget: $127 / $200                        │
│ ████████████████████░░░░░░░░░░  64%       │
└───────────────────────────────────────────┘

Container: class="h-2 rounded-full bg-muted overflow-hidden"
Fill:
  < 70%:  class="h-full rounded-full bg-success"      (green)
  70-90%: class="h-full rounded-full bg-[#f5c26b]"    (amber)
  > 90%:  class="h-full rounded-full bg-destructive"   (red)
```

### 5.4 Admin Analytics — Operations Tab

```
┌──────────────────────────────────────────────────────────────────┐
│ [Overview] [Users] [Costs] [Operations*]                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Ops KPIs (grid-cols-4 — matches Overview/Costs tab pattern)      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Cron     │ │ Error    │ │ Latency  │ │ Uptime   │           │
│  │ Health   │ │ Rate     │ │ p50/p95  │ │ (30d)    │           │
│  │ 24/25 ✓  │ │ 0.3%     │ │ 142/380ms│ │ 99.8%    │           │
│  │ 🟡 1 warn│ │ 🟢 Normal│ │ 🟢 Good  │ │ 🟢       │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  Cron Execution Table (full width)                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ● Cron Name         │ Last Run  │ Duration│ Fail │ Next  │   │
│  ├─────────────────────┼───────────┼─────────┼──────┼───────┤   │
│  │ 🟢 daily-digest     │ 2h ago    │ 1.2s    │ 0/7  │ 6h    │   │
│  │ 🟢 process-workflows│ 15m ago   │ 3.4s    │ 0/7  │ 45m   │   │
│  │ 🟢 agent-scoring    │ 1h ago    │ 8.2s    │ 0/7  │ 5h    │   │
│  │ 🟡 rag-backfill     │ 3h ago    │ 45.1s   │ 1/7  │ 3h    │   │
│  │ 🔴 voice-cleanup    │ 26h ago   │ —       │ 3/7  │ OVERD │   │
│  └─────────────────────┴───────────┴─────────┴──────┴───────┘   │
│                                                                  │
│  Two-column (grid-cols-2, gap-6)                                 │
│  ┌─────────────────────────┐ ┌─────────────────────────┐        │
│  │ API Latency (30d)       │ │ Error Rate (30d)        │        │
│  │                         │ │                         │        │
│  │  p95─╮     ╭──╮        │ │          ╭─╮            │        │
│  │  p50 ╰─────╯  ╰──      │ │  ────────╯ ╰──────     │        │
│  │  ──────────────────     │ │                         │        │
│  │                         │ │  Mar 12      Apr 9      │        │
│  └─────────────────────────┘ └─────────────────────────┘        │
│                                                                  │
│  Recent Errors (full width — last 24h)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ⚠ TypeError: Cannot read property 'id'     │ 12x │ 2h ago │   │
│  │   /api/contacts/[id] · 3 users affected     │      │        │   │
│  │ ⚠ TimeoutError: Supabase query timeout      │  3x │ 4h ago │   │
│  │   /api/listings · 1 user affected            │      │        │   │
│  │                                     [Open in Sentry →]│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Traffic Light Specification:**

```
Status dot:
  🟢 success: class="h-2.5 w-2.5 rounded-full bg-success"
  🟡 warning: class="h-2.5 w-2.5 rounded-full bg-[#f5c26b]"
  🔴 failure: class="h-2.5 w-2.5 rounded-full bg-destructive"
  
  Warning criteria: failure_rate > 0 in last 7 days, OR last_run > 1.5x interval
  Failure criteria: failure_rate > 30% in last 7 days, OR overdue > 2x interval
  
Overdue row highlighting:
  class="bg-destructive/5"  (5% red tint on entire row)
```

### 5.5 Admin Audit Log Page

```
┌──────────────────────────────────────────────────────────────────┐
│ PageHeader                                                       │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 📜 Audit Log                            [DateRangePicker]   │  │
│ └─────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── Filter Bar ──────────────────────────────────────────┐    │
│  │ [Entity ▾] [Action ▾] [User ▾] [Search...]  [Clear all]│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Activity Feed (timeline style)                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  Today                                                   │   │
│  │  ──────                                                  │   │
│  │  ┌─┐                                                     │   │
│  │  │👤│ Jane R. updated contact "Mike Chen"     3:14 PM    │   │
│  │  └─┘ Changed: email, phone                               │   │
│  │      ▸ Show changes                                      │   │
│  │                                                          │   │
│  │  ┌─┐                                                     │   │
│  │  │🏠│ Jane R. created listing "123 Main St"   2:45 PM    │   │
│  │  └─┘ Type: residential, Price: $899,000                  │   │
│  │      ▸ Show details                                      │   │
│  │                                                          │   │
│  │  ┌─┐                                                     │   │
│  │  │🔐│ Mike T. logged in                       1:22 PM    │   │
│  │  └─┘ IP: 142.xxx.xxx.xx, Browser: Chrome 120            │   │
│  │                                                          │   │
│  │  ┌─┐                                                     │   │
│  │  │🗑│ Admin deleted contact "Old Lead"         11:05 AM   │   │
│  │  └─┘ ▸ Show before snapshot                              │   │
│  │                                                          │   │
│  │  Yesterday                                               │   │
│  │  ─────────                                               │   │
│  │  ...                                                     │   │
│  │                                                          │   │
│  │  [Load more]  (cursor-based pagination, 50 items per page,   │   │
│  │               keyed on created_at for stable ordering)       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Footer: [Export CSV ↓]  — exports filtered results (max 10K)   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Audit Feed Item Specification:**

```
┌──────────────────────────────────────────────────────┐
│ ┌────┐                                               │
│ │ 👤 │ {user} {action} {entity_type} "{entity_name}" │  ← main line
│ └────┘ {changed_fields summary}                      │  ← subtitle (text-xs text-muted-foreground)
│        ▸ Show changes                                │  ← expandable (disclosure triangle)
│                                              3:14 PM │  ← timestamp (right-aligned)
└──────────────────────────────────────────────────────┘

Entity icons:
  contact  → 👤
  listing  → 🏠
  newsletter → 📧
  showing  → 📅
  user     → 🔐
  workflow → ⚙️
  delete   → 🗑 (override, any entity)
  admin    → 🛡️

Action color coding:
  create → text-success
  update → text-foreground (default)
  delete → text-destructive
  login/logout → text-muted-foreground

Expanded "Show changes" panel:
  class="mt-2 ml-10 p-3 rounded-lg bg-muted/50 text-xs font-mono"
  
  Shows before/after diff:
    email: "old@mail.com" → "new@mail.com"
    phone: "+16045551234" → "+16045555678"
    
  Before values: class="line-through text-destructive/60"
  After values: class="text-success font-medium"
```

---

## 6. Page Layouts — Realtor Dashboard Widgets

### 6.1 Email Performance Widget

```
┌─────────────────────────────────────────────┐
│ 📧 Email Performance                [30d ▾] │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ Open Rate    │  │ Click Rate   │        │
│  │ 28.4%        │  │ 4.2%         │        │
│  │ ↑ vs 21% avg │  │ ↑ vs 2.6% avg│        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  Best performing: Market Update (42% open)  │
│                                             │
│  7-day trend:                               │
│  ▁▃▅▆▇▅▆  opens                            │
│  ▁▂▃▃▄▃▄  clicks                           │
│                                             │
│  View all analytics →                       │
└─────────────────────────────────────────────┘
```

**Widget Container:**

```
class="bg-card border border-border rounded-xl overflow-hidden"

Header:
  class="px-4 py-3 border-b border-border flex items-center justify-between"
  Title: class="text-sm font-semibold text-foreground flex items-center gap-2"
  Period selector: class="text-xs text-muted-foreground"

Body:
  class="p-4 space-y-3"

Inner metric boxes:
  class="flex gap-3"
  Each box: class="flex-1 p-3 rounded-lg bg-muted/30"
  Value: class="text-xl font-bold text-foreground"
  Comparison: class="text-xs mt-0.5"
    Better than avg: class="text-success"
    Worse than avg: class="text-destructive"

Link:
  class="text-xs text-brand hover:underline"
```

### 6.2 Response Time Widget

```
┌─────────────────────────────────────────────┐
│ ⚡ Response Time                    [30d ▾] │
├─────────────────────────────────────────────┤
│                                             │
│  Average first response                     │
│                                             │
│       ┌───────────────────────┐             │
│       │                       │             │
│       │      8 min            │             │
│       │                       │             │
│       └───────────────────────┘             │
│       🟡 Average (5-15 min)                │
│                                             │
│  Breakdown:                                 │
│  Email:    12 min  ████████░░ │             │
│  SMS:       3 min  ███░░░░░░░ │             │
│  WhatsApp:  4 min  ████░░░░░░ │             │
│                                             │
│  Industry avg: 15 min                       │
└─────────────────────────────────────────────┘
```

**Response Time Gauge:**

```
Central metric display:
  class="flex flex-col items-center justify-center py-4"

Time value:
  class="text-3xl font-bold text-foreground"

Status indicator:
  < 5 min:   class="text-xs text-success" → "Fast"
  5-15 min:  class="text-xs text-[#8a5a1e]" → "Average"
  15-30 min: class="text-xs text-[#f5c26b]" → "Slow"
  > 30 min:  class="text-xs text-destructive" → "Needs improvement"

Channel breakdown bars:
  Container: class="space-y-2"
  Each row: class="flex items-center gap-2 text-xs"
  Label: class="w-16 text-muted-foreground"
  Bar container: class="flex-1 h-1.5 rounded-full bg-muted"
  Bar fill: class="h-full rounded-full bg-brand" style="width: {pct}%"
  Value: class="w-12 text-right text-muted-foreground"
```

### 6.3 Dashboard Layout (Updated Grid)

```
/dashboard page layout:

<div className="p-4 md:p-6 lg:p-8 space-y-6">

  {/* Row 1: Today's priorities (full width, existing) */}
  <TodaysPriorities />

  {/* Row 2: AI + Pipeline (2 columns, existing) */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <AIRecommendations />           {/* existing */}
    <DashboardPipelineWidget />     {/* ENHANCED with days-in-phase */}
  </div>

  {/* Row 3: NEW analytics widgets (2 columns) */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <EmailPerformanceWidget />
    <ResponseTimeWidget />
  </div>

  {/* Row 4: Activity (full width, existing) */}
  <ActivityFeed />

</div>
```

---

## 7. Page Layouts — Newsletter Analytics Enhancement

### 7.1 Conversion Funnel (New Section)

Added below existing newsletter analytics content.

```
┌──────────────────────────────────────────────────────────────────┐
│ 🎯 Email → Revenue Attribution                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │ Emails  │───→│ Clicks  │───→│ Showings│───→│ Deals   │      │
│  │ Sent    │    │         │    │ Booked  │    │ Closed  │      │
│  │ 1,234   │    │ 186     │    │ 24      │    │ 3       │      │
│  │         │    │ 15.1%   │    │ 12.9%   │    │ 12.5%   │      │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘      │
│       ▼              ▼              ▼              ▼             │
│   $0.08/ea       $0.53/click   $6.53/showing  $52.33/deal       │
│                                                                  │
│  Revenue attributed to email: $157,000                           │
│  ROI: 127x ($127 AI cost → $157K revenue)                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Conversion Step Specification:**

```
Step box:
  class="flex-1 text-center p-4 bg-card border border-border rounded-lg relative"

Arrow connector (between boxes):
  class="flex items-center justify-center w-8 text-muted-foreground"
  Content: → (or ChevronRight icon)

Step value:
  class="text-2xl font-bold text-foreground"

Step conversion rate:
  class="text-sm text-muted-foreground"
  If < 5%: class="text-destructive" (needs attention)

Cost per unit (below step):
  class="text-xs text-muted-foreground mt-2"

Revenue callout:
  class="mt-4 p-3 rounded-lg bg-success/5 border border-success/20 text-center"
  Value: class="text-lg font-bold text-success"
```

### 7.2 Deliverability Health (New Section)

```
┌──────────────────────────────────────────────────────────────────┐
│ 📬 Deliverability Health                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Delivery Rate│  │ Bounce Rate  │  │ Complaint    │           │
│  │ 🟢 98.2%     │  │ 🟢 0.8%      │  │ 🟢 0.02%     │           │
│  │ Goal: >95%   │  │ Goal: <2%    │  │ Goal: <0.1%  │           │
│  │ ████████████░│  │ █░░░░░░░░░░░│  │ ░░░░░░░░░░░░│           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  Subscriber Health                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Active      ████████████████████████████  412  (82%)     │   │
│  │ Dormant     ████████                       62  (12%)     │   │
│  │ Unsubscribed███                            24  ( 5%)     │   │
│  │ Bounced     █                               5  ( 1%)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Deliverability Metric Card:**

```
┌──────────────────────────────────┐
│ Delivery Rate                    │
│ 🟢 98.2%                         │  ← value with traffic light
│ Goal: >95%                       │  ← SLO target (text-xs text-muted-foreground)
│ ████████████████████░░  98%      │  ← progress bar
└──────────────────────────────────┘

Traffic light logic:
  Delivery rate: green >95%, amber 90-95%, red <90%
  Bounce rate: green <2%, amber 2-5%, red >5%
  Complaint rate: green <0.1%, amber 0.1-0.3%, red >0.3%
```

### 7.3 A/B Test Significance (Enhancement)

Added to existing A/B test results display:

```
┌──────────────────────────────────────────────────────────────────┐
│ 🧪 A/B Test: "Spring Market Update" Subject Lines               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Variant A: "Your Spring Market Report"                          │
│  ████████████████████████  24.1% open rate  (142 sends)         │
│                                                                  │
│  Variant B: "Prices in Your Area Just Changed"                   │
│  ████████████████████████████████  31.8% open rate  (138 sends) │
│                                                    ← WINNER      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🟢 Statistically significant (p = 0.023, confidence 97%)│    │
│  │ Variant B outperforms A by +7.7 percentage points        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Not significant? Badge shows:                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🟡 Not yet significant (p = 0.142). Need ~80 more sends │    │
│  │ to reach 95% confidence.                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Significance Badge:**

```
Significant (p < 0.05):
  class="p-3 rounded-lg bg-success/5 border border-success/20"
  Icon: 🟢
  Text: class="text-sm text-success font-medium"

Not significant:
  class="p-3 rounded-lg bg-[#f5c26b]/5 border border-[#f5c26b]/20"
  Icon: 🟡
  Text: class="text-sm text-[#8a5a1e]"
  Includes: "Need ~N more sends" estimate
```

---

## 8. Shared Component Specifications

### 8.1 DateRangePicker

```
┌──────────────────────────────────────────┐
│ [ 7d ] [ 30d ] [ 90d ] [ Custom ▾ ]     │
└──────────────────────────────────────────┘

When "Custom" is clicked:
┌──────────────────────────────────────────┐
│ [ 7d ] [ 30d ] [ 90d ] [ Custom ▾ ]     │
│ ┌──────────────────────────────────────┐ │
│ │ From: [2026-03-12]  To: [2026-04-12]│ │
│ │ [Apply]                    [Cancel]  │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

```tsx
interface DateRangePickerProps {
  value: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
  presets?: Array<{ label: string; days: number }>;  // default: 7, 30, 90
  className?: string;
}

// Preset pill styling:
// Active: class="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground"
// Inactive: class="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:bg-muted"
```

### 8.2 KpiCard

```tsx
interface KpiCardProps {
  icon: string;                     // Emoji icon
  label: string;                    // "Monthly Active Users"
  value: string | number;           // "47" or "$2,350"
  formatValue?: 'number' | 'currency' | 'percent' | 'duration'; // How to format the value
  trend?: {
    value: number;                  // 12 (percent change)
    direction: 'up' | 'down' | 'flat';
    positiveIsGood?: boolean;       // false for error rate, latency
  };
  sparklineData?: number[];         // Last 7-30 data points
  status?: 'healthy' | 'warning' | 'critical' | 'neutral';
  onClick?: () => void;             // Navigate to detail view
  loading?: boolean;                // Show skeleton state
}
```

```
Container classes:
  "bg-card border border-border rounded-xl p-4 space-y-2 elevation-2 
   hover:elevation-4 transition-shadow duration-200"
  + (onClick ? "cursor-pointer" : "")  // Only show pointer when clickable

Status left border:
  healthy:  "border-l-4 border-l-success"
  warning:  "border-l-4 border-l-[#f5c26b]"
  critical: "border-l-4 border-l-destructive"
  neutral:  "border-l-4 border-l-border"

Layout:
  Row 1: icon (text-base) + label (text-xs text-muted-foreground uppercase tracking-wider)
  Row 2: value (text-2xl font-bold text-foreground)
  Row 3: TrendArrow + Sparkline (flex items-center justify-between)
```

### 8.3 TrendArrow

```tsx
interface TrendArrowProps {
  value: number;                    // Percentage change
  direction: 'up' | 'down' | 'flat';
  suffix?: string;                  // "%" (default), "ms", "pts"
  positiveIsGood?: boolean;         // true for revenue, false for error rate
}
```

```
Positive + positiveIsGood=true (or negative + positiveIsGood=false):
  class="text-xs text-success flex items-center gap-0.5"
  Arrow: ↑ (ArrowUp icon, h-3 w-3)

Negative + positiveIsGood=true (or positive + positiveIsGood=false):
  class="text-xs text-destructive flex items-center gap-0.5"
  Arrow: ↓ (ArrowDown icon, h-3 w-3)

Flat:
  class="text-xs text-muted-foreground"
  Arrow: → (ArrowRight icon, h-3 w-3)
```

### 8.4 Sparkline

```tsx
interface SparklineProps {
  data: number[];                   // 7-30 data points
  color?: string;                   // CSS color (default: var(--chart-1))
  width?: number;                   // px (default: 80)
  height?: number;                  // px (default: 24)
}
```

Implementation: SVG `<polyline>` with calculated points. No external library needed — simple line chart.

```
SVG:
  viewBox="0 0 {width} {height}"
  class="overflow-visible"

Polyline:
  fill="none"
  stroke={color}
  strokeWidth="1.5"
  strokeLinecap="round"
  strokeLinejoin="round"

Optional: gradient fill below the line
  <linearGradient> from color at 20% opacity → transparent
  <path> closed shape below polyline
```

### 8.5 FunnelChart

```tsx
interface FunnelStage {
  label: string;
  value: number;
  color?: string;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  showDropoff?: boolean;            // Show conversion % between stages
  showAbsolute?: boolean;           // Show absolute numbers (default true)
}
```

```
Each stage row:
  class="flex items-center gap-3 py-2"

Label:
  class="w-24 text-sm text-foreground font-medium shrink-0"

Bar container:
  class="flex-1 h-8 rounded-lg bg-muted overflow-hidden"

Bar fill:
  class="h-full rounded-lg transition-all duration-700 ease-out"
  style="width: {valueAsPercentOfMax}%; background-color: {color || var(--brand)}"
  
  Width calculated relative to FIRST stage (max):
    Stage 1 = 100%, Stage 2 = (value2/value1 * 100)%, etc.

Value label (inside bar if wide enough, outside if narrow):
  Inside: class="text-xs font-medium text-white px-2 leading-8"
  Outside: class="text-xs font-medium text-foreground ml-2 leading-8"

Dropout indicator (between stages):
  class="ml-24 pl-3 py-0.5 text-xs"
  Color based on conversion %: success/amber/destructive (see Section 5.2)
```

### 8.6 UsageBar

```tsx
interface UsageBarProps {
  value: number;                    // 0-100 (percentage)
  color?: string;                   // CSS color
  showLabel?: boolean;              // Show percentage text
  size?: 'sm' | 'md';              // sm = h-1.5, md = h-2.5
}
```

```
Container:
  sm: class="h-1.5 rounded-full bg-muted overflow-hidden"
  md: class="h-2.5 rounded-full bg-muted overflow-hidden"

Fill:
  class="h-full rounded-full transition-all duration-500"
  style="width: {value}%; background-color: {color || var(--brand)}"

With label:
  class="flex items-center gap-2"
  Bar + class="text-xs text-muted-foreground tabular-nums w-8 text-right" → "{value}%"
```

### 8.7 MetricComparison

```tsx
interface MetricComparisonProps {
  value: number;
  benchmark: number;
  label: string;
  unit?: string;                    // "%", "min", "$"
  higherIsBetter?: boolean;         // true for open rate, false for response time
}
```

```
Layout:
  class="flex items-baseline gap-2"
  
Main value:
  class="text-xl font-bold text-foreground"

Comparison:
  Better: class="text-xs text-success"  → "↑ vs {benchmark}{unit} avg"
  Worse:  class="text-xs text-destructive" → "↓ vs {benchmark}{unit} avg"
  Equal:  class="text-xs text-muted-foreground" → "= {benchmark}{unit} avg"
```

### 8.8 RefreshIndicator

```tsx
interface RefreshIndicatorProps {
  lastUpdated: Date;
  isAutoRefresh: boolean;
  intervalSeconds?: number;         // default: 60
  onToggle: (enabled: boolean) => void;
  onManualRefresh: () => void;
}
```

```
Layout:
  class="flex items-center gap-2 text-xs text-muted-foreground"

Auto-refresh toggle:
  Switch (shadcn) size small + label "Auto"

Manual refresh button:
  class="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center"
  Icon: RefreshCw (h-3.5 w-3.5)
  While refreshing: class="animate-spin"

Timestamp:
  "Updated 30s ago" (relative, updates every 10s)
```

---

## 9. Interaction Design

### 9.1 Chart Interactions (Recharts)

All charts use Recharts (already installed v3.8.0, unused).

| Interaction | Behavior |
|-------------|----------|
| **Hover** | Tooltip appears showing exact value + date. Tooltip: `bg-card border border-border rounded-lg p-2 elevation-8 text-xs` |
| **Click data point** | No action (view-only charts). Cursor remains default. |
| **Resize** | Charts are responsive via `ResponsiveContainer` (100% width, fixed height) |
| **No data** | Show empty state with dashed border box and message |

**Recharts Theme:**

```tsx
// Standard chart configuration matching design system
const chartTheme = {
  colors: [
    'var(--chart-1)',  // #c4502b Coral
    'var(--chart-2)',  // #00756a Teal
    'var(--chart-3)',  // #516f90 Slate
    'var(--chart-4)',  // #f5c26b Amber
    'var(--chart-5)',  // #7c98b6 Light slate
  ],
  tooltip: {
    contentStyle: {
      backgroundColor: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      fontSize: '12px',
      boxShadow: '0 2px 8px rgba(45, 62, 80, 0.08)', // matches elevation-8
    },
  },
  grid: {
    stroke: 'var(--border)',
    strokeDasharray: '3 3',
  },
  axis: {
    fontSize: 11,
    fill: 'var(--muted-foreground)',
  },
};
```

### 9.2 Table Interactions

All tables use existing `DataTable` component pattern.

| Interaction | Behavior |
|-------------|----------|
| **Sort** | Click column header to sort. Arrow indicator shows direction. |
| **Hover row** | `hover:bg-muted/50` subtle highlight |
| **Click row** | For user table: navigate to user detail. For cron table: expand inline details. For errors: open Sentry link. |
| **Expand row** | Disclosure triangle (`▸`) toggles expanded content (audit log, cron details) |
| **Pagination** | Bottom of table, 25 rows per page, chevron navigation |

### 9.3 Tab Navigation

Uses existing PageHeader tab pattern. State managed via URL search param `?tab=overview`.

```
Tab click → update URL param → re-render content
Back button → restores previous tab
Direct URL → loads correct tab
```

### 9.4 Filter Interactions (Audit Log)

```
Filter bar: class="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg"

Each filter: shadcn Select component (popover dropdown)
  Trigger: class="h-8 text-xs"
  
Active filter: shows badge count on filter trigger
  class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand text-[10px] text-white"

"Clear all" button: appears when any filter is active
  class="text-xs text-brand hover:underline"
```

### 9.5 Dashboard Export (Admin)

Admin may want to share KPI snapshots with stakeholders (investors, team).

```
Export button in PageHeader actions area:
  [📥 Export]  → dropdown:
    - "Copy KPI summary" → copies formatted text to clipboard:
        Realtors360 Analytics — Apr 12, 2026
        MAU: 47 (↑12%), MRR: $2,350, Trial Conv: 34%, AI Cost: $127
    - "Download as PNG" → uses html2canvas on the KPI cards row only
    - "Export data as CSV" → exports raw metrics for the selected period
```

### 9.6 Budget Alert Modal

Triggered by "Set Budget Alert" button on Costs tab.

```
┌────────────────────────────────────────┐
│ Set AI Cost Budget Alert               │
│ ──────────────────────────             │
│                                        │
│ Monthly budget ($)                     │
│ ┌──────────────────────────┐           │
│ │ 200                       │           │
│ └──────────────────────────┘           │
│                                        │
│ Alert at (% of budget)                 │
│ ┌──────────────────────────┐           │
│ │ 80%                       │           │
│ └──────────────────────────┘           │
│                                        │
│ Notify via:                            │
│ [✓] In-app notification               │
│ [✓] Email to admin                     │
│                                        │
│ [Cancel]              [Save Alert]     │
└────────────────────────────────────────┘
```

---

## 10. Responsive Design

### 10.1 Breakpoint Behavior

| Component | Desktop (1280px+) | Tablet (768-1279px) | Mobile (<768px) |
|-----------|-------------------|--------------------|-----------------| 
| KPI cards | 4 columns | 2 columns | 1 column (stack) |
| Charts row | 2 columns side-by-side | 2 columns (compressed) | 1 column (stack) |
| Feature table | Full table with all columns | Hide sparkline column | Hide sparkline + events columns |
| Funnel chart | Horizontal bars, full labels | Horizontal bars, truncated labels | Vertical stack, bars below labels |
| Cron table | All 5 columns | Hide "Next" column | Collapse to card view |
| Audit feed | Full timeline with icons | Same | Compact: hide IP, smaller icons |
| Dashboard widgets | 2 columns | 2 columns | 1 column (stack) |
| Date range picker | Inline pills | Inline pills | Dropdown select |
| Tab bar | Inline tabs | Inline tabs (scroll) | Horizontal scroll with fade |

### 10.2 Mobile-Specific Patterns

```
KPI cards on mobile — horizontal scroll instead of wrap:
  class="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:grid md:grid-cols-4 md:overflow-visible md:mx-0 md:px-0"
  
  Each card: class="snap-center min-w-[200px] md:min-w-0"
  
  Scroll indicators: horizontal dots or fade gradient at edges
    class="bg-gradient-to-r from-transparent via-transparent to-background absolute right-0 top-0 bottom-0 w-8 pointer-events-none md:hidden"
```

### 10.3 Admin Analytics on Tablet

The admin panel is primarily a desktop tool (admin manages platform from a desk), but must remain functional on tablet.

```
Tablet layout adjustments:
  - KPI cards: 2x2 grid instead of 4x1
  - Charts: stack vertically if both would be < 400px wide
  - Tables: horizontal scroll with sticky first column
  - Audit feed: reduce timestamp column to relative only ("2h ago" not "Apr 12, 2026 3:14 PM")
```

---

## 11. Accessibility

### 11.1 WCAG AA Compliance

| Requirement | Implementation |
|-------------|---------------|
| **Color contrast** | All text meets 4.5:1 ratio (verified by existing design system — 18/18 pairs pass) |
| **Color not sole indicator** | All status indicators use icon + color (🟢 + green, not green alone). Trend arrows use ↑↓ symbols + color. |
| **Keyboard navigation** | All tabs, filters, buttons, and expandable rows are keyboard-focusable. Tab order follows visual order. |
| **Screen reader** | Charts: `aria-label` with data summary (e.g., "User activity chart showing 47 monthly active users, up 12%"). Tables: standard `<table>` semantics with `<th scope="col">`. |
| **Focus indicators** | `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` (existing system) |
| **Reduced motion** | Sparklines and chart animations respect `prefers-reduced-motion: reduce` — instant transitions |
| **ARIA roles** | Tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"`. Expanding rows: `aria-expanded="true/false"` |

### 11.2 Chart Accessibility

```tsx
// Every Recharts chart wrapped with:
<div role="img" aria-label={`${title}: ${dataSummary}`}>
  <ResponsiveContainer>
    <LineChart>...</LineChart>
  </ResponsiveContainer>
</div>

// Data table alternative (hidden visually, available to screen readers):
<table className="sr-only">
  <caption>{title}</caption>
  <thead>...</thead>
  <tbody>
    {data.map(point => <tr><td>{point.date}</td><td>{point.value}</td></tr>)}
  </tbody>
</table>
```

### 11.3 KPI Card Accessibility

```tsx
<div
  role="article"
  aria-label={`${label}: ${value}. Trend: ${trend.direction} ${trend.value}%`}
  tabIndex={onClick ? 0 : undefined}
  onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
>
```

---

## 12. Empty, Loading, and Error States

### 12.1 Empty States

**New admin with < 7 days of data:**

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                     📊                                           │
│                                                                  │
│           Analytics are building up                              │
│                                                                  │
│   We started tracking on Apr 12. You'll see meaningful           │
│   data after about 7 days of activity. In the meantime:          │
│                                                                  │
│   ✓ PostHog is collecting page views and events                  │
│   ✓ API latency is being measured                                │
│   ✓ Email analytics are active (from Resend webhooks)            │
│                                                                  │
│   Check back on Apr 19 for your first full report.               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Container: class="flex flex-col items-center justify-center py-16 text-center"
Icon: class="text-4xl mb-4"
Title: class="text-lg font-semibold text-foreground mb-2"
Description: class="text-sm text-muted-foreground max-w-md"
Checklist: class="mt-4 space-y-1 text-sm text-left"
Check marks: class="text-success"
```

**No data for selected date range:**

```
┌──────────────────────────────────────────┐
│                                          │
│         No data for this period          │
│                                          │
│  Try selecting a wider date range,       │
│  or wait for more activity.              │
│                                          │
│  [Try 30 days]                           │
│                                          │
└──────────────────────────────────────────┘
```

**Empty feature table (no tracking yet):**

```
┌──────────────────────────────────────────┐
│  Feature Adoption                        │
│  ──────────────                          │
│                                          │
│  Event tracking will appear here once    │
│  PostHog starts collecting feature       │
│  usage data. Ensure NEXT_PUBLIC_         │
│  POSTHOG_KEY is configured.              │
│                                          │
└──────────────────────────────────────────┘
```

### 12.2 Loading States

**Initial page load:**

```
KPI cards: Skeleton placeholders
  class="animate-pulse bg-muted rounded-xl h-[120px]"
  4 skeleton cards in grid

Charts: Skeleton with aspect ratio
  class="animate-pulse bg-muted rounded-xl aspect-[2/1]"

Tables: 5 skeleton rows
  class="animate-pulse bg-muted rounded h-10 mb-2" (repeat 5x)
```

**Refreshing data (auto or manual):**

```
Don't show skeleton — keep stale data visible.
Show RefreshIndicator spinning icon.
Apply subtle opacity: class="opacity-70 transition-opacity" on data containers.
Restore opacity on data arrival.
```

**Tab switch:**

```
Instant tab highlight change (no delay).
Content area shows skeleton for new tab data.
Previous tab content unmounted immediately (no fade).
```

### 12.3 Error States

**Data fetch failure:**

```
┌──────────────────────────────────────────┐
│                                          │
│  ⚠️ Couldn't load analytics data         │
│                                          │
│  This might be a temporary issue.        │
│  [Retry]                                 │
│                                          │
└──────────────────────────────────────────┘

Container: class="flex flex-col items-center justify-center py-8 text-center"
Icon: class="text-2xl mb-2"
Message: class="text-sm text-muted-foreground"
Button: variant="outline" size="sm"
```

**Partial failure (some data loaded, some failed):**

```
Show loaded data normally.
Failed section shows inline error:
  class="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive"
  "Couldn't load cron data. [Retry]"
```

**PostHog unavailable:**

```
Graceful degradation:
  - Show Supabase-sourced data (email analytics, cron logs, costs) normally
  - PostHog-dependent sections show:
    "Product analytics temporarily unavailable. Email and operational metrics are current."
  - No page crash — analytics is always non-blocking
```

---

## 13. Dark Mode Considerations

All components use CSS custom properties that automatically adapt to dark mode via the `.dark` class on `<html>`.

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Page bg | `--background: #f5f8fa` | `--background: #1a2332` |
| Cards | `--card: #ffffff` | `--card: #243447` |
| Borders | `--border: #cbd6e2` | `--border: #3a4f63` |
| Text | `--foreground: #33475b` | `--foreground: #eaf0f6` |
| Muted | `--muted: #eaf0f6` | `--muted: #2d4052` |
| Chart grid | `var(--border)` | `var(--border)` |
| Sparklines | Same `--chart-*` colors | Same (sufficient contrast on dark bg) |
| Skeleton | `bg-muted` | `bg-muted` (auto-adapts) |
| Status green | `--success: #00756a` | `--success: #00bda5` (brighter) |
| Status red | `--destructive: #b93e45` | `--destructive: #e57373` (brighter) |

**Chart-specific dark mode:**

```css
/* Recharts tooltip in dark mode */
.dark .recharts-tooltip-wrapper {
  --shadow-8: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Ensure axis labels are readable */
.dark .recharts-text { fill: var(--muted-foreground); }
```

**No additional work needed** — the existing CSS variable system handles dark mode automatically for all components that use `bg-card`, `text-foreground`, `border-border`, etc.

---

## 14. Motion & Animation

### 14.1 Page Entry

```
Admin analytics page loads:
  1. KPI cards: stagger-children (50ms delay each, 0.3s duration)
     class="stagger-children" (existing animation utility)
  
  2. Charts: animate-float-in (0.4s, appears after cards)
     class="animate-float-in" with 200ms delay
  
  3. Tables: animate-fade-in-up (0.3s, appears after charts)
     class="animate-fade-in-up" with 400ms delay
```

### 14.2 Data Updates

```
KPI value changes:
  - Number rolls from old → new value (CSS counter animation or JS tween)
  - Duration: 500ms, ease-out
  - Trend arrow fades in if direction changes
  
Chart data update:
  - Recharts built-in animation (isAnimationActive={true})
  - Duration: 500ms for line/area transitions
  
Funnel bar width changes:
  - transition-all duration-700 ease-out on bar width
  
Usage bar growth:
  - transition-all duration-500 on width
  - Triggers on mount (starts at 0%, grows to target)
```

### 14.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .stagger-children > *,
  .animate-float-in,
  .animate-fade-in-up {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  
  /* Recharts */
  .recharts-surface * {
    transition: none !important;
  }
}
```

---

## 15. Design Tokens Reference

Quick reference for developers implementing these components.

### 15.1 Spacing Scale

```
4px   → p-1, gap-1, space-y-1
8px   → p-2, gap-2, space-y-2
12px  → p-3, gap-3, space-y-3
16px  → p-4, gap-4, space-y-4
24px  → p-6, gap-6, space-y-6
32px  → p-8
```

### 15.2 Typography Scale

```
KPI value:      text-2xl font-bold text-foreground         (24px, 700)
Card title:     text-sm font-semibold text-foreground       (14px, 600)
Section header: text-xs font-semibold text-muted-foreground uppercase tracking-widest
Body:           text-sm text-foreground                     (14px, 400)
Caption:        text-xs text-muted-foreground               (12px, 400)
Tabular data:   text-sm tabular-nums text-foreground        (14px, monospace numerals)
```

### 15.3 Chart Colors

```
Primary series:   var(--chart-1) = #c4502b (Coral)
Secondary series: var(--chart-2) = #00756a (Teal)
Tertiary:         var(--chart-3) = #516f90 (Slate)
Quaternary:       var(--chart-4) = #f5c26b (Amber)
Quinary:          var(--chart-5) = #7c98b6 (Light slate)
```

### 15.4 Status Tokens

```
Success:  bg-success/10 text-success border-success/20
Warning:  bg-[#f5c26b]/10 text-[#8a5a1e] border-[#f5c26b]/20
Error:    bg-destructive/10 text-destructive border-destructive/20
Info:     bg-[#516f90]/10 text-[#3d5468] border-[#516f90]/20
Neutral:  bg-muted text-muted-foreground
```

### 15.5 Elevation

```
Rest:     elevation-2  → 0 1px 3px rgba(45, 62, 80, 0.06)
Hover:    elevation-4  → 0 1px 4px rgba(45, 62, 80, 0.08)
Raised:   elevation-8  → 0 2px 8px rgba(45, 62, 80, 0.08)
Floating: elevation-16 → 0 4px 12px rgba(45, 62, 80, 0.10)
```

---

## 16. Implementation Priority Map

### Phase 1 — Foundation Components (Build First)

| # | Component | Blocks | Effort |
|---|-----------|--------|--------|
| 1 | `DateRangePicker` | All analytics pages | 2h |
| 2 | `KpiCard` | Admin overview, costs, ops | 1.5h |
| 3 | `TrendArrow` | KpiCard, widgets | 30min |
| 4 | `Sparkline` | KpiCard, feature table | 1.5h |
| 5 | `TrafficLight` | Cron table | 15min |
| 6 | `TimeAgo` | Cron table, audit feed | 30min |
| 7 | `RefreshIndicator` | Admin analytics header | 30min |

**Phase 1 total: ~7h of component work**

### Phase 2 — Admin Analytics Pages

| # | Component | Blocks | Effort |
|---|-----------|--------|--------|
| 8 | `OverviewTab` (KPIs + charts + feature table) | — | 4h |
| 9 | `UsersTab` (funnel + retention + user table) | FunnelChart | 4h |
| 10 | `CostsTab` (cost charts + per-realtor table) | — | 3h |
| 11 | `OperationsTab` (cron table + error list + latency) | — | 3h |
| 12 | `AdminAnalyticsPage` (server component + data fetching) | Tabs 8-11 | 2h |
| 13 | `FunnelChart` (shared) | UsersTab, newsletter | 2h |
| 14 | `UsageBar` (shared) | Feature table | 30min |
| 15 | Sidebar nav updates | — | 15min |

**Phase 2 total: ~19h**

### Phase 3 — Realtor Widgets

| # | Component | Blocks | Effort |
|---|-----------|--------|--------|
| 16 | `EmailPerformanceWidget` | MetricComparison | 2h |
| 17 | `ResponseTimeWidget` | — | 2h |
| 18 | `MetricComparison` (shared) | Widgets | 30min |
| 19 | Dashboard page layout update | Widgets 16-17 | 30min |
| 20 | `DashboardPipelineWidget` enhancement | — | 1h |

**Phase 3 total: ~6h**

### Phase 4 — Newsletter Enhancements + Audit + Export

| # | Component | Blocks | Effort |
|---|-----------|--------|--------|
| 21 | `ConversionFunnel` | FunnelChart (reuse) | 2h |
| 22 | `DeliverabilityHealth` | TrafficLight, UsageBar (reuse) | 1.5h |
| 23 | A/B significance badge | — | 1h |
| 24 | `AuditFeed` (cursor-based pagination, expandable rows) | TimeAgo (reuse) | 4h |
| 25 | `AdminAuditPage` (filters + CSV export) | AuditFeed, filters | 2.5h |
| 26 | Budget alert modal | — | 1h |
| 27 | Dashboard export (copy/PNG/CSV) | — | 1.5h |

**Phase 4 total: ~13.5h (revised up — audit feed complexity, export feature)**

### Grand Total: ~46 hours of UI/UX implementation (revised from 42.5h)

---

*This document specifies every UI surface, component API, layout grid, interaction behavior, responsive breakpoint, accessibility requirement, and visual state needed to implement the Analytics & Observability Platform. All designs use existing Realtors360 design tokens — no new CSS variables, fonts, or design patterns introduced.*

---

## Appendix: Review Changelog (v1.1)

| Pass | Focus | Changes Made |
|------|-------|-------------|
| 1 | Factual accuracy | Fixed migration numbers (103→104+), corrected dashboard widget order to match existing page, fixed Operations tab grid to match other tabs (3→4 cols) |
| 2 | Scope & prioritization | Revised Phase 4 totals (10.5h→13.5h), accounted for audit feed cursor pagination complexity |
| 3 | Technical correctness | Fixed Recharts tooltip shadow reference (was CSS var, now raw value), fixed KpiCard cursor-pointer to be conditional, added `loading` and `formatValue` props |
| 4 | Missing requirements | Added dashboard export (copy/PNG/CSV), audit feed CSV export, cursor-based pagination spec, accounted for onboarding funnel stages (wizard + personalization) |
| 5 | Polish | Fixed Response Time wireframe contradiction (8 min = Average, not Great), added Onboarded stage annotation, updated grand total |

*End of UX Design Document*

<!-- team-management: reviewed 2026-04-22 — team analytics widget, audit log, offboarding wizard added -->
