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

  // ── Rate limit: max 10 editions per user per calendar day ────────────────
  // Prevents Claude API credit drain from unlimited edition creation.
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { createAdminClient: createAdminClientForRateLimit } = await import('@/lib/supabase/admin')
  const adminForRateLimit = createAdminClientForRateLimit()

  const { count: todayCount } = await adminForRateLimit
    .from('editorial_editions')
    .select('id', { count: 'exact', head: true })
    .eq('realtor_id', session.user.id)
    .gte('created_at', todayStart.toISOString())

  if ((todayCount ?? 0) >= 10) {
    return NextResponse.json(
      { error: 'Daily edition limit reached (10 per day). Please try again tomorrow.' },
      { status: 429 },
    )
  }

  // ── Prevent concurrent generations ───────────────────────────────────────
  // Only one edition may be in 'generating' status at a time per user.
  const { count: generatingCount } = await adminForRateLimit
    .from('editorial_editions')
    .select('id', { count: 'exact', head: true })
    .eq('realtor_id', session.user.id)
    .eq('status', 'generating')

  if ((generatingCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Another edition is currently generating. Please wait for it to complete.' },
      { status: 429 },
    )
  }

  const { edition_type, title } = (body ?? {}) as Record<string, unknown>;

  const VALID_EDITION_TYPES = ['market_update', 'just_sold', 'open_house', 'neighbourhood_spotlight', 'rate_watch', 'seasonal'] as const;
  if (typeof edition_type !== 'string' || !VALID_EDITION_TYPES.includes(edition_type as typeof VALID_EDITION_TYPES[number])) {
    return NextResponse.json({ error: `edition_type must be one of: ${VALID_EDITION_TYPES.join(', ')}` }, { status: 400 });
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
    .eq('id', edition.id)
    .eq('realtor_id', session.user.id);

  return NextResponse.json({ id: edition.id }, { status: 201 });
}
