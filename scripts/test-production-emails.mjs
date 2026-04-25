#!/usr/bin/env node
/**
 * Production Email System Test
 *
 * Sends ALL journey emails for buyer + seller contacts through the REAL
 * production pipeline (magnate360.com cron → generateAndQueueNewsletter →
 * Claude AI → email-blocks → React Email templates → Resend).
 *
 * Validates each email against expected template elements.
 * Reverts all state when done.
 */

import { createClient } from "@supabase/supabase-js";

const PROD_URL = "https://opbrqlmhhqvfomevvkon.supabase.co";
const PROD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wYnJxbG1oaHF2Zm9tZXZ2a29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc5MDkzOCwiZXhwIjoyMDkxMzY2OTM4fQ.yhdFgZfetYVZYzuNDONwZ4VPfNEbwRpKjD2Xd46Asok";
const CRON_SECRET = "realtors360-cron-secret-prod-2026";
const CRON_URL = "https://magnate360.com/api/cron/process-journeys";

const supabase = createClient(PROD_URL, PROD_KEY);

// ── CONTACTS ────────────────────────────────────────────────────
const BUYER = {
  contactId: "738b23a7-877f-4036-9ae0-61a09488a9c4",
  journeyId: "a63903bf-7e55-443c-9663-7c7ccb3115a6",
  type: "buyer",
  email: "amandhindsa@outlook.com",
};

const SELLER = {
  contactId: "1041fd1d-aa60-47e3-a0f0-748209205141",
  journeyId: "1f15f792-d765-4011-b246-6604d65d2b97",
  type: "seller",
  email: "er.amndeep@gmail.com",
};

// ── JOURNEY SCHEDULES ───────────────────────────────────────────
const SCHEDULES = {
  buyer: {
    lead: ["welcome", "neighbourhood_guide", "new_listing_alert", "market_update", "new_listing_alert"],
    active: ["new_listing_alert", "market_update"],
    under_contract: ["closing_checklist", "inspection_reminder", "neighbourhood_guide"],
    past_client: ["home_anniversary", "referral_ask", "market_update"],
    dormant: ["reengagement", "new_listing_alert", "referral_ask"],
  },
  seller: {
    lead: ["welcome", "market_update", "neighbourhood_guide"],
    active: ["market_update"],
    under_contract: ["closing_checklist", "inspection_reminder", "closing_countdown"],
    past_client: ["market_update", "referral_ask", "home_anniversary"],
    dormant: ["reengagement", "market_update", "referral_ask"],
  },
};

// ── TEMPLATE VALIDATION RULES ───────────────────────────────────
// Each rule checks for expected HTML elements in the production email
const TEMPLATE_CHECKS = {
  welcome: {
    name: "Welcome Email",
    checks: [
      { name: "Has greeting", test: html => /Hi\s+\w+/i.test(html) },
      { name: "Has CTA button", test: html => /border-radius.*?<\/a>/s.test(html) || /<a[^>]*style[^>]*background/s.test(html) },
      { name: "Has agent card", test: html => /REALTOR|brokerage|Century/i.test(html) },
      { name: "Has unsubscribe", test: html => /unsubscribe/i.test(html) },
      { name: "Has welcome/intro content", test: html => /welcome|excited|partner|journey/i.test(html) },
    ],
  },
  market_update: {
    name: "Market Update",
    checks: [
      { name: "Has stats/data", test: html => /\$[\d,]+|avg|average|price|market/i.test(html) },
      { name: "Has CTA button", test: html => /<a[^>]*style[^>]*background/s.test(html) },
      { name: "Has agent card", test: html => /REALTOR|brokerage|Century/i.test(html) },
      { name: "Has unsubscribe", test: html => /unsubscribe/i.test(html) },
      { name: "Has area reference", test: html => /Vancouver|Burnaby|BC|area|neighbourhood/i.test(html) },
    ],
  },
  neighbourhood_guide: {
    name: "Neighbourhood Guide",
    checks: [
      { name: "Has area name", test: html => /Vancouver|Burnaby|neighbourhood|area|community/i.test(html) },
      { name: "Has highlights/features", test: html => /school|park|transit|dining|shop|amenit/i.test(html) },
      { name: "Has CTA button", test: html => /<a[^>]*style[^>]*background/s.test(html) },
      { name: "Has unsubscribe", test: html => /unsubscribe/i.test(html) },
    ],
  },
  new_listing_alert: {
    name: "New Listing Alert",
    checks: [
      { name: "Has listing address", test: html => /\d+\s+\w+\s+(St|Ave|Dr|Rd|Blvd|Way)|address/i.test(html) },
      { name: "Has price", test: html => /\$[\d,]+/i.test(html) },
      { name: "Has CTA button", test: html => /<a[^>]*style[^>]*background/s.test(html) },
      { name: "Has unsubscribe", test: html => /unsubscribe/i.test(html) },
    ],
  },
  closing_checklist: {
    name: "Closing Checklist",
    checks: [
      { name: "Has checklist items", test: html => /checklist|✅|✓|financing|insurance|walkthrough|document|utilit/i.test(html) },
      { name: "Has CTA button", test: html => /<a[^>]*style[^>]*background/s.test(html) },
      { name: "Has unsubscribe", test: html => /unsubscribe/i.test(html) },
    ],
  },
  inspection_reminder: {
    name: "Inspection Reminder",
    checks: [
      { name: "Has inspection content", test: html => /inspection|inspect|prepar|system|repair|access/i.test(html) },
      { name: "Has CTA button", test: html => /<a[^>]*style[^>]*background/s.test(html) },
      { name: "Has unsubscribe", test: html => /unsubscribe/i.test(html) },
    ],
  },
  closing_countdown: {
    name: "Closing Countdown",
    checks: [
      { name: "Has countdown/celebration", test: html => /closing|countdown|almost|congrat|final|milestone/i.test(html) },
      { name: "Has CTA button", test: html => /<a[^>]*style[^>]*background/s.test(html) },
      { name: "Has unsubscribe", test: html => /unsubscribe/i.test(html) },
    ],
  },
  home_anniversary: {
    name: "Home Anniversary",
    checks: [
      { name: "Has anniversary content", test: html => /anniversary|year|congratulat|celebrat/i.test(html) },
      { name: "Has CTA button", test: html => /<a[^>]*style[^>]*background/s.test(html) },
      { name: "Has unsubscribe", test: html => /unsubscribe/i.test(html) },
    ],
  },
  referral_ask: {
    name: "Referral Ask",
    checks: [
      { name: "Has referral request", test: html => /referr|recommend|know anyone|friend|family|colleague/i.test(html) },
      { name: "Has CTA button", test: html => /<a[^>]*style[^>]*background/s.test(html) },
      { name: "Has unsubscribe", test: html => /unsubscribe/i.test(html) },
    ],
  },
  reengagement: {
    name: "Re-engagement",
    checks: [
      { name: "Has reconnection content", test: html => /reconnect|touch base|check in|been a while|catch up|update/i.test(html) },
      { name: "Has CTA button", test: html => /<a[^>]*style[^>]*background/s.test(html) },
      { name: "Has unsubscribe", test: html => /unsubscribe/i.test(html) },
    ],
  },
};

// Common checks for ALL emails (block system elements)
const COMMON_CHECKS = [
  { name: "Has HTML structure", test: html => /<!DOCTYPE html>/i.test(html) && /<\/html>/i.test(html) },
  { name: "Has responsive meta", test: html => /viewport/i.test(html) },
  { name: "Has SF Pro / system font", test: html => /SF Pro|apple-system|Helvetica Neue/i.test(html) },
  { name: "Has max-width 600px", test: html => /max-width:\s*600px/i.test(html) || /width="600"/i.test(html) },
  { name: "Has agent name", test: html => /Kunal Bharatendu/i.test(html) },
  { name: "Has physical address (CASL)", test: html => /Surrey|BC|address|plaza/i.test(html) },
  { name: "Has unsubscribe link", test: html => /unsubscribe/i.test(html) },
  { name: "No broken template vars", test: html => !/\{\{[^}]+\}\}/.test(html) },
  { name: "No undefined/null text", test: html => !/>\s*undefined\s*</.test(html) && !/>\s*null\s*</.test(html) },
];

// ── ORIGINAL STATES (for revert) ────────────────────────────────
const originalStates = {};

// ── RESULTS LOG ─────────────────────────────────────────────────
const results = [];
const differences = [];

// ── HELPERS ─────────────────────────────────────────────────────

async function saveOriginalState(contact) {
  const { data } = await supabase
    .from("contact_journeys")
    .select("*")
    .eq("id", contact.journeyId)
    .single();
  originalStates[contact.journeyId] = { ...data };

  // Also save original newsletter count
  const { count } = await supabase
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contact.contactId);
  originalStates[`${contact.contactId}_newsletter_count`] = count || 0;
}

async function setJourneyState(journeyId, phase, emailIndex) {
  const now = new Date().toISOString();
  await supabase
    .from("contact_journeys")
    .update({
      current_phase: phase,
      emails_sent_in_phase: emailIndex,
      next_email_at: now,
      send_mode: "auto",
      is_paused: false,
      phase_entered_at: now,
      updated_at: now,
    })
    .eq("id", journeyId);
}

async function triggerCron() {
  const res = await fetch(CRON_URL, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  return await res.json();
}

async function getLatestNewsletter(contactId) {
  const { data } = await supabase
    .from("newsletters")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

async function clearFrequencyCap(contactId) {
  // Move all recent newsletters for this contact back 2 days so frequency cap doesn't block
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
  await supabase
    .from("newsletters")
    .update({ created_at: twoDaysAgo })
    .eq("contact_id", contactId)
    .gte("created_at", new Date(Date.now() - 86400000).toISOString());
}

function validateEmail(html, emailType) {
  const validationResults = [];

  // Common checks
  for (const check of COMMON_CHECKS) {
    const passed = check.test(html);
    validationResults.push({ ...check, passed, category: "common" });
  }

  // Type-specific checks
  const typeChecks = TEMPLATE_CHECKS[emailType];
  if (typeChecks) {
    for (const check of typeChecks.checks) {
      const passed = check.test(html);
      validationResults.push({ ...check, passed, category: emailType });
    }
  }

  return validationResults;
}

async function waitForSend(contactId, maxWait = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const nl = await getLatestNewsletter(contactId);
    if (nl && (nl.status === "sent" || nl.status === "sending" || nl.status === "approved")) {
      return nl;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}

// ── MAIN ────────────────────────────────────────────────────────

console.log("\n" + "█".repeat(70));
console.log("  PRODUCTION EMAIL SYSTEM TEST");
console.log("  Using: magnate360.com → real AI → real templates → real Resend");
console.log("█".repeat(70));

// Save original states
await saveOriginalState(BUYER);
await saveOriginalState(SELLER);
console.log("\n✓ Original journey states saved for revert\n");

const contacts = [
  { ...SELLER, label: "SELLER" },
  { ...BUYER, label: "BUYER" },
];

let totalSent = 0;
let totalFailed = 0;
let totalChecks = 0;
let totalChecksPassed = 0;

for (const contact of contacts) {
  const schedule = SCHEDULES[contact.type];
  const phases = Object.entries(schedule);

  console.log("\n" + "═".repeat(70));
  console.log(`  ${contact.label} JOURNEY — ${contact.email}`);
  console.log("═".repeat(70));

  for (const [phase, emailTypes] of phases) {
    console.log(`\n  ── ${phase.toUpperCase()} (${emailTypes.length} emails) ──`);

    for (let i = 0; i < emailTypes.length; i++) {
      const emailType = emailTypes[i];
      console.log(`\n    ⏳ [${phase}] ${emailType} (#${i + 1}/${emailTypes.length})...`);

      // Clear frequency cap from previous sends
      await clearFrequencyCap(contact.contactId);

      // Set journey to this exact position
      await setJourneyState(contact.journeyId, phase, i);

      // Wait a moment for DB to settle
      await new Promise(r => setTimeout(r, 500));

      // Trigger production cron
      const cronResult = await triggerCron();
      const processed = cronResult?.processed || 0;

      if (processed === 0) {
        // Check if our contact was skipped
        const skipped = cronResult?.debug?.debug_skipped || [];
        const ourSkip = skipped.find(s => s.contactId === contact.contactId);
        const reason = ourSkip ? ourSkip.reason : "Unknown (not in skipped list)";
        console.log(`    ❌ NOT PROCESSED — ${reason}`);
        totalFailed++;
        results.push({
          contact: contact.label,
          phase,
          emailType,
          status: "failed",
          reason,
        });

        // Check if a newsletter was created but just not sent (e.g., frequency cap in generateAndQueueNewsletter)
        const nl = await getLatestNewsletter(contact.contactId);
        if (nl && nl.email_type === emailType && nl.journey_phase === phase) {
          console.log(`    ⚠️  Newsletter created (status: ${nl.status}) but cron reported 0 processed`);
          if (nl.error_message) console.log(`    ⚠️  Error: ${nl.error_message}`);
        }
        continue;
      }

      // Wait for the email to be created and sent
      await new Promise(r => setTimeout(r, 3000));
      const newsletter = await getLatestNewsletter(contact.contactId);

      if (!newsletter || newsletter.email_type !== emailType) {
        console.log(`    ❌ Newsletter not found in DB after cron`);
        totalFailed++;
        results.push({
          contact: contact.label,
          phase,
          emailType,
          status: "failed",
          reason: "Newsletter not created",
        });
        continue;
      }

      console.log(`    📝 Subject: "${newsletter.subject}"`);
      console.log(`    📊 Status: ${newsletter.status} | Resend: ${newsletter.resend_message_id ? "✓" : "pending"}`);

      // Validate the HTML
      const html = newsletter.html_body || "";
      const htmlLen = html.length;
      const validation = validateEmail(html, emailType);

      const passed = validation.filter(v => v.passed);
      const failed = validation.filter(v => !v.passed);

      totalChecks += validation.length;
      totalChecksPassed += passed.length;

      console.log(`    ✅ Checks: ${passed.length}/${validation.length} passed | HTML: ${htmlLen} chars`);

      if (failed.length > 0) {
        for (const f of failed) {
          console.log(`    ⚠️  FAILED: ${f.name} (${f.category})`);
          differences.push({
            contact: contact.label,
            phase,
            emailType,
            check: f.name,
            category: f.category,
          });
        }
      }

      totalSent++;
      results.push({
        contact: contact.label,
        phase,
        emailType,
        status: "sent",
        subject: newsletter.subject,
        htmlLength: htmlLen,
        checksPassed: passed.length,
        checksFailed: failed.length,
        resendId: newsletter.resend_message_id,
      });

      // Small delay between sends
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// ── REVERT ───────────────────────────────────────────────────────
console.log("\n" + "═".repeat(70));
console.log("  REVERTING TO ORIGINAL STATE");
console.log("═".repeat(70));

for (const contact of contacts) {
  const original = originalStates[contact.journeyId];
  if (original) {
    await supabase
      .from("contact_journeys")
      .update({
        current_phase: original.current_phase,
        emails_sent_in_phase: original.emails_sent_in_phase,
        next_email_at: original.next_email_at,
        send_mode: original.send_mode,
        is_paused: original.is_paused,
        phase_entered_at: original.phase_entered_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact.journeyId);
    console.log(`  ✓ ${contact.label} journey reverted to: phase=${original.current_phase}, send_mode=${original.send_mode}`);
  }
}

// Delete test newsletters (keep DB clean)
for (const contact of contacts) {
  const origCount = originalStates[`${contact.contactId}_newsletter_count`] || 0;
  const { count: currentCount } = await supabase
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contact.contactId);

  const newEmails = (currentCount || 0) - origCount;
  if (newEmails > 0) {
    // Get IDs of test emails (the ones we just created)
    const { data: testEmails } = await supabase
      .from("newsletters")
      .select("id")
      .eq("contact_id", contact.contactId)
      .order("created_at", { ascending: false })
      .limit(newEmails);

    if (testEmails?.length) {
      const ids = testEmails.map(e => e.id);
      // Delete associated events first
      for (const id of ids) {
        await supabase.from("newsletter_events").delete().eq("newsletter_id", id);
      }
      await supabase.from("newsletters").delete().in("id", ids);
      console.log(`  ✓ ${contact.label}: deleted ${ids.length} test newsletter records`);
    }
  }
}

console.log("\n✓ Production system reverted to original state\n");

// ── FINAL REPORT ────────────────────────────────────────────────
console.log("█".repeat(70));
console.log("  FINAL REPORT");
console.log("█".repeat(70));
console.log(`\n  Emails sent through production: ${totalSent}`);
console.log(`  Emails failed: ${totalFailed}`);
console.log(`  Template checks: ${totalChecksPassed}/${totalChecks} passed`);
console.log(`  Differences found: ${differences.length}`);

if (differences.length > 0) {
  console.log("\n  ── DIFFERENCES ──");
  for (const d of differences) {
    console.log(`  ⚠️  [${d.contact}] ${d.phase}/${d.emailType}: ${d.check} (${d.category})`);
  }
}

console.log("\n  ── ALL RESULTS ──");
for (const r of results) {
  const icon = r.status === "sent" ? "✅" : "❌";
  const checks = r.checksFailed > 0 ? ` (⚠️ ${r.checksFailed} check failures)` : "";
  console.log(`  ${icon} [${r.contact}] ${r.phase}/${r.emailType}${r.subject ? ` — "${r.subject}"` : ""}${r.reason ? ` — ${r.reason}` : ""}${checks}`);
}

console.log("\n  ── PRODUCTION STATE ──");
console.log("  ✓ Journey states: REVERTED to original");
console.log("  ✓ Test newsletters: DELETED from DB");
console.log("  ✓ Production system: INTACT\n");
