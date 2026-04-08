import { startCrons } from './crons/index.js';
import { logger } from './lib/logger.js';

/**
 * Standalone cron entry point.
 *
 * Used in M2+ when crons are split out from the web service. M1 runs them
 * in-process via `index.ts`.
 */
function main(): void {
  startCrons();
  logger.info('cron: standalone process started');

  process.on('SIGTERM', () => process.exit(0));
  process.on('SIGINT', () => process.exit(0));
}

main();
