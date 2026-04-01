"use server";

import { createVoiceSession, endVoiceSession, getActiveSession, updateSessionActivity } from "@/lib/voice-session-manager";
import { revalidatePath } from "next/cache";
import type { VoiceSessionMode, FocusType } from "@/types/voice-agent";

export async function startVoiceSession(opts: {
  agentEmail: string;
  mode?: VoiceSessionMode;
  focusType?: FocusType | null;
  focusId?: string | null;
}) {
  const result = await createVoiceSession(opts);
  if (result.error) return { error: result.error };

  revalidatePath("/voice-agent");
  return { session: result.session };
}

export async function stopVoiceSession(sessionId: string) {
  const result = await endVoiceSession(sessionId);
  if (result.error) return { error: result.error };

  revalidatePath("/voice-agent");
  return { success: true };
}

export async function heartbeatSession(sessionId: string) {
  await updateSessionActivity(sessionId);
  return { success: true };
}

export async function getMyActiveSession(agentEmail: string) {
  const session = await getActiveSession(agentEmail);
  return { session };
}
