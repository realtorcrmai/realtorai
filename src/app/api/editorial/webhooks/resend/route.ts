import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function verifyResendSignature(payload: string, signature: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? '';
  if (!secret || !signature) return false;
  try {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature =
    req.headers.get('svix-signature') ?? req.headers.get('resend-signature') ?? '';

  // Verify signature — skip in dev when secret is not configured
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret && !verifyResendSignature(rawBody, signature)) {
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
  if (eventType === 'email.opened') {
    const { data: row } = await supabase
      .from('editorial_analytics')
      .select('opens, variant_a_opens, variant_b_opens, recipients')
      .eq('edition_id', editionId)
      .single();

    if (row) {
      const newOpens = (row.opens ?? 0) + 1;
      const newVarAOpens =
        abVariant === 'a' ? (row.variant_a_opens ?? 0) + 1 : (row.variant_a_opens ?? 0);
      const newVarBOpens =
        abVariant === 'b' ? (row.variant_b_opens ?? 0) + 1 : (row.variant_b_opens ?? 0);
      const newOpenRate =
        row.recipients > 0 ? Math.round((newOpens / row.recipients) * 10000) / 100 : 0;

      await supabase
        .from('editorial_analytics')
        .update({
          opens: newOpens,
          variant_a_opens: newVarAOpens,
          variant_b_opens: newVarBOpens,
          open_rate: newOpenRate,
          updated_at: new Date().toISOString(),
        })
        .eq('edition_id', editionId);
    }
  }

  // ── email.clicked ─────────────────────────────────────────────────────────────
  else if (eventType === 'email.clicked') {
    const clickData = (data.click ?? {}) as Record<string, unknown>;
    const clickUrl = (clickData.link as string) ?? '';

    const { data: row } = await supabase
      .from('editorial_analytics')
      .select(
        'clicks, variant_a_clicks, variant_b_clicks, recipients, block_clicks, cta_clicks, high_intent_clicks',
      )
      .eq('edition_id', editionId)
      .single();

    if (row) {
      const newClicks = (row.clicks ?? 0) + 1;
      const newVarAClicks =
        abVariant === 'a' ? (row.variant_a_clicks ?? 0) + 1 : (row.variant_a_clicks ?? 0);
      const newVarBClicks =
        abVariant === 'b' ? (row.variant_b_clicks ?? 0) + 1 : (row.variant_b_clicks ?? 0);
      const newClickRate =
        row.recipients > 0 ? Math.round((newClicks / row.recipients) * 10000) / 100 : 0;

      // Track block-level clicks via utm_block URL param
      let blockId = 'unknown';
      let ctaType = 'link';
      try {
        const urlObj = new URL(clickUrl, 'https://placeholder.com');
        blockId = urlObj.searchParams.get('utm_block') ?? 'unknown';
        ctaType = urlObj.searchParams.get('utm_cta') ?? 'link';
      } catch {
        // Malformed URL — use defaults
      }

      const blockClicks = ((row.block_clicks ?? {}) as Record<string, number>);
      blockClicks[blockId] = (blockClicks[blockId] ?? 0) + 1;

      const ctaClicks = ((row.cta_clicks ?? {}) as Record<string, number>);
      ctaClicks[ctaType] = (ctaClicks[ctaType] ?? 0) + 1;

      const HIGH_INTENT_CTAS = new Set(['book_showing', 'request_cma', 'contact_agent']);
      const isHighIntent = HIGH_INTENT_CTAS.has(ctaType);

      await supabase
        .from('editorial_analytics')
        .update({
          clicks: newClicks,
          variant_a_clicks: newVarAClicks,
          variant_b_clicks: newVarBClicks,
          click_rate: newClickRate,
          block_clicks: blockClicks,
          cta_clicks: ctaClicks,
          high_intent_clicks: isHighIntent
            ? (row.high_intent_clicks ?? 0) + 1
            : (row.high_intent_clicks ?? 0),
          updated_at: new Date().toISOString(),
        })
        .eq('edition_id', editionId);
    }
  }

  // ── email.bounced ─────────────────────────────────────────────────────────────
  else if (eventType === 'email.bounced') {
    const { data: row } = await supabase
      .from('editorial_analytics')
      .select('bounced')
      .eq('edition_id', editionId)
      .single();

    if (row) {
      await supabase
        .from('editorial_analytics')
        .update({
          bounced: (row.bounced ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('edition_id', editionId);
    }

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
    const { data: row } = await supabase
      .from('editorial_analytics')
      .select('unsubscribed')
      .eq('edition_id', editionId)
      .single();

    if (row) {
      await supabase
        .from('editorial_analytics')
        .update({
          unsubscribed: (row.unsubscribed ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('edition_id', editionId);
    }
  }

  return NextResponse.json({ received: true });
}
