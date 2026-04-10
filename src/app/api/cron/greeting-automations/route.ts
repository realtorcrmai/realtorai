import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRealtorConfig } from "@/actions/config";
import type { GreetingRule } from "@/actions/config";

export const maxDuration = 120;

/**
 * GET /api/cron/greeting-automations
 *
 * Daily cron (run at 8 AM) that checks which greeting automations should fire today.
 *
 * Flow:
 * 1. Load greeting rules from realtor_agent_config
 * 2. For each enabled rule, find matching contacts
 * 3. Generate & queue personalized greeting emails
 *
 * Supported occasions:
 * - birthday: matches contact_dates where date_type='birthday' and month/day = today
 * - home_anniversary: matches contact_dates where date_type='closing_anniversary'
 * - christmas: December 24
 * - new_year: December 31
 * - diwali: configured date (varies yearly)
 * - lunar_new_year: configured date
 * - canada_day: July 1
 * - thanksgiving: 2nd Monday of October
 * - valentines: February 14
 * - mothers_day: 2nd Sunday of May
 * - fathers_day: 3rd Sunday of June
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();

  // Load greeting rules
  const config = await getRealtorConfig();
  if (!config?.brand_config) {
    return NextResponse.json({ ok: true, processed: 0, reason: "No config" });
  }

  const greetingRules: GreetingRule[] = (config.brand_config as any).greeting_rules || [];
  const enabledRules = greetingRules.filter(r => r.enabled);

  if (enabledRules.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, reason: "No enabled greetings" });
  }

  // Get brand info for emails
  const brand = config.brand_config as any;
  const agentName = brand.realtorName || "Your Realtor";
  const brokerage = brand.brokerage || "";

  const results: Array<{ occasion: string; queued: number; skipped: number }> = [];

  for (const rule of enabledRules) {
    const contactIds = await getContactsForOccasion(supabase, rule, month, day, today);

    if (contactIds.length === 0) {
      results.push({ occasion: rule.occasion, queued: 0, skipped: 0 });
      continue;
    }

    // Fetch full contact data
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, name, email, type, newsletter_unsubscribed, newsletter_intelligence")
      .in("id", contactIds)
      .eq("newsletter_unsubscribed", false);

    const validContacts = (contacts || []).filter(c => c.email);
    let queued = 0;
    let skipped = 0;

    for (const contact of validContacts) {
      // Check if we already sent this greeting this year
      const yearStart = new Date(today.getFullYear(), 0, 1).toISOString();
      const { count } = await supabase
        .from("newsletters")
        .select("id", { count: "exact", head: true })
        .eq("contact_id", contact.id)
        .eq("email_type", `greeting_${rule.occasion}`)
        .gte("created_at", yearStart);

      if ((count || 0) > 0) {
        skipped++;
        continue;
      }

      // Generate the greeting email
      const { subject, html } = buildGreetingEmail(rule, contact, agentName, brokerage);

      // Queue as newsletter
      const { error } = await supabase.from("newsletters").insert({
        contact_id: contact.id,
        email_type: `greeting_${rule.occasion}`,
        journey_phase: "greeting",
        subject,
        html_body: html,
        status: rule.approval === "auto" ? "approved" : "draft",
        send_mode: rule.approval,
        ai_context: {
          greeting: true,
          occasion: rule.occasion,
          personalNote: rule.personalNote || null,
          year: today.getFullYear(),
        },
      });

      if (!error) {
        queued++;

        // If auto-send, send immediately
        if (rule.approval === "auto") {
          try {
            const { sendNewsletter } = await import("@/actions/newsletters");
            // Get the newsletter we just inserted
            const { data: nl } = await supabase
              .from("newsletters")
              .select("id")
              .eq("contact_id", contact.id)
              .eq("email_type", `greeting_${rule.occasion}`)
              .gte("created_at", new Date(Date.now() - 60000).toISOString())
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            if (nl) await sendNewsletter(nl.id);
          } catch {
            // Don't fail the cron if individual send fails
          }
        }
      }
    }

    results.push({ occasion: rule.occasion, queued, skipped });
  }

  const totalQueued = results.reduce((s, r) => s + r.queued, 0);

  return NextResponse.json({
    ok: true,
    date: `${today.getFullYear()}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    processed: totalQueued,
    results,
  });
}

// ── Find contacts matching this occasion for today ──────────
async function getContactsForOccasion(
  supabase: any,
  rule: GreetingRule,
  month: number,
  day: number,
  today: Date
): Promise<string[]> {
  const occasion = rule.occasion;

  // Personal milestones — match from contact_dates
  if (occasion === "birthday") {
    const { data } = await supabase.rpc("get_contacts_by_date_month_day", { p_date_type: "birthday", p_month: month, p_day: day }).catch(() => ({ data: null }));
    // Fallback: query directly with text matching
    if (!data) {
      const monthDay = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const { data: dates } = await supabase
        .from("contact_dates")
        .select("contact_id")
        .eq("date_type", "birthday")
        .like("date_value", `%-${monthDay}`);
      return (dates || []).map((d: any) => d.contact_id);
    }
    return (data || []).map((d: any) => d.contact_id);
  }

  if (occasion === "home_anniversary") {
    const monthDay = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const { data: dates } = await supabase
      .from("contact_dates")
      .select("contact_id")
      .in("date_type", ["closing_anniversary", "anniversary"])
      .like("date_value", `%-${monthDay}`);
    return (dates || []).map((d: any) => d.contact_id);
  }

  // Fixed-date holidays — check if today matches
  const isToday = (m: number, d: number) => month === m && day === d;

  // Send day before for some holidays (gives email time to arrive)
  if (occasion === "christmas" && !isToday(12, 24) && !isToday(12, 25)) return [];
  if (occasion === "new_year" && !isToday(12, 31) && !isToday(1, 1)) return [];
  if (occasion === "canada_day" && !isToday(7, 1)) return [];
  if (occasion === "valentines" && !isToday(2, 14)) return [];

  // Variable-date holidays
  if (occasion === "thanksgiving") {
    // 2nd Monday of October
    const oct1 = new Date(today.getFullYear(), 9, 1);
    const firstMonday = ((8 - oct1.getDay()) % 7) + 1;
    const thanksgivingDay = firstMonday + 7;
    if (month !== 10 || day !== thanksgivingDay) return [];
  }

  if (occasion === "mothers_day") {
    // 2nd Sunday of May
    const may1 = new Date(today.getFullYear(), 4, 1);
    const firstSunday = ((7 - may1.getDay()) % 7) + 1;
    const mothersDayDay = firstSunday + 7;
    if (month !== 5 || day !== mothersDayDay) return [];
  }

  if (occasion === "fathers_day") {
    // 3rd Sunday of June
    const jun1 = new Date(today.getFullYear(), 5, 1);
    const firstSunday = ((7 - jun1.getDay()) % 7) + 1;
    const fathersDayDay = firstSunday + 14;
    if (month !== 6 || day !== fathersDayDay) return [];
  }

  // Diwali and Lunar New Year — these vary yearly, skip date check for now
  // (would need a lookup table or API for exact dates)
  if (occasion === "diwali" || occasion === "lunar_new_year") {
    // For 2026: Diwali is Oct 19, Lunar New Year is Feb 17
    const DIWALI_2026 = { m: 10, d: 19 };
    const LUNAR_2026 = { m: 2, d: 17 };
    const DIWALI_2027 = { m: 11, d: 8 };
    const LUNAR_2027 = { m: 2, d: 6 };

    if (occasion === "diwali") {
      if (!isToday(DIWALI_2026.m, DIWALI_2026.d) && !isToday(DIWALI_2027.m, DIWALI_2027.d)) return [];
    }
    if (occasion === "lunar_new_year") {
      if (!isToday(LUNAR_2026.m, LUNAR_2026.d) && !isToday(LUNAR_2027.m, LUNAR_2027.d)) return [];
    }
  }

  // For holidays, get contacts based on recipients setting
  return getContactsByRecipients(supabase, rule.recipients);
}

async function getContactsByRecipients(supabase: any, recipients: string): Promise<string[]> {
  let query = supabase
    .from("contacts")
    .select("id")
    .eq("newsletter_unsubscribed", false)
    .not("email", "is", null);

  switch (recipients) {
    case "all_buyers":
      query = query.eq("type", "buyer");
      break;
    case "all_sellers":
      query = query.eq("type", "seller");
      break;
    case "past_clients":
      query = query.eq("stage_bar", "closed");
      break;
    case "active_clients":
      query = query.in("stage_bar", ["active_search", "active_listing", "under_contract"]);
      break;
    // "all_contacts" and "with_date" handled above
  }

  const { data } = await query.limit(500);
  return (data || []).map((c: any) => c.id);
}

// ── Build greeting email HTML ───────────────────────────────
function buildGreetingEmail(
  rule: GreetingRule,
  contact: { name: string; type: string },
  agentName: string,
  brokerage: string,
): { subject: string; html: string } {
  const firstName = contact.name.split(" ")[0];
  const occasion = rule.occasion;

  const GREETING_CONTENT: Record<string, { subject: string; heading: string; body: string; emoji: string; color: string }> = {
    birthday: {
      subject: `Happy Birthday, ${firstName}!`,
      heading: `Happy Birthday, ${contact.name}!`,
      body: `Wishing you a wonderful birthday filled with joy and happiness! I hope this year brings you everything you've been hoping for. Thank you for being a valued part of my network — here's to an amazing year ahead!`,
      emoji: "🎂",
      color: "#ec4899",
    },
    home_anniversary: {
      subject: `Happy Home Anniversary, ${firstName}!`,
      heading: `Happy Home Anniversary!`,
      body: `Can you believe it's been another year in your beautiful home? Time flies when you love where you live! I hope you're still enjoying every moment. If you ever need anything — home value update, contractor recommendations, or just real estate advice — I'm always here for you.`,
      emoji: "🏠",
      color: "#4f35d2",
    },
    christmas: {
      subject: `Merry Christmas, ${firstName}!`,
      heading: `Merry Christmas!`,
      body: `Wishing you and your family a wonderful Christmas filled with warmth, love, and joy. May your home be filled with laughter and beautiful memories this holiday season. Thank you for your trust and friendship throughout the year!`,
      emoji: "🎄",
      color: "#16a34a",
    },
    new_year: {
      subject: `Happy New Year, ${firstName}!`,
      heading: `Happy New Year!`,
      body: `Cheers to a brand new year! May it bring you health, happiness, and exciting new opportunities. Whether you're thinking about your next move or simply enjoying where you are, I'm here to help with anything real estate. Here's to an incredible year ahead!`,
      emoji: "🎆",
      color: "#7c3aed",
    },
    diwali: {
      subject: `Happy Diwali, ${firstName}!`,
      heading: `Happy Diwali!`,
      body: `Wishing you a Diwali filled with the glow of prosperity and the warmth of togetherness. May this Festival of Lights illuminate your home and heart with joy and abundance. Thank you for being such a valued part of my community!`,
      emoji: "🪔",
      color: "#f59e0b",
    },
    lunar_new_year: {
      subject: `Happy Lunar New Year, ${firstName}!`,
      heading: `Happy Lunar New Year!`,
      body: `Wishing you good fortune, prosperity, and happiness in this new year! May your home be filled with joy and your life with wonderful new beginnings. Thank you for being part of my community!`,
      emoji: "🧧",
      color: "#dc2626",
    },
    canada_day: {
      subject: `Happy Canada Day, ${firstName}!`,
      heading: `Happy Canada Day!`,
      body: `Wishing you a wonderful Canada Day! There's no better feeling than celebrating in a country we're proud to call home. I hope you enjoy the festivities with family and friends. Cheers to the best neighbourhoods in the world!`,
      emoji: "🍁",
      color: "#dc2626",
    },
    thanksgiving: {
      subject: `Happy Thanksgiving, ${firstName}!`,
      heading: `Happy Thanksgiving!`,
      body: `This Thanksgiving, I wanted to take a moment to say thank you. Thank you for your trust, your friendship, and for being part of my journey. I'm grateful to work in a community filled with wonderful people like you. Wishing you a beautiful day with the people you love.`,
      emoji: "🦃",
      color: "#ea580c",
    },
    valentines: {
      subject: `Happy Valentine's Day, ${firstName}!`,
      heading: `Happy Valentine's Day!`,
      body: `Here's to loving where you live! Whether you're cozied up at home or out celebrating, I hope today is filled with warmth and happiness. Your home is your haven — and I'm always here if you want to talk about making it even better.`,
      emoji: "💝",
      color: "#ec4899",
    },
    mothers_day: {
      subject: `Happy Mother's Day, ${firstName}!`,
      heading: `Happy Mother's Day!`,
      body: `Wishing all the amazing moms a beautiful Mother's Day! You make every house a home. Thank you for all you do — today and every day. I hope you're celebrated and spoiled today!`,
      emoji: "💐",
      color: "#ec4899",
    },
    fathers_day: {
      subject: `Happy Father's Day, ${firstName}!`,
      heading: `Happy Father's Day!`,
      body: `Wishing all the wonderful dads a fantastic Father's Day! Your hard work and dedication make everything possible — including the homes we love. I hope today is all about you!`,
      emoji: "👔",
      color: "#2563eb",
    },
  };

  const content = GREETING_CONTENT[occasion] || {
    subject: `Warm Wishes, ${firstName}!`,
    heading: "Warm Wishes!",
    body: `Just a note to say I'm thinking of you! Thank you for being part of my community. I'm always here if you need anything.`,
    emoji: "✨",
    color: "#4f35d2",
  };

  // Add personal note if provided
  const personalSection = rule.personalNote
    ? `<p style="font-size:14px;color:#6b7280;margin-top:16px;font-style:italic;border-left:3px solid ${content.color};padding-left:12px;">${rule.personalNote}</p>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:'Inter',-apple-system,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${content.subject}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;">
<tr><td align="center" style="padding:24px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

  <!-- Header gradient -->
  <tr><td>
    <div style="background:linear-gradient(135deg,${content.color}22,${content.color}11);padding:40px 32px;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">${content.emoji}</div>
      <h1 style="font-size:24px;font-weight:700;color:#1d1d1f;margin:0;letter-spacing:-0.5px;">${content.heading}</h1>
    </div>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 32px;">
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0;">${content.body}</p>
    ${personalSection}
  </td></tr>

  <!-- Agent signature -->
  <tr><td style="padding:0 32px 28px;">
    <table width="100%" style="border-top:1px solid #e5e7eb;padding-top:20px;">
    <tr>
      <td width="44" style="vertical-align:top;">
        <div style="width:40px;height:40px;border-radius:50%;background:${content.color};text-align:center;line-height:40px;color:#fff;font-weight:700;font-size:16px;">${agentName[0]}</div>
      </td>
      <td style="padding-left:12px;vertical-align:top;">
        <div style="font-size:14px;font-weight:600;color:#1d1d1f;">${agentName}</div>
        <div style="font-size:12px;color:#6b7280;">${brokerage}</div>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:16px 32px 20px;text-align:center;background:#f9fafb;border-top:1px solid #f3f4f6;">
    <p style="font-size:10px;color:#9ca3af;margin:0;">
      ${agentName} · ${brokerage}<br>
      <a href="#" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  return { subject: content.subject, html };
}
