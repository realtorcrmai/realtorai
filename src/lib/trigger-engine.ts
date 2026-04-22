/**
 * Workflow Trigger Engine
 *
 * Connects CRM events to workflow enrollments.
 * Journeys track WHERE the contact is (phase).
 * Workflows track WHAT emails to send (sequences).
 * This engine bridges them.
 *
 * Usage:
 *   await fireTrigger("new_lead", contactId, { contactType: "buyer" });
 *   await fireTrigger("phase_changed", contactId, { newPhase: "active", oldPhase: "lead" });
 *   await fireTrigger("showing_completed", contactId, { listingId: "..." });
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-gate";

export type TriggerEvent =
  | "new_lead"
  | "phase_changed"
  | "showing_completed"
  | "listing_status_change"
  | "inactivity"
  | "tag_added"
  | "lead_status_change";

export type TriggerMetadata = {
  contactType?: string;
  newPhase?: string;
  oldPhase?: string;
  listingId?: string;
  tag?: string;
  [key: string]: unknown;
};

export type TriggerResult = {
  enrolled: { workflowId: string; workflowName: string }[];
  paused: { workflowId: string; workflowName: string }[];
  skipped: { workflowId: string; reason: string }[];
};

/**
 * Fire a trigger event — find matching workflows and enroll the contact.
 * Also pauses irrelevant workflows when phase changes.
 */
export async function fireTrigger(
  event: TriggerEvent,
  contactId: string,
  metadata: TriggerMetadata = {},
): Promise<TriggerResult> {
  const supabase = createAdminClient();
  const result: TriggerResult = { enrolled: [], paused: [], skipped: [] };

  // 1. Get contact info (include realtor_id for feature gate)
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, type, email, realtor_id")
    .eq("id", contactId)
    .single();

  if (!contact) {
    console.warn(`[trigger-engine] Contact not found: ${contactId}`);
    return result;
  }

  // Gate: skip workflow enrollment if automations is disabled for this realtor.
  // Fail-closed: if the contact has no realtor_id (nullable column from migration 062),
  // block enrollment — we cannot verify the flag without knowing the owner.
  if (!contact.realtor_id) {
    console.warn(
      `[trigger-engine] Contact ${contactId} has no realtor_id — cannot verify automations flag. Blocking enrollment.`
    );
    return result;
  }
  const automationsEnabled = await isFeatureEnabled(contact.realtor_id, "automations");
  if (!automationsEnabled) {
    console.log(
      `[trigger-engine] automations disabled for realtor ${contact.realtor_id} — skipping ${event} trigger`
    );
    return result;
  }

  const contactType = metadata.contactType || contact.type;

  // 2. Find matching workflows
  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, name, slug, trigger_type, contact_type, is_active")
    .eq("is_active", true)
    .eq("trigger_type", event);

  if (!workflows || workflows.length === 0) {
    return result;
  }

  // 3. Get existing enrollments for this contact
  const { data: existingEnrollments } = await supabase
    .from("workflow_enrollments")
    .select("id, workflow_id, status")
    .eq("contact_id", contactId);

  const enrolledWorkflowIds = new Set(
    (existingEnrollments || []).map(e => e.workflow_id)
  );

  // 4. Process each matching workflow
  for (const workflow of workflows) {
    // Check contact_type match
    if (workflow.contact_type && workflow.contact_type !== "any" && workflow.contact_type !== contactType) {
      result.skipped.push({
        workflowId: workflow.id,
        reason: `Contact type mismatch: workflow wants "${workflow.contact_type}", contact is "${contactType}"`,
      });
      continue;
    }

    // Check if already enrolled
    if (enrolledWorkflowIds.has(workflow.id)) {
      const existing = existingEnrollments?.find(e => e.workflow_id === workflow.id);
      if (existing?.status === "active") {
        result.skipped.push({
          workflowId: workflow.id,
          reason: "Already enrolled and active",
        });
        continue;
      }
      // If paused or completed, we could re-enroll — skip for now
      result.skipped.push({
        workflowId: workflow.id,
        reason: `Already enrolled (status: ${existing?.status})`,
      });
      continue;
    }

    // Enroll
    const { error } = await supabase.from("workflow_enrollments").insert({
      workflow_id: workflow.id,
      contact_id: contactId,
      status: "active",
      current_step: 0,
      next_run_at: new Date().toISOString(), // Start immediately
    });

    if (error) {
      result.skipped.push({
        workflowId: workflow.id,
        reason: `Enrollment failed: ${error.message}`,
      });
    } else {
      result.enrolled.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
      });
    }
  }

  // 5. Handle phase changes — pause irrelevant workflows
  if (event === "phase_changed" && metadata.newPhase) {
    const pauseResult = await pauseIrrelevantWorkflows(
      supabase, contactId, contactType, metadata.newPhase, existingEnrollments || []
    );
    result.paused = pauseResult;
  }

  // Log trigger event
  console.log(
    `[trigger-engine] ${event} for ${contact.name}: ` +
    `enrolled=${result.enrolled.length}, paused=${result.paused.length}, skipped=${result.skipped.length}`
  );

  return result;
}

/**
 * Pause workflows that are no longer relevant for the contact's current phase.
 */
async function pauseIrrelevantWorkflows(
  supabase: ReturnType<typeof createAdminClient>,
  contactId: string,
  contactType: string,
  newPhase: string,
  existingEnrollments: { id: string; workflow_id: string; status: string }[],
): Promise<{ workflowId: string; workflowName: string }[]> {
  const paused: { workflowId: string; workflowName: string }[] = [];

  // Get workflow details for enrolled workflows
  const activeEnrollments = existingEnrollments.filter(e => e.status === "active");
  if (activeEnrollments.length === 0) return paused;

  const { data: workflows } = await supabase
    .from("workflows")
    .select("id, name, slug, trigger_type")
    .in("id", activeEnrollments.map(e => e.workflow_id));

  if (!workflows) return paused;

  // Determine which workflows to pause based on new phase
  const PHASE_IRRELEVANT: Record<string, string[]> = {
    active: ["speed_to_contact"], // Speed to contact done once lead becomes active
    under_contract: ["buyer_lifecycle", "buyer_nurture", "seller_lifecycle", "lead_reengagement"], // Stop marketing when under contract
    past_client: ["buyer_lifecycle", "buyer_nurture", "seller_lifecycle", "lead_reengagement", "open_house_followup"], // Stop all active workflows
    dormant: ["buyer_lifecycle", "buyer_nurture", "seller_lifecycle", "open_house_followup"], // Stop active workflows, keep re-engagement
  };

  const toPause = PHASE_IRRELEVANT[newPhase] || [];

  for (const workflow of workflows) {
    if (toPause.includes(workflow.slug)) {
      const enrollment = activeEnrollments.find(e => e.workflow_id === workflow.id);
      if (enrollment) {
        await supabase
          .from("workflow_enrollments")
          .update({ status: "paused" })
          .eq("id", enrollment.id);

        paused.push({ workflowId: workflow.id, workflowName: workflow.name });
      }
    }
  }

  return paused;
}

/**
 * Check all contacts for inactivity and fire triggers.
 * Called by daily cron.
 */
export async function checkInactivity(dormancyDays: number = 60): Promise<number> {
  const supabase = createAdminClient();

  // Find contacts with active journeys that haven't engaged recently
  const cutoff = new Date(Date.now() - dormancyDays * 86400000).toISOString();

  const { data: journeys } = await supabase
    .from("contact_journeys")
    .select("id, contact_id, current_phase, contacts(newsletter_intelligence)")
    .eq("is_paused", false)
    .in("current_phase", ["lead", "active"]) // Only check non-dormant
    .limit(100);

  let dormantCount = 0;

  for (const journey of (journeys || [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const intel = (journey as any).contacts?.newsletter_intelligence as Record<string, unknown> | null;
    const lastOpened = intel?.last_opened as string | null;
    const lastClicked = intel?.last_clicked as string | null;

    const lastEngagement = [lastOpened, lastClicked].filter(Boolean).sort().pop();

    if (!lastEngagement || new Date(lastEngagement) < new Date(cutoff)) {
      // Move to dormant
      await supabase
        .from("contact_journeys")
        .update({ current_phase: "dormant", phase_entered_at: new Date().toISOString() })
        .eq("id", journey.id);

      // Fire trigger for re-engagement workflow
      await fireTrigger("inactivity", journey.contact_id, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contactType: (journey as any).contacts?.type,
      });

      dormantCount++;
    }
  }

  return dormantCount;
}
