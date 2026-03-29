# Contact Detail Page Redesign — Full Specification

## Objective
Transform the contact detail page from a 5/10 "silent, white, flat" page into a 9/10 "wow" experience that combines the best patterns from 25+ leading CRMs with cutting-edge 2026 UI design.

## Design Principles
1. **Color everywhere** — every section has a distinct color identity
2. **Keep hero features** — workflow stepper + relationship graph stay and get enhanced
3. **Add intelligence** — AI brief, heartbeat, sentiment, predictions
4. **Contextual actions** — buttons change based on contact stage
5. **Liquid Glass** — glassmorphism with depth, blur, micro-animations
6. **Single-thread timeline** — merge all activity into one colorful feed

---

## Phase 1: Color & Visual Life (Quick Wins)

### 1.1 Gradient Hero Header
- Contact type determines gradient: Buyer (blue→indigo), Seller (purple→rose), Agent (amber→orange), Partner (teal→emerald)
- Avatar gets matching glow ring: `ring-4 ring-{color}-300/30`
- Background: `bg-gradient-to-r from-{color}-600/10 via-{color}-500/8 to-{color}-400/5`
- Stage bar integrated into header with colored nodes

### 1.2 Stat Pills Row
- 5 colored metric pills between header and tabs
- Lead Score (emerald), Last Contact (amber), Property Matches (blue), Deal Value (purple), Email Rate (teal)
- Each: gradient background, icon, large number, trend arrow, status dot
- Animate in with stagger: `animate-float-in` with 50ms delay per pill

### 1.3 Colored Tab System
- Active tab pill matches tab color: Overview=indigo, Intelligence=violet, Activity=sky, Deals=emerald
- Tab content area gets matching gradient wash at top: `bg-gradient-to-b from-{color}-50/30 to-transparent`

### 1.4 Section Headers with Gradient Bars
- Each card section: 3px gradient accent bar below header
- Colored icon prefix on every section title
- Section-specific color families (workflows=indigo, tasks=orange, referrals=teal, docs=slate)

### 1.5 Color-Coded Task Rows
- Overdue: `bg-red-50 border-l-4 border-red-400`
- Today: `bg-amber-50 border-l-4 border-amber-400`
- Upcoming: `bg-green-50/50 border-l-4 border-green-300`
- Completed: `bg-gray-50 line-through opacity-60`
- Group tasks by: OVERDUE → TODAY → THIS WEEK → LATER

### 1.6 Colored Timeline Entries
- Call=emerald, Email=blue, SMS=teal, Note=amber, Showing=purple, Stage change=rose, Deal=indigo, Task=orange, Doc=slate
- Each entry: `bg-{color}-50/50 border-l-2 border-{color}-400`
- Day separators: sticky headers with date badge

### 1.7 Right Sidebar Colored Cards
- Engagement: violet→indigo gradient card
- Context/Objections: amber→orange gradient card
- Important Dates: rose→pink gradient card
- Relationships: teal→cyan gradient card

### 1.8 Animated Quick Action Bar
- Large pill buttons with color-coded backgrounds
- Call=emerald, Text=teal, Email=blue, Task=orange, Note=amber
- Hover: `scale(1.05)` + colored glow shadow
- Active: `scale(0.95)` + darker shade

### 1.9 Page Background — Mesh Gradient
- Subtle radial gradient blobs matching contact type
- Buyer: cool tones (blue/indigo blobs)
- Seller: warm tones (purple/rose blobs)
- Very subtle — almost invisible but adds depth

---

## Phase 2: Intelligence Features

### 2.1 AI Contact Brief
- Component: `AIContactBrief.tsx`
- Placement: Below header, above stat pills
- 3-line AI summary: last interaction, key concerns, suggested next action
- Claude Haiku call with last 10 communications + deal stage + preferences
- Cache in `contacts.ai_brief` JSONB, refresh if stale (>4 hours)
- Design: glass card, violet left border, shimmer animation while loading
- Contextual quick action buttons at bottom (change by stage)

### 2.2 Relationship Heartbeat
- Component: `RelationshipHeartbeat.tsx`
- Placement: Inside header card, below contact info
- SVG sparkline showing communication frequency over 90 days
- Pulse speed: fast when active, flatline when dormant
- Color: green (healthy), amber (cooling), red (at risk)
- Metrics: touches/week, days since last, trend direction
- 40px height, compact

### 2.3 Sentiment Strip
- Component: `SentimentStrip.tsx`
- Placement: Below heartbeat in header
- Thin gradient bar: green→amber→red over time
- Last negative quote surfaced below the strip
- Claude Haiku sentiment analysis on last 20 communications
- Cache in `contacts.sentiment_cache` JSONB, refresh daily

### 2.4 Property Match Pulse (Buyers Only)
- Component: `PropertyMatchPulse.tsx`
- Placement: One of the stat pills + expanded card in Details tab
- Live counter: "14 matches" with sparkline of new matches per week
- Compact: counter + trend in stat pill row
- Expanded: horizontal scroll card grid of top 3 matches with [Send] [Book] buttons
- Glow animation when new matches appear

### 2.5 Predictive Next Action Card
- Component: `PredictiveNextAction.tsx`
- Placement: Top of Feed tab (always visible, before timeline)
- AI-generated single best action: "Call now — she viewed 4 listings in the last hour"
- One-click execution button
- Based on: stage, recent activity, comparable past deals
- Refresh on page load via Claude Haiku

### 2.6 Communication Rhythm Heatmap
- Component: `CommunicationRhythm.tsx`
- Placement: Intelligence tab, above or alongside relationship graph
- GitHub-style heatmap: 7 rows (days) x 12 columns (weeks)
- Cell colors: gray (0), emerald-100 (1), emerald-300 (2-3), emerald-600 (4+)
- Pattern detection: "You usually connect on Tue/Thu"
- Alert: amber if current gap > 2x average gap
- Best time suggestion based on historical response rates

---

## Phase 3: Enhanced Existing Features

### 3.1 Unified Feed Tab (Merge Activity + Communication)
- Component: `UnifiedFeed.tsx`
- Replaces separate Activity tab content
- Merges: communications, activities, newsletter_events, appointments
- Grouped by day with sticky date headers
- Filter chips: All | Calls | Emails | SMS | Notes | Showings | System
- Search bar
- Full height — no max-h constraint
- Color-coded entries (see 1.6)
- Inline reply/action buttons on hover

### 3.2 Deal Cinema Timeline
- Component: `DealCinemaTimeline.tsx`
- Placement: Top of Deals tab
- Horizontal scrollable SVG with connected milestone nodes
- Key events: first contact, first call, showings, offer, conditions, close
- Color gradient: gray→blue→green showing momentum
- Future nodes: dashed lines with predicted dates
- Velocity metric: "10 weeks lead→offer (avg: 14 wks)"
- Clickable nodes with detail popover

### 3.3 Enhanced Workflow Stepper (Keep + Upgrade)
- Keep the existing WorkflowStepperCard
- Add: colored progress bar showing % complete
- Add: estimated time remaining based on step delays
- Add: completion animation (confetti/checkmark) when step finishes
- Color: match workflow type (speed_to_contact=red, nurture=blue, post_close=green)

### 3.4 Enhanced Relationship Graph (Keep + Upgrade)
- Keep the existing canvas-based RelationshipGraph
- Add: colored edges by relationship type (spouse=rose, referral=amber, household=indigo, professional=teal)
- Add: node size proportional to interaction frequency
- Add: pulsing animation on nodes with recent activity
- Add: mini-stats on hover (last contact date, deal value, relationship strength)
- Add: "Add Relationship" button floating on canvas

### 3.5 Contextual Quick Actions (State-Aware)
- Component: `ContextualActions.tsx`
- Replace static QuickActionBar with stage-aware buttons
- New Lead: [Qualify] [Schedule Discovery] [Send Welcome] [Create Deal]
- Active Search: [Match Properties] [Book Showing] [Send Listings] [Call]
- Active Listing: [Market Update] [Form Status] [Next Showing] [Call]
- Under Contract: [Track Conditions] [Inspection Checklist] [Key Dates] [Call]
- Past Client: [Anniversary Email] [Request Referral] [Market Update] [Call]
- Cold: [Re-engage] [Drip Campaign] [Archive] [Call]

---

## Phase 4: Advanced Features

### 4.1 Cmd+K Command Palette
- Component: `CommandPalette.tsx` (enhance existing)
- Global: Cmd+K / Ctrl+K
- Search contacts, listings, actions, pages
- Execute actions directly: "schedule showing with Sarah Friday 2pm"
- Recent commands list
- Integrates with voice agent

### 4.2 Liquid Glass Design System
- Upgrade card backgrounds: `backdrop-filter: blur(20px) saturate(180%)`
- Inner light edge: `inset 0 1px 0 oklch(1 0 0 / 40%)`
- Border radius: 16px everywhere
- Transitions: `cubic-bezier(0.33, 1, 0.68, 1)` on all interactions

### 4.3 Micro-Animations
- Task completed: confetti burst (3 particles, 400ms)
- Call logged: ring pulse on phone icon
- Deal advanced: counter bump with scale
- Email sent: paper plane animation
- Contact favorited: heart fill with bounce
- Stage changed: sequential node animation
- Note saved: checkmark draw-in (SVG path)

### 4.4 Smart Compose Anywhere
- Hover any timeline entry → "Reply" button appears
- Opens AI-drafted response with full conversation context
- Knows contact's communication style preferences
- Works for email, SMS, and notes

---

## Implementation Order

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | 1.2 Stat Pills Row | Small | High — immediate visual upgrade |
| P0 | 1.1 Gradient Hero Header | Small | High — sets the tone |
| P0 | 1.6 Colored Timeline Entries | Small | High — the feed comes alive |
| P0 | 1.8 Animated Quick Action Bar | Small | Medium — better interaction |
| P1 | 1.3 Colored Tab System | Small | Medium |
| P1 | 1.5 Color-Coded Task Rows | Small | Medium |
| P1 | 1.7 Right Sidebar Colored Cards | Small | Medium |
| P1 | 1.4 Section Headers + Gradient Bars | Small | Medium |
| P1 | 1.9 Mesh Gradient Background | Small | Low-Medium |
| P2 | 2.1 AI Contact Brief | Medium | Very High |
| P2 | 2.2 Relationship Heartbeat | Small | High |
| P2 | 3.5 Contextual Quick Actions | Small | High |
| P2 | 2.4 Property Match Pulse | Medium | High (buyers) |
| P3 | 3.1 Unified Feed Tab | Large | Very High |
| P3 | 3.2 Deal Cinema Timeline | Medium | High |
| P3 | 2.5 Predictive Next Action | Medium | High |
| P3 | 2.6 Communication Rhythm | Small | Medium |
| P3 | 2.3 Sentiment Strip | Small | Medium |
| P4 | 3.3 Enhanced Workflow Stepper | Medium | Medium |
| P4 | 3.4 Enhanced Relationship Graph | Medium | Medium |
| P4 | 4.1 Cmd+K Palette | Medium | High |
| P4 | 4.2 Liquid Glass System | Medium | High |
| P4 | 4.3 Micro-Animations | Small | Medium |
| P4 | 4.4 Smart Compose | Medium | High |

---

## Files to Create
- `src/components/contacts/AIContactBrief.tsx`
- `src/components/contacts/RelationshipHeartbeat.tsx`
- `src/components/contacts/SentimentStrip.tsx`
- `src/components/contacts/PropertyMatchPulse.tsx`
- `src/components/contacts/PredictiveNextAction.tsx`
- `src/components/contacts/CommunicationRhythm.tsx`
- `src/components/contacts/UnifiedFeed.tsx`
- `src/components/contacts/DealCinemaTimeline.tsx`
- `src/components/contacts/ContextualActions.tsx`
- `src/components/contacts/StatPills.tsx`

## Files to Modify
- `src/app/(dashboard)/contacts/[id]/page.tsx` — layout, header gradient, stat pills, background
- `src/components/contacts/ContactDetailTabs.tsx` — colored tabs, tab backgrounds, feed tab
- `src/components/contacts/CommunicationTimeline.tsx` — colored entries, remove max-h
- `src/components/contacts/ContactTasksPanel.tsx` — color-coded rows, grouping
- `src/components/contacts/QuickActionBar.tsx` — colored pills, hover effects
- `src/components/contacts/RelationshipGraph.tsx` — colored edges, pulsing nodes
- `src/components/contacts/WorkflowStepperCard.tsx` — progress bar, animations
- `src/app/globals.css` — mesh gradient, glass utilities, micro-animations

## Benchmarked Against
Attio, Twenty CRM, Linear, Superhuman, HubSpot, Salesforce Lightning, Zoho Canvas, Freshsales, Close CRM, Clay, Apollo, Lavender, Kustomer, kvCORE, Rechat, Lofty, Pipedrive, Copper, Streak, Folk CRM, Intercom, Front, Monday CRM, Notion, Height
