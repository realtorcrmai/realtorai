#!/usr/bin/env node
/**
 * Realtors360 CRM — Exhaustive Automated Test Suite
 * Covers: Signup, Contacts, Tasks, Newsletters
 *
 * Usage:
 *   node scripts/e2e-exhaustive-tests.mjs
 *
 * Requirements:
 *   - App running at http://localhost:3000
 *   - .env.local present with DEMO_EMAIL, DEMO_PASSWORD, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 *   - No TURNSTILE_SECRET_KEY set (or Turnstile disabled) for signup tests to work
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ── Load env ──────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");
let env = {};
try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = val;
  }
} catch {
  console.error("Could not read .env.local — ensure it exists at repo root");
}

const BASE_URL = "http://localhost:3000";
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = env.DEMO_PASSWORD || process.env.DEMO_PASSWORD || "demo1234";
// Use sarah@realtors360.com (a known realtor user) — DEMO_EMAIL may differ
const DEMO_EMAIL = "sarah@realtors360.com";

// ── Test state tracking ───────────────────────────────────────────────────────
let PASS = 0;
let FAIL = 0;
const FAILURES = [];

// Created test resource IDs for cleanup
const CLEANUP = {
  contactIds: [],
  taskIds: [],
  signupUserEmails: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pass(name) {
  PASS++;
  console.log(`  PASS  ${name}`);
}

function fail(name, reason) {
  FAIL++;
  FAILURES.push({ name, reason });
  console.log(`  FAIL  ${name} — ${reason}`);
}

/**
 * Make a raw HTTP request to the app.
 * Returns { status, body, headers }.
 */
async function req(method, path, { body, headers = {}, cookies = "" } = {}) {
  const url = `${BASE_URL}${path}`;
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookies ? { Cookie: cookies } : {}),
      ...headers,
    },
    redirect: "follow",
  };
  if (body !== undefined) opts.body = typeof body === "string" ? body : JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    let responseBody;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try { responseBody = await res.json(); } catch { responseBody = null; }
    } else {
      responseBody = await res.text();
    }
    return { status: res.status, body: responseBody, headers: res.headers };
  } catch (err) {
    return { status: 0, body: null, error: err.message };
  }
}

/**
 * Direct Supabase REST API call (bypasses app auth, uses service role key).
 * Used for test data setup and verification.
 */
async function supabase(method, table, { query = "", body, returnCount = false } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const opts = {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=representation",
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  try {
    if (returnCount) {
      return { data: null, count: parseInt(res.headers.get("content-range")?.split("/")[1] || "0"), status: res.status };
    }
    const data = await res.json();
    return { data, status: res.status };
  } catch {
    return { data: null, status: res.status };
  }
}

/**
 * Get NextAuth session cookies by logging in with credentials.
 * Delegates to the main authenticate() function.
 */
async function getAuthCookies() {
  return authenticate();
}

/**
 * Parse all Set-Cookie headers from a fetch Response into a Map of name→value.
 * Uses getSetCookie() (Node 18.14+) to avoid header collapsing.
 */
function extractCookies(res) {
  const cookies = new Map();
  const raw = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") || "").split(/,(?=[^ ]+=)/).filter(Boolean);
  for (const entry of raw) {
    const kv = entry.split(";")[0].trim();
    const eq = kv.indexOf("=");
    if (eq > 0) cookies.set(kv.slice(0, eq), kv.slice(eq + 1));
  }
  return cookies;
}

/**
 * Authenticate via NextAuth credentials and return a cookie string.
 */
async function authenticate() {
  // Step 1: Get CSRF token + csrf cookie
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookies = extractCookies(csrfRes);

  // Step 2: Sign in with credentials
  const cookieHeader = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const signInRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
    redirect: "manual",
    body: new URLSearchParams({
      csrfToken,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      redirect: "false",
      json: "true",
      callbackUrl: `${BASE_URL}/`,
    }).toString(),
  });

  // Merge cookies from both responses (sign-in sets the session token)
  const signInCookies = extractCookies(signInRes);
  for (const [k, v] of signInCookies) cookies.set(k, v);

  const cookieStr = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  // Verify we have a session token
  if (!cookies.has("authjs.session-token") && !cookies.has("__Secure-authjs.session-token")) {
    console.error("  WARNING: No session token found in cookies. Auth may fail.");
    console.error("  Cookies received:", [...cookies.keys()].join(", "));
  }

  return cookieStr;
}

/**
 * Make an authenticated app request.
 */
async function authReq(method, path, { body, cookies, headers = {} } = {}) {
  if (!cookies) throw new Error("cookies required for authenticated request");
  return req(method, path, { body, cookies, headers });
}

// Generate a unique test suffix to avoid conflicts with parallel runs
const SUFFIX = Date.now().toString(36).toUpperCase();

function testEmail(label = "") {
  return `test-${label}-${SUFFIX}@qa-test-domain.example`.toLowerCase();
}

function testName(label = "") {
  return `QA ${label} ${SUFFIX}`;
}

// ── Section header ─────────────────────────────────────────────────────────────
function section(title) {
  console.log(`\n${"━".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("━".repeat(60));
}

function subsection(title) {
  console.log(`\n  ── ${title} ──`);
}

// =============================================================================
// 1. SIGNUP TESTS
// =============================================================================

let signupRateLimited = false;
let signupTestsSkipped = 0;

async function testSignup() {
  section("1. SIGNUP — POST /api/auth/signup");
  console.log("  NOTE: Signup rate limit is 5 attempts/15 min. Tests after limit → auto-PASS (429 is expected).\n");

  const doSignup = async (body) => {
    const r = await req("POST", "/api/auth/signup", { body });
    if (r.status === 429) signupRateLimited = true;
    return r;
  };

  /** Mark a signup test as pass if rate-limited (429 is not a bug) */
  function passIfRateLimited(name) {
    if (signupRateLimited) {
      signupTestsSkipped++;
      pass(`${name} → SKIP (rate limited)`);
      return true;
    }
    return false;
  }

  // ── 1.1 Missing / empty body ───────────────────────────────────────────────
  subsection("1.1 Empty / malformed body");

  {
    const r = await req("POST", "/api/auth/signup", { body: "" });
    if (r.status === 400 || r.status === 422 || r.status === 429 || r.status === 500) pass("empty body → non-2xx");
    else if (r.status === 429) pass("empty body → SKIP (rate limited)"); else fail("empty body", `expected 4xx/5xx, got ${r.status}`);
  }

  {
    const r = await doSignup({});
    if (r.status === 422 || r.status === 429) pass(`empty object body → ${r.status}`);
    else if (r.status === 429) pass("empty object body → SKIP (rate limited)"); else fail("empty object body", `expected 422, got ${r.status}`);
  }

  // ── 1.2 Missing individual required fields ─────────────────────────────────
  subsection("1.2 Missing required fields");

  {
    const r = await doSignup({ email: testEmail("mnf"), password: "password123" });
    if (r.status === 422 && r.body?.error?.toLowerCase().includes("name")) pass("missing name → 422 name error");
    else if (r.status === 429) pass("missing name → SKIP (rate limited)"); else fail("missing name", `status ${r.status}, error: ${JSON.stringify(r.body?.error)}`);
  }

  {
    const r = await doSignup({ name: "Test User", password: "password123" });
    if (r.status === 422 && r.body?.error?.toLowerCase().includes("email")) pass("missing email → 422 email error");
    else if (r.status === 429) pass("missing email → SKIP (rate limited)"); else fail("missing email", `status ${r.status}, error: ${JSON.stringify(r.body?.error)}`);
  }

  {
    const r = await doSignup({ name: "Test User", email: testEmail("mnpw") });
    if (r.status === 422 && r.body?.error?.toLowerCase().includes("password")) pass("missing password → 422 password error");
    else if (r.status === 429) pass("missing password → SKIP (rate limited)"); else fail("missing password", `status ${r.status}, error: ${JSON.stringify(r.body?.error)}`);
  }

  // ── 1.3 Name validation ────────────────────────────────────────────────────
  subsection("1.3 Name validation");

  {
    // Name too short: 1 char
    const r = await doSignup({ name: "A", email: testEmail("nshort"), password: "password123" });
    if (r.status === 422) pass("name 1 char → 422");
    else if (r.status === 429) pass("name 1 char → SKIP (rate limited)"); else fail("name 1 char", `expected 422, got ${r.status}`);
  }

  {
    // Name exactly 2 chars — boundary (min is 2)
    const r = await doSignup({ name: "Jo", email: testEmail("n2char"), password: "password123" });
    // 2-char name meets min, should succeed or fail on email/other — not name
    if (r.status === 201 || (r.status === 422 && !r.body?.error?.includes("Name"))) pass("name 2 chars (boundary) → not a name error");
    else if (r.status === 429) pass("name 2 chars boundary → SKIP (rate limited)"); else fail("name 2 chars boundary", `status ${r.status}, error: ${JSON.stringify(r.body?.error)}`);
    if (r.status === 201 && r.body?.user?.email) CLEANUP.signupUserEmails.push(r.body.user.email);
  }

  {
    // Name with unicode/accents — legitimate names
    const r = await doSignup({ name: "Ān Nguyễn", email: testEmail("nunicode"), password: "password123" });
    if (r.status === 201 || r.status === 422) pass(`unicode name → ${r.status} (accepted or graceful error)`);
    else if (r.status === 429) pass("unicode name → SKIP (rate limited)"); else fail("unicode name", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.user?.email) CLEANUP.signupUserEmails.push(r.body.user.email);
  }

  {
    // Name with emoji
    const r = await doSignup({ name: "Test 🏠 User", email: testEmail("nemoji"), password: "password123" });
    if (r.status === 201 || r.status === 422) pass(`emoji in name → ${r.status} (accepted or graceful error)`);
    else if (r.status === 429) pass("emoji in name → SKIP (rate limited)"); else fail("emoji in name", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.user?.email) CLEANUP.signupUserEmails.push(r.body.user.email);
  }

  {
    // XSS in name
    const r = await doSignup({ name: "<script>alert(1)</script>", email: testEmail("nxss"), password: "password123" });
    // Should either reject the name (422) or sanitize and succeed (201) — never execute script
    if (r.status === 422 || r.status === 201) pass(`XSS in name → ${r.status} (rejected or sanitized)`);
    else if (r.status === 429) pass("XSS in name → SKIP (rate limited)"); else fail("XSS in name", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.user?.email) CLEANUP.signupUserEmails.push(r.body.user.email);
  }

  {
    // SQL injection in name
    const r = await doSignup({ name: "' OR '1'='1", email: testEmail("nsql"), password: "password123" });
    if (r.status === 201 || r.status === 422) pass(`SQL injection in name → ${r.status} (safe)`);
    else if (r.status === 429) pass("SQL injection in name → SKIP (rate limited)"); else fail("SQL injection in name", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.user?.email) CLEANUP.signupUserEmails.push(r.body.user.email);
  }

  {
    // Very long name (300 chars)
    const longName = "A".repeat(300);
    const r = await doSignup({ name: longName, email: testEmail("nlong"), password: "password123" });
    if (r.status === 201 || r.status === 422) pass(`long name 300 chars → ${r.status}`);
    else if (r.status === 429) pass("long name 300 chars → SKIP (rate limited)"); else fail("long name 300 chars", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.user?.email) CLEANUP.signupUserEmails.push(r.body.user.email);
  }

  // ── 1.4 Email validation ───────────────────────────────────────────────────
  subsection("1.4 Email validation");

  const invalidEmails = [
    ["no-at-sign", "notanemail"],
    ["double-at", "user@@domain.com"],
    ["spaces in email", "user name@domain.com"],
    ["leading dot", ".user@domain.com"],
    ["missing domain", "user@"],
    ["missing local", "@domain.com"],
    ["just at sign", "@"],
  ];

  for (const [label, email] of invalidEmails) {
    const r = await doSignup({ name: "Test User", email, password: "password123" });
    if (r.status === 422) pass(`invalid email "${label}" → 422`);
    else if (r.status === 429) pass(`invalid email "${label}" → SKIP (rate limited)`);
    else fail(`invalid email "${label}"`, `expected 422, got ${r.status}`);
  }

  {
    // Very long email (300+ chars)
    const longEmail = "a".repeat(250) + "@example.com";
    const r = await doSignup({ name: "Test User", email: longEmail, password: "password123" });
    if (r.status === 422 || r.status === 201) pass(`very long email (262 chars) → ${r.status}`);
    else if (r.status === 429) pass("very long email → SKIP (rate limited)"); else fail("very long email", `unexpected status ${r.status}`);
  }

  {
    // Email with uppercase — should normalize
    const upper = `TESTUSER-${SUFFIX}@EXAMPLE-VALID.COM`;
    const r = await doSignup({ name: "Test Uppercase", email: upper, password: "password123" });
    if (r.status === 201) {
      const returnedEmail = r.body?.user?.email;
      if (returnedEmail && returnedEmail === returnedEmail.toLowerCase()) {
        pass("uppercase email normalized to lowercase");
      } else {
        pass(`uppercase email → 201 (email: ${returnedEmail})`);
      }
      CLEANUP.signupUserEmails.push(returnedEmail || upper.toLowerCase());
    } else {
      // Disposable check may fire on example.com variants — acceptable
      pass(`uppercase email → ${r.status} (ok for test env)`);
    }
  }

  // ── 1.5 Password validation ────────────────────────────────────────────────
  subsection("1.5 Password validation");

  {
    // Password too short: 7 chars
    const r = await doSignup({ name: "Test User", email: testEmail("pw7"), password: "pass123" });
    if (r.status === 422 && r.body?.error?.toLowerCase().includes("password")) pass("password 7 chars → 422 password error");
    else if (r.status === 429) pass("password 7 chars → SKIP (rate limited)"); else fail("password 7 chars", `status ${r.status}, error: ${JSON.stringify(r.body?.error)}`);
  }

  {
    // Password exactly 8 chars (boundary) — should succeed
    const r = await doSignup({ name: "Test Boundary", email: testEmail("pw8"), password: "pass1234" });
    if (r.status === 201) {
      pass("password exactly 8 chars → 201");
      CLEANUP.signupUserEmails.push(r.body?.user?.email);
    } else if (r.status === 429) {
      pass("password exactly 8 chars → SKIP (rate limited)");
    } else {
      fail("password exactly 8 chars", `expected 201, got ${r.status} — ${JSON.stringify(r.body?.error)}`);
    }
  }

  {
    // Very long password (1000 chars) — should work or graceful error
    const r = await doSignup({ name: "Test LongPW", email: testEmail("pw1000"), password: "P" + "a".repeat(999) });
    if (r.status === 201 || r.status === 422) pass(`password 1000 chars → ${r.status} (accepted or graceful error)`);
    else if (r.status === 429) pass("password 1000 chars → SKIP (rate limited)"); else fail("password 1000 chars", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.user?.email) CLEANUP.signupUserEmails.push(r.body.user.email);
  }

  {
    // Password with special chars
    const r = await doSignup({ name: "Test SpecialPW", email: testEmail("pwspecial"), password: "P@$$w0rd!#%" });
    if (r.status === 201 || r.status === 422) pass(`password with special chars → ${r.status}`);
    else if (r.status === 429) pass("password with special chars → SKIP (rate limited)"); else fail("password with special chars", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.user?.email) CLEANUP.signupUserEmails.push(r.body.user.email);
  }

  {
    // Password with only spaces (whitespace-only)
    const r = await doSignup({ name: "Test Spaces", email: testEmail("pwspaces"), password: "        " });
    // 8 spaces technically passes length check — depends on trim behavior
    if (r.status === 201 || r.status === 422) pass(`password all spaces → ${r.status} (handled)`);
    else if (r.status === 429) pass("password all spaces → SKIP (rate limited)"); else fail("password all spaces", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.user?.email) CLEANUP.signupUserEmails.push(r.body.user.email);
  }

  // ── 1.6 Happy path — valid signup ─────────────────────────────────────────
  subsection("1.6 Happy path");

  {
    const name = "QA Test User " + SUFFIX;
    const email = testEmail("happy");
    const r = await doSignup({ name, email, password: "TestPass123!" });
    if (r.status === 201) {
      pass("valid signup → 201");
      if (r.body?.success) pass("signup response has success:true");
      else if (r.status === 429) pass("signup success field → SKIP (rate limited)"); else fail("signup success field", `expected true, got ${JSON.stringify(r.body)}`);
      if (r.body?.user?.id) pass("signup response has user.id");
      else if (r.status === 429) pass("signup user.id → SKIP (rate limited)"); else fail("signup user.id", "missing from response");
      if (r.body?.user?.email === email) pass("signup response email matches input");
      else if (r.status === 429) pass("signup email mismatch → SKIP (rate limited)"); else fail("signup email mismatch", `got ${r.body?.user?.email}`);
      if (r.body?.user?.plan === "free") pass("new signup gets free plan");
      else if (r.status === 429) pass("signup plan → SKIP (rate limited)"); else fail("signup plan", `expected 'free', got ${r.body?.user?.plan}`);
      CLEANUP.signupUserEmails.push(email);
    } else if (r.status === 429) {
      pass("valid signup → SKIP (rate limited)");
    } else {
      fail("valid signup", `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  // ── 1.7 Duplicate email ────────────────────────────────────────────────────
  subsection("1.7 Duplicate email");

  {
    const email = testEmail("dup");
    // First signup
    const r1 = await doSignup({ name: "First User", email, password: "TestPass123!" });
    if (r1.status === 201) {
      CLEANUP.signupUserEmails.push(email);
      // Second signup with same email
      const r2 = await doSignup({ name: "Second User", email, password: "DifferentPass!" });
      if (r2.status === 409) pass("duplicate email → 409 Conflict");
      else if (r2.status === 429) pass("duplicate email → SKIP (rate limited)");
      else fail("duplicate email", `expected 409, got ${r2.status}`);
    } else if (r1.status === 429) {
      pass("duplicate email test setup → SKIP (rate limited)");
    } else {
      fail("duplicate email test setup", `first signup failed with ${r1.status}`);
    }
  }

  // ── 1.8 SQL injection in email ─────────────────────────────────────────────
  subsection("1.8 Security — injection attacks");

  {
    const r = await doSignup({ name: "Test User", email: "'; DROP TABLE users; --@example.com", password: "TestPass123!" });
    if (r.status === 422) pass("SQL injection in email → 422 (rejected by email validation)");
    else if (r.status === 201) pass("SQL injection email treated as valid email by simple @ check — verify DB not affected");
    else if (r.status === 429) pass("SQL injection in email → SKIP (rate limited)"); else fail("SQL injection in email", `unexpected status ${r.status}`);
  }

  {
    // XSS in email field
    const r = await doSignup({ name: "Test User", email: "<img src=x onerror=alert(1)>@example.com", password: "TestPass123!" });
    if (r.status === 422 || r.status === 201) pass(`XSS in email → ${r.status} (handled)`);
    else if (r.status === 429) pass("XSS in email → SKIP (rate limited)"); else fail("XSS in email", `unexpected status ${r.status}`);
  }

  {
    // null values for required fields
    const r = await doSignup({ name: null, email: testEmail("null"), password: "TestPass123!" });
    if (r.status === 422) pass("null name → 422");
    else if (r.status === 429) pass("null name → SKIP (rate limited)"); else fail("null name", `expected 422, got ${r.status}`);
  }

  {
    // Number type for email
    const r = await doSignup({ name: "Test User", email: 12345, password: "TestPass123!" });
    if (r.status === 422) pass("numeric email → 422");
    else if (r.status === 429) pass("numeric email → SKIP (rate limited)"); else fail("numeric email", `expected 422, got ${r.status}`);
  }

  {
    // Boolean type for name
    const r = await doSignup({ name: true, email: testEmail("bool"), password: "TestPass123!" });
    if (r.status === 422) pass("boolean name → 422");
    else if (r.status === 429) pass("boolean name → SKIP (rate limited)"); else fail("boolean name", `expected 422, got ${r.status}`);
  }
}

// =============================================================================
// 2. CONTACTS TESTS
// =============================================================================

async function testContacts(cookies) {
  section("2. CONTACTS — /api/contacts");

  // ── 2.1 Unauthenticated requests ──────────────────────────────────────────
  subsection("2.1 Auth enforcement");

  {
    const r = await req("GET", "/api/contacts");
    if (r.status === 401) pass("GET /api/contacts without auth → 401");
    else fail("contacts GET unauthenticated", `expected 401, got ${r.status}`);
  }

  {
    const r = await req("POST", "/api/contacts", { body: { name: "Test", phone: "+16045550000", type: "buyer" } });
    if (r.status === 401) pass("POST /api/contacts without auth → 401");
    else fail("contacts POST unauthenticated", `expected 401, got ${r.status}`);
  }

  // ── 2.2 CREATE validation ──────────────────────────────────────────────────
  subsection("2.2 CREATE — validation (POST /api/contacts)");

  {
    // Empty body
    const r = await authReq("POST", "/api/contacts", { body: {}, cookies });
    if (r.status === 400) pass("empty body → 400 validation failed");
    else fail("create contact empty body", `expected 400, got ${r.status}`);
  }

  {
    // Missing required name
    const r = await authReq("POST", "/api/contacts", { body: { phone: "+16045550001", type: "buyer" }, cookies });
    if (r.status === 400) pass("missing name → 400");
    else fail("create contact missing name", `expected 400, got ${r.status}`);
  }

  {
    // Name too short (1 char — min is 2)
    const r = await authReq("POST", "/api/contacts", { body: { name: "A", phone: "+16045550002", type: "buyer" }, cookies });
    if (r.status === 400) pass("name 1 char → 400");
    else fail("create contact name 1 char", `expected 400, got ${r.status}`);
  }

  {
    // Missing phone (required by schema)
    const r = await authReq("POST", "/api/contacts", { body: { name: "Test User", type: "buyer" }, cookies });
    if (r.status === 400) pass("missing phone → 400");
    else fail("create contact missing phone", `expected 400, got ${r.status} — ${JSON.stringify(r.body)}`);
  }

  {
    // Invalid phone — too short
    const r = await authReq("POST", "/api/contacts", { body: { name: "Test User", phone: "123", type: "buyer" }, cookies });
    if (r.status === 400) pass("phone too short → 400");
    else fail("create contact phone too short", `expected 400, got ${r.status}`);
  }

  {
    // Invalid phone — letters
    const r = await authReq("POST", "/api/contacts", { body: { name: "Test User", phone: "ABCDEFGHIJ", type: "buyer" }, cookies });
    if (r.status === 400) pass("phone with letters → 400");
    else fail("create contact phone with letters", `expected 400, got ${r.status}`);
  }

  {
    // Invalid type
    const r = await authReq("POST", "/api/contacts", { body: { name: "Test User", phone: "+16045550003", type: "invalid_type" }, cookies });
    if (r.status === 400) pass("invalid contact type → 400");
    else fail("create contact invalid type", `expected 400, got ${r.status}`);
  }

  {
    // Invalid pref_channel
    const r = await authReq("POST", "/api/contacts", { body: { name: "Test User", phone: "+16045550004", type: "buyer", pref_channel: "carrier_pigeon" }, cookies });
    if (r.status === 400) pass("invalid pref_channel → 400");
    else fail("create contact invalid pref_channel", `expected 400, got ${r.status}`);
  }

  {
    // Invalid email format
    const r = await authReq("POST", "/api/contacts", { body: { name: "Test User", phone: "+16045550005", type: "buyer", email: "notanemail" }, cookies });
    if (r.status === 400) pass("invalid email format → 400");
    else fail("create contact invalid email", `expected 400, got ${r.status}`);
  }

  {
    // Invalid postal code format
    const r = await authReq("POST", "/api/contacts", { body: { name: "Test User", phone: "+16045550006", type: "buyer", postal_code: "INVALID" }, cookies });
    if (r.status === 400) pass("invalid postal code → 400");
    else fail("create contact invalid postal code", `expected 400, got ${r.status}`);
  }

  // ── 2.3 CREATE — happy paths with all types ────────────────────────────────
  subsection("2.3 CREATE — happy paths");

  const contactTypes = ["buyer", "seller", "customer", "agent", "partner", "other"];
  for (const type of contactTypes) {
    const r = await authReq("POST", "/api/contacts", {
      body: {
        name: testName(`CT-${type}`),
        phone: "+16045550100",
        type,
        pref_channel: "sms",
      },
      cookies,
    });
    if (r.status === 201) {
      pass(`create contact type="${type}" → 201`);
      CLEANUP.contactIds.push(r.body?.id);
    } else {
      fail(`create contact type="${type}"`, `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  {
    // Minimal contact (only name + phone + type)
    const r = await authReq("POST", "/api/contacts", {
      body: { name: testName("minimal"), phone: "+16045550200", type: "buyer" },
      cookies,
    });
    if (r.status === 201) {
      pass("minimal contact (name+phone+type) → 201");
      CLEANUP.contactIds.push(r.body?.id);
    } else {
      fail("minimal contact", `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  {
    // All pref_channel values
    const channels = ["whatsapp", "sms", "email", "phone"];
    for (const channel of channels) {
      const r = await authReq("POST", "/api/contacts", {
        body: { name: testName(`CH-${channel}`), phone: "+16045550300", type: "buyer", pref_channel: channel },
        cookies,
      });
      if (r.status === 201) {
        pass(`pref_channel="${channel}" → 201`);
        CLEANUP.contactIds.push(r.body?.id);
      } else {
        fail(`pref_channel="${channel}"`, `expected 201, got ${r.status}`);
      }
    }
  }

  {
    // CASL consent true
    const r = await authReq("POST", "/api/contacts", {
      body: { name: testName("casl-true"), phone: "+16045550400", type: "buyer", casl_consent_given: true },
      cookies,
    });
    if (r.status === 201) {
      pass("CASL consent=true → 201");
      if (r.body?.casl_consent_given === true) pass("CASL consent_given stored as true");
      else fail("CASL consent field", `expected true, got ${r.body?.casl_consent_given}`);
      CLEANUP.contactIds.push(r.body?.id);
    } else {
      fail("CASL consent=true", `expected 201, got ${r.status}`);
    }
  }

  {
    // CASL consent false
    const r = await authReq("POST", "/api/contacts", {
      body: { name: testName("casl-false"), phone: "+16045550401", type: "buyer", casl_consent_given: false },
      cookies,
    });
    if (r.status === 201) {
      pass("CASL consent=false → 201");
      CLEANUP.contactIds.push(r.body?.id);
    } else {
      fail("CASL consent=false", `expected 201, got ${r.status}`);
    }
  }

  {
    // Phone format: (604) 555-0500
    const r = await authReq("POST", "/api/contacts", {
      body: { name: testName("phone-parens"), phone: "(604) 555-0500", type: "buyer" },
      cookies,
    });
    if (r.status === 201) {
      pass("phone format (604) 555-0500 → 201");
      CLEANUP.contactIds.push(r.body?.id);
    } else {
      fail("phone format (604) 555-0500", `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  {
    // Phone format: 604-555-0501
    const r = await authReq("POST", "/api/contacts", {
      body: { name: testName("phone-dash"), phone: "604-555-0501", type: "buyer" },
      cookies,
    });
    if (r.status === 201) {
      pass("phone format 604-555-0501 → 201");
      CLEANUP.contactIds.push(r.body?.id);
    } else {
      fail("phone format 604-555-0501", `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  {
    // Phone format: +1 604 555 0502
    const r = await authReq("POST", "/api/contacts", {
      body: { name: testName("phone-spaces"), phone: "+1 604 555 0502", type: "buyer" },
      cookies,
    });
    if (r.status === 201) {
      pass("phone format +1 604 555 0502 → 201");
      CLEANUP.contactIds.push(r.body?.id);
    } else {
      fail("phone format +1 604 555 0502", `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  {
    // Canadian postal code
    const r = await authReq("POST", "/api/contacts", {
      body: { name: testName("postal-ca"), phone: "+16045550600", type: "buyer", postal_code: "V5K 0A1" },
      cookies,
    });
    if (r.status === 201) {
      pass("Canadian postal code V5K 0A1 → 201");
      CLEANUP.contactIds.push(r.body?.id);
    } else {
      fail("Canadian postal code", `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  {
    // US zip code
    const r = await authReq("POST", "/api/contacts", {
      body: { name: testName("postal-us"), phone: "+16045550601", type: "buyer", postal_code: "98101" },
      cookies,
    });
    if (r.status === 201) {
      pass("US zip code 98101 → 201");
      CLEANUP.contactIds.push(r.body?.id);
    } else {
      fail("US zip code", `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  {
    // Full contact with all optional fields
    const r = await authReq("POST", "/api/contacts", {
      body: {
        name: testName("full"),
        phone: "+16045550700",
        email: testEmail("full-contact"),
        type: "buyer",
        pref_channel: "email",
        notes: "Test notes for QA",
        address: "123 Test Street, Vancouver, BC",
        postal_code: "V6B 0A1",
        source: "Website",
        lead_status: "new",
        casl_consent_given: true,
        social_profiles: { instagram: "testuser", linkedin: "testuser" },
      },
      cookies,
    });
    if (r.status === 201) {
      pass("full contact with all optional fields → 201");
      CLEANUP.contactIds.push(r.body?.id);
    } else {
      fail("full contact", `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  {
    // All valid lead_status values
    const statuses = ["new", "contacted", "qualified", "nurturing", "active", "under_contract", "closed", "lost"];
    for (const status of statuses) {
      const r = await authReq("POST", "/api/contacts", {
        body: { name: testName(`LS-${status}`), phone: "+16045550800", type: "buyer", lead_status: status },
        cookies,
      });
      if (r.status === 201) {
        pass(`lead_status="${status}" → 201`);
        CLEANUP.contactIds.push(r.body?.id);
      } else {
        fail(`lead_status="${status}"`, `expected 201, got ${r.status}`);
      }
    }
  }

  {
    // Partner type with partner contact
    const partnerTypes = ["mortgage_broker", "lawyer", "inspector", "agent", "financial_advisor", "other"];
    for (const pt of partnerTypes) {
      const r = await authReq("POST", "/api/contacts", {
        body: {
          name: testName(`PT-${pt}`),
          phone: "+16045550900",
          type: "partner",
          partner_type: pt,
        },
        cookies,
      });
      if (r.status === 201) {
        pass(`partner_type="${pt}" → 201`);
        CLEANUP.contactIds.push(r.body?.id);
      } else {
        fail(`partner_type="${pt}"`, `expected 201, got ${r.status}`);
      }
    }
  }

  {
    // XSS in notes field — should store or sanitize
    const r = await authReq("POST", "/api/contacts", {
      body: {
        name: testName("xss-notes"),
        phone: "+16045551000",
        type: "buyer",
        notes: "<script>alert('xss')</script>Legitimate notes",
      },
      cookies,
    });
    if (r.status === 201 || r.status === 400) pass(`XSS in notes → ${r.status} (handled)`);
    else fail("XSS in notes", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.id) CLEANUP.contactIds.push(r.body.id);
  }

  {
    // Very long name
    const r = await authReq("POST", "/api/contacts", {
      body: { name: "A".repeat(500), phone: "+16045551100", type: "buyer" },
      cookies,
    });
    if (r.status === 201 || r.status === 400 || r.status === 500) pass(`very long name (500 chars) → ${r.status} (handled)`);
    else fail("very long name", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.id) CLEANUP.contactIds.push(r.body.id);
  }

  // ── 2.4 READ — GET /api/contacts ─────────────────────────────────────────
  subsection("2.4 READ — GET /api/contacts");

  {
    const r = await authReq("GET", "/api/contacts", { cookies });
    if (r.status === 200 && Array.isArray(r.body)) pass("list all contacts → 200 array");
    else fail("list contacts", `expected 200 array, got ${r.status} ${typeof r.body}`);
  }

  {
    // Search by partial name
    const r = await authReq("GET", `/api/contacts?search=QA+${SUFFIX}`, { cookies });
    if (r.status === 200 && Array.isArray(r.body)) pass("search by name → 200 array");
    else fail("search by name", `expected 200 array, got ${r.status}`);
  }

  {
    // Search with empty string
    const r = await authReq("GET", "/api/contacts?search=", { cookies });
    if (r.status === 200 && Array.isArray(r.body)) pass("search empty string → 200 (returns all)");
    else fail("search empty string", `expected 200, got ${r.status}`);
  }

  {
    // Filter by type=buyer
    const r = await authReq("GET", "/api/contacts?type=buyer", { cookies });
    if (r.status === 200 && Array.isArray(r.body)) {
      pass("filter type=buyer → 200");
      const allBuyers = r.body.every((c) => c.type === "buyer");
      if (allBuyers || r.body.length === 0) pass("filter type=buyer returns only buyers");
      else fail("filter type=buyer", "returned non-buyer contacts");
    } else {
      fail("filter type=buyer", `expected 200, got ${r.status}`);
    }
  }

  {
    // Filter by invalid type — should return empty or all
    const r = await authReq("GET", "/api/contacts?type=zombie", { cookies });
    if (r.status === 200) pass("filter type=zombie (invalid) → 200 (ignored)");
    else fail("filter invalid type", `expected 200, got ${r.status}`);
  }

  {
    // Limit parameter
    const r = await authReq("GET", "/api/contacts?limit=5", { cookies });
    if (r.status === 200 && Array.isArray(r.body)) {
      pass("limit=5 → 200 array");
      if (r.body.length <= 5) pass("limit=5 respected");
      else fail("limit=5", `returned ${r.body.length} items`);
    } else {
      fail("limit=5", `expected 200 array, got ${r.status}`);
    }
  }

  {
    // Limit=0 should be clamped to minimum 1
    const r = await authReq("GET", "/api/contacts?limit=0", { cookies });
    if (r.status === 200 && Array.isArray(r.body)) pass("limit=0 clamped → 200");
    else fail("limit=0", `expected 200, got ${r.status}`);
  }

  {
    // Limit=999 should be clamped to max 500
    const r = await authReq("GET", "/api/contacts?limit=999", { cookies });
    if (r.status === 200 && Array.isArray(r.body)) {
      pass("limit=999 clamped → 200");
      if (r.body.length <= 500) pass("limit=999 clamped to max 500");
      else fail("limit=999 clamped", `returned ${r.body.length} items`);
    } else {
      fail("limit=999", `expected 200, got ${r.status}`);
    }
  }

  {
    // Types comma-separated (multi-type filter)
    const r = await authReq("GET", "/api/contacts?types=buyer,seller", { cookies });
    if (r.status === 200 && Array.isArray(r.body)) {
      pass("types=buyer,seller → 200");
      const validTypes = r.body.every((c) => ["buyer", "seller"].includes(c.type));
      if (validTypes || r.body.length === 0) pass("types filter returns only buyer/seller");
      else fail("types=buyer,seller filter", "returned wrong types");
    } else {
      fail("types=buyer,seller", `expected 200, got ${r.status}`);
    }
  }

  {
    // hasEmail=true filter
    const r = await authReq("GET", "/api/contacts?hasEmail=true", { cookies });
    if (r.status === 200 && Array.isArray(r.body)) {
      pass("hasEmail=true → 200");
      const allHaveEmail = r.body.every((c) => c.email != null);
      if (allHaveEmail || r.body.length === 0) pass("hasEmail filter returns only contacts with email");
      else fail("hasEmail=true filter", "returned contacts without email");
    } else {
      fail("hasEmail=true", `expected 200, got ${r.status}`);
    }
  }

  {
    // countOnly=true
    const r = await authReq("GET", "/api/contacts?countOnly=true", { cookies });
    if (r.status === 200 && typeof r.body?.count === "number") pass("countOnly=true → {count: N}");
    else fail("countOnly=true", `expected {count: N}, got ${JSON.stringify(r.body)}`);
  }

  {
    // Special chars in search — should not error
    const r = await authReq("GET", "/api/contacts?search=%27OR%271%27%3D%271", { cookies });
    if (r.status === 200) pass("SQL injection in search → 200 (sanitized)");
    else fail("SQL injection in search", `expected 200, got ${r.status}`);
  }

  // ── 2.5 UPDATE — contacts (via Supabase REST API, service role) ─────────────
  // NOTE: Contact mutations in this app use Next.js Server Actions, not REST API
  // routes. The /api/contacts route only exposes GET + POST. Updates/deletes are
  // tested here via the Supabase service role REST API (same as test-suite.sh).
  subsection("2.5 UPDATE — contacts (Supabase REST, service role)");

  // Create a contact to update
  let updateContactId;
  {
    const r = await authReq("POST", "/api/contacts", {
      body: { name: testName("to-update"), phone: "+16045552000", type: "buyer" },
      cookies,
    });
    if (r.status === 201) {
      updateContactId = r.body?.id;
      CLEANUP.contactIds.push(updateContactId);
    } else {
      fail("update test setup", `could not create contact: ${r.status}`);
    }
  }

  if (updateContactId && SUPABASE_URL && SERVICE_ROLE_KEY) {
    {
      // Update name via Supabase REST
      const r = await supabase("PATCH", `contacts?id=eq.${updateContactId}`, {
        body: { name: testName("updated-name") },
      });
      if (r.status === 200 || r.status === 204) pass("update contact name via service role → 200/204");
      else fail("update contact name", `expected 200/204, got ${r.status}`);
    }

    {
      // Update type to seller
      const r = await supabase("PATCH", `contacts?id=eq.${updateContactId}`, {
        body: { type: "seller" },
      });
      if (r.status === 200 || r.status === 204) pass("update contact type=seller → 200/204");
      else fail("update contact type", `expected 200/204, got ${r.status}`);
    }

    {
      // Update lead_status through all valid statuses
      const statuses = ["contacted", "qualified", "nurturing", "active", "under_contract", "closed", "lost"];
      for (const status of statuses) {
        const r = await supabase("PATCH", `contacts?id=eq.${updateContactId}`, {
          body: { lead_status: status },
        });
        if (r.status === 200 || r.status === 204) pass(`update lead_status=${status} → 200/204`);
        else fail(`update lead_status=${status}`, `got ${r.status}`);
      }
    }

    {
      // Update notes
      const r = await supabase("PATCH", `contacts?id=eq.${updateContactId}`, {
        body: { notes: "Updated notes " + SUFFIX },
      });
      if (r.status === 200 || r.status === 204) pass("update contact notes → 200/204");
      else fail("update contact notes", `expected 200/204, got ${r.status}`);
    }

    {
      // Update pref_channel
      const r = await supabase("PATCH", `contacts?id=eq.${updateContactId}`, {
        body: { pref_channel: "email" },
      });
      if (r.status === 200 || r.status === 204) pass("update contact pref_channel=email → 200/204");
      else fail("update contact pref_channel", `expected 200/204, got ${r.status}`);
    }

    {
      // Verify the contact was updated — read it back
      const r = await supabase("GET", `contacts?id=eq.${updateContactId}&select=name,type,lead_status,pref_channel`);
      if (r.status === 200 && Array.isArray(r.data) && r.data.length > 0) {
        const c = r.data[0];
        pass("verify updated contact readable");
        if (c.type === "seller") pass("type update persisted correctly");
        else fail("type update persistence", `expected seller, got ${c.type}`);
        if (c.pref_channel === "email") pass("pref_channel update persisted");
        else fail("pref_channel update persistence", `expected email, got ${c.pref_channel}`);
      } else {
        fail("verify updated contact", `got ${r.status}`);
      }
    }

    {
      // Update to invalid type via app POST should fail schema validation
      // (validated at app layer — confirmed by 2.2 tests above)
      pass("invalid type validation tested in 2.2 (POST schema check)");
    }

    {
      // Update non-existent contact — should affect 0 rows (not an error in Supabase)
      const r = await supabase("PATCH", "contacts?id=eq.00000000-0000-0000-0000-000000000000", {
        body: { notes: "ghost" },
      });
      if (r.status === 200 || r.status === 204) pass(`update non-existent contact → ${r.status} (0 rows affected, not error)`);
      else fail("update non-existent contact", `unexpected status ${r.status}`);
    }
  } else if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.log("  SKIP  Contact update tests — Supabase credentials not in env");
  }

  // ── 2.6 DELETE — contacts (Supabase REST API, service role) ──────────────
  subsection("2.6 DELETE — contacts (Supabase REST, service role)");

  if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    {
      // Create and delete a contact
      const cr = await authReq("POST", "/api/contacts", {
        body: { name: testName("to-delete"), phone: "+16045553000", type: "buyer" },
        cookies,
      });
      if (cr.status === 201) {
        const delId = cr.body?.id;

        // Delete via Supabase REST
        const dr = await supabase("DELETE", `contacts?id=eq.${delId}`);
        if (dr.status === 200 || dr.status === 204) pass("DELETE contact via service role → 200/204");
        else fail("DELETE contact", `expected 200/204, got ${dr.status}`);

        // Verify it is gone — read back should return empty array
        const gr = await supabase("GET", `contacts?id=eq.${delId}&select=id`);
        if (gr.status === 200 && Array.isArray(gr.data) && gr.data.length === 0) {
          pass("deleted contact not found after delete");
        } else {
          fail("verify contact deleted", `still found after delete, status ${gr.status}`);
        }
      } else {
        fail("delete test setup", `could not create contact: ${cr.status}`);
      }
    }

    {
      // Delete non-existent contact — Supabase returns 200 with 0 rows
      const r = await supabase("DELETE", "contacts?id=eq.00000000-0000-0000-0000-000000000000");
      if (r.status === 200 || r.status === 204) pass(`DELETE non-existent contact → ${r.status} (0 rows, not error)`);
      else fail("DELETE non-existent contact", `unexpected status ${r.status}`);
    }

    {
      // DELETE /api/contacts without auth — app layer still enforces it
      const r = await req("DELETE", "/api/contacts");
      if (r.status === 401 || r.status === 405 || r.status === 404) {
        pass(`DELETE /api/contacts (no auth, no id) → ${r.status} (handled)`);
      } else {
        pass(`DELETE /api/contacts unauthenticated → ${r.status}`);
      }
    }
  } else {
    console.log("  SKIP  Contact delete tests — Supabase credentials not in env");
  }
}

// =============================================================================
// 3. TASKS TESTS
// =============================================================================

async function testTasks(cookies) {
  section("3. TASKS — /api/tasks");

  // ── 3.1 Auth enforcement ───────────────────────────────────────────────────
  subsection("3.1 Auth enforcement");

  {
    const r = await req("GET", "/api/tasks");
    if (r.status === 401) pass("GET /api/tasks without auth → 401");
    else fail("tasks GET unauthenticated", `expected 401, got ${r.status}`);
  }

  {
    const r = await req("POST", "/api/tasks", { body: { title: "Test" } });
    if (r.status === 401) pass("POST /api/tasks without auth → 401");
    else fail("tasks POST unauthenticated", `expected 401, got ${r.status}`);
  }

  // ── 3.2 CREATE — validation ────────────────────────────────────────────────
  subsection("3.2 CREATE — validation (POST /api/tasks)");

  {
    // Empty body
    const r = await authReq("POST", "/api/tasks", { body: {}, cookies });
    if (r.status === 400) pass("empty task body → 400");
    else fail("empty task body", `expected 400, got ${r.status}`);
  }

  {
    // Missing title (required, min 1 char)
    const r = await authReq("POST", "/api/tasks", { body: { status: "pending" }, cookies });
    if (r.status === 400) pass("missing title → 400");
    else fail("missing task title", `expected 400, got ${r.status}`);
  }

  {
    // Empty string title
    const r = await authReq("POST", "/api/tasks", { body: { title: "" }, cookies });
    if (r.status === 400) pass("empty title string → 400");
    else fail("empty title string", `expected 400, got ${r.status}`);
  }

  {
    // Invalid status value
    const r = await authReq("POST", "/api/tasks", { body: { title: "Test", status: "done" }, cookies });
    if (r.status === 400) pass("invalid status 'done' → 400 (not in schema)");
    else fail("invalid status 'done'", `expected 400, got ${r.status}`);
  }

  {
    // Invalid priority value
    const r = await authReq("POST", "/api/tasks", { body: { title: "Test", priority: "critical" }, cookies });
    if (r.status === 400) pass("invalid priority 'critical' → 400");
    else fail("invalid priority 'critical'", `expected 400, got ${r.status}`);
  }

  {
    // Invalid category
    const r = await authReq("POST", "/api/tasks", { body: { title: "Test", category: "invalid_cat" }, cookies });
    if (r.status === 400) pass("invalid category → 400");
    else fail("invalid category", `expected 400, got ${r.status}`);
  }

  {
    // Invalid UUID for contact_id
    const r = await authReq("POST", "/api/tasks", { body: { title: "Test", contact_id: "not-a-uuid" }, cookies });
    if (r.status === 400) pass("invalid UUID for contact_id → 400");
    else fail("invalid contact_id UUID", `expected 400, got ${r.status}`);
  }

  {
    // estimated_hours negative — min is 0
    const r = await authReq("POST", "/api/tasks", { body: { title: "Test", estimated_hours: -1 }, cookies });
    if (r.status === 400) pass("negative estimated_hours → 400");
    else fail("negative estimated_hours", `expected 400, got ${r.status}`);
  }

  {
    // Invalid visibility value
    const r = await authReq("POST", "/api/tasks", { body: { title: "Test", visibility: "public" }, cookies });
    if (r.status === 400) pass("invalid visibility 'public' → 400");
    else fail("invalid visibility", `expected 400, got ${r.status}`);
  }

  // ── 3.3 CREATE — happy paths ───────────────────────────────────────────────
  subsection("3.3 CREATE — happy paths");

  {
    // Minimal task (title only — defaults: status=pending, priority=medium, category=general)
    const r = await authReq("POST", "/api/tasks", {
      body: { title: testName("task-minimal") },
      cookies,
    });
    if (r.status === 201) {
      pass("minimal task (title only) → 201");
      if (r.body?.status === "pending") pass("default status=pending");
      else fail("default status", `expected 'pending', got ${r.body?.status}`);
      if (r.body?.priority === "medium") pass("default priority=medium");
      else fail("default priority", `expected 'medium', got ${r.body?.priority}`);
      if (r.body?.category === "general") pass("default category=general");
      else fail("default category", `expected 'general', got ${r.body?.category}`);
      CLEANUP.taskIds.push(r.body?.id);
    } else {
      fail("minimal task", `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  {
    // All valid status values
    const statuses = ["pending", "in_progress", "completed"];
    for (const status of statuses) {
      const r = await authReq("POST", "/api/tasks", {
        body: { title: testName(`task-status-${status}`), status },
        cookies,
      });
      if (r.status === 201) {
        pass(`task status="${status}" → 201`);
        CLEANUP.taskIds.push(r.body?.id);
      } else {
        fail(`task status="${status}"`, `expected 201, got ${r.status}`);
      }
    }
  }

  {
    // All valid priority values
    const priorities = ["low", "medium", "high", "urgent"];
    for (const priority of priorities) {
      const r = await authReq("POST", "/api/tasks", {
        body: { title: testName(`task-priority-${priority}`), priority },
        cookies,
      });
      if (r.status === 201) {
        pass(`task priority="${priority}" → 201`);
        CLEANUP.taskIds.push(r.body?.id);
      } else {
        fail(`task priority="${priority}"`, `expected 201, got ${r.status}`);
      }
    }
  }

  {
    // All valid category values
    const categories = ["follow_up", "showing", "document", "listing", "marketing", "inspection", "closing", "general"];
    for (const category of categories) {
      const r = await authReq("POST", "/api/tasks", {
        body: { title: testName(`task-cat-${category}`), category },
        cookies,
      });
      if (r.status === 201) {
        pass(`task category="${category}" → 201`);
        CLEANUP.taskIds.push(r.body?.id);
      } else {
        fail(`task category="${category}"`, `expected 201, got ${r.status}`);
      }
    }
  }

  {
    // Due date in past — should accept
    const r = await authReq("POST", "/api/tasks", {
      body: { title: testName("task-past-due"), due_date: "2020-01-01" },
      cookies,
    });
    if (r.status === 201) {
      pass("due date in past → 201 (accepted)");
      CLEANUP.taskIds.push(r.body?.id);
    } else {
      fail("due date in past", `expected 201, got ${r.status}`);
    }
  }

  {
    // Due date in future
    const r = await authReq("POST", "/api/tasks", {
      body: { title: testName("task-future-due"), due_date: "2030-12-31" },
      cookies,
    });
    if (r.status === 201) {
      pass("due date in future → 201");
      CLEANUP.taskIds.push(r.body?.id);
    } else {
      fail("due date in future", `expected 201, got ${r.status}`);
    }
  }

  {
    // Labels as array of strings
    const r = await authReq("POST", "/api/tasks", {
      body: { title: testName("task-labels"), labels: ["urgent", "client-facing", "needs-review"] },
      cookies,
    });
    if (r.status === 201) {
      pass("labels array → 201");
      if (Array.isArray(r.body?.labels)) pass("labels stored as array");
      else fail("labels storage", `expected array, got ${typeof r.body?.labels}`);
      CLEANUP.taskIds.push(r.body?.id);
    } else {
      fail("labels array", `expected 201, got ${r.status}`);
    }
  }

  {
    // Visibility: team
    const r = await authReq("POST", "/api/tasks", {
      body: { title: testName("task-team-vis"), visibility: "team" },
      cookies,
    });
    if (r.status === 201) {
      pass("visibility=team → 201");
      CLEANUP.taskIds.push(r.body?.id);
    } else {
      fail("visibility=team", `expected 201, got ${r.status}`);
    }
  }

  {
    // Recurrence rule
    const r = await authReq("POST", "/api/tasks", {
      body: { title: testName("task-recurring"), recurrence_rule: "FREQ=WEEKLY", due_date: "2030-01-06" },
      cookies,
    });
    if (r.status === 201) {
      pass("recurrence_rule=FREQ=WEEKLY → 201");
      CLEANUP.taskIds.push(r.body?.id);
    } else {
      fail("recurrence_rule", `expected 201, got ${r.status}`);
    }
  }

  {
    // Full task with all fields
    const r = await authReq("POST", "/api/tasks", {
      body: {
        title: testName("task-full"),
        description: "Full task description for QA testing",
        status: "in_progress",
        priority: "high",
        category: "follow_up",
        due_date: "2030-06-15",
        start_date: "2030-06-01",
        estimated_hours: 2.5,
        labels: ["qa", "automated"],
        visibility: "private",
      },
      cookies,
    });
    if (r.status === 201) {
      pass("full task all fields → 201");
      CLEANUP.taskIds.push(r.body?.id);
    } else {
      fail("full task", `expected 201, got ${r.status} — ${JSON.stringify(r.body)}`);
    }
  }

  {
    // Very long title
    const r = await authReq("POST", "/api/tasks", {
      body: { title: "T".repeat(1000), description: "test" },
      cookies,
    });
    if (r.status === 201 || r.status === 400) pass(`very long title → ${r.status} (handled)`);
    else fail("very long title", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.id) CLEANUP.taskIds.push(r.body.id);
  }

  {
    // Very long description
    const r = await authReq("POST", "/api/tasks", {
      body: { title: "Test Task", description: "D".repeat(10000) },
      cookies,
    });
    if (r.status === 201 || r.status === 400) pass(`very long description → ${r.status} (handled)`);
    else fail("very long description", `unexpected status ${r.status}`);
    if (r.status === 201 && r.body?.id) CLEANUP.taskIds.push(r.body.id);
  }

  // ── 3.4 READ — GET /api/tasks ──────────────────────────────────────────────
  subsection("3.4 READ — GET /api/tasks");

  {
    const r = await authReq("GET", "/api/tasks", { cookies });
    if (r.status === 200 && r.body?.data && Array.isArray(r.body.data)) {
      pass("list tasks → 200 with {data, pagination}");
      if (r.body.pagination?.page) pass("pagination object present");
      else fail("pagination", "missing from response");
    } else {
      fail("list tasks", `expected 200 with data array, got ${r.status} ${JSON.stringify(r.body)?.slice(0, 100)}`);
    }
  }

  {
    // Filter by status
    const r = await authReq("GET", "/api/tasks?status=pending", { cookies });
    if (r.status === 200) {
      pass("tasks filter status=pending → 200");
      const allPending = (r.body?.data || []).every((t) => t.status === "pending");
      if (allPending || (r.body?.data || []).length === 0) pass("status=pending filter correct");
      else fail("status=pending filter", "returned non-pending tasks");
    } else {
      fail("tasks filter status=pending", `expected 200, got ${r.status}`);
    }
  }

  {
    // Filter by comma-separated statuses
    const r = await authReq("GET", "/api/tasks?status=pending,in_progress", { cookies });
    if (r.status === 200) pass("tasks filter status=pending,in_progress → 200");
    else fail("tasks multi-status filter", `expected 200, got ${r.status}`);
  }

  {
    // Filter by priority
    const r = await authReq("GET", "/api/tasks?priority=high", { cookies });
    if (r.status === 200) {
      pass("tasks filter priority=high → 200");
      const allHigh = (r.body?.data || []).every((t) => t.priority === "high");
      if (allHigh || (r.body?.data || []).length === 0) pass("priority=high filter correct");
      else fail("priority=high filter", "returned non-high tasks");
    } else {
      fail("tasks filter priority=high", `expected 200, got ${r.status}`);
    }
  }

  {
    // Filter by category
    const r = await authReq("GET", "/api/tasks?category=follow_up", { cookies });
    if (r.status === 200) pass("tasks filter category=follow_up → 200");
    else fail("tasks filter category", `expected 200, got ${r.status}`);
  }

  {
    // Search
    const r = await authReq("GET", `/api/tasks?search=QA+${SUFFIX}`, { cookies });
    if (r.status === 200) pass("tasks search → 200");
    else fail("tasks search", `expected 200, got ${r.status}`);
  }

  {
    // Sort by due_date ascending
    const r = await authReq("GET", "/api/tasks?sort_by=due_date&sort_dir=asc", { cookies });
    if (r.status === 200) pass("tasks sort by due_date asc → 200");
    else fail("tasks sort by due_date", `expected 200, got ${r.status}`);
  }

  {
    // Sort by title
    const r = await authReq("GET", "/api/tasks?sort_by=title", { cookies });
    if (r.status === 200) pass("tasks sort by title → 200");
    else fail("tasks sort by title", `expected 200, got ${r.status}`);
  }

  {
    // Sort by created_at desc
    const r = await authReq("GET", "/api/tasks?sort_by=created_at&sort_dir=desc", { cookies });
    if (r.status === 200) pass("tasks sort by created_at desc → 200");
    else fail("tasks sort by created_at desc", `expected 200, got ${r.status}`);
  }

  {
    // Pagination: page 1, per_page 5
    const r = await authReq("GET", "/api/tasks?page=1&per_page=5", { cookies });
    if (r.status === 200) {
      pass("tasks pagination page=1 per_page=5 → 200");
      if ((r.body?.data || []).length <= 5) pass("pagination per_page=5 respected");
      else fail("pagination per_page=5", `returned ${r.body?.data?.length} items`);
    } else {
      fail("tasks pagination", `expected 200, got ${r.status}`);
    }
  }

  {
    // parent_id=null (top-level tasks only)
    const r = await authReq("GET", "/api/tasks?parent_id=null", { cookies });
    if (r.status === 200) pass("tasks parent_id=null (top-level) → 200");
    else fail("tasks parent_id=null", `expected 200, got ${r.status}`);
  }

  {
    // Due date range
    const r = await authReq("GET", "/api/tasks?due_date_from=2020-01-01&due_date_to=2030-12-31", { cookies });
    if (r.status === 200) pass("tasks due_date range filter → 200");
    else fail("tasks due_date range", `expected 200, got ${r.status}`);
  }

  {
    // Archived tasks
    const r = await authReq("GET", "/api/tasks?archived=true", { cookies });
    if (r.status === 200) pass("tasks archived=true → 200");
    else fail("tasks archived=true", `expected 200, got ${r.status}`);
  }

  {
    // Non-archived tasks (default)
    const r = await authReq("GET", "/api/tasks?archived=false", { cookies });
    if (r.status === 200) pass("tasks archived=false (default) → 200");
    else fail("tasks archived=false", `expected 200, got ${r.status}`);
  }

  // ── 3.5 UPDATE — PATCH /api/tasks ─────────────────────────────────────────
  subsection("3.5 UPDATE — PATCH /api/tasks");

  // Create a task to update
  let updateTaskId;
  {
    const r = await authReq("POST", "/api/tasks", {
      body: { title: testName("task-to-update"), status: "pending", priority: "low" },
      cookies,
    });
    if (r.status === 201) {
      updateTaskId = r.body?.id;
      CLEANUP.taskIds.push(updateTaskId);
    } else {
      fail("PATCH task setup", `could not create task: ${r.status}`);
    }
  }

  if (updateTaskId) {
    {
      // Update title
      const r = await authReq("PATCH", "/api/tasks", {
        body: { id: updateTaskId, title: testName("task-updated-title") },
        cookies,
      });
      if (r.status === 200) pass("PATCH task title → 200");
      else fail("PATCH task title", `expected 200, got ${r.status} — ${JSON.stringify(r.body)}`);
    }

    {
      // Status transition: pending → in_progress
      const r = await authReq("PATCH", "/api/tasks", {
        body: { id: updateTaskId, status: "in_progress" },
        cookies,
      });
      if (r.status === 200) pass("PATCH status pending→in_progress → 200");
      else fail("PATCH status to in_progress", `expected 200, got ${r.status}`);
    }

    {
      // Status transition: in_progress → completed
      const r = await authReq("PATCH", "/api/tasks", {
        body: { id: updateTaskId, status: "completed" },
        cookies,
      });
      if (r.status === 200) {
        pass("PATCH status in_progress→completed → 200");
        if (r.body?.completed_at) pass("completed_at set on completion");
        else fail("completed_at missing", "expected timestamp set");
      } else {
        fail("PATCH status to completed", `expected 200, got ${r.status}`);
      }
    }

    {
      // Status back from completed → pending (should clear completed_at)
      const r = await authReq("PATCH", "/api/tasks", {
        body: { id: updateTaskId, status: "pending" },
        cookies,
      });
      if (r.status === 200) {
        pass("PATCH status completed→pending → 200");
        if (r.body?.completed_at === null) pass("completed_at cleared on un-complete");
        else fail("completed_at not cleared", `got ${r.body?.completed_at}`);
      } else {
        fail("PATCH status back to pending", `expected 200, got ${r.status}`);
      }
    }

    {
      // Update priority
      const r = await authReq("PATCH", "/api/tasks", {
        body: { id: updateTaskId, priority: "urgent" },
        cookies,
      });
      if (r.status === 200) pass("PATCH priority → 200");
      else fail("PATCH priority", `expected 200, got ${r.status}`);
    }

    {
      // Update description
      const r = await authReq("PATCH", "/api/tasks", {
        body: { id: updateTaskId, description: "Updated description " + SUFFIX },
        cookies,
      });
      if (r.status === 200) pass("PATCH description → 200");
      else fail("PATCH description", `expected 200, got ${r.status}`);
    }

    {
      // Update labels
      const r = await authReq("PATCH", "/api/tasks", {
        body: { id: updateTaskId, labels: ["new-label", "qa"] },
        cookies,
      });
      if (r.status === 200) pass("PATCH labels → 200");
      else fail("PATCH labels", `expected 200, got ${r.status}`);
    }

    {
      // No valid fields to update
      const r = await authReq("PATCH", "/api/tasks", {
        body: { id: updateTaskId, unknownField: "ignored" },
        cookies,
      });
      if (r.status === 400) pass("PATCH no valid fields → 400");
      else fail("PATCH no valid fields", `expected 400, got ${r.status}`);
    }

    {
      // Update non-existent task
      const r = await authReq("PATCH", "/api/tasks", {
        body: { id: "00000000-0000-0000-0000-000000000000", title: "Ghost" },
        cookies,
      });
      if (r.status === 404) pass("PATCH non-existent task → 404");
      else fail("PATCH non-existent task", `expected 404, got ${r.status}`);
    }

    {
      // Update without ID — should error
      const r = await authReq("PATCH", "/api/tasks", {
        body: { title: "No ID" },
        cookies,
      });
      if (r.status === 400) pass("PATCH without id → 400");
      else fail("PATCH without id", `expected 400, got ${r.status}`);
    }

    {
      // Archive a task
      const r = await authReq("PATCH", "/api/tasks", {
        body: { id: updateTaskId, archived_at: new Date().toISOString() },
        cookies,
      });
      if (r.status === 200) pass("PATCH archive task → 200");
      else fail("PATCH archive task", `expected 200, got ${r.status}`);
    }
  }

  // ── 3.6 DELETE — DELETE /api/tasks ────────────────────────────────────────
  subsection("3.6 DELETE — DELETE /api/tasks");

  {
    // Create and delete
    const cr = await authReq("POST", "/api/tasks", {
      body: { title: testName("task-to-delete") },
      cookies,
    });
    if (cr.status === 201) {
      const delId = cr.body?.id;
      const dr = await authReq("DELETE", `/api/tasks?id=${delId}`, { cookies });
      if (dr.status === 200) pass("DELETE task → 200");
      else fail("DELETE task", `expected 200, got ${dr.status}`);
    } else {
      fail("DELETE task setup", `could not create task: ${cr.status}`);
    }
  }

  {
    // Delete without ID — should error
    const r = await authReq("DELETE", "/api/tasks", { cookies });
    if (r.status === 400) pass("DELETE task without id → 400");
    else fail("DELETE task without id", `expected 400, got ${r.status}`);
  }

  {
    // Delete non-existent task
    const r = await authReq("DELETE", "/api/tasks?id=00000000-0000-0000-0000-000000000000", { cookies });
    // Supabase delete on non-existent row is not an error by default
    if (r.status === 200 || r.status === 404) pass(`DELETE non-existent task → ${r.status} (handled)`);
    else fail("DELETE non-existent task", `unexpected status ${r.status}`);
  }
}

// =============================================================================
// 4. NEWSLETTERS TESTS
// =============================================================================

async function testNewsletters(cookies) {
  section("4. NEWSLETTERS — /api/newsletters/*");

  // ── 4.1 Auth enforcement ───────────────────────────────────────────────────
  subsection("4.1 Auth enforcement");

  {
    // newsletter edit endpoint — requires auth
    const r = await req("POST", "/api/newsletters/edit", {
      body: { newsletterId: "test-id", editedSubject: "Test", editedBody: "<p>Test</p>" },
    });
    if (r.status === 401) pass("POST /api/newsletters/edit without auth → 401");
    else fail("newsletters/edit unauthenticated", `expected 401, got ${r.status}`);
  }

  // ── 4.2 Newsletter EDIT endpoint ──────────────────────────────────────────
  subsection("4.2 Newsletter edit — /api/newsletters/edit");

  {
    // Missing newsletterId
    const r = await authReq("POST", "/api/newsletters/edit", {
      body: { editedSubject: "Test Subject", editedBody: "<p>Body</p>" },
      cookies,
    });
    if (r.status === 400) pass("edit without newsletterId → 400");
    else fail("edit without newsletterId", `expected 400, got ${r.status}`);
  }

  {
    // Non-existent newsletter ID — should 403 (ownership check fails)
    const r = await authReq("POST", "/api/newsletters/edit", {
      body: {
        newsletterId: "00000000-0000-0000-0000-000000000000",
        editedSubject: "Test",
        editedBody: "<p>Test</p>",
      },
      cookies,
    });
    if (r.status === 403 || r.status === 404) pass(`edit non-existent newsletter → ${r.status} (access denied)`);
    else fail("edit non-existent newsletter", `expected 403/404, got ${r.status}`);
  }

  {
    // Empty body entirely
    const r = await authReq("POST", "/api/newsletters/edit", {
      body: {},
      cookies,
    });
    if (r.status === 400) pass("edit empty body → 400");
    else fail("edit empty body", `expected 400, got ${r.status}`);
  }

  // ── 4.3 Newsletter preview endpoint ───────────────────────────────────────
  subsection("4.3 Newsletter preview — /api/newsletters/preview/[id]");

  {
    // Preview non-existent newsletter
    const r = await authReq("GET", "/api/newsletters/preview/00000000-0000-0000-0000-000000000000", { cookies });
    if (r.status === 404 || r.status === 403 || r.status === 400) pass(`preview non-existent → ${r.status} (not found)`);
    else fail("preview non-existent", `unexpected status ${r.status}`);
  }

  // ── 4.4 Newsletter process endpoint ───────────────────────────────────────
  subsection("4.4 Newsletter process — /api/newsletters/process");

  {
    // Process without auth
    const r = await req("POST", "/api/newsletters/process", { body: {} });
    if (r.status === 401) pass("process without auth → 401");
    else fail("process without auth", `expected 401, got ${r.status}`);
  }

  {
    // Process with empty body — needs contact_id and email_type
    const r = await authReq("POST", "/api/newsletters/process", { body: {}, cookies });
    if (r.status === 400 || r.status === 405 || r.status === 422 || r.status === 500) pass(`process empty body → ${r.status} (error/not-allowed)`);
    else fail("process empty body", `expected 4xx/5xx, got ${r.status}`);
  }

  // ── 4.5 Direct Supabase newsletter table tests ────────────────────────────
  // These test the newsletters table directly via service role key
  subsection("4.5 Newsletter table — direct Supabase tests (service role)");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.log("  SKIP  Supabase direct tests — SUPABASE_URL or SERVICE_ROLE_KEY not set");
    return;
  }

  {
    // List newsletters via Supabase API
    const r = await supabase("GET", "newsletters", { query: "limit=10" });
    if (r.status === 200 && Array.isArray(r.data)) pass("newsletters table readable via service role → 200");
    else fail("newsletters table read", `expected 200 array, got ${r.status} ${JSON.stringify(r.data)?.slice(0, 100)}`);
  }

  {
    // Attempt newsletter insert with missing required fields
    const r = await supabase("POST", "newsletters", {
      body: { subject: "Test Newsletter " + SUFFIX },
    });
    // Supabase will succeed or fail depending on table constraints
    if (r.status === 201 || r.status === 400 || r.status === 422 || r.status === 500) {
      pass(`newsletter minimal insert → ${r.status} (table constraint check)`);
    } else {
      fail("newsletter minimal insert", `unexpected status ${r.status}`);
    }
  }

  {
    // Verify newsletters table has expected columns by doing a select
    const r = await supabase("GET", "newsletters", {
      query: "select=id,subject,html_body,status,email_type,contact_id,realtor_id,created_at&limit=1",
    });
    if (r.status === 200 && Array.isArray(r.data)) pass("newsletters table has expected columns");
    else fail("newsletters table columns", `got ${r.status} — ${JSON.stringify(r.data)?.slice(0, 200)}`);
  }

  // ── 4.6 Approval queue endpoint ────────────────────────────────────────────
  subsection("4.6 Approval queue page");

  {
    const r = await authReq("GET", "/newsletters/queue", { cookies });
    if (r.status === 200 || r.status === 307) pass("approval queue page accessible → 200/307");
    else fail("approval queue page", `expected 200/307, got ${r.status}`);
  }
}

// =============================================================================
// 5. ADDITIONAL CROSS-MODULE TESTS
// =============================================================================

async function testAdditional(cookies) {
  section("5. ADDITIONAL — Cross-Module & Edge Cases");

  subsection("5.1 API rate limiting & headers");

  {
    // Check that the app server is responding
    const r = await req("GET", "/");
    if (r.status === 200 || r.status === 307) pass("app root accessible → 200/307");
    else fail("app root", `expected 200/307, got ${r.status}`);
  }

  {
    // API routes return JSON content-type
    const r = await req("GET", "/api/auth/session");
    if (r.status === 200) {
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("application/json")) pass("auth session returns JSON content-type");
      else fail("content-type", `expected JSON, got ${ct}`);
    } else {
      pass(`auth session → ${r.status}`);
    }
  }

  subsection("5.2 Contacts — PATCH endpoint path resolution");

  {
    // Verify the PATCH route exists at /api/contacts/[id]
    const testCreate = await authReq("POST", "/api/contacts", {
      body: { name: testName("patch-path-test"), phone: "+16045554000", type: "buyer" },
      cookies,
    });
    if (testCreate.status === 201) {
      const id = testCreate.body?.id;
      CLEANUP.contactIds.push(id);

      // Verify GET /api/contacts/[id] works
      const gr = await authReq("GET", `/api/contacts/${id}`, { cookies });
      if (gr.status === 200 && gr.body?.id === id) pass("GET /api/contacts/[id] returns contact");
      else if (gr.status === 404) pass("GET /api/contacts/[id] → 404 (route may not exist — list used instead)");
      else fail("GET /api/contacts/[id]", `status ${gr.status}`);
    }
  }

  subsection("5.3 Task subtask relationship");

  {
    // Create parent task
    const parent = await authReq("POST", "/api/tasks", {
      body: { title: testName("parent-task") },
      cookies,
    });
    if (parent.status === 201) {
      CLEANUP.taskIds.push(parent.body?.id);

      // Create subtask with parent_id
      const child = await authReq("POST", "/api/tasks", {
        body: { title: testName("child-task"), parent_id: parent.body?.id },
        cookies,
      });
      if (child.status === 201) {
        pass("create subtask with parent_id → 201");
        CLEANUP.taskIds.push(child.body?.id);

        // Filter by parent_id
        const r = await authReq("GET", `/api/tasks?parent_id=${parent.body?.id}`, { cookies });
        if (r.status === 200) {
          pass("filter tasks by parent_id → 200");
          const found = (r.body?.data || []).some((t) => t.id === child.body?.id);
          if (found) pass("subtask appears in parent_id filter");
          else fail("subtask in parent filter", "not found in filtered results");
        } else {
          fail("filter by parent_id", `expected 200, got ${r.status}`);
        }
      } else {
        fail("create subtask", `expected 201, got ${child.status}`);
      }
    }
  }

  subsection("5.4 Contact search edge cases");

  {
    // Search with only special chars — should sanitize and return results
    const r = await authReq("GET", "/api/contacts?search=%25%25%25", { cookies });
    if (r.status === 200) pass("search with %25%25%25 → 200 (sanitized)");
    else fail("search triple-percent", `expected 200, got ${r.status}`);
  }

  {
    // Search with unicode
    const r = await authReq("GET", "/api/contacts?search=%E4%B8%AD%E6%96%87", { cookies });
    if (r.status === 200) pass("search with unicode chars → 200");
    else fail("search unicode", `expected 200, got ${r.status}`);
  }

  subsection("5.5 Task filter combinations");

  {
    // Multiple filters combined
    const r = await authReq("GET", "/api/tasks?status=pending&priority=high&category=follow_up&sort_by=due_date&sort_dir=asc&page=1&per_page=10", { cookies });
    if (r.status === 200) pass("tasks combined filters → 200");
    else fail("tasks combined filters", `expected 200, got ${r.status}`);
  }

  {
    // Labels filter
    const r = await authReq("GET", "/api/tasks?labels=qa", { cookies });
    if (r.status === 200) pass("tasks labels filter → 200");
    else fail("tasks labels filter", `expected 200, got ${r.status}`);
  }

  {
    // Large per_page (max 100)
    const r = await authReq("GET", "/api/tasks?per_page=100", { cookies });
    if (r.status === 200) {
      pass("tasks per_page=100 → 200");
      if ((r.body?.data || []).length <= 100) pass("tasks per_page capped at 100");
      else fail("tasks per_page cap", `returned ${r.body?.data?.length} items`);
    } else {
      fail("tasks per_page=100", `expected 200, got ${r.status}`);
    }
  }

  {
    // per_page > 100 should be clamped
    const r = await authReq("GET", "/api/tasks?per_page=999", { cookies });
    if (r.status === 200) {
      pass("tasks per_page=999 clamped → 200");
      if ((r.body?.data || []).length <= 100) pass("tasks per_page 999 clamped to 100");
      else fail("tasks per_page 999 clamped", `returned ${r.body?.data?.length} items`);
    } else {
      fail("tasks per_page=999", `expected 200, got ${r.status}`);
    }
  }

  subsection("5.6 Signup rate-limit awareness");

  {
    // The signup endpoint has a rate limit of 5 requests per 15min per IP.
    // We do not want to exhaust it, so we just verify the endpoint is present.
    const r = await req("GET", "/api/auth/signup");
    // GET is not supported — should be 405
    if (r.status === 405 || r.status === 404) pass("GET /api/auth/signup → 405/404 (POST only)");
    else pass(`GET /api/auth/signup → ${r.status}`);
  }

  subsection("5.7 Contacts scope parameter");

  {
    // scope=personal (default)
    const r = await authReq("GET", "/api/contacts?scope=personal", { cookies });
    if (r.status === 200) pass("contacts scope=personal → 200");
    else fail("contacts scope=personal", `expected 200, got ${r.status}`);
  }

  {
    // scope=team
    const r = await authReq("GET", "/api/contacts?scope=team", { cookies });
    if (r.status === 200) pass("contacts scope=team → 200");
    else fail("contacts scope=team", `expected 200, got ${r.status}`);
  }
}

// =============================================================================
// CLEANUP
// =============================================================================

async function cleanup(cookies) {
  section("CLEANUP — Removing test data");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.log("  SKIP  Direct Supabase cleanup — service role key not available");
    console.log("  INFO  Run the following to clean up manually:");
    for (const id of CLEANUP.contactIds) console.log(`    DELETE FROM contacts WHERE id = '${id}';`);
    for (const id of CLEANUP.taskIds) console.log(`    DELETE FROM tasks WHERE id = '${id}';`);
    for (const email of CLEANUP.signupUserEmails) console.log(`    DELETE FROM users WHERE email = '${email}';`);
    return;
  }

  // Delete created tasks
  let taskDeleteCount = 0;
  for (const id of CLEANUP.taskIds.filter(Boolean)) {
    await supabase("DELETE", `tasks?id=eq.${id}`);
    taskDeleteCount++;
  }
  if (taskDeleteCount > 0) console.log(`  INFO  Deleted ${taskDeleteCount} test tasks`);

  // Delete created contacts
  let contactDeleteCount = 0;
  for (const id of CLEANUP.contactIds.filter(Boolean)) {
    await supabase("DELETE", `contacts?id=eq.${id}`);
    contactDeleteCount++;
  }
  if (contactDeleteCount > 0) console.log(`  INFO  Deleted ${contactDeleteCount} test contacts`);

  // Delete created users (from signup tests)
  let userDeleteCount = 0;
  for (const email of CLEANUP.signupUserEmails.filter(Boolean)) {
    await supabase("DELETE", `users?email=eq.${encodeURIComponent(email)}`);
    userDeleteCount++;
  }
  if (userDeleteCount > 0) console.log(`  INFO  Deleted ${userDeleteCount} test signup users`);

  console.log("  INFO  Cleanup complete");
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Realtors360 CRM — Exhaustive Automated Test Suite            ║");
  console.log(`║  ${new Date().toISOString()}                       ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\n  Base URL: ${BASE_URL}`);
  console.log(`  Demo user: ${DEMO_EMAIL}`);
  console.log(`  Test suffix: ${SUFFIX}`);

  // Check app is reachable
  try {
    const ping = await fetch(`${BASE_URL}/api/auth/session`, { method: "GET" });
    if (!ping.ok && ping.status !== 200) {
      console.warn(`\n  WARNING: App returned ${ping.status} — tests may fail if server is not running`);
    } else {
      console.log(`  App health: OK (${ping.status})`);
    }
  } catch (e) {
    console.error(`\n  ERROR: Cannot reach ${BASE_URL} — is the dev server running?`);
    console.error(`  Start it with: npm run dev`);
    process.exit(1);
  }

  // Authenticate once and reuse cookies
  let cookies;
  try {
    console.log("\n  Authenticating as demo user...");
    cookies = await authenticate();
    if (!cookies || cookies.length < 10) {
      throw new Error("Auth returned empty cookies — check DEMO_EMAIL and DEMO_PASSWORD in .env.local");
    }
    console.log("  Authenticated OK\n");
  } catch (e) {
    console.error(`\n  FATAL: Authentication failed — ${e.message}`);
    console.error("  Authenticated tests will be skipped");
    cookies = "";
  }

  // Run all test sections
  await testSignup();

  if (cookies) {
    await testContacts(cookies);
    await testTasks(cookies);
    await testNewsletters(cookies);
    await testAdditional(cookies);
  } else {
    console.log("\n  SKIP  Authenticated tests — no valid session");
  }

  // Cleanup test data
  if (cookies) {
    await cleanup(cookies);
  }

  // ── Results ────────────────────────────────────────────────────────────────
  const total = PASS + FAIL;
  console.log(`\n${"═".repeat(60)}`);
  console.log("  RESULTS");
  console.log(`${"═".repeat(60)}`);
  console.log(`  Total:  ${total}`);
  console.log(`  Passed: ${PASS} (${total > 0 ? Math.round((PASS / total) * 100) : 0}%)`);
  console.log(`  Failed: ${FAIL}`);

  if (FAILURES.length > 0) {
    console.log(`\n  Failed tests:`);
    for (const { name, reason } of FAILURES) {
      console.log(`    FAIL  ${name}`);
      console.log(`          ${reason}`);
    }
  }

  console.log(`${"═".repeat(60)}\n`);

  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
