import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { saveFeedback } from '@/lib/rag/feedback';
import type { FeedbackRequest } from '@/lib/rag/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as FeedbackRequest;

    if (!body.session_id || body.message_index === undefined || !body.rating) {
      return NextResponse.json({ error: 'session_id, message_index, and rating are required' }, { status: 400 });
    }

    if (!['positive', 'negative'].includes(body.rating)) {
      return NextResponse.json({ error: 'rating must be "positive" or "negative"' }, { status: 400 });
    }

    const id = await saveFeedback(body);
    return NextResponse.json({ id });
  } catch (err) {
    console.error('RAG feedback error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
