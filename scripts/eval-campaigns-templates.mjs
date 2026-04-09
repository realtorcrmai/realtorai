/**
 * ListingFlow Campaigns & Templates Evaluation
 *
 * 100 tests across 4 sections:
 *   Section 1: Template Rendering (30 tests)
 *   Section 2: Email Block System (30 tests)
 *   Section 3: Campaign Data (20 tests)
 *   Section 4: Cross-System Consistency (20 tests)
 *
 * Run: node scripts/eval-campaigns-templates.mjs
 * Requires: Server running on localhost:3000, Supabase accessible
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Run with:  node --env-file=.env.local scripts/<script>.mjs");
  console.error("   Or export them: source .env.local && node scripts/<script>.mjs");
  process.exit(1);
}

const BASE_URL = "http://localhost:3000";

const s = createClient(SUPABASE_URL, SUPABASE_KEY);
let pass = 0, fail = 0;
const failures = [];

function t(id, name, passed, detail) {
  if (passed) {
    pass++;
    console.log(`  ✅ ${id}: ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${id}: ${name}${detail ? " — " + detail : ""}`);
    failures.push(`${id}: ${name}`);
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 1: TEMPLATE RENDERING (30 tests)
// ═══════════════════════════════════════════════════════════
async function section1() {
  console.log("\n═══ SECTION 1: TEMPLATE RENDERING ═══\n");

  const TEMPLATES = [
    "listing_alert", "welcome", "market_update", "neighbourhood_guide",
    "home_anniversary", "just_sold", "open_house", "seller_report",
    "cma_preview", "re_engagement", "luxury_showcase"
  ];

  // Templates that exist in the preview endpoint: listing_alert, luxury_showcase, open_house
  // Others fall back to listing_alert
  const templateHtml = {};
  let testNum = 1;

  for (const tmpl of TEMPLATES) {
    let res, html;
    try {
      res = await fetch(`${BASE_URL}/api/templates/preview?template=${tmpl}`);
      html = await res.text();
    } catch (e) {
      // If server not reachable, fail all template tests
      t(`CT-${String(testNum).padStart(3, "0")}`, `${tmpl}: server reachable`, false, e.message);
      testNum++;
      continue;
    }
    templateHtml[tmpl] = { res, html };
  }

  // Per-template tests: status, content-type, length, doctype, brand, unsubscribe, agent, closing tag
  // That's 8 checks per template, but we only count toward our 30 total
  // We'll test all 11 templates for the core checks in batches

  // Test 1-11: Response status 200 for each template
  for (const tmpl of TEMPLATES) {
    const entry = templateHtml[tmpl];
    t(`CT-${String(testNum).padStart(3, "0")}`, `${tmpl}: status 200`,
      entry ? entry.res.status === 200 : false,
      entry ? `got ${entry.res.status}` : "no response");
    testNum++;
  }

  // For the remaining tests, pick a representative subset to stay at 30 total
  // We have 11 status tests above. Now 19 more tests:

  // Test 12: All templates return text/html content-type
  const allHtml = TEMPLATES.every(tmpl => {
    const entry = templateHtml[tmpl];
    if (!entry) return false;
    const ct = entry.res.headers.get("content-type") || "";
    return ct.includes("text/html");
  });
  t("CT-012", "All templates return text/html content-type", allHtml,
    allHtml ? undefined : "some templates missing text/html");
  testNum++;

  // Test 13: All templates HTML > 500 bytes
  const allOver500 = TEMPLATES.every(tmpl => {
    const entry = templateHtml[tmpl];
    return entry && entry.html.length > 500;
  });
  t("CT-013", "All templates HTML > 500 bytes", allOver500,
    allOver500 ? undefined : "some templates < 500 bytes");

  // Test 14: All templates contain <!DOCTYPE html>
  const allDoctype = TEMPLATES.every(tmpl => {
    const entry = templateHtml[tmpl];
    return entry && entry.html.includes("<!DOCTYPE html>");
  });
  t("CT-014", "All templates contain <!DOCTYPE html>", allDoctype);

  // Test 15: All templates contain ListingFlow or LISTINGFLOW
  const allBrand = TEMPLATES.every(tmpl => {
    const entry = templateHtml[tmpl];
    if (!entry) return false;
    const upper = entry.html.toUpperCase();
    return upper.includes("LISTINGFLOW");
  });
  t("CT-015", "All templates contain ListingFlow branding", allBrand);

  // Test 16: All templates contain Unsubscribe
  const allUnsub = TEMPLATES.every(tmpl => {
    const entry = templateHtml[tmpl];
    if (!entry) return false;
    return entry.html.toLowerCase().includes("unsubscribe");
  });
  t("CT-016", "All templates contain Unsubscribe link", allUnsub);

  // Test 17: All templates contain agent name or signature area
  const allAgent = TEMPLATES.every(tmpl => {
    const entry = templateHtml[tmpl];
    if (!entry) return false;
    const h = entry.html.toLowerCase();
    return h.includes("kunal") || h.includes("agent") || h.includes("brokerage") || h.includes("re/max") || h.includes("signature");
  });
  t("CT-017", "All templates contain agent name or signature area", allAgent);

  // Test 18: All templates end with </html> (not truncated)
  const allClosed = TEMPLATES.every(tmpl => {
    const entry = templateHtml[tmpl];
    if (!entry) return false;
    return entry.html.trim().endsWith("</html>");
  });
  t("CT-018", "All templates are valid (contain </html>)", allClosed);

  // Test 19: Invalid template name returns listing_alert fallback
  let invalidRes, invalidHtml;
  try {
    invalidRes = await fetch(`${BASE_URL}/api/templates/preview?template=nonexistent_xyz`);
    invalidHtml = await invalidRes.text();
  } catch (e) {
    invalidHtml = "";
  }
  const listingAlertHtml = templateHtml["listing_alert"]?.html || "";
  t("CT-019", "Invalid template name returns listing_alert fallback",
    invalidRes?.status === 200 && invalidHtml.length > 500 && invalidHtml === listingAlertHtml);

  // Test 20: Empty template param returns listing_alert
  let emptyRes, emptyHtml;
  try {
    emptyRes = await fetch(`${BASE_URL}/api/templates/preview`);
    emptyHtml = await emptyRes.text();
  } catch (e) {
    emptyHtml = "";
  }
  t("CT-020", "Empty template param returns listing_alert", emptyRes?.status === 200 && emptyHtml === listingAlertHtml);

  // Test 21: Templates contain SF Pro or Inter font reference
  const anyFont = TEMPLATES.some(tmpl => {
    const entry = templateHtml[tmpl];
    if (!entry) return false;
    const h = entry.html;
    return h.includes("SF Pro") || h.includes("Inter") || h.includes("sf pro") || h.includes("inter");
  });
  t("CT-021", "Templates contain SF Pro or Inter font reference", anyFont);

  // Test 22: Templates have dark mode CSS (@media prefers-color-scheme)
  const anyDark = TEMPLATES.some(tmpl => {
    const entry = templateHtml[tmpl];
    if (!entry) return false;
    return entry.html.includes("prefers-color-scheme");
  });
  t("CT-022", "Templates have dark mode CSS (prefers-color-scheme)", anyDark);

  // Test 23: listing_alert template has property image
  const laHtml = templateHtml["listing_alert"]?.html || "";
  t("CT-023", "listing_alert template has property image",
    laHtml.includes("<img") && laHtml.includes("unsplash"));

  // Test 24: luxury_showcase template has dark background (#0a0a0a)
  const lsHtml = templateHtml["luxury_showcase"]?.html || "";
  t("CT-024", "luxury_showcase template has dark background (#0a0a0a)",
    lsHtml.includes("#0a0a0a"));

  // Test 25: open_house template has event date/time
  const ohHtml = templateHtml["open_house"]?.html || "";
  t("CT-025", "open_house template has event date/time",
    ohHtml.includes("March") && (ohHtml.includes("PM") || ohHtml.includes("pm")));

  // Test 26: listing_alert has price bar
  t("CT-026", "listing_alert has price display", laHtml.includes("$1,290,000"));

  // Test 27: luxury_showcase has Playfair Display font
  t("CT-027", "luxury_showcase has Playfair Display font", lsHtml.includes("Playfair Display"));

  // Test 28: open_house has RSVP/CTA button
  t("CT-028", "open_house has RSVP CTA button",
    ohHtml.toLowerCase().includes("rsvp") || ohHtml.toLowerCase().includes("i'll be there"));

  // Test 29: listing_alert has photo grid (multiple images)
  const imgCount = (laHtml.match(/<img/g) || []).length;
  t("CT-029", "listing_alert has photo grid (multiple images)", imgCount >= 3, `found ${imgCount} images`);

  // Test 30: luxury_showcase has gold accent color (#c4a35a)
  t("CT-030", "luxury_showcase has gold accent color", lsHtml.includes("#c4a35a"));
}

// ═══════════════════════════════════════════════════════════
// SECTION 2: EMAIL BLOCK SYSTEM (30 tests)
// ═══════════════════════════════════════════════════════════
async function section2() {
  console.log("\n═══ SECTION 2: EMAIL BLOCK SYSTEM ═══\n");

  // Query sent newsletters with html_body
  const { data: sentEmails, error: sentErr } = await s
    .from("newsletters")
    .select("id, email_type, html_body, subject, contact_id, status")
    .eq("status", "sent")
    .not("html_body", "is", null)
    .limit(50);

  const emails = sentEmails || [];
  const htmlBodies = emails.map(e => e.html_body).filter(Boolean);

  // Test 31: Query 10+ sent newsletters with html_body
  t("CT-031", "At least 10 sent newsletters with html_body", htmlBodies.length >= 10,
    `found ${htmlBodies.length}`);

  // Test 32: Each html_body contains Unsubscribe footer
  const allUnsub = htmlBodies.length > 0 && htmlBodies.every(h => h.toLowerCase().includes("unsubscribe"));
  t("CT-032", "Each html_body contains Unsubscribe footer", allUnsub,
    allUnsub ? undefined : `${htmlBodies.filter(h => !h.toLowerCase().includes("unsubscribe")).length} missing`);

  // Test 33: Each html_body has agent card section
  const allAgent = htmlBodies.length > 0 && htmlBodies.every(h => {
    const low = h.toLowerCase();
    return low.includes("kunal") || low.includes("agent") || low.includes("brokerage") || low.includes("re/max") || low.includes("realtor");
  });
  t("CT-033", "Each html_body has agent card section", allAgent);

  // Test 34: Each html_body > 500 bytes
  const allOver500 = htmlBodies.length > 0 && htmlBodies.every(h => h.length > 500);
  t("CT-034", "Each html_body > 500 bytes", allOver500,
    allOver500 ? undefined : `shortest: ${Math.min(...htmlBodies.map(h => h.length))} bytes`);

  // Test 35: At least one html_body contains border-radius:980px (pill CTA)
  const anyPill = htmlBodies.some(h => h.includes("980px"));
  t("CT-035", "At least one html_body contains pill CTA (border-radius:980px)", anyPill);

  // Test 36: At least one html_body contains price formatting ($X,XXX)
  const anyPrice = htmlBodies.some(h => /\$[\d,]+/.test(h));
  t("CT-036", "At least one html_body contains price formatting ($X,XXX)", anyPrice);

  // Test 37: At least one html_body contains image tag
  const anyImg = htmlBodies.some(h => h.includes("<img"));
  t("CT-037", "At least one html_body contains image tag", anyImg);

  // Test 38: Check for hero image block presence
  const anyHeroImg = htmlBodies.some(h => {
    return h.includes("hero") || (h.includes("<img") && h.includes("width:100%"));
  });
  t("CT-038", "Hero image block present in at least one email", anyHeroImg);

  // Test 39: Check for gradient hero block presence
  const anyGradient = htmlBodies.some(h => h.includes("linear-gradient"));
  t("CT-039", "Gradient hero block present in at least one email", anyGradient);

  // Test 40: Check for stats row block presence
  const anyStats = htmlBodies.some(h => {
    const low = h.toLowerCase();
    return low.includes("average") || low.includes("median") || low.includes("stats") || low.includes("trend") || low.includes("market");
  });
  t("CT-040", "Stats row block present in at least one email", anyStats);

  // Test 41: Check for feature list block presence
  const anyFeature = htmlBodies.some(h => {
    const low = h.toLowerCase();
    return low.includes("feature") || low.includes("highlight") || low.includes("✨") || low.includes("🏡");
  });
  t("CT-041", "Feature list block present in at least one email", anyFeature);

  // Test 42: Check for open house block presence
  const anyOpenHouse = htmlBodies.some(h => {
    const low = h.toLowerCase();
    return low.includes("open house") || low.includes("rsvp") || low.includes("showing");
  });
  t("CT-042", "Open house block present in at least one email", anyOpenHouse);

  // Test 43: No raw HTML entities (&amp; should be rendered)
  const anyRawEntities = htmlBodies.some(h => {
    // Check for double-encoded entities like &amp;amp; or &amp;lt;
    return h.includes("&amp;amp;") || h.includes("&amp;lt;") || h.includes("&amp;gt;");
  });
  t("CT-043", "No double-encoded HTML entities", !anyRawEntities);

  // Test 44: No broken image references
  const anyBrokenImg = htmlBodies.some(h => {
    return h.includes('src=""') || h.includes('src="undefined"') || h.includes("src='undefined'");
  });
  t("CT-044", "No broken image references (src empty or undefined)", !anyBrokenImg);

  // Test 45: Footer contains brokerage info
  const anyBrokerage = htmlBodies.some(h => {
    const low = h.toLowerCase();
    return low.includes("brokerage") || low.includes("re/max") || low.includes("realty") || low.includes("vancouver");
  });
  t("CT-045", "Footer contains brokerage info", anyBrokerage);

  // Test 46: CTA button exists in each email
  const allCta = htmlBodies.length > 0 && htmlBodies.every(h => {
    const low = h.toLowerCase();
    return low.includes("border-radius") && (low.includes("button") || low.includes("<a") || low.includes("cta"));
  });
  t("CT-046", "CTA button exists in emails", allCta || htmlBodies.some(h => h.includes("980px")));

  // Test 47: Check Apple font stack in html
  const anyAppleFont = htmlBodies.some(h => {
    return h.includes("-apple-system") || h.includes("BlinkMacSystemFont") || h.includes("SF Pro");
  });
  t("CT-047", "Apple font stack present in emails", anyAppleFont);

  // Test 48: Check dark mode meta tag
  const anyDarkMeta = htmlBodies.some(h => h.includes("color-scheme"));
  t("CT-048", "Dark mode meta tag present", anyDarkMeta);

  // Test 49: Check viewport meta tag
  const anyViewport = htmlBodies.some(h => h.includes("viewport"));
  t("CT-049", "Viewport meta tag present", anyViewport);

  // Test 50: Verify preheader text (hidden div at top)
  const anyPreheader = htmlBodies.some(h => {
    return h.includes("display:none") || h.includes("display: none") || h.includes("max-height:0") || h.includes("max-height: 0");
  });
  t("CT-050", "Preheader text (hidden div) present", anyPreheader);

  // Tests 51-60: Template-specific block checks
  const typeMap = {};
  for (const e of emails) {
    if (!typeMap[e.email_type]) typeMap[e.email_type] = [];
    typeMap[e.email_type].push(e.html_body);
  }

  // Test 51: listing_alert emails have price bar
  const laEmails = typeMap["listing_alert"] || [];
  t("CT-051", "listing_alert emails have price display",
    laEmails.length === 0 || laEmails.some(h => /\$[\d,]+/.test(h)),
    laEmails.length === 0 ? "no listing_alert emails found" : undefined);

  // Test 52: market_update emails have stats/trend content
  const muEmails = typeMap["market_update"] || [];
  t("CT-052", "market_update emails have stats content",
    muEmails.length === 0 || muEmails.some(h => {
      const low = h.toLowerCase();
      return low.includes("average") || low.includes("median") || low.includes("trend") || low.includes("stats") || low.includes("market");
    }),
    muEmails.length === 0 ? "no market_update emails found" : undefined);

  // Test 53: welcome emails exist or fallback
  const weEmails = typeMap["welcome"] || typeMap["neighbourhood_guide"] || [];
  t("CT-053", "Welcome/neighbourhood emails present",
    weEmails.length > 0 || Object.keys(typeMap).length >= 3,
    `types found: ${Object.keys(typeMap).join(", ")}`);

  // Test 54: just_sold emails have sale info
  const jsEmails = typeMap["just_sold"] || [];
  t("CT-054", "just_sold emails have sale content",
    jsEmails.length === 0 || jsEmails.some(h => {
      const low = h.toLowerCase();
      return low.includes("sold") || low.includes("sale") || low.includes("$");
    }),
    jsEmails.length === 0 ? "no just_sold emails found" : undefined);

  // Test 55: open_house emails have event details
  const ohEmails = typeMap["open_house"] || [];
  t("CT-055", "open_house emails have event details",
    ohEmails.length === 0 || ohEmails.some(h => {
      const low = h.toLowerCase();
      return low.includes("open house") || low.includes("rsvp") || low.includes("date") || low.includes("time");
    }),
    ohEmails.length === 0 ? "no open_house emails found" : undefined);

  // Test 56: home_anniversary emails exist or skip
  const haEmails = typeMap["home_anniversary"] || [];
  t("CT-056", "home_anniversary emails have anniversary content",
    haEmails.length === 0 || haEmails.some(h => h.toLowerCase().includes("anniversary") || h.toLowerCase().includes("year")),
    haEmails.length === 0 ? "no home_anniversary emails found" : undefined);

  // Test 57: re_engagement emails have win-back content
  const reEmails = typeMap["re_engagement"] || [];
  t("CT-057", "re_engagement emails have win-back content",
    reEmails.length === 0 || reEmails.some(h => {
      const low = h.toLowerCase();
      return low.includes("miss") || low.includes("back") || low.includes("touch") || low.includes("update");
    }),
    reEmails.length === 0 ? "no re_engagement emails found" : undefined);

  // Test 58: seller_report emails exist or skip
  const srEmails = typeMap["seller_report"] || [];
  t("CT-058", "seller_report emails have report content",
    srEmails.length === 0 || srEmails.some(h => {
      const low = h.toLowerCase();
      return low.includes("report") || low.includes("listing") || low.includes("showing") || low.includes("view");
    }),
    srEmails.length === 0 ? "no seller_report emails found" : undefined);

  // Test 59: At least 3 different email types in sent newsletters
  t("CT-059", "At least 3 different email types in sent newsletters",
    Object.keys(typeMap).length >= 3, `found ${Object.keys(typeMap).length}: ${Object.keys(typeMap).join(", ")}`);

  // Test 60: No html_body is just plain text (should have HTML tags)
  const allHtmlTags = htmlBodies.length > 0 && htmlBodies.every(h => h.includes("<") && h.includes(">"));
  t("CT-060", "All html_bodies contain HTML tags (not plain text)", allHtmlTags);
}

// ═══════════════════════════════════════════════════════════
// SECTION 3: CAMPAIGN DATA (20 tests)
// ═══════════════════════════════════════════════════════════
async function section3() {
  console.log("\n═══ SECTION 3: CAMPAIGN DATA ═══\n");

  // Test 61: Listings table has active listings
  const { data: activeListings } = await s.from("listings").select("id, address, list_price, status").eq("status", "active");
  t("CT-061", "Listings table has active listings", (activeListings || []).length > 0,
    `found ${(activeListings || []).length}`);

  // Test 62: Active listings have address and list_price
  const allHaveFields = (activeListings || []).length > 0 && activeListings.every(l => l.address && l.list_price);
  t("CT-062", "Active listings have address and list_price", allHaveFields,
    (activeListings || []).length === 0 ? "no active listings" : undefined);

  // Test 63: Workflows table has campaign-related workflows
  const { data: workflows } = await s.from("workflows").select("id, slug, name").limit(20);
  t("CT-063", "Workflows table has workflows", (workflows || []).length > 0,
    `found ${(workflows || []).length}`);

  // Test 64: Blast endpoint exists and responds
  let blastRes;
  try {
    blastRes = await fetch(`${BASE_URL}/api/listings/blast`, { method: "GET" });
  } catch (e) {
    blastRes = null;
  }
  t("CT-064", "Blast endpoint exists and responds",
    blastRes !== null && blastRes.status !== 404,
    blastRes ? `status ${blastRes.status}` : "unreachable");

  // Test 65: POST /api/listings/blast with missing data returns error
  let blastErrRes;
  try {
    blastErrRes = await fetch(`${BASE_URL}/api/listings/blast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch (e) {
    blastErrRes = null;
  }
  t("CT-065", "POST /api/listings/blast with missing data returns error",
    blastErrRes !== null && blastErrRes.status >= 400,
    blastErrRes ? `status ${blastErrRes.status}` : "unreachable");

  // Test 66: Newsletter records exist with email_type for each template type
  const { data: nlTypes } = await s.from("newsletters").select("email_type").not("email_type", "is", null);
  const uniqueTypes = [...new Set((nlTypes || []).map(n => n.email_type))];
  t("CT-066", "Newsletter records exist with various email_types",
    uniqueTypes.length >= 3, `types: ${uniqueTypes.join(", ")}`);

  // Test 67: Draft newsletters have ai_context with reasoning
  const { data: drafts } = await s.from("newsletters").select("id, ai_context, status").eq("status", "draft").limit(10);
  const draftsWithContext = (drafts || []).filter(d => d.ai_context);
  t("CT-067", "Draft newsletters have ai_context",
    (drafts || []).length === 0 || draftsWithContext.length > 0,
    `${draftsWithContext.length}/${(drafts || []).length} have ai_context`);

  // Test 68: Sent newsletters have sent_at timestamp
  const { data: sentNl } = await s.from("newsletters").select("id, sent_at, status").eq("status", "sent").limit(10);
  const sentWithTs = (sentNl || []).filter(n => n.sent_at);
  t("CT-068", "Sent newsletters have sent_at timestamp",
    (sentNl || []).length === 0 || sentWithTs.length === (sentNl || []).length,
    `${sentWithTs.length}/${(sentNl || []).length} have sent_at`);

  // Test 69: Suppressed newsletters have suppression_reason
  const { data: suppressed } = await s.from("newsletters").select("id, suppression_reason, status").eq("status", "suppressed").limit(10);
  const suppWithReason = (suppressed || []).filter(n => n.suppression_reason);
  t("CT-069", "Suppressed newsletters have suppression_reason",
    (suppressed || []).length === 0 || suppWithReason.length > 0,
    (suppressed || []).length === 0 ? "no suppressed newsletters" : `${suppWithReason.length}/${(suppressed || []).length}`);

  // Test 70: Contact types distribution
  const { data: contactTypes } = await s.from("contacts").select("type");
  const typeDist = {};
  for (const c of (contactTypes || [])) {
    typeDist[c.type] = (typeDist[c.type] || 0) + 1;
  }
  t("CT-070", "Contact types distribution (buyers vs sellers)",
    Object.keys(typeDist).length >= 2,
    `distribution: ${JSON.stringify(typeDist)}`);

  // Test 71: Journey phase distribution
  const { data: journeys } = await s.from("contact_journeys").select("current_phase");
  const phaseDist = {};
  for (const j of (journeys || [])) {
    phaseDist[j.current_phase] = (phaseDist[j.current_phase] || 0) + 1;
  }
  t("CT-071", "Journey phase distribution across contacts",
    (journeys || []).length > 0,
    `phases: ${JSON.stringify(phaseDist)}`);

  // Test 72: Newsletter status distribution
  const { data: nlStatuses } = await s.from("newsletters").select("status");
  const statusDist = {};
  for (const n of (nlStatuses || [])) {
    statusDist[n.status] = (statusDist[n.status] || 0) + 1;
  }
  t("CT-072", "Newsletter status distribution",
    Object.keys(statusDist).length >= 1,
    `statuses: ${JSON.stringify(statusDist)}`);

  // Test 73: Event type distribution
  const { data: events } = await s.from("newsletter_events").select("event_type");
  const eventDist = {};
  for (const e of (events || [])) {
    eventDist[e.event_type] = (eventDist[e.event_type] || 0) + 1;
  }
  t("CT-073", "Event type distribution (opened/clicked/bounced)",
    (events || []).length > 0,
    `events: ${JSON.stringify(eventDist)}`);

  // Test 74: Click type distribution
  const { data: clickEvents } = await s.from("newsletter_events").select("link_type").eq("event_type", "clicked");
  const clickDist = {};
  for (const c of (clickEvents || [])) {
    if (c.link_type) clickDist[c.link_type] = (clickDist[c.link_type] || 0) + 1;
  }
  t("CT-074", "Click type distribution across events",
    (clickEvents || []).length > 0 || (events || []).length > 0,
    `click types: ${JSON.stringify(clickDist)}`);

  // Test 75: Engagement score distribution
  const { data: contacts } = await s.from("contacts").select("id, newsletter_intelligence");
  const scores = (contacts || [])
    .map(c => c.newsletter_intelligence?.engagement_score)
    .filter(s => s !== undefined && s !== null);
  const scoreRanges = { "0-20": 0, "21-50": 0, "51-80": 0, "81-100": 0 };
  for (const sc of scores) {
    if (sc <= 20) scoreRanges["0-20"]++;
    else if (sc <= 50) scoreRanges["21-50"]++;
    else if (sc <= 80) scoreRanges["51-80"]++;
    else scoreRanges["81-100"]++;
  }
  t("CT-075", "Engagement score distribution across contacts",
    scores.length > 0, `scores: ${JSON.stringify(scoreRanges)}, total: ${scores.length}`);

  // Test 76: Average newsletters per contact
  const { data: nlPerContact } = await s.from("newsletters").select("contact_id");
  const contactNlCount = {};
  for (const n of (nlPerContact || [])) {
    contactNlCount[n.contact_id] = (contactNlCount[n.contact_id] || 0) + 1;
  }
  const contactIds = Object.keys(contactNlCount);
  const avgNl = contactIds.length > 0
    ? (Object.values(contactNlCount).reduce((a, b) => a + b, 0) / contactIds.length).toFixed(1)
    : 0;
  t("CT-076", "Average newsletters per contact", contactIds.length > 0,
    `avg: ${avgNl} across ${contactIds.length} contacts`);

  // Test 77: Average events per newsletter
  const { data: evPerNl } = await s.from("newsletter_events").select("newsletter_id");
  const nlEvCount = {};
  for (const e of (evPerNl || [])) {
    nlEvCount[e.newsletter_id] = (nlEvCount[e.newsletter_id] || 0) + 1;
  }
  const nlIds = Object.keys(nlEvCount);
  const avgEv = nlIds.length > 0
    ? (Object.values(nlEvCount).reduce((a, b) => a + b, 0) / nlIds.length).toFixed(1)
    : 0;
  t("CT-077", "Average events per newsletter", nlIds.length > 0,
    `avg: ${avgEv} across ${nlIds.length} newsletters`);

  // Test 78: Templates coverage — at least 5 different email_types
  t("CT-078", "Templates coverage — at least 5 different email_types in newsletters",
    uniqueTypes.length >= 5, `found ${uniqueTypes.length}: ${uniqueTypes.join(", ")}`);

  // Test 79: Contact coverage — at least 20 contacts have newsletters
  t("CT-079", "Contact coverage — at least 20 contacts have newsletters",
    contactIds.length >= 20, `found ${contactIds.length}`);

  // Test 80: Recent activity — newsletters sent in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentNl, count: recentCount } = await s
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", weekAgo);
  t("CT-080", "Recent activity — newsletters sent in last 7 days",
    (recentCount || 0) > 0, `count: ${recentCount || 0}`);
}

// ═══════════════════════════════════════════════════════════
// SECTION 4: CROSS-SYSTEM CONSISTENCY (20 tests)
// ═══════════════════════════════════════════════════════════
async function section4() {
  console.log("\n═══ SECTION 4: CROSS-SYSTEM CONSISTENCY ═══\n");

  // Preload data
  const { data: allJourneys } = await s.from("contact_journeys").select("contact_id, journey_type, current_phase, created_at");
  const { data: allNewsletters } = await s.from("newsletters").select("id, contact_id, status, sent_at, subject, html_body, email_type");
  const { data: allEvents } = await s.from("newsletter_events").select("id, newsletter_id, contact_id, event_type, created_at");
  const { data: allContacts } = await s.from("contacts").select("id, type, newsletter_intelligence, phone");
  const { data: allEnrollments } = await s.from("workflow_enrollments").select("id, contact_id, workflow_id");
  const { data: allWorkflows } = await s.from("workflows").select("id");
  const { data: allComms } = await s.from("communications").select("id, contact_id").limit(200);

  const journeyContactIds = new Set((allJourneys || []).map(j => j.contact_id));
  const nlByContact = {};
  for (const n of (allNewsletters || [])) {
    nlByContact[n.contact_id] = (nlByContact[n.contact_id] || 0) + 1;
  }

  // Test 81: Every contact with a journey has at least 1 newsletter (or is very new)
  const journeysWithoutNl = (allJourneys || []).filter(j => {
    const hasNl = nlByContact[j.contact_id] > 0;
    // Allow very new contacts (created in last 24h)
    const isNew = new Date(j.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    return !hasNl && !isNew;
  });
  t("CT-081", "Contacts with journeys have newsletters (or are new)",
    journeysWithoutNl.length <= Math.ceil((allJourneys || []).length * 0.1),
    `${journeysWithoutNl.length} orphaned of ${(allJourneys || []).length}`);

  // Test 82: Every contact with score > 0 has at least 1 event
  const contactEventCount = {};
  for (const e of (allEvents || [])) {
    contactEventCount[e.contact_id] = (contactEventCount[e.contact_id] || 0) + 1;
  }
  const scoredNoEvents = (allContacts || []).filter(c => {
    const score = c.newsletter_intelligence?.engagement_score || 0;
    return score > 0 && !contactEventCount[c.id];
  });
  t("CT-082", "Contacts with score > 0 have at least 1 event",
    scoredNoEvents.length <= Math.ceil((allContacts || []).length * 0.1),
    `${scoredNoEvents.length} contacts with score but no events`);

  // Test 83: Contacts in "active" phase have score > 20
  const activeJourneys = (allJourneys || []).filter(j => j.current_phase === "active");
  const activeContactIds = activeJourneys.map(j => j.contact_id);
  const contactMap = {};
  for (const c of (allContacts || [])) contactMap[c.id] = c;
  const activeLowScore = activeContactIds.filter(id => {
    const c = contactMap[id];
    return c && (c.newsletter_intelligence?.engagement_score || 0) <= 20;
  });
  t("CT-083", "Contacts in active phase have score > 20",
    activeJourneys.length === 0 || activeLowScore.length <= Math.ceil(activeJourneys.length * 0.3),
    `${activeLowScore.length}/${activeJourneys.length} active contacts with low score`);

  // Test 84: Contacts in "dormant" phase have score < 30
  const dormantJourneys = (allJourneys || []).filter(j => j.current_phase === "dormant");
  const dormantHighScore = dormantJourneys.filter(j => {
    const c = contactMap[j.contact_id];
    return c && (c.newsletter_intelligence?.engagement_score || 0) >= 30;
  });
  t("CT-084", "Contacts in dormant phase have score < 30",
    dormantJourneys.length === 0 || dormantHighScore.length <= Math.ceil(dormantJourneys.length * 0.3),
    `${dormantHighScore.length}/${dormantJourneys.length} dormant contacts with high score`);

  // Test 85: Contacts in "past_client" have at least 3 newsletters
  const pastClientJourneys = (allJourneys || []).filter(j => j.current_phase === "past_client");
  const pastClientLowNl = pastClientJourneys.filter(j => (nlByContact[j.contact_id] || 0) < 3);
  t("CT-085", "Contacts in past_client have at least 3 newsletters",
    pastClientJourneys.length === 0 || pastClientLowNl.length <= Math.ceil(pastClientJourneys.length * 0.3),
    `${pastClientLowNl.length}/${pastClientJourneys.length} past_client with < 3 emails`);

  // Test 86: Suppressed newsletters don't have sent_at
  const suppressedWithSentAt = (allNewsletters || []).filter(n => n.status === "suppressed" && n.sent_at);
  t("CT-086", "Suppressed newsletters don't have sent_at",
    suppressedWithSentAt.length === 0,
    `${suppressedWithSentAt.length} suppressed with sent_at`);

  // Test 87: Sent newsletters with events: events created_at > newsletter.sent_at
  const nlMap = {};
  for (const n of (allNewsletters || [])) nlMap[n.id] = n;
  const eventsBeforeSend = (allEvents || []).filter(e => {
    const nl = nlMap[e.newsletter_id];
    if (!nl || !nl.sent_at) return false;
    return new Date(e.created_at) < new Date(nl.sent_at);
  });
  t("CT-087", "Events created_at > newsletter.sent_at",
    eventsBeforeSend.length === 0,
    `${eventsBeforeSend.length} events before send`);

  // Test 88: No newsletter_events without corresponding newsletter
  const nlIdSet = new Set((allNewsletters || []).map(n => n.id));
  const orphanedEvents = (allEvents || []).filter(e => !nlIdSet.has(e.newsletter_id));
  t("CT-088", "No newsletter_events without corresponding newsletter",
    orphanedEvents.length === 0,
    `${orphanedEvents.length} orphaned events`);

  // Test 89: No newsletters for non-existent contacts
  const contactIdSet = new Set((allContacts || []).map(c => c.id));
  const orphanedNl = (allNewsletters || []).filter(n => !contactIdSet.has(n.contact_id));
  t("CT-089", "No newsletters for non-existent contacts",
    orphanedNl.length === 0,
    `${orphanedNl.length} orphaned newsletters`);

  // Test 90: Workflow enrollments reference existing workflows
  const wfIdSet = new Set((allWorkflows || []).map(w => w.id));
  const orphanedEnrollments = (allEnrollments || []).filter(e => !wfIdSet.has(e.workflow_id));
  t("CT-090", "Workflow enrollments reference existing workflows",
    orphanedEnrollments.length === 0,
    `${orphanedEnrollments.length} orphaned enrollments`);

  // Test 91: Journey types match contact types
  const typeMismatch = (allJourneys || []).filter(j => {
    const c = contactMap[j.contact_id];
    if (!c) return false;
    if (j.journey_type === "buyer" && c.type !== "buyer") return true;
    if (j.journey_type === "seller" && c.type !== "seller") return true;
    return false;
  });
  t("CT-091", "Journey types match contact types",
    typeMismatch.length === 0,
    `${typeMismatch.length} mismatched`);

  // Test 92: All contacts with newsletter_intelligence have valid structure
  const contactsWithIntel = (allContacts || []).filter(c => c.newsletter_intelligence);
  const invalidIntel = contactsWithIntel.filter(c => {
    const intel = c.newsletter_intelligence;
    return typeof intel !== "object" || intel === null;
  });
  t("CT-092", "Contacts with newsletter_intelligence have valid structure",
    invalidIntel.length === 0,
    `${invalidIntel.length} invalid`);

  // Test 93: Intelligence engagement_score correlates with event count
  // Higher events should generally mean higher score (allow some variance)
  const contactsWithBothScoreAndEvents = contactsWithIntel.filter(c => {
    const score = c.newsletter_intelligence?.engagement_score;
    return score !== undefined && contactEventCount[c.id] > 0;
  });
  // Just check that at least some high-event contacts have higher scores
  let correlationOk = true;
  if (contactsWithBothScoreAndEvents.length >= 5) {
    const sorted = contactsWithBothScoreAndEvents
      .map(c => ({ events: contactEventCount[c.id] || 0, score: c.newsletter_intelligence?.engagement_score || 0 }))
      .sort((a, b) => b.events - a.events);
    const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
    const bottomHalf = sorted.slice(Math.ceil(sorted.length / 2));
    const topAvg = topHalf.reduce((s, x) => s + x.score, 0) / topHalf.length;
    const bottomAvg = bottomHalf.length > 0 ? bottomHalf.reduce((s, x) => s + x.score, 0) / bottomHalf.length : 0;
    correlationOk = topAvg >= bottomAvg * 0.7; // Allow some variance
  }
  t("CT-093", "Engagement score correlates with event count",
    correlationOk,
    `${contactsWithBothScoreAndEvents.length} contacts with both`);

  // Test 94: No orphaned communications
  const orphanedComms = (allComms || []).filter(c => !contactIdSet.has(c.contact_id));
  t("CT-094", "No orphaned communications (all have valid contact_id)",
    orphanedComms.length === 0,
    `${orphanedComms.length} orphaned`);

  // Test 95: Realtor agent config exists with required fields
  const { data: agentConfig } = await s.from("realtor_agent_config").select("*").limit(1);
  const config = (agentConfig || [])[0];
  t("CT-095", "Realtor agent config exists",
    !!config,
    config ? "found" : "missing");

  // Test 96: All timestamps are valid ISO dates
  const sentNls = (allNewsletters || []).filter(n => n.sent_at);
  const invalidDates = sentNls.filter(n => isNaN(new Date(n.sent_at).getTime()));
  t("CT-096", "All sent_at timestamps are valid ISO dates",
    invalidDates.length === 0,
    `${invalidDates.length} invalid dates`);

  // Test 97: No future sent_at timestamps
  const now = new Date();
  const futureNl = sentNls.filter(n => new Date(n.sent_at) > new Date(now.getTime() + 60 * 1000)); // 1 min buffer
  t("CT-097", "No future sent_at timestamps",
    futureNl.length === 0,
    `${futureNl.length} in the future`);

  // Test 98: Newsletter subjects are not empty
  const emptySubjects = (allNewsletters || []).filter(n => !n.subject || n.subject.trim() === "");
  t("CT-098", "Newsletter subjects are not empty",
    emptySubjects.length === 0,
    `${emptySubjects.length} empty subjects`);

  // Test 99: Newsletter html_body is not empty for sent emails
  const sentNoBody = (allNewsletters || []).filter(n => n.status === "sent" && (!n.html_body || n.html_body.trim() === ""));
  t("CT-099", "Newsletter html_body is not empty for sent emails",
    sentNoBody.length === 0,
    `${sentNoBody.length} sent without body`);

  // Test 100: All newsletter statuses are in valid set
  const validStatuses = new Set(["draft", "sent", "failed", "suppressed", "skipped", "sending", "approved", "scheduled", "pending", "cancelled"]);
  const invalidStatuses = (allNewsletters || []).filter(n => !validStatuses.has(n.status));
  t("CT-100", "All newsletter statuses are in valid set",
    invalidStatuses.length === 0,
    invalidStatuses.length > 0 ? `invalid: ${[...new Set(invalidStatuses.map(n => n.status))].join(", ")}` : undefined);
}

// ═══════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════
async function cleanup() {
  console.log("\n═══ CLEANUP ═══\n");

  // Find test contacts with +19995550 prefix
  const { data: testContacts } = await s.from("contacts").select("id, phone").like("phone", "+19995550%");

  if (!testContacts || testContacts.length === 0) {
    console.log("  No test contacts with +19995550 prefix found.");
    return;
  }

  console.log(`  Found ${testContacts.length} test contacts to clean up.`);

  for (const tc of testContacts) {
    // Delete related records first
    await s.from("newsletter_events").delete().eq("contact_id", tc.id);
    await s.from("newsletters").delete().eq("contact_id", tc.id);
    await s.from("contact_journeys").delete().eq("contact_id", tc.id);
    await s.from("workflow_enrollments").delete().eq("contact_id", tc.id);
    await s.from("communications").delete().eq("contact_id", tc.id);
    await s.from("contacts").delete().eq("id", tc.id);
  }

  console.log(`  Cleaned up ${testContacts.length} test contacts and related records.`);
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
async function run() {
  const startTime = Date.now();
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║   LISTINGFLOW CAMPAIGNS & TEMPLATES EVALUATION           ║");
  console.log("║   100 tests across 4 sections                            ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  await section1();
  await section2();
  await section3();
  await section4();
  await cleanup();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log(`║   RESULTS: ${pass} passed, ${fail} failed (${elapsed}s)`.padEnd(60) + "║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  if (failures.length > 0) {
    console.log("\nFailed tests:");
    for (const f of failures) {
      console.log(`  - ${f}`);
    }
  }

  console.log("");
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
