import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { retrieveContext } from '@/lib/rag/retriever';
import type { SearchFilters } from '@/lib/rag/types';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = (session.user as { role?: string }).role === 'admin';
    const db = isAdmin
      ? createAdminClient()
      : (await getAuthenticatedTenantClient()).raw;

    const body = await req.json();
    const { query, filters = {}, top_k = 5 } = body as {
      query: string;
      filters?: SearchFilters;
      top_k?: number;
    };

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const result = await retrieveContext(db, query, filters, top_k);

    return NextResponse.json({
      results: result.results,
      sources: result.sources,
      count: result.results.length,
    });
  } catch (err) {
    console.error('RAG search error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
