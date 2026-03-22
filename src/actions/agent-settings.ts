"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  getGlobalTrustLevel,
  setGlobalTrustLevel,
  setContactTrustOverride,
  evaluateTrustPromotion,
  calculateTrustMetrics,
  type TrustLevel,
} from "@/lib/ai-agent/trust-manager";
import { recallEmail } from "@/lib/ai-agent/trust-gate";

export async function getAgentDashboard() {
  const supabase = createAdminClient();
  const trustLevel = await getGlobalTrustLevel();
  const metrics = await calculateTrustMetrics();
  const promotion = await evaluateTrustPromotion();

  // Count recent decisions
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600000).toISOString();
  const { data: recentDecisions } = await supabase
    .from("agent_decisions")
    .select("decision")
    .gte("created_at", twentyFourHoursAgo);

  const decisionCounts = { send: 0, skip: 0, defer: 0, suppress: 0 };
  for (const d of recentDecisions ?? []) {
    if (d.decision in decisionCounts) {
      decisionCounts[d.decision as keyof typeof decisionCounts]++;
    }
  }

  // Count unprocessed events
  const { count: pendingEvents } = await supabase
    .from("agent_events")
    .select("*", { count: "exact", head: true })
    .eq("processed", false);

  // Active recalls
  const { data: activeRecalls } = await supabase
    .from("email_recalls")
    .select("id, newsletter_id, expires_at, newsletters(subject, contacts(name))")
    .eq("recalled", false)
    .gte("expires_at", new Date().toISOString());

  return {
    trustLevel,
    metrics,
    promotion,
    decisionCounts,
    pendingEvents: pendingEvents ?? 0,
    activeRecalls: (activeRecalls ?? []).map((r: any) => ({
      id: r.id,
      subject: r.newsletters?.subject ?? "Unknown",
      contactName: r.newsletters?.contacts?.name ?? "Unknown",
      expiresAt: r.expires_at,
    })),
  };
}

export async function updateGlobalTrust(level: TrustLevel) {
  await setGlobalTrustLevel(level, `Manual update to ${level}`);
  revalidatePath("/newsletters/control");
}

export async function updateContactAgent(
  contactId: string,
  settings: {
    agent_enabled?: boolean;
    agent_never_email?: boolean;
    agent_trust_level?: TrustLevel | null;
    agent_frequency_pref?: string | null;
    agent_topic_avoid?: string[];
  }
) {
  const supabase = createAdminClient();
  await supabase.from("contacts").update(settings).eq("id", contactId);

  if (settings.agent_trust_level !== undefined) {
    await setContactTrustOverride(contactId, settings.agent_trust_level);
  }

  revalidatePath("/newsletters/control");
  revalidatePath(`/contacts/${contactId}`);
}

export async function recallSentEmail(recallId: string) {
  const result = await recallEmail(recallId);
  revalidatePath("/newsletters/control");
  return result;
}

export async function getOvernightSummary() {
  const supabase = createAdminClient();
  const twelveHoursAgo = new Date(Date.now() - 12 * 3600000).toISOString();

  // Emails sent overnight
  const { data: sentEmails } = await supabase
    .from("newsletters")
    .select("id, subject, email_type, sent_at, contact_id, contacts(name)")
    .eq("status", "sent")
    .gte("sent_at", twelveHoursAgo)
    .order("sent_at", { ascending: false });

  // Check which have active recalls
  const sentIds = (sentEmails ?? []).map((e) => e.id);
  const { data: recalls } = await supabase
    .from("email_recalls")
    .select("id, newsletter_id, expires_at, recalled")
    .in("newsletter_id", sentIds.length > 0 ? sentIds : ["__none__"])
    .eq("recalled", false);

  const recallMap: Record<string, { id: string; expiresAt: string }> = {};
  for (const r of recalls ?? []) {
    if (new Date(r.expires_at) > new Date()) {
      recallMap[r.newsletter_id] = { id: r.id, expiresAt: r.expires_at };
    }
  }

  // Emails held back
  const { data: heldBack } = await supabase
    .from("agent_decisions")
    .select("id, contact_id, email_type, reasoning, relevance_score, contacts(name)")
    .in("decision", ["skip", "defer", "suppress"])
    .gte("created_at", twelveHoursAgo)
    .order("created_at", { ascending: false })
    .limit(20);

  // Hot lead alerts
  const { data: hotLeads } = await supabase
    .from("agent_events")
    .select("contact_id, event_type, payload, created_at, contacts(name)")
    .eq("event_type", "high_intent_click")
    .gte("created_at", twelveHoursAgo)
    .order("created_at", { ascending: false });

  // Decision counts
  const { data: allDecisions } = await supabase
    .from("agent_decisions")
    .select("decision")
    .gte("created_at", twelveHoursAgo);

  const counts = { send: 0, skip: 0, defer: 0, suppress: 0 };
  for (const d of allDecisions ?? []) {
    if (d.decision in counts) counts[d.decision as keyof typeof counts]++;
  }

  return {
    period: { from: twelveHoursAgo, to: new Date().toISOString() },
    emailsSent: (sentEmails ?? []).map((e: any) => ({
      newsletterId: e.id,
      contactName: e.contacts?.name ?? "Unknown",
      emailType: e.email_type,
      subject: e.subject,
      sentAt: e.sent_at,
      canRecall: !!recallMap[e.id],
      recallId: recallMap[e.id]?.id,
    })),
    emailsHeldBack: (heldBack ?? []).map((d: any) => ({
      decisionId: d.id,
      contactName: d.contacts?.name ?? "Unknown",
      emailType: d.email_type,
      reasoning: d.reasoning,
      relevanceScore: d.relevance_score,
    })),
    hotLeadAlerts: (hotLeads ?? []).map((e: any) => ({
      contactName: e.contacts?.name ?? "Unknown",
      contactId: e.contact_id,
      action: e.payload?.linkType ?? "high intent click",
      timestamp: e.created_at,
    })),
    agentDecisionCounts: counts,
  };
}
