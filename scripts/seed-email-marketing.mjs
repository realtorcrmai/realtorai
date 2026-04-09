import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://qcohfohjihazivkforsj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliZ2lsanVjbHBzdWhibWRodXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2Nzc5MSwiZXhwIjoyMDg4ODQzNzkxfQ.qdu6B5jdtckJ23nErIiVuQOzGbPqn_SrEJxQrL9buEk"
);

const CONTACTS = [
  // BUYERS — various stages
  { name: "Sarah Chen", email: "sarah.chen@gmail.com", phone: "+16045551001", type: "buyer", pref_channel: "sms", notes: "Looking for 2BR condo in Kitsilano, budget $800K-$950K. Has 2 kids, schools important." },
  { name: "David Kim", email: "david.kim@outlook.com", phone: "+16045551002", type: "buyer", pref_channel: "sms", notes: "First-time buyer, interested in East Vancouver townhouses under $1.1M." },
  { name: "Priya Sharma", email: "priya.sharma@yahoo.com", phone: "+16045551003", type: "buyer", pref_channel: "sms", notes: "Investor buyer, looking for rental properties in Burnaby/Surrey. Budget $600K-$800K." },
  { name: "Mike Thompson", email: "mike.t@gmail.com", phone: "+16045551004", type: "buyer", pref_channel: "sms", notes: "Downsizing from house to condo. West Vancouver or North Van. Budget $1.2M+." },
  { name: "Jessica Liu", email: "jessica.liu@hotmail.com", phone: "+16045551005", type: "buyer", pref_channel: "sms", notes: "Relocating from Toronto, needs 3BR in good school district. Budget $1M-$1.3M." },
  { name: "Tom Richards", email: "tom.richards@shaw.ca", phone: "+16045551006", type: "buyer", pref_channel: "sms", notes: "Pre-approved, ready to buy. Looking in Mount Pleasant or Main Street corridor." },
  { name: "Emily Wang", email: "emily.w@gmail.com", phone: "+16045551007", type: "buyer", pref_channel: "sms", notes: "Young professional, wants modern 1BR in Yaletown or Coal Harbour. Budget $550K-$700K." },
  { name: "Raj Patel", email: "raj.patel@gmail.com", phone: "+16045551008", type: "buyer", pref_channel: "whatsapp", notes: "Family of 5, needs 4BR+ in Surrey or Langley. Budget $900K-$1.2M." },
  { name: "Amanda Foster", email: "amanda.f@icloud.com", phone: "+16045551009", type: "buyer", pref_channel: "sms", notes: "Past client referral. Looking for investment condo near UBC. Budget $500K-$650K." },
  { name: "James O'Brien", email: "james.obrien@gmail.com", phone: "+16045551010", type: "buyer", pref_channel: "sms", notes: "Retired, wants ground-level accessible unit in White Rock or South Surrey." },

  // SELLERS — various stages  
  { name: "Linda Martinez", email: "linda.m@telus.net", phone: "+16045552001", type: "seller", pref_channel: "sms", notes: "Selling 3BR house in Dunbar. Wants $2.1M. Moving to Victoria." },
  { name: "Robert Chang", email: "robert.chang@gmail.com", phone: "+16045552002", type: "seller", pref_channel: "sms", notes: "Selling 2BR condo in Yaletown. Purchased 5 years ago, good equity." },
  { name: "Susan Park", email: "susan.park@outlook.com", phone: "+16045552003", type: "seller", pref_channel: "sms", notes: "Estate sale — inherited home in Kerrisdale. 4BR, needs some updates." },
  { name: "Mohammed Al-Rashid", email: "m.alrashid@gmail.com", phone: "+16045552004", type: "seller", pref_channel: "sms", notes: "Selling Burnaby townhouse to upgrade. Wants quick sale." },
  { name: "Karen White", email: "karen.white@shaw.ca", phone: "+16045552005", type: "seller", pref_channel: "sms", notes: "Divorcing, needs to sell marital home in Coquitlam. Sensitive situation." },
  { name: "George Nakamura", email: "george.n@gmail.com", phone: "+16045552006", type: "seller", pref_channel: "sms", notes: "Sold through us last year. Now selling investment property in Richmond." },
  { name: "Patricia Wilson", email: "pat.wilson@hotmail.com", phone: "+16045552007", type: "seller", pref_channel: "sms", notes: "Selling family home of 30 years in Point Grey. Emotional sale." },
  { name: "Daniel Lee", email: "daniel.lee@gmail.com", phone: "+16045552008", type: "seller", pref_channel: "sms", notes: "Developer selling pre-sale units in new Cambie corridor building." },
  { name: "Maria Santos", email: "maria.santos@yahoo.com", phone: "+16045552009", type: "seller", pref_channel: "sms", notes: "Selling 1BR condo in New Westminster. First time selling." },
  { name: "William Hughes", email: "will.hughes@telus.net", phone: "+16045552010", type: "seller", pref_channel: "sms", notes: "Past client — bought with us 3 years ago, now selling to move to Kelowna." },
];

// Journey assignments — spread across all phases
const JOURNEY_ASSIGNMENTS = [
  // Buyers
  { idx: 0, phase: "active", score: 82, paused: false, daysSinceEnroll: 14 },     // Sarah — active, high engagement
  { idx: 1, phase: "lead", score: 35, paused: false, daysSinceEnroll: 3 },         // David — new lead
  { idx: 2, phase: "active", score: 65, paused: false, daysSinceEnroll: 21 },      // Priya — active investor
  { idx: 3, phase: "under_contract", score: 90, paused: false, daysSinceEnroll: 45 }, // Mike — under contract!
  { idx: 4, phase: "lead", score: 20, paused: false, daysSinceEnroll: 1 },         // Jessica — brand new
  { idx: 5, phase: "active", score: 78, paused: false, daysSinceEnroll: 30 },      // Tom — ready to buy
  { idx: 6, phase: "lead", score: 42, paused: false, daysSinceEnroll: 7 },         // Emily — warming up
  { idx: 7, phase: "dormant", score: 12, paused: false, daysSinceEnroll: 90 },     // Raj — gone cold
  { idx: 8, phase: "past_client", score: 55, paused: false, daysSinceEnroll: 180 }, // Amanda — bought 6mo ago
  { idx: 9, phase: "dormant", score: 8, paused: true, daysSinceEnroll: 120 },      // James — paused, dormant
  // Sellers
  { idx: 10, phase: "active", score: 70, paused: false, daysSinceEnroll: 28 },     // Linda — listed
  { idx: 11, phase: "lead", score: 45, paused: false, daysSinceEnroll: 5 },        // Robert — considering
  { idx: 12, phase: "active", score: 60, paused: false, daysSinceEnroll: 35 },     // Susan — estate sale
  { idx: 13, phase: "under_contract", score: 85, paused: false, daysSinceEnroll: 42 }, // Mohammed — deal pending
  { idx: 14, phase: "lead", score: 30, paused: false, daysSinceEnroll: 2 },        // Karen — just entered
  { idx: 15, phase: "past_client", score: 50, paused: false, daysSinceEnroll: 365 }, // George — sold last year
  { idx: 16, phase: "active", score: 55, paused: false, daysSinceEnroll: 20 },     // Patricia — emotional sale
  { idx: 17, phase: "lead", score: 38, paused: false, daysSinceEnroll: 10 },       // Daniel — developer
  { idx: 18, phase: "lead", score: 25, paused: false, daysSinceEnroll: 4 },        // Maria — new seller
  { idx: 19, phase: "past_client", score: 62, paused: false, daysSinceEnroll: 400 }, // William — long-term past
];

// Email history templates
const EMAIL_TEMPLATES = {
  buyer: {
    lead: [
      { type: "welcome", subject: "Welcome! Let's Find Your Dream Home", daysAgo: null },
      { type: "neighbourhood_guide", subject: "Neighbourhood Guide: {area}", daysAgo: 3 },
    ],
    active: [
      { type: "welcome", subject: "Welcome! Let's Find Your Dream Home", daysAgo: null },
      { type: "neighbourhood_guide", subject: "Your Area Guide: Top Neighbourhoods", daysAgo: null },
      { type: "new_listing_alert", subject: "3 New Homes in Your Price Range", daysAgo: 7 },
      { type: "new_listing_alert", subject: "Just Listed: Stunning {area} Property", daysAgo: 3 },
    ],
    under_contract: [
      { type: "welcome", subject: "Welcome! Let's Find Your Dream Home", daysAgo: null },
      { type: "new_listing_alert", subject: "New Listings Matching Your Criteria", daysAgo: null },
      { type: "neighbourhood_guide", subject: "Welcome to {area} — Your New Neighbourhood", daysAgo: 2 },
    ],
    past_client: [
      { type: "welcome", subject: "Welcome! Let's Find Your Dream Home", daysAgo: null },
      { type: "home_anniversary", subject: "Happy Home Anniversary! Your Value Update", daysAgo: 30 },
      { type: "market_update", subject: "{area} Market Report — Q1 2026", daysAgo: 10 },
    ],
    dormant: [
      { type: "welcome", subject: "Welcome! Let's Find Your Dream Home", daysAgo: null },
      { type: "market_update", subject: "The Market Changed — Here's What You Should Know", daysAgo: 5 },
    ],
  },
  seller: {
    lead: [
      { type: "welcome", subject: "What's Your Home Worth? Free CMA Inside", daysAgo: null },
      { type: "market_update", subject: "Your Neighbourhood's Latest Sales Data", daysAgo: 3 },
    ],
    active: [
      { type: "welcome", subject: "What's Your Home Worth? Free CMA Inside", daysAgo: null },
      { type: "market_update", subject: "Weekly Showing Report — Your Listing", daysAgo: 7 },
      { type: "market_update", subject: "How Your Listing Compares to Recent Sales", daysAgo: 3 },
    ],
    under_contract: [
      { type: "welcome", subject: "What's Your Home Worth?", daysAgo: null },
      { type: "market_update", subject: "Offer Accepted! Here's What Happens Next", daysAgo: 5 },
    ],
    past_client: [
      { type: "welcome", subject: "What's Your Home Worth?", daysAgo: null },
      { type: "market_update", subject: "Your Old Neighbourhood Update", daysAgo: 30 },
      { type: "home_anniversary", subject: "1 Year Since the Sale — How's the New Chapter?", daysAgo: 10 },
    ],
    dormant: [],
  },
};

const AREAS = ["Kitsilano", "East Vancouver", "Burnaby", "West Vancouver", "Mount Pleasant", "Yaletown", "Surrey", "Kerrisdale", "Coquitlam", "Richmond"];

async function seed() {
  console.log("🌱 Seeding 20 contacts for email marketing demo...\n");

  // 1. Insert contacts
  const contactIds = [];
  for (let i = 0; i < CONTACTS.length; i++) {
    const c = CONTACTS[i];
    const { data, error } = await supabase
      .from("contacts")
      .insert(c)
      .select("id")
      .single();

    if (error) {
      console.log(`  ❌ ${c.name}: ${error.message}`);
      // Try fetching existing
      const { data: existing } = await supabase.from("contacts").select("id").eq("email", c.email).single();
      if (existing) contactIds.push(existing.id);
      else contactIds.push(null);
    } else {
      contactIds.push(data.id);
      console.log(`  ✅ ${c.name} (${c.type})`);
    }
  }

  console.log(`\n📧 Creating journey enrollments and email history...\n`);

  // 2. Create journeys + newsletters + events
  for (const assignment of JOURNEY_ASSIGNMENTS) {
    const contactId = contactIds[assignment.idx];
    if (!contactId) continue;

    const contact = CONTACTS[assignment.idx];
    const enrollDate = new Date(Date.now() - assignment.daysSinceEnroll * 86400000);
    const journeyType = contact.type === "buyer" ? "buyer" : "seller";

    // Calculate next_email_at (3-7 days in future for active journeys)
    const nextEmailDays = assignment.paused ? null : (assignment.phase === "dormant" ? 14 : Math.floor(Math.random() * 5) + 2);
    const nextEmailAt = nextEmailDays ? new Date(Date.now() + nextEmailDays * 86400000).toISOString() : null;

    // Upsert journey
    const { error: journeyError } = await supabase
      .from("contact_journeys")
      .upsert({
        contact_id: contactId,
        journey_type: journeyType,
        current_phase: assignment.phase,
        
        is_paused: assignment.paused ?? false,
        next_email_at: nextEmailAt,
        created_at: enrollDate.toISOString(),
      }, { onConflict: "contact_id,journey_type" });

    if (journeyError) {
      console.log(`  ❌ Journey for ${contact.name}: ${journeyError.message}`);
      continue;
    }

    // Update newsletter_intelligence
    const intelligence = {
      engagement_score: assignment.score,
      email_opens: Math.floor(assignment.score * 0.3),
      email_clicks: Math.floor(assignment.score * 0.12),
      last_clicked: assignment.score > 40 ? new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000).toISOString() : null,
      inferred_interests: {
        areas: [AREAS[assignment.idx % AREAS.length]],
        property_types: contact.type === "buyer" ? (contact.notes.includes("condo") ? ["condo"] : contact.notes.includes("townhouse") ? ["townhouse"] : ["house"]) : [],
        content_preference: assignment.score > 60 ? "data_driven" : "lifestyle",
      },
      click_history: assignment.score > 30 ? [
        { type: "listing", area: AREAS[assignment.idx % AREAS.length], timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
        { type: "market_report", area: AREAS[assignment.idx % AREAS.length], timestamp: new Date(Date.now() - 10 * 86400000).toISOString() },
      ] : [],
    };

    await supabase
      .from("contacts")
      .update({ newsletter_intelligence: intelligence })
      .eq("id", contactId);

    // Create email history
    const templates = EMAIL_TEMPLATES[journeyType]?.[assignment.phase] ?? [];
    const area = AREAS[assignment.idx % AREAS.length];

    for (let t = 0; t < templates.length; t++) {
      const tmpl = templates[t];
      const sentDaysAgo = tmpl.daysAgo ?? (assignment.daysSinceEnroll - t * 3);
      const sentAt = new Date(Date.now() - Math.max(1, sentDaysAgo) * 86400000);
      const subject = tmpl.subject.replace("{area}", area);

      const htmlBody = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f6f5ff;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 12px rgba(79,53,210,0.06);">
<h1 style="color:#4f35d2;font-size:20px;">ListingFlow</h1>
<p>Hi ${contact.name.split(" ")[0]},</p>
<p>${tmpl.type === "welcome" ? "Welcome to our real estate family! I'm excited to help you on your " + (contact.type === "buyer" ? "home buying" : "home selling") + " journey." :
tmpl.type === "market_update" ? "Here's what's happening in " + area + " this month. The market is showing strong activity with " + (10 + Math.floor(Math.random() * 20)) + " new listings." :
tmpl.type === "new_listing_alert" ? "I found some properties that match what you're looking for in " + area + ". Check them out!" :
tmpl.type === "neighbourhood_guide" ? area + " is one of Vancouver's most vibrant neighbourhoods. Here's everything you need to know about living here." :
tmpl.type === "home_anniversary" ? "It's been a milestone since your real estate journey with us. Here's how your investment has grown." :
"I wanted to share an important update with you."}</p>
<div style="background:#f6f5ff;border-radius:8px;padding:16px;margin:16px 0;">
<strong style="color:#1a1535;">Quick Stats</strong><br>
<span style="color:#6b6b8d;">Avg Price: $${(800 + Math.floor(Math.random() * 400))}K</span> · 
<span style="color:#059669;">+${(2 + Math.random() * 6).toFixed(1)}% this month</span>
</div>
<a href="#" style="display:inline-block;background:linear-gradient(135deg,#4f35d2,#6c4fe6);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
${tmpl.type === "new_listing_alert" ? "View Listings" : tmpl.type === "market_update" ? "Full Report" : "Learn More"}</a>
<p style="color:#6b6b8d;margin-top:20px;font-size:14px;">Best regards,<br>Sarah Johnson, REALTOR®<br>RE/MAX City Realty</p>
</div></body></html>`;

      // Determine status — most are sent, some drafts for pending
      let status = "sent";
      if (t === templates.length - 1 && assignment.phase === "lead" && assignment.daysSinceEnroll < 5) {
        status = "draft"; // Latest email for new leads = pending approval
      }

      const { data: nl, error: nlError } = await supabase
        .from("newsletters")
        .insert({
          contact_id: contactId,
          subject,
          email_type: tmpl.type,
          status,
          html_body: htmlBody,
          sent_at: status === "sent" ? sentAt.toISOString() : null,
          created_at: sentAt.toISOString(),
          ai_context: { journey_phase: assignment.phase, contact_type: contact.type },
        })
        .select("id")
        .single();

      if (nlError) {
        console.log(`    ❌ Email "${subject}": ${nlError.message}`);
        continue;
      }

      // Create events for sent emails
      if (status === "sent" && nl) {
        // Opens — based on engagement score probability
        const willOpen = Math.random() * 100 < (assignment.score + 20);
        if (willOpen) {
          await supabase.from("newsletter_events").insert({
            newsletter_id: nl.id,
            event_type: "opened",
            metadata: { timestamp: new Date(sentAt.getTime() + 3600000).toISOString() },
          });

          // Clicks — higher engagement = more clicks
          const willClick = Math.random() * 100 < assignment.score;
          if (willClick) {
            await supabase.from("newsletter_events").insert({
              newsletter_id: nl.id,
              event_type: "clicked",
              metadata: {
                link: tmpl.type === "new_listing_alert" ? "https://listingflow.com/listing/123" : "https://listingflow.com/report",
                timestamp: new Date(sentAt.getTime() + 7200000).toISOString(),
              },
            });
          }
        }
      }
    }

    const phaseEmoji = { lead: "🟢", active: "🔥", under_contract: "📝", past_client: "⭐", dormant: "❄️" };
    console.log(`  ${phaseEmoji[assignment.phase] || "•"} ${contact.name} (${contact.type}) → ${assignment.phase} | Score: ${assignment.score} | ${templates.length} emails${assignment.paused ? " [PAUSED]" : ""}`);
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("📊 SEED DATA SUMMARY");
  console.log("═".repeat(60));
  
  const { count: totalContacts } = await supabase.from("contacts").select("*", { count: "exact", head: true });
  const { count: totalJourneys } = await supabase.from("contact_journeys").select("*", { count: "exact", head: true });
  const { count: totalNewsletters } = await supabase.from("newsletters").select("*", { count: "exact", head: true });
  const { count: sentCount } = await supabase.from("newsletters").select("*", { count: "exact", head: true }).eq("status", "sent");
  const { count: draftCount } = await supabase.from("newsletters").select("*", { count: "exact", head: true }).eq("status", "draft");
  const { count: totalEvents } = await supabase.from("newsletter_events").select("*", { count: "exact", head: true });

  console.log(`  Contacts:     ${totalContacts}`);
  console.log(`  Journeys:     ${totalJourneys}`);
  console.log(`  Emails:       ${totalNewsletters} (${sentCount} sent, ${draftCount} pending)`);
  console.log(`  Events:       ${totalEvents} (opens + clicks)`);
  console.log("═".repeat(60));

  console.log("\n✅ Done! Open http://localhost:3000/newsletters/control to see everything.\n");

  // Print the journey breakdown
  console.log("📋 JOURNEY BREAKDOWN:");
  console.log("─".repeat(50));
  console.log("BUYERS:");
  console.log("  🟢 Lead:           David Kim, Jessica Liu, Emily Wang");
  console.log("  🔥 Active:         Sarah Chen (82), Priya Sharma (65), Tom Richards (78)");
  console.log("  📝 Under Contract: Mike Thompson (90)");
  console.log("  ⭐ Past Client:    Amanda Foster (55)");
  console.log("  ❄️ Dormant:        Raj Patel (12), James O'Brien (8, PAUSED)");
  console.log("");
  console.log("SELLERS:");
  console.log("  🟢 Lead:           Robert Chang, Karen White, Daniel Lee, Maria Santos");
  console.log("  🔥 Active:         Linda Martinez (70), Susan Park (60), Patricia Wilson (55)");
  console.log("  📝 Under Contract: Mohammed Al-Rashid (85)");
  console.log("  ⭐ Past Client:    George Nakamura (50), William Hughes (62)");
  console.log("─".repeat(50));
  
  console.log("\n🎯 WHAT THE REALTOR SHOULD DO NEXT:");
  console.log("  1. Open Command Center → see all 20 contacts across journey phases");
  console.log("  2. Check Email Activity tab → sent emails with open/click stats");
  console.log("  3. Check Pending tab → 3-4 drafts waiting for approval");
  console.log("  4. Click Sarah Chen → see her 4-email history, 82 engagement score");
  console.log("  5. Click Raj Patel → dormant buyer, consider re-engagement");
  console.log("  6. Check Schedule tab → upcoming emails for all active contacts");
}

seed().catch(console.error);
