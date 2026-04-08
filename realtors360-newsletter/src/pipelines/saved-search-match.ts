import { render } from '@react-email/render';
import React from 'react';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { generateEmail } from '../orchestrator/index.js';
import { resolveRuleForEvent } from '../orchestrator/rules.js';
import { buildSavedSearchUserPrompt } from '../orchestrator/prompts.js';
import { sendEmail } from '../lib/resend.js';
import { SavedSearchMatchEmail } from '../emails/SavedSearchMatchEmail.js';

/**
 * Saved-search-match pipeline.
 *
 * Input: an `email_events` row of type `listing_matched_search` with
 * event_data = { listing_id, contact_id, match_count }
 *
 * Steps:
 *   1. Resolve rule (priority + cap + min hours)
 *   2. Load contact + listing + realtor
 *   3. Call orchestrator to generate the email body
 *   4. Render React Email → HTML
 *   5. Send via Resend
 *   6. Insert newsletters row, mark email_event processed
 */

export type EventRow = {
  id: string;
  realtor_id: string;
  event_type: string;
  event_data: { listing_id?: string; contact_id?: string; match_count?: number };
  contact_id: string | null;
  listing_id: string | null;
  status: string;
};

export type PipelineResult =
  | { ok: true; newsletter_id: string; resend_id: string }
  | { ok: false; reason: string };

export async function runSavedSearchMatch(event: EventRow): Promise<PipelineResult> {
  if (config.FLAG_SAVED_SEARCH !== 'on') {
    return { ok: false, reason: 'flag disabled' };
  }

  const contactId = event.contact_id ?? event.event_data.contact_id;
  const listingId = event.listing_id ?? event.event_data.listing_id;
  if (!contactId || !listingId) return { ok: false, reason: 'missing contact_id or listing_id' };

  // 1. Rule resolution
  const ruling = await resolveRuleForEvent({
    realtor_id: event.realtor_id,
    event_type: event.event_type,
    contact_id: contactId,
  });
  if (!ruling.ok) {
    logger.info({ reason: ruling.reason }, 'pipeline: rule blocked send');
    return { ok: false, reason: `rule:${ruling.reason}` };
  }
  const rule = ruling.rule;

  // 2. Load context for the prompt
  const [contactRes, listingRes, realtorRes] = await Promise.all([
    supabase.from('contacts').select('id, name, email').eq('id', contactId).maybeSingle(),
    supabase.from('listings').select('id, address, list_price').eq('id', listingId).maybeSingle(),
    supabase.from('users').select('id, name, email').eq('id', event.realtor_id).maybeSingle(),
  ]);

  if (!contactRes.data || !listingRes.data || !realtorRes.data) {
    return { ok: false, reason: 'missing contact/listing/realtor row' };
  }
  if (!contactRes.data.email) return { ok: false, reason: 'contact has no email' };

  const firstName = (contactRes.data.name ?? '').split(' ')[0] || 'there';
  const realtorName = realtorRes.data.name ?? 'Your agent';

  // 3. Orchestrator
  const userPrompt = buildSavedSearchUserPrompt({
    contactFirstName: firstName,
    realtorName,
    matchedListingAddress: listingRes.data.address,
    matchCount: event.event_data.match_count ?? 1,
  });

  const result = await generateEmail({ userPrompt });
  if (!result.ok) {
    logger.warn({ reason: result.reason }, 'pipeline: orchestrator did not produce a draft');
    return { ok: false, reason: `orchestrator:${result.reason}` };
  }

  const draft = result.draft;
  if (draft.status !== 'ready' || !draft.subject || !draft.body_paragraphs) {
    return { ok: false, reason: `draft not ready: ${draft.reason ?? 'unknown'}` };
  }

  // 4. Render
  const html = await render(
    React.createElement(SavedSearchMatchEmail, {
      preheader: draft.preheader ?? draft.subject,
      greeting: draft.greeting ?? `Hi ${firstName},`,
      bodyParagraphs: draft.body_paragraphs,
      ctaLabel: draft.cta_label ?? 'View listing',
      ctaUrl: draft.cta_url ?? `https://realtors360.com/listings/${listingId}`,
      signoff: draft.signoff ?? `— ${realtorName}`,
      realtorName,
    })
  );

  // 5. Send mode handling
  if (rule.send_mode === 'review') {
    const { data: nl, error } = await supabase
      .from('newsletters')
      .insert({
        realtor_id: event.realtor_id,
        contact_id: contactId,
        subject: draft.subject,
        html_body: html,
        status: 'pending_review',
        email_type: rule.email_type,
        source_event_id: event.id,
      })
      .select('id')
      .single();
    if (error) return { ok: false, reason: `db:${error.message}` };
    return { ok: true, newsletter_id: nl.id, resend_id: 'pending_review' };
  }

  // auto mode
  const sendResult = await sendEmail({
    to: contactRes.data.email,
    subject: draft.subject,
    html,
    tags: [
      { name: 'email_type', value: rule.email_type },
      { name: 'event_id', value: event.id },
    ],
  });

  const { data: nl, error } = await supabase
    .from('newsletters')
    .insert({
      realtor_id: event.realtor_id,
      contact_id: contactId,
      subject: draft.subject,
      html_body: html,
      status: 'sent',
      sent_at: new Date().toISOString(),
      resend_id: sendResult.id,
      email_type: rule.email_type,
      source_event_id: event.id,
    })
    .select('id')
    .single();

  if (error) {
    logger.error({ err: error }, 'pipeline: insert newsletter failed (email already sent)');
    return { ok: false, reason: `db_after_send:${error.message}` };
  }

  return { ok: true, newsletter_id: nl.id, resend_id: sendResult.id };
}
