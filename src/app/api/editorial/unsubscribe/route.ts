import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** Generate HMAC token including a timestamp for expiry support */
function generateToken(email: string, editionId: string, ts: number): string {
  const secret = process.env.NEXTAUTH_SECRET ?? ''
  return createHmac('sha256', secret)
    .update(`${email}:${editionId}:${ts}`)
    .digest('hex')
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const email = searchParams.get('email')
  const editionId = searchParams.get('edition_id')
  const token = searchParams.get('token')
  const tsParam = searchParams.get('ts')

  if (!email || !editionId || !token || !tsParam) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  const ts = parseInt(tsParam, 10)
  if (isNaN(ts)) {
    return NextResponse.json({ error: 'Invalid token parameters' }, { status: 400 })
  }

  // Validate 30-day expiry
  const ageSeconds = Math.floor(Date.now() / 1000) - ts
  if (ageSeconds < 0 || ageSeconds > 30 * 86400) {
    return NextResponse.json({ error: 'Unsubscribe link has expired' }, { status: 403 })
  }

  // Constant-time HMAC comparison (prevents timing attacks)
  const expectedToken = generateToken(email, editionId, ts)
  let tokenMatch = false
  try {
    const tokenBuf = Buffer.from(token, 'hex')
    const expectedBuf = Buffer.from(expectedToken, 'hex')
    if (tokenBuf.length === expectedBuf.length) {
      tokenMatch = timingSafeEqual(tokenBuf, expectedBuf)
    }
  } catch { tokenMatch = false }
  if (!tokenMatch) {
    return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 403 })
  }

  const supabase = createAdminClient()

  // Mark contact as unsubscribed
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, realtor_id')
    .eq('email', email)
    .single()

  if (contact) {
    await supabase
      .from('contacts')
      .update({ casl_consent_given: false })
      .eq('id', contact.id)

    // Insert suppression record (suppress future sends even if consent is re-given via other path)
    await supabase
      .from('contact_suppressions')
      .upsert(
        {
          contact_id: contact.id,
          realtor_id: contact.realtor_id,
          reason: 'unsubscribed',
          suppressed_at: new Date().toISOString(),
        },
        { onConflict: 'contact_id,realtor_id', ignoreDuplicates: true },
      )
      .then(() => {}) // suppress errors if table doesn't exist
  }

  // Return simple HTML confirmation
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
    <style>body{font-family:sans-serif;text-align:center;padding:80px 20px;color:#1a1535;}
    h1{color:#059669;}p{color:#6b6b8d;margin-top:12px;}</style></head>
    <body><h1>&#10003; You've been unsubscribed</h1>
    <p>You will no longer receive newsletters from this agent.</p>
    <p style="margin-top:32px;font-size:13px;">If this was a mistake, please contact the agent directly to re-subscribe.</p>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
