# Comprehensive Test Plan: Onboarding Overhaul

**Version:** 1.0 | **Date:** 2026-04-10 | **Total Test Cases:** 312
**Coverage:** Every button, input, animation, redirect, error state, edge case, layout check
**Approach:** 10-consultant QA team — pay driven by bugs found

---

## How to Use This Document

Each test case has:
- **ID**: Category-Number (e.g., SU-001)
- **Priority**: P0 (blocker), P1 (critical), P2 (important), P3 (nice-to-have)
- **Steps**: Exact click sequence
- **Expected**: Exact outcome including UI changes
- **Verify**: What to check (DOM, DB, network, localStorage)

Categories:
- **SU**: Signup (42 tests)
- **PE**: Personalization (48 tests)
- **OB**: Onboarding Wizard (62 tests)
- **CE**: Celebration (28 tests)
- **CL**: Checklist (24 tests)
- **BN**: Banners (22 tests)
- **DR**: Drip Emails (26 tests)
- **AI**: AI Features (30 tests)
- **BI**: Billing (18 tests)
- **MW**: Middleware/Auth (12 tests)

---

## 1. SIGNUP PAGE (SU-001 to SU-042)

### Form Fields

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| SU-001 | P0 | Empty form submit | Click "Start free trial" with all fields empty | Error: "Name is required (min 2 characters)" | Error div visible |
| SU-002 | P0 | Name too short | Enter "A" in name, valid email+password, submit | Error: "Name is required (min 2 characters)" | Submit blocked |
| SU-003 | P0 | Name with spaces only | Enter "   " in name, submit | Error: "Name is required" | trim().length < 2 |
| SU-004 | P0 | Valid name, missing email | Enter "Sarah Johnson", no email, submit | HTML5 validation blocks | Browser native |
| SU-005 | P0 | Invalid email (no @) | Enter "sarahrealty.ca" in email | Error: "Please enter a valid email" | Client-side check |
| SU-006 | P0 | Password too short | Enter 7-char password, submit | Error: "Password must be at least 8 characters" | minLength=8 |
| SU-007 | P0 | Valid 3-field submit | Name: "Sarah", Email: "sarah@test.ca", Pass: "Test1234" | Success, redirect to /personalize | POST 201 |
| SU-008 | P1 | Name field autofocus | Load /signup | Name input focused | autoFocus attribute |
| SU-009 | P2 | Name allows unicode | Enter "Jose Garcia-Lopez" | Accepted | DB UTF-8 |
| SU-010 | P2 | Email lowercased | Enter "Sarah@REALTY.CA" | API receives "sarah@realty.ca" | Network body |

### Email Real-Time Check (S10)

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| SU-011 | P0 | Disposable email blocked | Type "test@mailinator.com" | Red border + "Please use a non-disposable email" | 500ms debounce |
| SU-012 | P0 | Existing email detected | Type existing user email | Red border + "already registered. Sign in instead" | 500ms debounce |
| SU-013 | P1 | Available email green | Type new email | "Email available" in green | After debounce |
| SU-014 | P1 | Debounce works | Type fast "test@gmail.com" | Only 1 API call (not per keystroke) | Network: 1 request |
| SU-015 | P2 | API fail is fail-open | Disconnect network, type email | Status stays "idle", no error | Silent fail |
| SU-016 | P2 | Email < 5 chars | Type "a@b" | No API call | No network |
| SU-017 | P2 | Email without @ | Type "testgmail.com" | No API call | No network |
| SU-018 | P1 | Sign in link in error | "already registered" shown | "Sign in instead" → /login | Link navigation |

### Password Strength Meter (S12)

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| SU-019 | P1 | Empty — no meter | Leave password empty | No bar visible | password.length > 0 |
| SU-020 | P1 | Weak (lowercase 8) | "abcdefgh" | Red bar 33%, "Weak" | bg-red-500 |
| SU-021 | P1 | Medium (uppercase) | "Abcdefgh" | Yellow bar 66%, "Medium" | bg-yellow-500 |
| SU-022 | P1 | Medium (number) | "abcdefg1" | Yellow bar 66% | |
| SU-023 | P1 | Strong (all 3) | "Abcdef1!" | Green bar 100%, "Strong" | bg-green-500 |
| SU-024 | P2 | Weak doesn't block | "abcdefgh" + valid form | Submit succeeds | 201 response |
| SU-025 | P2 | Bar animates | Type gradually | Smooth transition | transition-all |
| SU-026 | P3 | 7 chars no meter | "Abcdef1" | No bar (level 0) | length < 8 |

### Social Proof (S8)

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| SU-027 | P1 | Desktop split screen | 1280px viewport | Left: testimonials. Right: form | hidden lg:flex |
| SU-028 | P1 | Mobile no left panel | 375px viewport | No left panel, mobile header | lg:hidden |
| SU-029 | P2 | Two testimonials | Desktop | "Sarah K." + "Mike P." cards | Text content |
| SU-030 | P2 | Trust badges | Desktop | "No credit card" + "14-day trial" + checkmarks | SVG icons |
| SU-031 | P2 | Avatar initials | Desktop | "SK" and "MP" circles | Gradient backgrounds |

### Trial (S7) + Google SSO (S2) + Success Screen

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| SU-032 | P1 | Trial badge visible | Load /signup | "FREE TRIAL — 14 days of Professional" | Gradient badge |
| SU-033 | P0 | Trial in DB | Complete signup | plan=free, trial_plan=professional, trial_ends_at=NOW+14d | DB query |
| SU-034 | P0 | Trial features active | Sign in after signup | Nav shows Professional features | enabledFeatures |
| SU-035 | P0 | Google SSO → /personalize | Click "Continue with Google" | OAuth with callbackUrl=/personalize | URL check |
| SU-036 | P0 | New Google user gets trial | First Google signin | trial_ends_at set | DB record |
| SU-037 | P1 | Existing Google no double trial | Re-login via Google | trial unchanged | No re-insert |
| SU-038 | P0 | Success shows name | Valid submit | "Welcome, Sarah!" | firstName extraction |
| SU-039 | P0 | Auto-redirect | Wait 1.5s | Redirects to /personalize | setTimeout(1500) |
| SU-040 | P1 | Trial info in success | Success screen | "14-day Professional trial active" | Text |
| SU-041 | P1 | Float-in animation | Success card | animate-float-in class | CSS |
| SU-042 | P2 | No double submit | Click while loading | Button disabled "Creating account..." | disabled:opacity-50 |

---

## 2. PERSONALIZATION (PE-001 to PE-048)

### Navigation

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| PE-001 | P0 | Screen 0 loads | Visit /personalize | "Hey {name}, what brings to Realtors360?" | |
| PE-002 | P0 | Continue advances | Select card → Continue | Next screen | screen++ |
| PE-003 | P0 | Back returns | Screen 2 → back | Screen 1, selection preserved | |
| PE-004 | P0 | Skip advances | Click "Skip for now" | Next screen, null saved | |
| PE-005 | P0 | All 6 screens | Click through | Screens 0→1→2→3→4→5 | |
| PE-006 | P0 | Screen 5 redirects | Reach loading screen | Spinner → /onboarding after 2s | setTimeout(2000) |
| PE-007 | P1 | Back hidden on Screen 0 | Load Screen 0 | No back button | screen > 0 |
| PE-008 | P1 | Back visible Screen 1+ | Screen 1 | Back arrow top-left | Fixed position |

### Card Selection

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| PE-009 | P0 | Single-select highlights | Click "Solo Agent" | Indigo border + checkmark | border-[#4f35d2] |
| PE-010 | P0 | Deselect on new | "Solo Agent" → "Team Lead" | "Team Lead" only | Single selection |
| PE-011 | P1 | Hover effect | Hover unselected card | Scale 1.02 + shadow | hover:scale-[1.02] |
| PE-012 | P1 | Checkmark overlay | Select card | Purple circle, white check, top-right | absolute top-2.5 right-2.5 |
| PE-013 | P0 | Continue disabled no selection | No selection | Gray, not clickable | disabled:opacity-40 |
| PE-014 | P0 | Continue enabled after | Select any | Purple, clickable | bg-[#4f35d2] |

### Pills

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| PE-015 | P0 | Pill selects | Click "Just me" | Purple fill, white text | bg-[#4f35d2] text-white |
| PE-016 | P0 | Deselect previous | "Just me" → "2-5" | "2-5" only | |
| PE-017 | P1 | Unselected style | Load | White bg, gray border | border-gray-200 |

### Multi-Select (Screen 4)

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| PE-018 | P0 | Select 1 item | Click 1 card | Continue enabled | |
| PE-019 | P0 | Select up to 3 | Click 3 cards | All highlighted | |
| PE-020 | P0 | 4th blocked | Click 4th | No highlight, max 3 | length < 3 |
| PE-021 | P0 | Deselect by re-click | Click selected card | Deselected | Filter removes |
| PE-022 | P1 | Subtitle "1-3" | Screen 4 | "Pick 1-3 priorities" | |

### Progress Bar

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| PE-023 | P1 | Starts ~8% | Screen 0 | Bar visible | Math.max(8,...) |
| PE-024 | P1 | Grows per screen | Advance | Width increases | |
| PE-025 | P1 | No step numbers | Any | Bar only, no text | |
| PE-026 | P2 | Gradient correct | Any | Indigo → coral | |
| PE-027 | P2 | Smooth transition | Advance | 300ms ease-out | |

### Conversational Headings

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| PE-028 | P1 | Uses first name | Session: "Sarah Johnson" | "Hey Sarah, what brings..." | split(" ")[0] |
| PE-029 | P1 | Screen 1 tone | Advance | "Great! What's your primary focus?" | |
| PE-030 | P1 | Screen 4 "Almost done" | Advance | "Almost done! What do you want to tackle first?" | |
| PE-031 | P1 | Fallback "there" | No name | "Hey there, what brings..." | |

### Persistence

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| PE-032 | P0 | Saves to DB | Complete Screen 0 | onboarding_persona set | DB query |
| PE-033 | P0 | Resumes on refresh | Complete 0-2, refresh | Resumes at 3 | getPersonalizationProgress |
| PE-034 | P0 | Redirect if completed | personalization_completed=true, visit | Redirect to /onboarding or / | |
| PE-035 | P1 | Back preserves | Screen 2 → back → Screen 1 | Previous selection shown | |
| PE-036 | P1 | Skip saves null | Skip Screen 1 | onboarding_market: null | |

### Layout

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| PE-037 | P1 | Desktop 2-col | 1280px | 2x2 grid | grid-cols-2 |
| PE-038 | P1 | Screen 4 3-col | 1280px, 6 items | 2x3 grid | md:grid-cols-3 |
| PE-039 | P1 | Mobile 2-col | 375px | 2x2 grid | |
| PE-040 | P2 | Loading centered | Screen 5 | Centered spinner | items-center justify-center |

### Edge Cases

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| PE-041 | P0 | No double-click | Rapid Continue | Only 1 save | saving blocks |
| PE-042 | P1 | No race conditions | Fast screens | Different columns per screen | |
| PE-043 | P2 | Empty session | No session | Loading → redirect | |
| PE-044 | P1 | Screen 5 completes | Reach Screen 5 | personalization_completed=true | |
| PE-045 | P1 | All skipped defaults | Skip every screen | Defaults applied, redirect works | |
| PE-046 | P2 | Browser back | Press back from Screen 3 | Test navigation behavior | |
| PE-047 | P2 | Keyboard accessible | Tab + Enter | Card selects | |
| PE-048 | P3 | Transition animation | Advance | animate-fade-in | |

---

## 3. ONBOARDING (OB-001 to OB-062)

### Step 1: Profile

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| OB-001 | P0 | Loads | Visit /onboarding | Headshot + phone + timezone | |
| OB-002 | P1 | Headshot upload | Select JPEG | Preview shows | URL.createObjectURL |
| OB-003 | P1 | Preview display | After upload | Image in circle | |
| OB-004 | P2 | Reject non-image | Select .txt | Only accepts jpeg/png/webp | accept attr |
| OB-005 | P0 | Phone input | Step 1 | Placeholder "604-555-1234" | type="tel" |
| OB-006 | P1 | Timezone auto | Load | Defaults to user TZ | Intl API |
| OB-007 | P0 | Continue | Click | Step 2 | |
| OB-008 | P0 | Skip | Click skip | Step 2 | |
| OB-009 | P1 | Upload loading | During upload | Spinner overlay | Loader2 |
| OB-010 | P2 | Upload error | Network fail | Error shown, preview cleared | |

### Step 2: Contact Import

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| OB-011 | P0 | Gmail button | Click | Fetches or OAuth | GET api |
| OB-012 | P0 | vCard upload | Select .vcf | Parses contacts | POST api |
| OB-013 | P0 | CSV zone visible | Scroll | Drop zone visible | CSVImportStep |
| OB-014 | P0 | CSV drag | Drag .csv | Parses, shows mapping | Client-side |
| OB-015 | P0 | CSV click | Click zone | File picker | Hidden input |
| OB-016 | P1 | CSV auto-map | "Name,Email,Phone" headers | Auto-mapped | COLUMN_MAP |
| OB-017 | P1 | CSV manual map | "Contact,Mail" headers | Dropdowns shown | |
| OB-018 | P1 | CSV preview | After map | First 3 rows | Table |
| OB-019 | P0 | CSV import | Click "Import X" | Contacts created | POST api |
| OB-020 | P1 | CSV non-csv | Select .txt | Error message | Extension check |
| OB-021 | P1 | CSV 5000 limit | 6000 rows | Warning | rows > 5000 |
| OB-022 | P1 | CSV empty | Empty file | "No data" error | lines < 2 |
| OB-023 | P2 | CSV no email warning | No email column | Amber warning | |
| OB-024 | P0 | Import success | Import 10 | "10 imported!" | importCount |
| OB-025 | P1 | Sample data | Click skip | 3 samples created | seedSampleData |
| OB-026 | P1 | Back | Click back | Step 1 | |
| OB-027 | P2 | Preview search | Type name | Filters | Real-time |
| OB-028 | P2 | Select all | Click checkbox | All selected | toggleAll |

### Step 3: Email Sync

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| OB-029 | P0 | Google SSO auto-detect | Google user | Green "Connected" | accessToken |
| OB-030 | P0 | Email user shows connect | Email user | "Connect Gmail" button | No token |
| OB-031 | P1 | Connect triggers OAuth | Click | Google OAuth | signIn |
| OB-032 | P1 | Continue text changes | Connected vs not | Different labels | |
| OB-033 | P2 | Outlook note | Step 3 | "Outlook coming soon" | |

### Step 4-7

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| OB-034 | P0 | Calendar OAuth | Click Connect | Google OAuth | |
| OB-035 | P1 | Calendar skip | Skip | Step 5 | |
| OB-036 | P0 | Brokerage autocomplete | Type "RE/MAX" | Suggestions after 300ms | debounce |
| OB-037 | P1 | Click suggestion | Click | Input fills | |
| OB-038 | P1 | License optional | Leave empty | Saves null | |
| OB-039 | P0 | AI Bio button | Step 5 | "Generate with AI" visible | |
| OB-040 | P0 | AI Bio generates | Click generate | Typewriter fills bio | 15ms/2chars |
| OB-041 | P1 | Bio disabled no brokerage | Empty brokerage | Button disabled | |
| OB-042 | P1 | Bio max 3 | Click 3x | "Edit bio or try later" | attempts >= 3 |
| OB-043 | P1 | Bio failure | Claude fails | Toast error | |
| OB-044 | P1 | Bio editable | After generate | Textarea editable | |
| OB-045 | P1 | Bio icon changes | After 1st | Sparkles → RefreshCw | |
| OB-046 | P0 | Continue saves | Click | All fields saved to DB | |
| OB-047 | P0 | MLS dropdown | Step 6 | 7 BC boards + Other | 8 options |
| OB-048 | P1 | No MLS checkbox | Click | Dropdown hides | noMLS |
| OB-049 | P1 | MLS beta card | Step 6 | "Integration is in beta" | |
| OB-050 | P1 | MLS continue text | Board vs none | Different labels | |
| OB-051 | P0 | 3 action cards | Step 7 | Contacts, Marketing, Dashboard | |
| OB-052 | P0 | Card → celebration | Click card | CelebrationScreen | showCelebration |
| OB-053 | P0 | Completed in DB | Click card | onboarding_completed=true, step=8 | |
| OB-054 | P0 | AI fires on complete | Click card | briefing + automations async | |
| OB-055 | P0 | 7 progress segments | Any | 7 bars | STEPS.length |
| OB-056 | P1 | Left panel text | Each step | Description changes | |
| OB-057 | P1 | Errors clear | New action | Previous error gone | setError("") |
| OB-058 | P1 | Resume from last | Leave at 4, return | Resumes step 5 | DB step |
| OB-059 | P0 | Skip all → celebration | Skip everything | Celebration shows | |
| OB-060 | P2 | Mobile indicator | 375px | Dots visible | |
| OB-061 | P2 | Desktop left panel | 1280px | Purple gradient | |
| OB-062 | P2 | Smooth transitions | Advance | No page reload | Client-side |

---

## 4. CELEBRATION (CE-001 to CE-028)

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| CE-001 | P0 | 4 checkmarks appear | Complete Step 7 | All 4 items shown | |
| CE-002 | P0 | 800ms stagger | Watch | Each 800ms apart | STAGGER_MS |
| CE-003 | P1 | Pending = gray circle | Before turn | Gray hollow | |
| CE-004 | P1 | Loading = spinner | During turn | Blue spinning | |
| CE-005 | P1 | Done = green + bounce | After turn | Green circle + bounce | animate-bounce-once |
| CE-006 | P1 | "Done" text | After complete | Green "Done" right | |
| CE-007 | P2 | SVG stroke draws | Done state | Checkmark draws | animate-draw-check |
| CE-008 | P0 | Confetti fires | After checkmarks | Particles both sides | canvas-confetti |
| CE-009 | P1 | Left colors | Burst | Indigo + coral | #4f35d2 #ff5c3a |
| CE-010 | P1 | Right colors | Burst | Teal + gold | #00bfa5 #FFD700 |
| CE-011 | P1 | 3 bursts | Watch | 0s, 0.7s, 1.4s | setTimeout |
| CE-012 | P0 | Welcome heading | After confetti | "Welcome, {firstName}!" | Name |
| CE-013 | P1 | Gradient text | Heading | Purple → coral | background-clip |
| CE-014 | P0 | Feature counter | Below heading | "{N} features unlocked" | Count-up |
| CE-015 | P1 | Counter eases | Watch | Fast start slow end | Step size |
| CE-016 | P2 | No name fallback | No name | "Welcome to Realtors360!" | |
| CE-017 | P0 | Button appears | After 1.8s | "Go to Dashboard" | showButton |
| CE-018 | P0 | Button navigates | Click | Goes to destination | router.push |
| CE-019 | P0 | Auto-redirect 15s | Wait | Auto-redirects | setTimeout(15000) |
| CE-020 | P1 | Button shadow | Visible | Purple shadow | shadow-[#4f35d2]/20 |
| CE-021 | P1 | Button fade | Appears | animate-fade-in | |
| CE-022 | P0 | Reduced motion no confetti | OS setting | No particles | prefers-reduced-motion |
| CE-023 | P0 | Reduced motion no stagger | OS setting | All instant | delay=0 |
| CE-024 | P1 | Reduced motion static | OS setting | Gradient visible no shimmer | |
| CE-025 | P0 | Full screen | Celebration | Covers viewport | fixed inset-0 z-50 |
| CE-026 | P1 | Background gradient | Celebration | Purple gradient | |
| CE-027 | P1 | 0 features no counter | Empty features | Counter hidden | totalFeatures > 0 |
| CE-028 | P2 | Mobile reduced particles | 375px | 40 particles | |

---

## 5. CHECKLIST (CL-001 to CL-024)

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| CL-001 | P0 | Appears on dashboard | After onboarding | Bottom-right widget | fixed bottom-4 right-4 |
| CL-002 | P0 | 5 items shown | Widget | contact, listing, calendar, email, showing | |
| CL-003 | P0 | Auto-detect contact | Create real contact | "Add contact" completes | DB count |
| CL-004 | P0 | Auto-detect listing | Create listing | "Create listing" completes | DB count |
| CL-005 | P0 | Auto-detect calendar | Connect calendar | "Calendar" completes | user_integrations |
| CL-006 | P1 | Sample data ignored | Seed samples | Still incomplete | is_sample filter |
| CL-007 | P0 | Progress ring updates | 2/5 done | 40% ring | SVG dashoffset |
| CL-008 | P1 | Ring gradient | Any | Purple → orange | linearGradient |
| CL-009 | P0 | All done confetti | 5/5 | Confetti fires | fireConfetti |
| CL-010 | P0 | Auto-dismiss | All done | Gone after 5s | setTimeout(5000) |
| CL-011 | P0 | X dismiss | Click X | Gone permanently | POST dismiss_all |
| CL-012 | P1 | Minimize/expand | Click header | Toggle items | minimized state |
| CL-013 | P1 | Items link | Click item | Navigate to page | href |
| CL-014 | P1 | Done strikethrough | Complete item | line-through text | |
| CL-015 | P1 | Green check done | Done item | Green circle + check | |
| CL-016 | P1 | Gray circle pending | Pending | Hollow circle | |
| CL-017 | P0 | Hidden during wizard | On /onboarding | Not visible | onboardingCompleted false |
| CL-018 | P1 | Focus items first | focus=["contacts"] | Contact item on top | Sort |
| CL-019 | P2 | Scrollable | Many items | max-h-64 scroll | overflow-y-auto |
| CL-020 | P0 | Server persistence | Dismiss, reload | Still dismissed | DB not localStorage |
| CL-021 | P1 | Cross-device | Dismiss desktop | Mobile also dismissed | Server state |
| CL-022 | P2 | Entry animation | Appears | Fade + zoom | animate-in |
| CL-023 | P2 | Chevron toggle | Min/max | Up/down icon | |
| CL-024 | P1 | No session hidden | Log out | No widget | session check |

---

## 6. BANNERS (BN-001 to BN-022)

### Email Verification

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| BN-001 | P0 | Shows unverified | Email signup | Amber "Verify email" banner | emailVerified false |
| BN-002 | P0 | Hidden Google SSO | Google signup | No amber banner | Auto-verified |
| BN-003 | P0 | Resend works | Click "Resend" | "Sending..." → "Sent!" | POST api |
| BN-004 | P1 | "Sent!" resets | Wait 5s | Back to "Resend" | setTimeout(5000) |
| BN-005 | P1 | Disabled while sending | During send | Button grayed | disabled |
| BN-006 | P0 | Hides on verify | Verify email | Banner gone next load | emailVerified true |
| BN-007 | P2 | Spam note | Banner | "check spam folder" text | |

### Trial Banner

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| BN-008 | P0 | Shows < 5 days | 3 days remaining | "3 days left" gradient | trialDaysRemaining |
| BN-009 | P0 | Hidden > 5 days | 14 days remaining | No banner | daysLeft > 5 |
| BN-010 | P0 | Hidden no trial | No trial_ends_at | No banner | |
| BN-011 | P0 | Upgrade link | Click "Upgrade" | /settings/billing | |
| BN-012 | P0 | Dismiss cookie | Click X | Gone, cookie set | max-age=86400 |
| BN-013 | P1 | Re-shows 24h | Expire cookie | Banner back | |
| BN-014 | P1 | Singular "day" | 1 day left | "1 day left" | !== 1 |
| BN-015 | P2 | Gradient style | Visible | Purple → orange | |

### Dashboard Banner

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| BN-016 | P0 | Shows incomplete | After onboarding | "X of Y steps complete" | checklist < 100% |
| BN-017 | P0 | Progress accurate | 2/5 done | 40% bar | Math.round |
| BN-018 | P0 | Next action link | Incomplete items | Link to next item | nextItem.href |
| BN-019 | P0 | Hidden 100% | All done | No banner | completed === total |
| BN-020 | P0 | Dismiss localStorage | Click X | lf-banner-dismissed saved | JSON.stringify |
| BN-021 | P1 | 24h re-show | Expire | Banner reappears | Time check |
| BN-022 | P1 | Fetches API | Load | GET /api/onboarding/checklist | Network |

---

## 7. DRIP EMAILS (DR-001 to DR-026)

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| DR-001 | P0 | Day 0 on signup | Create account | Welcome email sent | drip_log day=0 |
| DR-002 | P0 | Day 0 content | Check email | Subject + 3 links | Body |
| DR-003 | P0 | Cron needs auth | POST without Bearer | 401 | |
| DR-004 | P0 | Cron with auth | POST with CRON_SECRET | 200 processed | |
| DR-005 | P0 | Day 1 skip contacts | Import → Day 1 | Skipped, logged | skipped=true |
| DR-006 | P0 | Day 1 send no contacts | No contacts → Day 1 | Email sent | |
| DR-007 | P1 | Day 2 skip remarks | Have remarks → Day 2 | Skipped | |
| DR-008 | P1 | Day 3 skip newsletter | Sent newsletter → Day 3 | Skipped | |
| DR-009 | P1 | Day 5 skip calendar | Connected → Day 5 | Skipped | |
| DR-010 | P0 | Day 7 skip upgraded | Upgraded → Day 7 | Skipped | plan != free |
| DR-011 | P0 | Day 12 skip upgraded | Same | Skipped | |
| DR-012 | P0 | No double-send | Cron twice | 1 email only | DB exists check |
| DR-013 | P0 | Unsubscribe stops all | drip_unsubscribed=true | All skipped | |
| DR-014 | P1 | From field | Any email | "Rahul from Realtors360" | |
| DR-015 | P1 | Unsubscribe header | Email headers | List-Unsubscribe | RFC 8058 |
| DR-016 | P1 | 14-day window only | 15 days ago | Not processed | created_at filter |
| DR-017 | P2 | Message ID logged | Send | message_id in DB | |
| DR-018 | P0 | Day 0 cron retry | Signup API fails → cron | Day 0 caught | Missing log |
| DR-019 | P1 | Google SSO Day 0 | Google signup | Day 0 sent | auth.ts |
| DR-020 | P2 | HTML links | Email body | Clickable links | regex |
| DR-021 | P1 | Processes all users | 5 users | All 5 processed | result.processed |
| DR-022 | P2 | Inactive skipped | is_active=false | Not processed | |
| DR-023 | P0 | Trial cron auth | POST without Bearer | 401 | |
| DR-024 | P0 | Trial downgrades | Expired trial | plan=free, features updated | DB |
| DR-025 | P0 | Trial idempotent | Run twice | Only 1 downgrade | trial_plan null check |
| DR-026 | P1 | Trial sends email | Downgraded | "Trial ended" email | Day 14 |

---

## 8. AI (AI-001 to AI-030)

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| AI-001 | P0 | Bio succeeds | Brokerage + generate | Bio appears typewriter | Claude call |
| AI-002 | P0 | Bio saved | After generate | users.bio populated | DB |
| AI-003 | P1 | No fabrication | Read bio | No fake awards/stats | Prompt guard |
| AI-004 | P0 | Bio failure | Mock 500 | "AI unavailable" toast | Error state |
| AI-005 | P1 | Typewriter timing | Watch | ~15ms per 2 chars | Interval |
| AI-006 | P0 | Categorize contacts | Import + categorize | Types + confidence | |
| AI-007 | P1 | Batch 50 | Import 60 | First 50 only | limit(50) |
| AI-008 | P1 | Confidence levels | Check | high/medium/low | JSON |
| AI-009 | P0 | Apply categories | Overrides | contacts.type updated | DB |
| AI-010 | P0 | Briefing generates | Dashboard | 3 recommendations | JSONB |
| AI-011 | P0 | Briefing cached | Visit twice | Same, 1 AI call | DB cache |
| AI-012 | P1 | Briefing fallback | Mock fail | Hardcoded 3 defaults | |
| AI-013 | P0 | Automation suggests | After import | 3 suggestions | |
| AI-014 | P1 | 0 contacts defaults | No contacts | Generic suggestions | |
| AI-015 | P1 | Counts contacts | 50 contacts | "50 contacts" in suggestion | |
| AI-016 | P0 | First actions | Import → suggest | "Send hello to {name}" | 3 contacts |
| AI-017 | P1 | First actions fallback | 0 contacts | "Import contacts" | |
| AI-018 | P0 | MLS auto 1st listing | Create first listing | generateMLSRemarks fires | Count check |
| AI-019 | P1 | No auto 2nd listing | Create second | No trigger | count > 1 |
| AI-020 | P0 | AI on completion | Step 7 | briefing + automations | fire-and-forget |
| AI-021 | P1 | AI doesn't block | Step 7 | Celebration immediate | Async |
| AI-022 | P2 | Uses Haiku | Check logs | model=claude-haiku-4-5 | |
| AI-023 | P2 | Bio prompt safe | Check prompt | "Do NOT fabricate" | |
| AI-024 | P1 | Domain hints | @remax.ca | Agent, high confidence | |
| AI-025 | P1 | JSON backtick handling | Response with ``` | Parsed correctly | regex |
| AI-026 | P2 | No auth error | No session | "Not authenticated" | |
| AI-027 | P1 | Bio empty name | No name | "Enter name first" | |
| AI-028 | P2 | Briefing valid paths | Check items | /contacts, /listings etc. | |
| AI-029 | P2 | Trigger types valid | Suggestions | weekly, monthly etc. | |
| AI-030 | P3 | Concurrent safe | Multiple calls | All complete | Promise.allSettled |

---

## 9. BILLING (BI-001 to BI-018)

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| BI-001 | P0 | Page loads | /settings/billing | Table + trial info | |
| BI-002 | P0 | Trial countdown | New user | "X days remaining" | trialDaysRemaining |
| BI-003 | P1 | Large day number | Active | 2xl font-bold | |
| BI-004 | P1 | Progress bar | Active | Days elapsed % | Width calc |
| BI-005 | P0 | 12 feature rows | Table | All features | FEATURE_ROWS |
| BI-006 | P0 | 4 plan columns | Table | Free/Pro/Studio/Team | |
| BI-007 | P1 | Checkmarks | Included feature | Green check | |
| BI-008 | P1 | X marks | Excluded | Gray X | |
| BI-009 | P1 | Limits shown | Free contacts | "50" | String cell |
| BI-010 | P0 | Current highlighted | Trial user | Professional blue + "Current" badge | |
| BI-011 | P0 | Upgrade visible | Higher plans | "Upgrade" button | |
| BI-012 | P0 | Upgrade is mailto | Click Upgrade | Email opens | mailto link |
| BI-013 | P1 | No upgrade current | Current plan | "Current Plan" text | |
| BI-014 | P1 | No downgrade | Lower plan | No button | Price compare |
| BI-015 | P0 | Expired banner | Past trial | "Trial has ended" amber | daysLeft 0 |
| BI-016 | P1 | No trial no countdown | No trial_ends_at | No banner | null check |
| BI-017 | P2 | Stripe note | Bottom | "Coming soon" | |
| BI-018 | P2 | Mobile scroll | 375px | Table scrolls | overflow-x-auto |

---

## 10. MIDDLEWARE (MW-001 to MW-012)

| ID | Priority | Test | Steps | Expected | Verify |
|----|----------|------|-------|----------|--------|
| MW-001 | P0 | No session → login | Visit /contacts | Redirect /login | 302 |
| MW-002 | P0 | Personalization gate | New user → /contacts | Redirect /personalize | flag false |
| MW-003 | P0 | Onboarding gate | Personalized → /contacts | Redirect /onboarding | flag false |
| MW-004 | P0 | Completed passes | Full user → /contacts | Page loads | Both true |
| MW-005 | P0 | Admin exempt | Admin → /contacts | Page loads | role admin |
| MW-006 | P0 | /personalize allowed | New → /personalize | Page loads | Allowlist |
| MW-007 | P0 | /onboarding allowed | New → /onboarding | Page loads | |
| MW-008 | P0 | /join/* allowed | Visit /join/token | Page loads | |
| MW-009 | P0 | /api not redirected | API without onboarding | Returns data | Exempt |
| MW-010 | P0 | Trial features in session | Trial user signin | Professional features | JWT |
| MW-011 | P0 | Expired → free | Expired trial signin | Free features only | getEffectivePlan |
| MW-012 | P1 | Email non-blocking | Unverified → /contacts | Page loads (banner shows) | No redirect |

---

## FULL E2E JOURNEY (E2E-001)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Visit /signup | Split-screen, 3 fields, trial badge |
| 2 | Enter name/email/password | Green email available, Strong meter |
| 3 | Click "Start free trial" | Success → auto-redirect 1.5s |
| 4 | /personalize Screen 0 | "Hey Sarah, what brings..." |
| 5-9 | Complete all 5 screens | Each saves, progress bar grows |
| 10 | Screen 5 loading | Spinner → /onboarding after 2s |
| 11 | Step 1: phone + skip headshot | Step 2 |
| 12 | Step 2: sample data | 3 contacts, Step 3 |
| 13-14 | Steps 3-4: skip | Step 5 |
| 15 | Step 5: brokerage + AI bio | Bio typewriters in |
| 16-17 | Steps 6-7: MLS + choose | Celebration triggers |
| 18 | Celebration | Checkmarks → fireworks → "Welcome!" |
| 19 | Dashboard | Banner + checklist visible |
| 20 | Create contact | Checklist auto-updates |
| 21 | Check email | Day 0 welcome received |
| 22 | /settings/billing | Trial countdown visible |
| 23 | Trial < 5 days | Trial banner shows |
| 24 | Trial expires + cron | Downgraded, email sent |
| 25 | Visit /listings | UpgradePrompt shown |

---

## BUG PREDICTION (Highest Probability)

| Risk | Area | Why | Test IDs |
|------|------|-----|----------|
| **HIGH** | Middleware gate for demo users | Demo users may have null personalization_completed → redirect loop | MW-002, MW-005 |
| **HIGH** | JWT stale after trial expires | JWT cached 1 hour, features may be stale | MW-010, MW-011 |
| **HIGH** | CSV quoted commas | "Smith, John" in CSV breaks parsing | OB-014, OB-016 |
| **HIGH** | Step number mismatch | Changed 5→7 steps, advanceStep(8) | OB-053, OB-058 |
| **MEDIUM** | Email debounce race | Fast typing may cause stale result | SU-014 |
| **MEDIUM** | Celebration auto-redirect | 15s timer while user reads | CE-019 |
| **MEDIUM** | Sample data is_sample=null | Old contacts have null not false | CL-006 |
| **MEDIUM** | Drip timezone | 9 AM UTC = 1 AM PST | DR timing |
| **LOW** | Typewriter cleanup | Navigate away mid-typewriter → interval leak | AI-005 |
| **LOW** | FeatureDiscovery lf-signup-date | Never set in current code | PO7 |
