import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const SCHEDULE_SEND_SCHEMA: Anthropic.Tool = {
  name: 'schedule_send',
  description:
    'Schedule a draft to be sent at a future time. The draft will be sent automatically when the scheduled time arrives (processed by the next cron tick).',
  input_schema: {
    type: 'object',
    properties: {
      draft_id: { type: 'string' },
      send_at: { type: 'string', description: 'ISO datetime for when to send, e.g. "2026-04-15T09:00:00-07:00"' },
    },
    required: ['draft_id', 'send_at'],
  },
};

export async function scheduleSend(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const draftId = String(input.draft_id);
  const sendAt = String(input.send_at);

  const { error } = await ctx.db
    .from('agent_drafts')
    .update({
      status: 'approved',
      scheduled_send_at: sendAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('realtor_id', ctx.realtorId);

  if (error) return { error: error.message };
  return { draft_id: draftId, status: 'scheduled', send_at: sendAt };
}
