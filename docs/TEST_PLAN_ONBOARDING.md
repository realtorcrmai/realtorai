# TEST_PLAN_ONBOARDING.md -- Onboarding Flow Test Plan

**Version:** 1.0
**Date:** 2026-04-12
**Coverage:** 5-step onboarding wizard, checklist widget, welcome drip, NPS, empty states, new agent guide
**Total Tests:** 98

---

## 1. Unit Tests (Server Actions)

### 1.1 seedSampleData (`src/actions/onboarding.ts`)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| U-SEED-01 | Seeds 5 demo contacts for new user | Authenticated user with 0 contacts | Call `seedSampleData()` | Returns `{ success: true }`. 5 contacts created with `is_sample: true`, `source: "sample"`, `realtor_id` matching session user. | P0 |
| U-SEED-02 | Skips seeding if user already has contacts | User has >= 1 contact | Call `seedSampleData()` | Returns `{ success: true, message: "Already has contacts" }`. No new contacts created. | P0 |
| U-SEED-03 | Returns error when unauthenticated | No active session | Call `seedSampleData()` | Returns `{ error: "Not authenticated" }` | P0 |
| U-SEED-04 | Sample contacts have correct fields | Clean user | Call `seedSampleData()`, query contacts | All 5 contacts have: name, email, phone (E.164 +1604555xxxx), type (buyer/seller mix), is_sample=true, notes filled | P1 |
| U-SEED-05 | Sample contacts include buyer and seller types | Clean user | Call `seedSampleData()`, check types | At least 2 buyers and 2 sellers present | P2 |

### 1.2 clearSampleData (`src/actions/onboarding.ts`)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| U-CLEAR-01 | Deletes all sample contacts | User has sample + real contacts | Call `clearSampleData()` | Only contacts with `is_sample: true` deleted. Real contacts untouched. | P0 |
| U-CLEAR-02 | Deletes sample listings | User has sample listings | Call `clearSampleData()` | Listings with `is_sample: true` deleted | P0 |
| U-CLEAR-03 | Deletes sample tasks | User has sample tasks | Call `clearSampleData()` | Tasks with `is_sample: true` deleted | P1 |
| U-CLEAR-04 | Handles empty state gracefully | User has no sample data | Call `clearSampleData()` | Returns `{ success: true }`, no errors | P1 |
| U-CLEAR-05 | Returns error when unauthenticated | No active session | Call `clearSampleData()` | Returns `{ error: "Not authenticated" }` | P0 |
| U-CLEAR-06 | Dependency order: contacts deleted last | Sample contacts FK'd by appointments | Call `clearSampleData()` | Tasks deleted before contacts. No FK violation. | P1 |

### 1.3 advanceOnboardingStep (`src/actions/onboarding.ts`)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| U-ADV-01 | Sets onboarding_step on user record | Authenticated user at step 1 | Call `advanceOnboardingStep(2)` | `users.onboarding_step` = 2 for the user | P0 |
| U-ADV-02 | Marks onboarding complete at step >= 6 | User at step 5 | Call `advanceOnboardingStep(6)` | `users.onboarding_completed` = true. `signup_events` row created with event = "onboarding_complete". | P0 |
| U-ADV-03 | Seeds sample data on completion | User at step 5 with 0 contacts | Call `advanceOnboardingStep(6)` | `seedSampleData()` called. 5 sample contacts exist. | P0 |
| U-ADV-04 | Fires AI tasks async on completion | User at step 5 | Call `advanceOnboardingStep(6)` | `generateDashboardBriefing` and `suggestAutomations` invoked (fire-and-forget, no blocking). | P1 |
| U-ADV-05 | Step 5 does NOT trigger completion | User at step 4 | Call `advanceOnboardingStep(5)` | `onboarding_completed` remains false. No signup_events row. | P1 |
| U-ADV-06 | Returns error when unauthenticated | No active session | Call `advanceOnboardingStep(2)` | Returns `{ error: "Not authenticated" }` | P0 |

### 1.4 getOnboardingProgress (`src/actions/onboarding.ts`)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| U-PROG-01 | Returns current step and avatar | User at step 3 with avatar_url set | Call `getOnboardingProgress()` | Returns `{ step: 3, avatarUrl: "<url>" }` | P0 |
| U-PROG-02 | Defaults to step 1 for new user | User with null onboarding_step | Call `getOnboardingProgress()` | Returns `{ step: 1, avatarUrl: null }` | P0 |
| U-PROG-03 | Clamps step to range 1-6 | User with onboarding_step = 10 | Call `getOnboardingProgress()` | Returns `{ step: 6, ... }` (clamped to max 6) | P1 |
| U-PROG-04 | Returns step 1 when unauthenticated | No active session | Call `getOnboardingProgress()` | Returns `{ step: 1, avatarUrl: null }` | P1 |

### 1.5 sendDripEmail (`src/actions/drip.ts`)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| U-DRIP-01 | Sends Day 0 welcome email | New user, no drip log entry for day 0 | Call `sendDripEmail(userId, email, name, 0)` | Returns `{ sent: true, messageId: "..." }`. Email sent via Resend with subject "Welcome to Realtors360...". `welcome_drip_log` row created. | P0 |
| U-DRIP-02 | Skips if already sent for this day | User already has drip log for day 1 | Call `sendDripEmail(userId, email, name, 1)` | Returns `{ skipped: true, reason: "already sent" }` | P0 |
| U-DRIP-03 | Skips if user unsubscribed | User has `drip_unsubscribed: true` | Call `sendDripEmail(userId, email, name, 3)` | Returns `{ skipped: true, reason: "unsubscribed" }` | P0 |
| U-DRIP-04 | Behavior-aware skip: contacts already imported | User has real contacts, Day 1 (import reminder) | Call `sendDripEmail(userId, email, name, 1)` | Returns `{ skipped: true, reason: "action already done: contacts" }`. Logged as skipped in drip_log. | P0 |
| U-DRIP-05 | Behavior-aware skip: newsletter already sent | User sent a newsletter, Day 3 | Call `sendDripEmail(userId, email, name, 3)` | Returns `{ skipped: true, reason: "action already done: newsletter" }` | P1 |
| U-DRIP-06 | Behavior-aware skip: calendar connected | User connected Google Calendar, Day 5 | Call `sendDripEmail(userId, email, name, 5)` | Returns `{ skipped: true, reason: "action already done: calendar" }` | P1 |
| U-DRIP-07 | Behavior-aware skip: user upgraded (not free) | User on "professional" plan, Day 7 | Call `sendDripEmail(userId, email, name, 7)` | Returns `{ skipped: true, reason: "action already done: upgraded" }` | P1 |
| U-DRIP-08 | Renders HTML with line breaks and links | Day 0, user name "Sarah Chen" | Call `sendDripEmail(userId, email, "Sarah Chen", 0)` | Email HTML contains `<br>` for newlines and `<a href="...">` for URLs. Subject personalized. | P2 |
| U-DRIP-09 | Includes List-Unsubscribe header | Any valid drip send | Call `sendDripEmail(...)` | Email headers include `List-Unsubscribe` with correct unsubscribe URL | P1 |
| U-DRIP-10 | Returns error for non-existent day | No schedule defined for day 4 | Call `sendDripEmail(userId, email, name, 4)` | Returns `{ skipped: true, reason: "no schedule for day" }` | P2 |

### 1.6 processWelcomeDrip (`src/actions/drip.ts`)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| U-BATCH-01 | Processes users within 14-day window | 3 users: signup today, 7 days ago, 20 days ago | Call `processWelcomeDrip()` | Only first 2 users processed. User at 20 days excluded. Returns `{ processed: 2, sent: N, skipped: M }`. | P0 |
| U-BATCH-02 | Sends correct emails based on days since signup | User signed up 3 days ago | Call `processWelcomeDrip()` | Sends drip emails for days 0, 1, 2, 3 (all <= 3). Does not send day 5 or 7. | P1 |
| U-BATCH-03 | Returns zeros when no users in window | No users signed up in last 15 days | Call `processWelcomeDrip()` | Returns `{ processed: 0, sent: 0, skipped: 0 }` | P2 |

### 1.7 Personalization Actions (`src/actions/personalization.ts`)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| U-PERS-01 | savePersonalizationStep writes single field | Authenticated user | Call `savePersonalizationStep("onboarding_persona", "solo_agent")` | `users.onboarding_persona` = "solo_agent". Other fields untouched. | P0 |
| U-PERS-02 | completePersonalization sets flag | Authenticated user | Call `completePersonalization()` | `users.personalization_completed` = true | P0 |
| U-PERS-03 | getPersonalizationProgress returns resume screen | User answered persona + market (2 screens) | Call `getPersonalizationProgress()` | Returns `{ screen: 2, data: {...} }` (resume at screen index 2 = team_size) | P1 |
| U-PERS-04 | getPersonalizationProgress returns completed flag | User with personalization_completed=true | Call `getPersonalizationProgress()` | Returns `{ screen: 5, data: {...}, completed: true }` | P1 |

### 1.8 Checklist Actions (`src/actions/checklist.ts`)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| U-CHECK-01 | getChecklistItems auto-detects from DB | User has 1 real contact, 0 listings | Call `getChecklistItems()` | `first_contact` item shows `completed: true`. `first_listing` shows `completed: false`. | P0 |
| U-CHECK-02 | Checklist respects plan feature gating | User on free plan (no newsletters feature) | Call `getChecklistItems()` | `first_email` item not in returned list if newsletters not in plan features | P1 |
| U-CHECK-03 | markChecklistItem creates override | No override for "first_listing" | Call `markChecklistItem("first_listing")` | `onboarding_checklist` row created with `completed_at` set, `dismissed: false` | P0 |
| U-CHECK-04 | dismissChecklist sets __all__ flag | Checklist visible | Call `dismissChecklist()` | `onboarding_checklist` row with `item_key: "__all__"`, `dismissed: true` | P0 |
| U-CHECK-05 | Focus items sorted first | User with `onboarding_focus: ["contacts", "marketing"]` | Call `getChecklistItems()` | `first_contact` and `first_email` appear before other items | P1 |

---

## 2. Integration Tests (API Endpoints)

### 2.1 POST /api/onboarding/upload-avatar

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| I-AVATAR-01 | Uploads valid JPEG | Authenticated session | POST multipart with 100KB JPEG | 200 OK, `{ url: "https://...publicUrl" }`. `users.avatar_url` updated. | P0 |
| I-AVATAR-02 | Uploads valid PNG | Authenticated session | POST multipart with PNG file | 200 OK, `{ url: "..." }` | P1 |
| I-AVATAR-03 | Uploads valid WebP | Authenticated session | POST multipart with WebP file | 200 OK, `{ url: "..." }` | P1 |
| I-AVATAR-04 | Rejects file > 5MB | Authenticated session | POST multipart with 6MB JPEG | 400, `{ error: "Image must be under 5MB" }` | P0 |
| I-AVATAR-05 | Rejects non-image file | Authenticated session | POST multipart with .pdf file | 400, `{ error: "Only JPG, PNG, and WebP accepted" }` | P0 |
| I-AVATAR-06 | Rejects empty file | Authenticated session | POST multipart with no file | 400, `{ error: "No file provided" }` | P1 |
| I-AVATAR-07 | Rejects unauthenticated request | No session | POST multipart with JPEG | 401, `{ error: "Not authenticated" }` | P0 |
| I-AVATAR-08 | Upserts on re-upload | User already has avatar | POST multipart with new JPEG | 200 OK, `users.avatar_url` updated to new URL. Old file overwritten in storage. | P1 |

### 2.2 GET /api/onboarding/checklist

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| I-LIST-01 | Returns checklist items with status | Authenticated user with 1 contact | GET /api/onboarding/checklist | 200, `{ items: [...], dismissedAll: false, name: "..." }`. first_contact completed=true. | P0 |
| I-LIST-02 | Returns dismissedAll when checklist dismissed | User previously dismissed | GET /api/onboarding/checklist | 200, `{ dismissedAll: true }` | P1 |
| I-LIST-03 | Rejects unauthenticated | No session | GET /api/onboarding/checklist | 401, `{ error: "Not authenticated" }` | P0 |

### 2.3 POST /api/onboarding/checklist

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| I-MARK-01 | Marks item complete | Authenticated user | POST `{ item_key: "first_listing" }` | 200, `{ success: true }`. `onboarding_checklist` row upserted. | P0 |
| I-MARK-02 | Dismisses entire checklist | Authenticated user | POST `{ dismiss_all: true }` | 200, `{ success: true }`. `__all__` row with dismissed=true. | P0 |
| I-MARK-03 | Rejects invalid request body | Authenticated user | POST `{}` (no item_key, no dismiss_all) | 400, `{ error: "Invalid request" }` | P1 |

### 2.4 POST /api/onboarding/nps

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| I-NPS-01 | Saves valid NPS score | Authenticated user | POST `{ score: 4 }` | 200, `{ success: true }`. `users.onboarding_nps` = 4. | P0 |
| I-NPS-02 | Rejects score 0 | Authenticated user | POST `{ score: 0 }` | 400, `{ error: "Score must be 1-5" }` | P0 |
| I-NPS-03 | Rejects score 6 | Authenticated user | POST `{ score: 6 }` | 400, `{ error: "Score must be 1-5" }` | P0 |
| I-NPS-04 | Rejects non-number | Authenticated user | POST `{ score: "great" }` | 400, `{ error: "Score must be 1-5" }` | P1 |
| I-NPS-05 | Rejects unauthenticated | No session | POST `{ score: 3 }` | 401, `{ error: "Not authenticated" }` | P0 |

### 2.5 POST /api/cron/welcome-drip

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| I-CRON-01 | Processes drip with valid CRON_SECRET | Bearer token matches CRON_SECRET | POST with `Authorization: Bearer <secret>` | 200, `{ success: true, processed: N, sent: M, skipped: K, timestamp: "..." }` | P0 |
| I-CRON-02 | Rejects missing auth header | No auth header | POST /api/cron/welcome-drip | 401, `{ error: "Unauthorized" }` | P0 |
| I-CRON-03 | Rejects invalid token | Bearer token is wrong | POST with `Authorization: Bearer wrong` | 401, `{ error: "Unauthorized" }` | P0 |
| I-CRON-04 | GET also works (Vercel Cron compat) | Valid CRON_SECRET | GET with `Authorization: Bearer <secret>` | 200, same response format as POST | P1 |

---

## 3. Browser Tests (Playwright)

### 3.1 Onboarding Wizard Navigation

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-NAV-01 | Wizard loads at step 1 | New user, onboarding_step null | Navigate to /onboarding | Step 1 visible: "Make it yours" heading, avatar upload circle, phone input, timezone select | P0 |
| B-NAV-02 | Forward navigation step 1 to 2 | On step 1 | Click "Continue" or "Skip for now" | Step 2 visible: "Bring your contacts" heading, Google/Apple import options | P0 |
| B-NAV-03 | Forward navigation step 2 to 3 | On step 2 | Click "Continue" | Step 3 visible: "Professional details" heading, brokerage input, license input, bio textarea | P0 |
| B-NAV-04 | Forward navigation step 3 to 4 | On step 3 | Click "Continue" | Step 4 visible: MLS Connection step component | P0 |
| B-NAV-05 | Step 5 auto-completes to dashboard | On step 4 | Click continue to reach step 5 | Loading spinner shown ("Setting up your dashboard..."), then redirect to /?welcome=1 | P0 |
| B-NAV-06 | Back navigation step 3 to 2 | On step 3 | Click back arrow (top-left) | Step 2 content visible | P0 |
| B-NAV-07 | Back button hidden on step 1 | On step 1 | Inspect DOM | No back arrow button rendered | P1 |
| B-NAV-08 | Skip buttons advance to next step | On step 1 | Click "Skip for now" | Advances to step 2 without saving data | P0 |
| B-NAV-09 | Progress bar width reflects step | On step 3 of 5 | Inspect progress bar | Width = 60% (3/5 * 100) | P1 |

### 3.2 Headshot Upload (Step 1)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-HEAD-01 | Upload valid photo shows preview | On step 1 | Click avatar circle, select valid JPEG | Preview image renders inside the circle. "Change photo" text appears. | P0 |
| B-HEAD-02 | Upload > 5MB shows error | On step 1 | Select file > 5MB | Error message: "Image must be under 5MB". Avatar preview stays empty. | P0 |
| B-HEAD-03 | Upload invalid type shows error | On step 1 | Select .gif file | Error message: "Only JPG, PNG, and WebP accepted" | P1 |
| B-HEAD-04 | Loading spinner during upload | On step 1 | Select valid file, observe during upload | Spinner overlay visible on avatar circle while upload in progress | P2 |

### 3.3 Contact Import (Step 2)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-IMP-01 | Google CSV upload imports contacts | On step 2 | Click Google import, select .csv with 10 contacts | Success message: "10 contacts imported!" with check icon | P0 |
| B-IMP-02 | Apple vCard upload imports contacts | On step 2 | Click Apple import, select .vcf | Success message shows imported count | P0 |
| B-IMP-03 | Empty CSV shows error | On step 2 | Upload CSV with only headers | Error message: "No contacts found" or "No contacts found in file" | P1 |
| B-IMP-04 | Referral suggestions appear after import | On step 2, CSV has contacts matching existing names | Import CSV | Referral suggestion cards appear with "Link" and dismiss buttons | P1 |
| B-IMP-05 | Link referral button works | Referral suggestion visible | Click "Link" button | Suggestion disappears. Contact updated with referred_by_id. | P2 |

### 3.4 Sample Data Seeding

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-SEED-01 | "Skip -- use sample data" creates records | On step 2, user has 0 contacts | Click "Skip -- use sample data" | Advances to step 3. Navigate to /contacts after completing wizard: 5 sample contacts visible. | P0 |
| B-SEED-02 | Sample data visible in contacts page | Complete wizard with sample data | Navigate to /contacts | 5 contacts listed (Sarah Chen, James Patel, Lisa Wong, Michael Torres, Emily Nakamura) | P1 |

### 3.5 Dashboard Welcome Flow

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-WELC-01 | Confetti fires on ?welcome=1 | Dashboard loaded with ?welcome=1 query param | Navigate to /?welcome=1 | 5 confetti waves fire (side bursts, center explosion, side bursts, rain, final burst). Welcome banner visible. | P0 |
| B-WELC-02 | Welcome banner shows name | Session has user name "Sarah Chen" | Navigate to /?welcome=1 | Banner text: "Welcome to Realtors360, Sarah!" | P0 |
| B-WELC-03 | Banner auto-dismisses after 6 seconds | Banner visible | Wait 6 seconds | Banner fades out | P1 |
| B-WELC-04 | Dismiss button hides banner | Banner visible | Click X button on banner | Banner disappears immediately | P1 |
| B-WELC-05 | URL cleaned after confetti | ?welcome=1 in URL | Wait for confetti to fire | URL changed to "/" (welcome param removed via replaceState) | P1 |
| B-WELC-06 | Confetti only fires once per page load | ?welcome=1 | Trigger confetti, then navigate away and back | Confetti does not fire again (ref guard prevents double-fire) | P2 |

### 3.6 Checklist Widget

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-CHK-01 | Checklist appears on dashboard | User completed onboarding, checklist not dismissed | Load dashboard | Floating widget visible at bottom-right with "Getting Started" header | P0 |
| B-CHK-02 | Progress ring shows correct percentage | 2 of 5 items complete | Load dashboard | Ring SVG shows ~40% fill. Text shows "2/5 complete". | P1 |
| B-CHK-03 | Clicking item navigates to correct page | first_listing item visible | Click "Create a listing" | Navigates to /listings | P0 |
| B-CHK-04 | Completed items show green check | first_contact completed | Load checklist | Green circle with check mark next to "Add your first contact". Text has strikethrough. | P1 |
| B-CHK-05 | Confetti on 100% completion | 4/5 items complete, user completes 5th | Trigger last item completion, reload checklist | Confetti fires. "You're all set!" message visible. Auto-dismiss after 5s. | P0 |
| B-CHK-06 | Minimize/expand toggle | Checklist open | Click header area | Items collapse. Click again: items expand. | P1 |
| B-CHK-07 | Dismiss button hides permanently | Checklist visible | Click X button | Widget disappears. Reload page: still hidden (dismissedAll in DB). | P0 |
| B-CHK-08 | Hidden during onboarding wizard | User still in wizard (onboarding_completed=false) | Load any page | Checklist widget not rendered | P1 |

### 3.7 NPS Survey

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-NPS-01 | NPS widget appears after checklist 100% | All checklist items complete, no NPS score saved | Load dashboard | NPS prompt visible (1-5 buttons) | P0 |
| B-NPS-02 | Clicking score 4 saves and dismisses | NPS widget visible | Click "4" button | POST to /api/onboarding/nps with score 4. Widget dismisses. | P0 |
| B-NPS-03 | Score 1 works (boundary) | NPS widget visible | Click "1" button | Score saved successfully | P1 |
| B-NPS-04 | Score 5 works (boundary) | NPS widget visible | Click "5" button | Score saved successfully | P1 |

### 3.8 Empty States

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-EMPTY-01 | Listings empty state with CTA | User has 0 listings | Navigate to /listings | EmptyState with Building2 icon, "No listings yet" title, "Create Your First Listing" button linking to /listings/new | P0 |
| B-EMPTY-02 | Contacts empty state with CTA | User has 0 contacts | Navigate to /contacts | EmptyState with Users icon, "No contacts yet" title, "Add Your First Contact" button linking to /contacts/new | P0 |
| B-EMPTY-03 | Showings empty state with CTA | User has 0 showings | Navigate to /showings | EmptyState with CalendarDays icon, "No showings yet" title, "Schedule a Showing" button linking to /showings/new | P0 |
| B-EMPTY-04 | CTA button navigates correctly | On empty listings page | Click "Create Your First Listing" | Navigates to /listings/new | P1 |

### 3.9 New Agent Guide

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-GUIDE-01 | Guide card visible for new_agent persona | User: onboarding_persona="new_agent", 0 active listings | Load dashboard | Card with "New to real estate? Here's your roadmap" visible with 3 step links | P0 |
| B-GUIDE-02 | Guide card visible for "new" experience | User: onboarding_experience="new", 0 active listings | Load dashboard | Same roadmap card visible | P0 |
| B-GUIDE-03 | Guide hidden when user has active listings | User: new_agent persona, 2 active listings | Load dashboard | Roadmap card not rendered | P0 |
| B-GUIDE-04 | Step 1 links to /contacts/new | Guide visible | Click "Add your first client" | Navigates to /contacts/new | P1 |
| B-GUIDE-05 | Step 2 links to /listings/new | Guide visible | Click "Create a listing" | Navigates to /listings/new | P1 |
| B-GUIDE-06 | Step 3 links to /newsletters | Guide visible | Click "Set up email marketing" | Navigates to /newsletters | P1 |

### 3.10 data-tour Attributes on Sidebar

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-TOUR-01 | All nav items have data-tour attributes | Logged in, sidebar visible | Query all sidebar nav links | Each `<a>` in sidebar has `data-tour="nav-{label-lowercase-hyphenated}"` attribute | P0 |
| B-TOUR-02 | Dashboard nav has data-tour="nav-dashboard" | Sidebar visible | Query `[data-tour="nav-dashboard"]` | Exactly 1 element found | P1 |
| B-TOUR-03 | Contacts nav has data-tour="nav-contacts" | Sidebar visible | Query `[data-tour="nav-contacts"]` | Exactly 1 element found | P1 |
| B-TOUR-04 | Listings nav has data-tour="nav-listings" | Sidebar visible | Query `[data-tour="nav-listings"]` | Exactly 1 element found | P1 |

### 3.11 Onboarding Banner

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| B-BAN-01 | Banner shows incomplete checklist status | 2/5 items complete, not dismissed | Load dashboard | Banner: "Welcome back, {name}! 2 of 5 setup steps complete" with progress bar | P0 |
| B-BAN-02 | Banner shows next action link | first_listing is next incomplete | Load dashboard | "Next: Create a listing" with link to /listings | P1 |
| B-BAN-03 | Dismiss hides for 24 hours | Banner visible | Click X button | Banner disappears. localStorage "lf-banner-dismissed" set. Reload: still hidden. | P1 |
| B-BAN-04 | Banner hidden when all items complete | 5/5 items complete | Load dashboard | Banner not rendered (completed === total check) | P1 |

---

## 4. Visual Tests

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| V-01 | Onboarding gradient background | On /onboarding | Screenshot page | Background is gradient from #f4f2ff to #e8e4ff (light purple) | P1 |
| V-02 | Avatar upload circle with camera icon | Step 1, no photo uploaded | Screenshot avatar area | 112px (w-28) circle, white/80 bg, ring-4 ring-white, Camera icon centered in grey | P1 |
| V-03 | Progress bar fills proportionally | Step 3 of 5 | Screenshot top of page | 1px high gradient bar (indigo to coral), width = 60%, fixed at top | P1 |
| V-04 | Confetti animation renders 5 waves | Load /?welcome=1 | Record 5 seconds | 5 distinct confetti bursts visible: 300ms, 1200ms, 2200ms, 3200ms, 4200ms | P0 |
| V-05 | Welcome banner gradient | ?welcome=1 active | Screenshot banner | Gradient from #4f35d2 via #7c5cfc to #ff5c3a. White text. Radial highlight at top-right. | P1 |
| V-06 | Empty state styling matches design system | /listings with 0 records | Screenshot page | EmptyState component: centered icon + title + description + CTA button (brand color) | P1 |
| V-07 | NPS widget positioning | NPS visible on dashboard | Screenshot bottom-left area | Widget anchored bottom-left (or contextually positioned) | P2 |
| V-08 | Checklist progress ring SVG | Checklist open, 3/5 complete | Screenshot widget | 36px SVG ring, gradient stroke (indigo to coral), 60% filled, round linecaps | P1 |
| V-09 | Onboarding banner progress bar | Banner visible, 40% complete | Screenshot banner | 6px (h-1.5) rounded progress bar, gradient fill at 40% width | P2 |
| V-10 | Step 1 field styling | On step 1 | Screenshot all inputs | 48px (h-12) inputs, rounded-xl, border-2 border-white/40, bg-white/30 backdrop-blur | P2 |

---

## 5. E2E Flows

### 5.1 Full New User Journey

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| E2E-01 | Complete new user journey | Fresh user account, onboarding_completed=false | 1. Log in 2. Redirected to /onboarding 3. Upload headshot on step 1 4. Enter phone, select timezone 5. Click Continue 6. Import Google CSV on step 2 7. Click Continue 8. Enter brokerage + license on step 3 9. Click Continue 10. Skip MLS on step 4 11. Auto-complete step 5 12. Dashboard loads with ?welcome=1 13. Confetti fires, banner shows 14. Checklist widget visible 15. Complete all checklist items 16. NPS prompt appears 17. Rate 5 | All 17 steps succeed. DB state: onboarding_completed=true, avatar_url set, contacts imported, brokerage saved, onboarding_nps=5. | P0 |

### 5.2 Skip-All Flow

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| E2E-02 | Skip every step | Fresh user | 1. Step 1: click "Skip for now" 2. Step 2: click "Skip -- use sample data" 3. Step 3: click "Skip for now" 4. Step 4: skip MLS 5. Auto-complete 6. Dashboard loads | onboarding_completed=true. 5 sample contacts exist. No avatar, no brokerage, no license. Dashboard shows sample data in KPI cards. | P0 |

### 5.3 Import Flow

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| E2E-03 | CSV import through wizard to dashboard | Fresh user, prepared test CSV (15 contacts) | 1. Skip step 1 2. On step 2: upload Google CSV 3. See "15 contacts imported!" 4. Continue through remaining steps 5. Complete wizard 6. Navigate to /contacts | 15 imported contacts + 5 sample contacts = 20 total contacts visible. (Or only 15 if sample seeding skipped due to existing contacts.) | P0 |

### 5.4 Return Flow (Resume)

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| E2E-04 | Resume at step 3 after leaving | User completed steps 1-2, closed browser at step 3 | 1. Navigate to /onboarding | Page loads at step 3 (Professional details). Steps 1-2 data preserved (avatar shown if uploaded). | P0 |
| E2E-05 | Avatar preview restored on resume | User uploaded headshot at step 1, left at step 2 | Navigate to /onboarding | Step at 2 (or wherever left). If navigating back to step 1: avatar preview shows previously uploaded image. | P1 |

---

## 6. API Endpoint Matrix

| Endpoint | Method | Auth Required | Input | Expected Output | Status Codes |
|----------|--------|---------------|-------|-----------------|--------------|
| `/api/onboarding/upload-avatar` | POST | Session (NextAuth) | `multipart/form-data` with `file` field (JPEG/PNG/WebP, <= 5MB) | `{ url: string }` | 200, 400, 401, 500 |
| `/api/onboarding/checklist` | GET | Session (NextAuth) | None | `{ items: ChecklistItem[], dismissedAll: boolean, name: string }` | 200, 401 |
| `/api/onboarding/checklist` | POST | Session (NextAuth) | `{ item_key: string }` or `{ dismiss_all: true }` | `{ success: true }` | 200, 400, 401 |
| `/api/onboarding/nps` | POST | Session (NextAuth) | `{ score: number }` (1-5 integer) | `{ success: true }` | 200, 400, 401, 500 |
| `/api/cron/welcome-drip` | POST | Bearer CRON_SECRET | None | `{ success: true, processed: N, sent: N, skipped: N, timestamp: string }` | 200, 401, 500 |
| `/api/cron/welcome-drip` | GET | Bearer CRON_SECRET | None | Same as POST | 200, 401, 500 |
| `/api/contacts/import` | POST | Session (NextAuth) | `{ contacts: [...], source: string }` or `multipart/form-data` | `{ imported: number }` | 200, 400, 401 |
| `/api/contacts/import-vcard` | POST | Session (NextAuth) | `multipart/form-data` with `.vcf` file | `{ imported: number }` | 200, 400, 401 |

---

## 7. Regression Checklist

| ID | Description | Preconditions | Steps | Expected Result | Priority |
|----|-------------|---------------|-------|-----------------|----------|
| R-01 | Existing users skip onboarding | User with `onboarding_completed: true` | Log in, navigate to any page | Not redirected to /onboarding. Dashboard loads normally. | P0 |
| R-02 | Admin users bypass onboarding gate | User with role="admin", onboarding_completed=false | Log in | Not forced through onboarding wizard. Admin pages accessible. | P0 |
| R-03 | clearSampleData deletes all sample types | User has sample contacts + sample listings + sample tasks | Call `clearSampleData()` | All three entity types with is_sample=true deleted. Real data preserved. No FK violation errors. | P0 |
| R-04 | Drip emails respect unsubscribe | User with `drip_unsubscribed: true` in DB | Run `processWelcomeDrip()` | User skipped entirely. No emails sent. | P0 |
| R-05 | Checklist auto-detects real DB state | User adds a real contact outside onboarding | Load checklist | "Add your first contact" shows as completed (auto-detected from contacts table, not manual override) | P0 |
| R-06 | Onboarding does not break session | Complete onboarding, then use CRM features | Create listing, send email, schedule showing | All features work normally. No stale session issues. | P0 |
| R-07 | Multiple file uploads do not leave orphans | Upload headshot, then upload new headshot | Upload twice | Only one file in storage (upsert). No orphaned files. | P1 |
| R-08 | Wizard state does not leak between users | User A at step 3, log in as User B | Navigate to /onboarding as User B | Step reflects User B's progress (not User A's step 3) | P0 |
| R-09 | Sample data has is_sample flag | Seed sample data via wizard | Query contacts WHERE realtor_id = user AND is_sample = true | All 5 sample contacts have is_sample=true. Distinguishable from real contacts. | P0 |
| R-10 | Drip email Day 7 sends only to free plan users | User on professional plan, 7 days since signup | Run `processWelcomeDrip()` | Day 7 "trial" email skipped for this user (skipCheck: "upgraded" returns true) | P1 |
| R-11 | Profile completeness recalculates on avatar upload | User uploads headshot | Upload via /api/onboarding/upload-avatar | `users.profile_completeness` increases by 10 points (avatar_url contribution) | P1 |
| R-12 | Checklist hidden for onboarding-in-progress users | User with onboarding_completed=false on dashboard | Somehow navigate to dashboard mid-wizard | OnboardingChecklist returns null (onboardingCompleted === false guard) | P1 |
| R-13 | Welcome confetti does not fire without ?welcome=1 | Normal dashboard visit | Navigate to / (no query param) | No confetti. No welcome banner. | P0 |
| R-14 | Personalization progress resume works | User answered 2/5 personalization screens | Navigate to personalization page | Resumes at screen index 2 (third screen) | P1 |

---

## Summary

| Section | Count |
|---------|-------|
| Unit Tests | 38 |
| Integration Tests | 19 |
| Browser Tests | 37 |
| Visual Tests | 10 |
| E2E Flows | 5 |
| Regression Checks | 14 |
| **Total** | **123** |

### Priority Distribution

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 52 | Must pass before any deploy. Blocks release. |
| P1 | 51 | Should pass. Fix within 24 hours if failing. |
| P2 | 13 | Nice to have. Fix in next sprint. |
| P3 | 0 | -- |
