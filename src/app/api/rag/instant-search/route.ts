import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { instantSearch } from '@/lib/rag/instant-search';

/**
 * A25: Instant deterministic search — no AI, no embeddings.
 * Returns contacts, listings, and showings matching by name/address.
 * Target: <100ms response time.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const q = req.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await instantSearch(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('Instant search error:', err);
    return NextResponse.json({ results: [] });
  }
}
