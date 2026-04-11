import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const CHECK_FREQUENCY_CAP_SCHEMA: Anthropic.Tool = {
  name: 'check_frequency_cap',
  description:
    'Check if sending another email to this contact would exceed frequency caps. Returns whether sending is allowed, when the last email was sent, and remaining cap for the week.',
  input_schema: {
    type: 'object',
    properties: {
      contact_id: { type: 'string' },
      email_type: { type: 'string', description: 'Type of email being considered' },
    },
    required: ['contact_id'],
  },
};

export async function checkFrequencyCap(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const contactId = String(input.contact_id);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [dailyRes, weeklyRes, lastSentRes] = await Promise.all([
    ctx.db.from('newsletters').select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId).eq('realtor_id', ctx.realtorId).eq('status', 'sent').gte('sent_at', oneDayAgo),
    ctx.db.from('newsletters').select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId).eq('realtor_id', ctx.realtorId).eq('status', 'sent').gte('sent_at', sevenDaysAgo),
    ctx.db.from('newsletters').select('sent_at')
      .eq('contact_id', contactId).eq('realtor_id', ctx.realtorId).eq('status', 'sent')
      .order('sent_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  // Fail-safe: if any query errors, assume cap NOT reached (don't block sends on infra failure)
  if (dailyRes.error || weeklyRes.error) {
    return { contact_id: contactId, allowed: true, daily: { sent: 0, cap: 2, remaining: 2 }, weekly: { sent: 0, cap: 5, remaining: 5 }, last_sent_at: null, warning: 'frequency cap query failed — allowing send' };
  }
  const dailyCount = dailyRes.count ?? 0;
  const weeklyCount = weeklyRes.count ?? 0;
  const DAILY_CAP = 2;
  const WEEKLY_CAP = 5;

  return {
    contact_id: contactId,
    allowed: dailyCount < DAILY_CAP && weeklyCount < WEEKLY_CAP,
    daily: { sent: dailyCount, cap: DAILY_CAP, remaining: Math.max(0, DAILY_CAP - dailyCount) },
    weekly: { sent: weeklyCount, cap: WEEKLY_CAP, remaining: Math.max(0, WEEKLY_CAP - weeklyCount) },
    last_sent_at: lastSentRes.data?.sent_at ?? null,
  };
}
