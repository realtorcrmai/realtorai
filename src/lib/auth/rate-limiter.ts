import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS_PER_IP = 5;
const WINDOW_HOURS = 1;

/**
 * IP-based rate limiter for signup attempts.
 * Stores attempt counts in signup_rate_limits table.
 * Returns { allowed: true } or { allowed: false, retryAfter: "3:42 PM" }.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  ip: string
): Promise<{ allowed: boolean; retryAfter?: string }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);

  const { data: existing } = await supabase
    .from("signup_rate_limits")
    .select("*")
    .eq("ip_address", ip)
    .single();

  // First attempt from this IP
  if (!existing) {
    await supabase.from("signup_rate_limits").insert({
      ip_address: ip,
      attempt_count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true };
  }

  // Currently locked out
  if (existing.locked_until && new Date(existing.locked_until) > now) {
    const retryAfter = new Date(existing.locked_until).toLocaleTimeString("en-CA", {
      timeZone: "America/Vancouver",
      hour: "numeric",
      minute: "2-digit",
    });
    return { allowed: false, retryAfter };
  }

  // Window expired — reset counter
  if (new Date(existing.window_start) < windowStart) {
    await supabase
      .from("signup_rate_limits")
      .update({
        attempt_count: 1,
        window_start: now.toISOString(),
        locked_until: null,
      })
      .eq("ip_address", ip);
    return { allowed: true };
  }

  // Within window — check count
  if (existing.attempt_count >= MAX_ATTEMPTS_PER_IP) {
    const lockUntil = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
    await supabase
      .from("signup_rate_limits")
      .update({ locked_until: lockUntil.toISOString() })
      .eq("ip_address", ip);

    const retryAfter = lockUntil.toLocaleTimeString("en-CA", {
      timeZone: "America/Vancouver",
      hour: "numeric",
      minute: "2-digit",
    });
    return { allowed: false, retryAfter };
  }

  // Increment counter
  await supabase
    .from("signup_rate_limits")
    .update({ attempt_count: existing.attempt_count + 1 })
    .eq("ip_address", ip);
  return { allowed: true };
}
