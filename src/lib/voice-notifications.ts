/**
 * Voice notification dispatcher — creates notifications and manages SSE delivery.
 * Rate-limited to 1 notification per 2 minutes per agent to avoid interruption fatigue.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { VoiceNotificationInsert, NotificationType, NotificationPriority } from "@/types/voice-agent";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";

const RATE_LIMIT_MS = 120_000; // 2 minutes between notifications

export async function createVoiceNotification(opts: {
  tenantId?: string;
  agentEmail: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, string | number | boolean | null>;
  priority?: NotificationPriority;
}): Promise<{ id: string; rateLimited: boolean }> {
  const supabase = createAdminClient();

  // Rate limit check (skip for urgent)
  if (opts.priority !== "urgent") {
    const cutoff = new Date(Date.now() - RATE_LIMIT_MS).toISOString();
    const { count } = await supabase
      .from("voice_notifications")
      .select("id", { count: "exact", head: true })
      .eq("agent_email", opts.agentEmail)
      .gte("created_at", cutoff);

    if ((count ?? 0) > 0) {
      // Still create but mark as rate-limited (won't be spoken immediately)
      const insert: VoiceNotificationInsert = {
        tenant_id: opts.tenantId ?? DEFAULT_TENANT_ID,
        agent_email: opts.agentEmail,
        notification_type: opts.type,
        title: opts.title,
        body: opts.body,
        payload: (opts.payload ?? {}) as Record<string, string | number | boolean | null>,
        priority: "low", // downgrade to batch
      };

      const { data } = await supabase
        .from("voice_notifications")
        .insert(insert)
        .select("id")
        .single();

      return { id: data?.id ?? "", rateLimited: true };
    }
  }

  const insert: VoiceNotificationInsert = {
    tenant_id: opts.tenantId ?? DEFAULT_TENANT_ID,
    agent_email: opts.agentEmail,
    notification_type: opts.type,
    title: opts.title,
    body: opts.body,
    payload: opts.payload ?? {},
    priority: opts.priority ?? "normal",
  };

  const { data, error } = await supabase
    .from("voice_notifications")
    .insert(insert)
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create notification: ${error.message}`);
  return { id: data.id, rateLimited: false };
}

export async function getUnreadNotifications(agentEmail: string, limit = 10) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("voice_notifications")
    .select("*")
    .eq("agent_email", agentEmail)
    .is("read_at", null)
    .order("priority", { ascending: true }) // urgent first
    .order("created_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("voice_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);
}

export async function markNotificationSpoken(notificationId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("voice_notifications")
    .update({
      spoken_at: new Date().toISOString(),
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId);
}
