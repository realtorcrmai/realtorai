"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ── Message Templates CRUD ────────────────────────────────────

export async function getMessageTemplates(category?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from("message_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) return { error: "Failed to fetch templates" };
  return { templates: data };
}

export async function createMessageTemplate(data: {
  name: string;
  channel: "sms" | "whatsapp" | "email";
  subject?: string;
  body: string;
  variables?: string[];
  category?: string;
}) {
  const supabase = createAdminClient();

  // Extract variables from body: {{variable_name}}
  const bodyVars = (data.body.match(/\{\{(\w+)\}\}/g) || []).map((v) =>
    v.replace(/\{\{|\}\}/g, "")
  );
  const allVars = [...new Set([...(data.variables || []), ...bodyVars])];

  const { data: template, error } = await supabase
    .from("message_templates")
    .insert({
      name: data.name,
      channel: data.channel,
      subject: data.subject || null,
      body: data.body,
      variables: allVars,
      category: data.category || "general",
    })
    .select()
    .single();

  if (error) return { error: "Failed to create template" };

  revalidatePath("/automations/templates");
  return { success: true, template };
}

export async function updateMessageTemplate(
  id: string,
  data: Partial<{
    name: string;
    channel: "sms" | "whatsapp" | "email";
    subject: string | null;
    body: string;
    variables: string[];
    category: string;
    is_active: boolean;
  }>
) {
  const supabase = createAdminClient();

  // Re-extract variables if body changed
  if (data.body) {
    const bodyVars = (data.body.match(/\{\{(\w+)\}\}/g) || []).map((v) =>
      v.replace(/\{\{|\}\}/g, "")
    );
    data.variables = [...new Set([...(data.variables || []), ...bodyVars])];
  }

  const { error } = await supabase
    .from("message_templates")
    .update(data)
    .eq("id", id);

  if (error) return { error: "Failed to update template" };

  revalidatePath("/automations/templates");
  return { success: true };
}

export async function deleteMessageTemplate(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", id);

  if (error) return { error: "Failed to delete template" };

  revalidatePath("/automations/templates");
  return { success: true };
}

// ── Workflows CRUD ────────────────────────────────────────────

export async function getWorkflows() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*, workflow_steps(*)")
    .order("created_at", { ascending: true });

  if (error) return { error: "Failed to fetch workflows" };
  return { workflows: data };
}

export async function getWorkflow(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*, workflow_steps(*)")
    .eq("id", id)
    .single();

  if (error) return { error: "Failed to fetch workflow" };
  return { workflow: data };
}

export async function updateWorkflow(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    is_active: boolean;
    trigger_config: Record<string, unknown>;
  }>
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workflows")
    .update(data)
    .eq("id", id);

  if (error) return { error: "Failed to update workflow" };

  revalidatePath("/automations");
  return { success: true };
}

// ── Workflow Steps CRUD ───────────────────────────────────────

export async function createWorkflowStep(
  workflowId: string,
  data: {
    step_order: number;
    name: string;
    action_type: string;
    delay_minutes?: number;
    delay_unit?: string;
    delay_value?: number;
    template_id?: string;
    task_config?: Record<string, unknown>;
    action_config?: Record<string, unknown>;
    exit_on_reply?: boolean;
  }
) {
  const supabase = createAdminClient();

  // Calculate delay_minutes from delay_value + delay_unit
  let delayMinutes = data.delay_minutes || 0;
  if (data.delay_value && data.delay_unit) {
    switch (data.delay_unit) {
      case "minutes": delayMinutes = data.delay_value; break;
      case "hours": delayMinutes = data.delay_value * 60; break;
      case "days": delayMinutes = data.delay_value * 1440; break;
    }
  }

  const { error } = await supabase.from("workflow_steps").insert({
    workflow_id: workflowId,
    step_order: data.step_order,
    name: data.name,
    action_type: data.action_type,
    delay_minutes: delayMinutes,
    delay_unit: data.delay_unit || "minutes",
    delay_value: data.delay_value || 0,
    template_id: data.template_id || null,
    task_config: data.task_config || {},
    action_config: data.action_config || {},
    exit_on_reply: data.exit_on_reply || false,
  });

  if (error) return { error: "Failed to create step" };

  revalidatePath("/automations");
  return { success: true };
}

export async function updateWorkflowStep(
  stepId: string,
  data: Partial<{
    name: string;
    action_type: string;
    delay_minutes: number;
    delay_unit: string;
    delay_value: number;
    template_id: string | null;
    task_config: Record<string, unknown>;
    action_config: Record<string, unknown>;
    exit_on_reply: boolean;
  }>
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workflow_steps")
    .update(data)
    .eq("id", stepId);

  if (error) return { error: "Failed to update step" };

  revalidatePath("/automations");
  return { success: true };
}

export async function deleteWorkflowStep(stepId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workflow_steps")
    .delete()
    .eq("id", stepId);

  if (error) return { error: "Failed to delete step" };

  revalidatePath("/automations");
  return { success: true };
}

// ── Seed workflow steps from blueprint ─────────────────────────

export async function seedWorkflowSteps(workflowId: string, slug: string) {
  const { WORKFLOW_BLUEPRINTS } = await import("@/lib/constants/workflows");
  const blueprint = WORKFLOW_BLUEPRINTS.find((w) => w.slug === slug);
  if (!blueprint) return { error: "Blueprint not found" };

  const supabase = createAdminClient();

  // Delete existing steps first
  await supabase.from("workflow_steps").delete().eq("workflow_id", workflowId);

  // Insert steps from blueprint
  const steps = blueprint.steps.map((step, idx) => {
    let delayMinutes = 0;
    switch (step.delay_unit) {
      case "minutes": delayMinutes = step.delay_value; break;
      case "hours": delayMinutes = step.delay_value * 60; break;
      case "days": delayMinutes = step.delay_value * 1440; break;
    }

    return {
      workflow_id: workflowId,
      step_order: idx + 1,
      name: step.name,
      action_type: step.action_type,
      delay_minutes: delayMinutes,
      delay_unit: step.delay_unit,
      delay_value: step.delay_value,
      task_config: step.task_config || {},
      action_config: step.action_config || {},
      exit_on_reply: step.exit_on_reply || false,
    };
  });

  const { error } = await supabase.from("workflow_steps").insert(steps);
  if (error) return { error: "Failed to seed steps: " + error.message };

  revalidatePath("/automations");
  return { success: true, stepCount: steps.length };
}

// ── Seed All Workflows ──────────────────────────────────────

export async function seedAllWorkflows() {
  const { WORKFLOW_BLUEPRINTS } = await import("@/lib/constants/workflows");
  const supabase = createAdminClient();

  // Fetch all workflows
  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, slug, workflow_steps(id)");

  if (!workflows) return { error: "Failed to fetch workflows" };

  const results: { slug: string; status: string; stepCount?: number }[] = [];

  for (const workflow of workflows) {
    const stepCount = Array.isArray(workflow.workflow_steps)
      ? workflow.workflow_steps.length
      : 0;

    // Skip if already has steps
    if (stepCount > 0) {
      results.push({ slug: workflow.slug, status: "skipped (already has steps)" });
      continue;
    }

    const result = await seedWorkflowSteps(workflow.id, workflow.slug);
    if (result.error) {
      results.push({ slug: workflow.slug, status: `error: ${result.error}` });
    } else {
      results.push({
        slug: workflow.slug,
        status: "seeded",
        stepCount: result.stepCount,
      });
    }
  }

  revalidatePath("/automations");
  return { success: true, results };
}

// ── Workflow Enrollments ──────────────────────────────────────

export async function enrollContact(
  workflowId: string,
  contactId: string,
  listingId?: string
) {
  const supabase = createAdminClient();

  // Check if already enrolled in this workflow
  const { data: existing } = await supabase
    .from("workflow_enrollments")
    .select("id")
    .eq("workflow_id", workflowId)
    .eq("contact_id", contactId)
    .eq("status", "active")
    .single();

  if (existing) {
    return { error: "Contact is already enrolled in this workflow" };
  }

  // Enforce max_enrollments concurrency limit
  const { data: workflow } = await supabase
    .from("workflows")
    .select("max_enrollments")
    .eq("id", workflowId)
    .single();

  if (workflow?.max_enrollments) {
    const { count } = await supabase
      .from("workflow_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("workflow_id", workflowId)
      .eq("contact_id", contactId)
      .in("status", ["active", "paused"]);

    if (count && count >= workflow.max_enrollments) {
      return { error: `Contact already has ${count} active enrollment(s) for this workflow (max: ${workflow.max_enrollments})` };
    }
  }

  // Get first step to calculate next_run_at
  const { data: firstStep } = await supabase
    .from("workflow_steps")
    .select("delay_minutes")
    .eq("workflow_id", workflowId)
    .order("step_order", { ascending: true })
    .limit(1)
    .single();

  const now = new Date();
  const nextRun = new Date(now.getTime() + (firstStep?.delay_minutes || 0) * 60000);

  const { data: enrollment, error } = await supabase
    .from("workflow_enrollments")
    .insert({
      workflow_id: workflowId,
      contact_id: contactId,
      listing_id: listingId || null,
      status: "active",
      current_step: 1,
      next_run_at: nextRun.toISOString(),
    })
    .select()
    .single();

  if (error) return { error: "Failed to enroll contact: " + error.message };

  // Log activity
  await supabase.from("activity_log").insert({
    contact_id: contactId,
    listing_id: listingId || null,
    activity_type: "workflow_enrolled",
    description: `Enrolled in workflow`,
    metadata: { workflow_id: workflowId, enrollment_id: enrollment.id },
  });

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/automations");
  return { success: true, enrollment };
}

export async function getContactEnrollments(contactId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workflow_enrollments")
    .select("*, workflows(id, name, slug)")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) return { error: "Failed to fetch enrollments" };
  return { enrollments: data };
}

export async function getWorkflowEnrollments(workflowId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workflow_enrollments")
    .select("*, contacts(id, name)")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false });

  if (error) return { error: "Failed to fetch enrollments" };
  return { enrollments: data };
}

export async function updateEnrollment(
  enrollmentId: string,
  data: Partial<{
    status: "active" | "paused" | "completed" | "exited" | "failed";
    exit_reason: string;
    current_step: number;
  }>
) {
  const supabase = createAdminClient();

  const updatePayload: Record<string, unknown> = { ...data };
  if (data.status === "completed" || data.status === "exited" || data.status === "failed") {
    updatePayload.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("workflow_enrollments")
    .update(updatePayload)
    .eq("id", enrollmentId);

  if (error) return { error: "Failed to update enrollment" };

  revalidatePath("/automations");
  return { success: true };
}

// ── Agent Notifications ───────────────────────────────────────

export async function getNotifications(unreadOnly = false) {
  const supabase = createAdminClient();
  let query = supabase
    .from("agent_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) return { error: "Failed to fetch notifications" };
  return { notifications: data };
}

export async function markNotificationRead(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("agent_notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) return { error: "Failed to mark as read" };
  return { success: true };
}

export async function markAllNotificationsRead() {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("agent_notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (error) return { error: "Failed to mark all as read" };
  return { success: true };
}

export async function createNotification(data: {
  title: string;
  body?: string;
  type?: "info" | "warning" | "urgent" | "task" | "workflow";
  contact_id?: string;
  listing_id?: string;
  action_url?: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("agent_notifications").insert({
    title: data.title,
    body: data.body || null,
    type: data.type || "info",
    contact_id: data.contact_id || null,
    listing_id: data.listing_id || null,
    action_url: data.action_url || null,
  });

  if (error) return { error: "Failed to create notification" };
  return { success: true };
}

// ── Activity Log ──────────────────────────────────────────────

export async function logActivity(data: {
  contact_id?: string;
  listing_id?: string;
  activity_type: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("activity_log").insert({
    contact_id: data.contact_id || null,
    listing_id: data.listing_id || null,
    activity_type: data.activity_type,
    description: data.description || null,
    metadata: data.metadata || {},
  });

  if (error) return { error: "Failed to log activity" };
  return { success: true };
}

// ── Backfill Workflow Enrollments ─────────────────────────────
// Scans existing contacts and enrolls them into appropriate workflows
// based on their current state and historical activity.

export async function backfillWorkflowEnrollments(): Promise<{
  success: boolean;
  results: {
    workflow: string;
    enrolled: string[];
    skipped: string[];
  }[];
  totalEnrolled: number;
}> {
  const supabase = createAdminClient();
  const results: { workflow: string; enrolled: string[]; skipped: string[] }[] = [];
  let totalEnrolled = 0;

  // Fetch all active workflows with their steps
  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, slug, trigger_type, trigger_config, contact_type, max_enrollments, workflow_steps(id)")
    .eq("is_active", true);

  if (!workflows || workflows.length === 0) {
    return { success: true, results: [], totalEnrolled: 0 };
  }

  // Fetch all contacts
  const { data: allContacts } = await supabase
    .from("contacts")
    .select("id, name, type, lead_status, tags, created_at");

  if (!allContacts) return { success: false, results: [], totalEnrolled: 0 };

  // Fetch all existing enrollments to check for duplicates
  const { data: existingEnrollments } = await supabase
    .from("workflow_enrollments")
    .select("workflow_id, contact_id, status");

  const enrollmentSet = new Set(
    (existingEnrollments ?? []).map(
      (e) => `${e.workflow_id}:${e.contact_id}`
    )
  );
  const activeEnrollmentSet = new Set(
    (existingEnrollments ?? [])
      .filter((e) => e.status === "active" || e.status === "paused")
      .map((e) => `${e.workflow_id}:${e.contact_id}`)
  );

  // Helper: enroll a contact in a workflow
  async function tryEnroll(
    workflowId: string,
    workflowSlug: string,
    contactId: string,
    contactName: string,
    listingId?: string
  ): Promise<"enrolled" | "skipped"> {
    const key = `${workflowId}:${contactId}`;
    // Skip if already enrolled (any status)
    if (activeEnrollmentSet.has(key)) return "skipped";
    // Also skip if they completed it already
    if (enrollmentSet.has(key)) return "skipped";

    // Get first step delay
    const { data: firstStep } = await supabase
      .from("workflow_steps")
      .select("delay_minutes")
      .eq("workflow_id", workflowId)
      .order("step_order", { ascending: true })
      .limit(1)
      .single();

    const now = new Date();
    const nextRun = new Date(
      now.getTime() + (firstStep?.delay_minutes || 0) * 60000
    );

    const { error } = await supabase.from("workflow_enrollments").insert({
      workflow_id: workflowId,
      contact_id: contactId,
      listing_id: listingId || null,
      status: "active",
      current_step: 1,
      next_run_at: nextRun.toISOString(),
      metadata: { backfill: true },
    });

    if (error) return "skipped";

    // Track to prevent double-enrolling in same run
    enrollmentSet.add(key);
    activeEnrollmentSet.add(key);

    // Log activity
    await supabase.from("activity_log").insert({
      contact_id: contactId,
      listing_id: listingId || null,
      activity_type: "workflow_auto_enrolled",
      description: `Backfill: auto-enrolled in ${workflowSlug}`,
      metadata: { workflow_id: workflowId, backfill: true },
    });

    return "enrolled";
  }

  for (const workflow of workflows) {
    const stepCount = Array.isArray(workflow.workflow_steps)
      ? workflow.workflow_steps.length
      : 0;
    if (stepCount === 0) continue;

    const enrolled: string[] = [];
    const skipped: string[] = [];

    // ── buyer_nurture: buyers with lead_status = 'qualified' ───
    if (workflow.slug === "buyer_nurture") {
      const buyers = allContacts.filter(
        (c) => c.type === "buyer" && c.lead_status === "qualified"
      );
      for (const contact of buyers) {
        const result = await tryEnroll(
          workflow.id, workflow.slug, contact.id, contact.name
        );
        (result === "enrolled" ? enrolled : skipped).push(contact.name);
      }
    }

    // ── post_close_buyer: buyers linked to sold listings ───────
    if (workflow.slug === "post_close_buyer") {
      const { data: soldBuyerListings } = await supabase
        .from("listings")
        .select("id, buyer_id, address")
        .eq("status", "sold")
        .not("buyer_id", "is", null);

      for (const listing of soldBuyerListings ?? []) {
        const contact = allContacts.find((c) => c.id === listing.buyer_id);
        if (!contact || contact.type !== "buyer") continue;
        const result = await tryEnroll(
          workflow.id, workflow.slug, contact.id, contact.name, listing.id
        );
        (result === "enrolled" ? enrolled : skipped).push(contact.name);
      }
    }

    // ── post_close_seller: sellers linked to sold listings ─────
    if (workflow.slug === "post_close_seller") {
      const { data: soldSellerListings } = await supabase
        .from("listings")
        .select("id, seller_id, address")
        .eq("status", "sold")
        .not("seller_id", "is", null);

      for (const listing of soldSellerListings ?? []) {
        const contact = allContacts.find((c) => c.id === listing.seller_id);
        if (!contact || contact.type !== "seller") continue;
        const result = await tryEnroll(
          workflow.id, workflow.slug, contact.id, contact.name, listing.id
        );
        (result === "enrolled" ? enrolled : skipped).push(contact.name);
      }
    }

    // ── open_house_followup: buyers with confirmed showings ────
    if (workflow.slug === "open_house_followup") {
      const { data: confirmedShowings } = await supabase
        .from("appointments")
        .select("id, buyer_agent_phone, listing_id")
        .eq("status", "confirmed");

      // For each confirmed showing, find the buyer contact by phone
      for (const showing of confirmedShowings ?? []) {
        if (!showing.buyer_agent_phone) continue;
        const cleanPhone = showing.buyer_agent_phone.replace(/\D/g, "").slice(-10);
        const contact = allContacts.find((c) => {
          const cPhone = (c as unknown as { phone?: string }).phone;
          return cPhone && cPhone.replace(/\D/g, "").slice(-10) === cleanPhone;
        });
        // Also try looking up via supabase if not found in allContacts (phone not in select)
        if (!contact) {
          const { data: phoneContact } = await supabase
            .from("contacts")
            .select("id, name, type")
            .ilike("phone", `%${cleanPhone}%`)
            .limit(1)
            .single();

          if (phoneContact) {
            const result = await tryEnroll(
              workflow.id, workflow.slug, phoneContact.id, phoneContact.name, showing.listing_id
            );
            (result === "enrolled" ? enrolled : skipped).push(phoneContact.name);
          }
          continue;
        }
        const result = await tryEnroll(
          workflow.id, workflow.slug, contact.id, contact.name, showing.listing_id
        );
        (result === "enrolled" ? enrolled : skipped).push(contact.name);
      }
    }

    // ── referral_partner: contacts with 'referral_partner' tag ──
    if (workflow.slug === "referral_partner") {
      const tagged = allContacts.filter((c) => {
        const tags = Array.isArray(c.tags) ? (c.tags as string[]) : [];
        return tags.includes("referral_partner");
      });
      for (const contact of tagged) {
        const result = await tryEnroll(
          workflow.id, workflow.slug, contact.id, contact.name
        );
        (result === "enrolled" ? enrolled : skipped).push(contact.name);
      }
    }

    // ── lead_reengagement: contacts inactive 60+ days ──────────
    if (workflow.slug === "lead_reengagement") {
      const cutoffDate = new Date(
        Date.now() - 60 * 24 * 60 * 60 * 1000
      ).toISOString();

      for (const contact of allContacts) {
        // Skip closed/lost/inactive contacts
        if (["closed", "lost", "inactive"].includes(contact.lead_status ?? "")) continue;

        // Check last communication
        const { data: lastComm } = await supabase
          .from("communications")
          .select("created_at")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (lastComm && lastComm.created_at > cutoffDate) continue;

        // Check last activity
        const { data: lastActivity } = await supabase
          .from("activity_log")
          .select("created_at")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (lastActivity && lastActivity.created_at > cutoffDate) continue;

        // Also skip contacts created less than 60 days ago with no activity
        if (contact.created_at && contact.created_at > cutoffDate) continue;

        const result = await tryEnroll(
          workflow.id, workflow.slug, contact.id, contact.name
        );
        (result === "enrolled" ? enrolled : skipped).push(contact.name);
      }
    }

    // ── speed_to_contact: only recent leads (last 24 hours) ────
    if (workflow.slug === "speed_to_contact") {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentLeads = allContacts.filter(
        (c) => c.created_at && c.created_at > oneDayAgo
      );
      for (const contact of recentLeads) {
        const result = await tryEnroll(
          workflow.id, workflow.slug, contact.id, contact.name
        );
        (result === "enrolled" ? enrolled : skipped).push(contact.name);
      }
    }

    // NOTE: seller_lifecycle and buyer_lifecycle removed — redundant with StageBar pipeline.

    totalEnrolled += enrolled.length;
    results.push({ workflow: workflow.slug, enrolled, skipped });
  }

  // Create summary notification
  if (totalEnrolled > 0) {
    await supabase.from("agent_notifications").insert({
      title: "Workflow Backfill Complete",
      body: `Enrolled ${totalEnrolled} contacts across ${results.filter((r) => r.enrolled.length > 0).length} workflows`,
      type: "workflow",
      action_url: "/automations",
    });
  }

  revalidatePath("/automations");
  return { success: true, results, totalEnrolled };
}

export async function getActivityLog(contactId?: string, limit = 50) {
  const supabase = createAdminClient();
  let query = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (contactId) {
    query = query.eq("contact_id", contactId);
  }

  const { data, error } = await query;
  if (error) return { error: "Failed to fetch activity log" };
  return { activities: data };
}
