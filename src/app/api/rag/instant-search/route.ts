import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { instantSearch } from '@/lib/rag/instant-search';

/**
 * A25: Instant deterministic search — no AI, no embeddings.
 * Returns contacts, listings, and showings matching by name/address.
 * Target: <100ms response time.
 * Always uses tenant client — never admin (G2 security fix).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tc = await getAuthenticatedTenantClient();
    const db = tc.raw;

    const q = req.nextUrl.searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await instantSearch(db, q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('Instant search error:', err);
    return NextResponse.json({ results: [] });
  }
}
