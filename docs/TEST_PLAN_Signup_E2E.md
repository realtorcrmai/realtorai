<!-- docs-audit: none --># Signup Functionality — End-to-End Test Plan

**Date:** 2026-04-20  
**Tester:** Claude (Automated via Playwright MCP)  
**App URL:** http://localhost:3000  
**Scope:** Complete signup flow including form, validation, OAuth, verification, onboarding

---

## Test Case Book — Overview

| Module | Test Cases | Priority |
|--------|-----------|----------|
| A. Signup Page Load & UI | 8 | High |
| B. Name Field Validation | 7 | High |
| C. Email Field Validation | 10 | Critical |
| D. Password Field Validation | 9 | Critical |
| E. Turnstile CAPTCHA | 5 | Medium |
| F. Form Submission (Happy Path) | 4 | Critical |
| G. Form Submission (Error Paths) | 8 | Critical |
| H. Google OAuth Signup | 5 | High |
| I. Post-Signup Auto Sign-In | 3 | High |
| J. Email Verification Flow | 7 | High |
| K. Phone Verification Flow | 7 | Medium |
| L. Onboarding Wizard | 10 | High |
| M. Personalization Flow | 6 | Medium |
| N. Team Invite Acceptance | 5 | Medium |
| O. Navigation & Links | 6 | Medium |
| P. Responsive / Mobile | 5 | Medium |
| Q. Accessibility (WCAG AA) | 8 | High |
| R. Security & Rate Limiting | 6 | Critical |
| **TOTAL** | **119** | |

---

## Module A: Signup Page Load & UI

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| A1 | Navigate to /signup | Page loads, form visible, no console errors | |
| A2 | Page title & heading correct | "Create your account" or similar heading | |
| A3 | Logo visible | Realtors360 logo renders | |
| A4 | All form fields present | Name, Email, Password fields visible | |
| A5 | Submit button present & initially disabled/enabled | Button visible with correct label | |
| A6 | "Already have an account?" link to /login | Link present and navigates correctly | |
| A7 | Google OAuth button visible | "Sign up with Google" button present | |
| A8 | "I have a team" checkbox visible | Team checkbox present with label | |

---

## Module B: Name Field Validation

| # | Test Case | Input | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| B1 | Empty name → submit | "" | Error: name required | |
| B2 | Single character | "A" | Error: min 2 characters | |
| B3 | Exactly 2 characters | "Jo" | Accepted (no error) | |
| B4 | Name with spaces | "John Doe" | Accepted | |
| B5 | Name auto title-case on blur | "john doe" | Displays "John Doe" | |
| B6 | Special characters | "O'Brien-Smith" | Accepted | |
| B7 | Very long name (200+ chars) | 200+ chars | Accepted or truncated gracefully | |

---

## Module C: Email Field Validation

| # | Test Case | Input | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| C1 | Empty email → submit | "" | Error: email required | |
| C2 | No @ symbol | "testexample.com" | Error: invalid email | |
| C3 | Valid email format | "test@example.com" | Accepted, availability check fires | |
| C4 | Email availability — available | New email | Green checkmark, "Available" | |
| C5 | Email availability — taken | Existing user email | Red error, "Account exists" + login link | |
| C6 | Email availability — disposable | "test@mailinator.com" | Red error, disposable rejected | |
| C7 | Email with uppercase | "Test@Example.COM" | Normalized to lowercase | |
| C8 | Email with leading/trailing spaces | " test@example.com " | Trimmed before check | |
| C9 | Email debounce (type fast) | Rapid typing | Only final check fires (500ms debounce) | |
| C10 | Email with plus addressing | "test+tag@gmail.com" | Accepted as valid | |

---

## Module D: Password Field Validation

| # | Test Case | Input | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| D1 | Empty password → submit | "" | Error: password required | |
| D2 | Less than 8 chars | "abc1234" | Error: min 8 characters | |
| D3 | Exactly 8 chars (lowercase only) | "abcdefgh" | Accepted, strength: Weak | |
| D4 | With uppercase | "Abcdefgh" | Strength: Medium | |
| D5 | With uppercase + numbers | "Abcdef12" | Strength: Medium | |
| D6 | With uppercase + numbers + special | "Abcdef1!" | Strength: Strong | |
| D7 | Password visibility toggle | Click eye icon | Password shown/hidden | |
| D8 | Strength meter visual | Various inputs | Bar color changes (red→amber→green) | |
| D9 | Very long password (100+ chars) | 100+ chars | Accepted | |

---

## Module E: Turnstile CAPTCHA

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| E1 | CAPTCHA widget renders | Turnstile widget visible on page | |
| E2 | CAPTCHA completes successfully | Token generated, form submittable | |
| E3 | CAPTCHA fails / expires | Error shown, widget resets | |
| E4 | CAPTCHA script fails to load | Form still submittable after 5s timeout | |
| E5 | CAPTCHA resets on form error | Widget resets for re-verification | |

---

## Module F: Form Submission — Happy Path

| # | Test Case | Input | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| F1 | Valid signup (all fields correct) | Valid name, email, password | 201 Created, auto sign-in, redirect to /onboarding | |
| F2 | Signup with team checkbox | Valid + team checked | Redirect to /onboarding?create_team=true | |
| F3 | Loading state during submission | Click submit | Button shows spinner, inputs disabled | |
| F4 | Success message/redirect | After submit | Redirected to onboarding or verification | |

---

## Module G: Form Submission — Error Paths

| # | Test Case | Scenario | Expected Result | Status |
|---|-----------|----------|----------------|--------|
| G1 | Duplicate email | Email already registered | Error: "account already exists" + login link | |
| G2 | Disposable email on submit | mailinator.com email | Error: disposable email rejected | |
| G3 | Rate limited | 6th signup in 15 min | Error: "Too many attempts" | |
| G4 | Server error (500) | DB down / network failure | Generic error message shown | |
| G5 | Invalid CAPTCHA token | Tampered token | Error: verification failed | |
| G6 | Missing required fields | Partial form | Inline validation errors shown | |
| G7 | Network timeout | Slow response | Timeout handled gracefully | |
| G8 | Submit button state after error | Error occurs | Button re-enabled, CAPTCHA resets | |

---

## Module H: Google OAuth Signup

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| H1 | Click "Sign up with Google" | Redirects to Google consent screen | |
| H2 | Consent screen shows correct scopes | Calendar, Gmail, Contacts scopes listed | |
| H3 | Cancel on Google consent | Returns to signup with no error | |
| H4 | New Google user → signup | Account created, email_verified=true | |
| H5 | Existing Google user → login | Signs in (no duplicate), redirects to dashboard | |

---

## Module I: Post-Signup Auto Sign-In

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| I1 | Auto sign-in succeeds | Session created, JWT issued | |
| I2 | Auto sign-in fails | Redirect to /login with success message | |
| I3 | Session contains correct user data | id, email, role, plan populated | |

---

## Module J: Email Verification Flow

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| J1 | Verification page loads (/verify) | Shows email sent message, masked email | |
| J2 | Valid verification link clicked | email_verified=true, redirect to /verify/phone | |
| J3 | Expired verification link | Error: token expired, resend option | |
| J4 | Invalid/tampered token | Error: invalid token | |
| J5 | Resend verification email | New email sent, 60s cooldown enforced | |
| J6 | Resend cooldown (click again < 60s) | Button disabled, countdown shown | |
| J7 | Already verified user visits /verify | Redirect to dashboard or next step | |

---

## Module K: Phone Verification Flow

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| K1 | Phone verification page loads (/verify/phone) | Phone input field visible | |
| K2 | Enter valid phone → send OTP | OTP sent, input for code appears | |
| K3 | Enter correct 6-digit OTP | phone_verified=true, redirect | |
| K4 | Enter wrong OTP | Error: incorrect code, attempts decremented | |
| K5 | Exceed 5 failed attempts | 30-minute lockout message | |
| K6 | OTP expires (10 min) | Error: code expired, resend option | |
| K7 | Invalid phone format | Error: invalid phone number | |

---

## Module L: Onboarding Wizard

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| L1 | Onboarding page loads | Step 1 visible, progress indicator shown | |
| L2 | Step 1: Skip headshot upload | Can proceed without photo | |
| L3 | Step 1: Upload headshot | File accepted, preview shown | |
| L4 | Step 1: Select timezone | Timezone saved | |
| L5 | Step 2: Import contacts (CSV) | CSV parsed, contacts created | |
| L6 | Step 2: Skip contact import | Can proceed without importing | |
| L7 | Step 3: Enter professional info | Brokerage, license, bio saved | |
| L8 | Step 3: Skip professional info | Can proceed with empty fields | |
| L9 | Step 4: MLS connection (optional) | Can skip, marks as skipped | |
| L10 | Step 5: Completion → redirect | Redirect to dashboard, sample data seeded | |

---

## Module M: Personalization Flow

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| M1 | Personalization page loads (/personalize) | First question screen visible | |
| M2 | Select persona type | Selection saved | |
| M3 | Select market area | Selection saved | |
| M4 | Select team size | Selection saved | |
| M5 | Select experience level | Selection saved | |
| M6 | Complete all screens → finish | personalization_completed=true, redirect | |

---

## Module N: Team Invite Acceptance

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| N1 | Valid invite link → not logged in | Shows signup/login options | |
| N2 | Valid invite link → logged in (matching email) | Membership created, redirect to dashboard | |
| N3 | Expired invite token | Error: invite expired | |
| N4 | Invalid/tampered invite token | Error: invalid invite | |
| N5 | Already accepted invite | Error: already a member | |

---

## Module O: Navigation & Links

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| O1 | "Already have an account?" → /login | Navigates to login page | |
| O2 | Login page "Create account" → /signup | Navigates to signup page | |
| O3 | "Forgot password?" link on login | Navigates to /forgot-password | |
| O4 | Back button behavior | Returns to previous auth page | |
| O5 | Direct URL /signup when authenticated | Redirects to dashboard | |
| O6 | Direct URL /onboarding when not authenticated | Redirects to login | |

---

## Module P: Responsive / Mobile

| # | Test Case | Viewport | Expected Result | Status |
|---|-----------|----------|----------------|--------|
| P1 | Signup form on mobile (375px) | iPhone SE | Form fits, no horizontal scroll | |
| P2 | Signup form on tablet (768px) | iPad | Layout adapts | |
| P3 | Password strength meter on mobile | 375px | Visible, not clipped | |
| P4 | Touch targets (buttons, inputs) | Mobile | Min 44x44px tap targets | |
| P5 | Keyboard doesn't obscure inputs | Mobile | Form scrolls to visible input | |

---

## Module Q: Accessibility (WCAG AA)

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| Q1 | All inputs have labels/aria-labels | Every input labeled | |
| Q2 | Error messages linked via aria-describedby | Errors announced by screen reader | |
| Q3 | Focus order logical (Tab key) | Name → Email → Password → Submit | |
| Q4 | Color contrast passes WCAG AA | 4.5:1 ratio on all text | |
| Q5 | Form errors announced (aria-live) | Errors read by assistive tech | |
| Q6 | Submit button has accessible name | Button text or aria-label present | |
| Q7 | Password visibility toggle accessible | Toggle has aria-label, state announced | |
| Q8 | Skip link or heading hierarchy | h1 present on page | |

---

## Module R: Security & Rate Limiting

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| R1 | Rate limit: 6th signup attempt in 15 min | 429 Too Many Requests | |
| R2 | SQL injection in email field | Input sanitized, no DB error | |
| R3 | XSS in name field | Input escaped in UI | |
| R4 | Password not in API response | 201 response has no password/hash | |
| R5 | Verification token is one-time use | Second click returns invalid | |
| R6 | HTTPS enforced (production) | No plain HTTP in auth flows | |

---

## Execution Strategy

1. **Start dev server** at localhost:3000
2. **Execute Module A–D first** (UI & validation — no side effects)
3. **Execute Module F–G** (form submission — requires unique emails)
4. **Execute Module O–Q** (navigation, responsive, a11y — read-only)
5. **Document Module E, H, J, K** (CAPTCHA, OAuth, verification — may need manual/mock)
6. **Execute Module L–M** (onboarding — requires authenticated session)
7. **Document Module R** (security — careful with rate limits)

---

## Test Data

| Field | Test Value |
|-------|-----------|
| Valid Name | "Test User" |
| Valid Email | "signup-test-{timestamp}@example.com" |
| Valid Password | "TestPass123!" |
| Disposable Email | "test@mailinator.com" |
| Taken Email | "demo@realestatecrm.com" |
| Short Password | "abc" |
| Weak Password | "abcdefgh" |
| Strong Password | "MyStr0ng!Pass" |

---

## Pass Criteria

- **Critical modules (C, D, F, G, R):** 100% pass required
- **High priority (A, B, H, I, J, L, Q):** 95% pass required
- **Medium priority (E, K, M, N, O, P):** 90% pass required
- **Any security failure (Module R):** Immediate blocker
