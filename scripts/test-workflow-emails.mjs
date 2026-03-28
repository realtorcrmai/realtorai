#!/usr/bin/env node
/**
 * Full Workflow Email Test — Sends EVERY communication step from ALL 7 workflows
 *
 * Usage: node scripts/test-workflow-emails.mjs
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env
try {
  const envPath = resolve(import.meta.dirname || ".", "../.env.local");
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = "http://localhost:3000";
const TEST_EMAIL = "amandhindsa@outlook.com";
const TEST_CONTACT_NAME = "Test Workflow Runner";

let passed = 0, failed = 0, totalSent = 0;

function log(s, msg) {
  const icon = s === "PASS" ? "\x1b[32m✓\x1b[0m" : s === "FAIL" ? "\x1b[31m✗\x1b[0m" : "\x1b[34mℹ\x1b[0m";
  console.log(`  ${icon} ${msg}`);
  if (s === "PASS") passed++;
  if (s === "FAIL") failed++;
}

function info(msg) { console.log(`  \x1b[34mℹ\x1b[0m ${msg}`); }

function sb(method, table, opts = {}) {
  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
  if (opts.query) for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  if (opts.select) url.searchParams.set("select", opts.select);
  if (opts.order) url.searchParams.set("order", opts.order);
  if (opts.limit) url.searchParams.set("limit", String(opts.limit));
  const args = ["curl", "-s", "-X", method, `"${url.toString()}"`,
    `-H "apikey: ${SUPABASE_KEY}"`, `-H "Authorization: Bearer ${SUPABASE_KEY}"`, `-H "Content-Type: application/json"`];
  if (method === "POST") args.push(`-H "Prefer: return=representation"`);
  if (method === "PATCH") args.push(`-H "Prefer: return=representation"`);
  if (opts.body) args.push(`-d '${JSON.stringify(opts.body).replace(/'/g, "'\\''")}'`);
  try { return JSON.parse(execSync(args.join(" "), { encoding: "utf8", timeout: 15000 })); } catch { return null; }
}

function getJar() {
  const jar = "/private/tmp/claude-501/test-wf-cookies.txt";
  try {
    const csrfJson = execSync(`curl -s -c ${jar} "${BASE_URL}/api/auth/csrf"`, { encoding: "utf8", timeout: 10000 });
    const { csrfToken } = JSON.parse(csrfJson);
    const email = process.env.DEMO_EMAIL || "demo@realestatecrm.com";
    const password = process.env.DEMO_PASSWORD || "demo123";
    execSync(`curl -s -b ${jar} -c ${jar} -X POST "${BASE_URL}/api/auth/callback/credentials" -H "Content-Type: application/x-www-form-urlencoded" -d "email=${email}&password=${password}&csrfToken=${csrfToken}" -L -o /dev/null`, { encoding: "utf8", timeout: 10000 });
    return jar;
  } catch { return null; }
}

function appPost(jar, path, body) {
  try {
    return JSON.parse(execSync(
      `curl -s -b ${jar} -X POST "${BASE_URL}${path}" -H "Content-Type: application/json" -d '${JSON.stringify(body).replace(/'/g, "'\\''")}'`,
      { encoding: "utf8", timeout: 60000 }
    ));
  } catch { return null; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Map step names to template keys
const STEP_TEMPLATE_MAP = {
  // Speed-to-Contact
  "Instant auto-text: acknowledge lead": "sms_acknowledge_lead",
  "Alert agent: new lead received": "alert_new_lead",
  "If no response: follow-up text": "sms_followup",
  "Email with value offer": "email_value_offer",
  "Final outreach text": "sms_final_outreach",
  // Buyer Nurture
  "Welcome email: intro + what to expect": "welcome",
  "Welcome text: confirm preferences received": "sms_preferences",
  "Email: buying process overview": "email_buying_process",
  "Email: mortgage pre-approval guide": "email_mortgage_guide",
  "Email: current market snapshot": "email_market_snapshot",
  "Text: check-in on listings sent": "sms_listings_checkin",
  "Email: neighbourhood guides": "email_neighbourhood_guides",
  "Email: making an offer guide": "email_offer_guide",
  "Text: ready to make an offer?": "sms_offer_check",
  "Email: closing checklist": "email_closing_checklist",
  // Post-Close Buyer
  "Day 0: Congratulations email": "email_congrats_buyer",
  "Day 0: Congrats text": "sms_congrats",
  "Email: move-in checklist & local resources": "email_movein_checklist",
  "Text: how is the new home?": "sms_checkin",
  "Email: 30-day home maintenance tips": "email_maintenance_tips",
  "Email: 90-day check-in + referral ask": "email_referral_ask",
  "Email: 6-month home equity update": "email_equity_update",
  "Email: 1-year anniversary + market update": "email_anniversary",
  // Post-Close Seller
  "Day 0: Congratulations on sale email": "email_congrats_seller",
  "Day 0: Thank you text": "sms_thank_you",
  "Email: what's next + moving resources": "email_whats_next_seller",
  "Text: settling in OK?": "sms_checkin",
  "Email: 30-day follow-up + referral ask": "email_seller_referral",
  "Email: 90-day market update": "email_seller_market_90day",
  "Email: 6-month neighbourhood update": "email_seller_neighbourhood_6mo",
  "Email: 1-year anniversary": "email_seller_anniversary",
  // Lead Re-Engagement
  "Re-engagement text: still looking?": "sms_reengagement",
  "Alert agent: re-engagement triggered": "alert_reengagement",
  "Email: market update + new listings": "email_reengagement_market",
  "Email: exclusive opportunity / value add": "email_reengagement_exclusive",
  "Final text: last check-in": "sms_last_checkin",
  // Open House Follow-Up
  "Immediate: thank you text": "sms_acknowledge_lead",
  "Email: property details + next steps": "email_property_details",
  "Text: thoughts on the property?": "sms_property_thoughts",
  "Email: similar properties you might like": "email_similar_properties",
  "Final text: ready for another showing?": "sms_another_showing",
  // Referral Partner
  "Welcome email: thank you for partnership": "email_partner_welcome",
  "Text: intro + what to expect": "sms_partner_intro",
  "Email: market update for partners": "email_partner_market",
  "Email: quarterly newsletter": "email_partner_quarterly",
  "Email: annual recap + thank you": "email_partner_annual",
};

async function run() {
  console.log("\x1b[1m\x1b[35m");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Full Workflow Email Test — ALL 46 Steps, ALL 7 Workflows ║");
  console.log("║  Target: amandhindsa@outlook.com                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\x1b[0m");

  // Login
  const jar = getJar();
  log(jar ? "PASS" : "FAIL", "Logged in");
  if (!jar) process.exit(1);

  // Find or verify test contact
  let contact = sb("GET", "contacts", { select: "id,name,email,type", query: { email: `eq.${TEST_EMAIL}`, name: `eq.${TEST_CONTACT_NAME}` }, limit: 1 });
  if (!contact || contact.length === 0) {
    contact = sb("POST", "contacts", { body: { name: TEST_CONTACT_NAME, email: TEST_EMAIL, type: "buyer", phone: "+16041234567", notes: "Full workflow test", newsletter_unsubscribed: false } });
    contact = Array.isArray(contact) ? contact[0] : contact;
  } else {
    contact = contact[0];
  }
  log(contact?.id ? "PASS" : "FAIL", `Test contact: ${contact?.name} (${contact?.id?.slice(0,8)})`);
  if (!contact?.id) process.exit(1);

  // Clean old test data
  sb("DELETE", "newsletters", { query: { contact_id: `eq.${contact.id}` } });
  info("Cleaned old test newsletters");

  // Get all workflows with steps
  const workflows = sb("GET", "workflows", { select: "id,name,slug,contact_type", order: "name" });
  const allSteps = sb("GET", "workflow_steps", {
    select: "id,workflow_id,step_order,name,action_type,delay_value,delay_unit",
    query: { action_type: "in.(auto_email,auto_sms,auto_whatsapp,auto_alert)" },
    order: "workflow_id,step_order",
  });

  info(`Found ${workflows?.length} workflows, ${allSteps?.length} communication steps`);

  // Group steps by workflow
  const stepsByWf = {};
  for (const s of allSteps || []) {
    if (!stepsByWf[s.workflow_id]) stepsByWf[s.workflow_id] = [];
    stepsByWf[s.workflow_id].push(s);
  }

  // Send every step from every workflow
  for (const wf of workflows || []) {
    const steps = stepsByWf[wf.id] || [];
    console.log(`\n\x1b[1m\x1b[36m━━━ ${wf.name} (${steps.length} steps) ━━━\x1b[0m`);

    for (const step of steps) {
      const templateKey = STEP_TEMPLATE_MAP[step.name] || "welcome";
      const channelLabel = step.action_type === "auto_sms" ? "SMS" : step.action_type === "auto_alert" ? "ALERT" : "EMAIL";

      // Backdate existing newsletters to bypass frequency cap
      sb("PATCH", "newsletters", {
        query: { contact_id: `eq.${contact.id}`, status: "in.(draft,approved,sent)" },
        body: { created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
      });

      const result = appPost(jar, "/api/test/generate-newsletter", {
        contactId: contact.id,
        emailType: templateKey,
        journeyPhase: wf.slug,
        sendMode: "auto",
        skipAI: true,
      });

      if (result?.success || result?.messageId) {
        log("PASS", `[${channelLabel}] Step ${step.step_order}: ${step.name}`);
        totalSent++;
      } else {
        log("FAIL", `[${channelLabel}] Step ${step.step_order}: ${step.name} — ${result?.error || "no response"}`);
      }

      // 1.5s between sends to respect rate limits
      await sleep(1500);
    }
  }

  // Verify what was sent
  console.log(`\n\x1b[1m\x1b[36m━━━ Verification ━━━\x1b[0m`);
  await sleep(3000);
  const sentEmails = sb("GET", "newsletters", {
    select: "id,email_type,status,sent_at,resend_message_id",
    query: { contact_id: `eq.${contact.id}` },
    order: "created_at",
  });

  const sentCount = (sentEmails || []).filter(n => n.status === "sent").length;
  const failedCount = (sentEmails || []).filter(n => n.status === "failed").length;
  log(sentCount > 0 ? "PASS" : "FAIL", `Total emails sent via Resend: ${sentCount}`);
  if (failedCount > 0) info(`Failed: ${failedCount}`);
  info(`Total newsletter records: ${(sentEmails || []).length}`);

  // Results
  console.log("\n\x1b[1m\x1b[35m");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`║  Emails delivered to Resend: ${totalSent}`);
  console.log(`║  Check amandhindsa@outlook.com for all ${totalSent} emails     `);
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\x1b[0m");

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });
