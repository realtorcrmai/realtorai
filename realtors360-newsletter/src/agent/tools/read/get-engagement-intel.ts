import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const GET_ENGAGEMENT_INTEL_SCHEMA: Anthropic.Tool = {
  name: 'get_engagement_intel',
  description:
    'Get detailed engagement intelligence for a contact — content preferences, engagement trend, click history, email stats, and AI lead score. Use to personalize email content and decide send timing.',
  input_schema: {
    type: 'object',
    properties: {
      contact_id: { type: 'string', description: 'UUID of the contact' },
    },
    required: ['contact_id'],
  },
};

export async function getEngagementIntel(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const contactId = String(input.contact_id);

  // Fetch contact intelligence + trust level in parallel
  const [contactRes, trustRes, recentEmailsRes] = await Promise.all([
    ctx.db
      .from('contacts')
      .select('id, name, newsletter_intelligence, ai_lead_score')
      .eq('id', contactId)
      .eq('realtor_id', ctx.realtorId)
      .maybeSingle(),
    ctx.db
      .from('contact_trust_levels')
      .select('level, positive_signals, negative_signals, last_promoted_at')
      .eq('contact_id', contactId)
      .eq('realtor_id', ctx.realtorId)
      .maybeSingle(),
    ctx.db
      .from('newsletters')
      .select('id, email_type, status, sent_at')
      .eq('contact_id', contactId)
      .order('sent_at', { ascending: false })
      .limit(10),
  ]);

  if (contactRes.error || !contactRes.data) {
    return { error: contactRes.error?.message || 'Contact not found' };
  }

  const intel = (contactRes.data.newsletter_intelligence as Record<string, unknown>) ?? {};

  return {
    contact_id: contactId,
    name: contactRes.data.name,
    ai_lead_score: contactRes.data.ai_lead_score,
    trust_level: trustRes.data?.level ?? 0,
    trust_signals: {
      positive: trustRes.data?.positive_signals ?? 0,
      negative: trustRes.data?.negative_signals ?? 0,
      last_promoted: trustRes.data?.last_promoted_at ?? null,
    },
    engagement: {
      trend: intel.engagement_trend ?? 'unknown',
      content_preferences: intel.content_preferences ?? {},
      email_opens: intel.email_opens ?? 0,
      email_clicks: intel.email_clicks ?? 0,
      last_intelligence_update: intel.last_intelligence_update ?? null,
    },
    recent_emails: recentEmailsRes.data?.map((e) => ({
      type: e.email_type,
      status: e.status,
      sent_at: e.sent_at,
    })) ?? [],
  };
}
