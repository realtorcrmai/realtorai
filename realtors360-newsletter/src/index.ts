import { createApp } from './server.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { startWorker, stopWorker } from './workers/index.js';
import { startCrons } from './crons/index.js';
import { closeRedis } from './lib/redis.js';
import { initSentry } from './lib/sentry.js';

/**
 * Web entry point.
 *
 * M1: web server hosts the worker + crons in-process to keep deployment to a
 * single Render service. Once volume justifies it, M2 will split worker into
 * its own process via `worker.ts`.
 */
async function main(): Promise<void> {
  initSentry();

  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'web: listening');
  });

  startWorker();
  startCrons();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'web: shutting down');
    stopWorker();
    server.close(() => logger.info('web: http server closed'));
    await closeRedis();
    setTimeout(() => process.exit(0), 1000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'web: fatal startup error');
  process.exit(1);
});
