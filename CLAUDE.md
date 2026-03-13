# RealtorAI — Developer & Agent Conventions

> Every developer and AI agent MUST read this file before writing any code.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict)
- **UI Primitives**: `@base-ui/react` (headless) + shadcn wrappers + `class-variance-authority` (CVA)
- **Styling**: Tailwind CSS 4 + CSS custom properties (oklch color space) in `globals.css`
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Auth**: NextAuth v5 (JWT strategy, Google OAuth + demo credentials)
- **Forms**: `react-hook-form` + `zod` for validation
- **Icons**: `lucide-react` exclusively
- **Path alias**: `@/*` maps to `./src/*`

---

## Component Rules

### Where to put components

| Type | Directory | Example |
|------|-----------|---------|
| Base UI primitives | `src/components/ui/` | Button, Card, Dialog, Badge |
| Shared cross-domain | `src/components/shared/` | LoadingSpinner, EmptyState, AlertBanner |
| Layout | `src/components/layout/` | AppHeader, Sidebar, SidebarLayout, DetailPageLayout |
| Domain-specific | `src/components/{domain}/` | ListingCard, ContactForm, TaskPipeline |

**Domains**: `listings`, `contacts`, `showings`, `tasks`, `calendar`, `forms`, `voice-agent`

### How to write components

- **File naming**: PascalCase matching export name (`ListingCard.tsx` exports `ListingCard`)
- **Exports**: Named exports only (`export function X`), never default exports
- **Props**: Accept `className?: string` for composition. Use inline types for simple props, shared types from `@/types` for complex ones.
- **Styling**: Always use `cn()` from `@/lib/utils` for class merging. Use `cva()` for multi-variant components.
- **Icons**: Import specific icons from `lucide-react` (`import { MapPin } from "lucide-react"`). Never use other icon libraries.
- **Barrel imports**: Import domain components via barrel: `import { ListingCard, ListingForm } from "@/components/listings"`

### Before creating a new component

1. Check `src/components/ui/` — the primitive may already exist
2. Check `src/components/shared/` — a reusable version may exist
3. Check the relevant domain folder — it may already be built

---

## Styling Rules

- **Use semantic tokens**, not raw colors: `text-primary`, `text-muted-foreground`, `bg-card`, `border-input`
- **Status/priority colors**: Import from `@/lib/constants` — never hardcode color maps
- **Utility classes**: Use `.glass`, `.elevation-{2,4,8,16}`, `.gradient-{name}`, `.animate-float-in` from `globals.css`
- **Spacing**: `space-y-6` for section gaps, `gap-2` for inline items, `p-6` for card padding
- **Entry animations**: `<Card className="animate-float-in">` for cards that appear on page load
- **No inline styles** unless dynamically computed (e.g., progress bar `width`)

---

## Data Fetching

| Context | Pattern |
|---------|---------|
| Server components (pages, layouts) | `createAdminClient()` from `@/lib/supabase/admin` |
| Client components | Hooks from `@/hooks` or `fetch("/api/...")` |
| Server actions | `createAdminClient()` inside the action |

- All layouts and detail pages use `export const dynamic = "force-dynamic"`
- Parallel fetches use `Promise.all([...])`
- The app uses NextAuth (NOT Supabase Auth) — browser-side Supabase uses the anon key, which fails RLS. Always use `createAdminClient()` on the server.

---

## Constants

All status enums, color maps, and category labels live in `src/lib/constants/`.

```ts
import { LISTING_STATUSES, LISTING_STATUS_COLORS } from "@/lib/constants";
import { TASK_PRIORITIES, TASK_PRIORITY_CONFIG, TASK_CATEGORY_LABELS } from "@/lib/constants";
```

**Never hardcode** status colors, priority configs, or category labels in components. Always import from constants.

---

## Zod Schemas

All validation schemas live in `src/lib/schemas/`. Both API routes and server actions import from here.

```ts
import { listingSchema, type ListingFormData } from "@/lib/schemas";
import { contactSchema, type ContactFormData } from "@/lib/schemas";
```

Derive TypeScript types from schemas: `type MyData = z.infer<typeof mySchema>`

---

## Server Actions

- Location: `src/actions/{domain}.ts`
- Always use `"use server"` directive
- Validate with Zod schema from `@/lib/schemas/`
- Use `createAction()` wrapper from `@/lib/actions/create-action` for simple CRUD
- Return type: `ActionResult<T>` — either `{ success: true, ...data }` or `{ error: string }`
- Always call `revalidatePath()` after mutations

---

## API Routes

- Location: `src/app/api/{resource}/route.ts`
- Always start with: `const { unauthorized } = await requireAuth(); if (unauthorized) return unauthorized;`
- Validate request body with Zod schema from `@/lib/schemas/`
- Use `createAdminClient()` for database operations
- Return `NextResponse.json(data)` on success, `NextResponse.json({ error }, { status })` on failure

---

## Layout Components

| Component | Use for |
|-----------|---------|
| `SidebarLayout` | Any page with a left sidebar list + main content (listings, contacts, showings, tasks) |
| `DetailPageLayout` | Any detail page with scrollable center + fixed right context panel |

```tsx
// In a layout.tsx:
<SidebarLayout sidebar={<MySidebar />} sidebarFooter={<MyForm />}>
  {children}
</SidebarLayout>

// In a [id]/page.tsx:
<DetailPageLayout contextPanel={<MyContextPanel />}>
  <Card>...</Card>
  <Card>...</Card>
</DetailPageLayout>
```

---

## Types

- Database row types: `@/types` (generated from Supabase schema)
- Joined/relation types: `@/types` (`ListingWithSeller`, `AppointmentWithListing`, `Task`)
- Action result type: `ActionResult<T>` from `@/lib/actions/types`
- Form data types: `z.infer<typeof schema>` from `@/lib/schemas`

---

## File Structure Overview

```
src/
├── app/                          # Next.js App Router (pages, layouts, API routes)
├── components/
│   ├── ui/                      # Base UI primitives (shadcn)
│   ├── shared/                  # Cross-domain reusable components
│   ├── layout/                  # Layout components (SidebarLayout, DetailPageLayout)
│   └── {domain}/                # Domain-specific components
├── lib/
│   ├── utils.ts                 # cn() utility
│   ├── constants/               # Shared enums, color maps, labels
│   ├── schemas/                 # Shared Zod validation schemas
│   ├── actions/                 # Server action helpers (createAction, ActionResult)
│   ├── supabase/                # Database clients (admin, client, server)
│   └── forms/                   # PDF form utilities
├── hooks/                       # Client-side data fetching hooks
├── actions/                     # Server actions (per domain)
└── types/                       # TypeScript type definitions
```
