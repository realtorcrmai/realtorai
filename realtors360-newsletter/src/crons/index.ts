import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { checkSavedSearches } from './check-saved-searches.js';
import { checkBirthdays } from './check-birthdays.js';

/**
 * Cron registry.
 *
 * M1: check-saved-searches every 15 minutes.
 * M2: check-birthdays daily at 8 AM Vancouver time.
 * M3 will add migrated CRM crons (process-workflows, agent-scoring, etc).
 *
 * node-cron uses the host's local timezone unless overridden. In production
 * the Render container is UTC, so 8am Vancouver = 16:00 UTC (PDT) / 17:00 UTC
 * (PST). We pass the timezone option to make this unambiguous.
 */
export function startCrons(): void {
  cron.schedule('*/15 * * * *', () => {
    checkSavedSearches().catch((err) =>
      logger.error({ err }, 'cron: check-saved-searches threw')
    );
  });
  logger.info('cron: registered check-saved-searches (*/15 * * * *)');

  cron.schedule(
    '0 8 * * *',
    () => {
      checkBirthdays().catch((err) => logger.error({ err }, 'cron: check-birthdays threw'));
    },
    { timezone: 'America/Vancouver' }
  );
  logger.info('cron: registered check-birthdays (0 8 * * * America/Vancouver)');
}
