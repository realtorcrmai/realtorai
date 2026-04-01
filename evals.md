# Realtors360 CRM — Comprehensive Evaluation Tests

**Last Updated:** March 2026
**Total Test Cases:** 200
**Coverage:** All 15 feature areas, 54 pages, 28 API routes, 45+ server actions
**Newsletter Engine:** 80 tests (expanded from 22) covering generation, queue, frequency caps, webhooks, intelligence, journeys, AI content, unsubscribe, analytics

---

## How to Run

Each test is a manual verification. Navigate to the URL, perform the action, verify the expected result.

**Prerequisites:**
- Dev server running: `npm run dev` at `http://localhost:3000`
- Supabase connected with migrations applied
- `.env.local` configured with all required keys
- Demo login: `demo@realestatecrm.com` / `demo1234`

**Legend:**
- [P] = Pass
- [F] = Fail
- [S] = Skip (dependency not met)
- [B] = Blocked (known issue)

---

## 1. Authentication & Session (8 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 1.1 | Demo login | Go to `/login`, enter demo credentials, click Login | Redirects to dashboard, session shows `demo@realestatecrm.com` | |
| 1.2 | Session persistence | Login, close tab, reopen `/` | Still logged in (JWT not expired) | |
| 1.3 | Logout | Click user menu → Logout | Redirects to `/login`, session cleared | |
| 1.4 | Protected routes | Without login, navigate to `/contacts` | Redirects to `/login` | |
| 1.5 | Admin access | Login as admin, navigate to `/admin` | Admin page loads with user management | |
| 1.6 | Non-admin blocked from /admin | Login as non-admin, navigate to `/admin` | Redirects to `/` | |
| 1.7 | Enabled features in session | `GET /api/auth/session` | Response includes `enabledFeatures` array with "newsletters" | |
| 1.8 | Google OAuth flow | Click "Sign in with Google" on login | Redirects to Google consent, returns to dashboard | |

---

## 2. Dashboard (12 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 2.1 | Dashboard loads | Navigate to `/` | Greeting, quick stats, pipeline snapshot, feature tiles render | |
| 2.2 | Pipeline snapshot | Dashboard → Pipeline section | Shows 5 stages (New → Closed) with contact counts | |
| 2.3 | Quick stats strip | Dashboard → Stats row | Shows Active Deals, Closed This Month, Earned GCI, Open Tasks | |
| 2.4 | Feature tiles visible | Dashboard → "Your Workspace" | All enabled feature tiles render with correct icons/gradients | |
| 2.5 | Newsletters tile | Dashboard → Feature tiles | "Newsletters" tile visible, links to `/newsletters` | |
| 2.6 | Website tile | Dashboard → Feature tiles | "Website Marketing" tile visible, links to `localhost:8768` | |
| 2.7 | Tasks banner | Dashboard (with pending tasks) | Today's Tasks section shows up to 3 tasks with priorities | |
| 2.8 | AI Recommendations | Dashboard (with scored contacts) | AI Recommendations card shows with priority badges and action buttons | |
| 2.9 | Recommendation: Dismiss | Click "Dismiss" on a recommendation | Card removed from dashboard | |
| 2.10 | Recommendation: Accept | Click action button (Call/Send Email/Advance) | Action executed, card removed | |
| 2.11 | Mortgage renewal alerts | Dashboard (with upcoming renewals) | Mortgage renewal cards show with days countdown | |
| 2.12 | Reminders widget | Dashboard → bottom section | Reminders widget renders | |

---

## 3. Contacts (16 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 3.1 | Contact list loads | Navigate to `/contacts` | Contact cards render with name, type, stage | |
| 3.2 | Search contacts | Type name in search bar | List filters in real-time | |
| 3.3 | Filter by type | Click "Buyers" / "Sellers" filter | Only matching contacts shown | |
| 3.4 | Create contact | Click "Add Contact" → fill form → save | Contact created, redirects to detail page | |
| 3.5 | Contact detail page | Click a contact | Detail page loads with all tabs (Overview, Activity, Workflow) | |
| 3.6 | Edit contact | Edit name/phone/email on detail page | Changes saved, page refreshes | |
| 3.7 | Send SMS | Detail page → Quick Actions → Send Message | Message sent via Twilio, logged in timeline | |
| 3.8 | Send email | Detail page → Email Composer → Send | Email sent via Gmail, logged in timeline | |
| 3.9 | Communication timeline | Detail page → Activity tab | All messages (SMS, email, notes) in chronological order | |
| 3.10 | Contact lifecycle stage | Detail page → Stage bar | Shows correct stage (new/qualified/active/etc) | |
| 3.11 | Family members | Detail page → Family section | Family members display with relationship | |
| 3.12 | Buyer preferences | Buyer detail → Preferences tab | Price range, bedrooms, areas, property types shown | |
| 3.13 | Network stats | Detail page → Network card | Shows referral count, household info | |
| 3.14 | Segments page | Navigate to `/contacts/segments` | Segment list loads, "New Segment" button visible | |
| 3.15 | Create segment | New Segment → type=buyer, stage=qualified → Create | Segment created with correct contact count | |
| 3.16 | Evaluate segment | Click "Refresh Count" on segment | Count updates based on current matching contacts | |

---

## 4. Listings (12 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 4.1 | Listing list loads | Navigate to `/listings` | Listing cards render with address, price, status | |
| 4.2 | Create listing | "Add Listing" → fill form → save | Listing created, redirects to detail | |
| 4.3 | Listing detail page | Click a listing | Detail page loads with workflow stepper | |
| 4.4 | Workflow stepper | Detail → Workflow section | 8 steps shown with progress bar | |
| 4.5 | Step expansion | Click a completed/in-progress step | Step expands showing data panel | |
| 4.6 | Editable fields | Expand step → click edit on a field | Inline edit works, saves to DB | |
| 4.7 | Document upload | Workflow → upload document | Document appears in documents list | |
| 4.8 | Form generation | Workflow → Phase 5 → Generate form | Form generated via Python server | |
| 4.9 | MLS remarks | Workflow → Phase 7 → Generate remarks | Claude AI generates public + REALTOR remarks | |
| 4.10 | Listing status change | Change status (active → pending → sold) | Status updates, workflow advances | |
| 4.11 | Data enrichment | Workflow → Phase 2 | BC Geocoder/ParcelMap data fields display | |
| 4.12 | Sold banner | Listing with status=sold | Sold banner appears with deal link | |

---

## 5. Showings (8 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 5.1 | Showings list | Navigate to `/showings` | Showing cards render with status badges | |
| 5.2 | Create showing | New showing → fill buyer agent + time | Showing created, SMS sent to seller | |
| 5.3 | Showing detail | Click a showing | Detail page with communication timeline | |
| 5.4 | Confirm showing | Seller responds YES via SMS | Status changes to confirmed, lockbox code sent | |
| 5.5 | Deny showing | Seller responds NO | Status changes to denied | |
| 5.6 | Calendar integration | Confirmed showing | Google Calendar event created | |
| 5.7 | Twilio webhook | Inbound SMS YES/NO | `/api/webhooks/twilio` processes correctly | |
| 5.8 | Status actions | Admin changes showing status | Status updates, notifications sent | |

---

## 6. Newsletter & Journey Engine (68 tests)

### 6A. Newsletter Generation & Sending (12 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 6.1 | Generate draft (review mode) | `generateAndQueueNewsletter(contactId, "market_update", "lead", null, "review")` | Newsletter status="draft", html_body populated, ai_context saved | |
| 6.2 | Generate auto-send | Same with sendMode="auto" | Status="approved"→"sent", sent_at set, resend_message_id set | |
| 6.3 | Send via Resend | `sendNewsletter(id)` | Status="sending"→"sent", communications logged, messageId returned | |
| 6.4 | Send failure handling | Resend API returns error | Status="failed", error_message saved, no crash | |
| 6.5 | Email validation | `sendEmail({ to: "not-an-email" })` | Error "Invalid email address" thrown | |
| 6.6 | Retry on 429 | Resend returns 429, then succeeds | Retry with backoff (1s→2s→4s), eventual success | |
| 6.7 | Retry exhaustion | Resend returns 503 on all 3 attempts | Error thrown after final attempt | |
| 6.8 | Batch send (10 per batch) | `sendBatchEmails(25 emails)` | 3 batches, 500ms delay between, returns {sent, failed} | |
| 6.9 | Contact no email | Generate for contact with email=null | Error "Contact not found or has no email" | |
| 6.10 | Unsubscribed contact | Generate for unsubscribed contact | Error "Contact is unsubscribed" | |
| 6.11 | No active listings | Generate listing_alert with 0 listings in DB | listings=[] in context, email still generated | |
| 6.12 | List-Unsubscribe header | Check sent email headers | `List-Unsubscribe` and `List-Unsubscribe-Post` present | |

### 6B. Approval Queue (8 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 6.13 | Queue empty state | `/newsletters/queue` with no drafts | "All caught up!" message | |
| 6.14 | Queue shows drafts | Queue with 5 drafts | All 5 shown with contact name, subject, type badge | |
| 6.15 | Preview email | Click email card in queue | Preview iframe opens with rendered HTML | |
| 6.16 | Approve & send | Click "Send" button | Email sent, removed from queue, loading state shown | |
| 6.17 | Skip email | Click "Skip" button | Status="skipped", removed from queue | |
| 6.18 | Bulk approve all | Click "Approve All" (5 items) | All 5 sent, queue empty | |
| 6.19 | Loading state prevents double-click | Click "Send", rapidly click again | Button disabled during send, no duplicate | |
| 6.20 | Close preview | Click X on preview panel | Preview panel dismissed | |

### 6C. Frequency & Deduplication (6 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 6.21 | Frequency cap (2 per 24h) | Send 2 emails, try 3rd within 24h | 3rd blocked: "Frequency cap" | |
| 6.22 | Frequency cap counts drafts | 1 draft + 1 sent in 24h, try 3rd | Blocked (drafts count toward cap) | |
| 6.23 | Dedup same type+phase (7 days) | Send market_update/lead, try again in 3 days | Blocked: "Duplicate" | |
| 6.24 | Dedup allows different type | Send market_update, then new_listing_alert (same phase) | Both succeed | |
| 6.25 | Frequency cap expires after 24h | Email 24h 1min ago → send new | Allowed (outside window) | |
| 6.26 | Dedup expires after 7 days | Same type 7 days 1min ago → send | Allowed (outside window) | |

### 6D. Webhook Processing (14 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 6.27 | Signature verification (valid) | POST with correct Svix HMAC-SHA256 | Event processed, 200 OK | |
| 6.28 | Signature verification (invalid) | POST with tampered body | 401 Unauthorized | |
| 6.29 | Signature skip (no secret configured) | RESEND_WEBHOOK_SECRET unset | Event still processed | |
| 6.30 | email.delivered event | Webhook type=email.delivered | newsletter_events row created, event_type="delivered" | |
| 6.31 | email.opened event | Webhook type=email.opened | Event logged, total_opens++, last_opened set | |
| 6.32 | email.clicked event | Webhook with click.link URL | Event logged, link classified, total_clicks++ | |
| 6.33 | Link classification: listing | URL contains "/listings/" | link_type="listing" | |
| 6.34 | Link classification: showing | URL contains "book" or "showing" | link_type="showing" | |
| 6.35 | Link classification: cma | URL contains "valuation" or "cma" | link_type="cma" | |
| 6.36 | email.bounced event | Webhook type=email.bounced | Contact marked unsubscribed, journeys paused reason="bounced" | |
| 6.37 | email.complained event | Webhook type=email.complained | Contact unsubscribed, journeys paused reason="complained" | |
| 6.38 | Dedup (same event within 60s) | Send same click event twice in 60s | Second ignored, only 1 row created | |
| 6.39 | Hot lead alert: showing click | Click link_type="showing" | agent_notifications row with type="urgent" | |
| 6.40 | Hot lead alert: cma click | Click link_type="cma" | agent_notifications row created | |

### 6E. Contact Intelligence (10 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 6.41 | Engagement score calculation | 10 opens, 5 clicks, clicked 3 days ago | Score = min(100, 20+15+15) = 50 | |
| 6.42 | Click history truncation | 51 clicks → add 1 more | Only last 50 retained | |
| 6.43 | Inferred interest: family | Click school_info link | lifestyle_tags includes "family" | |
| 6.44 | Inferred interest: active_searcher | Click listing link | lifestyle_tags includes "active_searcher" | |
| 6.45 | Content preference: data_driven | Click market_report link | content_preference = "data_driven" | |
| 6.46 | Content preference: lifestyle | Click neighbourhood link | content_preference = "lifestyle" | |
| 6.47 | Area extraction from URL | Click /listings/kitsilano-abc | inferred_interests.areas includes URL slug | |
| 6.48 | Score recency bonus (7 days) | Clicked within last 7 days | +15 recency bonus | |
| 6.49 | Score recency bonus (30 days) | Last click 15 days ago | +10 recency bonus | |
| 6.50 | Score recency (no clicks) | Never clicked | +0 recency bonus | |

### 6F. Journey Enrollment & Phases (12 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 6.51 | Enroll buyer in journey | `enrollContactInJourney(id, "buyer")` | Phase="lead", next_email_at=now (welcome at 0h) | |
| 6.52 | Enroll seller in journey | `enrollContactInJourney(id, "seller")` | Phase="lead", next_email_at=now | |
| 6.53 | Duplicate enrollment blocked | Enroll same contact twice | Error "already enrolled" | |
| 6.54 | Advance to active | `advanceJourneyPhase(id, "buyer", "active")` | Phase="active", emails_sent_in_phase reset to 0 | |
| 6.55 | Advance to past_client | Advance to past_client | Next email = home_anniversary at 720h | |
| 6.56 | Advance to dormant | Advance to dormant | Next email = reengagement at 0h | |
| 6.57 | Empty phase (seller under_contract) | Advance seller to under_contract | next_email_at=null (no emails for this phase) | |
| 6.58 | Pause journey | `pauseJourney(id, "buyer", "taking a break")` | is_paused=true, pause_reason set | |
| 6.59 | Resume journey | `resumeJourney(id, "buyer")` | is_paused=false, next_email_at=now | |
| 6.60 | Cron processes due emails | Set next_email_at to past, run cron | Newsletter generated, emails_sent_in_phase++ | |
| 6.61 | Cron skips paused journeys | Pause journey, run cron | Paused contact skipped | |
| 6.62 | Cron skips unsubscribed | Unsubscribe contact, run cron | Unsubscribed contact skipped | |

### 6G. AI Content Generation (8 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 6.63 | Valid JSON parsed | Claude returns clean JSON | GeneratedContentSchema validates, content used | |
| 6.64 | JSON in markdown fences | Claude returns ```json {...} ``` | Fences stripped, JSON extracted | |
| 6.65 | Invalid JSON fallback | Claude returns plain text | Fallback: generic subject, raw text as body | |
| 6.66 | AI hints in prompt | Contact has ai_lead_score.personalization_hints | Hints block appears in system prompt | |
| 6.67 | No AI hints | ai_lead_score is null | Email generated without hints block | |
| 6.68 | Buyer preferences in context | Contact has price_range, bedrooms | Preferences included in user prompt | |
| 6.69 | Click history in context | Contact has 5 recent clicks | Last 5 clicks included in prompt | |
| 6.70 | Model override | Set NEWSLETTER_AI_MODEL env var | Custom model used for generation | |

### 6H. Unsubscribe (4 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 6.71 | Unsubscribe via link | `GET /api/newsletters/unsubscribe?id=<contactId>` | HTML confirmation, contact flagged, journeys paused, activity logged | |
| 6.72 | Unsubscribe without ID | `GET /api/newsletters/unsubscribe` (no ?id=) | 400 Bad Request | |
| 6.73 | Unsubscribe invalid ID | `GET /api/newsletters/unsubscribe?id=fake-uuid` | 404 Not Found | |
| 6.74 | Unsubscribed blocks sends | After unsubscribe, try generateAndQueueNewsletter | Error "Contact is unsubscribed" | |

### 6I. Dashboard & Analytics (8 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 6.75 | Dashboard loads | Navigate to `/newsletters` | Pipeline, stats, recent activity render | |
| 6.76 | Guide link | Click "Guide" button | Navigates to `/newsletters/guide` | |
| 6.77 | Walkthrough navigation | `/newsletters/guide` → Next/Previous/dots | All 8 steps accessible, progress bar updates | |
| 6.78 | Analytics page | `/newsletters/analytics` | Sent, opens, clicks, bounces, brand score displayed | |
| 6.79 | Open rate calculation | 100 sent, 45 opened | openRate = 45% | |
| 6.80 | Click rate calculation | 100 sent, 12 clicked | clickRate = 12% | |

---

## 7. AI Agent Layer (10 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 7.1 | Lead scoring cron | `GET /api/cron/agent-scoring` with CRON_SECRET | Contacts scored, ai_lead_score JSONB populated | |
| 7.2 | Score structure | Check scored contact in Supabase | buying_readiness, timeline_urgency, budget_fit, intent, reasoning present | |
| 7.3 | Personalization hints | Score → check personalization_hints | tone, interests, hot_topic, avoid fields present | |
| 7.4 | Stage recommendation | Score with advance recommendation | agent_recommendations row created | |
| 7.5 | Send advisor (enabled) | Set AI_SEND_ADVISOR=true, trigger workflow email | ai_decision logged in workflow_step_logs | |
| 7.6 | Send advisor skip | Advisor returns "skip" | Step skipped, enrollment advances to next | |
| 7.7 | Send advisor swap | Advisor returns "swap" to different type | Email generated with swapped type | |
| 7.8 | Recommendations cron | `GET /api/cron/agent-recommendations` | 3-5 recommendations generated and saved | |
| 7.9 | Recommendations expire | Wait 24h (or manually set expires_at) | Old recommendations auto-expired | |
| 7.10 | Cron auth | Call cron without CRON_SECRET | Returns 401 | |

---

## 8. Workflow Engine (12 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 8.1 | Workflow list | Navigate to `/automations` | All workflows listed with step counts | |
| 8.2 | Workflow detail | Click a workflow | Steps displayed in order | |
| 8.3 | ai_email step | Create workflow with ai_email step, enroll contact | Claude generates email, saved as draft or sent | |
| 8.4 | auto_email via Resend | Trigger auto_email step | Sent via Resend (not Gmail), message ID logged | |
| 8.5 | Resend fallback to Gmail | Disable RESEND_API_KEY, trigger auto_email | Falls back to Gmail, still sends | |
| 8.6 | Unified cron | `GET /api/cron/process-workflows` | Processes all due enrollments (both old + new types) | |
| 8.7 | Step advancement | After successful step | Enrollment advances to next step, next_run_at calculated | |
| 8.8 | Workflow completion | All steps executed | Enrollment status = "completed" | |
| 8.9 | Manual enrollment | Enroll contact in workflow via API | Enrollment created, first step scheduled | |
| 8.10 | Visual editor | `/automations/workflows/[id]/edit` | React Flow canvas loads with existing steps as nodes | |
| 8.11 | Add node | Drag node from palette | Node appears on canvas, auto-connected | |
| 8.12 | Save & publish | Click "Save & Publish" | flow_json saved, workflow_steps updated | |

---

## 9. Email Template Builder (8 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 9.1 | Template library | Navigate to `/automations/templates` | Template cards render with AI badges | |
| 9.2 | Category filter | Click filter tab (listing/market/etc) | Templates filtered by category | |
| 9.3 | Edit template | Click "Edit" on template | Editor opens with name, subject, body, variable sidebar | |
| 9.4 | Insert variable | Click `{{contact_name}}` in sidebar | Variable inserted at cursor position | |
| 9.5 | Save template | Edit content → click Save | "Saved" confirmation, changes persisted | |
| 9.6 | Preview template | Click "Preview" | Preview iframe shows rendered email with sample data | |
| 9.7 | Duplicate template | Duplicate an existing template | Copy created with "(Copy)" suffix | |
| 9.8 | AI template badge | View AI-generated templates | Purple "AI" badge shown | |

---

## 10. Content Engine (6 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 10.1 | Content page | Navigate to `/content` | Content stepper (Prompts → Generate → Gallery) | |
| 10.2 | Generate prompts | Select listing → Generate prompts | Claude generates video, image, caption prompts | |
| 10.3 | MLS remarks | Generate MLS remarks for listing | Public + REALTOR remarks (max 500 chars each) | |
| 10.4 | Image generation | Start Kling image generation | Task created, polling begins | |
| 10.5 | Video generation | Start Kling video generation | Task created, polling for completion | |
| 10.6 | Gallery | View generated assets | Gallery shows images/videos with download links | |

---

## 11. Website Generator — Agent (8 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 11.1 | Agent UI loads | Navigate to `http://localhost:8768` | Generate page with site selector, design prompt field | |
| 11.2 | Sites dropdown | Agent UI → Site Profile | Dropdown populated from Supabase realtor_sites | |
| 11.3 | Generate website | Select site → click Generate | Progress indicators show (Started → Researching → Generating → Previewing) | |
| 11.4 | Variant cards | Generation complete | 3 variant cards with desktop/mobile screenshots | |
| 11.5 | Preview button | Click "Preview" on variant | New tab opens with full rendered HTML site | |
| 11.6 | Approve variant | Click "Select" on variant | Variant approved, success banner shown | |
| 11.7 | Open website button | After approval → "Open Your Website" | New tab opens with approved site | |
| 11.8 | Health check | `GET /health` | `{"status":"ok","service":"realtors360-agent"}` | |

---

## 12. Calendar & Forms (6 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 12.1 | Calendar page | Navigate to `/calendar` | Calendar view loads | |
| 12.2 | Google Calendar sync | Calendar → import events | Google Calendar events displayed | |
| 12.3 | Forms page | Navigate to `/forms` | Form template list loads | |
| 12.4 | Generate BCREA form | Select listing → form type → Generate | HTML form generated via Python server | |
| 12.5 | Search page | Navigate to `/search` | Property search interface loads | |
| 12.6 | Import page | Navigate to `/import` | Excel import interface loads | |

---

## 13. API Security (8 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 13.1 | Cron without secret | `GET /api/cron/process-workflows` (no auth) | 401 Unauthorized | |
| 13.2 | Cron with secret | Same with `Authorization: Bearer <CRON_SECRET>` | 200 OK with result | |
| 13.3 | Webhook without signature | `POST /api/webhooks/resend` (no svix headers) | 401 or processes (depends on RESEND_WEBHOOK_SECRET set) | |
| 13.4 | Unsubscribe without ID | `GET /api/newsletters/unsubscribe` (no ?id=) | 400 Bad Request | |
| 13.5 | Unsubscribe with invalid ID | `GET /api/newsletters/unsubscribe?id=fake` | 404 Not Found | |
| 13.6 | Admin route protection | Non-admin → `/admin` | Redirect to `/` | |
| 13.7 | Twilio webhook | POST to `/api/webhooks/twilio` | Processes YES/NO responses | |
| 13.8 | API rate limiting | Rapid requests to cron endpoints | Handles gracefully (no double processing) | |

---

## 14. Data Integrity (8 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 14.1 | Contact deletion cascade | Delete contact with newsletters/journeys | Related records cascade deleted | |
| 14.2 | Listing deletion | Delete listing with documents/showings | Related records handled | |
| 14.3 | Newsletter dedup | Send same type to same contact twice in 7 days | Second blocked by dedup check | |
| 14.4 | Frequency cap | Send 3 emails to contact in 24h | 3rd blocked by frequency cap | |
| 14.5 | Unsubscribe honors | Unsubscribed contact → trigger newsletter | Newsletter not generated: "Contact is unsubscribed" | |
| 14.6 | Journey pause on bounce | Webhook bounce event | Contact flagged, all journeys paused | |
| 14.7 | AI score freshness | Score contact, wait 24h, re-score | New score replaces old (scored_at updated) | |
| 14.8 | Workflow step logs | Execute workflow steps | All steps logged in workflow_step_logs with results | |

---

## 15. UI/UX Quality (8 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 15.1 | Mobile responsive | Resize browser to 375px wide | All pages adapt (no horizontal scroll, nav collapses) | |
| 15.2 | Loading states | Click actions (approve, send, save) | Button shows loading state (spinner/disabled) | |
| 15.3 | Empty states | View pages with no data | Helpful empty state messages (not blank) | |
| 15.4 | Error handling | Trigger API error (e.g., bad contactId) | User-friendly error message, no crash | |
| 15.5 | Navigation | Click through all nav items | All pages load without errors | |
| 15.6 | Glass/gradient design | Check dashboard, newsletters | Realtors360 glassmorphism design applied | |
| 15.7 | Email preview iframe | Queue → preview email | Iframe renders email correctly, sandbox applied | |
| 15.8 | Walkthrough buttons | Newsletter guide → Previous/Next | Buttons visible, navigation works, progress bar updates | |

---

## Test Execution Summary

| Area | Tests | Pass | Fail | Skip |
|------|-------|------|------|------|
| 1. Auth & Session | 8 | | | |
| 2. Dashboard | 12 | | | |
| 3. Contacts | 16 | | | |
| 4. Listings | 12 | | | |
| 5. Showings | 8 | | | |
| 6A. Newsletter Generation | 12 | | | |
| 6B. Approval Queue | 8 | | | |
| 6C. Frequency & Dedup | 6 | | | |
| 6D. Webhook Processing | 14 | | | |
| 6E. Contact Intelligence | 10 | | | |
| 6F. Journey Enrollment | 12 | | | |
| 6G. AI Content Generation | 8 | | | |
| 6H. Unsubscribe | 4 | | | |
| 6I. Dashboard & Analytics | 8 | | | |
| 7. AI Agent | 10 | | | |
| 8. Workflow Engine | 12 | | | |
| 9. Template Builder | 8 | | | |
| 10. Content Engine | 6 | | | |
| 11. Website Generator | 8 | | | |
| 12. Calendar & Forms | 6 | | | |
| 13. API Security | 8 | | | |
| 14. Data Integrity | 8 | | | |
| 15. UI/UX Quality | 8 | | | |
| **TOTAL** | **200** | | | |

---

## Environment Checklist

Before running evals, verify:

- [ ] `npm run dev` server running at `localhost:3000`
- [ ] Supabase connected and all migrations applied (001-015)
- [ ] `.env.local` has all required keys (Supabase, NextAuth, Google, Twilio, Anthropic, Resend)
- [ ] `CRON_SECRET` set in `.env.local`
- [ ] `RESEND_API_KEY` set (or tests 6.10-6.22 will skip)
- [ ] `ANTHROPIC_API_KEY` set (or AI tests will skip)
- [ ] Demo account exists: `demo@realestatecrm.com` / `demo1234`
- [ ] At least 1 contact and 1 listing in database for testing
- [ ] Agent service running at `localhost:8768` (for section 11)
- [ ] Python form server at `localhost:8767` (for section 12.4)
