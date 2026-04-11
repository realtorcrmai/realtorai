/**
 * Send email with automatic newsletter tracking + web view URL injection.
 *
 * Centralizes the pattern:
 *   1. Pre-insert newsletter row → get ID
 *   2. Replace {{web_view_url}} + {{unsubscribe_url}} placeholders
 *   3. Send via Resend
 *   4. Update newsletter with final status + resend ID
 *
 * Every send path (agent tool, workflow engine, pipeline runner,
 * scheduled send cron) should use this instead of calling sendEmail
 * + inserting newsletters separately.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from './resend.js';
import { config } from '../config.js';
import { logger } from './logger.js';
import { captureException } from './sentry.js';

export type TrackedSendArgs = {
  db: SupabaseClient;
  to: string;
  subject: string;
  html: string;
  text?: string;
  contactId: string;
  realtorId: string;
  emailType: string;
  sendMode: string;
  aiContext?: Record<string, unknown>;
  tags?: Array<{ name: string; value: string }>;
};

export type TrackedSendResult = {
  ok: boolean;
  newsletterId?: string;
  resendId?: string;
  error?: string;
};

export async function sendWithTracking(args: TrackedSendArgs): Promise<TrackedSendResult> {
  const { db, to, subject, contactId, realtorId, emailType, sendMode, aiContext } = args;

  try {
    // 1. Pre-insert newsletter to get ID for web view URL
    const { data: nlRow, error: insertErr } = await db.from('newsletters').insert({
      contact_id: contactId,
      realtor_id: realtorId,
      subject,
      email_type: emailType,
      status: 'sending',
      html_body: args.html,
      send_mode: sendMode,
      ai_context: aiContext || {},
    }).select('id').single();

    if (insertErr || !nlRow) {
      logger.warn({ err: insertErr }, 'send-tracked: newsletter pre-insert failed, sending without tracking');
    }

    // 2. Replace placeholders
    const newsletterId = nlRow?.id || '';
    const webViewUrl = newsletterId ? `${config.NEWSLETTER_SERVICE_URL}/emails/${newsletterId}` : '#';

    let finalHtml = args.html
      .replace(/\{\{web_view_url\}\}/g, webViewUrl)
      .replace(/\{\{unsubscribe_url\}\}/g, `${config.NEWSLETTER_SERVICE_URL}/unsubscribe/${contactId}/${generateToken(contactId)}`);

    // 3. Send via Resend — include RFC 8058 List-Unsubscribe headers
    const unsubscribeUrl = `${config.NEWSLETTER_SERVICE_URL}/unsubscribe/${contactId}/${generateToken(contactId)}`;
    const result = await sendEmail({
      to,
      subject,
      html: finalHtml,
      text: args.text,
      headers: {
        'List-Unsubscribe': `<mailto:unsubscribe@realtors360.ai>, <${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'contact_id', value: contactId },
        { name: 'email_type', value: emailType },
        ...(newsletterId ? [{ name: 'newsletter_id', value: newsletterId }] : []),
        ...(args.tags || []),
      ],
    });

    // 4. Update newsletter with final status
    if (newsletterId) {
      await db.from('newsletters').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        resend_message_id: result.id,
        html_body: finalHtml,
      }).eq('id', newsletterId);
    }

    return { ok: true, newsletterId, resendId: result.id };
  } catch (err) {
    logger.error({ err, contactId, emailType }, 'send-tracked: send failed');
    captureException(err instanceof Error ? err : new Error(String(err)), { contactId, emailType });
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Simple HMAC token for unsubscribe URLs
function generateToken(contactId: string): string {
  const crypto = require('node:crypto');
  const secret = config.NEWSLETTER_SHARED_SECRET || 'default-dev-secret';
  return crypto.createHmac('sha256', secret).update(contactId).digest('hex').slice(0, 16);
}
