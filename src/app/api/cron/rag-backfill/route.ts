import { NextRequest, NextResponse } from 'next/server';
import { backfillAll } from '@/lib/rag/ingestion';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBatchSize = Number(req.nextUrl.searchParams.get('batch_size')) || 50;
    const batchSize = Math.max(1, Math.min(1000, rawBatchSize));
    const db = createAdminClient();

    const result = await backfillAll(db, batchSize);

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('RAG backfill error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
