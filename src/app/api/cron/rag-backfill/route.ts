import { NextRequest, NextResponse } from 'next/server';
import { backfillAll } from '@/lib/rag/ingestion';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const batchSize = Number(req.nextUrl.searchParams.get('batch_size')) || 50;

    const result = await backfillAll(batchSize);

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('RAG backfill error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
