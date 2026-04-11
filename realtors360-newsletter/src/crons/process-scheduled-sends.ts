/**
 * Process Scheduled Sends Cron.
 *
 * Runs every 5 minutes. Picks up agent_drafts with status='approved'
 * and scheduled_send_at <= now(), validates CASL compliance, sends via
 * Resend, and tracks in the newsletters table.
 *
 * No feature flag needed — only processes drafts that were explicitly
 * approved and scheduled by the agent or a realtor.
 *
 * Follows the same send pattern as agent/tools/write/send-email.ts:
 * compliance check -> Resend send -> update draft -> track in newsletters.
 */

import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { captureException } from '../lib/sentry.js';
import { canSendToContact } from '../lib/compliance.js';
import { sendWithTracking } from '../lib/send-with-tracking.js';

export async function runProcessScheduledSends(): Promise<void> {
  const start = Date.now();
  logger.info('cron: process-scheduled-sends starting');

  try {
    // Fetch all approved drafts whose scheduled time has arrived
    const { data: drafts, error: fetchErr } = await supabase
      .from('agent_drafts')
      .select('*')
      .eq('status', 'approved')
      .lte('scheduled_send_at', new Date().toISOString())
      .order('scheduled_send_at', { ascending: true });

    if (fetchErr) {
      logger.error({ err: fetchErr }, 'cron: process-scheduled-sends — failed to fetch drafts');
      return;
    }

    if (!drafts || drafts.length === 0) {
      logger.debug('cron: process-scheduled-sends — no drafts due');
      return;
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const draft of drafts) {
      try {
        // Load contact for compliance check
        const { data: contact, error: contactErr } = await supabase
          .from('contacts')
          .select('id, email, newsletter_unsubscribed, casl_consent_given')
          .eq('id', draft.contact_id)
          .maybeSingle();

        if (contactErr || !contact) {
          logger.warn(
            { draftId: draft.id, contactId: draft.contact_id, err: contactErr?.message },
            'cron: process-scheduled-sends — contact not found, skipping'
          );
          skipped++;
          continue;
        }

        // CASL compliance gate
        const sendCheck = canSendToContact(contact);
        if (!sendCheck.allowed) {
          logger.info(
            { draftId: draft.id, contactId: draft.contact_id, reason: sendCheck.reason },
            'cron: process-scheduled-sends — compliance rejected, marking draft rejected'
          );
          await supabase
            .from('agent_drafts')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', draft.id);
          skipped++;
          continue;
        }

        // Send with tracking (handles newsletter insert + web view URL + unsubscribe URL)
        const tracked = await sendWithTracking({
          db: supabase,
          to: contact.email!,
          subject: draft.subject,
          html: draft.body_html,
          text: draft.body_text || undefined,
          contactId: draft.contact_id,
          realtorId: draft.realtor_id,
          emailType: draft.email_type,
          sendMode: 'agent_scheduled',
          aiContext: { source: 'scheduled_send', draft_id: draft.id },
          tags: [{ name: 'draft_id', value: draft.id }],
        });

        const now = new Date().toISOString();

        if (!tracked.ok) {
          await supabase.from('agent_drafts').update({ status: 'failed', updated_at: now }).eq('id', draft.id);
          logger.warn({ draftId: draft.id, error: tracked.error }, 'scheduled-send: send failed');
          continue;
        }

        // Update draft status to sent
        await supabase
          .from('agent_drafts')
          .update({
            status: 'sent',
            sent_at: now,
            resend_message_id: tracked.resendId,
            updated_at: now,
          })
          .eq('id', draft.id);

        logger.info(
          { draftId: draft.id, contactId: draft.contact_id, resendId: tracked.resendId },
          'cron: process-scheduled-sends — email sent'
        );
        sent++;
      } catch (err) {
        logger.error(
          { err, draftId: draft.id, contactId: draft.contact_id },
          'cron: process-scheduled-sends — send failed, continuing'
        );
        captureException(err instanceof Error ? err : new Error(String(err)), { cron: 'process-scheduled-sends', draftId: draft.id });
        failed++;
      }
    }

    logger.info(
      {
        total: drafts.length,
        sent,
        skipped,
        failed,
        durationMs: Date.now() - start,
      },
      'cron: process-scheduled-sends complete'
    );
  } catch (err) {
    logger.error({ err, durationMs: Date.now() - start }, 'cron: process-scheduled-sends threw');
    captureException(err instanceof Error ? err : new Error(String(err)), { cron: 'process-scheduled-sends' });
  }
}
