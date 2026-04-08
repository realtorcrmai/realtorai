import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export const eventsRouter: Router = Router();

const EventBodySchema = z.object({
  realtor_id: z.string().uuid(),
  event_type: z.string().min(1),
  event_data: z.record(z.string(), z.unknown()).default({}),
  contact_id: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional(),
  affected_contact_ids: z.array(z.string().uuid()).optional(),
});

/**
 * POST /events
 *
 * CRM publishes events here. M1 also allows direct table inserts via the
 * service-role client (the worker polls `email_events` regardless of the
 * publishing path), so this endpoint is the optional fast path.
 *
 * Auth: HMAC-SHA256 signature in `x-newsletter-signature` header, computed
 * over the raw body using NEWSLETTER_SHARED_SECRET.
 */
eventsRouter.post('/events', async (req: Request, res: Response) => {
  // 1. Verify signature (skipped if no secret configured — dev mode)
  if (config.NEWSLETTER_SHARED_SECRET) {
    const sig = req.header('x-newsletter-signature');
    if (!sig) return res.status(401).json({ error: 'missing signature' });

    const expected = crypto
      .createHmac('sha256', config.NEWSLETTER_SHARED_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      logger.warn({ ip: req.ip }, 'events: invalid signature');
      return res.status(401).json({ error: 'invalid signature' });
    }
  }

  // 2. Validate body
  const parsed = EventBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid body', detail: parsed.error.flatten() });
  }

  // 3. Insert into email_events
  const { data, error } = await supabase
    .from('email_events')
    .insert({
      realtor_id: parsed.data.realtor_id,
      event_type: parsed.data.event_type,
      event_data: parsed.data.event_data,
      contact_id: parsed.data.contact_id ?? null,
      listing_id: parsed.data.listing_id ?? null,
      affected_contact_ids: parsed.data.affected_contact_ids ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    logger.error({ err: error }, 'events: insert failed');
    return res.status(500).json({ error: 'insert failed' });
  }

  logger.info({ event_id: data.id, event_type: parsed.data.event_type }, 'events: queued');
  return res.status(202).json({ event_id: data.id });
});
