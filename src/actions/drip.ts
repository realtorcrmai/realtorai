"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

// Drip schedule: day → subject + skip check
const DRIP_SCHEDULE = [
  { day: 0, subject: "Welcome to Realtors360 — here's your first win", skipCheck: null },
  { day: 1, subject: "Import your contacts in 60 seconds", skipCheck: "contacts" },
  { day: 2, subject: "Did you know? AI writes your MLS remarks", skipCheck: "remarks" },
  { day: 3, subject: "Send your first newsletter in 3 minutes", skipCheck: "newsletter" },
  { day: 5, subject: "Never miss a showing with smart scheduling", skipCheck: "calendar" },
  { day: 7, subject: "7 days left on your Professional trial", skipCheck: "upgraded" },
  { day: 12, subject: "Your Professional trial ends in 2 days", skipCheck: "upgraded" },
];

const FOUNDER_FROM = {
  name: "Rahul from Realtors360",
  email: process.env.RESEND_FROM_EMAIL || "onboarding@realtors360.com",
};

/**
 * Check if a drip email should be skipped (D2 behavior-aware logic).
 */
async function shouldSkipDrip(
  userId: string,
  skipCheck: string | null,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<boolean> {
  if (!skipCheck) return false;

  switch (skipCheck) {
    case "contacts": {
      const { count } = await supabase.from("contacts").select("id", { count: "exact", head: true }).eq("realtor_id", userId).neq("is_sample", true);
      return (count ?? 0) > 0;
    }
    case "remarks": {
      const { count } = await supabase.from("prompts").select("id", { count: "exact", head: true }).eq("realtor_id", userId);
      return (count ?? 0) > 0;
    }
    case "newsletter": {
      const { count } = await supabase.from("newsletters").select("id", { count: "exact", head: true }).eq("realtor_id", userId).eq("status", "sent");
      return (count ?? 0) > 0;
    }
    case "calendar": {
      const { count } = await supabase.from("user_integrations").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("provider", "google_calendar");
      return (count ?? 0) > 0;
    }
    case "upgraded": {
      const { data } = await supabase.from("users").select("plan").eq("id", userId).single();
      return data?.plan !== "free"; // Skip trial emails if user already upgraded
    }
    default:
      return false;
  }
}

/**
 * Send a single drip email for a user + day.
 */
export async function sendDripEmail(
  userId: string,
  email: string,
  name: string,
  day: number,
) {
  const schedule = DRIP_SCHEDULE.find((s) => s.day === day);
  if (!schedule) return { skipped: true, reason: "no schedule for day" };

  const supabase = createAdminClient();

  // Check if already sent
  const { data: existing } = await supabase
    .from("welcome_drip_log")
    .select("id")
    .eq("user_id", userId)
    .eq("day", day)
    .single();

  if (existing) return { skipped: true, reason: "already sent" };

  // Check if user unsubscribed from drip
  const { data: user } = await supabase
    .from("users")
    .select("drip_unsubscribed")
    .eq("id", userId)
    .single();

  if (user?.drip_unsubscribed) return { skipped: true, reason: "unsubscribed" };

  // Check behavior-aware skip
  const shouldSkip = await shouldSkipDrip(userId, schedule.skipCheck, supabase);
  if (shouldSkip) {
    // Log as skipped (not sent but tracked)
    await supabase.from("welcome_drip_log").insert({
      user_id: userId,
      day,
      skipped: true,
    });
    return { skipped: true, reason: `action already done: ${schedule.skipCheck}` };
  }

  // Build email content (simple text for now — React Email templates in Phase 2)
  const firstName = name?.split(" ")[0] || "there";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.realtors360.com";
  const unsubscribeUrl = `${appUrl}/api/newsletters/unsubscribe?user=${encodeURIComponent(userId)}&type=drip`;

  const bodyMap: Record<number, string> = {
    0: `Hi ${firstName},\n\nWelcome to Realtors360! Your 14-day Professional trial is active — all features unlocked.\n\nHere are 3 quick wins to get started:\n1. Import your contacts → ${appUrl}/contacts/new\n2. Add a listing → ${appUrl}/listings\n3. Connect your calendar → ${appUrl}/calendar\n\nLet me know if you need anything!\n\nRahul`,
    1: `Hi ${firstName},\n\nDid you know? You can import your contacts in under 60 seconds.\n\nJust click here and follow the steps: ${appUrl}/contacts/new\n\nWe support Gmail, CSV, and Apple vCard imports.\n\nRahul`,
    2: `Hi ${firstName},\n\nOne of Realtors360's most powerful features: AI-generated MLS remarks.\n\nAdd a listing, and our AI writes your public and REALTOR remarks instantly. Try it: ${appUrl}/listings\n\nRahul`,
    3: `Hi ${firstName},\n\nReady to send your first newsletter? Our AI can write it for you.\n\nCreate a campaign in 3 minutes: ${appUrl}/newsletters\n\nRahul`,
    5: `Hi ${firstName},\n\nNever miss a showing again. Connect your Google Calendar and we'll sync all your appointments.\n\nConnect now: ${appUrl}/calendar\n\nRahul`,
    7: `Hi ${firstName},\n\nYou're halfway through your Professional trial — 7 days left!\n\nHere's what you've accomplished so far. Keep exploring!\n\nView your billing: ${appUrl}/settings/billing\n\nRahul`,
    12: `Hi ${firstName},\n\nYour Professional trial ends in 2 days.\n\nAfter that, you'll be on the Free plan (contacts, calendar, tasks only). Upgrade to keep all your features: ${appUrl}/settings/billing\n\nRahul`,
  };

  const body = bodyMap[day] || bodyMap[0];

  try {
    // Convert text to simple HTML
    const htmlBody = body.replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');

    const result = await sendEmail({
      to: email,
      from: `${FOUNDER_FROM.name} <${FOUNDER_FROM.email}>`,
      subject: schedule.subject,
      html: htmlBody,
      text: body,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
      },
    });

    // Log to welcome_drip_log
    await supabase.from("welcome_drip_log").insert({
      user_id: userId,
      day,
      sent_at: new Date().toISOString(),
      message_id: result?.messageId || null,
      skipped: false,
    });

    return { sent: true, messageId: result?.messageId };
  } catch (err) {
    console.error(`[drip] Failed to send Day ${day} to ${email}:`, err);
    return { error: "send failed" };
  }
}

/**
 * Process all pending drip emails for users within 14-day window.
 * Called by cron at /api/cron/welcome-drip.
 */
export async function processWelcomeDrip(): Promise<{ processed: number; sent: number; skipped: number }> {
  const supabase = createAdminClient();

  // Get users within 14-day signup window
  const { data: users } = await supabase
    .from("users")
    .select("id, email, name, created_at, drip_unsubscribed")
    .gte("created_at", new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString())
    .eq("is_active", true)
    .eq("drip_unsubscribed", false);

  if (!users?.length) return { processed: 0, sent: 0, skipped: 0 };

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const daysSinceSignup = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Find which drip emails are due for this user
    for (const schedule of DRIP_SCHEDULE) {
      if (schedule.day <= daysSinceSignup) {
        const result = await sendDripEmail(user.id, user.email, user.name, schedule.day);
        if (result.sent) sent++;
        else if (result.skipped) skipped++;
      }
    }
  }

  return { processed: users.length, sent, skipped };
}
