# Realtors360 CRM — Full Functional Specification

**Version:** 1.0 | **Date:** March 2026 | **Status:** Living Document
**Monorepo:** `/Users/bigbear/reality crm/`

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Architecture](#2-system-architecture)
3. [Module 1: Core CRM](#3-module-1-core-crm)
4. [Module 2: Listing Workflow (8 Phases)](#4-module-2-listing-workflow)
5. [Module 3: Showing Management](#5-module-3-showing-management)
6. [Module 4: AI Content Engine](#6-module-4-ai-content-engine)
7. [Module 5: BCREA Forms Engine](#7-module-5-bcrea-forms-engine)
8. [Module 6: Newsletter & Email Marketing](#8-module-6-newsletter-email-marketing)
9. [Module 7: Workflow Automation Engine](#9-module-7-workflow-automation)
10. [Module 8: AI Agent Layer](#10-module-8-ai-agent)
11. [Module 9: Website Marketing Platform](#11-module-9-website-marketing)
12. [Module 10: Content Generator Service](#12-module-10-content-generator)
13. [Database Schema](#13-database-schema)
14. [External Integrations](#14-external-integrations)
15. [Design System](#15-design-system)
16. [Build Status & Gaps](#16-build-status)
17. [File Inventory](#17-file-inventory)

---

## 1. Product Overview

Realtors360 is a real estate transaction management CRM for licensed BC realtors. It automates the full property listing lifecycle — from seller intake through closing — with integrated showing management, BCREA form generation, AI content creation, automated email marketing, and regulatory compliance tracking.

### Target Users
- Licensed BC REALTORS (primary)
- Real estate teams (future)
- Brokerages (future)

### Core Value Propositions
1. **8-Phase Listing Workflow** — structured process from intake to MLS submission
2. **AI-Powered Content** — Claude generates MLS remarks, video/image prompts, newsletters
3. **Automated Email Marketing** — lifecycle-driven drip campaigns with AI personalization
4. **BCREA Form Automation** — 12 BC-specific forms auto-filled from listing data
5. **Showing Management** — SMS/WhatsApp notifications with YES/NO confirmation
6. **AI Website Generation** — one-click realtor website with 3 design variants

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Runtime | React 19 |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | NextAuth v5 (JWT sessions) |
| Styling | Tailwind CSS v4 + Realtors360 design system |
| UI | shadcn/ui v4 + custom LF components |
| State | Zustand + TanStack Query v5 |
| Forms | React Hook Form + Zod v4 |
| SMS/WhatsApp | Twilio |
| Calendar | Google Calendar API |
| AI | Anthropic Claude SDK |
| Video/Image | Kling AI API |
| Email | Resend + React Email |
| Forms Server | Python (localhost:8767) |

---

## 2. System Architecture

### Monorepo Structure

```
/Users/bigbear/reality crm/
|
+-- realestate-crm/              # Main CRM (Next.js, port 3000)
|   +-- src/app/                  # 30+ pages + 26 API routes
|   +-- src/actions/              # 13 server action files
|   +-- src/components/           # 90+ React components
|   +-- src/lib/                  # 35+ library modules
|   +-- src/emails/               # 7 React Email templates
|   +-- src/hooks/                # 4 custom hooks
|   +-- src/types/                # TypeScript type definitions
|   +-- supabase/migrations/      # 19 database migrations
|   +-- content-generator/        # Content microservice (port 8769)
|
+-- realtors360-sites/            # Website admin panel (Next.js, port 3001)
|   +-- src/app/(admin)/          # 7 admin pages
|   +-- src/app/site/             # 5 public site pages
|   +-- src/components/sections/  # 9 website section components
|   +-- src/components/wizard/    # 4 generation wizard components
|
+-- realtors360-agent/            # Website generation agent (Express, port 8768)
|   +-- src/tools/                # 7 agent tools (scrape, config, render, etc.)
|   +-- src/agent.ts              # Autonomous generation pipeline
|
+-- CLAUDE.md                     # Project documentation
+-- PLAN_Email_Marketing_Engine.md
+-- PLAN_AI_Agent.md
+-- SPEC_AI_Agent_Email_Marketing.md
+-- SPEC_Realtors360_CRM.md       # This document
```

### Service Map

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| CRM (Next.js) | 3000 | Main application | Running |
| Sites Admin (Next.js) | 3001 | Website admin panel | Running |
| Agent Service (Express) | 8768 | AI website generation | Running |
| Content Generator (Express) | 8769 | Claude AI + Kling AI media | Created, not wired |
| Forms Server (Python) | 8767 | BCREA form PDF filling | External |

### Data Flow

```
Browser (Realtor)
    |
    v
Next.js App Router (port 3000)
    |
    +----> Server Actions (mutations) ----> Supabase (PostgreSQL)
    |
    +----> API Routes (GET + webhooks)
    |          |
    |          +----> Twilio (SMS/WhatsApp)
    |          +----> Google Calendar API
    |          +----> Resend (Email)
    |          +----> Content Generator (port 8769)
    |                     |
    |                     +----> Claude AI (Anthropic)
    |                     +----> Kling AI (Video/Image)
    |
    +----> Agent Service (port 8768)
               |
               +----> Claude AI (web search + config generation)
               +----> Playwright (screenshots)
               +----> Supabase (variant storage)
```

---

## 3. Module 1: Core CRM

### 3.1 Contacts

**Purpose:** Manage buyers, sellers, partners, and their relationships.

**Pages:**
- `/contacts` — Contact list (redirects to latest)
- `/contacts/[id]` — Contact detail with tabbed interface

**Data Model:** `contacts` table — 30+ fields including demographics, preferences, intelligence

**Contact Types:** buyer, seller, partner, other

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| Contact CRUD | Built | Create, read, update contacts |
| Buyer preferences | Built | Price range, areas, property types, timeline, must-haves |
| Seller preferences | Built | Motivation, desired price, occupancy, list date |
| Demographics | Built | Birthday, occupation, income, languages, hobbies, family size |
| Family members | Built | Spouse, children, parents (JSONB array) |
| Households | Built | Group contacts into households |
| Relationship graph | Built | Visual network (spouse, referral, colleague, etc.) |
| Communication timeline | Built | All SMS/email/WhatsApp in/out |
| Activity timeline | Built | Showings, tasks, workflow events |
| Tags | Built | VIP, hot lead, first-time buyer, investor, etc. |
| Lead status pipeline | Built | new -> contacted -> qualified -> active -> closed |
| Stage bar | Built | Visual stage progression per type |
| Partner profiles | Built | Mortgage brokers, lawyers, inspectors with company/terms |
| Referral tracking | Built | Track referrals + commission |
| Important dates | Built | Birthdays, anniversaries with recurring flag |
| Documents | Built | Upload/track contact documents |
| Newsletter intelligence | Built | Engagement score, click history, inferred interests |
| Properties of interest | Built | Saved listings contact is viewing |
| Network stats | Built | Referral count, GCI, data quality score |
| Quick actions | Built | One-click SMS, email, call |
| Search/filter | Partial | No global search bar on contacts page |
| Contact deletion | Missing | No archive/delete functionality |
| Bulk operations | Missing | No bulk tag, assign, delete |

**Key Files:**
- `src/actions/contacts.ts` — CRUD + messaging + preferences
- `src/components/contacts/` — 25+ components
- `src/app/(dashboard)/contacts/[id]/page.tsx` — Detail page

---

### 3.2 Listings

**Purpose:** Manage property listings through 8-phase workflow.

**Pages:**
- `/listings` — Listing list (redirects to latest)
- `/listings/[id]` — Listing detail with workflow stepper

**Data Model:** `listings` table + `listing_enrichment` + `listing_documents` + `seller_identities`

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| Listing CRUD | Built | Create, update listings with seller link |
| Property details | Built | Address, price, MLS#, lockbox code, showing window |
| Seller identity (FINTRAC) | Built | Name, DOB, citizenship, ID type/number/expiry |
| Multiple sellers | Built | Via seller_identities table |
| Status transitions | Built | active -> pending -> sold (with validation) |
| Hero image upload | Built | Primary marketing photo |
| Commission tracking | Built | Rate + amount fields |
| Buyer link | Built | Link buyer contact on sale |
| Sold price + closing date | Built | Post-sale data |
| Data enrichment | Built | BC Geocoder, ParcelMap, LTSA, Assessment, Strata |
| Document tracking | Built | 6 doc types with file upload |
| 8-phase workflow | Built | See Module 2 |
| MLS submission | Stub | Manual only, no Paragon API |

**Key Files:**
- `src/actions/listings.ts` — CRUD + status + enrichment
- `src/components/listings/` — 10+ components
- `src/app/(dashboard)/listings/[id]/page.tsx` — Detail page

---

### 3.3 Tasks

**Purpose:** Agent task management with kanban pipeline.

**Pages:**
- `/tasks` — Kanban board (pending -> in_progress -> completed)

**Data Model:** `tasks` table

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| Task CRUD | Built | Create, edit, complete tasks |
| Priority levels | Built | Low, medium, high, urgent |
| Categories | Built | Follow-up, showing, document, listing, marketing, etc. |
| Due dates | Built | Date-based scheduling |
| Contact/listing link | Built | Relate task to contact or listing |
| Kanban view | Built | Drag-and-drop pipeline columns |
| Overdue alerts | Partial | Visual indicator but no notification |

**Key Files:**
- `src/app/(dashboard)/tasks/page.tsx`
- `src/components/tasks/` — TaskForm, TaskCard, TaskPipeline

---

### 3.4 Calendar

**Purpose:** Google Calendar integration for agent availability and showing scheduling.

**Pages:**
- `/calendar` — Calendar grid with events

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| Google Calendar sync | Built | Import agent's calendar events |
| Showing events | Built | Display confirmed showings on calendar |
| Busy slot detection | Built | Check availability before booking |
| Event creation | Built | Auto-create calendar event on showing confirmation |
| Token refresh | Built | OAuth token refresh via google_tokens table |

**Key Files:**
- `src/actions/calendar.ts` — Google Calendar API wrapper
- `src/lib/google-calendar.ts` — API client
- `src/components/calendar/` — CRMCalendar, CalendarSidebar

---

### 3.5 Inbox

**Purpose:** Unified message timeline across all channels.

**Pages:**
- `/inbox` — All communications in one view

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| Unified timeline | Built | SMS, email, WhatsApp, notes in chronological order |
| Channel filtering | Missing | No filter by channel type |
| Conversation threading | Missing | Flat timeline, no threads |
| Reply from inbox | Missing | Must navigate to contact to reply |

---

### 3.6 Search & Import

**Pages:**
- `/search` — Property search interface
- `/import` — Excel listing import

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| Property search | Built | Search listings by criteria |
| Excel import | Built | Parse Excel file, upsert listings |

---

### 3.7 Dashboard

**Page:** `/` (root)

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| Quick stats | Built | Active listings, open tasks, pending showings, missing docs |
| Pipeline snapshot | Built | Visual sales pipeline by stage with GCI calculation |
| Feature tiles | Built | 12+ quick-action cards linking to CRM sections |
| AI recommendations | Planned | Next-best-action dashboard card (Deliverable C) |

---

## 4. Module 2: Listing Workflow (8 Phases)

**Purpose:** Structured 8-phase process from seller intake to MLS submission.

**Stored as:** `listings.current_phase` (integer 1-8)

| Phase | Name | Status | Key Features |
|-------|------|--------|-------------|
| 1 | Seller Intake | Built | FINTRAC identity, property details, commissions, showing instructions |
| 2 | Data Enrichment | Built (90%) | BC Geocoder API, ParcelMap BC API, LTSA manual, BC Assessment manual |
| 3 | CMA Analysis | Built | Comparable market analysis fields |
| 4 | Pricing & Review | Built | List price confirmation, price lock, marketing tier |
| 5 | Form Generation | Built (85%) | 12 BCREA forms auto-filled via Python Realtors360 server |
| 6 | E-Signature | Partial (40%) | DocuSign UI exists, API integration not confirmed live |
| 7 | MLS Preparation | Built | Claude AI remarks, photo management |
| 8 | MLS Submission | Stub (10%) | Manual step only, no Paragon API |

**Phase advancement:** Sequential with audit trail logging via `activity_log`.

**Key Files:**
- `src/actions/workflow.ts` — Phase advancement logic
- `src/components/workflow/` — WorkflowStepper, PhaseCard, Phase1-8 components
- `src/lib/workflow-triggers.ts` — Lifecycle milestone advancement

---

## 5. Module 3: Showing Management

**Purpose:** End-to-end showing request workflow with Twilio SMS/WhatsApp.

**Pages:**
- `/showings` — Showing list
- `/showings/[id]` — Showing detail with status workflow

**Workflow:**
```
Buyer agent calls/texts -> Agent creates showing request
    -> SMS/WhatsApp sent to seller (Twilio)
    -> Seller replies YES/NO (webhook)
    -> YES: Calendar event created, lockbox code sent
    -> NO: Denial notification sent
```

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| Showing request form | Built | Date, time, buyer agent details, instructions |
| SMS notification to seller | Built | Twilio sends formatted request |
| WhatsApp notification | Built | WhatsApp business channel |
| YES/NO webhook processing | Built | Inbound SMS parsed for confirmation |
| Lockbox code delivery | Built | Auto-sent on confirmation |
| Calendar event creation | Built | Google Calendar event on confirmation |
| Showing status workflow | Built | requested -> confirmed -> denied -> cancelled |
| Communication logging | Built | All messages logged to communications table |
| Workflow trigger | Built | `showing_completed` fires for post-showing automation |
| Buyer agent as contact | Missing | Stored as flat text, not linked contact record |
| Showing feedback | Partial | Field exists but no structured feedback form |

**Key Files:**
- `src/actions/showings.ts` — CRUD + status + Twilio messaging
- `src/lib/twilio.ts` — SMS/WhatsApp wrapper
- `src/app/api/webhooks/twilio/route.ts` — Inbound webhook handler

---

## 6. Module 4: AI Content Engine

**Purpose:** Generate marketing content for listings using Claude AI and Kling AI.

**Pages:**
- `/content` — Content engine listing with stats
- `/content/[id]` — 3-step stepper: Prompts -> Generate -> Gallery

**3-Step Pipeline:**

### Step 1: Prompt Generation (Claude AI)
- Input: Listing address, price, notes
- Output: Video prompt, image prompt, Instagram caption, MLS public remarks, MLS REALTOR remarks
- All editable inline before media generation

### Step 2: Media Generation (Kling AI)
- **Video:** Hero image -> 4K video (9:16 for Reels/TikTok), 5 seconds, professional mode
- **Image:** Text prompt -> 8K image (1:1 for Instagram feed)
- Async polling every 5 seconds via useKlingTask hook

### Step 3: Gallery
- Grid display of completed assets with download links
- Processing/failed states with retry option

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| Claude prompt generation | Built | 5 content types in one API call |
| MLS remarks (500 char max) | Built | Public + REALTOR remarks |
| Kling video generation | Built | Image-to-video (9:16, 4K) |
| Kling image generation | Built | Text-to-image (1:1, 8K) |
| Inline prompt editing | Built | Edit any prompt before generation |
| Task status polling | Built | 5-second interval client-side polling |
| Gallery with downloads | Built | Completed assets grid |
| Generate All button | Planned | One-click video + image in parallel |
| Rich listing context for Claude | Planned | Feed bedrooms, enrichment data, not just address |
| Server-side polling | Planned | Background polling without browser tab |

**Key Files:**
- `src/actions/content.ts` — Server actions (proxy to content-generator)
- `src/components/content/` — ContentStepper, PromptsStep, GenerateStep, GalleryStep
- `realestate-crm/content-generator/` — Standalone Express service

---

## 7. Module 5: BCREA Forms Engine

**Purpose:** Auto-fill and manage 12 BC real estate forms.

**Pages:**
- `/forms` — Form list and status tracker
- `/forms/templates` — Form template management
- `/forms/[listingId]/[formKey]` — Form editor with PDF rendering

**12 BCREA Forms:**
DORTS, MLC, PDS, FINTRAC, PRIVACY, C3, DRUP, MLS_INPUT, MKTAUTH, AGENCY, C3CONF, FAIRHSG

**Architecture:**
```
CRM (listing data) -> CDM Mapper -> Python Realtors360 Server (port 8767)
                                         |
                                    POST /api/form/html
                                         |
                                    Pre-filled HTML form
```

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| CDM data model | Built | Listing -> Common Data Model mapping |
| 12 form templates | Built | PDF template registry in form_templates table |
| Auto-fill from listing | Built | CDM payload sent to Python server |
| Form status tracking | Built | forms_status JSONB on listings |
| Field mapping editor | Built | Map CDM fields to form PDF fields |
| Template sync | Built | Sync templates from Python server |
| PDF rendering | Built | In-browser PDF viewer with field highlighting |
| Form submission | Built | Save completed form to form_submissions |
| E-signature integration | Partial | DocuSign envelopes JSONB, UI exists, API unclear |

**Key Files:**
- `src/lib/cdm-mapper.ts` — Listing -> CDM conversion
- `src/lib/forms/` — constants, field-mapping, pdf-service, template-sync
- `src/app/api/forms/` — 6 API routes

---

## 8. Module 6: Newsletter & Email Marketing

**Purpose:** AI-powered lifecycle email marketing with engagement tracking.

**Pages:**
- `/newsletters` — Dashboard (pipeline, brand reach, actions)
- `/newsletters/queue` — AI draft approval queue
- `/newsletters/analytics` — Performance + attribution
- `/newsletters/guide` — Onboarding walkthrough

**6 Email Types:**

| Type | Trigger | Content |
|------|---------|---------|
| New Listing Alert | Listing matches buyer prefs | Property details, photos, CTA |
| Market Update | Monthly schedule | Area stats, trends, recent sales |
| Just Sold | Listing status -> sold | Sale price, DOM |
| Open House Invite | Showing created | Date, time, RSVP |
| Neighbourhood Guide | New lead enters CRM | Local spots, schools, lifestyle |
| Home Anniversary | Annual close anniversary | Current value, tips |

**Contact Journeys (Lifecycle):**
```
Buyer: Lead -> Active -> Under Contract -> Past Client -> Dormant
Seller: Lead -> Active Listing -> Under Contract -> Past Client -> Dormant
```

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| 7 React Email templates | Built | BaseLayout + 6 types |
| Claude AI content generation | Built | Per-contact personalized content |
| Resend API integration | Built | Send + delivery tracking |
| Open/click/bounce webhooks | Built | Full event tracking in newsletter_events |
| Contact intelligence | Built | Engagement score, click history, interests |
| Hot lead alerts | Built | High-intent click detection |
| Approval queue | Built | Draft review before send |
| Journey enrollment | Built | contact_journeys table |
| Frequency cap | Built | Max 2 emails/contact/24h, dedup by type/phase |
| Unsubscribe handling | Built | Newsletter_unsubscribed flag |
| Visual email builder | Planned | EmailBuilder.js drag-and-drop (Phase 2) |
| Visual workflow builder | Planned | React Flow canvas (Phase 3) |
| Contact segments | Planned | Rule-based segment builder (Phase 4) |
| A/B testing | Planned | Variant testing on email steps (Phase 4) |

**Key Files:**
- `src/actions/newsletters.ts` — CRUD + AI generation + send
- `src/actions/journeys.ts` — Journey enrollment + phase advancement
- `src/lib/resend.ts` — Resend API wrapper
- `src/lib/newsletter-ai.ts` — Claude content generation
- `src/emails/` — 7 React Email templates
- `src/app/api/webhooks/resend/route.ts` — Webhook handler

**Planned enhancements:** See `PLAN_Email_Marketing_Engine.md` (12 deliverables, 20 dev-days)

---

## 9. Module 7: Workflow Automation Engine

**Purpose:** Trigger-based drip campaigns with multi-channel messaging.

**Pages:**
- `/automations` — Workflow dashboard
- `/automations/workflows/[id]` — Workflow detail/editor
- `/automations/templates` — Template library
- `/automations/notifications` — Notification settings

**9 Pre-Built Workflows (103 total steps):**

| # | Workflow | Trigger | Steps | Channels |
|---|---------|---------|-------|----------|
| 1 | Speed-to-Contact | new_lead | 12 | SMS, Email, Task, Alert |
| 2 | Buyer Nurture | lead_status -> qualified | 18 | SMS, Email, Task |
| 3 | Post-Close Buyer | listing_status -> sold | 15 | SMS, Email, Task |
| 4 | Post-Close Seller | listing_status -> sold | 14 | SMS, Email, Task |
| 5 | Lead Reengagement | inactivity (60d) | 8 | SMS, Email |
| 6 | Open House Followup | showing_completed | 10 | SMS, Email, Task |
| 7 | Referral Partner | tag_added (partner) | 12 | Email, Task |
| 8 | Buyer Lifecycle | milestone-based | 7 | AI Email |
| 9 | Seller Lifecycle | milestone-based | 7 | AI Email |

**Step Types:**

| Type | Description |
|------|-------------|
| `auto_email` | Send pre-written template email |
| `auto_sms` | Send SMS via Twilio |
| `auto_whatsapp` | Send WhatsApp via Twilio |
| `manual_task` | Create agent task |
| `auto_alert` | Send in-app notification |
| `system_action` | Change stage, add tag, etc. |
| `wait` | Delay execution |
| `condition` | Branch based on field value |
| `milestone` | Lifecycle milestone check |
| `ai_email` | AI-generated newsletter (planned) |

**Trigger Types:**
new_lead, lead_status_change, listing_status_change, showing_completed, tag_added, inactivity, manual

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| 9 pre-built workflows | Built | Seeded in database |
| Trigger-based enrollment | Built | Auto-enroll on CRM events |
| Multi-channel execution | Built | SMS, Email, WhatsApp, Tasks, Alerts |
| Step delay scheduling | Built | Minutes, hours, days delays |
| Condition branching | Built | Field-based yes/no branches |
| Lifecycle milestones | Built | Auto-advance contact lifecycle |
| Pause/resume enrollment | Built | Per-contact control |
| Exit on reply | Built | Stop workflow when contact responds |
| Agent notifications | Built | In-app alerts for workflow events |
| Message templates | Built | Pre-written templates with {{variables}} |
| AI message generation | Built | Claude generates step messages |
| Cron processor | Built | `/api/cron/process-workflows` |
| Visual workflow builder | Planned | React Flow canvas (Phase 3) |

**Key Files:**
- `src/lib/workflow-engine.ts` — Step execution engine
- `src/lib/workflow-triggers.ts` — Trigger matching + lifecycle advancement
- `src/lib/constants/workflows.ts` — 7 workflow definitions
- `src/lib/constants/journey-workflows.ts` — 2 lifecycle workflow definitions
- `src/actions/workflows.ts` — Enrollment + management

**Planned enhancements:** See `PLAN_Email_Marketing_Engine.md` (Phase 1: unify engines, Phase 3: visual builder)

---

## 10. Module 8: AI Agent Layer

**Purpose:** Claude-powered decision layer that makes the workflow engine adaptive.

**Status:** Planned (not built) — see `PLAN_AI_Agent.md` and `SPEC_AI_Agent_Email_Marketing.md`

**3 Deliverables:**

### Deliverable A: Lead Scoring Engine (3 days)
- Batch-score contacts every 15 minutes via cron
- 4-dimensional scoring: buying_readiness, timeline_urgency, budget_fit, intent
- Auto stage advancement recommendations
- Content personalization hints for newsletter AI
- Store in `contacts.ai_lead_score` JSONB

### Deliverable B: Send/Skip/Swap Advisor (2 days)
- Pre-execution hook in workflow engine
- Claude evaluates: send this email, skip it, or swap for something better
- Feature flag: `AI_SEND_ADVISOR=true/false`
- Audit trail in `workflow_step_logs.ai_decision`
- All AI-advised emails default to review queue (no auto-send)

### Deliverable C: Next Best Action Dashboard (2 days)
- Hourly cron generates 3-5 recommendations
- Action types: call, send_email, advance_stage, enroll_workflow, re-engage
- Dashboard card with [Accept] [Dismiss] buttons
- Store in `agent_recommendations` table

**Cost:** ~$2.70/day ($81/month) at 200 contacts with Claude Sonnet

**Key principle:** Agent recommends, human decides. No autonomous actions.

---

## 11. Module 9: Website Marketing Platform

**Purpose:** AI-generated realtor websites with one-click generation.

**Two services:**
- `realtors360-sites` (Next.js admin panel, port 3001)
- `realtors360-agent` (Express AI agent, port 8768)

### Admin Panel Pages

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Dashboard (stats, quick actions, leads) | Built |
| `/setup` | Generate website wizard (4-view flow) | Built |
| `/design` | Template + color customization | Built |
| `/listings` | Synced listings from CRM | Built |
| `/testimonials` | Client review management | Built |
| `/leads` | Website form submission tracking | Built |
| `/settings` | Agent profile, social links, SEO | Built |

### Public Site Pages (Multi-tenant)

| Route | Purpose | Status |
|-------|---------|--------|
| `/site` | Homepage (hero, listings, testimonials) | Built |
| `/site/about` | Bio, credentials, service areas | Built |
| `/site/listings` | Property grid | Built |
| `/site/listings/[id]` | Property detail + inquiry | Built |
| `/site/contact` | Contact form | Built |

### AI Generation Pipeline

```
1. Realtor clicks "Generate My Website"
2. Agent searches for top realtor sites in their market (Claude web_search)
3. Agent scrapes 3-5 reference sites for design patterns
4. Claude generates 3 site config JSONs (dark luxury, light modern, bold warm)
5. HTML rendered from configs using inline-style templates
6. Playwright screenshots at desktop + mobile (in-memory, no server)
7. Config + HTML + screenshots stored in Supabase (site_variants)
8. Realtor picks favorite -> marked as selected
```

**3 Style Presets:**

| Style | Colors | Fonts |
|-------|--------|-------|
| Dark Luxury | Black bg, gold accent | Playfair Display + Inter |
| Light Modern | White bg, navy accent | DM Sans |
| Bold & Warm | Cream bg, terracotta accent | Bricolage Grotesque + Inter |

**Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| One-click generation | Built | Autonomous AI pipeline |
| 3 variant preview | Built | Screenshots in variant picker |
| Reference site research | Built | Claude web_search + scrape |
| HTML rendering (9 sections) | Built | Nav, Hero, About, Stats, Listings, Testimonials, CTA, Contact, Footer |
| In-memory screenshots | Built | Playwright page.setContent() |
| Variant approval | Built | Save selected variant |
| Custom reference URL | Built | User provides favorite site for inspiration |
| Design prompt | Built | User describes design preferences |
| Lead capture | Built | Contact form -> site_leads + contacts |
| Multi-tenant routing | Built | Subdomain + custom domain middleware |
| Cloudflare deployment | Not configured | LOCAL_PREVIEW=true, no CF API token |
| Blog/custom pages | Schema only | site_pages table exists, no UI |
| Analytics | Schema only | site_analytics_events table exists, no UI |

**Key Files:**
- `realtors360-agent/src/agent.ts` — Generation pipeline orchestrator
- `realtors360-agent/src/tools/` — 7 tools (scrape, crm-data, config, render, screenshot, deploy, local-preview)
- `realtors360-sites/src/app/(admin)/setup/page.tsx` — Generation wizard
- `realtors360-sites/src/components/wizard/` — 4 wizard components

---

## 12. Module 10: Content Generator Service

**Purpose:** Standalone Express microservice for Claude AI + Kling AI content generation.

**Port:** 8769

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/prompts/generate` | Generate prompts + MLS remarks via Claude |
| PATCH | `/api/prompts/:id` | Update individual prompt fields |
| POST | `/api/mls-remarks` | Standalone MLS remarks generation |
| POST | `/api/media/generate` | Start Kling AI video/image generation |
| GET | `/api/media/status` | Poll Kling task status |
| PATCH | `/api/media/:id/status` | Update media asset status |
| PATCH | `/api/listings/:id/hero-image` | Update hero image URL |
| GET | `/health` | Health check |

**Tools:**
- `tools/creative-director.ts` — Claude AI: `generateContentPrompts()`, `generateMLSRemarks()`
- `tools/kling.ts` — Kling AI: `startVideoGeneration()`, `startImageGeneration()`, `getTaskStatus()`

**Status:** Files created, dependencies not installed, CRM not yet wired to call this service.

---

## 13. Database Schema

**29 tables** across 19 migrations. See complete schema in `SPEC_AI_Agent_Email_Marketing.md` Appendix.

### Core Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `contacts` | CRM hub — buyers, sellers, partners | Referenced by most tables |
| `listings` | Property listings | seller_id -> contacts, buyer_id -> contacts |
| `appointments` | Showings | listing_id -> listings |
| `communications` | Message log | contact_id -> contacts |
| `tasks` | Agent tasks | contact_id, listing_id |

### Workflow & Automation Tables

| Table | Purpose |
|-------|---------|
| `workflows` | 9 automation definitions |
| `workflow_steps` | 103 individual steps |
| `workflow_enrollments` | Contact progress tracking |
| `workflow_step_logs` | Execution audit trail |
| `message_templates` | Pre-written message templates |
| `agent_notifications` | In-app alerts |
| `activity_log` | Unified activity tracking |

### Newsletter Tables

| Table | Purpose |
|-------|---------|
| `newsletters` | Email drafts and sends |
| `newsletter_templates` | 9 React Email template definitions |
| `newsletter_events` | Open/click/bounce tracking |
| `contact_journeys` | Lifecycle phase tracking |

### Content & Documents Tables

| Table | Purpose |
|-------|---------|
| `prompts` | AI-generated content (1:1 with listings) |
| `media_assets` | Kling AI generated videos/images |
| `listing_documents` | Transaction documents |
| `seller_identities` | FINTRAC compliance |
| `listing_enrichment` | Property data enrichment |
| `form_templates` | PDF form registry |
| `form_submissions` | Completed forms |

### Relationship Tables

| Table | Purpose |
|-------|---------|
| `households` | Contact grouping |
| `contact_relationships` | Contact graph (spouse, referral, etc.) |
| `referrals` | Referral pipeline tracking |
| `contact_dates` | Important dates (birthday, anniversary) |
| `contact_documents` | Contact file storage |

### Website Tables

| Table | Purpose |
|-------|---------|
| `realtor_sites` | Agent profiles + site config |
| `site_generations` | Generation run tracking |
| `site_variants` | 3 variants per generation (config + HTML + screenshots) |
| `testimonials` | Client reviews |
| `site_leads` | Contact form submissions |
| `site_pages` | Custom pages (schema only) |
| `site_media` | Gallery files |

### AI Agent Tables

| Table | Purpose |
|-------|---------|
| `agent_recommendations` | AI-generated action suggestions |
| `users` | Admin/realtor accounts with feature flags |

---

## 14. External Integrations

| Integration | Purpose | Auth | Status |
|-------------|---------|------|--------|
| **Supabase** | PostgreSQL + RLS + Storage | Service role key | Active |
| **NextAuth v5** | Authentication (demo + Google OAuth) | JWT sessions | Active |
| **Twilio** | SMS + WhatsApp messaging | Account SID + Auth Token | Active |
| **Google Calendar** | Agent calendar + showing events | OAuth2 (google_tokens table) | Active |
| **Gmail** | 1:1 email sending | OAuth2 | Active |
| **Anthropic Claude** | AI content generation, lead scoring, recommendations | API key | Active |
| **Kling AI** | Video (image-to-video) + Image (text-to-image) generation | Access Key + Secret Key (JWT) | Active |
| **Resend** | Newsletter email delivery + tracking | API key + webhook secret | Active |
| **Realtors360 Python** | BCREA form PDF auto-fill | Local HTTP (port 8767) | External |
| **Cloudflare Pages** | Static site deployment | API token + account ID | Not configured |
| **Playwright** | Browser screenshots for site previews | Chromium binary | Active |
| **Bright Data** | Web scraping for reference site research | Via Anthropic web_search | Active |

---

## 15. Design System

### Realtors360 Design Language

**Philosophy:** Glassmorphism with gradient accents. Emoji icons throughout UI.

**CSS Variables (globals.css):**
```css
--lf-bg: #f4f2ff           /* Light purple background */
--lf-indigo: #4f35d2        /* Primary brand */
--lf-coral: #ff5c3a         /* Accent / CTA */
--lf-teal: #00bfa5          /* Success */
--lf-emerald: #059669       /* Positive states */
--lf-text: #1a1535          /* Primary text */
--lf-r: 13px                /* Border radius */
--lf-font-heading: 'Bricolage Grotesque'
--lf-font-body: 'Bricolage Grotesque'
```

**Component Classes:**
- `.lf-card` — Glass card (backdrop-blur, white 85% opacity)
- `.lf-glass` — Glass panel (header/nav)
- `.lf-btn` / `.lf-btn-ghost` / `.lf-btn-sm` — Button variants
- `.lf-badge` — Status badges (done, active, pending, blocked, info)
- `.lf-input` / `.lf-select` / `.lf-textarea` — Form elements

**Layout:**
- Fixed glass header: 60px
- Horizontal pill navigation: 40px
- Content area: margin-top 100px, padding 18px
- Animated gradient background canvas

**Conventions:**
- Emoji icons on all pages (no Lucide on pages, only in some components)
- Gradient avatars: seller = indigo-to-coral, buyer = indigo-to-purple
- Status colors: green = done, amber = pending, red = blocked

---

## 16. Build Status & Gaps

### Overall Coverage: ~40%

| Area | Coverage | Details |
|------|----------|---------|
| **Listing Workflow (Phase 1-8)** | 52% | Strong on intake, enrichment, forms. Weak on e-signature, MLS submission |
| **Showing Management** | 90% | Complete Twilio workflow, calendar integration |
| **Contact Management** | 75% | Rich data model, missing search/bulk ops |
| **AI Content Engine** | 85% | Claude + Kling working, needs richer context |
| **Forms Engine** | 85% | 12 forms, CDM mapper, Python server |
| **Newsletter/Email** | 70% | AI generation, Resend, webhooks built. Missing visual builders |
| **Workflow Automation** | 80% | 9 workflows, triggers, cron. Missing visual editor |
| **Website Marketing** | 60% | Generation works E2E. Missing Cloudflare deploy, blog, analytics |
| **AI Agent** | 0% | Fully specced but not implemented |
| **Offer Management** | 0% | Not started |
| **Contract-to-Close** | 0% | Not started |
| **Post-Closing** | 10% | Only commission fields exist |

### Priority Gaps

| Gap | Impact | Effort | Documents |
|-----|--------|--------|-----------|
| Email engine unification | High | 5 days | PLAN_Email_Marketing_Engine.md (Phase 1) |
| AI Agent (lead scoring + recommendations) | High | 7 days | PLAN_AI_Agent.md, SPEC_AI_Agent_Email_Marketing.md |
| Visual email builder | Medium | 3 days | PLAN_Email_Marketing_Engine.md (Phase 2) |
| Visual workflow builder | Medium | 6 days | PLAN_Email_Marketing_Engine.md (Phase 3) |
| Content generator wiring | Low | 2 days | Content-generator service exists, CRM not calling it |
| Cloudflare deployment | Low | 1 day | realtors360-agent deploy.ts exists |
| Offer management | Critical (future) | 10+ days | Realtors360_Gap_Analysis_Report.md |
| Contract-to-close | Critical (future) | 10+ days | Realtors360_Gap_Analysis_Report.md |

---

## 17. File Inventory

### CRM Application (realestate-crm/src/)

**Pages:** 30+ routes
**API Routes:** 26 endpoints
**Server Actions:** 13 files, 80+ functions
**Components:** 90+ components across 12 directories
**Hooks:** 4 custom hooks
**Lib Modules:** 35+ modules
**Email Templates:** 7 React Email components
**Types:** 2 definition files
**Migrations:** 19 SQL files

### Website Platform (realtors360-sites/src/)

**Pages:** 12 routes (7 admin + 5 public)
**API Routes:** 6 endpoints
**Server Actions:** 3 files
**Components:** 23 components
**Lib Modules:** 6 modules
**Middleware:** 1 (multi-tenant routing)

### Agent Service (realtors360-agent/src/)

**Endpoints:** 5 (generate, poll, approve, preview, health)
**Tools:** 7 modules
**Types:** 1 file

### Content Generator (content-generator/src/)

**Endpoints:** 8
**Tools:** 2 modules (creative-director, kling)

### Plan Documents (project root)

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Project documentation + coding conventions |
| `PLAN_Email_Marketing_Engine.md` | 12 deliverables, 4 phases, 20 dev-days |
| `PLAN_AI_Agent.md` | 3 deliverables, 7 dev-days |
| `SPEC_AI_Agent_Email_Marketing.md` | Full technical spec (types, prompts, API, testing) |
| `SPEC_Realtors360_CRM.md` | This document |
| `Realtors360_Gap_Analysis_Report.md` | 12-phase gap analysis |
| `PRD_Newsletter_Journey_Engine.md` | Newsletter PRD |

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_URL, NEXTAUTH_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_WHATSAPP_NUMBER
ANTHROPIC_API_KEY
KLING_API_BASE_URL, KLING_IMAGE_API_BASE_URL
RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_WEBHOOK_SECRET
REALTORS360_URL (Python server, default localhost:8767)
NEXT_PUBLIC_APP_URL
DEMO_EMAIL, DEMO_PASSWORD
CRON_SECRET
AI_SEND_ADVISOR (feature flag)
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
AGENT_SERVICE_URL (default localhost:8768)
```
