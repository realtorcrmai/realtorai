import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { getRedis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

export const healthRouter: Router = Router();

healthRouter.get('/health', async (_req, res) => {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Supabase
  try {
    const { error } = await supabase.from('email_events').select('id', { count: 'exact', head: true });
    checks.supabase = { ok: !error, detail: error?.message };
  } catch (err) {
    checks.supabase = { ok: false, detail: (err as Error).message };
  }

  // Redis (optional in M1)
  const redis = getRedis();
  if (redis) {
    try {
      const pong = await redis.ping();
      checks.redis = { ok: pong === 'PONG' };
    } catch (err) {
      checks.redis = { ok: false, detail: (err as Error).message };
    }
  } else {
    checks.redis = { ok: true, detail: 'not configured (M1 in-process mode)' };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;

  if (!allOk) logger.warn({ checks }, 'health: degraded');

  res.status(status).json({
    service: 'realtors360-newsletter',
    status: allOk ? 'ok' : 'degraded',
    uptime_seconds: Math.floor(process.uptime()),
    checks,
  });
});
