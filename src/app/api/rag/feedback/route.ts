import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveFeedback } from '@/lib/rag/feedback';
import type { FeedbackRequest } from '@/lib/rag/types';

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

    const body = (await req.json()) as FeedbackRequest;

    if (!body.session_id || body.message_index === undefined || !body.rating) {
      return NextResponse.json({ error: 'session_id, message_index, and rating are required' }, { status: 400 });
    }

    if (!['positive', 'negative'].includes(body.rating)) {
      return NextResponse.json({ error: 'rating must be "positive" or "negative"' }, { status: 400 });
    }

    const id = await saveFeedback(db, body);
    return NextResponse.json({ id });
  } catch (err) {
    console.error('RAG feedback error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
