/**
 * Workflow Engine Core
 *
 * Processes workflow step executions:
 * - Resolves template variables
 * - Sends messages (SMS/WhatsApp/Email)
 * - Creates tasks
 * - Creates notifications
 * - Handles system actions (status changes, tag updates)
 * - Advances enrollment to next step
 *
 * Called by: API route (cron job) or manual trigger
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/feature-gate";
import { generateMessageContent } from "@/lib/anthropic/message-generator";
import {
  validateStageForType,
  syncLeadStatusAndStage,
  filterInvalidTags,
} from "@/lib/contact-consistency";
import { checkSendGovernor } from "@/lib/send-governor";
import type { Json } from "@/types/database";

type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  type: string;
  pref_channel: string;
  lead_status: string;
  tags: Json;
  stage_bar: string | null;
  // CASL + unsubscribe fields — read by executeAutoMessage before sending email.
  // See src/lib/compliance/can-send.ts for the enforcement rules.
  newsletter_unsubscribed: boolean | null;
  casl_consent_given: boolean | null;
  casl_consent_date: string | null;
};

type StepRow = {
  id: string;
  workflow_id: string;
  step_order: number;
  name: string;
  action_type: string;
  delay_minutes: number;
  delay_unit: string;
  delay_value: number;
  template_id: string | null;
  task_config: Json;
  action_config: Json;
  condition_config: Json;
  exit_on_reply: boolean;
};

type EnrollmentRow = {
  id: string;
  workflow_id: string;
  contact_id: string;
  listing_id: string | null;
  status: string;
  current_step: number;
  next_run_at: string | null;
  metadata: Json;
};

// ── Template Variable Resolution ──────────────────────────────

export function resolveTemplateVariables(
  template: string,
  contact: { name: string; phone: string; email?: string | null },
  listing?: { address?: string; list_price?: number; closing_date?: string | null } | null,
  agent?: { name?: string; phone?: string; email?: string } | null,
): string {
  const firstName = contact.name.split(/\s+/)[0] || contact.name;

  const vars: Record<string, string> = {
    contact_name: contact.name,
    contact_first_name: firstName,
    contact_phone: contact.phone,
    contact_email: contact.email || '',
    agent_name: agent?.name || process.env.AGENT_NAME || 'Your Agent',
    agent_phone: agent?.phone || process.env.AGENT_PHONE || '',
    agent_email: agent?.email || process.env.AGENT_EMAIL || '',
    listing_address: listing?.address || '',
    listing_price: listing?.list_price
      ? Number(listing.list_price).toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
      : '',
    closing_date: listing?.closing_date || '',
    today_date: new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    if (val === undefined) return `{{${key}}}`;
    // HTML-escape to prevent XSS in email templates
    return val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  });
}

/**
 * Overload for backward compatibility: accepts a pre-built variables record.
 */
export function resolveTemplateVariablesFromMap(
  body: string,
  variables: Record<string, string>
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

export function buildVariableContext(
  contact: Contact,
  listing?: { address: string; list_price: number | null; closing_date: string | null } | null,
  agent?: { name?: string; phone?: string; email?: string } | null,
): Record<string, string> {
  const firstName = contact.name.split(/\s+/)[0] || contact.name;
  const today = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const vars: Record<string, string> = {
    contact_name: contact.name,
    contact_first_name: firstName,
    contact_phone: contact.phone,
    contact_email: contact.email || "",
    agent_name: agent?.name || process.env.AGENT_NAME || "Your Agent",
    agent_phone: agent?.phone || process.env.AGENT_PHONE || "",
    agent_email: agent?.email || process.env.AGENT_EMAIL || "",
    today_date: today,
  };

  if (listing) {
    vars.listing_address = listing.address;
    vars.listing_price = listing.list_price
      ? Number(listing.list_price).toLocaleString("en-CA", {
          style: "currency",
          currency: "CAD",
          maximumFractionDigits: 0,
        })
      : "";
    vars.closing_date = listing.closing_date
      ? new Date(listing.closing_date).toLocaleDateString("en-CA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";
  }

  return vars;
}

// ── Step Executors ────────────────────────────────────────────

async function executeAutoMessage(
  step: StepRow,
  contact: Contact,
  variables: Record<string, string>,
  channel: "sms" | "whatsapp" | "email",
  listing?: { address?: string; list_price?: number } | null,
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const supabase = createAdminClient();

  // Check for AI-generated content via action_config.ai_template_intent
  const actionConfig = step.action_config as Record<string, unknown> | null;
  const aiIntent = actionConfig?.ai_template_intent as string | undefined;

  let body = "";
  let subject = "";

  if (aiIntent) {
    // AI-powered message generation takes priority
    try {
      const aiResult = await generateMessageContent(
        aiIntent,
        channel,
        {
          name: contact.name,
          type: contact.type,
          stage_bar: contact.lead_status,
        },
        listing,
        variables.agent_name,
      );
      body = aiResult.body;
      subject = aiResult.subject || "";
    } catch (aiErr) {
      // Fall through to template/fallback on AI failure
      console.error("[workflow-engine] AI message generation failed, falling back to template:", aiErr);
    }
  }

  // Fall back to linked template if AI didn't produce content
  if (!body && step.template_id) {
    const { data: template } = await supabase
      .from("message_templates")
      .select("body, subject")
      .eq("id", step.template_id)
      .single();

    if (template) {
      body = resolveTemplateVariablesFromMap(template.body, variables);
      subject = template.subject ? resolveTemplateVariablesFromMap(template.subject, variables) : "";
    }
  }

  if (!body) {
    // Use step name as fallback message
    body = resolveTemplateVariablesFromMap(step.name, variables);
  }

  if (channel === "email") {
    if (!contact.email) {
      return { success: false, error: "Contact has no email address" };
    }

    // Central CASL + unsubscribe gate. A workflow step is commercial
    // email by default — there's no per-step "this is transactional"
    // flag, so we enforce strict consent here.
    // See src/lib/compliance/can-send.ts
    const { canSendToContact } = await import("@/lib/compliance/can-send");
    const sendCheck = canSendToContact(contact);
    if (!sendCheck.allowed) {
      // Log to communications as a skipped message for audit trail
      await supabase.from("communications").insert({
        contact_id: contact.id,
        direction: "outbound",
        channel: "email",
        body: `[SKIPPED — ${sendCheck.reason}] Would have sent: ${step.name}`,
      });
      return {
        success: false,
        error: `Skipped: ${sendCheck.reason}`,
      };
    }

    try {
      // Run pre-send checks + build Apple-quality HTML with dynamic brand
      const { assembleEmail, runPreSendChecks, getBrandConfig } = await import("@/lib/email-blocks");
      const brand = await getBrandConfig();
      const checks = await runPreSendChecks(subject || step.name, body, contact.id, contact.name, contact.type, step.template_id || "welcome");
      subject = checks.subject;
      body = checks.body;
      const emailType = step.template_id || "welcome";
      const emailSubject = subject || step.name;
      const htmlBody = assembleEmail(emailType, {
        contact: { name: contact.name, firstName: contact.name?.split(" ")[0] || "there", type: contact.type },
        agent: brand,
        content: { subject: emailSubject, intro: body, body: "", ctaText: "View Details" },
      });

      // Send via Resend (not Gmail) for tracking + deliverability
      const { sendEmail } = await import("@/lib/resend");
      const result = await sendEmail({
        to: contact.email,
        subject: emailSubject,
        html: htmlBody,
        tags: [
          { name: "contact_id", value: contact.id },
          { name: "email_type", value: emailType },
        ],
      });

      // Save to newsletters table for tracking in AI Agent tab
      await supabase.from("newsletters").insert({
        contact_id: contact.id,
        subject: emailSubject,
        email_type: emailType,
        status: "sent",
        html_body: htmlBody,
        sent_at: new Date().toISOString(),
        resend_message_id: result.messageId || null,
        send_mode: "auto",
        ai_context: { source: "workflow", step_name: step.name, workflow_id: step.workflow_id },
      }); // Best effort — don't fail workflow if this errors

      // Log to communications
      await supabase.from("communications").insert({
        contact_id: contact.id,
        direction: "outbound",
        channel: "email",
        body: `Subject: ${emailSubject}\n\n${body}`,
      });

      return { success: true, result: { channel: "email", messageId: result.messageId } };
    } catch (emailErr) {
      // Fallback: log as communication even if send fails
      await supabase.from("communications").insert({
        contact_id: contact.id,
        direction: "outbound",
        channel: "email",
        body: subject ? `Subject: ${subject}\n\n${body}` : body,
      });
      return { success: true, result: { channel: "email", logged: true, sendError: String(emailErr) } };
    }
  }

  // SMS or WhatsApp via Twilio
  try {
    const { sendGenericMessage } = await import("@/lib/twilio");
    const sid = await sendGenericMessage({
      to: contact.phone,
      channel,
      body,
    });

    // Log to communications
    await supabase.from("communications").insert({
      contact_id: contact.id,
      direction: "outbound",
      channel,
      body,
    });

    return { success: true, result: { twilio_sid: sid, channel } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function executeManualTask(
  step: StepRow,
  contact: Contact,
  enrollmentId: string
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const supabase = createAdminClient();
  const config = step.task_config as Record<string, unknown> | null;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      contact_id: contact.id,
      title: (config?.title as string) || step.name,
      priority: (config?.priority as string) || "medium",
      category: (config?.category as string) || "follow_up",
      status: "pending",
      description: `Auto-created by workflow. Enrollment: ${enrollmentId}`,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, result: { task_id: task?.id } };
}

async function executeAutoAlert(
  step: StepRow,
  contact: Contact,
  enrollmentId: string
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("agent_notifications").insert({
    title: step.name,
    body: `Workflow action for ${contact.name}`,
    type: "workflow",
    contact_id: contact.id,
    action_url: `/contacts/${contact.id}`,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, result: { notification_created: true } };
}

async function executeSystemAction(
  step: StepRow,
  contact: Contact
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const supabase = createAdminClient();
  const config = step.action_config as Record<string, unknown> | null;
  const action = config?.action as string;
  const value = config?.value as string;

  if (!action) return { success: false, error: "No action configured" };

  switch (action) {
    case "change_lead_status": {
      // Sync stage_bar when lead_status changes
      const contactType = contact.type || "other";
      const stageBar = contact.stage_bar ?? null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const synced = syncLeadStatusAndStage(value, stageBar, contactType as any);
      const { error } = await supabase
        .from("contacts")
        .update({ lead_status: synced.lead_status, stage_bar: synced.stage_bar })
        .eq("id", contact.id);
      if (error) return { success: false, error: error.message };
      return { success: true, result: { action: "change_lead_status", value: synced.lead_status, stage_bar: synced.stage_bar } };
    }
    case "add_tag": {
      const currentTags = Array.isArray(contact.tags) ? (contact.tags as string[]) : [];
      if (!currentTags.includes(value)) {
        const newTags = [...currentTags, value];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cleanTags = filterInvalidTags(newTags, contact.type as any, contact.lead_status);
        const { error } = await supabase
          .from("contacts")
          .update({ tags: cleanTags })
          .eq("id", contact.id);
        if (error) return { success: false, error: error.message };
      }
      return { success: true, result: { action: "add_tag", value } };
    }
    case "change_stage": {
      // Validate stage for contact type and sync lead_status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validStage = validateStageForType(contact.type as any, value);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stageSynced = syncLeadStatusAndStage(contact.lead_status, validStage, contact.type as any);
      const { error } = await supabase
        .from("contacts")
        .update({ stage_bar: stageSynced.stage_bar, lead_status: stageSynced.lead_status })
        .eq("id", contact.id);
      if (error) return { success: false, error: error.message };
      return { success: true, result: { action: "change_stage", value: stageSynced.stage_bar, lead_status: stageSynced.lead_status } };
    }
    case "remove_tag": {
      const tags = Array.isArray(contact.tags) ? (contact.tags as string[]) : [];
      const { error } = await supabase
        .from("contacts")
        .update({ tags: tags.filter((t) => t !== value) })
        .eq("id", contact.id);
      if (error) return { success: false, error: error.message };
      return { success: true, result: { action: "remove_tag", value } };
    }
    default:
      return { success: false, error: `Unknown system action: ${action}` };
  }
}

// ── Main Step Executor ────────────────────────────────────────

export async function executeStep(
  enrollment: EnrollmentRow,
  step: StepRow
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  const supabase = createAdminClient();

  // Fetch contact (include newsletter_intelligence for send governor AND
  // CASL fields for the compliance gate in executeAutoMessage).
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, phone, email, type, pref_channel, lead_status, tags, stage_bar, newsletter_intelligence, newsletter_unsubscribed, casl_consent_given, casl_consent_date, realtor_id")
    .eq("id", enrollment.contact_id)
    .single();

  if (!contact) return { success: false, error: "Contact not found" };

  // Gate: block message-sending steps if automations is disabled for this realtor.
  // Non-message steps (manual_task, auto_alert, system_action, wait) still run —
  // they don't send emails and are not blocked by the flag.
  // Fail-closed: if realtor_id is missing we cannot verify the flag, so block the send.
  if (["auto_sms", "auto_whatsapp", "auto_email"].includes(step.action_type)) {
    if (!contact.realtor_id) {
      console.warn(
        `[workflow-engine] Contact ${contact.id} has no realtor_id — cannot verify automations flag. Blocking ${step.action_type}.`
      );
      return { success: false, error: "automations_disabled: no realtor_id on contact" };
    }
    const automationsEnabled = await isFeatureEnabled(contact.realtor_id, "automations");
    if (!automationsEnabled) {
      console.log(
        `[workflow-engine] automations disabled for realtor ${contact.realtor_id} — skipping ${step.action_type}`
      );
      return { success: false, error: "automations_disabled" };
    }
  }

  // Fetch listing context if available
  let listing = null;
  if (enrollment.listing_id) {
    const { data } = await supabase
      .from("listings")
      .select("address, list_price, closing_date")
      .eq("id", enrollment.listing_id)
      .single();
    listing = data;
  }

  const variables = buildVariableContext(contact as Contact, listing);

  // For message-sending steps, check the send governor first
  const isMessageStep = ["auto_sms", "auto_whatsapp", "auto_email"].includes(step.action_type);

  if (isMessageStep) {
    // Resolve journey phase from contact_journeys (default to lead_status)
    let journeyPhase = contact.lead_status || "lead";
    const { data: journey } = await supabase
      .from("contact_journeys")
      .select("current_phase")
      .eq("contact_id", contact.id)
      .eq("status", "active")
      .limit(1)
      .single();
    if (journey?.current_phase) {
      journeyPhase = journey.current_phase;
    }

    // Extract engagement data from newsletter_intelligence
    const intel = (contact.newsletter_intelligence as Record<string, unknown>) || {};
    const engagementScore = (typeof intel.engagement_score === "number" ? intel.engagement_score : 0);
    const engagementTrend = (typeof intel.engagement_trend === "string" ? intel.engagement_trend : "stable");

    const governorResult = await checkSendGovernor({
      contactId: contact.id,
      contactType: contact.type,
      journeyPhase,
      engagementScore,
      engagementTrend,
    });

    if (!governorResult.allowed) {
      console.log(
        `[workflow-engine] Send governor blocked for contact ${contact.id}: ${governorResult.reason}`,
        governorResult.adjustments,
      );

      // Write suppressed record so it's visible in AI Agent tab
      try {
        await supabase.from("newsletters").insert({
          contact_id: contact.id,
          subject: `[Suppressed] ${step.action_type} — ${step.template_id || "auto"}`,
          email_type: step.template_id || step.action_type,
          status: "suppressed",
          html_body: "<p>Email suppressed by AI — not generated.</p>",
          ai_context: {
            suppression_reason: governorResult.reason,
            adjustments: governorResult.adjustments,
            suggested_delay_hours: governorResult.suggestedDelay,
            journey_phase: journeyPhase,
            contact_type: contact.type,
            suppressed_at: new Date().toISOString(),
          },
        });
      } catch {
        // Don't fail the workflow if suppression logging fails
      }

      return { success: false, error: `Send governor: ${governorResult.reason}` };
    }
  }

  // Execute based on action type
  switch (step.action_type) {
    case "auto_sms":
      return executeAutoMessage(step, contact as Contact, variables, "sms", listing);
    case "auto_whatsapp":
      return executeAutoMessage(step, contact as Contact, variables, "whatsapp", listing);
    case "auto_email":
      return executeAutoMessage(step, contact as Contact, variables, "email", listing);
    case "manual_task":
      return executeManualTask(step, contact as Contact, enrollment.id);
    case "auto_alert":
      return executeAutoAlert(step, contact as Contact, enrollment.id);
    case "system_action":
      return executeSystemAction(step, contact as Contact);
    case "wait":
      // Wait steps don't execute — they just set the delay for the next step
      return { success: true, result: { action: "wait", skipped: true } };
    default:
      return { success: false, error: `Unknown action type: ${step.action_type}` };
  }
}

// ── Process Pending Enrollments ───────────────────────────────

/**
 * Main processor: finds all active enrollments where next_run_at <= now
 * and executes their current step, then advances to next step.
 *
 * Should be called by a cron job every 1-2 minutes.
 */
export async function processWorkflowQueue(): Promise<{
  processed: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const errors: string[] = [];
  let processed = 0;

  // Find enrollments ready to execute
  const { data: pendingEnrollments } = await supabase
    .from("workflow_enrollments")
    .select("*")
    .eq("status", "active")
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(50);

  if (!pendingEnrollments || pendingEnrollments.length === 0) {
    return { processed: 0, errors: [] };
  }

  for (const enrollment of pendingEnrollments) {
    try {
      // Get current step
      const { data: step } = await supabase
        .from("workflow_steps")
        .select("*")
        .eq("workflow_id", enrollment.workflow_id)
        .eq("step_order", enrollment.current_step)
        .single();

      if (!step) {
        // No more steps — mark as completed
        await supabase
          .from("workflow_enrollments")
          .update({
            status: "completed",
            completed_at: now,
          })
          .eq("id", enrollment.id);
        processed++;
        continue;
      }

      // Execute the step
      const result = await executeStep(
        enrollment as EnrollmentRow,
        step as StepRow
      );

      // Log the step execution
      await supabase.from("workflow_step_logs").insert({
        enrollment_id: enrollment.id,
        step_id: step.id,
        status: result.success ? "sent" : "failed",
        result: result.result || {},
        error_message: result.error || null,
      });

      // Log activity
      await supabase.from("activity_log").insert({
        contact_id: enrollment.contact_id,
        listing_id: enrollment.listing_id,
        activity_type: `workflow_step_${step.action_type}`,
        description: step.name,
        metadata: {
          enrollment_id: enrollment.id,
          step_id: step.id,
          step_order: step.step_order,
          result: result.result,
        },
      });

      if (!result.success) {
        errors.push(
          `Enrollment ${enrollment.id} step ${step.step_order}: ${result.error}`
        );
        // Don't advance on failure — retry next cycle
        continue;
      }

      // Find next step
      const { data: nextStep } = await supabase
        .from("workflow_steps")
        .select("step_order, delay_minutes")
        .eq("workflow_id", enrollment.workflow_id)
        .gt("step_order", enrollment.current_step)
        .order("step_order", { ascending: true })
        .limit(1)
        .single();

      if (!nextStep) {
        // Workflow complete
        await supabase
          .from("workflow_enrollments")
          .update({
            status: "completed",
            completed_at: now,
            current_step: enrollment.current_step + 1,
          })
          .eq("id", enrollment.id);
      } else {
        // Schedule next step
        const nextRunAt = new Date(
          Date.now() + (nextStep.delay_minutes || 0) * 60000
        ).toISOString();

        await supabase
          .from("workflow_enrollments")
          .update({
            current_step: nextStep.step_order,
            next_run_at: nextRunAt,
          })
          .eq("id", enrollment.id);
      }

      processed++;
    } catch (err) {
      errors.push(`Enrollment ${enrollment.id}: ${String(err)}`);
    }
  }

  return { processed, errors };
}

// ── Check for exit conditions ─────────────────────────────────

/**
 * Called when a contact replies (inbound message).
 * Checks if any active enrollment has exit_on_reply = true
 * for the current or upcoming step.
 */
export async function checkExitOnReply(contactId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: enrollments } = await supabase
    .from("workflow_enrollments")
    .select("id, workflow_id, current_step")
    .eq("contact_id", contactId)
    .eq("status", "active");

  if (!enrollments || enrollments.length === 0) return;

  for (const enrollment of enrollments) {
    const { data: currentStep } = await supabase
      .from("workflow_steps")
      .select("exit_on_reply")
      .eq("workflow_id", enrollment.workflow_id)
      .eq("step_order", enrollment.current_step)
      .single();

    if (currentStep?.exit_on_reply) {
      await supabase
        .from("workflow_enrollments")
        .update({
          status: "exited",
          exit_reason: "Contact replied",
          completed_at: new Date().toISOString(),
        })
        .eq("id", enrollment.id);

      // Log activity
      await supabase.from("activity_log").insert({
        contact_id: contactId,
        activity_type: "workflow_exited",
        description: "Exited workflow: contact replied",
        metadata: { enrollment_id: enrollment.id },
      });
    }
  }
}
