"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface ActivityFeedItem {
  id: string;
  contactName: string;
  contactId: string;
  contactType: string;
  eventType: string;
  decision: string;
  emailType: string | null;
  reasoning: string;
  relevanceScore: number | null;
  confidence: number | null;
  outcome: string | null;
  trustLevel: string | null;
  createdAt: string;
}

export interface SuppressionRow {
  id: string;
  contactName: string;
  contactId: string;
  contactType: string;
  emailType: string | null;
  decision: string;
  reasoning: string;
  relevanceScore: number | null;
  createdAt: string;
}

export async function getActivityFeed(filters?: {
  decision?: string;
  search?: string;
  days?: number;
  offset?: number;
  limit?: number;
}): Promise<ActivityFeedItem[]> {
  const supabase = createAdminClient();
  const days = filters?.days ?? 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  let query = supabase
    .from("agent_decisions")
    .select("id, contact_id, event_id, decision, email_type, reasoning, relevance_score, confidence, outcome, trust_level, created_at, contacts(name, type), agent_events(event_type)")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.decision && filters.decision !== "all") {
    query = query.eq("decision", filters.decision);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);
  }

  const { data } = await query;
  if (!data) return [];

  let results = data as any[];
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter((d: any) => d.contacts?.name?.toLowerCase().includes(s));
  }

  return results.map((d: any) => ({
    id: d.id,
    contactName: d.contacts?.name ?? "Unknown",
    contactId: d.contact_id,
    contactType: d.contacts?.type ?? "buyer",
    eventType: d.agent_events?.event_type ?? "unknown",
    decision: d.decision,
    emailType: d.email_type,
    reasoning: d.reasoning,
    relevanceScore: d.relevance_score,
    confidence: d.confidence,
    outcome: d.outcome,
    trustLevel: d.trust_level,
    createdAt: d.created_at,
  }));
}

export async function getSuppressedDecisions(filters?: {
  decisionType?: string;
  days?: number;
}): Promise<SuppressionRow[]> {
  const supabase = createAdminClient();
  const days = filters?.days ?? 14;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  let query = supabase
    .from("agent_decisions")
    .select("id, contact_id, email_type, decision, reasoning, relevance_score, created_at, contacts(name, type)")
    .in("decision", ["skip", "defer", "suppress"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters?.decisionType && filters.decisionType !== "all") {
    query = query.eq("decision", filters.decisionType);
  }

  const { data } = await query;
  return (data ?? []).map((d: any) => ({
    id: d.id,
    contactName: d.contacts?.name ?? "Unknown",
    contactId: d.contact_id,
    contactType: d.contacts?.type ?? "buyer",
    emailType: d.email_type,
    decision: d.decision,
    reasoning: d.reasoning,
    relevanceScore: d.relevance_score,
    createdAt: d.created_at,
  }));
}

export async function sendAnyway(decisionId: string): Promise<{ success: boolean }> {
  const supabase = createAdminClient();

  const { data: decision } = await supabase
    .from("agent_decisions")
    .select("contact_id, email_type")
    .eq("id", decisionId)
    .single();

  if (!decision) return { success: false };

  const { data: contact } = await supabase
    .from("contacts")
    .select("name")
    .eq("id", decision.contact_id)
    .single();

  // Create a draft newsletter
  await supabase.from("newsletters").insert({
    contact_id: decision.contact_id,
    subject: `${decision.email_type?.replace(/_/g, " ") ?? "Email"} for ${contact?.name ?? "Contact"}`,
    email_type: decision.email_type ?? "general",
    status: "draft",
    html_body: `<p>Override send requested. Email type: ${decision.email_type}.</p>`,
    ai_context: { override: true, decision_id: decisionId },
  });

  // Update decision outcome
  await supabase
    .from("agent_decisions")
    .update({ outcome: "draft_created" })
    .eq("id", decisionId);

  revalidatePath("/newsletters/suppressions");
  revalidatePath("/newsletters/queue");
  return { success: true };
}

export async function getGhostComparisons(days: number = 14) {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: ghosts } = await supabase
    .from("ghost_drafts")
    .select("id, contact_id, email_type, subject, html_body, reasoning, created_at, contacts(name)")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!ghosts || ghosts.length === 0) {
    return { matchRate: 0, comparisons: [] };
  }

  // For each ghost, find matching sent email within 48h
  const comparisons = [];
  let matches = 0;

  for (const ghost of ghosts as any[]) {
    const windowStart = new Date(new Date(ghost.created_at).getTime() - 48 * 3600000).toISOString();
    const windowEnd = new Date(new Date(ghost.created_at).getTime() + 48 * 3600000).toISOString();

    const { data: actual } = await supabase
      .from("newsletters")
      .select("id, subject, sent_at")
      .eq("contact_id", ghost.contact_id)
      .eq("status", "sent")
      .gte("sent_at", windowStart)
      .lte("sent_at", windowEnd)
      .limit(1)
      .maybeSingle();

    if (actual) matches++;

    comparisons.push({
      ghostDraft: {
        id: ghost.id,
        contactName: ghost.contacts?.name ?? "Unknown",
        emailType: ghost.email_type,
        subject: ghost.subject,
        reasoning: ghost.reasoning,
        createdAt: ghost.created_at,
      },
      actualEmail: actual ? {
        id: actual.id,
        subject: actual.subject,
        sentAt: actual.sent_at,
      } : null,
    });
  }

  return {
    matchRate: ghosts.length > 0 ? matches / ghosts.length : 0,
    comparisons,
  };
}

export async function getAgentInsights(days: number = 30) {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Weekly edit rate trend
  const { data: edits } = await supabase
    .from("edit_history")
    .select("edit_distance, edit_type, created_at")
    .gte("created_at", since);

  const { data: allDecisions } = await supabase
    .from("agent_decisions")
    .select("decision, outcome, created_at")
    .gte("created_at", since);

  // Group by week
  const weekBuckets: Record<string, { total: number; edited: number; approved: number; skipped: number }> = {};
  for (const d of allDecisions ?? []) {
    const week = getWeekLabel(d.created_at);
    if (!weekBuckets[week]) weekBuckets[week] = { total: 0, edited: 0, approved: 0, skipped: 0 };
    weekBuckets[week].total++;
    if (d.outcome === "edited") weekBuckets[week].edited++;
    if (d.outcome === "approved" || d.outcome === "sent") weekBuckets[week].approved++;
    if (d.outcome === "skipped_by_user") weekBuckets[week].skipped++;
  }

  const editRateTrend = Object.entries(weekBuckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, data]) => ({
      week,
      rate: data.total > 0 ? data.edited / data.total : 0,
    }));

  const approvalRateTrend = Object.entries(weekBuckets)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, data]) => ({
      week,
      rate: data.total > 0 ? data.approved / data.total : 0,
    }));

  // Open rate comparison (AI vs manual)
  const { data: aiSent } = await supabase
    .from("newsletters")
    .select("id")
    .not("ai_context", "is", null)
    .eq("status", "sent")
    .gte("sent_at", since);

  const aiIds = (aiSent ?? []).map((n) => n.id);
  const { count: aiOpens } = await supabase
    .from("newsletter_events")
    .select("*", { count: "exact", head: true })
    .eq("event_type", "opened")
    .in("newsletter_id", aiIds.length > 0 ? aiIds : ["__none__"]);

  // Top performing email types
  const { data: sentByType } = await supabase
    .from("newsletters")
    .select("id, email_type")
    .eq("status", "sent")
    .gte("sent_at", since);

  const typeStats: Record<string, { sent: number; opens: number; clicks: number }> = {};
  for (const n of sentByType ?? []) {
    if (!typeStats[n.email_type]) typeStats[n.email_type] = { sent: 0, opens: 0, clicks: 0 };
    typeStats[n.email_type].sent++;
  }

  const totalSends = allDecisions?.filter((d) => d.decision === "send").length ?? 0;
  const totalEdited = edits?.length ?? 0;

  return {
    editRateTrend,
    approvalRateTrend,
    openRateComparison: {
      aiSent: aiIds.length > 0 ? ((aiOpens ?? 0) / aiIds.length) * 100 : 0,
      manualSent: 0,
    },
    topPerformingEmailTypes: Object.entries(typeStats)
      .map(([type, stats]) => ({
        type,
        sent: stats.sent,
        openRate: stats.sent > 0 ? (stats.opens / stats.sent) * 100 : 0,
      }))
      .sort((a, b) => b.openRate - a.openRate),
    totalDecisions: allDecisions?.length ?? 0,
    totalEdited,
    editRate: totalSends > 0 ? totalEdited / totalSends : 0,
  };
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
}
