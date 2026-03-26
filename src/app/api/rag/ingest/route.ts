import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ingestRecord } from '@/lib/rag/ingestion';
import type { SourceTable } from '@/lib/rag/types';

const VALID_TABLES: SourceTable[] = [
  'communications', 'activities', 'newsletters', 'contacts', 'listings',
  'agent_recommendations', 'message_templates', 'offers', 'offer_conditions',
  'knowledge_articles', 'competitive_emails',
];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { source_table, source_id } = body as { source_table: string; source_id: string };

    if (!source_table || !source_id) {
      return NextResponse.json({ error: 'source_table and source_id are required' }, { status: 400 });
    }

    if (!VALID_TABLES.includes(source_table as SourceTable)) {
      return NextResponse.json({ error: `Invalid source_table: ${source_table}` }, { status: 400 });
    }

    const result = await ingestRecord(source_table as SourceTable, source_id);
    return NextResponse.json(result);
  } catch (err) {
    console.error('RAG ingest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
