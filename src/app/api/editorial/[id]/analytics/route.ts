import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid edition ID' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: edition } = await supabase
    .from('editorial_editions')
    .select('id, title, status, sent_at, send_count, recipient_count, subject_a, subject_b, active_variant, ab_winner')
    .eq('id', id)
    .eq('realtor_id', session.user.id)
    .single()

  if (!edition) {
    return NextResponse.json({ error: 'Edition not found' }, { status: 404 })
  }

  const { data: analytics } = await supabase
    .from('editorial_analytics')
    .select('*')
    .eq('edition_id', id)
    .single()

  return NextResponse.json({ edition, analytics: analytics ?? null })
}
