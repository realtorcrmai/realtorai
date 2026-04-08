import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * Voyage AI embeddings wrapper.
 *
 * M1 status: stub. The orchestrator's RAG calls (`lib/rag.ts`) currently
 * resolve to direct DB lookups. Real Voyage embedding calls will be wired in
 * during M2 when the rag retriever is plumbed end-to-end.
 */

export async function embed(_text: string): Promise<number[]> {
  if (!config.VOYAGE_API_KEY) {
    logger.warn('voyage: VOYAGE_API_KEY not set — returning empty embedding');
    return [];
  }
  // TODO(M2): call https://api.voyageai.com/v1/embeddings with model voyage-3
  return [];
}
