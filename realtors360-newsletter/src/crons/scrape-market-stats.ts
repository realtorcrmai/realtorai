import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { captureException } from '../lib/sentry.js';

// TODO: Replace with actual REBGV/FVREB API when available.
// The BC real-estate boards (REBGV, FVREB, BCNREB, OMREB) do not expose
// public APIs for market stats. When an API or data-sharing agreement is
// secured, replace the `PLACEHOLDER_MARKET_DATA` array below with live
// fetches. Until then, this cron upserts realistic baseline data so the
// newsletter AI and agent tools have something to work with.

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface MarketDataSource {
  /** City / neighbourhood name, e.g. "Vancouver" */
  area: string;
  /** Category of statistic — mirrors market_stats_cache.stat_type */
  stat_type: 'avg_price' | 'avg_dom' | 'inventory_change' | 'monthly_volume';
  /** Reporting period label, e.g. "2026-Q1" */
  period: string;
  /** Arbitrary JSONB payload consumed by the newsletter AI */
  data: Record<string, unknown>;
  /** Human-readable attribution */
  source: string;
}

/* ------------------------------------------------------------------ */
/*  Placeholder data — realistic BC market stats (Q1 2026)            */
/* ------------------------------------------------------------------ */

const CURRENT_PERIOD = '2026-Q1';
const SOURCE = 'placeholder — see TODO in scrape-market-stats.ts';

interface AreaStats {
  avg_price: number;
  avg_dom: number;
  inventory_change_pct: number;
  monthly_volume: number;
}

const BC_AREA_STATS: Record<string, AreaStats> = {
  Vancouver: {
    avg_price: 1_285_000,
    avg_dom: 22,
    inventory_change_pct: 4.2,
    monthly_volume: 2_314,
  },
  Burnaby: {
    avg_price: 1_045_000,
    avg_dom: 25,
    inventory_change_pct: 3.8,
    monthly_volume: 1_187,
  },
  Surrey: {
    avg_price: 985_000,
    avg_dom: 28,
    inventory_change_pct: 5.1,
    monthly_volume: 2_045,
  },
  Richmond: {
    avg_price: 1_120_000,
    avg_dom: 24,
    inventory_change_pct: 2.9,
    monthly_volume: 1_032,
  },
  Langley: {
    avg_price: 925_000,
    avg_dom: 30,
    inventory_change_pct: 6.3,
    monthly_volume: 876,
  },
  Coquitlam: {
    avg_price: 1_010_000,
    avg_dom: 26,
    inventory_change_pct: 3.5,
    monthly_volume: 742,
  },
  'North Vancouver': {
    avg_price: 1_350_000,
    avg_dom: 21,
    inventory_change_pct: 1.8,
    monthly_volume: 534,
  },
  Kelowna: {
    avg_price: 745_000,
    avg_dom: 35,
    inventory_change_pct: 7.2,
    monthly_volume: 612,
  },
};

function buildPlaceholderData(): MarketDataSource[] {
  const rows: MarketDataSource[] = [];

  for (const [area, stats] of Object.entries(BC_AREA_STATS)) {
    rows.push({
      area,
      stat_type: 'avg_price',
      period: CURRENT_PERIOD,
      data: { value: stats.avg_price, currency: 'CAD', property_type: 'all' },
      source: SOURCE,
    });

    rows.push({
      area,
      stat_type: 'avg_dom',
      period: CURRENT_PERIOD,
      data: { value: stats.avg_dom, unit: 'days' },
      source: SOURCE,
    });

    rows.push({
      area,
      stat_type: 'inventory_change',
      period: CURRENT_PERIOD,
      data: { value: stats.inventory_change_pct, unit: 'percent', direction: stats.inventory_change_pct >= 0 ? 'up' : 'down' },
      source: SOURCE,
    });

    rows.push({
      area,
      stat_type: 'monthly_volume',
      period: CURRENT_PERIOD,
      data: { value: stats.monthly_volume, unit: 'transactions' },
      source: SOURCE,
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Cron entry-point                                                  */
/* ------------------------------------------------------------------ */

/**
 * Cron: scrape-market-stats
 *
 * Schedule: weekly, Sunday 02:00 Vancouver (registered in `crons/index.ts`).
 *
 * Upserts BC market statistics into `market_stats_cache` so the newsletter
 * AI and agent tools can reference current data when composing Market Update
 * emails. Gated on FLAG_MARKET_SCRAPER (default 'off').
 *
 * The table has a UNIQUE(area, stat_type, period) constraint so repeated
 * runs for the same period are idempotent — the upsert overwrites data +
 * fetched_at without creating duplicates.
 */
export async function scrapeMarketStats(): Promise<void> {
  if (config.FLAG_MARKET_SCRAPER !== 'on') {
    logger.info('cron/scrape-market-stats: flag disabled, skipping');
    return;
  }

  const startedAt = Date.now();
  logger.info('cron/scrape-market-stats: starting');

  // TODO: Replace with actual REBGV API when available.
  // When a real data source is wired in, swap `buildPlaceholderData()` for
  // a fetch call and parse the response into MarketDataSource[].
  const marketData = buildPlaceholderData();

  let upserted = 0;
  let failed = 0;

  // Upsert in small batches to stay within Supabase request-size limits
  const BATCH_SIZE = 10;

  for (let i = 0; i < marketData.length; i += BATCH_SIZE) {
    const batch = marketData.slice(i, i + BATCH_SIZE);

    const rows = batch.map((d) => ({
      area: d.area,
      stat_type: d.stat_type,
      period: d.period,
      data: d.data,
      source: d.source,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
    }));

    const { error } = await supabase
      .from('market_stats_cache')
      .upsert(rows, { onConflict: 'area,stat_type,period' });

    if (error) {
      failed += batch.length;
      logger.error(
        { err: error, batch: batch.map((b) => `${b.area}/${b.stat_type}`) },
        'cron/scrape-market-stats: upsert batch failed'
      );
      captureException(new Error(error.message), { cron: 'scrape-market-stats' });
    } else {
      upserted += batch.length;
    }
  }

  logger.info(
    {
      areas: Object.keys(BC_AREA_STATS).length,
      totalRows: marketData.length,
      upserted,
      failed,
      ms: Date.now() - startedAt,
    },
    'cron/scrape-market-stats: complete'
  );
}
