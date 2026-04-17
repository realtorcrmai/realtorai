# UI Redesign Implementation Guide — For VS Code Claude

> **Read this entire document before writing any code.**
> **Reference plan:** `functional-specs/PLAN_UI_Redesign.md`
> **CRM root:** `/Users/bigbear/reality crm/realestate-crm/`
> **Design system:** HubSpot-inspired — Navy #2D3E50, Coral #FF7A59, Light Gray #F5F8FA

---

## Status

| Chunk | Description | Status | Notes |
|-------|-------------|--------|-------|
| 0 | CSS Design Tokens | DONE | globals.css already swapped to HubSpot palette |
| 1 | Layout Shell | DONE | Sidebar-only layout, navy bg, coral active |
| 2 | PageHeader Component | DONE | PageHeader.tsx created |
| 3 | DataTable Component | DONE | data-table.tsx created |
| 4 | Dashboard | DONE | KPI cards, flat pipeline |
| 5 | Contacts | DONE | DataTable list, layout simplified |
| 6 | Listings | DONE | DataTable list, layout simplified |
| 7 | Showings | DONE | DataTable list, layout simplified |
| 8 | Tasks | DONE | PageHeader added, accent colors cleaned |
| 9 | Calendar | DONE | PageHeader added |
| 10 | Newsletters | DONE | PageHeader + breadcrumbs on 3 pages |
| 11 | Content Engine | DONE | PageHeader, glass classes removed |
| 12 | Remaining Pages | DONE | PageHeader on all 5 remaining pages |
| 13 | Button/Badge Variants | DONE | brand button, success/warning/info badges |
| 14 | Final Cleanup | DONE | Build passing, showings layout fixed in testing |

**Build order:** 1 → 2 → 3 → (4-12 in any order) → 13 → 14

---

## Rules

1. **Do NOT modify** server actions, API routes, types, or data fetching logic
2. **Do NOT change** file names or route paths
3. **Keep all TypeScript types** — only change JSX/CSS
4. **Test after each chunk** — `npm run build` must pass with zero errors
5. **Preserve dark mode** — every color must use CSS variables, never hardcoded hex in JSX
6. **Keep Lucide icons** — do not switch to emoji or other icon sets
7. **Keep Poppins font** — already configured, close enough to Inter
8. **Mobile-first** — every component must work at 375px width

---

## Color Reference

Use these CSS variable names in Tailwind classes. Never use raw hex values.

| Tailwind Class | CSS Variable | Light Value | Dark Value | Usage |
|---|---|---|---|---|
| `bg-primary` | `--primary` | #2D3E50 (navy) | #FF7A59 (coral) | Nav, headings |
| `bg-brand` | `--brand` | #FF7A59 (coral) | #FF7A59 | CTAs, active states |
| `bg-background` | `--background` | #F5F8FA (gray) | #1A2332 | Page bg |
| `bg-card` | `--card` | #FFFFFF | #243447 | Cards |
| `border-border` | `--border` | #CBD6E2 | #3A4F63 | All borders |
| `text-muted-foreground` | `--muted-foreground` | #7C98B6 | #7C98B6 | Secondary text |
| `bg-success` | `--success` | #00BDA5 (teal) | #00BDA5 | Success states |
| `bg-destructive` | `--destructive` | #D94F57 | #FF6B6B | Error/delete |
| `bg-sidebar` | `--sidebar` | #2D3E50 (navy) | #1A2332 | Sidebar bg |
| `text-sidebar-primary` | `--sidebar-primary` | #FF7A59 (coral) | #FF7A59 | Active nav |
| `bg-brand-muted` | `--brand-muted` | coral 10% | coral 12% | Light coral bg |
| `text-brand-dark` | `--brand-dark` | #E8603C | #E8603C | Hover coral |

---

## Chunk 1: Layout Shell

**Goal:** Make sidebar the ONLY layout mode. Restyle to HubSpot navy sidebar with coral active indicators.

### Step 1.1: Hardcode sidebar mode

**File:** `src/components/layout/LayoutProvider.tsx`

Find the layout state/toggle logic and hardcode it:

```typescript
// Remove any localStorage toggle or state management
// Hardcode layout to always be "sidebar"
const layout = "sidebar"; // was: useState("top-nav") or from localStorage
```

Remove any `setLayout()`, `toggleLayout()`, or layout switching functions. Keep the context provider but make it always return `"sidebar"`.

### Step 1.2: Simplify DashboardShellClient

**File:** `src/components/layout/DashboardShellClient.tsx`

Remove the conditional rendering for top-nav mode. The component should ONLY render:
- `MondaySidebar` (left, 240px)
- `MondayHeader` (top, compact)
- `{children}` (main content area)
- `MobileNav` (bottom, mobile only)

Remove:
- Any `if (layout === "top-nav")` branches
- References to `AppHeader.tsx`
- The `bg-canvas` class from the main content area

Target layout structure:
```html
<div class="flex h-screen">
  <!-- Desktop sidebar (hidden on mobile) -->
  <aside class="hidden md:flex w-60 flex-col bg-sidebar">
    <MondaySidebar />
  </aside>

  <!-- Main area -->
  <div class="flex-1 flex flex-col min-w-0">
    <MondayHeader />
    <main class="flex-1 overflow-y-auto bg-background p-6">
      {children}
    </main>
  </div>

  <!-- Mobile bottom nav -->
  <MobileNav class="md:hidden" />
</div>
```

### Step 1.3: Restyle MondaySidebar

**File:** `src/components/layout/MondaySidebar.tsx`

Redesign to match HubSpot's left sidebar:

**Top section (64px):**
- Brand logo + "Realtors360" text
- Background: `bg-sidebar` (navy)
- Text: `text-sidebar-foreground` (light)

**Navigation items:**
- Each item: icon (Lucide, 18px) + label text
- Default: `text-sidebar-foreground/70 hover:bg-sidebar-accent`
- Active: `bg-sidebar-accent text-white border-l-3 border-sidebar-primary` (coral left border)
- Group headers: `text-xs uppercase tracking-wider text-sidebar-foreground/40 px-4 pt-4 pb-2`

**Navigation groups:**
```
MAIN
  Dashboard
  Contacts
  Listings
  Showings
  Calendar

TOOLS
  Tasks
  Content Engine
  Email Marketing
  Automations

ADMIN
  Forms
  Property Search
  Import
  Settings
```

**Bottom section (64px):**
- User avatar (32px circle) + name + email
- Logout button (ghost, small)

**Width:** 240px (`w-60`)
**Mobile:** Hidden by default, shown via hamburger menu sheet

### Step 1.4: Restyle MondayHeader

**File:** `src/components/layout/MondayHeader.tsx`

Simplify to a clean top bar:

```html
<header class="h-14 border-b border-border bg-card flex items-center justify-between px-6">
  <!-- Left: Mobile hamburger (md:hidden) + Breadcrumbs or page context -->
  <div class="flex items-center gap-3">
    <button class="md:hidden"><Menu /></button>
    <!-- Optional: breadcrumb or current page title -->
  </div>

  <!-- Right: Search + Notifications + User avatar -->
  <div class="flex items-center gap-3">
    <button class="p-2 rounded-lg hover:bg-muted"><Search class="h-4 w-4" /></button>
    <button class="p-2 rounded-lg hover:bg-muted relative">
      <Bell class="h-4 w-4" />
      <span class="absolute -top-0.5 -right-0.5 h-2 w-2 bg-brand rounded-full" />
    </button>
    <Avatar class="h-8 w-8" />
  </div>
</header>
```

Remove:
- Logo from header (moved to sidebar)
- Navigation tabs (moved to sidebar)
- "More" dropdown (items moved to sidebar groups)
- `QuickAddButton` from header (keep it as a floating button or in sidebar)

### Step 1.5: Update MobileNav

**File:** `src/components/layout/MobileNav.tsx`

Update colors to use new palette:
- Background: `bg-card border-t border-border`
- Active item: `text-brand` (coral)
- Inactive: `text-muted-foreground`
- Center "+" button: `bg-brand text-white` (coral)

### Verification

```bash
npm run build  # zero errors
```
Then in browser:
1. Desktop: Dark navy sidebar visible on left, white header on top
2. Active nav item has coral left border
3. Mobile: Bottom nav with coral active states, hamburger opens sidebar as sheet
4. All pages still render content correctly
5. Dark mode: sidebar gets darker, content area inverts

---

## Chunk 2: PageHeader Component

**Goal:** Create a reusable page header used on every page for consistency.

### Create new file: `src/components/layout/PageHeader.tsx`

```typescript
"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface Tab {
  label: string;
  value: string;
  count?: number;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  tabs,
  activeTab,
  onTabChange,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("border-b border-border bg-card", className)}>
      <div className="px-6 pt-4 pb-3">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title row */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>

      {/* Tab row */}
      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-0 px-6 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onTabChange?.(tab.value)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.value
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Verification
- Import into any page and render with title, subtitle, breadcrumbs, actions, and tabs
- Desktop: full-width, clean border-bottom
- Mobile: title + actions stack vertically
- Tabs: coral underline on active, gray on inactive

---

## Chunk 3: DataTable Component

**Goal:** Reusable HubSpot-style data table for list views.

### Create new file: `src/components/ui/data-table.tsx`

```typescript
"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  width?: string;            // e.g. "200px" or "1fr"
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;         // default "id"
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  // Pagination
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = "id",
  onRowClick,
  emptyMessage = "No data",
  className,
  page,
  pageSize,
  totalCount,
  onPageChange,
  selectable,
  selectedIds,
  onSelectionChange,
}: DataTableProps<T>) {
  const totalPages = totalCount && pageSize ? Math.ceil(totalCount / pageSize) : 1;

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden bg-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={selectedIds?.size === data.length && data.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange?.(new Set(data.map((r) => r[keyField])));
                      } else {
                        onSelectionChange?.(new Set());
                      }
                    }}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row[keyField]}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-border last:border-b-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/30"
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={selectedIds?.has(row[keyField])}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) {
                            next.add(row[keyField]);
                          } else {
                            next.delete(row[keyField]);
                          }
                          onSelectionChange?.(next);
                        }}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-foreground">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {onPageChange && totalCount !== undefined && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">
            {totalCount} total
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange((page ?? 1) - 1)}
              disabled={!page || page <= 1}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page ?? 1} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange((page ?? 1) + 1)}
              disabled={!page || page >= totalPages}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Verification
- Import into any page with sample data array
- Renders: white card, muted header row, hover highlights, pagination bar
- Click row fires `onRowClick`
- Checkbox selection works
- Empty state shows message

---

## Chunk 4: Dashboard Page Redesign

**File:** `src/app/(dashboard)/page.tsx`

### Changes:
1. Add `<PageHeader title="Dashboard" subtitle="Good morning, {name}" />` at top
2. Replace gradient stat cards with flat KPI cards:
   ```html
   <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
     <Card>
       <CardContent class="p-4">
         <p class="text-xs text-muted-foreground uppercase tracking-wider">Active Listings</p>
         <p class="text-2xl font-semibold text-foreground mt-1">17</p>
       </CardContent>
     </Card>
     <!-- repeat for Pending Showings, Open Tasks, Confirmed This Week -->
   </div>
   ```
3. Remove `gradient-*` classes from any card backgrounds
4. PipelineSnapshot: replace gradient bars with solid `bg-primary`, `bg-brand`, `bg-success` segments
5. Calendar widget: clean borders, no glass effects
6. Remove `bg-canvas` wrapper if present

### Verification
- PageHeader renders at top
- 4 KPI cards in row (2x2 on mobile)
- No gradients or glass effects
- Pipeline bars use solid brand colors

---

## Chunk 5: Contacts — Table View + 3-Column Detail

### Step 5.1: Remove entity sidebar

**File:** `src/app/(dashboard)/contacts/layout.tsx`

Remove the 280px left sidebar pattern. Just render `{children}` full-width:
```typescript
export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### Step 5.2: Contacts list → DataTable

**File:** `src/app/(dashboard)/contacts/page.tsx`

Replace the redirect-to-first-contact pattern with a full-width table:

```typescript
// Fetch ALL contacts (with pagination)
const { data: contacts } = await supabase
  .from("contacts")
  .select("id, name, email, phone, type, stage_bar, lead_status, last_activity_date")
  .order("created_at", { ascending: false })
  .limit(50);

return (
  <div>
    <PageHeader
      title="Contacts"
      subtitle={`${contacts?.length ?? 0} contacts`}
      actions={<Button variant="default" className="bg-brand text-white hover:bg-brand-dark">Create Contact</Button>}
    />
    <div className="p-6">
      <DataTable
        columns={[
          { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "email", header: "Email" },
          { key: "phone", header: "Phone" },
          { key: "type", header: "Type", render: (r) => <Badge variant="outline">{r.type}</Badge> },
          { key: "stage_bar", header: "Stage", render: (r) => <Badge>{r.stage_bar || "new"}</Badge> },
          { key: "last_activity_date", header: "Last Activity", render: (r) => r.last_activity_date ? formatDate(r.last_activity_date) : "—" },
        ]}
        data={contacts ?? []}
        onRowClick={(row) => router.push(`/contacts/${row.id}`)}
        emptyMessage="No contacts yet. Create your first contact to get started."
      />
    </div>
  </div>
);
```

Note: This page needs to become a client component (or wrap the DataTable in a client component) since `onRowClick` uses `router.push`. Alternatively, use `<Link>` wrappers in the render functions.

### Step 5.3: Contact detail → 3-column

**File:** `src/app/(dashboard)/contacts/[id]/page.tsx`

Restructure the layout to 3 columns on desktop:

```html
<div class="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
  <!-- Left: Properties sidebar (hidden on mobile, sheet on mobile) -->
  <aside class="hidden lg:block w-60 border-r border-border bg-card overflow-y-auto p-4">
    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">About this contact</h3>
    <!-- Name, email, phone, type, stage, tags, preferences — each as a labeled field -->
    <div class="space-y-3">
      <PropertyField label="Name" value={contact.name} />
      <PropertyField label="Email" value={contact.email} />
      <PropertyField label="Phone" value={contact.phone} />
      <PropertyField label="Type" value={<Badge>{contact.type}</Badge>} />
      <PropertyField label="Stage" value={<Badge>{contact.stage_bar}</Badge>} />
      <!-- etc -->
    </div>
  </aside>

  <!-- Center: Tabbed content -->
  <main class="flex-1 overflow-y-auto">
    <PageHeader
      title={contact.name}
      breadcrumbs={[{ label: "Contacts", href: "/contacts" }, { label: contact.name }]}
      tabs={[
        { label: "Overview", value: "overview" },
        { label: "Communications", value: "comms" },
        { label: "Preferences", value: "prefs" },
        { label: "Workflows", value: "workflows" },
        { label: "Documents", value: "docs" },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={<><Button variant="outline">Edit</Button><Button variant="destructive">Delete</Button></>}
    />
    <div class="p-6">
      {/* Tab content renders here */}
    </div>
  </main>

  <!-- Right: Associations panel -->
  <aside class="hidden xl:block w-72 border-l border-border bg-card overflow-y-auto p-4">
    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Associations</h3>
    <!-- Listings, Tasks, Households, Referrals — each as collapsible sections -->
  </aside>
</div>
```

Create a helper component `PropertyField`:
```typescript
function PropertyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground mt-0.5">{value || "—"}</dd>
    </div>
  );
}
```

### Verification
- `/contacts` shows full-width DataTable
- Click row navigates to detail
- Detail page: 3 columns on desktop (properties | tabs | associations)
- Mobile: single column, properties hidden (or in sheet)
- All existing data displays correctly
- Tabs switch content

---

## Chunk 6: Listings — Same Pattern as Contacts

Apply the same table + 3-column detail pattern:

### Files:
- `src/app/(dashboard)/listings/layout.tsx` — Simplify to `{children}`
- `src/app/(dashboard)/listings/page.tsx` — Full-width DataTable (Address, MLS#, Status, Price, Seller, Created)
- `src/app/(dashboard)/listings/[id]/page.tsx` — 3-column with horizontal workflow progress bar in center

### Listing detail left sidebar properties:
- Address, MLS#, Status, List Price, Sold Price, Property Type, Beds/Baths, Seller name, Created

### Listing detail center:
- Horizontal workflow stepper (8 phases, coral active step)
- Tabs: Overview, Forms, Documents, Enrichment, Content

### Listing detail right sidebar:
- Seller contact card, Showings list, Recent activity

---

## Chunk 7: Showings

**File:** `src/app/(dashboard)/showings/page.tsx`

- PageHeader: "Showings"
- DataTable: Property (address), Buyer Agent, Date/Time, Status (badge)
- Click → detail page with 2-column layout (info left, communication timeline right)

---

## Chunk 8: Tasks

**File:** `src/app/(dashboard)/tasks/page.tsx`

- PageHeader: "Tasks" with actions: "Create Task" (coral button)
- Keep existing TaskPipeline kanban but restyle:
  - Column headers: solid color strip (bg-muted for Pending, bg-brand-muted for In Progress, bg-success/10 for Completed)
  - Task cards: `bg-card border border-border rounded-lg p-3`
  - Priority: small colored dot (red=urgent, amber=high, blue=medium, gray=low)

---

## Chunk 9: Calendar

**File:** `src/app/(dashboard)/calendar/page.tsx`

- Add PageHeader: "Calendar"
- Calendar component inherits new colors via CSS variables
- Event colors: `bg-brand` for showings, `bg-success` for confirmed, `bg-destructive` for cancelled

---

## Chunk 10: Newsletters

**Files:** `src/app/(dashboard)/newsletters/page.tsx`, `/queue/page.tsx`, `/analytics/page.tsx`

- PageHeader: "Email Marketing" with tab navigation (Dashboard, Queue, Analytics, Guide)
- Dashboard: flat KPI cards (Sent, Opened, Clicked, Open Rate%, Click Rate%)
- Queue: DataTable for pending approvals
- Analytics: charts using `--chart-1` through `--chart-5` colors

---

## Chunk 11: Content Engine

**Files:** `src/app/(dashboard)/content/page.tsx`, `content/[id]/content-detail.tsx`

- PageHeader: "Content Engine"
- Content list: DataTable (Listing, Prompts Status, Video Status, Image Status)
- Detail: Keep 3-step stepper but restyle:
  - Active step: `bg-brand text-white`
  - Completed step: `bg-brand/10 text-brand border border-brand/20`
  - Upcoming: `bg-muted text-muted-foreground`

---

## Chunk 12: Remaining Pages

### Automations (`src/app/(dashboard)/automations/page.tsx`)
- PageHeader: "Automations"
- Workflow cards with enrollment stats, coral "Active" badge

### Inbox (`src/app/(dashboard)/inbox/page.tsx`)
- PageHeader: "Inbox"
- Message timeline: clean bubbles, outbound = `bg-brand/10`, inbound = `bg-muted`

### Forms (`src/app/(dashboard)/forms/page.tsx`)
- PageHeader: "BC Forms"
- DataTable or card grid showing form completion status

### Search (`src/app/(dashboard)/search/page.tsx`)
- PageHeader: "Property Search"
- Filter bar: clean inputs with `border-border`
- Result cards: `bg-card border border-border rounded-lg`

### Import (`src/app/(dashboard)/import/page.tsx`)
- PageHeader: "Import Listings"
- Upload zone: dashed border `border-2 border-dashed border-border rounded-lg`
- Preview table: DataTable

---

## Chunk 13: Button & Badge Variants

### File: `src/components/ui/button.tsx`

Add a `brand` variant to the CVA config:

```typescript
brand: "bg-brand text-brand-foreground shadow-sm hover:bg-brand-dark active:bg-brand-dark/90",
```

### File: `src/components/ui/badge.tsx`

Add semantic variants:

```typescript
success: "bg-success/10 text-success border-success/20",
warning: "bg-[#f5c26b]/10 text-[#c87d2f] border-[#f5c26b]/20",
info: "bg-[#516f90]/10 text-[#516f90] border-[#516f90]/20",
```

### Audit all pages:
- Primary CTAs (Create Contact, Create Listing, Generate, Send) → `variant="brand"`
- Status badges → use semantic variants (success for confirmed/completed, warning for pending, destructive for failed)

---

## Chunk 14: Final Cleanup

### Remove unused files:
- `src/components/layout/AppHeader.tsx` (if no longer imported anywhere)
- `src/components/layout/TopBar.tsx` (if unused)
- `src/components/layout/Sidebar.tsx` (if replaced by MondaySidebar)
- `src/components/layout/SidebarLayout.tsx` (if unused)

### Audit hardcoded colors:
```bash
# Find hardcoded hex colors in JSX files
grep -rn "#4f35d2\|#323338\|#676879\|#ff5c3a\|#00bfa5\|#f4f2ff" src/ --include="*.tsx" --include="*.ts"
```
Replace each with the appropriate CSS variable class.

### Dark mode verification:
Visit every page with dark mode enabled. Check:
- Sidebar darkens further
- Cards use dark backgrounds
- Text is readable
- No white-on-white or black-on-black issues

### Final build:
```bash
npm run build  # must pass with zero errors
npx tsc --noEmit  # must pass
```

---

## Testing Checklist (Run After Each Chunk)

```bash
# 1. TypeScript
npx tsc --noEmit

# 2. Build
npm run build

# 3. Visual check (start dev server)
npm run dev
# Open http://localhost:3000
# Check: login page, dashboard, contacts list, contact detail, listings, showings
# Check: mobile viewport (375px width in DevTools)
# Check: dark mode toggle
```

---

## File Reference (Complete List of Files to Touch)

### New files to CREATE:
| File | Chunk |
|------|-------|
| `src/components/layout/PageHeader.tsx` | 2 |
| `src/components/ui/data-table.tsx` | 3 |

### Files to MODIFY:
| File | Chunk | Change |
|------|-------|--------|
| `src/app/globals.css` | 0 | DONE — palette swapped |
| `src/components/layout/LayoutProvider.tsx` | 1 | Hardcode sidebar |
| `src/components/layout/DashboardShellClient.tsx` | 1 | Remove top-nav branch |
| `src/components/layout/MondaySidebar.tsx` | 1 | Navy bg, coral active, groups |
| `src/components/layout/MondayHeader.tsx` | 1 | White, minimal, no nav tabs |
| `src/components/layout/MobileNav.tsx` | 1 | Updated colors |
| `src/app/(dashboard)/page.tsx` | 4 | PageHeader + flat KPI cards |
| `src/components/dashboard/PipelineSnapshot.tsx` | 4 | Solid color bars |
| `src/app/(dashboard)/contacts/layout.tsx` | 5 | Remove entity sidebar |
| `src/app/(dashboard)/contacts/page.tsx` | 5 | Full-width DataTable |
| `src/app/(dashboard)/contacts/[id]/page.tsx` | 5 | 3-column detail |
| `src/app/(dashboard)/listings/layout.tsx` | 6 | Remove entity sidebar |
| `src/app/(dashboard)/listings/page.tsx` | 6 | Full-width DataTable |
| `src/app/(dashboard)/listings/[id]/page.tsx` | 6 | 3-column detail |
| `src/app/(dashboard)/showings/page.tsx` | 7 | PageHeader + DataTable |
| `src/app/(dashboard)/tasks/page.tsx` | 8 | Restyle kanban cards |
| `src/app/(dashboard)/calendar/page.tsx` | 9 | PageHeader + colors |
| `src/app/(dashboard)/newsletters/page.tsx` | 10 | PageHeader + tabs |
| `src/app/(dashboard)/newsletters/queue/page.tsx` | 10 | DataTable for queue |
| `src/app/(dashboard)/newsletters/analytics/page.tsx` | 10 | Chart colors |
| `src/app/(dashboard)/content/page.tsx` | 11 | PageHeader + DataTable |
| `src/app/(dashboard)/automations/page.tsx` | 12 | PageHeader + cards |
| `src/app/(dashboard)/inbox/page.tsx` | 12 | PageHeader + bubbles |
| `src/app/(dashboard)/forms/page.tsx` | 12 | PageHeader |
| `src/app/(dashboard)/search/page.tsx` | 12 | PageHeader + filters |
| `src/app/(dashboard)/import/page.tsx` | 12 | PageHeader + upload |
| `src/components/ui/button.tsx` | 13 | Add brand variant |
| `src/components/ui/badge.tsx` | 13 | Add success/warning/info |

### Files to potentially DELETE (Chunk 14):
| File | Condition |
|------|-----------|
| `src/components/layout/AppHeader.tsx` | If no imports remain |
| `src/components/layout/TopBar.tsx` | If no imports remain |
| `src/components/layout/Sidebar.tsx` | If replaced by MondaySidebar |
