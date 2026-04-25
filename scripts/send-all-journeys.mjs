#!/usr/bin/env node
/**
 * Send ALL journey emails (buyer, customer, agent) + standalone email types
 * for a specific contact.
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const CONTACT_ID = process.argv.find(a => a.startsWith("--contact-id="))?.split("=")[1]
  || "0d31a596-cb16-4ae1-8040-09f258f74a01";
const ENV_FILE = process.argv.find(a => a.startsWith("--env-file="))?.split("=")[1];

if (ENV_FILE) {
  const { config } = await import("dotenv");
  config({ path: ENV_FILE });
} else {
  try { const { config } = await import("dotenv"); config({ path: ".env.local" }); } catch {}
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY?.trim();
const RESEND_KEY = process.env.RESEND_API_KEY?.trim();
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL?.trim() || "hello@magnate360.com";

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY || !RESEND_KEY) {
  console.error("Missing required env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ── JOURNEY SCHEDULES ───────────────────────────────────────────
const BUYER_PHASES = {
  lead: [
    { emailType: "welcome" },
    { emailType: "neighbourhood_guide" },
    { emailType: "new_listing_alert" },
    { emailType: "market_update" },
  ],
  active: [
    { emailType: "new_listing_alert" },
    { emailType: "market_update" },
  ],
  under_contract: [
    { emailType: "closing_checklist" },
    { emailType: "inspection_reminder" },
    { emailType: "neighbourhood_guide" },
  ],
  past_client: [
    { emailType: "home_anniversary" },
    { emailType: "referral_ask" },
    { emailType: "market_update" },
  ],
  dormant: [
    { emailType: "reengagement" },
    { emailType: "new_listing_alert" },
    { emailType: "referral_ask" },
  ],
};

const CUSTOMER_PHASES = {
  lead: [
    { emailType: "welcome" },
    { emailType: "neighbourhood_guide" },
    { emailType: "market_update" },
  ],
  active: [
    { emailType: "market_update" },
    { emailType: "new_listing_alert" },
  ],
  past_client: [
    { emailType: "home_anniversary" },
    { emailType: "market_update" },
    { emailType: "referral_ask" },
  ],
  dormant: [
    { emailType: "reengagement" },
    { emailType: "market_update" },
    { emailType: "referral_ask" },
  ],
};

const AGENT_PHASES = {
  lead: [
    { emailType: "welcome" },
    { emailType: "market_update" },
    { emailType: "referral_ask" },
  ],
  active: [
    { emailType: "market_update" },
    { emailType: "new_listing_alert" },
  ],
  past_client: [
    { emailType: "market_update" },
    { emailType: "referral_ask" },
  ],
  dormant: [
    { emailType: "reengagement" },
    { emailType: "referral_ask" },
  ],
};

// Standalone email types not covered by journeys
const STANDALONE_EMAILS = [
  { emailType: "buyer_guide", category: "Education" },
  { emailType: "open_house_invite", category: "Event" },
  { emailType: "just_sold", category: "Event" },
  { emailType: "price_drop_alert", category: "Event" },
  { emailType: "home_value_update", category: "Scheduled" },
  { emailType: "mortgage_renewal_alert", category: "Scheduled" },
  { emailType: "client_testimonial", category: "Campaign" },
  { emailType: "premium_listing_showcase", category: "Campaign" },
  { emailType: "community_event", category: "Campaign" },
  { emailType: "referral_thank_you", category: "Event" },
  { emailType: "year_in_review", category: "Annual" },
  { emailType: "editorial_digest", category: "Editorial" },
  // welcome_drip is a platform onboarding email, NOT a client-facing email — excluded
];

// ── EMAIL DESCRIPTIONS ──────────────────────────────────────────
const EMAIL_DESCRIPTIONS = {
  welcome: "A warm welcome email. Introduce yourself, express excitement about working together, and outline next steps.",
  market_update: "Current real estate market trends — average prices, days on market, inventory levels, and what it means for them.",
  neighbourhood_guide: "A neighbourhood guide highlighting schools, parks, transit, dining, and lifestyle in their area.",
  new_listing_alert: "A new listing alert showcasing a featured property that matches their interests — include address, price, beds/baths, key features, and a link to learn more.",
  closing_checklist: "A closing checklist with key tasks to complete before closing — clear title, final walkthrough, utility transfers, moving logistics.",
  inspection_reminder: "Inspection preparation tips — ensure all systems work, provide repair documentation, clear utility access.",
  closing_countdown: "A closing countdown email building excitement about the upcoming closing day. Celebrate the milestone.",
  referral_ask: "A gentle referral request — thank them for their trust, and ask if they know anyone looking to buy or sell.",
  home_anniversary: "A home purchase/sale anniversary email — congratulate them, share market changes since their transaction, offer a free update.",
  reengagement: "A re-engagement email for a dormant contact — reference your past connection, share market developments, offer a free consultation.",
  buyer_guide: "A first-time homebuyer guide — the buying process step by step, pre-approval tips, what to expect at showings, making an offer, and closing.",
  open_house_invite: "An open house invitation — property address, date/time, key features, RSVP link. Make it feel exclusive.",
  just_sold: "A just-sold celebration — the property address, sale price, days on market, and how you helped make it happen. Social proof.",
  price_drop_alert: "A price reduction alert — the property just dropped in price, here's the new price vs original, and why now is the time to act.",
  home_value_update: "A home value update — estimated current value of their property, recent comparable sales, equity gained, and an offer for a free detailed CMA.",
  mortgage_renewal_alert: "A mortgage renewal reminder — their renewal is approaching, current rate environment, refinancing options, and a referral to a trusted mortgage broker.",
  client_testimonial: "A client success story — a recent testimonial from a happy client, the challenge they faced, how you helped, and the outcome. Social proof.",
  premium_listing_showcase: "A premium listing showcase — a luxury or featured property with multiple photos, detailed features, virtual tour link, and exclusive showing invite.",
  community_event: "A community event invitation — a local event you're sponsoring or attending, details, why it matters to the community, RSVP.",
  referral_thank_you: "A thank-you email for a referral they sent — express gratitude, update them on the status, and mention any referral rewards.",
  year_in_review: "An annual year-in-review — your stats (homes sold, volume, avg days on market), market highlights, favourite moments, and goals for the new year.",
  editorial_digest: "A curated weekly/monthly digest — 3-4 real estate articles, market insights, a local spotlight, and a personal note from you.",
  welcome_drip: "An onboarding email for new platform users — how to navigate the CRM, set up their profile, key features tour, and getting started tips.",
};

// ── PHASE COLORS ────────────────────────────────────────────────
const PHASE_COLORS = {
  lead: "#4f35d2",
  active: "#00BDA5",
  under_contract: "#FF7A59",
  past_client: "#2D3E50",
  dormant: "#6B7280",
  standalone: "#8B5CF6",
};

const TYPE_BADGES = {
  welcome: "👋 Welcome",
  market_update: "📊 Market Update",
  neighbourhood_guide: "🏘️ Neighbourhood Guide",
  new_listing_alert: "🏠 New Listing",
  closing_checklist: "✅ Closing Checklist",
  inspection_reminder: "🔍 Inspection Prep",
  closing_countdown: "🎉 Closing Countdown",
  referral_ask: "🤝 Referral",
  home_anniversary: "🎂 Anniversary",
  reengagement: "💌 Reconnecting",
  buyer_guide: "📖 Buyer Guide",
  open_house_invite: "🏡 Open House",
  just_sold: "🎊 Just Sold",
  price_drop_alert: "💰 Price Drop",
  home_value_update: "📈 Home Value",
  mortgage_renewal_alert: "🏦 Mortgage Renewal",
  client_testimonial: "⭐ Success Story",
  premium_listing_showcase: "💎 Premium Listing",
  community_event: "🎪 Community Event",
  referral_thank_you: "🙏 Thank You",
  year_in_review: "📅 Year in Review",
  editorial_digest: "📰 Digest",
  welcome_drip: "🚀 Getting Started",
};

// ── FETCH CONTACT ───────────────────────────────────────────────
console.log("\n🏠 Full Journey + Standalone Email Sender");
console.log("━".repeat(60));

const { data: contact, error: contactErr } = await supabase
  .from("contacts").select("*").eq("id", CONTACT_ID).single();

if (contactErr || !contact) {
  console.error("Contact not found:", contactErr?.message);
  process.exit(1);
}

console.log(`\n📧 Contact: ${contact.name} <${contact.email}>`);
console.log(`   Type: ${contact.type} | CASL: ${contact.casl_consent_given ? "✓" : "✗"}`);

if (!contact.email || !contact.casl_consent_given) {
  console.error("Missing email or CASL consent.");
  process.exit(1);
}

// Fetch branding
const { data: brandProfile } = await supabase
  .from("realtor_brand_profiles")
  .select("display_name, headshot_url, logo_url, phone, email, brokerage_name, brand_color, physical_address, title")
  .eq("realtor_id", contact.realtor_id).maybeSingle();

const { data: userRecord } = await supabase
  .from("users").select("name, email, phone, brokerage")
  .eq("id", contact.realtor_id).maybeSingle();

const branding = {
  name: brandProfile?.display_name || userRecord?.name || "Your Realtor",
  title: brandProfile?.title || "REALTOR®",
  brokerage: brandProfile?.brokerage_name || userRecord?.brokerage || "Magnate360 Realty",
  phone: brandProfile?.phone || userRecord?.phone || "",
  email: brandProfile?.email || userRecord?.email || FROM_EMAIL,
  accentColor: brandProfile?.brand_color || "#4f35d2",
  physicalAddress: brandProfile?.physical_address || "",
};

console.log(`   Realtor: ${branding.name} @ ${branding.brokerage}`);

// Fetch listings
const { data: listings } = await supabase
  .from("listings").select("id, address, list_price, status, hero_image_url, property_type, notes")
  .eq("realtor_id", contact.realtor_id).order("created_at", { ascending: false }).limit(5);

console.log(`   Listings: ${listings?.length || 0} for context\n`);

const listingContext = listings?.length
  ? listings.map(l => `- ${l.address}: $${(l.list_price || 0).toLocaleString()} (${l.status}, ${l.property_type || "residential"})`).join("\n")
  : "No active listings currently.";

// ── SEND ENGINE ─────────────────────────────────────────────────
let totalSent = 0;
let totalFailed = 0;
const allResults = [];

async function sendEmail(emailType, phase, journeyType) {
  const desc = EMAIL_DESCRIPTIONS[emailType] || `A ${emailType.replace(/_/g, " ")} email.`;
  const phaseColor = PHASE_COLORS[phase] || PHASE_COLORS.standalone;
  const badge = TYPE_BADGES[emailType] || emailType;

  console.log(`  ⏳ ${emailType} (${phase})...`);

  try {
    const contextNote = journeyType
      ? `Journey: ${journeyType} | Phase: ${phase}`
      : `Category: standalone`;

    const aiResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `You are writing a real estate email for ${branding.name} at ${branding.brokerage}.

Contact: ${contact.name} (type: ${contact.type}, email: ${contact.email})
${contextNote}
Email Type: ${emailType}

${desc}

Listings for context:
${listingContext}

Generate a professional, warm email. Return ONLY valid JSON:
{
  "subject": "Compelling subject line (under 60 chars)",
  "preheader": "Preview text (under 100 chars)",
  "headline": "Main headline",
  "body": "Main body (2-4 paragraphs, HTML with <p>, <br>, <strong>, <em>)",
  "ctaText": "CTA button text",
  "ctaUrl": "mailto:${branding.email}?subject=Re: [topic]"
}

Personalize for ${contact.name.split(" ")[0]}. Be specific, not generic.
IMPORTANT: Do NOT start the body with "Hi ${contact.name.split(" ")[0]}" or any greeting — the email template already adds "Hi ${contact.name.split(" ")[0]}," above the body. Jump straight into the content.`
      }],
    });

    const aiText = aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "";
    let content;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      content = JSON.parse(jsonMatch?.[0] || aiText);
    } catch {
      console.log(`  ❌ AI parse error`);
      totalFailed++;
      allResults.push({ journeyType: journeyType || "standalone", phase, emailType, status: "failed", error: "AI parse" });
      return;
    }

    console.log(`     📝 "${content.subject}"`);

    const html = buildEmailHtml({
      subject: content.subject,
      preheader: content.preheader || "",
      headline: content.headline || content.subject,
      body: content.body,
      ctaText: content.ctaText || "Get in Touch",
      ctaUrl: content.ctaUrl || `mailto:${branding.email}`,
      branding,
      contactName: contact.name,
      emailType,
      phase,
      badge,
      phaseColor,
    });

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${branding.name} <${FROM_EMAIL}>`,
        to: [contact.email],
        subject: content.subject,
        html,
        tags: [
          { name: "email_type", value: emailType },
          { name: "journey_phase", value: phase },
          { name: "journey_type", value: journeyType || "standalone" },
          { name: "contact_id", value: CONTACT_ID },
        ],
      }),
    });

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      console.log(`  ❌ Resend: ${sendData.message || "error"}`);
      totalFailed++;
      allResults.push({ journeyType: journeyType || "standalone", phase, emailType, status: "failed", error: sendData.message });
      await supabase.from("newsletters").insert({
        contact_id: CONTACT_ID, template_slug: emailType.replace(/_/g, "-"),
        journey_phase: phase, email_type: emailType, subject: content.subject,
        html_body: html, status: "failed", send_mode: "auto",
        error_message: sendData.message, realtor_id: contact.realtor_id,
      });
      return;
    }

    console.log(`  ✅ Sent (${sendData.id.slice(0, 8)}...)`);

    const { error: dbErr } = await supabase.from("newsletters").insert({
      contact_id: CONTACT_ID, template_slug: emailType.replace(/_/g, "-"),
      journey_phase: phase, email_type: emailType, subject: content.subject,
      html_body: html, status: "sent", send_mode: "auto",
      sent_at: new Date().toISOString(), resend_message_id: sendData.id,
      realtor_id: contact.realtor_id,
    });
    if (dbErr) console.log(`     ⚠️  DB: ${dbErr.message}`);

    totalSent++;
    allResults.push({ journeyType: journeyType || "standalone", phase, emailType, status: "sent", subject: content.subject });

    // Rate limit: 800ms between sends
    await new Promise(r => setTimeout(r, 800));
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    totalFailed++;
    allResults.push({ journeyType: journeyType || "standalone", phase, emailType, status: "failed", error: err.message });
  }
}

// ── RUN ALL JOURNEYS ────────────────────────────────────────────

const journeys = [
  { name: "BUYER JOURNEY", type: "buyer", phases: BUYER_PHASES },
  { name: "CUSTOMER JOURNEY", type: "customer", phases: CUSTOMER_PHASES },
  { name: "AGENT JOURNEY", type: "agent", phases: AGENT_PHASES },
];

for (const journey of journeys) {
  const phaseEntries = Object.entries(journey.phases);
  const emailCount = phaseEntries.reduce((sum, [, emails]) => sum + emails.length, 0);

  console.log(`\n${"█".repeat(60)}`);
  console.log(`  ${journey.name} (${emailCount} emails)`);
  console.log(`${"█".repeat(60)}`);

  for (const [phase, emails] of phaseEntries) {
    console.log(`\n  ── ${phase.toUpperCase()} (${emails.length}) ──`);
    for (const { emailType } of emails) {
      await sendEmail(emailType, phase, journey.type);
    }
  }
}

// ── STANDALONE EMAILS ───────────────────────────────────────────
console.log(`\n${"█".repeat(60)}`);
console.log(`  STANDALONE EMAILS (${STANDALONE_EMAILS.length} emails)`);
console.log(`${"█".repeat(60)}`);

for (const { emailType, category } of STANDALONE_EMAILS) {
  console.log(`\n  ── ${category.toUpperCase()} ──`);
  await sendEmail(emailType, "standalone", null);
}

// ── FINAL SUMMARY ───────────────────────────────────────────────
console.log(`\n${"═".repeat(60)}`);
console.log("📊 FINAL SUMMARY");
console.log("═".repeat(60));
console.log(`  Total: ${totalSent + totalFailed} | ✅ Sent: ${totalSent} | ❌ Failed: ${totalFailed}`);
console.log(`  Contact: ${contact.name} <${contact.email}>\n`);

// Group by journey type
const grouped = {};
for (const r of allResults) {
  const key = r.journeyType || "standalone";
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(r);
}

for (const [jType, items] of Object.entries(grouped)) {
  const sent = items.filter(i => i.status === "sent").length;
  const failed = items.filter(i => i.status !== "sent").length;
  console.log(`  📦 ${jType.toUpperCase()} — ${sent}/${items.length} sent${failed ? `, ${failed} failed` : ""}`);
  for (const r of items) {
    const icon = r.status === "sent" ? "✅" : "❌";
    console.log(`     ${icon} [${r.phase}] ${r.emailType}${r.subject ? ` — "${r.subject}"` : ""}${r.error ? ` (${r.error})` : ""}`);
  }
  console.log("");
}


// ── HTML BUILDER ────────────────────────────────────────────────
function buildEmailHtml({ subject, preheader, headline, body, ctaText, ctaUrl, branding, contactName, emailType, phase, badge, phaseColor }) {
  const firstName = contactName.split(" ")[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f5f5f7; font-family: -apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
    a { color: ${phaseColor}; text-decoration: none; }
    p { margin: 0 0 16px; line-height: 1.6; color: #1d1d1f; font-size: 16px; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a1a !important; }
      .wrapper { background: #2d2d2d !important; }
      p, .body-text { color: #f5f5f7 !important; }
      .headline { color: #ffffff !important; }
      .footer-text { color: #a1a1a6 !important; }
    }
    @media only screen and (max-width: 600px) {
      .wrapper { width: 100% !important; }
      .content { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;">
  <span class="preheader">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" class="wrapper" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg, ${phaseColor}, ${phaseColor}dd);padding:32px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.8);font-weight:600;">${badge}</p>
            <h1 class="headline" style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">${headline}</h1>
          </td>
        </tr>
        <tr>
          <td class="content" style="padding:36px 40px 24px;">
            <p style="margin:0 0 20px;font-size:16px;color:#86868b;">Hi ${firstName},</p>
            <div class="body-text" style="font-size:16px;line-height:1.7;color:#1d1d1f;">${body}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 40px 36px;text-align:center;">
            <a href="${ctaUrl}" style="display:inline-block;background:${phaseColor};color:#ffffff;font-size:16px;font-weight:600;padding:14px 36px;border-radius:980px;text-decoration:none;">${ctaText}</a>
          </td>
        </tr>
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e5e5;margin:0;"></td></tr>
        <tr>
          <td style="padding:28px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:16px;vertical-align:top;">
                <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,${phaseColor},${phaseColor}88);color:#fff;font-size:20px;font-weight:700;line-height:48px;text-align:center;">${branding.name.charAt(0)}</div>
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0;font-size:15px;font-weight:600;color:#1d1d1f;">${branding.name}</p>
                <p style="margin:2px 0 0;font-size:13px;color:#86868b;">${branding.title} | ${branding.brokerage}</p>
                ${branding.phone ? `<p style="margin:4px 0 0;font-size:13px;color:#86868b;">📱 ${branding.phone}</p>` : ""}
                <p style="margin:4px 0 0;font-size:13px;color:${phaseColor};">${branding.email}</p>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background:#fafafa;padding:24px 40px;border-radius:0 0 16px 16px;">
            <p class="footer-text" style="margin:0 0 8px;font-size:12px;color:#86868b;text-align:center;">
              ${branding.brokerage}${branding.physicalAddress ? ` · ${branding.physicalAddress}` : ""}
            </p>
            <p class="footer-text" style="margin:0;font-size:12px;color:#86868b;text-align:center;">
              You're receiving this because you're a valued client.
              <a href="mailto:${branding.email}?subject=Unsubscribe" style="color:#86868b;text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
