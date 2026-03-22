import { createAdminClient } from "@/lib/supabase/admin";

interface GovernorResult {
  allowed: boolean;
  reason?: string;
  nextAllowedAt?: Date;
}

interface GovernorConfig {
  weekly_cap: number;
  daily_cap: number;
  min_gap_hours: number;
}

async function getGovernorConfig(): Promise<GovernorConfig> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("agent_settings")
    .select("value")
    .eq("key", "send_governor")
    .single();

  return data?.value ?? { weekly_cap: 3, daily_cap: 1, min_gap_hours: 24 };
}

export async function checkGovernor(contactId: string): Promise<GovernorResult> {
  const supabase = createAdminClient();
  const config = await getGovernorConfig();

  // Check if contact is sunset
  const { data: contact } = await supabase
    .from("contacts")
    .select("auto_sunset, agent_enabled, agent_never_email")
    .eq("id", contactId)
    .single();

  if (!contact) return { allowed: false, reason: "Contact not found" };
  if (contact.agent_never_email) return { allowed: false, reason: "Contact marked as never email" };
  if (!contact.agent_enabled) return { allowed: false, reason: "Agent disabled for this contact" };
  if (contact.auto_sunset) return { allowed: false, reason: "Contact auto-sunset due to no engagement" };

  // Check weekly cap
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { count: weeklyCount } = await supabase
    .from("send_governor_log")
    .select("*", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .gte("sent_at", weekStart.toISOString());

  if ((weeklyCount ?? 0) >= config.weekly_cap) {
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    return {
      allowed: false,
      reason: `Weekly cap reached (${weeklyCount}/${config.weekly_cap})`,
      nextAllowedAt: nextWeekStart,
    };
  }

  // Check daily cap
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const { count: dailyCount } = await supabase
    .from("send_governor_log")
    .select("*", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .gte("sent_at", dayStart.toISOString());

  if ((dailyCount ?? 0) >= config.daily_cap) {
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    return {
      allowed: false,
      reason: `Daily cap reached (${dailyCount}/${config.daily_cap})`,
      nextAllowedAt: nextDay,
    };
  }

  // Check minimum gap
  const { data: lastSend } = await supabase
    .from("send_governor_log")
    .select("sent_at")
    .eq("contact_id", contactId)
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();

  if (lastSend) {
    const hoursSince = (Date.now() - new Date(lastSend.sent_at).getTime()) / 3600000;
    if (hoursSince < config.min_gap_hours) {
      const nextAllowed = new Date(new Date(lastSend.sent_at).getTime() + config.min_gap_hours * 3600000);
      return {
        allowed: false,
        reason: `Minimum gap not met (${hoursSince.toFixed(1)}h/${config.min_gap_hours}h)`,
        nextAllowedAt: nextAllowed,
      };
    }
  }

  return { allowed: true };
}

export async function logSend(
  contactId: string,
  emailType: string,
  newsletterId?: string
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("send_governor_log").insert({
    contact_id: contactId,
    email_type: emailType,
    newsletter_id: newsletterId ?? null,
  });
}

export async function checkAutoSunset(contactId: string): Promise<{ shouldSunset: boolean; reason?: string }> {
  const supabase = createAdminClient();

  // Get last 5 sent newsletters for this contact
  const { data: recentEmails } = await supabase
    .from("newsletters")
    .select("id")
    .eq("contact_id", contactId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(5);

  if (!recentEmails || recentEmails.length < 5) {
    return { shouldSunset: false };
  }

  // Check if any of the last 5 were opened
  const emailIds = recentEmails.map((e) => e.id);
  const { count: openCount } = await supabase
    .from("newsletter_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "opened")
    .in("newsletter_id", emailIds);

  if ((openCount ?? 0) === 0) {
    return {
      shouldSunset: true,
      reason: "No opens in last 5 emails",
    };
  }

  return { shouldSunset: false };
}

export async function applySunset(contactId: string, reason: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("contacts")
    .update({
      auto_sunset: true,
      sunset_at: new Date().toISOString(),
      sunset_reason: reason,
    })
    .eq("id", contactId);
}

export async function liftSunset(contactId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("contacts")
    .update({
      auto_sunset: false,
      sunset_at: null,
      sunset_reason: null,
    })
    .eq("id", contactId);
}
