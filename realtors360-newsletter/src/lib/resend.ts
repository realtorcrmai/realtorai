import { Resend } from 'resend';
import { config } from '../config.js';
import { logger } from './logger.js';
import { resendBreaker } from './circuit-breaker.js';

export const resend = new Resend(config.RESEND_API_KEY);

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: { name: string; value: string }[];
  headers?: Record<string, string>;
};

/**
 * Sends an email through Resend, wrapped in the circuit breaker (A4).
 *
 * P5 fix: in non-production environments, hard-reject any `to` address that
 * isn't the configured CANARY_TO_EMAIL. The old code only logged a warning
 * and still attempted the send — relying on Resend's domain restriction as
 * the safety net, which silently becomes a no-op the moment someone verifies
 * a domain in the Resend dashboard.
 */
export async function sendEmail(args: SendArgs): Promise<{ id: string }> {
  // P5: hard enforcement of canary in non-production.
  if (config.NODE_ENV !== 'production' && args.to !== config.CANARY_TO_EMAIL) {
    const msg = `Refusing to send to non-canary address in ${config.NODE_ENV}: ${args.to} (allowed: ${config.CANARY_TO_EMAIL})`;
    logger.error({ to: args.to }, msg);
    throw new Error(msg);
  }

  return resendBreaker.call(async () => {
    const result = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      tags: args.tags,
      headers: args.headers,
    });

    if (result.error) {
      logger.error({ err: result.error, to: args.to }, 'resend: send failed');
      throw new Error(`Resend send failed: ${result.error.message}`);
    }

    if (!result.data?.id) {
      throw new Error('Resend send returned no id');
    }

    return { id: result.data.id };
  });
}
