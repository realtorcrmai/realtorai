/**
 * Voice session lifecycle management.
 * Handles creation, persistence, resume, and expiry of voice sessions.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createRoom, createMeetingToken, deleteRoom } from "@/lib/daily-webrtc";
import type { VoiceSession, VoiceSessionInsert, VoiceSessionUpdate, VoiceSessionMode, FocusType, VoiceSource } from "@/types/voice-agent";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";

const SESSION_EXPIRY_MINUTES = 30;
const MAX_SESSIONS_PER_HOUR = 5;

export async function createVoiceSession(opts: {
  tenantId?: string;
  agentEmail: string;
  mode?: VoiceSessionMode;
  source?: VoiceSource;
  focusType?: FocusType | null;
  focusId?: string | null;
}): Promise<{ session: VoiceSession; error?: never } | { session?: never; error: string }> {
  const supabase = createAdminClient();
  const tenantId = opts.tenantId ?? DEFAULT_TENANT_ID;

  // Rate limit: max 5 sessions per hour per agent
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("voice_sessions")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("agent_email", opts.agentEmail)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= MAX_SESSIONS_PER_HOUR) {
    return { error: "Rate limit exceeded — max 5 voice sessions per hour" };
  }

  // Check for existing active session
  const { data: existing } = await supabase
    .from("voice_sessions")
    .select("id, daily_room_name")
    .eq("tenant_id", tenantId)
    .eq("agent_email", opts.agentEmail)
    .eq("status", "active")
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "Voice session already active in another tab. Close it first or use the existing session." };
  }

  // Create Daily.co room
  let room: { name: string; url: string; id: string };
  try {
    const tempId = crypto.randomUUID();
    room = await createRoom(tempId);
  } catch {
    // Fallback: create session without Daily.co (text-only mode)
    const insert: VoiceSessionInsert = {
      tenant_id: tenantId,
      agent_email: opts.agentEmail,
      mode: opts.mode ?? "realtor",
      source: opts.source ?? "browser",
      focus_type: opts.focusType ?? null,
      focus_id: opts.focusId ?? null,
      status: "active",
    };

    const { data, error } = await supabase
      .from("voice_sessions")
      .insert(insert)
      .select()
      .single();

    if (error) return { error: error.message };
    return { session: data as VoiceSession };
  }

  // Generate meeting token
  let token: string;
  try {
    token = await createMeetingToken(room.name);
  } catch {
    await deleteRoom(room.name).catch(() => {});
    return { error: "Failed to generate Daily.co meeting token" };
  }

  // Persist session
  const insert: VoiceSessionInsert = {
    tenant_id: tenantId,
    agent_email: opts.agentEmail,
    mode: opts.mode ?? "realtor",
    source: opts.source ?? "browser",
    daily_room_url: room.url,
    daily_room_name: room.name,
    daily_session_token: token,
    focus_type: opts.focusType ?? null,
    focus_id: opts.focusId ?? null,
    status: "active",
  };

  const { data, error } = await supabase
    .from("voice_sessions")
    .insert(insert)
    .select()
    .single();

  if (error) {
    await deleteRoom(room.name).catch(() => {});
    return { error: error.message };
  }

  return { session: data as VoiceSession };
}

export async function endVoiceSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: session } = await supabase
    .from("voice_sessions")
    .select("daily_room_name")
    .eq("id", sessionId)
    .single();

  // Clean up Daily.co room
  if (session?.daily_room_name) {
    await deleteRoom(session.daily_room_name).catch(() => {});
  }

  const { error } = await supabase
    .from("voice_sessions")
    .update({
      status: "offline",
      ended_at: new Date().toISOString(),
    } satisfies VoiceSessionUpdate)
    .eq("id", sessionId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("voice_sessions")
    .update({ last_activity_at: new Date().toISOString() } satisfies VoiceSessionUpdate)
    .eq("id", sessionId);
}

export async function cleanupStaleSessions(): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - SESSION_EXPIRY_MINUTES * 60_000).toISOString();

  // Find stale active/idle sessions
  const { data: stale } = await supabase
    .from("voice_sessions")
    .select("id, daily_room_name")
    .in("status", ["active", "idle"])
    .lt("last_activity_at", cutoff);

  if (!stale || stale.length === 0) return 0;

  // Delete Daily.co rooms
  for (const s of stale) {
    if (s.daily_room_name) {
      await deleteRoom(s.daily_room_name).catch(() => {});
    }
  }

  // Mark expired
  const ids = stale.map((s) => s.id);
  await supabase
    .from("voice_sessions")
    .update({ status: "expired", ended_at: new Date().toISOString() } satisfies VoiceSessionUpdate)
    .in("id", ids);

  return stale.length;
}

export async function getActiveSession(agentEmail: string, tenantId?: string): Promise<VoiceSession | null> {
  const supabase = createAdminClient();
  let query = supabase
    .from("voice_sessions")
    .select("*")
    .eq("agent_email", agentEmail)
    .eq("status", "active");

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (data as VoiceSession) ?? null;
}
