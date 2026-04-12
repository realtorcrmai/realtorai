import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fire-and-forget event logging for platform analytics.
 * Never throws. Never blocks the calling function.
 * Call from server actions and API routes only.
 */
export async function trackEvent(
  eventName: string,
  userId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("platform_analytics").insert({
      event_name: eventName,
      user_id: userId,
      metadata: metadata ?? {},
    });
  } catch {
    // Tracking must never break the app — silently discard failures
  }
}
