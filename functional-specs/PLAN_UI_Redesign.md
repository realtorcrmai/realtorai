# Plan: HubSpot-Style Full UI Redesign — Realtors360 CRM

## Context

The current CRM UI uses a glassmorphism/Monday.com hybrid design with teal primary, gradient backgrounds, and a dual layout mode (top-nav OR sidebar). The user wants a complete visual overhaul to match HubSpot's clean, professional CRM aesthetic — dark navy sidebar, coral accents, flat cards, consistent page templates across all 13+ pages.

## Approach: CSS-First, Then Layout, Then Pages

The redesign is broken into **15 independently testable chunks** in dependency order. The key insight: shadcn/ui components consume CSS variables — so swapping the color palette in `globals.css` automatically recolors every component without touching component files.

## Key Architectural Changes

1. **Color palette swap** — Teal/glassmorphism → Navy #2D3E50 + Coral #FF7A59 + Light gray #F5F8FA
2. **Layout simplification** — Kill the dual top-nav/sidebar toggle. Sidebar becomes the ONLY mode.
3. **Glassmorphism removal** — Redefine `.glass` to solid white. Remove `backdrop-filter`. Delete gradient utilities.
4. **List pages → DataTable** — Contacts/Listings currently use sidebar-list pattern. Convert to full-width HubSpot table views.
5. **Detail pages → 3-column** — Properties sidebar | Tabbed content | Associations panel
6. **New PageHeader component** — Consistent breadcrumbs + title + actions + tabs across all pages

## Chunk Sequence

### Foundation (Must be done first, in order)

**Chunk 0: CSS Design Tokens** — `globals.css` only
- Swap all CSS variables to HubSpot palette (navy/coral/gray)
- Dark mode variables updated
- Flatten `.glass` utility (remove backdrop-filter)
- Remove gradient utility class definitions
- Keep all animations unchanged
- **Verify:** `npm run build` passes, all pages render with new colors, dark mode works

**Chunk 1: Layout Shell** — Layout components only
- Hardcode `LayoutProvider` to always return "sidebar" mode
- Simplify `DashboardShellClient` — remove top-nav branch
- Restyle `MondaySidebar`: navy bg, coral active indicator (3px left border), brand logo at top
- Restyle `MondayHeader`: white bg, no logo (moved to sidebar), keep search/notifications/avatar
- Update `MobileNav` colors
- **Verify:** All pages have navy sidebar on desktop, mobile has hamburger + bottom nav

**Chunk 2: PageHeader Component** — New reusable component
- Create `src/components/layout/PageHeader.tsx`
- Props: title, subtitle, breadcrumbs, actions, tabs, activeTab, onTabChange
- Full-width, `border-b`, breadcrumbs + title + right-aligned actions
- Optional tab row with coral underline for active tab
- **Verify:** Renders with all prop combinations, responsive stacking on mobile

**Chunk 3: Card & DataTable** — Component restyling
- Cards already CSS-variable driven (no changes to card.tsx)
- Create `src/components/ui/data-table.tsx` — Reusable HubSpot-style table
  - White bg, border, rounded corners
  - Header: muted bg, uppercase tracking, small font
  - Rows: border-bottom, hover highlight
  - Cells: consistent padding
  - Optional checkbox column, pagination bar
- **Verify:** DataTable renders with sample data, cards are flat white with subtle borders

### Pages (Can proceed in parallel after foundation)

**Chunk 4: Dashboard** — `page.tsx` + dashboard components
- Add PageHeader: "Dashboard", subtitle "Good morning, {name}"
- KPI row: 4 stat cards (Active Listings, Pending Showings, Open Tasks, Confirmed)
- Widget grid: Calendar + AI Brief | Activity Feed + Pipeline
- Remove gradient backgrounds from all dashboard cards
- Flat PipelineSnapshot with HubSpot bar colors

**Chunk 5: Contacts** — Layout + list + detail restructure
- Remove 280px entity sidebar from `contacts/layout.tsx`
- `contacts/page.tsx` → full-width DataTable (Name, Email, Phone, Type, Stage, Last Activity)
- `contacts/[id]/page.tsx` → 3-column detail:
  - Left (240px): Properties (name, email, phone, type, stage, tags)
  - Center (flex-1): Tabs (Overview, Communications, Preferences, Workflows, Documents)
  - Right (280px): Associations (listings, tasks, households, referrals)

**Chunk 6: Listings** — Same pattern as Contacts
- Remove entity sidebar from `listings/layout.tsx`
- `listings/page.tsx` → DataTable (Address, MLS#, Status, Price, Seller, Created)
- `listings/[id]/page.tsx` → 3-column detail with horizontal workflow progress bar

**Chunk 7: Showings** — List + detail
- DataTable: Property, Buyer Agent, Date/Time, Status
- Detail: 2-column (info + communication timeline)

**Chunk 8: Tasks** — Kanban + table toggle
- PageHeader with view toggle (Table / Kanban)
- Kanban: white cards, colored status column headers
- Table: DataTable with priority dots

**Chunk 9: Calendar** — Mostly color inheritance
- PageHeader: "Calendar"
- Clean event color coding via new palette

**Chunk 10: Newsletters** — Dashboard + queue + analytics
- PageHeader: "Email Marketing" with tab navigation (Dashboard, Queue, Analytics)
- Dashboard: KPI cards + pipeline cards
- Queue: DataTable for pending approvals
- Analytics: HubSpot chart colors (coral, teal, slate, gold)

**Chunk 11: Content Engine** — Stepper + gallery
- PageHeader: "Content Engine"
- Horizontal stepper with numbered steps, coral active indicator
- Gallery: clean grid cards with flat styling

**Chunk 12: Remaining Pages** — Automations, Inbox, Forms, Search, Import
- Each gets PageHeader with consistent title/actions
- Automations: workflow cards with enrollment stats
- Inbox: message timeline with clean message bubbles
- Forms: DataTable for form status
- Search: filter bar + listing result cards
- Import: file upload area + preview table

### Polish (After all pages)

**Chunk 13: Button & Badge Variants**
- Add `brand` button variant: `bg-brand text-white hover:bg-brand-dark` (coral CTA)
- Add badge variants: `success` (teal), `warning` (gold), `info` (slate)
- Audit all pages: primary CTAs should use `brand` variant

**Chunk 14: Final Cleanup**
- Remove unused layout components (AppHeader, TopBar, Sidebar, SidebarLayout)
- Grep for hardcoded hex colors and replace with CSS variable refs
- Remove unused gradient CSS variables
- Verify dark mode on every page
- Run full build + test suite

## Dependency Graph

```
Chunk 0 (CSS Tokens)
  → Chunk 1 (Layout Shell)
    → Chunk 2 (PageHeader) + Chunk 3 (DataTable)
      → Chunks 4-12 (All Pages — PARALLEL)
        → Chunk 13 (Button/Badge Variants)
          → Chunk 14 (Final Polish)
```

## Critical Files

| File | Change |
|------|--------|
| `src/app/globals.css` | All color tokens, glass/gradient utilities, shadows |
| `src/components/layout/LayoutProvider.tsx` | Hardcode sidebar mode |
| `src/components/layout/DashboardShellClient.tsx` | Remove top-nav branch |
| `src/components/layout/MondaySidebar.tsx` | Navy bg, coral active, brand logo |
| `src/components/layout/MondayHeader.tsx` | White bg, clean header |
| `src/components/layout/MobileNav.tsx` | Updated colors |
| `src/components/layout/PageHeader.tsx` | **NEW** — reusable page header |
| `src/components/ui/data-table.tsx` | **NEW** — reusable HubSpot table |
| `src/components/ui/button.tsx` | Add `brand` variant |
| `src/components/ui/badge.tsx` | Add `success`, `warning`, `info` variants |
| `src/app/(dashboard)/contacts/layout.tsx` | Remove entity sidebar |
| `src/app/(dashboard)/contacts/page.tsx` | Full-width DataTable |
| `src/app/(dashboard)/contacts/[id]/page.tsx` | 3-column detail |
| `src/app/(dashboard)/listings/layout.tsx` | Remove entity sidebar |
| `src/app/(dashboard)/listings/page.tsx` | Full-width DataTable |
| `src/app/(dashboard)/listings/[id]/page.tsx` | 3-column detail |
| `src/app/(dashboard)/page.tsx` | Dashboard with PageHeader + KPI cards |
| All other `(dashboard)` page.tsx files | Add PageHeader, restyle |

## Color Reference (Quick Lookup)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | #2D3E50 (navy) | #FF7A59 (coral) | Nav, headings, primary buttons |
| `--brand` | #FF7A59 (coral) | #FF7A59 (coral) | CTAs, active states, accents |
| `--background` | #F5F8FA (light gray) | #1A2332 (dark navy) | Page backgrounds |
| `--card` | #FFFFFF | #243447 | Card surfaces |
| `--border` | #CBD6E2 | #3A4F63 | All borders |
| `--muted-foreground` | #7C98B6 | #7C98B6 | Secondary text |
| `--success` | #00BDA5 (teal) | #00BDA5 | Success states |
| `--destructive` | #D94F57 (red) | #FF6B6B | Error/delete |
| `--sidebar` | #2D3E50 (navy) | #1A2332 | Sidebar bg |
| `--sidebar-primary` | #FF7A59 (coral) | #FF7A59 | Active nav item |

## Verification Per Chunk

1. `npm run build` — zero errors
2. No TypeScript errors (`npx tsc --noEmit`)
3. Desktop screenshot at 1280px
4. Mobile screenshot at 375px
5. Dark mode toggle works
6. No data fetching regressions
7. All interactive elements function
