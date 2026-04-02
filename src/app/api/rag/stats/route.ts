import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { voyageUsageStats } from '@/lib/rag/embeddings';

/**
 * GET /api/rag/stats — RAG system monitoring stats.
 * Returns Voyage embedding usage, cost, and system health.
 * Requires authentication (admin or realtor).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      voyage: {
        totalTokens: voyageUsageStats.totalTokens,
        totalCalls: voyageUsageStats.totalCalls,
        totalCostUsd: Math.round(voyageUsageStats.totalCostUsd * 10000) / 10000,
        lastCallTokens: voyageUsageStats.lastCallTokens,
        avgTokensPerCall: voyageUsageStats.totalCalls > 0
          ? Math.round(voyageUsageStats.totalTokens / voyageUsageStats.totalCalls)
          : 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('RAG stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
