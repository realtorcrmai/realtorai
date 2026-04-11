/**
 * Agent Triage Cron — M5.
 *
 * Runs the newsletter agent's per-realtor triage loop hourly.
 * For each realtor with an active config, identifies contacts
 * needing attention and spawns per-contact agent runs.
 *
 * Gated on FLAG_AGENT_TRIAGE (default: 'off').
 */

import { config } from '../config.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { runTriageLoop } from '../agent/orchestrator.js';

export async function runAgentTriage(): Promise<void> {
  if (config.FLAG_AGENT_TRIAGE !== 'on') {
    logger.debug('cron: agent-triage skipped (FLAG_AGENT_TRIAGE=off)');
    return;
  }

  const start = Date.now();
  logger.info('cron: agent-triage starting');

  try {
    // Get all realtors with active agent config
    const { data: configs } = await supabase
      .from('realtor_agent_config')
      .select('realtor_id');

    const realtorIds = configs?.map((c) => c.realtor_id) ?? [];

    if (realtorIds.length === 0) {
      logger.info('cron: agent-triage — no realtor configs found');
      return;
    }

    let totalContacts = 0;
    let totalDecisions = 0;

    for (const realtorId of realtorIds) {
      try {
        const result = await runTriageLoop(supabase, realtorId);
        totalContacts += result.contactsEvaluated;
        totalDecisions += result.totalDecisions;
      } catch (err) {
        logger.error({ err, realtorId }, 'cron: agent-triage failed for realtor');
      }
    }

    logger.info(
      {
        realtors: realtorIds.length,
        totalContacts,
        totalDecisions,
        durationMs: Date.now() - start,
      },
      'cron: agent-triage complete'
    );
  } catch (err) {
    logger.error({ err, durationMs: Date.now() - start }, 'cron: agent-triage threw');
  }
}
