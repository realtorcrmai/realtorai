import { Router, type Request, type Response } from 'express';
import { logger } from '../lib/logger.js';

export const webhooksRouter: Router = Router();

/**
 * POST /webhooks/resend
 *
 * M1 stub. The CRM already handles Resend webhooks at
 * `realestate-crm/src/app/api/webhooks/resend/route.ts` and writes to
 * `newsletter_events`. M2 will move that handler here so engagement data
 * lands directly on the same service that generates the email.
 */
webhooksRouter.post('/webhooks/resend', async (_req: Request, res: Response) => {
  logger.info('webhooks/resend: received (M1 stub — no-op)');
  res.status(200).json({ ok: true, note: 'M1 stub' });
});
