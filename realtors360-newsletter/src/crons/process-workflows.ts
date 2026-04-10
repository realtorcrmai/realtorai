/**
 * Process-workflows cron — M3-E.
 *
 * This is the highest-risk, highest-value cron port. The CRM's
 * `/api/cron/process-workflows` route times out on Vercel at ~20
 * enrollments (10s limit × sequential AI calls). Here we have no
 * timeout constraint — the Node process runs until all enrollments
 * are processed.
 *
 * Schedule: every 2 minutes (matching CRM's vercel.json cron config).
 * Gated on FLAG_PROCESS_WORKFLOWS (default: 'off').
 *
 * When this flag is ON, the CRM's cron should be DISABLED to avoid
 * double-processing. The migration from CRM → newsletter service is:
 *   1. Enable FLAG_PROCESS_WORKFLOWS=on in newsletter service
 *   2. Remove the cron schedule from vercel.json for process-workflows
 *   3. Monitor for 24h
 *   4. Delete the CRM route once confirmed stable
 */

import { config } from '../config.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { processWorkflowQueue } from '../shared/workflow/engine.js';

export async function runProcessWorkflows(): Promise<void> {
  if (config.FLAG_PROCESS_WORKFLOWS !== 'on') {
    logger.debug('cron: process-workflows skipped (FLAG_PROCESS_WORKFLOWS=off)');
    return;
  }

  const start = Date.now();
  logger.info('cron: process-workflows starting');

  try {
    const result = await processWorkflowQueue(supabase);

    logger.info(
      {
        processed: result.processed,
        errors: result.errors.length,
        durationMs: Date.now() - start,
      },
      'cron: process-workflows complete'
    );

    if (result.errors.length > 0) {
      logger.warn(
        { errors: result.errors.slice(0, 10) },
        'cron: process-workflows had errors'
      );
    }
  } catch (err) {
    logger.error({ err, durationMs: Date.now() - start }, 'cron: process-workflows threw');
  }
}
