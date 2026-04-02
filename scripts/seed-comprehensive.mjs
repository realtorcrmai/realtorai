/**
 * Realtors360 Comprehensive Seed Script
 *
 * Run: node scripts/seed-comprehensive.mjs
 *
 * Creates multi-user data covering ALL business use cases:
 *   1 admin + 4 realtors, each with unique data scenarios
 *
 * DESTRUCTIVE: Drops all existing data first, then rebuilds.
 * Idempotent: safe to run multiple times.
 *
 * FK insertion order:
 *   users → households → contacts → listings → appointments → deals →
 *   communications → tasks → newsletters → events → journeys → etc.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ═══ HELPERS ═══
function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString(); }
function daysFromNow(n) { return new Date(Date.now() + n * 86400000).toISOString(); }
function hoursAgo(n) { return new Date(Date.now() - n * 3600000).toISOString(); }
function minsAfter(base, m) { return new Date(new Date(base).getTime() + m * 60000).toISOString(); }
function dateOnly(iso) { return iso.split("T")[0]; }
function uuid(prefix, n) { return `${prefix}${"0".repeat(12 - String(n).length)}${n}`; }
function pct(n) { return Math.random() * 100 < n; }

// Deterministic UUIDs for FK references
const U = {
  admin:  "a0000000-0000-0000-0000-000000000001",
  kunal:  "e044c0c6-5523-49bc-a7e4-9fc93bfa8c3a", // existing demo user
  sarah:  "b0000000-0000-0000-0000-000000000002",
  mike:   "c0000000-0000-0000-0000-000000000003",
  priya:  "d0000000-0000-0000-0000-000000000004",
};

let totalInserted = 0;
let errors = 0;

async function ins(table, data) {
  const rows = Array.isArray(data) ? data : [data];
  const { data: result, error } = await sb.from(table).insert(rows).select("id");
  if (error) {
    console.error(`  ❌ ${table}: ${error.message}`);
    errors++;
    return [];
  }
  totalInserted += rows.length;
  return result || [];
}

async function upsertUser(user) {
  const { error } = await sb.from("users").upsert(user, { onConflict: "email" });
  if (error) console.error(`  ❌ users upsert: ${error.message}`);
  else totalInserted++;
}

// ═══ HTML EMAIL TEMPLATE ═══
function emailHtml(name, subject, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);"><tr><td style="padding:20px 32px 16px;font-size:15px;font-weight:700;color:#1d1d1f;">Realtors360</td></tr><tr><td style="padding:0 16px;"><div style="background:linear-gradient(135deg,#4f35d2,#af52de);border-radius:16px;padding:36px 28px;text-align:center;"><div style="font-size:28px;font-weight:800;color:#fff;">${subject}</div></div></td></tr><tr><td style="padding:24px 32px;font-size:15px;color:#1d1d1f;line-height:1.65;"><p>Hi ${name},</p><p>${body}</p></td></tr></table></td></tr></table></body></html>`;
}

// ═══════════════════════════════════════════════════════════════
// CLEANUP — Delete all data in reverse FK order
// ═══════════════════════════════════════════════════════════════
async function cleanup() {
  console.log("\n🧹 DROPPING ALL DATA (reverse FK order)...");
  const tables = [
    // Deepest children first
    "newsletter_events", "email_feedback", "email_recalls", "edit_history",
    "send_governor_log", "outcome_events", "ghost_drafts",
    "workflow_step_logs", "workflow_enrollments", "workflow_steps",
    "offer_conditions", "offer_history", "offers",
    "deal_checklist", "deal_parties", "mortgages", "deals",
    "showing_feedback", "open_house_visitors", "open_houses",
    "agent_decisions", "agent_events", "agent_recommendations", "agent_notifications",
    "contact_journeys", "newsletters", "communications",
    "contact_important_dates", "contact_family_members", "contact_dates",
    "contact_documents", "contact_instructions", "contact_context",
    "contact_watchlist", "contact_properties", "contact_relationships",
    "consent_records", "referrals",
    "listing_activities", "listing_documents", "form_submissions",
    "extension_tasks", "media_assets", "prompts",
    "activities", "activity_log",
    "appointments", "tasks",
    "listings", "contact_segments",
    "contacts", "households",
    // AI / config
    "agent_learning_log", "realtor_agent_config", "realtor_weekly_feedback",
    "trust_audit_log", "voice_rules", "agent_settings",
    // Users last
    "users",
  ];

  for (const t of tables) {
    const { error } = await sb.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error && !error.message.includes("schema cache")) {
      // Some tables may not support delete on all rows, try gte created_at
      const { error: e2 } = await sb.from(t).delete().gte("created_at", "2000-01-01");
      if (e2 && !e2.message.includes("schema cache")) {
        console.log(`  ⚠️  ${t}: ${e2.message.substring(0, 60)}`);
      }
    }
  }
  console.log("  ✅ All data dropped\n");
}

// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════
async function seedUsers() {
  console.log("👤 Creating users...");
  await upsertUser({ id: U.admin, email: "admin@realtors360.com", name: "System Admin", role: "admin", plan: "admin", is_active: true });
  await upsertUser({ id: U.kunal, email: "demo@realestatecrm.com", name: "Kunal Dhindsa", role: "realtor", plan: "professional", is_active: true });
  await upsertUser({ id: U.sarah, email: "sarah@realtors360.com", name: "Sarah Chen", role: "realtor", plan: "studio", is_active: true });
  await upsertUser({ id: U.mike, email: "mike@realtors360.com", name: "Mike Johnson", role: "realtor", plan: "professional", is_active: true });
  await upsertUser({ id: U.priya, email: "priya@realtors360.com", name: "Priya Patel", role: "realtor", plan: "free", is_active: true });
  console.log("  ✅ 5 users (1 admin + 4 realtors)\n");
}

// ═══════════════════════════════════════════════════════════════
// KUNAL DHINDSA — Luxury Vancouver West specialist
// Professional plan, established, full pipeline
// ═══════════════════════════════════════════════════════════════
async function seedKunal() {
  console.log("🏠 Kunal Dhindsa — Luxury Vancouver West...");
  const ids = { contacts: {}, listings: {}, households: {} };

  // ── Households ──
  const hh = await ins("households", [
    { name: "Singh-Dhindsa Family", address: "4521 W 8th Ave, Point Grey, Vancouver, BC V6R 2A7", notes: "Multi-generational" },
    { name: "Martinez Family", address: "2187 Dunbar St, Vancouver, BC V6R 3M8", notes: "Relocating to Victoria" },
    { name: "Thompson-Clark", address: "1502-1289 Hornby St, Yaletown, Vancouver, BC V6Z 1W4", notes: "Downsizing couple" },
  ]);
  ids.households.singh = hh[0]?.id;
  ids.households.martinez = hh[1]?.id;
  ids.households.thompson = hh[2]?.id;

  // ── Contacts ──
  const contacts = [
    // HOT BUYERS
    { name: "Aman Singh", email: "aman.s@demo.com", phone: "+16045551001", type: "buyer", pref_channel: "sms",
      notes: "3BR Kitsilano, $1.1-1.4M. 2 kids, Kits Elementary. Pre-approved $1.3M TD. Lease ends July 31.",
      lifecycle_stage: "active", household_id: ids.households.singh,
      casl_consent_given: true, casl_consent_date: daysAgo(60),
      buyer_preferences: { areas: ["Kitsilano", "Point Grey"], min_price: 1100000, max_price: 1400000, bedrooms: 3, property_types: ["detached", "townhouse"] } },
    { name: "Jennifer Park", email: "jen.p@demo.com", phone: "+16045551002", type: "buyer", pref_channel: "email",
      notes: "Luxury condo Yaletown/Coal Harbour. $1.5-2.2M. Single professional, designer. Wants view + concierge.",
      lifecycle_stage: "active", casl_consent_given: true, casl_consent_date: daysAgo(30),
      buyer_preferences: { areas: ["Yaletown", "Coal Harbour"], min_price: 1500000, max_price: 2200000, bedrooms: 2, property_types: ["condo"] } },
    // WARM BUYER
    { name: "David Kim", email: "david.k@demo.com", phone: "+16045551003", type: "buyer", pref_channel: "whatsapp",
      notes: "First-time buyer. East Van. $800K-$1M. Pre-approval in progress.",
      lifecycle_stage: "lead", casl_consent_given: true, casl_consent_date: daysAgo(14) },
    // SELLERS
    { name: "Linda Martinez", email: "linda.m@demo.com", phone: "+16045551004", type: "seller", pref_channel: "sms",
      notes: "3BR Dunbar heritage home $2.1M. Moving to Victoria. Listed 4 weeks ago, 12 showings so far.",
      lifecycle_stage: "active", household_id: ids.households.martinez,
      casl_consent_given: true, casl_consent_date: daysAgo(90) },
    { name: "Patricia Wilson", email: "pat.w@demo.com", phone: "+16045551005", type: "seller", pref_channel: "email",
      notes: "Point Grey family home 30 years. Downsizing. Conditional sale, closing in 3 weeks.",
      lifecycle_stage: "under_contract", household_id: ids.households.thompson,
      casl_consent_given: true, casl_consent_date: daysAgo(120) },
    { name: "Robert Chang", email: "robert.c@demo.com", phone: "+16045551006", type: "seller", pref_channel: "sms",
      notes: "Yaletown 1BR condo. CMA requested but hasn't committed. Exploring options.",
      lifecycle_stage: "lead", casl_consent_given: false },
    // PAST CLIENTS
    { name: "Amanda Foster", email: "amanda.f@demo.com", phone: "+16045551007", type: "buyer", pref_channel: "email",
      notes: "Bought Kits condo 6 months ago. Quarterly updates. Referred 2 friends.",
      lifecycle_stage: "past_client", casl_consent_given: true, casl_consent_date: daysAgo(200) },
    { name: "George Nakamura", email: "george.n@demo.com", phone: "+16045551008", type: "seller", pref_channel: "email",
      notes: "Sold West End condo 1yr ago. Now considering investment property in Kelowna.",
      lifecycle_stage: "past_client", casl_consent_given: true, casl_consent_date: daysAgo(400) },
    // DORMANT
    { name: "Chris Wong", email: "chris.w@demo.com", phone: "+16045551009", type: "buyer", pref_channel: "sms",
      notes: "Investment condos. No response in 60 days. 3 emails sent, 0 opens.",
      lifecycle_stage: "dormant", casl_consent_given: true, casl_consent_date: daysAgo(90) },
    // PARTNERS
    { name: "John Smith", email: "john@royallepage.demo", phone: "+16045551010", type: "partner", pref_channel: "email",
      notes: "Royal LePage buyer agent. Sent 3 offers on Kunal's listings last quarter.",
      partner_type: "agent", company_name: "Royal LePage", partner_active: true },
    { name: "Lisa Wong", email: "lisa@sutton.demo", phone: "+16045551011", type: "partner", pref_channel: "email",
      notes: "Sutton Group agent. Co-listed 2 properties. Kits market expert.",
      partner_type: "agent", company_name: "Sutton Group", partner_active: true },
    { name: "Angela Chen", email: "angela@tdbank.demo", phone: "+16045551012", type: "partner", pref_channel: "email",
      notes: "TD Bank mortgage specialist. Handles most of Kunal's buyer pre-approvals.",
      partner_type: "mortgage_broker", company_name: "TD Canada Trust", partner_active: true },
    { name: "James Lee", email: "james@lawfirm.demo", phone: "+16045551013", type: "partner", pref_channel: "email",
      notes: "Real estate lawyer. Handles closings. Fast turnaround.",
      partner_type: "other", company_name: "Lee & Associates", partner_active: true },
    // NO CONSENT — opted out
    { name: "Karen White", email: "karen.w@demo.com", phone: "+16045551014", type: "seller", pref_channel: "sms",
      notes: "Divorce situation, selling Coquitlam home. Sensitive. Unsubscribed from emails.",
      lifecycle_stage: "lead", casl_consent_given: false, newsletter_unsubscribed: true, sms_opted_out: false },
    // BOTH buyer+seller
    { name: "Maria Santos", email: "maria.s@demo.com", phone: "+16045551015", type: "buyer", pref_channel: "email",
      notes: "Sold Main St townhouse 6 months ago. Now looking to buy detached in Dunbar. $1.8-2.2M.",
      lifecycle_stage: "active", casl_consent_given: true, casl_consent_date: daysAgo(180),
      buyer_preferences: { areas: ["Dunbar", "Kerrisdale"], min_price: 1800000, max_price: 2200000, bedrooms: 4, property_types: ["detached"] } },
  ];

  for (const c of contacts) {
    const res = await ins("contacts", c);
    if (res[0]) ids.contacts[c.name] = res[0].id;
  }
  console.log(`  📇 ${Object.keys(ids.contacts).length} contacts`);

  // ── Family members ──
  if (ids.contacts["Aman Singh"]) {
    await ins("contact_family_members", [
      { contact_id: ids.contacts["Aman Singh"], name: "Meera Singh", relationship: "spouse", phone: "+16045551090", email: "meera.s@demo.com" },
      { contact_id: ids.contacts["Aman Singh"], name: "Aarav Singh", relationship: "child", notes: "Age 7, Kits Elementary" },
      { contact_id: ids.contacts["Aman Singh"], name: "Diya Singh", relationship: "child", notes: "Age 4" },
    ]);
  }

  // ── Contact relationships ──
  if (ids.contacts["Amanda Foster"] && ids.contacts["David Kim"]) {
    await ins("contact_relationships", {
      contact_a_id: ids.contacts["Amanda Foster"], contact_b_id: ids.contacts["David Kim"],
      relationship_type: "friend", relationship_label: "Amanda referred David", notes: "College friends — Amanda referred David"
    });
  }

  // ── Listings ──
  const listings = [
    // ACTIVE
    { address: "2187 Dunbar St, Vancouver, BC V6R 3M8", seller_id: ids.contacts["Linda Martinez"],
      status: "active", list_price: 2100000, property_type: "Residential", mls_number: "R2987654",
      lockbox_code: "4521", showing_window_start: "09:00", showing_window_end: "19:00",
      hero_image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
      notes: "Heritage character home. 3BR/2BA. Updated kitchen. Large south-facing lot." },
    { address: "1502-1289 Hornby St, Yaletown, Vancouver, BC V6Z 1W4", seller_id: ids.contacts["Patricia Wilson"],
      status: "conditional", list_price: 1850000, property_type: "Condo/Apartment", mls_number: "R2987655",
      lockbox_code: "7788", showing_window_start: "10:00", showing_window_end: "18:00",
      notes: "27th floor penthouse. 2BR+den. City/water views. Subject removal May 15." },
    { address: "456 W 12th Ave, Vancouver, BC V5Y 1V4", seller_id: ids.contacts["Robert Chang"],
      status: "active", list_price: 689000, property_type: "Condo/Apartment", mls_number: "R2987656",
      lockbox_code: "3344", showing_window_start: "11:00", showing_window_end: "20:00",
      notes: "Modern 1BR+den. South-facing. New building 2022. Low strata fees." },
    // PENDING
    { address: "789 Victoria Dr, Vancouver, BC V5L 4E5", seller_id: ids.contacts["Karen White"], status: "pending",
      list_price: 1350000, property_type: "Townhouse", mls_number: "R2987657", lockbox_code: "7891",
      notes: "3BR townhouse. End unit. Subject removal in progress." },
    // SOLD
    { address: "345 Main St, Vancouver, BC V6A 2T1", seller_id: ids.contacts["Maria Santos"],
      status: "sold", list_price: 1100000, sold_price: 1075000, property_type: "Townhouse",
      mls_number: "R2987658", lockbox_code: "3451", closing_date: dateOnly(daysAgo(180)),
      buyer_id: ids.contacts["Amanda Foster"],
      notes: "3BR townhouse. Sold $25K under asking. 18 days on market." },
    // EXPIRED
    { address: "1001 Richards St #2305, Vancouver, BC V6B 1J8", seller_id: ids.contacts["George Nakamura"], status: "expired",
      list_price: 950000, property_type: "Condo/Apartment", mls_number: "R2987659", lockbox_code: "2305",
      notes: "2BR condo. Overpriced. Expired after 90 days. Owner reconsidering." },
    // WITHDRAWN
    { address: "567 Cambie St, Vancouver, BC V6B 2N5", seller_id: ids.contacts["Chris Wong"], status: "withdrawn",
      list_price: 1500000, property_type: "Residential", lockbox_code: "5670",
      notes: "Seller changed mind. Personal reasons. May relist in spring." },
    // ACTIVE — luxury
    { address: "4521 W 2nd Ave, Point Grey, Vancouver, BC V6R 1K5", seller_id: ids.contacts["Amanda Foster"],
      status: "active", list_price: 3800000, property_type: "Residential", mls_number: "R2987660",
      lockbox_code: "9911", showing_window_start: "10:00", showing_window_end: "17:00",
      hero_image_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      notes: "5BR/4BA luxury estate. Pool. Triple garage. Ocean views. $3.8M." },
  ];

  for (const l of listings) {
    const res = await ins("listings", l);
    if (res[0]) ids.listings[l.address] = res[0].id;
  }
  console.log(`  🏡 ${Object.keys(ids.listings).length} listings`);

  // ── Listing documents ──
  const dunbarId = ids.listings["2187 Dunbar St, Vancouver, BC V6R 3M8"];
  if (dunbarId) {
    await ins("listing_documents", [
      { listing_id: dunbarId, doc_type: "DORTS", file_name: "DORTS_2187Dunbar.pdf", file_url: "/docs/DORTS_2187.pdf" },
      { listing_id: dunbarId, doc_type: "CONTRACT", file_name: "MLC_2187Dunbar.pdf", file_url: "/docs/MLC_2187.pdf" },
      { listing_id: dunbarId, doc_type: "PDS", file_name: "PDS_2187Dunbar.pdf", file_url: "/docs/PDS_2187.pdf" },
      { listing_id: dunbarId, doc_type: "FINTRAC", file_name: "FINTRAC_Martinez.pdf", file_url: "/docs/FINTRAC_Martinez.pdf" },
      { listing_id: dunbarId, doc_type: "OTHER", file_name: "PRIVACY_2187Dunbar.pdf", file_url: "/docs/PRIVACY_2187.pdf" },
    ]);
  }

  // ── Appointments / Showings ──
  if (dunbarId) {
    await ins("appointments", [
      { listing_id: dunbarId, start_time: daysAgo(21), end_time: minsAfter(daysAgo(21), 30),
        status: "confirmed", buyer_agent_name: "John Smith", buyer_agent_phone: "+16045551010",
        buyer_agent_email: "john@royallepage.demo", buyer_agent_contact_id: ids.contacts["John Smith"],
        notes: "Liked the kitchen. Concerned about roof age." },
      { listing_id: dunbarId, start_time: daysAgo(14), end_time: minsAfter(daysAgo(14), 30),
        status: "confirmed", buyer_agent_name: "Unknown Agent", buyer_agent_phone: "+16045559999",
        notes: "No follow-up. Not interested." },
      { listing_id: dunbarId, start_time: daysAgo(7), end_time: minsAfter(daysAgo(7), 30),
        status: "confirmed", buyer_agent_name: "Lisa Wong", buyer_agent_phone: "+16045551011",
        buyer_agent_contact_id: ids.contacts["Lisa Wong"],
        notes: "Second showing for their client. Pricing discussion." },
      { listing_id: dunbarId, start_time: daysFromNow(2), end_time: minsAfter(daysFromNow(2), 30),
        status: "confirmed", buyer_agent_name: "Nancy Kim", buyer_agent_phone: "+16045559001",
        notes: "First-time visitor. Pre-approved." },
      { listing_id: dunbarId, start_time: daysFromNow(5), end_time: minsAfter(daysFromNow(5), 30),
        status: "requested", buyer_agent_name: "Tom Agents", buyer_agent_phone: "+16045559002",
        notes: "Awaiting seller confirmation." },
      { listing_id: dunbarId, start_time: daysAgo(3), end_time: minsAfter(daysAgo(3), 30),
        status: "cancelled", buyer_agent_name: "Cancelled Agent", buyer_agent_phone: "+16045559003",
        notes: "Buyer cancelled — found another property." },
    ]);
  }
  const condoId = ids.listings["1502-1289 Hornby St, Yaletown, Vancouver, BC V6Z 1W4"];
  if (condoId) {
    await ins("appointments", [
      { listing_id: condoId, start_time: daysAgo(30), end_time: minsAfter(daysAgo(30), 30),
        status: "confirmed", buyer_agent_name: "John Smith", buyer_agent_phone: "+16045551010",
        notes: "Client loved the views. Made offer next day." },
    ]);
  }

  // ── Deals ──
  const soldId = ids.listings["345 Main St, Vancouver, BC V6A 2T1"];
  if (soldId) {
    const dealRes = await ins("deals", {
      listing_id: soldId, contact_id: ids.contacts["Amanda Foster"], type: "buyer",
      stage: "closed", status: "won", title: "345 Main St — Amanda Foster purchase",
      value: 1075000, commission_pct: 2.5, commission_amount: 26875,
      close_date: dateOnly(daysAgo(180)), possession_date: dateOnly(daysAgo(175)),
      notes: "Clean close. No issues."
    });
    if (dealRes[0]) {
      await ins("deal_parties", [
        { deal_id: dealRes[0].id, role: "buyer", name: "Amanda Foster", phone: "+16045551007", email: "amanda.f@demo.com" },
        { deal_id: dealRes[0].id, role: "seller", name: "Maria Santos", phone: "+16045551015", email: "maria.s@demo.com" },
        { deal_id: dealRes[0].id, role: "lawyer", name: "James Lee", phone: "+16045551013", email: "james@lawfirm.demo", company: "Lee & Associates" },
        { deal_id: dealRes[0].id, role: "mortgage_broker", name: "Angela Chen", phone: "+16045551012", email: "angela@tdbank.demo", company: "TD Canada Trust" },
      ]);
      await ins("deal_checklist", [
        { deal_id: dealRes[0].id, item: "Deposit received", completed: true, completed_at: daysAgo(200), sort_order: 1 },
        { deal_id: dealRes[0].id, item: "Home inspection", completed: true, completed_at: daysAgo(195), sort_order: 2 },
        { deal_id: dealRes[0].id, item: "Mortgage approval", completed: true, completed_at: daysAgo(190), sort_order: 3 },
        { deal_id: dealRes[0].id, item: "Subject removal", completed: true, completed_at: daysAgo(188), sort_order: 4 },
        { deal_id: dealRes[0].id, item: "Title transfer", completed: true, completed_at: daysAgo(180), sort_order: 5 },
        { deal_id: dealRes[0].id, item: "Key handover", completed: true, completed_at: daysAgo(175), sort_order: 6 },
      ]);
      await ins("mortgages", {
        deal_id: dealRes[0].id, contact_id: ids.contacts["Amanda Foster"],
        lender_name: "TD Canada Trust", mortgage_amount: 860000, interest_rate: 4.89,
        mortgage_type: "fixed", term_months: 60, amortization_years: 25,
        start_date: dateOnly(daysAgo(180)), monthly_payment: 4950,
        lender_contact: "Angela Chen", lender_phone: "+16045551012", lender_email: "angela@tdbank.demo"
      });
    }
  }

  // Active deal — conditional
  if (condoId) {
    const dealRes = await ins("deals", {
      listing_id: condoId, contact_id: ids.contacts["Jennifer Park"], type: "buyer",
      stage: "conditional", status: "active", title: "1502-1289 Hornby — Jennifer Park",
      value: 1850000, commission_pct: 2.5, commission_amount: 46250,
      subject_removal_date: dateOnly(daysFromNow(14)),
      notes: "Subject to financing and inspection. Removal May 15."
    });
    if (dealRes[0]) {
      await ins("deal_checklist", [
        { deal_id: dealRes[0].id, item: "Deposit received ($50,000)", completed: true, completed_at: daysAgo(5), sort_order: 1 },
        { deal_id: dealRes[0].id, item: "Home inspection booked", completed: true, completed_at: daysAgo(3), sort_order: 2 },
        { deal_id: dealRes[0].id, item: "Mortgage pre-approval submitted", completed: true, completed_at: daysAgo(4), sort_order: 3 },
        { deal_id: dealRes[0].id, item: "Final mortgage approval", completed: false, due_date: dateOnly(daysFromNow(10)), sort_order: 4 },
        { deal_id: dealRes[0].id, item: "Subject removal", completed: false, due_date: dateOnly(daysFromNow(14)), sort_order: 5 },
        { deal_id: dealRes[0].id, item: "Title transfer", completed: false, due_date: dateOnly(daysFromNow(30)), sort_order: 6 },
      ]);
    }
  }

  // ── Offers ──
  if (condoId && ids.contacts["Jennifer Park"]) {
    const offerRes = await ins("offers", {
      listing_id: condoId, buyer_contact_id: ids.contacts["Jennifer Park"],
      seller_contact_id: ids.contacts["Patricia Wilson"],
      offer_amount: 1800000, earnest_money: 50000, down_payment: 370000,
      status: "accepted", submitted_at: daysAgo(10), expiry_date: dateOnly(daysAgo(7)),
      closing_date: dateOnly(daysFromNow(30)), financing_type: "conventional",
      notes: "Accepted after one counter. Original ask $1.85M.",
      metadata: { counter_history: [{ amount: 1800000, date: daysAgo(10) }, { amount: 1830000, date: daysAgo(9) }, { amount: 1820000, date: daysAgo(8) }] }
    });
    if (offerRes[0]) {
      await ins("offer_conditions", [
        { offer_id: offerRes[0].id, condition_type: "financing", description: "Subject to financing approval by May 15",
          status: "pending", due_date: dateOnly(daysFromNow(14)) },
        { offer_id: offerRes[0].id, condition_type: "inspection", description: "Subject to satisfactory home inspection",
          status: "satisfied", due_date: dateOnly(daysFromNow(7)), satisfied_at: daysAgo(1) },
      ]);
      await ins("offer_history", [
        { offer_id: offerRes[0].id, action: "submitted", from_status: null, to_status: "submitted", description: "Initial offer $1.8M", performed_by: "Jennifer Park" },
        { offer_id: offerRes[0].id, action: "countered", from_status: "submitted", to_status: "countered", description: "Seller countered at $1.83M", performed_by: "Patricia Wilson" },
        { offer_id: offerRes[0].id, action: "accepted", from_status: "countered", to_status: "accepted", description: "Accepted at $1.82M", performed_by: "Jennifer Park" },
      ]);
    }
  }

  // ── Tasks ──
  await ins("tasks", [
    { title: "Follow up with Aman Singh — showing feedback", status: "pending", priority: "high", category: "follow_up",
      due_date: dateOnly(daysFromNow(1)), contact_id: ids.contacts["Aman Singh"], listing_id: dunbarId },
    { title: "Send CMA to Robert Chang", status: "pending", priority: "medium", category: "listing",
      due_date: dateOnly(daysFromNow(3)), contact_id: ids.contacts["Robert Chang"] },
    { title: "Subject removal check — Hornby penthouse", status: "in_progress", priority: "high", category: "closing",
      due_date: dateOnly(daysFromNow(14)), listing_id: condoId, contact_id: ids.contacts["Patricia Wilson"] },
    { title: "Prepare listing presentation for Karen White", status: "pending", priority: "low", category: "listing",
      due_date: dateOnly(daysFromNow(7)), contact_id: ids.contacts["Karen White"] },
    { title: "Call George Nakamura — investment property update", status: "pending", priority: "low", category: "follow_up",
      due_date: dateOnly(daysFromNow(10)), contact_id: ids.contacts["George Nakamura"] },
    { title: "Upload remaining photos for Dunbar listing", status: "completed", priority: "medium", category: "listing",
      completed_at: daysAgo(5), listing_id: dunbarId },
    { title: "Review offer from John Smith's client", status: "completed", priority: "high", category: "general",
      completed_at: daysAgo(8), listing_id: condoId },
    { title: "Amanda Foster — 6 month check-in", status: "pending", priority: "medium", category: "follow_up",
      due_date: dateOnly(daysAgo(5)), contact_id: ids.contacts["Amanda Foster"] },
  ]);

  // ── Communications ──
  const comms = [];
  if (ids.contacts["Aman Singh"]) {
    comms.push(
      { contact_id: ids.contacts["Aman Singh"], direction: "outbound", channel: "sms", body: "Hi Aman! New 3BR just listed in Kits — 2187 Dunbar St. $2.1M. Want to book a showing?", created_at: daysAgo(20) },
      { contact_id: ids.contacts["Aman Singh"], direction: "inbound", channel: "sms", body: "Yes! Can we do Saturday at 2pm?", created_at: daysAgo(20) },
      { contact_id: ids.contacts["Aman Singh"], direction: "outbound", channel: "sms", body: "Confirmed! Saturday 2 PM at 2187 Dunbar. Lockbox code: 4521. See you there!", created_at: daysAgo(19) },
    );
  }
  if (ids.contacts["Linda Martinez"]) {
    comms.push(
      { contact_id: ids.contacts["Linda Martinez"], direction: "outbound", channel: "sms", body: "Hi Linda, we have a showing request for tomorrow at 3 PM. Reply YES to confirm or NO to decline.", created_at: daysAgo(7) },
      { contact_id: ids.contacts["Linda Martinez"], direction: "inbound", channel: "sms", body: "YES", created_at: daysAgo(7) },
      { contact_id: ids.contacts["Linda Martinez"], direction: "outbound", channel: "email", body: "Weekly showing report: 3 showings this week. 2 positive feedback. 1 second showing scheduled.", created_at: daysAgo(3) },
    );
  }
  if (ids.contacts["Jennifer Park"]) {
    comms.push(
      { contact_id: ids.contacts["Jennifer Park"], direction: "outbound", channel: "email", body: "Great news Jennifer! Your offer at $1.82M has been accepted. Next steps: inspection and financing.", created_at: daysAgo(8) },
      { contact_id: ids.contacts["Jennifer Park"], direction: "inbound", channel: "email", body: "Amazing! Thank you Kunal. I'll get the inspection booked this week.", created_at: daysAgo(8) },
    );
  }
  if (comms.length) await ins("communications", comms);

  // ── Newsletters ──
  const nlContacts = [
    { name: "Aman Singh", type: "listing_alert", subject: "3 new homes in Kitsilano under $1.4M", body: "These just hit the market and match your family-friendly criteria.", score: 72, daysAgo: 14 },
    { name: "Jennifer Park", type: "market_update", subject: "Yaletown Q1 2026 market snapshot", body: "Luxury condo prices up 4.2% YoY. Average days on market: 21.", score: 78, daysAgo: 21 },
    { name: "Amanda Foster", type: "home_anniversary", subject: "Happy 6 months in your new home!", body: "Your Kitsilano condo has appreciated ~3% since you bought. Here are some maintenance tips.", score: 55, daysAgo: 5 },
    { name: "David Kim", type: "neighbourhood_guide", subject: "Your East Van neighbourhood guide", body: "Schools, parks, transit — everything you need to know about East Van for first-time buyers.", score: 45, daysAgo: 10 },
    { name: "Chris Wong", type: "listing_alert", subject: "Investment properties this week", body: "2 condos in your price range. Cap rates looking good.", score: 8, daysAgo: 30 },
  ];

  for (const nl of nlContacts) {
    if (!ids.contacts[nl.name]) continue;
    const sentAt = daysAgo(nl.daysAgo);
    const res = await ins("newsletters", {
      contact_id: ids.contacts[nl.name], email_type: nl.type, subject: nl.subject,
      html_body: emailHtml(nl.name.split(" ")[0], nl.subject, nl.body),
      status: "sent", send_mode: "review", sent_at: sentAt, created_at: sentAt,
      ai_context: { auto_generated: true, contact_type: "buyer", reasoning: `${nl.type} for ${nl.name}` },
    });
    if (res[0] && nl.score > 30) {
      await ins("newsletter_events", [
        { newsletter_id: res[0].id, contact_id: ids.contacts[nl.name], event_type: "delivered", created_at: minsAfter(sentAt, 1) },
        { newsletter_id: res[0].id, contact_id: ids.contacts[nl.name], event_type: "opened", created_at: minsAfter(sentAt, 15) },
      ]);
      if (nl.score > 50) {
        await ins("newsletter_events", {
          newsletter_id: res[0].id, contact_id: ids.contacts[nl.name], event_type: "clicked",
          link_url: "https://realtors360.com/listing", link_type: "listing",
          created_at: minsAfter(sentAt, 18),
        });
      }
    }
  }

  // ── Consent records ──
  for (const c of contacts) {
    if (c.casl_consent_given && ids.contacts[c.name]) {
      await ins("consent_records", {
        contact_id: ids.contacts[c.name], consent_type: "express",
        consent_date: c.casl_consent_date, source: "crm_signup",
        consent_text: "I agree to receive marketing emails from Realtors360.",
        country: "CA",
      });
    }
  }

  // ── Referrals ──
  if (ids.contacts["Amanda Foster"] && ids.contacts["David Kim"]) {
    await ins("referrals", {
      referred_by_contact_id: ids.contacts["Amanda Foster"],
      referred_client_contact_id: ids.contacts["David Kim"],
      referral_type: "buyer", referral_date: dateOnly(daysAgo(14)),
      status: "open", notes: "Amanda referred David after buying her own place."
    });
  }

  // ── Prompts (AI content) ──
  if (dunbarId) {
    await ins("prompts", {
      listing_id: dunbarId,
      mls_public: "Stunning heritage character home on Dunbar's most desirable block. 3BR/2BA with updated gourmet kitchen, original crown mouldings, and sun-drenched south-facing yard. Steps to shops, schools and parks.",
      mls_realtor: "Motivated seller relocating to Victoria. Well-maintained heritage home, updated 2020 kitchen, original hardwood throughout. 50x122 lot with lane access. R1-1 zoning. Open to pre-emptive offers.",
      ig_caption: "✨ NEW LISTING ✨ Heritage charm meets modern luxury on Dunbar St! 3BR beauty with original character + updated kitchen. DM for details! #VancouverRealEstate #DunbarLiving #HeritageHome",
      video_prompt: "Cinematic walkthrough of heritage Vancouver home. Start with the character front porch, move through original hardwood hallway, reveal the modern kitchen, end in the sunny backyard garden.",
      image_prompt: "Luxury real estate photo: heritage home exterior, white trim, blooming garden, golden hour lighting, Vancouver residential street."
    });
  }

  // ── Showing feedback ──
  if (dunbarId && ids.contacts["Aman Singh"]) {
    await ins("showing_feedback", {
      contact_id: ids.contacts["Aman Singh"], listing_id: dunbarId,
      reaction: "loved", issues: ["roof_age", "street_parking"],
      want_similar: true
    });
  }

  // ── Activities ──
  await ins("activities", [
    { contact_id: ids.contacts["Aman Singh"], listing_id: dunbarId, activity_type: "property_showing",
      subject: "Property showing at 2187 Dunbar", description: "Showed 3BR heritage home. Client liked kitchen, concerned about roof.",
      outcome: "interested", duration_minutes: 45, created_at: daysAgo(21) },
    { contact_id: ids.contacts["Jennifer Park"], listing_id: condoId, activity_type: "offer_submitted",
      subject: "Offer negotiation — Hornby penthouse", description: "Counter-offer accepted at $1.82M after one round.",
      outcome: "completed", duration_minutes: 120, created_at: daysAgo(8) },
    { contact_id: ids.contacts["Linda Martinez"], activity_type: "call",
      subject: "Weekly seller update", description: "Discussed showing feedback and pricing strategy.",
      outcome: "follow_up_needed", direction: "outbound", duration_minutes: 20, created_at: daysAgo(3) },
  ].filter(a => a.contact_id));

  console.log("  ✅ Kunal data complete\n");
  return ids;
}

// ═══════════════════════════════════════════════════════════════
// SARAH CHEN — First-time buyer specialist, East Van
// Studio plan, high volume, active email marketing
// ═══════════════════════════════════════════════════════════════
async function seedSarah() {
  console.log("🏠 Sarah Chen — First-time Buyer Specialist, East Van...");
  const ids = { contacts: {}, listings: {} };

  const contacts = [
    // BUYERS — first-time focus
    { name: "Tyler Brooks", email: "tyler.b@demo.com", phone: "+16045552001", type: "buyer", pref_channel: "sms",
      notes: "First-time buyer. Pre-approved $650K RBC. East Van condo or townhouse.",
      lifecycle_stage: "active", casl_consent_given: true, casl_consent_date: daysAgo(45),
      buyer_preferences: { areas: ["East Vancouver", "Mount Pleasant"], min_price: 500000, max_price: 650000, bedrooms: 1, property_types: ["condo", "townhouse"] } },
    { name: "Emma Rodriguez", email: "emma.r@demo.com", phone: "+16045552002", type: "buyer", pref_channel: "email",
      notes: "Young couple. First home. Renfrew/Hastings. $700-850K. Pre-approved Scotiabank.",
      lifecycle_stage: "active", casl_consent_given: true, casl_consent_date: daysAgo(30) },
    { name: "Jason Li", email: "jason.l@demo.com", phone: "+16045552003", type: "buyer", pref_channel: "whatsapp",
      notes: "Single professional, tech worker. Mount Pleasant condo. $550-700K. WFH needs office space.",
      lifecycle_stage: "active", casl_consent_given: true, casl_consent_date: daysAgo(20) },
    { name: "Olivia Zhang", email: "olivia.z@demo.com", phone: "+16045552004", type: "buyer", pref_channel: "email",
      notes: "First-time buyer from Burnaby. Wants East Van character. $600-750K.",
      lifecycle_stage: "lead", casl_consent_given: true, casl_consent_date: daysAgo(5) },
    // SELLERS
    { name: "Henry Tran", email: "henry.t@demo.com", phone: "+16045552005", type: "seller", pref_channel: "sms",
      notes: "Selling 2BR condo in Mount Pleasant. Upgrading to townhouse. Needs to sell first.",
      lifecycle_stage: "active", casl_consent_given: true, casl_consent_date: daysAgo(60) },
    { name: "Diana Patel", email: "diana.p@demo.com", phone: "+16045552006", type: "seller", pref_channel: "email",
      notes: "Estate sale. Father's Renfrew bungalow. 3 siblings, need consensus. Sensitive.",
      lifecycle_stage: "lead", casl_consent_given: true, casl_consent_date: daysAgo(10) },
    // PAST CLIENTS
    { name: "Mark Taylor", email: "mark.t@demo.com", phone: "+16045552007", type: "buyer", pref_channel: "email",
      notes: "Bought 1BR on Commercial Dr 8 months ago. Very happy. Active referrer.",
      lifecycle_stage: "past_client", casl_consent_given: true, casl_consent_date: daysAgo(300) },
    { name: "Sophie Anderson", email: "sophie.a@demo.com", phone: "+16045552008", type: "buyer", pref_channel: "sms",
      notes: "Bought townhouse in Strathcona 14 months ago. Anniversary coming up.",
      lifecycle_stage: "past_client", casl_consent_given: true, casl_consent_date: daysAgo(450) },
    // PARTNERS
    { name: "Rachel Green", email: "rachel@mortgages.demo", phone: "+16045552009", type: "partner", pref_channel: "email",
      notes: "Independent mortgage broker. Specializes in first-time buyer programs. CMHC expert.",
      partner_type: "mortgage_broker", company_name: "Green Mortgage Solutions", partner_active: true },
    { name: "Kevin Chu", email: "kevin@inspections.demo", phone: "+16045552010", type: "partner", pref_channel: "sms",
      notes: "Home inspector. Fast turnaround. Good with nervous first-timers.",
      partner_type: "inspector", company_name: "Chu Home Inspections", partner_active: true },
    // NEW LEAD
    { name: "Aisha Mohammed", email: "aisha.m@demo.com", phone: "+16045552011", type: "buyer", pref_channel: "email",
      notes: "Website inquiry yesterday. Single mom, needs 2BR near transit. Budget ~$600K.",
      lifecycle_stage: "lead", casl_consent_given: true, casl_consent_date: daysAgo(1) },
    // DORMANT
    { name: "Brandon Wu", email: "brandon.w@demo.com", phone: "+16045552012", type: "buyer", pref_channel: "sms",
      notes: "Was looking 3 months ago. Went quiet. Pre-approval may have expired.",
      lifecycle_stage: "dormant", casl_consent_given: true, casl_consent_date: daysAgo(120) },
  ];

  for (const c of contacts) {
    const res = await ins("contacts", c);
    if (res[0]) ids.contacts[c.name] = res[0].id;
  }
  console.log(`  📇 ${Object.keys(ids.contacts).length} contacts`);

  // ── Listings ──
  const listings = [
    { address: "2205 E 1st Ave, Vancouver, BC V5N 1B4", seller_id: ids.contacts["Henry Tran"],
      status: "active", list_price: 599000, property_type: "Condo/Apartment", mls_number: "R2988001",
      lockbox_code: "2205", showing_window_start: "10:00", showing_window_end: "20:00",
      notes: "2BR/1BA in Mount Pleasant. Open concept. In-suite laundry. 1 parking." },
    { address: "1455 Renfrew St, Vancouver, BC V5K 4B5", seller_id: ids.contacts["Diana Patel"],
      status: "active", list_price: 899000, property_type: "Residential", mls_number: "R2988002", lockbox_code: "1455",
      notes: "Estate sale. 3BR bungalow on 33x120 lot. Needs updating. RT-5 zoning — development potential." },
    { address: "567 Commercial Dr #301, Vancouver, BC V5L 3X7", seller_id: ids.contacts["Sophie Anderson"],
      status: "sold", list_price: 525000, sold_price: 535000, property_type: "Condo/Apartment",
      mls_number: "R2988003", lockbox_code: "3010", closing_date: dateOnly(daysAgo(240)),
      buyer_id: ids.contacts["Mark Taylor"],
      notes: "Sold $10K over asking. 8 days on market. Multiple offers." },
    { address: "890 E Hastings St #205, Vancouver, BC V6A 1R7", seller_id: ids.contacts["Emma Rodriguez"],
      status: "pending", list_price: 475000, property_type: "Condo/Apartment", mls_number: "R2988004", lockbox_code: "2050",
      notes: "1BR+den. Subjects in place. First-time buyer." },
    { address: "123 Keefer St #505, Vancouver, BC V6A 1X3", seller_id: ids.contacts["Henry Tran"],
      status: "active", list_price: 680000, property_type: "Condo/Apartment", mls_number: "R2988005",
      lockbox_code: "5050", showing_window_start: "11:00", showing_window_end: "19:00",
      hero_image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      notes: "2BR/2BA. New build 2024. Rooftop patio. Mountain views. Perfect for couples." },
  ];

  for (const l of listings) {
    const res = await ins("listings", l);
    if (res[0]) ids.listings[l.address] = res[0].id;
  }
  console.log(`  🏡 ${Object.keys(ids.listings).length} listings`);

  // ── Open Houses ──
  const keefer = ids.listings["123 Keefer St #505, Vancouver, BC V6A 1X3"];
  if (keefer) {
    const ohRes = await ins("open_houses", [
      { listing_id: keefer, date: dateOnly(daysAgo(7)), start_time: "14:00", end_time: "16:00",
        type: "public", status: "completed", visitor_count: 12, notes: "Good turnout. 3 serious inquiries." },
      { listing_id: keefer, date: dateOnly(daysFromNow(5)), start_time: "13:00", end_time: "15:00",
        type: "public", status: "scheduled", visitor_count: 0, notes: "Second open house. Marketing push on social." },
    ]);
    if (ohRes[0]) {
      await ins("open_house_visitors", [
        { open_house_id: ohRes[0].id, name: "Tyler Brooks", phone: "+16045552001", interest_level: "hot",
          feedback: "Loved the layout. Wants private showing.", wants_followup: true, contact_id: ids.contacts["Tyler Brooks"] },
        { open_house_id: ohRes[0].id, name: "Walk-in Visitor 1", phone: "+16045559101", interest_level: "warm",
          feedback: "Liked the area. Budget might be tight.", wants_followup: true },
        { open_house_id: ohRes[0].id, name: "Walk-in Visitor 2", phone: "+16045559102", interest_level: "cold",
          feedback: "Just browsing. Not ready to buy yet.", wants_followup: false },
      ]);
    }
  }

  // ── Appointments ──
  const mountPleasant = ids.listings["2205 E 1st Ave, Vancouver, BC V5N 1B4"];
  if (mountPleasant) {
    await ins("appointments", [
      { listing_id: mountPleasant, start_time: daysAgo(3), end_time: minsAfter(daysAgo(3), 30),
        status: "confirmed", buyer_agent_name: "Self-represented", buyer_agent_phone: "+16045552001", notes: "Tyler Brooks private showing." },
      { listing_id: mountPleasant, start_time: daysFromNow(1), end_time: minsAfter(daysFromNow(1), 30),
        status: "confirmed", buyer_agent_name: "External Agent", buyer_agent_phone: "+16045559200", notes: "External showing" },
    ]);
  }

  // ── Tasks ──
  await ins("tasks", [
    { title: "Call Aisha Mohammed — new inquiry follow-up", status: "pending", priority: "high", category: "follow_up",
      due_date: dateOnly(daysFromNow(0)), contact_id: ids.contacts["Aisha Mohammed"] },
    { title: "Book inspection for 890 E Hastings pending sale", status: "in_progress", priority: "high", category: "closing",
      due_date: dateOnly(daysFromNow(3)), contact_id: ids.contacts["Kevin Chu"] },
    { title: "Prepare open house marketing — 123 Keefer", status: "pending", priority: "medium", category: "marketing",
      due_date: dateOnly(daysFromNow(3)), listing_id: keefer },
    { title: "Sophie Anderson — home anniversary card", status: "pending", priority: "low", category: "follow_up",
      due_date: dateOnly(daysFromNow(14)), contact_id: ids.contacts["Sophie Anderson"] },
    { title: "Send Brandon Wu re-engagement email", status: "pending", priority: "low", category: "follow_up",
      due_date: dateOnly(daysFromNow(2)), contact_id: ids.contacts["Brandon Wu"] },
    { title: "Estate paperwork for Diana Patel's property", status: "pending", priority: "medium", category: "listing",
      due_date: dateOnly(daysFromNow(7)), contact_id: ids.contacts["Diana Patel"] },
  ]);

  // ── Contact Journeys ──
  const journeyContacts = [
    { name: "Tyler Brooks", type: "buyer", phase: "active", days: 45, emails: 5 },
    { name: "Emma Rodriguez", type: "buyer", phase: "active", days: 30, emails: 3 },
    { name: "Jason Li", type: "buyer", phase: "active", days: 20, emails: 2 },
    { name: "Mark Taylor", type: "buyer", phase: "past_client", days: 240, emails: 4 },
    { name: "Brandon Wu", type: "buyer", phase: "dormant", days: 90, emails: 3 },
    { name: "Aisha Mohammed", type: "buyer", phase: "lead", days: 1, emails: 0 },
  ];
  for (const j of journeyContacts) {
    if (!ids.contacts[j.name]) continue;
    await ins("contact_journeys", {
      contact_id: ids.contacts[j.name], journey_type: j.type, current_phase: j.phase,
      phase_entered_at: daysAgo(Math.min(j.days, 7)),
      next_email_at: j.phase === "dormant" ? null : daysFromNow(3),
      emails_sent_in_phase: j.emails, send_mode: "review",
      agent_mode: "schedule", trust_level: j.emails >= 3 ? 1 : 0,
      created_at: daysAgo(j.days),
    });
  }

  // ── Communications ──
  if (ids.contacts["Tyler Brooks"]) {
    await ins("communications", [
      { contact_id: ids.contacts["Tyler Brooks"], direction: "inbound", channel: "sms",
        body: "Hi Sarah! I saw the open house at 123 Keefer. Can I book a private showing at 2205 E 1st?", created_at: daysAgo(5) },
      { contact_id: ids.contacts["Tyler Brooks"], direction: "outbound", channel: "sms",
        body: "Absolutely Tyler! How about Thursday at 6 PM? It's a great 2BR in Mount Pleasant.", created_at: daysAgo(5) },
    ]);
  }

  console.log("  ✅ Sarah data complete\n");
  return ids;
}

// ═══════════════════════════════════════════════════════════════
// MIKE JOHNSON — Investment/Commercial, Burnaby/Surrey
// Professional plan, referral-heavy, deal-focused
// ═══════════════════════════════════════════════════════════════
async function seedMike() {
  console.log("🏠 Mike Johnson — Investment Specialist, Burnaby/Surrey...");
  const ids = { contacts: {}, listings: {} };

  const contacts = [
    // INVESTORS
    { name: "Victor Huang", email: "victor.h@demo.com", phone: "+16045553001", type: "buyer", pref_channel: "email",
      notes: "Portfolio investor. 6 properties. Looking for Burnaby condos $400-600K for rental income.",
      lifecycle_stage: "active", casl_consent_given: true, casl_consent_date: daysAgo(200) },
    { name: "Natasha Volkov", email: "natasha.v@demo.com", phone: "+16045553002", type: "buyer", pref_channel: "email",
      notes: "International investor. Surrey townhouses. $600-800K. Cash buyer. Wants 5%+ cap rate.",
      lifecycle_stage: "active", casl_consent_given: true, casl_consent_date: daysAgo(30) },
    { name: "Ryan O'Brien", email: "ryan.o@demo.com", phone: "+16045553003", type: "buyer", pref_channel: "sms",
      notes: "First investment property. Burnaby. $500-650K. Needs education on landlord responsibilities.",
      lifecycle_stage: "lead", casl_consent_given: true, casl_consent_date: daysAgo(7) },
    // SELLERS
    { name: "Sandra Kim", email: "sandra.k@demo.com", phone: "+16045553004", type: "seller", pref_channel: "email",
      notes: "Selling Surrey 4-plex. Retiring. $1.8M. All 4 units tenanted. Cap rate 4.8%.",
      lifecycle_stage: "active", casl_consent_given: true, casl_consent_date: daysAgo(45) },
    { name: "Paul Greenberg", email: "paul.g@demo.com", phone: "+16045553005", type: "seller", pref_channel: "sms",
      notes: "Selling Burnaby townhouse. Relocating to Calgary. Motivated. $750K.",
      lifecycle_stage: "active", casl_consent_given: true, casl_consent_date: daysAgo(20) },
    // REFERRAL PARTNERS
    { name: "Diana Ross", email: "diana@investments.demo", phone: "+16045553006", type: "partner", pref_channel: "email",
      notes: "Financial advisor. Refers investor clients. 4 referrals last year.",
      partner_type: "financial_advisor", company_name: "Ross Financial Planning", partner_active: true },
    { name: "Tom Hardy", email: "tom@propertymanage.demo", phone: "+16045553007", type: "partner", pref_channel: "email",
      notes: "Property manager. Handles tenant placement for Mike's investor clients.",
      partner_type: "other", company_name: "Hardy Property Management", partner_active: true },
    // PAST CLIENT
    { name: "Wei Zhang", email: "wei.z@demo.com", phone: "+16045553008", type: "buyer", pref_channel: "email",
      notes: "Bought Burnaby condo last year for $520K. Renting it out. Wants second property.",
      lifecycle_stage: "past_client", casl_consent_given: true, casl_consent_date: daysAgo(400) },
  ];

  for (const c of contacts) {
    const res = await ins("contacts", c);
    if (res[0]) ids.contacts[c.name] = res[0].id;
  }
  console.log(`  📇 ${Object.keys(ids.contacts).length} contacts`);

  // ── Listings ──
  const listings = [
    { address: "7890 Kingsway, Burnaby, BC V3N 3B7", seller_id: ids.contacts["Paul Greenberg"],
      status: "active", list_price: 750000, property_type: "Townhouse", mls_number: "R2989001",
      lockbox_code: "7890", showing_window_start: "09:00", showing_window_end: "20:00",
      notes: "3BR/2.5BA townhouse. Near Metrotown. Good rental potential." },
    { address: "12450 96th Ave, Surrey, BC V3V 6H1", seller_id: ids.contacts["Sandra Kim"],
      status: "active", list_price: 1800000, property_type: "Multi-Family", mls_number: "R2989002", lockbox_code: "1245",
      notes: "4-plex. All units tenanted. Gross rent $7,200/mo. Cap rate 4.8%. Solid investment." },
    { address: "4567 Canada Way #210, Burnaby, BC V5G 1J5", seller_id: ids.contacts["Wei Zhang"],
      status: "sold", list_price: 520000, sold_price: 520000, property_type: "Condo/Apartment",
      mls_number: "R2989003", lockbox_code: "2100", closing_date: dateOnly(daysAgo(365)),
      buyer_id: ids.contacts["Wei Zhang"],
      notes: "1BR+den investment condo. Rented at $2,100/mo. 4.8% yield." },
    { address: "9876 King George Blvd, Surrey, BC V3T 2V6", seller_id: ids.contacts["Victor Huang"],
      status: "active", list_price: 649000, property_type: "Condo/Apartment", mls_number: "R2989004",
      lockbox_code: "9876", showing_window_start: "10:00", showing_window_end: "18:00",
      notes: "2BR near SkyTrain. Pre-sale completion. Investor-friendly strata." },
  ];

  for (const l of listings) {
    const res = await ins("listings", l);
    if (res[0]) ids.listings[l.address] = res[0].id;
  }
  console.log(`  🏡 ${Object.keys(ids.listings).length} listings`);

  // ── Deals ──
  const fourplex = ids.listings["12450 96th Ave, Surrey, BC V3V 6H1"];
  if (fourplex && ids.contacts["Victor Huang"]) {
    const dealRes = await ins("deals", {
      listing_id: fourplex, contact_id: ids.contacts["Victor Huang"], type: "buyer",
      stage: "negotiation", status: "active", title: "12450 96th Ave — Victor Huang 4-plex",
      value: 1750000, commission_pct: 3.0, commission_amount: 52500,
      notes: "Offer submitted at $1.75M. Seller wants $1.8M. Negotiating."
    });
    if (dealRes[0]) {
      await ins("deal_checklist", [
        { deal_id: dealRes[0].id, item: "Initial offer submitted", completed: true, completed_at: daysAgo(3), sort_order: 1 },
        { deal_id: dealRes[0].id, item: "Counter-offer review", completed: false, due_date: dateOnly(daysFromNow(2)), sort_order: 2 },
        { deal_id: dealRes[0].id, item: "Property inspection (4 units)", completed: false, due_date: dateOnly(daysFromNow(10)), sort_order: 3 },
        { deal_id: dealRes[0].id, item: "Rent roll verification", completed: false, due_date: dateOnly(daysFromNow(10)), sort_order: 4 },
      ]);
    }
  }

  // Lost deal
  const soldCondo = ids.listings["4567 Canada Way #210, Burnaby, BC V5G 1J5"];
  if (soldCondo) {
    await ins("deals", {
      listing_id: soldCondo, contact_id: ids.contacts["Wei Zhang"], type: "buyer",
      stage: "closed", status: "won", title: "4567 Canada Way — Wei Zhang investment",
      value: 520000, commission_pct: 2.5, commission_amount: 13000,
      close_date: dateOnly(daysAgo(365)),
      notes: "Clean close. Now rented at $2,100/mo."
    });
  }

  // ── Tasks ──
  await ins("tasks", [
    { title: "Respond to Victor's counter-offer on 4-plex", status: "pending", priority: "high", category: "general",
      due_date: dateOnly(daysFromNow(1)), contact_id: ids.contacts["Victor Huang"] },
    { title: "Send investment analysis to Ryan O'Brien", status: "pending", priority: "medium", category: "follow_up",
      due_date: dateOnly(daysFromNow(3)), contact_id: ids.contacts["Ryan O'Brien"] },
    { title: "Schedule Natasha's virtual tour — Surrey townhouses", status: "pending", priority: "medium", category: "showing",
      due_date: dateOnly(daysFromNow(2)), contact_id: ids.contacts["Natasha Volkov"] },
    { title: "Wei Zhang 1-year anniversary check-in", status: "pending", priority: "low", category: "follow_up",
      due_date: dateOnly(daysFromNow(7)), contact_id: ids.contacts["Wei Zhang"] },
  ]);

  // ── Referrals ──
  if (ids.contacts["Diana Ross"] && ids.contacts["Natasha Volkov"]) {
    await ins("referrals", {
      referred_by_contact_id: ids.contacts["Diana Ross"],
      referred_client_contact_id: ids.contacts["Natasha Volkov"],
      referral_type: "buyer", referral_date: dateOnly(daysAgo(30)),
      referral_fee_percent: 25, status: "open",
      notes: "Diana referred Natasha — international investor looking for Surrey properties."
    });
  }
  if (ids.contacts["Wei Zhang"] && ids.contacts["Ryan O'Brien"]) {
    await ins("referrals", {
      referred_by_contact_id: ids.contacts["Wei Zhang"],
      referred_client_contact_id: ids.contacts["Ryan O'Brien"],
      referral_type: "buyer", referral_date: dateOnly(daysAgo(7)),
      status: "open", notes: "Wei referred Ryan — colleague interested in first investment property."
    });
  }

  // ── Appointments ──
  const kingsway = ids.listings["7890 Kingsway, Burnaby, BC V3N 3B7"];
  if (kingsway) {
    await ins("appointments", [
      { listing_id: kingsway, start_time: daysAgo(5), end_time: minsAfter(daysAgo(5), 45),
        status: "confirmed", buyer_agent_name: "Self", buyer_agent_phone: "+16045553003", notes: "Showed to Ryan O'Brien. Good fit." },
      { listing_id: kingsway, start_time: daysFromNow(3), end_time: minsAfter(daysFromNow(3), 30),
        status: "confirmed", buyer_agent_name: "External agent", buyer_agent_phone: "+16045559300", notes: "Investor viewing" },
    ]);
  }

  console.log("  ✅ Mike data complete\n");
  return ids;
}

// ═══════════════════════════════════════════════════════════════
// PRIYA PATEL — New realtor, just starting
// Free plan, minimal data
// ═══════════════════════════════════════════════════════════════
async function seedPriya() {
  console.log("🏠 Priya Patel — New Realtor (Free plan)...");
  const ids = { contacts: {}, listings: {} };

  const contacts = [
    { name: "Deepak Patel", email: "deepak.p@demo.com", phone: "+16045554001", type: "buyer", pref_channel: "whatsapp",
      notes: "Uncle. First client. Looking for 2BR condo in New Westminster. $450-550K.",
      lifecycle_stage: "lead", casl_consent_given: true, casl_consent_date: daysAgo(3) },
    { name: "Simran Kaur", email: "simran.k@demo.com", phone: "+16045554002", type: "buyer", pref_channel: "sms",
      notes: "Friend from realtor course. Wants to buy in Coquitlam. $600-700K. Just started looking.",
      lifecycle_stage: "lead", casl_consent_given: true, casl_consent_date: daysAgo(1) },
    { name: "Bob Henderson", email: "bob.h@demo.com", phone: "+16045554003", type: "seller", pref_channel: "email",
      notes: "Cold lead from door-knocking. Considering selling New West townhouse. Not committed.",
      lifecycle_stage: "lead", casl_consent_given: false },
  ];

  for (const c of contacts) {
    const res = await ins("contacts", c);
    if (res[0]) ids.contacts[c.name] = res[0].id;
  }
  console.log(`  📇 ${Object.keys(ids.contacts).length} contacts`);

  // Just 1 listing — her first
  const res = await ins("listings", {
    address: "505 Royal Ave #312, New Westminster, BC V3L 1H9",
    seller_id: ids.contacts["Bob Henderson"],
    status: "active", list_price: 489000, property_type: "Condo/Apartment", mls_number: "R2990001",
    lockbox_code: "3120", showing_window_start: "10:00", showing_window_end: "19:00",
    notes: "First listing! 2BR/1BA. River views. Close to SkyTrain. Well-maintained building."
  });
  if (res[0]) ids.listings["505 Royal Ave"] = res[0].id;
  console.log(`  🏡 1 listing`);

  // ── Tasks — learning focused ──
  await ins("tasks", [
    { title: "Complete BCREA form training module", status: "pending", priority: "high", category: "general",
      due_date: dateOnly(daysFromNow(3)) },
    { title: "Follow up with Deepak — send listings", status: "pending", priority: "high", category: "follow_up",
      due_date: dateOnly(daysFromNow(1)), contact_id: ids.contacts["Deepak Patel"] },
    { title: "Door-knock 50 homes in New West this week", status: "in_progress", priority: "medium", category: "general",
      due_date: dateOnly(daysFromNow(5)) },
  ]);

  // Minimal communications
  if (ids.contacts["Deepak Patel"]) {
    await ins("communications", [
      { contact_id: ids.contacts["Deepak Patel"], direction: "outbound", channel: "whatsapp",
        body: "Hi Uncle! I just got my license 🎉 I found a great 2BR in New West — 505 Royal Ave, $489K. Want to see it?", created_at: daysAgo(2) },
      { contact_id: ids.contacts["Deepak Patel"], direction: "inbound", channel: "whatsapp",
        body: "Congratulations beta! Yes let's go see it this weekend.", created_at: daysAgo(2) },
    ]);
  }

  console.log("  ✅ Priya data complete\n");
  return ids;
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL DATA — templates, workflows, agent config
// ═══════════════════════════════════════════════════════════════
async function seedGlobal() {
  console.log("🌐 Global data (templates, workflows)...");

  // ── Newsletter templates (skip — already seeded by migration 016) ──
  // Templates exist: welcome, new-listing-alert, market-update, just-sold, etc.

  // ── Workflows ──
  const wfRes = await ins("workflows", [
    { slug: "buyer_welcome", name: "Buyer Welcome Journey", description: "5-email nurture for new buyer leads",
      trigger_type: "new_lead", trigger_config: { contact_type: "buyer" }, contact_type: "buyer",
      is_active: true, workflow_type: "drip", is_default: true, is_published: true },
    { slug: "seller_listing", name: "Seller Listing Updates", description: "Weekly updates during active listing",
      trigger_type: "listing_status_change", contact_type: "seller",
      is_active: true, workflow_type: "lifecycle", is_default: true, is_published: true },
    { slug: "past_client_nurture", name: "Past Client Nurture", description: "Quarterly check-ins for past clients",
      trigger_type: "lead_status_change", contact_type: "buyer",
      is_active: true, workflow_type: "drip", is_default: true, is_published: true },
  ]);

  if (wfRes[0]) {
    await ins("workflow_steps", [
      { workflow_id: wfRes[0].id, step_order: 1, name: "Welcome email", action_type: "auto_email", delay_minutes: 0, delay_unit: "minutes", delay_value: 0 },
      { workflow_id: wfRes[0].id, step_order: 2, name: "Neighbourhood guide", action_type: "auto_email", delay_minutes: 4320, delay_unit: "days", delay_value: 3 },
      { workflow_id: wfRes[0].id, step_order: 3, name: "First listing alert", action_type: "auto_email", delay_minutes: 10080, delay_unit: "days", delay_value: 7 },
      { workflow_id: wfRes[0].id, step_order: 4, name: "Market update", action_type: "auto_email", delay_minutes: 20160, delay_unit: "days", delay_value: 14 },
      { workflow_id: wfRes[0].id, step_order: 5, name: "Check-in call task", action_type: "manual_task",
        task_config: { title: "Follow up call — buyer lead", priority: "medium", category: "follow_up" },
        delay_minutes: 30240, delay_unit: "days", delay_value: 21 },
    ]);
  }

  // Form templates already seeded by migration 004 — skip

  console.log("  ✅ Global data complete\n");
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  Realtors360 — Comprehensive Seed                    ║");
  console.log("║  1 admin + 4 realtors, all business use cases        ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  const start = Date.now();
  await cleanup();
  await seedUsers();
  await seedGlobal();
  const kunalIds = await seedKunal();
  const sarahIds = await seedSarah();
  const mikeIds = await seedMike();
  const priyaIds = await seedPriya();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log("═".repeat(58));
  console.log("📊 SEED COMPLETE");
  console.log("═".repeat(58));
  console.log(`  Total rows inserted: ${totalInserted}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Time: ${elapsed}s`);
  console.log("");
  console.log("  👤 Users:");
  console.log("     admin@realtors360.com (admin)");
  console.log("     demo@realestatecrm.com / Kunal Dhindsa (professional)");
  console.log("     sarah@realtors360.com / Sarah Chen (studio)");
  console.log("     mike@realtors360.com / Mike Johnson (professional)");
  console.log("     priya@realtors360.com / Priya Patel (free)");
  console.log("");
  console.log(`  📇 Contacts: Kunal=${Object.keys(kunalIds.contacts).length} Sarah=${Object.keys(sarahIds.contacts).length} Mike=${Object.keys(mikeIds.contacts).length} Priya=${Object.keys(priyaIds.contacts).length}`);
  console.log(`  🏡 Listings: Kunal=${Object.keys(kunalIds.listings).length} Sarah=${Object.keys(sarahIds.listings).length} Mike=${Object.keys(mikeIds.listings).length} Priya=1`);
  console.log("═".repeat(58));
  console.log("\n✅ Open http://localhost:3000 and login with demo@realestatecrm.com\n");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
