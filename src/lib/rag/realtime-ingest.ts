// ============================================================
// Real-time RAG ingestion — fire-and-forget after mutations
// ============================================================

import type { SourceTable } from './types';

/**
 * Trigger RAG embedding for a record after a CRM mutation.
 * Runs async (fire-and-forget) to avoid blocking the mutation response.
 * Falls back silently if RAG system is unavailable.
 */
export function triggerIngest(sourceTable: SourceTable, sourceId: string): void {
  // Fire-and-forget: don't await, don't block the caller
  ingestAsync(sourceTable, sourceId).catch((err) => {
    console.warn(`[rag-realtime] Failed to ingest ${sourceTable}/${sourceId}:`, err?.message);
  });
}

async function ingestAsync(sourceTable: SourceTable, sourceId: string): Promise<void> {
  const { ingestRecord } = await import('./ingestion');
  await ingestRecord(sourceTable, sourceId);
}

/**
 * Trigger RAG deletion when a record is removed.
 */
export function triggerDelete(sourceTable: SourceTable, sourceId: string): void {
  deleteAsync(sourceTable, sourceId).catch((err) => {
    console.warn(`[rag-realtime] Failed to delete embeddings for ${sourceTable}/${sourceId}:`, err?.message);
  });
}

async function deleteAsync(sourceTable: SourceTable, sourceId: string): Promise<void> {
  const { deleteEmbeddings } = await import('./ingestion');
  await deleteEmbeddings(sourceTable, sourceId);
}
