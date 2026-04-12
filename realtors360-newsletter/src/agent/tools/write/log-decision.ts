import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';
import { logger } from '../../../lib/logger.js';

export const LOG_DECISION_SCHEMA: Anthropic.Tool = {
  name: 'log_decision',
  description:
    'Log an agent decision to the audit trail. Every significant decision (send, skip, defer, queue) should be logged with reasoning so the realtor can review the agent\'s behavior.',
  input_schema: {
    type: 'object',
    properties: {
      run_id: { type: 'string', description: 'UUID of the current agent run (from orchestrator)' },
      contact_id: { type: 'string' },
      decision_type: { type: 'string', enum: ['send_email', 'skip', 'defer', 'queue_approval'] },
      reasoning: { type: 'string', description: 'Why this decision was made' },
      tool_calls: {
        type: 'array',
        items: { type: 'object' },
        description: 'Summary of tool calls that led to this decision',
      },
    },
    required: ['contact_id', 'decision_type', 'reasoning'],
  },
};

export async function logDecision(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const { data: decision, error } = await ctx.db
    .from('agent_decisions')
    .insert({
      run_id: input.run_id ? String(input.run_id) : null,
      realtor_id: ctx.realtorId,
      contact_id: String(input.contact_id),
      decision_type: String(input.decision_type),
      reasoning: String(input.reasoning),
      tool_calls: (input.tool_calls as object[]) ?? [],
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  logger.info({ decisionId: decision.id, contactId: String(input.contact_id), type: String(input.decision_type) }, 'log_decision: recorded');
  return { decision_id: decision.id, logged: true };
}
