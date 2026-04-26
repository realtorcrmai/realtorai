/**
 * Idempotent seed routine for E2E Playwright fixtures.
 *
 * Called by tests/fixtures/global-setup.ts before any spec runs.
 * Uses the Supabase service-role key so it bypasses RLS (runs in Node,
 * not in the browser).
 *
 * Every upsert is keyed on a fixed UUID from test-ids.ts, so repeated
 * runs are no-ops and real demo data is untouched.
 */
import { createClient } from "@supabase/supabase-js";
import {
  E2E_REALTOR_ID,
  E2E_CONTACT_ID,
  E2E_COMMUNICATION_ID,
} from "./test-ids";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "E2E seed requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function seedCanonicalContact(): Promise<void> {
  const sb = adminClient();

  // Canonical contact — populated with fields every tab needs
  const { error: contactErr } = await sb.from("contacts").upsert(
    {
      id: E2E_CONTACT_ID,
      realtor_id: E2E_REALTOR_ID,
      name: "E2E Test Contact",
      email: "e2e-fixture@test.realtors360.local",
      phone: "+16045550001",
      type: "buyer",
      pref_channel: "email",
      lifecycle_stage: "active_buyer",
      lead_status: "new",
      tags: ["e2e-fixture"],
      notes: "Canonical fixture contact — do not delete. Seeded by tests/fixtures/seed.ts.",
      demographics: {
        age_range: "35-44",
        occupation: "Software Engineer",
        household_size: 3,
        income_range: "150k-200k",
      },
      newsletter_intelligence: {
        engagement_score: 75,
        last_opened_at: new Date().toISOString(),
      },
      partner_active: true,
      agent_enabled: true,
    },
    { onConflict: "id" },
  );
  if (contactErr) {
    throw new Error(`Seed failed on contacts: ${contactErr.message}`);
  }

  // One communication so Activity/Overview tabs render non-empty
  const { error: commErr } = await sb.from("communications").upsert(
    {
      id: E2E_COMMUNICATION_ID,
      realtor_id: E2E_REALTOR_ID,
      contact_id: E2E_CONTACT_ID,
      direction: "outbound",
      channel: "note",
      body: "E2E fixture note — proves communication timeline renders.",
      visibility: "private",
    },
    { onConflict: "id" },
  );
  if (commErr) {
    throw new Error(`Seed failed on communications: ${commErr.message}`);
  }
}

export async function seedAll(): Promise<void> {
  await seedCanonicalContact();
}
