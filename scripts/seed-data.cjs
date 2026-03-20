/**
 * Comprehensive Seed Data Script for ListingFlow CRM
 * Drops all existing data and creates realistic BC real estate sample data
 *
 * Run: node scripts/seed-data.cjs
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load env
const envPath = path.join(__dirname, "..", ".env.local");
const env = fs.readFileSync(envPath, "utf-8");
const getEnv = (k) => { const m = env.match(new RegExp(k + "=(.+)")); return m ? m[1].trim() : ""; };

const supabase = createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));

// Helper
const uuid = () => crypto.randomUUID();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString();
const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString();

async function deleteAll() {
  console.log("🗑️  Deleting all data...");

  const tables = [
    "workflow_step_logs",
    "workflow_enrollments",
    "media_assets",
    "prompts",
    "form_submissions",
    "listing_documents",
    "contact_documents",
    "contact_dates",
    "contact_relationships",
    "referrals",
    "communications",
    "activity_log",
    "agent_notifications",
    "tasks",
    "appointments",
    "listings",
    "contacts",
    "households",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.log(`  ⚠️  ${table}: ${error.message}`);
    else console.log(`  ✅ ${table} cleared`);
  }
}

async function seed() {
  console.log("\n🌱 Seeding data...\n");

  // ─── IDs ───────────────────────────────────────────────
  const ids = {
    // Contacts
    marcus: uuid(), leah: uuid(), priya: uuid(), jamesChen: uuid(),
    aisha: uuid(), david: uuid(), sarah: uuid(), bobChen: uuid(),
    raj: uuid(), emily: uuid(), tomPark: uuid(), kevin: uuid(),
    // Households
    thompsonHH: uuid(), chenHH: uuid(),
    // Listings
    marineDr: uuid(), georgiaStW: uuid(), w16th: uuid(), e45th: uuid(),
  };

  // ─── 1. HOUSEHOLDS ─────────────────────────────────────
  console.log("🏡 Creating households...");
  await supabase.from("households").insert([
    { id: ids.thompsonHH, name: "The Thompson Family", address: "4521 Marine Dr, West Vancouver, BC V7W 2Y4" },
    { id: ids.chenHH, name: "The Chen Family", address: "1205-1288 W Georgia St, Vancouver, BC V6E 4R2" },
  ]);

  // ─── 2. CONTACTS ───────────────────────────────────────
  console.log("👥 Creating contacts...");
  await supabase.from("contacts").insert([
    {
      id: ids.marcus, name: "Marcus Thompson", phone: "+17785551001", email: "marcus.t@email.com",
      type: "buyer", pref_channel: "whatsapp", source: "Referral", lead_status: "closed",
      stage_bar: "closed", household_id: ids.thompsonHH, tags: ["past client", "pre-approved", "vip"],
      address: "4521 Marine Dr, West Vancouver, BC",
      buyer_preferences: {
        price_range_min: 800000, price_range_max: 1200000, bedrooms: 3, bathrooms: 2,
        property_types: ["Detached", "Townhouse"], preferred_areas: ["West Vancouver", "North Vancouver"],
        move_in_timeline: "1-3 months", pre_approval_amount: 950000,
        financing_status: "preapproved", must_haves: ["Garage", "Mountain view", "Updated kitchen"],
        nice_to_haves: ["Pool", "Home office", "Wine cellar"],
      },
      demographics: {
        birthday: "1985-03-15", anniversary: "2012-06-22", occupation: "Software Engineer",
        employer: "Amazon", income_range: "$250K - $500K", languages: ["English", "Mandarin"],
        hobbies_interests: ["Skiing", "Wine collecting", "Photography"], family_size: 4,
        bio_notes: "Tech lead at Amazon Vancouver. Relocated from Seattle in 2023. Active in West Van community.",
      },
      family_members: [
        { name: "Emma Thompson", relationship: "Child", phone: "" },
        { name: "Sam Thompson", relationship: "Child", phone: "" },
      ],
      referred_by_id: null, // Will set via referrals table
      last_activity_date: daysAgo(2),
    },
    {
      id: ids.leah, name: "Leah Thompson", phone: "+17785551002", email: "leah.t@designstudio.ca",
      type: "buyer", pref_channel: "sms", source: "Referral", lead_status: "active",
      stage_bar: "active_search", household_id: ids.thompsonHH, tags: ["warm lead", "upsizer"],
      address: "4521 Marine Dr, West Vancouver, BC",
      buyer_preferences: {
        price_range_min: 1500000, price_range_max: 2500000, bedrooms: 4, bathrooms: 3,
        property_types: ["Detached"], preferred_areas: ["West Vancouver", "British Properties"],
        move_in_timeline: "3-6 months", pre_approval_amount: 2000000,
        financing_status: "preapproved", must_haves: ["Open concept", "Large lot", "Natural light"],
        nice_to_haves: ["Waterfront", "In-law suite"],
      },
      demographics: {
        birthday: "1987-09-22", occupation: "Interior Designer", employer: "Self-employed",
        income_range: "$100K - $150K", languages: ["English", "French"],
        hobbies_interests: ["Yoga", "Photography", "Interior design", "Hiking"], family_size: 4,
      },
      last_activity_date: daysAgo(1),
    },
    {
      id: ids.priya, name: "Priya Sharma", phone: "+16045552001", email: "priya.sharma@vgh.ca",
      type: "seller", pref_channel: "whatsapp", source: "Past Client", lead_status: "active",
      stage_bar: "active_listing", tags: ["listing active", "repeat client", "vip"],
      address: "4521 Marine Dr, West Vancouver, BC",
      seller_preferences: {
        motivation: "downsizing", desired_list_price: 2200000,
        earliest_list_date: "2025-03-01", occupancy: "owner_occupied",
        has_purchase_plan_after_sale: true, notes: "Looking to move to a condo downtown after selling.",
      },
      demographics: {
        birthday: "1979-06-10", occupation: "Physician", employer: "Vancouver General Hospital",
        income_range: "$250K - $500K", languages: ["English", "Hindi", "Punjabi"],
        hobbies_interests: ["Tennis", "Cooking", "Travel"], family_size: 1,
        bio_notes: "Cardiologist at VGH. Empty nester, kids in Toronto. Wants to simplify life.",
      },
      last_activity_date: daysAgo(0),
    },
    {
      id: ids.jamesChen, name: "James & Linda Chen", phone: "+16045552002", email: "jlchen@gmail.com",
      type: "seller", pref_channel: "sms", source: "Website", lead_status: "closed",
      stage_bar: "closed", household_id: ids.chenHH, tags: ["past client", "listing sold"],
      address: "1205-1288 W Georgia St, Vancouver, BC",
      seller_preferences: {
        motivation: "relocating", desired_list_price: 900000,
        occupancy: "owner_occupied", has_purchase_plan_after_sale: false,
        notes: "Relocating to Toronto for work. Sold Aug 2025.",
      },
      demographics: {
        birthday: "1982-11-28", anniversary: "2010-08-15", occupation: "Financial Analyst",
        employer: "TD Bank", income_range: "$150K - $250K", languages: ["English", "Cantonese"],
        family_size: 3,
      },
      last_activity_date: daysAgo(30),
    },
    {
      id: ids.aisha, name: "Aisha Okafor", phone: "+17785553001", email: "aisha.okafor@ubc.ca",
      type: "buyer", pref_channel: "whatsapp", source: "Open House", lead_status: "qualified",
      stage_bar: "qualified", tags: ["first-time buyer", "open house lead", "warm lead"],
      buyer_preferences: {
        price_range_min: 450000, price_range_max: 650000, bedrooms: 2, bathrooms: 1,
        property_types: ["Condo"], preferred_areas: ["Kitsilano", "UBC", "Point Grey"],
        move_in_timeline: "3-6 months", pre_approval_amount: 550000,
        financing_status: "in_progress", must_haves: ["In-suite laundry", "Balcony"],
        nice_to_haves: ["Gym", "Concierge", "Parking"],
      },
      demographics: {
        birthday: "1995-11-03", occupation: "Graduate Student / TA", employer: "UBC",
        income_range: "$50K - $100K", languages: ["English", "Yoruba"],
        hobbies_interests: ["Reading", "Running", "Cooking"], family_size: 1,
        bio_notes: "PhD candidate in Computer Science. First-time buyer. Very organized and responsive.",
      },
      last_activity_date: daysAgo(3),
    },
    {
      id: ids.david, name: "David Nguyen", phone: "+16045554001", email: "david.nguyen@tech.co",
      type: "buyer", pref_channel: "sms", source: "Social Media", lead_status: "new",
      stage_bar: "new", tags: ["online lead"],
      buyer_preferences: {
        price_range_min: 600000, price_range_max: 900000, bedrooms: 2, bathrooms: 2,
        property_types: ["Condo", "Townhouse"], preferred_areas: ["Burnaby", "New Westminster"],
        move_in_timeline: "6-12 months", financing_status: "not_started",
      },
      demographics: {
        birthday: "1992-04-18", occupation: "Product Manager", employer: "Shopify",
        income_range: "$150K - $250K", languages: ["English", "Vietnamese"],
        hobbies_interests: ["Gaming", "Cycling", "Coffee"], family_size: 1,
      },
      last_activity_date: daysAgo(1),
    },
    {
      id: ids.sarah, name: "Sarah Wilson", phone: "+17785555001", email: "sarah.wilson@outlook.com",
      type: "buyer", pref_channel: "whatsapp", source: "Realtor.ca", lead_status: "under_contract",
      stage_bar: "under_contract", tags: ["under contract", "closing soon", "pre-approved"],
      address: "789 E 22nd Ave, Vancouver, BC",
      buyer_preferences: {
        price_range_min: 1000000, price_range_max: 1300000, bedrooms: 3, bathrooms: 2,
        property_types: ["Detached"], preferred_areas: ["East Vancouver", "Main Street", "Fraser"],
        move_in_timeline: "Immediately", pre_approval_amount: 1100000,
        financing_status: "preapproved", must_haves: ["Backyard", "Character home", "Close to transit"],
        nice_to_haves: ["Laneway house potential", "Garage"],
      },
      demographics: {
        birthday: "1988-07-14", occupation: "Marketing Director", employer: "Lululemon",
        income_range: "$150K - $250K", languages: ["English"],
        hobbies_interests: ["Running", "Gardening", "Farmers markets"], family_size: 2,
        bio_notes: "Relocating from Burnaby. Loves character homes. Has a golden retriever.",
      },
      last_activity_date: daysAgo(0),
    },
    {
      id: ids.bobChen, name: "Bob Chen", phone: "+16045556001", email: "bob.chen@chenlaw.ca",
      type: "partner", pref_channel: "sms", source: "Sphere of Influence", lead_status: "active",
      partner_type: "lawyer", company_name: "Chen & Associates Law", job_title: "Senior Partner",
      typical_client_profile: "Residential real estate buyers and sellers in Greater Vancouver. Specializes in property transfers and title searches.",
      referral_agreement_terms: "25% referral fee on closed deals. Valid through Dec 2026.",
      partner_active: true, tags: ["vip", "sphere of influence"],
      demographics: {
        birthday: "1975-02-20", occupation: "Real Estate Lawyer", employer: "Chen & Associates Law",
        income_range: "$250K - $500K", languages: ["English", "Cantonese", "Mandarin"],
        hobbies_interests: ["Golf", "Wine", "Charity work"], family_size: 4,
        bio_notes: "Top referral partner. Has sent 12 clients over 5 years. Very reliable.",
      },
      last_activity_date: daysAgo(5),
    },
    {
      id: ids.raj, name: "Raj Patel", phone: "+16045556002", email: "raj.patel@rbc.com",
      type: "partner", pref_channel: "whatsapp", source: "Referral", lead_status: "active",
      partner_type: "mortgage_broker", company_name: "RBC Royal Bank", job_title: "Mortgage Specialist",
      typical_client_profile: "First-time buyers and move-up buyers. Handles pre-approvals quickly.",
      referral_agreement_terms: "No formal agreement. Mutual referral understanding.",
      partner_active: true, tags: ["sphere of influence"],
      demographics: {
        birthday: "1980-08-12", occupation: "Mortgage Specialist", employer: "RBC Royal Bank",
        income_range: "$100K - $150K", languages: ["English", "Hindi", "Gujarati"],
        hobbies_interests: ["Cricket", "Community events"], family_size: 5,
      },
      last_activity_date: daysAgo(7),
    },
    {
      id: ids.emily, name: "Emily Rodriguez", phone: "+17785556003", email: "emily@homecheck.ca",
      type: "partner", pref_channel: "sms", source: "Referral", lead_status: "active",
      partner_type: "inspector", company_name: "HomeCheck Inspections", job_title: "Lead Inspector",
      typical_client_profile: "Residential inspections for detached homes and condos. Available weekdays and Saturdays.",
      partner_active: true, tags: ["sphere of influence"],
      demographics: {
        occupation: "Home Inspector", employer: "HomeCheck Inspections",
        languages: ["English", "Spanish"],
      },
      last_activity_date: daysAgo(14),
    },
    {
      id: ids.tomPark, name: "Tom & Maya Park", phone: "+16045557001", email: "tpark@shaw.ca",
      type: "seller", pref_channel: "sms", source: "Cold Call", lead_status: "active",
      stage_bar: "active_listing", tags: ["warm lead"],
      address: "3847 W 16th Ave, Vancouver, BC",
      seller_preferences: {
        motivation: "upsizing", desired_list_price: 1500000,
        earliest_list_date: "2026-04-01", occupancy: "owner_occupied",
        has_purchase_plan_after_sale: true,
        notes: "Want to move to a bigger home in West Side. Need 4+ bedrooms for growing family.",
      },
      demographics: {
        birthday: "1986-12-05", anniversary: "2015-09-18", occupation: "Civil Engineer",
        employer: "City of Vancouver", income_range: "$150K - $250K",
        languages: ["English", "Korean"], family_size: 4,
        hobbies_interests: ["Hiking", "BBQ", "Community soccer"],
      },
      last_activity_date: daysAgo(4),
    },
    {
      id: ids.kevin, name: "Kevin Li", phone: "+16045558001", email: "kevinli88@hotmail.com",
      type: "other", pref_channel: "sms", source: "Google Ads", lead_status: "lost",
      stage_bar: "cold", tags: ["cold lead", "do not contact"],
      notes: "Responded to Google ad but never followed up after initial call. Marked as lost after 3 attempts.",
      demographics: {
        occupation: "Student", languages: ["English", "Mandarin"], family_size: 1,
      },
      last_activity_date: daysAgo(90),
    },
  ]);
  console.log("  ✅ 12 contacts created");

  // ─── 3. LISTINGS ───────────────────────────────────────
  console.log("🏠 Creating listings...");
  await supabase.from("listings").insert([
    {
      id: ids.marineDr, address: "4521 Marine Dr, West Vancouver, BC V7W 2Y4",
      seller_id: ids.priya, lockbox_code: "4521", status: "active",
      mls_number: "R2912345", list_price: 2189000,
      showing_window_start: "10:00", showing_window_end: "18:00",
      notes: "Stunning ocean-view home. 4 bed, 3 bath, 3200 sqft. Recently renovated kitchen.",
      commission_rate: 3.0,
    },
    {
      id: ids.georgiaStW, address: "1205-1288 W Georgia St, Vancouver, BC V6E 4R2",
      seller_id: ids.jamesChen, lockbox_code: "1205", status: "sold",
      mls_number: "R2898765", list_price: 879000, sold_price: 865000,
      buyer_id: ids.marcus, closing_date: "2025-08-10",
      notes: "Downtown condo. 2 bed, 2 bath. Sold below asking due to market conditions.",
      commission_rate: 2.5, commission_amount: 21625,
    },
    {
      id: ids.w16th, address: "3847 W 16th Ave, Vancouver, BC V6R 3C5",
      seller_id: ids.tomPark, lockbox_code: "3847", status: "active",
      mls_number: "R2923456", list_price: 1450000,
      showing_window_start: "11:00", showing_window_end: "17:00",
      notes: "Character home on quiet street. 3 bed, 2 bath. Large backyard. Near Jericho Beach.",
      commission_rate: 2.5,
    },
    {
      id: ids.e45th, address: "2109 E 45th Ave, Vancouver, BC V5P 1N2",
      seller_id: ids.priya, lockbox_code: "2109", status: "pending",
      mls_number: "R2934567", list_price: 1125000, sold_price: 1100000,
      buyer_id: ids.sarah, closing_date: "2026-04-15",
      notes: "Investment property. Accepted offer from Sarah Wilson. Closing April 15.",
      commission_rate: 2.5, commission_amount: 27500,
    },
  ]);
  console.log("  ✅ 4 listings created");

  // ─── 4. APPOINTMENTS ──────────────────────────────────
  console.log("📅 Creating showings...");
  await supabase.from("appointments").insert([
    // Marine Dr showings
    {
      listing_id: ids.marineDr, start_time: daysFromNow(2), end_time: new Date(Date.now() + 2*86400000 + 3600000).toISOString(),
      status: "confirmed", buyer_agent_name: "Jennifer Wu", buyer_agent_phone: "+16045559001",
      buyer_agent_email: "jen.wu@remax.ca", notes: "Confirmed. Client very interested.",
    },
    {
      listing_id: ids.marineDr, start_time: daysFromNow(4), end_time: new Date(Date.now() + 4*86400000 + 3600000).toISOString(),
      status: "requested", buyer_agent_name: "Michael Brown", buyer_agent_phone: "+17785559002",
      notes: "Requested via Realtor.ca. Awaiting seller confirmation.",
    },
    // W 16th showings
    {
      listing_id: ids.w16th, start_time: daysFromNow(1), end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      status: "confirmed", buyer_agent_name: "Karen Lee", buyer_agent_phone: "+16045559003",
      buyer_agent_email: "karen.lee@sutton.com", notes: "Buyer is looking for a family home.",
    },
    {
      listing_id: ids.w16th, start_time: daysAgo(3), end_time: new Date(Date.now() - 3*86400000 + 3600000).toISOString(),
      status: "denied", buyer_agent_name: "Steve Park", buyer_agent_phone: "+17785559004",
      notes: "Seller unavailable during requested time.",
    },
    // E 45th showings
    {
      listing_id: ids.e45th, start_time: daysAgo(14), end_time: new Date(Date.now() - 14*86400000 + 3600000).toISOString(),
      status: "confirmed", buyer_agent_name: "Direct Buyer", buyer_agent_phone: "+17785555001",
      buyer_agent_email: "sarah.wilson@outlook.com", notes: "Sarah Wilson viewing. Led to accepted offer.",
    },
    {
      listing_id: ids.e45th, start_time: daysAgo(10), end_time: new Date(Date.now() - 10*86400000 + 3600000).toISOString(),
      status: "cancelled", buyer_agent_name: "Alan Chang", buyer_agent_phone: "+16045559005",
      notes: "Cancelled — property went pending before showing.",
    },
  ]);
  console.log("  ✅ 6 showings created");

  // ─── 5. COMMUNICATIONS ────────────────────────────────
  console.log("💬 Creating communications...");
  await supabase.from("communications").insert([
    // Marcus
    { contact_id: ids.marcus, direction: "outbound", channel: "whatsapp", body: "Hi Marcus! Congratulations on closing on the Georgia St condo! 🎉 I hope the move went smoothly.", created_at: daysAgo(30) },
    { contact_id: ids.marcus, direction: "inbound", channel: "whatsapp", body: "Thanks so much! We love the new place. The view is amazing.", created_at: daysAgo(29) },
    { contact_id: ids.marcus, direction: "outbound", channel: "email", body: "Hi Marcus, just checking in — how's everything at the new condo? Let me know if you need anything!", created_at: daysAgo(14) },
    // Leah
    { contact_id: ids.leah, direction: "outbound", channel: "sms", body: "Hi Leah, I found 3 new listings in West Van that match your criteria. Want me to send details?", created_at: daysAgo(3) },
    { contact_id: ids.leah, direction: "inbound", channel: "sms", body: "Yes please! We're especially interested in anything with a view.", created_at: daysAgo(3) },
    // Priya
    { contact_id: ids.priya, direction: "outbound", channel: "whatsapp", body: "Hi Priya, we have 2 showing requests for Marine Dr this week. One confirmed for Thursday at 2pm.", created_at: daysAgo(1) },
    { contact_id: ids.priya, direction: "inbound", channel: "whatsapp", body: "Thursday works. Please make sure they remove shoes. Thanks!", created_at: daysAgo(1) },
    // Aisha
    { contact_id: ids.aisha, direction: "outbound", channel: "whatsapp", body: "Hi Aisha! Have you had a chance to look at the Kitsilano listings I sent? The one on Yew St has everything on your must-have list.", created_at: daysAgo(5) },
    { contact_id: ids.aisha, direction: "inbound", channel: "whatsapp", body: "Hi! Yes, I loved it! Can we book a showing for this weekend?", created_at: daysAgo(4) },
    { contact_id: ids.aisha, direction: "outbound", channel: "whatsapp", body: "Absolutely! I'll set up a Saturday showing at 11am. Also, how's the pre-approval going with Raj?", created_at: daysAgo(4) },
    // David
    { contact_id: ids.david, direction: "outbound", channel: "sms", body: "Hi David, welcome! I saw your inquiry about properties in Burnaby. When's a good time to chat about what you're looking for?", created_at: daysAgo(1) },
    // Sarah
    { contact_id: ids.sarah, direction: "outbound", channel: "whatsapp", body: "Great news Sarah! The seller accepted your offer on E 45th Ave! 🎉 Closing date April 15.", created_at: daysAgo(7) },
    { contact_id: ids.sarah, direction: "inbound", channel: "whatsapp", body: "OMG that's amazing!!! Thank you so much! When do we need to do the inspection?", created_at: daysAgo(7) },
    { contact_id: ids.sarah, direction: "outbound", channel: "whatsapp", body: "I'll coordinate with Emily from HomeCheck. She's great. Should be within the next 5 business days.", created_at: daysAgo(7) },
    // Bob Chen
    { contact_id: ids.bobChen, direction: "outbound", channel: "sms", body: "Hi Bob, thanks for referring Aisha! She's a great client. I'll keep you posted on her search.", created_at: daysAgo(20) },
    { contact_id: ids.bobChen, direction: "inbound", channel: "sms", body: "Happy to help! She's a colleague's daughter. Take good care of her.", created_at: daysAgo(20) },
    // Tom Park
    { contact_id: ids.tomPark, direction: "outbound", channel: "sms", body: "Hi Tom, I've prepared the CMA for your property on W 16th. Can we meet this week to review?", created_at: daysAgo(4) },
    { contact_id: ids.tomPark, direction: "inbound", channel: "sms", body: "Thursday evening works for us. Can you come to the house at 6pm?", created_at: daysAgo(4) },
    // Notes
    { contact_id: ids.kevin, direction: "outbound", channel: "note", body: "Called 3 times, no answer. Sent follow-up email. No response for 2 months. Marking as lost.", created_at: daysAgo(60) },
  ]);
  console.log("  ✅ 19 communications created");

  // ─── 6. CONTACT RELATIONSHIPS ──────────────────────────
  console.log("🔗 Creating relationships...");
  await supabase.from("contact_relationships").insert([
    { contact_a_id: ids.marcus, contact_b_id: ids.leah, relationship_type: "spouse" },
    { contact_a_id: ids.marcus, contact_b_id: ids.david, relationship_type: "colleague", notes: "Both work in tech" },
    { contact_a_id: ids.leah, contact_b_id: ids.priya, relationship_type: "friend", notes: "Met through yoga class" },
    { contact_a_id: ids.bobChen, contact_b_id: ids.raj, relationship_type: "colleague", notes: "Work together on real estate transactions" },
    { contact_a_id: ids.bobChen, contact_b_id: ids.emily, relationship_type: "colleague", notes: "Bob recommends Emily for inspections" },
    { contact_a_id: ids.sarah, contact_b_id: ids.tomPark, relationship_type: "neighbour", notes: "Live on nearby streets" },
    { contact_a_id: ids.aisha, contact_b_id: ids.david, relationship_type: "friend", notes: "UBC friends" },
  ]);
  console.log("  ✅ 7 relationships created");

  // ─── 7. REFERRALS ─────────────────────────────────────
  console.log("🤝 Creating referrals...");
  await supabase.from("referrals").insert([
    {
      referred_by_contact_id: ids.bobChen, referred_client_contact_id: ids.marcus,
      referral_type: "buyer", referral_date: "2025-03-01", referral_fee_percent: 25,
      status: "closed", closed_deal_id: ids.georgiaStW, notes: "Closed on Georgia St condo",
    },
    {
      referred_by_contact_id: ids.bobChen, referred_client_contact_id: ids.aisha,
      referral_type: "buyer", referral_date: "2025-11-15", referral_fee_percent: 25,
      status: "accepted", notes: "Colleague's daughter looking for first home",
    },
    {
      referred_by_contact_id: ids.marcus, referred_client_contact_id: ids.david,
      referral_type: "buyer", referral_date: "2026-03-10", status: "open",
      notes: "Marcus recommended us to his colleague David",
    },
  ]);
  console.log("  ✅ 3 referrals created");

  // ─── 8. CONTACT DATES ─────────────────────────────────
  console.log("📅 Creating contact dates...");
  await supabase.from("contact_dates").insert([
    { contact_id: ids.marcus, label: "Marcus Birthday", date: "1985-03-15", recurring: true, event_type: "birthday" },
    { contact_id: ids.marcus, label: "Thompson Anniversary", date: "2012-06-22", recurring: true, event_type: "anniversary" },
    { contact_id: ids.marcus, label: "Condo Closing", date: "2025-08-10", recurring: false, event_type: "closing" },
    { contact_id: ids.marcus, label: "Home Anniversary", date: "2025-08-10", recurring: true, event_type: "move_in" },
    { contact_id: ids.leah, label: "Leah Birthday", date: "1987-09-22", recurring: true, event_type: "birthday" },
    { contact_id: ids.priya, label: "Priya Birthday", date: "1979-06-10", recurring: true, event_type: "birthday" },
    { contact_id: ids.sarah, label: "Mortgage Renewal", date: "2027-04-15", recurring: false, event_type: "renewal" },
    { contact_id: ids.sarah, label: "E 45th Closing", date: "2026-04-15", recurring: false, event_type: "closing" },
    { contact_id: ids.aisha, label: "Aisha Birthday", date: "1995-11-03", recurring: true, event_type: "birthday" },
    { contact_id: ids.tomPark, label: "Park Anniversary", date: "2015-09-18", recurring: true, event_type: "anniversary" },
  ]);
  console.log("  ✅ 10 contact dates created");

  // ─── 9. TASKS ──────────────────────────────────────────
  console.log("📋 Creating tasks...");
  await supabase.from("tasks").insert([
    { title: "Follow up with Aisha on pre-approval", status: "pending", priority: "high", category: "follow_up", due_date: daysFromNow(2).split("T")[0], contact_id: ids.aisha },
    { title: "Prepare CMA for Tom & Maya Park", status: "in_progress", priority: "medium", category: "listing", due_date: daysFromNow(1).split("T")[0], contact_id: ids.tomPark, listing_id: ids.w16th },
    { title: "Send pre-approval docs to David", status: "pending", priority: "medium", category: "document", due_date: daysFromNow(3).split("T")[0], contact_id: ids.david },
    { title: "Schedule inspection for Sarah — E 45th", status: "pending", priority: "urgent", category: "inspection", due_date: daysFromNow(5).split("T")[0], contact_id: ids.sarah, listing_id: ids.e45th },
    { title: "Update MLS photos for Marine Dr", status: "completed", priority: "low", category: "marketing", due_date: daysAgo(2).split("T")[0], contact_id: ids.priya, listing_id: ids.marineDr, completed_at: daysAgo(1) },
    { title: "Call Raj about financing options for Aisha", status: "pending", priority: "medium", category: "follow_up", due_date: daysFromNow(1).split("T")[0], contact_id: ids.raj },
    { title: "Send closing documents to Marcus", status: "completed", priority: "high", category: "closing", due_date: daysAgo(30).split("T")[0], contact_id: ids.marcus, listing_id: ids.georgiaStW, completed_at: daysAgo(28) },
    { title: "Review Priya's listing agreement renewal", status: "pending", priority: "medium", category: "document", due_date: daysFromNow(7).split("T")[0], contact_id: ids.priya, listing_id: ids.marineDr },
  ]);
  console.log("  ✅ 8 tasks created");

  // ─── 10. WORKFLOW ENROLLMENTS ──────────────────────────
  console.log("⚙️  Creating workflow enrollments...");
  // Get workflow IDs
  const { data: workflows } = await supabase.from("workflows").select("id, slug");
  if (workflows && workflows.length > 0) {
    const wfMap = Object.fromEntries(workflows.map(w => [w.slug, w.id]));

    const enrollments = [];
    if (wfMap.post_close_buyer) {
      enrollments.push({
        workflow_id: wfMap.post_close_buyer, contact_id: ids.marcus, listing_id: ids.georgiaStW,
        status: "completed", current_step: 18, started_at: daysAgo(180), completed_at: daysAgo(10),
      });
    }
    if (wfMap.buyer_nurture) {
      enrollments.push({
        workflow_id: wfMap.buyer_nurture, contact_id: ids.aisha,
        status: "active", current_step: 3, started_at: daysAgo(30), next_run_at: daysFromNow(2),
      });
    }
    if (wfMap.speed_to_contact) {
      enrollments.push({
        workflow_id: wfMap.speed_to_contact, contact_id: ids.david,
        status: "active", current_step: 1, started_at: daysAgo(1), next_run_at: daysFromNow(0),
      });
    }

    if (enrollments.length > 0) {
      await supabase.from("workflow_enrollments").insert(enrollments);
      console.log(`  ✅ ${enrollments.length} workflow enrollments created`);
    }
  } else {
    console.log("  ⚠️  No workflows found — skipping enrollments");
  }

  // ─── 11. ACTIVITY LOG ─────────────────────────────────
  console.log("📝 Creating activity log...");
  await supabase.from("activity_log").insert([
    { contact_id: ids.marcus, listing_id: ids.georgiaStW, activity_type: "deal_closed", description: "Closed on 1205-1288 W Georgia St for $865,000", created_at: daysAgo(180) },
    { contact_id: ids.sarah, listing_id: ids.e45th, activity_type: "offer_accepted", description: "Offer accepted on 2109 E 45th Ave for $1,100,000", created_at: daysAgo(7) },
    { contact_id: ids.aisha, activity_type: "showing_booked", description: "Showing booked for Kitsilano condo on Yew St", created_at: daysAgo(4) },
    { contact_id: ids.priya, listing_id: ids.marineDr, activity_type: "listing_created", description: "Listed 4521 Marine Dr for $2,189,000", created_at: daysAgo(45) },
    { contact_id: ids.david, activity_type: "new_lead", description: "New lead from Social Media campaign", created_at: daysAgo(1) },
    { contact_id: ids.tomPark, listing_id: ids.w16th, activity_type: "listing_created", description: "Listed 3847 W 16th Ave for $1,450,000", created_at: daysAgo(14) },
  ]);
  console.log("  ✅ 6 activity log entries created");

  console.log("\n✨ Seed complete! Summary:");
  console.log("   12 contacts (4 buyers, 4 sellers, 3 partners, 1 other)");
  console.log("   2 households (Thompson, Chen)");
  console.log("   4 listings (2 active, 1 pending, 1 sold)");
  console.log("   6 showings (2 confirmed, 1 requested, 1 denied, 1 confirmed, 1 cancelled)");
  console.log("   19 communications");
  console.log("   8 relationships");
  console.log("   3 referrals");
  console.log("   10 contact dates");
  console.log("   8 tasks");
  console.log("   3+ workflow enrollments");
  console.log("   6 activity log entries");
}

(async () => {
  try {
    await deleteAll();
    await seed();
    console.log("\n🎉 Done! Restart the app to see the data.");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
