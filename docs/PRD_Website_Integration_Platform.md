<!-- docs-audit: listingflow-sites/**, src/app/api/websites/* -->
# PRD: Realtors360 Website Integration Platform

**Version:** 1.0
**Date:** 2026-03-26
**Status:** Approved
**Author:** Realtors360 Team

---

## 1. Overview

### 1.1 Problem

Realtors invest in custom websites (WordPress, Squarespace, custom-built) but these websites are disconnected from their CRM. Leads from website forms get lost, visitor behavior is invisible, and there's no AI-powered engagement. The realtor manages two separate systems with no data flow between them.

### 1.2 Solution

An **integration SDK** — a lightweight JavaScript library and set of API endpoints that connect ANY realtor website to the Realtors360 CRM. The realtor adds a single `<script>` tag to their website and gets: analytics tracking, AI chatbot, lead capture, newsletter signup, live listings feed, session recording, and appointment booking — all managed from the CRM dashboard.

### 1.3 Non-Goals

- Building a website generator or website builder
- Hosting or deploying realtor websites
- Replacing the realtor's existing website
- CMS or content management for the website itself

### 1.4 Success Metrics

| Metric | Target |
|--------|--------|
| SDK load time | < 50ms (script size < 5KB gzipped) |
| Analytics event delivery | 99%+ reliability |
| Lead capture → CRM contact | < 2 seconds |
| Chatbot first response | < 3 seconds |
| CRM dashboard load | < 2 seconds |
| Integration setup time | < 5 minutes (copy-paste) |

---

## 2. User Stories

### Epic 1: SDK & API Foundation

#### US-WEB-001: SDK Script Loading
**As a** realtor with an existing website,
**I want to** add a single script tag to my website,
**So that** all Realtors360 integrations are automatically available.

**Acceptance Criteria:**
- [ ] Script loads from `<script src="https://app.realtors360.com/sdk/realtors360.js" data-key="lf_xxx"></script>`
- [ ] Script is < 5KB gzipped
- [ ] Script auto-initializes on DOM ready
- [ ] `window.Realtors360` object is available after load
- [ ] Script does not block page rendering (async load)
- [ ] Script works on any website platform (WordPress, Squarespace, Wix, custom HTML, React, etc.)
- [ ] Invalid or missing API key shows console warning, does not break page

#### US-WEB-002: API Key Authentication
**As a** realtor,
**I want** a unique API key for my website integration,
**So that** only my website can send data to my CRM account.

**Acceptance Criteria:**
- [ ] API key generated in CRM Settings tab (format: `lf_` + 32 hex chars)
- [ ] API key stored in `realtor_sites.api_key` (hashed)
- [ ] All `/api/websites/*` endpoints validate `X-LF-Key` header
- [ ] Invalid key returns 401 with clear error message
- [ ] Key can be regenerated (old key immediately invalidated)
- [ ] Rate limiting: 1000 requests/minute per key

#### US-WEB-003: Domain Whitelist
**As a** realtor,
**I want to** specify which domains can use my API key,
**So that** my key can't be stolen and used from other websites.

**Acceptance Criteria:**
- [ ] Domain whitelist editable in CRM Settings tab
- [ ] CORS `Access-Control-Allow-Origin` set to whitelisted domains only
- [ ] Requests from non-whitelisted domains rejected with 403
- [ ] `localhost` and `127.0.0.1` always allowed (for development)
- [ ] Wildcard subdomains supported (e.g., `*.mysite.com`)

#### US-WEB-004: Listings API
**As a** website developer,
**I want to** fetch active listings from the CRM via API,
**So that** I can display live property data on the realtor's website.

**Acceptance Criteria:**
- [ ] `GET /api/websites/listings` returns JSON array of active listings
- [ ] Response includes: id, address, list_price, status, beds, baths, sqft, property_type, hero_image_url, mls_number
- [ ] Filterable by query params: `?type=condo&area=kitsilano&maxPrice=1000000&limit=10`
- [ ] Response cached for 5 minutes (CDN-friendly)
- [ ] CORS headers set for whitelisted domains
- [ ] Empty array returned if no listings match (not error)

---

### Epic 2: Lead Capture & Newsletter

#### US-WEB-010: Lead Capture Form
**As a** website visitor,
**I want to** submit a contact form on the realtor's website,
**So that** the realtor can follow up with me.

**Acceptance Criteria:**
- [ ] `POST /api/websites/lead` accepts: name (required), phone (required), email (optional), message, source_page, property_interest
- [ ] Creates contact in CRM `contacts` table with `source: "website"`
- [ ] Auto-enrolls contact in journey via `enrollInJourney()`
- [ ] Fires `new_lead` trigger for Speed-to-Contact workflow
- [ ] Returns `{ success: true, contact_id }` on success
- [ ] Duplicate detection: if phone/email matches existing contact, updates instead of creating
- [ ] Phone auto-normalized to +1 format

#### US-WEB-011: Lead Capture Embed Code
**As a** realtor,
**I want** a copy-paste HTML form snippet,
**So that** I can add lead capture to my website without coding.

**Acceptance Criteria:**
- [ ] Integration Codes tab shows HTML form snippet with pre-filled API key
- [ ] Form includes: name, phone, email, message fields
- [ ] Form submission handled by SDK (no page reload)
- [ ] Success message shown inline after submission
- [ ] Error handling with user-friendly messages
- [ ] Form fields customizable via data attributes

#### US-WEB-012: Newsletter Signup
**As a** website visitor,
**I want to** subscribe to the realtor's newsletter,
**So that** I receive property updates and market insights.

**Acceptance Criteria:**
- [ ] `POST /api/websites/newsletter` accepts: email (required), name (optional), consent (required, boolean)
- [ ] Creates contact with `newsletter_opt_in: true` and `source: "website_newsletter"`
- [ ] Auto-enrolls in buyer nurture journey
- [ ] CASL compliance: consent checkbox required, consent date recorded in `consent_records`
- [ ] If email already exists, updates existing contact (does not create duplicate)
- [ ] Returns success with message: "You're subscribed!"
- [ ] Unsubscribe link included in all subsequent emails

#### US-WEB-013: Newsletter Signup Widget
**As a** realtor,
**I want** an embeddable newsletter signup widget,
**So that** visitors can subscribe from any page on my website.

**Acceptance Criteria:**
- [ ] `Realtors360.mountNewsletter(elementId)` renders signup form in specified div
- [ ] Widget includes: email input, CASL consent checkbox, submit button
- [ ] Styled with CSS custom properties (realtor can override colors)
- [ ] Success/error states with smooth animations
- [ ] Widget works in shadow DOM (no style conflicts)

#### US-WEB-014: Appointment Booking
**As a** website visitor,
**I want to** book an appointment with the realtor,
**So that** I can discuss my real estate needs.

**Acceptance Criteria:**
- [ ] `POST /api/websites/booking` accepts: name, phone, email, date, time, appointment_type, notes
- [ ] Creates contact in CRM (or updates existing)
- [ ] Creates task in CRM assigned to realtor
- [ ] Optionally creates Google Calendar event (if calendar connected)
- [ ] Returns available time slots if `GET /api/websites/booking?date=2026-04-01`
- [ ] Sends confirmation SMS/email to visitor via existing Twilio/Resend

#### US-WEB-015: Home Valuation Request
**As a** homeowner visiting the realtor's website,
**I want to** request a home valuation,
**So that** I can learn what my property is worth.

**Acceptance Criteria:**
- [ ] `POST /api/websites/valuation` accepts: address, property_type, beds, baths, sqft, name, phone, email
- [ ] Creates contact with `type: "seller"` and `source: "website_valuation"`
- [ ] Stores property details in contact notes
- [ ] Auto-enrolls in seller journey
- [ ] Returns acknowledgment: "We'll send your valuation within 24 hours"
- [ ] Creates high-priority task for realtor: "Valuation request from [name]"

---

### Epic 3: AI Chatbot

#### US-WEB-020: Chatbot Widget
**As a** website visitor,
**I want to** chat with an AI assistant on the realtor's website,
**So that** I can get instant answers about properties, neighborhoods, and the buying/selling process.

**Acceptance Criteria:**
- [ ] `Realtors360.mountChat(elementId)` renders floating chat bubble (bottom-right)
- [ ] Chat opens as expandable panel (400px wide, 600px tall)
- [ ] Greeting message configurable by realtor
- [ ] Messages stream in real-time (SSE)
- [ ] Chat history persisted in localStorage per session
- [ ] Mobile-responsive (full-width on < 768px)
- [ ] Shadow DOM isolates styles from host website

#### US-WEB-021: Chatbot Property Search
**As a** website visitor chatting with the AI,
**I want to** ask about available properties,
**So that** I can find homes that match my criteria.

**Acceptance Criteria:**
- [ ] "Show me 3-bedroom homes under $700K" returns matching CRM listings
- [ ] Listings displayed as interactive cards in chat (photo, address, price, beds/baths)
- [ ] Cards link to property detail page on realtor's website
- [ ] AI explains why each property matches the criteria
- [ ] "Tell me more about [address]" returns full property details

#### US-WEB-022: Chatbot Lead Capture
**As a** realtor,
**I want** the chatbot to capture visitor contact info,
**So that** interested visitors become leads in my CRM.

**Acceptance Criteria:**
- [ ] When visitor asks to book showing or get more info, chatbot asks for name and phone
- [ ] Contact created in CRM with `source: "website_chat"`
- [ ] Chat transcript stored in `communications` table linked to contact
- [ ] Realtor gets notification (via `agent_notifications`) for high-intent chats
- [ ] Visitor can decline to share info and still browse listings

#### US-WEB-023: Chatbot Scheduling
**As a** website visitor,
**I want to** schedule a showing through the chatbot,
**So that** I can view a property at a convenient time.

**Acceptance Criteria:**
- [ ] "I want to see [address]" triggers scheduling flow
- [ ] Chatbot checks realtor's Google Calendar for availability
- [ ] Presents available time slots
- [ ] Creates showing request in CRM after visitor confirms
- [ ] Sends confirmation to visitor (email or SMS based on provided info)

#### US-WEB-024: Chatbot Configuration
**As a** realtor,
**I want to** customize my chatbot's personality and behavior,
**So that** it represents my brand accurately.

**Acceptance Criteria:**
- [ ] Settings tab in CRM: greeting message, personality tone (professional/friendly/luxury), working hours
- [ ] Outside working hours: chatbot shows "Leave a message" form instead of live chat
- [ ] Rate limits: 20 messages per session, 100 per day per API key
- [ ] Chatbot knows agent name, brokerage, service areas, specialties (from `realtor_agent_config`)
- [ ] Enable/disable toggle in CRM settings

---

### Epic 4: Analytics & Tracking

#### US-WEB-030: Page View Tracking
**As a** realtor,
**I want to** see how many people visit my website,
**So that** I can measure my online marketing effectiveness.

**Acceptance Criteria:**
- [ ] SDK auto-tracks page views on initial load and route changes (SPA support)
- [ ] Each event records: page URL, referrer, UTM params, device type, session ID
- [ ] Events batched and sent every 5 seconds (or on page unload)
- [ ] Analytics tab shows: visitors today, this week, this month
- [ ] Daily visitor chart (line graph, 30-day view)

#### US-WEB-031: Interaction Tracking
**As a** realtor,
**I want to** know what visitors do on my website,
**So that** I can understand which content drives engagement.

**Acceptance Criteria:**
- [ ] SDK tracks events: `listing_click`, `form_start`, `form_submit`, `chat_open`, `chat_message`, `cta_click`, `newsletter_signup`, `phone_click`
- [ ] `Realtors360.trackEvent(type, metadata)` available for custom events
- [ ] Analytics tab shows: top pages, click heatmap data, interaction counts
- [ ] Events linked to session (cookie-based session ID)

#### US-WEB-032: Visitor Sessions
**As a** realtor,
**I want to** see each visitor's journey through my website,
**So that** I can understand how they navigate and what interests them.

**Acceptance Criteria:**
- [ ] Cookie-based session tracking (30-minute timeout)
- [ ] Session record: pages visited (ordered), duration, referrer, device, UTM, is_converted
- [ ] Sessions list in CRM with filters: date range, converted only, specific pages visited
- [ ] Session detail shows page-by-page journey with timestamps
- [ ] Converted sessions (form submitted) linked to contact record

#### US-WEB-033: Lead Attribution
**As a** realtor,
**I want to** know which website pages generate the most leads,
**So that** I can invest in the right content.

**Acceptance Criteria:**
- [ ] Lead funnel visualization: page views → form starts → form submits → contacts created
- [ ] Per-page conversion rate
- [ ] UTM campaign performance: which campaigns drive the most leads
- [ ] Referrer breakdown: Direct, Google, Social, Email, Other
- [ ] Device breakdown: Desktop vs Mobile vs Tablet

#### US-WEB-034: Analytics Dashboard
**As a** realtor,
**I want** a visual analytics dashboard in my CRM,
**So that** I can see website performance at a glance.

**Acceptance Criteria:**
- [ ] Analytics tab on `/websites` page
- [ ] Stats pills: visitors (today/week/month), page views, bounce rate, avg session duration
- [ ] Visitor trend chart (daily, selectable date range)
- [ ] Top 10 pages table (URL, views, unique visitors)
- [ ] Referrer pie chart
- [ ] Device breakdown bar chart
- [ ] Lead funnel chart
- [ ] Data refreshes on tab switch (not stale)

---

### Epic 5: Session Recording

#### US-WEB-040: FullStory Integration
**As a** realtor,
**I want to** see session recordings of my website visitors,
**So that** I can understand UX issues and visitor intent.

**Acceptance Criteria:**
- [ ] Integration Codes tab provides FullStory embed snippet with org ID
- [ ] `FS.identify()` called automatically when visitor submits a form (links to CRM contact)
- [ ] FullStory session URL stored on contact record in CRM
- [ ] CRM contact detail shows "View Session Recording" link
- [ ] FullStory org ID configurable in CRM Settings tab

#### US-WEB-041: Self-Hosted Session Recording (rrweb)
**As a** realtor who doesn't want FullStory,
**I want** session recordings stored in my own CRM,
**So that** I have full control over visitor data.

**Acceptance Criteria:**
- [ ] SDK includes rrweb recorder (opt-in via config)
- [ ] DOM mutations recorded and sent as compressed chunks to `/api/websites/session-recording`
- [ ] Chunks stored in `site_session_recordings` table
- [ ] CRM session viewer plays back recordings using `rrweb-player`
- [ ] Sessions list: date, duration, pages, converted, contact link
- [ ] Filter by: date range, converted, pages visited
- [ ] Recording auto-stops after 30 minutes (prevent runaway storage)
- [ ] GDPR: recording can be disabled via cookie consent

#### US-WEB-042: Website Activity on Contact
**As a** realtor viewing a contact in the CRM,
**I want to** see their website browsing history,
**So that** I know what they looked at before contacting me.

**Acceptance Criteria:**
- [ ] Contact detail page shows "Website Activity" section
- [ ] Lists: pages visited, visit dates, session duration, referrer source
- [ ] Shows which listing pages they viewed (with listing cards)
- [ ] Link to full session replay (if recorded)
- [ ] Activity feeds into lead scoring (more pages = higher engagement)

---

### Epic 6: Embeddable Widgets

#### US-WEB-050: Listings Feed Widget
**As a** realtor,
**I want to** embed a live property listings feed on my website,
**So that** visitors see my current inventory without me updating the site manually.

**Acceptance Criteria:**
- [ ] `Realtors360.mountListings(elementId, options)` renders property card grid
- [ ] Options: `{ type, area, maxPrice, minPrice, limit, columns }`
- [ ] Cards show: photo, address, price, beds/baths/sqft, status badge
- [ ] Cards link to property detail (configurable URL pattern)
- [ ] Auto-refreshes when CRM listings change (polling every 5 min)
- [ ] Responsive grid (1-col mobile, 2-col tablet, 3-col desktop)
- [ ] Themed via CSS custom properties (`--lf-card-bg`, `--lf-card-text`, `--lf-accent`)
- [ ] Loading skeleton shown while fetching

#### US-WEB-051: Booking Widget
**As a** realtor,
**I want** an embeddable appointment booking form,
**So that** visitors can schedule meetings from any page.

**Acceptance Criteria:**
- [ ] `Realtors360.mountBooking(elementId)` renders booking form
- [ ] Shows: date picker, available time slots, appointment type, name/phone/email
- [ ] Checks realtor's Google Calendar for availability
- [ ] Creates contact + task in CRM on submission
- [ ] Confirmation shown inline with appointment details

#### US-WEB-052: Social Proof Ticker
**As a** realtor,
**I want** a real-time notification ticker on my website,
**So that** visitors see social proof of my activity.

**Acceptance Criteria:**
- [ ] `Realtors360.mountSocialProof(elementId)` renders notification toasts
- [ ] Shows recent CRM activity: "Sarah just booked a showing", "New listing in Kitsilano"
- [ ] Notifications appear as slide-in toasts (bottom-left)
- [ ] Data from CRM activity feed (last 24h of relevant events)
- [ ] Configurable: show/hide event types, display duration, position

#### US-WEB-053: SEO JSON-LD
**As a** website developer,
**I want to** fetch structured data for listings,
**So that** search engines can index property details properly.

**Acceptance Criteria:**
- [ ] `GET /api/websites/seo/listings` returns JSON-LD for all active listings
- [ ] `GET /api/websites/seo/agent` returns JSON-LD for RealEstateAgent schema
- [ ] Includes: @type, name, address, price, numberOfBedrooms, image, url
- [ ] Ready to paste into `<script type="application/ld+json">`

---

### Epic 7: CRM Dashboard

#### US-WEB-060: Website Dashboard Page
**As a** realtor,
**I want** a dedicated Website page in my CRM,
**So that** I can manage all website integrations from one place.

**Acceptance Criteria:**
- [ ] `/websites` route accessible from CRM navigation
- [ ] "Website" tab in nav bar under "More" menu with Globe icon
- [ ] Page has 4 tabs: Integration Codes, Analytics, Leads, Settings
- [ ] Glass header with gradient text matching CRM design system

#### US-WEB-061: Integration Codes Tab
**As a** realtor,
**I want** copy-paste embed codes for each integration,
**So that** I can set up integrations without technical knowledge.

**Acceptance Criteria:**
- [ ] 7 integration cards, each with: title, description, code snippet, copy button, status indicator
- [ ] Code snippets pre-filled with realtor's API key
- [ ] "Installed?" indicator: green check if analytics events received from a domain in last 24h
- [ ] Each card has expandable "Preview" showing what the widget looks like
- [ ] Instructions for WordPress, Squarespace, and custom HTML

#### US-WEB-062: Leads Tab
**As a** realtor,
**I want to** see all leads that came from my website,
**So that** I can follow up and track conversion.

**Acceptance Criteria:**
- [ ] Table of contacts with `source` containing "website"
- [ ] Columns: name, email/phone, source page, date, lead status, journey phase
- [ ] Click row to navigate to contact detail page
- [ ] Filter by: date range, source page, lead status
- [ ] Export to CSV button
- [ ] Count badge on tab showing new leads (last 7 days)

#### US-WEB-063: Settings Tab
**As a** realtor,
**I want to** configure my website integrations,
**So that** they work correctly with my website.

**Acceptance Criteria:**
- [ ] API key display with copy button + regenerate button (with confirmation)
- [ ] Domain whitelist: add/remove domains
- [ ] Feature toggles: Analytics, Chatbot, Newsletter, Listings Feed, Session Recording
- [ ] Chatbot config: greeting message, personality (dropdown), working hours (start/end time)
- [ ] All settings saved to `realtor_sites` table
- [ ] Changes take effect immediately (no deploy needed)

---

## 3. Database Schema

### New Migration: `055_website_integrations.sql`

```sql
-- API key and domain config on realtor_sites
ALTER TABLE realtor_sites ADD COLUMN IF NOT EXISTS api_key text UNIQUE;
ALTER TABLE realtor_sites ADD COLUMN IF NOT EXISTS allowed_domains text[] DEFAULT '{}';
ALTER TABLE realtor_sites ADD COLUMN IF NOT EXISTS chatbot_config jsonb DEFAULT '{}';
ALTER TABLE realtor_sites ADD COLUMN IF NOT EXISTS integrations_enabled jsonb
  DEFAULT '{"chat":true,"newsletter":true,"analytics":true,"listings":true,"recording":false}';

-- Analytics events
CREATE TABLE IF NOT EXISTS site_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES realtor_sites(id),
  session_id text NOT NULL,
  event_type text NOT NULL,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sae_site ON site_analytics_events(site_id);
CREATE INDEX idx_sae_created ON site_analytics_events(created_at);
CREATE INDEX idx_sae_session ON site_analytics_events(session_id);
CREATE INDEX idx_sae_type ON site_analytics_events(event_type);

-- Visitor sessions
CREATE TABLE IF NOT EXISTS site_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES realtor_sites(id),
  session_id text UNIQUE NOT NULL,
  contact_id uuid REFERENCES contacts(id),
  device_type text,
  referrer text,
  utm_source text,
  pages_visited text[] DEFAULT '{}',
  duration_seconds int,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  is_converted boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'
);

-- Session recordings (rrweb)
CREATE TABLE IF NOT EXISTS site_session_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  chunk_index int NOT NULL,
  events jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ssr_session ON site_session_recordings(session_id);
```

---

## 4. API Specification

### Authentication
All `/api/websites/*` endpoints require `X-LF-Key` header with valid API key.

### Rate Limits
- Analytics: 1000 events/minute
- Lead/Newsletter/Booking: 60 requests/minute
- Chat: 20 messages/session, 100/day
- Listings: 120 requests/minute

### Error Responses
```json
{ "error": "Invalid API key", "code": "INVALID_KEY" }        // 401
{ "error": "Domain not whitelisted", "code": "CORS_DENIED" } // 403
{ "error": "Rate limit exceeded", "code": "RATE_LIMIT" }     // 429
{ "error": "Missing required field: name", "code": "VALIDATION" } // 422
```

---

## 5. SDK API Reference

```javascript
// Auto-initialized from script tag
// <script src=".../realtors360.js" data-key="lf_xxx"></script>

// Analytics
Realtors360.trackPageView()                    // Auto-called on load
Realtors360.trackEvent("listing_click", { listing_id: "xxx", page: "/properties" })

// Lead capture
Realtors360.submitLead({ name, phone, email, message, source_page })

// Widgets
Realtors360.mountChat("chat-container")        // AI chatbot
Realtors360.mountNewsletter("newsletter-div")  // Email signup
Realtors360.mountListings("listings-div", { type: "condo", limit: 6 })
Realtors360.mountBooking("booking-div")        // Appointment form

// Configuration
Realtors360.configure({ theme: { accent: "#c9a96e" } })
```

---

## 6. Security Considerations

- API keys transmitted via HTTPS only
- CORS restricted to whitelisted domains
- Rate limiting on all endpoints
- Input sanitization on all user-submitted data (XSS prevention)
- No PII stored in analytics events (session ID only, no IP addresses)
- CASL consent required for newsletter signup
- Session recordings respect cookie consent (opt-in only)
- API keys hashed in database (bcrypt)

---

## 7. Sprint Dependencies

```
Sprint 1 (APIs + SDK) → Sprint 2 (Dashboard) → Sprint 3 (Chatbot)
                                              → Sprint 4 (Analytics)
                                              → Sprint 5 (Sessions)
                                              → Sprint 6 (Widgets)
```

Sprints 3-6 can run in parallel after Sprint 2.

---

## 8. Test Plan Summary

| Category | Test Cases | Script |
|----------|-----------|--------|
| API Endpoints | 28 cases | Automated: `scripts/test-website-api.mjs` |
| SDK Loading | 8 cases | Manual: load on test HTML page |
| Lead Capture | 12 cases | Automated: API + DB verification |
| Newsletter | 8 cases | Automated: API + journey enrollment |
| Chatbot | 15 cases | Manual: conversation flows |
| Analytics | 10 cases | Automated: event ingestion + dashboard |
| Session Recording | 8 cases | Manual: record + replay |
| Widgets | 12 cases | Manual: mount on test page |
| Dashboard UI | 16 cases | Automated: page loads + tab content |
| Security | 10 cases | Automated: auth, CORS, rate limits |
| **Total** | **127 cases** | |

Full test cases to be added to `docs/TEST_PLAN_1000.md` under category `WEB`.
