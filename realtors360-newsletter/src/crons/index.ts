import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { checkSavedSearches } from './check-saved-searches.js';

/**
 * Cron registry.
 *
 * M1 ships one job: check-saved-searches every 15 minutes.
 * M3 will add migrated CRM crons (process-workflows, agent-scoring, etc).
 */
export function startCrons(): void {
  cron.schedule('*/15 * * * *', () => {
    checkSavedSearches().catch((err) => logger.error({ err }, 'cron: check-saved-searches threw'));
  });

  logger.info('cron: registered check-saved-searches (*/15 * * * *)');
}
