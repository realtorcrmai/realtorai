import { describe, it, expect } from 'vitest';
import {
  calculateContentPerf,
  calculateContentRankings,
  calculateTimingPerf,
  pickBestDay,
  pickBestHour,
  calculateOverallMetrics,
  calculateTrend,
} from '../../src/shared/learning/engine.js';

/**
 * Tests for the pure stats helpers extracted from the CRM learning engine.
 *
 * The CRM original has zero tests today (M3 cron map §6.5). M3-C adds the
 * baseline. We test only the deterministic math functions — runLearningCycle
 * and updateContactIntelligence are integration-level concerns covered by
 * the staging smoke test described in §6.5.
 */

const newsletter = (overrides: Partial<{ id: string; email_type: string; sent_at: string | null; contact_id: string | null }>) => ({
  id: 'nl1',
  email_type: 'market_update',
  sent_at: '2026-04-01T16:00:00Z', // Wed 16:00 UTC = Wed 09:00 PDT
  contact_id: 'c1',
  ...overrides,
});

const event = (newsletterId: string, type: string) => ({
  newsletter_id: newsletterId,
  event_type: type,
  created_at: '2026-04-01T17:00:00Z',
});

describe('calculateContentPerf', () => {
  it('counts sends, opens, clicks per email_type', () => {
    const newsletters = [
      newsletter({ id: 'a', email_type: 'market_update' }),
      newsletter({ id: 'b', email_type: 'market_update' }),
      newsletter({ id: 'c', email_type: 'just_sold' }),
    ];
    const events = [event('a', 'opened'), event('a', 'clicked'), event('b', 'opened'), event('c', 'opened')];
    const perf = calculateContentPerf(newsletters, events);
    expect(perf.market_update).toEqual({ sent: 2, opened: 2, clicked: 1 });
    expect(perf.just_sold).toEqual({ sent: 1, opened: 1, clicked: 0 });
  });

  it('counts each newsletter at most once per event type', () => {
    const newsletters = [newsletter({ id: 'a' })];
    // Two clicked events for the same newsletter — should still count as 1 click
    const events = [event('a', 'clicked'), event('a', 'clicked')];
    const perf = calculateContentPerf(newsletters, events);
    expect(perf.market_update.clicked).toBe(1);
  });
});

describe('calculateContentRankings', () => {
  it('filters out content types with fewer than 3 sends', () => {
    const perf = {
      market_update: { sent: 3, opened: 2, clicked: 1 },
      just_sold: { sent: 2, opened: 2, clicked: 2 }, // dropped — only 2 sends
    };
    const rankings = calculateContentRankings(perf);
    expect(rankings).toHaveLength(1);
    expect(rankings[0].type).toBe('market_update');
  });

  it('sorts by effectiveness (open*0.4 + click*0.6)', () => {
    const perf = {
      // 100% open, 0% click → 0.4 effectiveness
      type_a: { sent: 5, opened: 5, clicked: 0 },
      // 50% open, 50% click → 0.5 effectiveness — wins
      type_b: { sent: 5, opened: 2, clicked: 2 }, // 0.4*0.4 + 0.6*0.4 = 0.4
      // 60% open, 80% click → 0.4*0.6 + 0.6*0.8 = 0.72 — actual winner
      type_c: { sent: 5, opened: 3, clicked: 4 },
    };
    const rankings = calculateContentRankings(perf);
    expect(rankings[0].type).toBe('type_c');
  });

  it('returns empty array when no qualifying types', () => {
    expect(calculateContentRankings({})).toEqual([]);
    expect(calculateContentRankings({ x: { sent: 1, opened: 0, clicked: 0 } })).toEqual([]);
  });
});

describe('calculateTimingPerf', () => {
  it('buckets by day-of-week and hour', () => {
    // Local time the test runs in matters because the helper uses
    // sentDate.getDay() / getHours(). We assert structurally instead of
    // pinning a specific day name.
    const newsletters = [
      newsletter({ id: 'a', sent_at: '2026-04-06T17:00:00Z' }), // Mon
      newsletter({ id: 'b', sent_at: '2026-04-06T17:00:00Z' }), // Mon
    ];
    const events = [event('a', 'opened')];
    const { dayPerf, hourPerf } = calculateTimingPerf(newsletters, events);

    // Both newsletters land in the same day bucket
    const dayKeys = Object.keys(dayPerf);
    expect(dayKeys).toHaveLength(1);
    expect(dayPerf[dayKeys[0]]).toEqual({ sent: 2, opened: 1 });

    // Both newsletters land in the same hour bucket
    const hourKeys = Object.keys(hourPerf);
    expect(hourKeys).toHaveLength(1);
  });

  it('skips newsletters with null sent_at', () => {
    const newsletters = [newsletter({ id: 'a', sent_at: null })];
    const { dayPerf, hourPerf } = calculateTimingPerf(newsletters, []);
    expect(Object.keys(dayPerf)).toHaveLength(0);
    expect(Object.keys(hourPerf)).toHaveLength(0);
  });
});

describe('pickBestDay / pickBestHour', () => {
  it('falls back to tuesday when no day has ≥3 sends', () => {
    expect(pickBestDay({})).toBe('tuesday');
    expect(pickBestDay({ monday: { sent: 2, opened: 2 } })).toBe('tuesday');
  });

  it('picks the highest open rate among qualifying days', () => {
    const perf = {
      monday: { sent: 5, opened: 1 }, // 20%
      tuesday: { sent: 5, opened: 4 }, // 80% — winner
      wednesday: { sent: 5, opened: 2 }, // 40%
    };
    expect(pickBestDay(perf)).toBe('tuesday');
  });

  it('falls back to "9" hour when nothing qualifies', () => {
    expect(pickBestHour({})).toBe('9');
    expect(pickBestHour({ 14: { sent: 1, opened: 1 } })).toBe('9');
  });
});

describe('calculateOverallMetrics', () => {
  it('computes unique opened/clicked counts and rates', () => {
    const newsletters = [
      newsletter({ id: 'a' }),
      newsletter({ id: 'b' }),
      newsletter({ id: 'c' }),
      newsletter({ id: 'd' }),
    ];
    const events = [
      event('a', 'opened'),
      event('a', 'opened'), // duplicate — uniqueOpened still 1 per nl
      event('b', 'opened'),
      event('b', 'clicked'),
      event('c', 'clicked'),
    ];
    const metrics = calculateOverallMetrics(newsletters, events);
    expect(metrics.totalSent).toBe(4);
    expect(metrics.uniqueOpened).toBe(2); // a + b
    expect(metrics.uniqueClicked).toBe(2); // b + c
    expect(metrics.totalOpened).toBe(3); // 2 for a + 1 for b
    expect(metrics.avgOpenRate).toBeCloseTo(0.5);
    expect(metrics.avgClickRate).toBeCloseTo(0.5);
  });

  it('returns zeros for empty input', () => {
    const metrics = calculateOverallMetrics([], []);
    expect(metrics.totalSent).toBe(0);
    expect(metrics.avgOpenRate).toBe(0);
    expect(metrics.avgClickRate).toBe(0);
  });
});

describe('calculateTrend', () => {
  // Pin "now" for deterministic week math.
  const NOW = new Date('2026-04-15T12:00:00Z').getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  it('marks recent week >> older week as accelerating', () => {
    // Week 0 (most recent): 2 days ago, 5 opens
    // Week 2 (oldest in window): 18 days ago, 1 open
    const newsletters = [
      newsletter({ id: 'a', sent_at: new Date(NOW - 2 * oneDay).toISOString() }),
      newsletter({ id: 'b', sent_at: new Date(NOW - 2 * oneDay).toISOString() }),
      newsletter({ id: 'c', sent_at: new Date(NOW - 16 * oneDay).toISOString() }),
    ];
    const events = [
      event('a', 'opened'),
      event('a', 'opened'),
      event('a', 'opened'),
      event('b', 'opened'),
      event('b', 'opened'),
      event('c', 'opened'),
    ];
    const { trend, trendData } = calculateTrend(newsletters, events, NOW);
    expect(trend).toBe('accelerating');
    expect(trendData).toHaveLength(4);
  });

  it('marks recent week << older week as declining', () => {
    const newsletters = [
      newsletter({ id: 'a', sent_at: new Date(NOW - 16 * oneDay).toISOString() }),
      newsletter({ id: 'b', sent_at: new Date(NOW - 16 * oneDay).toISOString() }),
    ];
    const events = [
      event('a', 'opened'),
      event('a', 'opened'),
      event('a', 'opened'),
      event('a', 'opened'),
      event('b', 'opened'),
    ];
    const { trend } = calculateTrend(newsletters, events, NOW);
    expect(trend).toBe('declining');
  });

  it('returns stable when recent and older are similar', () => {
    const newsletters = [
      newsletter({ id: 'a', sent_at: new Date(NOW - 2 * oneDay).toISOString() }),
      newsletter({ id: 'c', sent_at: new Date(NOW - 16 * oneDay).toISOString() }),
    ];
    const events = [event('a', 'opened'), event('c', 'opened')];
    const { trend } = calculateTrend(newsletters, events, NOW);
    expect(trend).toBe('stable');
  });

  it('returns chronological order (oldest week first) — preserves CRM behaviour', () => {
    const { trendData } = calculateTrend([], [], NOW);
    // 4 weeks total. Index 0 is oldest week, index 3 is most recent week.
    expect(new Date(trendData[0].week).getTime()).toBeLessThan(
      new Date(trendData[3].week).getTime()
    );
  });
});
