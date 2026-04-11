/**
 * Agent Tool Registry — M5.
 *
 * Central registry of all tools the newsletter agent can call via Claude
 * tool_use. Each tool has:
 *   - A typed Zod schema for input validation
 *   - A typed Zod schema for output validation
 *   - A handler function that does the actual work
 *   - A category (READ / DECIDE / WRITE) that determines side-effect rules
 *
 * Per playbook §1.6:
 *   - Agent NEVER contains business logic
 *   - Tool IS the business logic (deterministic function with typed schema)
 *   - Agent ↔ Tool contract uses structured data, not free text
 *
 * READ tools: no side effects, idempotent, can be called multiple times
 * DECIDE tools: pure compute, no I/O (except Claude for generate_copy)
 * WRITE tools: side effects, idempotent via idempotency keys
 */

import type Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../lib/logger.js';
import { captureException } from '../../lib/sentry.js';
import { startTimer } from '../../lib/timer.js';

// READ tools
import { listContacts, LIST_CONTACTS_SCHEMA } from './read/list-contacts.js';
import { getContact, GET_CONTACT_SCHEMA } from './read/get-contact.js';
import { getListings, GET_LISTINGS_SCHEMA } from './read/get-listings.js';
import { searchRag, SEARCH_RAG_SCHEMA } from './read/search-rag.js';
import { getMarketStats, GET_MARKET_STATS_SCHEMA } from './read/get-market-stats.js';
import { getRecentEvents, GET_RECENT_EVENTS_SCHEMA } from './read/get-recent-events.js';
import { getEngagementIntel, GET_ENGAGEMENT_INTEL_SCHEMA } from './read/get-engagement-intel.js';

// DECIDE tools
import { scoreIntent, SCORE_INTENT_SCHEMA } from './decide/score-intent.js';
import { checkFrequencyCap, CHECK_FREQUENCY_CAP_SCHEMA } from './decide/check-frequency-cap.js';
import { pickTemplate, PICK_TEMPLATE_SCHEMA } from './decide/pick-template.js';
import { generateCopy, GENERATE_COPY_SCHEMA } from './decide/generate-copy.js';
import { classifyTrustLevel, CLASSIFY_TRUST_LEVEL_SCHEMA } from './decide/classify-trust-level.js';
import { optimizeSendParams, OPTIMIZE_SEND_PARAMS_SCHEMA } from './decide/optimize-send-params.js';

// WRITE tools
import { draftEmail, DRAFT_EMAIL_SCHEMA } from './write/draft-email.js';
import { queueForApproval, QUEUE_FOR_APPROVAL_SCHEMA } from './write/queue-for-approval.js';
import { sendEmailTool, SEND_EMAIL_SCHEMA } from './write/send-email.js';
import { scheduleSend, SCHEDULE_SEND_SCHEMA } from './write/schedule-send.js';
import { logDecision, LOG_DECISION_SCHEMA } from './write/log-decision.js';
import { abTestSubject, AB_TEST_SUBJECT_SCHEMA } from './write/ab-test-subject.js';

export type ToolContext = {
  db: SupabaseClient;
  realtorId: string;
  /** Prefetched contact data keyed by contact ID — avoids N+1 queries in triage loop. */
  prefetchedContacts?: Map<string, Record<string, unknown>>;
};

export type ToolHandler = (ctx: ToolContext, input: Record<string, unknown>) => Promise<unknown>;

type ToolDef = {
  schema: Anthropic.Tool;
  handler: ToolHandler;
  category: 'read' | 'decide' | 'write';
};

/** All registered tools. */
export const AGENT_TOOLS: Record<string, ToolDef> = {
  list_contacts: { schema: LIST_CONTACTS_SCHEMA, handler: listContacts, category: 'read' },
  get_contact: { schema: GET_CONTACT_SCHEMA, handler: getContact, category: 'read' },
  get_listings: { schema: GET_LISTINGS_SCHEMA, handler: getListings, category: 'read' },
  search_rag: { schema: SEARCH_RAG_SCHEMA, handler: searchRag, category: 'read' },
  get_market_stats: { schema: GET_MARKET_STATS_SCHEMA, handler: getMarketStats, category: 'read' },
  get_recent_events: { schema: GET_RECENT_EVENTS_SCHEMA, handler: getRecentEvents, category: 'read' },
  get_engagement_intel: { schema: GET_ENGAGEMENT_INTEL_SCHEMA, handler: getEngagementIntel, category: 'read' },
  // DECIDE
  score_intent: { schema: SCORE_INTENT_SCHEMA, handler: scoreIntent, category: 'decide' },
  check_frequency_cap: { schema: CHECK_FREQUENCY_CAP_SCHEMA, handler: checkFrequencyCap, category: 'decide' },
  pick_template: { schema: PICK_TEMPLATE_SCHEMA, handler: pickTemplate, category: 'decide' },
  generate_copy: { schema: GENERATE_COPY_SCHEMA, handler: generateCopy, category: 'decide' },
  classify_trust_level: { schema: CLASSIFY_TRUST_LEVEL_SCHEMA, handler: classifyTrustLevel, category: 'decide' },
  optimize_send_params: { schema: OPTIMIZE_SEND_PARAMS_SCHEMA, handler: optimizeSendParams, category: 'decide' },
  // WRITE
  draft_email: { schema: DRAFT_EMAIL_SCHEMA, handler: draftEmail, category: 'write' },
  queue_for_approval: { schema: QUEUE_FOR_APPROVAL_SCHEMA, handler: queueForApproval, category: 'write' },
  send_email: { schema: SEND_EMAIL_SCHEMA, handler: sendEmailTool, category: 'write' },
  schedule_send: { schema: SCHEDULE_SEND_SCHEMA, handler: scheduleSend, category: 'write' },
  log_decision: { schema: LOG_DECISION_SCHEMA, handler: logDecision, category: 'write' },
  ab_test_subject: { schema: AB_TEST_SUBJECT_SCHEMA, handler: abTestSubject, category: 'write' },
};

/** Tool definitions array for Claude API. */
export function getToolSchemas(): Anthropic.Tool[] {
  return Object.values(AGENT_TOOLS).map((t) => t.schema);
}

/** Execute a tool by name. Returns the result or an error object. */
export async function executeTool(
  ctx: ToolContext,
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const tool = AGENT_TOOLS[name];
  if (!tool) {
    logger.warn({ name }, 'agent: unknown tool call');
    return { error: `Unknown tool: ${name}` };
  }

  const elapsed = startTimer();
  try {
    const result = await tool.handler(ctx, input);
    logger.debug({ tool: name, durationMs: elapsed() }, 'agent: tool completed');
    return result;
  } catch (err) {
    logger.error({ err, tool: name, durationMs: elapsed() }, 'agent: tool execution failed');
    captureException(err instanceof Error ? err : new Error(String(err)), { tool: name });
    return { error: `Tool ${name} failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
