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
import { WORKFLOW_STAGE_MAP, LIFECYCLE_MILESTONE_STAGE_MAP } from "@/lib/constants/workflows";

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

    // Auto-sync stage_bar based on workflow type
    const stageMapping = WORKFLOW_STAGE_MAP[workflow.slug];
    if (stageMapping) {
      const contactType = contact.type as "buyer" | "seller";
      const newStage = stageMapping[contactType] || stageMapping.buyer;
      await supabase
        .from("contacts")
        .update({ stage_bar: newStage })
        .eq("id", event.contactId);
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
 * Evaluate a milestone condition against the database.
 * Returns true if the milestone is satisfied.
 */
export async function evaluateMilestoneCondition(
  condition: string,
  contactId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  switch (condition) {
    case "contact_exists":
      return true; // Contact is enrolled, so it exists

    case "has_listing": {
      const { count } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", contactId);
      return (count ?? 0) > 0;
    }

    case "listing_active": {
      // Seller: listing is active, pending, or sold
      const { count: sellerCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", contactId)
        .in("status", ["active", "pending", "sold"]);
      if ((sellerCount ?? 0) > 0) return true;
      // Buyer: check buyer_id
      const { count: buyerCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", contactId)
        .in("status", ["active", "pending", "sold"]);
      return (buyerCount ?? 0) > 0;
    }

    case "listing_pending_or_sold": {
      const { count: sellerCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", contactId)
        .in("status", ["pending", "sold"]);
      if ((sellerCount ?? 0) > 0) return true;
      const { count: buyerCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", contactId)
        .in("status", ["pending", "sold"]);
      return (buyerCount ?? 0) > 0;
    }

    case "listing_sold": {
      const { count: sellerCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", contactId)
        .eq("status", "sold");
      if ((sellerCount ?? 0) > 0) return true;
      const { count: buyerCount } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", contactId)
        .eq("status", "sold");
      return (buyerCount ?? 0) > 0;
    }

    case "has_buyer_preferences": {
      const { data: contact } = await supabase
        .from("contacts")
        .select("buyer_preferences")
        .eq("id", contactId)
        .single();
      if (!contact?.buyer_preferences) return false;
      const prefs = contact.buyer_preferences as Record<string, unknown>;
      return Object.keys(prefs).length > 0;
    }

    case "has_showings_or_activity": {
      // Check communications
      const { count: commCount } = await supabase
        .from("communications")
        .select("id", { count: "exact", head: true })
        .eq("contact_id", contactId);
      if ((commCount ?? 0) > 0) return true;
      // Check appointments
      const { count: apptCount } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .or(`buyer_agent_phone.eq.${contactId}`);
      // Also check activity log
      const { count: actCount } = await supabase
        .from("activity_log")
        .select("id", { count: "exact", head: true })
        .eq("contact_id", contactId);
      return (apptCount ?? 0) > 0 || (actCount ?? 0) > 0;
    }

    default:
      return false;
  }
}

/**
 * Advance lifecycle milestones for a specific contact.
 * Finds all active lifecycle enrollments and advances steps
 * whose conditions are now met.
 */
export async function advanceLifecycleForContact(
  contactId: string
): Promise<{ advanced: number }> {
  const supabase = createAdminClient();
  let advanced = 0;

  // Get contact type for stage mapping
  const { data: contactRecord } = await supabase
    .from("contacts")
    .select("type")
    .eq("id", contactId)
    .single();

  const cType = (contactRecord?.type as "buyer" | "seller") || "buyer";

  // Find active lifecycle enrollments for this contact
  // We detect lifecycle workflows by checking if they have slug ending with '_lifecycle'
  const { data: enrollments } = await supabase
    .from("workflow_enrollments")
    .select("id, workflow_id, current_step, workflows!inner(id, slug)")
    .eq("contact_id", contactId)
    .eq("status", "active");

  if (!enrollments || enrollments.length === 0) return { advanced: 0 };

  for (const enrollment of enrollments) {
    const workflow = enrollment.workflows as unknown as { id: string; slug: string };
    if (!workflow?.slug?.endsWith("_lifecycle")) continue;

    // Get all steps for this workflow
    const { data: steps } = await supabase
      .from("workflow_steps")
      .select("id, step_order, action_type, action_config")
      .eq("workflow_id", enrollment.workflow_id)
      .order("step_order", { ascending: true });

    if (!steps || steps.length === 0) continue;

    let currentStep = enrollment.current_step;
    const totalSteps = steps.length;

    // Advance through steps while conditions are met
    while (currentStep <= totalSteps) {
      const step = steps.find((s) => s.step_order === currentStep);
      if (!step || step.action_type !== "milestone") break;

      const config = step.action_config as Record<string, unknown> | null;
      const condition = config?.condition as string;
      if (!condition) break;

      const isMet = await evaluateMilestoneCondition(condition, contactId);
      if (!isMet) break;

      // Sync stage_bar based on the milestone reached
      const milestoneStage = LIFECYCLE_MILESTONE_STAGE_MAP[step.name];
      if (milestoneStage) {
        const newStage = milestoneStage[cType] || milestoneStage.buyer;
        await supabase
          .from("contacts")
          .update({ stage_bar: newStage })
          .eq("id", contactId);
      }

      // Advance to next step
      currentStep += 1;
      advanced += 1;

      // Log the advancement
      await supabase.from("workflow_step_logs").insert({
        enrollment_id: enrollment.id,
        step_id: step.id,
        status: "sent",
        result: { milestone_condition: condition, met: true },
      });
    }

    // Update enrollment
    if (currentStep !== enrollment.current_step) {
      if (currentStep > totalSteps) {
        // All milestones complete
        await supabase
          .from("workflow_enrollments")
          .update({
            current_step: totalSteps,
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", enrollment.id);
      } else {
        await supabase
          .from("workflow_enrollments")
          .update({ current_step: currentStep })
          .eq("id", enrollment.id);
      }

      // Log activity
      await supabase.from("activity_log").insert({
        contact_id: contactId,
        activity_type: "lifecycle_milestone_advanced",
        description: `Advanced to step ${currentStep} in ${workflow.slug}`,
        metadata: { workflow_id: enrollment.workflow_id, new_step: currentStep },
      });
    }
  }

  return { advanced };
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
