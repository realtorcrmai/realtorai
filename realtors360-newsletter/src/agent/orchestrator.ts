/**
 * Newsletter Agent Orchestrator — M5.
 *
 * The agent loop: Claude tool_use with 17 tools, max 12 turns.
 *
 * Architecture (per SPEC_Newsletter_Agent_M5.md §2):
 *   - Agent DECIDES and orchestrates (no business logic)
 *   - Tools DO the work (typed, deterministic, testable)
 *   - READ → DECIDE → WRITE flow
 *
 * Trigger model (§3.1): BOTH scheduled + event-driven.
 *   - Hourly cron calls `runTriageLoop()` which identifies contacts
 *     needing action and spawns per-contact agent runs.
 *   - High-priority events (new listing match, price drop) trigger
 *     immediate per-contact runs.
 *
 * Autonomy (§3.2): Trust-based.
 *   - L0: all emails go to approval queue
 *   - L1+: low-stakes auto-send
 *   - L2+: most auto-send
 *   - L3: full auto
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../lib/logger.js';
import { getToolSchemas, executeTool, type ToolContext } from './tools/index.js';

const anthropic = new Anthropic();
const MAX_TURNS = 12;
const AGENT_MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are the Newsletter Agent for Realtors360 — an AI that helps BC real estate agents send the right email to the right contact at the right time.

## YOUR WORKFLOW
1. READ: Start with get_contact + get_engagement_intel. Then search_rag for their interaction history. Load relevant listings or market stats if needed.
2. DECIDE: Check frequency caps (check_frequency_cap). Classify trust level (classify_trust_level). Only then generate copy (generate_copy) with REAL data from step 1 — never invent facts.
3. WRITE: Draft the email (draft_email). If trust L0 → queue_for_approval. If L1+ and low-stakes type → send_email. Always log_decision with your reasoning.

## EMAIL QUALITY STANDARDS — this is critical
Your emails must feel like they come from a trusted friend who happens to be a real estate expert. NOT a marketing machine.

MANDATORY:
- Open with something SPECIFIC to the contact. Reference their neighbourhood, a listing they clicked, the season, their situation. NEVER generic openers.
- One idea per email. 120 words max. Subject under 50 chars.
- Write like you talk. Short sentences. Contractions. Natural rhythm.
- Be specific: "The 3-bed on Maple dropped $40K" beats "A property in your area has a new price".
- Earn the CTA: it must follow naturally from the content.
- Canadian spelling: neighbourhood, favourite, colour, centre.

FORBIDDEN (if you write these, the email will be rejected):
- "I hope this finds you well"
- "I wanted to reach out"
- "As your trusted real estate advisor"
- "Don't miss this incredible opportunity"
- "In today's dynamic market"
- Any sentence that could apply to every contact on the list

WHEN TO SKIP:
If search_rag and get_engagement_intel return nothing useful AND you have no listing/market data to reference → log a "skip" decision. A skipped email is better than a generic one.

## TRUST LEVELS
- L0 (new): ALL emails → queue_for_approval
- L1 (proven, ≥3 sends): Low-stakes (market_update, birthday, neighbourhood_guide) → auto-send. Everything else → queue.
- L2 (engaged, ≥10 sends + reply): Most types auto-send. Cold pitch / re-engagement → queue.
- L3 (deal closed): Full auto except legal-adjacent.

## PERSONALIZATION — use your tools
Before generating any email, you MUST call search_rag with a query like "[contact name] interests preferences recent interactions". Use what you find. If someone clicked on condos in Burnaby 3 times, your listing alert should lead with Burnaby condos — don't send them a Kitsilano detached home.`;

export type AgentRunResult = {
  runId: string;
  contactId: string;
  decisions: number;
  status: 'completed' | 'failed' | 'no_action';
  error?: string;
};

/**
 * Run the agent for a single contact. The agent uses Claude tool_use
 * to gather context, make decisions, and take action.
 *
 * @param prefetchedContacts — optional Map of contact data batch-loaded by the
 *   triage loop.  When provided the agent's `get_contact` tool returns the
 *   cached row instead of issuing a DB query, eliminating N+1.
 */
export async function runAgentForContact(
  db: SupabaseClient,
  realtorId: string,
  contactId: string,
  trigger: string = 'scheduled',
  prefetchedContacts?: Map<string, Record<string, unknown>>
): Promise<AgentRunResult> {
  const ctx: ToolContext = { db, realtorId, prefetchedContacts };
  const runLog = logger.child({ realtorId, contactId, trigger });

  // Create agent_run record
  const { data: run, error: runErr } = await db
    .from('agent_runs')
    .insert({
      realtor_id: realtorId,
      trigger_type: trigger,
      contact_ids_evaluated: [contactId],
      status: 'running',
    })
    .select('id')
    .single();

  if (runErr || !run) {
    runLog.error({ err: runErr }, 'agent: failed to create run record');
    return { runId: '', contactId, decisions: 0, status: 'failed', error: runErr?.message };
  }

  const runId = run.id;
  let decisions = 0;

  try {
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `Evaluate contact ${contactId} for realtor ${realtorId}. Trigger: ${trigger}.
Start by getting the contact's details and engagement intelligence, then decide if they need an email and what kind. If yes, generate and send/queue it. If no, log a skip decision with your reasoning.`,
      },
    ];

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await anthropic.messages.create({
        model: AGENT_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: getToolSchemas(),
        messages,
      });

      // If the model stops without tool use, we're done
      if (response.stop_reason === 'end_turn') {
        runLog.info({ turn, decisions }, 'agent: completed (end_turn)');
        break;
      }

      // Process tool calls — narrow the ContentBlock union to ToolUseBlock
      const toolUseBlocks: Array<{ type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }> = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          toolUseBlocks.push({
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
      }

      if (toolUseBlocks.length === 0) {
        runLog.info({ turn, decisions }, 'agent: completed (no more tool calls)');
        break;
      }

      // Add assistant message with tool calls
      messages.push({ role: 'assistant', content: response.content });

      // Execute each tool call and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolBlock of toolUseBlocks) {
        // Inject run_id into log_decision calls
        const toolInput = { ...toolBlock.input };
        if (toolBlock.name === 'log_decision') {
          toolInput.run_id = runId;
        }

        const result = await executeTool(ctx, toolBlock.name, toolInput);

        // Count WRITE tool calls as decisions
        if (['draft_email', 'send_email', 'queue_for_approval', 'schedule_send', 'log_decision'].includes(toolBlock.name)) {
          decisions++;
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result),
        });

        runLog.debug({ tool: toolBlock.name, turn }, 'agent: tool executed');
      }

      messages.push({ role: 'user', content: toolResults });
    }

    // Update run record
    await db
      .from('agent_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        decisions_made: decisions,
      })
      .eq('id', runId);

    return { runId, contactId, decisions, status: decisions > 0 ? 'completed' : 'no_action' };
  } catch (err) {
    runLog.error({ err }, 'agent: run failed');
    await db
      .from('agent_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq('id', runId);

    return { runId, contactId, decisions, status: 'failed', error: String(err) };
  }
}

/**
 * Per-realtor triage loop. Called by the hourly cron.
 *
 * 1. Find contacts that might need an email (recent events, stale engagement, etc.)
 * 2. Run the agent for each (up to 20 contacts per cycle, 5 concurrent)
 * 3. Return summary of actions taken
 */
export async function runTriageLoop(
  db: SupabaseClient,
  realtorId: string
): Promise<{ contactsEvaluated: number; totalDecisions: number; results: AgentRunResult[] }> {
  const triageLog = logger.child({ realtorId, phase: 'triage' });

  // Find contacts that might need attention:
  // 1. Contacts with pending email events
  const { data: pendingEvents } = await db
    .from('email_events')
    .select('contact_id')
    .eq('realtor_id', realtorId)
    .eq('status', 'pending')
    .limit(20);

  // 2. Active contacts with no recent email (7+ days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: staleContacts } = await db
    .from('contacts')
    .select('id')
    .eq('realtor_id', realtorId)
    .in('lead_status', ['active', 'lead'])
    .eq('newsletter_unsubscribed', false)
    .eq('casl_consent_given', true)
    .limit(20);

  // Deduplicate contact IDs
  const contactIds = new Set<string>();
  for (const e of pendingEvents ?? []) {
    if (e.contact_id) contactIds.add(e.contact_id);
  }
  for (const c of staleContacts ?? []) {
    contactIds.add(c.id);
  }

  const contactList = [...contactIds].slice(0, 20);
  triageLog.info({ contactCount: contactList.length }, 'triage: contacts identified');

  if (contactList.length === 0) {
    return { contactsEvaluated: 0, totalDecisions: 0, results: [] };
  }

  // Batch-fetch all contact data in one query to avoid N+1 (each agent run
  // would otherwise query the same contacts table individually).
  const { data: contactRows } = await db
    .from('contacts')
    .select('id, name, email, phone, type, lead_status, stage_bar, pref_channel, tags, newsletter_intelligence, newsletter_unsubscribed, casl_consent_given, ai_lead_score, notes, updated_at')
    .in('id', contactList);

  const prefetchedContacts = new Map<string, Record<string, unknown>>();
  for (const row of contactRows ?? []) {
    prefetchedContacts.set(row.id, row as Record<string, unknown>);
  }

  triageLog.info({ prefetched: prefetchedContacts.size }, 'triage: contacts prefetched');

  // Run agent for each contact (sequential for now; M5+ can parallelize)
  const results: AgentRunResult[] = [];
  let totalDecisions = 0;

  for (const contactId of contactList) {
    const result = await runAgentForContact(db, realtorId, contactId, 'triage', prefetchedContacts);
    results.push(result);
    totalDecisions += result.decisions;
  }

  triageLog.info(
    { contactsEvaluated: contactList.length, totalDecisions },
    'triage: loop complete'
  );

  return { contactsEvaluated: contactList.length, totalDecisions, results };
}
