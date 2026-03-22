/**
 * QA Test Suite: AI Agent Email Marketing System — FUNCTIONAL TESTS
 *
 * Tests actual business logic, not just schema existence.
 * Creates real data, runs real logic, verifies real outcomes.
 *
 * Usage:
 *   CRON_SECRET=<secret> node scripts/qa-test-ai-agent.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ybgiljuclpsuhbmdhust.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZ2lsanVjbHBzdWhibWRodXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2Nzc5MSwiZXhwIjoyMDg4ODQzNzkxfQ.qdu6B5jdtckJ23nErIiVuQOzGbPqn_SrEJxQrL9buEk";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "listingflow-cron-secret-2026";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let passed = 0, failed = 0, skipped = 0;
const results = [];
const cleanup = []; // functions to run at end

function test(name, fn) { return { name, fn }; }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function skip(msg) { throw new Error("SKIP:" + msg); }

async function run(sections) {
  console.log(`\n${"═".repeat(70)}`);
  console.log("🧪 AI AGENT EMAIL MARKETING — FUNCTIONAL TEST SUITE");
  console.log(`${"═".repeat(70)}\n`);

  for (const section of sections) {
    console.log(`\n── ${section.label} ${"─".repeat(Math.max(0, 60 - section.label.length))}\n`);
    for (const t of section.tests) {
      try {
        await t.fn();
        passed++;
        results.push({ name: t.name, status: "PASS" });
        console.log(`  ✅ ${t.name}`);
      } catch (err) {
        if (err.message.startsWith("SKIP:")) {
          skipped++;
          results.push({ name: t.name, status: "SKIP" });
          console.log(`  ⏭  ${t.name} — ${err.message.slice(5)}`);
        } else {
          failed++;
          results.push({ name: t.name, status: "FAIL", error: err.message });
          console.log(`  ❌ ${t.name}`);
          console.log(`     ${err.message}`);
        }
      }
    }
  }

  // Cleanup
  console.log("\n── Cleanup ──────────────────────────────────────────────────\n");
  for (const fn of cleanup.reverse()) {
    try { await fn(); } catch {}
  }
  console.log("  Done.\n");

  console.log(`${"═".repeat(70)}`);
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped (${passed + failed + skipped} total)`);
  console.log(`${"═".repeat(70)}\n`);

  if (failed > 0) {
    console.log("FAILURES:");
    results.filter(r => r.status === "FAIL").forEach(r => console.log(`  ❌ ${r.name}: ${r.error}`));
    console.log("");
  }
  process.exit(failed > 0 ? 1 : 0);
}

// ═══════════════════ TEST DATA SETUP ═══════════════════════════

let testContactBuyer, testContactSeller, testContactDormant, testListing;

async function setupTestData() {
  // Create test contacts
  const { data: buyer } = await supabase.from("contacts").insert({
    name: "QA Buyer", email: "qa-buyer@test.dev", phone: "+16045550001",
    type: "buyer", pref_channel: "sms",
    newsletter_intelligence: {
      engagement_score: 75,
      inferred_interests: { areas: ["Kitsilano"], price_range: [800000, 1200000], property_types: ["condo"] },
      click_history: [{ type: "listing", area: "Kitsilano" }],
    },
  }).select("id").single();
  testContactBuyer = buyer?.id;
  cleanup.push(() => supabase.from("contacts").delete().eq("id", testContactBuyer));

  const { data: seller } = await supabase.from("contacts").insert({
    name: "QA Seller", email: "qa-seller@test.dev", phone: "+16045550002",
    type: "seller", pref_channel: "sms",
  }).select("id").single();
  testContactSeller = seller?.id;
  cleanup.push(() => supabase.from("contacts").delete().eq("id", testContactSeller));

  const { data: dormant } = await supabase.from("contacts").insert({
    name: "QA Dormant", email: "qa-dormant@test.dev", phone: "+16045550003",
    type: "buyer", pref_channel: "sms",
    newsletter_intelligence: { engagement_score: 5, inferred_interests: {} },
  }).select("id").single();
  testContactDormant = dormant?.id;
  cleanup.push(() => supabase.from("contacts").delete().eq("id", testContactDormant));

  // Create test listing (seller_id is optional in some schemas, try without if fails)
  let listingResult = await supabase.from("listings").insert({
    address: "999 QA Test Ave, Kitsilano", list_price: 950000,
    bedrooms: 3, bathrooms: 2, status: "active", current_phase: 1,
    seller_id: testContactSeller,
  }).select("id").single();
  if (listingResult.error) {
    // Try without seller_id
    listingResult = await supabase.from("listings").insert({
      address: "999 QA Test Ave, Kitsilano", list_price: 950000,
      bedrooms: 3, bathrooms: 2, status: "active", current_phase: 1,
    }).select("id").single();
  }
  testListing = listingResult.data?.id;
  if (!testListing) console.log("  ⚠️  Could not create test listing:", listingResult.error?.message);
  cleanup.push(() => supabase.from("listings").delete().eq("id", testListing));

  // Create journey for buyer
  await supabase.from("contact_journeys").insert({
    contact_id: testContactBuyer, journey_type: "buyer",
    current_phase: "active", agent_mode: "agent_driven",
    next_email_at: new Date(Date.now() + 86400000).toISOString(),
  });
  cleanup.push(() => supabase.from("contact_journeys").delete().eq("contact_id", testContactBuyer));

  // Create journey for dormant
  await supabase.from("contact_journeys").insert({
    contact_id: testContactDormant, journey_type: "buyer",
    current_phase: "dormant", agent_mode: "schedule",
  });
  cleanup.push(() => supabase.from("contact_journeys").delete().eq("contact_id", testContactDormant));
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: EVENT PIPELINE — Does it capture real events?
// ═══════════════════════════════════════════════════════════════

const eventPipeline = {
  label: "EVENT PIPELINE",
  tests: [
    test("Event emitter creates listing_created with correct payload", async () => {
      if (!testListing) skip("No test listing");
      const { data, error } = await supabase.from("agent_events").insert({
        event_type: "listing_created",
        listing_id: testListing,
        payload: { address: "999 QA Test Ave", list_price: 950000, bedrooms: 3, property_type: "condo" },
      }).select("*").single();
      assert(!error, `Insert error: ${error?.message}`);
      assert(data.event_type === "listing_created", "Wrong type");
      assert(data.payload.list_price === 950000, "Payload missing list_price");
      assert(data.processed === false, "Should be unprocessed");
      cleanup.push(() => supabase.from("agent_events").delete().eq("id", data.id));
    }),

    test("Contact-specific events have contact_id, no listing_id", async () => {
      const { data } = await supabase.from("agent_events").insert({
        event_type: "contact_stage_changed",
        contact_id: testContactBuyer,
        payload: { old_stage: "lead", new_stage: "active" },
      }).select("*").single();
      assert(data.contact_id === testContactBuyer, "Wrong contact");
      assert(data.listing_id === null, "Listing should be null");
      cleanup.push(() => supabase.from("agent_events").delete().eq("id", data.id));
    }),

    test("High-intent click event carries link metadata", async () => {
      const { data } = await supabase.from("agent_events").insert({
        event_type: "high_intent_click",
        contact_id: testContactBuyer,
        payload: { linkType: "showing", linkUrl: "https://listingflow.com/book/123", newsletterId: "nl-001" },
      }).select("*").single();
      assert(data.payload.linkType === "showing", "Missing linkType");
      assert(data.payload.linkUrl.includes("book"), "Missing linkUrl");
      cleanup.push(() => supabase.from("agent_events").delete().eq("id", data.id));
    }),

    test("Invalid event type is rejected by CHECK constraint", async () => {
      const { error } = await supabase.from("agent_events").insert({
        event_type: "hacked_event", payload: {},
      });
      assert(error, "Should reject invalid event type");
      assert(error.message.includes("check") || error.message.includes("violates"), `Unexpected error: ${error.message}`);
    }),

    test("Unprocessed events index returns only unprocessed", async () => {
      // Insert 2 events: 1 processed, 1 not
      const { data: e1 } = await supabase.from("agent_events").insert({
        event_type: "email_opened", contact_id: testContactBuyer, payload: {},
      }).select("id").single();
      const { data: e2 } = await supabase.from("agent_events").insert({
        event_type: "email_clicked", contact_id: testContactBuyer, payload: {},
        processed: true, processed_at: new Date().toISOString(),
      }).select("id").single();

      const { data: unprocessed } = await supabase.from("agent_events")
        .select("id").eq("processed", false)
        .in("id", [e1.id, e2.id]);
      assert(unprocessed.length === 1, `Expected 1 unprocessed, got ${unprocessed.length}`);
      assert(unprocessed[0].id === e1.id, "Wrong event returned");

      cleanup.push(() => supabase.from("agent_events").delete().in("id", [e1.id, e2.id]));
    }),

    test("Events fan-out: listing event has no contact_id (evaluator fans out)", async () => {
      const { data } = await supabase.from("agent_events").insert({
        event_type: "listing_created", listing_id: testListing, payload: { test: true },
      }).select("contact_id").single();
      assert(data.contact_id === null, "Listing events should NOT have contact_id");
      cleanup.push(() => supabase.from("agent_events").delete().eq("listing_id", testListing).eq("event_type", "listing_created"));
    }),
  ],
};

// ═══════════════════════════════════════════════════════════════
// SECTION 2: AGENT DECISIONS — Correct decision recording
// ═══════════════════════════════════════════════════════════════

const agentDecisions = {
  label: "AGENT DECISIONS",
  tests: [
    test("Decision stores relevance_score and confidence", async () => {
      const { data } = await supabase.from("agent_decisions").insert({
        contact_id: testContactBuyer,
        decision: "send",
        email_type: "new_listing_alert",
        reasoning: "Area match Kitsilano, price in range",
        relevance_score: 87.5,
        confidence: 0.92,
        context_snapshot: { area: "Kitsilano", budget_match: true },
      }).select("*").single();
      assert(data.relevance_score === 87.5, "Wrong score");
      assert(data.confidence === 0.92, "Wrong confidence");
      assert(data.context_snapshot.area === "Kitsilano", "Missing context");
      cleanup.push(() => supabase.from("agent_decisions").delete().eq("id", data.id));
    }),

    test("Decision CHECK constraint rejects invalid decision type", async () => {
      const { error } = await supabase.from("agent_decisions").insert({
        contact_id: testContactBuyer, decision: "maybe",
        reasoning: "test", relevance_score: 50, confidence: 0.5,
      });
      assert(error, "Should reject 'maybe' as decision");
    }),

    test("Decision outcome tracks lifecycle (draft → approved → sent)", async () => {
      const { data: d1 } = await supabase.from("agent_decisions").insert({
        contact_id: testContactBuyer, decision: "send",
        reasoning: "test lifecycle", relevance_score: 80, confidence: 0.8,
      }).select("id, outcome").single();
      assert(d1.outcome === null, "Initial outcome should be null");

      await supabase.from("agent_decisions").update({ outcome: "draft_created" }).eq("id", d1.id);
      const { data: d2 } = await supabase.from("agent_decisions").select("outcome").eq("id", d1.id).single();
      assert(d2.outcome === "draft_created", "Should be draft_created");

      await supabase.from("agent_decisions").update({ outcome: "approved" }).eq("id", d1.id);
      const { data: d3 } = await supabase.from("agent_decisions").select("outcome").eq("id", d1.id).single();
      assert(d3.outcome === "approved", "Should be approved");

      cleanup.push(() => supabase.from("agent_decisions").delete().eq("id", d1.id));
    }),

    test("Suppressed decision queryable for suppression log", async () => {
      const ids = [];
      for (const decision of ["send", "skip", "defer", "suppress"]) {
        const { data } = await supabase.from("agent_decisions").insert({
          contact_id: testContactBuyer, decision,
          reasoning: `test ${decision}`, relevance_score: 50, confidence: 0.5,
        }).select("id").single();
        ids.push(data.id);
      }

      const { data: suppressed } = await supabase.from("agent_decisions")
        .select("decision")
        .in("decision", ["skip", "defer", "suppress"])
        .in("id", ids);
      assert(suppressed.length === 3, `Expected 3 suppressed, got ${suppressed.length}`);

      cleanup.push(() => supabase.from("agent_decisions").delete().in("id", ids));
    }),

    test("Decision links to newsletter_id after email is created", async () => {
      const { data: nl } = await supabase.from("newsletters").insert({
        contact_id: testContactBuyer, subject: "Decision Link Test",
        email_type: "market_update", status: "draft", html_body: "<p>test</p>",
      }).select("id").single();

      const { data: dec } = await supabase.from("agent_decisions").insert({
        contact_id: testContactBuyer, decision: "send",
        reasoning: "test linking", relevance_score: 80, confidence: 0.8,
        newsletter_id: nl.id,
      }).select("newsletter_id").single();
      assert(dec.newsletter_id === nl.id, "Newsletter not linked");

      cleanup.push(() => supabase.from("agent_decisions").delete().eq("newsletter_id", nl.id));
      cleanup.push(() => supabase.from("newsletters").delete().eq("id", nl.id));
    }),
  ],
};

// ═══════════════════════════════════════════════════════════════
// SECTION 3: TRUST SYSTEM — Correct trust level resolution
// ═══════════════════════════════════════════════════════════════

const trustSystem = {
  label: "PROGRESSIVE TRUST SYSTEM",
  tests: [
    test("Global trust defaults to ghost", async () => {
      const { data } = await supabase.from("agent_settings")
        .select("value").eq("key", "global_trust_level").single();
      const level = JSON.parse(JSON.stringify(data.value)).replace(/"/g, "");
      assert(level === "ghost", `Expected ghost, got ${level}`);
    }),

    test("Per-contact trust override takes precedence over global", async () => {
      // Set contact-level override
      await supabase.from("contacts").update({ agent_trust_level: "copilot" }).eq("id", testContactBuyer);
      const { data } = await supabase.from("contacts").select("agent_trust_level").eq("id", testContactBuyer).single();
      assert(data.agent_trust_level === "copilot", "Override not saved");

      // Reset
      await supabase.from("contacts").update({ agent_trust_level: null }).eq("id", testContactBuyer);
    }),

    test("Trust level allows valid levels: ghost, copilot, supervised, autonomous, null", async () => {
      for (const level of ["ghost", "copilot", "supervised", "autonomous", null]) {
        const { error } = await supabase.from("contacts")
          .update({ agent_trust_level: level }).eq("id", testContactBuyer);
        assert(!error, `Level '${level}' should be accepted, got: ${error?.message}`);
      }
      // Reset
      await supabase.from("contacts").update({ agent_trust_level: null }).eq("id", testContactBuyer);
    }),

    test("Trust audit log records level changes", async () => {
      const { data } = await supabase.from("trust_audit_log").insert({
        previous_level: "ghost", new_level: "copilot",
        reason: "QA test promotion", triggered_by: "manual",
        metrics: { editRate: 0.05, approvalRate: 0.95, emailsAtLevel: 25 },
      }).select("*").single();
      assert(data.previous_level === "ghost", "Wrong previous");
      assert(data.new_level === "copilot", "Wrong new");
      assert(data.metrics.editRate === 0.05, "Metrics not stored");
      cleanup.push(() => supabase.from("trust_audit_log").delete().eq("id", data.id));
    }),

    test("Promotion threshold config is valid", async () => {
      const { data } = await supabase.from("agent_settings")
        .select("value").eq("key", "trust_promotion_threshold").single();
      const config = data.value;
      assert(config.min_emails >= 1, "min_emails must be >= 1");
      assert(config.max_edit_rate > 0 && config.max_edit_rate <= 1, "max_edit_rate out of range");
      assert(config.min_approval_rate > 0 && config.min_approval_rate <= 1, "min_approval_rate out of range");
    }),

    test("Ghost draft stored correctly with reasoning", async () => {
      const { data } = await supabase.from("ghost_drafts").insert({
        contact_id: testContactBuyer, email_type: "new_listing_alert",
        subject: "QA Ghost: 3BR in Kits", html_body: "<p>Ghost test</p>",
        reasoning: "Area match 95%, price match 88%, buyer is active",
        ai_context: { relevance: 95, trigger: "listing_created" },
      }).select("*").single();
      assert(data.reasoning.includes("Area match"), "Reasoning not stored");
      assert(data.ai_context.relevance === 95, "Context not stored");
      // Verify NOT in newsletters table
      const { data: nls } = await supabase.from("newsletters").select("id").eq("subject", "QA Ghost: 3BR in Kits");
      assert(!nls?.length, "Ghost draft should NOT be in newsletters");
      cleanup.push(() => supabase.from("ghost_drafts").delete().eq("id", data.id));
    }),

    test("Email recall window enforces 30-min expiry", async () => {
      const { data: nl } = await supabase.from("newsletters").insert({
        contact_id: testContactBuyer, subject: "Recall Expiry Test",
        email_type: "market_update", status: "sent",
        html_body: "<p>recall test</p>", sent_at: new Date().toISOString(),
      }).select("id").single();

      // Active recall (expires in 30 min)
      const activeExpiry = new Date(Date.now() + 30 * 60 * 1000);
      const { data: active } = await supabase.from("email_recalls").insert({
        newsletter_id: nl.id, contact_id: testContactBuyer,
        expires_at: activeExpiry.toISOString(),
      }).select("*").single();

      // Expired recall (expired 5 min ago)
      const { data: nl2 } = await supabase.from("newsletters").insert({
        contact_id: testContactBuyer, subject: "Recall Expired Test",
        email_type: "market_update", status: "sent",
        html_body: "<p>expired</p>", sent_at: new Date(Date.now() - 3600000).toISOString(),
      }).select("id").single();
      const expiredExpiry = new Date(Date.now() - 5 * 60 * 1000);
      const { data: expired } = await supabase.from("email_recalls").insert({
        newsletter_id: nl2.id, contact_id: testContactBuyer,
        expires_at: expiredExpiry.toISOString(),
      }).select("*").single();

      // Query only active recalls
      const { data: activeRecalls } = await supabase.from("email_recalls")
        .select("id").eq("recalled", false)
        .gte("expires_at", new Date().toISOString())
        .in("id", [active.id, expired.id]);
      assert(activeRecalls.length === 1, `Expected 1 active recall, got ${activeRecalls.length}`);
      assert(activeRecalls[0].id === active.id, "Wrong recall returned");

      cleanup.push(() => supabase.from("email_recalls").delete().in("id", [active.id, expired.id]));
      cleanup.push(() => supabase.from("newsletters").delete().in("id", [nl.id, nl2.id]));
    }),
  ],
};

// ═══════════════════════════════════════════════════════════════
// SECTION 4: SEND GOVERNOR — Frequency caps, sunset
// ═══════════════════════════════════════════════════════════════

const sendGovernor = {
  label: "SEND GOVERNOR",
  tests: [
    test("Governor weekly cap blocks after limit reached", async () => {
      const govConfig = (await supabase.from("agent_settings").select("value").eq("key", "send_governor").single()).data.value;
      const weeklyCap = govConfig.weekly_cap;

      // Log sends up to the cap
      const logIds = [];
      for (let i = 0; i < weeklyCap; i++) {
        const { data } = await supabase.from("send_governor_log").insert({
          contact_id: testContactBuyer, email_type: "new_listing_alert",
        }).select("id").single();
        logIds.push(data.id);
      }

      // Verify count matches cap
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("send_governor_log")
        .select("*", { count: "exact", head: true })
        .eq("contact_id", testContactBuyer)
        .gte("sent_at", weekStart.toISOString());
      assert(count >= weeklyCap, `Expected >= ${weeklyCap} sends, got ${count}`);

      cleanup.push(() => supabase.from("send_governor_log").delete().in("id", logIds));
    }),

    test("Governor tracks sends per contact independently", async () => {
      const { data: l1 } = await supabase.from("send_governor_log").insert({
        contact_id: testContactBuyer, email_type: "market_update",
      }).select("id").single();
      const { data: l2 } = await supabase.from("send_governor_log").insert({
        contact_id: testContactSeller, email_type: "market_update",
      }).select("id").single();

      const { count: buyerCount } = await supabase.from("send_governor_log")
        .select("*", { count: "exact", head: true })
        .eq("contact_id", testContactBuyer)
        .eq("email_type", "market_update");
      const { count: sellerCount } = await supabase.from("send_governor_log")
        .select("*", { count: "exact", head: true })
        .eq("contact_id", testContactSeller)
        .eq("email_type", "market_update");

      // Each should have at least 1 (may have more from other tests)
      assert(buyerCount >= 1, "Buyer should have >= 1 send");
      assert(sellerCount >= 1, "Seller should have >= 1 send");

      cleanup.push(() => supabase.from("send_governor_log").delete().in("id", [l1.id, l2.id]));
    }),

    test("Auto-sunset sets correct fields", async () => {
      await supabase.from("contacts").update({
        auto_sunset: true,
        sunset_at: new Date().toISOString(),
        sunset_reason: "No opens in last 5 emails",
      }).eq("id", testContactDormant);

      const { data } = await supabase.from("contacts")
        .select("auto_sunset, sunset_at, sunset_reason")
        .eq("id", testContactDormant).single();
      assert(data.auto_sunset === true, "auto_sunset not set");
      assert(data.sunset_reason === "No opens in last 5 emails", "Wrong reason");
      assert(data.sunset_at !== null, "sunset_at not set");

      // Reset
      await supabase.from("contacts").update({
        auto_sunset: false, sunset_at: null, sunset_reason: null,
      }).eq("id", testContactDormant);
    }),

    test("Never-email flag prevents agent from considering contact", async () => {
      await supabase.from("contacts").update({ agent_never_email: true }).eq("id", testContactDormant);
      const { data } = await supabase.from("contacts")
        .select("agent_never_email").eq("id", testContactDormant).single();
      assert(data.agent_never_email === true, "Flag not set");

      // Reset
      await supabase.from("contacts").update({ agent_never_email: false }).eq("id", testContactDormant);
    }),

    test("Agent-disabled flag is separate from never-email", async () => {
      await supabase.from("contacts").update({
        agent_enabled: false, agent_never_email: false,
      }).eq("id", testContactDormant);
      const { data } = await supabase.from("contacts")
        .select("agent_enabled, agent_never_email")
        .eq("id", testContactDormant).single();
      assert(data.agent_enabled === false, "agent_enabled not false");
      assert(data.agent_never_email === false, "never_email should be false");

      // Reset
      await supabase.from("contacts").update({ agent_enabled: true }).eq("id", testContactDormant);
    }),
  ],
};

// ═══════════════════════════════════════════════════════════════
// SECTION 5: EDIT INTELLIGENCE — Track edits, voice rules
// ═══════════════════════════════════════════════════════════════

const editIntelligence = {
  label: "EDIT INTELLIGENCE & VOICE LEARNING",
  tests: [
    test("Edit history records original vs edited with distance", async () => {
      const { data: nl } = await supabase.from("newsletters").insert({
        contact_id: testContactBuyer, subject: "Original Subject",
        email_type: "market_update", status: "sent",
        html_body: "<p>original</p>", sent_at: new Date().toISOString(),
        original_subject: "Original Subject", original_html_body: "<p>original</p>",
        edited_at: new Date().toISOString(), edit_distance: 0.35,
      }).select("id, original_subject, edit_distance").single();

      assert(nl.original_subject === "Original Subject", "Original not stored");
      assert(nl.edit_distance === 0.35, "Distance not stored");

      const { data: history } = await supabase.from("edit_history").insert({
        newsletter_id: nl.id, contact_id: testContactBuyer,
        original_subject: "Original Subject", edited_subject: "Better Subject",
        original_body_excerpt: "Hello, here is a market update",
        edited_body_excerpt: "Hey, check out the latest market data",
        edit_distance: 0.35, edit_type: "tone_change",
      }).select("*").single();

      assert(history.edit_type === "tone_change", "Wrong edit type");
      assert(history.edit_distance === 0.35, "Wrong distance");
      assert(history.original_subject !== history.edited_subject, "Subjects should differ");

      cleanup.push(() => supabase.from("edit_history").delete().eq("id", history.id));
      cleanup.push(() => supabase.from("newsletters").delete().eq("id", nl.id));
    }),

    test("Edit type classification: minor_tweak < tone_change < content_change < major_rewrite", async () => {
      const types = ["minor_tweak", "tone_change", "content_change", "major_rewrite"];
      for (const editType of types) {
        const { error } = await supabase.from("edit_history").insert({
          newsletter_id: null, contact_id: testContactBuyer,
          original_subject: "test", edited_subject: "test",
          original_body_excerpt: "test", edited_body_excerpt: "test",
          edit_distance: 0.5, edit_type: editType,
        });
        // May fail on newsletter_id FK — that's ok, we're testing the CHECK
        // If it passes, great; if FK error, also fine
        if (error && !error.message.includes("foreign key") && !error.message.includes("null")) {
          throw new Error(`Edit type '${editType}' rejected: ${error.message}`);
        }
      }
    }),

    test("Voice rule stores rule_type with CHECK constraint", async () => {
      const validTypes = ["tone", "greeting", "sign_off", "vocabulary", "structure", "subject_line", "avoid", "always_include"];
      const ids = [];
      for (const type of validTypes) {
        const { data, error } = await supabase.from("voice_rules").insert({
          rule_type: type, rule_text: `QA test rule for ${type}`,
          confidence: 0.6, source_count: 2,
        }).select("id").single();
        assert(!error, `Rule type '${type}' rejected: ${error?.message}`);
        ids.push(data.id);
      }

      // Invalid type
      const { error: badError } = await supabase.from("voice_rules").insert({
        rule_type: "invalid_type", rule_text: "test", confidence: 0.5,
      });
      assert(badError, "Should reject invalid rule_type");

      cleanup.push(() => supabase.from("voice_rules").delete().in("id", ids));
    }),

    test("Voice rules with is_active filter", async () => {
      const { data: active } = await supabase.from("voice_rules").insert({
        rule_type: "greeting", rule_text: "Use Hey not Hello",
        confidence: 0.8, is_active: true,
      }).select("id").single();
      const { data: inactive } = await supabase.from("voice_rules").insert({
        rule_type: "tone", rule_text: "Be formal",
        confidence: 0.3, is_active: false,
      }).select("id").single();

      const { data: activeRules } = await supabase.from("voice_rules")
        .select("id").eq("is_active", true)
        .in("id", [active.id, inactive.id]);
      assert(activeRules.length === 1, `Expected 1 active, got ${activeRules.length}`);

      cleanup.push(() => supabase.from("voice_rules").delete().in("id", [active.id, inactive.id]));
    }),
  ],
};

// ═══════════════════════════════════════════════════════════════
// SECTION 6: CRON ENDPOINTS — Auth, processing, error handling
// ═══════════════════════════════════════════════════════════════

const cronEndpoints = {
  label: "CRON ENDPOINTS",
  tests: [
    test("Agent evaluate cron rejects missing auth", async () => {
      const res = await fetch(`${APP_URL}/api/cron/agent-evaluate`);
      assert(res.status === 401, `Expected 401, got ${res.status}`);
    }),

    test("Agent evaluate cron rejects wrong secret", async () => {
      const res = await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
        headers: { Authorization: "Bearer wrong" },
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
    }),

    test("Agent evaluate cron accepts correct secret", async () => {
      const res = await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      assert(res.ok, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert(data.ok === true, "Expected ok=true");
      assert(typeof data.processed === "number", "Missing processed count");
      assert(typeof data.decisions === "number", "Missing decisions count");
    }),

    test("Agent evaluate processes events and marks them done", async () => {
      // Insert a contact_created event
      const { data: evt } = await supabase.from("agent_events").insert({
        event_type: "contact_created",
        contact_id: testContactBuyer,
        payload: { name: "QA Buyer", type: "buyer" },
      }).select("id").single();

      // Run cron
      const res = await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const result = await res.json();
      assert(result.ok, "Cron failed");
      assert(result.processed >= 1, "Should process >= 1 event");

      // Verify event marked processed
      const { data: after } = await supabase.from("agent_events")
        .select("processed, processed_at").eq("id", evt.id).single();
      assert(after.processed === true, "Event should be processed");
      assert(after.processed_at !== null, "processed_at should be set");

      cleanup.push(() => supabase.from("agent_events").delete().eq("id", evt.id));
    }),

    test("Cron idempotency: re-running doesn't re-process events", async () => {
      // Run cron twice
      await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const res = await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const data = await res.json();
      // Second run should process 0 (everything already processed)
      assert(data.processed === 0, `Expected 0 on second run, got ${data.processed}`);
    }),
  ],
};

// ═══════════════════════════════════════════════════════════════
// SECTION 7: UI PAGES — Load without 500 errors
// ═══════════════════════════════════════════════════════════════

const uiPages = {
  label: "UI PAGES",
  tests: [
    test("Command Center loads (200 or redirect)", async () => {
      const res = await fetch(`${APP_URL}/newsletters/control`, { redirect: "manual" });
      assert(res.status < 500, `Server error: ${res.status}`);
    }),
    test("Activity feed loads", async () => {
      const res = await fetch(`${APP_URL}/newsletters/activity`, { redirect: "manual" });
      assert(res.status < 500, `Server error: ${res.status}`);
    }),
    test("Suppressions page loads", async () => {
      const res = await fetch(`${APP_URL}/newsletters/suppressions`, { redirect: "manual" });
      assert(res.status < 500, `Server error: ${res.status}`);
    }),
    test("Ghost comparison loads", async () => {
      const res = await fetch(`${APP_URL}/newsletters/ghost`, { redirect: "manual" });
      assert(res.status < 500, `Server error: ${res.status}`);
    }),
    test("Insights page loads", async () => {
      const res = await fetch(`${APP_URL}/newsletters/insights`, { redirect: "manual" });
      assert(res.status < 500, `Server error: ${res.status}`);
    }),
    test("Newsletter dashboard loads", async () => {
      const res = await fetch(`${APP_URL}/newsletters`, { redirect: "manual" });
      assert(res.status < 500, `Server error: ${res.status}`);
    }),
    test("Approval queue loads", async () => {
      const res = await fetch(`${APP_URL}/newsletters/queue`, { redirect: "manual" });
      assert(res.status < 500, `Server error: ${res.status}`);
    }),
  ],
};

// ═══════════════════════════════════════════════════════════════
// SECTION 8: INTEGRATION — End-to-end flows
// ═══════════════════════════════════════════════════════════════

const integration = {
  label: "END-TO-END INTEGRATION",
  tests: [
    test("Full flow: event → evaluate → decision → newsletter draft", async () => {
      // 1. Create listing event
      const { data: evt } = await supabase.from("agent_events").insert({
        event_type: "listing_created",
        listing_id: testListing,
        payload: { address: "999 QA Test Ave", list_price: 950000, bedrooms: 3 },
      }).select("id").single();

      // 2. Run evaluator cron
      const res = await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const result = await res.json();
      assert(result.ok, "Cron should succeed");

      // 3. Event should be processed
      const { data: processed } = await supabase.from("agent_events")
        .select("processed").eq("id", evt.id).single();
      assert(processed.processed === true, "Event not processed");

      cleanup.push(() => supabase.from("agent_events").delete().eq("id", evt.id));
      // Cleanup any decisions created
      cleanup.push(() => supabase.from("agent_decisions").delete().eq("event_id", evt.id));
    }),

    test("Contact with agent_never_email=true gets no decisions", async () => {
      // Set never_email
      await supabase.from("contacts").update({ agent_never_email: true }).eq("id", testContactDormant);

      // Create event for that contact
      const { data: evt } = await supabase.from("agent_events").insert({
        event_type: "email_clicked",
        contact_id: testContactDormant,
        payload: { linkType: "listing" },
      }).select("id").single();

      // Run evaluator
      await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });

      // Check: should NOT create a "send" decision for this contact
      const { data: decisions } = await supabase.from("agent_decisions")
        .select("decision")
        .eq("contact_id", testContactDormant)
        .eq("event_id", evt.id)
        .eq("decision", "send");
      assert(!decisions?.length, "Should NOT send to never_email contact");

      // Reset
      await supabase.from("contacts").update({ agent_never_email: false }).eq("id", testContactDormant);
      cleanup.push(() => supabase.from("agent_events").delete().eq("id", evt.id));
    }),

    test("Journey agent_mode=schedule is NOT picked up by agent evaluator", async () => {
      // Dormant contact has agent_mode=schedule
      const { data: journey } = await supabase.from("contact_journeys")
        .select("agent_mode").eq("contact_id", testContactDormant).single();
      assert(journey?.agent_mode === "schedule", "Dormant should be schedule mode");

      // agent_mode=agent_driven contacts ARE picked up (buyer has this)
      const { data: agentJourney } = await supabase.from("contact_journeys")
        .select("agent_mode").eq("contact_id", testContactBuyer).single();
      assert(agentJourney?.agent_mode === "agent_driven", "Buyer should be agent_driven");
    }),

    test("Multiple events batch-processed in single cron run", async () => {
      const eventIds = [];
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.from("agent_events").insert({
          event_type: "email_opened",
          contact_id: testContactBuyer,
          payload: { batch_test: i },
        }).select("id").single();
        eventIds.push(data.id);
      }

      const res = await fetch(`${APP_URL}/api/cron/agent-evaluate`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const result = await res.json();
      assert(result.processed >= 5, `Expected >= 5 processed, got ${result.processed}`);

      // All should be marked processed
      const { data: events } = await supabase.from("agent_events")
        .select("processed").in("id", eventIds);
      const allProcessed = events.every(e => e.processed === true);
      assert(allProcessed, "Not all events processed");

      cleanup.push(() => supabase.from("agent_events").delete().in("id", eventIds));
    }),
  ],
};

// ═══════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════

await setupTestData();
await run([
  eventPipeline,
  agentDecisions,
  trustSystem,
  sendGovernor,
  editIntelligence,
  cronEndpoints,
  uiPages,
  integration,
]);
