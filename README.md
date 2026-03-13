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
- **Contact CRM** — Manage buyers, sellers, and agents with communication history
- **Voice Assistant** — AI-powered assistant for hands-free navigation, property search, and task management
- **Calendar Integration** — Weekly/monthly calendar with Google Calendar sync
- **Task Management** — Track to-dos linked to listings and contacts
- **Conveyancing Packs** — Generate document packages for transactions
- **Neighborhood Insights** — View recent sales and market data for any address

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Base UI) |
| Database | Supabase (PostgreSQL + Storage + RLS) |
| Auth | NextAuth v5 (beta) |
| Voice | Web Speech API + custom voice agent backend |
| Forms | React Hook Form + Zod validation |
| Calendar | react-big-calendar |
| Deployment | Netlify |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with tables created (see `supabase/migrations/`)
- Environment variables configured (see below)

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

AUTH_SECRET=your-nextauth-secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Database Setup

Apply migrations to your Supabase instance via the SQL Editor:

1. `supabase/migrations/001_initial_schema.sql` — Core tables (contacts, listings, appointments, etc.)
2. `supabase/migrations/002_add_tasks.sql` — Tasks table
3. `supabase/migrations/003_allow_anon_role.sql` — RLS policies for anon access

## Project Structure

```
src/
  app/(dashboard)/          # Dashboard routes (listings, contacts, showings, etc.)
  actions/                  # Server actions for CRUD operations
  components/
    layout/                 # AppHeader, MobileNav
    listings/               # ListingSidebar, ListingWorkflow, FormReadinessPanel
    showings/               # ShowingRequestForm, ShowingStatusBadge
    voice-agent/            # VoiceAgentWidget, VoiceAgentPanel
    ui/                     # shadcn/ui components
  lib/
    supabase/               # Supabase client (admin + browser)
  types/                    # TypeScript type definitions
supabase/
  migrations/               # SQL migration files
voice_agent/                # Python voice agent backend
```

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
