/**
 * QA Test Suite: AI Agent Email Marketing System
 * Tests all 6 phases: Event Pipeline, Trust System, Evaluator, Governor, Timing, Voice, UI
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=<token> ANTHROPIC_API_KEY=<key> node scripts/qa-test-ai-agent.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ybgiljuclpsuhbmdhust.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZ2lsanVjbHBzdWhibWRodXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2Nzc5MSwiZXhwIjoyMDg4ODQzNzkxfQ.qdu6B5jdtckJ23nErIiVuQOzGbPqn_SrEJxQrL9buEk";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "listingflow-cron-secret-2026";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

function test(name, fn) {
  return { name, fn };
}

async function run(tests) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🧪 AI AGENT EMAIL MARKETING — QA TEST SUITE`);
  console.log(`${"═".repeat(60)}\n`);

  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      results.push({ name: t.name, status: "PASS" });
      console.log(`  ✅ ${t.name}`);
    } catch (err) {
      if (err.message === "SKIP") {
        skipped++;
        results.push({ name: t.name, status: "SKIP" });
        console.log(`  ⏭  ${t.name} (skipped)`);
      } else {
        failed++;
        results.push({ name: t.name, status: "FAIL", error: err.message });
        console.log(`  ❌ ${t.name}: ${err.message}`);
      }
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped (${passed + failed + skipped} total)`);
  console.log(`${"═".repeat(60)}\n`);

  if (failed > 0) {
    console.log("FAILURES:");
    results.filter(r => r.status === "FAIL").forEach(r => console.log(`  ❌ ${r.name}: ${r.error}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

// ════════════════════════════════════════════════════════════════
// PHASE 1: Event Pipeline Tests
// ════════════════════════════════════════════════════════════════

const phase1 = [
  test("1.1 — agent_events table exists", async () => {
    const { error } = await supabase.from("agent_events").select("id").limit(1);
    assert(!error, `Table error: ${error?.message}`);
  }),

  test("1.2 — agent_decisions table exists", async () => {
    const { error } = await supabase.from("agent_decisions").select("id").limit(1);
    assert(!error, `Table error: ${error?.message}`);
  }),

  test("1.3 — Can insert agent event", async () => {
    const { data, error } = await supabase.from("agent_events").insert({
      event_type: "listing_created",
      payload: { address: "123 Test St", list_price: 900000 },
    }).select("id").single();
    assert(!error, `Insert error: ${error?.message}`);
    assert(data.id, "No ID returned");
    // Cleanup
    await supabase.from("agent_events").delete().eq("id", data.id);
  }),

  test("1.4 — Event default processed=false", async () => {
    const { data } = await supabase.from("agent_events").insert({
      event_type: "contact_created",
      payload: { test: true },
    }).select("id, processed").single();
    assert(data.processed === false, "processed should be false");
    await supabase.from("agent_events").delete().eq("id", data.id);
  }),

  test("1.5 — Can insert agent decision", async () => {
    // Need a contact first
    const { data: contacts } = await supabase.from("contacts").select("id").limit(1);
    if (!contacts?.length) throw new Error("SKIP");
    const { data, error } = await supabase.from("agent_decisions").insert({
      contact_id: contacts[0].id,
      decision: "send",
      email_type: "new_listing_alert",
      reasoning: "Test decision",
      relevance_score: 85,
      confidence: 0.9,
    }).select("id").single();
    assert(!error, `Insert error: ${error?.message}`);
    await supabase.from("agent_decisions").delete().eq("id", data.id);
  }),

  test("1.6 — agent_mode column exists on contact_journeys", async () => {
    const { data, error } = await supabase.from("contact_journeys").select("agent_mode").limit(1);
    assert(!error, `Column missing: ${error?.message}`);
  }),

  test("1.7 — Event type CHECK constraint works", async () => {
    const { error } = await supabase.from("agent_events").insert({
      event_type: "invalid_type",
      payload: {},
    });
    assert(error, "Should reject invalid event type");
  }),
];

// ════════════════════════════════════════════════════════════════
// PHASE 2: Progressive Trust Tests
// ════════════════════════════════════════════════════════════════

const phase2 = [
  test("2.1 — agent_settings table exists with defaults", async () => {
    const { data } = await supabase.from("agent_settings").select("key, value").order("key");
    assert(data && data.length >= 3, `Expected 3+ settings, got ${data?.length}`);
    const keys = data.map(d => d.key);
    assert(keys.includes("global_trust_level"), "Missing global_trust_level");
    assert(keys.includes("trust_promotion_threshold"), "Missing threshold");
    assert(keys.includes("send_governor"), "Missing governor config");
  }),

  test("2.2 — Default trust level is ghost", async () => {
    const { data } = await supabase.from("agent_settings").select("value").eq("key", "global_trust_level").single();
    const level = typeof data.value === "string" ? data.value.replace(/"/g, "") : data.value;
    assert(level === "ghost", `Expected ghost, got ${level}`);
  }),

  test("2.3 — ghost_drafts table exists", async () => {
    const { error } = await supabase.from("ghost_drafts").select("id").limit(1);
    assert(!error, `Table error: ${error?.message}`);
  }),

  test("2.4 — email_recalls table exists", async () => {
    const { error } = await supabase.from("email_recalls").select("id").limit(1);
    assert(!error, `Table error: ${error?.message}`);
  }),

  test("2.5 — trust_audit_log table exists", async () => {
    const { error } = await supabase.from("trust_audit_log").select("id").limit(1);
    assert(!error, `Table error: ${error?.message}`);
  }),

  test("2.6 — Per-contact agent columns exist", async () => {
    const { data, error } = await supabase.from("contacts")
      .select("agent_trust_level, agent_enabled, agent_never_email, agent_frequency_pref, agent_topic_avoid")
      .limit(1);
    assert(!error, `Columns missing: ${error?.message}`);
  }),

  test("2.7 — agent_enabled defaults to true", async () => {
    const { data } = await supabase.from("contacts").select("agent_enabled").limit(1).single();
    assert(data.agent_enabled === true, `Expected true, got ${data.agent_enabled}`);
  }),

  test("2.8 — Can update trust level", async () => {
    const { error } = await supabase.from("agent_settings")
      .update({ value: '"ghost"', updated_at: new Date().toISOString() })
      .eq("key", "global_trust_level");
    assert(!error, `Update error: ${error?.message}`);
  }),
];

// ════════════════════════════════════════════════════════════════
// PHASE 3: Send Governor Tests
// ════════════════════════════════════════════════════════════════

const phase3 = [
  test("3.1 — send_governor_log table exists", async () => {
    const { error } = await supabase.from("send_governor_log").select("id").limit(1);
    assert(!error, `Table error: ${error?.message}`);
  }),

  test("3.2 — Can log a send", async () => {
    const { data: contacts } = await supabase.from("contacts").select("id").limit(1);
    if (!contacts?.length) throw new Error("SKIP");
    const { error } = await supabase.from("send_governor_log").insert({
      contact_id: contacts[0].id,
      email_type: "test",
    });
    assert(!error, `Insert error: ${error?.message}`);
  }),

  test("3.3 — auto_sunset column exists on contacts", async () => {
    const { data, error } = await supabase.from("contacts")
      .select("auto_sunset, sunset_at, sunset_reason")
      .limit(1);
    assert(!error, `Columns missing: ${error?.message}`);
  }),

  test("3.4 — Governor config is valid JSON", async () => {
    const { data } = await supabase.from("agent_settings").select("value").eq("key", "send_governor").single();
    const config = data.value;
    assert(config.weekly_cap > 0, "weekly_cap must be > 0");
    assert(config.daily_cap > 0, "daily_cap must be > 0");
    assert(config.min_gap_hours > 0, "min_gap_hours must be > 0");
  }),
];

// ════════════════════════════════════════════════════════════════
// PHASE 4: Edit Intelligence Tests
// ════════════════════════════════════════════════════════════════

const phase4 = [
  test("4.1 — edit_history table exists", async () => {
    const { error } = await supabase.from("edit_history").select("id").limit(1);
    assert(!error, `Table error: ${error?.message}`);
  }),

  test("4.2 — voice_rules table exists", async () => {
    const { error } = await supabase.from("voice_rules").select("id").limit(1);
    assert(!error, `Table error: ${error?.message}`);
  }),

  test("4.3 — Newsletter edit columns exist", async () => {
    const { data, error } = await supabase.from("newsletters")
      .select("original_subject, original_html_body, edited_at, edit_distance")
      .limit(1);
    assert(!error, `Columns missing: ${error?.message}`);
  }),

  test("4.4 — Can insert voice rule", async () => {
    const { data, error } = await supabase.from("voice_rules").insert({
      rule_type: "greeting",
      rule_text: "Always start with 'Hey' not 'Hello'",
      confidence: 0.7,
      source_count: 3,
    }).select("id").single();
    assert(!error, `Insert error: ${error?.message}`);
    await supabase.from("voice_rules").delete().eq("id", data.id);
  }),
];

// ════════════════════════════════════════════════════════════════
// PHASE 5: Cron + API Tests
// ════════════════════════════════════════════════════════════════

const phase5 = [
  test("5.1 — Agent evaluate cron endpoint exists", async () => {
    const res = await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    assert(res.ok, `Status: ${res.status}`);
    const data = await res.json();
    assert(data.ok === true, `Expected ok=true, got ${JSON.stringify(data)}`);
  }),

  test("5.2 — Cron rejects bad auth", async () => {
    const res = await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  }),
];

// ════════════════════════════════════════════════════════════════
// PHASE 6: UI Page Tests
// ════════════════════════════════════════════════════════════════

const phase6 = [
  test("6.1 — Activity feed page loads", async () => {
    const res = await fetch(`${APP_URL}/newsletters/activity`, { redirect: "follow" });
    // May redirect to login, that's ok — page exists
    assert(res.status < 500, `Status: ${res.status}`);
  }),

  test("6.2 — Suppressions page loads", async () => {
    const res = await fetch(`${APP_URL}/newsletters/suppressions`, { redirect: "follow" });
    assert(res.status < 500, `Status: ${res.status}`);
  }),

  test("6.3 — Ghost comparison page loads", async () => {
    const res = await fetch(`${APP_URL}/newsletters/ghost`, { redirect: "follow" });
    assert(res.status < 500, `Status: ${res.status}`);
  }),

  test("6.4 — Insights page loads", async () => {
    const res = await fetch(`${APP_URL}/newsletters/insights`, { redirect: "follow" });
    assert(res.status < 500, `Status: ${res.status}`);
  }),

  test("6.5 — Command center page loads", async () => {
    const res = await fetch(`${APP_URL}/newsletters/control`, { redirect: "follow" });
    assert(res.status < 500, `Status: ${res.status}`);
  }),
];

// ════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ════════════════════════════════════════════════════════════════

const integration = [
  test("INT.1 — Full event → decision pipeline", async () => {
    // Insert an event
    const { data: event } = await supabase.from("agent_events").insert({
      event_type: "contact_created",
      payload: { test: true, name: "Integration Test Contact" },
    }).select("id").single();
    assert(event, "Event not created");

    // Verify it's unprocessed
    const { data: check } = await supabase.from("agent_events").select("processed").eq("id", event.id).single();
    assert(check.processed === false, "Should be unprocessed");

    // Call the cron endpoint to process it
    const res = await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const result = await res.json();
    assert(result.ok, "Cron should succeed");

    // Verify event is now processed
    const { data: after } = await supabase.from("agent_events").select("processed").eq("id", event.id).single();
    assert(after.processed === true, "Should be processed after cron");

    // Cleanup
    await supabase.from("agent_events").delete().eq("id", event.id);
  }),

  test("INT.2 — Ghost draft stays invisible in queue", async () => {
    const { data: contacts } = await supabase.from("contacts").select("id").limit(1);
    if (!contacts?.length) throw new Error("SKIP");

    // Insert ghost draft
    const { data: ghost } = await supabase.from("ghost_drafts").insert({
      contact_id: contacts[0].id,
      email_type: "market_update",
      subject: "Test Ghost Draft",
      html_body: "<p>Ghost</p>",
      reasoning: "Test",
    }).select("id").single();

    // Verify it's NOT in newsletters (approval queue)
    const { data: newsletters } = await supabase.from("newsletters")
      .select("id")
      .eq("subject", "Test Ghost Draft");
    assert(!newsletters?.length, "Ghost draft should NOT appear in newsletters");

    // Cleanup
    await supabase.from("ghost_drafts").delete().eq("id", ghost.id);
  }),

  test("INT.3 — Recall window creates correctly", async () => {
    const { data: contacts } = await supabase.from("contacts").select("id").limit(1);
    if (!contacts?.length) throw new Error("SKIP");

    // Create a test newsletter
    const { data: nl } = await supabase.from("newsletters").insert({
      contact_id: contacts[0].id,
      subject: "Recall Test",
      email_type: "market_update",
      status: "sent",
      html_body: "<p>Test recall</p>",
      sent_at: new Date().toISOString(),
    }).select("id").single();

    // Create recall
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const { data: recall } = await supabase.from("email_recalls").insert({
      newsletter_id: nl.id,
      contact_id: contacts[0].id,
      expires_at: expiresAt.toISOString(),
    }).select("id, recalled").single();

    assert(recall.recalled === false, "Should not be recalled yet");

    // Cleanup
    await supabase.from("email_recalls").delete().eq("id", recall.id);
    await supabase.from("newsletters").delete().eq("id", nl.id);
  }),
];

// Run all tests
await run([...phase1, ...phase2, ...phase3, ...phase4, ...phase5, ...phase6, ...integration]);
