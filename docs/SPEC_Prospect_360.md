<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- docs-audit: src/components/contacts/*, src/actions/contacts.ts -->
# Prospect 360 — Complete Specification

## Overview

The Prospect 360 View is the central page where a realtor sees everything about a prospect: their journey, email history, behavioral intelligence, upcoming communications, and full controls. It replaces the current basic contact detail page with a living, AI-powered relationship dashboard.

**Route:** `/contacts/[id]`
**Replaces:** Current contact detail page (keep existing data, redesign the UI)

---

## User Stories

### US-1: Journey Progress Visualization

**As a** realtor,
**I want to** see exactly where a prospect is in their journey at a glance,
**So that** I know how engaged they are and what's coming next.

**Acceptance Criteria:**
- [ ] Horizontal progress bar at top of contact page
- [ ] Phases: Lead → Warm → Engaged → Hot → Active Buyer/Seller → Under Contract → Closed
- [ ] Current phase highlighted with "YOU ARE HERE" marker
- [ ] Phase transition dates shown below each completed phase
- [ ] Color coding: completed = green, current = indigo pulse, future = gray
- [ ] Clicking a phase shows what triggered the transition

**UI Mockup:**
```
●━━━━━━●━━━━━━●━━━━━━●━━━━━━○━━━━━━○━━━━━━○
Lead   Warm   Engaged Hot    Active  Contract Close
Mar 1  Mar 7  Mar 14  TODAY
                      ↑
                  YOU ARE HERE
```

**Technical:**
- Data source: `contact_journeys.current_phase` + `contacts.newsletter_intelligence.trend_data`
- Phase mapping: lead (score 0-20), warm (20-40), engaged (40-60), hot (60-80), active (showing booked), under_contract (offer accepted), closed (deal done)
- Transition dates: derive from `trend_data` weekly scores or `agent_learning_log` entries
- Component: `<JourneyProgressBar contact={contact} journey={journey} />`

---

### US-2: Email History Timeline

**As a** realtor,
**I want to** see every email sent to this prospect, what they clicked, and what was held back,
**So that** I understand the full communication history and can see what's working.

**Acceptance Criteria:**
- [ ] Vertical timeline showing all emails in chronological order (newest first)
- [ ] Each email shows: date/time, subject, status badge (sent/opened/clicked/suppressed/failed)
- [ ] Sent emails show inline: open time (how fast), every click with URL and timestamp
- [ ] "Book Showing" or "Get CMA" clicks highlighted with fire emoji
- [ ] Suppressed emails shown with gray styling + AI reason ("0/3 opened market updates")
- [ ] "Preview email" button opens HTML in side panel (not modal — inline slide)
- [ ] Filter toggle: Show all / Sent only / Suppressed only
- [ ] Show notification that was sent to realtor for hot lead actions

**UI Mockup:**
```
┌─ Mar 21 · 9:15 AM ──────────────────────────────────────┐
│  📧 "That Kitsilano 3BR you'd love"          ✅ Opened   │
│  ├─ Opened: 9:18 AM (3 min after send)                   │
│  ├─ Clicked: 3456 W 4th Ave listing (9:19 AM)            │
│  ├─ Clicked: Floor plan PDF (9:20 AM)                     │
│  └─ Clicked: "Book Showing" (9:22 AM) 🔥                 │
│     → You were notified at 9:22 AM                        │
│  [Preview email ▸]                                        │
└───────────────────────────────────────────────────────────┘

┌─ Mar 14 · 10:30 AM ──────────────────────────────────────┐
│  🚫 Market Update                           ⛔ Held back  │
│  └─ Reason: Sarah doesn't engage with market updates      │
│     (0/3 opened). Agent skipped.                          │
│  [View draft that was held ▸]                             │
└───────────────────────────────────────────────────────────┘
```

**Technical:**
- Data source: `newsletters` table joined with `newsletter_events` grouped by newsletter_id
- Query: `SELECT * FROM newsletters WHERE contact_id = ? ORDER BY created_at DESC`
- Events: `SELECT * FROM newsletter_events WHERE newsletter_id IN (...)`
- Suppressed emails: need a new `suppression_log` table or use newsletters with `status = 'suppressed'`
- Click classification: parse `newsletter_events.metadata.link` to categorize (listing, CMA, showing, etc.)
- Component: `<EmailHistoryTimeline contactId={id} />`
- Side panel preview: iframe with `srcdoc={newsletter.html_body}`

**Edge Cases:**
- Email with no events (sent but never opened) — show "No opens" in muted text
- Email with bounce — show bounce reason from Resend webhook
- Multiple clicks on same link — show count, not duplicate entries
- Manual emails (sent outside journey) — show with "Manual" badge, different icon

---

### US-3: Behavioral Intelligence Panel

**As a** realtor,
**I want to** see what the AI has learned about this prospect's preferences and behavior,
**So that** I understand what they're looking for without having to remember from conversations.

**Acceptance Criteria:**
- [ ] Engagement score (0-100) with visual bar + trend arrow (↑ accelerating, → stable, ↓ declining)
- [ ] Opens/clicks count + average open speed
- [ ] "Interested In" section: areas (as pills), property type, budget range, beds, lifestyle tags
- [ ] "Responds To / Doesn't Respond To" two-column comparison
- [ ] Best send time: day/hour heatmap with confidence level
- [ ] Direct interactions log: calls, texts, visits with notes (entered by realtor)
- [ ] All inferred data labeled as "inferred from X clicks" — not presented as fact

**UI Mockup:**
```
ENGAGEMENT
┌────────────────────────────────────────────────┐
│  Score: 72/100  ████████████████░░░░░ Hot ↑    │
│  Opens: 5/6 (83%) · Clicks: 11 · Avg speed: 8m│
└────────────────────────────────────────────────┘

INTERESTED IN
┌────────────────────────────────────────────────┐
│  Areas:     [Kitsilano] [Point Grey]           │
│  Type:      [Detached] [Townhouse]             │
│  Budget:    $1.1M – $1.4M (from 6 clicks)     │
│  Beds:      3+ (clicked 3BR 6x)               │
│  Lifestyle: Family, schools, parks             │
└────────────────────────────────────────────────┘

RESPONDS TO              DOESN'T RESPOND TO
┌──────────────────┐     ┌──────────────────┐
│ ✅ Listing alerts │     │ ❌ Market updates │
│ ✅ Short emails   │     │ ❌ Long content   │
│ ✅ Tue mornings   │     │ ❌ Weekend sends  │
└──────────────────┘     └──────────────────┘

BEST SEND TIME
┌────────────────────────────────────────────────┐
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun             │
│   ·   ██    ·   ██    ·    ·    ·              │
│       9AM       7PM                             │
│  Confidence: High (18 data points)             │
└────────────────────────────────────────────────┘
```

**Technical:**
- Data source: `contacts.newsletter_intelligence` JSONB (expanded schema — see Adaptive Marketing memory)
- Engagement trend: calculated from `trend_data` array (last 4 weeks of opens/clicks)
- Content preferences: from `content_preferences` object (sent/opened/clicked counts per type)
- Send time: from `timing_patterns` object (best_day, best_hour, data_points)
- Inferred interests: from `click_history` array, grouped by category
- Budget inference: min/max price from clicked listings
- Component: `<IntelligencePanel intelligence={contact.newsletter_intelligence} />`

**Edge Cases:**
- New contact with no data — show "Not enough data yet. Engagement will build as emails are sent."
- Contact who only calls (no email engagement) — show direct interaction data prominently, email intelligence section shows "This contact prefers direct communication"
- Conflicting signals (clicks condos AND houses) — show both, don't force a single category

---

### US-4: Upcoming Communications

**As a** realtor,
**I want to** see what emails are scheduled and what will happen if the prospect takes action,
**So that** I can preview, reschedule, or skip upcoming communications.

**Acceptance Criteria:**
- [ ] Next scheduled email card: type, date/time, AI reasoning
- [ ] Action buttons: Preview draft, Reschedule (date picker), Skip this one, Send now
- [ ] Full sequence view: numbered list of past (completed ✅) + future (planned ○) steps
- [ ] "If prospect converts" prediction: what triggers next phase, what emails follow
- [ ] Conversion prediction: estimated days based on engagement velocity
- [ ] "Add custom email" button — inject a manual email into the sequence
- [ ] "Reorder sequence" — drag to rearrange future steps

**UI Mockup:**
```
NEXT SCHEDULED
┌────────────────────────────────────────────────────────────┐
│  📧 Listing Alert                                          │
│  Tuesday Mar 25 · 9:00 AM                                  │
│  AI will match new Kits listings at send time.             │
│  Why: Sarah clicks listing alerts 83% of the time.         │
│       Tuesday 9AM is her peak open time.                   │
│                                                            │
│  [Preview draft] [Reschedule] [Skip] [Send now]            │
└────────────────────────────────────────────────────────────┘

SEQUENCE
  1. ✅ Welcome email (Mar 1) — sent, opened
  2. ✅ Neighbourhood guide (Mar 7) — sent, clicked
  3. ✅ Listing alert #1 (Mar 12) — sent, clicked
  4. ✅ Listing alert #2 (Mar 18) — sent, clicked 2x
  5. ✅ Listing alert #3 (Mar 21) — sent, clicked SHOWING 🔥
  6. → Listing alert #4 (Mar 25) — scheduled ← NEXT
  7. ○ Listing alert #5 (Mar 28) — planned
  8. ○ Market update (Apr 1) — planned

  [+ Add custom email]  [Reorder sequence]  [Pause all]

IF SARAH CONVERTS
┌────────────────────────────────────────────────────────────┐
│  Based on engagement (score 72, accelerating), Sarah is    │
│  likely to book a showing within 7-10 days.                │
│                                                            │
│  When she does:                                            │
│  → Journey advances to "Active Buyer"                      │
│  → Pre-showing email auto-sends                            │
│  → Post-showing follow-up scheduled 24h after              │
│  → Weekly showing roundup begins                           │
│                                                            │
│  You'll be notified when she:                              │
│  • Clicks "Book Showing" in any email                      │
│  • Score reaches 80+                                       │
│  • Calls or texts you                                      │
└────────────────────────────────────────────────────────────┘
```

**Technical:**
- Next email: `contact_journeys.next_email_at` + journey type to determine email type
- Sequence: built from `realtor_agent_config.buyer_sequence` or `seller_sequence` + `newsletters` history
- Conversion prediction: `contacts.newsletter_intelligence.conversion_probability` + `days_to_convert_estimate`
- Reschedule: update `contact_journeys.next_email_at`
- Skip: generate next email in sequence, push `next_email_at` forward
- Send now: call `generateAndSendNewsletter(contactId, emailType)`
- Add custom: create newsletter with `status: 'draft'`, let realtor edit, then send
- Component: `<UpcomingPanel contactId={id} journey={journey} config={realtorConfig} />`

**Edge Cases:**
- No upcoming emails (journey paused) — show "Journey paused. Resume to start sending."
- Contact near dormancy — show warning: "No engagement in 45 days. Re-engagement email scheduled."
- All sequence steps completed — show "Sequence complete. Contact will receive ongoing periodic emails."

---

### US-5: Realtor Controls

**As a** realtor,
**I want to** control every aspect of the AI's behavior for this specific prospect,
**So that** I can override AI decisions when I know something the AI doesn't.

**Acceptance Criteria:**
- [ ] Journey toggle: Active / Paused / Stopped with clear explanation of each state
- [ ] Send mode: "Review first" vs "Auto-send" per contact
- [ ] Frequency override: 1/week, 2/week, 3/week, AI decides — with AI recommendation shown
- [ ] Content checkboxes: enable/disable each email type per contact — AI recommendation shown
- [ ] "Notes to AI" textarea: freeform context the realtor knows from conversations
- [ ] Notification preferences per contact: which events trigger which notification type
- [ ] "Remove from all journeys" button (danger zone, confirmation required)
- [ ] "Send one-off manual email" button
- [ ] All controls save immediately (no submit button — auto-save with toast confirmation)

**UI Mockup:**
```
JOURNEY STATUS
  AI Agent: [🟢 Active]                    [Pause] [Stop]
  Send Mode: [● Review first] [○ Auto-send]
  Pausing: stops sending, keeps tracking. Stopping: removes from journey.

FREQUENCY
  Current: 2/week (AI recommended)
  [1/week] [● 2/week] [3/week] [AI decides]
  AI says: "At 3/week her open rate dropped from 83% to 45%."

CONTENT (override AI)
  ✅ Listing alerts (AI: recommended — 83% open rate)
  ☐  Market updates (AI: not recommended — 0/3 opened)
  ☐  Neighbourhood guides (AI: occasional only)
  ✅ Price drop alerts (AI: recommended)
  ☐  Open house invites (AI: occasional)

NOTES TO AI
  ┌──────────────────────────────────────────────────────┐
  │ Sarah has 2 school-age kids, wants Kits Elementary   │
  │ catchment. Pre-approved $1.3M with TD. Lease ends    │
  │ July 31 — needs to close before then. Partner name   │
  │ is James, he prefers modern builds.                  │
  └──────────────────────────────────────────────────────┘
  [Saved ✓]
  AI will use these notes in all future email generation.

NOTIFICATIONS FOR THIS CONTACT
  ✅ Clicks "Book Showing" → Instant push
  ✅ Score reaches 80+ → Daily digest
  ✅ Opens 3+ emails in one day → Instant push
  ☐  Opens any email → No (too noisy)
  ✅ Goes dormant 30+ days → Weekly digest
  ✅ Unsubscribes → Instant push

DANGER ZONE
  [🛑 Remove from all journeys]
  [📧 Send one-off manual email]
```

**Technical:**
- Journey toggle: update `contact_journeys.is_paused` / delete row
- Send mode: update `contact_journeys.send_mode` ('review' | 'auto')
- Frequency: update `contacts.newsletter_intelligence.frequency_tolerance.current_cap`
- Content overrides: new field `contacts.newsletter_intelligence.content_overrides` (JSONB)
- Notes to AI: update `contacts.notes` or new `contacts.ai_context_notes` field
- Notifications: new field `contacts.notification_preferences` (JSONB)
- Auto-save: `useDebounce` + server action on each change, toast on success
- Component: `<ProspectControls contactId={id} journey={journey} intelligence={intelligence} />`

**Edge Cases:**
- Realtor enables market updates despite AI recommending against it — AI respects override but logs it, continues tracking performance
- Realtor pauses then resumes 30 days later — AI doesn't dump 30 days of queued emails, starts fresh from current sequence position
- Realtor writes conflicting notes ("budget $800K" in notes but "$1.2M" inferred from clicks) — AI uses explicit realtor notes over inferred data

---

### US-6: Quick Contact Logging

**As a** realtor,
**I want to** quickly log a call, text, or meeting with this prospect in under 5 seconds,
**So that** the AI knows about interactions that happen outside email.

**Acceptance Criteria:**
- [ ] "Log Interaction" button always visible on contact page header
- [ ] Opens a compact form (not a full-page modal):
  - Type: Call (in/out), Text, WhatsApp, Visit, Meeting, Social DM
  - Trigger: dropdown of recent emails sent to this contact + "None" + "Other"
  - Notes: one-line text input (not textarea — keep it fast)
  - Outcome: Interested / Not ready / Follow up needed / Lost
- [ ] Submit closes form, shows toast, updates engagement score immediately
- [ ] Logged interaction appears in Email History timeline with distinct icon
- [ ] Attribution: if trigger selected, links to the email that caused the interaction
- [ ] Also accessible from: dashboard quick action, floating button on mobile

**UI Mockup:**
```
┌─ Quick Log ──────────────────────────────────────────────┐
│  Type: [📞 Inbound Call ▾]                               │
│  After: [Listing alert — Mar 21 ▾]                       │
│  Notes: [Asked about W 4th, wants to see it Saturday   ] │
│  Result: [Interested ▾]                                  │
│                                          [Cancel] [Save] │
└──────────────────────────────────────────────────────────┘
```

**Technical:**
- Store in: `communications` table with extended `channel` enum: call_inbound, call_outbound, visit, meeting, social_dm
- New field: `communications.triggered_by_newsletter_id` (FK to newsletters)
- Score update: call server action that updates `contacts.newsletter_intelligence.engagement_score`
- Score impact: inbound call +25, outbound call (positive) +20, text +20, visit +15, social +10
- Timeline: query `communications` + `newsletters` together, sort by date, render with different icons
- Component: `<QuickLogForm contactId={id} recentEmails={newsletters} />`

---

### US-7: Daily Digest Notification

**As a** realtor,
**I want to** receive a daily summary at 8 AM of what happened and what needs my attention,
**So that** I start each day knowing exactly who to focus on.

**Acceptance Criteria:**
- [ ] Delivered as: push notification (mobile) + email + in-app banner on dashboard
- [ ] Sections: Action Needed (hot leads), Pending Review (drafts), Engagement Changes, Held Back
- [ ] Hot leads show: name, what they did, AI recommendation, action buttons (Call, Text, View)
- [ ] Pending drafts show: count + link to approval queue
- [ ] Engagement changes: who went up/down with delta
- [ ] Held back: count of suppressed emails with reasons
- [ ] Realtor can set digest time (default 8 AM)
- [ ] Realtor can disable daily digest (keep weekly only)

**Technical:**
- Cron job: `/api/cron/daily-digest` runs at configured time
- Query: last 24h of `newsletter_events`, `agent_notifications`, `newsletters` (status=draft)
- Render: HTML email via React Email template + in-app card component
- Send: via Resend to realtor's email
- Push: via web push notification API (or SMS if mobile preference)
- Dashboard: `<DailyDigestCard />` component showing same data as email
- Config: `realtor_agent_config.digest_time` and `realtor_agent_config.digest_enabled`

---

### US-8: Weekly Report

**As a** realtor,
**I want to** see a weekly summary of email performance, pipeline movement, and AI learnings,
**So that** I can track my marketing effectiveness and trust the AI's decisions.

**Acceptance Criteria:**
- [ ] Delivered Monday 8 AM as email + in-app page at `/newsletters/weekly-report`
- [ ] Summary: total sent, open rate, click rate, comparison to industry average (21%)
- [ ] Pipeline movement: who warmed up, who went hot, who's going dormant, unsubscribes
- [ ] Top performing emails (highest open/click rate)
- [ ] AI learnings: what patterns were discovered, what auto-adjustments were made
- [ ] Suggested changes needing approval with [Approve] / [Keep current] buttons
- [ ] Next week preview: scheduled email count, pending reviews, at-risk contacts
- [ ] Voice accuracy: edit rate trend over weeks

**Technical:**
- Cron job: `/api/cron/weekly-report` runs Monday at configured time
- Learning cycle: analyze `newsletter_events` for last 7 days + 30-day rolling window
- Auto-adjustments: compare content/timing/frequency performance to current config, update `realtor_agent_config`
- Suggested changes: if data suggests removing a journey step or changing caps, create `agent_recommendations` entry
- Report page: server component querying aggregate data + `agent_learning_log`
- Email: React Email template with charts (static chart images, not interactive)

---

### US-9: Global Controls

**As a** realtor,
**I want to** control the AI across all prospects at once,
**So that** I can pause everything, change global limits, or adjust my availability.

**Acceptance Criteria:**
- [ ] Master switch: pause all sending (drafts continue to be generated but not sent)
- [ ] Bulk actions: pause/resume by journey type (all buyers, all sellers, all dormant)
- [ ] Global frequency cap: max emails per contact per week (overrides AI and per-contact settings)
- [ ] Quiet hours: no sends between X PM and Y AM
- [ ] Weekend toggle: don't send on Sat/Sun
- [ ] "Set all to Review mode" and "Set all to Auto-send" buttons
- [ ] Global controls accessible from newsletter dashboard header

**Technical:**
- Master switch: `realtor_agent_config.sending_enabled` boolean
- Bulk pause: update `contact_journeys SET is_paused = true WHERE journey_type = ?`
- Frequency cap: `realtor_agent_config.frequency_caps.global_max`
- Quiet hours: `realtor_agent_config.quiet_hours` { start: "20:00", end: "07:00" }
- Weekend: `realtor_agent_config.skip_weekends` boolean
- Send governor checks all of these before every send
- Component: `<GlobalControlsPanel config={realtorConfig} />`

---

### US-10: Property Watchlist

**As a** realtor,
**I want to** mark specific properties for a prospect,
**So that** the AI prioritizes these in listing alerts and references them in emails.

**Acceptance Criteria:**
- [ ] "Add to watchlist" button on any listing card/page
- [ ] Watchlist section on prospect's 360 page
- [ ] Shows: property photo, address, price, status (active/pending/sold)
- [ ] AI includes watchlist properties in next listing alert
- [ ] When a watched property has a price drop or status change, instant notification
- [ ] Realtor can add notes per watched property ("Sarah loved the kitchen")

**Technical:**
- New table: `contact_watchlist` (contact_id, listing_id, notes, added_by, created_at)
- Query watchlist in email generation prompt: "These properties are on Sarah's watchlist: [list]"
- Event listener: when `listings.status` or `listings.list_price` changes, check all watchlists, notify relevant contacts + realtors
- Component: `<WatchlistPanel contactId={id} />`

---

### US-11: Objections & Context Log

**As a** realtor,
**I want to** record what a prospect said during conversations (objections, concerns, preferences),
**So that** the AI addresses these in future communications.

**Acceptance Criteria:**
- [ ] "Add context" button on controls tab
- [ ] Structured entries: type (objection, preference, concern, info), text, date
- [ ] Examples: "Too expensive", "Wrong area", "Not ready for 6 months", "Needs parking", "Partner hasn't seen anything yet"
- [ ] AI reads all context entries before generating any email
- [ ] Context visible in intelligence tab under "Realtor Context"
- [ ] Can mark entries as resolved ("Too expensive" → resolved after price drop)

**UI Mockup:**
```
REALTOR CONTEXT
  ⚠️ "Thinks Kits is too expensive" — Mar 19 [Resolve]
  ℹ️ "Partner James prefers modern builds" — Mar 15
  ℹ️ "Pre-approved $1.3M with TD, expires Aug" — Mar 10
  ⏰ "Lease ends July 31 — needs to close before" — Mar 10
  ✅ "Wanted 2BR" → Resolved: now looking at 3BR — Mar 7

  [+ Add context]
```

**Technical:**
- New table: `contact_context` (id, contact_id, type, text, is_resolved, resolved_note, created_at)
- Or: extend `contacts.ai_context_notes` from plain text to structured JSONB array
- Include in Claude prompt: "Realtor context for this contact: [entries]. Address these where relevant."
- Timeline entries: also appear in AI reasoning panel ("Why this email? Addressed objection about price.")
- Component: `<ContextLog contactId={id} />`

---

### US-12: Competitor Awareness

**As a** realtor,
**I want to** flag that a prospect is working with another agent,
**So that** the AI increases urgency and differentiates my value.

**Acceptance Criteria:**
- [ ] Toggle on controls tab: "Working with another agent" Yes/No
- [ ] Optional: competitor agent name
- [ ] When flagged, AI adjusts email tone: more urgency, highlight unique value
- [ ] Increases email frequency slightly (+1/week)
- [ ] AI avoids generic content, focuses on exclusive listings and personal service
- [ ] Realtor gets priority alerts for this contact's engagement

**Technical:**
- Field: `contacts.newsletter_intelligence.competitor_flag` boolean + `competitor_name` string
- Prompt adjustment: when `competitor_flag = true`, add to Claude system prompt: "This contact is also working with another agent. Your emails should emphasize unique value, be more responsive, and create urgency without being pushy."
- Frequency: override to +1/week above normal cap
- Component: toggle in `<ProspectControls />`

---

## Page Layout

```
/contacts/[id]

┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                         │
│  Name · Type Badge · Score Badge · Phone · Email                │
│  Source · Date Added · [Edit] [Log Interaction] [⋯ More]        │
├─────────────────────────────────────────────────────────────────┤
│  JOURNEY PROGRESS BAR                                           │
│  ●━━━●━━━●━━━●━━━○━━━○━━━○                                     │
├─────────────────────────────────────────────────────────────────┤
│  TAB BAR                                                        │
│  [📧 History] [🧠 Intelligence] [📅 Upcoming] [⚙️ Controls]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TAB CONTENT (scrollable)                                       │
│                                                                  │
│  ... tab-specific content ...                                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  RIGHT SIDEBAR (desktop only, 300px)                            │
│  ┌─ Quick Stats ──────────┐                                     │
│  │ Engagement: 72 🔥      │                                     │
│  │ Opens: 5/6 (83%)       │                                     │
│  │ Clicks: 11 total       │                                     │
│  │ Last activity: 2d ago  │                                     │
│  └─────────────────────────┘                                     │
│  ┌─ Quick Actions ─────────┐                                    │
│  │ [📞 Call]               │                                     │
│  │ [💬 Text]               │                                     │
│  │ [📧 Send manual email]  │                                     │
│  │ [📝 Log interaction]    │                                     │
│  │ [🏠 Add to watchlist]   │                                     │
│  └─────────────────────────┘                                     │
│  ┌─ Notes ─────────────────┐                                    │
│  │ Looking for 2BR condo   │                                     │
│  │ in Kitsilano...         │                                     │
│  │ [Edit]                  │                                     │
│  └─────────────────────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Tree

```
ContactDetailPage (server component)
├── ContactHeader
│   ├── Avatar (gradient based on type)
│   ├── Name, badges, contact info
│   ├── EditButton → opens ContactForm dialog
│   └── QuickLogButton → opens QuickLogForm
├── JourneyProgressBar
│   └── Phase dots with dates + "YOU ARE HERE" marker
├── TabBar (client component)
│   ├── Tab: EmailHistory
│   │   ├── FilterToggle (All / Sent / Suppressed)
│   │   ├── EmailTimelineItem (per email)
│   │   │   ├── StatusBadge
│   │   │   ├── ClickDetails (inline)
│   │   │   └── PreviewPanel (slide-over)
│   │   └── DirectInteractionItem (calls, texts — different icon)
│   ├── Tab: Intelligence
│   │   ├── EngagementScoreCard
│   │   ├── InterestedInPanel (area pills, type, budget, beds)
│   │   ├── ContentPreferenceComparison (responds to / doesn't)
│   │   ├── SendTimeHeatmap
│   │   └── DirectInteractionsLog
│   ├── Tab: Upcoming
│   │   ├── NextScheduledCard (with actions)
│   │   ├── SequenceList (past ✅ + future ○)
│   │   ├── ConversionPrediction
│   │   └── AddCustomEmailButton
│   └── Tab: Controls
│       ├── JourneyStatusToggle
│       ├── SendModeToggle
│       ├── FrequencySelector
│       ├── ContentOverrides
│       ├── NotesToAI (auto-save textarea)
│       ├── NotificationPreferences
│       ├── ContextLog (objections, info)
│       ├── CompetitorFlag
│       └── DangerZone (remove, manual email)
├── RightSidebar (desktop)
│   ├── QuickStatsCard
│   ├── QuickActionsCard
│   ├── NotesCard
│   └── WatchlistCard
└── QuickLogForm (modal/slide-over — shared component)
```

---

## Database Changes Required

| Change | Type | Table/Column |
|---|---|---|
| Expand intelligence schema | Modify JSONB | `contacts.newsletter_intelligence` |
| Add AI context notes | New column | `contacts.ai_context_notes` TEXT |
| Add notification prefs | New column | `contacts.notification_preferences` JSONB |
| Realtor agent config | New table | `realtor_agent_config` |
| Agent learning log | New table | `agent_learning_log` |
| Contact watchlist | New table | `contact_watchlist` |
| Contact context | New table | `contact_context` |
| Outcome events | New table | `outcome_events` |
| Extend communications | New column | `communications.triggered_by_newsletter_id` |
| Suppression tracking | Use existing | `newsletters.status = 'suppressed'` with reason in `ai_context` |

---

## Implementation Order

| Sprint | What | Depends On |
|---|---|---|
| 1 | Journey progress bar + email history tab | Existing data |
| 2 | Intelligence tab (engagement, interests, send time) | Existing newsletter_intelligence |
| 3 | Controls tab (journey toggle, frequency, content, notes) | realtor_agent_config table |
| 4 | Upcoming tab (sequence, reschedule, prediction) | realtor_agent_config.buyer_sequence |
| 5 | Quick log form + direct interaction tracking | communications table extension |
| 6 | Daily digest + weekly report | Cron jobs + React Email templates |
| 7 | Watchlist + context log + competitor flag | New tables |
| 8 | Right sidebar + mobile responsive | All tabs working |

---

*Version 1.0 — 2026-03-23*
<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->
