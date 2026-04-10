import { createHmac } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export const webhooksRouter: Router = Router();

/**
 * POST /webhooks/resend
 *
 * N5: Full port of the CRM's `api/webhooks/resend/route.ts`.
 * Handles Resend webhook events: delivered, opened, clicked, bounced, complained.
 *
 * Svix signature verification (same algorithm as Resend docs).
 * Click classification with 11 intent categories.
 * Contact intelligence update on engagement events.
 * Auto-unsubscribe on bounce/complaint.
 */

// ── Click classification ───────────────────────────────────────

interface ClickClassification {
  type: string;
  score_impact: number;
}

const CLICK_CATEGORIES: Array<{ type: string; score_impact: number; patterns: string[] }> = [
  { type: 'book_showing', score_impact: 30, patterns: ['/book-showing', '/schedule-viewing'] },
  { type: 'get_cma', score_impact: 30, patterns: ['/cma', '/home-value', '/what-is-my-home-worth'] },
  { type: 'mortgage_calc', score_impact: 20, patterns: ['/mortgage', '/calculator', '/pre-approval'] },
  { type: 'listing', score_impact: 15, patterns: ['/listing/', '/listings/', '/property/', '/homes/'] },
  { type: 'investment', score_impact: 15, patterns: ['/investment', '/rental', '/yield', '/cap-rate'] },
  { type: 'open_house_rsvp', score_impact: 15, patterns: ['/open-house', '/rsvp'] },
  { type: 'school_info', score_impact: 10, patterns: ['/school', '/education'] },
  { type: 'market_stats', score_impact: 10, patterns: ['/market', '/stats', '/report'] },
  { type: 'neighbourhood', score_impact: 10, patterns: ['/neighbourhood', '/neighborhood', '/area-guide'] },
  { type: 'price_drop', score_impact: 10, patterns: ['/price-drop', '/reduced'] },
  { type: 'forwarded', score_impact: 5, patterns: ['/forward', '/share'] },
];

function classifyClick(url: string): ClickClassification {
  const lower = url.toLowerCase();
  for (const cat of CLICK_CATEGORIES) {
    if (cat.patterns.some((p) => lower.includes(p))) {
      return { type: cat.type, score_impact: cat.score_impact };
    }
  }
  return { type: 'other', score_impact: 5 };
}

// ── Engagement intelligence update ─────────────────────────────

async function updateContactIntelligence(
  contactId: string,
  eventType: string,
  linkType: string | null,
  linkUrl: string | null
): Promise<void> {
  const { data: contact } = await supabase
    .from('contacts')
    .select('newsletter_intelligence')
    .eq('id', contactId)
    .maybeSingle();

  const intel: Record<string, unknown> = (contact?.newsletter_intelligence as Record<string, unknown>) ?? {};

  if (eventType === 'opened') {
    intel.total_opens = ((intel.total_opens as number) ?? 0) + 1;
    intel.last_opened = new Date().toISOString();
  }

  if (eventType === 'clicked') {
    intel.total_clicks = ((intel.total_clicks as number) ?? 0) + 1;
    intel.last_clicked = new Date().toISOString();

    // Click history (keep last 50)
    const clickHistory = (intel.click_history as Array<Record<string, string>>) ?? [];
    clickHistory.push({
      link_type: linkType ?? 'other',
      link_url: linkUrl ?? '',
      clicked_at: new Date().toISOString(),
    });
    if (clickHistory.length > 50) clickHistory.splice(0, clickHistory.length - 50);
    intel.click_history = clickHistory;

    // Inferred interests
    const interests = (intel.inferred_interests as Record<string, string[]>) ?? {
      areas: [],
      property_types: [],
      lifestyle_tags: [],
    };
    const tags = interests.lifestyle_tags ?? [];
    if (linkType === 'school_info' && !tags.includes('family')) tags.push('family');
    if (linkType === 'listing' && !tags.includes('active_searcher')) tags.push('active_searcher');
    if (linkType === 'get_cma' && !tags.includes('considering_selling')) tags.push('considering_selling');
    interests.lifestyle_tags = tags;
    intel.inferred_interests = interests;

    if (linkType === 'market_stats') intel.content_preference = 'data_driven';
    if (linkType === 'neighbourhood') intel.content_preference = 'lifestyle';
  }

  // Engagement score (0-100)
  const opens = (intel.total_opens as number) ?? 0;
  const clicks = (intel.total_clicks as number) ?? 0;
  const lastClicked = intel.last_clicked ? new Date(intel.last_clicked as string).getTime() : 0;
  const lastOpened = intel.last_opened ? new Date(intel.last_opened as string).getTime() : 0;
  const lastEngagement = Math.max(lastClicked, lastOpened);
  const recencyDays = lastEngagement > 0 ? Math.floor((Date.now() - lastEngagement) / 86_400_000) : 999;

  intel.engagement_score = Math.min(
    100,
    Math.round(
      Math.min(opens, 20) * 2 +
        Math.min(clicks, 15) * 3 +
        (recencyDays < 7 ? 15 : recencyDays < 30 ? 10 : recencyDays < 90 ? 5 : 0)
    )
  );

  await supabase.from('contacts').update({ newsletter_intelligence: intel }).eq('id', contactId);
}

// ── Svix signature verification ────────────────────────────────

function verifySvixSignature(rawBody: string, headers: Request['headers']): boolean {
  const secret = config.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification if no secret configured (dev mode)

  const signature = headers['svix-signature'] as string | undefined;
  const svixId = (headers['svix-id'] as string) ?? '';
  const svixTimestamp = (headers['svix-timestamp'] as string) ?? '';

  if (!signature) return false;

  const signPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expectedSigs = signature.split(' ');

  return expectedSigs.some((sig) => {
    const [, hash] = sig.split(',');
    if (!hash) return false;
    const secretBytes = Buffer.from(secret.replace('whsec_', ''), 'base64');
    const computed = createHmac('sha256', secretBytes).update(signPayload).digest('base64');
    return computed === hash;
  });
}

// ── Route handler ──────────────────────────────────────────────

const EVENT_TYPE_MAP: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};

webhooksRouter.post('/webhooks/resend', async (req: Request, res: Response) => {
  const log = logger.child({ path: '/webhooks/resend' });

  try {
    // N8 partial: Resend webhooks use svix which has its own signature
    // scheme (not raw-body HMAC). The raw body capture is handled by
    // express middleware in server.ts.
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);

    if (!verifySvixSignature(rawBody, req.headers)) {
      log.warn('webhook: svix signature verification failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { type, data } = body as { type?: string; data?: Record<string, unknown> };

    if (!type || !data) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Extract newsletter_id from Resend tags
    const tags = (data.tags ?? []) as Array<{ name: string; value: string }>;
    const newsletterId = tags.find((t) => t.name === 'newsletter_id')?.value;
    if (!newsletterId) {
      return res.json({ ok: true }); // Not a newsletter email — nothing to do
    }

    // Look up newsletter + contact
    const { data: newsletter } = await supabase
      .from('newsletters')
      .select('contact_id, email_type')
      .eq('id', newsletterId)
      .maybeSingle();

    if (!newsletter) {
      log.warn({ newsletterId }, 'webhook: unknown newsletter_id');
      return res.json({ ok: true });
    }

    const contactId = newsletter.contact_id as string;
    const eventType = EVENT_TYPE_MAP[type];
    if (!eventType) {
      return res.json({ ok: true }); // Event type we don't handle
    }

    // Deduplicate events (same event within 60s window)
    const dedupeWindow = new Date(Date.now() - 60_000).toISOString();
    const clickData = data.click as Record<string, string> | undefined;
    const { data: existingEvent } = await supabase
      .from('newsletter_events')
      .select('id')
      .eq('newsletter_id', newsletterId)
      .eq('event_type', eventType)
      .eq('link_url', clickData?.link ?? '')
      .gte('created_at', dedupeWindow)
      .limit(1)
      .maybeSingle();

    if (existingEvent) {
      return res.json({ ok: true }); // Already processed
    }

    // Classify click
    let linkUrl: string | null = null;
    let linkType: string | null = null;
    let scoreImpact = 0;
    if (eventType === 'clicked' && clickData?.link) {
      linkUrl = clickData.link;
      const classification = classifyClick(linkUrl);
      linkType = classification.type;
      scoreImpact = classification.score_impact;
    }

    // Log event to newsletter_events
    const { error: insertErr } = await supabase.from('newsletter_events').insert({
      newsletter_id: newsletterId,
      contact_id: contactId,
      event_type: eventType,
      link_url: linkUrl,
      link_type: linkType,
      metadata: {
        resend_event_id: data.email_id,
        timestamp: data.created_at,
        ip: clickData?.ipAddress,
        user_agent: clickData?.userAgent,
        email_type: newsletter.email_type,
        ...(eventType === 'clicked' && linkType
          ? { click_classification: linkType, score_impact: scoreImpact }
          : {}),
      },
    });

    if (insertErr) {
      log.error({ err: insertErr }, 'webhook: event insert failed');
      return res.status(500).json({ error: 'insert failed' });
    }

    // Update contact intelligence on engagement events
    if (eventType === 'opened' || eventType === 'clicked') {
      await updateContactIntelligence(contactId, eventType, linkType, linkUrl);
    }

    // Handle bounce — auto-unsubscribe
    if (eventType === 'bounced' || eventType === 'complained') {
      await supabase
        .from('contacts')
        .update({ newsletter_unsubscribed: true })
        .eq('id', contactId);

      // Pause all journeys for this contact
      await supabase
        .from('contact_journeys')
        .update({ is_paused: true, pause_reason: eventType })
        .eq('contact_id', contactId);
    }

    log.info({ eventType, contactId, newsletterId }, 'webhook: processed');
    return res.json({ ok: true });
  } catch (err) {
    log.error({ err }, 'webhook: handler error');
    return res.status(500).json({ error: 'Internal error' });
  }
});
