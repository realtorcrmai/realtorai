import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';
import { logger } from '../../../lib/logger.js';

export const QUEUE_FOR_APPROVAL_SCHEMA: Anthropic.Tool = {
  name: 'queue_for_approval',
  description:
    'Queue an email draft for realtor approval. The draft will appear in the CRM approval queue at /newsletters/queue. Use this for L0 contacts or high-stakes email types.',
  input_schema: {
    type: 'object',
    properties: {
      draft_id: { type: 'string', description: 'UUID of the draft from draft_email' },
      urgency: { type: 'string', enum: ['low', 'normal', 'high'], description: 'How urgently the realtor should review this' },
    },
    required: ['draft_id'],
  },
};

export async function queueForApproval(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const draftId = String(input.draft_id);
  const urgency = String(input.urgency || 'normal');

  const { error } = await ctx.db
    .from('agent_drafts')
    .update({
      status: 'pending_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('realtor_id', ctx.realtorId);

  if (error) return { error: error.message };
  logger.info({ draftId, urgency }, 'queue_for_approval: draft queued');
  return { draft_id: draftId, status: 'pending_review', urgency };
}
