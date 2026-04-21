<!-- docs-audit: package.json, src/**, docs/* -->
# RealtorAI

**A BC AI Agent for Real Estate Transaction & Showing Automation**

Project by **Rahul Mittal** & **Aman Dhindsa**

---

## Overview

RealtorAI is an AI-powered CRM built for BC (British Columbia) real estate agents. It automates the entire listing lifecycle — from seller intake and document generation to MLS submission and showing coordination — with a built-in voice assistant for hands-free operation.

### Key Features

- **Listing Workflow** — 8-phase guided process from Seller Intake through MLS Submission, with real-time progress tracking
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
| `ANTHROPIC_API_KEY` | AI-generated MLS remarks and content |
| `VOICE_AGENT_API_KEY` | Voice assistant integration |
| `REALTORS360_URL` | BCREA form server (default: `http://127.0.0.1:8767`) |

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
| 6 | `006_users_and_features.sql` | Users table and feature flags |
| 7 | `007_contact_enhancements.sql` | Contact fields: dates, source, tags |
| 8 | `008_deals_pipeline.sql` | Deals, parties, and checklists for CRM pipeline |
| 9 | `009_contact_lifecycle.sql` | Buyer preferences, lifecycle stages |
| 10 | `010_user_integrations.sql` | User integration credentials (DocuSign, MLS, etc.) |
| 11 | `011_contact_detail_features.sql` | Contact documents, lead status |
| 12 | `012_seed_sample_data.sql` | Demo data: sellers, buyers, listings, deals |
| 13 | `013_mortgages.sql` | Mortgage tracking for renewal alerts |
| 14 | `014_workflow_automation.sql` | Workflow engine: workflows, steps, enrollments, templates |
| 15 | `015_lifecycle_workflows.sql` | Lifecycle workflow types and seeds |
| 16 | `016_newsletter_journey_engine.sql` | Newsletters, events, contact journeys |
| 17 | `017_seed_mortgage_data.sql` | Mortgage demo data |
| 18 | `018_stage_bar.sql` | Contact stage bar with backfill |
| 19 | `019_family_openhouse_stats.sql` | Family members, open houses, listing activities |
| 20 | `020_unify_email_engine.sql` | Merge journey into workflow enrollments |
| 21 | `021_email_template_builder.sql` | Template builder JSON and AI templates |
| 22 | `022_partner_contact_type.sql` | Partner/other contact types |
| 23 | `023_seed_family_openhouse_data.sql` | Family and open house demo data |
| 24 | `024_feature_overrides.sql` | Feature flag overrides table |
| 25 | `025_referrals_table.sql` | Referrals tracking |
| 26 | `026_visual_workflow_builder.sql` | React Flow visual workflow editor |
| 27 | `027_extension_tasks.sql` | Extension feature tasks |
| 28 | `028_segments_ab_testing.sql` | Contact segments and A/B testing |
| 29 | `029_seller_preferences.sql` | Seller preferences JSONB |
| 30 | `030_ai_agent.sql` | AI lead scoring and agent recommendations |
| 31 | `031_last_activity_date.sql` | Contact last activity tracking |
| 32 | `032_seed_buyer_completed_purchases.sql` | Buyer purchase history demo data |
| 33 | `033_fix_stage_bar_consistency.sql` | Stage bar consistency fixes |
| 34 | `034_seed_seller_completed_sales.sql` | Seller sales history demo data |
| 35 | `035_contact_intelligence.sql` | Households, relationships, demographics |
| 36 | `036_seed_mortgage_renewals_soon.sql` | Mortgage renewal scenarios |
| 37 | `037_cleanup_relationship_types.sql` | Relationship type constraints |
| 38 | `038_object_linking_improvements.sql` | Object linking enhancements |
| 39 | `039_contact_consistency_trigger.sql` | Data consistency triggers |
| 40 | `040_reset_seed_data.sql` | Clean reset of all seed data |
| 41 | `041_agent_event_pipeline.sql` | Agent events and decisions |
| 42 | `042_enable_realtime.sql` | Supabase Realtime on key tables |
| 43 | `043_lead_scoring_and_activities.sql` | Behavior scoring, activities, properties |
| 44 | `044_progressive_trust.sql` | Agent trust settings |
| 45 | `045_offers.sql` | Offers and conditions |
| 46 | `046_under_contract_workflow.sql` | Under-contract workflow seeds |
| 47 | `047_data_integrity_fixes.sql` | Constraints, indexes, enforcement triggers |
| 48 | `048_drop_english_tutor.sql` | Drop unused tutor tables |
| 49–56+ | Additional migrations | Voice agent, AI agent enhancements, and further schema updates |

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
realtors360-agent/                # AI website generation agent
realtors360-sites/                # Pre-built website components
```

## Important Notes

- **Auth**: Uses NextAuth v5 (NOT Supabase Auth). Browser-side Supabase uses the anon key.
- **RLS**: RLS uses `auth.role() = 'authenticated'` for all tables (migration `003` additionally grants anon access for NextAuth compatibility). Migration `003` is required.
- **Server Actions**: Use `createAdminClient()` from `@/lib/supabase/admin` for all server-side DB operations.
- **Styling**: Tailwind CSS 4 with semantic tokens (`text-primary`, `bg-card`). See `CLAUDE.md` for full conventions.
- **Icons**: Emoji on pages, `lucide-react` only inside reusable components.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<!-- Last reviewed: 2026-04-21 -->
