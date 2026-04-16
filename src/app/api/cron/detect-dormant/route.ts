import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/detect-dormant
 * Moves stale lead/active journeys to dormant phase after 90 days of no email engagement.
 * Protected by CRON_SECRET bearer token.
 * Scheduled daily at 2:00 AM UTC via vercel.json.
 *
 * Optional query param:
 *   ?realtor_id=<uuid>  — scope to a single realtor (M-17)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  // BUG-25: Guard against undefined CRON_SECRET — prevents "Bearer undefined" bypass
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // M-17: Optional realtor scoping — cron can be called per-realtor or globally
  const { searchParams } = new URL(request.url)
  const realtorFilter = searchParams.get('realtor_id')

  // M-16: Detect dormancy based on email engagement (last_opened / last_clicked),
  // not data changes (updated_at). Fall back to updated_at only when no engagement
  // data exists (i.e. contact has never received an email).
  //
  // We join contacts to read newsletter_intelligence and apply the engagement filter
  // in application code since Supabase PostgREST doesn't support JSONB cross-table
  // OR filters in a single .or() call on joined tables.
  let query = supabase
    .from('contact_journeys')
    .select('id, contact_id, journey_type, current_phase, updated_at, contacts(newsletter_intelligence)')
    .in('current_phase', ['lead', 'active'])
    .eq('is_paused', false)
    // Primary staleness guard: updated_at < 90 days (catches contacts with no engagement data)
    .lt('updated_at', ninetyDaysAgo)

  // M-17: Scope to specific realtor if provided
  if (realtorFilter) {
    query = query.eq('realtor_id', realtorFilter)
  }

  const { data: candidateJourneys, error } = await query

  if (error) {
    console.error('[cron/detect-dormant] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // M-16: Filter out contacts that DO have recent engagement (last_opened or last_clicked
  // within the past 90 days) — those should NOT be marked dormant even if updated_at is stale.
  const staleJourneys = (candidateJourneys ?? []).filter((journey) => {
    const intel = (journey.contacts as any)?.newsletter_intelligence as Record<string, string> | null
    if (!intel) return true // no engagement data → treat as dormant candidate

    const lastOpened = intel.last_opened ? new Date(intel.last_opened) : null
    const lastClicked = intel.last_clicked ? new Date(intel.last_clicked) : null
    const cutoff = new Date(ninetyDaysAgo)

    // If either engagement date is more recent than the cutoff, skip this contact
    if (lastOpened && lastOpened > cutoff) return false
    if (lastClicked && lastClicked > cutoff) return false

    return true
  })

  // BUG-28 + BUG-24: Single bulk UPDATE (no timeout risk) + set next_email_at so
  // the re-engagement queue picks them up immediately (not NULL-filtered out).
  let moved = 0
  if (staleJourneys.length > 0) {
    const ids = staleJourneys.map((j) => j.id)
    const now = new Date().toISOString()
    const { error: bulkError } = await supabase
      .from('contact_journeys')
      .update({
        current_phase: 'dormant',
        next_email_at: now,        // Trigger re-engagement queue pickup
        emails_sent_in_phase: 0,   // Reset counter for re-engagement sequence
        phase_entered_at: now,
        updated_at: now,
      })
      .in('id', ids)

    if (bulkError) {
      console.error('[cron/detect-dormant] bulk update error:', bulkError)
    } else {
      moved = ids.length
    }
  }

  return NextResponse.json({
    moved,
    checked: (candidateJourneys ?? []).length,
    filtered_by_engagement: (candidateJourneys ?? []).length - staleJourneys.length,
    realtor_filter: realtorFilter ?? 'all',
    timestamp: new Date().toISOString(),
  })
}
