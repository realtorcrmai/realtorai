# ListingFlow CRM — Comprehensive Evaluation Tests

**Last Updated:** March 2026
**Total Test Cases:** 142
**Coverage:** All 12 feature areas, 54 pages, 28 API routes, 45+ server actions

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

## 6. Newsletter & Journey Engine (22 tests)

| # | Test | Steps | Expected Result | Status |
|---|------|-------|----------------|--------|
| 6.1 | Newsletter dashboard | Navigate to `/newsletters` | Pipeline health, stats, recent activity render | |
| 6.2 | Buyer pipeline counts | Dashboard → Buyer Pipeline | Shows correct counts per phase (lead/active/etc) | |
| 6.3 | Seller pipeline counts | Dashboard → Seller Pipeline | Shows correct counts per phase | |
| 6.4 | Guide button | Dashboard → click "Guide" | Navigates to `/newsletters/guide` | |
| 6.5 | Walkthrough wizard | `/newsletters/guide` | 8-step wizard with Next/Previous buttons working | |
| 6.6 | Walkthrough navigation | Click step dots | Jumps to correct step | |
| 6.7 | Approval queue empty | `/newsletters/queue` (no drafts) | "All caught up!" message | |
| 6.8 | Generate newsletter | Create contact → auto-enroll → trigger journey | Newsletter draft appears in queue | |
| 6.9 | Preview email | Queue → click email card | Preview iframe shows rendered HTML | |
| 6.10 | Approve & send | Queue → click "Send" | Email sent via Resend, removed from queue | |
| 6.11 | Skip email | Queue → click "Skip" | Email skipped, removed from queue | |
| 6.12 | Bulk approve | Queue → click "Approve All" | All emails sent, queue cleared | |
| 6.13 | Analytics page | `/newsletters/analytics` | Shows sent/opens/clicks/bounces, brand score | |
| 6.14 | Performance by type | Analytics → table | Per-email-type breakdown (sent, opens, clicks, CTR) | |
| 6.15 | Unsubscribe | `GET /api/newsletters/unsubscribe?id=<contactId>` | Confirmation page, contact flagged | |
| 6.16 | Resend webhook: open | `POST /api/webhooks/resend` with email.opened | Event logged, contact intelligence updated | |
| 6.17 | Resend webhook: click | Webhook with email.clicked + link URL | Click logged, link classified, intelligence updated | |
| 6.18 | Hot lead alert | Click on "showing" or "cma" link | Agent notification created with "Hot Lead" | |
| 6.19 | Frequency capping | Try to send 3 emails to same contact in 24h | 3rd email blocked: "Frequency cap" | |
| 6.20 | Deduplication | Same email_type + phase within 7 days | Duplicate blocked | |
| 6.21 | Journey cron | `GET /api/newsletters/process` with auth | Processes due journey emails, returns count | |
| 6.22 | Webhook signature | POST without valid signature | Returns 401 Unauthorized | |

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
| 11.8 | Health check | `GET /health` | `{"status":"ok","service":"listingflow-agent"}` | |

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
| 15.6 | Glass/gradient design | Check dashboard, newsletters | ListingFlow glassmorphism design applied | |
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
| 6. Newsletter Engine | 22 | | | |
| 7. AI Agent | 10 | | | |
| 8. Workflow Engine | 12 | | | |
| 9. Template Builder | 8 | | | |
| 10. Content Engine | 6 | | | |
| 11. Website Generator | 8 | | | |
| 12. Calendar & Forms | 6 | | | |
| 13. API Security | 8 | | | |
| 14. Data Integrity | 8 | | | |
| 15. UI/UX Quality | 8 | | | |
| **TOTAL** | **142** | | | |

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
