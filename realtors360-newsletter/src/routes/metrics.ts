import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { voyageUsageStats } from '../lib/voyage.js';
import { anthropicBreaker, resendBreaker, voyageBreaker } from '../lib/circuit-breaker.js';
import { getCronStatus } from '../lib/cron-tracker.js';

export const metricsRouter: Router = Router();

/**
 * GET /metrics
 *
 * P10: operational metrics for dashboards / alerting. Returns JSON
 * (not Prometheus format — add a `/metrics/prometheus` later if needed).
 *
 * Includes: queue depth, last-processed timestamp, circuit breaker states,
 * Voyage token spend, process uptime, emails sent today, failed events today,
 * agent run stats, trust level distribution, cron execution stats, dead letter size.
 */
metricsRouter.get('/metrics', async (_req: Request, res: Response) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  // Queue depth by status (existing)
  const statusCounts: Record<string, number> = {};
  for (const status of ['pending', 'processing', 'processed', 'failed', 'ignored', 'dead_letter', 'retrying']) {
    const { count } = await supabase
      .from('email_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', status);
    statusCounts[status] = count ?? 0;
  }

  // Last processed event timestamp (existing)
  const { data: lastProcessed } = await supabase
    .from('email_events')
    .select('processed_at')
    .eq('status', 'processed')
    .order('processed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Emails sent today
  const { count: emailsSentToday } = await supabase
    .from('newsletters')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', todayIso)
    .eq('status', 'sent');

  // Events failed today
  const { count: eventsFailedToday } = await supabase
    .from('email_events')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('created_at', todayIso);

  // Agent runs today + avg duration
  const { data: agentRunsToday } = await supabase
    .from('agent_runs')
    .select('id, started_at, completed_at')
    .gte('created_at', todayIso);

  const agentRunCount = agentRunsToday?.length ?? 0;
  let agentAvgDurationMs = 0;
  if (agentRunsToday && agentRunsToday.length > 0) {
    const durations = agentRunsToday
      .filter((r) => r.completed_at && r.started_at)
      .map((r) => new Date(r.completed_at).getTime() - new Date(r.started_at).getTime());
    if (durations.length > 0) {
      agentAvgDurationMs = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }
  }

  // Trust level distribution
  const trustDistribution: Record<string, number> = { L0: 0, L1: 0, L2: 0, L3: 0 };
  const { data: trustRows } = await supabase
    .from('realtor_agent_config')
    .select('trust_level');
  if (trustRows) {
    for (const row of trustRows) {
      const level = `L${row.trust_level ?? 0}`;
      trustDistribution[level] = (trustDistribution[level] ?? 0) + 1;
    }
  }

  // Dead letter queue size (also in statusCounts but surfaced explicitly)
  const deadLetterCount = statusCounts['dead_letter'] ?? 0;

  res.json({
    queue: statusCounts,
    last_processed_at: lastProcessed?.processed_at ?? null,

    // New metrics
    emails_sent_today: emailsSentToday ?? 0,
    events_failed_today: eventsFailedToday ?? 0,
    agent_runs_today: {
      count: agentRunCount,
      avg_duration_ms: agentAvgDurationMs,
    },
    trust_level_distribution: trustDistribution,
    dead_letter_count: deadLetterCount,

    // Circuit breakers (existing + enhanced)
    circuit_breakers: {
      anthropic: { state: anthropicBreaker.getState(), failures: anthropicBreaker.getFailures() },
      resend: { state: resendBreaker.getState(), failures: resendBreaker.getFailures() },
      voyage: { state: voyageBreaker.getState(), failures: voyageBreaker.getFailures() },
    },

    // Cron execution stats
    crons: getCronStatus(),

    // Voyage usage (existing)
    voyage_usage: {
      total_tokens: voyageUsageStats.totalTokens,
      total_calls: voyageUsageStats.totalCalls,
      total_cost_usd: voyageUsageStats.totalCostUsd.toFixed(4),
    },

    uptime_seconds: Math.floor(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().rss / 1_048_576),
  });
});
