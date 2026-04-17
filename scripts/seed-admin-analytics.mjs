/**
 * Seed script: backfill platform_analytics with historical events
 * derived from existing CRM data (users, contacts, listings, showings, newsletters).
 *
 * Run: node --env-file=.env.local scripts/seed-admin-analytics.mjs
 *
 * Idempotent: checks for a seed_marker row before inserting.
 * Safe to run multiple times — second run is a no-op.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// 1. Env bootstrap
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

// Load env vars from .env.local if not already set (e.g. when running
// without --env-file flag)
try {
  const envFile = readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found — rely on process.env being pre-populated
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Run with: node --env-file=.env.local scripts/seed-admin-analytics.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// 2. Helpers
// ---------------------------------------------------------------------------

/** Random integer between min and max (inclusive). */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random date between two Date objects. */
function randDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/** Random business-hours timestamp on a given date (8am-6pm PST = UTC-8). */
function randBusinessHour(date) {
  const d = new Date(date);
  d.setUTCHours(randInt(16, 26) % 24); // 8am-6pm PST = 16:00-02:00 UTC
  d.setUTCMinutes(randInt(0, 59));
  d.setUTCSeconds(randInt(0, 59));
  return d;
}

/** Batch insert rows into platform_analytics (max 500 per call to stay safe). */
async function batchInsert(rows) {
  if (rows.length === 0) return;
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("platform_analytics").insert(chunk);
    if (error) {
      console.error(`  Insert error at batch ${i}: ${error.message}`);
    }
  }
}

const now = new Date();

const ONBOARDING_LABELS = {
  1: "Welcome",
  2: "Profile Setup",
  3: "Import Contacts",
  4: "First Listing",
  5: "Email Setup",
  6: "Calendar Sync",
  7: "Complete",
};

// ---------------------------------------------------------------------------
// 3. Idempotency check
// ---------------------------------------------------------------------------
console.log("Seeding platform_analytics from existing data...\n");

const { data: marker, error: markerErr } = await supabase
  .from("platform_analytics")
  .select("id")
  .eq("event_name", "seed_marker")
  .limit(1);

if (markerErr) {
  console.error(`Failed to check seed marker: ${markerErr.message}`);
  process.exit(1);
}

if (marker && marker.length > 0) {
  console.log("Already seeded (seed_marker found). Skipping.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 4. Fetch existing data
// ---------------------------------------------------------------------------

const [usersRes, contactsRes, listingsRes, appointmentsRes, newslettersRes] = await Promise.all([
  supabase.from("users").select("id, email, created_at, role, plan, onboarding_completed, onboarding_step, trial_ends_at, trial_plan").order("created_at"),
  supabase.from("contacts").select("realtor_id, created_at, is_sample").order("created_at"),
  supabase.from("listings").select("realtor_id, created_at, is_sample").order("created_at"),
  supabase.from("appointments").select("realtor_id, created_at, is_sample").order("created_at"),
  supabase.from("newsletters").select("realtor_id, created_at, status, is_sample").order("created_at"),
]);

const users = usersRes.data ?? [];
const contacts = (contactsRes.data ?? []).filter((r) => !r.is_sample);
const listings = (listingsRes.data ?? []).filter((r) => !r.is_sample);
const appointments = (appointmentsRes.data ?? []).filter((r) => !r.is_sample);
const sentNewsletters = (newslettersRes.data ?? []).filter((r) => !r.is_sample && r.status === "sent");

// Counters
const counts = {
  signup: 0,
  session_start: 0,
  onboarding_step: 0,
  "feature_used (contacts)": 0,
  "feature_used (listings)": 0,
  "feature_used (showings)": 0,
  "feature_used (newsletters)": 0,
  plan_changed: 0,
  trial_started: 0,
};

const allRows = [];

// ---------------------------------------------------------------------------
// 5. Generate events from users
// ---------------------------------------------------------------------------
for (const user of users) {
  const userId = user.id;
  const createdAt = user.created_at ? new Date(user.created_at) : null;
  if (!createdAt || isNaN(createdAt.getTime())) continue;

  // 5a. signup event
  allRows.push({
    event_name: "signup",
    user_id: userId,
    metadata: { method: "credentials", source: "organic" },
    created_at: createdAt.toISOString(),
  });
  counts.signup++;

  // 5b. session_start events — 3-5 per week, capped at 100
  const weeksBetween = Math.max(1, Math.ceil((now - createdAt) / (7 * 86400000)));
  const totalSessions = Math.min(weeksBetween * randInt(3, 5), 100);

  for (let s = 0; s < totalSessions; s++) {
    const sessionDate = randDate(createdAt, now);
    const sessionTime = randBusinessHour(sessionDate);
    allRows.push({
      event_name: "session_start",
      user_id: userId,
      metadata: { source: "web" },
      created_at: sessionTime.toISOString(),
    });
    counts.session_start++;
  }

  // 5c. onboarding_step events (if onboarding_completed)
  if (user.onboarding_completed) {
    const obStart = new Date(createdAt.getTime() + 5 * 60 * 1000); // 5 min after signup
    let cursor = obStart;
    for (let step = 1; step <= 7; step++) {
      const gap = randInt(30, 120) * 1000; // 30-120 seconds
      cursor = new Date(cursor.getTime() + gap);
      allRows.push({
        event_name: "onboarding_step",
        user_id: userId,
        metadata: { step, label: ONBOARDING_LABELS[step] ?? `Step ${step}` },
        created_at: cursor.toISOString(),
      });
      counts.onboarding_step++;
    }
  }

  // 5d. plan_changed (if plan != 'free')
  if (user.plan && user.plan !== "free") {
    // Place plan change roughly 30-70% of the way between signup and now
    const planChangeDate = new Date(
      createdAt.getTime() + (now - createdAt) * (0.3 + Math.random() * 0.4)
    );
    allRows.push({
      event_name: "plan_changed",
      user_id: userId,
      metadata: { from: "free", to: user.plan, trigger: "admin" },
      created_at: planChangeDate.toISOString(),
    });
    counts.plan_changed++;
  }

  // 5e. trial_started (if trial_ends_at exists)
  if (user.trial_ends_at) {
    const trialEnd = new Date(user.trial_ends_at);
    if (!isNaN(trialEnd.getTime())) {
      // Trial typically starts 14 days before it ends
      const trialStart = new Date(trialEnd.getTime() - 14 * 86400000);
      // Clamp to not be before user signup
      const effectiveStart = trialStart < createdAt ? createdAt : trialStart;
      allRows.push({
        event_name: "trial_started",
        user_id: userId,
        metadata: { plan: user.trial_plan ?? "professional", duration_days: 14 },
        created_at: effectiveStart.toISOString(),
      });
      counts.trial_started++;
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Generate feature_used events from contacts
// ---------------------------------------------------------------------------
for (const c of contacts) {
  if (!c.created_at) continue;
  allRows.push({
    event_name: "feature_used",
    user_id: c.realtor_id ?? null,
    metadata: { feature: "contacts", action: "create" },
    created_at: c.created_at,
  });
  counts["feature_used (contacts)"]++;
}

// ---------------------------------------------------------------------------
// 7. Generate feature_used events from listings
// ---------------------------------------------------------------------------
for (const l of listings) {
  if (!l.created_at) continue;
  allRows.push({
    event_name: "feature_used",
    user_id: l.realtor_id ?? null,
    metadata: { feature: "listings", action: "create" },
    created_at: l.created_at,
  });
  counts["feature_used (listings)"]++;
}

// ---------------------------------------------------------------------------
// 8. Generate feature_used events from appointments (showings)
// ---------------------------------------------------------------------------
for (const a of appointments) {
  if (!a.created_at) continue;
  allRows.push({
    event_name: "feature_used",
    user_id: a.realtor_id ?? null,
    metadata: { feature: "showings", action: "create" },
    created_at: a.created_at,
  });
  counts["feature_used (showings)"]++;
}

// ---------------------------------------------------------------------------
// 9. Generate feature_used events from sent newsletters
// ---------------------------------------------------------------------------
for (const n of sentNewsletters) {
  if (!n.created_at) continue;
  allRows.push({
    event_name: "feature_used",
    user_id: n.realtor_id ?? null,
    metadata: { feature: "newsletters", action: "send" },
    created_at: n.created_at,
  });
  counts["feature_used (newsletters)"]++;
}

// ---------------------------------------------------------------------------
// 10. Insert all rows + seed marker
// ---------------------------------------------------------------------------
console.log("  Inserting events...");
await batchInsert(allRows);

// Insert seed marker
const { error: markerInsertErr } = await supabase.from("platform_analytics").insert({
  event_name: "seed_marker",
  metadata: { version: 1, seeded_at: now.toISOString(), total: allRows.length },
});

if (markerInsertErr) {
  console.error(`  Failed to insert seed marker: ${markerInsertErr.message}`);
}

// ---------------------------------------------------------------------------
// 11. Summary
// ---------------------------------------------------------------------------
console.log("");
for (const [key, val] of Object.entries(counts)) {
  console.log(`  ${key}: ${val} events`);
}
const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`\nTotal: ${total} events seeded`);
