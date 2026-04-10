import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const OPTIMIZE_SEND_PARAMS_SCHEMA: Anthropic.Tool = {
  name: 'optimize_send_params',
  description:
    'Analyze a contact\'s email engagement history to find the best email type, send time, and send day. Use before generate_copy to pick the right content type and before schedule_send to pick the optimal time.',
  input_schema: {
    type: 'object',
    properties: {
      contact_id: { type: 'string' },
    },
    required: ['contact_id'],
  },
};

type TypePerformance = {
  type: string;
  opens: number;
  clicks: number;
  sends: number;
  rate: number;
};

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const DEFAULTS = {
  best_email_type: 'listing_alert',
  best_send_hour: 9,
  best_send_day: 'tuesday' as string,
};

const MIN_SAMPLE_SIZE = 5;

export async function optimizeSendParams(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const contactId = String(input.contact_id);

  // Fetch all newsletter events for this contact, joined with the newsletter to get email_type
  const { data: events, error } = await ctx.db
    .from('newsletter_events')
    .select('event_type, created_at, newsletter_id, newsletters!inner(email_type)')
    .eq('contact_id', contactId)
    .eq('newsletters.realtor_id', ctx.realtorId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return { error: error.message };

  const sampleSize = events?.length ?? 0;

  if (sampleSize < MIN_SAMPLE_SIZE) {
    return {
      contact_id: contactId,
      ...DEFAULTS,
      type_performance: [],
      sample_size: sampleSize,
      note: `Insufficient data (${sampleSize} events, need ${MIN_SAMPLE_SIZE}). Returning defaults.`,
    };
  }

  // --- Best email type ---
  const typeMap = new Map<string, { opens: number; clicks: number; sends: number }>();

  for (const ev of events!) {
    const newsletters = ev.newsletters as unknown as Record<string, unknown>;
    const emailType = newsletters.email_type as string;
    if (!emailType) continue;
    const entry = typeMap.get(emailType) ?? { opens: 0, clicks: 0, sends: 0 };

    if (ev.event_type === 'open' || ev.event_type === 'opened') entry.opens++;
    if (ev.event_type === 'click' || ev.event_type === 'clicked') entry.clicks++;
    if (ev.event_type === 'send' || ev.event_type === 'sent' || ev.event_type === 'delivered') entry.sends++;

    typeMap.set(emailType, entry);
  }

  const typePerformance: TypePerformance[] = [];
  for (const [type, stats] of typeMap) {
    const denominator = Math.max(stats.sends, 1);
    const rate = (stats.opens + stats.clicks) / denominator;
    typePerformance.push({ type, opens: stats.opens, clicks: stats.clicks, sends: stats.sends, rate });
  }
  typePerformance.sort((a, b) => b.rate - a.rate);

  const bestEmailType = typePerformance.length > 0
    ? typePerformance[0].type
    : DEFAULTS.best_email_type;

  // --- Best send hour and day (from opened events) ---
  const hourCounts = new Map<number, number>();
  const dayCounts = new Map<number, number>();

  for (const ev of events!) {
    if (ev.event_type !== 'open' && ev.event_type !== 'opened') continue;

    const ts = new Date(ev.created_at as string);
    if (isNaN(ts.getTime())) continue;

    const hour = ts.getUTCHours();
    const day = ts.getUTCDay();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  const bestSendHour = hourCounts.size > 0
    ? [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : DEFAULTS.best_send_hour;

  const bestSendDayIdx = dayCounts.size > 0
    ? [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : DAY_NAMES.indexOf(DEFAULTS.best_send_day as typeof DAY_NAMES[number]);

  return {
    contact_id: contactId,
    best_email_type: bestEmailType,
    best_send_hour: bestSendHour,
    best_send_day: DAY_NAMES[bestSendDayIdx],
    type_performance: typePerformance,
    sample_size: sampleSize,
  };
}
