import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Verify a Svix webhook signature.
 * Resend uses Svix, which signs: "{svix-id}.{svix-timestamp}.{rawBody}"
 * The secret has a "whsec_" prefix and is base64-encoded.
 * The svix-signature header is a space-separated list of "v1,<base64sig>" entries.
 */
function verifyResendSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? '';
  if (!secret || !svixId || !svixTimestamp || !svixSignature) return false;
  try {
    // Svix signs: "{id}.{timestamp}.{body}"
    const signPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
    // Secret may have whsec_ prefix — strip it and decode base64
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expectedSig = createHmac('sha256', secretBytes)
      .update(signPayload)
      .digest('base64');
    // svix-signature is space-separated list of "v1,<base64sig>" entries
    const sigs = svixSignature.split(' ');
    return sigs.some(sig => {
      const [, hash] = sig.split(',');
      if (!hash) return false;
      try {
        const hashBuf = Buffer.from(hash, 'base64');
        const expectedBuf = Buffer.from(expectedSig, 'base64');
        if (hashBuf.length !== expectedBuf.length) return false;
        return timingSafeEqual(hashBuf, expectedBuf);
      } catch { return false; }
    });
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  // In production, require RESEND_WEBHOOK_SECRET — fail safe if not configured
  if (!webhookSecret && process.env.NODE_ENV === 'production') {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not set in production');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const svixId = req.headers.get('svix-id') ?? '';
  const svixTimestamp = req.headers.get('svix-timestamp') ?? '';
  const svixSignature = req.headers.get('svix-signature') ?? '';

  // Verify Svix signature — skip in dev when secret is not configured
  if (webhookSecret && !verifyResendSignature(rawBody, svixId, svixTimestamp, svixSignature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.type as string;
  const data = (event.data ?? {}) as Record<string, unknown>;
  const tags = (data.tags ?? []) as Array<{ name: string; value: string }>;
  const editionId = tags.find((t) => t.name === 'edition_id')?.value;
  const abVariant = tags.find((t) => t.name === 'ab_variant')?.value as 'a' | 'b' | undefined;

  // Not an editorial email — acknowledge and exit
  if (!editionId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  // Fetch edition to get realtor_id (needed for analytics upsert)
  const { data: edition } = await supabase
    .from('editorial_editions')
    .select('id, realtor_id')
    .eq('id', editionId)
    .single();

  if (!edition) {
    return NextResponse.json({ received: true });
  }

  // Ensure analytics row exists (idempotent)
  await supabase
    .from('editorial_analytics')
    .upsert(
      { edition_id: editionId, realtor_id: edition.realtor_id },
      { onConflict: 'edition_id', ignoreDuplicates: true },
    );

  // ── email.opened ─────────────────────────────────────────────────────────────
  // Uses atomic RPC (migration 118) — no SELECT needed, avoids race conditions.
  if (eventType === 'email.opened') {
    await supabase.rpc('increment_editorial_opens', {
      p_edition_id: editionId,
      p_variant: abVariant ?? null,
    });
  }

  // ── email.clicked ─────────────────────────────────────────────────────────────
  else if (eventType === 'email.clicked') {
    const clickUrl = ((data.click ?? {}) as Record<string, unknown>).link as string ?? '';
    let blockId = 'unknown';
    let ctaType = 'link';
    try {
      const urlObj = new URL(clickUrl, 'https://placeholder.com');
      blockId = urlObj.searchParams.get('utm_block') ?? 'unknown';
      ctaType = urlObj.searchParams.get('utm_cta') ?? 'link';
    } catch {
      // Malformed URL — use defaults
    }
    await supabase.rpc('increment_editorial_clicks', {
      p_edition_id: editionId,
      p_variant: abVariant ?? null,
      p_block_id: blockId,
      p_cta_type: ctaType,
    });
  }

  // ── email.bounced ─────────────────────────────────────────────────────────────
  else if (eventType === 'email.bounced') {
    await supabase.rpc('increment_editorial_bounces', { p_edition_id: editionId });

    // Auto-suppress bounced contact to prevent future sends
    const toEmail = data.to as string | undefined;
    if (toEmail) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, realtor_id')
        .eq('email', toEmail)
        .maybeSingle();

      if (contact) {
        await supabase
          .from('contact_suppressions')
          .upsert(
            {
              contact_id: contact.id,
              realtor_id: contact.realtor_id,
              reason: 'bounced',
              suppressed_at: new Date().toISOString(),
            },
            { onConflict: 'contact_id,realtor_id', ignoreDuplicates: true },
          );
      }
    }
  }

  // ── email.unsubscribed ────────────────────────────────────────────────────────
  else if (eventType === 'email.unsubscribed') {
    await supabase.rpc('increment_editorial_unsubscribes', { p_edition_id: editionId });
  }

  return NextResponse.json({ received: true });
}
