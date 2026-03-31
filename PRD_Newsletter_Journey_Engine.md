# PRD: AI Newsletter & Journey Engine — Realtors360 CRM

**Version:** 1.0
**Date:** March 18, 2026
**Author:** Realtors360 Team
**Status:** Approved for Implementation

---

## 1. Executive Summary

Realtors360's AI Newsletter & Journey Engine automates relationship nurturing for BC realtors. Instead of generic email blasts, the system creates **personalized, event-driven email journeys** for every contact — powered by Claude AI, sent via Resend, and adapted based on recipient behaviour (clicks, opens, replies).

**Key differentiator:** Every email is unique. Claude AI writes content using the contact's actual CRM data — their preferred area, budget, showing history, transaction stage — producing emails that feel personally written, not templated.

---

## 2. Problem Statement

Realtors face three critical challenges with newsletters:
1. **Time:** Writing personalized emails to 200+ contacts is impossible manually
2. **Relevance:** Generic market updates get low engagement (industry avg: 21% open rate)
3. **Consistency:** Most realtors send 1-2 emails then stop — no sustained nurturing

**Result:** Leads go cold, past clients forget the realtor, referrals don't happen.

---

## 3. Solution Overview

### 3.1 Architecture

```
Contact Events (CRM) ──→ Journey Engine ──→ Claude AI ──→ Resend API ──→ Email
                              ↑                                           │
                              └─── Click/Open Webhooks ←──────────────────┘
                                        │
                                        ↓
                              Contact Intelligence
                              (updates profile, adapts next email)
```

### 3.2 Core Components

| Component | Purpose | Tech |
|-----------|---------|------|
| Journey Engine | Lifecycle-aware drip sequences | Extends existing workflow engine |
| AI Content Generator | Writes unique emails per contact | Claude Sonnet API |
| Email Templates | Beautiful responsive HTML | React Email components |
| Click Tracker | Tracks every link click | Resend webhooks + redirect proxy |
| Contact Intelligence | Builds profile from behaviour | JSONB on contacts table |
| Newsletter Dashboard | Realtor's command center | Next.js pages |
| Approval Queue | Review/edit/approve AI drafts | Next.js UI |
| Analytics | Performance + revenue attribution | Supabase aggregations |

---

## 4. Feature Specifications

### 4.1 AI-Powered Email Content Generation

**How it works:**
1. Journey engine triggers an email send for a contact
2. System assembles context: contact data, listing data, click history, engagement score
3. Claude AI generates personalized subject line + email body
4. Email rendered via React Email template
5. Sent via Resend API (or queued for approval)

**AI Context Payload:**
```json
{
  "contact": { "name", "type", "area", "preferences", "engagement_score" },
  "click_history": [{ "type", "listing_id", "area", "date" }],
  "listings": { "active_in_area", "recently_sold" },
  "realtor": { "name", "brokerage", "phone" },
  "email_type": "new_listing_alert | market_update | neighbourhood_guide | ...",
  "journey_phase": "lead | active | under_contract | past_client | dormant"
}
```

**Email Types (6):**

| Type | Trigger | Content |
|------|---------|---------|
| **New Listing Alert** | Listing matches buyer preferences | Property details, photos, CTA to book showing |
| **Market Update** | Monthly schedule | Area stats, price trends, recent sales near contact |
| **Just Sold** | Listing status → sold | Sale price, days on market, celebration |
| **Open House Invite** | Showing created | Date, time, address, map, RSVP |
| **Neighbourhood Guide** | New lead enters CRM | Local spots, schools, lifestyle for their area |
| **Home Anniversary** | Annual anniversary of close | Current value estimate, maintenance tips |

### 4.2 Contact Journeys (Buyer & Seller)

Each contact is enrolled in a **lifecycle journey** based on their type and stage. The journey adapts based on events and clicks.

**Buyer Journey Phases:**

| Phase | Entry Trigger | Emails | Exit Trigger |
|-------|--------------|--------|-------------|
| Lead | Contact created (type=buyer) | Welcome, neighbourhood guide, listing digest | Showing booked |
| Active | Showing booked | Pre-showing prep, post-showing follow-up, weekly matching listings | Offer submitted |
| Under Contract | Offer accepted | Timeline, subject removal reminders, neighbourhood welcome | Deal closed |
| Past Client | Deal closed | Move-in checklist, 30-day check-in, quarterly value updates, anniversary | Re-engagement needed |
| Dormant | 60 days no interaction | "Market changed" re-engagement, different content type attempts | Reply or click |

**Seller Journey Phases:**

| Phase | Entry Trigger | Emails | Exit Trigger |
|-------|--------------|--------|-------------|
| Lead | Contact created (type=seller) | CMA preview, "why sell now", marketing plan | Listing signed |
| Active Listing | Listing created | Weekly showing summary, feedback digest, market positioning | Offer accepted |
| Under Contract | Offer accepted | "What happens next", closing prep, timeline | Deal closed |
| Past Client | Deal closed | Congratulations, quarterly neighbourhood updates, referral asks | Re-engagement needed |
| Dormant | 60 days no interaction | Re-engagement with market changes | Reply or click |

**Phase transitions are event-driven**, not time-based. The journey waits for real events (showing booked, offer accepted, deal closed) before advancing.

### 4.3 Click-Driven Adaptation

Every link in every email is tracked via Resend webhooks. Clicks update the contact's intelligence profile:

| Click Type | Signal | AI Adapts |
|-----------|--------|-----------|
| Specific listing | Interest in property type/area/price | Narrow future listings |
| "Book showing" CTA | Hot lead, ready to act | Alert realtor, shift phase |
| Market data/stats | Analytical buyer | More data-heavy content |
| School/family info | Family priorities | Highlight school catchments |
| Multiple clicks same email | Highly engaged | Increase frequency |
| Zero clicks (3+ emails) | Disengaged | Change content type, reduce frequency |

**Contact Intelligence (JSONB on contacts):**
```json
{
  "engagement_score": 72,
  "total_opens": 14,
  "total_clicks": 8,
  "last_opened": "2026-03-15",
  "last_clicked": "2026-03-15",
  "click_history": [
    { "email_id": "uuid", "link_type": "listing", "listing_id": "uuid", "area": "Kitsilano", "clicked_at": "..." }
  ],
  "inferred_interests": {
    "areas": ["Kitsilano", "Point Grey"],
    "property_types": ["condo"],
    "price_range": [800000, 950000],
    "lifestyle_tags": ["family", "schools"]
  },
  "optimal_send_day": "Tuesday",
  "optimal_send_time": "09:00",
  "content_preference": "data_driven",
  "email_frequency": "weekly"
}
```

### 4.4 Realtor Dashboard

**Pipeline Health:**
- Contact funnel by phase (lead → active → contract → closed)
- Month-over-month growth
- Stuck/cold contact alerts

**Brand Reach:**
- Emails sent, open rate, click rate, engagement trend
- Best performing email types
- Channel breakdown (email, SMS, WhatsApp)
- Brand Score (composite 0-100)

**Revenue Attribution:**
- Deals closed with AI journey touchpoint timeline
- AI-influenced GCI (gross commission income)
- ROI calculation

**Today's Actions:**
- Hot leads (high click activity)
- Pending approvals (AI drafts to review)
- Going cold (need attention)
- Upcoming milestones (anniversaries, expiries)

### 4.5 Approval Queue

Realtors choose between two modes:
- **Review mode:** AI generates drafts, realtor approves each before sending
- **Auto-send mode:** AI generates and sends automatically

Approval queue shows:
- Contact name + journey phase
- AI-generated subject + preview
- [Approve & Send] [Edit] [Skip] actions

### 4.6 Unsubscribe & CASL Compliance

- Every email includes unsubscribe link
- `List-Unsubscribe` header for one-click unsubscribe
- Unsubscribe webhook updates contact record
- CASL consent tracking with expiry dates
- Suppression list for bounced/unsubscribed contacts

---

## 5. Technical Specifications

### 5.1 New Dependencies

```
resend                    — Email sending API
@react-email/components   — Email template components
```

### 5.2 New Database Tables

**`newsletters`** — Email drafts and sends
```sql
id, contact_id, journey_phase, email_type, subject, html_body,
status (draft|approved|sent|failed), sent_at, resend_message_id,
ai_context (JSONB), created_at
```

**`newsletter_templates`** — React Email template registry
```sql
id, slug, name, description, email_type, default_subject,
preview_image_url, is_active, created_at
```

**`newsletter_events`** — Open/click/bounce tracking
```sql
id, newsletter_id, contact_id, event_type (opened|clicked|bounced|unsubscribed),
link_url, link_type, metadata (JSONB), created_at
```

**`contact_journeys`** — Journey enrollment and phase tracking
```sql
id, contact_id, journey_type (buyer|seller), current_phase,
phase_entered_at, next_email_at, send_mode (auto|review),
is_paused, metadata (JSONB), created_at, updated_at
```

### 5.3 Modified Tables

**`contacts`** — Add `newsletter_intelligence` JSONB column
**`communications`** — Add `newsletter_id` FK for attribution

### 5.4 New API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/newsletters/send` | POST | Send or queue a newsletter |
| `/api/newsletters/preview` | POST | Generate AI preview without sending |
| `/api/newsletters/approve` | POST | Approve a queued draft |
| `/api/webhooks/resend` | POST | Handle Resend open/click/bounce webhooks |
| `/api/newsletters/analytics` | GET | Fetch newsletter performance stats |

### 5.5 New Server Actions

```
actions/newsletters.ts
  - generateNewsletterContent(contactId, emailType, journeyPhase)
  - sendNewsletter(newsletterId)
  - approveNewsletter(newsletterId)
  - skipNewsletter(newsletterId)
  - getApprovalQueue()
  - getNewsletterAnalytics(dateRange)

actions/journeys.ts
  - enrollContactInJourney(contactId, journeyType)
  - advanceJourneyPhase(contactId, newPhase)
  - pauseJourney(contactId)
  - resumeJourney(contactId)
  - processJourneyQueue() — cron-driven
  - getJourneyDashboard()
```

### 5.6 New Pages

| Page | Purpose |
|------|---------|
| `/newsletters` | Newsletter dashboard (pipeline, brand reach, actions) |
| `/newsletters/queue` | Approval queue for AI-generated drafts |
| `/newsletters/analytics` | Performance analytics + revenue attribution |
| `/newsletters/templates` | Template gallery + preview |

### 5.7 React Email Templates

6 pre-built templates in `src/emails/`:
- `NewListingAlert.tsx`
- `MarketUpdate.tsx`
- `JustSold.tsx`
- `OpenHouseInvite.tsx`
- `NeighbourhoodGuide.tsx`
- `HomeAnniversary.tsx`

All templates use realtor branding (colors, logo, headshot) from their profile.

### 5.8 Environment Variables

```
RESEND_API_KEY=           — Resend API key
RESEND_FROM_EMAIL=        — Verified sender domain
RESEND_WEBHOOK_SECRET=    — Webhook signature verification
```

---

## 6. Integration with Existing Systems

| Existing System | Integration |
|----------------|-------------|
| Workflow Engine | Journey phases use workflow_enrollments for scheduling |
| Gmail API | Fallback sender if Resend unavailable |
| Twilio | SMS/WhatsApp notifications for hot lead alerts |
| Claude AI | Content generation for every email |
| Contact Actions | createContact triggers journey enrollment |
| Listing Actions | listing status changes trigger phase transitions |
| Showing Actions | showing booked/completed triggers buyer phase shifts |
| Activity Log | All newsletter sends logged |
| Communications | All emails logged with newsletter_id |

---

## 7. Success Metrics

| Metric | Target | Industry Avg |
|--------|--------|-------------|
| Email open rate | >50% | 21% |
| Click rate | >15% | 2.5% |
| Lead-to-showing conversion | >30% | ~10% |
| Past client referral rate | >15% | ~5% |
| Realtor time spent on newsletters | <5 min/week | 3-5 hours/week |
| AI-influenced deal attribution | >25% of GCI | N/A |

---

## 8. Phased Rollout

**Phase 1 (This Build):**
- Resend integration + React Email templates
- AI content generation for 6 email types
- Buyer + Seller journey engine with 5 phases each
- Click tracking + contact intelligence
- Newsletter dashboard + approval queue
- Basic analytics (opens, clicks, sends)

**Phase 2 (Future):**
- Revenue attribution (connect deals to journey touchpoints)
- A/B testing subject lines
- Optimal send time per contact
- Realtor tone learning from past emails
- Advanced analytics dashboard

**Phase 3 (Future):**
- Multi-language support (English/French/Mandarin/Punjabi)
- SMS newsletter variants
- Referral program automation
- Integration with website lead capture
