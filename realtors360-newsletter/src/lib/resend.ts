import { Resend } from 'resend';
import { config } from '../config.js';
import { logger } from './logger.js';

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
 * Sends an email through Resend.
 *
 * Until the realtors360.com domain is verified, all sends are restricted to
 * config.CANARY_TO_EMAIL by Resend itself. We log a warning if any other
 * recipient slips through so misconfiguration is loud.
 */
export async function sendEmail(args: SendArgs): Promise<{ id: string }> {
  if (args.to !== config.CANARY_TO_EMAIL) {
    logger.warn(
      { to: args.to, allowed: config.CANARY_TO_EMAIL },
      'resend: send target differs from CANARY_TO_EMAIL — Resend will reject this until the domain is verified'
    );
  }

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
}
