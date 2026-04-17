# PRD: Realtors360 — Signup, Verification & Onboarding Overhaul

> **Version:** 1.0
> **Date:** April 6, 2026
> **Author:** Realtors360 Product Team
> **Status:** Draft
> **Based on:** Analysis of current signup flow, SaaS best practices (Notion, Linear, Stripe), real estate CRM competitor research (kvCORE, Follow Up Boss, LionDesk, Sierra Interactive)

---

## 1. Problem Statement

### The Core Problem

The current Realtors360 signup is a basic email/password + Google OAuth form that creates an account and drops the user into an empty dashboard with **zero verification, zero onboarding, and zero guidance**. Email addresses are stored as `email_verified: false` but never actually verified — meaning fake emails pollute the database, abandoned accounts pile up, and there's no phone number validation for the SMS/WhatsApp features that realtors depend on. Competitors like kvCORE (**$499/mo**) and Follow Up Boss (**$69/mo**) provide guided onboarding wizards that activate within 48 hours — agents who don't complete onboarding churn within **14 days at 3x the rate** of those who do (Totango SaaS benchmark, 2025). Worse, new users see an empty contacts list and have no way to import their existing contacts from Gmail or Apple — the two platforms where **85%+ of realtors** already have their client contact books.

### Why This Matters

- **72% of SaaS users** who don't complete onboarding within the first session never return (Wyzowl, 2025)
- **Email verification** prevents spam accounts, improves deliverability reputation (Resend domain trust), and is required for CASL/CAN-SPAM compliance when sending marketing emails
- **Phone verification** is essential — Realtors360 uses Twilio SMS/WhatsApp for showing requests, lockbox codes, and workflow automations. Unverified phones mean failed messages and wasted Twilio credits ($0.0079/SMS)
- **Empty dashboard syndrome** — a new user sees zero contacts, zero listings, zero tasks. Without guidance, they don't know where to start and leave
- **Contact import at signup** is the single most impactful activation step — a realtor with 50+ contacts imported on Day 1 is **4x more likely** to become a paying user than one with zero (Follow Up Boss internal data, referenced in their marketing)
- **Duplicate/fake signups** waste database rows, skew metrics, and create support tickets
- **No social proof** on the signup page — the login page has a branded split-panel design but the signup page is a plain centered form. First impressions matter: **38% of users stop engaging** with a website if the layout is unattractive (Adobe, 2024)

### What Exists Today (and Why It Fails)

| Component | Current State | Problem |
|-----------|--------------|---------|
| Signup methods | Email/password + Google OAuth | No magic link, no Apple/Facebook, no phone OTP |
| Email verification | `email_verified: false` stored, never enforced | Fake emails, no deliverability trust, CASL risk |
| Phone verification | Not implemented | SMS/WhatsApp features fail silently, wasted Twilio spend |
| Contact import | CSV import only, buried in `/contacts` page | No Gmail/Apple import, not part of signup, new users don't know it exists |
| Onboarding | Floating checklist widget (localStorage-based) | Not tied to verification, no structured wizard, easily dismissed |
| Welcome emails | None | No drip sequence, no activation nudges |
| Signup UX | Raw Tailwind form, no split-panel, no social proof | Inconsistent with login page design, lower conversion |
| Security | No rate limiting, no CAPTCHA, no disposable email blocking | Bot signups, brute force vulnerability |
| Duplicate detection | Basic "email exists" error | Doesn't suggest alternative login method (e.g., "Try Google instead") |
| Profile completeness | Not tracked | No nudge to add photo, brokerage, license — fields stay empty forever |

**No component combines:** verified identity + contact import + structured onboarding + welcome drip + progressive profile completion + bot protection.

---

## 2. Vision

### One Sentence

Every new Realtors360 account is verified (email + phone), seeded with real contacts from Gmail or Apple, guided through a 5-minute onboarding wizard, and nurtured with a 7-day welcome drip — turning first-time visitors into active users within 48 hours.

### The 30-Second Pitch

When a realtor signs up — via Google, Apple, Facebook, magic link, or email/password — they land on a clean verification flow: magic link confirms their email (one click), then a 6-digit SMS OTP confirms their phone. Once verified, a 5-step onboarding wizard walks them through: uploading a headshot, importing contacts from Gmail or Apple (one-click OAuth, select contacts, done), connecting Google Calendar, and choosing their first action. The contact import is the magic moment — within 2 minutes of signing up, the realtor sees their real client list in the CRM, not an empty page. A 7-day welcome email drip reinforces each step. A persistent profile completeness bar nudges them to fill in brokerage, license number, and professional details. The result: verified accounts, populated dashboards, activated users. No fake emails. No dead accounts. No confusion.

### Success Metrics

| Metric | Target | Current Baseline |
|--------|--------|-----------------|
| Signup completion rate | >85% | Unknown (no tracking) |
| Email verification rate | >95% | 0% (not enforced) |
| Phone verification rate | >80% | 0% (not implemented) |
| Contact import at signup | >50% of users import | 0% (not available at signup) |
| Avg contacts imported at signup | 30+ | 0 |
| Onboarding wizard completion | >70% | N/A (no wizard) |
| Day-7 retention (active users) | >60% | Unknown |
| Time to first meaningful action | <10 min | Unknown (no guidance) |
| Bot/fake signups | <1% | Unknown |
| Profile completeness at Day 30 | >75% | <30% (estimated) |

---

## 3. Target Users

### Primary: Solo Agent (Sarah)

- **Demographics:** 35-55 years old, 3-10 years experience, licensed BC realtor
- **Tech comfort:** Uses iPhone for everything, comfortable with Instagram and Gmail, has Google Calendar. Types slowly. Nervous about "techy" setup processes. Has 200+ contacts in her Gmail and 150+ in her iPhone (Apple Contacts).
- **Pain:** Signed up for 3 CRMs before and abandoned each one because the empty dashboard was overwhelming. Manually re-entering 200 contacts is a dealbreaker — she doesn't have 3 hours to type them in. Doesn't have time to figure things out — needs the product to show her what to do first.
- **Goal:** Create an account in under 2 minutes, see HER contacts in the CRM within 5 minutes, feel confident she made the right choice.
- **Signup preference:** Google (fastest — also gives calendar + contacts access) or email + magic link (familiar). Will verify phone immediately because she already uses SMS for showings.

### Secondary: Team Lead (Marcus)

- **Demographics:** 40-55, runs a 5-15 person team at a brokerage
- **Pain:** Evaluating CRMs for his team. Needs to sign up, verify it works, then invite agents. If onboarding is clunky, he won't roll it out — his agents are even less patient than he is. Uses Outlook for contacts (Microsoft 365).
- **Goal:** Sign up, verify, import his contacts to see the product in action, then decide whether to invite his team.
- **Signup preference:** Email/password (corporate habit). Will want to import from Gmail or Apple depending on his personal setup.

### Tertiary: New Agent (Priya)

- **Demographics:** 25-35, first 2 years in real estate, digital native
- **Tech comfort:** Uses TikTok, Instagram, Canva daily. Comfortable with any auth method. Expects Apple Sign-In and social login. Has 500+ contacts in iCloud.
- **Pain:** Just got her license, has a big personal network but zero CRM experience. Wants to import her iPhone contacts and start tagging the ones who might buy/sell.
- **Goal:** Sign up in 30 seconds (social auth), import contacts from Apple, start organizing them.
- **Signup preference:** Apple or Google (no passwords). Expects OTP verification — every modern app does it.

---

## 4. High-Level Feature List

### Phase 1 — Verified Signup (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| **F1: Magic Link Email Verification** | After signup, send a single-use magic link via Resend. User clicks → email verified. Expires in 15 min. | P0 |
| **F2: Phone SMS OTP Verification** | After email verified, prompt for phone number → send 6-digit OTP via Twilio → phone verified. Expires in 10 min. | P0 |
| **F3: Verification Gate Middleware** | Unverified accounts can't access dashboard routes. Redirect to `/verify` until both email and phone are verified. | P0 |
| **F4: Google OAuth Skip** | If signup via Google, skip email verification (already verified by Google). Go straight to phone OTP. | P0 |
| **F5: Smart Duplicate Detection** | If email exists: show "You already have an account" with the signup method used (e.g., "Try signing in with Google"). | P0 |
| **F6: Resend Cooldown + Rate Limiting** | 60-second cooldown between resends. Max 5 OTP attempts before 30-min lockout. Max 5 signups per IP per hour. | P0 |

### Phase 2 — Social Auth + Security

| Feature | Description | Priority |
|---------|-------------|----------|
| **F7: Apple Sign-In** | OAuth via Apple for iPhone/Safari users. Skip email verification. Go to phone OTP. | P1 |
| **F8: Facebook Login** | OAuth via Facebook for users who prefer it. Skip email verification. Go to phone OTP. | P1 |
| **F9: Cloudflare Turnstile** | Invisible CAPTCHA on signup form. Blocks bots without adding friction for humans. Free tier. | P0 |
| **F10: Disposable Email Blocking** | Reject signups from known disposable email domains (mailinator, tempmail, guerrillamail, etc.). | P1 |
| **F11: Password Strength Meter** | Real-time visual feedback (weak/medium/strong) with requirements checklist. | P1 |

### Phase 3 — Onboarding Wizard + Contact Import

| Feature | Description | Priority |
|---------|-------------|----------|
| **F12: Post-Verification Onboarding Wizard** | 5-step guided wizard after verification: (1) Upload headshot + timezone, (2) Import contacts from Gmail/Apple, (3) Connect Google Calendar, (4) Professional info (brokerage, license), (5) Choose next action. | P0 |
| **F13: Gmail Contact Import** | OAuth connect to Google People API → fetch contacts → user selects which to import → bulk create in CRM. One-click during onboarding. | P0 |
| **F14: Apple Contact Import (via iCloud)** | Upload vCard (.vcf) export from Apple Contacts / iCloud. Parse and import selected contacts. Guide user through iCloud export. | P0 |
| **F15: Contact Import Preview & Selection** | After fetching/uploading contacts: show list with checkboxes, search/filter, select all, deselect duplicates. User picks exactly who to import. | P0 |
| **F16: Sample Data Seeding** | For users who skip import: seed with 3 demo contacts + 1 demo listing so dashboard isn't empty. Clearly labeled as "Sample Data." | P1 |
| **F17: Profile Completeness Bar** | Persistent bar on dashboard: "Your profile is 40% complete." Tracks: name, email, phone, headshot, brokerage, license, calendar, timezone, bio, contacts imported. | P0 |

### Phase 4 — Welcome Drip + UX Polish

| Feature | Description | Priority |
|---------|-------------|----------|
| **F18: 7-Day Welcome Email Drip** | Day 0: Welcome. Day 1: Import more contacts. Day 2: Connect Google Calendar. Day 3: Explore email marketing. Day 5: Try AI content. Day 7: Upgrade prompt. | P1 |
| **F19: Unified Signup Page Design** | Match login page's split-panel layout: brand panel (left) + form (right). Social proof, testimonial, feature bullets. | P0 |
| **F20: Inline Field Validation** | Real-time validation as user types: email format, email availability (debounced API check), password strength, phone format. | P1 |
| **F21: Auto-Detect Brokerage** | As user types brokerage name in onboarding/settings, suggest from existing brokerages in DB. Reduces typos, enables future team features. | P2 |
| **F22: Resume Abandoned Signup** | Save signup progress to localStorage. If user returns to `/signup` with partial data, pre-fill fields. | P2 |

---

## 5. Detailed User Stories & Acceptance Criteria

### Epic 1: Email Verification — Magic Link (F1, F4, F6)

**US-1.1: Email verification via magic link after signup**
> As a new user who signed up with email/password, I want to receive a magic link to verify my email, so I can prove I own this email address and activate my account.

**Acceptance Criteria:**
- [ ] After signup form submission, account is created with `email_verified: false`, `phone_verified: false`, `is_active: false`
- [ ] System sends magic link email via Resend within 5 seconds of signup
- [ ] Magic link format: `{APP_URL}/api/auth/verify-email?token={UUID}&email={encoded_email}`
- [ ] Token is a UUID v4, stored in `verification_tokens` table with `type: 'email'`, hashed (SHA-256), expires in 15 minutes
- [ ] Email uses branded HTML template: Realtors360 logo, "Verify your email" heading, single CTA button, plain-text fallback
- [ ] User is redirected to `/verify` page showing: "Check your email" message, masked email (s***h@gmail.com), "Open Gmail" quick link, "Resend" button (disabled for 60 seconds with countdown timer)
- [ ] Clicking the magic link: validates token → marks `email_verified: true` → deletes token → redirects to `/verify/phone`
- [ ] Expired/invalid token shows clear error: "This link has expired. Request a new one." with resend button
- [ ] If email was already verified (user clicks link twice), redirect to next step (phone verification)
- [ ] Does NOT auto-login via magic link — user must already have a session from signup

**US-1.2: Skip email verification for Google/Apple/Facebook OAuth**
> As a user who signed up via Google, I want email verification skipped since Google already verified my email.

**Acceptance Criteria:**
- [ ] Google, Apple, and Facebook OAuth signups: set `email_verified: true` immediately
- [ ] After OAuth callback, redirect to `/verify/phone` (not `/verify/email`)
- [ ] `signup_source` stored as `google`, `apple`, or `facebook` respectively

**US-1.3: Resend magic link with cooldown**
> As a user who didn't receive the verification email, I want to request a new one, but the system should prevent abuse.

**Acceptance Criteria:**
- [ ] "Resend" button on `/verify` page, disabled for 60 seconds after last send (visible countdown: "Resend in 45s")
- [ ] New token invalidates previous token (only latest token works)
- [ ] Max 5 resend requests per email per hour. After 5: "Too many attempts. Try again in 1 hour."
- [ ] "Change email" link lets user update their email before re-sending (updates `users.email`, sends to new address)
- [ ] Server-side rate limit: max 5 signups per IP per hour (429 response)

### Epic 2: Phone Verification — SMS OTP (F2, F6)

**US-2.1: Phone number entry and OTP send**
> As a user who has verified my email, I want to verify my phone number via SMS, so the CRM can send me showing requests and notifications.

**Acceptance Criteria:**
- [ ] `/verify/phone` page shows: phone input with country code selector (default: +1 Canada), "Send Code" button
- [ ] Phone number validated: must be 10 digits (after country code), E.164 format stored
- [ ] On "Send Code": generate 6-digit OTP (cryptographically random), store hashed (SHA-256) in `verification_tokens` with `type: 'phone'`, expire in 10 minutes
- [ ] Send OTP via Twilio SMS: "Your Realtors360 verification code is: {CODE}. Expires in 10 minutes."
- [ ] UI shows: 6-digit input (auto-advance between digits), "Resend" button (60-second cooldown with timer), "Change number" link
- [ ] Auto-submit when all 6 digits are entered (no submit button needed)
- [ ] On correct OTP: mark `phone_verified: true`, set `is_active: true`, delete token, redirect to onboarding wizard
- [ ] On incorrect OTP: shake animation, "Incorrect code. Try again." message, attempt counter visible ("3 of 5 attempts remaining")
- [ ] After 5 incorrect attempts: lock phone verification for 30 minutes. "Too many attempts. Try again at {time}."
- [ ] Resend sends a new code and invalidates the previous one

**US-2.2: Duplicate phone number detection**
> As a user entering my phone number, I want to know if this phone is already registered to another account.

**Acceptance Criteria:**
- [ ] Before sending OTP, check if phone number exists in `users` table
- [ ] If duplicate: "This phone number is already associated with an account ({masked email}). Please use a different number or sign in to the existing account."
- [ ] Allow proceeding if user confirms (edge case: family members sharing a phone — rare but possible)

### Epic 3: Verification Gate (F3)

**US-3.1: Block unverified users from dashboard**
> As the system, I need to ensure unverified users cannot access any dashboard functionality until they complete verification.

**Acceptance Criteria:**
- [ ] Middleware checks: if user session exists but `email_verified: false` → redirect to `/verify`
- [ ] Middleware checks: if user session exists but `phone_verified: false` → redirect to `/verify/phone`
- [ ] `/verify` and `/verify/phone` added to public routes in middleware
- [ ] API routes return `403 { error: "Account not verified" }` for unverified users (except auth routes)
- [ ] Session JWT includes `email_verified` and `phone_verified` claims — middleware reads from token (no DB hit per request)
- [ ] After both verified: middleware allows normal access, no more redirects
- [ ] Existing users (created before this feature): auto-set `email_verified: true`, `phone_verified: false` — prompt for phone on next login but don't block (grace period of 30 days)

### Epic 4: Duplicate Detection (F5)

**US-4.1: Smart signup method suggestion on duplicate email**
> As a user trying to sign up with an email that already exists, I want to know how I originally signed up so I can use the correct method.

**Acceptance Criteria:**
- [ ] Signup API checks for existing email before creating account
- [ ] Response includes `signup_source` of existing account (without exposing sensitive info)
- [ ] UI shows contextual message:
  - `signup_source: 'google'` → "This email is already registered. **Sign in with Google** instead."
  - `signup_source: 'email'` → "This email is already registered. **Sign in with your password** or **reset your password**."
  - `signup_source: 'apple'` → "This email is already registered via **Apple Sign-In**."
  - `signup_source: 'facebook'` → "This email is already registered via **Facebook**."
- [ ] Links go directly to the relevant login method
- [ ] Never reveal whether an email exists via timing attack — consistent response time for exists/not-exists

### Epic 5: Contact Import from Gmail & Apple (F13, F14, F15)

**US-5.1: Import contacts from Gmail during onboarding**
> As a new user, I want to import my Gmail contacts into the CRM with one click during signup, so my contact list is populated immediately.

**Acceptance Criteria:**
- [ ] Step 2 of onboarding wizard shows: "Import your contacts" with two large cards — "Import from Gmail" (Google icon) and "Import from Apple" (Apple icon)
- [ ] "Import from Gmail" initiates Google OAuth with `https://www.googleapis.com/auth/contacts.readonly` scope
- [ ] If user signed up with Google: request additional contacts scope without re-login (incremental auth)
- [ ] After OAuth: fetch contacts via Google People API (`people.connections.list` with `personFields=names,emailAddresses,phoneNumbers,organizations`)
- [ ] Max fetch: 2,000 contacts (paginated, show progress bar: "Loading contacts... 150/320")
- [ ] Display contact import preview screen (see US-5.3)
- [ ] On import: create contacts in `contacts` table with `source: 'gmail_import'`, `realtor_id` set via tenant client
- [ ] Map fields: `names[0].displayName` → `name`, `emailAddresses[0].value` → `email`, `phoneNumbers[0].value` → `phone`, `organizations[0].name` → `company`
- [ ] Store Google People API resource name for future sync: `contacts.external_id = resourceName`
- [ ] Show success: "42 contacts imported!" with confetti animation
- [ ] Google OAuth token stored in `user_integrations` table for potential future re-sync (not in session)

**US-5.2: Import contacts from Apple / iCloud during onboarding**
> As a new user with an iPhone, I want to import my Apple contacts into the CRM during signup.

**Acceptance Criteria:**
- [ ] "Import from Apple" card shows two options:
  - **Option A: iCloud.com export** — Step-by-step visual guide: "1. Go to icloud.com/contacts → 2. Select All (⌘+A) → 3. Click gear icon → Export vCard → 4. Upload the .vcf file here"
  - **Option B: iPhone direct export** — "On your iPhone: Contacts → Select contacts → Share → Save as .vcf → Upload here" (with screenshots)
- [ ] Upload dropzone: drag-and-drop or click to browse, accepts `.vcf` files only, max 10MB
- [ ] Parse vCard (.vcf) file: extract `FN` (full name), `EMAIL`, `TEL`, `ORG`, `ADR`, `NOTE` fields
- [ ] Handle multi-contact vCard files (standard Apple export includes all contacts in one .vcf)
- [ ] Support vCard 3.0 and 4.0 formats
- [ ] After parse: display contact import preview screen (same as Gmail — see US-5.3)
- [ ] On import: create contacts with `source: 'apple_import'`
- [ ] Show success count with confetti animation

**US-5.3: Contact import preview and selection**
> As a user importing contacts, I want to see a preview of my contacts and choose which ones to import, so I don't import irrelevant contacts.

**Acceptance Criteria:**
- [ ] Preview screen shows: total contacts found, scrollable list with checkboxes
- [ ] Each row shows: name, email (if available), phone (if available), company (if available)
- [ ] "Select All" checkbox at top (default: checked)
- [ ] Search bar: filter contacts by name/email/phone in real-time
- [ ] Smart filter buttons: "Has email" (default on), "Has phone", "Has both" — since contacts without email or phone have limited CRM utility
- [ ] Duplicate detection: if contact email already exists in CRM, show yellow "Already exists" badge and deselect by default
- [ ] Count display: "42 of 320 selected for import"
- [ ] "Import Selected" button with count: "Import 42 contacts"
- [ ] Progress bar during import: "Importing... 30/42"
- [ ] After import: summary — "42 imported, 3 skipped (duplicates), 5 skipped (no email/phone)"
- [ ] "Import more" button to re-run the flow, or "Continue" to proceed to next onboarding step
- [ ] Contacts imported with `type: 'lead'` by default (user can re-categorize later as buyer/seller/agent)

**US-5.4: Contact import from settings (post-signup)**
> As an existing user, I want to import contacts from Gmail or Apple at any time from the contacts page, not just during onboarding.

**Acceptance Criteria:**
- [ ] `/contacts` page has "Import" dropdown with: "From Gmail", "From Apple (vCard)", "From CSV" (existing)
- [ ] Same flow as onboarding import (OAuth for Gmail, upload for Apple, preview + select)
- [ ] Duplicate detection against full existing contact list
- [ ] Import history: Settings page shows "Last import: 42 contacts from Gmail on April 6, 2026"

### Epic 6: Onboarding Wizard (F12, F16, F17)

**US-6.1: Post-verification onboarding wizard**
> As a newly verified user, I want a guided setup that helps me configure my account, import my contacts, and take my first meaningful action within 5 minutes.

**Acceptance Criteria:**
- [ ] After phone verification, redirect to `/onboarding` (new route, not dashboard)
- [ ] 5-step wizard with progress bar at top:
  - **Step 1: "Make it yours"** — Upload headshot (drag-and-drop or click, max 5MB, jpg/png/webp), set timezone (auto-detected from browser, editable)
  - **Step 2: "Bring your contacts"** — Import from Gmail (one-click OAuth) or Apple (vCard upload). This is the key activation step. Show: "Your CRM is better with your real contacts." Preview + select screen. "Skip for now" option (seeds sample data).
  - **Step 3: "Connect your calendar"** — Google Calendar OAuth connect button. "Skip for now" option. Explains: "See your showings and tasks on your Google Calendar."
  - **Step 4: "Professional details"** — Brokerage name (with auto-suggest from DB), license number, bio/tagline. All optional. "You can fill this in later from Settings."
  - **Step 5: "You're all set! What's next?"** — 3 large cards: "Manage my contacts" → `/contacts`, "Set up email marketing" → `/newsletters`, "Explore the dashboard" → `/`. Clicking any card completes onboarding.
- [ ] Each step can be skipped (except Step 5 — must choose a destination)
- [ ] Wizard state persisted in DB (`users.onboarding_step`): if user refreshes, resume at current step
- [ ] Wizard uses the same split-panel design as login/signup (brand panel left on desktop, hidden on mobile)
- [ ] Step 2 (contact import) shows dynamic encouragement: after import, "You imported 42 contacts — you're ahead of 80% of new users!"
- [ ] On completion: set `onboarding_completed: true` on user record, dismiss the wizard permanently
- [ ] "Skip setup" link at bottom of every step → goes to dashboard with onboarding checklist widget still visible

**US-6.2: Sample data seeding for users who skip import**
> As a new user who skipped contact import, I want to see sample data in the dashboard so it doesn't feel empty.

**Acceptance Criteria:**
- [ ] If user skips Step 2 (contact import) AND has zero contacts: seed 3 demo contacts (buyer, seller, agent) with realistic BC names/emails/phones, 1 demo listing (sample Vancouver condo), 2 demo tasks ("Follow up with Sarah Chen", "Review listing photos")
- [ ] All sample data has `is_sample: true` flag
- [ ] Dashboard shows banner: "You're viewing sample data. Import your real contacts to get started." with "Import from Gmail" and "Import from Apple" buttons
- [ ] Sample data auto-deleted after user imports 3+ real contacts OR after 30 days, whichever comes first
- [ ] Sample contacts have `email: null` (prevent accidental email sends to fake contacts)

**US-6.3: Profile completeness bar**
> As a user, I want to see how complete my profile is and what I still need to fill in, so I'm motivated to complete it.

**Acceptance Criteria:**
- [ ] Persistent bar at top of dashboard (below nav): "Profile: 40% complete — [Add your headshot] [Import contacts]"
- [ ] Tracked fields (10 total, 10% each): name, email (verified), phone (verified), headshot, brokerage, license number, Google Calendar connected, timezone set, bio/tagline, contacts imported (≥1 real contact)
- [ ] Each incomplete item is a clickable link → opens the relevant settings section or modal
- [ ] Bar color: red (<40%), amber (40-70%), green (>70%), hidden at 100%
- [ ] Bar can be minimized but not permanently dismissed until 100%
- [ ] Profile completeness stored in DB: `users.profile_completeness` (int 0-100), recalculated on profile update
- [ ] Show completeness percentage in settings page as well

### Epic 7: Welcome Email Drip (F18)

**US-7.1: Automated 7-day welcome email sequence**
> As a new user, I want to receive helpful emails over my first week that guide me to use key features, so I don't forget about the product after signup.

**Acceptance Criteria:**
- [ ] Drip schedule (triggered from `created_at` timestamp):
  - **Day 0 (immediate):** "Welcome to Realtors360!" — Account confirmation, 3 key features overview, link to dashboard
  - **Day 1:** "Your contacts are waiting" — If didn't import contacts at signup: prompt to import from Gmail/Apple. If did import: "Great start! Here's how to organize your contacts" with tagging tips
  - **Day 2:** "Connect your Google Calendar" — Benefits (showing sync, task reminders), one-click connect link
  - **Day 3:** "Send your first email campaign" — Email marketing overview, template gallery preview, link to `/newsletters`
  - **Day 5:** "Meet your AI assistant" — AI features overview (content generation, voice agent), link to explore
  - **Day 7:** "You're doing great! Ready for more?" — Usage summary (contacts added, emails sent), upgrade CTA for free plan users, testimonial from a BC realtor
- [ ] Each email: branded HTML (Realtors360 design system), plain-text fallback, unsubscribe link (CASL compliant), "Reply to this email for help" footer
- [ ] Skip emails for actions already completed (e.g., if user already connected Calendar, skip Day 2 email)
- [ ] Track: email sent, opened, clicked (via Resend webhook events)
- [ ] Drip paused if user unsubscribes from welcome sequence (separate from newsletter unsubscribe)
- [ ] Cron job: `/api/cron/welcome-drip` runs daily at 9 AM PST, processes all users in drip window
- [ ] Welcome emails sent from `welcome@realtors360.com` (or configured Resend domain)

### Epic 8: Signup Page UX Overhaul (F19, F20, F22)

**US-8.1: Split-panel signup page matching login design**
> As a visitor landing on the signup page, I want a professional, trustworthy design that matches the login page aesthetic.

**Acceptance Criteria:**
- [ ] Split-panel layout: left panel (brand, hidden on mobile) + right panel (form)
- [ ] Left panel contains: Realtors360 logo + name, tagline ("AI-Powered Real Estate CRM"), 3 feature bullets with icons (Contacts & Pipeline, Email Marketing, AI Content), social proof ("Trusted by real estate professionals across BC"), testimonial quote from a realtor with name + photo
- [ ] Right panel: signup form using shadcn/ui components (`Input`, `Button`, `Card`, `Label`) — NOT raw Tailwind
- [ ] Social login buttons at top: "Continue with Google" (full-width), "Continue with Apple" (full-width), "Continue with Facebook" (full-width)
- [ ] Divider: "or sign up with email"
- [ ] Email signup: single step — Name, Email, Password (with strength meter), "Create Account" button
- [ ] Plan selection removed from signup (everyone starts on Free, upgrades from settings/pricing page)
- [ ] Mobile: form only (no brand panel), social buttons stacked, compact layout
- [ ] "Already have an account? Sign in" link at bottom
- [ ] Cloudflare Turnstile widget (invisible) on form submit

**US-8.2: Inline field validation**
> As a user filling in the signup form, I want real-time feedback on each field so I don't submit and get an error.

**Acceptance Criteria:**
- [ ] Email field: validate format on blur. If valid format, debounced API call (300ms) to check if email exists → show green checkmark (available) or red "Email already registered" with login link
- [ ] Password field: real-time strength meter below field. Requirements checklist: min 8 chars, 1 uppercase, 1 number. Bar fills: red (weak) → amber (medium) → green (strong). Disable submit until "medium" or better
- [ ] Name field: validate min 2 characters on blur
- [ ] All validation uses `aria-invalid` and `aria-describedby` for accessibility
- [ ] Error messages appear inline below the field (not in a toast or alert)

**US-8.3: Resume abandoned signup**
> As a user who started signing up but left before completing, I want my progress saved so I can resume later.

**Acceptance Criteria:**
- [ ] On each field change, save to localStorage: `{ name, email, step }` (never save password)
- [ ] On `/signup` load: check localStorage, pre-fill fields if data exists
- [ ] Show subtle message: "Welcome back! We saved your progress."
- [ ] Clear localStorage on: successful signup, explicit "Start over" click, or after 7 days (TTL)
- [ ] If account was created but not verified: redirect to `/verify` on next login attempt

### Epic 9: Security — Bot Protection (F9, F10)

**US-9.1: Cloudflare Turnstile on signup**
> As the system, I need to block bot signups without adding friction for real users.

**Acceptance Criteria:**
- [ ] Integrate Cloudflare Turnstile (invisible mode) on signup form
- [ ] Turnstile token sent with signup API request
- [ ] Server-side validation: call Turnstile verify API before creating account
- [ ] On failure: show "Verification failed. Please try again." (Turnstile auto-retries before failing)
- [ ] Turnstile site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, secret key in `TURNSTILE_SECRET_KEY` (env vars)
- [ ] Graceful degradation: if Turnstile script fails to load (blocked by ad blocker), fall back to rate limiting only

**US-9.2: Disposable email blocking**
> As the system, I need to reject signups from known disposable/temporary email domains.

**Acceptance Criteria:**
- [ ] Maintain a list of 200+ disposable email domains (mailinator.com, tempmail.com, guerrillamail.com, yopmail.com, etc.)
- [ ] Store as JSON file: `src/lib/auth/disposable-domains.json` (easy to update)
- [ ] Check email domain against list during signup API validation
- [ ] On match: "Please use a permanent email address. Temporary email services are not supported."
- [ ] Also block: email aliases with `+` if domain is disposable (but allow `+` for Gmail/Outlook — those are legitimate)

---

## 6. Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Signup, Verification & Onboarding                 │
│                                                                     │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │ Signup   │  │ Email      │  │ Phone      │  │ Onboarding   │   │
│  │ Page     │──▶ Verify     │──▶ Verify     │──▶ Wizard       │   │
│  │ /signup  │  │ /verify    │  │ /verify/   │  │ /onboarding  │   │
│  └────┬─────┘  └─────┬──────┘  │  phone     │  └──┬───────────┘   │
│       │              │         └──────┬─────┘     │               │
│  ┌────▼─────┐  ┌─────▼──────┐  ┌─────▼─────┐  ┌──▼───────────┐   │
│  │ NextAuth │  │ Resend     │  │ Twilio    │  │ Google       │   │
│  │ (OAuth)  │  │ (magic lnk)│  │ (SMS OTP) │  │ People API   │   │
│  └──────────┘  └────────────┘  └───────────┘  │ (Gmail       │   │
│                                                │  contacts)   │   │
│  ┌──────────────────────────────────────────┐  └──────────────┘   │
│  │ Middleware Gate:                          │                     │
│  │ session + email_verified + phone_verified │  ┌──────────────┐   │
│  └──────────────────────────────────────────┘  │ vCard Parser │   │
│                                                │ (Apple       │   │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐ │  contacts)   │   │
│  │ Turnstile  │  │ Disposable │  │ Welcome  │ └──────────────┘   │
│  │ (anti-bot) │  │ Email List │  │ Drip Cron│                     │
│  └────────────┘  └────────────┘  └──────────┘  ┌──────────────┐   │
│                                                │ Supabase     │   │
│                                                │ (data + auth)│   │
│                                                └──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### New Files & Modules

```
src/
├── app/(auth)/signup/page.tsx              # MODIFY — redesign to split-panel + shadcn
├── app/(auth)/verify/
│   ├── page.tsx                            # NEW — "Check your email" magic link page
│   └── phone/page.tsx                      # NEW — Phone OTP verification page
├── app/(auth)/onboarding/
│   └── page.tsx                            # NEW — 5-step onboarding wizard
├── app/api/auth/
│   ├── signup/route.ts                     # MODIFY — add Turnstile, disposable check, tokens
│   ├── verify-email/route.ts               # NEW — Magic link verification endpoint
│   ├── verify-phone/
│   │   ├── send/route.ts                   # NEW — Send SMS OTP
│   │   └── verify/route.ts                 # NEW — Verify SMS OTP
│   └── check-email/route.ts               # NEW — Email availability check (inline validation)
├── app/api/contacts/
│   ├── import-gmail/route.ts               # NEW — Google People API contact fetch
│   └── import-vcard/route.ts               # NEW — vCard file parse + import
├── app/api/cron/
│   ├── welcome-drip/route.ts               # NEW — Daily welcome email drip processor
│   ├── cleanup-tokens/route.ts             # NEW — Delete expired verification tokens
│   └── cleanup-sample-data/route.ts        # NEW — Delete stale sample data
├── actions/
│   ├── onboarding.ts                       # NEW — Wizard actions (upload photo, complete step)
│   └── contact-import.ts                   # NEW — Import contacts from Gmail/vCard
├── components/auth/
│   ├── SignupForm.tsx                       # NEW — Signup form component (shadcn)
│   ├── VerifyEmailPage.tsx                 # NEW — Magic link waiting screen
│   ├── VerifyPhonePage.tsx                 # NEW — OTP input + verification
│   ├── OtpInput.tsx                        # NEW — 6-digit auto-advance OTP input
│   ├── PasswordStrength.tsx                # NEW — Real-time password strength meter
│   ├── SocialAuthButtons.tsx               # NEW — Google/Apple/Facebook buttons
│   └── TurnstileWidget.tsx                 # NEW — Cloudflare Turnstile wrapper
├── components/onboarding/
│   ├── OnboardingWizard.tsx                # NEW — 5-step wizard container
│   ├── StepHeadshot.tsx                    # NEW — Step 1: photo + timezone
│   ├── StepContactImport.tsx              # NEW — Step 2: Gmail/Apple import
│   ├── StepCalendar.tsx                    # NEW — Step 3: Google Calendar connect
│   ├── StepProfessionalInfo.tsx           # NEW — Step 4: brokerage + license
│   ├── StepChooseAction.tsx               # NEW — Step 5: what's next?
│   ├── ContactImportPreview.tsx           # NEW — Contact list with checkboxes + search
│   ├── VCardUploader.tsx                   # NEW — Drag-and-drop vCard uploader
│   └── GmailContactFetcher.tsx            # NEW — Google OAuth + fetch contacts
├── components/dashboard/
│   └── ProfileCompletenessBar.tsx          # NEW — Persistent completeness nudge
├── lib/auth/
│   ├── verification.ts                     # NEW — Token generation, hashing, validation
│   ├── disposable-domains.json             # NEW — 200+ disposable email domains
│   ├── rate-limiter.ts                     # NEW — IP + email rate limiting
│   └── otp.ts                              # NEW — OTP generation + Twilio send
├── lib/contacts/
│   ├── gmail-import.ts                     # NEW — Google People API wrapper
│   └── vcard-parser.ts                     # NEW — vCard 3.0/4.0 parser
├── emails/
│   ├── VerifyEmail.tsx                     # NEW — Magic link email template
│   ├── WelcomeDay0.tsx                     # NEW — Welcome email
│   ├── WelcomeDay1.tsx                     # NEW — "Import contacts" email
│   ├── WelcomeDay2.tsx                     # NEW — "Connect Calendar" email
│   ├── WelcomeDay3.tsx                     # NEW — "Email marketing" email
│   ├── WelcomeDay5.tsx                     # NEW — "AI features" email
│   └── WelcomeDay7.tsx                     # NEW — Usage summary + upgrade email
└── middleware.ts                            # MODIFY — add verification gate logic
```

### Database Schema

```sql
-- Migration: 073_verification_and_onboarding.sql

-- ── Verification tokens (email magic links + phone OTPs) ──
CREATE TABLE IF NOT EXISTS verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,     -- which user
  type text NOT NULL,                    -- 'email' or 'phone'
  token_hash text NOT NULL,              -- SHA-256 hash of the token/OTP
  identifier text NOT NULL,              -- email address or phone number (E.164)
  expires_at timestamptz NOT NULL,       -- 15 min for email, 10 min for phone
  attempts int DEFAULT 0,                -- failed verification attempts
  max_attempts int DEFAULT 5,            -- lockout after 5 failed
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_vt_user ON verification_tokens(user_id, type);
CREATE INDEX idx_vt_expires ON verification_tokens(expires_at);

-- ── Add verification + onboarding columns to users ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step int DEFAULT 0;
-- 0 = not started, 1 = headshot, 2 = contacts, 3 = calendar, 4 = professional, 5 = choose action, 6 = done
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completeness int DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Vancouver';
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;
-- is_active = true only after both email + phone verified

-- ── Contact import tracking ──
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
-- source values: 'manual', 'gmail_import', 'apple_import', 'csv_import', 'sample'
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_id text;
-- Google People API resourceName, for dedup on re-import
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_sample boolean DEFAULT false;
CREATE INDEX idx_contacts_source ON contacts(source);
CREATE INDEX idx_contacts_external ON contacts(external_id) WHERE external_id IS NOT NULL;

-- ── User integrations (OAuth tokens for contact sync) ──
CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,                -- 'google_contacts', 'google_calendar'
  access_token text NOT NULL,            -- encrypted
  refresh_token text,                    -- encrypted
  token_expires_at timestamptz,
  scopes text[] DEFAULT '{}',            -- granted OAuth scopes
  metadata jsonb DEFAULT '{}',           -- provider-specific data
  connected_at timestamptz DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- ── Welcome drip tracking ──
CREATE TABLE IF NOT EXISTS welcome_drip_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day int NOT NULL,                      -- 0, 1, 2, 3, 5, 7
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,                 -- via Resend webhook
  clicked_at timestamptz,                -- via Resend webhook
  skipped boolean DEFAULT false,         -- true if action already completed
  message_id text,                       -- Resend message ID for tracking
  UNIQUE (user_id, day)
);
CREATE INDEX idx_wdl_user ON welcome_drip_log(user_id);

-- ── Sample data flags on existing tables ──
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_sample boolean DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_sample boolean DEFAULT false;

-- ── Rate limiting (signup attempts per IP) ──
CREATE TABLE IF NOT EXISTS signup_rate_limits (
  ip_address text PRIMARY KEY,
  attempt_count int DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  locked_until timestamptz
);
CREATE INDEX idx_srl_window ON signup_rate_limits(window_start);

-- ── Signup analytics (track funnel drop-off) ──
CREATE TABLE IF NOT EXISTS signup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,  -- null for pre-account events
  session_id text,                       -- anonymous session for pre-account tracking
  event text NOT NULL,                   -- 'page_view', 'form_submit', 'email_sent', 'email_verified',
                                         -- 'phone_sent', 'phone_verified', 'onboarding_step_1',
                                         -- 'onboarding_step_2', 'contacts_imported', 'onboarding_complete',
                                         -- 'abandoned_email', 'abandoned_phone', 'abandoned_onboarding'
  metadata jsonb DEFAULT '{}',           -- { contacts_count: 42, source: 'gmail', step: 2 }
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_se_user ON signup_events(user_id);
CREATE INDEX idx_se_event ON signup_events(event);
CREATE INDEX idx_se_created ON signup_events(created_at);
-- Query for funnel analysis:
-- SELECT event, COUNT(*) FROM signup_events
-- WHERE created_at > now() - interval '7 days'
-- GROUP BY event ORDER BY COUNT(*) DESC;

-- ── RLS ──
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE welcome_drip_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY verification_tokens_policy ON verification_tokens FOR ALL USING (true);
CREATE POLICY user_integrations_policy ON user_integrations FOR ALL USING (true);
CREATE POLICY welcome_drip_log_policy ON welcome_drip_log FOR ALL USING (true);
CREATE POLICY signup_rate_limits_policy ON signup_rate_limits FOR ALL USING (true);
CREATE POLICY signup_events_policy ON signup_events FOR ALL USING (true);

-- ── Backfill existing users ──
-- Existing users get email_verified = true (they were already using the system)
-- phone_verified stays false — they'll get a soft prompt (not a gate) for 30 days
UPDATE users SET email_verified = true WHERE email_verified = false AND created_at < now();
UPDATE users SET is_active = true WHERE is_active = false AND created_at < now();
```

### Signup API Route — Full Pipeline

The current `src/app/api/auth/signup/route.ts` is replaced with this full pipeline that chains: Turnstile → disposable email check → rate limit → duplicate detection → account creation → magic link send.

```typescript
// src/app/api/auth/signup/route.ts — COMPLETE REWRITE

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hash } from "bcryptjs";
import { getUserFeatures } from "@/lib/features";
import { generateMagicLinkToken } from "@/lib/auth/verification";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { isDisposableEmail } from "@/lib/auth/disposable-check";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { sendEmail } from "@/lib/resend";
import { renderVerifyEmail } from "@/emails/VerifyEmail";

export async function POST(request: NextRequest) {
  const startTime = Date.now(); // For consistent response timing (anti-timing-attack)

  try {
    const body = await request.json();
    const { name, email, password, turnstileToken } = body;

    // ── Step 1: Turnstile verification (bot protection) ──
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
             || request.headers.get("x-real-ip")
             || "unknown";

    if (turnstileToken) {
      const turnstileValid = await verifyTurnstile(turnstileToken, ip);
      if (!turnstileValid) {
        await enforceMinResponseTime(startTime);
        return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 422 });
      }
    }

    // ── Step 2: Input validation ──
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      await enforceMinResponseTime(startTime);
      return NextResponse.json({ error: "Name is required (min 2 characters)" }, { status: 422 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      await enforceMinResponseTime(startTime);
      return NextResponse.json({ error: "Valid email is required" }, { status: 422 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      await enforceMinResponseTime(startTime);
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 422 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Step 3: Disposable email check ──
    if (isDisposableEmail(normalizedEmail)) {
      await enforceMinResponseTime(startTime);
      return NextResponse.json({
        error: "Please use a permanent email address. Temporary email services are not supported."
      }, { status: 422 });
    }

    // ── Step 4: Rate limiting (IP-based) ──
    const supabase = createAdminClient();
    const rateLimitResult = await checkRateLimit(supabase, ip);
    if (!rateLimitResult.allowed) {
      await enforceMinResponseTime(startTime);
      return NextResponse.json({
        error: `Too many signup attempts. Try again after ${rateLimitResult.retryAfter}.`
      }, { status: 429 });
    }

    // ── Step 5: Duplicate detection (with signup_source hint) ──
    const { data: existing } = await supabase
      .from("users")
      .select("id, signup_source")
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      await enforceMinResponseTime(startTime); // Prevent timing attack
      return NextResponse.json({
        error: "An account with this email already exists",
        signup_source: existing.signup_source, // UI uses this to suggest correct login method
      }, { status: 409 });
    }

    // ── Step 6: Create account (inactive, unverified) ──
    const passwordHash = await hash(password, 12);
    const features = getUserFeatures("free");

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        email: normalizedEmail,
        name: name.trim(),
        password_hash: passwordHash,
        role: "realtor",
        plan: "free",
        enabled_features: features,
        signup_source: "email",
        email_verified: false,
        phone_verified: false,
        is_active: false,          // Activated only after both verifications
        onboarding_completed: false,
        onboarding_step: 0,
        profile_completeness: 10,  // Name = 10%
      })
      .select("id, email, name")
      .single();

    if (insertError) {
      console.error("[signup] Insert error:", insertError.message);
      await enforceMinResponseTime(startTime);
      return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
    }

    // ── Step 7: Generate magic link token ──
    const { token, tokenHash } = generateMagicLinkToken();

    // Delete any existing tokens for this user (invalidate previous)
    await supabase.from("verification_tokens").delete().eq("user_id", newUser.id).eq("type", "email");

    // Store hashed token
    await supabase.from("verification_tokens").insert({
      user_id: newUser.id,
      type: "email",
      token_hash: tokenHash,
      identifier: normalizedEmail,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    });

    // ── Step 8: Send magic link email via Resend ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    const emailHtml = renderVerifyEmail({
      name: name.trim().split(" ")[0], // First name only
      verifyUrl,
    });

    await sendEmail({
      to: normalizedEmail,
      subject: "Verify your email — Realtors360",
      html: emailHtml,
      text: `Hi ${name.trim().split(" ")[0]}, click this link to verify your email: ${verifyUrl} — This link expires in 15 minutes.`,
    });

    // ── Step 9: Log signup event ──
    await supabase.from("signup_events").insert({
      user_id: newUser.id,
      event: "form_submit",
      metadata: { source: "email" },
      ip_address: ip,
      user_agent: request.headers.get("user-agent") || "",
    });

    await supabase.from("signup_events").insert({
      user_id: newUser.id,
      event: "email_sent",
      metadata: { email: normalizedEmail },
    });

    return NextResponse.json({
      success: true,
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      message: "Account created. Check your email for a verification link.",
    }, { status: 201 });

  } catch (err) {
    console.error("[signup] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// Enforce minimum 500ms response time to prevent timing attacks on email existence checks
async function enforceMinResponseTime(startTime: number) {
  const elapsed = Date.now() - startTime;
  if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
}
```

### Magic Link Verification Endpoint

```typescript
// src/app/api/auth/verify-email/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTokenHash } from "@/lib/auth/verification";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const email = request.nextUrl.searchParams.get("email");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!token || !email) {
    return NextResponse.redirect(`${appUrl}/verify?error=invalid`);
  }

  const supabase = createAdminClient();
  const normalizedEmail = decodeURIComponent(email).toLowerCase().trim();

  // Find the user and their latest email verification token
  const { data: user } = await supabase
    .from("users")
    .select("id, email_verified")
    .eq("email", normalizedEmail)
    .single();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/verify?error=not_found`);
  }

  // Already verified — skip to phone
  if (user.email_verified) {
    return NextResponse.redirect(`${appUrl}/verify/phone`);
  }

  // Find valid token
  const { data: tokenRecord } = await supabase
    .from("verification_tokens")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "email")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!tokenRecord) {
    return NextResponse.redirect(`${appUrl}/verify?error=expired`);
  }

  // Verify token hash
  if (!verifyTokenHash(token, tokenRecord.token_hash)) {
    return NextResponse.redirect(`${appUrl}/verify?error=invalid`);
  }

  // Mark email as verified
  await supabase.from("users").update({ email_verified: true }).eq("id", user.id);

  // Delete used token
  await supabase.from("verification_tokens").delete().eq("id", tokenRecord.id);

  // Log event
  await supabase.from("signup_events").insert({
    user_id: user.id,
    event: "email_verified",
  });

  // Redirect to phone verification
  return NextResponse.redirect(`${appUrl}/verify/phone`);
}
```

### Phone OTP — Send & Verify Endpoints

```typescript
// src/app/api/auth/verify-phone/send/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOtp } from "@/lib/auth/verification";
import { sendOtpSms } from "@/lib/auth/otp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { phone } = await request.json();

  // Validate E.164 format: strip non-digits, prepend +1 if needed
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 10 || clean.length > 15) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 422 });
  }
  const e164 = clean.startsWith("1") ? `+${clean}` : `+1${clean}`;

  const supabase = createAdminClient();

  // Check for duplicate phone (different user)
  const { data: existingPhone } = await supabase
    .from("users")
    .select("id, email")
    .eq("phone", e164)
    .neq("id", session.user.id)
    .single();

  if (existingPhone) {
    const maskedEmail = existingPhone.email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
    return NextResponse.json({
      error: `This phone is already registered to ${maskedEmail}`,
      duplicate: true,
    }, { status: 409 });
  }

  // Check rate limit: max 5 OTP sends per user per hour
  const { count } = await supabase
    .from("verification_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .eq("type", "phone")
    .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if ((count || 0) >= 5) {
    return NextResponse.json({ error: "Too many attempts. Try again in 1 hour." }, { status: 429 });
  }

  // Invalidate previous phone tokens for this user
  await supabase.from("verification_tokens").delete()
    .eq("user_id", session.user.id).eq("type", "phone");

  // Generate and store OTP
  const { otp, otpHash } = generateOtp();
  await supabase.from("verification_tokens").insert({
    user_id: session.user.id,
    type: "phone",
    token_hash: otpHash,
    identifier: e164,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
  });

  // Store phone on user (unverified)
  await supabase.from("users").update({ phone: e164 }).eq("id", session.user.id);

  // Send via Twilio
  await sendOtpSms(e164, otp);

  // Log event
  await supabase.from("signup_events").insert({
    user_id: session.user.id,
    event: "phone_sent",
    metadata: { phone: e164 },
  });

  return NextResponse.json({ success: true, phone: e164 });
}
```

```typescript
// src/app/api/auth/verify-phone/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTokenHash } from "@/lib/auth/verification";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { otp } = await request.json();
  if (!otp || typeof otp !== "string" || otp.length !== 6) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 422 });
  }

  const supabase = createAdminClient();

  // Find latest valid phone token
  const { data: tokenRecord } = await supabase
    .from("verification_tokens")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("type", "phone")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!tokenRecord) {
    return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 410 });
  }

  // Check lockout (5 failed attempts)
  if (tokenRecord.attempts >= tokenRecord.max_attempts) {
    const lockoutEnd = new Date(new Date(tokenRecord.created_at).getTime() + 30 * 60 * 1000);
    if (new Date() < lockoutEnd) {
      return NextResponse.json({
        error: `Too many attempts. Try again at ${lockoutEnd.toLocaleTimeString("en-CA", { timeZone: "America/Vancouver", hour: "numeric", minute: "2-digit" })}`,
        locked: true,
      }, { status: 429 });
    }
  }

  // Verify OTP
  if (!verifyTokenHash(otp, tokenRecord.token_hash)) {
    // Increment attempt counter
    await supabase.from("verification_tokens")
      .update({ attempts: tokenRecord.attempts + 1 })
      .eq("id", tokenRecord.id);

    const remaining = tokenRecord.max_attempts - tokenRecord.attempts - 1;
    return NextResponse.json({
      error: "Incorrect code. Try again.",
      remaining,
    }, { status: 422 });
  }

  // Success — verify phone and activate account
  await supabase.from("users").update({
    phone_verified: true,
    is_active: true,
  }).eq("id", session.user.id);

  // Delete used token
  await supabase.from("verification_tokens").delete().eq("id", tokenRecord.id);

  // Log events
  await supabase.from("signup_events").insert([
    { user_id: session.user.id, event: "phone_verified" },
    { user_id: session.user.id, event: "account_activated" },
  ]);

  return NextResponse.json({ success: true, verified: true });
}
```

### OTP Send via Twilio

```typescript
// src/lib/auth/otp.ts

import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

/**
 * Send a 6-digit OTP code via Twilio SMS.
 * Uses the same Twilio account as showing requests (src/lib/twilio.ts).
 * Message is plain text, no links (carrier-friendly, avoids spam filters).
 */
export async function sendOtpSms(phone: string, otp: string): Promise<string> {
  const message = await client.messages.create({
    body: `Your Realtors360 verification code is: ${otp}. Expires in 10 minutes. If you didn't request this, ignore this message.`,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phone, // E.164 format: +16045551234
  });

  return message.sid;
}
```

### Turnstile Server-Side Verification

```typescript
// src/lib/auth/turnstile.ts

/**
 * Verify Cloudflare Turnstile token server-side.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 * Returns true if valid, false if invalid/expired.
 */
export async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Graceful degradation: if no secret configured, skip Turnstile check
  // (falls back to rate limiting only)
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY not set — skipping verification");
    return true;
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: remoteIp,
      }),
    });

    const data = await res.json();
    // data.success is true/false. data["error-codes"] contains failure reasons.
    if (!data.success) {
      console.warn("[turnstile] Verification failed:", data["error-codes"]);
    }
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] API call failed:", err);
    return true; // Fail open — don't block legitimate users if Turnstile is down
  }
}
```

### Rate Limiter

```typescript
// src/lib/auth/rate-limiter.ts

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS_PER_IP = 5;
const WINDOW_HOURS = 1;

/**
 * IP-based rate limiter for signup attempts.
 * Stores attempt counts in signup_rate_limits table (cleaned up daily).
 * Returns { allowed: true } or { allowed: false, retryAfter: "3:42 PM" }.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  ip: string
): Promise<{ allowed: boolean; retryAfter?: string }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);

  // Check existing rate limit record
  const { data: existing } = await supabase
    .from("signup_rate_limits")
    .select("*")
    .eq("ip_address", ip)
    .single();

  // No record — first attempt from this IP
  if (!existing) {
    await supabase.from("signup_rate_limits").insert({
      ip_address: ip,
      attempt_count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true };
  }

  // Check if locked out
  if (existing.locked_until && new Date(existing.locked_until) > now) {
    const retryAfter = new Date(existing.locked_until).toLocaleTimeString("en-CA", {
      timeZone: "America/Vancouver", hour: "numeric", minute: "2-digit",
    });
    return { allowed: false, retryAfter };
  }

  // Window expired — reset counter
  if (new Date(existing.window_start) < windowStart) {
    await supabase.from("signup_rate_limits").update({
      attempt_count: 1,
      window_start: now.toISOString(),
      locked_until: null,
    }).eq("ip_address", ip);
    return { allowed: true };
  }

  // Within window — check count
  if (existing.attempt_count >= MAX_ATTEMPTS_PER_IP) {
    const lockUntil = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
    await supabase.from("signup_rate_limits").update({
      locked_until: lockUntil.toISOString(),
    }).eq("ip_address", ip);

    const retryAfter = lockUntil.toLocaleTimeString("en-CA", {
      timeZone: "America/Vancouver", hour: "numeric", minute: "2-digit",
    });
    return { allowed: false, retryAfter };
  }

  // Increment counter
  await supabase.from("signup_rate_limits").update({
    attempt_count: existing.attempt_count + 1,
  }).eq("ip_address", ip);
  return { allowed: true };
}
```

### Disposable Email Check

```typescript
// src/lib/auth/disposable-check.ts

import disposableDomains from "./disposable-domains.json";

// disposable-domains.json is an array of 200+ domains:
// ["mailinator.com", "tempmail.com", "guerrillamail.com", "yopmail.com",
//  "throwaway.email", "sharklasers.com", "maildrop.cc", "dispostable.com", ...]

const domainSet = new Set(disposableDomains as string[]);

/**
 * Check if an email uses a known disposable/temporary email domain.
 * Allows Gmail/Outlook "+" aliases (those are legitimate).
 * Blocks "+" aliases only if the base domain is disposable.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return domainSet.has(domain);
}
```

### Middleware Verification Gate — Full Implementation

```typescript
// Additions to src/middleware.ts
// Insert after the existing session check, before the "return NextResponse.next()" fallthrough.
// This reads verification claims from the JWT without a DB hit.

import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Public routes — always allow ──
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/verify" ||
    pathname.startsWith("/verify/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/sdk/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/contacts/import-gmail") ||
    pathname.startsWith("/api/contacts/import-vcard") ||
    // ... (existing public routes unchanged)
  ) {
    return NextResponse.next();
  }

  // ── Check for auth session cookie ──
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (pathname.startsWith("/api") && !sessionToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!sessionToken && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Verification gate — decode JWT, check verification status ──
  // getToken reads the JWT without a DB call (NextAuth JWT strategy)
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (token) {
    // Email not verified → redirect to /verify
    if (token.email_verified === false) {
      if (!pathname.startsWith("/api")) {
        return NextResponse.redirect(new URL("/verify", request.url));
      }
      return NextResponse.json({ error: "Email not verified" }, { status: 403 });
    }

    // Phone not verified → redirect to /verify/phone
    if (token.phone_verified === false) {
      // Grace period for existing users: check if account was created before this feature
      const isLegacyUser = token.created_before_verification === true;
      const gracePeriodDays = 30;

      if (!isLegacyUser) {
        // New users: hard gate
        if (!pathname.startsWith("/api")) {
          return NextResponse.redirect(new URL("/verify/phone", request.url));
        }
        return NextResponse.json({ error: "Phone not verified" }, { status: 403 });
      }
      // Legacy users: soft prompt handled by client-side banner (not middleware redirect)
    }
  }

  return NextResponse.next();
}
```

### NextAuth Provider Configuration — Apple & Facebook

```typescript
// Additions to src/lib/auth-options.ts (NextAuth config)

import AppleProvider from "next-auth/providers/apple";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

// Inside authOptions.providers array:
providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
      params: {
        // Request contacts.readonly scope for Gmail import during onboarding
        // Users who signed up with Google can import contacts without re-authenticating
        scope: "openid email profile https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/calendar",
        prompt: "consent",
        access_type: "offline", // Get refresh token for background sync
      },
    },
  }),

  AppleProvider({
    clientId: process.env.APPLE_SERVICE_ID!,       // e.g. "com.realtors360.auth"
    clientSecret: process.env.APPLE_CLIENT_SECRET!, // Generated from Apple private key
    // Apple Sign-In setup:
    // 1. Apple Developer Console → Certificates, Identifiers & Profiles
    // 2. Create Services ID (com.realtors360.auth) → configure Web Authentication
    // 3. Domain: realtors360.com, Return URL: https://realtors360.com/api/auth/callback/apple
    // 4. Create a Key (Sign in with Apple) → download .p8 file
    // 5. Generate client secret: JWT signed with the .p8 key
    //    (use apple-auth-token-generator npm or manual JWT: iss=TEAM_ID, aud=https://appleid.apple.com, sub=SERVICE_ID)
    // 6. Secret rotates every 6 months — set up cron or manual renewal
  }),

  FacebookProvider({
    clientId: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    // Facebook Login setup:
    // 1. developers.facebook.com → Create App → Consumer type
    // 2. Add "Facebook Login" product
    // 3. Valid OAuth Redirect URIs: https://realtors360.com/api/auth/callback/facebook
    // 4. App Review: submit for "email" permission (auto-approved)
    // 5. Note: Facebook provides email only if user's FB email is verified
  }),

  // ... existing CredentialsProvider
],

// In callbacks.jwt — inject verification claims into JWT:
callbacks: {
  async jwt({ token, user, account }) {
    if (user) {
      token.id = user.id;
      token.email_verified = user.email_verified ?? false;
      token.phone_verified = user.phone_verified ?? false;
      token.onboarding_completed = user.onboarding_completed ?? false;

      // If OAuth signup (Google/Apple/Facebook), auto-verify email
      if (account?.provider && ["google", "apple", "facebook"].includes(account.provider)) {
        token.email_verified = true;

        // Store OAuth access token for contact import (Google)
        if (account.provider === "google" && account.access_token) {
          // Save to user_integrations for later use in contact import
          const supabase = createAdminClient();
          await supabase.from("user_integrations").upsert({
            user_id: user.id,
            provider: "google_contacts",
            access_token: account.access_token,
            refresh_token: account.refresh_token || "",
            token_expires_at: account.expires_at
              ? new Date(account.expires_at * 1000).toISOString()
              : null,
            scopes: (account.scope || "").split(" "),
          }, { onConflict: "user_id,provider" });
        }
      }
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string;
      session.user.email_verified = token.email_verified as boolean;
      session.user.phone_verified = token.phone_verified as boolean;
      session.user.onboarding_completed = token.onboarding_completed as boolean;
    }
    return session;
  },
},
```

### Password Strength Scoring Algorithm

```typescript
// src/components/auth/PasswordStrength.tsx — scoring logic

/**
 * Password strength scoring (0-100).
 * Matches OWASP recommendations without being hostile to users.
 *
 * Scoring:
 * - Base: length (8=20pts, 10=30pts, 12=40pts, 14+=50pts)
 * - +15pts: has uppercase letter
 * - +15pts: has number
 * - +10pts: has special character (!@#$%^&*...)
 * - +10pts: no common patterns (123, abc, password, qwerty)
 *
 * Thresholds:
 * - 0-39:  "Weak" (red) — submit blocked
 * - 40-69: "Medium" (amber) — submit allowed
 * - 70+:   "Strong" (green) — submit allowed
 */
export function scorePassword(password: string): {
  score: number;
  level: "weak" | "medium" | "strong";
  checks: { label: string; passed: boolean }[];
} {
  let score = 0;
  const checks = [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "Contains uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "Contains a number", passed: /[0-9]/.test(password) },
    { label: "Contains special character", passed: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  // Length scoring
  if (password.length >= 14) score += 50;
  else if (password.length >= 12) score += 40;
  else if (password.length >= 10) score += 30;
  else if (password.length >= 8) score += 20;

  // Character diversity
  if (checks[1].passed) score += 15;
  if (checks[2].passed) score += 15;
  if (checks[3].passed) score += 10;

  // Common pattern penalty
  const commonPatterns = ["password", "123456", "qwerty", "abc123", "letmein", "welcome", "admin"];
  const hasCommonPattern = commonPatterns.some((p) => password.toLowerCase().includes(p));
  if (!hasCommonPattern) score += 10;

  const level = score >= 70 ? "strong" : score >= 40 ? "medium" : "weak";
  return { score, level, checks };
}
```

### Profile Completeness Calculation

```typescript
// src/actions/onboarding.ts — profile completeness

/**
 * Recalculate profile completeness for a user.
 * 10 fields, 10% each = 0-100%.
 * Called after any profile update, or by cron every 6 hours.
 */
export async function recalculateProfileCompleteness(userId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("name, email_verified, phone_verified, avatar_url, brokerage, license_number, timezone, bio")
    .eq("id", userId)
    .single();

  if (!user) return 0;

  // Check Google Calendar connected
  const { data: calendarIntegration } = await supabase
    .from("user_integrations")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .single();

  // Check if user has imported at least 1 real contact
  const { count: realContactCount } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("realtor_id", userId)
    .eq("is_sample", false);

  // Score each field (10% each)
  let completeness = 0;
  if (user.name && user.name.trim().length >= 2) completeness += 10;          // 1. Name
  if (user.email_verified) completeness += 10;                                 // 2. Email verified
  if (user.phone_verified) completeness += 10;                                 // 3. Phone verified
  if (user.avatar_url) completeness += 10;                                     // 4. Headshot
  if (user.brokerage && user.brokerage.trim().length > 0) completeness += 10;  // 5. Brokerage
  if (user.license_number && user.license_number.trim().length > 0) completeness += 10; // 6. License
  if (calendarIntegration) completeness += 10;                                 // 7. Calendar
  if (user.timezone && user.timezone !== "America/Vancouver") completeness += 10; // 8. Timezone (must actively set)
  if (user.bio && user.bio.trim().length >= 10) completeness += 10;            // 9. Bio
  if ((realContactCount || 0) >= 1) completeness += 10;                        // 10. Contacts imported

  // Persist
  await supabase.from("users")
    .update({ profile_completeness: completeness })
    .eq("id", userId);

  return completeness;
}
```

### Contact Import API — Gmail Endpoint

```typescript
// src/app/api/contacts/import-gmail/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchGmailContacts } from "@/lib/contacts/gmail-import";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// GET: Fetch contacts from Gmail (returns preview list for user to select)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get stored Google access token
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", session.user.id)
    .eq("provider", "google_contacts")
    .single();

  if (!integration) {
    return NextResponse.json({
      error: "Google not connected. Please sign in with Google first.",
      needs_auth: true,
    }, { status: 403 });
  }

  // TODO: Check token expiry and refresh if needed using refresh_token
  // (googleapis library handles this if refresh_token is set on the OAuth2 client)

  try {
    const contacts = await fetchGmailContacts(integration.access_token);

    // Check for existing contacts (dedup by email)
    const existingEmails = new Set<string>();
    const { data: existing } = await supabase
      .from("contacts")
      .select("email")
      .eq("realtor_id", session.user.id)
      .not("email", "is", null);

    for (const c of existing || []) {
      if (c.email) existingEmails.add(c.email.toLowerCase());
    }

    // Mark duplicates in the response
    const contactsWithDedup = contacts.map((c) => ({
      ...c,
      already_exists: c.email ? existingEmails.has(c.email.toLowerCase()) : false,
    }));

    return NextResponse.json({
      contacts: contactsWithDedup,
      total: contacts.length,
      duplicates: contactsWithDedup.filter((c) => c.already_exists).length,
    });
  } catch (err: any) {
    console.error("[gmail-import] Fetch error:", err.message);
    return NextResponse.json({ error: "Failed to fetch contacts from Gmail" }, { status: 500 });
  }
}

// POST: Import selected contacts into CRM
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { contacts } = await request.json();
  // contacts: Array<{ resourceName, name, email, phone, company }>

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "No contacts selected" }, { status: 422 });
  }
  if (contacts.length > 2000) {
    return NextResponse.json({ error: "Maximum 2000 contacts per import" }, { status: 422 });
  }

  const supabase = createAdminClient();
  let imported = 0;
  let skipped = 0;

  // Batch insert in chunks of 50
  for (let i = 0; i < contacts.length; i += 50) {
    const batch = contacts.slice(i, i + 50);
    const rows = batch.map((c: any) => ({
      realtor_id: session.user.id,
      name: c.name || "Unknown",
      email: c.email || null,
      phone: c.phone || null,
      company: c.company || null,
      type: "lead",                    // Default type, user can recategorize later
      source: "gmail_import",
      external_id: c.resourceName,     // For dedup on re-import
      is_sample: false,
    }));

    const { data, error } = await supabase
      .from("contacts")
      .upsert(rows, {
        onConflict: "realtor_id,email", // Skip duplicates by email
        ignoreDuplicates: true,
      })
      .select("id");

    if (data) imported += data.length;
    if (error) {
      console.error("[gmail-import] Batch insert error:", error.message);
      skipped += batch.length;
    }
  }

  // Log event
  await supabase.from("signup_events").insert({
    user_id: session.user.id,
    event: "contacts_imported",
    metadata: { source: "gmail", imported, skipped, total: contacts.length },
  });

  // Delete sample data if user now has real contacts
  if (imported > 0) {
    await supabase.from("contacts").delete()
      .eq("realtor_id", session.user.id)
      .eq("is_sample", true);
  }

  // Recalculate profile completeness
  const { recalculateProfileCompleteness } = await import("@/actions/onboarding");
  await recalculateProfileCompleteness(session.user.id);

  return NextResponse.json({ imported, skipped, total: contacts.length });
}
```

### vCard Import Endpoint

```typescript
// src/app/api/contacts/import-vcard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseVCard } from "@/lib/contacts/vcard-parser";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// POST: Upload .vcf file, parse, return preview
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  // If multipart form data — file upload (preview mode)
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || !file.name.endsWith(".vcf")) {
      return NextResponse.json({ error: "Please upload a .vcf file" }, { status: 422 });
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 422 });
    }

    const vcfContent = await file.text();
    const contacts = parseVCard(vcfContent);

    // Check for existing contacts (dedup by email)
    const supabase = createAdminClient();
    const existingEmails = new Set<string>();
    const { data: existing } = await supabase
      .from("contacts")
      .select("email")
      .eq("realtor_id", session.user.id)
      .not("email", "is", null);

    for (const c of existing || []) {
      if (c.email) existingEmails.add(c.email.toLowerCase());
    }

    const contactsWithDedup = contacts.map((c) => ({
      ...c,
      already_exists: c.email ? existingEmails.has(c.email.toLowerCase()) : false,
    }));

    return NextResponse.json({
      contacts: contactsWithDedup,
      total: contacts.length,
      duplicates: contactsWithDedup.filter((c) => c.already_exists).length,
    });
  }

  // If JSON — import selected contacts (same pattern as Gmail import POST)
  const { contacts } = await request.json();
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "No contacts selected" }, { status: 422 });
  }

  const supabase = createAdminClient();
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < contacts.length; i += 50) {
    const batch = contacts.slice(i, i + 50);
    const rows = batch.map((c: any) => ({
      realtor_id: session.user.id,
      name: c.name || "Unknown",
      email: c.email || null,
      phone: c.phone || null,
      company: c.company || null,
      type: "lead",
      source: "apple_import",
      is_sample: false,
    }));

    const { data, error } = await supabase
      .from("contacts")
      .upsert(rows, { onConflict: "realtor_id,email", ignoreDuplicates: true })
      .select("id");

    if (data) imported += data.length;
    if (error) skipped += batch.length;
  }

  // Log + cleanup sample data + recalculate (same as Gmail)
  await supabase.from("signup_events").insert({
    user_id: session.user.id,
    event: "contacts_imported",
    metadata: { source: "apple", imported, skipped, total: contacts.length },
  });

  if (imported > 0) {
    await supabase.from("contacts").delete()
      .eq("realtor_id", session.user.id).eq("is_sample", true);
  }

  const { recalculateProfileCompleteness } = await import("@/actions/onboarding");
  await recalculateProfileCompleteness(session.user.id);

  return NextResponse.json({ imported, skipped, total: contacts.length });
}
```

### Headshot Upload — Supabase Storage

```typescript
// Part of src/actions/onboarding.ts

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Upload user headshot to Supabase Storage.
 * Bucket: "avatars" (public, CDN-cached)
 * Path: avatars/{user_id}/headshot.{ext}
 * Max size: 5MB. Accepted: jpg, png, webp.
 * Returns the public URL.
 */
export async function uploadHeadshot(userId: string, file: File): Promise<{ url: string } | { error: string }> {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (file.size > maxSize) {
    return { error: "Image must be under 5MB" };
  }
  if (!allowedTypes.includes(file.type)) {
    return { error: "Only JPG, PNG, and WebP images are accepted" };
  }

  const ext = file.type.split("/")[1]; // jpeg, png, webp
  const filePath = `${userId}/headshot.${ext}`;

  const supabase = createAdminClient();

  // Upload (overwrite if exists)
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600", // 1 hour CDN cache
    });

  if (uploadError) {
    console.error("[headshot] Upload error:", uploadError.message);
    return { error: "Failed to upload image. Please try again." };
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const publicUrl = urlData.publicUrl;

  // Update user record
  await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", userId);

  // Recalculate profile completeness
  await recalculateProfileCompleteness(userId);

  return { url: publicUrl };
}
```

### Brokerage Auto-Detect Query

```typescript
// Part of src/actions/onboarding.ts

/**
 * Search existing brokerages in the users table for auto-suggest.
 * Returns unique brokerage names matching the query prefix.
 * Used in onboarding Step 4 and settings page.
 */
export async function searchBrokerages(query: string): Promise<string[]> {
  if (!query || query.trim().length < 2) return [];

  const supabase = createAdminClient();

  // Use ilike for case-insensitive prefix search
  // Distinct brokerages, ordered by frequency (most common first)
  const { data } = await supabase
    .from("users")
    .select("brokerage")
    .ilike("brokerage", `${query.trim()}%`)
    .not("brokerage", "is", null)
    .limit(10);

  if (!data) return [];

  // Deduplicate and sort by frequency
  const counts = new Map<string, number>();
  for (const row of data) {
    if (row.brokerage) {
      const key = row.brokerage.trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 5);
}
```

### Welcome Drip Cron — Full Logic

```typescript
// src/app/api/cron/welcome-drip/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

// Drip schedule: which day → which email → which skip condition
const DRIP_SCHEDULE = [
  {
    day: 0,
    subject: "Welcome to Realtors360!",
    template: "WelcomeDay0",
    skipIf: null, // Always send Day 0
  },
  {
    day: 1,
    subject: "Your contacts are waiting",
    template: "WelcomeDay1",
    skipIf: "has_contacts", // Skip if user imported contacts during onboarding
  },
  {
    day: 2,
    subject: "Connect your Google Calendar",
    template: "WelcomeDay2",
    skipIf: "has_calendar", // Skip if already connected
  },
  {
    day: 3,
    subject: "Send your first email campaign",
    template: "WelcomeDay3",
    skipIf: "has_sent_email", // Skip if already sent a newsletter
  },
  {
    day: 5,
    subject: "Meet your AI assistant",
    template: "WelcomeDay5",
    skipIf: null, // Always send — AI features are new to everyone
  },
  {
    day: 7,
    subject: "You're doing great! Ready for more?",
    template: "WelcomeDay7",
    skipIf: null, // Always send — includes usage summary
  },
];

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  let sent = 0;
  let skipped = 0;

  for (const drip of DRIP_SCHEDULE) {
    // Find users who:
    // 1. Created their account exactly `drip.day` days ago (±12 hours window)
    // 2. Have NOT received this drip day's email yet
    // 3. Are active (verified)
    // 4. Have not unsubscribed from welcome emails

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - drip.day);
    const windowStart = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000).toISOString();

    const { data: users } = await supabase
      .from("users")
      .select("id, name, email, plan, created_at")
      .eq("is_active", true)
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd)
      .limit(500); // Process in batches

    if (!users || users.length === 0) continue;

    for (const user of users) {
      // Check if already sent
      const { data: alreadySent } = await supabase
        .from("welcome_drip_log")
        .select("id")
        .eq("user_id", user.id)
        .eq("day", drip.day)
        .single();

      if (alreadySent) continue;

      // Check skip condition
      let shouldSkip = false;
      if (drip.skipIf === "has_contacts") {
        const { count } = await supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("realtor_id", user.id)
          .eq("is_sample", false);
        shouldSkip = (count || 0) >= 3;
      } else if (drip.skipIf === "has_calendar") {
        const { data: cal } = await supabase
          .from("user_integrations")
          .select("id")
          .eq("user_id", user.id)
          .eq("provider", "google_calendar")
          .single();
        shouldSkip = !!cal;
      } else if (drip.skipIf === "has_sent_email") {
        const { count } = await supabase
          .from("newsletter_sends")
          .select("id", { count: "exact", head: true })
          .eq("realtor_id", user.id);
        shouldSkip = (count || 0) >= 1;
      }

      if (shouldSkip) {
        // Log as skipped (so we don't re-check next run)
        await supabase.from("welcome_drip_log").insert({
          user_id: user.id, day: drip.day, skipped: true,
        });
        skipped++;
        continue;
      }

      // Render and send email
      try {
        const firstName = user.name?.split(" ")[0] || "there";
        // Dynamic import of email template
        const templateModule = await import(`@/emails/${drip.template}`);
        const html = templateModule.render({ firstName, plan: user.plan });

        const result = await sendEmail({
          to: user.email,
          subject: drip.subject,
          html,
          from: process.env.WELCOME_FROM_EMAIL || "welcome@realtors360.com",
          tags: [
            { name: "type", value: "welcome-drip" },
            { name: "day", value: String(drip.day) },
          ],
        });

        await supabase.from("welcome_drip_log").insert({
          user_id: user.id,
          day: drip.day,
          message_id: result.messageId,
        });

        sent++;
      } catch (err: any) {
        console.error(`[welcome-drip] Failed for user ${user.id} day ${drip.day}:`, err.message);
      }
    }
  }

  return NextResponse.json({ sent, skipped, processed: sent + skipped });
}
```

### Email Verification Template — React Email

```tsx
// src/emails/VerifyEmail.tsx

/**
 * Branded magic link verification email.
 * Sent immediately after signup. Contains single CTA button.
 * Plain-text fallback included for email clients that block HTML.
 */
export function renderVerifyEmail(props: { name: string; verifyUrl: string }): string {
  const { name, verifyUrl } = props;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(79,53,210,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4f35d2,#3d28a8);padding:32px 40px;text-align:center;">
          <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <span style="color:#fff;font-size:20px;font-weight:700;">R</span>
          </div>
          <h1 style="color:#fff;font-size:22px;margin:0;">Verify your email</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <p style="color:#1a1535;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ${name},</p>
          <p style="color:#4a4a68;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Thanks for signing up for Realtors360! Click the button below to verify your email address and activate your account.
          </p>
          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${verifyUrl}" style="display:inline-block;background:#4f35d2;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">
              Verify my email
            </a>
          </td></tr></table>
          <p style="color:#9994b3;font-size:12px;line-height:1.6;margin:24px 0 0;text-align:center;">
            This link expires in 15 minutes. If you didn't create an account, you can safely ignore this email.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #eee;text-align:center;">
          <p style="color:#9994b3;font-size:11px;margin:0;">Realtors360 — AI-Powered Real Estate CRM</p>
          <p style="color:#9994b3;font-size:11px;margin:4px 0 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" style="color:#4f35d2;text-decoration:underline;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
```

### Google People API Integration

```typescript
// src/lib/contacts/gmail-import.ts

import { google } from "googleapis";

interface GmailContact {
  resourceName: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

/**
 * Fetch contacts from Google People API using OAuth access token.
 * Paginates through all connections (max 2000).
 * Uses existing googleapis package (already installed at 171.x).
 *
 * API quota: 90 requests/min/user (each page = 1 request).
 * At 200 contacts/page, 2000 contacts = 10 requests = well within quota.
 */
export async function fetchGmailContacts(accessToken: string): Promise<GmailContact[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const people = google.people({ version: "v1", auth });
  const contacts: GmailContact[] = [];
  let nextPageToken: string | undefined;

  do {
    const res = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 200, // Max per request (Google People API limit)
      personFields: "names,emailAddresses,phoneNumbers,organizations",
      pageToken: nextPageToken,
      sortOrder: "LAST_NAME_ASCENDING",
    });

    for (const person of res.data.connections || []) {
      contacts.push({
        resourceName: person.resourceName || "",
        name: person.names?.[0]?.displayName || "Unknown",
        email: person.emailAddresses?.[0]?.value || null,
        phone: person.phoneNumbers?.[0]?.value || null,
        company: person.organizations?.[0]?.name || null,
      });
    }

    nextPageToken = res.data.nextPageToken || undefined;
  } while (nextPageToken && contacts.length < 2000);

  return contacts;
}
```

### vCard Parser

```typescript
// src/lib/contacts/vcard-parser.ts

interface VCardContact {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
}

/**
 * Parse a vCard (.vcf) file string into structured contacts.
 * Supports vCard 3.0 (Apple Contacts default) and 4.0 formats.
 *
 * Apple exports all contacts as a single .vcf with multiple BEGIN:VCARD blocks.
 * Each block is one contact. We split on BEGIN:VCARD and parse each block.
 *
 * Key vCard properties we extract:
 *   FN:       Full name (display name)
 *   EMAIL:    Email address (may have ;type=INTERNET;type=HOME prefix)
 *   TEL:      Phone number (may have ;type=CELL;type=VOICE prefix)
 *   ORG:      Organization/company (semicolon-separated hierarchy)
 *   ADR:      Address (7 semicolon-separated components: PO;ext;street;city;region;postal;country)
 *   NOTE:     Free-text notes
 *
 * We take the FIRST email and FIRST phone only (contacts may have multiple).
 * Unfolds continuation lines (RFC 6350: lines starting with space/tab are continuations).
 */
export function parseVCard(vcfContent: string): VCardContact[] {
  // First, unfold continuation lines (lines starting with space/tab join to previous line)
  const unfolded = vcfContent.replace(/\r?\n[ \t]/g, "");

  const contacts: VCardContact[] = [];
  const cards = unfolded.split("BEGIN:VCARD").slice(1);

  for (const card of cards) {
    const lines = card.split(/\r?\n/);
    const contact: VCardContact = {
      name: "", email: null, phone: null,
      company: null, address: null, notes: null,
    };

    for (const line of lines) {
      if (line.startsWith("FN:") || line.startsWith("FN;")) {
        contact.name = extractValue(line);
      } else if (line.startsWith("EMAIL")) {
        contact.email = contact.email || extractValue(line);
      } else if (line.startsWith("TEL")) {
        contact.phone = contact.phone || extractValue(line);
      } else if (line.startsWith("ORG")) {
        // ORG is semicolon-separated hierarchy: "Company;Department"
        contact.company = extractValue(line).split(";").filter(Boolean).join(" - ").trim();
      } else if (line.startsWith("ADR")) {
        // ADR: PO Box;Extended;Street;City;Region;Postal;Country
        const parts = extractValue(line).split(";").filter(Boolean);
        contact.address = parts.join(", ").trim() || null;
      } else if (line.startsWith("NOTE")) {
        contact.notes = extractValue(line);
      }
    }

    // Only include contacts with a name
    if (contact.name && contact.name !== "Unknown") {
      contacts.push(contact);
    }
  }

  return contacts;
}

/**
 * Extract the value part from a vCard property line.
 * Handles property parameters like "EMAIL;type=INTERNET:user@example.com"
 * Returns everything after the first colon.
 */
function extractValue(line: string): string {
  const colonIndex = line.indexOf(":");
  if (colonIndex < 0) return "";
  let value = line.slice(colonIndex + 1).trim();
  // Unescape vCard escaped characters
  value = value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\\\/g, "\\");
  return value;
}
```

### Token Generation & Verification Logic

```typescript
// src/lib/auth/verification.ts

import { createHash, randomUUID, randomInt } from "crypto";

/**
 * Generate a magic link token for email verification.
 * Uses UUID v4 (122 bits of randomness) — sufficient for single-use tokens.
 * Stored as SHA-256 hash in DB (if DB is compromised, tokens can't be reconstructed).
 */
export function generateMagicLinkToken(): { token: string; tokenHash: string } {
  const token = randomUUID();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

/**
 * Generate a 6-digit OTP for phone verification.
 * Uses crypto.randomInt (CSPRNG) — not Math.random (predictable).
 * Range: 100000-999999 (always 6 digits, no leading zeros).
 */
export function generateOtp(): { otp: string; otpHash: string } {
  const otp = randomInt(100000, 999999).toString();
  const otpHash = createHash("sha256").update(otp).digest("hex");
  return { otp, otpHash };
}

/**
 * Constant-time comparison of a plaintext token against a stored hash.
 * Prevents timing attacks — comparison takes the same time for any input.
 */
export function verifyTokenHash(input: string, storedHash: string): boolean {
  const inputHash = createHash("sha256").update(input).digest("hex");
  // Use timingSafeEqual for constant-time comparison
  const a = Buffer.from(inputHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return require("crypto").timingSafeEqual(a, b);
}
```

### Cron Jobs — Full Implementation Details

| Cron | Schedule | SQL / Logic |
|------|----------|-------------|
| `/api/cron/welcome-drip` | Daily 9 AM PST | See full implementation above. Queries `users` WHERE `created_at` in each day's window, LEFT JOIN `welcome_drip_log` to find unsent, checks skip conditions per feature. |
| `/api/cron/cleanup-tokens` | Daily 2 AM PST | `DELETE FROM verification_tokens WHERE expires_at < now() - interval '24 hours';` Also: `DELETE FROM signup_rate_limits WHERE window_start < now() - interval '24 hours';` |
| `/api/cron/cleanup-sample-data` | Daily 3 AM PST | `DELETE FROM contacts WHERE is_sample = true AND realtor_id IN (SELECT id FROM users WHERE created_at < now() - interval '30 days');` Also deletes sample data for users with 3+ real contacts: `DELETE FROM contacts WHERE is_sample = true AND realtor_id IN (SELECT realtor_id FROM contacts WHERE is_sample = false GROUP BY realtor_id HAVING COUNT(*) >= 3);` Same for `listings` and `tasks` with `is_sample = true`. |
| `/api/cron/profile-completeness` | Every 6 hours | Calls `recalculateProfileCompleteness(userId)` for all active users. Batch: `SELECT id FROM users WHERE is_active = true;` then loop. Alternative: trigger on profile update via server action (more efficient, but cron is backup). |

### External Service Configuration

| Service | Purpose | Config Needed | Setup Steps |
|---------|---------|---------------|-------------|
| **Resend** | Magic link emails + welcome drip | Already configured (`RESEND_API_KEY`). New: add domain verification for `welcome@realtors360.com` sender. | 1. Resend dashboard → Domains → Add `realtors360.com`. 2. Add DNS records: DKIM (3 CNAME), SPF (TXT), DMARC (TXT `v=DMARC1; p=quarantine`). 3. Verify domain. 4. Create sender: `welcome@realtors360.com`. |
| **Twilio** | SMS OTP | Already configured (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`). New: none — reuses existing. | Already working for showing requests. OTP uses same `client.messages.create()` API. |
| **Google People API** | Gmail contact import | New OAuth scope: `contacts.readonly`. Uses existing `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`. | 1. Google Cloud Console → APIs & Services → Enable "People API". 2. OAuth consent screen → add scope: `https://www.googleapis.com/auth/contacts.readonly`. 3. Update NextAuth Google provider config (see above). 4. Submit for verification if >100 users (Google requires verified apps for sensitive scopes). |
| **Cloudflare Turnstile** | Bot protection | New env vars: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. | 1. Cloudflare dashboard → Turnstile → Add widget. 2. Widget type: "Invisible" (no user interaction). 3. Allowed domains: `localhost`, `realtors360.com`. 4. Copy site key + secret key to `.env.local`. 5. Install: `npm i @marsidev/react-turnstile` (9KB, React wrapper). |
| **Apple Developer** | Apple Sign-In | New: `APPLE_SERVICE_ID`, `APPLE_CLIENT_SECRET`. Requires Apple Developer Program ($99/yr). | 1. developer.apple.com → Identifiers → Register Services ID: `com.realtors360.auth`. 2. Configure Web Authentication: domain `realtors360.com`, return URL `https://realtors360.com/api/auth/callback/apple`. 3. Create Key → enable "Sign in with Apple" → download `.p8` file. 4. Generate client secret JWT using Team ID + Key ID + .p8 file (rotates every 6 months). 5. Store in `.env.vault`. |
| **Facebook Developer** | Facebook Login | New: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`. Free. | 1. developers.facebook.com → Create App → "Consumer" type. 2. Add product: "Facebook Login for Web". 3. Valid OAuth Redirect URIs: `https://realtors360.com/api/auth/callback/facebook`. 4. Settings → Basic → copy App ID + App Secret. 5. App Review: "email" permission is auto-approved. "public_profile" is default. 6. Go live (toggle from Development to Live mode). |

### NPM Dependencies

| Package | Purpose | Version | Install |
|---------|---------|---------|---------|
| `googleapis` | Google People API for contact import | Already installed (171.x) | N/A |
| `@marsidev/react-turnstile` | Cloudflare Turnstile React component (9KB gzipped) | Latest | `npm i @marsidev/react-turnstile` |
| No vCard library | Custom parser (see `vcard-parser.ts`) — 60 lines, no dependency needed | N/A | N/A |
| No new auth libraries | NextAuth already supports Apple + Facebook providers built-in | N/A | N/A |

---

## 7. Launch Plan

### Phase 1: Verified Signup — Core (2 weeks)

**Week 1: Backend + Infrastructure**
1. Create migration `073_verification_and_onboarding.sql` — run and verify all tables/columns created correctly
2. Implement `src/lib/auth/verification.ts` (token generation + hashing) — unit test with 100 tokens
3. Implement `src/lib/auth/otp.ts` (Twilio send) — test with real phone number
4. Implement `src/lib/auth/rate-limiter.ts` — test: 6th attempt from same IP returns 429
5. Build `POST /api/auth/signup` rewrite — full pipeline: validation → disposable check → rate limit → create user → generate token → send magic link
6. Build `GET /api/auth/verify-email` — test: valid token verifies, expired token shows error, double-click redirects to phone
7. Build `POST /api/auth/verify-phone/send` + `POST /api/auth/verify-phone/verify` — test: correct OTP activates account, wrong OTP increments attempts, 5th wrong OTP locks out

**Week 2: Frontend + Middleware**
8. Redesign `/signup` page — split-panel layout, shadcn components, social auth buttons (Google only initially), password strength meter
9. Build `/verify` page — "Check your email" screen with countdown, resend button, "Open Gmail" link
10. Build `/verify/phone` page — phone input with country selector, 6-digit OTP input with auto-advance, resend cooldown
11. Update `middleware.ts` — verification gate (JWT decode, redirect logic, public route additions)
12. Update NextAuth JWT callbacks — inject `email_verified`, `phone_verified` into session token
13. Build `renderVerifyEmail()` template — test renders correctly in Gmail, Outlook, Apple Mail
14. Build cleanup-tokens cron — test: expired tokens deleted, valid tokens preserved

**Launch gate:** 10+ test signups complete full flow: signup → magic link → phone OTP → dashboard. Measure: average time to complete <3 minutes, zero errors on happy path. Existing users can still log in without being blocked (backfill migration verified). Rate limiter blocks 6th attempt.

### Phase 2: Contact Import + Onboarding Wizard (2 weeks)

**Week 3: Contact Import Backend**
1. Enable Google People API in Cloud Console — verify scope works with existing OAuth client
2. Implement `src/lib/contacts/gmail-import.ts` — test: fetches 200+ contacts, paginates correctly, handles empty accounts
3. Implement `src/lib/contacts/vcard-parser.ts` — test with 5 real vCard files: Apple Contacts export (vCard 3.0), iCloud export (vCard 4.0), multi-contact file (500+), file with missing fields, file with non-Latin characters (Chinese, Punjabi names)
4. Build `GET /api/contacts/import-gmail` — test: returns contact list with dedup flags
5. Build `POST /api/contacts/import-gmail` — test: imports 100 contacts in <5 seconds, dedup works, sample data cleared
6. Build `POST /api/contacts/import-vcard` (multipart upload + JSON import) — test: 10MB file parses without timeout

**Week 4: Onboarding UI**
7. Build `ContactImportPreview.tsx` — search, filter, select all, dedup badges, import progress bar. Test: renders 500 contacts without lag (virtualized list)
8. Build `StepHeadshot.tsx` — drag-and-drop upload, Supabase Storage integration, preview. Test: 5MB JPG uploads in <3s
9. Build `StepContactImport.tsx` — Gmail OAuth button + vCard uploader + preview. Test: full flow from button click to "42 imported!"
10. Build `StepCalendar.tsx`, `StepProfessionalInfo.tsx`, `StepChooseAction.tsx`
11. Build `OnboardingWizard.tsx` — 5-step container with progress bar, step persistence in DB, skip links
12. Build `ProfileCompletenessBar.tsx` — persistent dashboard bar, recalculate on profile update. Test: shows correct % after each field completion
13. Implement sample data seeding — 3 contacts + 1 listing + 2 tasks with `is_sample: true`. Test: banner shows, "Clear" button works, auto-delete after 3 real contacts
14. Add "Import" dropdown to `/contacts` page header — "From Gmail", "From Apple (vCard)", "From CSV"

**Launch gate:** >50% of test users successfully import contacts during onboarding. Preview screen renders 500+ contacts in <1 second (virtualized). vCard parser handles all 5 test files without errors. Headshot upload works on mobile (iOS Safari camera roll). Profile completeness updates in real-time as user fills in fields.

### Phase 3: Security + Social Auth (1 week)

1. Sign up for Cloudflare Turnstile — create widget, get keys, add to `.env.vault`
2. Implement `TurnstileWidget.tsx` + `verifyTurnstile()` — test: invisible widget loads, server validates token, graceful fallback when blocked by ad blocker
3. Create `disposable-domains.json` (source: github.com/disposable-email-domains/disposable-email-domains) — test: mailinator.com blocked, gmail.com allowed, user+tag@mailinator.com blocked, user+tag@gmail.com allowed
4. Implement password strength meter UI (`PasswordStrength.tsx`) — test: "password123" = weak, "MyR3alP@ss" = strong, submit disabled until medium
5. (If Apple Developer account ready) Configure Apple Sign-In — Services ID, Key, generate client secret, add to NextAuth. Test: sign in on Safari + Chrome, email auto-verified
6. Configure Facebook Login — create app, add product, set redirect URI, add to NextAuth. Test: sign in, email auto-verified, redirects to phone verification

**Launch gate:** Turnstile blocks automated form submissions (test with `curl` — rejected without token). Disposable emails blocked. Password strength meter matches expected scores for 10 test passwords. Apple Sign-In works on iOS Safari (if configured). Facebook Login works on Chrome.

### Phase 4: Welcome Drip + Polish (1 week)

1. Build 6 email templates (`WelcomeDay0.tsx` through `WelcomeDay7.tsx`) — test: renders in Gmail, Outlook, Apple Mail (use Litmus or manual testing). Each email <150 words, one CTA, branded design matching verify email template
2. Build welcome-drip cron (`/api/cron/welcome-drip`) — test: Day 0 sent immediately for new users, Day 1 skipped if contacts imported, Day 2 skipped if calendar connected. Test with 5 mock users at different drip stages.
3. Wire Resend webhooks for open/click tracking — update `welcome_drip_log.opened_at` and `clicked_at` on webhook events. Test: open event updates DB within 5 seconds
4. Build inline validation on signup form — email availability API (`/api/auth/check-email`), debounced 300ms. Test: existing email shows red, available email shows green, typing fast doesn't spam API
5. Build resume abandoned signup — localStorage save on field change, restore on page load. Test: fill name + email → close tab → reopen → fields pre-filled, password NOT saved
6. Build brokerage auto-detect — `searchBrokerages()` server action, autocomplete UI in StepProfessionalInfo. Test: typing "24K" suggests "24K Realty Group" from DB
7. Build `cleanup-sample-data` cron — test: sample data deleted for users with 3+ real contacts, 30-day expiry works

**Launch gate:** All 6 emails render correctly in Gmail + Outlook + Apple Mail. Drip cron processes 100 users in <30 seconds. Skip logic works for all 3 conditions. Inline validation shows result in <500ms. Brokerage auto-suggest returns results in <200ms. Sample data cleanup runs without errors.

**Total: ~6 weeks**

---

## 8. Pricing Strategy

This feature is **not a paid add-on** — it's infrastructure that benefits all plans:

| Impact | Details | Measurable Outcome |
|--------|---------|-------------------|
| **Reduces churn** | Verified + onboarded users retain at 2-3x the rate of unverified (Totango SaaS benchmark) | Track: Day-7 and Day-30 retention rate in `signup_events` table. Compare pre/post launch. |
| **Contact import = activation** | Users who import contacts on Day 1 are 4x more likely to convert to paid (Follow Up Boss data) | Track: `signup_events WHERE event = 'contacts_imported'` → correlate with plan upgrades within 30 days. |
| **Enables SMS features** | Verified phone unlocks showing requests, lockbox codes, WhatsApp automations — features that justify Pro/Studio pricing | Track: % of users with `phone_verified = true` who use SMS features within 14 days. |
| **Improves deliverability** | Verified emails improve Resend domain reputation → better inbox placement for newsletters (a paid feature) | Track: Resend dashboard → bounce rate. Target: <2% bounces (currently unknown). |
| **Reduces support costs** | Onboarding wizard + welcome drip reduce "how do I start?" tickets | Track: support ticket count tagged "getting started" — compare pre/post launch. |
| **Saves Twilio spend** | Verified phones mean fewer failed SMS deliveries | Track: Twilio dashboard → delivery rate. $0.0079/failed message × estimated 500 failed/month = **$3.95/month saved**. |

**Cost analysis:**
- Twilio OTP: $0.0079/SMS × 2 messages avg per signup (1 send + 1 resend) × 1000 signups/month = **$15.80/month**
- Resend emails: 7 welcome emails × 1000 users = 7,000 emails/month. Resend free tier: 3,000/month, Pro: $20/month for 50,000. **$20/month** if on Pro.
- Cloudflare Turnstile: **Free** (unlimited verifications)
- Google People API: **Free** (default quota: 90 requests/min/user)
- Total incremental cost: **~$36/month** for 1000 signups

**ROI:** If contact import improves Free→Pro conversion by even 5% (50 of 1000 users), that's 50 × $29/month = **$1,450/month revenue** vs. $36/month cost = **40x ROI**.

---

## 9. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation | Detection & Response |
|------|-----------|--------|-----------|---------------------|
| Users abandon at phone verification step | Medium | High | Clear "why" messaging: "Required for showing notifications & lockbox codes." Show value before asking. | Track: `signup_events` → count `phone_sent` vs `phone_verified`. If >20% drop-off after 2 weeks, make phone verification skippable (soft prompt instead of gate) and A/B test. |
| Twilio SMS delivery failures (carrier filtering) | Low | Medium | Use Twilio Verify API (manages carrier relationships, higher delivery rates than raw `messages.create`). Add "Didn't receive code?" → "Try WhatsApp instead" fallback using existing WhatsApp number. | Monitor: Twilio dashboard → delivery rate. Alert if <90%. Fallback: WhatsApp OTP via `whatsapp:+16045551234` sender. |
| Magic link lands in spam | Medium | Medium | DNS records: DKIM (3 CNAME), SPF (`v=spf1 include:amazonses.com ~all`), DMARC (`v=DMARC1; p=quarantine`). Add "Check your spam folder" hint after 60 seconds on `/verify` page. On second resend, change subject line to "Action required: verify your email." | Monitor: Resend dashboard → bounce + complaint rates. If spam complaint >0.1%, investigate. Add `List-Unsubscribe` header. |
| Google contacts scope rejected by user | Medium | Medium | Permission dialog text: "Realtors360 wants to view your contacts. We only read contact names, emails, and phones — we never modify or delete anything." Show a preview of what we'll access. Allow skip → falls back to vCard upload or manual entry. | Track: OAuth callback errors → count scope rejections. If >30% reject, consider making scope optional (import via vCard as default). |
| Apple vCard export too complex for non-tech users | Medium | Medium | Step-by-step visual guide with actual screenshots from iOS 18 and iCloud.com. Embed 30-second video tutorial (hosted on YouTube, linked from import screen). Add "Need help? Text us" with Twilio support number. | Track: `signup_events WHERE event = 'contacts_imported' AND metadata->>'source' = 'apple'`. If <10% of Apple users import, simplify guide or investigate Apple CloudKit API (requires Apple Developer Enterprise). |
| Large contact imports (2000+) slow or timeout | Low | Medium | Gmail: paginated fetch with real-time progress bar ("Loading... 800/1200"). Import: batch inserts of 50 rows (prevents Supabase payload limits). For >500 contacts, show "This may take a minute" with spinner. Timeout: 60s for API route (Next.js default is 30s — increase in route config). | Track: import duration in `signup_events.metadata`. If p95 >30 seconds, implement background job: insert `import_jobs` row, process via cron, notify via WebSocket/polling when complete. |
| Apple Developer account not available | Medium | Low | Apple Sign-In is P1, not P0. Ship Phase 1-2 without it. Google + Facebook cover 90%+ of OAuth users. Add Apple when account is ready. Note: if we ever ship an iOS app, Apple requires Apple Sign-In. | Defer. Revisit when iOS app is in scope. |
| Existing users annoyed by phone verification prompt | Medium | Medium | 30-day grace period: existing users see a soft banner ("Verify your phone to unlock SMS features") not a hard gate. Banner is dismissable but reappears once per session. After 30 days, show on settings page only. Never lock existing users out. | Track: `signup_events WHERE event = 'phone_verified' AND metadata->>'is_legacy' = 'true'`. Target: 50% of existing users verify within 30 days voluntarily. |
| Rate limiter blocks legitimate users (shared IP / VPN) | Low | Medium | Use compound key: IP + email. Allow 10 attempts per IP if each has a unique email (co-working space scenario). Whitelist known office/VPN IP ranges if reported. Log blocked IPs for review. | Monitor: `signup_rate_limits WHERE locked_until IS NOT NULL`. If >5 legitimate blocks per week, raise per-IP limit to 15 and add email-based rate limit as secondary check. |
| Sample data confuses users | Low | Low | Every sample record: `is_sample: true` badge in UI, dashed purple border, "SAMPLE" tag. Dashboard banner: "This is sample data — import your real contacts to replace it." One-click "Clear all sample data" button. Never send emails to sample contacts (email is null). | Track: support tickets mentioning "fake contacts" or "sample data." If >3 tickets/month, increase visual distinction or auto-delete sample data after first real action. |
| Contact import creates duplicates | Medium | Medium | Primary dedup: email (case-insensitive). Secondary: phone (E.164 normalized). On re-import: `upsert` with `onConflict: "realtor_id,email"` and `ignoreDuplicates: true`. Preview screen: yellow "Already exists" badge on duplicates, deselected by default. | Track: count of contacts with duplicate emails per realtor after import. If duplicates still appear, add name+phone fuzzy matching (Levenshtein distance <2). |

---

## 10. Competitive Moat

What makes this different from kvCORE + Follow Up Boss + LionDesk onboarding:

1. **Gmail/Apple Contact Import at Signup** — Not buried in settings. The very first thing a new user does is populate their CRM with real contacts. Competitors make you find the import feature yourself — most users never do.
2. **Dual Verification** — Most CRMs don't verify phone at signup. Realtors360 verifies both, unlocking SMS/WhatsApp features from day one without a separate setup step later.
3. **Magic Link + OTP Combo** — One effortless step (click link) + one active step (enter code). Competitors use either email-only or password-only — both have higher friction or lower security.
4. **Intelligent Duplicate Detection** — Not just "email exists" — tells you HOW you signed up and offers the right login method. Competitors show generic errors.
5. **Smart Contact Import Preview** — Search, filter, dedup, select — not a blind "import all" that pollutes your CRM with 500 irrelevant contacts. Competitors dump everything in.
6. **Sample Data Seeding** — Users who skip import still see a populated dashboard from minute one. Competitors drop you into an empty void.
7. **Progressive Profile Completeness** — Persistent, gamified nudge that adapts as users fill in fields. Competitors have static profile pages nobody visits.
8. **Welcome Drip That Skips** — Drip sequence smart enough to skip emails for actions already completed. Competitors spam with irrelevant emails about features you already set up.
9. **Zero-Friction Social Auth** — Google + Apple + Facebook with automatic email verification skip. Competitors require email/password for everyone.
10. **Bot Protection Built-In** — Invisible Turnstile + disposable email blocking + rate limiting. Competitors rely on reCAPTCHA (visible, annoying) or nothing at all.

---

*PRD Version 1.0 — April 6, 2026*
*Based on analysis of current Realtors360 signup flow, SaaS onboarding benchmarks (Totango, Wyzowl, Appcues), competitor research (kvCORE, Follow Up Boss, LionDesk, Sierra Interactive), and Google People API / vCard specification review*
