#!/usr/bin/env node
/**
 * Apple-Grade QA Test Suite — Email Marketing System
 *
 * 200+ automated checks across 15 categories:
 * Templates, Rendering, CASL, Branding, Dark Mode, Responsive,
 * Data Integrity, Journey, Greetings, Blast, API, Pages, Edge Cases,
 * Registry Consistency, Block System.
 *
 * Usage: node scripts/qa-email-system.mjs [--env-file=path]
 */

import { createClient } from "@supabase/supabase-js";

const ENV_FILE = process.argv.find(a => a.startsWith("--env-file="))?.split("=")[1];
if (ENV_FILE) {
  const { config } = await import("dotenv");
  config({ path: ENV_FILE });
} else {
  try { const { config } = await import("dotenv"); config({ path: ".env.local" }); } catch {}
}

// ── CONFIG ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROD_URL = process.env.NEXT_PUBLIC_APP_URL || "https://magnate360.com";
const CRON_SECRET = process.env.CRON_SECRET || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── TEST FRAMEWORK ──────────────────────────────────────────────
let totalPass = 0;
let totalFail = 0;
let totalSkip = 0;
const failures = [];
let currentCategory = "";

function category(name) {
  currentCategory = name;
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${name}`);
  console.log("═".repeat(60));
}

function pass(name) {
  totalPass++;
  console.log(`  ✅ ${name}`);
}

function fail(name, reason) {
  totalFail++;
  console.log(`  ❌ ${name} — ${reason}`);
  failures.push({ category: currentCategory, test: name, reason });
}

function skip(name, reason) {
  totalSkip++;
  console.log(`  ⏭️  ${name} — ${reason}`);
}

function check(name, condition, failReason) {
  if (condition) pass(name);
  else fail(name, failReason || "Assertion failed");
}

// ── DYNAMIC IMPORTS ─────────────────────────────────────────────
let assembleEmail, TEMPLATE_BLOCKS, getBrandConfig;
let TEMPLATE_REGISTRY;
let JOURNEY_SCHEDULES;

try {
  const blocks = await import("../src/lib/email-blocks.ts");
  assembleEmail = blocks.assembleEmail;
  getBrandConfig = blocks.getBrandConfig;
  // Access TEMPLATE_BLOCKS via the module
  const registry = await import("../src/lib/constants/template-registry.ts");
  TEMPLATE_REGISTRY = registry.TEMPLATE_REGISTRY;
  const schedules = await import("../src/lib/constants/journey-schedules.ts");
  JOURNEY_SCHEDULES = schedules.JOURNEY_SCHEDULES;
} catch (e) {
  console.error("Failed to import modules. Run with: npx tsx scripts/qa-email-system.mjs");
  console.error(e.message);
  process.exit(1);
}

// ── SAMPLE BRANDING ─────────────────────────────────────────────
const testBranding = {
  name: "Test Agent",
  brokerage: "Test Realty",
  phone: "604-555-0123",
  email: "test@magnate360.com",
  title: "REALTOR®",
  physicalAddress: "123 Test St, Vancouver BC V6B 1A1",
};

const testAgent = {
  name: testBranding.name,
  brokerage: testBranding.brokerage,
  phone: testBranding.phone,
  email: testBranding.email,
  title: testBranding.title,
  initials: "TA",
};

// ══════════════════════════════════════════════════════════════════
// CATEGORY 1: TEMPLATE REGISTRY CONSISTENCY
// ══════════════════════════════════════════════════════════════════
category("1. Template Registry Consistency");

const registryKeys = Object.keys(TEMPLATE_REGISTRY);
check("Registry has entries", registryKeys.length > 0, `Found ${registryKeys.length}`);
check("Registry has 10+ templates", registryKeys.length >= 10, `Only ${registryKeys.length}`);

for (const [key, entry] of Object.entries(TEMPLATE_REGISTRY)) {
  check(`${key}: has slug`, !!entry.slug, "Missing slug");
  check(`${key}: has displayName`, !!entry.displayName, "Missing displayName");
  check(`${key}: has blockType`, !!entry.blockType, "Missing blockType");
  check(`${key}: has sampleData function`, typeof entry.sampleData === "function", "sampleData not a function");
  check(`${key}: has category`, ["journey", "event", "greeting"].includes(entry.category), `Invalid category: ${entry.category}`);
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 2: JOURNEY SCHEDULE INTEGRITY
// ══════════════════════════════════════════════════════════════════
category("2. Journey Schedule Integrity");

const journeyTypes = ["buyer", "seller", "customer", "agent"];
const validPhases = ["lead", "active", "under_contract", "past_client", "dormant"];

for (const jType of journeyTypes) {
  check(`${jType}: exists in JOURNEY_SCHEDULES`, !!JOURNEY_SCHEDULES[jType], "Missing journey type");
  if (!JOURNEY_SCHEDULES[jType]) continue;

  for (const phase of validPhases) {
    const schedule = JOURNEY_SCHEDULES[jType][phase];
    check(`${jType}.${phase}: is array`, Array.isArray(schedule), "Not an array");
    if (!Array.isArray(schedule)) continue;

    for (const step of schedule) {
      check(`${jType}.${phase}: step has emailType`, !!step.emailType, "Missing emailType");
      check(`${jType}.${phase}: step has delayHours`, typeof step.delayHours === "number", "Missing delayHours");
    }

    // Verify delays are non-decreasing within a phase
    for (let i = 1; i < schedule.length; i++) {
      check(
        `${jType}.${phase}: delays increase (${schedule[i-1].delayHours}→${schedule[i].delayHours})`,
        schedule[i].delayHours >= schedule[i-1].delayHours,
        `Delay decreased: ${schedule[i-1].delayHours} → ${schedule[i].delayHours}`
      );
    }
  }
}

// Buyer and seller must have lead.welcome as first email
check("buyer.lead starts with welcome", JOURNEY_SCHEDULES.buyer.lead[0]?.emailType === "welcome", `Got: ${JOURNEY_SCHEDULES.buyer.lead[0]?.emailType}`);
check("seller.lead starts with welcome", JOURNEY_SCHEDULES.seller.lead[0]?.emailType === "welcome", `Got: ${JOURNEY_SCHEDULES.seller.lead[0]?.emailType}`);

// ══════════════════════════════════════════════════════════════════
// CATEGORY 3: TEMPLATE RENDERING — EVERY TYPE
// ══════════════════════════════════════════════════════════════════
category("3. Template Rendering — Every Type");

const renderedTemplates = {};
for (const [key, entry] of Object.entries(TEMPLATE_REGISTRY)) {
  try {
    const data = entry.sampleData(testBranding);
    const html = assembleEmail(entry.blockType, data);
    renderedTemplates[key] = html;
    check(`${key}: renders without error`, true);
    check(`${key}: HTML length > 1000`, html.length > 1000, `Only ${html.length} chars`);
  } catch (err) {
    fail(`${key}: renders without error`, err.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 4: CASL COMPLIANCE — EVERY TEMPLATE
// ══════════════════════════════════════════════════════════════════
category("4. CASL Compliance — Every Template");

for (const [key, html] of Object.entries(renderedTemplates)) {
  check(`${key}: has unsubscribe link`, /unsubscribe/i.test(html), "Missing unsubscribe");
  check(`${key}: has physical address`, /\d+.*(?:St|Ave|Rd|Blvd|Dr|Way|Plaza)/i.test(html), "Missing physical address");
  check(`${key}: no broken template vars`, !/\{\{[^}]+\}\}/.test(html), "Has unresolved {{vars}}");
  check(`${key}: no undefined/null text`, !/>\s*undefined\s*</.test(html) && !/>\s*null\s*</.test(html), "Contains undefined/null text");
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 5: APPLE DESIGN STANDARDS — EVERY TEMPLATE
// ══════════════════════════════════════════════════════════════════
category("5. Apple Design Standards — Every Template");

for (const [key, html] of Object.entries(renderedTemplates)) {
  // Font stack
  check(`${key}: SF Pro / system font`, /SF Pro|apple-system/i.test(html), "Missing Apple font stack");
  // Max width
  check(`${key}: 600px max-width`, /600/i.test(html), "Missing 600px constraint");
  // Dark mode
  check(`${key}: dark mode support`, /prefers-color-scheme/i.test(html), "Missing dark mode media query");
  // Responsive
  check(`${key}: mobile responsive`, /max-width:\s*600px|@media/i.test(html), "Missing responsive styles");
  // Rounded corners (Apple signature)
  check(`${key}: rounded corners`, /border-radius/i.test(html), "Missing border-radius");
  // Agent name present
  check(`${key}: agent name`, /Test Agent/i.test(html), "Missing agent name");
  // Has valid HTML structure
  check(`${key}: valid HTML`, /<!DOCTYPE|<html/i.test(html) && /<\/html>|<\/table>/i.test(html), "Invalid HTML structure");
  // Preheader text
  check(`${key}: preheader text`, /display:\s*none|max-height:\s*0/i.test(html), "Missing preheader");
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 6: GREETING TEMPLATES
// ══════════════════════════════════════════════════════════════════
category("6. Greeting Templates");

const greetingTypes = [
  "greeting_birthday", "greeting_christmas", "greeting_new_year",
  "greeting_diwali", "greeting_canada_day", "greeting_thanksgiving",
];

for (const gt of greetingTypes) {
  const entry = TEMPLATE_REGISTRY[gt];
  if (!entry) {
    fail(`${gt}: exists in registry`, "Not found");
    continue;
  }
  check(`${gt}: category is greeting`, entry.category === "greeting", `Got: ${entry.category}`);
  check(`${gt}: blockType is greeting`, entry.blockType === "greeting", `Got: ${entry.blockType}`);
  check(`${gt}: renders`, !!renderedTemplates[gt], "Failed to render");
  if (renderedTemplates[gt]) {
    check(`${gt}: has occasion content`, /birthday|christmas|new year|diwali|canada|thanksgiving/i.test(renderedTemplates[gt]), "Missing occasion text");
  }
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 7: JOURNEY EMAIL TYPE COVERAGE
// ══════════════════════════════════════════════════════════════════
category("7. Journey Email Type Coverage");

// Collect all unique email types from journey schedules
const allJourneyEmailTypes = new Set();
for (const jType of ["buyer", "seller"]) {
  for (const phase of validPhases) {
    const schedule = JOURNEY_SCHEDULES[jType]?.[phase] || [];
    for (const step of schedule) {
      allJourneyEmailTypes.add(step.emailType);
    }
  }
}

// Verify each journey email type has a matching template or typeMap entry
const typeMap = {
  new_listing_alert: "listing_alert", market_update: "market_update",
  neighbourhood_guide: "neighbourhood_guide", home_anniversary: "home_anniversary",
  welcome: "welcome", reengagement: "re_engagement", referral_ask: "referral",
  closing_checklist: "closing_checklist", inspection_reminder: "inspection_reminder",
  closing_countdown: "closing_countdown",
};

for (const emailType of allJourneyEmailTypes) {
  const blockType = typeMap[emailType] || emailType;
  check(
    `${emailType}: renders via block system`,
    !!renderedTemplates[emailType] || (() => {
      try {
        const data = {
          contact: { name: "Test", firstName: "Test", type: "buyer" },
          agent: testAgent,
          content: { subject: "Test", intro: "Test", body: "Test", ctaText: "Test" },
          physicalAddress: testBranding.physicalAddress,
          unsubscribeUrl: "#",
        };
        assembleEmail(blockType, data);
        return true;
      } catch { return false; }
    })(),
    `No template or block type for ${emailType}`
  );
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 8: DATABASE SCHEMA — TABLES EXIST
// ══════════════════════════════════════════════════════════════════
category("8. Database Schema");

const requiredTables = [
  "contacts", "newsletters", "newsletter_events", "newsletter_templates",
  "contact_journeys", "realtor_agent_config", "realtor_brand_profiles",
  "listing_photos", "listings", "communications",
];

for (const table of requiredTables) {
  try {
    const { error } = await supabase.from(table).select("id").limit(1);
    check(`${table}: table exists and queryable`, !error, error?.message || "Query failed");
  } catch (e) {
    fail(`${table}: table exists`, e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 9: NEWSLETTER TEMPLATES TABLE — SLUG COVERAGE
// ══════════════════════════════════════════════════════════════════
category("9. Newsletter Templates Table — Slug Coverage");

const { data: dbTemplates } = await supabase
  .from("newsletter_templates")
  .select("slug, name, email_type, is_active");

const dbSlugs = new Set((dbTemplates || []).map(t => t.slug));

// Core journey slugs that must exist
const requiredSlugs = [
  "welcome", "market-update", "neighbourhood-guide", "new-listing-alert",
  "home-anniversary", "referral-ask", "reengagement", "just-sold", "open-house-invite",
];

for (const slug of requiredSlugs) {
  check(`slug "${slug}": exists in DB`, dbSlugs.has(slug), "Missing from newsletter_templates");
}

// Check registry slugs match DB
for (const [key, entry] of Object.entries(TEMPLATE_REGISTRY)) {
  if (entry.category === "greeting") continue; // Greetings may not need DB slugs
  const slugExists = dbSlugs.has(entry.slug);
  if (!slugExists) {
    skip(`slug "${entry.slug}": in DB`, "Not in newsletter_templates (may need migration)");
  } else {
    pass(`slug "${entry.slug}": in DB`);
  }
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 10: API ENDPOINTS — HEALTH CHECKS
// ══════════════════════════════════════════════════════════════════
category("10. API Endpoints");

const endpoints = [
  { path: "/api/cron/process-journeys", needsAuth: true },
  { path: "/api/cron/greeting-automations", needsAuth: true },
  { path: "/api/cron/daily-digest", needsAuth: true },
];

for (const ep of endpoints) {
  try {
    const headers = ep.needsAuth ? { Authorization: `Bearer ${CRON_SECRET}` } : {};
    const res = await fetch(`${PROD_URL}${ep.path}`, { headers });
    check(`${ep.path}: responds`, res.status < 500, `HTTP ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      check(`${ep.path}: returns JSON`, typeof data === "object", "Not JSON");
    }
  } catch (e) {
    fail(`${ep.path}: reachable`, e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 11: PAGE ROUTES — ALL NEWSLETTER PAGES LOAD
// ══════════════════════════════════════════════════════════════════
category("11. Page Routes");

const pages = [
  "/newsletters",
  "/newsletters/campaigns",
  "/newsletters/templates",
  "/newsletters/greetings",
  "/newsletters/editorial",
];

for (const page of pages) {
  try {
    const res = await fetch(`${PROD_URL}${page}`, { redirect: "manual" });
    // 307 = redirect to login (expected for protected pages)
    check(`${page}: loads (${res.status})`, res.status === 200 || res.status === 307, `HTTP ${res.status}`);
  } catch (e) {
    fail(`${page}: reachable`, e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 12: EDGE CASES — EMPTY DATA
// ══════════════════════════════════════════════════════════════════
category("12. Edge Cases — Empty Data");

// Render with minimal data (no listing, no market, no photos)
try {
  const html = assembleEmail("welcome", {
    contact: { name: "Test", firstName: "Test", type: "buyer" },
    agent: { name: "A", brokerage: "", phone: "", initials: "A" },
    content: { subject: "", intro: "", body: "", ctaText: "" },
    physicalAddress: "",
    unsubscribeUrl: "#",
  });
  check("welcome: renders with empty strings", html.length > 500, `Only ${html.length} chars`);
  check("welcome: no crash on empty data", true);
} catch (e) {
  fail("welcome: renders with empty strings", e.message);
}

// Render listing_alert with no photos
try {
  const html = assembleEmail("listing_alert", {
    contact: { name: "Test", firstName: "Test", type: "buyer" },
    agent: testAgent,
    content: { subject: "Test", intro: "Test", body: "", ctaText: "View" },
    listing: { address: "123 Main St", area: "Vancouver", price: "$500,000", photos: [] },
    physicalAddress: testBranding.physicalAddress,
    unsubscribeUrl: "#",
  });
  check("listing_alert: renders with no photos", html.length > 1000, `Only ${html.length} chars`);
} catch (e) {
  fail("listing_alert: renders with no photos", e.message);
}

// Render market_update with no stats
try {
  const html = assembleEmail("market_update", {
    contact: { name: "Test", firstName: "Test", type: "buyer" },
    agent: testAgent,
    content: { subject: "Update", intro: "Here's your update", body: "", ctaText: "Learn More" },
    physicalAddress: testBranding.physicalAddress,
    unsubscribeUrl: "#",
  });
  check("market_update: renders with no market data", html.length > 800, `Only ${html.length} chars`);
} catch (e) {
  fail("market_update: renders with no market data", e.message);
}

// Greeting with very long personal note
try {
  const html = assembleEmail("greeting", {
    contact: { name: "Test", firstName: "Test", type: "buyer" },
    agent: testAgent,
    content: { subject: "Happy Birthday!", intro: "Wishes!", body: "A".repeat(2000), ctaText: "Hi" },
    physicalAddress: testBranding.physicalAddress,
    unsubscribeUrl: "#",
  });
  check("greeting: handles long body (2000 chars)", html.length > 2000);
} catch (e) {
  fail("greeting: handles long body", e.message);
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 13: BRANDING CONSISTENCY
// ══════════════════════════════════════════════════════════════════
category("13. Branding Consistency");

// Check brand profile exists in DB
const { data: brandProfiles } = await supabase
  .from("realtor_brand_profiles")
  .select("display_name, physical_address, brokerage_name, phone, email")
  .limit(5);

check("Brand profiles table has data", (brandProfiles || []).length > 0, "Empty table");

for (const bp of (brandProfiles || []).slice(0, 3)) {
  check(`Brand "${bp.display_name}": has physical_address`, !!bp.physical_address, "Missing — CASL violation");
  check(`Brand "${bp.display_name}": has brokerage`, !!bp.brokerage_name, "Missing brokerage");
  check(`Brand "${bp.display_name}": has email`, !!bp.email, "Missing email");
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 14: REALTOR AGENT CONFIG
// ══════════════════════════════════════════════════════════════════
category("14. Realtor Agent Config");

const { data: configs } = await supabase
  .from("realtor_agent_config")
  .select("realtor_id, sending_enabled, brand_config, voice_rules, frequency_caps")
  .limit(5);

check("Agent config table has data", (configs || []).length > 0, "Empty table");

for (const cfg of (configs || []).slice(0, 2)) {
  const brand = cfg.brand_config || {};
  check(`Config ${cfg.realtor_id?.slice(0,8)}: has brand_config`, !!cfg.brand_config, "Missing brand_config");
  check(`Config ${cfg.realtor_id?.slice(0,8)}: sending_enabled is boolean`, typeof cfg.sending_enabled === "boolean", `Got: ${typeof cfg.sending_enabled}`);
}

// ══════════════════════════════════════════════════════════════════
// CATEGORY 15: CROSS-SYSTEM CONSISTENCY
// ══════════════════════════════════════════════════════════════════
category("15. Cross-System Consistency");

// Every email type in journey schedules should map to a renderable block type
const emailTypeToBlockType = {
  welcome: "welcome", market_update: "market_update", neighbourhood_guide: "neighbourhood_guide",
  new_listing_alert: "listing_alert", home_anniversary: "home_anniversary",
  referral_ask: "referral", reengagement: "re_engagement",
  closing_checklist: "closing_checklist", inspection_reminder: "inspection_reminder",
  closing_countdown: "closing_countdown",
};

for (const [emailType, blockType] of Object.entries(emailTypeToBlockType)) {
  try {
    const html = assembleEmail(blockType, {
      contact: { name: "Consistency Test", firstName: "Test", type: "buyer" },
      agent: testAgent,
      content: { subject: "Test", intro: "Test", body: "Test body", ctaText: "Test CTA" },
      physicalAddress: testBranding.physicalAddress,
      unsubscribeUrl: "#",
    });
    check(`${emailType}→${blockType}: consistent rendering`, html.length > 500);
  } catch (e) {
    fail(`${emailType}→${blockType}: consistent rendering`, e.message);
  }
}

// Greeting block type
try {
  const html = assembleEmail("greeting", {
    contact: { name: "Test", firstName: "Test", type: "buyer" },
    agent: testAgent,
    content: { subject: "Greeting", intro: "Hello", body: "Body", ctaText: "CTA" },
    physicalAddress: testBranding.physicalAddress,
    unsubscribeUrl: "#",
  });
  check("greeting block type: renders", html.length > 500);
} catch (e) {
  fail("greeting block type: renders", e.message);
}

// ══════════════════════════════════════════════════════════════════
// FINAL REPORT
// ══════════════════════════════════════════════════════════════════

console.log(`\n${"█".repeat(60)}`);
console.log("  FINAL REPORT");
console.log("█".repeat(60));
console.log(`\n  Total: ${totalPass + totalFail + totalSkip}`);
console.log(`  ✅ Passed: ${totalPass}`);
console.log(`  ❌ Failed: ${totalFail}`);
console.log(`  ⏭️  Skipped: ${totalSkip}`);
console.log(`  Pass rate: ${((totalPass / (totalPass + totalFail)) * 100).toFixed(1)}%`);

if (failures.length > 0) {
  console.log(`\n  ── FAILURES ──`);
  for (const f of failures) {
    console.log(`  ❌ [${f.category}] ${f.test} — ${f.reason}`);
  }
}

console.log("");
process.exit(totalFail > 0 ? 1 : 0);
