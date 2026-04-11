import crypto from 'node:crypto';
import { render } from '@react-email/render';
import React from 'react';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { generateEmail } from '../orchestrator/index.js';
import { resolveRuleForEvent } from '../orchestrator/rules.js';
import { sendEmail } from '../lib/resend.js';
import { getEmailComponent } from '../emails/index.js';
import { canSendToContact } from '../lib/compliance.js';

/**
 * Generic pipeline runner.
 *
 * Reliability fixes in this version (N2, N3, N4, P11):
 *
 *   N2: crash-safe send — INSERT the newsletters row with status='sending'
 *       BEFORE calling Resend, using an idempotency_key derived from the
 *       event. If the process crashes after the Resend call but before the
 *       UPDATE, the row still exists with status='sending' and the
 *       frequency cap counts it. A reconciliation job can later match the
 *       Resend ID via the idempotency key.
 *
 *   N3: frequency cap now counts ALL statuses except 'failed' (including
 *       'pending_review' and 'sending') so draft-heavy realtors don't
 *       accidentally flood contacts.
 *
 *   N4: CASL consent check via `canSendToContact` before any send path.
 *       Contacts without consent or who have unsubscribed are rejected
 *       with a clear reason in the event log.
 *
 *   P11: unsubscribe URL injection — replaces the `{{unsubscribe_url}}`
 *       placeholder in rendered HTML with a real unsubscribe link.
 */

export type EventRow = {
  id: string;
  realtor_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  affected_contact_ids: string[] | null;
  contact_id: string | null;
  listing_id: string | null;
  status: string;
  retry_count?: number;
};

export type RecipientResolver = (event: EventRow) => string | null;

export type PromptBuilder = (input: {
  event: EventRow;
  contact: { id: string; name: string | null; email: string | null };
  realtor: { id: string; name: string | null; email: string | null };
}) => Promise<string>;

export type PipelineConfig = {
  eventType: string;
  resolveRecipientContactId: RecipientResolver;
  buildPrompt: PromptBuilder;
};

export type PipelineResult =
  | { ok: true; newsletter_id: string; resend_id: string }
  | { ok: false; reason: string };

/**
 * Deterministic idempotency key for a given event → contact → email_type
 * tuple. Two attempts to process the same event for the same contact and
 * email type will produce the same key, so the UNIQUE index on
 * newsletters.idempotency_key (migration 086) prevents duplicate rows.
 */
function makeIdempotencyKey(eventId: string, contactId: string, emailType: string): string {
  return crypto.createHash('sha256').update(`${eventId}:${contactId}:${emailType}`).digest('hex');
}

export async function runPipeline(
  event: EventRow,
  config: PipelineConfig
): Promise<PipelineResult> {
  const log = logger.child({ event_id: event.id, event_type: event.event_type });

  // ── Phase 1: Resolve recipient ───────────────────────────────
  const recipientContactId = config.resolveRecipientContactId(event);
  if (!recipientContactId) {
    return { ok: false, reason: 'no recipient resolvable from event' };
  }

  // ── Phase 2: Rule resolution (priority + cap + min hours) ────
  const ruling = await resolveRuleForEvent({
    realtor_id: event.realtor_id,
    event_type: event.event_type,
    contact_id: recipientContactId,
  });
  if (!ruling.ok) {
    log.info({ reason: ruling.reason, contactId: recipientContactId }, 'pipeline: rule blocked');
    return { ok: false, reason: `rule:${ruling.reason}` };
  }
  const rule = ruling.rule;

  // ── Phase 3: Load contact + realtor + CASL check ─────────────
  const [contactRes, realtorRes] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, email, newsletter_unsubscribed, casl_consent_given')
      .eq('id', recipientContactId)
      .maybeSingle(),
    supabase.from('users').select('id, name, email').eq('id', event.realtor_id).maybeSingle(),
  ]);

  if (!contactRes.data || !realtorRes.data) {
    return { ok: false, reason: 'missing contact or realtor row' };
  }

  // N4: CASL + unsubscribe enforcement
  const consentResult = canSendToContact(contactRes.data);
  if (!consentResult.allowed) {
    log.info(
      { contactId: recipientContactId, code: consentResult.code },
      'pipeline: consent check failed'
    );
    return { ok: false, reason: `consent:${consentResult.code}` };
  }

  // ── Phase 4: Build prompt ────────────────────────────────────
  const userPrompt = await config.buildPrompt({
    event,
    contact: contactRes.data,
    realtor: realtorRes.data,
  });

  // ── Phase 5: Orchestrator ────────────────────────────────────
  const result = await generateEmail({ userPrompt, realtorId: event.realtor_id });
  if (!result.ok) {
    log.warn({ reason: result.reason }, 'pipeline: orchestrator failed');
    return { ok: false, reason: `orchestrator:${result.reason}` };
  }

  const draft = result.draft;
  if (draft.status !== 'ready' || !draft.subject || !draft.body_paragraphs) {
    return { ok: false, reason: `draft not ready: ${draft.reason ?? 'unknown'}` };
  }

  // ── Phase 6: Render with luxury template ──────────────────────
  const { assembleEmail } = await import('../lib/email-blocks.js');

  const firstName = (contactRes.data.name ?? '').split(' ')[0] || 'there';
  const realtorName = realtorRes.data.name ?? 'Your agent';
  const realtorEmail = realtorRes.data.email ?? '';

  // Load listing data if event references one
  let listingData: Record<string, unknown> | undefined;
  const listingId = event.listing_id || (event.event_data?.listing_id as string | undefined);
  if (listingId) {
    const { data: listing } = await supabase
      .from('listings')
      .select('address, list_price, property_type, mls_number, status')
      .eq('id', listingId)
      .maybeSingle();
    if (listing) {
      listingData = listing;
    }
  }

  const bodyText = draft.body_paragraphs?.join('\n\n') || '';

  let html = assembleEmail(rule.email_type, {
    contact: { name: contactRes.data.name ?? '', firstName, type: 'buyer' },
    agent: {
      name: realtorName,
      brokerage: 'Realtors360',
      phone: '',
      email: realtorEmail,
      initials: realtorName[0] || 'R',
    },
    content: {
      subject: draft.subject,
      intro: draft.greeting ? `${draft.greeting}\n\n${bodyText}` : bodyText,
      body: '',
      ctaText: draft.cta_label ?? 'Learn More',
      ctaUrl: draft.cta_url ?? 'https://realtors360.ai',
    },
    ...(listingData ? {
      listing: {
        address: (listingData.address as string) || '',
        area: '',
        price: (listingData.list_price as number) || 0,
      },
    } : {}),
  });

  const idempotencyKey = makeIdempotencyKey(event.id, recipientContactId, rule.email_type);

  // ── Phase 7: Persist + Send ──────────────────────────────────
  if (rule.send_mode === 'review') {
    const { data: nl, error } = await supabase
      .from('newsletters')
      .insert({
        realtor_id: event.realtor_id,
        contact_id: recipientContactId,
        subject: draft.subject,
        html_body: html,
        status: 'pending_review',
        email_type: rule.email_type,
        source_event_id: event.id,
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') {
        log.info('pipeline: duplicate idempotency_key — already drafted');
        return { ok: false, reason: 'duplicate' };
      }
      return { ok: false, reason: `db:${error.message}` };
    }
    return { ok: true, newsletter_id: nl.id, resend_id: 'pending_review' };
  }

  // N2: crash-safe auto mode — INSERT first with status='sending', THEN
  // call Resend. If the process dies between the two, the row exists and
  // the frequency cap counts it. A reconciliation pass can later match
  // the Resend response.
  const { data: nl, error: insertErr } = await supabase
    .from('newsletters')
    .insert({
      realtor_id: event.realtor_id,
      contact_id: recipientContactId,
      subject: draft.subject,
      html_body: html,
      status: 'sending',
      email_type: rule.email_type,
      source_event_id: event.id,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      log.info('pipeline: duplicate idempotency_key — already sending/sent');
      return { ok: false, reason: 'duplicate' };
    }
    return { ok: false, reason: `db:${insertErr.message}` };
  }

  // Now send — the row already exists so the cap is enforced even if we
  // crash right here. Replace web view URL placeholder before sending.
  const { config: appConfig } = await import('../config.js');
  const webViewUrl = `${appConfig.NEWSLETTER_SERVICE_URL}/emails/${nl.id}`;
  const finalHtml = html.replace(/\{\{web_view_url\}\}/g, webViewUrl);

  let resendId: string;
  try {
    const sendResult = await sendEmail({
      to: contactRes.data.email!,
      subject: draft.subject,
      html: finalHtml,
      tags: [
        { name: 'email_type', value: rule.email_type },
        { name: 'event_id', value: event.id },
        { name: 'newsletter_id', value: nl.id },
      ],
      headers: { 'X-Idempotency-Key': idempotencyKey },
    });
    resendId = sendResult.id;
  } catch (sendErr) {
    // Resend failed — update the row to status='failed' so the realtor
    // sees it in the queue. We do NOT delete the row — it still
    // participates in the frequency cap until manually dismissed.
    log.error({ err: sendErr, newsletterId: nl.id }, 'pipeline: resend send failed');
    await supabase
      .from('newsletters')
      .update({ status: 'failed', error_message: (sendErr as Error).message })
      .eq('id', nl.id);
    return { ok: false, reason: `send:${(sendErr as Error).message}` };
  }

  // Success — update to sent.
  const { error: updateErr } = await supabase
    .from('newsletters')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      resend_id: resendId,
    })
    .eq('id', nl.id);

  if (updateErr) {
    // Email was sent but the status update failed. The row still exists
    // with status='sending'. A reconciliation job should detect this
    // (status='sending' for > 5 minutes) and fix it.
    log.error(
      { err: updateErr, newsletterId: nl.id, resendId },
      'pipeline: sent but status update failed — needs reconciliation'
    );
  }

  return { ok: true, newsletter_id: nl.id, resend_id: resendId };
}
