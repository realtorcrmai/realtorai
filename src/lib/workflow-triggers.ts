/**
 * Workflow Trigger Engine
 *
 * Handles automatic enrollment into workflows based on trigger events:
 * - new_lead: When a new contact is created
 * - lead_status_change: When lead_status changes (e.g. → qualified)
 * - listing_status_change: When a listing status changes (e.g. → sold)
 * - showing_completed: After a showing is marked completed
 * - tag_added: When a specific tag is added to a contact
 * - inactivity: Periodic check for inactive contacts (cron-driven)
 */

import { createAdminClient } from "@/lib/supabase/admin";

type TriggerEvent = {
  type:
    | "new_lead"
    | "lead_status_change"
    | "listing_status_change"
    | "showing_completed"
    | "tag_added"
    | "inactivity";
  contactId: string;
  contactType?: string;
  data?: Record<string, unknown>;
};

/**
 * Fire a trigger event — checks all active workflows with matching trigger_type
 * and enrolls the contact if not already enrolled.
 */
export async function fireTrigger(event: TriggerEvent): Promise<{
  enrolled: { workflowId: string; slug: string }[];
  skipped: string[];
}> {
  const supabase = createAdminClient();
  const enrolled: { workflowId: string; slug: string }[] = [];
  const skipped: string[] = [];

  // Find active workflows matching this trigger type
  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, slug, trigger_type, trigger_config, contact_type, max_enrollments")
    .eq("trigger_type", event.type)
    .eq("is_active", true);

  if (!workflows || workflows.length === 0) {
    return { enrolled, skipped };
  }

  // Get contact info
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, type, lead_status, tags")
    .eq("id", event.contactId)
    .single();

  if (!contact) return { enrolled, skipped };

  for (const workflow of workflows) {
    // Check contact type filter
    if (
      workflow.contact_type !== "any" &&
      workflow.contact_type !== contact.type
    ) {
      skipped.push(`${workflow.slug}: contact type mismatch`);
      continue;
    }

    // Check trigger_config conditions
    const config = workflow.trigger_config as Record<string, unknown> | null;
    if (config && !matchesTriggerConfig(event, config, contact)) {
      skipped.push(`${workflow.slug}: trigger config not matched`);
      continue;
    }

    // Check if already actively enrolled
    const { data: existing } = await supabase
      .from("workflow_enrollments")
      .select("id")
      .eq("workflow_id", workflow.id)
      .eq("contact_id", event.contactId)
      .in("status", ["active", "paused"])
      .limit(1);

    if (existing && existing.length > 0) {
      skipped.push(`${workflow.slug}: already enrolled`);
      continue;
    }

    // Check max enrollments
    if (workflow.max_enrollments) {
      const { count } = await supabase
        .from("workflow_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("workflow_id", workflow.id)
        .eq("contact_id", event.contactId);

      if (count && count >= workflow.max_enrollments) {
        skipped.push(`${workflow.slug}: max enrollments reached`);
        continue;
      }
    }

    // Check workflow has steps
    const { count: stepCount } = await supabase
      .from("workflow_steps")
      .select("id", { count: "exact", head: true })
      .eq("workflow_id", workflow.id);

    if (!stepCount || stepCount === 0) {
      skipped.push(`${workflow.slug}: no steps defined`);
      continue;
    }

    // Get first step delay
    const { data: firstStep } = await supabase
      .from("workflow_steps")
      .select("delay_minutes")
      .eq("workflow_id", workflow.id)
      .order("step_order", { ascending: true })
      .limit(1)
      .single();

    const now = new Date();
    const nextRun = new Date(
      now.getTime() + (firstStep?.delay_minutes || 0) * 60000
    );

    // Enroll
    const { error } = await supabase.from("workflow_enrollments").insert({
      workflow_id: workflow.id,
      contact_id: event.contactId,
      listing_id: (event.data?.listingId as string) || null,
      status: "active",
      current_step: 1,
      next_run_at: nextRun.toISOString(),
    });

    if (error) {
      skipped.push(`${workflow.slug}: enrollment error: ${error.message}`);
      continue;
    }

    // Log activity
    await supabase.from("activity_log").insert({
      contact_id: event.contactId,
      activity_type: "workflow_auto_enrolled",
      description: `Auto-enrolled in ${workflow.slug} (trigger: ${event.type})`,
      metadata: { workflow_id: workflow.id, trigger: event.type, event_data: event.data },
    });

    // Create agent notification
    await supabase.from("agent_notifications").insert({
      title: `Auto-enrolled in workflow`,
      body: `${contact.type === "buyer" ? "Buyer" : "Seller"} auto-enrolled in "${workflow.slug}" workflow`,
      type: "workflow",
      contact_id: event.contactId,
      action_url: `/contacts/${event.contactId}`,
    });

    enrolled.push({ workflowId: workflow.id, slug: workflow.slug });
  }

  return { enrolled, skipped };
}

/**
 * Check if trigger_config conditions are met
 */
function matchesTriggerConfig(
  event: TriggerEvent,
  config: Record<string, unknown>,
  contact: { lead_status: string | null; tags: unknown }
): boolean {
  // lead_status_change: check if new status matches
  if (event.type === "lead_status_change" && config.status) {
    const requiredStatus = config.status as string;
    const newStatus = event.data?.newStatus as string;
    if (newStatus !== requiredStatus) return false;
  }

  // listing_status_change: check if new status matches
  if (event.type === "listing_status_change" && config.listing_status) {
    const requiredStatus = config.listing_status as string;
    const newStatus = event.data?.newStatus as string;
    if (newStatus !== requiredStatus) return false;
  }

  // tag_added: check if the added tag matches
  if (event.type === "tag_added" && config.tag) {
    const requiredTag = config.tag as string;
    const addedTag = event.data?.tag as string;
    if (addedTag !== requiredTag) return false;
  }

  return true;
}

/**
 * Check for inactive contacts (no communication in X days).
 * Called by cron job.
 */
export async function checkInactiveContacts(
  inactivityDays = 60
): Promise<{ checked: number; enrolled: number }> {
  const supabase = createAdminClient();
  const cutoffDate = new Date(
    Date.now() - inactivityDays * 24 * 60 * 60 * 1000
  ).toISOString();

  // Find contacts with no recent communication
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, type, lead_status")
    .not("lead_status", "in", '("closed","lost","inactive")');

  if (!contacts) return { checked: 0, enrolled: 0 };

  let enrolled = 0;

  for (const contact of contacts) {
    // Check last communication
    const { data: lastComm } = await supabase
      .from("communications")
      .select("created_at")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastComm && lastComm.created_at > cutoffDate) continue;

    // Also check last activity
    const { data: lastActivity } = await supabase
      .from("activity_log")
      .select("created_at")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastActivity && lastActivity.created_at > cutoffDate) continue;

    // Fire inactivity trigger
    const result = await fireTrigger({
      type: "inactivity",
      contactId: contact.id,
      contactType: contact.type,
    });

    enrolled += result.enrolled.length;
  }

  return { checked: contacts.length, enrolled };
}
