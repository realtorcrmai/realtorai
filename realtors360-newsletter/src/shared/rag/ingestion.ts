import type { SupabaseClient } from '@supabase/supabase-js';
import { embedBatch, contentHash } from '../../lib/voyage.js';
import { chunkRecord, resolveContentType } from './chunker.js';
import {
  type SourceTable,
  type ContentType,
  type EmbeddingRecord,
  type IngestResult,
  type TextChunk,
} from './types.js';
import { logger } from '../../lib/logger.js';

/**
 * RAG ingestion pipeline.
 *
 * Ported faithfully from `realestate-crm/src/lib/rag/ingestion.ts` (M3-A
 * batch 1). Behaviour preserved exactly:
 *   - chunk → check hashes → embed only new → delete old → insert new
 *   - knowledge_articles content_type override (now handled by
 *     `resolveContentType` in chunker.ts)
 *   - 200ms throttle between batches
 *   - per-record error isolation in backfillAll
 *
 * Per the M3 cron map's "Issues to fix while porting" §6.4 #4, the inserts
 * are now actually batched (single multi-row insert per record) — they were
 * already a single insert in the CRM original, so this is a no-op cleanup
 * here. Cross-table batching is left for the per-batch optimization in M3-D.
 */

/* ────────────────────────────── ingestRecord ────────────────────────────── */

export async function ingestRecord(
  db: SupabaseClient,
  sourceTable: SourceTable,
  sourceId: string
): Promise<IngestResult> {
  const { data: record, error } = await db
    .from(sourceTable)
    .select('*')
    .eq('id', sourceId)
    .single();

  if (error || !record) {
    return {
      embedded: false,
      chunks: 0,
      skipped: true,
      reason: `Record not found: ${sourceTable}/${sourceId}`,
    };
  }

  return ingestFromRecord(db, sourceTable, sourceId, record);
}

export async function ingestFromRecord(
  db: SupabaseClient,
  sourceTable: SourceTable,
  sourceId: string,
  record: Record<string, unknown>
): Promise<IngestResult> {
  // 1. Chunk
  const chunks = chunkRecord(sourceTable, record);
  if (chunks.length === 0) {
    return { embedded: false, chunks: 0, skipped: true, reason: 'No content to embed' };
  }

  // 2. Hash + dedup against existing
  const hashes = chunks.map((c) => contentHash(c.text));
  const { data: existing } = await db
    .from('rag_embeddings')
    .select('content_hash')
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId);

  const existingHashes = new Set(
    ((existing as Array<{ content_hash: string }> | null) ?? []).map((e) => e.content_hash)
  );

  const newChunks: Array<{ chunk: TextChunk; hash: string }> = [];
  for (let i = 0; i < chunks.length; i++) {
    if (!existingHashes.has(hashes[i])) {
      newChunks.push({ chunk: chunks[i], hash: hashes[i] });
    }
  }

  if (newChunks.length === 0) {
    return {
      embedded: false,
      chunks: 0,
      skipped: true,
      reason: 'Content unchanged (hash match)',
    };
  }

  // 3. Embed all new chunks in one Voyage call
  const embeddings = await embedBatch(newChunks.map((c) => c.chunk.text));

  // 4. Resolve content type (knowledge_articles override handled inside)
  const contentType: ContentType = resolveContentType(sourceTable, record);

  // 5. Build rows
  const rows: EmbeddingRecord[] = newChunks.map(({ chunk, hash }, i) => ({
    source_table: sourceTable,
    source_id: sourceId,
    chunk_index: chunk.index,
    content_text: chunk.text,
    embedding: embeddings[i],
    contact_id: chunk.metadata.contact_id,
    listing_id: chunk.metadata.listing_id,
    content_type: contentType,
    channel: chunk.metadata.channel,
    direction: chunk.metadata.direction,
    audience_type: chunk.metadata.audience_type,
    topic: chunk.metadata.topic,
    content_hash: hash,
    source_created_at: chunk.metadata.source_created_at,
  }));

  // 6. Delete old embeddings for this source (handles updates / re-chunking)
  await db.from('rag_embeddings').delete().eq('source_table', sourceTable).eq('source_id', sourceId);

  // 7. Insert new embeddings (single multi-row insert)
  const { error: insertError } = await db.from('rag_embeddings').insert(
    rows.map((r) => ({
      source_table: r.source_table,
      source_id: r.source_id,
      chunk_index: r.chunk_index,
      content_text: r.content_text,
      // pgvector accepts the bracket-array text representation
      embedding: `[${r.embedding.join(',')}]`,
      contact_id: r.contact_id ?? null,
      listing_id: r.listing_id ?? null,
      content_type: r.content_type,
      channel: r.channel ?? null,
      direction: r.direction ?? null,
      audience_type: r.audience_type ?? null,
      topic: r.topic ?? null,
      content_hash: r.content_hash,
      source_created_at: r.source_created_at ?? null,
    }))
  );

  if (insertError) {
    throw new Error(`Failed to insert embeddings: ${insertError.message}`);
  }

  return { embedded: true, chunks: rows.length, skipped: false };
}

/* ────────────────────────────── backfillAll ────────────────────────────── */

const BACKFILL_TABLES: Array<{ table: SourceTable }> = [
  { table: 'communications' },
  { table: 'activities' },
  { table: 'newsletters' },
  { table: 'contacts' },
  { table: 'listings' },
  { table: 'agent_recommendations' },
  { table: 'message_templates' },
  { table: 'offers' },
  { table: 'knowledge_articles' },
  { table: 'competitive_emails' },
];

export interface BackfillResult {
  processed: number;
  skipped: number;
  errors: number;
  details: Array<{ table: string; id: string; error?: string }>;
}

export async function backfillAll(
  db: SupabaseClient,
  batchSize = 50
): Promise<BackfillResult> {
  const result: BackfillResult = { processed: 0, skipped: 0, errors: 0, details: [] };

  for (const { table } of BACKFILL_TABLES) {
    const { data: sourceRows, error: fetchError } = await db
      .from(table)
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1000);

    if (fetchError || !sourceRows) {
      logger.warn({ table, err: fetchError }, 'rag-backfill: source fetch failed, skipping table');
      continue;
    }

    const { data: embeddedRows } = await db
      .from('rag_embeddings')
      .select('source_id')
      .eq('source_table', table);

    const embeddedIds = new Set(
      ((embeddedRows as Array<{ source_id: string }> | null) ?? []).map((r) => r.source_id)
    );

    const unembedded = (sourceRows as Array<{ id: string }>).filter((r) => !embeddedIds.has(r.id));

    if (unembedded.length === 0) continue;

    logger.info(
      { table, total: sourceRows.length, unembedded: unembedded.length },
      'rag-backfill: starting table'
    );

    for (let i = 0; i < unembedded.length; i += batchSize) {
      const batch = unembedded.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          const res = await ingestRecord(db, table, row.id);
          if (res.skipped) {
            result.skipped++;
          } else {
            result.processed++;
          }
        } catch (err) {
          result.errors++;
          result.details.push({
            table,
            id: row.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // 200ms throttle between batches
      if (i + batchSize < unembedded.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  return result;
}

/* ────────────────────────── single-record helpers ────────────────────────── */

export async function deleteEmbeddings(
  db: SupabaseClient,
  sourceTable: SourceTable,
  sourceId: string
): Promise<void> {
  await db
    .from('rag_embeddings')
    .delete()
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId);
}
