import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/detect-dormant
 * Moves stale lead/active journeys to dormant phase after 90 days of inactivity.
 * Protected by CRON_SECRET bearer token.
 * Scheduled daily at 2:00 AM UTC via vercel.json.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Find active/lead journeys with no activity in 90 days
  const { data: staleJourneys, error } = await supabase
    .from('contact_journeys')
    .select('id, contact_id, journey_type, current_phase')
    .in('current_phase', ['lead', 'active'])
    .eq('is_paused', false)
    .lt('updated_at', ninetyDaysAgo)

  if (error) {
    console.error('[cron/detect-dormant] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let moved = 0
  for (const journey of staleJourneys ?? []) {
    const { error: updateError } = await supabase
      .from('contact_journeys')
      .update({ current_phase: 'dormant', updated_at: new Date().toISOString() })
      .eq('id', journey.id)

    if (!updateError) {
      moved++
    } else {
      console.error(`[cron/detect-dormant] failed to move journey ${journey.id}:`, updateError)
    }
  }

  return NextResponse.json({ moved, checked: (staleJourneys ?? []).length, timestamp: new Date().toISOString() })
}
