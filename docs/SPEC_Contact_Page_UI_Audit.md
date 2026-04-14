<!-- docs-audit: src/app/(dashboard)/contacts/**, src/components/contacts/** -->
<!-- last-verified: 2026-04-14 -->

# Contact Page UI/UX Redesign Spec

**Date:** 2026-04-14
**Reference:** Dashboard page (the design standard for Realtors360)
**Scope:** Contacts list page + Contact detail page
**Goal:** Rearrange all existing functionality into a layout that is easy to notice, easy to use, and visually in sync with the Dashboard — while looking best-in-class.
**Constraint:** No functionality is removed. Everything currently on the page stays. We only reorganize, restyle, and add where it helps.

---

## Part A — Dashboard Design DNA (The Reference)

### Layout Principles

```
┌─────────────────────────────────────────────────────────────┐
│  PageHeader: warm greeting + date                           │
├─────────────────────────────────────────────────────────────┤
│  4 × KPI stat cards (grid cols-4)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 🔶 22    │ │ 🟡 17    │ │ 🔵 20    │ │ 🟢 683   │       │
│  │ Active   │ │ Pending  │ │ Open     │ │ Total    │       │
│  │ Listings │ │ Showings │ │ Tasks    │ │ Contacts │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│  Pipeline (full-width stacked bar + legend)                 │
├─────────────────────────────────────────────────────────────┤
│  Today's Priorities (emoji + text list, generous spacing)   │
├───────────────────────────┬─────────────────────────────────┤
│  Recent Activity          │  Deal Pipeline                  │
│  (feed items w/ icons)    │  (card list)                    │
├───────────────────────────┴─────────────────────────────────┤
│  Calendar (mini month + today sidebar)                      │
├─────────────────────────────────────────────────────────────┤
│  AI Daily Brief (sparkle card)                              │
└─────────────────────────────────────────────────────────────┘
```

### Visual DNA extracted from Dashboard code:

| Token | Value | Usage |
|-------|-------|-------|
| Card | `<Card className="border-l-4 border-l-{color}">` | KPI stat cards — colored left border |
| Card padding | `p-4` (CardContent) | Compact but not cramped |
| Icon containers | `h-10 w-10 rounded-lg bg-{color}/10` | Soft colored circle with icon |
| Labels | `text-xs text-muted-foreground uppercase tracking-wider` | ALL section labels |
| Values | `text-2xl font-semibold text-foreground` | Big stat numbers |
| Section spacing | `space-y-6` between sections, `gap-3 md:gap-4` in grids | Generous |
| Section headers | `PIPELINE`, `Today's Priorities`, `Recent Activity` | Clean title case or uppercase |
| Hover | `group-hover:shadow-md transition-shadow` | Subtle lift on interactive cards |
| Border colors | `border-l-brand` (coral), `border-l-success` (teal), `border-l-primary` (navy), `border-l-[#f5c26b]` (amber) | One unique color per stat type |
| Two-column | `grid grid-cols-1 lg:grid-cols-[1fr_320px]` | Activity + sidebar, responsive |

---

## Part B — Contacts List Page Redesign

### Current State
Plain table with search + 3 filters. No context, no stats, no visual warmth.

### Proposed Layout

```
┌─────────────────────────────────────────────────────────────┐
│  PageHeader: "Contacts" + "683 contacts"                    │
│  [Create Contact] button (coral, top-right)                 │
├─────────────────────────────────────────────────────────────┤
│  4 × KPI stat cards (same style as Dashboard)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 🟢 12    │ │ 🔥 104   │ │ 🔶 85    │ │ 📈 6     │       │
│  │ New This │ │ Hot      │ │ In       │ │ Closed   │       │
│  │ Week     │ │ Leads    │ │ Pipeline │ │ This Mo  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│  Pipeline Bar (clickable! click a stage to filter table)    │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  New Leads 585 | Qualified 85 | Active 0 | Under Contract 7│
├─────────────────────────────────────────────────────────────┤
│  Search + Filters (unchanged)                               │
│  ┌────────────────────┐ [All Types ▾] [All Stages ▾] [...] │
│  │ 🔍 Search...       │                                     │
│  └────────────────────┘                                     │
├─────────────────────────────────────────────────────────────┤
│  DataTable (unchanged — same columns, sorting, pagination)  │
│  ┌──────────────────────────────────────────────────────────┤
│  │ ☐  NAME ↕  EMAIL  PHONE  TYPE  SCORE  STAGE  ACTIVITY  │
│  │ ☐  Aman Dhindsa  aman@...  +1604...  Buyer  Hot 65  New│
│  │ ...                                                      │
│  └──────────────────────────────────────────────────────────┤
│  200 total · showing 1–25     [◀ Page 1 of 8 ▶]            │
└─────────────────────────────────────────────────────────────┘
```

### What's new:
1. **4 KPI stat cards** above the table — same Card + border-l-4 style as Dashboard. Numbers are live from DB. Each card is clickable (links to filtered view).
2. **Pipeline bar** (reuse `PipelineSnapshot` from Dashboard) — clicking a segment filters the table to that stage.
3. **"New This Week" stat** — encourages daily engagement.

### What's unchanged:
- Search, Type/Stage/Score filters, DataTable, pagination, bulk select, row actions, sorting — all identical.

---

## Part C — Contact Detail Page Redesign

### Current Problems (Summary)
1. Two duplicate progressions (Pipeline stepper + Buyer Journey) stacked together
2. 6 equal-weight action buttons with no hierarchy
3. Right sidebar with 10+ sections (requires scrolling, content gets buried)
4. Main content goes empty after Quick Setup section
5. Tabs scroll-to-section rather than replacing content
6. Quick Setup dominates viewport over real data
7. Delete button next to Edit in the header
8. Mixed icon styles (Lucide + emoji on same page)
9. Inconsistent card borders, spacing, typography vs Dashboard

### Proposed Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Contacts / AMAN DHINDSA                                │
├──────────────────────────────────────────┬──────────────────────────┤
│                                          │                          │
│  CONTACT HEADER CARD                     │   ENGAGEMENT RING        │
│  ┌─────────────────────────────────────┐ │   ┌──────────────────┐  │
│  │ [AD]  AMAN DHINDSA                  │ │   │    0 / 100       │  │
│  │       Buyer · Qualified · Referral  │ │   │  ○ stable        │  │
│  │       📞 +1177... 📧 test23@...    │ │   │  Cold → Ready    │  │
│  │       💬 Prefers SMS                │ │   └──────────────────┘  │
│  │                                     │ │                          │
│  │  [✏️ Edit]  [⋯ More]               │ │   0 Opens  0 Clicks     │
│  └─────────────────────────────────────┘ │   0 Sent                │
│                                          │                          │
├──────────────────────────────────────────┤──────────────────────────┤
│  4 × STAT CARDS (Dashboard style)        │                          │
│  ┌────────┐┌────────┐┌────────┐┌───────┐│  QUICK ACTIONS           │
│  │🔥Lead  ││📊Engage││🤝Network││📅Last ││  ┌──────────────────┐  │
│  │Score   ││Score   ││Value   ││Contact││  │ 📞 Call           │  │
│  │ 65     ││ 0/100  ││ $0     ││ Never ││  │ 💬 Text           │  │
│  └────────┘└────────┘└────────┘└───────┘│  │ 📧 Email          │  │
│                                          │  │ 📝 Log Note       │  │
├──────────────────────────────────────────┤  │ ✅ Add Task        │  │
│  JOURNEY (single unified bar)            │  └──────────────────┘  │
│  ●━━━━━━○━━━━━━○━━━━━━○━━━━━━○━━━━━━○   │                          │
│  New   Qualified Active  Under  Closed   │  JOURNEY CONTROLS       │
│  Lead          Search  Contract          │  ┌──────────────────┐  │
│  (current: New, enrolled Apr 13)         │  │ Status: Active    │  │
│                                          │  │ Mode: Review first│  │
│                                          │  │ Trust: L0 Ghost   │  │
│                                          │  │ Freq: 1/week      │  │
│                                          │  │ [Enroll] [Pause]  │  │
│                                          │  └──────────────────┘  │
├──────────────────────────────────────────┤                          │
│                                          │  NOTES TO AI            │
│  TAB BAR                                 │  ┌──────────────────┐  │
│  [Overview] [Activity] [Deals] [Config]  │  │ e.g., Has 2 kids │  │
│                                          │  │ [Save notes]      │  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  └──────────────────┘  │
│                                          │                          │
│  TAB: OVERVIEW (default)                 │  CONTENT TYPES           │
│  ┌─────────────────────────────────────┐ │  ┌──────────────────┐  │
│  │  🏠 BUYER PREFERENCES              │ │  │ ☑ Listing Alerts │  │
│  │  Price: $600K – $1.2M              │ │  │ ☑ Market Updates  │  │
│  │  Types: Detached, Condo            │ │  │ ☑ Neighbourhood   │  │
│  │  Areas: [Burnaby]                  │ │  │ ☑ Open House      │  │
│  │  Timeline: 3-6 months              │ │  │ ☑ Home Anniversary│  │
│  │  Financing: Pre-Approved     [✏️]  │ │  │ ☑ Just Sold       │  │
│  └─────────────────────────────────────┘ │  └──────────────────┘  │
│  ┌─────────────────────────────────────┐ │                          │
│  │  👨‍👩‍👧 FAMILY                        │ │                          │
│  │  No family added yet  [+ Add]      │ │                          │
│  └─────────────────────────────────────┘ │                          │
│  ┌────────────────┐┌──────────────────┐  │                          │
│  │ 🤝 REFERRALS   ││ 👥 RELATIONSHIPS │  │                          │
│  │ Referred by:   ││ Rahul Singh      │  │                          │
│  │ Rahul Singh    ││ 🤝 Friend        │  │                          │
│  │ Open · Buyer   ││ College friend   │  │                          │
│  │ [+ Add]        ││ [+ Add]          │  │                          │
│  └────────────────┘└──────────────────┘  │                          │
│  ┌─────────────────────────────────────┐ │                          │
│  │  🏘 PORTFOLIO                       │ │                          │
│  │  No properties added  [+ Add]      │ │                          │
│  └─────────────────────────────────────┘ │                          │
│  ┌─────────────────────────────────────┐ │                          │
│  │  📋 QUICK SETUP (3 remaining)      │ │                          │
│  │  ○ Add Context  ○ Upload Doc       │ │                          │
│  │  ○ Add Task                        │ │                          │
│  └─────────────────────────────────────┘ │                          │
│                                          │                          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                          │
│                                          │                          │
│  TAB: ACTIVITY (click to switch)         │                          │
│  ┌─────────────────────────────────────┐ │                          │
│  │  Communication Timeline             │ │                          │
│  │  📧 Sent email — Welcome... 19d ago │ │                          │
│  │  📱 Sent sms — Hi Rahul... 10h ago  │ │                          │
│  │  📝 Note — Met at open... 2d ago    │ │                          │
│  │  [Load more]                        │ │                          │
│  └─────────────────────────────────────┘ │                          │
│  ┌─────────────────────────────────────┐ │                          │
│  │  📊 INTELLIGENCE                    │ │                          │
│  │  Email engagement patterns...       │ │                          │
│  └─────────────────────────────────────┘ │                          │
│  ┌─────────────────────────────────────┐ │                          │
│  │  📧 EMAIL HISTORY                   │ │                          │
│  │  List of sent/received emails       │ │                          │
│  └─────────────────────────────────────┘ │                          │
│                                          │                          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                          │
│                                          │                          │
│  TAB: DEALS (click to switch)            │                          │
│  ┌─────────────────────────────────────┐ │                          │
│  │  🏘 PORTFOLIO (expanded)            │ │                          │
│  │  Property cards with map links...   │ │                          │
│  └─────────────────────────────────────┘ │                          │
│  ┌─────────────────────────────────────┐ │                          │
│  │  📄 DOCUMENTS                       │ │                          │
│  │  Upload / view docs grid            │ │                          │
│  └─────────────────────────────────────┘ │                          │
│  ┌─────────────────────────────────────┐ │                          │
│  │  🏠 CONNECTED LISTINGS              │ │                          │
│  │  Listings where this contact is     │ │                          │
│  │  buyer or seller                    │ │                          │
│  └─────────────────────────────────────┘ │                          │
│                                          │                          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │                          │
│                                          │                          │
│  TAB: CONFIG (click to switch)           │                          │
│  Journey controls, Content types,        │                          │
│  AI notes, Frequency, Trust level,       │                          │
│  Danger zone (remove from journeys)      │                          │
│                                          │                          │
└──────────────────────────────────────────┴──────────────────────────┘
```

---

## Part D — Detailed Changes (Section by Section)

### D1. Header Card

**Current:** Name + badges + Edit/Delete on one line. Phone/email below.
**New:**

| Element | Change |
|---------|--------|
| Contact avatar | Keep initials circle, but add subtle colored ring matching their lead score (green/amber/red) |
| Name | h1, unchanged |
| Badges | Keep all: type badge (Buyer/Seller), status badge (Qualified/New), source badge (Referral). Use pill style matching Dashboard |
| Contact info | Phone, email, preferred channel — keep on second line with icons |
| Edit button | Keep, style as outlined ghost button with pencil icon |
| Delete button | **Move into "⋯ More" dropdown menu** alongside: Archive, Merge, Export vCard |
| "+ tag" | Keep, but style as subtle text link, not a badge |

**New addition — "⋯ More" menu:**
```
⋯ More ▾
├─ Archive contact
├─ Merge with duplicate
├─ Export vCard
├─ Print contact card
├─ ─────────────
└─ 🗑 Delete contact (red text)
```

This removes the red Delete button from the header and organizes secondary actions into one menu. Safer, cleaner.

### D2. Stat Cards (NEW — replaces nothing, adds above-the-fold context)

**4 Dashboard-style stat cards** placed directly below the header:

| Card | Border Color | Icon | Value | Source |
|------|-------------|------|-------|--------|
| Lead Score | `border-l-brand` (coral) | 🔥 | 65 (or "—" if none) | `contacts.newsletter_intelligence.engagement_score` |
| Engagement | `border-l-[#f5c26b]` (amber) | 📊 | 0/100 + "stable" | Same JSONB field |
| Network Value | `border-l-success` (teal) | 🤝 | $0 (or computed from referral deals) | Referrals + deal values |
| Last Contact | `border-l-primary` (navy) | 📅 | "3 days ago" / "Never" | `contacts.last_activity_date` |

**Style:** Exactly matching Dashboard `<Card className="border-l-4 border-l-{color}">` with `h-10 w-10 rounded-lg bg-{color}/10` icon containers.

### D3. Unified Journey Bar (MERGE two existing components into one)

**Current:** Pipeline stepper (numbered circles) + Buyer Journey (emoji icons) = two confusing horizontal bars.
**New:** Single horizontal stepper combining both:

```
●━━━━━━●━━━━━━○━━━━━━○━━━━━━○━━━━━━○
New    Qualified  Active   Under    Closed
Lead              Search   Contract
                                          Enrolled Apr 13, 2026
```

- Uses the **Pipeline stages** (New, Qualified, Active Search, Under Contract, Closed, Cold) since these are the CRM stages.
- The **Buyer Journey** phase (New Lead, Warming, Engaged, Hot Buyer, Active, Contract, Closed) maps to the same stages but with finer granularity. Show the buyer journey sub-phase as a tooltip or subtitle under the matching pipeline stage.
- Current stage is highlighted with the brand color (coral fill).
- Completed stages show a green checkmark.
- Future stages are grey circles.
- Clicking a stage opens a confirmation dialog to advance/regress the contact.

**This replaces:** Both the Pipeline Stepper AND the Buyer Journey section, saving ~200px of vertical space.

### D4. Quick Actions (Right Sidebar, replaces 6 inline buttons)

**Current:** 6 equal-weight outline buttons in a row: Call, Voice, Text, Log Note, Add Task, Email
**New:** Vertical stack in right sidebar with clear hierarchy:

```
QUICK ACTIONS
┌─────────────────────┐
│ 📞 Call             │  ← primary (filled brand if phone exists)
│ 💬 Text             │
│ 📧 Email            │
│ 📝 Log Interaction  │  ← opens Log Interaction as a MODAL
│ ✅ Add Task          │
└─────────────────────┘
```

- **"Voice" button removed from list** — it's the Voice Agent feature which has its own floating button. No need to duplicate.
- **Log Interaction becomes a modal** instead of a permanent sidebar widget. Triggered by clicking "Log Interaction" in Quick Actions. This frees up ~250px of sidebar space.
- Primary action (Call) gets brand styling if the contact has a phone number.

### D5. Tab Bar (REDUCE from 7 to 4, TRUE content replacement)

**Current:** Overview, Intelligence, Activity, Deals, Family, Portfolio, Emails — 7 tabs that scroll-to-section.
**New:** 4 tabs with actual content switching:

| Tab | Contains (moved from) | Notes |
|-----|----------------------|-------|
| **Overview** | Buyer/Seller Preferences, Family, Referrals (from sidebar), Relationships (from sidebar), Portfolio (summary), Quick Setup | The "home" view — everything about who this person is |
| **Activity** | Communication Timeline, Intelligence analytics, Email History | Everything about interactions with this person |
| **Deals** | Portfolio (detailed), Documents, Connected Listings | Properties and paperwork |
| **Config** | Journey controls (from sidebar), Send mode, Trust level, Frequency, Content Types (from sidebar), Notes to AI (from sidebar), Danger Zone (from sidebar) | All the "settings" for this contact's AI/automation behavior |

**Key change:** Tabs now **replace content** (conditional render) rather than scroll to anchors. Each tab shows a completely different view.

### D6. Overview Tab Content (Default View)

This is what users see first. Order matters — most important at the top:

1. **Buyer/Seller Preferences** — keep the existing `BuyerPreferencesPanel` as-is (it's already well-designed). Full width card.

2. **Referrals + Relationships** — **side by side in a 2-column grid** (moved FROM sidebar). These are core CRM data and deserve main-content real estate.
   ```
   ┌─────────────────────┬─────────────────────┐
   │ 🔄 REFERRALS        │ 👥 RELATIONSHIPS     │
   │ Referred by:        │ Rahul Singh          │
   │ Rahul Singh         │ 🤝 Friend            │
   │ Open · Buyer · Apr  │ College friend       │
   │ [+ Add Referral]    │ [+ Add]              │
   └─────────────────────┴─────────────────────┘
   ```

3. **Family** — keep `FamilyMembersPanel`, full width card.

4. **Portfolio** (summary) — compact 1-2 line summary with "View all in Deals tab →" link.

5. **Quick Setup** (if incomplete) — **collapsed by default** as a single progress bar: "Profile 60% complete — 3 items remaining [Expand ▾]". Clicking expands to show the cards. For contacts with everything filled, this section is completely hidden.

### D7. Right Sidebar (Slimmed Down)

The sidebar keeps only **contextual widgets that inform real-time decisions**:

| Section | Action |
|---------|--------|
| Engagement Ring + Opens/Clicks/Sent | **Keep** — at-a-glance health indicator |
| Quick Actions (Call/Text/Email/Log/Task) | **Move here** from main content action buttons |
| Journey Controls (status, mode, trust, freq) | **Keep** — collapsed by default, expandable |
| Notes to AI | **Keep** — always visible for quick note capture |
| Content Types checkboxes | **Keep** — compact, useful |
| Network Stats (Connections/Referrals/Value) | **Keep** — nice dashboard-style cards |
| Log Interaction widget | **Move to modal** — triggered from Quick Actions |
| Referrals section | **Move to main Overview tab** |
| Relationships section | **Move to main Overview tab** |
| Danger Zone | **Move to Config tab** |
| Build This Profile checklist | **Replace with** the collapsed Quick Setup in main content |
| Data Score % | **Keep** — under Network Stats |

**Result:** Sidebar shrinks from 10+ sections to ~6 focused sections. No more scrolling required to see everything.

### D8. Log Interaction Modal (NEW — replaces sidebar widget)

Currently the Log Interaction widget takes up ~250px of sidebar height with 7 type buttons + notes + result + submit. This becomes a **modal dialog** triggered from the Quick Actions "Log Interaction" button:

```
┌──────────────────────────────────────┐
│  Log Interaction — AMAN DHINDSA      │
│                                      │
│  Type:                               │
│  [📞 Inbound] [📞 Outbound]         │
│  [💬 Text/SMS] [💬 WhatsApp]        │
│  [🏠 Open House] [🤝 In-Person]    │
│  [📱 Social DM]                      │
│                                      │
│  Notes:                              │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  Result:                             │
│  [Interested] [Not Ready]            │
│  [Follow Up]  [Lost Interest]        │
│                                      │
│  Engagement: +25 points              │
│                                      │
│  [Cancel]              [Log It ✓]    │
└──────────────────────────────────────┘
```

Same fields, same logic, same result options — just in a focused modal instead of a permanent sidebar widget. Opens fast, closes after submit, no sidebar clutter.

### D9. Activity Tab Content

```
┌─────────────────────────────────────────┐
│  📬 COMMUNICATION TIMELINE              │
│                                         │
│  ● 📧 Sent email — Welcome intro...    │
│  │    19 days ago                       │
│  │                                      │
│  ● 📱 Sent sms — Hi Rahul, following.. │
│  │    10 hours ago                      │
│  │                                      │
│  ● 📝 Logged note — Met at open house  │
│  │    2 days ago                        │
│  │                                      │
│  [Load more ▾]                          │
├─────────────────────────────────────────┤
│  🧠 INTELLIGENCE                        │
│  Email open patterns, best send times,  │
│  engagement trends chart                │
├─────────────────────────────────────────┤
│  📧 EMAIL HISTORY                       │
│  All newsletters/emails sent to this    │
│  contact with open/click status         │
└─────────────────────────────────────────┘
```

### D10. Deals Tab Content

```
┌─────────────────────────────────────────┐
│  🏘 PORTFOLIO (full view)               │
│  All owned/interested properties with   │
│  type, status, city, notes              │
│  [+ Add Property]                       │
├─────────────────────────────────────────┤
│  📄 DOCUMENTS                           │
│  Uploaded contracts, IDs, pre-approvals │
│  [+ Upload Doc]                         │
├─────────────────────────────────────────┤
│  🏠 CONNECTED LISTINGS                  │
│  Listings where this contact is buyer   │
│  or seller — with status, price, link   │
└─────────────────────────────────────────┘
```

### D11. Config Tab Content

```
┌─────────────────────────────────────────┐
│  🤖 JOURNEY SETTINGS                    │
│  Status: Active (lead) [Pause]          │
│  Send mode: [Review first] [Auto-send]  │
│  Trust level: L0: Ghost                 │
│  Frequency: [1/week] [2/week] [3/week]  │
│  AI recommends 2/week based on...       │
├─────────────────────────────────────────┤
│  📬 CONTENT TYPES                       │
│  ☑ Listing Alerts (AI recommended)     │
│  ☑ Market Updates (AI recommended)     │
│  ☑ Neighbourhood Guides               │
│  ☑ Open House Invites                 │
│  ☑ Home Anniversary                   │
│  ☑ Just Sold                          │
├─────────────────────────────────────────┤
│  🧠 NOTES TO AI                         │
│  [textarea]                             │
│  [Save notes]                           │
├─────────────────────────────────────────┤
│  ⚠️ DANGER ZONE                         │
│  [Remove from all journeys]             │
└─────────────────────────────────────────┘
```

---

## Part E — Visual Sync Checklist

Every element on the Contact page must use these exact Dashboard tokens:

| Element | CSS Class | Example |
|---------|-----------|---------|
| Section headers | `text-xs text-muted-foreground uppercase tracking-wider font-semibold` | "BUYER PREFERENCES" |
| Cards | `<Card>` component with `border-l-4 border-l-{color}` | Stat cards, preference cards |
| Card padding | `p-4` or `p-5` | All CardContent |
| Stat numbers | `text-2xl font-semibold text-foreground` | Lead score "65", Network "$0" |
| Stat labels | `text-xs text-muted-foreground uppercase tracking-wider` | "Lead Score", "Network Value" |
| Icon containers | `h-10 w-10 rounded-lg bg-{color}/10 flex items-center justify-center` | Stat card icons |
| Section gaps | `space-y-6` (between sections), `gap-3 md:gap-4` (within grids) | Consistent spacing |
| Hover states | `hover:shadow-md transition-shadow` on interactive cards | Clickable cards lift |
| Tab bar | Underline active tab with `border-b-2 border-brand` | Clean active indicator |
| Buttons (primary) | `bg-brand text-white` | "Call" button when phone exists |
| Buttons (secondary) | `border border-border text-foreground hover:bg-muted` | "Text", "Email" |
| Buttons (danger) | Hidden in "More" menu, `text-destructive` | "Delete contact" |

---

## Part F — New Functionality Recommendations

### F1. Contact Activity Sparkline (NEW)

A tiny inline chart (last 30 days) showing email opens + interactions as dots on a timeline. Placed next to the Engagement Ring in the sidebar. HubSpot has this — it instantly shows if a contact is warming up or going cold.

### F2. "Similar Contacts" Card (NEW)

At the bottom of the Overview tab, show 3 contacts with similar preferences (same area, same price range, same type). Helps realtors spot opportunities for cross-referrals.

### F3. Pipeline Stage Drag (NEW)

Let users click on a pipeline stage to advance the contact directly from the detail page. Shows a confirmation: "Move AMAN DHINDSA from New → Qualified?" with a reason dropdown.

### F4. "Last Interaction" Timer (NEW)

In the header area, show time since last contact: "Last reached out: 10 hours ago" in green, or "⚠️ 45 days since last contact" in red. Creates urgency to follow up.

---

## Part G — What Gets Deleted

| Item | Reason |
|------|--------|
| Pipeline Stepper (numbered circles) | Merged into unified Journey Bar |
| Buyer Journey (separate icon bar) | Merged into unified Journey Bar |
| "Voice" action button | Redundant with floating Voice Agent button |
| Build This Profile checklist (sidebar) | Replaced by collapsed Quick Setup in main content |
| Permanent Log Interaction sidebar widget | Replaced by modal (same functionality, better UX) |

**Note:** The functionality behind all of these is preserved. Pipeline stages still work, buyer journey phases still track, voice agent still accessible, profile checklist items still shown in Quick Setup, interaction logging still works via modal. Only the UI arrangement changes.

---

## Part H — Implementation Priority

| Phase | Scope | Impact |
|-------|-------|--------|
| **Phase 1** | Tab system (true content switching), move Referrals/Relationships to Overview tab | High — fixes the #1 layout problem (empty main area, buried sidebar content) |
| **Phase 2** | Add stat cards, merge Pipeline + Journey into one bar, move Delete to "More" menu | High — brings visual sync with Dashboard |
| **Phase 3** | Log Interaction modal, Quick Actions sidebar, collapse Quick Setup | Medium — cleans up sidebar clutter |
| **Phase 4** | Contacts list KPI cards + pipeline bar | Medium — brings list page up to Dashboard standard |
| **Phase 5** | New features (sparkline, similar contacts, drag pipeline, last interaction timer) | Low — polish and competitive edge |

---

## Part I — Files Affected

| File | Changes |
|------|---------|
| `src/app/(dashboard)/contacts/[id]/page.tsx` | Major restructure: new stat cards, unified journey, 4-tab system, content redistribution |
| `src/components/contacts/ContactSidebar.tsx` | Slim down: remove Referrals, Relationships, Log Interaction, Danger Zone, Build Profile |
| `src/components/contacts/RelationshipManager.tsx` | Move render location into Overview tab (no logic changes) |
| `src/components/contacts/ReferralManager.tsx` (or equivalent) | Move render location into Overview tab |
| `src/components/contacts/BuyerPreferencesPanel.tsx` | No changes — already good |
| `src/components/contacts/FamilyMembersPanel.tsx` | No changes — just moves into Overview tab |
| `src/components/contacts/LogInteractionModal.tsx` | **New file** — extract from sidebar into modal component |
| `src/components/contacts/ContactMoreMenu.tsx` | **New file** — "⋯ More" dropdown with Delete, Archive, Merge, Export |
| `src/app/(dashboard)/contacts/page.tsx` | Add stat cards + pipeline bar above table |
| `src/components/contacts/ContactStatCards.tsx` | **New file** — 4 dashboard-style KPI cards for contact detail |
| `src/components/contacts/UnifiedJourneyBar.tsx` | **New file** — merged pipeline + buyer journey visualization |

---

*This is a design specification document. No code changes are included. Ready for implementation when approved.*
