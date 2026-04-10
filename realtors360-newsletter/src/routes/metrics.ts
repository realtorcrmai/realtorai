import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { voyageUsageStats } from '../lib/voyage.js';
import { anthropicBreaker, resendBreaker, voyageBreaker } from '../lib/circuit-breaker.js';

export const metricsRouter: Router = Router();

/**
 * GET /metrics
 *
 * P10: operational metrics for dashboards / alerting. Returns JSON
 * (not Prometheus format — add a `/metrics/prometheus` later if needed).
 *
 * Includes: queue depth, last-processed timestamp, circuit breaker states,
 * Voyage token spend, process uptime.
 */
metricsRouter.get('/metrics', async (_req: Request, res: Response) => {
  // Queue depth by status
  const statusCounts: Record<string, number> = {};
  for (const status of ['pending', 'processing', 'processed', 'failed', 'ignored']) {
    const { count } = await supabase
      .from('email_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', status);
    statusCounts[status] = count ?? 0;
  }

  // Last processed event timestamp
  const { data: lastProcessed } = await supabase
    .from('email_events')
    .select('processed_at')
    .eq('status', 'processed')
    .order('processed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  res.json({
    queue: statusCounts,
    last_processed_at: lastProcessed?.processed_at ?? null,
    circuit_breakers: {
      anthropic: { state: anthropicBreaker.getState(), failures: anthropicBreaker.getFailures() },
      resend: { state: resendBreaker.getState(), failures: resendBreaker.getFailures() },
      voyage: { state: voyageBreaker.getState(), failures: voyageBreaker.getFailures() },
    },
    voyage_usage: {
      total_tokens: voyageUsageStats.totalTokens,
      total_calls: voyageUsageStats.totalCalls,
      total_cost_usd: voyageUsageStats.totalCostUsd.toFixed(4),
    },
    uptime_seconds: Math.floor(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().rss / 1_048_576),
  });
});
