// ============================================================
// Embedding Client — Voyage AI wrapper
// ============================================================

import { EMBEDDING_MODEL, EMBEDDING_DIMS } from './constants';
import crypto from 'crypto';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

// Voyage-3-large pricing: $0.06 per 1M tokens
const VOYAGE_COST_PER_1M_TOKENS = 0.06;

interface VoyageResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { total_tokens: number };
}

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

/**
 * Embed a single text string via Voyage AI.
 * Returns a 1024-dimensional float array.
 */
export async function embedText(text: string): Promise<number[]> {
  const results = await embedBatch([text]);
  return results[0];
}

/**
 * Embed multiple texts in a single Voyage API call.
 * Voyage supports up to 128 texts per batch.
 * Returns array of 1024-dimensional float arrays (same order as input).
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY environment variable is not set');
  }

  if (texts.length === 0) return [];
  if (texts.length > 128) {
    throw new Error(`Voyage batch limit is 128 texts, got ${texts.length}`);
  }

  // Truncate texts that are too long (Voyage max ~32K tokens per text)
  const sanitized = texts.map((t) => t.slice(0, 32000));

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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

  // Track usage
  if (json.usage?.total_tokens) {
    trackVoyageUsage(json.usage.total_tokens);
  }

  // Sort by index to guarantee order matches input
  const sorted = json.data.sort((a, b) => a.index - b.index);
  const embeddings = sorted.map((d) => d.embedding);

  // Validate dimensions
  for (const emb of embeddings) {
    if (emb.length !== EMBEDDING_DIMS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMS} dimensions, got ${emb.length}`
      );
    }
  }

  return embeddings;
}

/**
 * Embed a query text (uses input_type: 'query' for asymmetric search).
 * Voyage recommends different input_type for queries vs documents.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY environment variable is not set');
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [text.slice(0, 32000)],
      input_type: 'query',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Voyage API error ${response.status}: ${errorBody}`);
  }

  const json = (await response.json()) as VoyageResponse;

  // Track usage
  if (json.usage?.total_tokens) {
    trackVoyageUsage(json.usage.total_tokens);
  }

  const embedding = json.data[0].embedding;

  if (embedding.length !== EMBEDDING_DIMS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMS} dimensions, got ${embedding.length}`
    );
  }

  return embedding;
}

/**
 * Generate SHA-256 content hash for dedup.
 */
export function contentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
