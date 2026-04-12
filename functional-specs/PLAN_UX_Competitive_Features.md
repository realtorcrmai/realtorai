# Implementation Plan: Competitive UX Features

> **Baseline:** HubSpot CRM, Follow Up Boss, kvCORE, Chime/Lofty
> **CRM root:** `/Users/bigbear/reality crm/realestate-crm/`
> **Tech:** Next.js 16 App Router, React 19, Supabase, Tailwind v4, shadcn v4
> **Reviewed:** 2026-04-11 — 5 passes: data model, API, components, logic, sprint order
> **Codebase state:** Sidebar uses `LogoIconDark` + "AI Platform" subtext. No `deals` table (uses `property_deals`). `engagement_score` is nested in `newsletter_intelligence` JSONB. No `/api/contacts/[id]/communications` route. Popover uses BaseUI.

---

## Priority Matrix

| # | Feature | Impact | Effort | Status |
|---|---------|--------|--------|--------|
| 1 | Global Command Bar (Cmd+K) | HIGH | LOW | DONE |
| 2 | Activity Feed on Dashboard | HIGH | MEDIUM | DONE |
| 3 | Inline Quick Actions on Table Rows | HIGH | LOW | DONE |
| 4 | Notification Center | HIGH | MEDIUM | DONE |
| 5 | Contact Slide-Over Preview | MEDIUM | LOW | DONE |
| 6 | Bulk Actions Bar on Tables | MEDIUM | LOW | DONE |
| 7 | Recent Items Tracking | MEDIUM | LOW | DONE |
| 8 | Deal Pipeline Widget on Dashboard | LOW | LOW | DONE |
| A | Speed-to-Lead Alert | HIGH | LOW | DONE |
| B | AI Lead Score Badge in Table | HIGH | VERY LOW | DONE |
| C | Today's Priorities Card | HIGH | MEDIUM | DONE |
| D | Post-Showing Feedback | MEDIUM | LOW | DONE |

**Build order:** 1 → B → 3 → 7 → 5 → 6 → 2 → C → 8 → D → 4 → A

---

## Feature 1: Global Command Bar (Cmd+K)

### Current State
- `src/components/help/CommandPalette.tsx` — cmdk v1.1.1, rendered in `(dashboard)/layout.tsx` line 52
- Uses `Command`, `Command.Input`, `Command.List`, `Command.Group`, `Command.Item`
- Has 7 quick actions + Help articles + AI "Ask" (dispatches `open-agent` event)
- `routeQuery()` classifies input as "help" | "action" | "mixed" — no "search" yet
- **Contacts API:** `GET /api/contacts?search=` — ilike on name/phone/email, returns `select("*")`. Must add `&limit=5` in fetch URL.
- **Listings API:** `GET /api/listings` — NO `?search=` support. Only `?status=` filtering. Must add ilike on address/mls_number.

### Changes

**File:** `src/components/help/CommandPalette.tsx`

1. Add debounced (300ms) search state + fetch:
   ```typescript
   const [searchResults, setSearchResults] = useState<{ contacts: any[]; listings: any[] }>({ contacts: [], listings: [] });

   useEffect(() => {
     if (searchQuery.length < 2) { setSearchResults({ contacts: [], listings: [] }); return; }
     const timer = setTimeout(async () => {
       const [c, l] = await Promise.all([
         fetch(`/api/contacts?search=${encodeURIComponent(searchQuery)}&limit=5`).then(r => r.json()),
         fetch(`/api/listings?search=${encodeURIComponent(searchQuery)}&limit=5`).then(r => r.json()),
       ]);
       setSearchResults({ contacts: Array.isArray(c) ? c.slice(0, 5) : [], listings: Array.isArray(l) ? l.slice(0, 5) : [] });
     }, 300);
     return () => clearTimeout(timer);
   }, [searchQuery]);
   ```

2. Add `<Command.Group>` sections BEFORE quick actions (separate from cmdk's built-in fuzzy match):
   ```
   CONTACTS (only when searchResults.contacts.length > 0)
   👤 Aman Dhindsa — Buyer · +1 604 555 1234

   LISTINGS (only when searchResults.listings.length > 0)
   🏠 505 Royal Ave #312 — Active · $489,000
   ```

3. On select → reuse existing `navigate()` function with `/contacts/${id}` or `/listings/${id}`

**File:** `src/app/api/listings/route.ts` — ADD `?search=` + `?limit=` support:
```typescript
const search = searchParams.get("search");
const limit = parseInt(searchParams.get("limit") || "100");

if (search) {
  const safe = search.replace(/[,().*%\\]/g, "");
  query = query.or(`address.ilike.%${safe}%,mls_number.ilike.%${safe}%`);
}
query = query.limit(limit);
```

### Gotchas
- cmdk fuzzy-matches ALL items in Command.List — search results must use `forceMount` or be outside the filter to avoid double-filtering
- Contacts API returns `select("*")` — heavy payload. The `&limit=5` param must be added to the API to prevent returning 200+ contacts
- Add `?limit=` support to contacts route too (currently has none)

### Effort: ~2 hours

---

## Feature B: AI Lead Score Badge in Contact Table

### Current State
- `src/lib/ai-agent/lead-scorer.ts` returns `LeadScore` object with `buying_readiness`, `intent`, etc.
- `contacts.newsletter_intelligence` is JSONB containing `engagement_score` (0-100 number)
- Contacts API returns `select("*")` — `newsletter_intelligence` is included
- **NO `engagement_score` column** — it's nested: `contact.newsletter_intelligence?.engagement_score`

### Changes

**File:** `src/components/contacts/ContactsTableClient.tsx`

Add `newsletter_intelligence` to the ContactRow interface:
```typescript
interface ContactRow {
  // ... existing fields
  newsletter_intelligence: { engagement_score?: number } | null;
}
```

Add a "Score" column between Type and Stage:
```tsx
{
  key: "newsletter_intelligence",
  header: "Score",
  sortable: true,
  render: (r) => {
    const score = r.newsletter_intelligence?.engagement_score;
    if (score == null) return <span className="text-muted-foreground">—</span>;
    const label = score >= 60 ? "Hot" : score >= 30 ? "Warm" : "Cold";
    const color = score >= 60 ? "bg-destructive/15 text-destructive" : score >= 30 ? "bg-[#f5c26b]/15 text-[#8a5a1e]" : "bg-muted text-muted-foreground";
    return <Badge variant="outline" className={color}>{label} {score}</Badge>;
  },
},
```

**File:** `src/app/(dashboard)/contacts/page.tsx` — add `newsletter_intelligence` to the select:
```typescript
.select("id, name, email, phone, type, stage_bar, lead_status, last_activity_date, created_at, newsletter_intelligence")
```

### Effort: ~30 minutes

---

## Feature 3: Inline Quick Actions on Table Rows

### Design
On hover over any contact row, show call + email icons on the right side.

### Implementation

**File:** `src/components/ui/data-table.tsx`

Add `rowActions` prop to DataTableProps:
```typescript
rowActions?: (row: T) => React.ReactNode;
```

**Approach:** Do NOT use `sticky right-0` (breaks inside `overflow-x-auto`). Instead, render actions inside the LAST column cell, positioned right-aligned:

```tsx
{columns.map((col, colIdx) => (
  <td key={col.key} className="px-4 py-2.5 text-sm text-foreground">
    {colIdx === columns.length - 1 && rowActions ? (
      <div className="flex items-center justify-between gap-2">
        <span>{col.render ? col.render(row) : String(row[col.key] ?? "")}</span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
          {rowActions(row)}
        </div>
      </div>
    ) : (
      col.render ? col.render(row) : String(row[col.key] ?? "")
    )}
  </td>
))}
```

This avoids adding extra `<td>`, avoids colSpan issues, and avoids sticky positioning problems.

**File:** `src/components/contacts/ContactsTableClient.tsx`
```tsx
rowActions={(row) => (
  <div className="flex items-center gap-0.5">
    {row.phone && (
      <a href={`tel:${row.phone}`} className="p-1.5 hover:bg-muted rounded-md" aria-label={`Call ${row.name}`}>
        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
      </a>
    )}
    {row.email && (
      <a href={`mailto:${row.email}`} className="p-1.5 hover:bg-muted rounded-md" aria-label={`Email ${row.name}`}>
        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
      </a>
    )}
  </div>
)}
```

### Effort: ~1 hour

---

## Feature 7: Recent Items Tracking

### Implementation

**File:** `src/stores/recent-items.ts` (new) — Zustand store with persist middleware
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentItem {
  id: string;
  type: "contact" | "listing";
  label: string;
  href: string;
  viewedAt: number;
}

export const useRecentItems = create<{ items: RecentItem[]; addItem: (item: Omit<RecentItem, "viewedAt">) => void }>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({
        items: [{ ...item, viewedAt: Date.now() }, ...state.items.filter((i) => i.id !== item.id)].slice(0, 10),
      })),
    }),
    { name: "r360-recent-items" }
  )
);
```

**File:** `src/components/shared/TrackRecentView.tsx` (new) — bridges server → client:
```typescript
"use client";
import { useEffect } from "react";
import { useRecentItems } from "@/stores/recent-items";

export function TrackRecentView({ id, type, label, href }: { id: string; type: "contact" | "listing"; label: string; href: string }) {
  const addItem = useRecentItems((s) => s.addItem);
  useEffect(() => { addItem({ id, type, label, href }); }, [id]);
  return null;
}
```

**Wire up:** Add `<TrackRecentView>` to both server component detail pages:
- `contacts/[id]/page.tsx` — `<TrackRecentView id={contact.id} type="contact" label={contact.name} href={...} />`
- `listings/[id]/page.tsx` — `<TrackRecentView id={listing.id} type="listing" label={listing.address} href={...} />`

**Sidebar render** — `MondaySidebar.tsx`, between spacer (line 119) and user section:

**Hydration guard** (Zustand persist rehydrates after mount → SSR mismatch):
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
const recentItems = useRecentItems((s) => s.items);

{mounted && recentItems.length > 0 && (
  <div className="px-2 border-t border-sidebar-accent">
    <div className="text-xs uppercase tracking-wider text-sidebar-foreground/70 px-2 pt-3 pb-1 font-semibold">Recent</div>
    {recentItems.slice(0, 5).map(item => (
      <Link key={item.id} href={item.href} className="flex items-center gap-2 px-3 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 rounded-md truncate">
        <span>{item.type === "contact" ? "👤" : "🏠"}</span>
        <span className="truncate">{item.label}</span>
      </Link>
    ))}
  </div>
)}
```

### Effort: ~1.5 hours

---

## Feature 5: Contact Slide-Over Preview

### Implementation

**File:** `src/components/contacts/ContactPreviewSheet.tsx` (new)

```typescript
"use client";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
```

Sheet `onOpenChange` prop accepts `(open: boolean) => void` (BaseUI pattern). Wire as:
```tsx
<Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
```

Fetch comms on open via server action (NOT API route — avoids creating new route):
```typescript
useEffect(() => {
  if (!open || !contact) return;
  import("@/actions/contacts").then(({ getContactCommunications }) =>
    getContactCommunications(contact.id, 5).then(setComms)
  );
}, [open, contact?.id]);
```

**File:** `src/actions/contacts.ts` — add function:
```typescript
export async function getContactCommunications(contactId: string, limit = 5) {
  const tc = await getAuthenticatedTenantClient();
  const { data } = await tc.from("communications")
    .select("id, direction, channel, body, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
```

This avoids creating a new API route (uses server action pattern consistent with codebase).

**File:** `src/components/contacts/ContactsTableClient.tsx`
- Add preview state: `const [previewContact, setPreviewContact] = useState<ContactRow | null>(null)`
- Add eye icon in rowActions that sets preview
- Render `<ContactPreviewSheet contact={previewContact} open={!!previewContact} onClose={() => setPreviewContact(null)} />`

### Effort: ~2 hours

---

## Feature 6: Bulk Actions Bar on Tables

### Implementation

**File:** `src/components/ui/data-table.tsx`

Add `bulkActions` prop. Render fixed bar when selection exists:
```tsx
{bulkActions && selectedIds && selectedIds.size > 0 && (
  <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 ...">
```

**Note:** `bottom-20` on mobile (above bottom nav which is `fixed bottom-0`), `md:bottom-6` on desktop.

**File:** `src/components/contacts/ContactsTableClient.tsx`
- Add `useState<Set<string>>(new Set())` for selection
- Pass `selectable`, `selectedIds`, `onSelectionChange`, `bulkActions`
- Server actions: `bulkUpdateStage(ids, stage)`, `bulkAddTag(ids, tag)` in `src/actions/contacts.ts`

### Effort: ~3 hours

---

## Feature 2: Activity Feed on Dashboard

### Implementation

**Component:** `src/components/dashboard/ActivityFeed.tsx` — **NOT a standalone server component.** Receives data as props from dashboard page (which already has `tc`). Avoids double tenant client instantiation.

**Data fetching** in `src/app/(dashboard)/page.tsx` — add to existing Promise.all:
```typescript
const [
  // ... existing queries ...
  { data: recentComms },
  { data: recentEmailEvents },
  { data: recentShowingChanges },
  { data: completedTasks },
] = await Promise.all([
  // ... existing ...
  tc.from("communications").select("id, direction, channel, body, created_at, contact_id, contacts(name)").order("created_at", { ascending: false }).limit(6),
  tc.from("newsletter_events").select("id, event_type, created_at, newsletters(subject, contact_id, contacts(name))").order("created_at", { ascending: false }).limit(6),
  tc.from("appointments").select("id, status, created_at, buyer_agent_name, listing_id, listings(address)").order("created_at", { ascending: false }).limit(6),
  tc.from("tasks").select("id, title, status, completed_at, created_at, contact_id, contacts(name)").eq("status", "completed").order("completed_at", { ascending: false }).limit(4),
]);
```

Pass normalized items to `<ActivityFeed items={feedItems} />`.

**Insert point:** After PipelineSnapshot (line 192), before DashboardShell (line 195).

### Effort: ~3 hours

---

## Feature C: Today's Priorities Card

### Design

AI-ranked "do this now" card at top of dashboard, replacing generic greeting:

```
┌──────────────────────────────────────────────┐
│ 🎯 TODAY'S PRIORITIES                    5 items │
├──────────────────────────────────────────────┤
│ 1. 🔴 Call Nancy Kim — showing confirmed 2h ago  │
│ 2. 🟡 3 overdue tasks — oldest: 2 days           │
│ 3. 📧 Sandra Kim opened email 3x — follow up     │
│ 4. 🏠 Showing request pending — 2187 Dunbar      │
│ 5. 📋 FINTRAC docs missing on 2 active listings  │
└──────────────────────────────────────────────┘
```

### Data sources (all from existing dashboard queries)
- Overdue tasks: `tasks.due_date < today AND status != completed`
- Hot leads: `newsletter_intelligence.engagement_score >= 60`
- Pending showings: `appointments.status = "requested"`
- Missing docs: `listingsWithMissing` (already computed in dashboard page)
- Recent confirmed showings: `appointments.status = "confirmed" AND created_at > 24h ago`

### Implementation
- New component: `src/components/dashboard/TodaysPriorities.tsx` (receives data as props)
- Rank items by urgency (hardcoded priority weights)
- Insert after PageHeader, before KPI cards

### Effort: ~2 hours

---

## Feature 8: Deal Pipeline Widget on Dashboard

### Current State
- `src/components/pipeline/PipelineBoard.tsx` — full kanban with `@hello-pangea/dnd`
- Data from `/api/deals` route which queries **`property_deals`** table (NOT `deals`)
- Full page at `/pipeline`

### Implementation

**File:** `src/components/dashboard/DashboardPipelineWidget.tsx` (new)

Compact 3-column card grid (no drag-and-drop). Data passed as props from dashboard page.

**Data fetch in dashboard page:**
```typescript
const { data: pipelineDeals } = await tc.from("property_deals")
  .select("id, name, stage, value, status, contact_id, contacts(name)")
  .in("status", ["active", "won"])
  .order("updated_at", { ascending: false })
  .limit(12);
```

**Note:** Table is `property_deals`, NOT `deals`. Stages come from BUYER_STAGES/SELLER_STAGES constants in pipeline components.

### Effort: ~2 hours

---

## Feature D: Post-Showing Feedback Workflow

### Design
After a showing is marked "completed" → auto-send feedback request SMS to buyer agent.

### Implementation

**File:** `src/actions/showings.ts` — add to `updateShowingStatus()`:
```typescript
if (status === "completed") {
  // Send feedback request to buyer agent
  const feedbackMsg = `Hi ${appointment.buyer_agent_name}, how did the showing at ${listing.address} go? Reply with a rating 1-5 and any feedback.`;
  await sendSMS(appointment.buyer_agent_phone, feedbackMsg);

  // Log communication
  await tc.from("communications").insert({
    contact_id: appointment.listing?.seller_id,
    direction: "outbound",
    channel: "sms",
    body: `Feedback request sent to ${appointment.buyer_agent_name}`,
    related_id: appointment.id,
  });
}
```

**Gotcha:** `updateShowingStatus()` currently handles "confirmed" | "denied" | "cancelled" — must add "completed" to the status union type.

### Effort: ~1 hour

---

## Feature 4: Notification Center

### Migration: `supabase/migrations/101_notifications.sql`
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  related_type TEXT,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_realtor ON notifications(realtor_id, is_read, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage notifications" ON notifications FOR ALL USING (true);
```

**Verify:** `users` table has `id UUID` PK — check migration 001 or types.

### New files
- `src/lib/notifications.ts` — `createNotification(tc, { type, title, body?, related_type?, related_id? })`
  - Uses tenant client — auto-injects realtor_id on insert
- `src/actions/notifications.ts` — `getUnreadNotifications()`, `markAsRead(id)`, `markAllRead()`
- `src/components/layout/NotificationDropdown.tsx` — Popover (BaseUI), fetches on mount

### Triggers
- `src/actions/showings.ts` — `updateShowingStatus()` line 166, inside confirmed block, after existing triggers. Uses `tc` from the action scope.
- `src/app/api/webhooks/resend/route.ts` — on bounce event. **Gotcha:** webhooks don't have user sessions. Must use admin client + pass `realtor_id` explicitly from the newsletter record (which has `realtor_id`).
- `/api/cron/daily-digest` — add task-due notifications for tasks where `due_date = today`.

### Header
- Replace bell `<button>` in `MondayHeader.tsx` (line 25-28) with `<NotificationDropdown />`
- Show count badge (number, not dot) when unread > 0

### Effort: ~4 hours

---

## Feature A: Speed-to-Lead Alert (depends on #4)

### Design
When a new contact is created, push a notification + dashboard alert: "New lead — respond in 60 seconds"

### Implementation
- Add `createNotification()` call in `src/actions/contacts.ts` `createContact()` function (after line 97, after `enrollInJourney()`)
- NotificationDropdown already shows notifications — this just adds a "new_lead" type
- Optional: play a sound on the client when a "new_lead" notification arrives (Web Audio API)

### Effort: ~1 hour (after Feature 4 is built)

---

## Total Effort Estimate

| Feature | Hours |
|---------|-------|
| 1. Cmd+K search | 2 |
| B. Lead score badge | 0.5 |
| 3. Inline quick actions | 1 |
| 7. Recent items | 1.5 |
| 5. Contact slide-over | 2 |
| 6. Bulk actions bar | 3 |
| 2. Activity feed | 3 |
| C. Today's priorities | 2 |
| 8. Pipeline widget | 2 |
| D. Post-showing feedback | 1 |
| 4. Notification center | 4 |
| A. Speed-to-lead alert | 1 |
| **Total** | **23** |

---

## Build Order (Recommended)

### Sprint 1: Quick Wins (1, B, 3, 7) — 5 hours
- Enhance Cmd+K with contact/listing search
- Add lead score badge to contacts table
- Add inline quick actions (call/email) on table row hover
- Add recent items tracking with Zustand + sidebar section

### Sprint 2: Dashboard Intelligence (2, C, 8) — 7 hours
- Build activity feed component
- Build "Today's Priorities" AI-ranked card
- Add compact pipeline deal widget

### Sprint 3: Power Features (5, 6, D) — 6 hours
- Contact slide-over preview sheet
- Bulk actions bar on contacts table
- Post-showing feedback workflow

### Sprint 4: Notification Infrastructure (4, A) — 5 hours
- Notifications table + migration
- Notification dropdown + triggers
- Speed-to-lead alert on contact creation
- Wire to showings, newsletters, tasks

---

## Files Reference

### New Files to CREATE (14)
| File | Feature |
|------|---------|
| `src/components/dashboard/ActivityFeed.tsx` | 2 |
| `src/components/dashboard/TodaysPriorities.tsx` | C |
| `src/components/dashboard/DashboardPipelineWidget.tsx` | 8 |
| `src/components/layout/NotificationDropdown.tsx` | 4 |
| `src/components/contacts/ContactPreviewSheet.tsx` | 5 |
| `src/stores/recent-items.ts` | 7 |
| `src/components/shared/TrackRecentView.tsx` | 7 |
| `src/actions/notifications.ts` | 4 |
| `src/lib/notifications.ts` | 4 |
| `supabase/migrations/101_notifications.sql` | 4 |

### Files to MODIFY (14)
| File | Feature | Change |
|------|---------|--------|
| `src/components/help/CommandPalette.tsx` | 1 | Add search groups + debounced fetch |
| `src/app/api/listings/route.ts` | 1 | Add `?search=` + `?limit=` params |
| `src/app/api/contacts/route.ts` | 1 | Add `?limit=` param support |
| `src/components/ui/data-table.tsx` | 3, 6 | Add `rowActions` + `bulkActions` props |
| `src/components/contacts/ContactsTableClient.tsx` | B, 3, 5, 6 | Score column, rowActions, preview, bulk |
| `src/app/(dashboard)/contacts/page.tsx` | B | Add newsletter_intelligence to select |
| `src/components/layout/MondayHeader.tsx` | 4 | Replace bell with NotificationDropdown |
| `src/components/layout/MondaySidebar.tsx` | 7 | Add Recent section with hydration guard |
| `src/app/(dashboard)/page.tsx` | 2, C, 8 | Add feed + priorities + pipeline queries |
| `src/app/(dashboard)/contacts/[id]/page.tsx` | 7 | Add `<TrackRecentView>` |
| `src/app/(dashboard)/listings/[id]/page.tsx` | 7 | Add `<TrackRecentView>` |
| `src/actions/showings.ts` | 4, D | Notifications + feedback SMS |
| `src/app/api/webhooks/resend/route.ts` | 4 | Notifications on bounce (admin client) |
| `src/actions/contacts.ts` | 5, 6, A | getContactComms, bulk actions, speed-to-lead |

**Note:** `src/app/api/contacts/route.ts` already has `?search=` — only adding `?limit=`.
**Note:** NO new API routes created — uses server actions (codebase pattern).
**Note:** Table is `property_deals` NOT `deals` — verified against migrations.
