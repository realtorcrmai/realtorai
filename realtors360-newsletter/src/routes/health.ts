import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { resend } from '../lib/resend.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { anthropicBreaker, resendBreaker, voyageBreaker } from '../lib/circuit-breaker.js';
import { getCronStatus } from '../lib/cron-tracker.js';

export const healthRouter: Router = Router();

healthRouter.get('/health', async (_req, res) => {
  const checks: Record<string, unknown> = {};
  let allCriticalOk = true;

  // 1. Supabase connection — timed
  try {
    const t0 = Date.now();
    const { error } = await supabase
      .from('email_events')
      .select('id', { count: 'exact', head: true });
    const latencyMs = Date.now() - t0;
    checks.supabase = { ok: !error, latencyMs, ...(error ? { detail: error.message } : {}) };
    if (error) allCriticalOk = false;
  } catch (err) {
    checks.supabase = { ok: false, detail: (err as Error).message };
    allCriticalOk = false;
  }

  // 2. Resend API key validity — lightweight API call
  try {
    const result = await resend.apiKeys.list();
    checks.resend = { ok: !result.error, ...(result.error ? { detail: result.error.message } : {}) };
    if (result.error) allCriticalOk = false;
  } catch (err) {
    checks.resend = { ok: false, detail: (err as Error).message };
    allCriticalOk = false;
  }

  // 3. Anthropic key presence (no live API call to avoid cost)
  const anthropicKeySet = !!config.ANTHROPIC_API_KEY && config.ANTHROPIC_API_KEY.length > 10;
  checks.anthropic = { ok: anthropicKeySet, ...(anthropicKeySet ? {} : { detail: 'ANTHROPIC_API_KEY missing or too short' }) };
  if (!anthropicKeySet) allCriticalOk = false;

  // 4. Voyage key presence (optional — not critical)
  const voyageKeySet = !!config.VOYAGE_API_KEY && config.VOYAGE_API_KEY.length > 5;
  checks.voyage = { ok: voyageKeySet, optional: true, ...(voyageKeySet ? {} : { detail: 'VOYAGE_API_KEY not set' }) };

  // 5. Circuit breaker states
  const cbStates = {
    anthropic: anthropicBreaker.getState(),
    resend: resendBreaker.getState(),
    voyage: voyageBreaker.getState(),
  };
  const anyBreakerOpen = Object.values(cbStates).some((s) => s === 'open');
  checks.circuitBreakers = {
    ok: !anyBreakerOpen,
    ...cbStates,
  };
  if (anyBreakerOpen) allCriticalOk = false;

  // 6-8. Queue depth: pending, failed, dead_letter
  try {
    const [pendingRes, failedRes, deadLetterRes] = await Promise.all([
      supabase.from('email_events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('email_events').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('email_events').select('id', { count: 'exact', head: true }).eq('status', 'dead_letter'),
    ]);
    checks.queue = {
      ok: true,
      pending: pendingRes.count ?? 0,
      failed: failedRes.count ?? 0,
      dead_letter: deadLetterRes.count ?? 0,
    };
  } catch (err) {
    checks.queue = { ok: false, detail: (err as Error).message };
  }

  // 9. Cron execution status
  checks.crons = getCronStatus();

  const status = allCriticalOk ? 200 : 503;

  if (!allCriticalOk) {
    logger.warn({ checks }, 'health: degraded');
  }

  res.status(status).json({
    ok: allCriticalOk,
    checks,
    uptime: Math.floor(process.uptime()),
  });
});
