import { startWorker, stopWorker } from './workers/index.js';
import { logger } from './lib/logger.js';
import { closeRedis } from './lib/redis.js';

/**
 * Standalone worker entry point.
 *
 * Used in M2+ when the worker is split out from the web service. M1 runs the
 * worker in-process via `index.ts` so this entry is provided but unused in
 * production yet.
 */
async function main(): Promise<void> {
  startWorker();
  logger.info('worker: standalone process started');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'worker: shutting down');
    stopWorker();
    await closeRedis();
    setTimeout(() => process.exit(0), 1000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'worker: fatal startup error');
  process.exit(1);
});
