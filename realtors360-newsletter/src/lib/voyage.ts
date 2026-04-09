import crypto from 'node:crypto';
import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * Voyage AI embeddings client.
 *
 * Ported from `realestate-crm/src/lib/rag/embeddings.ts` (M3-A batch 1).
 * Replaces the M1 stub. Behaviour preserved exactly — same API URL, same
 * batch limit, same dimension validation, same usage tracking.
 *
 * Used by:
 *   - rag-backfill cron (M3-B)
 *   - newsletter orchestrator RAG (future, M4+)
 *
 * Pricing: voyage-3-large at $0.06 per 1M tokens (tracked in voyageUsageStats).
 */

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_COST_PER_1M_TOKENS = 0.06;
const MAX_TEXTS_PER_BATCH = 128;
const MAX_CHARS_PER_TEXT = 32_000;

export const EMBEDDING_MODEL = 'voyage-3-large';
export const EMBEDDING_DIMS = 1024;

type VoyageResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { total_tokens: number };
};

/** Accumulated Voyage usage stats for the current process (reset on restart). */
export const voyageUsageStats = {
  totalTokens: 0,
  totalCalls: 0,
  totalCostUsd: 0,
  lastCallTokens: 0,
};

function trackVoyageUsage(tokens: number): void {
  voyageUsageStats.totalTokens += tokens;
  voyageUsageStats.totalCalls += 1;
  voyageUsageStats.totalCostUsd += (tokens / 1_000_000) * VOYAGE_COST_PER_1M_TOKENS;
  voyageUsageStats.lastCallTokens = tokens;
}

function getApiKey(): string {
  const key = config.VOYAGE_API_KEY;
  if (!key) {
    throw new Error('VOYAGE_API_KEY environment variable is not set');
  }
  return key;
}

/**
 * Embed multiple texts in a single Voyage API call.
 * Returns array of 1024-dim float arrays in the same order as input.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length > MAX_TEXTS_PER_BATCH) {
    throw new Error(`Voyage batch limit is ${MAX_TEXTS_PER_BATCH} texts, got ${texts.length}`);
  }

  const sanitized = texts.map((t) => t.slice(0, MAX_CHARS_PER_TEXT));

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: sanitized,
      input_type: 'document',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Voyage API error ${response.status}: ${errorBody}`);
  }

  const json = (await response.json()) as VoyageResponse;

  if (json.usage?.total_tokens) {
    trackVoyageUsage(json.usage.total_tokens);
  }

  // Sort by index to guarantee order matches input
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  const embeddings = sorted.map((d) => d.embedding);

  for (const emb of embeddings) {
    if (emb.length !== EMBEDDING_DIMS) {
      throw new Error(`Expected ${EMBEDDING_DIMS} dimensions, got ${emb.length}`);
    }
  }

  return embeddings;
}

/** Embed a single document text. */
export async function embedText(text: string): Promise<number[]> {
  const results = await embedBatch([text]);
  return results[0];
}

/**
 * Embed a query text — uses input_type='query' for asymmetric search.
 * Voyage recommends different input_type for queries vs documents.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [text.slice(0, MAX_CHARS_PER_TEXT)],
      input_type: 'query',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Voyage API error ${response.status}: ${errorBody}`);
  }

  const json = (await response.json()) as VoyageResponse;
  if (json.usage?.total_tokens) trackVoyageUsage(json.usage.total_tokens);

  const embedding = json.data[0].embedding;
  if (embedding.length !== EMBEDDING_DIMS) {
    throw new Error(`Expected ${EMBEDDING_DIMS} dimensions, got ${embedding.length}`);
  }
  return embedding;
}

/**
 * SHA-256 content hash for chunk-level dedup.
 * Used by rag-backfill to skip chunks whose text hasn't changed.
 */
export function contentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/** Long-running crons should call this at intervals to log accumulated cost. */
export function logVoyageUsage(): void {
  logger.info(
    {
      total_tokens: voyageUsageStats.totalTokens,
      total_calls: voyageUsageStats.totalCalls,
      total_cost_usd: voyageUsageStats.totalCostUsd.toFixed(4),
    },
    'voyage: usage stats'
  );
}
