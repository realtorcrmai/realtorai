// ============================================================
// Ingestion Pipeline — chunk → embed → upsert to rag_embeddings
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { embedText, embedBatch, contentHash } from './embeddings';
import { chunkRecord } from './chunker';
import type {
  SourceTable,
  ContentType,
  EmbeddingRecord,
  IngestResult,
  TextChunk,
} from './types';
import { SOURCE_TO_CONTENT_TYPE } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseKey);
}

// ---------- Core ingest function ----------

/**
 * Ingest a single record: fetch from source table → chunk → embed → upsert.
 * Returns result with chunk count or skip reason.
 */
export async function ingestRecord(
  sourceTable: SourceTable,
  sourceId: string
): Promise<IngestResult> {
  const admin = getAdmin();

  // 1. Fetch the source record
  const { data: record, error } = await admin
    .from(sourceTable)
    .select('*')
    .eq('id', sourceId)
    .single();

  if (error || !record) {
    return { embedded: false, chunks: 0, skipped: true, reason: `Record not found: ${sourceTable}/${sourceId}` };
  }

  return ingestFromRecord(sourceTable, sourceId, record);
}

/**
 * Ingest from an already-fetched record (avoids double fetch when called from actions).
 */
export async function ingestFromRecord(
  sourceTable: SourceTable,
  sourceId: string,
  record: Record<string, unknown>
): Promise<IngestResult> {
  const admin = getAdmin();

  // 1. Chunk the record
  const chunks = chunkRecord(sourceTable, record);
  if (chunks.length === 0) {
    return { embedded: false, chunks: 0, skipped: true, reason: 'No content to embed' };
  }

  // 2. Check for existing embeddings by content hash (dedup)
  const hashes = chunks.map((c) => contentHash(c.text));
  const { data: existing } = await admin
    .from('rag_embeddings')
    .select('content_hash')
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId);

  const existingHashes = new Set((existing ?? []).map((e: { content_hash: string }) => e.content_hash));

  // Filter to only new/changed chunks
  const newChunks: Array<{ chunk: TextChunk; hash: string }> = [];
  for (let i = 0; i < chunks.length; i++) {
    if (!existingHashes.has(hashes[i])) {
      newChunks.push({ chunk: chunks[i], hash: hashes[i] });
    }
  }

  if (newChunks.length === 0) {
    return { embedded: false, chunks: 0, skipped: true, reason: 'Content unchanged (hash match)' };
  }

  // 3. Embed all new chunks in a batch
  const embeddings = await embedBatch(newChunks.map((c) => c.chunk.text));

  // 4. Determine content type
  let contentType: ContentType = SOURCE_TO_CONTENT_TYPE[sourceTable];
  // Knowledge articles override content_type by category
  if (sourceTable === 'knowledge_articles' && record.category) {
    const cat = record.category as string;
    if (['faq', 'playbook', 'script', 'process', 'explainer'].includes(cat)) {
      contentType = cat as ContentType;
    }
  }

  // 5. Build upsert rows
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

  // 6. Delete old embeddings for this source (handles updates/re-chunking)
  await admin
    .from('rag_embeddings')
    .delete()
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId);

  // 7. Insert new embeddings
  const { error: insertError } = await admin
    .from('rag_embeddings')
    .insert(
      rows.map((r) => ({
        source_table: r.source_table,
        source_id: r.source_id,
        chunk_index: r.chunk_index,
        content_text: r.content_text,
        embedding: `[${r.embedding.join(',')}]`,
        contact_id: r.contact_id || null,
        listing_id: r.listing_id || null,
        content_type: r.content_type,
        channel: r.channel || null,
        direction: r.direction || null,
        audience_type: r.audience_type || null,
        topic: r.topic || null,
        content_hash: r.content_hash,
        source_created_at: r.source_created_at || null,
      }))
    );

  if (insertError) {
    throw new Error(`Failed to insert embeddings: ${insertError.message}`);
  }

  return { embedded: true, chunks: rows.length, skipped: false };
}

// ---------- Batch backfill ----------

/** Tables to backfill and their ID column */
const BACKFILL_TABLES: Array<{ table: SourceTable; idCol: string }> = [
  { table: 'communications', idCol: 'id' },
  { table: 'activities', idCol: 'id' },
  { table: 'newsletters', idCol: 'id' },
  { table: 'contacts', idCol: 'id' },
  { table: 'listings', idCol: 'id' },
  { table: 'agent_recommendations', idCol: 'id' },
  { table: 'message_templates', idCol: 'id' },
  { table: 'offers', idCol: 'id' },
  { table: 'knowledge_articles', idCol: 'id' },
  { table: 'competitive_emails', idCol: 'id' },
];

export interface BackfillResult {
  processed: number;
  skipped: number;
  errors: number;
  details: Array<{ table: string; id: string; error?: string }>;
}

/**
 * Backfill embeddings for all records not yet in rag_embeddings.
 * Processes in batches to avoid memory issues.
 */
export async function backfillAll(
  batchSize: number = 50
): Promise<BackfillResult> {
  const admin = getAdmin();
  const result: BackfillResult = { processed: 0, skipped: 0, errors: 0, details: [] };

  for (const { table } of BACKFILL_TABLES) {
    // Get all IDs from source table
    const { data: sourceRows, error: fetchError } = await admin
      .from(table)
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1000);

    if (fetchError || !sourceRows) continue;

    // Get already-embedded IDs for this table
    const { data: embeddedRows } = await admin
      .from('rag_embeddings')
      .select('source_id')
      .eq('source_table', table);

    const embeddedIds = new Set(
      (embeddedRows ?? []).map((r: { source_id: string }) => r.source_id)
    );

    // Filter to unembedded records
    const unembedded = sourceRows.filter(
      (r: { id: string }) => !embeddedIds.has(r.id)
    );

    // Process in batches
    for (let i = 0; i < unembedded.length; i += batchSize) {
      const batch = unembedded.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          const res = await ingestRecord(table, row.id);
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

      // Throttle between batches (200ms)
      if (i + batchSize < unembedded.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  return result;
}

/**
 * Backfill a single table.
 */
export async function backfillTable(
  table: SourceTable,
  batchSize: number = 50
): Promise<BackfillResult> {
  const admin = getAdmin();
  const result: BackfillResult = { processed: 0, skipped: 0, errors: 0, details: [] };

  const { data: sourceRows } = await admin
    .from(table)
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1000);

  if (!sourceRows) return result;

  const { data: embeddedRows } = await admin
    .from('rag_embeddings')
    .select('source_id')
    .eq('source_table', table);

  const embeddedIds = new Set(
    (embeddedRows ?? []).map((r: { source_id: string }) => r.source_id)
  );

  const unembedded = sourceRows.filter(
    (r: { id: string }) => !embeddedIds.has(r.id)
  );

  for (let i = 0; i < unembedded.length; i += batchSize) {
    const batch = unembedded.slice(i, i + batchSize);
    for (const row of batch) {
      try {
        const res = await ingestRecord(table, row.id);
        if (res.skipped) result.skipped++;
        else result.processed++;
      } catch (err) {
        result.errors++;
        result.details.push({
          table,
          id: row.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return result;
}

/**
 * Delete all embeddings for a source record (used when source is deleted).
 */
export async function deleteEmbeddings(
  sourceTable: SourceTable,
  sourceId: string
): Promise<void> {
  const admin = getAdmin();
  await admin
    .from('rag_embeddings')
    .delete()
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId);
}

/**
 * Get ingestion stats: total embeddings per source table.
 */
export async function getIngestionStats(): Promise<
  Array<{ source_table: string; count: number }>
> {
  const admin = getAdmin();
  const { data } = await admin.rpc('rag_stats');
  // Fallback: manual count if RPC doesn't exist
  if (!data) {
    const stats: Array<{ source_table: string; count: number }> = [];
    for (const { table } of BACKFILL_TABLES) {
      const { count } = await admin
        .from('rag_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('source_table', table);
      stats.push({ source_table: table, count: count ?? 0 });
    }
    return stats;
  }
  return data;
}
