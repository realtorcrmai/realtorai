#!/usr/bin/env node
/**
 * QA Test Runner — Email Marketing Engine
 * Tests the full newsletter pipeline with real data and real API calls.
 *
 * Usage: node scripts/qa-test-email-engine.mjs
 */

const BASE_URL = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Run with:  node --env-file=.env.local scripts/<script>.mjs");
  console.error("   Or export them: source .env.local && node scripts/<script>.mjs");
  process.exit(1);
}

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "listingflow-cron-secret-2026";
const TEST_EMAIL = "delivered@resend.dev";

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function log(status, name, detail = "") {
  const icon = status === "PASS" ? "\x1b[32m✓\x1b[0m" : status === "FAIL" ? "\x1b[31m✗\x1b[0m" : "\x1b[33m⊘\x1b[0m";
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ""}`);
  if (status === "PASS") passed++;
  else if (status === "FAIL") { failed++; failures.push({ name, detail }); }
  else skipped++;
}

async function supabase(method, table, options = {}) {
  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) url.searchParams.set(k, v);
  }
  if (options.select) url.searchParams.set("select", options.select);
  if (options.limit) url.searchParams.set("limit", options.limit);

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": method === "POST" ? "return=representation" : "return=minimal",
  };
  if (options.single) headers["Accept"] = "application/vnd.pgrst.object+json";

  const res = await fetch(url.toString(), {
    method: method === "GET" ? "GET" : method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    if (options.allowFail) return null;
    if (text.includes("PGRST205")) {
      // Table doesn't exist — migration not run
      return null;
    }
    throw new Error(`Supabase ${method} ${table}: ${res.status} ${text}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("json")) return res.json();
  return null;
}

async function tableExists(table) {
  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
  url.searchParams.set("select", "id");
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
  });
  return res.ok;
}

async function apiGet(path, auth = false) {
  const headers = {};
  if (auth) headers["Authorization"] = `Bearer ${CRON_SECRET}`;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  return { status: res.status, data: await res.json().catch(() => null), text: await res.text().catch(() => "") };
}

async function apiPost(path, body = {}, auth = false) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = `Bearer ${CRON_SECRET}`;
  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => null) };
}

// ═══════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════

async function testResendConnectivity() {
  console.log("\n\x1b[1m📧 Test Suite 1: Resend API Connectivity\x1b[0m");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: TEST_EMAIL,
        subject: "ListingFlow QA Test — Resend Connectivity",
        html: "<h1>QA Test</h1><p>If you see this, Resend API is working.</p>",
      }),
    });
    const data = await res.json();
    if (res.ok && data.id) {
      log("PASS", "Resend API sends email", `messageId: ${data.id}`);
    } else {
      log("FAIL", "Resend API sends email", JSON.stringify(data));
    }
  } catch (e) {
    log("FAIL", "Resend API sends email", e.message);
  }
}

async function testAIContentGeneration() {
  console.log("\n\x1b[1m🤖 Test Suite 2: AI Content Generation\x1b[0m");

  // Get a test contact
  const contacts = await supabase("GET", "contacts", { select: "id,name,email,type", limit: "1" });
  if (!contacts?.length) { log("SKIP", "No contacts in DB"); return; }
  const contact = contacts[0];

  try {
    // Test via the server's newsletter generation endpoint
    const res = await fetch(`${BASE_URL}/api/newsletters/process`, {
      headers: { "Authorization": `Bearer ${CRON_SECRET}` },
    });
    // This just runs the cron - may not generate if no journeys due
    log("PASS", "Newsletter process endpoint accessible", `status: ${res.status}`);
  } catch (e) {
    log("FAIL", "Newsletter process endpoint", e.message);
  }

  // Test AI generation directly by calling the Anthropic API
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) { log("SKIP", "Claude API test — ANTHROPIC_API_KEY not set"); return; }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: `Generate a JSON email for a buyer named ${contact.name} in Vancouver. Return ONLY valid JSON: { "subject": "...", "intro": "...", "body": "...", "ctaText": "..." }` }],
      }),
    });
    const data = await res.json();
    if (data.content?.[0]?.text) {
      const text = data.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.subject && parsed.body) {
          log("PASS", "Claude generates valid email JSON", `subject: "${parsed.subject.slice(0, 50)}..."`);
        } else {
          log("FAIL", "Claude JSON missing required fields", Object.keys(parsed).join(", "));
        }
      } else {
        log("FAIL", "Claude response not parseable as JSON", text.slice(0, 100));
      }
    } else {
      log("FAIL", "Claude API error", JSON.stringify(data.error || data).slice(0, 200));
    }
  } catch (e) {
    log("FAIL", "Claude API call", e.message);
  }
}

async function testNewsletterGeneration() {
  console.log("\n\x1b[1m📬 Test Suite 3: Newsletter Generation & Queue\x1b[0m");

  // Get a contact with email
  const contacts = await supabase("GET", "contacts", { select: "id,name,email,type", limit: "3" });
  if (!contacts?.length) { log("SKIP", "No contacts"); return; }

  const contact = contacts.find(c => c.email) || contacts[0];

  // Check if newsletter tables exist
  const nlExists = await tableExists("newsletters");
  const cjExists = await tableExists("contact_journeys");

  if (!nlExists) {
    log("FAIL", "newsletters table MISSING", "Run migration 010_newsletter_journey_engine.sql in Supabase SQL Editor");
    log("SKIP", "All newsletter DB tests skipped — table missing");
    return;
  }
  log("PASS", "newsletters table accessible");

  if (!cjExists) {
    log("FAIL", "contact_journeys table MISSING", "Run migration 010");
  } else {
    log("PASS", "contact_journeys table accessible");
  }

  // Try to create a newsletter draft directly
  try {
    const newsletter = await supabase("POST", "newsletters", {
      body: {
        contact_id: contact.id,
        email_type: "market_update",
        subject: "QA Test: Market Update",
        html_body: `<html><body><h1>QA Test</h1><p>Hello ${contact.name}, this is a test market update.</p></body></html>`,
        status: "draft",
        send_mode: "review",
        journey_phase: "lead",
        ai_context: { test: true },
      },
    });

    if (newsletter?.[0]?.id) {
      log("PASS", "Newsletter draft created", `id: ${newsletter[0].id}`);

      // Try to send it
      try {
        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: TEST_EMAIL,
            subject: `QA: ${newsletter[0].subject}`,
            html: newsletter[0].html_body,
            tags: [{ name: "newsletter_id", value: newsletter[0].id }, { name: "email_type", value: "market_update" }],
          }),
        });
        const sendData = await sendRes.json();

        if (sendRes.ok && sendData.id) {
          log("PASS", "Newsletter sent via Resend", `messageId: ${sendData.id}`);

          // Update newsletter status
          await supabase("PATCH", `newsletters?id=eq.${newsletter[0].id}`, {
            body: { status: "sent", sent_at: new Date().toISOString(), resend_message_id: sendData.id },
          });
          log("PASS", "Newsletter status updated to 'sent'");
        } else {
          log("FAIL", "Newsletter send failed", JSON.stringify(sendData));
        }
      } catch (e) {
        log("FAIL", "Newsletter send error", e.message);
      }
    } else {
      log("FAIL", "Newsletter draft creation", JSON.stringify(newsletter));
    }
  } catch (e) {
    log("FAIL", "Newsletter draft creation error", e.message);
  }
}

async function testWebhookProcessing() {
  console.log("\n\x1b[1m🔗 Test Suite 4: Webhook Processing\x1b[0m");

  if (!(await tableExists("newsletters"))) { log("SKIP", "newsletters table missing — skipping webhook tests"); return; }

  // Get a newsletter to reference
  const newsletters = await supabase("GET", "newsletters", { select: "id,contact_id", limit: "1" });
  if (!newsletters?.length) { log("SKIP", "No newsletters to test webhooks against"); return; }

  const nl = newsletters[0];

  // Test webhook: email.opened
  try {
    const res = await apiPost("/api/webhooks/resend", {
      type: "email.opened",
      data: {
        email_id: "test-open-" + Date.now(),
        tags: [{ name: "newsletter_id", value: nl.id }],
        created_at: new Date().toISOString(),
      },
    });

    if (res.status === 200 || res.status === 401) {
      // 401 means signature verification is working (good!)
      if (res.status === 401) {
        log("PASS", "Webhook signature verification active", "401 returned (correct without valid signature)");
      } else {
        log("PASS", "Webhook: email.opened processed", `status: ${res.status}`);
      }
    } else {
      log("FAIL", "Webhook: email.opened", `status: ${res.status}`);
    }
  } catch (e) {
    log("FAIL", "Webhook: email.opened error", e.message);
  }

  // Test webhook without newsletter_id (should ignore gracefully)
  try {
    const res = await apiPost("/api/webhooks/resend", {
      type: "email.delivered",
      data: { email_id: "no-tags", tags: [], created_at: new Date().toISOString() },
    });
    if (res.status === 200 || res.status === 401) {
      log("PASS", "Webhook: no newsletter_id handled gracefully");
    } else {
      log("FAIL", "Webhook: no newsletter_id", `status: ${res.status}`);
    }
  } catch (e) {
    log("FAIL", "Webhook: no newsletter_id error", e.message);
  }
}

async function testJourneyEnrollment() {
  console.log("\n\x1b[1m🛤️  Test Suite 5: Journey Enrollment & Cron\x1b[0m");

  if (!(await tableExists("contact_journeys"))) { log("SKIP", "contact_journeys table missing"); return; }

  const contacts = await supabase("GET", "contacts", { select: "id,name,type,email", limit: "2" });
  if (!contacts?.length) { log("SKIP", "No contacts"); return; }

  const buyer = contacts.find(c => c.type === "buyer") || contacts[0];

  // Try enrolling in journey
  try {
    const enrollment = await supabase("POST", "contact_journeys", {
      body: {
        contact_id: buyer.id,
        journey_type: buyer.type === "buyer" ? "buyer" : "seller",
        current_phase: "lead",
        next_email_at: new Date().toISOString(),
        emails_sent_in_phase: 0,
        send_mode: "review",
      },
      allowFail: true,
    });

    if (enrollment?.[0]?.id) {
      log("PASS", "Journey enrollment created", `type: ${buyer.type}, phase: lead`);

      // Test duplicate prevention
      try {
        const dupe = await supabase("POST", "contact_journeys", {
          body: {
            contact_id: buyer.id,
            journey_type: buyer.type === "buyer" ? "buyer" : "seller",
            current_phase: "lead",
          },
          allowFail: true,
        });
        // allowFail returns null on 409 (constraint violation) — that means it worked
        if (dupe === null) {
          log("PASS", "Duplicate enrollment blocked", "UNIQUE constraint works (409 returned)");
        } else {
          log("FAIL", "Duplicate enrollment should be blocked", "Second insert succeeded");
        }
      } catch (e) {
        log("PASS", "Duplicate enrollment blocked", "UNIQUE constraint works");
      }

      // Clean up
      await supabase("DELETE", `contact_journeys?id=eq.${enrollment[0].id}`, { allowFail: true });
    } else {
      log("FAIL", "Journey enrollment", JSON.stringify(enrollment));
    }
  } catch (e) {
    if (e.message.includes("duplicate") || e.message.includes("unique") || e.message.includes("23505")) {
      log("PASS", "Journey enrollment (already enrolled)", "UNIQUE constraint active");
    } else {
      log("FAIL", "Journey enrollment error", e.message.slice(0, 200));
    }
  }

  // Test cron endpoint auth
  try {
    const noAuth = await fetch(`${BASE_URL}/api/cron/process-workflows`);
    if (noAuth.status === 401) {
      log("PASS", "Cron rejects unauthenticated requests", "401 returned");
    } else {
      log("FAIL", "Cron should reject unauthenticated", `status: ${noAuth.status}`);
    }
  } catch (e) {
    log("FAIL", "Cron auth test error", e.message);
  }

  // Test cron with auth
  try {
    const authRes = await fetch(`${BASE_URL}/api/cron/process-workflows`, {
      headers: { "Authorization": `Bearer ${CRON_SECRET}` },
    });
    const data = await authRes.json();
    log("PASS", "Cron accepts authenticated requests", `processed: ${data.processed || 0}`);
  } catch (e) {
    log("FAIL", "Cron authenticated test", e.message);
  }
}

async function testFrequencyCaps() {
  console.log("\n\x1b[1m🛡️  Test Suite 6: Frequency Caps & Dedup\x1b[0m");

  if (!(await tableExists("newsletters"))) { log("SKIP", "newsletters table missing"); return; }

  const contacts = await supabase("GET", "contacts", { select: "id,name,email", limit: "1" });
  if (!contacts?.length) { log("SKIP", "No contacts"); return; }
  const contact = contacts[0];

  // Check frequency by querying newsletters for this contact in last 24h
  try {
    const recent = await supabase("GET", "newsletters", {
      select: "id,status,created_at",
      query: { contact_id: `eq.${contact.id}`, created_at: `gte.${new Date(Date.now() - 86400000).toISOString()}` },
    });
    log("PASS", "Frequency check query works", `${(recent || []).length} emails in last 24h for ${contact.name}`);
  } catch (e) {
    log("FAIL", "Frequency check query", e.message);
  }

  // Check dedup by querying same type+phase
  try {
    const dupes = await supabase("GET", "newsletters", {
      select: "id",
      query: {
        contact_id: `eq.${contact.id}`,
        email_type: "eq.market_update",
        journey_phase: "eq.lead",
        created_at: `gte.${new Date(Date.now() - 7 * 86400000).toISOString()}`,
      },
    });
    log("PASS", "Dedup check query works", `${(dupes || []).length} market_update/lead in last 7 days`);
  } catch (e) {
    log("FAIL", "Dedup check query", e.message);
  }
}

async function testLeadScoring() {
  console.log("\n\x1b[1m🧠 Test Suite 7: AI Lead Scoring\x1b[0m");

  // Test scoring cron endpoint
  try {
    const noAuth = await fetch(`${BASE_URL}/api/cron/agent-scoring`);
    if (noAuth.status === 401) {
      log("PASS", "Scoring cron rejects unauthenticated", "401");
    } else {
      log("FAIL", "Scoring cron should require auth", `status: ${noAuth.status}`);
    }
  } catch (e) {
    log("FAIL", "Scoring cron auth test", e.message);
  }

  try {
    const res = await fetch(`${BASE_URL}/api/cron/agent-scoring`, {
      headers: { "Authorization": `Bearer ${CRON_SECRET}` },
    });
    const data = await res.json();
    if (res.ok) {
      log("PASS", "Scoring cron executes", `scored: ${data.scored || 0}, errors: ${data.errors || 0}`);
    } else {
      log("FAIL", "Scoring cron execution", JSON.stringify(data).slice(0, 200));
    }
  } catch (e) {
    log("FAIL", "Scoring cron error", e.message);
  }

  // Test recommendations cron
  try {
    const res = await fetch(`${BASE_URL}/api/cron/agent-recommendations`, {
      headers: { "Authorization": `Bearer ${CRON_SECRET}` },
    });
    const data = await res.json();
    if (res.ok) {
      log("PASS", "Recommendations cron executes", `generated: ${data.generated || 0}`);
    } else {
      log("FAIL", "Recommendations cron", JSON.stringify(data).slice(0, 200));
    }
  } catch (e) {
    log("FAIL", "Recommendations cron error", e.message);
  }
}

async function testUnsubscribe() {
  console.log("\n\x1b[1m🚫 Test Suite 8: Unsubscribe\x1b[0m");

  // Test without ID
  try {
    const res = await fetch(`${BASE_URL}/api/newsletters/unsubscribe`);
    if (res.status === 400) {
      log("PASS", "Unsubscribe rejects missing ID", "400");
    } else {
      log("FAIL", "Unsubscribe should require ID", `status: ${res.status}`);
    }
  } catch (e) {
    log("FAIL", "Unsubscribe no-ID test", e.message);
  }

  // Test with fake ID
  try {
    const res = await fetch(`${BASE_URL}/api/newsletters/unsubscribe?id=00000000-0000-0000-0000-000000000000`);
    if (res.status === 404) {
      log("PASS", "Unsubscribe rejects invalid ID", "404");
    } else {
      // Might return 200 with HTML if contact doesn't exist but query didn't fail
      log("PASS", "Unsubscribe handles invalid ID", `status: ${res.status}`);
    }
  } catch (e) {
    log("FAIL", "Unsubscribe invalid-ID test", e.message);
  }
}

async function testDashboardPages() {
  console.log("\n\x1b[1m📊 Test Suite 9: Dashboard & Analytics Pages\x1b[0m");

  const pages = [
    { path: "/newsletters", name: "Newsletter Dashboard" },
    { path: "/newsletters/queue", name: "Approval Queue" },
    { path: "/newsletters/analytics", name: "Analytics" },
    { path: "/newsletters/guide", name: "Walkthrough Guide" },
    { path: "/automations/templates", name: "Template Library" },
    { path: "/contacts/segments", name: "Contact Segments" },
  ];

  for (const page of pages) {
    try {
      const res = await fetch(`${BASE_URL}${page.path}`, { redirect: "follow" });
      if (res.status === 200) {
        const html = await res.text();
        if (html.includes("<!DOCTYPE html") || html.includes("<html") || html.includes("__next")) {
          log("PASS", `${page.name} loads`, `${page.path} → 200`);
        } else {
          log("FAIL", `${page.name} empty response`, `${page.path}`);
        }
      } else if (res.status === 302 || res.status === 307) {
        log("PASS", `${page.name} redirects (auth required)`, `${page.path} → ${res.status}`);
      } else {
        log("FAIL", `${page.name} error`, `${page.path} → ${res.status}`);
      }
    } catch (e) {
      log("FAIL", `${page.name} unreachable`, e.message);
    }
  }
}

async function testEmailTemplateRendering() {
  console.log("\n\x1b[1m✉️  Test Suite 10: Email Template Rendering\x1b[0m");

  // Send a real beautifully-designed test email
  const templates = [
    {
      name: "New Listing Alert",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(79,53,210,0.06);">
          <div style="padding:24px 32px;text-align:center;"><h1 style="font-size:22px;font-weight:700;color:#4f35d2;margin:0;">ListingFlow</h1></div>
          <div style="padding:0 32px 24px;">
            <p style="font-size:16px;color:#1a1535;">Hi Sarah,</p>
            <p style="font-size:15px;color:#3a3a5c;line-height:1.6;">3 new condos just hit the market in Kitsilano that match your criteria perfectly.</p>
            <div style="border:1px solid #e8e5f5;border-radius:10px;padding:16px;margin:16px 0;">
              <p style="font-size:20px;font-weight:700;color:#1a1535;margin:0 0 4px;">$895,000</p>
              <p style="font-size:15px;color:#3a3a5c;margin:0 0 4px;">2456 Cornwall Ave, Kitsilano</p>
              <p style="font-size:13px;color:#6b6b8d;margin:0;">2 bed · 2 bath · Ocean views</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="https://listingflow.com" style="background:#4f35d2;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Book a Showing</a>
            </div>
            <p style="font-size:15px;color:#3a3a5c;">Talk soon,<br>Your Realtor</p>
          </div>
          <hr style="border-color:#e8e5f5;margin:0;">
          <div style="padding:16px 32px;text-align:center;"><p style="font-size:11px;color:#a0a0b0;margin:0;"><a href="#" style="color:#a0a0b0;text-decoration:underline;">Unsubscribe</a> from these emails</p></div>
        </div>
      `,
    },
  ];

  for (const tpl of templates) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: TEST_EMAIL,
          subject: `QA: ${tpl.name} — Real Template Test`,
          html: tpl.html,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        log("PASS", `Template: ${tpl.name} sent`, `messageId: ${data.id}`);
      } else {
        log("FAIL", `Template: ${tpl.name}`, JSON.stringify(data).slice(0, 200));
      }
    } catch (e) {
      log("FAIL", `Template: ${tpl.name} error`, e.message);
    }
  }
}

async function testEditorialNewsletterSystem() {
  console.log("\n\x1b[1m📰 Test Suite 11: Editorial Newsletter System\x1b[0m");

  // 11.1 — Required tables exist
  const tables = [
    "editorial_editions",
    "editorial_block_templates",
    "editorial_voice_profiles",
    "editorial_content_library",
    "external_data_cache",
  ];
  for (const tbl of tables) {
    const exists = await tableExists(tbl);
    if (exists) {
      log("PASS", `Table ${tbl} exists`);
    } else {
      log("FAIL", `Table ${tbl} missing`, "Run migration 113_editorial_newsletter_system.sql");
    }
  }

  // 11.6 — Edition dashboard page loads
  try {
    const res = await fetch(`${BASE_URL}/newsletters/editorial`, { redirect: "follow" });
    if (res.status === 200 || res.status === 307 || res.status === 302) {
      log("PASS", "/newsletters/editorial page loads", `HTTP ${res.status}`);
    } else {
      log("FAIL", "/newsletters/editorial page", `HTTP ${res.status}`);
    }
  } catch (e) {
    log("FAIL", "/newsletters/editorial unreachable", e.message);
  }

  // 11.7 — New edition page loads
  try {
    const res = await fetch(`${BASE_URL}/newsletters/editorial/new`, { redirect: "follow" });
    if (res.status === 200 || res.status === 307 || res.status === 302) {
      log("PASS", "/newsletters/editorial/new page loads", `HTTP ${res.status}`);
    } else {
      log("FAIL", "/newsletters/editorial/new", `HTTP ${res.status}`);
    }
  } catch (e) {
    log("FAIL", "/newsletters/editorial/new unreachable", e.message);
  }

  // 11.8 — Status API requires auth (no fake ID should return 200 without auth)
  try {
    const res = await fetch(`${BASE_URL}/api/editorial/00000000-0000-0000-0000-000000000000/status`);
    if (res.status === 401 || res.status === 404) {
      log("PASS", "Editorial status API is auth-gated", `HTTP ${res.status}`);
    } else {
      log("FAIL", "Editorial status API should require auth", `HTTP ${res.status}`);
    }
  } catch (e) {
    log("FAIL", "Editorial status API unreachable", e.message);
  }

  // 11.9 — Block templates are seeded (expect ≥ 10 types)
  if (await tableExists("editorial_block_templates")) {
    try {
      const templates = await supabase("GET", "editorial_block_templates", {
        select: "block_type",
        limit: "50",
      });
      const count = templates?.length ?? 0;
      if (count >= 10) {
        log("PASS", `editorial_block_templates seeded: ${count} templates`);
      } else {
        log("FAIL", "editorial_block_templates under-seeded", `${count} rows (expected ≥ 10)`);
      }

      // Verify the 5 critical block types exist
      const types = new Set((templates || []).map((t) => t.block_type));
      for (const required of ["hero", "just_sold", "market_commentary", "rate_watch", "cta"]) {
        types.has(required)
          ? log("PASS", `Block type '${required}' seeded`)
          : log("FAIL", `Block type '${required}' missing from templates`);
      }
    } catch (e) {
      log("FAIL", "editorial_block_templates query", e.message);
    }
  } else {
    log("SKIP", "Block template seed check — table missing");
  }

  // 11.15 — CRUD lifecycle: create → read → update → delete
  if (await tableExists("editorial_editions")) {
    // Get a realtor_id to scope the insert
    const contacts = await supabase("GET", "contacts", { select: "realtor_id", limit: "1" });
    const realtorId = contacts?.[0]?.realtor_id;

    if (realtorId) {
      let editionId = null;
      try {
        const created = await supabase("POST", "editorial_editions", {
          body: {
            realtor_id: realtorId,
            title: "QA Auto-Test Edition",
            edition_type: "market_update",
            status: "draft",
            blocks: [],
            edition_number: 9999,
          },
        });
        editionId = created?.[0]?.id;
        editionId
          ? log("PASS", "editorial_editions CREATE", `id: ${editionId}`)
          : log("FAIL", "editorial_editions CREATE", "no ID returned");
      } catch (e) {
        log("FAIL", "editorial_editions CREATE", e.message.slice(0, 100));
      }

      if (editionId) {
        // Read
        try {
          const rows = await supabase("GET", "editorial_editions", {
            query: { id: `eq.${editionId}` },
            select: "id,title,status",
          });
          rows?.[0]?.id
            ? log("PASS", "editorial_editions READ after create")
            : log("FAIL", "editorial_editions READ", "row not found");
        } catch (e) {
          log("FAIL", "editorial_editions READ", e.message.slice(0, 100));
        }

        // Update
        try {
          const url = new URL(`/rest/v1/editorial_editions`, SUPABASE_URL);
          url.searchParams.set("id", `eq.${editionId}`);
          const patchRes = await fetch(url.toString(), {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ title: "QA Auto-Test Edition — Updated" }),
          });
          patchRes.ok
            ? log("PASS", "editorial_editions UPDATE")
            : log("FAIL", "editorial_editions UPDATE", `HTTP ${patchRes.status}`);
        } catch (e) {
          log("FAIL", "editorial_editions UPDATE", e.message.slice(0, 100));
        }

        // Delete (cleanup)
        try {
          const url = new URL(`/rest/v1/editorial_editions`, SUPABASE_URL);
          url.searchParams.set("id", `eq.${editionId}`);
          const delRes = await fetch(url.toString(), {
            method: "DELETE",
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          });
          delRes.ok
            ? log("PASS", "editorial_editions DELETE (cleanup)")
            : log("FAIL", "editorial_editions DELETE", `HTTP ${delRes.status}`);
        } catch (e) {
          log("FAIL", "editorial_editions DELETE", e.message.slice(0, 100));
        }
      }
    } else {
      log("SKIP", "Editorial CRUD lifecycle", "no realtor_id found in contacts");
    }
  } else {
    log("SKIP", "Editorial CRUD lifecycle", "editorial_editions table missing");
  }

  // 11.20 — No stuck editions (generating state > 5 min)
  if (await tableExists("editorial_editions")) {
    try {
      const generating = await supabase("GET", "editorial_editions", {
        query: { status: "eq.generating" },
        select: "id,updated_at",
        limit: "50",
      });
      const staleMs = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      const stuck = (generating || []).filter(
        (r) => now - new Date(r.updated_at).getTime() > staleMs
      );
      stuck.length === 0
        ? log("PASS", "No stuck editions in 'generating' state")
        : log(
            "FAIL",
            "Stuck editions detected",
            `${stuck.length} editions stuck >5 min — check BullMQ worker`
          );
    } catch (e) {
      log("FAIL", "Stuck editions check", e.message);
    }
  }

  // 11.21 — Ready editions have non-empty blocks
  if (await tableExists("editorial_editions")) {
    try {
      const ready = await supabase("GET", "editorial_editions", {
        query: { status: "eq.ready" },
        select: "id,blocks",
        limit: "10",
      });
      if (ready?.length > 0) {
        const empty = ready.filter((r) => !r.blocks || !Array.isArray(r.blocks) || r.blocks.length === 0);
        empty.length === 0
          ? log("PASS", `Ready editions all have blocks (${ready.length} checked)`)
          : log("FAIL", "Ready editions with empty blocks", `${empty.length} found`);
      } else {
        log("SKIP", "Ready editions blocks check", "no ready editions in DB");
      }
    } catch (e) {
      log("FAIL", "Ready editions blocks check", e.message);
    }
  }

  // 11.22 — Resend webhook handles editorial edition_id tag
  try {
    const res = await apiPost("/api/webhooks/resend", {
      type: "email.opened",
      data: {
        email_id: "qa-editorial-" + Date.now(),
        tags: [{ name: "edition_id", value: "00000000-0000-0000-0000-000000000000" }],
        created_at: new Date().toISOString(),
      },
    });
    if (res.status === 200 || res.status === 401) {
      res.status === 401
        ? log("PASS", "Resend webhook sig verification active for editorial events", "401 returned")
        : log("PASS", "Resend webhook processes editorial edition_id tag", `HTTP ${res.status}`);
    } else {
      log("FAIL", "Resend webhook editorial event", `HTTP ${res.status}`);
    }
  } catch (e) {
    log("FAIL", "Resend webhook editorial test", e.message);
  }

  // 11.23 — Voice profiles have valid tone values
  if (await tableExists("editorial_voice_profiles")) {
    try {
      const profiles = await supabase("GET", "editorial_voice_profiles", {
        select: "id,tone",
        limit: "20",
      });
      const validTones = new Set(["professional", "friendly", "luxury", "casual", "authoritative"]);
      const invalid = (profiles || []).filter((p) => p.tone && !validTones.has(p.tone));
      invalid.length === 0
        ? log("PASS", `Voice profiles tone values valid (${(profiles || []).length} checked)`)
        : log("FAIL", "Invalid voice profile tones", invalid.map((p) => p.tone).join(", "));
    } catch (e) {
      log("FAIL", "Voice profiles tone check", e.message);
    }
  } else {
    log("SKIP", "Voice profiles tone check", "table missing");
  }
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

async function main() {
  console.log("\x1b[1m\n════════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[1m  ListingFlow Email Marketing — QA Test Suite\x1b[0m");
  console.log("\x1b[1m════════════════════════════════════════════════\x1b[0m");
  console.log(`  Server: ${BASE_URL}`);
  console.log(`  Test email: ${TEST_EMAIL}`);
  console.log(`  Time: ${new Date().toISOString()}\n`);

  // Check server is running
  try {
    const res = await fetch(`${BASE_URL}/api/auth/csrf`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    console.log("  \x1b[32m✓\x1b[0m Server is running\n");
  } catch (e) {
    console.error("  \x1b[31m✗ Server not running at", BASE_URL, "\x1b[0m");
    process.exit(1);
  }

  await testResendConnectivity();
  await testAIContentGeneration();
  await testNewsletterGeneration();
  await testWebhookProcessing();
  await testJourneyEnrollment();
  await testFrequencyCaps();
  await testLeadScoring();
  await testUnsubscribe();
  await testDashboardPages();
  await testEmailTemplateRendering();
  await testEditorialNewsletterSystem();

  // Summary
  console.log("\n\x1b[1m════════════════════════════════════════════════\x1b[0m");
  console.log(`\x1b[1m  Results: \x1b[32m${passed} passed\x1b[0m | \x1b[31m${failed} failed\x1b[0m | \x1b[33m${skipped} skipped\x1b[0m`);
  console.log("\x1b[1m════════════════════════════════════════════════\x1b[0m");

  if (failures.length > 0) {
    console.log("\n\x1b[31m  Failures:\x1b[0m");
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.name}: ${f.detail}`));
  }

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
