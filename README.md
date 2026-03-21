# RealtorAI

**A BC AI Agent for Real Estate Transaction & Showing Automation**

Project by **Rahul Mittal** & **Aman Dhindsa**

---

## Overview

RealtorAI is an AI-powered CRM built for BC (British Columbia) real estate agents. It automates the entire listing lifecycle — from seller intake and document generation to MLS submission and showing coordination — with a built-in voice assistant for hands-free operation.

### Key Features

- **Listing Workflow** — 9-step guided process from Seller Intake through Post-Listing, with real-time progress tracking
- **Document Management** — Upload and track required documents (FINTRAC, DORTS, PDS) with readiness indicators
- **BC Standard Forms** — Auto-fill 12 BCREA forms (DORTS, MLC, PDS, Privacy, C3, and more) from listing data
- **Showing Automation** — Request, confirm, and manage property showings with seller SMS/WhatsApp notifications
- **Contact CRM** — Manage buyers, sellers, and agents with communication history and family tracking
- **Deal Pipeline** — Track deals from intake to closing with commission tracking
- **AI Content Engine** — Generate MLS remarks, video/image prompts, and Instagram captions via Claude AI
- **Voice Assistant** — AI-powered assistant for hands-free navigation, property search, and task management
- **Calendar Integration** — Weekly/monthly calendar with Google Calendar sync
- **Task Management** — Track to-dos linked to listings and contacts
- **Reports & Analytics** — Dashboard with performance metrics

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Base UI) |
| Database | Supabase (PostgreSQL + Storage + RLS) |
| Auth | NextAuth v5 (JWT strategy, Google OAuth + demo credentials) |
| AI | Anthropic Claude SDK |
| SMS/WhatsApp | Twilio |
| Calendar | Google Calendar API |
| Forms | React Hook Form + Zod validation |
| Video/Image | Kling AI API |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (create at [supabase.com](https://supabase.com))
- Environment variables configured (see below)

### 1. Clone & Install

```bash
git clone <repo-url>
cd realtorai
npm install
```

### 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

**Required variables:**

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `NEXTAUTH_SECRET` | Random 32+ char string (`openssl rand -base64 32`) |

**Optional variables** (for specific features):

| Variable | Feature |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth login + Calendar |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | SMS/WhatsApp showing notifications |
| `CLAUDE_API_KEY` | AI-generated MLS remarks and content |
| `VOICE_AGENT_API_KEY` | Voice assistant integration |
| `FORM_SERVER_URL` | BCREA form server (default: `http://127.0.0.1:8767`) |

See `.env.local.example` for the full list with descriptions.

### 3. Database Setup

Apply all migrations **in order** to your Supabase project via the SQL Editor (or Supabase CLI):

| # | Migration | Purpose |
|---|-----------|---------|
| 1 | `001_initial_schema.sql` | Core tables: contacts, listings, appointments, communications, documents, google_tokens |
| 2 | `002_add_tasks.sql` | Tasks table with priority, category, status |
| 3 | `003_allow_anon_role.sql` | RLS policies for anon role (required — NextAuth uses anon key) |
| 4 | `004_form_templates_and_submissions.sql` | BCREA form templates and submissions |
| 5 | `005_content_engine.sql` | AI prompts and media assets |
| 6 | `005_english_tutor.sql` | English tutor feature tables |
| 7 | `006_deals_pipeline.sql` | Deals, parties, and checklists for CRM pipeline |
| 8 | `007_user_integrations.sql` | User integration credentials (DocuSign, MLS, etc.) |
| 9 | `008_seed_sample_data.sql` | Demo data: 5 sellers, 5 buyers, 5 listings, deals |
| 10 | `009_mortgages.sql` | Mortgage tracking for renewal alerts |
| 11 | `010_seed_mortgage_data.sql` | Mortgage demo data |
| 12 | `011_family_openhouse_stats.sql` | Family members, important dates, open houses, listing activities |
| 13 | `012_seed_family_openhouse_data.sql` | Family and dates demo data |
| 14 | `013_feature_overrides.sql` | Feature flag table |
| 15 | `014_extension_tasks.sql` | Extension feature tasks |
| 16 | `015_seed_buyer_completed_purchases.sql` | Buyer purchase history demo data |
| 17 | `016_seed_seller_completed_sales.sql` | Seller sales history demo data |
| 18 | `017_seed_mortgage_renewals_soon.sql` | Mortgage renewal scenarios |
| 19 | `018_object_linking_improvements.sql` | Object linking enhancements |
| 20 | `019_reset_seed_data.sql` | Clean reset of all seed data |

**Quick apply with Supabase CLI** (if linked):

```bash
npx supabase db push
```

Or paste each file's contents into the Supabase SQL Editor in order.

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login with demo credentials or Google OAuth.

### 5. Optional: Forms Server

For BCREA form generation, run the Python forms server in a separate terminal:

```bash
cd forms/
pip install -r requirements.txt
python server.py
```

This runs on port 8767 by default.

## Project Structure

```
src/
├── app/                          # Next.js App Router (pages, layouts, API routes)
│   ├── (auth)/login/             # Login page
│   ├── (dashboard)/              # Protected routes (listings, contacts, showings, etc.)
│   └── api/                      # API routes
├── actions/                      # Server actions (per domain)
├── components/
│   ├── ui/                       # Base UI primitives (shadcn)
│   ├── shared/                   # Cross-domain reusable components
│   ├── layout/                   # AppHeader, Sidebar, DetailPageLayout
│   └── {domain}/                 # Domain-specific (listings, contacts, showings, etc.)
├── hooks/                        # Client-side data fetching hooks
├── lib/
│   ├── supabase/                 # Database clients (admin, client, server)
│   ├── constants/                # Shared enums, color maps, labels
│   ├── schemas/                  # Zod validation schemas
│   └── actions/                  # Server action helpers
└── types/                        # TypeScript type definitions
supabase/
└── migrations/                   # SQL migration files (apply in order)
voice_agent/                      # Python voice agent backend
listingflow-agent/                # AI website generation agent
listingflow-sites/                # Pre-built website components
```

## Important Notes

- **Auth**: Uses NextAuth v5 (NOT Supabase Auth). Browser-side Supabase uses the anon key.
- **RLS**: All tables allow anon role access (single-tenant). Migration `003` is required.
- **Server Actions**: Use `createAdminClient()` from `@/lib/supabase/admin` for all server-side DB operations.
- **Styling**: Tailwind CSS 4 with semantic tokens (`text-primary`, `bg-card`). See `CLAUDE.md` for full conventions.
- **Icons**: `lucide-react` only.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
