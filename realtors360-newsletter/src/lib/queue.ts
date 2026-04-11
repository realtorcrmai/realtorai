import { Queue, Worker, type Processor } from 'bullmq';
import { getRedis } from './redis.js';
import { logger } from './logger.js';

/**
 * Bull queue helpers.
 *
 * M1: queue is created lazily — if Redis is unavailable, callers should fall
 * back to direct invocation (see `workers/process-event.ts` for the in-process
 * path used during M1).
 */

const QUEUE_NAME_EVENTS = 'newsletter-events';
const QUEUE_NAME_SENDS = 'newsletter-sends';

export type EventJobData = {
  eventId: string;
};

let _eventsQueue: Queue<EventJobData> | null = null;

export function getEventsQueue(): Queue<EventJobData> | null {
  const redis = getRedis();
  if (!redis) return null;
  if (_eventsQueue) return _eventsQueue;

  _eventsQueue = new Queue<EventJobData>(QUEUE_NAME_EVENTS, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 86_400 },
    },
  });

  return _eventsQueue;
}

export function createEventsWorker(processor: Processor<EventJobData>): Worker<EventJobData> | null {
  const redis = getRedis();
  if (!redis) {
    logger.warn('queue: REDIS_URL not set — skipping Bull worker (M1 in-process mode)');
    return null;
  }
  return new Worker<EventJobData>(QUEUE_NAME_EVENTS, processor, {
    connection: redis,
    concurrency: 5,
  });
}

export const QueueNames = {
  events: QUEUE_NAME_EVENTS,
  sends: QUEUE_NAME_SENDS,
} as const;
