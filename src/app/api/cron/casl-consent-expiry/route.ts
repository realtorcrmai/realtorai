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

export async function POST(req: NextRequest) {
  if (!verifyBearerToken(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // CASL express consent expires after 2 years
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // Find contacts where CASL consent was given but consent_date is older than 2 years
  const { data: expiredContacts, error } = await supabase
    .from('contacts')
    .select('id')
    .eq('casl_consent_given', true)
    .not('casl_consent_date', 'is', null)
    .lt('casl_consent_date', twoYearsAgo.toISOString());

  if (error) {
    // Column may not exist yet — log and return gracefully so cron does not alert
    console.warn('[casl-expiry] Query failed (column may not exist):', error.message);
    return NextResponse.json({ expired: 0, skipped: true });
  }

  if (!expiredContacts || expiredContacts.length === 0) {
    return NextResponse.json({ expired: 0 });
  }

  // Expire in batches of 100 to stay within Supabase query limits
  const ids = expiredContacts.map((c) => c.id);
  const batchSize = 100;
  let expired = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { data: updated } = await supabase
      .from('contacts')
      .update({ casl_consent_given: false })
      .in('id', batch)
      .select('id');
    expired += updated?.length ?? 0;
  }

  console.log(`[casl-expiry] Expired CASL consent for ${expired} contact(s)`);
  return NextResponse.json({ expired });
}
