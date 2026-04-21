<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- docs-audit: src/app/(dashboard)/settings/* -->
# UI Design Spec: Super Admin Panel

**Author:** Claude (UX Designer perspective)
**Date:** 2026-04-12
**Companion PRD:** `docs/PRD_Admin_Analytics_Dashboard.md`
**Design system reference:** HubSpot-inspired (flat, clean, professional). No glass, no blur. Gradients allowed only in data visualization (funnel bars, chart fills) -- never on UI chrome (cards, buttons, headers).

---

## 1. User Persona

### Rahul -- Platform Owner & Solo Operator

**Role:** Founder of Realtors360. Wears every hat: product, engineering, support, sales.

**Context:** Rahul manages 50-200 realtor clients. He does not have a support team, a data analyst, or a dedicated ops engineer. The admin panel IS his entire operational cockpit. If something is buried 3 clicks deep, he will never see it. If a metric requires mental math, he will ignore it.

**Technical skill:** High (full-stack developer). But when he opens the admin panel, he is in *operator mode*, not *developer mode*. He wants dashboards, not database queries.

**When does he open the admin panel?**
- **Morning check (daily, 2 min):** "Is everything OK? Did anything break overnight? Any new signups?"
- **Client onboarding (weekly, 10 min):** "New realtor signed up. Let me make sure they got through onboarding and started their trial."
- **Support ticket (ad-hoc, 5 min):** "Sarah says her emails aren't sending. Let me check her account."
- **Business review (weekly, 15 min):** "What's my MRR? How are trials converting? Which features are people actually using?"
- **Incident response (rare, urgent):** "Something is broken. Crons? API? Emails? Show me what's red."

---

## 2. Jobs to Be Done

| Job | Trigger | Success = | Frequency |
|-----|---------|-----------|-----------|
| **Verify platform health** | Morning routine | See green status, no red flags in <5 sec | Daily |
| **Track business growth** | Weekly review | Know MRR, signups, churn without opening a spreadsheet | Weekly |
| **Debug a user's issue** | Support request | Find user, see their state, identify root cause in <60 sec | 2-3x/week |
| **Manage a user's account** | Client request | Change plan, extend trial, toggle feature in <30 sec | Weekly |
| **Understand feature value** | Prioritization meeting | Know which features justify their cost vs which are shelfware | Monthly |
| **Identify at-risk users** | Proactive retention | See who stopped using the platform before they churn | Weekly |
| **Diagnose system failure** | Alert or user complaint | Find the broken thing (cron, API, email) and see the error in <30 sec | Rare |

---

## 3. Core UX Principles

### 3.1 The 5-Second Rule
Every page must answer its primary question within 5 seconds of loading. No scrolling, no clicking, no hovering. The most important number is the biggest thing on the screen.

### 3.2 Progressive Disclosure
**Level 1 (glance):** KPI card with big number + trend arrow. Answers "is it good or bad?"
**Level 2 (scan):** Table or chart below the card. Answers "why is it good or bad?"
**Level 3 (investigate):** Click-through to detail view. Answers "who specifically, and what happened?"

Every screen follows this 3-level pattern.

### 3.3 Zero Dead Ends
Every number is clickable. Every table row leads somewhere. "42 signups" links to the list of 42 users. "3 errors" links to the error log. The admin should never see a number and think "now what?"

### 3.4 Status Over Data
Color-code everything. Green = good. Amber = warning. Red = bad. The admin should be able to assess the page by scanning colors before reading a single word.

### 3.5 Context Stays Visible
When drilling down (user detail, error detail), keep the parent context visible. Use slide-over panels for quick peeks, full pages only for deep investigation. Never lose the user's place.

---

## 4. Information Architecture & Navigation

### 4.1 Admin Shell Layout

```
+-------------------------------------------------------------+
| [<- Back to CRM]  [Shield] Realtors360 Admin    [? Help] [R]|
+--------+----------------------------------------------------+
|        |                                                     |
| ADMIN  |                                                     |
|        |            CONTENT AREA                             |
| > Over |                                                     |
|   Users|            (scroll-y)                               |
|   Analy|                                                     |
|   Reven|                                                     |
|   Syste|                                                     |
|   Email|                                                     |
|   Setti|                                                     |
|        |                                                     |
|--------|                                                     |
| Status |                                                     |
| [G] All|                                                     |
| systems|                                                     |
| operatl|                                                     |
+--------+----------------------------------------------------+
```

**Admin sidebar:** Narrower than main CRM sidebar. `w-52` (208px) instead of `w-60`.
- Background: `bg-sidebar` (same navy as main sidebar)
- No logo -- admin panel is a utility, not a brand surface
- Shield icon + "Admin" label at top
- 7 nav items with Lucide icons
- **Bottom widget:** Live system status indicator (green/amber/red dot + "All systems operational")

**Top bar:** Minimal. `h-14` (56px, matching CRM header for visual consistency), `bg-card border-b border-border`.
- Left: Back arrow + "Back to CRM" text link
- Center: Blank (no logo needed -- sidebar identifies the panel)
- Right: Help icon + admin avatar initial circle

**Content area:** `bg-background`, `overflow-y-auto`, `p-6`

### 4.2 Navigation Items

| # | Label | Icon | Route | Badge |
|---|-------|------|-------|-------|
| 1 | Overview | `LayoutDashboard` | `/admin` | -- |
| 2 | Users | `Users` | `/admin/users` | Total count |
| 3 | Analytics | `BarChart3` | `/admin/analytics` | -- |
| 4 | Revenue | `DollarSign` | `/admin/revenue` | MRR |
| 5 | System | `Activity` | `/admin/system` | Status dot (G/A/R) |
| 6 | Emails | `Mail` | `/admin/emails` | -- |
| 7 | Settings | `Settings` | `/admin/settings` | -- |

Active state: `bg-sidebar-primary/15 text-white border-l-[3px] border-sidebar-primary` (coral left border, same as main sidebar).

### 4.3 Mobile Layout

On screens < 768px:
- Sidebar collapses to a horizontal scrollable tab bar at the top (below the header)
- Tab bar: `flex overflow-x-auto gap-0 bg-card border-b border-border`
- Each tab: icon + label, `px-3 py-2.5 text-xs font-medium whitespace-nowrap`
- Active tab: `border-b-2 border-brand text-foreground`
- Content area fills remaining height

---

## 5. Screen-by-Screen Design

---

### 5.1 Overview (`/admin`)

**Job:** "Is everything OK?" in 5 seconds.

**Layout:**

```
+----------------------------------------------------------+
| Good morning, Rahul                      Apr 12, 2026    |
+----------------------------------------------------------+

+------------+ +------------+ +------------+ +------------+
| 247        | | $6,670     | | 34         | | 72%        |
| Total Users| | MRR        | | Active     | | Onboard    |
| +12 (30d)  | | +$870      | | Today      | | Rate       |
| ~~spark~~  | | ~~spark~~  | | ~~spark~~  | | -3%        |
+------------+ +------------+ +------------+ +------------+

+------------+ +------------+
| 42%        | | [G] OK     |
| Trial Conv.| | System     |
| +8%        | | Status     |
| ~~spark~~  | | 5/5 crons  |
+------------+ +------------+

+----------------------------------+ +----------------------+
| RECENT ACTIVITY                  | | QUICK ACTIONS        |
|                                  | |                      |
| [avatar] Sarah Chen signed up    | | [+] Create User      |
|          2 hours ago             | | [clock] Extend Trial |
|                                  | | [toggle] Toggle Feat |
| [avatar] James Patel completed   | | [play] Trigger Cron  |
|          onboarding · 3h ago     | | [megaphone] Announce |
|                                  | |                      |
| [shield] You changed Lisa's plan | |                      |
|          to Professional · 5h    | |                      |
|                                  | |                      |
| [alert] Cron agent-scoring       | |                      |
|         failed · 6h ago          | |                      |
|                                  | |                      |
| [mail] 340 emails sent today     | |                      |
|        3 bounced · 12h ago       | |                      |
+----------------------------------+ +----------------------+

+----------------------------------------------------------+
| USERS NEEDING ATTENTION                                   |
|                                                           |
| Name          | Issue              | Action               |
| Lisa Wong     | Trial expires tmrw | [Extend] [View]      |
| Mike Torres   | Stuck on Step 3    | [View] [Reset Onb]   |
| Emily N.      | 10% bounce rate    | [View Emails]        |
| David Kim     | Inactive 14 days   | [View] [Email]       |
+----------------------------------------------------------+
```

**Component breakdown:**

#### KPI Cards Row (6 cards)

Grid: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3`

Each card:
```
+---------------------------+
| [icon]         +12% [^]  |   <- trend arrow + delta, top-right
|                           |
| 247                       |   <- big number, text-2xl font-bold
| Total Users               |   <- label, text-xs text-muted-foreground
|                           |
| ~~~~~~~~~~~~~~~~~~~~~~~~  |   <- sparkline (40px tall, no axis)
+---------------------------+
```

CSS:
- Container: `bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer`
- Trend positive: `text-emerald-600 text-xs font-medium flex items-center gap-0.5` with `TrendingUp h-3 w-3`
- Trend negative: `text-red-500` with `TrendingDown h-3 w-3`
- Trend neutral: `text-muted-foreground` with `Minus h-3 w-3`
- Big number: `text-2xl font-bold text-foreground mt-1`
- Label: `text-xs text-muted-foreground mt-0.5`
- Sparkline: Recharts `<Sparkline>` or SVG path, 40px height, stroke color matches trend

System Status card is special:
- Green dot: `h-2.5 w-2.5 rounded-full bg-emerald-500` with pulse animation
- Amber dot: `bg-amber-500`
- Red dot: `bg-red-500 animate-pulse`
- Label below: "5/5 crons OK" or "2 issues" (clickable to `/admin/system`)

**Clicking a KPI card navigates:**
| Card | Navigates to |
|------|-------------|
| Total Users | `/admin/users` |
| MRR | `/admin/revenue` |
| Active Today | `/admin/users?sort=last_active_at&order=desc` |
| Onboarding Rate | `/admin/analytics` (scrolls to funnel) |
| Trial Conversion | `/admin/revenue` (scrolls to trials) |
| System Status | `/admin/system` |

#### Recent Activity Feed (left 60%)

Card with `CardHeader` + `CardContent`:
- Title: "Recent Activity"
- Max 10 items, "View all" link at bottom

Each item:
```
[icon] [title line]                              [timestamp]
       [subtitle line - grey]
```

- Icon: `h-8 w-8 rounded-full bg-[color]/10 flex items-center justify-center shrink-0`
  - Signup: `UserPlus` icon, `bg-emerald-500/10 text-emerald-600`
  - Onboarding: `GraduationCap`, `bg-primary/10 text-primary`
  - Admin action: `Shield`, `bg-brand/10 text-brand`
  - Error: `AlertCircle`, `bg-red-500/10 text-red-600`
  - Email: `Mail`, `bg-blue-500/10 text-blue-600`
  - Plan change: `ArrowUpCircle`, `bg-amber-500/10 text-amber-600`
- Title: `text-sm font-medium text-foreground`
- Subtitle: `text-xs text-muted-foreground`
- Timestamp: `text-xs text-muted-foreground whitespace-nowrap`

#### Quick Actions Panel (right 40%)

Card with `CardHeader` + `CardContent`:
- Title: "Quick Actions"
- 5 buttons, each full-width

Each button:
```
+------------------------------------------+
| [icon]  Create User                  [>] |
+------------------------------------------+
```

- Container: `flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-muted/50 transition-colors text-left`
- Icon: `h-4 w-4 text-muted-foreground`
- Chevron: `ChevronRight h-4 w-4 text-muted-foreground ml-auto`

Clicking opens:
| Action | Behavior |
|--------|----------|
| Create User | Modal dialog |
| Extend Trial | Combobox search for user -> modal with day picker |
| Toggle Feature | Combobox search for user -> feature toggle list |
| Trigger Cron | Dropdown of cron jobs -> confirm dialog |
| Send Announcement | Modal with message textarea + type selector |

#### Users Needing Attention Table (full width, below)

Card with `CardHeader` + `CardContent`:
- Title: "Needs Attention"
- Subtitle: "Users who may need your help"

Simple table (not full DataTable -- just 4-5 rows max):
- Container: `border border-border rounded-lg overflow-hidden`
- Header: `bg-muted/60 border-b border-border`
- Row: `border-b border-border last:border-b-0 hover:bg-muted/30`
- Cells: `px-4 py-2.5 text-sm`

Logic for "needs attention":
1. Trial expiring within 3 days (not yet converted)
2. Stuck in onboarding (started > 3 days ago, not completed)
3. High email bounce rate (> 5%)
4. Inactive for > 7 days (had activity before, then stopped)
5. Error spike (> 5 errors in 24h for this user)

Sorted by urgency (trial expiring soonest first). Max 5 rows. "View all" link if more.

---

### 5.2 Users (`/admin/users`)

**Job:** Find a specific user in <5 sec. Manage their account in <30 sec.

**Layout:**

```
+----------------------------------------------------------+
| Users                                    [+ Create User]  |
| 247 users across all plans                                |
+----------------------------------------------------------+
| [All] [Active] [Inactive] [Trial] [Onboarding]     count |
+----------------------------------------------------------+
| [Search by name or email...]    [Plan v] [Sort v]        |
+----------------------------------------------------------+
| [ ] | User            | Plan    | Status   | Signed Up   |
|     |                 |         |          |             |
| [ ] | [AV] Sarah Chen | Pro     | Active   | 2 weeks ago |
|     | sarah@mail.com  | $29/mo  | Last: 2h | Mar 28      |
|     |                                      [... menu]     |
|-----|-----------------------------------------------------|
| [ ] | [AV] James P.   | Free    | Trial    | 1 week ago  |
|     | james@mail.com  |         | 6d left  | Apr 5       |
|     |                                      [... menu]     |
|-----|-----------------------------------------------------|
| [ ] | [AV] Lisa Wong   | Studio  | Inactive | 1 month ago |
|     | lisa@mail.com   | $69/mo  | Last: 14d| Mar 12      |
|     |                                      [... menu]     |
+----------------------------------------------------------+
| Showing 1-25 of 247                      [< 1 2 3 ... >] |
+----------------------------------------------------------+
```

**Header:**
- Uses `PageHeader` component
- Title: "Users"
- Subtitle: "{count} users across all plans"
- Action: `Button variant="brand"` "Create User" with `UserPlus` icon

**Filter Tabs (below header):**
Uses `PageHeader` tabs prop:
- All (247)
- Active (180)
- Inactive (22)
- Trial (25)
- Onboarding (20)

Counts in badges: `ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full`

**Search + Filters Row:**
- Search input: `bg-card border border-border rounded-md px-3 py-2 text-sm` with `Search h-4 w-4` icon
  - Placeholder: "Search by name or email..."
  - Debounced (300ms)
- Plan filter: Select dropdown (`Select` component) with options: All, Free, Professional, Studio, Team
- Sort: Select dropdown with options: Newest, Oldest, Last Active, Name A-Z, MRR High-Low

**User Table:**
Uses existing `DataTable` component with `selectable={true}`.

| Column | Width | Content |
|--------|-------|---------|
| Checkbox | 40px | Selection checkbox |
| User | 35% | Two-line: avatar circle + name (bold) + email (grey). Avatar: `h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold` |
| Plan | 15% | Badge + monthly price below. Badge colors: Free=`bg-muted text-muted-foreground`, Pro=`bg-primary/10 text-primary`, Studio=`bg-brand/10 text-brand`, Team=`bg-emerald-50 text-emerald-700` |
| Status | 15% | Primary badge + secondary info. Active=`bg-emerald-50 text-emerald-700`. Trial=`bg-amber-50 text-amber-700` + "6d left". Inactive=`bg-red-50 text-red-700` + "Last: 14d". Onboarding=`bg-blue-50 text-blue-700` + "Step 3/6" |
| Signed Up | 15% | Relative date (bold) + absolute date (grey below) |
| Onboarding | 10% | Mini progress bar. `h-1.5 rounded-full bg-muted` with filled portion `bg-brand`. Percentage below: `text-xs text-muted-foreground` |
| Actions | 10% | `MoreHorizontal` icon button, opens dropdown |

**Row click:** Navigate to `/admin/users/[id]` (user detail page).

**Row Actions Dropdown:**
```
+-------------------------+
| View Details        [>] |
|-------------------------|
| Change Plan         [>] |
| Start Trial         [>] |
| Extend Trial        [>] |
|-------------------------|
| Manage Features     [>] |
| Reset Onboarding    [>] |
|-------------------------|
| Impersonate         [>] |
|-------------------------|
| Deactivate          [!] |
| Delete Account      [!] |
+-------------------------+
```

Destructive items: `text-destructive` with separator above.

**Bulk Actions Bar (when rows selected):**
Floating bar at bottom (reuse existing DataTable bulk action pattern):
```
+---------------------------------------------------------------+
| 12 selected   [Change Plan v] [Toggle Feature v] [Deactivate] | [Clear]
+---------------------------------------------------------------+
```

Position: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50` (no mobile bottom nav in admin panel, so `bottom-6` is correct — unlike main CRM which uses `bottom-20 md:bottom-6`)
Background: `bg-card border border-border rounded-xl shadow-xl px-4 py-2.5`

---

### 5.3 User Detail (`/admin/users/[id]`)

**Job:** Full picture of one user. Debug their issues. Manage their account.

**Layout:**

```
+----------------------------------------------------------+
| < Users / Sarah Chen                                      |
|                                                           |
| [Avatar]  Sarah Chen               [Change Plan] [...]   |
|           sarah.chen@example.com                          |
|           Professional  |  Active  |  Joined Mar 28      |
+----------------------------------------------------------+
| [Profile] [Activity] [Data] [Emails] [Billing]           |
+----------------------------------------------------------+
|                                                           |
|  (tab content below)                                      |
|                                                           |
+----------------------------------------------------------+
```

**Header:**
- Breadcrumb: "Users / Sarah Chen"
- Large avatar: `h-14 w-14 rounded-full`
- Name: `text-xl font-semibold`
- Email: `text-sm text-muted-foreground`
- Three inline badges: Plan badge + Status badge + "Joined" text
- Actions: `Button variant="brand"` "Change Plan" + `MoreHorizontal` dropdown (same as row actions)

**Tab bar:** Uses `PageHeader` tabs pattern. 5 tabs:

#### Tab 1: Profile

Two-column layout: `grid grid-cols-1 lg:grid-cols-2 gap-6`

**Left column -- Account Info:**
Card with editable fields:

```
+----------------------------------+
| ACCOUNT INFORMATION      [Edit]  |
|----------------------------------|
| Name          Sarah Chen         |
| Email         sarah@example.com  |
| Phone         +1 604 555 0101   |
| Role          realtor            |
| Brokerage     RE/MAX Crest      |
| License #     R-2024-1234       |
| Timezone      America/Vancouver |
| Signup Source  Google OAuth      |
+----------------------------------+
```

- Each row: `flex items-center justify-between py-2.5 border-b border-border last:border-b-0`
- Label: `text-sm text-muted-foreground w-32 shrink-0`
- Value: `text-sm text-foreground`
- Edit mode: fields become inline inputs. "Save" / "Cancel" buttons appear.

**Right column -- Profile Completeness + Stats:**

Profile completeness card:
```
+----------------------------------+
| PROFILE COMPLETENESS       80%   |
|----------------------------------|
| [============================  ] |
|                                  |
| [x] Name                        |
| [x] Email verified               |
| [ ] Phone verified               |
| [x] Avatar uploaded              |
| [x] Brokerage                   |
| [x] License number              |
| [x] Calendar connected          |
| [x] Timezone set                |
| [ ] Bio                         |
| [x] First real contact          |
+----------------------------------+
```

- Progress bar: `h-2 rounded-full bg-muted` with `bg-brand` filled portion
- Checklist: `text-sm` with `CheckCircle2 h-4 w-4 text-emerald-500` or `Circle h-4 w-4 text-muted-foreground`

Quick stats card:
```
+----------------------------------+
| QUICK STATS                      |
|----------------------------------|
| Total Sessions      47           |
| Last Active         2 hours ago  |
| Onboarding          Completed    |
| Personalization     Completed    |
| Contacts            23           |
| Listings            5            |
| Emails Sent         120          |
+----------------------------------+
```

**Plan History Timeline (below both columns, full width):**
```
Apr 10 ---- Professional (current)
             Changed by: Admin (you)
Mar 28 ---- Professional Trial (14 days)
             Auto-started on signup
Mar 28 ---- Free
             Account created via Google OAuth
```

Vertical timeline with dots and connecting lines:
- Dot: `h-2.5 w-2.5 rounded-full bg-brand` (current), `bg-muted-foreground` (past)
- Line: `w-px bg-border`
- Text: `text-sm font-medium` (plan name) + `text-xs text-muted-foreground` (details)

#### Tab 2: Activity

Event timeline for this user (from `platform_analytics`):

**Filter bar:**
```
| [All Events v]  [Last 7 Days v]  [Search events...]  |
```

**Timeline:**
```
Today
  14:32  Viewed /listings                         page_viewed
  14:28  Created listing "1250 Main St"           feature_used
  14:15  Viewed /contacts                         page_viewed

Yesterday
  09:45  Sent newsletter to 12 contacts           feature_used
  09:30  Session started (Chrome, Desktop)        session_start

Apr 10
  16:00  Plan changed to Professional             plan_changed
  11:22  Completed onboarding step 6              onboarding_step_completed
```

- Date group header: `text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2`
- Event row: `flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/30`
- Time: `text-xs text-muted-foreground w-12 shrink-0 tabular-nums`
- Description: `text-sm text-foreground flex-1`
- Event type badge: `text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground`

#### Tab 3: Data

Summary of this user's CRM data (not the actual data -- just counts and links):

```
+------------------+ +------------------+ +------------------+
| 23 Contacts      | | 5 Listings       | | 8 Showings       |
| 3 buyers         | | 2 active         | | 3 pending        |
| 12 sellers       | | 1 pending        | | 5 confirmed      |
| 8 other          | | 2 sold           | |                  |
| [View as user]   | | [View as user]   | | [View as user]   |
+------------------+ +------------------+ +------------------+

+------------------+ +------------------+ +------------------+
| 120 Emails Sent  | | 14 Tasks         | | 2 Workflows      |
| 98% delivered    | | 3 overdue        | | 1 active         |
| 52% open rate    | | 11 completed     | | 1 paused         |
| [View details]   | | [View as user]   | | [View as user]   |
+------------------+ +------------------+ +------------------+
```

Grid: `grid grid-cols-2 lg:grid-cols-3 gap-4`

Each card:
- Container: `bg-card border border-border rounded-lg p-4`
- Big number + label: `text-2xl font-bold text-foreground` + `text-xs text-muted-foreground`
- Breakdown rows: `text-sm text-muted-foreground mt-2 space-y-0.5`
- Link: `text-sm font-medium text-brand hover:text-brand/80 mt-3 inline-flex items-center gap-1`

"View as user" links are **deferred to v2** (impersonation system not in v1 scope — see `IMPL_Admin_Panel.md` Section 9). v1 shows these as disabled buttons with tooltip "Coming in v2".

#### Tab 4: Emails

All newsletters/emails for this user:

**KPI row:**
```
+----------+ +----------+ +----------+ +----------+
| 120 Sent | | 98%      | | 52%      | | 1.2%     |
|          | | Delivery | | Open Rate| | Bounce   |
+----------+ +----------+ +----------+ +----------+
```

**Email table:**
| Sent | Subject | Type | Status | Opens | Clicks |
|------|---------|------|--------|-------|--------|
| Apr 12, 14:32 | New Listings in East Van | new_listing_alert | Delivered | 1 | 0 |
| Apr 10, 09:45 | Market Update: March | market_update | Opened | 3 | 1 |
| Apr 8, 11:00 | Your Home Anniversary | home_anniversary | Bounced | 0 | 0 |

Status column: Delivered=`bg-emerald-50 text-emerald-700`, Opened=`bg-blue-50 text-blue-700`, Bounced=`bg-red-50 text-red-700`, Clicked=`bg-brand/10 text-brand`

#### Tab 5: Billing

```
+------------------------------------------+
| CURRENT PLAN                             |
|                                          |
|   Professional                $29/mo     |
|   Active since April 10, 2026            |
|                                          |
|   [Change Plan]  [Start New Trial]       |
+------------------------------------------+

+------------------------------------------+
| ENABLED FEATURES              12/16      |
|                                          |
|   [x] Contacts    [x] Listings           |
|   [x] Calendar    [x] Showings           |
|   [x] Tasks       [x] Forms              |
|   [x] Newsletters [x] Automations        |
|   [x] Content     [x] Import             |
|   [x] Workflow    [x] Website            |
|   [ ] Search      [ ] Social             |
|   [ ] MLS Browse  [ ] AI Assistant       |
+------------------------------------------+

+------------------------------------------+
| USAGE vs LIMITS                          |
|                                          |
| Contacts:   23 / unlimited               |
| Listings:   5 / unlimited                |
| Emails:     120 / 500 per month   [====] |
+------------------------------------------+

+------------------------------------------+
| PLAN HISTORY                             |
|                                          |
| (same timeline as Profile tab)           |
+------------------------------------------+
```

Feature toggles are interactive switches (same as current RealtorCard, but inside this context).

---

### 5.4 Analytics (`/admin/analytics`)

**Job:** Understand funnel, adoption, and retention for data-driven decisions.

**Layout:**

```
+----------------------------------------------------------+
| Platform Analytics                                        |
| How users find, adopt, and retain                         |
+----------------------------------------------------------+
| [Onboarding] [Adoption] [Retention]                       |
+----------------------------------------------------------+
|                  [7d] [30d] [90d] [All]                   |
+----------------------------------------------------------+
```

**Uses PageHeader tabs** to split into 3 sub-views. Date range picker is a button group inside the content area (not in PageHeader).

**Date range pills:**
- Container: `flex items-center gap-1 justify-end mb-4`
- Each pill: `px-3 py-1.5 rounded-full text-xs font-medium transition-colors`
- Active: `bg-primary text-white`
- Inactive: `bg-muted text-muted-foreground hover:bg-muted/80`

#### Onboarding Tab

**KPI cards (4):**
Grid: `grid grid-cols-2 lg:grid-cols-4 gap-3`
- New Signups: count + trend
- Completion Rate: % + trend
- Avg Time to Complete: duration + trend
- Time to First Value: duration + trend

**Funnel (left 60%) + Checklist (right 40%):**
Grid: `grid grid-cols-1 lg:grid-cols-5 gap-6`
- Funnel: `lg:col-span-3`
- Checklist: `lg:col-span-2`

**Funnel visualization:**

Card with title "Onboarding Funnel":

```
Step 1: Profile          ████████████████████████  100%  250
Step 2: About You        ██████████████████████     88%  220  -12%
Step 3: Contacts Import  ████████████████████       80%  200   -8%
Step 4: Professional Info██████████████████         72%  180   -8%
Step 5: MLS Connection   ████████████████           64%  160   -8%
Step 6: Auto-Complete    ██████████████             56%  140   -8%
Personalized             ████████████               48%  120   -8%
First Feature Used       ██████████                 40%  100   -8%
```

Each bar row:
- Container: `flex items-center gap-3 py-2`
- Label: `text-sm text-foreground w-36 shrink-0`
- Bar container: `flex-1 h-7 bg-muted rounded-md overflow-hidden relative`
- Bar fill: `h-full rounded-md transition-all duration-500` with width = percentage
- Bar gradient: `bg-gradient-to-r from-primary to-brand` (navy to coral)
- Percentage: `absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold` (white if bar > 50%, foreground if < 50%)
- Count: `text-sm text-muted-foreground w-12 text-right shrink-0`
- Drop-off: `text-xs font-medium w-10 text-right shrink-0` colored red if > 15%, amber if > 10%

**Clicking a bar row** opens a slide-over panel (Sheet component, right side) showing the users who dropped off at that step:

```
+----------------------------------+
| Dropped at Step 3: Contacts      |
| 20 users                         |
|----------------------------------|
| [AV] Lisa Wong                   |
|      lisa@mail.com               |
|      Signed up 3 days ago        |
|      [View User]                 |
|----------------------------------|
| [AV] Mike Torres                 |
|      mike@mail.com               |
|      Signed up 1 week ago        |
|      [View User]                 |
|----------------------------------|
| ...                              |
+----------------------------------+
```

**Checklist completion card:**

Donut chart (SVG, not Recharts -- simpler):
- Segments colored from red (0 items) through amber to green (5 items)
- Center text: "3.2 avg" (average items completed)

Below donut, per-item table:
```
| Checklist Item       | Completed | Rate  |
| First contact added  |    180    |  72%  |
| First listing created|    120    |  48%  |
| Calendar connected   |     90    |  36%  |
| First email sent     |     60    |  24%  |
| Bio completed        |    150    |  60%  |
```

#### Adoption Tab

**Feature adoption table (full width):**

Card with title "Feature Adoption":

| Feature | Unique Users | Actions | Adoption % | vs Previous | Trend |
|---------|-------------|---------|------------|-------------|-------|
| Contacts | 180 | 1,240 | 72% | +5% | [sparkline] |
| Listings | 120 | 380 | 48% | +3% | [sparkline] |
| Calendar | 60 | 220 | 24% | 0% | [sparkline] |
| Email Marketing | 45 | 180 | 18% | +12% | [sparkline] |
| Content | 25 | 80 | 10% | +8% | [sparkline] |
| Website | 8 | 12 | 3% | +2% | [sparkline] |

- Adoption % cell: includes colored bar behind text
  - Green bar (>50%): `bg-emerald-50`
  - Amber bar (20-50%): `bg-amber-50`
  - Red bar (<20%): `bg-red-50`
  - Bar width proportional to percentage
- Sparkline: Recharts `<Sparkline>` in last column, 60px wide, 24px tall

**Clicking a row** expands an inline chart below it (accordion pattern):
- Line chart showing daily unique users + daily actions for that feature over the selected date range
- Two lines: navy (users) + coral (actions)
- X-axis: dates. Y-axis: count.
- Chart height: 200px

#### Retention Tab — DEFERRED TO v2

> **Implementation decision:** Retention cohorts require 3+ months of accumulated `session_start` data to be meaningful. Deferred until `platform_analytics` has sufficient data. See `IMPL_Admin_Panel.md` Section 9. The tab renders a placeholder: "Retention cohorts will appear after 90 days of data collection. Data collection started [date]."
>
> When built, the design spec below applies:

<details>
<summary>v2 Design Spec (collapsed)</summary>

**Cohort heatmap (full width):**

Card with title "Weekly Retention Cohorts":

```
Signup Week    | Wk 0  | Wk 1  | Wk 2  | Wk 3  | Wk 4  |
───────────────|───────|───────|───────|───────|───────|
Mar 1-7   (25) | 100%  |  72%  |  58%  |  45%  |  40%  |
Mar 8-14  (30) | 100%  |  68%  |  52%  |  41%  |  --   |
Mar 15-21 (22) | 100%  |  75%  |  55%  |  --   |  --   |
Mar 22-28 (18) | 100%  |  70%  |  --   |  --   |  --   |
Mar 29-   (20) | 100%  |  --   |  --   |  --   |  --   |
```

Cell styling:
- `>=60%`: `bg-emerald-100 text-emerald-800`
- `40-59%`: `bg-emerald-50 text-emerald-700`
- `20-39%`: `bg-amber-50 text-amber-700`
- `<20%`: `bg-red-50 text-red-700`
- Empty: `bg-muted/30 text-muted-foreground` with "--"
- Cell: `px-3 py-2 text-center text-xs font-medium tabular-nums`
- Signup week label: `text-sm text-foreground font-medium` with cohort size in `text-muted-foreground`
- Header: `text-xs text-muted-foreground uppercase`

**Clicking a cell** shows a mini-list of who retained/churned in that cohort-week intersection (tooltip or slide-over).

</details>

---

### 5.5 Revenue (`/admin/revenue`)

**Job:** "What's my MRR and are trials converting?"

**Layout:**

```
+----------------------------------------------------------+
| Revenue & Plans                                           |
| Business health at a glance                               |
+----------------------------------------------------------+

+----------+ +----------+ +----------+ +----------+ +------+
| $6,670   | | $80,040  | | $38.40   | | 42%      | | 2.5% |
| MRR      | | ARR      | | ARPU     | | Trial    | | Churn|
| +$870    | | proj.    | | +$2.10   | | Conv.    | | Rate |
+----------+ +----------+ +----------+ +----------+ +------+

+-------------------------------+ +----------------------------+
| PLAN DISTRIBUTION             | | MRR OVER TIME              |
|                               | |                            |
|       [DONUT CHART]           | |  $7k ─                     |
|                               | |  $6k ─    ╱‾‾‾            |
|  Free:    120 users   $0     | |  $5k ─  ╱                  |
|  Pro:      80 users   $2,320 | |  $4k ─╱                    |
|  Studio:   35 users   $2,415 | |  $3k ─                     |
|  Team:     15 users   $1,935 | |       J  F  M  A           |
+-------------------------------+ +----------------------------+

+----------------------------------------------------------+
| TRIAL PIPELINE                                            |
|                                                           |
| Status          | Count | Conv. Rate                      |
|-----------------|-------|--------------------------------|
| Active Trials   |    25 | --                              |
| Expiring < 3d   |     8 | -- [urgent!]                   |
| Converted (30d) |    18 | 42%                            |
| Churned (30d)   |    25 | 58%                            |
+----------------------------------------------------------+

+----------------------------------------------------------+
| ACTIVE TRIALS (sorted by expiry)                          |
|                                                           |
| User          | Trial Plan | Days Left | Onboarded | Used|
|---------------|------------|-----------|-----------|-----|
| James Patel   | Pro        | 2 days    | Yes       |  12 |
| Lisa Wong     | Studio     | 4 days    | No (3/6)  |   3 |
| Mike Torres   | Pro        | 8 days    | Yes       |  28 |
+----------------------------------------------------------+

+----------------------------------------------------------+
| PLAN CHANGE LOG (30d)                                     |
|                                                           |
| Date    | User        | From     | To       | Trigger    |
|---------|-------------|----------|----------|------------|
| Apr 10  | Sarah Chen  | Trial    | Pro      | Converted  |
| Apr 9   | James Patel | Studio   | Free     | Downgrade  |
| Apr 8   | Lisa Wong   | Free     | Pro Trial| Admin      |
+----------------------------------------------------------+
```

**Plan Distribution Donut:**
- Recharts `<PieChart>` with `<Pie>` component
- Colors: Free=`#e5e7eb` (grey), Pro=`#2D3E50` (navy), Studio=`#FF7A59` (coral), Team=`#00BDA5` (teal)
- Inner radius 60%, outer 80% (donut, not pie)
- Center text: total MRR
- Legend table below with color dots + plan name + user count + MRR

**MRR Timeline:**
- Recharts `<AreaChart>` with stacked areas per plan
- Same colors as donut
- X-axis: months. Y-axis: dollar amount.
- Tooltip shows breakdown by plan

**Active Trials Table:**
- "Days Left" column: red if <=3, amber if <=7, grey if >7
- "Onboarded" column: green checkmark or amber "Step X/6"
- "Used" column: feature usage count (higher = more likely to convert)
- Row click -> user detail
- Sort by "Days Left" ascending by default

---

### 5.6 System (`/admin/system`)

**Job:** "Is anything broken?" in 5 seconds. "What exactly broke?" in 30 seconds.

**Layout:**

```
+----------------------------------------------------------+
| System Health                                             |
| Operational status and diagnostics                        |
+----------------------------------------------------------+
| [Crons] [Errors] [API Performance]                        |
+----------------------------------------------------------+

[G] ALL SYSTEMS OPERATIONAL                    Last check: 2m ago
+----------------------------------------------------------+
```

**Status Banner:**
- Green: `bg-emerald-50 border border-emerald-200 text-emerald-800`
  - `CheckCircle2` icon + "All Systems Operational"
- Amber: `bg-amber-50 border border-amber-200 text-amber-800`
  - `AlertTriangle` icon + "Degraded Performance" + count of issues
- Red: `bg-red-50 border border-red-200 text-red-800`
  - `XCircle` icon + "System Issues Detected" + count of issues

Uses PageHeader tabs: Crons, Errors, API Performance.

#### Crons Tab

```
+----------------------------------------------------------+
| CRON JOBS                               [Run All] button  |
|                                                           |
| Cron                  | Schedule  | Last Run | Status | D |
|=======================|===========|==========|========|===|
| process-workflows     | Daily 9AM | 2h ago   | [G] OK |1.2|
| greeting-automations  | Daily 8AM | 3h ago   | [G] OK |0.8|
| agent-scoring         | Daily     | 5h ago   | [R] ERR|0.3|
| social-publish        | Hourly    | 45m ago  | [G] OK |2.1|
| agent-recommendations | Daily     | 1d ago   | [A] !! |1.5|
+----------------------------------------------------------+
```

- Status dots: green circle / amber circle / red circle
- Red row: highlighted with `bg-red-50`
- Amber row: `bg-amber-50` (last run > expected interval)
- Each row expandable (click to expand):

```
| agent-scoring | Daily | 5h ago | [R] ERR | 0.3s |
+----------------------------------------------------------+
|  LAST 10 RUNS                                             |
|                                                           |
|  Apr 12 06:00  [R] Error   0.3s  "Supabase timeout..."  |
|  Apr 11 06:00  [G] Success 1.2s                          |
|  Apr 10 06:00  [G] Success 0.9s                          |
|  Apr 9  06:00  [G] Success 1.1s                          |
|  ...                                                      |
|                                           [Run Now]       |
+----------------------------------------------------------+
```

**"Run Now" button:** `Button variant="outline" size="sm"` with `Play h-3.5 w-3.5` icon. Confirmation dialog before execution.

#### Errors Tab

**Error rate KPI:**
```
+----------------------------------------------------------+
| 0.3% error rate (4 errors in 1,200 requests, last 24h)   |
+----------------------------------------------------------+
```

Bar colored by rate: green (<1%), amber (1-5%), red (>5%).

**Grouped error table:**
```
| Error                      | Route       | Count | Last Seen  | Users |
|----------------------------|-------------|-------|------------|-------|
| Supabase connection timeout| /api/listings| 3    | 2m ago     | 2     |
| Google token expired       | /api/calendar| 5    | 1h ago     | 1     |
| Resend rate limit          | actions/news | 1    | 3h ago     | system|
```

- Count badge: `bg-red-50 text-red-700 rounded-full px-2 py-0.5 text-xs font-semibold`
- "Last Seen" in red if < 1h ago
- Click row to expand full error details:

```
+----------------------------------------------------------+
| Supabase connection timeout                        3 hits |
|                                                           |
| Route:     POST /api/listings                             |
| First:     Apr 12 14:28                                   |
| Last:      Apr 12 14:32                                   |
| Users:     sarah@mail.com, james@mail.com                 |
|                                                           |
| Stack trace:                                              |
| Error: Connection timed out after 30000ms                 |
|   at PostgrestBuilder.then (node_modules/...)             |
|   at createListing (src/actions/listings.ts:42)           |
|   at ...                                                  |
|                                                           |
| [Copy Stack] [View User: Sarah] [View User: James]       |
+----------------------------------------------------------+
```

Stack trace: `bg-muted rounded-md p-3 font-mono text-xs text-foreground overflow-x-auto`

#### API Performance Tab

```
| Route              | Requests | p50    | p95    | p99    | Errors |
|--------------------|----------|--------|--------|--------|--------|
| POST /api/contacts | 1,200    | 80ms   | 250ms  | 800ms  | 0.2%   |
| GET /api/listings  | 800      | 120ms  | 400ms  | 1.2s   | 0.5%   |
| POST /api/calendar | 200      | 200ms  | 1.5s   | 3.2s   | 2.1%   |
```

- p95 cell: amber if >2s, red if >5s
- Error rate cell: amber if >1%, red if >5%
- Click row to see latency distribution (histogram or line chart)

---

### 5.7 Emails (`/admin/emails`)

**Job:** "Are emails healthy?" + debug individual delivery issues.

**Layout:**

```
+----------------------------------------------------------+
| Email Operations                                          |
| Delivery health and diagnostics                           |
+----------------------------------------------------------+
| [Overview] [Per-User] [Bounces]                           |
+----------------------------------------------------------+
```

#### Overview Tab

**KPI row (5 cards):**
```
+--------+ +--------+ +--------+ +--------+ +--------+
| 340    | | 99.1%  | | 52%    | | 0.9%   | | 0.0%   |
| Sent   | | Delivrd| | Opened | | Bounced| | Complnt|
| (24h)  | | [G]    | | [G]    | | [G]    | | [G]    |
+--------+ +--------+ +--------+ +--------+ +--------+
```

Status indicator on each card: green if healthy, amber if approaching threshold, red if exceeded.
- Delivery: green >98%, amber >95%, red <95%
- Opens: green >40%, amber >20%, red <20% (informational, not actionable)
- Bounce: green <2%, amber <5%, red >5%
- Complaint: green <0.05%, amber <0.1%, red >0.1%

**Delivery funnel (visual):**
```
Queued       ████████████████████████████████████████  352  100%
Sent         ███████████████████████████████████████   340   97%  -3%
Delivered    ██████████████████████████████████████    337   96%  -1%
Opened       ████████████████████                     180   51%  -45%
Clicked      ██████████                                45   13%  -38%
```

Same bar pattern as onboarding funnel.

**Daily volume chart (below funnel):**
Recharts `<BarChart>` showing daily send volume over last 30 days. Stacked by email type (new_listing, market_update, just_sold, etc.).

#### Per-User Tab

DataTable of all realtors with their email stats:

| Realtor | Sent (7d) | Delivered | Open Rate | Bounce Rate | Status |
|---------|----------|-----------|-----------|-------------|--------|
| Sarah Chen | 45 | 44 (97.8%) | 62% | 2.2% | [G] Healthy |
| James Patel | 120 | 110 (91.7%) | 29% | 8.3% | [R] High Bounce |

Status column logic:
- Healthy (green): bounce <5%, complaint <0.1%
- Warning (amber): bounce 5-10% or complaint 0.05-0.1%
- Critical (red): bounce >10% or complaint >0.1%

Click row -> goes to that user's Emails tab in user detail.

#### Bounces Tab

Table of individual bounced/complained emails:

| Time | Recipient | Type | Reason | Realtor | Action |
|------|-----------|------|--------|---------|--------|
| 2h ago | bad@email.xyz | Hard | Mailbox not found | Sarah Chen | [Remove] |
| 1d ago | old@company.com | Soft | Mailbox full | James Patel | [Retry] |

- Hard bounce row: `bg-red-50/50`
- Soft bounce row: default
- "Remove" action: removes email from contact (with confirmation)
- "Retry" action: re-queues the email

---

### 5.8 Settings (`/admin/settings`) — DEFERRED TO v2

> **Implementation decision:** Deferred. 5 plans in code is manageable for <200 users. Feature flag kill switches use env vars. Announcement simplified into a Quick Action modal on the Overview page. See `IMPL_Admin_Panel.md` Section 9. The nav item renders but shows a "Coming soon" placeholder.

**Job (v2):** Configure platform behavior without code deploys.

**Layout:**

```
+----------------------------------------------------------+
| Platform Settings                                         |
| Configure plans, features, and system behavior            |
+----------------------------------------------------------+
| [Plans] [Feature Flags] [Announcements]                   |
+----------------------------------------------------------+
```

#### Plans Tab

Edit plan definitions:

```
+----------------------------------------------------------+
| PLAN: Professional                                        |
|                                                           |
| Price              $29 /mo        [Edit]                  |
| Email limit        500 /mo        [Edit]                  |
| Contact limit      Unlimited                              |
| Listing limit      Unlimited                              |
|                                                           |
| INCLUDED FEATURES                                         |
| [x] Contacts  [x] Calendar  [x] Tasks                    |
| [x] Newsletters  [x] Automations                         |
| [x] Listings  [x] Showings  [x] Forms                    |
| [ ] Content   [ ] Website   [ ] Import                    |
| [ ] Workflow  [ ] Search    [ ] Social                    |
| [ ] MLS Browse  [ ] AI Assistant                          |
+----------------------------------------------------------+
```

One card per plan. Toggle switches for features. Inline edit for prices/limits.

**Trial defaults:**
```
+----------------------------------+
| TRIAL CONFIGURATION              |
|                                  |
| Default duration   14 days       |
| Default plan       Professional  |
| Auto-start on      Signup        |
+----------------------------------+
```

#### Feature Flags Tab

Global kill switches:

```
+----------------------------------------------------------+
| PLATFORM FEATURE FLAGS                                    |
|                                                           |
| Flag                     | Status | Description           |
|--------------------------|--------|-----------------------|
| maintenance_mode         | [OFF]  | Show maintenance      |
|                          |        | banner to all users   |
| new_user_signup          | [ON ]  | Allow new accounts    |
| ai_content_generation    | [ON ]  | Enable Claude API     |
| email_sending            | [ON ]  | Enable Resend delivery|
| voice_agent              | [ON ]  | Enable voice sessions |
+----------------------------------------------------------+
```

Each toggle:
- ON: green switch + "Active since Apr 10"
- OFF: grey switch + "Disabled since Apr 8"
- Toggling shows confirmation dialog: "This will affect all {count} users. Continue?"

**Warning for critical flags:**
`email_sending` OFF shows: `bg-red-50 border-red-200` banner: "Email sending is disabled. No emails will be delivered to any user."

#### Announcements Tab

```
+----------------------------------------------------------+
| ANNOUNCEMENT BANNER                                       |
|                                                           |
| Status:  [x] Active                                       |
|                                                           |
| Type:    (o) Info  ( ) Warning  ( ) Critical              |
|                                                           |
| Message:                                                  |
| +------------------------------------------------------+ |
| | We're performing scheduled maintenance on April 15.  | |
| | Expect brief downtime between 2-4 AM PST.           | |
| +------------------------------------------------------+ |
|                                                           |
| End date:  [Apr 15, 2026]                                 |
|                                                           |
| Dismissible:  [x] Users can dismiss                       |
|                                                           |
| PREVIEW:                                                  |
| +------------------------------------------------------+ |
| | [i] We're performing scheduled maintenance on...  [x]| |
| +------------------------------------------------------+ |
|                                                           |
| [Save & Publish]                     [Clear Announcement] |
+----------------------------------------------------------+
```

Preview shows the actual banner as it will appear to users:
- Info: `bg-blue-50 border-blue-200 text-blue-800`
- Warning: `bg-amber-50 border-amber-200 text-amber-800`
- Critical: `bg-red-50 border-red-200 text-red-800`

---

## 6. Interaction Patterns

### 6.1 Slide-Over Panels

Used for quick peeks without leaving the current page:
- **Funnel drop-off users:** click a funnel bar -> slide-over with user list
- **Retention cell users:** click a cohort cell -> slide-over with retained/churned users
- **Cron run history:** click a cron row -> inline expansion (not slide-over)
- **Error details:** click an error row -> inline expansion

Pattern: shadcn `Sheet` component, `side="right"`, width `w-[400px] sm:w-[450px]`

### 6.2 Confirmation Dialogs

Used before destructive or impactful actions:
- Delete user
- Deactivate user
- Bulk plan change
- Toggle critical feature flag
- Run cron manually
- Clear announcement

Pattern: shadcn `AlertDialog` with description of impact + "Cancel" / "Confirm" buttons.

Destructive confirms: `Button variant="destructive"` for the confirm button.

### 6.3 Inline Editing

Used for user profile fields (admin/users/[id] Profile tab):
- Click "Edit" button on card header
- Fields transform into inputs
- "Save" / "Cancel" buttons appear
- Optimistic update with error toast fallback

### 6.4 Combobox Search

Used in Quick Actions (Extend Trial, Toggle Feature):
- Type to search users by name/email
- Debounced (300ms)
- Shows top 5 results
- Select user -> opens context-specific modal

Pattern: shadcn `Command` component inside a `Popover`.

### 6.5 Toast Notifications

Used for all mutation feedback:
- Success: "Plan changed to Professional" (green)
- Error: "Failed to update user" (red)
- Info: "Cron job triggered" (default)

Pattern: `sonner` toast library (already in use).

---

## 7. Empty States

Every section needs an empty state for new platforms with no data yet.

| Section | Empty State |
|---------|------------|
| Overview KPIs | Show "0" with `--` for trends. No sparklines. |
| Recent Activity | "No activity yet. Events will appear as users sign up and use the platform." |
| Users Needing Attention | "No users need attention right now." with checkmark icon. |
| User Table | "No users yet. Share your signup link to get started." with Copy URL button. |
| Onboarding Funnel | "No signup data yet. Funnel will populate as users create accounts." |
| Feature Adoption | All rows show 0/0/0%. Table still renders with column headers. |
| Retention Cohorts | "Need at least 2 weeks of data to show retention cohorts." |
| Revenue | MRR = $0. "No paying users yet." Donut shows 100% Free. |
| Trial Pipeline | "No active trials." |
| Cron Monitor | "No cron run data yet. Crons will log their status after first execution." |
| Error Log | "No errors in the selected time range." with green checkmark. |
| Email Operations | "No emails sent yet." |

---

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Layout Change |
|-----------|--------------|
| < 768px (mobile) | Sidebar -> horizontal tab bar. KPI grid 2-col. Tables scroll horizontally. Funnel bars stack. |
| 768-1024px (tablet) | Sidebar visible but narrow (icons only, 48px). KPI grid 3-col. Side panels full-screen. |
| > 1024px (desktop) | Full sidebar with labels. KPI grid 6-col (overview) or 4-col (other pages). Side panels overlay. |

### Mobile-Specific Adaptations

- **User table:** Show only Name + Plan + Status columns. Other columns hidden. Row click -> full detail page (not slide-over).
- **Funnel:** Bars render vertically (rotated) on narrow screens.
- **Retention heatmap:** Horizontal scroll with sticky first column (signup week).
- **KPI cards:** 2-column grid, no sparklines on mobile (save space).
- **Quick Actions:** Full-screen modal instead of popover.

---

## 9. Loading States

### Skeleton Pattern

Every section loads independently using React `Suspense` boundaries. While loading:

- KPI cards: Pulsing grey rectangle (`animate-pulse bg-muted rounded-lg h-24`)
- Tables: Header row visible, body rows are pulsing lines (`animate-pulse bg-muted rounded h-4 w-3/4`)
- Charts: Pulsing grey rectangle matching chart dimensions
- Slide-over content: `LogoSpinner` centered

### Stale-While-Revalidate

When changing date range:
- Current data stays visible but dims (`opacity-50`)
- New data replaces it when loaded
- No full-page loading state for filter changes

---

## 10. Accessibility

| Requirement | Implementation |
|------------|----------------|
| Keyboard navigation | All interactive elements reachable via Tab. Enter activates. Escape closes modals/panels. |
| Screen reader | `aria-label` on all icon-only buttons. `aria-live="polite"` on KPI numbers (announce updates). `role="table"` on DataTable. |
| Color contrast | All text/background combos pass WCAG AA (already validated for design system). Status colors used as supplements, never sole indicator. |
| Focus management | When opening slide-over, focus moves to panel. When closing, focus returns to trigger element. |
| Reduced motion | `prefers-reduced-motion: reduce` disables sparkline animations and status dot pulse. |
| Skip links | "Skip to main content" link in admin shell (same pattern as DashboardShellClient). |

---

## 11. User Journeys (Detailed Flows)

### Journey 1: Morning Check (2 minutes)

```
1. Open /admin
2. GLANCE at 6 KPI cards (5 sec)
   -> All green? Good. Move to step 3.
   -> Red system status? Click -> /admin/system (go to Journey 5)
3. SCAN "Needs Attention" table (10 sec)
   -> Empty? Done. Close admin panel.
   -> "Lisa trial expires tomorrow" -> Click [Extend] -> Modal -> 7 more days -> Done.
   -> "Mike stuck on step 3" -> Note for later, or click [View] -> send him an email.
4. SCAN Recent Activity feed (10 sec)
   -> "2 new signups" -> Nice.
   -> "Cron failed" -> Click -> /admin/system -> investigate
5. Done. Total time: <2 minutes.
```

### Journey 2: Client Onboarding (10 minutes)

```
1. Get notified: "New signup: Rachel Kim"
2. Open /admin/users -> Search "Rachel"
3. Click Rachel's row -> /admin/users/[id]
4. Profile tab:
   -> Check onboarding progress (Step 2/6, started 1h ago -- she's still going, good)
   -> Check plan: Free. She should be on Pro trial.
5. Click [Start Trial] -> Select "Professional", 14 days -> Confirm
6. Activity tab:
   -> See her events: signup, onboarding step 1 completed (45 sec), step 2 completed (2 min)
   -> She's moving fast. Good.
7. Navigate back to /admin -> She'll appear in "Needs Attention" if she stalls.
```

### Journey 3: Support Ticket -- "My emails aren't sending" (5 minutes)

```
1. Sarah reports: "I sent a newsletter but nobody received it"
2. Open /admin/users -> Search "Sarah" -> Click row
3. Emails tab:
   -> See last 10 emails. Last newsletter: "Sent 2h ago, Status: Bounced (3 of 12)"
   -> 3 hard bounces to @company.com domain
   -> Diagnosis: Those recipients have invalid emails, not a platform issue
4. Quick response: "3 of your recipients have invalid emails. I've removed them. Your other 9 were delivered successfully."
5. Alternative diagnosis:
   -> All 12 show "Queued" but none sent
   -> Check /admin/system -> Emails tab -> "email_sending flag is OFF" or "Resend rate limit hit"
   -> Fix the root cause, re-queue
```

### Journey 4: Weekly Business Review (15 minutes)

```
1. Open /admin/revenue
2. KPI cards: MRR = $6,670 (+$870 from last month). ARR = $80K projected.
3. Plan distribution: 48% free, 32% pro, 14% studio, 6% team
   -> Insight: 120 free users is a big conversion opportunity
4. Trial pipeline: 42% conversion rate (up from 38% last month)
   -> 8 trials expiring this week. Check who's active:
   -> 3 have high feature usage (>20 actions) -> likely to convert
   -> 5 have low usage (<5 actions) -> at risk, maybe send a nudge
5. Open /admin/analytics -> Adoption tab:
   -> AI Content at 10% adoption. Low. Maybe needs better onboarding.
   -> Email Marketing at 18% but +12% trend. Growing fast.
   -> Website at 3%. Almost nobody uses it. Deprioritize or remove?
6. Retention tab:
   -> Week 1 retention: 72%. Good.
   -> Week 4 retention: 40%. Drops off. What happens at week 3-4?
   -> Cross-reference with Adoption: users who use Newsletters retain 2x better
   -> Action: Push newsletter feature in onboarding
7. Done. Actionable insights captured. No spreadsheet needed.
```

### Journey 5: Incident Response -- "Cron Failed" (3 minutes)

```
1. See red dot on System nav item in sidebar
2. Click -> /admin/system
3. Banner: "System Issues Detected" (red)
4. Crons tab: agent-scoring shows [R] Error, last failed 5h ago
5. Expand row -> see last 10 runs:
   -> 9 success, 1 failure (today at 06:00)
   -> Error: "Supabase connection timeout after 30000ms"
6. Diagnosis: Transient DB issue, likely resolved
7. Click [Run Now] -> Cron executes -> Success -> Status turns green
8. Verify: System banner turns back to green "All Systems Operational"
9. Done. 3 minutes, no SSH, no server logs, no database queries.
```

---

## 12. Chart Specifications

### Sparklines (KPI cards)

- Library: Recharts `<LineChart>` with minimal config
- Dimensions: 80px wide, 32px tall
- No axes, no labels, no tooltip
- Line: 1.5px stroke, color matches trend (emerald for positive, red for negative, muted for neutral)
- Area fill: same color at 10% opacity
- Data: 14 points (one per day for last 14 days)

### Onboarding Funnel Bars

- Pure CSS (no chart library)
- Each bar: `div` with `width: {percentage}%`, min-width for label visibility
- Gradient: `bg-gradient-to-r from-primary to-brand`
- Transition: `transition-all duration-500 ease-out` (animates on date range change)
- Height: `h-7` per bar, `gap-2` between bars

### Donut Charts (Plan Distribution, Checklist)

- Library: Recharts `<PieChart>` with `<Pie innerRadius="60%" outerRadius="80%">`
- Center text: custom `<text>` element positioned at center
- Colors: defined per plan/item
- Tooltip on hover with exact count + percentage
- Legend below (not inside chart)

### Area Charts (MRR Timeline)

- Library: Recharts `<AreaChart>` with stacked `<Area>` per plan
- Responsive: `<ResponsiveContainer width="100%" height={240}>`
- X-axis: months, `text-xs text-muted-foreground`
- Y-axis: dollar amounts, formatted with `$` prefix
- Tooltip: shows exact value per plan on hover
- Grid: light horizontal lines only

### Retention Heatmap

- Pure CSS/HTML `<table>` (not a chart library)
- Cells: fixed-width (`w-16`), colored by value range
- Hover: show exact count in tooltip
- Sticky first column on horizontal scroll

### Feature Adoption Sparklines

- Same as KPI sparklines but smaller: 60px wide, 24px tall
- Inline in table cells
- No area fill, line only

---

## 13. Design Tokens (Admin-Specific)

These extend the existing design system for admin-specific needs:

```css
/* Status colors (semantic, used across all admin sections) */
--admin-status-ok: theme(colors.emerald.500);
--admin-status-warn: theme(colors.amber.500);
--admin-status-error: theme(colors.red.500);

/* Status backgrounds */
--admin-status-ok-bg: theme(colors.emerald.50);
--admin-status-warn-bg: theme(colors.amber.50);
--admin-status-error-bg: theme(colors.red.50);

/* Status text */
--admin-status-ok-text: theme(colors.emerald.700);
--admin-status-warn-text: theme(colors.amber.700);
--admin-status-error-text: theme(colors.red.700);

/* Chart colors */
--admin-chart-1: #2D3E50;  /* navy - primary series */
--admin-chart-2: #FF7A59;  /* coral - secondary series */
--admin-chart-3: #00BDA5;  /* teal - tertiary series */
--admin-chart-4: #f5c26b;  /* gold - quaternary series */
--admin-chart-5: #9B59B6;  /* purple - quinary series */

/* Admin sidebar */
--admin-sidebar-width: 208px;  /* intentionally narrower than CRM sidebar (240px) */
--admin-header-height: 56px;   /* matches CRM header height (h-14) */
```

---

## 14. Component Inventory

Summary of all unique components needed, mapped to existing patterns:

| Component | Reuses | New |
|-----------|--------|-----|
| Admin sidebar | Based on `MondaySidebar` pattern | New (narrower, no logo, status widget) |
| Admin header | Based on admin `layout.tsx` | Modified (add help, remove shield emphasis) |
| KPI card | New | Sparkline + trend arrow + click-through |
| Activity feed | Based on `ActivityFeed.tsx` | Modified (different event types, icons) |
| Quick actions panel | New | Button list + combobox search |
| Needs attention table | Simple table (not DataTable) | New |
| User table | Reuses `DataTable` | Config only (columns, filters) |
| User detail tabs | Based on `PageHeader` tabs | New content per tab |
| Plan timeline | New | Vertical timeline with dots |
| Event timeline | Based on `ActivityFeed` pattern | Modified (grouped by date) |
| Funnel bars | New | Pure CSS horizontal bars |
| Donut chart | Recharts | New wrapper component |
| Area chart | Recharts | New wrapper component |
| Retention heatmap | New | CSS table with colored cells |
| Cron monitor table | DataTable | Config only |
| Error log table | DataTable with expandable rows | New expand pattern |
| Config editor | New | Key-value with inline edit |
| Feature flag panel | Based on `RealtorCard` toggles | Adapted for global scope |
| Announcement editor | New | Textarea + preview + type selector |

Total new components: ~20
Total reused/adapted: ~8

---

## 15. Cross-Reference Notes (PRD Alignment)

Issues identified during review and their resolutions:

| # | Issue | Resolution |
|---|-------|-----------|
| 1 | PRD User Table has 9 columns; UI Design simplified to 7 | **UI Design wins.** "Last Active" is shown inside the Status column as secondary text. "Features" and "MRR" columns removed for cleaner table — available in user detail. PRD updated. |
| 2 | Funnel bar gradient vs "no gradients" rule | **Clarified:** gradients are allowed in data visualization (funnel bars, chart area fills) but NOT on UI chrome (cards, buttons, headers). Both docs updated. |
| 3 | PRD analytics is one scrollable page; UI Design uses 3 tabs | **IMPL overrides both:** Funnel + adoption folded as collapsible sections on Overview page. Retention deferred to v2. No standalone `/admin/analytics` page in v1. |
| 4 | Onboarding step names were wrong in both docs | **Fixed:** Step 4 is "Professional Info" (not "Details"), Step 6 is "Auto-Complete" (not "Complete"). Completion triggers at step >= 7 in code. |
| 5 | Currency: USD for plans, CAD for listing prices | **Explicit:** Admin panel only shows plan revenue (USD). Listing prices in the CRM use CAD. No conflict. |
| 6 | Admin header height (48px in UI) vs CRM header (56px) | **Fixed to 56px** to match CRM header height for visual consistency when switching between panels. |
| 7 | "Export CSV" listed as bulk action but also listed as out-of-scope | **Removed** from bulk actions. Export is v2. |
| 8 | `getUsersNeedingAttention()` missing from PRD server actions | **Added** to PRD. |
| 9 | Impersonation had no technical spec | **Added** Section 17.5 to PRD. **Deferred to v2** per IMPL — use Supabase dashboard for now. |
| 10 | Announcement banner consumer (user-facing) was undefined | **Added** Section 17.6 to PRD. **Simplified in IMPL** to Quick Action modal. |
| 11 | Error/API latency capture mechanism was undefined | **Added** Section 17.7 to PRD. **Cut in IMPL** — Sentry + Vercel Speed Insights handle this. |
| 12 | Migration transition (what shows during rollout) was undefined | **Added** Section 17.8 to PRD with per-phase transition plan. |
| 13 | `src/actions/drip.ts` missing from instrumentation map | **Cut in IMPL** — drip sequences already tracked in their own table. |
| 14 | PRD had `admin_audit_log` table; IMPL merged into `platform_analytics` | **PRD updated** to remove separate table. Admin actions stored as `admin_action` events with before/after state in metadata. |
| 15 | PRD had 20 event types; IMPL reduced to 10 | **PRD updated** to match IMPL's 10 events. Removed events handled by Sentry, Vercel Analytics, or existing `newsletter_events` table. |
| 16 | PRD had `session_id` column; IMPL removed it | **PRD updated** to remove column from SQL. |
| 17 | PRD had 5 user columns added; IMPL kept only 2 | **PRD updated** — `plan_history`, `plan_changed_at`, `total_sessions` removed. Derivable from events. |
| 18 | User detail tabs: PRD had 5, IMPL had 4 | **IMPL updated** to restore Activity tab (5 tabs). Essential for debugging user issues. |
| 19 | `bulkToggleFeature` in PRD but missing from IMPL | **IMPL updated** to add it. |
| 20 | `newsletter_events` has no "sent" event type | **IMPL updated** — "Sent" count queries `newsletters` table (`status = 'sent'`), not `newsletter_events`. |
| 21 | Settings page in UI nav but deferred in IMPL | **UI Design updated** — Settings section marked as v2 deferred with "Coming soon" placeholder. |
| 22 | Impersonation "View as user" links in UI but deferred in IMPL | **UI Design updated** — Links marked as disabled in v1 with "Coming in v2" tooltip. |
| 23 | Retention tab in UI Analytics but deferred in IMPL | **UI Design updated** — Tab shows placeholder with data collection start date. Full spec preserved in collapsed details block for v2. |
