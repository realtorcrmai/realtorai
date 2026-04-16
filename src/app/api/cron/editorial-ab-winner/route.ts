import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function verifyBearerToken(header: string | null): boolean {
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const token = header.slice('Bearer '.length);
  try {
    // Pad both buffers to the same length to prevent timing oracle on length
    const maxLen = Math.max(token.length, secret.length);
    const tokenBuf = Buffer.alloc(maxLen);
    const secretBuf = Buffer.alloc(maxLen);
    Buffer.from(token).copy(tokenBuf);
    Buffer.from(secret).copy(secretBuf);
    return timingSafeEqual(tokenBuf, secretBuf) && token.length === secret.length;
  } catch {
    return false;
  }
}

// Vercel crons always call GET — delegate to the POST handler so both paths work
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  if (!verifyBearerToken(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  // Find editions in A/B testing state where the test window has elapsed
  // and no winner has been declared yet
  const { data: editions } = await supabase
    .from('editorial_editions')
    .select('id, realtor_id, subject_a, subject_b')
    .eq('active_variant', 'ab_testing')
    .lt('ab_test_sent_at', fourHoursAgo)
    .is('ab_winner', null);

  if (!editions || editions.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const edition of editions) {
    const { data: analytics } = await supabase
      .from('editorial_analytics')
      .select('variant_a_opens, variant_b_opens')
      .eq('edition_id', edition.id)
      .single();

    if (!analytics) {
      // No analytics row yet — skip this cycle; will retry in 2 hours
      continue;
    }

    const aOpens = analytics.variant_a_opens ?? 0;
    const bOpens = analytics.variant_b_opens ?? 0;

    // Variant B wins only when it strictly outperforms A; ties default to A
    const winner: 'a' | 'b' = bOpens > aOpens ? 'b' : 'a';

    await supabase
      .from('editorial_editions')
      .update({
        ab_winner: winner,
        active_variant: winner,
        updated_at: new Date().toISOString(),
      })
      .eq('id', edition.id);

    // Record the winning variant on the analytics row as well
    await supabase
      .from('editorial_analytics')
      .update({ winning_variant: winner, updated_at: new Date().toISOString() })
      .eq('edition_id', edition.id);

    console.log(
      `[ab-winner] Edition ${edition.id}: winner=${winner} (A: ${aOpens} opens, B: ${bOpens} opens)`,
    );
    processed++;
  }

  return NextResponse.json({ processed });
}
