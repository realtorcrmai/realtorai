import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createEdition, triggerGeneration } from '@/actions/editorial';

export const dynamic = 'force-dynamic';

// POST /api/editorial — create a new editorial edition and kick off generation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { edition_type, title } = (body ?? {}) as Record<string, unknown>;

  if (typeof edition_type !== 'string' || !edition_type) {
    return NextResponse.json({ error: 'edition_type is required' }, { status: 400 });
  }
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  // Create the edition record
  const createResult = await createEdition({ edition_type, title: title.trim() });
  if (createResult.error || !createResult.data) {
    return NextResponse.json(
      { error: createResult.error ?? 'Failed to create edition' },
      { status: 500 },
    );
  }

  const edition = createResult.data;

  // Fire-and-forget: mark as generating and kick off the generate endpoint.
  // Derive base URL from the incoming request so it works on any port/host.
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  fetch(`${baseUrl}/api/editorial/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}`,
    },
    body: JSON.stringify({ edition_id: edition.id }),
  }).catch(() => {
    // Intentionally swallow — generate route handles its own error state on the edition row
  });

  // Also update status to 'generating' immediately (matches triggerGeneration behaviour)
  // so the progress bar activates without waiting for the generate route to start
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  await admin
    .from('editorial_editions')
    .update({
      status: 'generating',
      generation_started_at: new Date().toISOString(),
      generation_error: null,
    })
    .eq('id', edition.id);

  return NextResponse.json({ id: edition.id }, { status: 201 });
}
