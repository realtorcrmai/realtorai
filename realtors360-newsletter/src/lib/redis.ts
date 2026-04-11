import IORedis, { type Redis } from 'ioredis';
import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * Lazy Redis connection.
 *
 * M1: Redis is OPTIONAL. If REDIS_URL is unset, the worker runs in-process
 * via direct DB polling and Bull is not used. M2 will require Redis.
 */
let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!config.REDIS_URL) return null;
  if (_redis) return _redis;

  _redis = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null, // BullMQ requires null
    enableReadyCheck: false,
  });

  _redis.on('connect', () => logger.info('redis: connected'));
  _redis.on('error', (err) => logger.error({ err }, 'redis: error'));

  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
