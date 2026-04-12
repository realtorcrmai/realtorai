<!-- docs-audit: listingflow-sites/**, listingflow-agent/* -->
# Realtors360 Website Platform — Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2026-03-14
**Author:** Realtors360 Team
**Status:** Draft — Architecture & UX Finalization

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Market Analysis](#2-market-analysis)
3. [Product Vision & Positioning](#3-product-vision--positioning)
4. [User Personas](#4-user-personas)
5. [User Experience — Realtor (Builder)](#5-user-experience--realtor-builder)
6. [User Experience — Consumer (Visitor)](#6-user-experience--consumer-visitor)
7. [Feature Specifications](#7-feature-specifications)
8. [Architecture Design](#8-architecture-design)
9. [CRM Integration](#9-crm-integration)
10. [Template System](#10-template-system)
11. [Hosting & Deployment](#11-hosting--deployment)
12. [Domain & SSL Management](#12-domain--ssl-management)
13. [Media & Asset Pipeline](#13-media--asset-pipeline)
14. [AI Features](#14-ai-features)
15. [Analytics & Lead Tracking](#15-analytics--lead-tracking)
16. [Compliance & Legal](#16-compliance--legal)
17. [Monetization & Pricing](#17-monetization--pricing)
18. [Competitive Differentiation](#18-competitive-differentiation)
19. [Implementation Phases](#19-implementation-phases)
20. [Success Metrics](#20-success-metrics)
21. [Open Questions](#21-open-questions)

---

## 1. Executive Summary

### What We're Building

**Realtors360 Sites** — a website generation platform integrated into the Realtors360 CRM that enables BC realtors to launch professional, modern real estate websites in minutes. Realtors upload photos, videos, testimonials, and connect their listings — the platform generates a fully branded website and auto-deploys it to a custom domain.

### Why This Matters

- **72% of real estate firms plan to increase AI investment by 2026** (Deloitte)
- **96% of home buyers search online; 72% use mobile devices** (NAR)
- Existing platforms are either too expensive ($500+/month for Luxury Presence, CINC) or too basic (Placester, WordPress templates)
- **No platform combines CRM + website + AI content + transaction management** in one product
- **Canadian/BC-specific platforms are virtually non-existent** — US-centric competitors don't handle BCREA forms, FINTRAC, or Canadian MLS

### Competitive Edge

Realtors360 already has the hardest pieces built: AI content engine (Claude + Kling), BCREA form generation, Twilio messaging, showing management, and an 8-phase transaction workflow. Adding a website platform creates a **complete end-to-end solution** that no competitor offers at our price point.

---

## 2. Market Analysis

### 2.1 Competitor Landscape

| Competitor | Price/mo | Website | CRM | AI Content | Transaction Mgmt | Canadian Focus |
|-----------|---------|---------|-----|-----------|-----------------|---------------|
| Luxury Presence | $500+ | Custom design | Basic | No | No | No |
| CINC | $899-1500 | Template | Advanced | Basic chatbot | No | No |
| Sierra Interactive | $300+ | Template | Advanced | No | No | No |
| BoldTrail/kvCORE | $299-1800 | Template | Advanced | Basic | Partial | Partial |
| Real Geeks | $300-500 | Template | Good | SEO blogging | No | No |
| AgentFire | $149-500 | WordPress | Basic | No | No | No |
| Placester | $59-84 | AI Builder | Basic | AI builder only | No | No |
| IDX Broker | $60-149 | Plugin | No | No | No | No |
| **Realtors360 Sites** | **$49-199** | **AI-generated** | **Built-in** | **Full (Claude+Kling)** | **8-phase workflow** | **Yes (BC)** |

### 2.2 Market Gaps We Exploit

1. **No affordable all-in-one for solo agents** — We offer CRM + website + AI from $49/mo
2. **No Canadian/BC platform** — BCREA forms, FINTRAC, CASL built in
3. **No integrated AI content engine** — Claude for copy + Kling for video/image generation
4. **No programmatic site generation** — API-driven deployment enables brokerage white-label
5. **WordPress fatigue** — Modern Next.js stack vs. legacy WordPress sites
6. **Seller-side tools absent** — Our 8-phase workflow is unmatched for listing management

### 2.3 Target Market

- **Primary:** Licensed BC realtors (14,000+ active BCFSA licensees)
- **Secondary:** BC brokerages wanting branded agent sub-sites
- **Tertiary:** Canadian realtors outside BC (expand after BC is proven)

---

## 3. Product Vision & Positioning

### 3.1 Vision Statement

> "The only platform a BC realtor needs — from seller intake to closing to their public website — powered by AI, built for compliance."

### 3.2 Product Positioning

**For:** Licensed BC real estate agents who want a professional web presence
**Who:** Need a modern website without hiring a web developer or paying $500+/month
**Realtors360 Sites:** Is a website generation platform built into the Realtors360 CRM
**That:** Automatically creates and updates beautiful, lead-generating websites from their CRM data
**Unlike:** Luxury Presence (too expensive), AgentFire (WordPress), Placester (too basic)
**Our Product:** Combines AI-powered content, transaction management, and website generation in one platform with BC regulatory compliance built in

---

## 4. User Personas

### 4.1 Realtor Persona — "Sarah the Solo Agent"

- **Role:** Licensed REALTOR with FVREB, 5 years experience
- **Pain:** Pays $300/mo for a basic website + $100/mo for CRM + manual listing updates
- **Goal:** One platform for everything — saves time, looks professional, generates leads
- **Tech comfort:** Uses iPhone, Instagram, basic computer skills — NOT a developer
- **Budget:** $100-200/mo total for all tech tools

### 4.2 Realtor Persona — "Mike the Team Lead"

- **Role:** Team lead, 4 agents, 60+ transactions/year
- **Pain:** Each agent has different tools, no unified brand, no central CRM
- **Goal:** Branded team website with individual agent pages, shared CRM
- **Budget:** $500-1000/mo for the team

### 4.3 Consumer Persona — "Emily the First-Time Buyer"

- **Age:** 32, mobile-first, searches homes on phone during commute
- **Expectations:** Fast loading, beautiful photos, easy search, virtual tours
- **Behavior:** Browses 10+ agent sites, judges quality in <5 seconds
- **Actions:** Saves favourites, books showings, requests info — wants instant responses

### 4.4 Consumer Persona — "David the Seller"

- **Age:** 55, selling family home, values professionalism and trust
- **Expectations:** Agent's website should look established, show sold history and testimonials
- **Behavior:** Researches 3-5 agents before calling, reads reviews, checks credentials
- **Actions:** Reads agent bio, views past sales, submits home evaluation request

---

## 5. User Experience — Realtor (Builder)

### 5.1 Onboarding Flow (First-Time Setup)

```
Step 1: Choose Template
  ├── Preview 3-5 template styles (Classic, Modern, Luxury, Minimal, Bold)
  ├── Each preview shows realistic agent data
  └── Select template → Continue

Step 2: Brand Setup
  ├── Upload headshot photo (AI auto-crop + enhance)
  ├── Upload logo (or brokerage logo)
  ├── Pick brand colors (color picker + AI suggestion from headshot)
  ├── Choose fonts (curated pairs: 3-5 options)
  └── Enter tagline / slogan

Step 3: Content Upload
  ├── About Me bio (text area OR AI-generate from bullet points)
  ├── Testimonials (paste text + client name, or import from Google Reviews)
  ├── Service areas / neighborhoods (dropdown + map selector)
  ├── Upload hero photos (up to 5 for homepage carousel)
  └── Upload additional photos/videos (gallery)

Step 4: Connect Data
  ├── Active listings auto-pulled from CRM (toggle which to show)
  ├── Sold listings / past sales (manual entry or import)
  ├── Contact info (phone, email — pulled from CRM profile)
  └── Social media links (Instagram, Facebook, LinkedIn, YouTube)

Step 5: Domain Setup
  ├── Option A: Free subdomain → agentname.realtors360.com
  ├── Option B: Custom domain → sarahsells.ca
  │   ├── Buy through Realtors360 (we register via API)
  │   └── OR connect existing domain (CNAME instructions provided)
  └── SSL auto-provisioned

Step 6: Review & Launch
  ├── Full preview (desktop + mobile)
  ├── AI review: checks for missing content, suggests improvements
  ├── One-click publish → site is live in <60 seconds
  └── Celebrate screen with share links (copy URL, share to social)
```

**Time to launch: < 15 minutes** (vs. days/weeks with competitors)

### 5.2 Ongoing Management

The website management lives in the **separate `realtors360-sites` app** (not inside the CRM). The CRM dashboard has a single "Website Marketing" card that links to it.

```
CRM Dashboard (realestate-crm, localhost:3000)
├── Listings (existing)
├── Contacts (existing)
├── Showings (existing)
├── Calendar (existing)
├── Content Engine (existing)
├── 🌐 Website Marketing (NEW — links to realtors360-sites app)
│   └── Opens → localhost:3001 (dev) / sites.realtors360.com (prod)

Website Platform Admin Panel (realtors360-sites, localhost:3001)
├── Dashboard — live site stats (visitors, leads, page views)
├── Design — change template, colors, fonts, layout
├── Pages — edit home, about, listings, contact, blog, custom pages
├── Listings — toggle which CRM listings appear on website
├── Testimonials — manage client testimonials with ratings
├── Media — upload/manage photos, videos
├── Blog — create/edit blog posts and market updates
├── Leads — incoming inquiries, showing requests, contact form submissions
├── Analytics — traffic stats, lead sources, popular listings
├── SEO — meta titles, descriptions, Open Graph images (AI-suggested)
├── Domain — custom domain setup + SSL status
└── Settings — social links, footer, legal disclaimers, analytics codes
```

### 5.3 Key Realtor Workflows

**Workflow: New Listing Goes Live**
1. Agent creates listing in CRM (Phase 1: Seller Intake)
2. AI generates MLS remarks, photos, video (Content Engine)
3. Agent toggles "Show on Website" → listing page auto-created
4. Website listing page includes: photos, video tour, AI description, map, showing request form
5. Showing requests from website flow into CRM → Twilio notification to seller
6. When listing sells → status auto-updates on website, moves to "Sold" section

**Workflow: Edit Website Content**
1. Agent clicks "Website" in CRM sidebar
2. Visual editor shows current page with inline editing
3. Click any text block → edit in place
4. Click any image → replace with upload or select from gallery
5. Changes save as draft → click "Publish" to push live
6. Version history allows rollback

**Workflow: View Leads**
1. Consumer submits contact form / showing request / home eval on website
2. Lead appears in CRM Contacts with source="website"
3. Automated response sent via preferred channel (SMS/email)
4. Agent sees lead in Website → Leads dashboard with contact info + pages viewed

---

## 6. User Experience — Consumer (Visitor)

### 6.1 Homepage

```
┌─────────────────────────────────────────────────────┐
│  HERO SECTION                                        │
│  ┌─────────────────────────────────────────────┐    │
│  │  Full-width hero image/video carousel        │    │
│  │  Agent name + tagline overlay                │    │
│  │  [Search Properties] [Book Consultation]     │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  FEATURED LISTINGS (auto from CRM)                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ Card │ │ Card │ │ Card │ │ Card │              │
│  │ Photo│ │ Photo│ │ Photo│ │ Photo│              │
│  │ Price│ │ Price│ │ Price│ │ Price│              │
│  │ Addr │ │ Addr │ │ Addr │ │ Addr │              │
│  └──────┘ └──────┘ └──────┘ └──────┘              │
│  [View All Listings →]                              │
│                                                      │
│  ABOUT THE AGENT                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Headshot  │  Bio text (AI-generated or custom)│   │
│  │  Photo     │  Credentials, years experience   │   │
│  │            │  [Read More →]                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  TESTIMONIALS (carousel)                             │
│  ┌──────────────────────────────────────────────┐   │
│  │  "Sarah was amazing..."  ★★★★★               │   │
│  │  — Emily & David, Langley                     │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  SERVICE AREAS (interactive map)                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Map with highlighted neighborhoods           │   │
│  │  [Surrey] [Langley] [White Rock] [Abbotsford]│   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  RECENTLY SOLD (social proof)                        │
│  ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │ Sold │ │ Sold │ │ Sold │                       │
│  │ Photo│ │ Photo│ │ Photo│                       │
│  │ $1.2M│ │ $890K│ │ $650K│                       │
│  └──────┘ └──────┘ └──────┘                       │
│                                                      │
│  HOME EVALUATION CTA                                 │
│  ┌──────────────────────────────────────────────┐   │
│  │  "What's Your Home Worth?"                    │   │
│  │  [Enter Address] [Get Free Evaluation →]      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  FOOTER                                              │
│  Agent info, brokerage, social links, legal          │
└─────────────────────────────────────────────────────┘
```

### 6.2 Property Listing Page

```
┌─────────────────────────────────────────────────────┐
│  PHOTO GALLERY                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Full-width photo slideshow (swipe on mobile) │    │
│  │  [Photo count: 24] [Virtual Tour] [Video]    │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  PROPERTY HEADER                                     │
│  123 Main Street, Surrey, BC V3T 1A1                │
│  $1,249,000  |  4 bed  |  3 bath  |  2,400 sqft    │
│  [Book Showing] [Save] [Share]                      │
│                                                      │
│  AI-GENERATED DESCRIPTION (from MLS public remarks)  │
│  "Welcome to this stunning family home..."           │
│                                                      │
│  PROPERTY DETAILS (grid)                             │
│  Property Type: Detached    Year Built: 2018        │
│  Lot Size: 6,200 sqft      Parking: 2-car garage   │
│  Strata Fee: N/A           Taxes: $4,200/yr         │
│                                                      │
│  AI VIDEO TOUR (from Kling AI)                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  ▶ Cinematic video walkthrough (9:16 or 16:9)│    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  NEIGHBOURHOOD INFO                                  │
│  Walk Score: 78  |  Transit: 65  |  Bike: 82       │
│  Schools nearby (list)                               │
│  Map with amenities                                  │
│                                                      │
│  SHOWING REQUEST FORM                                │
│  ┌─────────────────────────────────────────────┐    │
│  │  Name: [          ]                          │    │
│  │  Phone: [         ]   Email: [            ]  │    │
│  │  Preferred Date: [datepicker]                │    │
│  │  Message: [                               ]  │    │
│  │  [Request Showing →]                         │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  MORTGAGE CALCULATOR                                 │
│  Price: $1,249,000  Down: 20%  Rate: 4.5%          │
│  Monthly Payment: $5,432                             │
│                                                      │
│  SIMILAR LISTINGS                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │ Card │ │ Card │ │ Card │                       │
│  └──────┘ └──────┘ └──────┘                       │
└─────────────────────────────────────────────────────┘
```

### 6.3 Additional Consumer Pages

**About Page**
- Full bio with professional headshot
- Credentials, designations, years in business
- Brokerage affiliation
- Awards and achievements
- Video introduction (uploaded or Kling AI generated)
- Full testimonial list with star ratings

**Contact Page**
- Contact form (name, email, phone, message, inquiry type dropdown)
- Agent's direct phone + email (click-to-call on mobile)
- Office address with embedded Google Map
- Social media links
- Availability calendar (from Google Calendar integration)
- WhatsApp direct chat button

**Blog / Market Updates**
- AI-generated market reports (Claude)
- Neighbourhood guides with local data
- Home buying/selling tips
- Market statistics with charts
- Social sharing buttons

**Sold Portfolio**
- Grid of past sales with sold prices
- Before/after staging photos
- Client testimonials per transaction
- Total volume stats ("$25M+ in sales")
- Year-over-year performance chart

**Home Evaluation Landing Page**
- Address input with Google Places autocomplete
- Property details form (beds, baths, sqft, condition)
- AI-generated preliminary estimate (from BC Assessment data enrichment)
- Lead capture gate: "Enter email to see your estimate"
- Follow-up sequence triggered automatically

**Neighbourhood Guide Pages**
- One page per service area
- Local listings feed (auto-filtered from CRM)
- Schools, parks, transit, restaurants data
- Walk Score / Transit Score integration
- Average home prices + market trends
- Community photos and description

### 6.4 Mobile Experience

- **Mobile-first design** — 72% of real estate browsing is mobile
- **Sticky bottom nav** — [Search] [Saved] [Contact Agent]
- **Swipe galleries** — Photo browsing optimized for thumb
- **Click-to-call** — One tap to phone agent
- **Share to WhatsApp/iMessage** — Native share sheet for listings
- **Push notifications** — Price drops, new listings in saved searches (future PWA)
- **Page load < 2 seconds** — ISR + CDN ensures fast loads
- **Offline support** — PWA caches recently viewed listings

### 6.5 Lead Capture Touchpoints

Every consumer interaction is a lead capture opportunity:

| Touchpoint | Trigger | Data Captured | CRM Action |
|-----------|---------|--------------|-----------|
| Showing Request | Click "Book Showing" on listing | Name, phone, email, preferred date | Create contact + appointment in CRM |
| Contact Form | Submit contact page form | Name, email, phone, message | Create contact + communication log |
| Home Evaluation | Enter address for estimate | Address, email, phone, property details | Create contact + listing lead |
| Newsletter Signup | Footer or popup | Email | Create contact, tag as subscriber |
| Save Listing | Click heart/save on listing | Requires email registration | Create contact, track saved listings |
| Chat Widget | Click chat bubble | Name, phone/email, message | Create contact + communication |
| Property Alert | "Notify me of similar listings" | Email, search criteria | Create contact, set up alerts |

---

## 7. Feature Specifications

### 7.1 Core Features (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| Template Selection | 3-5 pre-built templates (Classic, Modern, Luxury, Minimal, Bold) | P0 |
| Brand Customization | Colors, fonts, logo, headshot, tagline | P0 |
| Listing Sync | Auto-pull active listings from CRM to website | P0 |
| Contact Form | Lead capture with CRM integration | P0 |
| Showing Request | Online showing booking → CRM + Twilio | P0 |
| About Page | Bio, credentials, headshot | P0 |
| Photo Gallery | Per-listing photo carousel | P0 |
| Mobile Responsive | All pages optimized for mobile | P0 |
| Custom Domain | Subdomain (free) + custom domain support | P0 |
| Auto SSL | Automatic HTTPS for all sites | P0 |
| SEO Basics | Meta tags, Open Graph, sitemap, schema markup | P0 |

### 7.2 Enhanced Features (V2)

| Feature | Description | Priority |
|---------|-------------|----------|
| AI Bio Generator | Generate professional bio from bullet points | P1 |
| AI SEO Optimization | Auto-generate meta descriptions, suggest keywords | P1 |
| Testimonial Management | Add/edit/display client testimonials with ratings | P1 |
| Sold Portfolio | Past sales gallery with sold prices | P1 |
| Blog / Content Pages | Simple CMS for blog posts + market updates | P1 |
| Home Evaluation Tool | Seller lead magnet with AI estimate | P1 |
| Neighbourhood Pages | Auto-generated area guides with local data | P1 |
| Video Integration | Kling AI videos embedded on listing pages | P1 |
| Analytics Dashboard | Visitor stats, lead sources, popular listings | P1 |
| Social Media Links | Instagram feed embed, social sharing buttons | P1 |
| Mortgage Calculator | Interactive payment estimator on listings | P1 |

### 7.3 Advanced Features (V3)

| Feature | Description | Priority |
|---------|-------------|----------|
| AI Chat Widget | Claude-powered visitor chat for 24/7 lead qualification | P2 |
| Property Search | Full search with filters, map view, saved searches | P2 |
| Market Reports | Auto-generated monthly market data pages | P2 |
| Multi-Agent / Team Sites | Brokerage site with individual agent sub-pages | P2 |
| Email Marketing | Drip campaigns, listing alerts, market updates | P2 |
| Virtual Staging | AI-generated furnished room images | P2 |
| Google Reviews Import | Pull and display Google Business reviews | P2 |
| Multi-Language | English + Mandarin + Punjabi (top BC buyer demographics) | P2 |
| PWA / Push Notifications | Installable app, push for new listings | P2 |
| A/B Testing | Test headlines, CTAs, layouts for conversion | P2 |
| IDX/DDF Feed | CREA DDF listing search (requires CREA agreement) | P2 |

---

## 8. Architecture Design

### 8.1 System Architecture Overview

**Key Decision: Fully Separate Module**

The website platform lives in its own folder (`/realtors360-sites/`) at the monorepo root, completely independent of the CRM codebase. This enables:
- Selling it as a standalone value-add module
- Different realtors working on it independently
- Separate deployment lifecycle
- Independent package.json, dependencies, and build pipeline
- CRM connects via a "Website Marketing" dashboard card that links to the platform

```
/Users/bigbear/reality crm/              # MONOREPO ROOT
├── realestate-crm/                      # EXISTING — CRM app (localhost:3000)
│   └── "Website Marketing" card ──────► opens realtors360-sites admin UI
│
├── realtors360-sites/                   # NEW — Standalone website platform (localhost:3001)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (admin)/               # Admin panel (realtor-facing builder)
│   │   │   └── (public)/              # Public website pages (consumer-facing)
│   │   ├── components/
│   │   ├── lib/
│   │   └── ...
│   ├── package.json                    # Independent dependencies
│   ├── next.config.ts
│   └── .env.local                      # Shared Supabase credentials
│
├── CLAUDE.md
└── PRD_Realtors360_Website_Platform.md
```

```
┌──────────────────────────────────────────────────────────────────────┐
│                       REALTORS360 MONOREPO                            │
│                                                                        │
│  ┌─────────────────────┐          ┌──────────────────────────────┐   │
│  │  realestate-crm/    │          │  realtors360-sites/          │   │
│  │  (CRM App :3000)    │          │  (Website Platform :3001)    │   │
│  │                     │          │                              │   │
│  │  - Listings         │          │  ADMIN PANEL (realtor)       │   │
│  │  - Contacts         │   link   │  - Dashboard & stats         │   │
│  │  - Showings         │ ───────► │  - Template picker           │   │
│  │  - Workflow         │          │  - Brand editor              │   │
│  │  - Content Engine   │          │  - Page editor               │   │
│  │  - Calendar         │          │  - Testimonial manager       │   │
│  │  - Tasks            │          │  - Lead inbox                │   │
│  │  - 🌐 Website Mktg  │          │  - Domain & SEO settings     │   │
│  │     (entry card)    │          │                              │   │
│  └──────────┬──────────┘          │  PUBLIC SITE (consumer)      │   │
│             │                      │  - Homepage                  │   │
│             │                      │  - Listings                  │   │
│             │                      │  - About / Contact           │   │
│             │                      │  - Blog / Neighbourhoods     │   │
│             │                      │  - Showing request           │   │
│             │                      │  - Home evaluation           │   │
│             │                      └──────────┬───────────────────┘   │
│             │                                  │                       │
│             │        SHARED DATA LAYER         │                       │
│             ▼                                  ▼                       │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │                       SUPABASE                                │    │
│  │                                                               │    │
│  │  CRM TABLES (existing)       WEBSITE TABLES (new)             │    │
│  │  ├── contacts                ├── realtor_sites (config)       │    │
│  │  ├── listings                ├── site_pages (custom content)  │    │
│  │  ├── appointments            ├── testimonials                 │    │
│  │  ├── communications          ├── sold_listings                │    │
│  │  ├── listing_documents       ├── site_leads                   │    │
│  │  ├── prompts                 ├── site_analytics_events        │    │
│  │  ├── media_assets            ├── neighbourhoods               │    │
│  │  ├── tasks                   └── site_media (gallery)         │    │
│  │  └── form_templates                                           │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌──────────────────┐    ┌─────────────────────────────────────┐     │
│  │  Cloudflare R2   │    │  External Services                  │     │
│  │  (Media Storage) │    │  ├── Claude AI (bio, SEO, chat)    │     │
│  │  - Photos        │    │  ├── Kling AI (video/image)        │     │
│  │  - Videos        │    │  ├── Twilio (SMS/WhatsApp)         │     │
│  │  - Documents     │    │  ├── Google Calendar               │     │
│  └──────────────────┘    │  ├── Google Places (address)       │     │
│                           │  ├── BC Assessment (enrichment)    │     │
│                           │  └── Cloudflare DNS (domains)      │     │
│                           └─────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

### 8.1.1 CRM Entry Point — "Website Marketing" Card

The CRM dashboard (`realestate-crm/src/app/(dashboard)/page.tsx`) includes a "Website Marketing" tile that links to the separate platform:

- **In development:** Links to `http://localhost:3001` (realtors360-sites dev server)
- **In production:** Links to `https://sites.realtors360.com` or the deployed URL
- **Auth handoff:** Both apps share the same Supabase instance; the website platform authenticates via the same NextAuth session cookie (shared domain) or via a JWT token passed as a query parameter

### 8.1.2 Module Independence

The `realtors360-sites/` folder is designed to be:

1. **Independently deployable** — has its own `package.json`, `next.config.ts`, `.env.local`
2. **Independently sellable** — can be offered as a standalone product without the CRM
3. **Independently developable** — different realtors/developers can work on it without touching CRM code
4. **Data-coupled only** — the ONLY dependency on the CRM is the shared Supabase database (listings, contacts, appointments tables)
5. **Cross-linkable** — CRM links to website admin panel; website leads flow back to CRM via shared Supabase tables

### 8.2 Multi-Tenant Architecture

**Approach: Hybrid Multi-Tenant (Single Deployment + Wildcard Domain)**

One Next.js application serves all realtor websites. The hostname determines which realtor's config and data to load.

```
Request Flow:
1. Browser requests → agentname.realtors360.com OR custom-domain.ca
2. Cloudflare DNS resolves → Vercel edge
3. Next.js middleware reads Host header
4. Middleware looks up realtor_sites table by domain/subdomain
5. Sets x-realtor-id header for downstream pages
6. Page renders with realtor's config (template, colors, content)
7. ISR caches the rendered page for 60-300 seconds
```

```typescript
// middleware.ts (website app)
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Strip port for local dev
  const host = hostname.replace(/:\d+$/, '');

  // Check if it's a subdomain of realtors360.com
  let slug: string | null = null;
  if (host.endsWith('.realtors360.com')) {
    slug = host.replace('.realtors360.com', '');
  }

  // Look up site config (cached in edge)
  const siteConfig = await getSiteConfig(slug || host);

  if (!siteConfig) {
    return NextResponse.redirect('https://realtors360.com/404');
  }

  // Pass config to pages via headers
  const response = NextResponse.next();
  response.headers.set('x-site-id', siteConfig.id);
  response.headers.set('x-realtor-id', siteConfig.realtorId);
  response.headers.set('x-template', siteConfig.template);
  return response;
}
```

### 8.3 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Website App** | Next.js 16 (App Router) | Same as CRM; ISR + edge for performance |
| **Hosting** | Vercel Pro | Best Next.js support, wildcard domains, auto SSL |
| **DNS** | Cloudflare (free) | Best DNS API, instant propagation, DDoS protection |
| **Database** | Supabase (shared with CRM) | Single source of truth for listings, contacts |
| **Media Storage** | Cloudflare R2 | Zero egress fees, S3-compatible, CDN-ready |
| **CDN** | Vercel Edge + Cloudflare | Double-layer caching for static + dynamic |
| **AI** | Claude (Anthropic) | Bio generation, SEO, chat widget, content |
| **Video/Image** | Kling AI | Already integrated in Content Engine |
| **Analytics** | Custom + Plausible | Privacy-first, no cookie consent needed |
| **Email** | Resend or Postmark | Transactional emails (lead notifications) |
| **Maps** | Mapbox or Google Maps | Property locations, neighbourhood maps |

### 8.4 Repository Structure

```
/Users/bigbear/reality crm/           # MONOREPO ROOT
│
├── realestate-crm/                    # EXISTING — CRM app (localhost:3000)
│   src/
│     app/(dashboard)/
│       page.tsx                       # MODIFIED — add "Website Marketing" card
│
├── realtors360-sites/                 # NEW — Standalone website platform (localhost:3001)
│   ├── package.json                   # Independent deps (next, react, supabase, tailwind, etc.)
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── .env.local                     # Supabase creds + platform-specific keys
│   ├── tailwind.config.ts
│   ├── middleware.ts                  # Multi-tenant routing (hostname → site config)
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout (fonts, providers, theme injection)
│   │   │   │
│   │   │   ├── (admin)/              # ADMIN PANEL — realtor-facing website builder
│   │   │   │   ├── layout.tsx         # Admin layout with sidebar nav
│   │   │   │   ├── page.tsx           # Admin dashboard (site stats, quick actions)
│   │   │   │   ├── setup/page.tsx     # First-time onboarding wizard (6 steps)
│   │   │   │   ├── design/page.tsx    # Template picker + brand editor (colors, fonts, logo)
│   │   │   │   ├── pages/page.tsx     # Page manager (enable/disable pages, edit content)
│   │   │   │   ├── pages/[slug]/      # Individual page editor (WYSIWYG)
│   │   │   │   ├── listings/page.tsx  # Toggle which CRM listings appear on site
│   │   │   │   ├── testimonials/      # Add/edit/sort testimonials
│   │   │   │   ├── media/page.tsx     # Photo/video gallery manager
│   │   │   │   ├── blog/page.tsx      # Blog post list + create/edit
│   │   │   │   ├── blog/[slug]/       # Blog post editor
│   │   │   │   ├── leads/page.tsx     # Incoming website leads
│   │   │   │   ├── analytics/page.tsx # Traffic stats, lead sources, popular listings
│   │   │   │   ├── seo/page.tsx       # Meta tags, sitemap, schema markup settings
│   │   │   │   ├── domain/page.tsx    # Custom domain setup + SSL status
│   │   │   │   └── settings/page.tsx  # Social links, footer, legal, analytics codes
│   │   │   │
│   │   │   ├── (public)/             # PUBLIC SITE — consumer-facing realtor website
│   │   │   │   ├── layout.tsx         # Public layout (nav, footer, theme vars)
│   │   │   │   ├── page.tsx           # Homepage (hero, featured listings, bio, testimonials)
│   │   │   │   ├── about/page.tsx     # Agent bio, credentials, video intro
│   │   │   │   ├── listings/page.tsx  # All active listings grid
│   │   │   │   ├── listings/[id]/     # Single listing detail (photos, video, showing form)
│   │   │   │   ├── contact/page.tsx   # Contact form + agent info + map
│   │   │   │   ├── blog/page.tsx      # Blog post list
│   │   │   │   ├── blog/[slug]/       # Blog post detail
│   │   │   │   ├── sold/page.tsx      # Sold portfolio with prices + stats
│   │   │   │   ├── neighbourhoods/    # Area guides with local data
│   │   │   │   └── evaluation/        # Home evaluation lead magnet
│   │   │   │
│   │   │   └── api/                   # API routes
│   │   │       ├── leads/route.ts     # Receive lead form submissions → Supabase
│   │   │       ├── analytics/route.ts # Lightweight analytics event ingestion
│   │   │       ├── ai/bio/route.ts    # Claude AI bio generation
│   │   │       ├── ai/seo/route.ts    # Claude AI SEO suggestions
│   │   │       └── domain/route.ts    # Domain verification status check
│   │   │
│   │   ├── components/
│   │   │   ├── admin/                 # Admin panel UI components
│   │   │   │   ├── SetupWizard.tsx    # 6-step onboarding flow
│   │   │   │   ├── TemplateSelector.tsx
│   │   │   │   ├── BrandEditor.tsx    # Color picker, font selector, logo upload
│   │   │   │   ├── PageEditor.tsx     # Rich text / block editor
│   │   │   │   ├── TestimonialManager.tsx
│   │   │   │   ├── MediaGallery.tsx   # Upload, sort, delete media
│   │   │   │   ├── LeadsList.tsx      # Leads table with status tracking
│   │   │   │   ├── AnalyticsCharts.tsx
│   │   │   │   ├── SitePreview.tsx    # Live preview iframe
│   │   │   │   ├── DomainSetup.tsx    # Domain config + DNS instructions
│   │   │   │   └── AdminSidebar.tsx   # Admin navigation
│   │   │   │
│   │   │   ├── templates/             # Template-specific page layouts
│   │   │   │   ├── classic/           # Classic template components
│   │   │   │   │   ├── ClassicHome.tsx
│   │   │   │   │   ├── ClassicNav.tsx
│   │   │   │   │   ├── ClassicFooter.tsx
│   │   │   │   │   └── classic.config.ts
│   │   │   │   ├── modern/            # Modern template components
│   │   │   │   ├── luxury/            # Luxury template components
│   │   │   │   ├── minimal/           # Minimal template components
│   │   │   │   └── bold/              # Bold template components
│   │   │   │
│   │   │   ├── shared/                # Shared across all templates
│   │   │   │   ├── ListingCard.tsx
│   │   │   │   ├── PhotoGallery.tsx
│   │   │   │   ├── TestimonialCarousel.tsx
│   │   │   │   ├── ContactForm.tsx
│   │   │   │   ├── ShowingRequestForm.tsx
│   │   │   │   ├── MortgageCalculator.tsx
│   │   │   │   ├── NeighbourhoodMap.tsx
│   │   │   │   ├── HomeEvalForm.tsx
│   │   │   │   ├── BlogCard.tsx
│   │   │   │   └── SoldCard.tsx
│   │   │   │
│   │   │   └── ui/                    # UI primitives (shadcn, same pattern as CRM)
│   │   │
│   │   ├── lib/
│   │   │   ├── supabase/              # Supabase clients (mirrors CRM pattern)
│   │   │   │   ├── client.ts
│   │   │   │   ├── server.ts
│   │   │   │   └── admin.ts
│   │   │   ├── site-config.ts         # Fetch + cache site config from Supabase
│   │   │   ├── theme-engine.ts        # CSS custom property generation per realtor
│   │   │   ├── seo.ts                 # Meta tag + schema.org + sitemap generation
│   │   │   ├── analytics.ts           # Privacy-first analytics tracking
│   │   │   ├── auth.ts                # NextAuth config (shared session or standalone)
│   │   │   └── utils.ts               # cn() and helpers
│   │   │
│   │   ├── actions/                   # Server actions
│   │   │   ├── site.ts                # CRUD for realtor_sites config
│   │   │   ├── pages.ts               # CRUD for site_pages
│   │   │   ├── testimonials.ts        # CRUD for testimonials
│   │   │   ├── media.ts               # Upload/delete site media
│   │   │   ├── leads.ts               # Lead management
│   │   │   └── blog.ts                # Blog post CRUD
│   │   │
│   │   ├── hooks/                     # Client-side hooks
│   │   │   ├── useSiteConfig.ts
│   │   │   ├── useLeads.ts
│   │   │   └── useAnalytics.ts
│   │   │
│   │   └── types/
│   │       ├── database.ts            # Website platform table types
│   │       └── index.ts               # Exported type aliases
│   │
│   └── supabase/
│       └── migrations/
│           └── 001_website_tables.sql # All website-specific tables
```

### 8.4.1 CRM Integration Touch Points

The CRM (`realestate-crm/`) has minimal changes:

```
realestate-crm/ (EXISTING — changes minimal)
  src/app/(dashboard)/page.tsx       # ADD "Website Marketing" card to featureTiles
```

**That's it.** The CRM only adds one tile. All website platform logic lives in `realtors360-sites/`.

### 8.4.2 Communication Between CRM and Website Platform

| Direction | Mechanism | Example |
|-----------|-----------|---------|
| CRM → Website | Shared Supabase tables | Listing created in CRM → visible on website via `listings` table |
| Website → CRM | Shared Supabase tables | Lead submitted on website → inserted into `site_leads` + `contacts` tables |
| CRM → Admin Panel | HTTP link | "Website Marketing" card → `http://localhost:3001/admin` (dev) |
| Auth | Shared Supabase + NextAuth | Both apps validate session against same Supabase user data |

### 8.4.3 Development Workflow

```bash
# Terminal 1: CRM
cd realestate-crm && npm run dev          # localhost:3000

# Terminal 2: Website Platform
cd realtors360-sites && npm run dev        # localhost:3001
```

Both apps connect to the same Supabase instance via shared `.env.local` credentials.

---

## 9. CRM Integration

### 9.1 Data Flow: CRM → Website

| CRM Data | Website Usage | Sync Method |
|----------|--------------|-------------|
| Listings (active) | Property listing pages | Real-time (ISR revalidation on CRM mutation) |
| Listings (sold) | Sold portfolio page | Manual toggle or auto on status change |
| Prompts (MLS remarks) | Listing description text | Read from prompts table |
| Media Assets (videos/images) | Listing page media | Read from media_assets table |
| Agent Profile | About page, header, footer | Read from realtor_sites config |
| Showings | Available time slots (future) | Read from appointments table |

### 9.2 Data Flow: Website → CRM

| Website Event | CRM Action | Method |
|--------------|-----------|--------|
| Contact form submission | Create contact + communication | Server action → Supabase insert |
| Showing request | Create appointment (status: requested) | Server action → Supabase insert → Twilio notify |
| Home evaluation request | Create contact + lead tag | Server action → Supabase insert |
| Newsletter signup | Create contact (subscriber tag) | Server action → Supabase insert |
| Chat message | Create communication log | Server action → Supabase insert |
| Page view / event | Log to site_analytics_events | Lightweight POST to analytics API |

### 9.3 New Database Tables

```sql
-- Site configuration per realtor
CREATE TABLE realtor_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id UUID REFERENCES contacts(id),      -- Agent as a contact OR separate user
  user_email TEXT NOT NULL,                       -- NextAuth user email (links to CRM user)

  -- Domain
  subdomain TEXT UNIQUE NOT NULL,                 -- agentname.realtors360.com
  custom_domain TEXT UNIQUE,                      -- sarahsells.ca (nullable)
  domain_verified BOOLEAN DEFAULT false,

  -- Template & Design
  template TEXT NOT NULL DEFAULT 'modern',        -- classic, modern, luxury, minimal, bold
  colors JSONB DEFAULT '{}',                      -- { primary, secondary, accent, background }
  fonts JSONB DEFAULT '{}',                       -- { heading, body }

  -- Branding
  agent_name TEXT NOT NULL,
  agent_title TEXT,                                -- "REALTOR(R), PREC"
  tagline TEXT,                                    -- "Your Home. My Mission."
  headshot_url TEXT,
  logo_url TEXT,
  brokerage_name TEXT,
  brokerage_logo_url TEXT,

  -- Contact Info
  phone TEXT,
  email TEXT,
  office_address TEXT,
  social_links JSONB DEFAULT '{}',                -- { instagram, facebook, linkedin, youtube, tiktok }

  -- Content
  bio_short TEXT,                                  -- 2-3 sentence intro
  bio_full TEXT,                                   -- Full about page bio
  service_areas TEXT[],                            -- ["Surrey", "Langley", "White Rock"]
  credentials TEXT[],                              -- ["PREC", "ABR", "SRS"]

  -- Settings
  is_published BOOLEAN DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  google_analytics_id TEXT,
  facebook_pixel_id TEXT,
  show_blog BOOLEAN DEFAULT false,
  show_sold BOOLEAN DEFAULT true,
  show_evaluation BOOLEAN DEFAULT true,
  show_mortgage_calc BOOLEAN DEFAULT true,
  enabled_pages TEXT[] DEFAULT ARRAY['home','about','listings','contact'],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Custom pages (blog posts, neighbourhood guides, custom pages)
CREATE TABLE site_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL,                         -- "blog" | "neighbourhood" | "custom"
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,                                    -- Markdown or HTML content
  hero_image_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);

-- Client testimonials
CREATE TABLE testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_location TEXT,                            -- "Surrey, BC"
  content TEXT NOT NULL,                           -- Testimonial text
  rating INT CHECK (rating >= 1 AND rating <= 5),
  listing_id UUID REFERENCES listings(id),         -- Optional: link to sold listing
  photo_url TEXT,                                  -- Client photo (optional)
  is_featured BOOLEAN DEFAULT false,               -- Show on homepage
  sort_order INT DEFAULT 0,
  source TEXT DEFAULT 'manual',                    -- "manual" | "google" | "zillow"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sold listings (historical, may not exist in active CRM listings)
CREATE TABLE sold_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id),         -- Optional: link to CRM listing
  address TEXT NOT NULL,
  sold_price NUMERIC(12,2),
  sold_date DATE,
  photo_url TEXT,
  description TEXT,
  beds INT,
  baths INT,
  sqft INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Incoming website leads
CREATE TABLE site_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),         -- Created in CRM on submission
  lead_type TEXT NOT NULL,                         -- "contact" | "showing" | "evaluation" | "newsletter" | "chat"
  source_page TEXT,                                -- URL path where lead was captured
  form_data JSONB DEFAULT '{}',                    -- Raw form submission data
  status TEXT DEFAULT 'new',                       -- "new" | "contacted" | "qualified" | "converted" | "closed"
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lightweight analytics events
CREATE TABLE site_analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,                        -- "page_view" | "listing_view" | "form_submit" | "click"
  page_path TEXT,
  listing_id UUID,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,                                -- "mobile" | "desktop" | "tablet"
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gallery / media for website (separate from CRM media_assets)
CREATE TABLE site_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,                          -- Cloudflare R2 URL
  file_type TEXT,                                  -- "image" | "video"
  category TEXT DEFAULT 'gallery',                 -- "gallery" | "hero" | "headshot" | "logo" | "blog"
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Neighbourhood / service area data
CREATE TABLE neighbourhoods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES realtor_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  hero_image_url TEXT,
  center_lat NUMERIC(10,7),
  center_lng NUMERIC(10,7),
  bounds JSONB,                                    -- GeoJSON polygon
  stats JSONB DEFAULT '{}',                        -- { avg_price, listings_count, walk_score }
  amenities JSONB DEFAULT '[]',                    -- [{ name, type, lat, lng }]
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, slug)
);

-- Indexes for performance
CREATE INDEX idx_realtor_sites_subdomain ON realtor_sites(subdomain);
CREATE INDEX idx_realtor_sites_custom_domain ON realtor_sites(custom_domain);
CREATE INDEX idx_site_pages_site_slug ON site_pages(site_id, slug);
CREATE INDEX idx_site_leads_site ON site_leads(site_id, created_at DESC);
CREATE INDEX idx_site_analytics_site ON site_analytics_events(site_id, created_at DESC);
CREATE INDEX idx_site_analytics_type ON site_analytics_events(site_id, event_type, created_at DESC);
CREATE INDEX idx_testimonials_site ON testimonials(site_id, sort_order);
```

---

## 10. Template System

### 10.1 Template Definitions

Each template defines layout structure, default colors, and component variants.

| Template | Style | Target Agent | Key Visual Elements |
|----------|-------|-------------|-------------------|
| **Classic** | Traditional, warm | Established agents | Serif headings, warm earth tones, formal photo layouts |
| **Modern** | Clean, minimal | Tech-savvy agents | Sans-serif, whitespace, large photos, subtle animations |
| **Luxury** | Premium, dark | High-end market | Dark backgrounds, gold accents, cinematic hero, elegant typography |
| **Minimal** | Ultra-clean | Personal brand | One accent color, maximum whitespace, typography-focused |
| **Bold** | Vibrant, energetic | Young/ambitious agents | Bright gradients, bold typography, dynamic layouts, video heroes |

### 10.2 Theme Engine

```typescript
// Template config structure
interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  defaultColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  defaultFonts: {
    heading: string;  // Google Fonts name
    body: string;
  };
  layout: {
    headerStyle: 'fixed' | 'sticky' | 'static';
    heroStyle: 'full-width' | 'split' | 'overlay' | 'video';
    listingCardStyle: 'minimal' | 'detailed' | 'overlay';
    footerStyle: 'simple' | 'detailed' | 'minimal';
  };
  components: {
    navigation: 'horizontal' | 'hamburger' | 'sidebar';
    testimonials: 'carousel' | 'grid' | 'masonry';
    listings: 'grid-3' | 'grid-4' | 'list' | 'masonry';
    gallery: 'lightbox' | 'carousel' | 'grid';
  };
}
```

### 10.3 CSS Custom Properties (Runtime Theming)

```css
/* Generated per-site from realtor_sites.colors + template defaults */
:root {
  /* Brand Colors */
  --rt-primary: var(--site-primary, #4f35d2);
  --rt-secondary: var(--site-secondary, #1a1535);
  --rt-accent: var(--site-accent, #ff5c3a);
  --rt-bg: var(--site-bg, #ffffff);
  --rt-surface: var(--site-surface, #f8f9fa);
  --rt-text: var(--site-text, #1a1535);
  --rt-text-muted: var(--site-text-muted, #6b7280);

  /* Typography */
  --rt-font-heading: var(--site-font-heading, 'Inter');
  --rt-font-body: var(--site-font-body, 'Inter');

  /* Spacing (consistent across templates) */
  --rt-radius: 12px;
  --rt-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
```

---

## 11. Hosting & Deployment

### 11.1 Deployment Strategy

**Platform: Vercel (Pro Plan)**

- **CRM App:** Deployed as `app.realtors360.com` (existing)
- **Website App:** Deployed as `*.realtors360.com` (new, wildcard domain)
- **Custom Domains:** Each realtor's custom domain → CNAME to `cname.vercel-dns.com`

### 11.2 Deployment Workflow

```
Realtor Creates/Updates Site (via realtors360-sites admin panel)
         │
         ▼
Admin panel saves config to Supabase (realtor_sites table)
         │
         ▼
Public website reads config at request time (ISR cached)
         │
         ▼
No redeployment needed — single app serves all sites dynamically
         │
         ▼
ISR revalidation triggered on data change (revalidateTag)
```

**Key insight:** We do NOT deploy a separate site per realtor. The `realtors360-sites` app handles all realtor websites via runtime multi-tenancy. This means:
- Zero deployment per new realtor (instant setup)
- Shared infrastructure cost ($20/mo Vercel Pro)
- Updates to templates/features apply to ALL sites immediately
- ISR caching ensures fast page loads despite dynamic content
- CRM and website platform deploy independently (separate Vercel projects)

### 11.3 Custom Domain Setup Flow

```
1. Realtor enters desired domain in CRM
2. System checks domain availability (optional: offer to purchase)
3. System adds domain to Vercel project via API:
   POST https://api.vercel.com/v10/projects/{project}/domains
   { "name": "sarahsells.ca" }
4. System displays DNS instructions:
   "Add a CNAME record pointing to cname.vercel-dns.com"
5. System polls domain verification status
6. Once DNS propagates → SSL auto-provisions → domain_verified = true
7. Site is live on custom domain
```

### 11.4 Cost Model

| Scale | Vercel | R2 Storage | Supabase | Total/mo |
|-------|--------|-----------|----------|----------|
| 10 sites | $20 | ~$0 (free tier) | $0 (existing) | ~$20 |
| 50 sites | $20 | ~$1 | $0 | ~$21 |
| 200 sites | $20 | ~$3 | $25 (Pro) | ~$48 |
| 500 sites | $20 | ~$5 | $25 | ~$50 |
| 1000 sites | $20 | ~$10 | $75 (Team) | ~$105 |

---

## 12. Domain & SSL Management

### 12.1 Domain Options

| Option | Cost | Setup Time | Management |
|--------|------|-----------|-----------|
| Free subdomain (`agent.realtors360.com`) | Free | Instant | Automatic |
| Custom domain (bring your own) | $0 | 5-30 min DNS propagation | Agent sets CNAME |
| Custom domain (we purchase) | $10-15/yr | 5-10 min | We manage via Cloudflare API |

### 12.2 DNS Architecture

```
*.realtors360.com → Vercel (wildcard A/AAAA records)
sarahsells.ca → CNAME → cname.vercel-dns.com (Vercel handles SSL)
```

### 12.3 SSL

All SSL is automatic:
- **Subdomains:** Covered by wildcard cert on `*.realtors360.com`
- **Custom domains:** Let's Encrypt auto-provisioned by Vercel upon domain verification
- **Enforcement:** All HTTP → HTTPS redirects handled at edge

---

## 13. Media & Asset Pipeline

### 13.1 Storage Architecture

```
Cloudflare R2 Bucket: realtors360-sites
├── {site_id}/
│   ├── headshot/           # Agent headshot (original + resized)
│   ├── logo/               # Brand logo
│   ├── hero/               # Homepage hero images
│   ├── gallery/            # General site photos
│   ├── listings/{id}/      # Per-listing photos
│   ├── blog/{slug}/        # Blog post images
│   └── video/              # Video content
```

### 13.2 Image Processing Pipeline

```
Upload (original) → R2 Storage
                  → Image Optimization (Vercel Image Optimization or Cloudflare Images)
                  → Responsive variants (320w, 640w, 960w, 1280w, 1920w)
                  → WebP/AVIF conversion
                  → CDN cache (Cloudflare/Vercel edge)
```

### 13.3 Video Handling

- **Kling AI videos:** Already stored via Content Engine → reference output_url
- **Uploaded videos:** Store in R2, serve via Cloudflare Stream (or direct R2 + lazy loading)
- **YouTube/Vimeo embeds:** Supported via URL embedding (no storage cost)

---

## 14. AI Features

### 14.1 AI-Powered Content Generation

| Feature | AI Model | Input | Output |
|---------|---------|-------|--------|
| Agent Bio | Claude | Bullet points about agent | Professional 2-paragraph bio |
| Listing Description | Claude | Property details from CRM | MLS-ready description (existing) |
| SEO Meta Tags | Claude | Page content + keywords | Title, description, OG text |
| Blog Posts | Claude | Topic + keywords | Full blog post (draft) |
| Neighbourhood Guide | Claude | Area name + local data | Descriptive area guide |
| Instagram Caption | Claude | Listing details | Caption + hashtags (existing) |
| Home Eval Estimate | Claude + BC Assessment | Address + property details | Preliminary value range |

### 14.2 AI Chat Widget (V3)

- **Model:** Claude (via Anthropic API)
- **Context:** Agent's listings, bio, service areas, FAQ
- **Capabilities:** Answer property questions, qualify leads, book showings
- **Hours:** 24/7 automated, hand-off to agent during business hours
- **Lead capture:** Collects name + contact info before detailed questions
- **Cost:** ~$0.01-0.05 per conversation (Claude Haiku for chat)

---

## 15. Analytics & Lead Tracking

### 15.1 Analytics Dashboard (in CRM)

```
Website Overview
├── Visitors (today / 7d / 30d)
├── Page Views (chart)
├── Top Pages (table)
├── Top Listings Viewed (table)
├── Lead Sources (pie chart)
├── Device Breakdown (mobile/desktop/tablet)
├── Referrer Sources (direct, Google, social, etc.)
└── Conversion Rate (visitors → leads)

Leads
├── New leads (uncontacted)
├── Lead source (contact form, showing, evaluation, chat)
├── Lead timeline (contact → qualified → converted)
└── Follow-up reminders
```

### 15.2 Privacy-First Tracking

- **No cookies required** — use fingerprint-free session hashing
- **PIPEDA compliant** — no personal data in analytics without consent
- **No third-party trackers by default** — optional GA/Pixel via settings
- **Data retention:** 12 months rolling, aggregated after 90 days

---

## 16. Compliance & Legal

### 16.1 Real Estate Compliance

| Requirement | Implementation |
|------------|---------------|
| BCFSA advertising rules | Template includes required disclaimers |
| RECBC license display | Agent license number in footer (required field) |
| Fair Housing disclaimer | Auto-included in footer on all templates |
| CASL consent | Newsletter signup includes explicit consent checkbox |
| FINTRAC notice | Privacy policy template includes FINTRAC disclosure |
| Brokerage attribution | Brokerage name + logo required in all templates |
| MLS trademark | Proper MLS/REALTOR trademark usage in copy |

### 16.2 Web Compliance

| Requirement | Implementation |
|------------|---------------|
| WCAG 2.1 AA | Accessible color contrast, alt text, keyboard nav |
| Privacy Policy | Auto-generated template with customizable sections |
| Cookie Banner | Only if GA/Pixel enabled (not needed for our analytics) |
| SSL/HTTPS | Enforced on all sites |
| GDPR (if applicable) | Data export/deletion API for contacts |

---

## 17. Monetization & Pricing

### 17.1 Pricing Tiers

| Tier | Price/mo | Features |
|------|---------|----------|
| **Starter** | $49 | CRM + website (subdomain only) + 1 template + 5 listings + basic analytics |
| **Professional** | $99 | CRM + website + custom domain + all templates + unlimited listings + AI content + analytics |
| **Premium** | $199 | Everything + AI chat widget + blog + neighbourhood pages + priority support + white-label |
| **Team** | $399 | Multi-agent site + team CRM + branded sub-sites + admin dashboard |

### 17.2 Add-Ons

| Add-On | Price |
|--------|-------|
| Additional custom domain | $10/mo |
| AI chat widget (standalone) | $29/mo |
| Domain purchase (we manage) | $15/yr |
| Priority support | $25/mo |
| Custom template design | $500 one-time |
| White-label (remove Realtors360 branding) | $50/mo |

### 17.3 Revenue Projections

| Year | Agents | Avg Revenue/Agent/mo | Monthly Revenue | Annual Revenue |
|------|--------|---------------------|----------------|---------------|
| Y1 (2026) | 50 | $99 | $4,950 | $59,400 |
| Y2 (2027) | 200 | $119 | $23,800 | $285,600 |
| Y3 (2028) | 500 | $139 | $69,500 | $834,000 |

---

## 18. Competitive Differentiation

### 18.1 What Makes Realtors360 Sites Unique

| Differentiator | Realtors360 | Competitors |
|---------------|-------------|-------------|
| **CRM + Website + AI in one** | Yes | No (separate products) |
| **BC regulatory compliance built-in** | BCREA, FINTRAC, CASL, BCFSA | US-focused, manual compliance |
| **AI content engine** | Claude + Kling (video, image, copy) | None or basic chatbot only |
| **Transaction management** | 8-phase workflow, forms, e-sign | Lead capture only |
| **Showing management** | Twilio SMS/WhatsApp integrated | Separate tool or manual |
| **Instant website generation** | < 15 minutes, no developer needed | Days to weeks (WordPress) |
| **Modern tech stack** | Next.js, React, Tailwind, ISR | WordPress, legacy proprietary |
| **Price for full platform** | $99/mo | $300-1500/mo for comparable |
| **Canadian MLS ready** | Built for CREA/FVREB data | US MLS only |
| **Multi-tenant efficiency** | One deployment, unlimited sites | Per-site hosting costs |

### 18.2 Moat Strategy

1. **Data lock-in (positive):** CRM + website + transaction data all in one place — switching cost is high
2. **AI advantage:** Content engine gets better with more listings (prompt refinement, market knowledge)
3. **Network effects:** More agents → more showing data → better analytics → more agents
4. **BC-first focus:** Deep regulatory knowledge that US-first platforms can't easily replicate
5. **Template iteration speed:** Modern stack allows rapid template improvements vs. WordPress plugins

---

## 19. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Standalone `realtors360-sites` app with admin panel + public site serving basic pages from CRM data

- [ ] Initialize `realtors360-sites/` as independent Next.js 16 app at monorepo root
- [ ] Set up package.json, tailwind, typescript, supabase clients (mirror CRM patterns)
- [ ] Create Supabase migration: `realtor_sites`, `site_leads`, `testimonials`, `site_media` tables
- [ ] Build multi-tenant middleware (hostname → site config lookup)
- [ ] Build admin panel layout with sidebar navigation
- [ ] Build admin setup wizard (6-step onboarding flow)
- [ ] Implement theme engine (CSS custom properties per realtor)
- [ ] Build first template (Modern) — homepage + listings + about + contact
- [ ] Listing sync: display active CRM listings on public website (read from shared Supabase)
- [ ] Contact form → creates lead in `site_leads` + `contacts` tables
- [ ] Add "Website Marketing" card to CRM dashboard → links to `localhost:3001`
- [ ] Deploy to Vercel as separate project with wildcard domain
- [ ] Basic mobile responsive layout

### Phase 2: Core Features (Weeks 5-8)

**Goal:** Complete website with all core pages and lead capture

- [ ] Build remaining pages: about, listings, listing detail, contact
- [ ] Photo gallery component (carousel, lightbox)
- [ ] Showing request form → CRM appointment creation → Twilio notification
- [ ] Testimonial management in CRM + display on website
- [ ] Agent profile page with headshot, bio, credentials
- [ ] SEO: meta tags, Open Graph, sitemap.xml, robots.txt, schema.org
- [ ] Custom domain setup flow (Vercel API integration)
- [ ] Website admin section in CRM dashboard
- [ ] Second template (Classic)

### Phase 3: AI & Content (Weeks 9-12)

**Goal:** AI-powered content and media integration

- [ ] AI bio generator (Claude)
- [ ] AI SEO meta tag generator
- [ ] Kling AI video integration on listing pages
- [ ] Home evaluation landing page (seller lead magnet)
- [ ] Mortgage calculator component
- [ ] Sold portfolio page
- [ ] R2 media upload pipeline (photos, videos)
- [ ] Image optimization (responsive sizes, WebP)
- [ ] Third template (Luxury)

### Phase 4: Growth Features (Weeks 13-16)

**Goal:** Analytics, blog, and neighbourhood features

- [ ] Analytics tracking (page views, listing views, lead sources)
- [ ] Analytics dashboard in CRM
- [ ] Blog / content pages with simple CMS
- [ ] Neighbourhood guide pages
- [ ] Google Reviews import (via Google Business API)
- [ ] Newsletter signup + email integration
- [ ] Two more templates (Minimal, Bold)
- [ ] A/B testing framework for CTAs

### Phase 5: Advanced (Weeks 17-24)

**Goal:** Advanced features for premium tier

- [ ] AI chat widget (Claude-powered)
- [ ] Multi-agent / team site support
- [ ] IDX/DDF property search (CREA agreement required)
- [ ] Multi-language (English, Mandarin, Punjabi)
- [ ] PWA with push notifications
- [ ] White-label option (remove Realtors360 branding)
- [ ] Brokerage admin dashboard
- [ ] Advanced email marketing (drip campaigns)

---

## 20. Success Metrics

### 20.1 Product Metrics

| Metric | Target (Y1) |
|--------|-------------|
| Sites launched | 50 |
| Average setup time | < 15 minutes |
| Monthly active sites | 80%+ |
| Average page load (mobile) | < 2 seconds |
| Lead conversion rate (visitor → form submit) | > 3% |
| Template satisfaction (NPS) | > 40 |

### 20.2 Business Metrics

| Metric | Target (Y1) |
|--------|-------------|
| Monthly recurring revenue | $4,950+ |
| Churn rate | < 5% monthly |
| Customer acquisition cost | < $200 |
| Lifetime value | > $1,200 |
| NPS score | > 50 |

---

## 21. Open Questions

1. **CREA DDF Access:** Should we pursue CREA Data Distribution Facility (DDF) access for IDX property search? Requires board membership and licensing agreement. Cost and timeline TBD.

2. **Team/Brokerage Model:** Should team sites be a separate template or a configuration on existing templates? How do we handle shared vs. individual leads?

3. **Content Moderation:** Do we need to review site content before publishing (compliance risk) or trust agents to self-moderate?

4. **Backup Domain Strategy:** Should we offer `agentname.ca` domain purchasing as a value-add? What registrar partnership makes sense?

5. **Email Provider:** Resend vs. Postmark vs. SendGrid for transactional emails? Consider deliverability, pricing, and Canadian data residency.

6. **Map Provider:** Mapbox (more customizable, better pricing at scale) vs. Google Maps (more recognizable, better data for Canada)?

7. **Video Hosting:** Cloudflare Stream (paid, but built-in player/analytics) vs. R2 direct (cheaper, manual player)?

8. **Offline/PWA Priority:** Is PWA a real differentiator for real estate or nice-to-have? Consumer research needed.

---

*This document is the single source of truth for the Realtors360 Website Platform. Update before implementing any changes.*

**Last Updated:** 2026-03-14
**Next Review:** Before each implementation phase begins
