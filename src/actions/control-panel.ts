"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────

export type EmailActivityItem = {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  contact_type: string;
  subject: string;
  email_type: string;
  status: string;
  html_body: string | null;
  sent_at: string | null;
  created_at: string;
  resend_message_id: string | null;
  open_count: number;
  click_count: number;
  bounce: boolean;
};

export type WorkflowOverview = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  contact_type: string | null;
  lifecycle_phase: string | null;
  step_count: number;
  enrollments: Array<{
    id: string;
    contact_id: string;
    contact_name: string;
    contact_type: string;
    current_step: number;
    status: string;
    enrolled_at: string;
    next_run_at: string | null;
  }>;
};

export type ContactJourneyItem = {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_email: string;
  contact_type: string;
  journey_type: string;
  current_phase: string;
  status: string;
  is_paused: boolean;
  next_email_at: string | null;
  enrolled_at: string;
  engagement_score: number;
  last_email_subject: string | null;
  last_email_date: string | null;
  emails_sent: number;
};

export type ScheduleItem = {
  id: string;
  source: "journey" | "workflow";
  contact_name: string;
  contact_type: string;
  email_type: string | null;
  workflow_name: string | null;
  scheduled_at: string;
};

export type ContactEmailHistory = {
  id: string;
  subject: string;
  email_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  open_count: number;
  click_count: number;
};

// ── Data Fetching ──────────────────────────────────────────────

export async function getEmailActivityFeed(filters?: {
  status?: string;
  contactType?: string;
  emailType?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<EmailActivityItem[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("newsletters")
    .select("id, contact_id, subject, email_type, status, html_body, sent_at, created_at, resend_message_id, contacts(id, name, email, type)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo + "T23:59:59");
  }

  const { data: newsletters, error } = await query;
  if (error || !newsletters) return [];

  // Filter by contact type in memory (Supabase can't filter nested joins easily)
  let filtered = newsletters as any[];
  if (filters?.contactType && filters.contactType !== "all") {
    filtered = filtered.filter((n: any) => n.contacts?.type === filters.contactType);
  }
  if (filters?.emailType && filters.emailType !== "all") {
    filtered = filtered.filter((n: any) => n.email_type === filters.emailType);
  }

  // Fetch event counts for all newsletters in one query
  const nlIds = filtered.map((n: any) => n.id);
  const { data: events } = await supabase
    .from("newsletter_events")
    .select("newsletter_id, event_type")
    .in("newsletter_id", nlIds.length > 0 ? nlIds : ["__none__"]);

  const eventCounts: Record<string, { opens: number; clicks: number; bounce: boolean }> = {};
  for (const e of events ?? []) {
    if (!eventCounts[e.newsletter_id]) {
      eventCounts[e.newsletter_id] = { opens: 0, clicks: 0, bounce: false };
    }
    if (e.event_type === "opened") eventCounts[e.newsletter_id].opens++;
    if (e.event_type === "clicked") eventCounts[e.newsletter_id].clicks++;
    if (e.event_type === "bounced" || e.event_type === "complained") eventCounts[e.newsletter_id].bounce = true;
  }

  return filtered.map((n: any) => ({
    id: n.id,
    contact_id: n.contact_id,
    contact_name: n.contacts?.name ?? "Unknown",
    contact_email: n.contacts?.email ?? "",
    contact_type: n.contacts?.type ?? "buyer",
    subject: n.subject ?? "(No subject)",
    email_type: n.email_type ?? "general",
    status: n.status,
    html_body: n.html_body,
    sent_at: n.sent_at,
    created_at: n.created_at,
    resend_message_id: n.resend_message_id,
    open_count: eventCounts[n.id]?.opens ?? 0,
    click_count: eventCounts[n.id]?.clicks ?? 0,
    bounce: eventCounts[n.id]?.bounce ?? false,
  }));
}

export async function getWorkflowCommandCenter(): Promise<WorkflowOverview[]> {
  const supabase = createAdminClient();

  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, name, description, is_active, contact_type, lifecycle_phase, workflow_steps(id)")
    .order("created_at", { ascending: false });

  if (!workflows) return [];

  const workflowIds = workflows.map((w: any) => w.id);

  const { data: enrollments } = await supabase
    .from("workflow_enrollments")
    .select("id, workflow_id, contact_id, current_step, status, created_at, next_run_at, contacts(id, name, type)")
    .in("workflow_id", workflowIds.length > 0 ? workflowIds : ["__none__"]);

  const enrollmentsByWorkflow: Record<string, any[]> = {};
  for (const e of enrollments ?? []) {
    if (!enrollmentsByWorkflow[e.workflow_id]) enrollmentsByWorkflow[e.workflow_id] = [];
    enrollmentsByWorkflow[e.workflow_id].push(e);
  }

  return workflows.map((w: any) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    is_active: w.is_active,
    contact_type: w.contact_type,
    lifecycle_phase: w.lifecycle_phase,
    step_count: w.workflow_steps?.length ?? 0,
    enrollments: (enrollmentsByWorkflow[w.id] ?? []).map((e: any) => ({
      id: e.id,
      contact_id: e.contact_id,
      contact_name: e.contacts?.name ?? "Unknown",
      contact_type: e.contacts?.type ?? "buyer",
      current_step: e.current_step ?? 0,
      status: e.status ?? "active",
      enrolled_at: e.created_at,
      next_run_at: e.next_run_at,
    })),
  }));
}

export async function getContactJourneyTracker(filters?: {
  search?: string;
  contactType?: string;
  phase?: string;
  isPaused?: boolean;
}): Promise<ContactJourneyItem[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("contact_journeys")
    .select("id, contact_id, journey_type, current_phase, status, is_paused, next_email_at, created_at, emails_sent_in_phase, contacts(id, name, email, type, newsletter_intelligence)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters?.phase && filters.phase !== "all") {
    query = query.eq("current_phase", filters.phase);
  }
  if (filters?.isPaused !== undefined) {
    query = query.eq("is_paused", filters.isPaused);
  }

  const { data: journeys } = await query;
  if (!journeys) return [];

  let filtered = journeys as any[];

  if (filters?.contactType && filters.contactType !== "all") {
    filtered = filtered.filter((j: any) => j.contacts?.type === filters.contactType);
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter((j: any) => j.contacts?.name?.toLowerCase().includes(s));
  }

  // Fetch most recent newsletter per contact
  const contactIds = [...new Set(filtered.map((j: any) => j.contact_id))];
  const { data: recentEmails } = await supabase
    .from("newsletters")
    .select("contact_id, subject, sent_at, created_at")
    .in("contact_id", contactIds.length > 0 ? contactIds : ["__none__"])
    .eq("status", "sent")
    .order("sent_at", { ascending: false });

  const lastEmailByContact: Record<string, { subject: string; date: string }> = {};
  for (const e of recentEmails ?? []) {
    if (!lastEmailByContact[e.contact_id]) {
      lastEmailByContact[e.contact_id] = {
        subject: e.subject ?? "",
        date: e.sent_at ?? e.created_at,
      };
    }
  }

  // Count total emails per contact
  const { data: emailCounts } = await supabase
    .from("newsletters")
    .select("contact_id")
    .in("contact_id", contactIds.length > 0 ? contactIds : ["__none__"])
    .eq("status", "sent");

  const sentCountByContact: Record<string, number> = {};
  for (const e of emailCounts ?? []) {
    sentCountByContact[e.contact_id] = (sentCountByContact[e.contact_id] ?? 0) + 1;
  }

  return filtered.map((j: any) => {
    const intel = j.contacts?.newsletter_intelligence;
    return {
      id: j.id,
      contact_id: j.contact_id,
      contact_name: j.contacts?.name ?? "Unknown",
      contact_email: j.contacts?.email ?? "",
      contact_type: j.contacts?.type ?? "buyer",
      journey_type: j.journey_type,
      current_phase: j.current_phase,
      status: j.status ?? "active",
      is_paused: j.is_paused ?? false,
      next_email_at: j.next_email_at,
      enrolled_at: j.created_at,
      engagement_score: intel?.engagement_score ?? 0,
      last_email_subject: lastEmailByContact[j.contact_id]?.subject ?? null,
      last_email_date: lastEmailByContact[j.contact_id]?.date ?? null,
      emails_sent: sentCountByContact[j.contact_id] ?? 0,
    };
  });
}

export async function getScheduleOverview(): Promise<ScheduleItem[]> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Journey scheduled emails
  const { data: journeyScheduled } = await supabase
    .from("contact_journeys")
    .select("id, next_email_at, journey_type, contacts(id, name, type)")
    .not("next_email_at", "is", null)
    .eq("is_paused", false)
    .gte("next_email_at", now)
    .order("next_email_at", { ascending: true })
    .limit(50);

  // Workflow scheduled emails
  const { data: workflowScheduled } = await supabase
    .from("workflow_enrollments")
    .select("id, next_run_at, workflow_id, contacts(id, name, type), workflows(name)")
    .not("next_run_at", "is", null)
    .eq("status", "active")
    .gte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(50);

  const items: ScheduleItem[] = [];

  for (const j of journeyScheduled ?? []) {
    const c = j.contacts as any;
    items.push({
      id: j.id,
      source: "journey",
      contact_name: c?.name ?? "Unknown",
      contact_type: c?.type ?? "buyer",
      email_type: j.journey_type === "buyer" ? "Buyer Journey" : "Seller Journey",
      workflow_name: null,
      scheduled_at: j.next_email_at!,
    });
  }

  for (const w of workflowScheduled ?? []) {
    const c = w.contacts as any;
    const wf = w.workflows as any;
    items.push({
      id: w.id,
      source: "workflow",
      contact_name: c?.name ?? "Unknown",
      contact_type: c?.type ?? "buyer",
      email_type: null,
      workflow_name: wf?.name ?? "Workflow",
      scheduled_at: w.next_run_at!,
    });
  }

  items.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  return items;
}

export async function getEmailHistoryForContact(contactId: string): Promise<ContactEmailHistory[]> {
  const supabase = createAdminClient();

  const { data: newsletters } = await supabase
    .from("newsletters")
    .select("id, subject, email_type, status, sent_at, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!newsletters || newsletters.length === 0) return [];

  const nlIds = newsletters.map((n) => n.id);
  const { data: events } = await supabase
    .from("newsletter_events")
    .select("newsletter_id, event_type")
    .in("newsletter_id", nlIds);

  const eventCounts: Record<string, { opens: number; clicks: number }> = {};
  for (const e of events ?? []) {
    if (!eventCounts[e.newsletter_id]) eventCounts[e.newsletter_id] = { opens: 0, clicks: 0 };
    if (e.event_type === "opened") eventCounts[e.newsletter_id].opens++;
    if (e.event_type === "clicked") eventCounts[e.newsletter_id].clicks++;
  }

  return newsletters.map((n) => ({
    id: n.id,
    subject: n.subject ?? "(No subject)",
    email_type: n.email_type ?? "general",
    status: n.status,
    sent_at: n.sent_at,
    created_at: n.created_at,
    open_count: eventCounts[n.id]?.opens ?? 0,
    click_count: eventCounts[n.id]?.clicks ?? 0,
  }));
}

// ── Mutations ──────────────────────────────────────────────────

export async function retryFailedNewsletter(newsletterId: string) {
  const supabase = createAdminClient();
  await supabase
    .from("newsletters")
    .update({ status: "draft" })
    .eq("id", newsletterId);
  revalidatePath("/newsletters/control");
}

export async function rescheduleEmail(id: string, source: "journey" | "workflow", newDate: string) {
  const supabase = createAdminClient();
  if (source === "journey") {
    await supabase.from("contact_journeys").update({ next_email_at: newDate }).eq("id", id);
  } else {
    await supabase.from("workflow_enrollments").update({ next_run_at: newDate }).eq("id", id);
  }
  revalidatePath("/newsletters/control");
}

export async function cancelScheduledEmail(id: string, source: "journey" | "workflow") {
  const supabase = createAdminClient();
  if (source === "journey") {
    await supabase.from("contact_journeys").update({ next_email_at: null }).eq("id", id);
  } else {
    await supabase.from("workflow_enrollments").update({ next_run_at: null }).eq("id", id);
  }
  revalidatePath("/newsletters/control");
}

export async function toggleWorkflowActive(workflowId: string, isActive: boolean) {
  const supabase = createAdminClient();
  await supabase.from("workflows").update({ is_active: isActive }).eq("id", workflowId);
  revalidatePath("/newsletters/control");
}
