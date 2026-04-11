/**
 * ListingFlow Demo Seed Script — THE SINGLE SOURCE OF TRUTH
 *
 * Run: node scripts/seed-demo.mjs
 *
 * Creates everything in correct FK order:
 *   contacts → journeys → newsletters → events → intelligence
 *
 * Idempotent: safe to run multiple times (clears demo data first).
 * All demo contacts use phone prefix +1604555 for easy cleanup.
 *
 * IMPORTANT: When adding new seed data, UPDATE THIS FILE.
 * Do NOT create separate seed scripts.
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const P = "+1604555"; // Demo phone prefix

function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString(); }
function minsAfter(base, m) { return new Date(new Date(base).getTime() + m * 60000).toISOString(); }
function daysFromNow(n) { return new Date(Date.now() + n * 86400000).toISOString(); }

function html(name, body, emailType = "welcome", subject = "Update") {
  const F = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Inter','Helvetica Neue',sans-serif";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light dark"><style>@media(prefers-color-scheme:dark){.eb{background:#111!important}.ec{background:#1c1c1e!important}}</style></head><body style="margin:0;padding:0;background:#f5f5f7;font-family:${F};-webkit-font-smoothing:antialiased;" class="eb"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" class="ec"><tr><td style="padding:20px 32px 16px;"><span style="font-size:15px;font-weight:700;color:#1d1d1f;">ListingFlow</span></td></tr><tr><td style="padding:0 16px;"><div style="background:linear-gradient(135deg,#5856d6,#af52de);border-radius:16px;padding:36px 28px;text-align:center;"><div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${subject}</div></div></td></tr><tr><td style="padding:24px 32px;"><p style="font-size:15px;color:#1d1d1f;line-height:1.65;">Hi ${name},</p><p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin-top:12px;">${body}</p></td></tr><tr><td style="padding:0 32px 28px;text-align:center;"><a href="#" style="display:inline-block;background:#1d1d1f;color:#fff;padding:16px 48px;border-radius:980px;text-decoration:none;font-weight:600;font-size:15px;">View Details</a></td></tr><tr><td style="padding:0 32px 20px;"><table width="100%" style="border-top:1px solid #e5e5ea;padding-top:20px;"><tr><td width="48"><div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#5856d6,#ff6b6b);text-align:center;line-height:44px;color:#fff;font-weight:700;font-size:17px;">K</div></td><td style="padding-left:14px;"><div style="font-size:15px;font-weight:600;color:#1d1d1f;">Kunal</div><div style="font-size:13px;color:#86868b;">RE/MAX City Realty · <a href="#" style="color:#5856d6;text-decoration:none;">604-555-0123</a></div></td></tr></table></td></tr><tr><td style="padding:16px 32px 20px;text-align:center;"><p style="font-size:11px;color:#86868b;margin:0;">Kunal · RE/MAX City Realty · Vancouver, BC<br><a href="#" style="color:#86868b;text-decoration:underline;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`;
}

// ═══ CONTACT DEFINITIONS ═══
const C = [
  // HOT BUYERS
  { n:"Aman Singh", e:"amandhindsa@outlook.com", ph:"9100", t:"buyer", notes:"3BR Kitsilano, $1.1-1.4M. 2 kids, Kits Elementary. Pre-approved $1.3M TD. Lease July 31.", phase:"active", score:72, days:21, emails:5 },
  { n:"Sarah Chen", e:"sarah.c@demo.com", ph:"9101", t:"buyer", notes:"3BR detached/townhouse Kits/Pt Grey. $1.1-1.4M. Family, schools.", phase:"active", score:78, days:21, emails:6 },
  { n:"Tom Richards", e:"tom.r@demo.com", ph:"9102", t:"buyer", notes:"Mt Pleasant townhouses. $900K-$1.1M. Pre-approved.", phase:"active", score:68, days:28, emails:5 },
  // WARM BUYERS
  { n:"David Kim", e:"david.k@demo.com", ph:"9103", t:"buyer", notes:"First-time, East Van. $800K-$1M.", phase:"active", score:52, days:14, emails:3 },
  { n:"Emily Wang", e:"emily.w@demo.com", ph:"9104", t:"buyer", notes:"Yaletown 1BR condo. $550-700K.", phase:"lead", score:45, days:7, emails:2 },
  { n:"Priya Sharma", e:"priya.s@demo.com", ph:"9105", t:"buyer", notes:"Investor, Burnaby/Surrey rentals. $600-800K.", phase:"active", score:52, days:21, emails:4 },
  { n:"Mike Thompson", e:"mike.t@demo.com", ph:"9106", t:"buyer", notes:"Downsizing, West/North Van condo. $1.2M+.", phase:"under_contract", score:90, days:45, emails:6 },
  // NEW LEADS
  { n:"Jessica Liu", e:"jessica.l@demo.com", ph:"9107", t:"buyer", notes:"Relocating Toronto, 3BR school district. $1-1.3M.", phase:"lead", score:22, days:2, emails:1 },
  { n:"Rachel Martinez", e:"rachel.m@demo.com", ph:"9108", t:"buyer", notes:"Signed up yesterday. Dog-friendly near transit.", phase:"lead", score:5, days:1, emails:0 },
  { n:"Alex Turner", e:"alex.t@demo.com", ph:"9109", t:"buyer", notes:"Website form 3 days ago. East Van.", phase:"lead", score:15, days:3, emails:1 },
  // PAST CLIENTS
  { n:"Amanda Foster", e:"amanda.f@demo.com", ph:"9110", t:"buyer", notes:"Bought 6mo ago Kits. Quarterly updates.", phase:"past_client", score:55, days:180, emails:4 },
  { n:"Kevin Ng", e:"kevin.n@demo.com", ph:"9111", t:"buyer", notes:"Bought 1yr ago. Anniversary due.", phase:"past_client", score:48, days:365, emails:3 },
  // DORMANT
  { n:"Raj Patel", e:"raj.p@demo.com", ph:"9112", t:"buyer", notes:"Family of 5, Surrey. Quiet 90 days.", phase:"dormant", score:12, days:90, emails:3 },
  { n:"Chris Wong", e:"chris.w@demo.com", ph:"9113", t:"buyer", notes:"Investment condos. No response 45d.", phase:"dormant", score:8, days:60, emails:2, paused:true },
  // SELLERS
  { n:"Linda Martinez", e:"linda.m@demo.com", ph:"9201", t:"seller", notes:"3BR Dunbar $2.1M. Moving to Victoria. 4wk listed.", phase:"active", score:70, days:28, emails:4 },
  { n:"Susan Park", e:"susan.p@demo.com", ph:"9202", t:"seller", notes:"Estate sale Kerrisdale 4BR. Slow traffic.", phase:"active", score:55, days:35, emails:3 },
  { n:"Robert Chang", e:"robert.c@demo.com", ph:"9203", t:"seller", notes:"Yaletown condo, CMA requested.", phase:"lead", score:38, days:5, emails:2 },
  { n:"Karen White", e:"karen.w@demo.com", ph:"9204", t:"seller", notes:"Divorce, sell Coquitlam home. Sensitive.", phase:"lead", score:25, days:3, emails:1 },
  { n:"Mohammed Al-Rashid", e:"moh.ar@demo.com", ph:"9205", t:"seller", notes:"Burnaby townhouse, offer accepted.", phase:"under_contract", score:85, days:42, emails:5 },
  { n:"Patricia Wilson", e:"pat.w@demo.com", ph:"9206", t:"seller", notes:"Pt Grey family home 30yrs. Closing 3wk.", phase:"under_contract", score:60, days:50, emails:4 },
  { n:"George Nakamura", e:"george.n@demo.com", ph:"9207", t:"seller", notes:"Sold 1yr ago. Investment updates.", phase:"past_client", score:50, days:365, emails:3 },
  { n:"William Hughes", e:"will.h@demo.com", ph:"9208", t:"seller", notes:"Sold 2yr ago. Quarterly. Kelowna.", phase:"past_client", score:45, days:730, emails:2 },
  { n:"Maria Santos", e:"maria.s@demo.com", ph:"9209", t:"seller", notes:"Sold 6mo ago. Considering buying.", phase:"past_client", score:58, days:180, emails:3 },
  { n:"Daniel Lee", e:"daniel.l@demo.com", ph:"9210", t:"seller", notes:"Developer, Cambie pre-sales.", phase:"lead", score:30, days:10, emails:2 },
  // AGENTS
  { n:"John Smith", e:"john@rlp.demo", ph:"9301", t:"partner", notes:"Royal LePage buyer agent.", phase:null, score:0, days:0, emails:0 },
  { n:"Lisa Wong", e:"lisa@sutton.demo", ph:"9302", t:"partner", notes:"Sutton Group, Kits market.", phase:null, score:0, days:0, emails:0 },
  { n:"Mark Chen", e:"mark@mac.demo", ph:"9303", t:"partner", notes:"Macdonald Realty. Referral partner.", phase:null, score:0, days:0, emails:0 },
  { n:"Deepak Gill", e:"deepak@remax.demo", ph:"9304", t:"partner", notes:"RE/MAX co-listing.", phase:null, score:0, days:0, emails:0 },
  { n:"Nancy Kim", e:"nancy@c21.demo", ph:"9305", t:"partner", notes:"Century 21, 2 offers last qtr.", phase:null, score:0, days:0, emails:0 },
];

// Email sequences by type+phase
const SEQ = {
  buyer_lead: [
    { type:"welcome", dOff:0, subj:"Welcome! Let's find your dream home", body:"I'm excited to help you find your perfect home. I'll send personalized listings, neighbourhood guides, and market updates." },
    { type:"neighbourhood_guide", dOff:3, subj:"Your area guide — top neighbourhoods", body:"Whether Kitsilano, Point Grey, or East Van — here's your insider guide to schools, parks, transit and lifestyle." },
  ],
  buyer_active: [
    { type:"welcome", dOff:0, subj:"Welcome! Let's find your dream home", body:"I'm excited to help. Based on your preferences, I'll be sending personalized listing alerts and market data." },
    { type:"neighbourhood_guide", dOff:3, subj:"Your neighbourhood guide", body:"Here's everything you need to know about the areas you're interested in — schools, transit, lifestyle." },
    { type:"listing_alert", dOff:7, subj:"3 new homes in your price range", body:"I found properties matching your criteria. The market is moving — similar homes sold within 12 days last month." },
    { type:"listing_alert", dOff:14, subj:"New listing you'll want to see", body:"Just listed — this one matches your preferences perfectly. 4% below area average." },
    { type:"market_update", dOff:18, subj:"Monthly market snapshot", body:"Prices up 3.2%, inventory +8%. Average DOM: 12 days. More options appearing for buyers." },
    { type:"listing_alert", dOff:-1, subj:"3 listings matching your criteria", body:"These just hit the market. Based on your clicks, I focused on your preferred area and price range.", draft:true },
  ],
  buyer_under_contract: [
    { type:"welcome", dOff:0, subj:"Welcome! Let's find your home", body:"Excited to work with you on your home search." },
    { type:"listing_alert", dOff:7, subj:"Listings in your area", body:"Here are properties matching your search." },
    { type:"listing_alert", dOff:14, subj:"New homes this week", body:"Fresh listings in your preferred area." },
    { type:"market_update", dOff:21, subj:"Market update for your area", body:"Here's what's happening in the market." },
    { type:"listing_alert", dOff:28, subj:"Updated listings", body:"More options in your price range." },
    { type:"listing_alert", dOff:35, subj:"This week's top picks", body:"Curated listings based on your activity." },
  ],
  buyer_past_client: [
    { type:"welcome", dOff:0, subj:"Welcome to homeownership!", body:"Congratulations on your purchase!" },
    { type:"home_anniversary", dOff:-30, subj:"Happy home anniversary!", body:"Your home has appreciated — here's your value update and some maintenance tips." },
    { type:"market_update", dOff:-10, subj:"Your area market report", body:"Here's what's happening in your neighbourhood. Your investment is doing well." },
    { type:"market_update", dOff:-1, subj:"Quarterly update for your area", body:"Latest market data for homeowners in your neighbourhood.", draft:true },
  ],
  buyer_dormant: [
    { type:"welcome", dOff:0, subj:"Welcome!", body:"Looking forward to helping you find a home." },
    { type:"listing_alert", dOff:7, subj:"Listings in your area", body:"Properties matching your criteria." },
    { type:"market_update", dOff:-5, subj:"The market changed — here's what to know", body:"A lot has happened. Rate changes and new listings that could affect your plans." },
  ],
  seller_lead: [
    { type:"welcome", dOff:0, subj:"Let's get your home sold", body:"Thank you for considering me. I'll provide market data and a clear selling strategy." },
    { type:"market_update", dOff:2, subj:"Your home's estimated value", body:"Based on recent comparable sales, here's an initial estimate. I'd love to do a full walk-through.", draft:true },
  ],
  seller_active: [
    { type:"welcome", dOff:0, subj:"Your listing strategy", body:"Here's the marketing plan for your property." },
    { type:"market_update", dOff:7, subj:"Weekly showing report", body:"This week: showings, feedback, online views, and pricing comparison." },
    { type:"market_update", dOff:14, subj:"Week 2 listing report", body:"Updated showing data and market positioning." },
    { type:"market_update", dOff:-1, subj:"Your weekly update", body:"Latest activity on your listing.", draft:true },
  ],
  seller_under_contract: [
    { type:"welcome", dOff:0, subj:"Listing strategy", body:"Let's get your property sold." },
    { type:"market_update", dOff:7, subj:"Weekly report", body:"Showing activity and feedback." },
    { type:"market_update", dOff:14, subj:"Market update", body:"How your listing compares to recent sales." },
    { type:"market_update", dOff:21, subj:"Offer accepted — next steps", body:"Congratulations! Here's the closing timeline." },
    { type:"market_update", dOff:28, subj:"Closing preparation", body:"Documents needed and what to expect." },
  ],
  seller_past_client: [
    { type:"welcome", dOff:0, subj:"Congratulations on your sale!", body:"It was a pleasure helping you." },
    { type:"market_update", dOff:-60, subj:"Your old neighbourhood update", body:"Here's what sold after you left." },
    { type:"home_anniversary", dOff:-10, subj:"One year since the sale", body:"How's the new chapter? Your old area is still strong." },
  ],
};

async function seed() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  ListingFlow Demo Seed                           ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── CLEANUP ──
  console.log("🧹 Cleaning previous demo data...");
  const { data: old } = await supabase.from("contacts").select("id").like("phone", `${P}%`);
  // Also clean up duplicate Aman Singh contacts (from other test scripts)
  const demoEmails = C.map(c => c.e);
  const { data: emailDupes } = await supabase.from("contacts").select("id").in("email", demoEmails);
  const allOldIds = [...new Set([...(old || []).map(c => c.id), ...(emailDupes || []).map(c => c.id)])];
  if (allOldIds.length) {
    await supabase.from("contact_dates").delete().in("contact_id", allOldIds);
    await supabase.from("contact_context").delete().in("contact_id", allOldIds);
    await supabase.from("newsletter_events").delete().in("contact_id", allOldIds);
    await supabase.from("newsletters").delete().in("contact_id", allOldIds);
    await supabase.from("contact_journeys").delete().in("contact_id", allOldIds);
    await supabase.from("workflow_enrollments").delete().in("contact_id", allOldIds);
    await supabase.from("communications").delete().in("contact_id", allOldIds);
    await supabase.from("contacts").delete().in("id", allOldIds);
    console.log(`  Removed ${allOldIds.length} contacts + related data`);
  }
  // Clean up demo agent config + learning log
  await supabase.from("agent_learning_log").delete().eq("realtor_id", "demo-realtor");
  await supabase.from("realtor_agent_config").delete().eq("realtor_id", "demo-realtor");
  // Clean up demo listings (tagged with [demo-seed] in notes)
  await supabase.from("listings").delete().like("notes", "%[demo-seed]%");

  // ── FIX STALE ENROLLMENTS ──
  // Clean up completed enrollments that still have next_run_at (stale data)
  const { count: fixedEnroll } = await supabase.from("workflow_enrollments")
    .update({ next_run_at: null })
    .eq("status", "completed")
    .not("next_run_at", "is", null)
    .select("id", { count: "exact", head: true });
  if (fixedEnroll > 0) console.log(`  Fixed ${fixedEnroll} completed enrollments with stale next_run_at`);

  // ── CONTACTS ──
  console.log("\n👥 Creating contacts...");
  const map = {};
  for (const c of C) {
    const { data, error } = await supabase.from("contacts").insert({
      name: c.n, email: c.e, phone: `${P}${c.ph}`, type: c.t, pref_channel: "sms", notes: c.notes,
    }).select("id").single();
    if (error) { console.log(`  ❌ ${c.n}: ${error.message}`); continue; }
    map[c.n] = data.id;
    console.log(`  ✅ ${c.n}`);
  }

  // ── JOURNEYS ──
  console.log("\n🛤️  Creating journeys...");
  let jCount = 0;
  for (const c of C) {
    if (!c.phase || !map[c.n]) continue;
    await supabase.from("contact_journeys").insert({
      contact_id: map[c.n], journey_type: c.t === "buyer" ? "buyer" : "seller",
      current_phase: c.phase, phase_entered_at: daysAgo(Math.min(c.days, 7)),
      next_email_at: c.paused ? null : daysFromNow(2 + Math.floor(Math.random() * 5)),
      emails_sent_in_phase: c.emails, send_mode: "review", is_paused: c.paused || false,
      agent_mode: "schedule", trust_level: c.score >= 60 ? 1 : 0, created_at: daysAgo(c.days),
    });
    jCount++;
  }
  console.log(`  ${jCount} journeys created`);

  // ── NEWSLETTERS + EVENTS ──
  console.log("\n📧 Creating newsletters + events...");
  let nlCount = 0, evCount = 0, drafts = 0, suppressed = 0;

  for (const c of C) {
    if (!map[c.n] || !c.phase || c.emails === 0) continue;
    const seqKey = `${c.t}_${c.phase}`;
    const seq = SEQ[seqKey];
    if (!seq) continue;

    const firstName = c.n.split(" ")[0];
    const toSend = seq.slice(0, c.emails);

    for (const em of toSend) {
      const isDraft = em.draft || false;
      const sentAt = isDraft ? null : daysAgo(Math.max(0, c.days - (em.dOff >= 0 ? em.dOff : -em.dOff)));
      const status = isDraft ? "draft" : "sent";
      if (isDraft) drafts++;

      const { data: nl, error } = await supabase.from("newsletters").insert({
        contact_id: map[c.n], email_type: em.type, subject: em.subj,
        html_body: html(firstName, em.body), status, send_mode: "review",
        sent_at: sentAt, created_at: sentAt || daysAgo(1),
        ai_context: {
          journey_phase: c.phase, contact_type: c.t, auto_generated: true,
          reasoning: `${em.type.replace(/_/g, " ")} for ${firstName} (${c.t}, ${c.phase} phase, score ${c.score}). ${c.notes?.slice(0, 60)}.`,
        },
      }).select("id").single();

      if (error || !nl) continue;
      nlCount++;

      // Events for sent emails
      if (status === "sent" && sentAt) {
        const willOpen = Math.random() * 100 < (c.score + 25);
        const openDelay = 3 + Math.floor(Math.random() * 25);

        if (willOpen) {
          await supabase.from("newsletter_events").insert({
            newsletter_id: nl.id, contact_id: map[c.n], event_type: "opened",
            metadata: { email_type: em.type },
            created_at: minsAfter(sentAt, openDelay),
          });
          evCount++;

          // Re-open for engaged contacts
          if (c.score >= 60 && Math.random() > 0.5) {
            await supabase.from("newsletter_events").insert({
              newsletter_id: nl.id, contact_id: map[c.n], event_type: "opened",
              metadata: { reopen: true },
              created_at: minsAfter(sentAt, openDelay + 60 + Math.floor(Math.random() * 120)),
            });
            evCount++;
          }

          // Click
          if (Math.random() * 100 < c.score) {
            const ct = em.type === "listing_alert" ? "listing" :
                       em.type === "market_update" ? "market_stats" :
                       em.type === "neighbourhood_guide" ? "neighbourhood" :
                       em.type === "home_anniversary" ? "listing" : "other";
            await supabase.from("newsletter_events").insert({
              newsletter_id: nl.id, contact_id: map[c.n], event_type: "clicked",
              link_url: `https://listingflow.com/${ct.replace(/_/g, "-")}`,
              link_type: ct,
              metadata: { click_type: ct, score_impact: ct === "book_showing" ? 30 : 15 },
              created_at: minsAfter(sentAt, openDelay + 1 + Math.floor(Math.random() * 5)),
            });
            evCount++;

            // Second click for hot leads
            if (c.score >= 65 && Math.random() > 0.4) {
              const ct2 = ct === "listing" ? "mortgage_calc" : "school_info";
              await supabase.from("newsletter_events").insert({
                newsletter_id: nl.id, contact_id: map[c.n], event_type: "clicked",
                link_url: `https://listingflow.com/${ct2.replace(/_/g, "-")}`,
                link_type: ct2,
                metadata: { click_type: ct2, score_impact: ct2 === "mortgage_calc" ? 20 : 10 },
                created_at: minsAfter(sentAt, openDelay + 4 + Math.floor(Math.random() * 8)),
              });
              evCount++;
            }
          }
        }
      }
    }
  }

  // ── SUPPRESSED EMAILS ──
  const suppressions = [
    { n:"Raj Patel", r:"Auto-sunset: 5 emails sent with 0 opens in 90 days — journey paused" },
    { n:"Chris Wong", r:"Engagement declining: 0 of last 3 emails opened — reducing to 1/2 weeks" },
    { n:"Emily Wang", r:"Frequency cap: 2 emails already sent this week (max 2 for leads)" },
    { n:"Tom Richards", r:"Weekend sending disabled — deferred to Monday 9:00 AM" },
    { n:"David Kim", r:"Contact inactive 45 days — switching to re-engagement content" },
  ];
  for (const s of suppressions) {
    if (!map[s.n]) continue;
    await supabase.from("newsletters").insert({
      contact_id: map[s.n], email_type: "listing_alert",
      subject: `Listing alert — ${s.n}`,
      html_body: "<p>Suppressed by AI.</p>", status: "suppressed", send_mode: "review",
      ai_context: { suppression_reason: s.r, suppressed_at: daysAgo(Math.floor(Math.random() * 5)) },
    });
    suppressed++;
  }

  // ── INTELLIGENCE ──
  console.log("\n🧠 Updating contact intelligence...");
  for (const c of C) {
    if (!map[c.n] || c.score === 0) continue;
    const { count: opens } = await supabase.from("newsletter_events").select("id", { count: "exact", head: true }).eq("contact_id", map[c.n]).eq("event_type", "opened");
    const { count: clicks } = await supabase.from("newsletter_events").select("id", { count: "exact", head: true }).eq("contact_id", map[c.n]).eq("event_type", "clicked");
    const { data: clickData } = await supabase.from("newsletter_events").select("link_type, link_url, created_at").eq("contact_id", map[c.n]).eq("event_type", "clicked").order("created_at", { ascending: false }).limit(10);

    const areas = c.notes?.match(/Kits/i) ? ["Kitsilano"] : c.notes?.match(/East Van/i) ? ["East Vancouver"] : c.notes?.match(/Mt Pleasant|Mount Pleasant/i) ? ["Mount Pleasant"] : c.notes?.match(/Yaletown/i) ? ["Yaletown"] : c.notes?.match(/West Van/i) ? ["West Vancouver"] : c.notes?.match(/Burnaby/i) ? ["Burnaby"] : [];

    await supabase.from("contacts").update({ newsletter_intelligence: {
      engagement_score: c.score,
      engagement_trend: c.score >= 60 ? "accelerating" : c.score >= 30 ? "stable" : "declining",
      total_opens: opens || 0, total_clicks: clicks || 0,
      last_opened: opens > 0 ? daysAgo(Math.floor(Math.random() * 5)) : null,
      last_clicked: clicks > 0 ? daysAgo(Math.floor(Math.random() * 5)) : null,
      click_history: (clickData || []).map(cl => ({ link_type: cl.link_type, link_url: cl.link_url, clicked_at: cl.created_at })),
      inferred_interests: {
        areas,
        property_types: c.notes?.match(/condo/i) ? ["condo"] : c.notes?.match(/townhouse/i) ? ["townhouse"] : c.notes?.match(/house|detached/i) ? ["detached"] : [],
        lifestyle_tags: [...(c.notes?.match(/kid|school|family/i) ? ["family"] : []), ...(c.notes?.match(/invest/i) ? ["investor"] : []), ...(clicks > 0 ? ["active_searcher"] : [])],
      },
      timing_patterns: { best_day: "tuesday", best_hour: 9, data_points: c.emails },
    }}).eq("id", map[c.n]);
  }

  // ═══════════════════════════════════════════════════════════
  // A. CONTACT DATES (birthdays + closing anniversaries)
  // ═══════════════════════════════════════════════════════════
  console.log("\n📅 Creating contact dates...");
  // Cleanup any existing demo contact dates
  const demoContactIds = Object.values(map);
  if (demoContactIds.length) {
    await supabase.from("contact_dates").delete().in("contact_id", demoContactIds);
  }

  const contactDates = [
    // Birthdays — spread across months
    { name: "Aman Singh",        label: "Birthday",             date: "1992-03-15", event_type: "birthday",             recurring: true },
    { name: "Sarah Chen",        label: "Birthday",             date: "1988-06-22", event_type: "birthday",             recurring: true },
    { name: "Tom Richards",      label: "Birthday",             date: "1985-09-08", event_type: "birthday",             recurring: true },
    { name: "David Kim",         label: "Birthday",             date: "1995-01-30", event_type: "birthday",             recurring: true },
    { name: "Emily Wang",        label: "Birthday",             date: "1990-11-12", event_type: "birthday",             recurring: true },
    { name: "Linda Martinez",    label: "Birthday",             date: "1978-04-19", event_type: "birthday",             recurring: true },
    { name: "Kevin Ng",          label: "Birthday",             date: "1983-07-04", event_type: "birthday",             recurring: true },
    { name: "Amanda Foster",     label: "Birthday",             date: "1991-12-25", event_type: "birthday",             recurring: true },
    { name: "Mike Thompson",     label: "Birthday",             date: "1970-02-14", event_type: "birthday",             recurring: true },
    { name: "George Nakamura",   label: "Birthday",             date: "1965-08-31", event_type: "birthday",             recurring: true },
    // Closing anniversaries — past clients
    { name: "Kevin Ng",          label: "Closing Anniversary",  date: "2025-04-10", event_type: "closing_anniversary",  recurring: true, notes: "Bought 2BR condo in Kits — $985K" },
    { name: "Amanda Foster",     label: "Closing Anniversary",  date: "2025-10-05", event_type: "closing_anniversary",  recurring: true, notes: "Bought 3BR in Kitsilano — $1.28M" },
    { name: "George Nakamura",   label: "Closing Anniversary",  date: "2025-04-15", event_type: "closing_anniversary",  recurring: true, notes: "Sold 4BR in Dunbar — $2.35M" },
    { name: "William Hughes",    label: "Closing Anniversary",  date: "2024-03-22", event_type: "closing_anniversary",  recurring: true, notes: "Sold 3BR in Kelowna — $1.1M" },
    { name: "Maria Santos",      label: "Closing Anniversary",  date: "2025-10-18", event_type: "closing_anniversary",  recurring: true, notes: "Sold 2BR townhouse in Burnaby — $875K" },
    { name: "Patricia Wilson",   label: "Closing Anniversary",  date: "2024-12-02", event_type: "closing_anniversary",  recurring: true, notes: "Sold family home in Point Grey — $3.8M" },
  ];

  let cdCount = 0;
  for (const cd of contactDates) {
    if (!map[cd.name]) continue;
    const { error } = await supabase.from("contact_dates").insert({
      contact_id: map[cd.name],
      label: cd.label,
      date: cd.date,
      event_type: cd.event_type,
      recurring: cd.recurring,
      auto_workflow: true,
      notes: cd.notes || null,
    });
    if (!error) cdCount++;
    else console.log(`  ❌ ${cd.name} ${cd.label}: ${error.message}`);
  }
  console.log(`  ${cdCount} contact dates created`);


  // ═══════════════════════════════════════════════════════════
  // B. REALTOR AGENT CONFIG (AI agent settings)
  // ═══════════════════════════════════════════════════════════
  console.log("\n🤖 Upserting realtor agent config...");
  await supabase.from("realtor_agent_config").delete().eq("realtor_id", "demo-realtor");

  const { error: racErr } = await supabase.from("realtor_agent_config").upsert({
    realtor_id: "demo-realtor",
    brand_config: {
      voice_rules: [
        "Never use exclamation marks",
        "Always mention specific neighbourhood names",
        "Keep subject lines under 50 chars",
        "Use metric measurements (sq m, km) for international clients",
        "Sign off with first name only, never full name",
      ],
      greeting_rules: [
        { occasion: "birthday",         enabled: true,  approval: "auto" },
        { occasion: "home_anniversary", enabled: true,  approval: "review" },
        { occasion: "christmas",        enabled: true,  approval: "auto" },
        { occasion: "lunar_new_year",   enabled: true,  approval: "review" },
        { occasion: "diwali",           enabled: false, approval: "review" },
      ],
      logo_url: null,
      signature: "Kunal — RE/MAX City Realty, Vancouver",
      primary_color: "#4f35d2",
    },
    voice_rules: [
      "Never use exclamation marks",
      "Always mention specific neighbourhood names",
      "Keep subject lines under 50 chars",
    ],
    frequency_caps: {
      lead:           { per_week: 2, min_gap_hours: 48 },
      active:         { per_week: 3, min_gap_hours: 18 },
      under_contract: { per_week: 1, min_gap_hours: 72 },
      past_client:    { per_month: 2, min_gap_hours: 168 },
      dormant:        { per_month: 1, min_gap_hours: 336 },
    },
    sending_enabled: true,
    skip_weekends: false,
    default_send_day: "tuesday",
    default_send_hour: 9,
    quiet_hours: { start: "20:00", end: "07:00" },
    escalation_thresholds: { soft_alert: 40, hot_lead: 60, urgent: 80 },
    dormancy_days: 60,
    auto_sunset_days: 90,
    re_engagement_attempts: 2,
    content_rankings: [
      { type: "listing_alert",       effectiveness: 0.82, sample_size: 124 },
      { type: "neighbourhood_guide", effectiveness: 0.71, sample_size: 45 },
      { type: "market_update",       effectiveness: 0.65, sample_size: 98 },
      { type: "home_anniversary",    effectiveness: 0.58, sample_size: 18 },
    ],
    total_emails_analyzed: 312,
    total_conversions: 9,
    learning_confidence: "medium",
    last_learning_cycle: daysAgo(1),
  }, { onConflict: "realtor_id" });
  console.log(racErr ? `  ❌ ${racErr.message}` : "  ✅ realtor_agent_config upserted");


  // ═══════════════════════════════════════════════════════════
  // C. AGENT LEARNING LOG (AI adaptation history)
  // ═══════════════════════════════════════════════════════════
  console.log("\n📚 Creating agent learning log entries...");
  await supabase.from("agent_learning_log").delete().eq("realtor_id", "demo-realtor");

  const learningEntries = [
    {
      change_type: "voice_rule", field_changed: "voice_rules",
      old_value: null,
      new_value: { rule: "Never use exclamation marks" },
      reason: "Realtor edited 3 consecutive emails removing exclamation marks — inferred rule",
      auto_applied: true, approved: true, created_at: daysAgo(12),
    },
    {
      change_type: "voice_rule", field_changed: "voice_rules",
      old_value: null,
      new_value: { rule: "Always mention specific neighbourhood names" },
      reason: "Realtor added neighbourhood names to 5 of 6 reviewed emails — pattern detected",
      auto_applied: true, approved: true, created_at: daysAgo(10),
    },
    {
      change_type: "timing", field_changed: "default_send_hour",
      old_value: { hour: 9 },
      new_value: { hour: 10 },
      reason: "Open rate 34% higher at 10 AM vs 9 AM across 42 emails over 3 weeks",
      auto_applied: false, approved: null, created_at: daysAgo(3),
    },
    {
      change_type: "frequency", field_changed: "frequency_caps.dormant",
      old_value: { per_month: 2 },
      new_value: { per_month: 1 },
      reason: "Raj Patel, Chris Wong: 0 opens in 90 days — recommend reducing dormant frequency",
      auto_applied: true, approved: true, created_at: daysAgo(5),
    },
    {
      change_type: "content_ranking", field_changed: "content_rankings",
      old_value: { listing_alert: 0.75 },
      new_value: { listing_alert: 0.82 },
      reason: "Listing alerts with school info get 2.1x clicks from family buyers (Aman, Sarah, Tom)",
      auto_applied: true, approved: true, created_at: daysAgo(7),
    },
    {
      change_type: "sequence", field_changed: "buyer_sequence",
      old_value: { sequence: ["welcome", "listing_alert", "neighbourhood_guide", "market_update"] },
      new_value: { sequence: ["welcome", "neighbourhood_guide", "listing_alert", "market_update"] },
      reason: "Neighbourhood guides sent before first listing alert show 28% higher engagement — swapping order",
      auto_applied: false, approved: true, created_at: daysAgo(8),
    },
    {
      change_type: "threshold", field_changed: "escalation_thresholds.hot_lead",
      old_value: { threshold: 55 },
      new_value: { threshold: 60 },
      reason: "3 false positives at score 55-59 last month — raising hot lead threshold to reduce noise",
      auto_applied: true, approved: true, created_at: daysAgo(4),
    },
    {
      change_type: "content_ranking", field_changed: "content_rankings",
      old_value: null,
      new_value: { finding: "Subject lines with neighbourhood name get 22% higher open rate" },
      reason: "A/B test across 38 emails: 'New in Kitsilano' vs 'New listing alert' — neighbourhood wins",
      auto_applied: true, approved: true, created_at: daysAgo(2),
    },
  ];

  let llCount = 0;
  for (const entry of learningEntries) {
    const { error } = await supabase.from("agent_learning_log").insert({
      realtor_id: "demo-realtor",
      ...entry,
    });
    if (!error) llCount++;
    else console.log(`  ❌ ${entry.change_type}: ${error.message}`);
  }
  console.log(`  ${llCount} learning log entries created`);


  // ═══════════════════════════════════════════════════════════
  // D. CONTACT CONTEXT (Prospect 360 structured notes)
  // ═══════════════════════════════════════════════════════════
  console.log("\n🎯 Creating contact context entries...");
  if (demoContactIds.length) {
    await supabase.from("contact_context").delete().in("contact_id", demoContactIds);
  }

  const contextEntries = [
    // Aman Singh — hot buyer, family with 2 kids
    { name: "Aman Singh", context_type: "preference", text: "Wants south-facing yard for kids to play — non-negotiable" },
    { name: "Aman Singh", context_type: "objection",  text: "Concerned about Kits Elementary wait list — wants guarantee of catchment", is_resolved: false },
    { name: "Aman Singh", context_type: "timeline",   text: "Lease ends July 31 — must close by then or needs temporary housing" },
    { name: "Aman Singh", context_type: "info",        text: "Pre-approved $1.3M with TD, rate hold expires Aug 15" },
    // Sarah Chen — hot buyer, family-focused
    { name: "Sarah Chen", context_type: "preference", text: "Must have 2-car garage — husband works from van, needs secure parking" },
    { name: "Sarah Chen", context_type: "timeline",   text: "Lease ends July 31, must close by then" },
    { name: "Sarah Chen", context_type: "preference", text: "Walking distance to French immersion school strongly preferred" },
    // Linda Martinez — active seller
    { name: "Linda Martinez", context_type: "concern",   text: "Worried about pricing too high in current market — wants data-backed CMA" },
    { name: "Linda Martinez", context_type: "timeline",  text: "Moving to Victoria in 6 weeks — needs firm timeline for closing" },
    { name: "Linda Martinez", context_type: "info",      text: "Had bad experience with previous agent who overpriced — build trust with realistic numbers" },
    // Tom Richards — warm buyer
    { name: "Tom Richards", context_type: "preference", text: "Ground-floor unit preferred — bad knee, no walk-ups" },
    { name: "Tom Richards", context_type: "objection",  text: "Thinks Mt Pleasant is overpriced vs East Van — needs comp data", is_resolved: false },
    // David Kim — first-time buyer
    { name: "David Kim", context_type: "concern",   text: "First-time buyer anxiety — wants extra hand-holding through process" },
    { name: "David Kim", context_type: "preference", text: "Wants to be near Commercial Drive for restaurants and nightlife" },
    // Mike Thompson — under contract, downsizing
    { name: "Mike Thompson", context_type: "preference", text: "Needs building with pet-friendly policy — has a golden retriever" },
    { name: "Mike Thompson", context_type: "info",       text: "Selling West Van home concurrently — coordinating two closings" },
    // Susan Park — estate sale seller
    { name: "Susan Park", context_type: "concern",   text: "Estate sale — emotionally difficult, needs patience and sensitivity" },
    { name: "Susan Park", context_type: "info",       text: "3 beneficiaries must all agree on price — decision-making is slow" },
    // Jessica Liu — relocating from Toronto
    { name: "Jessica Liu", context_type: "timeline",  text: "Relocating from Toronto in September — all viewings must be virtual until August" },
    { name: "Jessica Liu", context_type: "preference", text: "Needs home office space — both parents work remote" },
  ];

  let ccCount = 0;
  for (const ctx of contextEntries) {
    if (!map[ctx.name]) continue;
    const { error } = await supabase.from("contact_context").insert({
      contact_id: map[ctx.name],
      context_type: ctx.context_type,
      text: ctx.text,
      is_resolved: ctx.is_resolved ?? false,
    });
    if (!error) ccCount++;
    else console.log(`  ❌ ${ctx.name} ${ctx.context_type}: ${error.message}`);
  }
  console.log(`  ${ccCount} contact context entries created`);


  // ═══════════════════════════════════════════════════════════
  // E. REAL VANCOUVER LISTINGS (6 properties)
  // ═══════════════════════════════════════════════════════════
  console.log("\n🏠 Creating Vancouver listings...");
  // Clean up demo listings by notes marker
  await supabase.from("listings").delete().like("notes", "%[demo-seed]%");

  const listings = [
    {
      address: "2156 W 3rd Ave, Vancouver, BC V6K 1L1",
      seller_name: "Linda Martinez",
      lockbox_code: "8832",
      status: "active",
      mls_number: "R2912345",
      list_price: 2100000.00,
      property_type: "Residential",
      prop_type: "detached",
      hero_image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
      notes: "3BR/2BA detached in Dunbar. 2,450 sqft, 33x122 lot. Hardwood floors, updated kitchen 2023. South-facing backyard. Walk to Dunbar shops. [demo-seed]",
      current_phase: 4,
      mls_status: "pending",
    },
    {
      address: "4571 W 8th Ave, Vancouver, BC V6R 2A5",
      seller_name: "Susan Park",
      lockbox_code: "7714",
      status: "active",
      mls_number: "R2923456",
      list_price: 3450000.00,
      property_type: "Residential",
      prop_type: "detached",
      hero_image_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
      notes: "4BR/3BA estate in Kerrisdale. 3,100 sqft, 50x130 lot. Original character home, oak panelling, formal dining. Needs updating. Quiet cul-de-sac. [demo-seed]",
      current_phase: 7,
      mls_status: "active",
    },
    {
      address: "1203-1480 Howe St, Vancouver, BC V6Z 1R8",
      seller_name: "Robert Chang",
      lockbox_code: "3309",
      status: "active",
      mls_number: "R2934567",
      list_price: 685000.00,
      property_type: "Condo/Apartment",
      prop_type: "condo",
      hero_image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
      notes: "1BR+den/1BA in Yaletown. 680 sqft. Floor-to-ceiling windows, city view. Concierge, gym, rooftop deck. 1 parking + 1 storage. Built 2018. [demo-seed]",
      current_phase: 3,
      mls_status: "pending",
    },
    {
      address: "45-2729 158th St, Surrey, BC V3Z 0T9",
      seller_name: "Mohammed Al-Rashid",
      lockbox_code: "5521",
      status: "pending",
      mls_number: "R2945678",
      list_price: 799000.00,
      property_type: "Townhouse",
      prop_type: "townhouse",
      hero_image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      notes: "3BR/2.5BA townhouse in Grandview Surrey. 1,520 sqft. End unit, double garage, private patio. Near transit. Built 2020. Offer accepted $815K. [demo-seed]",
      current_phase: 6,
      mls_status: "active",
    },
    {
      address: "3887 W 16th Ave, Vancouver, BC V6R 3C8",
      seller_name: "Patricia Wilson",
      lockbox_code: "9943",
      status: "active",
      mls_number: "R2956789",
      list_price: 4200000.00,
      property_type: "Residential",
      prop_type: "detached",
      hero_image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
      notes: "5BR/4BA family home in Point Grey. 3,800 sqft, 60x130 lot. Renovated 2019, chef kitchen, heated pool. Walk to UBC. Mountain views. [demo-seed]",
      current_phase: 8,
      mls_status: "active",
    },
    {
      address: "508-2188 W 41st Ave, Vancouver, BC V6M 0B7",
      seller_name: "George Nakamura",
      lockbox_code: "6617",
      status: "sold",
      mls_number: "R2867890",
      list_price: 1150000.00,
      property_type: "Condo/Apartment",
      prop_type: "condo",
      hero_image_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
      notes: "2BR/2BA in Kerrisdale. 1,050 sqft. Corner unit, mountain view, in-suite laundry. Sold $1,175K — 12 days on market. [demo-seed]",
      current_phase: 8,
      mls_status: "sold",
    },
  ];

  let listCount = 0;
  for (const l of listings) {
    const sellerId = map[l.seller_name];
    if (!sellerId) { console.log(`  ❌ ${l.address}: seller ${l.seller_name} not found`); continue; }
    const { error } = await supabase.from("listings").insert({
      address: l.address,
      seller_id: sellerId,
      lockbox_code: l.lockbox_code,
      status: l.status,
      mls_number: l.mls_number,
      list_price: l.list_price,
      property_type: l.property_type,
      prop_type: l.prop_type,
      hero_image_url: l.hero_image_url,
      notes: l.notes,
      current_phase: l.current_phase,
      mls_status: l.mls_status,
      showing_window_start: "10:00",
      showing_window_end: "18:00",
    });
    if (!error) { listCount++; console.log(`  ✅ ${l.address}`); }
    else console.log(`  ❌ ${l.address}: ${error.message}`);
  }
  console.log(`  ${listCount} listings created`);


  // ── SUMMARY ──
  const buyers = C.filter(c => c.t === "buyer").length;
  const sellers = C.filter(c => c.t === "seller").length;
  const agents = C.filter(c => c.t === "partner").length;

  console.log("\n" + "═".repeat(55));
  console.log("📊 SEED COMPLETE");
  console.log("═".repeat(55));
  console.log(`  Contacts:      ${Object.keys(map).length} (${buyers}B ${sellers}S ${agents}A)`);
  console.log(`  Journeys:      ${jCount}`);
  console.log(`  Emails:        ${nlCount} sent + ${drafts} drafts + ${suppressed} suppressed`);
  console.log(`  Events:        ${evCount} (opens + clicks)`);
  console.log(`  Contact Dates: ${cdCount} (birthdays + anniversaries)`);
  console.log(`  Agent Config:  1 realtor_agent_config`);
  console.log(`  Learning Log:  ${llCount} entries`);
  console.log(`  Context Notes: ${ccCount} entries`);
  console.log(`  Listings:      ${listCount} Vancouver properties`);
  console.log(`  Real email:    Aman Singh → amandhindsa@outlook.com`);
  console.log("═".repeat(55));
  console.log("\n✅ Open http://localhost:3000/newsletters\n");
}

seed().catch(console.error);
