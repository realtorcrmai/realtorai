# CLAUDE.md — ListingFlow Real Estate CRM

## Project Overview

ListingFlow is a real estate transaction management CRM for licensed BC realtors. It automates the full property listing lifecycle — from seller intake through closing — with integrated showing management, BCREA form generation, AI content creation, and regulatory compliance tracking.

**Live URL:** localhost:3000 (dev)
**Monorepo root:** `/Users/bigbear/reality crm/`
**App directory:** `/Users/bigbear/reality crm/realestate-crm/`

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| Runtime | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL + RLS) | latest |
| Auth | NextAuth v5 (beta.30) | JWT sessions |
| Styling | Tailwind CSS v4 + custom ListingFlow design system | 4.x |
| UI Components | shadcn/ui v4 + custom LF components | 4.x |
| State | Zustand + TanStack React Query v5 | 5.x |
| Forms | React Hook Form + Zod v4 | 7.x / 4.x |
| SMS/WhatsApp | Twilio | 5.x |
| Calendar | Google Calendar API (googleapis) | 171.x |
| AI | Anthropic Claude SDK | 0.78.x |
| Video/Image | Kling AI API | custom |
| Form Engine | ListingFlow Python server | localhost:8767 |

---

## Project Structure

```
realestate-crm/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page (demo + Google OAuth)
│   │   ├── (dashboard)/           # Protected dashboard routes
│   │   │   ├── page.tsx           # Dashboard home
│   │   │   ├── listings/          # Listings list + [id] detail + [id]/workflow
│   │   │   ├── contacts/          # Contacts list + [id] detail
│   │   │   ├── showings/          # Showings list + [id] detail
│   │   │   ├── calendar/          # Google Calendar + showing events
│   │   │   └── content/           # AI content engine + [id] detail
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/ # NextAuth handler
│   │   │   ├── calendar/          # events + busy endpoints
│   │   │   ├── contacts/          # Contact CRUD API
│   │   │   ├── forms/generate/    # BCREA form generation proxy
│   │   │   ├── listings/          # Listing CRUD API
│   │   │   ├── showings/          # Showing CRUD API
│   │   │   ├── mls-remarks/       # Claude AI MLS remarks
│   │   │   ├── neighborhood/      # Mock neighbourhood comps
│   │   │   ├── kling/status/      # Kling AI task polling
│   │   │   └── webhooks/twilio/   # Inbound SMS/WhatsApp handler
│   │   ├── globals.css            # Design system + Tailwind config
│   │   └── layout.tsx             # Root layout (fonts, providers)
│   ├── actions/                   # Server actions
│   │   ├── calendar.ts            # Google Calendar events
│   │   ├── contacts.ts            # Contact CRUD + messaging
│   │   ├── content.ts             # AI prompt/media generation
│   │   ├── enrichment.ts          # BC Geocoder, ParcelMap, LTSA, Assessment
│   │   ├── listings.ts            # Listing CRUD
│   │   ├── showings.ts            # Showing workflow + Twilio messaging
│   │   └── workflow.ts            # 8-phase workflow advancement
│   ├── components/
│   │   ├── contacts/              # ContactCard, ContactForm, CommunicationTimeline
│   │   ├── content/               # ContentStepper, PromptsStep, GenerateStep, GalleryStep
│   │   ├── listings/              # ListingCard, ListingForm, DocumentStatusTracker, etc.
│   │   ├── showings/              # ShowingRequestForm, StatusBadge, StatusActions, Communication
│   │   ├── workflow/              # WorkflowStepper, PhaseCard, Phase1-8 components
│   │   ├── layout/                # Sidebar, TopBar, MobileNav
│   │   └── ui/                    # shadcn primitives
│   ├── hooks/                     # useListings, useContacts, useShowings, useKlingTask
│   ├── lib/
│   │   ├── supabase/              # client.ts, server.ts, admin.ts
│   │   ├── anthropic/             # creative-director.ts (Claude AI)
│   │   ├── kling/                 # Video/image generation API
│   │   ├── auth.ts                # NextAuth config (demo + Google OAuth)
│   │   ├── twilio.ts              # SMS/WhatsApp wrapper
│   │   ├── google-calendar.ts     # Calendar API wrapper
│   │   ├── cdm-mapper.ts          # Listing → Common Data Model for forms
│   │   └── fuzzy-match.ts         # Jaro-Winkler string matching
│   └── types/
│       ├── database.ts            # Supabase table types
│       └── index.ts               # Exported type aliases
├── supabase/migrations/
│   ├── 001_initial_schema.sql     # contacts, listings, appointments, communications, documents, google_tokens
│   ├── 002_content_engine.sql     # prompts, media_assets, hero image fields
│   └── 003_listing_workflow.sql   # 8-phase workflow, seller_identities, listing_enrichment
└── package.json
```

---

## Design System — ListingFlow

The UI uses a custom glassmorphism design language. All custom styles are defined as CSS custom properties in `globals.css`.

### Key Variables
```css
--lf-bg: #f4f2ff           /* Light purple background */
--lf-indigo: #4f35d2        /* Primary brand color */
--lf-coral: #ff5c3a         /* Accent / CTA color */
--lf-teal: #00bfa5          /* Success accent */
--lf-emerald: #059669       /* Positive states */
--lf-text: #1a1535          /* Primary text */
--lf-r: 13px                /* Border radius */
--lf-sh: 0 2px 12px rgba(79,53,210,.08)  /* Card shadow */
--lf-font-heading: 'Bricolage Grotesque'
--lf-font-body: 'Bricolage Grotesque'
```

### Component Classes
- `.lf-card` — Glass card with backdrop-blur, white 85% opacity
- `.lf-glass` — Glass panel for header/nav
- `.lf-btn` — Primary indigo button
- `.lf-btn-ghost` — Outlined button variant
- `.lf-btn-sm` — Small button
- `.lf-btn-success` / `.lf-btn-danger` — Semantic variants
- `.lf-badge` — Status badge (variants: `-done`, `-active`, `-pending`, `-blocked`, `-info`)
- `.lf-input` / `.lf-select` / `.lf-textarea` — Form elements
- `.lf-phase-num` — Workflow phase indicator (circle with number)
- `.lf-enrich-row` — Data enrichment row with hover effect

### Layout
- Fixed glass header: 60px height
- Horizontal pill navigation: 40px height
- Content area: `margin-top: 100px` (header + nav), `padding: 18px`
- Animated gradient background canvas (`.wf-canvas`)
- No vertical sidebar (converted to horizontal nav)

### Conventions
- Emoji icons throughout UI (no Lucide icons on pages, only in some components)
- Gradient avatars: seller = indigo→coral, buyer = indigo→purple
- Status colors: green = confirmed/done, amber = pending, red = denied/blocked
- All pages use `lf-glass` header bar with gradient title text

---

## Database Schema

### Core Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `contacts` | Buyers and sellers | name, phone, email, type, pref_channel, notes |
| `listings` | Property listings | address, seller_id, status, current_phase (1-8), list_price, forms_status, envelopes, mls_status |
| `appointments` | Showings | listing_id, buyer_agent_*, start_time, status, google_event_id |
| `communications` | Unified message log | contact_id, direction, channel, body, related_id |
| `listing_documents` | Document tracking | listing_id, doc_type, file_name, file_url |
| `seller_identities` | FINTRAC compliance | listing_id, full_name, dob, citizenship, id_type/number/expiry |
| `listing_enrichment` | Property data enrichment | listing_id, geo, parcel, ltsa, assessment, strata, enrich_status (all JSONB) |
| `prompts` | AI-generated content prompts | listing_id, video_prompt, image_prompt |
| `media_assets` | Generated content files | listing_id, asset_type, status, output_url |
| `google_tokens` | Google Calendar tokens | user_email, access_token, refresh_token |

### RLS Policy
All tables: `auth.role() = 'authenticated'` — single-tenant, all rows visible to logged-in users.

---

## 8-Phase Listing Workflow

The CRM implements an 8-phase listing workflow (stored as `current_phase` on listings):

| Phase | Name | Key Features |
|-------|------|-------------|
| 1 | Seller Intake | FINTRAC identity collection, property details, commissions, showing instructions |
| 2 | Data Enrichment | BC Geocoder (API), ParcelMap BC (API), LTSA (manual), BC Assessment (manual) |
| 3 | CMA Analysis | Comparable market analysis fields |
| 4 | Pricing & Review | List price confirmation, price lock, marketing tier |
| 5 | Form Generation | 12 BCREA forms auto-filled via Python ListingFlow server |
| 6 | E-Signature | DocuSign envelope tracking (UI exists, integration partial) |
| 7 | MLS Preparation | Claude AI remarks generation, photo management |
| 8 | MLS Submission | Manual submission step (no Paragon API integration) |

Phase advancement is sequential with audit trail logging.

---

## Key Integrations

### Twilio (SMS + WhatsApp)
- Showing request notifications to sellers
- YES/NO webhook processing for showing confirmation
- Lockbox code delivery on confirmation
- Direct messaging from CRM to contacts
- Phone formatting: auto-adds +1 prefix, strips whitespace

### Google Calendar
- Import agent's calendar events for availability checking
- Create calendar events for confirmed showings
- Token refresh via google_tokens table

### Claude AI (Anthropic)
- MLS public remarks generation (max 500 chars)
- MLS REALTOR remarks generation (max 500 chars)
- Kling video/image prompt generation
- Instagram caption + hashtag generation
- Model: Claude Sonnet

### Kling AI
- Image-to-Video: hero image → 4K video (9:16 for Reels)
- Text-to-Image: prompt → 8K image (1:1 for Instagram)
- Async task polling via /api/kling/status

### ListingFlow Python Server
- Endpoint: `LISTINGFLOW_URL` (default: `http://127.0.0.1:8767`)
- `POST /api/form/html` — accepts CDM payload, returns pre-filled HTML form
- 12 BCREA forms: DORTS, MLC, PDS, FINTRAC, PRIVACY, C3, DRUP, MLS_INPUT, MKTAUTH, AGENCY, C3CONF, FAIRHSG

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=

# Anthropic
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=

# ListingFlow Form Server
LISTINGFLOW_URL=          # defaults to http://127.0.0.1:8767

# Kling AI
KLING_API_BASE_URL=
KLING_IMAGE_API_BASE_URL=

# Demo Auth
DEMO_EMAIL=
DEMO_PASSWORD=
```

---

## Development Commands

```bash
# Start dev server (from realestate-crm/)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Start ListingFlow form server (separate terminal)
# python server at localhost:8767
```

### Dev Server via Claude Preview
Configured in `.claude/launch.json`:
```json
{
  "name": "dev",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev", "--prefix", "/Users/bigbear/reality crm/realestate-crm"],
  "port": 3000
}
```

---

## Design Documents

Located in project root (`/Users/bigbear/reality crm/`):

| Document | Description |
|----------|-------------|
| `ListingFlow_Realtor_Workflow_Design_Document.docx` | Complete 12-phase BC realtor listing lifecycle specification |
| `ListingFlow_Gap_Analysis_Report.docx` | Comparative analysis: design doc vs current implementation |
| `ListingFlow_Gap_Analysis_Report.md` | Same gap analysis in Markdown format |

### Gap Analysis Summary (March 2026)
- **Overall coverage: ~40%** (34 built, 13 partial, 38 missing)
- **Strongest areas:** Data Enrichment (90%), Form Preparation (85%), Listing Intake (75%)
- **Major gaps:** Offer Management (0%), Contract-to-Close (0%), Post-Closing (10%)
- **Bonus features not in doc:** Content Engine (Claude + Kling AI), WhatsApp integration

---

## Known Issues & Improvement Areas

### Contact Management
- Minimal fields (no address, lead source, lead status, tags)
- No contact deletion or archiving
- No search bar on contacts page
- Buyer agents stored as flat text on appointments, not as contacts
- No relationship mapping between contacts

### Communication System
- No email integration (SMS/WhatsApp only)
- Flat timeline with no conversation threading or filtering
- No message templates or canned responses
- No scheduled messages or follow-up reminders
- No unread message tracking or agent notifications
- Showing messages to buyer agents hardcoded to SMS (ignores pref_channel)
- Inbound webhook only processes YES/NO for showings

### Workflow
- E-Signature (Phase 6): DocuSign UI exists but API integration not confirmed live
- MLS Submission (Phase 8): No Paragon API — manual step only
- Phases 9-12 not represented in the workflow stepper
- No offer management, subject tracking, or closing workflow

### Compliance
- FINTRAC only implemented for sellers (not buyers)
- No Receipt of Funds or Suspicious Transaction reporting
- No record retention policy enforcement
- CASL consent tracking exists as form but no expiry tracking

---

## Coding Conventions

- **Server Actions** over API routes for mutations (actions/ directory)
- **API routes** for GET endpoints and external webhooks
- **Zod v4** for all form/API validation
- **JSONB columns** for flexible structured data (forms_status, envelopes, enrichment data, stakeholders)
- **Path alias:** `@/` maps to `src/`
- **CSS:** Use `lf-*` classes for ListingFlow design system, avoid inline styles
- **No Lucide icons on pages** — use emoji icons for UI consistency
- **Supabase admin client** (`supabase/admin.ts`) for server-side operations that bypass RLS
- **force-dynamic** on pages that need real-time data
- **Revalidate paths** after mutations: `revalidatePath('/route')`

---

## ListingFlow Sites — AI Website Generation Platform

### Architecture

**Pre-built components + Claude Agent SDK + Cloudflare Pages**

```
listingflow-sites (Admin Panel) → listingflow-agent (Cloud Agent) → Cloudflare Pages (Static Sites)
                                         ↕
                                   Supabase (Data) + Claude API (Anthropic)
```

The platform generates unique realtor websites automatically:
1. Realtor clicks **"Generate My Website"** in the admin panel
2. **Cloud agent** autonomously searches for top realtor sites in the agent's market, scrapes 3-5 for design inspiration (hidden from user)
3. Agent generates **3 site config JSONs** — each a different style (dark luxury, light modern, bold warm) — by blending scraped design patterns with the realtor's content
4. **Pre-built React components** (`listingflow-sites/src/components/sections/`) render each config into static HTML
5. All 3 variants deploy to **Cloudflare Pages** as preview URLs
6. **Playwright** screenshots each variant at desktop + mobile
7. Realtor sees **3 preview cards** with screenshots — picks their favorite
8. Selected variant promoted to **production** → live URL

### Section Components (9 sections, theme-driven)

Same components render all 3 style variants — the difference is the theme config (colors, fonts), not different code.

| Section | Description |
|---------|-------------|
| Nav | Transparent over hero, sticky on scroll, logo + links |
| Hero | Full-screen image with dark overlay + headline |
| About | Two-column: headshot left, bio + credentials right |
| Stats | 3-column metrics (homes sold, volume, experience) |
| Testimonials | Quote cards with client name + role |
| Listings | Property card grid (photo, address, price, beds/baths) |
| CTA | Full-width banner with button |
| Contact | Simple form: name, email, phone, message |
| Footer | Multi-column: contact info, nav links, areas served |

### 3 Style Presets

| Style | Vibe | Example |
|-------|------|---------|
| Dark Luxury | mikemarfori.com inspired | Black bg, gold accent, Playfair Display |
| Light Modern | Clean, airy | White bg, navy accent, DM Sans |
| Bold & Warm | Energetic, approachable | Cream bg, terracotta accent, Bricolage Grotesque |

### Agent Service

- **Location:** `listingflow-agent/` (separate package in monorepo root)
- **Stack:** Node.js + Express + Anthropic SDK + Playwright
- **API:**
  - `POST /api/generate` — start generation (kicks off autonomous agent)
  - `GET /api/generations/:id` — poll status + get variants with screenshots
  - `POST /api/variants/:id/approve` — promote variant to production
- **Deployment:** Railway or Fly.io (Dockerized)
- **Agent tools:** search (web), scrape (reference sites), crm-data (Supabase), config (Claude generates 3 JSONs), render (ReactDOMServer → HTML), deploy (Cloudflare API), screenshot (Playwright)

### Database Tables (Sites)

| Table | Purpose |
|-------|---------|
| `realtor_sites` | Agent profile, branding, contact info |
| `site_generations` | Generation runs (status, reference scrapes) |
| `site_variants` | 3 variants per generation (config, preview URL, screenshots) |
| `site_pages` | Custom pages |
| `testimonials` | Client testimonials |
| `site_leads` | Contact form submissions |
| `site_media` | Uploaded photos/videos |

### Site Config JSON

Agent generates 3 of these (one per style):
```json
{
  "theme": {
    "colors": { "bg": "#000", "text": "#fff", "accent": "#c9a96e", "muted": "#acacac" },
    "fonts": { "heading": "Playfair Display", "body": "Inter" }
  },
  "nav": { "logo_url": "...", "links": ["About", "Listings", "Contact"] },
  "hero": { "images": ["url1"], "headline": "...", "subheadline": "..." },
  "about": { "headshot_url": "...", "name": "...", "bio": "...", "credentials": ["..."] },
  "stats": { "items": [{ "number": "500+", "label": "Homes Sold" }] },
  "testimonials": { "items": [{ "quote": "...", "name": "...", "role": "Seller" }] },
  "listings": { "items": [{ "photo": "...", "address": "...", "price": "$899,000", "beds": 3, "baths": 2 }] },
  "cta": { "headline": "...", "button_text": "Contact Me", "button_link": "#contact" },
  "contact": { "lead_endpoint": "https://..." },
  "footer": { "phone": "...", "email": "...", "address": "...", "areas": ["Vancouver", "Surrey"] }
}
```

### Environment Variables (Sites)

```
CLOUDFLARE_API_TOKEN=          # Pages API access
CLOUDFLARE_ACCOUNT_ID=         # Account ID
AGENT_SERVICE_URL=             # URL of deployed agent service (e.g. https://lf-agent.fly.dev)
ANTHROPIC_API_KEY=             # For agent service
```
