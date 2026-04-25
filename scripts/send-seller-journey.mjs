#!/usr/bin/env node
/**
 * Send ALL seller journey emails for a specific contact.
 *
 * Usage:
 *   node scripts/send-seller-journey.mjs --contact-id=<uuid> [--env-file=<path>]
 *
 * This bypasses the normal drip schedule and sends every email type
 * across all 5 seller journey phases immediately.
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// ── CONFIG ──────────────────────────────────────────────────────
const CONTACT_ID = process.argv.find(a => a.startsWith("--contact-id="))?.split("=")[1]
  || "0d31a596-cb16-4ae1-8040-09f258f74a01";

const ENV_FILE = process.argv.find(a => a.startsWith("--env-file="))?.split("=")[1];

// Load env
if (ENV_FILE) {
  const { config } = await import("dotenv");
  config({ path: ENV_FILE });
} else {
  // Try .env.local
  try {
    const { config } = await import("dotenv");
    config({ path: ".env.local" });
  } catch {}
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY?.trim();
const RESEND_KEY = process.env.RESEND_API_KEY?.trim();
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL?.trim() || "hello@magnate360.com";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}
if (!RESEND_KEY) {
  console.error("Missing RESEND_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ── SELLER JOURNEY SCHEDULE ─────────────────────────────────────
const SELLER_PHASES = {
  lead: [
    { emailType: "welcome", delayHours: 0 },
    { emailType: "market_update", delayHours: 72 },
    { emailType: "neighbourhood_guide", delayHours: 168 },
  ],
  active: [
    { emailType: "market_update", delayHours: 168 },
  ],
  under_contract: [
    { emailType: "closing_checklist", delayHours: 0 },
    { emailType: "inspection_reminder", delayHours: 72 },
    { emailType: "closing_countdown", delayHours: 168 },
  ],
  past_client: [
    { emailType: "market_update", delayHours: 720 },
    { emailType: "referral_ask", delayHours: 720 },
    { emailType: "home_anniversary", delayHours: 8760 },
  ],
  dormant: [
    { emailType: "reengagement", delayHours: 0 },
    { emailType: "market_update", delayHours: 120 },
    { emailType: "referral_ask", delayHours: 240 },
  ],
};

// ── EMAIL DESCRIPTIONS (for AI prompt context) ──────────────────
const EMAIL_DESCRIPTIONS = {
  welcome: "A warm welcome email for a new seller client. Introduce yourself, express excitement about helping them sell their property, and outline the selling process. Keep it personal and professional.",
  market_update: "A market update email with current real estate trends, average prices in their area, days on market stats, and what it means for sellers. Be data-driven but approachable.",
  neighbourhood_guide: "A neighbourhood guide email highlighting the best features of their area — schools, parks, transit, dining, and lifestyle. Position their neighbourhood as desirable to buyers.",
  closing_checklist: "A closing checklist email with key tasks the seller needs to complete before closing: clear title, repairs, final walkthrough prep, utility transfers, moving logistics.",
  inspection_reminder: "An inspection reminder email with tips on preparing for the home inspection: ensure all systems work, provide documentation for recent repairs, clear access to utilities.",
  closing_countdown: "A closing countdown email building excitement about the upcoming closing. Remind them of final steps, what to bring, and celebrate the milestone.",
  referral_ask: "A gentle referral request email. Thank them for their trust, mention the great experience you had working together, and ask if they know anyone looking to buy or sell.",
  home_anniversary: "A home sale anniversary email. Congratulate them on the anniversary, share how the local market has changed since their sale, and offer a free market update.",
  reengagement: "A re-engagement email for a dormant seller contact. Reference your past connection, share interesting market developments, and offer a free consultation.",
};

// ── FETCH CONTACT ───────────────────────────────────────────────
console.log("\n🏠 Seller Journey Email Sender");
console.log("━".repeat(50));

const { data: contact, error: contactErr } = await supabase
  .from("contacts")
  .select("*")
  .eq("id", CONTACT_ID)
  .single();

if (contactErr || !contact) {
  console.error("Contact not found:", contactErr?.message);
  process.exit(1);
}

console.log(`\n📧 Contact: ${contact.name} <${contact.email}>`);
console.log(`   Type: ${contact.type} | CASL: ${contact.casl_consent_given ? "✓" : "✗"}`);
console.log(`   Realtor ID: ${contact.realtor_id}`);

if (!contact.email) {
  console.error("Contact has no email address!");
  process.exit(1);
}
if (!contact.casl_consent_given) {
  console.error("Contact has not given CASL consent — cannot send emails.");
  process.exit(1);
}

// Fetch realtor branding
const { data: brandProfile } = await supabase
  .from("realtor_brand_profiles")
  .select("display_name, headshot_url, logo_url, phone, email, brokerage_name, brand_color, physical_address, tagline, title")
  .eq("realtor_id", contact.realtor_id)
  .maybeSingle();

const { data: userRecord } = await supabase
  .from("users")
  .select("name, email, phone, brokerage")
  .eq("id", contact.realtor_id)
  .maybeSingle();

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

// Fetch active listings for context
const { data: listings } = await supabase
  .from("listings")
  .select("id, address, list_price, status, hero_image_url, property_type, notes")
  .eq("realtor_id", contact.realtor_id)
  .order("created_at", { ascending: false })
  .limit(5);

console.log(`   Listings: ${listings?.length || 0} available for context`);

// ── GENERATE & SEND ─────────────────────────────────────────────

const phases = Object.entries(SELLER_PHASES);
let totalSent = 0;
let totalFailed = 0;
const results = [];

for (const [phase, emails] of phases) {
  console.log(`\n${"═".repeat(50)}`);
  console.log(`📋 Phase: ${phase.toUpperCase()} (${emails.length} emails)`);
  console.log("═".repeat(50));

  for (const { emailType } of emails) {
    const desc = EMAIL_DESCRIPTIONS[emailType] || `A ${emailType.replace(/_/g, " ")} email for a seller.`;

    console.log(`\n  ⏳ Generating: ${emailType} (${phase})...`);

    try {
      // Generate AI content
      const listingContext = listings?.length
        ? `\n\nAvailable listings for context:\n${listings.map(l => `- ${l.address}: $${(l.list_price || 0).toLocaleString()} (${l.status})`).join("\n")}`
        : "";

      const aiResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `You are writing a real estate email for a realtor named ${branding.name} at ${branding.brokerage}.

Contact: ${contact.name} (${contact.type}, email: ${contact.email})
Journey Phase: ${phase}
Email Type: ${emailType}

${desc}${listingContext}

Generate a professional, warm email. Return ONLY valid JSON with these fields:
{
  "subject": "Email subject line (compelling, under 60 chars)",
  "preheader": "Preview text for email clients (under 100 chars)",
  "headline": "Main headline in the email body",
  "body": "The main email body text (2-4 paragraphs, HTML allowed with <p>, <br>, <strong>, <em> tags)",
  "ctaText": "Call-to-action button text",
  "ctaUrl": "mailto:${branding.email}?subject=Re: [relevant topic]"
}

Keep the tone professional but warm. Use the realtor's name naturally. Personalize for ${contact.name.split(" ")[0]}.`
        }],
      });

      const aiText = aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "";

      // Parse JSON from AI response (handle markdown code blocks)
      let content;
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        content = JSON.parse(jsonMatch?.[0] || aiText);
      } catch (parseErr) {
        console.error(`  ❌ Failed to parse AI response for ${emailType}:`, parseErr.message);
        totalFailed++;
        results.push({ phase, emailType, status: "failed", error: "AI parse error" });
        continue;
      }

      console.log(`  📝 Subject: "${content.subject}"`);

      // Build HTML email
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
        contactId: CONTACT_ID,
      });

      // Send via Resend
      const sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${branding.name} <${FROM_EMAIL}>`,
          to: [contact.email],
          subject: content.subject,
          html,
          tags: [
            { name: "email_type", value: emailType },
            { name: "journey_phase", value: phase },
            { name: "contact_id", value: CONTACT_ID },
          ],
        }),
      });

      const sendData = await sendRes.json();

      if (!sendRes.ok) {
        console.error(`  ❌ Resend error:`, sendData);
        totalFailed++;
        results.push({ phase, emailType, status: "failed", error: sendData.message || "Send failed" });

        // Still save to DB as failed
        await supabase.from("newsletters").insert({
          contact_id: CONTACT_ID,
          template_slug: emailType.replace(/_/g, "-"),
          journey_phase: phase,
          email_type: emailType,
          subject: content.subject,
          html_body: html,
          status: "failed",
          send_mode: "auto",
          error_message: sendData.message || "Resend API error",
          realtor_id: contact.realtor_id,
        });
        continue;
      }

      console.log(`  ✅ Sent! Resend ID: ${sendData.id}`);

      // Save to newsletters table
      await supabase.from("newsletters").insert({
        contact_id: CONTACT_ID,
        template_slug: emailType.replace(/_/g, "-"),
        journey_phase: phase,
        email_type: emailType,
        subject: content.subject,
        html_body: html,
        status: "sent",
        send_mode: "auto",
        sent_at: new Date().toISOString(),
        resend_message_id: sendData.id,
        realtor_id: contact.realtor_id,
      });

      totalSent++;
      results.push({ phase, emailType, status: "sent", subject: content.subject, resendId: sendData.id });

      // Small delay between sends to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.error(`  ❌ Error sending ${emailType}:`, err.message);
      totalFailed++;
      results.push({ phase, emailType, status: "failed", error: err.message });
    }
  }
}

// ── SUMMARY ─────────────────────────────────────────────────────
console.log(`\n${"═".repeat(50)}`);
console.log("📊 SUMMARY");
console.log("═".repeat(50));
console.log(`  Total: ${totalSent + totalFailed} | ✅ Sent: ${totalSent} | ❌ Failed: ${totalFailed}`);
console.log(`  Contact: ${contact.name} <${contact.email}>`);
console.log("");
for (const r of results) {
  const icon = r.status === "sent" ? "✅" : "❌";
  console.log(`  ${icon} [${r.phase}] ${r.emailType}${r.subject ? ` — "${r.subject}"` : ""}${r.error ? ` (${r.error})` : ""}`);
}
console.log("");


// ── HTML EMAIL BUILDER ──────────────────────────────────────────
function buildEmailHtml({ subject, preheader, headline, body, ctaText, ctaUrl, branding, contactName, emailType, phase, contactId }) {
  const accentColor = branding.accentColor || "#4f35d2";
  const firstName = contactName.split(" ")[0];

  // Phase-specific accent colors
  const phaseColors = {
    lead: "#4f35d2",        // Indigo
    active: "#00BDA5",      // Teal
    under_contract: "#FF7A59", // Coral
    past_client: "#2D3E50",   // Navy
    dormant: "#6B7280",       // Grey
  };
  const phaseColor = phaseColors[phase] || accentColor;

  // Email type badges
  const typeBadges = {
    welcome: "👋 Welcome",
    market_update: "📊 Market Update",
    neighbourhood_guide: "🏘️ Neighbourhood Guide",
    closing_checklist: "✅ Closing Checklist",
    inspection_reminder: "🔍 Inspection Prep",
    closing_countdown: "🎉 Closing Countdown",
    referral_ask: "🤝 Referral",
    home_anniversary: "🎂 Anniversary",
    reengagement: "💌 Reconnecting",
  };
  const badge = typeBadges[emailType] || emailType;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
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
  <span class="preheader">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="wrapper" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${phaseColor}, ${phaseColor}dd);padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.8);font-weight:600;">${badge}</p>
              <h1 class="headline" style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">${headline}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content" style="padding:36px 40px 24px;">
              <p style="margin:0 0 20px;font-size:16px;color:#86868b;">Hi ${firstName},</p>
              <div class="body-text" style="font-size:16px;line-height:1.7;color:#1d1d1f;">
                ${body}
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:8px 40px 36px;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;background:${phaseColor};color:#ffffff;font-size:16px;font-weight:600;padding:14px 36px;border-radius:980px;text-decoration:none;letter-spacing:0.2px;">${ctaText}</a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e5e5e5;margin:0;">
            </td>
          </tr>

          <!-- Realtor Signature -->
          <tr>
            <td style="padding:28px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:16px;vertical-align:top;">
                    <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,${phaseColor},${phaseColor}88);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700;line-height:48px;text-align:center;">
                      ${branding.name.charAt(0)}
                    </div>
                  </td>
                  <td style="vertical-align:top;">
                    <p style="margin:0;font-size:15px;font-weight:600;color:#1d1d1f;">${branding.name}</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#86868b;">${branding.title} | ${branding.brokerage}</p>
                    ${branding.phone ? `<p style="margin:4px 0 0;font-size:13px;color:#86868b;">📱 ${branding.phone}</p>` : ""}
                    <p style="margin:4px 0 0;font-size:13px;color:${phaseColor};">${branding.email}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
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
      </td>
    </tr>
  </table>
</body>
</html>`;
}
