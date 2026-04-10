/**
 * Workflow Engine — ported from CRM (M3-E).
 *
 * Processes workflow step executions (the core scheduling loop).
 * This is the primary reason the newsletter service exists — the CRM's
 * Vercel 10s function timeout fails at ~20 enrollments. Here we have
 * no timeout constraint.
 *
 * Ported from `realestate-crm/src/lib/workflow-engine.ts`.
 * Changes from CRM original:
 *   - Uses newsletter service's supabase client (not CRM admin client)
 *   - Uses newsletter service's resend.ts for email (circuit breaker)
 *   - Uses newsletter service's compliance.ts for CASL gate
 *   - AI content generation uses local Anthropic client + retry
 *   - SMS/WhatsApp via local twilio.ts
 *   - Send governor simplified (inline frequency check, not full config)
 *   - SupabaseClient injected for testability
 *   - Structured pino logging instead of console.log
 *   - All `as any` casts removed (HC-1)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config.js';
import { logger } from '../../lib/logger.js';
import { sendEmail } from '../../lib/resend.js';
import { buildEmailFromType, generatePlainText } from '../../lib/email-blocks.js';
import { sendGenericMessage } from '../../lib/twilio.js';
import { canSendToContact } from '../../lib/compliance.js';
import { createWithRetry } from '../anthropic-retry.js';
import {
  buildVariableContext,
  resolveTemplateVariables,
  type ContactVars,
  type ListingVars,
} from './template-vars.js';

const anthropic = new Anthropic();

/* ───────────────────────────── Row types ───────────────────────────── */

type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  type: string;
  pref_channel: string;
  lead_status: string;
  tags: string[] | null;
  stage_bar: string | null;
  newsletter_unsubscribed: boolean | null;
  casl_consent_given: boolean | null;
  casl_consent_date: string | null;
  newsletter_intelligence: Record<string, unknown> | null;
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
  task_config: Record<string, unknown> | null;
  action_config: Record<string, unknown> | null;
  condition_config: Record<string, unknown> | null;
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
  metadata: Record<string, unknown> | null;
};

type StepResult = {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
};

/* ───────────────────────── AI Content Generation ───────────────────────── */

const EMAIL_SYSTEM_PROMPT = `You are an elite real estate email copywriter for a BC realtor. Your emails feel like they come from a trusted friend who knows real estate — never from a marketing machine.

RULES:
- Open with something SPECIFIC to the contact — their neighbourhood, a property they viewed, the season. NEVER "I hope this finds you well" or "I wanted to reach out".
- One idea per email. Short sentences. Contractions. Natural rhythm.
- 120 words max for email body. Under 160 chars for SMS.
- Canadian spelling: neighbourhood, favourite, colour.
- Subject lines under 50 chars with specifics, not generic headers.
- If you don't have enough data to be specific, keep it SHORT and honest.

ANTI-PATTERNS (NEVER write these):
- "I hope this email finds you well"
- "As your trusted real estate advisor"
- "Don't miss this incredible opportunity"
- "In today's dynamic market"
- Any sentence that could apply to ANY contact`;

const SMS_SYSTEM_PROMPT = `You write SMS/WhatsApp messages for a BC realtor. Under 160 chars. Casual, friendly, specific. No fluff. Include one action if relevant.`;

/**
 * Generate message content via Claude for workflow steps with ai_template_intent.
 * Uses RAG context for personalization when available.
 */
async function generateAIContent(
  db: SupabaseClient,
  intent: string,
  channel: 'email' | 'sms' | 'whatsapp',
  contact: { name: string; type: string; stage_bar?: string | null; id?: string },
  listing?: { address?: string; list_price?: number } | null,
  agentName?: string
): Promise<{ subject?: string; body: string }> {
  const firstName = contact.name.split(/\s+/)[0] || contact.name;

  // RAG: pull interaction history for personalization (best-effort)
  let ragContext = '';
  if (contact.id) {
    try {
      const { retrieveContext } = await import('../rag/retriever.js');
      const retrieved = await retrieveContext(
        db,
        `${contact.name} ${intent} recent interactions preferences`,
        { contact_id: contact.id, content_type: ['message', 'activity', 'email'] },
        5
      );
      if (retrieved.formatted) {
        ragContext = `\nINTERACTION HISTORY (use specifics from this):\n${retrieved.formatted}\n`;
      }
    } catch {
      // RAG unavailable — proceed without
    }
  }

  const listingInfo = listing
    ? `\nPROPERTY: ${listing.address || 'N/A'}, $${listing.list_price?.toLocaleString() || 'N/A'}`
    : '';

  const prompt = `Write a ${channel} message.

CONTACT: ${firstName} (${contact.type}, stage: ${contact.stage_bar || 'lead'})
REALTOR: ${agentName || config.AGENT_NAME}${listingInfo}
INTENT: ${intent}
${ragContext}
${channel === 'email'
    ? 'Return ONLY valid JSON: { "subject": "under 50 chars, specific", "body": "greeting + 1-3 paragraphs + sign-off, 120 words max" }'
    : 'Return ONLY valid JSON: { "body": "under 160 chars" }'}`;

  const message = await createWithRetry(anthropic, {
    model: config.AI_SCORING_MODEL,
    max_tokens: 600,
    system: channel === 'email' ? EMAIL_SYSTEM_PROMPT : SMS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '';

  try {
    return JSON.parse(text) as { subject?: string; body: string };
  } catch {
    return { body: text };
  }
}

/* ───────────────────────── Frequency Check ───────────────────────── */

/**
 * Simplified send governor — checks how many emails were sent to this
 * contact in the last 24h and 7 days. Hard caps instead of the CRM's
 * full realtor_agent_config lookup (which requires porting the config
 * table schema). Full governor available in M4+.
 */
async function checkFrequencyCap(
  db: SupabaseClient,
  contactId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [dailyRes, weeklyRes] = await Promise.all([
    db
      .from('newsletters')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId)
      .eq('status', 'sent')
      .gte('sent_at', oneDayAgo),
    db
      .from('newsletters')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId)
      .eq('status', 'sent')
      .gte('sent_at', sevenDaysAgo),
  ]);

  const dailyCount = dailyRes.count ?? 0;
  const weeklyCount = weeklyRes.count ?? 0;

  if (dailyCount >= 2) {
    return { allowed: false, reason: `Daily cap reached (${dailyCount}/2 in 24h)` };
  }
  if (weeklyCount >= 5) {
    return { allowed: false, reason: `Weekly cap reached (${weeklyCount}/5 in 7 days)` };
  }

  return { allowed: true };
}

/* ───────────────────────── Step Executors ───────────────────────── */

async function executeAutoMessage(
  db: SupabaseClient,
  step: StepRow,
  contact: Contact,
  variables: Record<string, string>,
  channel: 'sms' | 'whatsapp' | 'email',
  listing?: ListingVars | null
): Promise<StepResult> {
  const actionConfig = step.action_config;
  const aiIntent = actionConfig?.ai_template_intent as string | undefined;

  let body = '';
  let subject = '';

  // AI-powered content generation
  if (aiIntent) {
    try {
      const aiResult = await generateAIContent(db, aiIntent, channel, {
        name: contact.name,
        type: contact.type,
        stage_bar: contact.lead_status,
        id: contact.id,
      }, listing ? { address: listing.address, list_price: listing.list_price ?? undefined } : null, variables.agent_name);
      body = aiResult.body;
      subject = aiResult.subject || '';
    } catch (err) {
      logger.warn({ err, step: step.name }, 'workflow: AI content generation failed, falling back to template');
    }
  }

  // Fall back to linked template
  if (!body && step.template_id) {
    const { data: template } = await db
      .from('message_templates')
      .select('body, subject')
      .eq('id', step.template_id)
      .maybeSingle();

    if (template) {
      body = resolveTemplateVariables(template.body, variables);
      subject = template.subject ? resolveTemplateVariables(template.subject, variables) : '';
    }
  }

  if (!body) {
    body = resolveTemplateVariables(step.name, variables);
  }

  if (channel === 'email') {
    if (!contact.email) {
      return { success: false, error: 'Contact has no email address' };
    }

    // CASL compliance gate
    const sendCheck = canSendToContact(contact);
    if (!sendCheck.allowed) {
      await db.from('communications').insert({
        contact_id: contact.id,
        direction: 'outbound',
        channel: 'email',
        body: `[SKIPPED — ${sendCheck.reason}] Would have sent: ${step.name}`,
      });
      return { success: false, error: `Skipped: ${sendCheck.reason}` };
    }

    // Frequency cap
    const capCheck = await checkFrequencyCap(db, contact.id);
    if (!capCheck.allowed) {
      return { success: false, error: `Frequency cap: ${capCheck.reason}` };
    }

    try {
      const emailSubject = subject || step.name;
      const emailType = step.template_id || step.action_type || 'welcome';
      // Apple-quality HTML via email-blocks (18 composable blocks)
      const htmlBody = buildEmailFromType(emailType, contact.name, contact.type, emailSubject, body, variables.agent_name ? `Talk to ${variables.agent_name}` : 'View Details');
      const textBody = generatePlainText(htmlBody);

      const result = await sendEmail({
        to: contact.email,
        subject: emailSubject,
        html: htmlBody,
        text: textBody,
        tags: [
          { name: 'contact_id', value: contact.id },
          { name: 'email_type', value: emailType },
        ],
      });

      // Track in newsletters table
      await db.from('newsletters').insert({
        contact_id: contact.id,
        subject: emailSubject,
        email_type: step.template_id || step.action_type,
        status: 'sent',
        html_body: htmlBody,
        sent_at: new Date().toISOString(),
        resend_message_id: result.id || null,
        send_mode: 'auto',
        ai_context: { source: 'workflow', step_name: step.name, workflow_id: step.workflow_id },
      });

      // Log to communications
      await db.from('communications').insert({
        contact_id: contact.id,
        direction: 'outbound',
        channel: 'email',
        body: `Subject: ${emailSubject}\n\n${body}`,
      });

      return { success: true, result: { channel: 'email', messageId: result.id } };
    } catch (emailErr) {
      await db.from('communications').insert({
        contact_id: contact.id,
        direction: 'outbound',
        channel: 'email',
        body: subject ? `Subject: ${subject}\n\n${body}` : body,
      });
      return { success: true, result: { channel: 'email', logged: true, sendError: String(emailErr) } };
    }
  }

  // SMS or WhatsApp
  try {
    const sid = await sendGenericMessage({ to: contact.phone, channel, body });

    await db.from('communications').insert({
      contact_id: contact.id,
      direction: 'outbound',
      channel,
      body,
    });

    return { success: true, result: { twilio_sid: sid, channel } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function executeManualTask(
  db: SupabaseClient,
  step: StepRow,
  contact: Contact,
  enrollmentId: string
): Promise<StepResult> {
  const taskConfig = step.task_config;

  const { data: task, error } = await db
    .from('tasks')
    .insert({
      contact_id: contact.id,
      title: (taskConfig?.title as string) || step.name,
      priority: (taskConfig?.priority as string) || 'medium',
      category: (taskConfig?.category as string) || 'follow_up',
      status: 'pending',
      notes: `Auto-created by workflow. Enrollment: ${enrollmentId}`,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, result: { task_id: task?.id } };
}

async function executeAutoAlert(
  db: SupabaseClient,
  step: StepRow,
  contact: Contact
): Promise<StepResult> {
  const { error } = await db.from('agent_notifications').insert({
    title: step.name,
    body: `Workflow action for ${contact.name}`,
    type: 'workflow',
    contact_id: contact.id,
    action_url: `/contacts/${contact.id}`,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, result: { notification_created: true } };
}

async function executeSystemAction(
  db: SupabaseClient,
  step: StepRow,
  contact: Contact
): Promise<StepResult> {
  const config = step.action_config;
  const action = config?.action as string;
  const value = config?.value as string;

  if (!action) return { success: false, error: 'No action configured' };

  switch (action) {
    case 'change_lead_status': {
      const { error } = await db
        .from('contacts')
        .update({ lead_status: value })
        .eq('id', contact.id);
      if (error) return { success: false, error: error.message };
      return { success: true, result: { action: 'change_lead_status', value } };
    }
    case 'add_tag': {
      const currentTags = Array.isArray(contact.tags) ? contact.tags : [];
      if (!currentTags.includes(value)) {
        const { error } = await db
          .from('contacts')
          .update({ tags: [...currentTags, value] })
          .eq('id', contact.id);
        if (error) return { success: false, error: error.message };
      }
      return { success: true, result: { action: 'add_tag', value } };
    }
    case 'remove_tag': {
      const tags = Array.isArray(contact.tags) ? contact.tags : [];
      const { error } = await db
        .from('contacts')
        .update({ tags: tags.filter((t: string) => t !== value) })
        .eq('id', contact.id);
      if (error) return { success: false, error: error.message };
      return { success: true, result: { action: 'remove_tag', value } };
    }
    case 'change_stage': {
      const { error } = await db
        .from('contacts')
        .update({ stage_bar: value })
        .eq('id', contact.id);
      if (error) return { success: false, error: error.message };
      return { success: true, result: { action: 'change_stage', value } };
    }
    default:
      return { success: false, error: `Unknown system action: ${action}` };
  }
}

/* ───────────────────────── Step Dispatcher ───────────────────────── */

async function executeStep(
  db: SupabaseClient,
  enrollment: EnrollmentRow,
  step: StepRow
): Promise<StepResult> {
  const { data: contact } = await db
    .from('contacts')
    .select('id, name, phone, email, type, pref_channel, lead_status, tags, stage_bar, newsletter_intelligence, newsletter_unsubscribed, casl_consent_given, casl_consent_date')
    .eq('id', enrollment.contact_id)
    .single();

  if (!contact) return { success: false, error: 'Contact not found' };

  let listing: ListingVars | null = null;
  if (enrollment.listing_id) {
    const { data } = await db
      .from('listings')
      .select('address, list_price, closing_date')
      .eq('id', enrollment.listing_id)
      .maybeSingle();
    listing = data;
  }

  const contactVars: ContactVars = { name: contact.name, phone: contact.phone, email: contact.email };
  const variables = buildVariableContext(contactVars, listing);

  switch (step.action_type) {
    case 'auto_sms':
      return executeAutoMessage(db, step, contact as Contact, variables, 'sms', listing);
    case 'auto_whatsapp':
      return executeAutoMessage(db, step, contact as Contact, variables, 'whatsapp', listing);
    case 'auto_email':
      return executeAutoMessage(db, step, contact as Contact, variables, 'email', listing);
    case 'manual_task':
      return executeManualTask(db, step, contact as Contact, enrollment.id);
    case 'auto_alert':
      return executeAutoAlert(db, step, contact as Contact);
    case 'system_action':
      return executeSystemAction(db, step, contact as Contact);
    case 'wait':
      return { success: true, result: { action: 'wait', skipped: true } };
    default:
      return { success: false, error: `Unknown action type: ${step.action_type}` };
  }
}

/* ───────────────────────── Main Processor ───────────────────────── */

/**
 * Process all active workflow enrollments where next_run_at <= now.
 *
 * This is the function that times out on Vercel (10s limit) when there are
 * >20 enrollments. In the newsletter service there's no timeout — it can
 * process hundreds of enrollments sequentially.
 *
 * Behaviour preservation from CRM original:
 *   - Queries workflow_enrollments with status='active' and next_run_at <= now
 *   - Processes up to 100 enrollments per cycle (CRM: 50)
 *   - Fetches current step, executes it, logs result, advances to next step
 *   - On step failure: doesn't advance (retries on next cycle)
 *   - On no more steps: marks enrollment completed
 *   - On next step found: schedules with delay_minutes offset
 */
export async function processWorkflowQueue(
  db: SupabaseClient
): Promise<{ processed: number; errors: string[] }> {
  const now = new Date().toISOString();
  const errors: string[] = [];
  let processed = 0;

  const { data: pendingEnrollments } = await db
    .from('workflow_enrollments')
    .select('*')
    .eq('status', 'active')
    .lte('next_run_at', now)
    .order('next_run_at', { ascending: true })
    .limit(100);

  if (!pendingEnrollments || pendingEnrollments.length === 0) {
    return { processed: 0, errors: [] };
  }

  logger.info({ count: pendingEnrollments.length }, 'workflow: processing pending enrollments');

  for (const enrollment of pendingEnrollments) {
    const enrollmentLog = logger.child({ enrollmentId: enrollment.id, contactId: enrollment.contact_id });

    try {
      // Get current step
      const { data: step } = await db
        .from('workflow_steps')
        .select('*')
        .eq('workflow_id', enrollment.workflow_id)
        .eq('step_order', enrollment.current_step)
        .single();

      if (!step) {
        await db
          .from('workflow_enrollments')
          .update({ status: 'completed', completed_at: now })
          .eq('id', enrollment.id);
        processed++;
        enrollmentLog.info('workflow: no more steps, enrollment completed');
        continue;
      }

      // Execute the step
      const result = await executeStep(db, enrollment as EnrollmentRow, step as StepRow);

      // Log execution
      await db.from('workflow_step_logs').insert({
        enrollment_id: enrollment.id,
        step_id: step.id,
        status: result.success ? 'sent' : 'failed',
        result: result.result || {},
        error_message: result.error || null,
      });

      await db.from('activity_log').insert({
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
        errors.push(`Enrollment ${enrollment.id} step ${step.step_order}: ${result.error}`);
        enrollmentLog.warn({ error: result.error, stepOrder: step.step_order }, 'workflow: step failed, will retry next cycle');
        continue;
      }

      // Find next step
      const { data: nextStep } = await db
        .from('workflow_steps')
        .select('step_order, delay_minutes')
        .eq('workflow_id', enrollment.workflow_id)
        .gt('step_order', enrollment.current_step)
        .order('step_order', { ascending: true })
        .limit(1)
        .single();

      if (!nextStep) {
        await db
          .from('workflow_enrollments')
          .update({
            status: 'completed',
            completed_at: now,
            current_step: enrollment.current_step + 1,
          })
          .eq('id', enrollment.id);
        enrollmentLog.info('workflow: enrollment completed (all steps done)');
      } else {
        const nextRunAt = new Date(
          Date.now() + (nextStep.delay_minutes || 0) * 60000
        ).toISOString();

        await db
          .from('workflow_enrollments')
          .update({
            current_step: nextStep.step_order,
            next_run_at: nextRunAt,
          })
          .eq('id', enrollment.id);
        enrollmentLog.debug({ nextStep: nextStep.step_order, nextRunAt }, 'workflow: advanced to next step');
      }

      processed++;
    } catch (err) {
      errors.push(`Enrollment ${enrollment.id}: ${String(err)}`);
      enrollmentLog.error({ err }, 'workflow: enrollment processing threw');
    }
  }

  logger.info({ processed, errors: errors.length }, 'workflow: queue processing complete');
  return { processed, errors };
}

/**
 * Check for exit-on-reply conditions. Called when a contact replies.
 */
export async function checkExitOnReply(
  db: SupabaseClient,
  contactId: string
): Promise<void> {
  const { data: enrollments } = await db
    .from('workflow_enrollments')
    .select('id, workflow_id, current_step')
    .eq('contact_id', contactId)
    .eq('status', 'active');

  if (!enrollments || enrollments.length === 0) return;

  for (const enrollment of enrollments) {
    const { data: currentStep } = await db
      .from('workflow_steps')
      .select('exit_on_reply')
      .eq('workflow_id', enrollment.workflow_id)
      .eq('step_order', enrollment.current_step)
      .single();

    if (currentStep?.exit_on_reply) {
      await db
        .from('workflow_enrollments')
        .update({
          status: 'exited',
          exit_reason: 'Contact replied',
          completed_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id);

      await db.from('activity_log').insert({
        contact_id: contactId,
        activity_type: 'workflow_exited',
        description: 'Exited workflow: contact replied',
        metadata: { enrollment_id: enrollment.id },
      });

      logger.info({ enrollmentId: enrollment.id, contactId }, 'workflow: exited on reply');
    }
  }
}
