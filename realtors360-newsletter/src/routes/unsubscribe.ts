import { createHmac } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export const unsubscribeRouter: Router = Router();

const HMAC_SECRET = config.NEWSLETTER_SHARED_SECRET || 'default-dev-secret';

/**
 * Generate a short HMAC token for a contact ID.
 * Used to create tamper-proof unsubscribe links.
 */
function generateToken(contactId: string): string {
  return createHmac('sha256', HMAC_SECRET).update(contactId).digest('hex').slice(0, 16);
}

/**
 * Build the full unsubscribe URL for a given contact.
 * Exported so email rendering code can embed this in outgoing emails.
 */
export function generateUnsubscribeUrl(contactId: string): string {
  const token = generateToken(contactId);
  const base = config.NEWSLETTER_SERVICE_URL.replace(/\/+$/, '');
  return `${base}/unsubscribe/${contactId}/${token}`;
}

/**
 * GET /unsubscribe/:contactId/:token
 *
 * One-click unsubscribe endpoint. Validates the HMAC token, marks the contact
 * as unsubscribed, and returns a simple confirmation HTML page.
 */
unsubscribeRouter.get('/unsubscribe/:contactId/:token', async (req: Request, res: Response) => {
  const log = logger.child({ path: '/unsubscribe' });
  const { contactId, token } = req.params;

  try {
    const expectedToken = generateToken(contactId);

    if (token !== expectedToken) {
      log.warn({ contactId }, 'unsubscribe: invalid token');
      return res.status(400).send(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invalid Link</title></head>' +
          '<body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
          '<h1>Invalid unsubscribe link</h1>' +
          '<p>This link is invalid or has expired. Please contact your realtor directly to manage your email preferences.</p>' +
          '</body></html>'
      );
    }

    const { error } = await supabase
      .from('contacts')
      .update({ newsletter_unsubscribed: true })
      .eq('id', contactId);

    if (error) {
      log.error({ err: error, contactId }, 'unsubscribe: db update failed');
      return res.status(500).send(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head>' +
          '<body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
          '<h1>Something went wrong</h1>' +
          '<p>Please try again later or contact your realtor directly.</p>' +
          '</body></html>'
      );
    }

    // Pause all active journeys for this contact
    await supabase
      .from('contact_journeys')
      .update({ is_paused: true, pause_reason: 'unsubscribed' })
      .eq('contact_id', contactId);

    log.info({ contactId }, 'unsubscribe: contact unsubscribed');

    return res.status(200).send(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title></head>' +
        '<body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
        "<h1>You've been unsubscribed</h1>" +
        "<p>You won't receive further emails. If this was a mistake, please contact your realtor directly.</p>" +
        '</body></html>'
    );
  } catch (err) {
    log.error({ err }, 'unsubscribe: handler error');
    return res.status(500).send(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head>' +
        '<body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
        '<h1>Something went wrong</h1>' +
        '<p>Please try again later.</p>' +
        '</body></html>'
    );
  }
});
