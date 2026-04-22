<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- docs-audit: src/app/(auth)/*, src/app/(dashboard)/onboarding/* -->
# SPEC: Realtor Signup & Onboarding v2

**Status:** Draft | **Author:** Claude + Rahul | **Date:** 2026-04-10
**Supersedes:** `docs/PRD_Signup_Verification_Onboarding.md` (Phase 1 infra done, this doc covers the UX redesign)

---

## 1. Problem Statement

### Current State
The existing signup collects too much upfront (2-step form: account details + professional info + plan selection), then drops users onto an empty dashboard. The 5-step onboarding wizard exists in code but:
- Users see an empty CRM with no immediate value
- No personalization — solo agents and team leads get the same experience
- Contact import exists (Gmail + vCard) but isn't prominently guided
- No MLS data connection during setup
- No AI assistance during onboarding (missed differentiator)
- Profile completeness tracking exists but isn't surfaced to users

### Impact
- **40-60% of SaaS users who sign up never return** without effective onboarding (industry data)
- Every extra signup field costs ~7% conversion (HubSpot 2024)
- Our 2-step form with 7+ fields likely loses 30-40% of signups before completion

---

## 2. Competitive Landscape

### Monday.com — Our Primary Inspiration (Best-in-Class SaaS Onboarding)

Monday.com's onboarding is consistently cited as the industry gold standard. Here's their exact flow:

**Signup (2 fields for SSO, 3 for email):**
- Screen 1: Email only (+ Google/Apple SSO options). "Get started — it's free"
- Screen 2: Name + password + account name (skipped entirely for SSO)
- Screen 3: Email verification (conditional, can continue without it)
- User has an account within 30-60 seconds

**Onboarding Wizard (5-7 screens, ~2-3 minutes):**

| Step | Question | UI Pattern | Purpose |
|------|----------|------------|---------|
| 1 | "What brings you to monday.com?" | Large visual cards (icon + label) | Drives ALL downstream choices: templates, terminology, sample data |
| 2 | "What's your role?" | Cards: Team Member, Lead, C-Level, Director, Freelancer | Affects dashboard layout + feature emphasis |
| 3 | "How many people on your team?" | Pill buttons: Just me, 2-5, 6-10, 11-25... | Plan suggestion + collaboration features |
| 4 | "What would you like to manage first?" | Contextualized cards (1-3 selection) | Determines which templates to suggest |
| 5 | "Invite your teammates" | Email inputs (skip-friendly) | Viral adoption, NOT gated |
| 6 | "Choose your first board template" | 3-4 recommended template cards with mini-previews | Pre-populated workspace |
| 7 | "Setting up your workspace..." | Animated loading with staggered checkmarks + confetti | Celebration moment, dopamine hit |

**What Makes It Best-in-Class:**

1. **Visual card selection over text input** — Cards > dropdowns. Feels like a quiz, not a form
2. **ONE question per screen** — Reduces cognitive load dramatically
3. **Personalization creates investment** — By step 6, user made 4-5 choices (sunk-cost psychology)
4. **No empty states ever** — Templates come with 8-12 realistic sample rows. User sees a functional workspace in <3 minutes
5. **Low-commitment language** — "Skip for now" not "Skip." "Continue" not "Submit"
6. **Progress bar without step numbers** — Thin gradient line at top. No anxiety about "how many more steps"
7. **Terminology adapts** — CRM users see "Leads/Deals/Contacts," PM users see "Tasks/Projects/Milestones." Same data model, different labels
8. **Celebration moments** — Confetti, staggered checkmarks, "You're all set!" — dopamine at every completion
9. **Post-wizard checklist persists** — Bottom-right widget: "Create an item, Set a status, Try a view" with progress ring
10. **AI board generation (2024+)** — "Describe what you want to manage" → AI creates board with columns, groups, and sample data

**Monday.com Metrics (public):**
- ~60-70% of signups complete the onboarding wizard
- ~40% of free users invite a teammate within 7 days
- Template-started users have 2-3x higher retention than blank-start users

### Follow Up Boss — Best Real Estate CRM Onboarding

FUB is the #1 real estate-specific CRM for onboarding. Their approach is fundamentally different from Monday.com — utilitarian, admin-first, and built around one killer insight: **connect your email and your CRM populates itself.**

**Signup (progressive disclosure):**
- Email address (+ Microsoft SSO option)
- Location dropdown (US/Canada/Other)
- Team size (5 options: 1-2 through 20+)
- Annual production (5 brackets: Under $5MM through Over $500MM)
- 14-day free trial, no credit card
- Success Manager calls within 24 hours

**The "First 10 Minutes" — Email-First Integration (FUB's Killer Move):**

FUB's core insight: realtors already receive leads via email from Zillow, Realtor.com, etc. Instead of complex API integrations:

1. **Connect Gmail/Outlook** (first action after signup)
2. **Inbox Lead Processing activates** — FUB scans your inbox for lead notification emails
3. **Auto-parses leads** — Recognizes email formats from 200+ lead sources, extracts name/email/phone/property
4. **CRM populates itself** — Within minutes, your CRM has contacts from your inbox history

This means: zero manual data entry, instant value, no "empty CRM" problem. The user's existing email becomes the data source.

**Four tiers of lead ingestion:**
- Tier 1: Direct API (Zillow, Realtor.com — structured data)
- Tier 2: Inbox Lead Processing (automatic email scanning)
- Tier 3: @followupboss.me email address (add as CC on any lead source)
- Tier 4: Auto-forwarding rules (Gmail/Outlook rules to FUB address)

**Admin Onboarding Checklist (10 steps):**

| Step | Action | Why It Matters |
|------|--------|---------------|
| 1 | Add admin staff | Admins configure before agents see the system |
| 2 | Complete 6-step admin guide | Core setup: leads, team, automation, Smart Lists, reporting, import |
| 3 | Plan data mapping | Map old CRM fields to FUB before importing |
| 4 | Add agents | **Only AFTER setup is complete** — agents see configured system, never empty |
| 5 | Send team intro email | Formally introduce FUB to the team |
| 6 | Choose local phone numbers | Assign/port numbers for calling/texting |
| 7 | Create lead routing groups | Groups per lead source |
| 8 | Set lead routing rules | Route by ZIP, city, price, tags, agent tier |
| 9 | Add Action Plans | Auto-engage new leads (500+ community templates available) |
| 10 | Authenticate email domain | SPF/DKIM for deliverability |

**Key Design Patterns from FUB:**

1. **Admin-first sequencing** — "Complete setup BEFORE inviting agents." Agents never encounter an empty, unconfigured system. This is deliberate.
2. **Email as the integration layer** — Instead of complex API setup for each lead source, email parsing handles 200+ sources automatically.
3. **30-40 min learning curve** — vs. 8-10 hours for competitors (Sierra, KVCore, CINC). Achieved through in-app 1-3 min video tutorials.
4. **Smart Lists as empty-state mitigation** — Dynamic saved searches surface actionable items ("leads not contacted in 3+ days") even with small databases.
5. **500+ community Action Plan templates** — Pre-built follow-up sequences prevent "blank canvas" when setting up automations.
6. **No gamification** — Purely utilitarian. Professional tone, no confetti or celebrations. Focused on speed-to-configuration.
7. **Tiered onboarding investment** — Self-serve ($58/user), concierge ($416/mo for 10 users), dedicated Success Manager ($833/mo for 30 users).
8. **20-minute daily bootcamp** — Live webinar every weekday for "I just signed up, now what?" moment.

**What Realtors360 should adopt from FUB:**
- Email-first integration thinking (connect Gmail → auto-populate contacts)
- Admin-first sequencing for team plans (configure before inviting agents)
- Smart Lists / dynamic views to eliminate empty-state problems
- Pre-built automation templates (email sequences, follow-ups)
- In-app contextual video tutorials (not separate help pages)

**What we can do BETTER than FUB:**
- Monday.com-style visual onboarding (FUB has no visual wizard — just checklists + articles)
- AI content generation during onboarding (FUB has none)
- Faster time-to-value (<3 min vs FUB's 10 min) through pre-configuration + AI
- Celebration moments (FUB is purely utilitarian — misses emotional engagement)
- BC-specific data enrichment (BC Assessment, ParcelMap) that FUB can't offer

### What Top Real Estate CRMs Do

| Platform | Signup Fields | Onboarding Style | Time to Value | Differentiator |
|----------|--------------|------------------|---------------|----------------|
| **Monday.com** | 2-3 | 7-step visual wizard | <3 min | Card-based profiling, template pre-population, AI board generation |
| **Follow Up Boss** | 4-5 | 10-step admin checklist | <10 min | Email-forwarding lead integration, 200+ sources auto-parsed, concierge support |
| **Real Geeks** | 3-4 | 7 pre-configured + 5 user tasks | Minutes | Heaviest pre-configuration — 7 items ready before user does anything |
| **Wise Agent** | 3-4 | 3 steps (simplest) | 30 min | Free 1-on-1 onboarding session with every account |
| **Lofty (Chime)** | Demo required | 7-step in-app wizard | 1-2 hours | AI auto-tagging + Smart Plans activate immediately |
| **KVCore/BoldTrail** | Demo required | Admin wizard + agent course | 2-4 weeks | 600+ MLS integrations, AI lead scoring |
| **Sierra Interactive** | Demo required | 8-step managed process | 2-4 weeks | White-glove: Sierra's team does setup FOR you |
| **HubSpot** | 2 (email + pass) | Progressive checklist | 1-3 hours | Best-in-class progressive profiling, Academy ecosystem |
| **Salesforce** | 5-6 | 13-step checklist + Trailhead | Weeks | Most sophisticated in-app guidance engine |

### Key Insights
1. **Monday.com proves the pattern** — Card-based visual profiling + template pre-population + celebration moments = 60-70% wizard completion
2. **Winners collect 2-4 fields at signup** — everything else is onboarding
3. **ONE question per screen** (Monday.com) dramatically outperforms multi-field forms
4. **Pre-configuration beats long wizards** — Real Geeks has 7 items ready before the user touches anything
5. **AI in onboarding is a gap** — only Lofty has AI (auto-tagging), nobody has AI content generation during setup
6. **Checklist + wizard hybrid wins** — wizard for initial data, persistent checklist for ongoing setup
7. **Progressive profiling converts 42% better** than one-shot forms (Salesforce data)

---

## 3. Proposed Design — "Zero to CRM in 3 Minutes"

### 3.1 Signup (Screen 1 — Maximum 3 Fields)

**Collect:**
1. Full name
2. Email
3. Password

**Also available:** Google SSO (one-click, skips email/password)

**What we REMOVE from signup:**
- ~~Phone~~ → onboarding step
- ~~Brokerage~~ → onboarding step
- ~~License number~~ → onboarding step
- ~~Plan selection~~ → post-onboarding (start everyone on free trial of Professional for 14 days)

**Why:** Every field removed saves ~7% conversion. Moving from 7 fields to 3 should increase signup completion by ~25-30%.

**Free trial model:** Instead of choosing a plan at signup (when users don't know what features they need), give everyone 14 days of Professional. They experience the full product, then choose a plan with informed context. This is the Follow Up Boss / HubSpot model.

### 3.2 Personalization Wizard (Monday.com Style — One Question Per Screen)

Immediately after account creation. Full-screen wizard with thin gradient progress bar (no step numbers). Each screen has ONE question with visual card selection. Conversational headings: "Hey {name}, let's set up your CRM"

**Screen 1: "What describes you best?"**
Visual cards (icon + label + 1-line description), single select:
- Solo Agent — "I manage my own clients and listings" (default)
- Team Lead — "I lead a team of agents"
- Brokerage Admin — "I manage operations for a brokerage"
- New to Real Estate — "I'm just getting started in the industry"

**Screen 2: "What's your primary focus?"**
Visual cards, single select:
- Residential Sales — "Houses, condos, townhomes"
- Commercial — "Office, retail, industrial"
- Luxury / Prestige — "High-end properties $2M+"
- Property Management — "Rentals and tenant management"

**Screen 3: "How big is your contact list today?"**
Pill buttons (smaller choices, Monday.com pattern):
- Just starting (0-50) → pre-populate sample data + tutorials
- Growing (50-500) → emphasize import + organization tools
- Established (500+) → lead with CSV import + AI categorization

**Screen 4: "What would you like to do first?"**
Visual cards, multi-select (pick 1-3), contextualized by Screen 1-3 answers:
- Manage my contacts & leads
- List a property for sale
- Set up email marketing
- Track showings & appointments
- Generate AI content (MLS remarks, social posts)
- Import my existing data

**Screen 5: "Invite your team" (skip-friendly)**
- Email input fields (pre-filled domain from signup email)
- "Copy invite link" alternative
- Prominent "Skip for now" link (low-commitment language)
- Only shown if Screen 1 = Team Lead or Brokerage Admin

**Screen 6: "Setting up your workspace..." (Celebration Landing)**

This is the emotional peak — the "wow" moment. Two phases:

**Phase 1 — Building animation (3-5 seconds):**
- Full-screen dark overlay with centered card
- Staggered checkmarks (800ms apart), each with a subtle scale-in animation:
  - "Creating your workspace" ✓
  - "Loading your templates" ✓
  - "Configuring AI assistant" ✓
  - "Importing your preferences" ✓

**Phase 2 — Fireworks celebration (triggers on "You're all set!"):**
- **Fireworks burst from both sides of the screen** (canvas-based particle system)
  - Left side: lf-indigo (#4f35d2) + lf-coral (#ff5c3a) particles
  - Right side: lf-teal (#00bfa5) + gold (#FFD700) particles
  - 3-4 bursts over 2 seconds, with gravity + fade-out
  - Particles: mix of circles, stars, and small rectangles (confetti-style)
- Center card transforms: "You're all set!" with the user's name
  - "Welcome to Realtors360, {name}!" — 32px bold, gradient text (indigo → coral)
  - Subtitle: "Your AI-powered real estate CRM is ready"
  - User's selected persona shown: "Solo Agent • Residential • Vancouver"
  - Animated counter: "X features unlocked" counting up from 0
- "Go to your dashboard" CTA button fades in after fireworks (1.5s delay)
- Background: subtle animated gradient (lf-bg with floating particles)

**Implementation: `canvas-confetti` npm package** (3KB gzipped, zero dependencies)
```ts
import confetti from 'canvas-confetti';

// Left side burst
confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0, y: 0.6 },
  colors: ['#4f35d2', '#ff5c3a', '#7c5cfc', '#ff8a6a'] });

// Right side burst  
confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.6 },
  colors: ['#00bfa5', '#FFD700', '#059669', '#FFA500'] });
```

**Also apply to signup success screen:** Replace the current static emoji (🎉) success screen with the same fireworks treatment. The celebration should fire immediately when the account is created, before the auto-redirect to onboarding.

**How personalization drives the experience:**
```
Role (Screen 1) → Dashboard layout, feature emphasis, help content
Focus (Screen 2) → Terminology, templates, sample data
Volume (Screen 3) → Import prominence, sample data yes/no
First actions (Screen 4) → Onboarding checklist order, which features to highlight
```

**UI Design (Monday.com patterns):**
- Cards: ~120x100px, rounded corners (12-16px radius), lf-card styling
- Unselected: light border, white fill
- Hover: subtle shadow elevation + scale(1.02), 200ms transition
- Selected: lf-indigo border + checkmark overlay + subtle background tint
- Progress: thin gradient bar at top (lf-indigo to lf-coral), no step numbers
- Headings: 28-32px, bold. Sub-copy: 16px, muted
- "Continue" button (not "Next"), "Skip for now" link (not "Skip")
- Back arrow: top-left, icon only
- Page transitions: horizontal slide animation

**DB storage:** `onboarding_persona`, `market_type`, `contact_volume`, `first_actions` (JSONB array) on `users` table.

### 3.3 Onboarding Dashboard (Screen 3 — Persistent Checklist)

Replace the current 5-step wizard with a **persistent onboarding dashboard** that lives at `/getting-started` and is the default landing page until completed.

**Design pattern:** Real Geeks-style "what's ready vs. what's left" + HubSpot-style progress bar.

#### Pre-Configured for User (Done Before They Arrive)
These are ready on signup — shown with checkmarks to create momentum (endowed progress):

- [x] Account created
- [x] 14-day Professional trial activated
- [x] AI assistant ready
- [x] Email templates loaded (6 pre-built real estate templates)
- [x] Sample listing loaded (with AI-generated MLS remarks)

#### User Checklist (5-7 items, ordered by impact)

**1. Complete Your Profile (2 min)**
- Headshot upload (drag & drop or camera)
- Phone number
- Brokerage name (autocomplete from existing)
- License number
- **AI-generated bio** — enters brokerage + years of experience, Claude generates a professional bio
- Progress: updates `profile_completeness` score

**2. Import Your Contacts (3 min)**
- **Gmail import** (one-click OAuth, shows preview with selection)
- **CSV upload** (drag & drop, auto-maps columns)
- **Apple/vCard upload** (.vcf file)
- **Manual add** (quick-add form for 1-3 contacts)
- **AI enrichment** — after import, AI auto-categorizes contacts (buyer/seller/past client) based on available data
- Shows count: "142 contacts imported" with celebration animation

**3. Connect Your Email (1 min)**
- Gmail or Outlook OAuth
- Shows benefit: "Send emails directly from Realtors360, track opens & clicks"
- Already partially done if they signed up with Google

**4. Connect Your Calendar (1 min)**
- Google Calendar OAuth
- Shows benefit: "Never double-book a showing again"
- Already partially done if they signed up with Google

**5. Add Your First Listing (3 min) — or import from MLS**
- Quick listing form (address + price + type)
- **BC Assessment auto-fill** — enter address, auto-populate property details from BC Assessment data
- **MLS import** — if they have MLS access, connect via Repliers API
- AI generates MLS remarks immediately — instant "wow" moment

**6. Send Your First Message (1 min)**
- Pre-populated template to a contact
- "Welcome back" or "Just listed" template
- Shows the communication timeline feature

**7. Explore AI Features (optional, 2 min)**
- Interactive tour of: AI content generation, smart recommendations, email marketing
- Shows what's possible, drives feature discovery

#### Completion & Transition
- Progress bar: "5 of 7 complete — you're almost there!"
- At 5/7: "You're ready to go! Visit your dashboard" (but checklist remains accessible)
- At 7/7: Celebration screen + redirect to dashboard, checklist moves to settings
- `onboarding_completed = true` after 5/7 minimum

### 3.4 Empty State Design

Every page the user visits before they have data should show a purposeful empty state:

| Page | Empty State Message | CTA |
|------|-------------------|-----|
| Contacts | "Your client relationships start here" | Import contacts / Add first contact |
| Listings | "Add your first listing and watch AI work" | Add listing / Import from MLS |
| Calendar | "Connect Google Calendar to see your schedule" | Connect Calendar |
| Newsletters | "AI-powered email marketing, ready when you are" | Create first campaign |
| Content | "AI generates MLS remarks, social posts & more" | Try with sample listing |

### 3.5 Welcome Drip Emails (7 emails over 14 days)

**Behavior-triggered, not just time-based:**

| Day | Trigger | Subject | Goal |
|-----|---------|---------|------|
| 0 | Signup | "Welcome to Realtors360 — here's your first win" | Drive to onboarding checklist |
| 1 | No contacts imported | "Import your contacts in 60 seconds" | Contact import |
| 2 | Has contacts, no message sent | "Your contacts are waiting — send your first message" | First message |
| 3 | No listing added | "Add a listing and watch AI generate your MLS remarks" | Listing + AI wow moment |
| 5 | Checklist < 50% | "You're 3 steps away from a fully set up CRM" | Checklist completion |
| 7 | Active user | "5 things top agents do in their first week" | Feature discovery |
| 13 | Trial ending | "Your Professional trial ends tomorrow — here's what you'll keep" | Conversion |

**From:** Personal email from founder (26% higher open rate than generic)
**Template:** Use existing `BaseLayout.tsx` email component

### 3.6 AI-Powered Onboarding Features (Our Differentiator)

No competitor does this. This is our unique angle:

| Feature | When | What AI Does |
|---------|------|-------------|
| **Bio Generator** | Profile setup | User inputs brokerage + years, Claude writes a professional realtor bio |
| **Contact Categorizer** | After import | AI reads contact names + emails + notes, suggests buyer/seller/investor/past client tags |
| **MLS Remarks** | First listing added | AI generates public + REALTOR remarks immediately — instant value |
| **Smart Suggestions** | Post-onboarding | AI analyzes imported contacts, suggests "reach out to these 5 contacts who haven't heard from you" |
| **Template Personalizer** | Email setup | AI customizes pre-built email templates with user's name, brokerage, market area |

---

## 4. Data Model Changes

### New Columns on `users` Table
```sql
-- Personalization (from wizard screens 1-4)
onboarding_persona TEXT DEFAULT 'solo_agent',    -- solo_agent, team_lead, brokerage_admin, new_agent
market_type TEXT DEFAULT 'residential',           -- residential, commercial, luxury, property_mgmt
contact_volume TEXT DEFAULT 'starting',           -- starting, growing, established
first_actions JSONB DEFAULT '[]'::jsonb,          -- selected actions from Screen 4

-- Trial
trial_ends_at TIMESTAMPTZ,                        -- NULL = no trial, set to NOW() + 14 days on signup
trial_plan TEXT DEFAULT 'professional',            -- which plan they're trialing
```

### Onboarding Checklist State
Use existing `onboarding_step` (integer) but expand to track individual items:

```sql
-- New column (JSONB for flexibility)
onboarding_checklist JSONB DEFAULT '{
  "profile": false,
  "contacts_imported": false,
  "email_connected": false,
  "calendar_connected": false,
  "first_listing": false,
  "first_message": false,
  "ai_explored": false
}'::jsonb
```

### Welcome Drip Tracking
Existing `welcome_drip_log` table is sufficient. No changes needed.

---

## 5. Activation Metrics

Based on competitive research, define our activation event:

**Primary activation (predicts retention):**
> User has imported 5+ contacts AND sent 1 message within 7 days

**Secondary signals:**
- Added a listing
- Connected calendar
- Used AI content generation

**Tracking:** Log activation events to `signup_events` table (already exists).

**Target metrics:**
| Metric | Current (Est.) | Target |
|--------|---------------|--------|
| Signup completion rate | ~60% | 85%+ |
| Onboarding checklist 5/7 | Unknown | 65% |
| 7-day activation | Unknown | 40% |
| 14-day trial to paid | Unknown | 15% |

---

## 6. Implementation Phases

### Phase 1: Simplify Signup (1-2 days)
- Reduce signup to 3 fields (name, email, password) + Google SSO
- Add 14-day Professional trial (set `trial_ends_at` on signup)
- Remove plan selection from signup page

### Phase 2: Personalization Screen (1 day)
- Add 3-question personalization screen post-signup
- Store persona/market/volume on users table
- Route to appropriate onboarding path

### Phase 3: Onboarding Dashboard (3-4 days)
- Build `/getting-started` page with persistent checklist
- Pre-configured items shown with checkmarks
- Individual checklist items with inline completion
- Progress bar + celebration animations
- Redirect new users here until 5/7 complete

### Phase 4: AI Onboarding Features (2-3 days)
- Bio generator (Claude API call during profile setup)
- Contact categorizer (batch AI categorization post-import)
- Instant MLS remarks on first listing

### Phase 5: Empty States + Drip Emails (2 days)
- Design empty states for all major pages
- Configure welcome drip sequence (7 emails, behavior-triggered)

### Phase 6: Analytics + Optimization (1 day)
- Track activation events
- Dashboard for signup funnel metrics
- A/B test signup variants

---

## 7. What We're NOT Doing (Scope Boundaries)

- **No team/brokerage onboarding** — solo agent path only for v2
- **No payment integration at signup** — trial-first, payment at trial end
- **No mobile app onboarding** — web only
- **No Salesforce-style in-app walkthroughs** — too complex for our stage, checklist is sufficient
- **No MLS board approval flow** — that's a multi-week process, outside onboarding scope
- **No social auth beyond Google** — Apple/Facebook can come later

---

## 8. Success Criteria

This spec is successful if:
1. Signup form has 3 fields or fewer (+ Google SSO)
2. New user sees value (pre-configured items + AI bio) within 3 minutes
3. Onboarding checklist completion rate reaches 65%+
4. At least one AI feature fires during onboarding (bio or MLS remarks)
5. Welcome drip emails achieve 40%+ open rate on Day 0 email

---

## 9. Competitive Positioning Summary

| Dimension | Monday.com (our model) | Industry Best (RE) | Realtors360 v2 |
|-----------|----------------------|-------------------|-----------------|
| Signup fields | 2-3 | 3-4 (Follow Up Boss) | 3 (name, email, pass) + Google SSO |
| Onboarding style | 7-step visual wizard + post-wizard checklist | 10-step checklist (FUB) | Monday.com-style wizard (6 screens) + persistent checklist |
| UI pattern | Card selection, one Q per screen | Forms + dropdowns | Card selection, one Q per screen, Monday.com visual language |
| Time to value | <3 min (template pre-population) | <10 min (Follow Up Boss) | <3 min (pre-configured + AI) |
| Pre-configuration | Template with 8-12 sample rows | 7 items (Real Geeks) | 5 items ready + AI-generated content |
| Personalization | 4 questions drive templates + terminology | Minimal | 4 questions drive dashboard, templates, feature emphasis |
| Celebration moments | Confetti + staggered checkmarks | None | Confetti + staggered checkmarks + AI "wow" moment |
| AI in onboarding | AI board generation (2024+) | Auto-tagging only (Lofty) | Bio gen + contact categorizer + MLS remarks + template personalization |
| Contact import | CSV | CSV + concierge (FUB) | Gmail + CSV + vCard + AI categorization |
| Post-wizard engagement | Bottom-right checklist widget with progress ring | Getting started page | Persistent onboarding dashboard + bottom-right checklist |
| Team invite | Optional screen during wizard | N/A for solo agents | Optional, only shown for team leads/brokerage admins |

**Our unique angle:** Monday.com's proven UX patterns (card selection, one-question-per-screen, celebration moments) PLUS AI-powered onboarding that no competitor — not even Monday.com — has for real estate. We generate a bio, categorize contacts, and create MLS remarks during setup. AI is the hero of the first 3 minutes.

---

## Appendix A: Current vs Proposed Flow

### Current Flow
```
Signup (7 fields, 2 steps) --> Empty Dashboard --> Hope user figures it out
                                                    |
                                        Onboarding wizard exists but
                                        users may not find it
```

### Proposed Flow
```
Signup (3 fields) --> Personalization (3 questions) --> Onboarding Dashboard
       |                       |                              |
   Google SSO           Segments user                Pre-configured items done
   (1 click)            into path                    + 7-item checklist
                                                     + AI features fire
                                                     + Progress bar
                                                            |
                                                     5/7 complete --> Dashboard
                                                     + Welcome drip emails
                                                     + Empty states guide
                                                     remaining exploration
```

## Appendix B: Existing Infrastructure We Can Reuse

| Component | Location | Status |
|-----------|----------|--------|
| Onboarding page | `src/app/(auth)/onboarding/page.tsx` | Exists (5-step wizard, needs redesign) |
| Onboarding actions | `src/actions/onboarding.ts` | Exists (headshot upload, profile update, sample data, brokerage search) |
| Contact import preview | `src/components/onboarding/ContactImportPreview.tsx` | Exists (Gmail + vCard + selection UI) |
| Profile completeness | `recalculateProfileCompleteness()` in actions | Exists (10 dimensions, 0-100 score) |
| Signup events tracking | `signup_events` table | Exists (funnel analytics) |
| Welcome drip log | `welcome_drip_log` table | Exists (day tracking, open/click tracking) |
| User integrations | `user_integrations` table | Exists (OAuth token storage) |
| Verification tokens | `verification_tokens` table | Exists (email magic link + phone OTP) |
| Email templates | `src/emails/` (6 templates) | Exists (BaseLayout + 5 RE templates) |
| AI content generation | `src/lib/anthropic/` | Exists (MLS remarks, content generation) |

## Appendix C: Sources

- Follow Up Boss onboarding checklist (help.followupboss.com)
- Real Geeks CRM getting started checklist (support.realgeeks.com)
- Wise Agent 3-step setup (wiseagent.com/blog)
- Lofty Agent Setup Guide (help.lofty.com)
- KVCore Admin Onboarding (maxtech.me)
- Sierra Interactive Implementation SOW (sierrainteractive.com)
- HubSpot form field conversion study (2024)
- Salesforce progressive profiling data (42% higher conversion)
- Flowjam SaaS onboarding benchmarks (2025)
- Userpilot activation metrics research
- PostHog activation metric methodology
- GlockApps SaaS email onboarding sequences
<!-- Last reviewed: 2026-04-21 — playbook audit Phase 1 enforcement patches -->
