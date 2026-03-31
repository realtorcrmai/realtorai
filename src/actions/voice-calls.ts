"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { VoiceCallInsert, VoiceCall } from "@/types/voice-agent";

export async function logVoiceCall(call: VoiceCallInsert) {
  // Don't log accidental activations (< 5 seconds)
  if (call.duration_seconds !== undefined && call.duration_seconds < 5) {
    return { skipped: true };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("voice_calls")
    .insert(call)
    .select()
    .single();

  if (error) return { error: error.message };

  // Also log to communications table if contact context exists
  if (call.contact_id && call.transcript) {
    const summary = call.transcript.slice(0, 500);
    await supabase.from("communications").insert({
      contact_id: call.contact_id,
      direction: "outbound",
      channel: "note",
      body: `[Voice Call] ${summary}`,
      related_type: call.listing_id ? "listing" : null,
      related_id: call.listing_id ?? null,
    });
  }

  revalidatePath("/voice-agent");
  if (call.contact_id) {
    revalidatePath(`/contacts/${call.contact_id}`);
  }

  return { call: data as VoiceCall };
}

export async function getVoiceCalls(opts: {
  agentEmail?: string;
  contactId?: string;
  limit?: number;
}) {
  const supabase = createAdminClient();
  let query = supabase
    .from("voice_calls")
    .select("*, voice_sessions!inner(agent_email)")
    .order("started_at", { ascending: false })
    .limit(opts.limit ?? 20);

  if (opts.contactId) {
    query = query.eq("contact_id", opts.contactId);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { calls: data as VoiceCall[] };
}

export async function getVoiceCallTranscript(callId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("voice_calls")
    .select("transcript, summary, tool_calls_used, duration_seconds, cost_usd, compliance_flagged, compliance_notes")
    .eq("id", callId)
    .single();

  if (error) return { error: error.message };
  return { data };
}
