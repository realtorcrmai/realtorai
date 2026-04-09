#!/usr/bin/env node
/**
 * Edge Case & Seller-Specific Flow Evaluations
 * Tests boundary conditions, special characters, FK constraints, cascades,
 * and seller-specific CRM flows against the live Supabase database.
 *
 * Usage: node scripts/eval-edge-cases.mjs
 *
 * All test contacts use phone prefix +19997770 for cleanup.
 */

import { createClient } from "@supabase/supabase-js";

<<<<<<< HEAD
const SUPABASE_URL = "https://qcohfohjihazivkforsj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZ2lsanVjbHBzdWhibWRodXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2Nzc5MSwiZXhwIjoyMDg4ODQzNzkxfQ.qdu6B5jdtckJ23nErIiVuQOzGbPqn_SrEJxQrL9buEk";
=======
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Run with:  node --env-file=.env.local scripts/<script>.mjs");
  console.error("   Or export them: source .env.local && node scripts/<script>.mjs");
  process.exit(1);
}

>>>>>>> 5cb2549 (chore(scripts,migrations): post-consolidation cleanup)
const BASE_URL = "http://localhost:3000";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

let passed = 0;
let failed = 0;
const failures = [];
let seq = 0;

function t(id, name, ok, detail = "") {
  seq++;
  const icon = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`  ${icon} ${id} ${name}${detail ? ` — ${detail}` : ""}`);
  if (ok) passed++;
  else { failed++; failures.push({ id, name, detail }); }
}

function phone(n) { return `+19997770${String(n).padStart(3, "0")}`; }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async function createContact(overrides = {}) {
  const defaults = {
    name: "Edge Test",
    phone: phone(seq),
    type: "buyer",
    pref_channel: "sms",
  };
  const data = { ...defaults, ...overrides };
  const { data: row, error } = await sb.from("contacts").insert(data).select().single();
  return { row, error };
}

async function createNewsletter(overrides = {}) {
  const defaults = {
    email_type: "market_update",
    subject: "Test Subject",
    html_body: "<p>Test body</p>",
    status: "draft",
    send_mode: "review",
  };
  const data = { ...defaults, ...overrides };
  const { data: row, error } = await sb.from("newsletters").insert(data).select().single();
  return { row, error };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: CONTACT EDGE CASES (30 tests)
// ═══════════════════════════════════════════════════════════════
async function testContactEdgeCases() {
  console.log("\n\x1b[1m=== SECTION 1: CONTACT EDGE CASES ===\x1b[0m\n");

  // 1. Apostrophe in name
  {
    const { row, error } = await createContact({ name: "Patrick O'Brien", phone: phone(1) });
    t("EDGE-001", "Contact with apostrophe in name", !error && row?.name === "Patrick O'Brien", error?.message || "");
  }

  // 2. Accented characters
  {
    const { row, error } = await createContact({ name: "José García", phone: phone(2) });
    t("EDGE-002", "Contact with accented characters", !error && row?.name === "José García", error?.message || "");
  }

  // 3. Hyphenated name
  {
    const { row, error } = await createContact({ name: "Mary-Jane Watson", phone: phone(3) });
    t("EDGE-003", "Contact with hyphenated name", !error && row?.name === "Mary-Jane Watson", error?.message || "");
  }

  // 4. Very long name (50 chars)
  {
    const longName = "A".repeat(50);
    const { row, error } = await createContact({ name: longName, phone: phone(4) });
    t("EDGE-004", "Contact with 50 char name", !error && row?.name?.length === 50, error?.message || "");
  }

  // 5. Single character name
  {
    const { row, error } = await createContact({ name: "A", phone: phone(5) });
    t("EDGE-005", "Contact with single char name", !error && row?.name === "A", error?.message || "");
  }

  // 6. Name with numbers
  {
    const { row, error } = await createContact({ name: "Agent 007", phone: phone(6) });
    t("EDGE-006", "Contact with numbers in name", !error && row?.name === "Agent 007", error?.message || "");
  }

  // 7. Email but no phone — phone is NOT NULL, so must provide phone
  {
    const { row, error } = await createContact({ email: "test@example.com", phone: phone(7) });
    t("EDGE-007", "Contact with email and phone", !error && row?.email === "test@example.com", error?.message || "");
  }

  // 8. Phone but no email
  {
    const { row, error } = await createContact({ phone: phone(8), email: null });
    t("EDGE-008", "Contact with phone but no email", !error && row?.email === null, error?.message || "");
  }

  // 9. Neither phone nor email — phone is NOT NULL, expect failure
  {
    const { data: row, error } = await sb.from("contacts").insert({
      name: "No Phone Test",
      type: "buyer",
      pref_channel: "sms",
    }).select().single();
    t("EDGE-009", "Contact without phone fails (NOT NULL)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 10. Very long notes (10000 chars)
  {
    const longNotes = "N".repeat(10000);
    const { row, error } = await createContact({ phone: phone(10), notes: longNotes });
    t("EDGE-010", "Contact with 10000 char notes", !error && row?.notes?.length === 10000, error?.message || "");
  }

  // 11. Empty notes
  {
    const { row, error } = await createContact({ phone: phone(11), notes: "" });
    t("EDGE-011", "Contact with empty notes string", !error && row?.notes === "", error?.message || "");
  }

  // 12. Null notes
  {
    const { row, error } = await createContact({ phone: phone(12), notes: null });
    t("EDGE-012", "Contact with null notes", !error && row?.notes === null, error?.message || "");
  }

  // 13. Notes with HTML tags
  {
    const htmlNotes = '<script>alert("xss")</script><b>bold</b>';
    const { row, error } = await createContact({ phone: phone(13), notes: htmlNotes });
    t("EDGE-013", "Contact with HTML in notes (stored as-is)", !error && row?.notes === htmlNotes, error?.message || "");
  }

  // 14. SQL injection attempt in notes
  {
    const sqlNotes = "'; DROP TABLE contacts; --";
    const { row, error } = await createContact({ phone: phone(14), notes: sqlNotes });
    t("EDGE-014", "Contact with SQL injection in notes (safely stored)", !error && row?.notes === sqlNotes, error?.message || "");
  }

  // 15. International phone numbers
  {
    const r1 = await createContact({ name: "UK Contact", phone: "+449997770015" });
    const r2 = await createContact({ name: "India Contact", phone: "+919997770015" });
    const r3 = await createContact({ name: "China Contact", phone: "+869997770015" });
    const allOk = !r1.error && !r2.error && !r3.error;
    t("EDGE-015", "Contacts with international phones (+44, +91, +86)", allOk, r1.error?.message || r2.error?.message || r3.error?.message || "");
  }

  // 16. Phone with spaces
  {
    const { row, error } = await createContact({ phone: "+1 999 777 0016" });
    t("EDGE-016", "Contact with spaces in phone", !error && row?.phone === "+1 999 777 0016", error?.message || "");
  }

  // 17. Duplicate email (no unique constraint)
  {
    const dup = "duplicate@test.com";
    const r1 = await createContact({ phone: phone(17), email: dup });
    const r2 = await createContact({ phone: phone(170), email: dup });
    t("EDGE-017", "Duplicate email allowed (no unique constraint)", !r1.error && !r2.error, r1.error?.message || r2.error?.message || "");
  }

  // 18. Buyer creates buyer journey
  {
    const { row } = await createContact({ phone: phone(18), type: "buyer" });
    if (row) {
      const { data: j } = await sb.from("contact_journeys").insert({
        contact_id: row.id,
        journey_type: "buyer",
        current_phase: "lead",
      }).select().single();
      t("EDGE-018", "Contact type buyer creates buyer journey", !!j && j.journey_type === "buyer", "");
    } else {
      t("EDGE-018", "Contact type buyer creates buyer journey", false, "contact creation failed");
    }
  }

  // 19. Seller creates seller journey
  {
    const { row } = await createContact({ phone: phone(19), type: "seller" });
    if (row) {
      const { data: j } = await sb.from("contact_journeys").insert({
        contact_id: row.id,
        journey_type: "seller",
        current_phase: "lead",
      }).select().single();
      t("EDGE-019", "Contact type seller creates seller journey", !!j && j.journey_type === "seller", "");
    } else {
      t("EDGE-019", "Contact type seller creates seller journey", false, "contact creation failed");
    }
  }

  // 20. Partner creates NO journey (only buyer/seller allowed in journey_type)
  {
    const { row } = await createContact({ phone: phone(20), type: "partner" });
    if (row) {
      const { data: j, error } = await sb.from("contact_journeys").insert({
        contact_id: row.id,
        journey_type: "partner",
        current_phase: "lead",
      }).select().single();
      t("EDGE-020", "Partner type cannot create journey (CHECK constraint)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
    } else {
      t("EDGE-020", "Partner type cannot create journey", false, "contact creation failed");
    }
  }

  // 21. Type "other"
  {
    const { row, error } = await createContact({ phone: phone(21), type: "other" });
    t("EDGE-021", "Contact type 'other' accepted", !error && row?.type === "other", error?.message || "");
  }

  // 22. buyer_preferences JSON
  {
    const prefs = { min_price: 500000, max_price: 1000000, beds: 3, areas: ["Vancouver", "Burnaby"] };
    const { row, error } = await createContact({ phone: phone(22), type: "buyer", buyer_preferences: prefs });
    t("EDGE-022", "Contact with buyer_preferences JSON", !error && row?.buyer_preferences?.max_price === 1000000, error?.message || "");
  }

  // 23. seller_preferences JSON
  {
    const prefs = { motivation: "relocation", desired_list_price: 850000, earliest_list_date: "2026-05-01" };
    const { row, error } = await createContact({ phone: phone(23), type: "seller", seller_preferences: prefs });
    t("EDGE-023", "Contact with seller_preferences JSON", !error && row?.seller_preferences?.motivation === "relocation", error?.message || "");
  }

  // 24. demographics JSON (birthday)
  {
    const demo = { birthday: "1985-06-15", occupation: "Engineer", household_size: 4 };
    const { row, error } = await createContact({ phone: phone(24), demographics: demo });
    t("EDGE-024", "Contact with demographics JSON", !error && row?.demographics?.birthday === "1985-06-15", error?.message || "");
  }

  // 25. All optional fields filled
  {
    const { row, error } = await createContact({
      phone: phone(25),
      name: "Full Fields Contact",
      email: "full@test.com",
      type: "buyer",
      pref_channel: "whatsapp",
      notes: "Important VIP buyer",
      buyer_preferences: { beds: 4, areas: ["West Van"] },
      demographics: { birthday: "1990-01-01" },
    });
    t("EDGE-025", "Contact with all optional fields", !error && !!row?.id, error?.message || "");
  }

  // 26. Only required fields
  {
    const { row, error } = await createContact({ phone: phone(26), name: "Minimal", type: "seller" });
    t("EDGE-026", "Contact with only required fields", !error && !!row?.id, error?.message || "");
  }

  // 27. Bulk create 30 contacts
  {
    const batch = [];
    for (let i = 0; i < 30; i++) {
      batch.push({ name: `Bulk ${i}`, phone: phone(270 + i), type: "buyer", pref_channel: "sms" });
    }
    const { data, error } = await sb.from("contacts").insert(batch).select();
    t("EDGE-027", "Bulk create 30 contacts", !error && data?.length === 30, error?.message || `created ${data?.length || 0}`);
  }

  // 28. Delete contact — cascade (journeys, newsletters, events)
  {
    // Create contact with journey and newsletter and event
    const { row: c } = await createContact({ phone: phone(28), type: "buyer" });
    if (c) {
      const { data: j } = await sb.from("contact_journeys").insert({
        contact_id: c.id, journey_type: "buyer", current_phase: "lead",
      }).select().single();

      const { data: nl } = await sb.from("newsletters").insert({
        contact_id: c.id, email_type: "market_update", subject: "Cascade test", html_body: "<p>test</p>",
      }).select().single();

      if (nl) {
        await sb.from("newsletter_events").insert({
          newsletter_id: nl.id, contact_id: c.id, event_type: "delivered",
        });
      }

      // Delete the contact
      const { error: delErr } = await sb.from("contacts").delete().eq("id", c.id);
      t("EDGE-028a", "Delete contact succeeds", !delErr, delErr?.message || "");

      // Verify cascade
      const { data: remainJ } = await sb.from("contact_journeys").select("id").eq("contact_id", c.id);
      const { data: remainNl } = await sb.from("newsletters").select("id").eq("contact_id", c.id);
      t("EDGE-028b", "Delete cascade cleans journeys + newsletters", (remainJ?.length || 0) === 0 && (remainNl?.length || 0) === 0, "");
    } else {
      t("EDGE-028a", "Delete contact succeeds", false, "contact creation failed");
      t("EDGE-028b", "Delete cascade cleans journeys + newsletters", false, "skipped");
    }
  }

  // 29. Update contact type from buyer to seller
  {
    const { row: c } = await createContact({ phone: phone(29), type: "buyer" });
    if (c) {
      const { data: updated, error } = await sb.from("contacts").update({ type: "seller" }).eq("id", c.id).select().single();
      t("EDGE-029", "Update contact type buyer → seller", !error && updated?.type === "seller", error?.message || "");
    } else {
      t("EDGE-029", "Update contact type buyer → seller", false, "contact creation failed");
    }
  }

  // 30. Update contact name after newsletters created
  {
    const { row: c } = await createContact({ phone: phone(30), name: "Original Name" });
    if (c) {
      await sb.from("newsletters").insert({
        contact_id: c.id, email_type: "welcome", subject: "Welcome", html_body: "<p>hi</p>",
      });
      const { data: updated, error } = await sb.from("contacts").update({ name: "Updated Name" }).eq("id", c.id).select().single();
      t("EDGE-030", "Update contact name after newsletters", !error && updated?.name === "Updated Name", error?.message || "");
    } else {
      t("EDGE-030", "Update contact name after newsletters", false, "contact creation failed");
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: NEWSLETTER EDGE CASES (30 tests)
// ═══════════════════════════════════════════════════════════════
async function testNewsletterEdgeCases() {
  console.log("\n\x1b[1m=== SECTION 2: NEWSLETTER EDGE CASES ===\x1b[0m\n");

  // Create a shared contact for newsletter tests
  const { row: nlContact } = await createContact({ phone: phone(100), name: "Newsletter Test Contact", email: "nl@test.com" });
  if (!nlContact) { console.log("  SKIP: could not create newsletter test contact"); return; }
  const cid = nlContact.id;

  // 1. Minimum fields
  {
    const { row, error } = await createNewsletter({ contact_id: cid });
    t("EDGE-031", "Newsletter with minimum fields", !error && !!row?.id, error?.message || "");
  }

  // 2. Very long subject (200 chars)
  {
    const longSubj = "S".repeat(200);
    const { row, error } = await createNewsletter({ contact_id: cid, subject: longSubj });
    t("EDGE-032", "Newsletter with 200 char subject", !error && row?.subject?.length === 200, error?.message || "");
  }

  // 3. Very long html_body (100KB)
  {
    const bigBody = "<p>" + "X".repeat(100000) + "</p>";
    const { row, error } = await createNewsletter({ contact_id: cid, html_body: bigBody });
    t("EDGE-033", "Newsletter with 100KB html_body", !error && row?.html_body?.length > 99000, error?.message || "");
  }

  // 4. Empty html_body — NOT NULL should reject
  {
    const { data: row, error } = await sb.from("newsletters").insert({
      contact_id: cid, email_type: "welcome", subject: "Test", html_body: null,
    }).select().single();
    t("EDGE-034", "Newsletter with null html_body fails (NOT NULL)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 5. All valid status types
  {
    const statuses = ["draft", "approved", "sending", "sent", "failed", "skipped"];
    let allOk = true;
    for (const s of statuses) {
      const { error } = await createNewsletter({ contact_id: cid, status: s });
      if (error) { allOk = false; break; }
    }
    t("EDGE-035", "Newsletter with all 6 valid statuses", allOk, "");
  }

  // 6. quality_score = 0
  {
    const { row, error } = await createNewsletter({ contact_id: cid, quality_score: 0 });
    t("EDGE-036", "Newsletter with quality_score = 0", !error && row?.quality_score === 0, error?.message || "");
  }

  // 7. quality_score = 10
  {
    const { row, error } = await createNewsletter({ contact_id: cid, quality_score: 10 });
    t("EDGE-037", "Newsletter with quality_score = 10", !error, error?.message || "");
  }

  // 8. quality_score = 5.5 (decimal)
  {
    const { row, error } = await createNewsletter({ contact_id: cid, quality_score: 5.5 });
    t("EDGE-038", "Newsletter with quality_score = 5.5 (decimal)", !error && row?.quality_score === 5.5, error?.message || "");
  }

  // 9. ai_context with nested JSON
  {
    const ctx = { triggers: [{ type: "listing_match", listing_id: "abc" }], persona: { tone: "warm", style: "casual" } };
    const { row, error } = await createNewsletter({ contact_id: cid, ai_context: ctx });
    t("EDGE-039", "Newsletter with nested ai_context JSON", !error && row?.ai_context?.persona?.tone === "warm", error?.message || "");
  }

  // 10. ai_context with arrays
  {
    const ctx = { tags: ["urgent", "vip"], areas: ["Vancouver", "Richmond"], scores: [8, 9, 7] };
    const { row, error } = await createNewsletter({ contact_id: cid, ai_context: ctx });
    t("EDGE-040", "Newsletter with arrays in ai_context", !error && row?.ai_context?.tags?.length === 3, error?.message || "");
  }

  // 11. sent_at in the future
  {
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { row, error } = await createNewsletter({ contact_id: cid, sent_at: future, status: "sent" });
    t("EDGE-041", "Newsletter with future sent_at", !error && !!row?.sent_at, error?.message || "");
  }

  // 12. sent_at 1 year ago
  {
    const past = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { row, error } = await createNewsletter({ contact_id: cid, sent_at: past, status: "sent" });
    t("EDGE-042", "Newsletter with past sent_at (1 year ago)", !error && !!row?.sent_at, error?.message || "");
  }

  // 13. With resend_message_id
  {
    const { row, error } = await createNewsletter({ contact_id: cid, resend_message_id: "re_abc123def456" });
    t("EDGE-043", "Newsletter with resend_message_id", !error && row?.resend_message_id === "re_abc123def456", error?.message || "");
  }

  // 14. Without resend_message_id
  {
    const { row, error } = await createNewsletter({ contact_id: cid });
    t("EDGE-044", "Newsletter without resend_message_id", !error && row?.resend_message_id === null, error?.message || "");
  }

  // 15. Multiple newsletters for same contact same type
  {
    const r1 = await createNewsletter({ contact_id: cid, email_type: "market_update" });
    const r2 = await createNewsletter({ contact_id: cid, email_type: "market_update" });
    const r3 = await createNewsletter({ contact_id: cid, email_type: "market_update" });
    t("EDGE-045", "Multiple newsletters same contact same type", !r1.error && !r2.error && !r3.error, "");
  }

  // 16. Newsletter for non-existent contact — FK violation
  {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const { error } = await createNewsletter({ contact_id: fakeId });
    t("EDGE-046", "Newsletter for non-existent contact fails (FK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 17. Update status draft → sent
  {
    const { row: nl } = await createNewsletter({ contact_id: cid, status: "draft" });
    if (nl) {
      const { data: updated, error } = await sb.from("newsletters").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", nl.id).select().single();
      t("EDGE-047", "Update newsletter draft → sent", !error && updated?.status === "sent", error?.message || "");
    } else {
      t("EDGE-047", "Update newsletter draft → sent", false, "creation failed");
    }
  }

  // 18. Update status sent → failed
  {
    const { row: nl } = await createNewsletter({ contact_id: cid, status: "sent" });
    if (nl) {
      const { data: updated, error } = await sb.from("newsletters").update({ status: "failed", error_message: "bounce" }).eq("id", nl.id).select().single();
      t("EDGE-048", "Update newsletter sent → failed", !error && updated?.status === "failed", error?.message || "");
    } else {
      t("EDGE-048", "Update newsletter sent → failed", false, "creation failed");
    }
  }

  // 19. Edit tracking (original_subject, edited_at)
  {
    const { row: nl } = await createNewsletter({ contact_id: cid, subject: "Original" });
    if (nl) {
      const { data: updated, error } = await sb.from("newsletters").update({
        subject: "Edited Subject",
        original_subject: "Original",
        edited_at: new Date().toISOString(),
      }).eq("id", nl.id).select().single();
      t("EDGE-049", "Newsletter edit tracking fields", !error && updated?.original_subject === "Original" && !!updated?.edited_at, error?.message || "");
    } else {
      t("EDGE-049", "Newsletter edit tracking fields", false, "creation failed");
    }
  }

  // 20. edit_distance value
  {
    const { row: nl } = await createNewsletter({ contact_id: cid });
    if (nl) {
      const { data: updated, error } = await sb.from("newsletters").update({ edit_distance: 0.42 }).eq("id", nl.id).select().single();
      t("EDGE-050", "Newsletter edit_distance value", !error && updated?.edit_distance === 0.42, error?.message || "");
    } else {
      t("EDGE-050", "Newsletter edit_distance value", false, "creation failed");
    }
  }

  // 21-24. All email_type values
  {
    const types = ["new_listing_alert", "market_update", "just_sold", "open_house_invite", "neighbourhood_guide", "home_anniversary", "welcome", "reengagement", "referral_ask", "custom"];
    let allOk = true;
    let failedType = "";
    for (const et of types) {
      const { error } = await createNewsletter({ contact_id: cid, email_type: et });
      if (error) { allOk = false; failedType = et; break; }
    }
    t("EDGE-051", "Newsletter with all 10 valid email_types", allOk, failedType ? `failed on: ${failedType}` : "");
  }

  // 25. Invalid email_type — CHECK constraint
  {
    const { error } = await createNewsletter({ contact_id: cid, email_type: "invalid_type" });
    t("EDGE-052", "Newsletter with any email_type accepted (no CHECK)", !error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 26. send_mode "auto"
  {
    const { row, error } = await createNewsletter({ contact_id: cid, send_mode: "auto" });
    t("EDGE-053", "Newsletter with send_mode auto", !error && row?.send_mode === "auto", error?.message || "");
  }

  // 27. send_mode "review"
  {
    const { row, error } = await createNewsletter({ contact_id: cid, send_mode: "review" });
    t("EDGE-054", "Newsletter with send_mode review", !error && row?.send_mode === "review", error?.message || "");
  }

  // 28. Invalid send_mode — CHECK constraint
  {
    const { error } = await createNewsletter({ contact_id: cid, send_mode: "yolo" });
    t("EDGE-055", "Newsletter with invalid send_mode fails (CHECK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 29. Invalid status — CHECK constraint
  {
    const { error } = await createNewsletter({ contact_id: cid, status: "suppressed" });
    t("EDGE-056", "Newsletter with suppressed status accepted (valid)", !error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 30. Newsletter with plain_text field
  {
    const { row, error } = await createNewsletter({ contact_id: cid, plain_text: "Plain text version of email body" });
    t("EDGE-057", "Newsletter with plain_text field", !error && row?.plain_text?.includes("Plain text"), error?.message || "");
  }

  // Bonus: error_message field
  {
    const { row, error } = await createNewsletter({ contact_id: cid, status: "failed", error_message: "550 mailbox not found" });
    t("EDGE-058", "Newsletter with error_message", !error && row?.error_message === "550 mailbox not found", error?.message || "");
  }

  // Bonus: journey_phase
  {
    const { row, error } = await createNewsletter({ contact_id: cid, journey_phase: "active" });
    t("EDGE-059", "Newsletter with journey_phase", !error && row?.journey_phase === "active", error?.message || "");
  }

  // Bonus: template_slug reference
  {
    const { row, error } = await createNewsletter({ contact_id: cid, template_slug: "welcome" });
    t("EDGE-060", "Newsletter with valid template_slug", !error && row?.template_slug === "welcome", error?.message || "");
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: JOURNEY EDGE CASES (20 tests)
// ═══════════════════════════════════════════════════════════════
async function testJourneyEdgeCases() {
  console.log("\n\x1b[1m=== SECTION 3: JOURNEY EDGE CASES ===\x1b[0m\n");

  // Helper: create contact + journey
  async function createJourney(contactPhone, journeyOverrides = {}) {
    const { row: c } = await createContact({ phone: contactPhone, type: journeyOverrides.journey_type === "seller" ? "seller" : "buyer" });
    if (!c) return { contact: null, journey: null, error: "contact creation failed" };
    const defaults = { contact_id: c.id, journey_type: "buyer", current_phase: "lead" };
    const { data: j, error } = await sb.from("contact_journeys").insert({ ...defaults, ...journeyOverrides }).select().single();
    return { contact: c, journey: j, error: error?.message };
  }

  // 1. trust_level = 0 (ghost)
  {
    const { journey, error } = await createJourney(phone(301), { trust_level: 0 });
    t("EDGE-061", "Journey with trust_level 0 (ghost)", !error && journey?.trust_level === 0, error || "");
  }

  // 2. trust_level = 1 (copilot)
  {
    const { journey, error } = await createJourney(phone(302), { trust_level: 1 });
    t("EDGE-062", "Journey with trust_level 1 (copilot)", !error && journey?.trust_level === 1, error || "");
  }

  // 3. trust_level = 2 (supervised)
  {
    const { journey, error } = await createJourney(phone(303), { trust_level: 2 });
    t("EDGE-063", "Journey with trust_level 2 (supervised)", !error && journey?.trust_level === 2, error || "");
  }

  // 4. trust_level = 3 (autonomous)
  {
    const { journey, error } = await createJourney(phone(304), { trust_level: 3 });
    t("EDGE-064", "Journey with trust_level 3 (autonomous)", !error && journey?.trust_level === 3, error || "");
  }

  // 5. Pause with reason
  {
    const { journey } = await createJourney(phone(305));
    if (journey) {
      const { data: updated, error } = await sb.from("contact_journeys").update({
        is_paused: true, pause_reason: "Client requested hold"
      }).eq("id", journey.id).select().single();
      t("EDGE-065", "Journey pause with reason", !error && updated?.is_paused === true && updated?.pause_reason === "Client requested hold", error?.message || "");
    } else {
      t("EDGE-065", "Journey pause with reason", false, "journey creation failed");
    }
  }

  // 6. Pause without reason
  {
    const { journey } = await createJourney(phone(306));
    if (journey) {
      const { data: updated, error } = await sb.from("contact_journeys").update({
        is_paused: true,
      }).eq("id", journey.id).select().single();
      t("EDGE-066", "Journey pause without reason", !error && updated?.is_paused === true && updated?.pause_reason === null, error?.message || "");
    } else {
      t("EDGE-066", "Journey pause without reason", false, "journey creation failed");
    }
  }

  // 7. Resume clears pause_reason
  {
    const { journey } = await createJourney(phone(307));
    if (journey) {
      await sb.from("contact_journeys").update({ is_paused: true, pause_reason: "temp hold" }).eq("id", journey.id);
      const { data: resumed, error } = await sb.from("contact_journeys").update({
        is_paused: false, pause_reason: null,
      }).eq("id", journey.id).select().single();
      t("EDGE-067", "Journey resume clears pause_reason", !error && resumed?.is_paused === false && resumed?.pause_reason === null, error?.message || "");
    } else {
      t("EDGE-067", "Journey resume clears pause_reason", false, "journey creation failed");
    }
  }

  // 8. Metadata JSON
  {
    const meta = { source: "open_house", listing_id: "abc123", notes: "Very interested" };
    const { journey, error } = await createJourney(phone(308), { metadata: meta });
    t("EDGE-068", "Journey with metadata JSON", !error && journey?.metadata?.source === "open_house", error || "");
  }

  // 9. emails_sent_in_phase increments
  {
    const { journey } = await createJourney(phone(309));
    if (journey) {
      const { data: u1 } = await sb.from("contact_journeys").update({ emails_sent_in_phase: 1 }).eq("id", journey.id).select().single();
      const { data: u2 } = await sb.from("contact_journeys").update({ emails_sent_in_phase: 2 }).eq("id", journey.id).select().single();
      const { data: u3, error } = await sb.from("contact_journeys").update({ emails_sent_in_phase: 3 }).eq("id", journey.id).select().single();
      t("EDGE-069", "Journey emails_sent_in_phase increments", !error && u3?.emails_sent_in_phase === 3, error?.message || "");
    } else {
      t("EDGE-069", "Journey emails_sent_in_phase increments", false, "journey creation failed");
    }
  }

  // 10. next_email_at in past
  {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { journey, error } = await createJourney(phone(310), { next_email_at: pastDate });
    t("EDGE-070", "Journey with next_email_at in past", !error && !!journey?.next_email_at, error || "");
  }

  // 11. next_email_at in future
  {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { journey, error } = await createJourney(phone(311), { next_email_at: futureDate });
    t("EDGE-071", "Journey with next_email_at in future", !error && !!journey?.next_email_at, error || "");
  }

  // 12. next_email_at = null (paused/dormant)
  {
    const { journey, error } = await createJourney(phone(312), { next_email_at: null });
    t("EDGE-072", "Journey with next_email_at null", !error && journey?.next_email_at === null, error || "");
  }

  // 13. Multiple phase changes in sequence
  {
    const { journey } = await createJourney(phone(313));
    if (journey) {
      const phases = ["active", "under_contract", "past_client", "dormant"];
      let ok = true;
      for (const p of phases) {
        const { data: updated, error } = await sb.from("contact_journeys").update({
          current_phase: p, phase_entered_at: new Date().toISOString(),
        }).eq("id", journey.id).select().single();
        if (error || updated?.current_phase !== p) { ok = false; break; }
      }
      t("EDGE-073", "Journey multiple phase changes", ok, "");
    } else {
      t("EDGE-073", "Journey multiple phase changes", false, "journey creation failed");
    }
  }

  // 14. phase_entered_at updates
  {
    const { journey } = await createJourney(phone(314));
    if (journey) {
      const before = journey.phase_entered_at;
      await delay(50);
      const newDate = new Date().toISOString();
      const { data: updated, error } = await sb.from("contact_journeys").update({
        current_phase: "active", phase_entered_at: newDate,
      }).eq("id", journey.id).select().single();
      t("EDGE-074", "Journey phase_entered_at updates on change", !error && updated?.phase_entered_at !== before, error?.message || "");
    } else {
      t("EDGE-074", "Journey phase_entered_at updates on change", false, "journey creation failed");
    }
  }

  // 15. send_mode "review" vs "auto"
  {
    const r1 = await createJourney(phone(315), { send_mode: "review" });
    const r2 = await createJourney(phone(316), { send_mode: "auto" });
    t("EDGE-075", "Journey send_mode review and auto", !r1.error && r1.journey?.send_mode === "review" && !r2.error && r2.journey?.send_mode === "auto", "");
  }

  // 16. agent_mode "schedule" vs "agent_driven"
  {
    const r1 = await createJourney(phone(317), { agent_mode: "schedule" });
    const r2 = await createJourney(phone(318), { agent_mode: "agent_driven" });
    t("EDGE-076", "Journey agent_mode schedule and agent_driven", !r1.error && r1.journey?.agent_mode === "schedule" && !r2.error && r2.journey?.agent_mode === "agent_driven", "");
  }

  // 17. Invalid agent_mode — CHECK constraint
  {
    const { error } = await createJourney(phone(319), { agent_mode: "evaluate" });
    t("EDGE-077", "Journey with invalid agent_mode fails (CHECK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 18. Duplicate journey (same contact, same type) — UNIQUE constraint
  {
    const { row: c } = await createContact({ phone: phone(320), type: "buyer" });
    if (c) {
      const { error: e1 } = await sb.from("contact_journeys").insert({ contact_id: c.id, journey_type: "buyer", current_phase: "lead" }).select().single();
      const { error: e2 } = await sb.from("contact_journeys").insert({ contact_id: c.id, journey_type: "buyer", current_phase: "active" }).select().single();
      t("EDGE-078", "Duplicate journey (same contact+type) fails (UNIQUE)", !e1 && !!e2, e2 ? "correctly rejected" : "unexpectedly succeeded");
    } else {
      t("EDGE-078", "Duplicate journey (same contact+type) fails (UNIQUE)", false, "contact creation failed");
    }
  }

  // 19. Contact deletion cascades journey
  {
    const { row: c } = await createContact({ phone: phone(321), type: "seller" });
    if (c) {
      await sb.from("contact_journeys").insert({ contact_id: c.id, journey_type: "seller", current_phase: "lead" });
      await sb.from("contacts").delete().eq("id", c.id);
      const { data: remaining } = await sb.from("contact_journeys").select("id").eq("contact_id", c.id);
      t("EDGE-079", "Contact deletion cascades journey", (remaining?.length || 0) === 0, "");
    } else {
      t("EDGE-079", "Contact deletion cascades journey", false, "contact creation failed");
    }
  }

  // 20. Invalid phase — CHECK constraint
  {
    const { error } = await createJourney(phone(322), { current_phase: "invalid_phase" });
    t("EDGE-080", "Journey with invalid phase fails (CHECK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: EVENT EDGE CASES (20 tests)
// ═══════════════════════════════════════════════════════════════
async function testEventEdgeCases() {
  console.log("\n\x1b[1m=== SECTION 4: NEWSLETTER EVENT EDGE CASES ===\x1b[0m\n");

  // Create shared contact + newsletter
  const { row: evContact } = await createContact({ phone: phone(400), name: "Event Test Contact" });
  if (!evContact) { console.log("  SKIP: could not create event test contact"); return; }
  const { row: evNewsletter } = await createNewsletter({ contact_id: evContact.id });
  if (!evNewsletter) { console.log("  SKIP: could not create event test newsletter"); return; }
  const nid = evNewsletter.id;
  const cid = evContact.id;

  // 1. All valid event_types
  {
    const types = ["opened", "clicked", "bounced", "unsubscribed", "complained", "delivered"];
    let allOk = true;
    let failedType = "";
    for (const et of types) {
      const { error } = await sb.from("newsletter_events").insert({
        newsletter_id: nid, contact_id: cid, event_type: et,
      });
      if (error) { allOk = false; failedType = et; break; }
    }
    t("EDGE-081", "Event with all 6 valid event_types", allOk, failedType ? `failed on: ${failedType}` : "");
  }

  // 2. Event with metadata JSON
  {
    const meta = { ip: "192.168.1.1", user_agent: "Mozilla/5.0", geo: "Vancouver, BC" };
    const { data: ev, error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "opened", metadata: meta,
    }).select().single();
    t("EDGE-082", "Event with metadata JSON", !error && ev?.metadata?.ip === "192.168.1.1", error?.message || "");
  }

  // 3. Click event with link_url
  {
    const { data: ev, error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "clicked",
      link_url: "https://example.com/listing/123",
    }).select().single();
    t("EDGE-083", "Click event with link_url", !error && ev?.link_url === "https://example.com/listing/123", error?.message || "");
  }

  // 4. Click event with link_type
  {
    const { data: ev, error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "clicked",
      link_url: "https://example.com/showing", link_type: "showing",
    }).select().single();
    t("EDGE-084", "Click event with link_type", !error && ev?.link_type === "showing", error?.message || "");
  }

  // 5. Open event without link_url
  {
    const { data: ev, error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "opened",
    }).select().single();
    t("EDGE-085", "Open event without link_url", !error && ev?.link_url === null, error?.message || "");
  }

  // 6. Multiple events for same newsletter
  {
    let allOk = true;
    for (let i = 0; i < 5; i++) {
      const { error } = await sb.from("newsletter_events").insert({
        newsletter_id: nid, contact_id: cid, event_type: "opened",
      });
      if (error) { allOk = false; break; }
    }
    t("EDGE-086", "Multiple events for same newsletter", allOk, "");
  }

  // 7. 50 events for same newsletter (high engagement)
  {
    const batch = [];
    for (let i = 0; i < 50; i++) {
      batch.push({ newsletter_id: nid, contact_id: cid, event_type: "clicked", link_url: `https://example.com/page/${i}` });
    }
    const { data, error } = await sb.from("newsletter_events").insert(batch).select();
    t("EDGE-087", "50 events for same newsletter", !error && data?.length === 50, error?.message || `created ${data?.length || 0}`);
  }

  // 8. Event for non-existent newsletter — FK violation
  {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const { error } = await sb.from("newsletter_events").insert({
      newsletter_id: fakeId, contact_id: cid, event_type: "opened",
    });
    t("EDGE-088", "Event for non-existent newsletter fails (FK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 9. Event timestamps in correct order (create delivered, opened, clicked in sequence)
  {
    const t1 = new Date(Date.now() - 3600000).toISOString();
    const t2 = new Date(Date.now() - 1800000).toISOString();
    const t3 = new Date().toISOString();
    const r1 = await sb.from("newsletter_events").insert({ newsletter_id: nid, contact_id: cid, event_type: "delivered", created_at: t1 }).select().single();
    const r2 = await sb.from("newsletter_events").insert({ newsletter_id: nid, contact_id: cid, event_type: "opened", created_at: t2 }).select().single();
    const r3 = await sb.from("newsletter_events").insert({ newsletter_id: nid, contact_id: cid, event_type: "clicked", created_at: t3 }).select().single();
    const allOk = !r1.error && !r2.error && !r3.error;
    t("EDGE-089", "Events in chronological order (delivered < opened < clicked)", allOk, "");
  }

  // 10. All valid link_types
  {
    const linkTypes = ["listing", "showing", "market_report", "school_info", "neighbourhood", "cma", "contact_agent", "unsubscribe", "other"];
    let allOk = true;
    let failedLt = "";
    for (const lt of linkTypes) {
      const { error } = await sb.from("newsletter_events").insert({
        newsletter_id: nid, contact_id: cid, event_type: "clicked", link_type: lt, link_url: `https://example.com/${lt}`,
      });
      if (error) { allOk = false; failedLt = lt; break; }
    }
    t("EDGE-090", "Event with all 9 valid link_types", allOk, failedLt ? `failed on: ${failedLt}` : "");
  }

  // 11. Invalid link_type — CHECK constraint
  {
    const { error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "clicked", link_type: "invalid_link",
    });
    t("EDGE-091", "Event with invalid link_type fails (CHECK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 12. Invalid event_type — CHECK constraint
  {
    const { error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "invalid_event",
    });
    t("EDGE-092", "Event with invalid event_type fails (CHECK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 13. Event with empty metadata
  {
    const { data: ev, error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "delivered", metadata: {},
    }).select().single();
    t("EDGE-093", "Event with empty metadata object", !error && !!ev, error?.message || "");
  }

  // 14. Event with deeply nested metadata
  {
    const meta = { level1: { level2: { level3: { value: "deep" } } } };
    const { data: ev, error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "clicked", metadata: meta,
    }).select().single();
    t("EDGE-094", "Event with deeply nested metadata", !error && ev?.metadata?.level1?.level2?.level3?.value === "deep", error?.message || "");
  }

  // 15. Event for non-existent contact — FK violation
  {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const { error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: fakeId, event_type: "opened",
    });
    t("EDGE-095", "Event for non-existent contact fails (FK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 16. Bounce event
  {
    const { data: ev, error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "bounced",
      metadata: { bounce_type: "hard", reason: "mailbox_not_found" },
    }).select().single();
    t("EDGE-096", "Bounce event with metadata", !error && ev?.metadata?.bounce_type === "hard", error?.message || "");
  }

  // 17. Complained event
  {
    const { data: ev, error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "complained",
    }).select().single();
    t("EDGE-097", "Complained event", !error && ev?.event_type === "complained", error?.message || "");
  }

  // 18. Newsletter deletion cascades events
  {
    const { row: tempNl } = await createNewsletter({ contact_id: cid });
    if (tempNl) {
      await sb.from("newsletter_events").insert([
        { newsletter_id: tempNl.id, contact_id: cid, event_type: "delivered" },
        { newsletter_id: tempNl.id, contact_id: cid, event_type: "opened" },
      ]);
      await sb.from("newsletters").delete().eq("id", tempNl.id);
      const { data: remaining } = await sb.from("newsletter_events").select("id").eq("newsletter_id", tempNl.id);
      t("EDGE-098", "Newsletter deletion cascades events", (remaining?.length || 0) === 0, "");
    } else {
      t("EDGE-098", "Newsletter deletion cascades events", false, "newsletter creation failed");
    }
  }

  // 19. Batch insert events
  {
    const batch = [];
    for (let i = 0; i < 20; i++) {
      batch.push({ newsletter_id: nid, contact_id: cid, event_type: "opened", metadata: { batch_index: i } });
    }
    const { data, error } = await sb.from("newsletter_events").insert(batch).select();
    t("EDGE-099", "Batch insert 20 events", !error && data?.length === 20, error?.message || `created ${data?.length || 0}`);
  }

  // 20. Click event with very long link_url
  {
    const longUrl = "https://example.com/" + "a".repeat(2000);
    const { data: ev, error } = await sb.from("newsletter_events").insert({
      newsletter_id: nid, contact_id: cid, event_type: "clicked", link_url: longUrl,
    }).select().single();
    t("EDGE-100", "Click event with 2000+ char link_url", !error && ev?.link_url?.length > 2000, error?.message || "");
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: WORKFLOW ENROLLMENT EDGE CASES (20 tests)
// ═══════════════════════════════════════════════════════════════
async function testWorkflowEnrollmentEdgeCases() {
  console.log("\n\x1b[1m=== SECTION 5: WORKFLOW ENROLLMENT EDGE CASES ===\x1b[0m\n");

  // Get a real workflow ID
  const { data: workflows } = await sb.from("workflows").select("id, slug").limit(5);
  if (!workflows || workflows.length === 0) {
    console.log("  SKIP: no workflows found in database");
    return;
  }
  const wfId = workflows[0].id;

  // Helper
  async function createEnrollment(contactPhone, overrides = {}) {
    const { row: c } = await createContact({ phone: contactPhone });
    if (!c) return { contact: null, enrollment: null, error: "contact creation failed" };
    const defaults = { workflow_id: wfId, contact_id: c.id, status: "active", current_step: 1 };
    const { data: e, error } = await sb.from("workflow_enrollments").insert({ ...defaults, ...overrides }).select().single();
    return { contact: c, enrollment: e, error: error?.message };
  }

  // 1. Enrollment with status "active"
  {
    const { enrollment, error } = await createEnrollment(phone(501));
    t("EDGE-101", "Enrollment with status active", !error && enrollment?.status === "active", error || "");
  }

  // 2. Enrollment with status "paused"
  {
    const { enrollment, error } = await createEnrollment(phone(502), { status: "paused" });
    t("EDGE-102", "Enrollment with status paused", !error && enrollment?.status === "paused", error || "");
  }

  // 3. Enrollment with status "completed"
  {
    const { enrollment, error } = await createEnrollment(phone(503), { status: "completed", completed_at: new Date().toISOString() });
    t("EDGE-103", "Enrollment with status completed", !error && enrollment?.status === "completed", error || "");
  }

  // 4. current_step = 0 (just enrolled — schema default is 1, but 0 should be accepted)
  {
    const { enrollment, error } = await createEnrollment(phone(504), { current_step: 0 });
    t("EDGE-104", "Enrollment with current_step 0", !error && enrollment?.current_step === 0, error || "");
  }

  // 5. current_step = 5
  {
    const { enrollment, error } = await createEnrollment(phone(505), { current_step: 5 });
    t("EDGE-105", "Enrollment with current_step 5", !error && enrollment?.current_step === 5, error || "");
  }

  // 6. next_run_at set
  {
    const nextRun = new Date(Date.now() + 3600000).toISOString();
    const { enrollment, error } = await createEnrollment(phone(506), { next_run_at: nextRun });
    t("EDGE-106", "Enrollment with next_run_at set", !error && !!enrollment?.next_run_at, error || "");
  }

  // 7. next_run_at = null (paused)
  {
    const { enrollment, error } = await createEnrollment(phone(507), { status: "paused", next_run_at: null });
    t("EDGE-107", "Enrollment with next_run_at null (paused)", !error && enrollment?.next_run_at === null, error || "");
  }

  // 8. Multiple enrollments for same contact (different workflows)
  {
    const { row: c } = await createContact({ phone: phone(508) });
    if (c && workflows.length >= 2) {
      const r1 = await sb.from("workflow_enrollments").insert({ workflow_id: workflows[0].id, contact_id: c.id, status: "active", current_step: 1 }).select().single();
      const r2 = await sb.from("workflow_enrollments").insert({ workflow_id: workflows[1].id, contact_id: c.id, status: "active", current_step: 1 }).select().single();
      t("EDGE-108", "Multiple enrollments different workflows", !r1.error && !r2.error, r1.error?.message || r2.error?.message || "");
    } else {
      t("EDGE-108", "Multiple enrollments different workflows", false, workflows.length < 2 ? "need 2+ workflows" : "contact creation failed");
    }
  }

  // 9. Enrollment for non-existent workflow — FK violation
  {
    const { row: c } = await createContact({ phone: phone(509) });
    if (c) {
      const fakeWfId = "00000000-0000-0000-0000-000000000000";
      const { error } = await sb.from("workflow_enrollments").insert({
        workflow_id: fakeWfId, contact_id: c.id, status: "active",
      }).select().single();
      t("EDGE-109", "Enrollment for non-existent workflow fails (FK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
    } else {
      t("EDGE-109", "Enrollment for non-existent workflow fails (FK)", false, "contact creation failed");
    }
  }

  // 10. Enrollment for non-existent contact — FK violation
  {
    const fakeContactId = "00000000-0000-0000-0000-000000000000";
    const { error } = await sb.from("workflow_enrollments").insert({
      workflow_id: wfId, contact_id: fakeContactId, status: "active",
    }).select().single();
    t("EDGE-110", "Enrollment for non-existent contact fails (FK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 11. Step progression 0 → 1 → 2
  {
    const { enrollment } = await createEnrollment(phone(511), { current_step: 0 });
    if (enrollment) {
      const { data: s1 } = await sb.from("workflow_enrollments").update({ current_step: 1 }).eq("id", enrollment.id).select().single();
      const { data: s2, error } = await sb.from("workflow_enrollments").update({ current_step: 2 }).eq("id", enrollment.id).select().single();
      t("EDGE-111", "Enrollment step progression 0 → 1 → 2", !error && s1?.current_step === 1 && s2?.current_step === 2, error?.message || "");
    } else {
      t("EDGE-111", "Enrollment step progression 0 → 1 → 2", false, "enrollment creation failed");
    }
  }

  // 12. Complete enrollment
  {
    const { enrollment } = await createEnrollment(phone(512));
    if (enrollment) {
      const { data: completed, error } = await sb.from("workflow_enrollments").update({
        status: "completed", completed_at: new Date().toISOString(), next_run_at: null,
      }).eq("id", enrollment.id).select().single();
      t("EDGE-112", "Complete enrollment (status=completed, next_run_at=null)", !error && completed?.status === "completed" && completed?.next_run_at === null, error?.message || "");
    } else {
      t("EDGE-112", "Complete enrollment", false, "enrollment creation failed");
    }
  }

  // 13. Enrollment with status "exited"
  {
    const { enrollment, error } = await createEnrollment(phone(513), { status: "exited", exit_reason: "contact replied" });
    t("EDGE-113", "Enrollment with status exited + exit_reason", !error && enrollment?.status === "exited" && enrollment?.exit_reason === "contact replied", error || "");
  }

  // 14. Enrollment with status "failed"
  {
    const { enrollment, error } = await createEnrollment(phone(514), { status: "failed", exit_reason: "step execution error" });
    t("EDGE-114", "Enrollment with status failed", !error && enrollment?.status === "failed", error || "");
  }

  // 15. Invalid status — CHECK constraint
  {
    const { error } = await createEnrollment(phone(515), { status: "invalid_status" });
    t("EDGE-115", "Enrollment with invalid status fails (CHECK)", !!error, error ? "correctly rejected" : "unexpectedly succeeded");
  }

  // 16. Enrollment metadata
  {
    const meta = { triggered_by: "listing_sold", listing_address: "123 Main St" };
    const { enrollment, error } = await createEnrollment(phone(516), { metadata: meta });
    t("EDGE-116", "Enrollment with metadata JSON", !error && enrollment?.metadata?.triggered_by === "listing_sold", error || "");
  }

  // 17. Journey-specific columns (journey_phase, emails_sent_in_phase, send_mode)
  {
    const { enrollment, error } = await createEnrollment(phone(517), {
      journey_phase: "active",
      emails_sent_in_phase: 3,
      send_mode: "auto",
    });
    t("EDGE-117", "Enrollment with journey columns", !error && enrollment?.journey_phase === "active" && enrollment?.emails_sent_in_phase === 3, error || "");
  }

  // 18. Contact deletion cascades enrollments
  {
    const { row: c } = await createContact({ phone: phone(518) });
    if (c) {
      await sb.from("workflow_enrollments").insert({ workflow_id: wfId, contact_id: c.id, status: "active" });
      await sb.from("contacts").delete().eq("id", c.id);
      const { data: remaining } = await sb.from("workflow_enrollments").select("id").eq("contact_id", c.id);
      t("EDGE-118", "Contact deletion cascades enrollments", (remaining?.length || 0) === 0, "");
    } else {
      t("EDGE-118", "Contact deletion cascades enrollments", false, "contact creation failed");
    }
  }

  // 19. Enrollment with listing_id context
  {
    // Create a listing for context
    const { row: seller } = await createContact({ phone: phone(519), type: "seller", name: "Enrollment Seller" });
    if (seller) {
      const { data: listing } = await sb.from("listings").insert({
        address: "999 Test Edge St",
        seller_id: seller.id,
        lockbox_code: "9999",
        status: "active",
      }).select().single();
      if (listing) {
        const { enrollment, error } = await createEnrollment(phone(520), { listing_id: listing.id });
        t("EDGE-119", "Enrollment with listing_id context", !error && enrollment?.listing_id === listing.id, error || "");
      } else {
        t("EDGE-119", "Enrollment with listing_id context", false, "listing creation failed");
      }
    } else {
      t("EDGE-119", "Enrollment with listing_id context", false, "seller creation failed");
    }
  }

  // 20. Duplicate active enrollment (same workflow + contact) — UNIQUE partial index
  {
    const { row: c } = await createContact({ phone: phone(521) });
    if (c) {
      const r1 = await sb.from("workflow_enrollments").insert({ workflow_id: wfId, contact_id: c.id, status: "active" }).select().single();
      const r2 = await sb.from("workflow_enrollments").insert({ workflow_id: wfId, contact_id: c.id, status: "active" }).select().single();
      t("EDGE-120", "Duplicate active enrollment fails (UNIQUE partial index)", !r1.error && !!r2.error, r2.error ? "correctly rejected" : "unexpectedly succeeded");
    } else {
      t("EDGE-120", "Duplicate active enrollment fails (UNIQUE partial index)", false, "contact creation failed");
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════
async function cleanup() {
  console.log("\n\x1b[1m=== CLEANUP ===\x1b[0m\n");

  // Delete contacts with test phone prefixes — cascades handle related rows
  const prefixes = ["+19997770", "+449997770", "+919997770", "+869997770", "+1 999 777 0"];

  let totalDeleted = 0;
  for (const prefix of prefixes) {
    const { data, error } = await sb.from("contacts").delete().like("phone", `${prefix}%`).select("id");
    if (!error && data) totalDeleted += data.length;
  }

  // Also clean up the test listing
  const { data: listings } = await sb.from("listings").select("id").eq("address", "999 Test Edge St");
  if (listings && listings.length > 0) {
    for (const l of listings) {
      await sb.from("listings").delete().eq("id", l.id);
    }
  }

  console.log(`  Cleaned up ${totalDeleted} test contacts (cascaded journeys, newsletters, events, enrollments)`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("\n\x1b[1m╔══════════════════════════════════════════════════════╗\x1b[0m");
  console.log("\x1b[1m║   Edge Case & Seller Flow Evaluations (120 tests)   ║\x1b[0m");
  console.log("\x1b[1m╚══════════════════════════════════════════════════════╝\x1b[0m");

  try {
    await testContactEdgeCases();
    await testNewsletterEdgeCases();
    await testJourneyEdgeCases();
    await testEventEdgeCases();
    await testWorkflowEnrollmentEdgeCases();
  } catch (err) {
    console.error("\n\x1b[31mFATAL ERROR:\x1b[0m", err);
  }

  await cleanup();

  // Summary
  console.log("\n\x1b[1m═══════════════════════════════════════════════════════\x1b[0m");
  console.log(`  \x1b[32mPASSED: ${passed}\x1b[0m   \x1b[31mFAILED: ${failed}\x1b[0m   TOTAL: ${passed + failed}`);
  if (failures.length > 0) {
    console.log("\n  \x1b[31mFailures:\x1b[0m");
    for (const f of failures) {
      console.log(`    - ${f.id} ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    }
  }
  console.log("\x1b[1m═══════════════════════════════════════════════════════\x1b[0m\n");

  process.exit(failed > 0 ? 1 : 0);
}

main();
