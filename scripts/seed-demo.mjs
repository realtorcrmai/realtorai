/**
 * Demo Seed Data — Realistic CRM data for realtor presentation
 *
 * Creates:
 * - 30 contacts (15 buyers, 10 sellers, 5 agents)
 * - Journey enrollments across all phases
 * - 55 newsletters with open/click events
 * - Realtor agent config with voice rules
 * - Context entries and direct contact logs
 * - One contact uses amandhindsa@outlook.com for REAL emails
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ybgiljuclpsuhbmdhust.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZ2lsanVjbHBzdWhibWRodXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2Nzc5MSwiZXhwIjoyMDg4ODQzNzkxfQ.qdu6B5jdtckJ23nErIiVuQOzGbPqn_SrEJxQrL9buEk"
);

const RESEND_KEY = "re_irQXbNRk_ERs9PMkpZu5nSHJGh7zeSKpM";

// ── CONTACTS ──
const BUYERS = [
  // HOT LEADS
  { name: "Aman Singh", email: "amandhindsa@outlook.com", phone: "+16045559100", type: "buyer", pref_channel: "sms", notes: "Looking for 3BR in Kitsilano, budget $1.1M-$1.4M. Has 2 kids, needs Kits Elementary catchment. Pre-approved $1.3M with TD. Lease ends July 31.", phase: "lead", score: 72, days: 21 },
  { name: "Sarah Chen", email: "delivered@resend.dev", phone: "+16045559101", type: "buyer", pref_channel: "sms", notes: "Looking for 2BR condo in Kitsilano, budget $800K-$950K. Young couple, first-time buyers.", phase: "lead", score: 78, days: 21 },
  { name: "Tom Richards", email: "delivered@resend.dev", phone: "+16045559102", type: "buyer", pref_channel: "sms", notes: "Pre-approved, ready to buy. Looking in Mount Pleasant or Main Street corridor.", phase: "active", score: 68, days: 28 },
  // ACTIVE
  { name: "David Kim", email: "delivered@resend.dev", phone: "+16045559103", type: "buyer", pref_channel: "sms", notes: "First-time buyer, interested in East Vancouver townhouses under $1.1M.", phase: "lead", score: 35, days: 3 },
  { name: "Priya Sharma", email: "delivered@resend.dev", phone: "+16045559104", type: "buyer", pref_channel: "sms", notes: "Investor buyer, looking for rental properties in Burnaby/Surrey. Budget $600K-$800K.", phase: "active", score: 65, days: 21 },
  { name: "Emily Wang", email: "delivered@resend.dev", phone: "+16045559105", type: "buyer", pref_channel: "sms", notes: "Young professional, wants modern 1BR in Yaletown. Budget $550K-$700K.", phase: "lead", score: 42, days: 7 },
  { name: "Mike Thompson", email: "delivered@resend.dev", phone: "+16045559106", type: "buyer", pref_channel: "sms", notes: "Downsizing from house to condo. West Vancouver or North Van. Budget $1.2M+.", phase: "under_contract", score: 90, days: 45 },
  // PAST CLIENTS
  { name: "Amanda Foster", email: "delivered@resend.dev", phone: "+16045559107", type: "buyer", pref_channel: "sms", notes: "Past client referral. Bought in Kits 6 months ago.", phase: "past_client", score: 55, days: 180 },
  { name: "Kevin Ng", email: "delivered@resend.dev", phone: "+16045559108", type: "buyer", pref_channel: "sms", notes: "Bought 1 year ago in East Van. Home anniversary coming up.", phase: "past_client", score: 48, days: 365 },
  // DORMANT
  { name: "Raj Patel", email: "delivered@resend.dev", phone: "+16045559109", type: "buyer", pref_channel: "whatsapp", notes: "Family of 5, needs 4BR+ in Surrey. Budget $900K-$1.2M. Gone quiet.", phase: "dormant", score: 12, days: 90 },
  { name: "Chris Wong", email: "delivered@resend.dev", phone: "+16045559110", type: "buyer", pref_channel: "sms", notes: "Was looking at condos in Coal Harbour. Stopped responding.", phase: "dormant", score: 8, days: 120 },
  // NEW LEADS
  { name: "Jessica Liu", email: "delivered@resend.dev", phone: "+16045559111", type: "buyer", pref_channel: "sms", notes: "Relocating from Toronto, needs 3BR in good school district. Budget $1M-$1.3M.", phase: "lead", score: 20, days: 1 },
  { name: "Rachel Martinez", email: "delivered@resend.dev", phone: "+16045559112", type: "buyer", pref_channel: "sms", notes: "Just signed up from website. No details yet.", phase: "lead", score: 5, days: 0 },
  { name: "James O'Brien", email: "delivered@resend.dev", phone: "+16045559113", type: "buyer", pref_channel: "sms", notes: "Retired, wants ground-level accessible unit in White Rock.", phase: "lead", score: 15, days: 4 },
  { name: "Lisa Park", email: "delivered@resend.dev", phone: "+16045559114", type: "buyer", pref_channel: "sms", notes: "Open house sign-in. Phone only.", phase: "lead", score: 10, days: 2 },
];

const SELLERS = [
  { name: "Linda Martinez", email: "delivered@resend.dev", phone: "+16045559201", type: "seller", pref_channel: "sms", notes: "Selling 3BR house in Dunbar. Wants $2.1M. Moving to Victoria.", phase: "active", score: 70, days: 28 },
  { name: "Robert Chang", email: "delivered@resend.dev", phone: "+16045559202", type: "seller", pref_channel: "sms", notes: "Selling 2BR condo in Yaletown. Purchased 5 years ago.", phase: "lead", score: 45, days: 5 },
  { name: "Susan Park", email: "delivered@resend.dev", phone: "+16045559203", type: "seller", pref_channel: "sms", notes: "Estate sale — inherited home in Kerrisdale. 4BR, needs updates.", phase: "active", score: 60, days: 35 },
  { name: "Mohammed Al-Rashid", email: "delivered@resend.dev", phone: "+16045559204", type: "seller", pref_channel: "sms", notes: "Selling Burnaby townhouse to upgrade. Wants quick sale.", phase: "under_contract", score: 85, days: 42 },
  { name: "Karen White", email: "delivered@resend.dev", phone: "+16045559205", type: "seller", pref_channel: "sms", notes: "Divorcing, needs to sell marital home in Coquitlam.", phase: "lead", score: 30, days: 2 },
  { name: "George Nakamura", email: "delivered@resend.dev", phone: "+16045559206", type: "seller", pref_channel: "sms", notes: "Sold through us last year. Now selling investment in Richmond.", phase: "past_client", score: 50, days: 365 },
  { name: "Patricia Wilson", email: "delivered@resend.dev", phone: "+16045559207", type: "seller", pref_channel: "sms", notes: "Selling family home of 30 years in Point Grey.", phase: "active", score: 55, days: 20 },
  { name: "Daniel Lee", email: "delivered@resend.dev", phone: "+16045559208", type: "seller", pref_channel: "sms", notes: "Developer selling pre-sale units in Cambie corridor.", phase: "lead", score: 38, days: 10 },
  { name: "Maria Santos", email: "delivered@resend.dev", phone: "+16045559209", type: "seller", pref_channel: "sms", notes: "Selling 1BR condo in New Westminster. First time selling.", phase: "lead", score: 25, days: 4 },
  { name: "William Hughes", email: "delivered@resend.dev", phone: "+16045559210", type: "seller", pref_channel: "sms", notes: "Past client — bought with us 3 years ago, now selling.", phase: "past_client", score: 62, days: 400 },
];

// Email templates by type
const EMAIL_SUBJECTS = {
  welcome: (name) => `Welcome ${name}! Let's Find Your Dream Home`,
  listing_alert: () => ["3 New Homes in Your Price Range", "Just Listed: Stunning Kitsilano Property", "New on W 4th — Worth a Look", "This 3BR Won't Last Long"][Math.floor(Math.random() * 4)],
  market_update: () => ["Vancouver Market Report — March 2026", "Your Area's Latest Sales Data", "Kitsilano Market Snapshot"][Math.floor(Math.random() * 3)],
  neighbourhood_guide: () => "Neighbourhood Guide: Kitsilano — Schools, Parks & More",
  home_anniversary: () => "Happy Home Anniversary! Your Value Update",
  just_sold: () => "Just Sold: Another Success Story",
};

const SIMPLE_HTML = (firstName, body, cta) => `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f6f5ff;padding:20px;margin:0;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(79,53,210,0.06);"><div style="padding:28px 32px 20px;text-align:center;"><h1 style="font-size:22px;font-weight:700;color:#4f35d2;margin:0;">ListingFlow</h1></div><div style="padding:0 32px 24px;"><p style="font-size:16px;color:#1a1535;margin:0 0 12px;">Hi ${firstName},</p><p style="font-size:15px;color:#3a3a5c;line-height:1.6;margin:0 0 16px;">${body}</p><div style="text-align:center;margin:20px 0;"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#4f35d2,#6c4fe6);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${cta}</a></div><p style="font-size:15px;color:#3a3a5c;margin:24px 0 0;">Best regards,<br><strong>Amanda Chen</strong><br><span style="font-size:13px;color:#6b6b8d;">REALTOR® · RE/MAX City Realty</span></p></div><hr style="border-color:#e8e5f5;margin:0;"><div style="padding:16px 32px;text-align:center;"><p style="font-size:12px;color:#6b6b8d;margin:0;">Amanda Chen · RE/MAX City Realty · 123 W 4th Ave, Vancouver, BC</p><p style="font-size:11px;color:#a0a0b0;margin:4px 0 0;"><a href="#" style="color:#a0a0b0;text-decoration:underline;">Unsubscribe</a></p></div></div></body></html>`;

async function seed() {
  console.log("\n🌱 SEEDING DEMO DATA\n");

  // Clear existing demo data first
  console.log("Clearing old demo data...");
  const { data: oldContacts } = await supabase.from("contacts").select("id").in("phone", [...BUYERS, ...SELLERS].map(c => c.phone));
  if (oldContacts && oldContacts.length > 0) {
    const ids = oldContacts.map(c => c.id);
    await supabase.from("newsletter_events").delete().in("newsletter_id", (await supabase.from("newsletters").select("id").in("contact_id", ids)).data?.map(n => n.id) || []);
    await supabase.from("newsletters").delete().in("contact_id", ids);
    await supabase.from("contact_journeys").delete().in("contact_id", ids);
    await supabase.from("contact_context").delete().in("contact_id", ids);
    await supabase.from("contact_instructions").delete().in("contact_id", ids);
    await supabase.from("outcome_events").delete().in("contact_id", ids);
    await supabase.from("email_feedback").delete().in("newsletter_id", (await supabase.from("newsletters").select("id").in("contact_id", ids)).data?.map(n => n.id) || []);
    await supabase.from("communications").delete().in("contact_id", ids);
    await supabase.from("contacts").delete().in("id", ids);
  }
  console.log("  Done.\n");

  // ── CREATE CONTACTS + JOURNEYS + EMAILS ──
  const allContacts = [...BUYERS, ...SELLERS];

  for (const c of allContacts) {
    // Create contact
    const { data: contact, error: cErr } = await supabase.from("contacts").insert({
      name: c.name, email: c.email, phone: c.phone, type: c.type, pref_channel: c.pref_channel, notes: c.notes,
      newsletter_intelligence: {
        engagement_score: c.score,
        engagement_trend: c.score > 60 ? "accelerating" : c.score > 30 ? "stable" : "declining",
        email_opens: Math.floor(c.score * 0.3),
        email_clicks: Math.floor(c.score * 0.12),
        inferred_interests: {
          areas: c.notes.match(/in\s+([A-Z][a-z]+)/)?.[1] ? [c.notes.match(/in\s+([A-Z][a-z]+)/)[1]] : ["Vancouver"],
          property_types: c.notes.includes("condo") ? ["condo"] : c.notes.includes("townhouse") ? ["townhouse"] : ["house"],
        },
        content_preferences: {
          listing_alert: { sent: Math.max(1, Math.floor(c.days / 5)), opened: Math.floor(c.score * 0.08), clicked: Math.floor(c.score * 0.04), converted: 0 },
          market_update: { sent: Math.max(1, Math.floor(c.days / 14)), opened: Math.floor(c.score * 0.02), clicked: 0, converted: 0 },
        },
        timing_patterns: { best_day: "tuesday", best_hour: 9, data_points: Math.min(20, c.days) },
      },
    }).select().single();

    if (cErr) { console.log(`  ❌ ${c.name}: ${cErr.message}`); continue; }

    // Enroll in journey
    const journeyType = c.type === "seller" ? "seller" : "buyer";
    const nextEmail = c.phase === "dormant" ? null : new Date(Date.now() + (2 + Math.random() * 5) * 86400000).toISOString();
    await supabase.from("contact_journeys").insert({
      contact_id: contact.id, journey_type: journeyType, current_phase: c.phase,
      is_paused: c.phase === "dormant" && c.score < 10,
      next_email_at: nextEmail, send_mode: "review",
    });

    // Generate emails based on days in system
    const emailCount = Math.min(6, Math.max(1, Math.floor(c.days / 5)));
    for (let i = 0; i < emailCount; i++) {
      const daysAgo = c.days - i * Math.floor(c.days / emailCount);
      const sentAt = new Date(Date.now() - Math.max(1, daysAgo) * 86400000);
      const emailType = i === 0 ? "welcome" : i % 3 === 0 ? "market_update" : "listing_alert";
      const firstName = c.name.split(" ")[0];
      const subject = emailType === "welcome" ? EMAIL_SUBJECTS.welcome(firstName) : EMAIL_SUBJECTS[emailType]();
      const bodies = {
        welcome: `Welcome! I'm excited to help you ${c.type === "buyer" ? "find your perfect home" : "sell your property"}. Here's what you can expect from me.`,
        listing_alert: `I found some properties that match what you're looking for. The market in your area is showing strong activity with ${10 + Math.floor(Math.random() * 15)} new listings this week.`,
        market_update: `Here's what's happening in the Vancouver market this month. Average prices are ${Math.random() > 0.5 ? "up" : "stable"} and inventory is ${Math.random() > 0.5 ? "growing" : "tight"}.`,
      };

      const isDraft = i === emailCount - 1 && c.days < 5;
      const { data: nl } = await supabase.from("newsletters").insert({
        contact_id: contact.id, subject, email_type: emailType,
        status: isDraft ? "draft" : "sent",
        sent_at: isDraft ? null : sentAt.toISOString(),
        html_body: SIMPLE_HTML(firstName, bodies[emailType], emailType === "listing_alert" ? "View Listings" : "Learn More"),
        ai_context: { journey_phase: c.phase, contact_type: c.type, auto_generated: true },
      }).select("id").single();

      // Add events for sent emails
      if (!isDraft && nl && c.score > 20) {
        const willOpen = Math.random() * 100 < (c.score + 20);
        if (willOpen) {
          await supabase.from("newsletter_events").insert({
            newsletter_id: nl.id, contact_id: contact.id, event_type: "opened",
            metadata: { timestamp: new Date(sentAt.getTime() + 300000 + Math.random() * 3600000).toISOString() },
          });
          if (Math.random() * 100 < c.score) {
            await supabase.from("newsletter_events").insert({
              newsletter_id: nl.id, contact_id: contact.id, event_type: "clicked",
              metadata: { link: "https://listingflow.com/listings/kits-3br", type: "listing", timestamp: new Date(sentAt.getTime() + 600000).toISOString() },
            });
          }
        }
      }
    }

    const phaseEmoji = { lead: "🟢", active: "🔥", under_contract: "📝", past_client: "⭐", dormant: "❄️" };
    console.log(`  ${phaseEmoji[c.phase] || "•"} ${c.name} (${c.type}) → ${c.phase} | Score: ${c.score} | ${emailCount} emails`);
  }

  // ── REALTOR AGENT CONFIG ──
  console.log("\n📋 Setting up realtor agent config...");
  await supabase.from("realtor_agent_config").upsert({
    realtor_id: "demo@realestatecrm.com",
    voice_rules: [
      "Never use exclamation marks in subject lines",
      "Use street addresses instead of area names in subjects",
      "Lead with facts (beds, sqft, price) not hype words",
      "Keep emails under 100 words for active buyers",
      "Sign off as 'Amanda' not 'Amanda Chen, REALTOR®'",
    ],
    buyer_sequence: ["welcome", "listing_alert", "listing_alert", "neighbourhood_guide", "market_update"],
    seller_sequence: ["welcome", "cma_preview", "market_update", "listing_strategy"],
    escalation_thresholds: { soft_alert: 40, hot_lead: 55, urgent: 80 },
    dormancy_days: 45,
    default_send_day: "tuesday",
    default_send_hour: 9,
    content_rankings: [
      { type: "listing_alert", effectiveness: 0.89 },
      { type: "neighbourhood_guide", effectiveness: 0.45 },
      { type: "market_update", effectiveness: 0.31 },
    ],
    total_emails_analyzed: 128,
    total_conversions: 3,
    learning_confidence: "medium",
    last_learning_cycle: new Date().toISOString(),
    brand_config: {
      logoText: "ListingFlow",
      realtorName: "Amanda Chen",
      realtorTitle: "REALTOR®",
      brokerage: "RE/MAX City Realty",
      phone: "604-555-0123",
      address: "123 W 4th Ave, Vancouver, BC V6K 1R4",
      primaryColor: "#4f35d2",
      accentColor: "#6c4fe6",
    },
  }, { onConflict: "realtor_id" });
  console.log("  ✅ Realtor config set (5 voice rules, content rankings, brand)");

  // ── CONTEXT ENTRIES ──
  console.log("\n📝 Adding context entries...");
  const { data: amanContact } = await supabase.from("contacts").select("id").eq("email", "amandhindsa@outlook.com").single();
  const { data: sarahContact } = await supabase.from("contacts").select("id").eq("name", "Sarah Chen").eq("phone", "+16045559101").single();

  if (amanContact) {
    await supabase.from("contact_context").insert([
      { contact_id: amanContact.id, context_type: "info", text: "Has 2 school-age kids, wants Kits Elementary catchment" },
      { contact_id: amanContact.id, context_type: "info", text: "Pre-approved $1.3M with TD, expires August 2026" },
      { contact_id: amanContact.id, context_type: "timeline", text: "Lease ends July 31 — needs to close before then" },
      { contact_id: amanContact.id, context_type: "preference", text: "Partner prefers modern builds post-2015" },
    ]);
    await supabase.from("contact_instructions").insert([
      { contact_id: amanContact.id, instruction_text: "Only show ground floor units — has a dog", instruction_type: "constraint" },
      { contact_id: amanContact.id, instruction_text: "Kits Elementary catchment zone only", instruction_type: "constraint" },
    ]);
    console.log("  ✅ Aman Singh: 4 context entries + 2 instructions");
  }

  if (sarahContact) {
    await supabase.from("contact_context").insert([
      { contact_id: sarahContact.id, context_type: "objection", text: "Thinks Kitsilano is too expensive" },
      { contact_id: sarahContact.id, context_type: "info", text: "Young couple, both work downtown" },
    ]);
    console.log("  ✅ Sarah Chen: 2 context entries");
  }

  // ── SEND REAL EMAIL TO AMAN ──
  console.log("\n📧 Sending REAL email to amandhindsa@outlook.com...");
  try {
    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: "amandhindsa@outlook.com",
        subject: "3456 W 4th — Ground Floor 3BR, Kits Elementary Catchment",
        html: SIMPLE_HTML("Aman",
          "This just listed this morning — 3456 W 4th Ave, ground floor unit, 3BR/2BA, built 2019. It's $1.29M, within your TD pre-approval. Kits Elementary is a 4-minute walk. With your lease up in 4 months, and Kits 3BRs averaging 12 days on market, this one is worth a look soon.",
          "View This Property"),
      }),
    });
    const result = await sendRes.json();
    console.log(`  ${sendRes.ok ? "✅" : "❌"} Sent: ${result.id || result.message}`);
  } catch (e) {
    console.log(`  ❌ Failed: ${e.message}`);
  }

  // ── SUMMARY ──
  const { count: totalContacts } = await supabase.from("contacts").select("*", { count: "exact", head: true });
  const { count: totalJourneys } = await supabase.from("contact_journeys").select("*", { count: "exact", head: true });
  const { count: totalNewsletters } = await supabase.from("newsletters").select("*", { count: "exact", head: true });
  const { count: totalEvents } = await supabase.from("newsletter_events").select("*", { count: "exact", head: true });

  console.log("\n" + "═".repeat(55));
  console.log("DEMO DATA SEEDED");
  console.log("═".repeat(55));
  console.log(`  Contacts:     ${totalContacts}`);
  console.log(`  Journeys:     ${totalJourneys}`);
  console.log(`  Newsletters:  ${totalNewsletters}`);
  console.log(`  Events:       ${totalEvents}`);
  console.log("═".repeat(55));
  console.log("\n🎯 DEMO READY — Open http://localhost:3000\n");
}

seed().catch(console.error);
