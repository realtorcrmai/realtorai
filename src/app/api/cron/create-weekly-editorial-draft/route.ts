import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/create-weekly-editorial-draft
 *
 * Monday 6 AM UTC cron — creates a draft editorial edition for every opted-in
 * agent (those with `editorial_auto_draft = true` in realtor_agent_config, or
 * those who have an `is_default = true` voice profile) and fires generation.
 *
 * Auth: Bearer CRON_SECRET (timing-safe comparison)
 *
 * Returns: { processed, created, skipped, errors, details }
 */
export async function GET(request: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[create-weekly-editorial-draft] CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET missing' },
      { status: 500 },
    )
  }

  const authHeader = request.headers.get('authorization')
  const BEARER_PREFIX = 'Bearer '
  let authorized = false
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    const token = authHeader.slice(BEARER_PREFIX.length)
    try {
      const maxLen = Math.max(token.length, cronSecret.length)
      const tokenBuf = Buffer.alloc(maxLen)
      const secretBuf = Buffer.alloc(maxLen)
      Buffer.from(token).copy(tokenBuf)
      Buffer.from(cronSecret).copy(secretBuf)
      authorized = timingSafeEqual(tokenBuf, secretBuf) && token.length === cronSecret.length
    } catch {
      authorized = false
    }
  }
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // ── 2. Resolve opted-in realtors ─────────────────────────────────────────
  // Collect IDs from two sources — union them, deduplicate:
  //   a) realtor_agent_config.editorial_auto_draft = true
  //   b) any realtor who has an is_default voice profile (early adopters)
  const realtorIds = new Set<string>()

  // Source (a): explicit opt-in flag
  const { data: autoRows } = await supabase
    .from('realtor_agent_config')
    .select('realtor_id')
    .eq('editorial_auto_draft', true)

  for (const row of autoRows ?? []) {
    if (row.realtor_id) realtorIds.add(row.realtor_id)
  }

  // Source (b): has a default voice profile (opted in by setting up their profile)
  const { data: profileRows } = await supabase
    .from('editorial_voice_profiles')
    .select('realtor_id')
    .eq('is_default', true)

  for (const row of profileRows ?? []) {
    if (row.realtor_id) realtorIds.add(String(row.realtor_id))
  }

  const allRealtorIds = Array.from(realtorIds)

  // ── 3. Determine edition type rotation based on week of year ─────────────
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000)
  const weekOfYear = Math.floor(dayOfYear / 7)

  const EDITION_TYPES = [
    'market_update',
    'just_sold',
    'rate_watch',
    'neighbourhood_spotlight',
  ] as const
  type RotatingEditionType = (typeof EDITION_TYPES)[number]
  const editionType: RotatingEditionType = EDITION_TYPES[weekOfYear % 4]

  // ── 4. Start-of-current-week boundary ────────────────────────────────────
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday = 0
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfWeekIso = startOfWeek.toISOString()

  // ── 5. Process each realtor ───────────────────────────────────────────────
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const monthName = MONTH_NAMES[now.getMonth()]
  const year = now.getFullYear()

  const summary = {
    processed: allRealtorIds.length,
    created: 0,
    skipped: 0,
    errors: 0,
    details: [] as Array<{
      realtor_id: string
      action: 'created' | 'skipped' | 'error'
      edition_id?: string
      reason?: string
    }>,
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  for (const realtorId of allRealtorIds) {
    try {
      // a. Skip if a draft/generating edition already exists this week
      const { data: existingEditions } = await supabase
        .from('editorial_editions')
        .select('id, status')
        .eq('realtor_id', realtorId)
        .in('status', ['draft', 'generating', 'ready', 'scheduled'])
        .gte('created_at', startOfWeekIso)
        .limit(1)

      if (existingEditions && existingEditions.length > 0) {
        summary.skipped++
        summary.details.push({
          realtor_id: realtorId,
          action: 'skipped',
          reason: 'Already has an edition this week',
        })
        continue
      }

      // b. Get agent's preferred city from realtor_agent_config
      const { data: agentConfig } = await supabase
        .from('realtor_agent_config')
        .select('preferred_areas')
        .eq('realtor_id', realtorId)
        .maybeSingle()

      let city = 'Vancouver, BC'
      if (
        agentConfig?.preferred_areas &&
        Array.isArray(agentConfig.preferred_areas) &&
        agentConfig.preferred_areas.length > 0
      ) {
        city = agentConfig.preferred_areas[0] as string
      }

      // c. Create the edition and trigger generation
      const result = await createAndTriggerDraft(
        realtorId,
        editionType,
        city,
        monthName,
        year,
        baseUrl,
        cronSecret,
        supabase,
      )

      summary.created++
      summary.details.push({
        realtor_id: realtorId,
        action: 'created',
        edition_id: result.edition_id,
      })
    } catch (err) {
      // One agent failing must not stop others
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[create-weekly-editorial-draft] Failed for realtor ${realtorId}:`, msg)
      summary.errors++
      summary.details.push({
        realtor_id: realtorId,
        action: 'error',
        reason: msg,
      })
    }
  }

  console.log(
    `[create-weekly-editorial-draft] Done — processed=${summary.processed} created=${summary.created} skipped=${summary.skipped} errors=${summary.errors}`,
  )

  return NextResponse.json(summary)
}

// ── Local helper ──────────────────────────────────────────────────────────────

async function createAndTriggerDraft(
  realtorId: string,
  editionType: string,
  city: string,
  monthName: string,
  year: number,
  baseUrl: string,
  cronSecret: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createAdminClient>,
): Promise<{ edition_id: string; success: boolean }> {
  const title = `${editionType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')} — ${monthName} ${year}`

  // Get the next edition_number for this realtor
  const { data: maxRow } = await supabase
    .from('editorial_editions')
    .select('edition_number')
    .eq('realtor_id', realtorId)
    .order('edition_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextNumber = ((maxRow as { edition_number?: number } | null)?.edition_number ?? 0) + 1

  // Insert the edition row
  const { data: edition, error: insertError } = await supabase
    .from('editorial_editions')
    .insert({
      realtor_id: realtorId,
      title,
      edition_type: editionType,
      edition_number: nextNumber,
      status: 'generating',
      blocks: [],
      active_variant: 'a',
      send_count: 0,
      recipient_count: 0,
      generation_started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !edition) {
    throw new Error(`Insert failed: ${insertError?.message ?? 'no data returned'}`)
  }

  // Create companion analytics row
  await supabase
    .from('editorial_analytics')
    .upsert(
      { edition_id: edition.id, realtor_id: realtorId },
      { onConflict: 'edition_id', ignoreDuplicates: true },
    )

  // Fire-and-forget generation — do NOT await so we can process next realtor
  fetch(`${baseUrl}/api/editorial/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ edition_id: edition.id }),
  }).catch((err: unknown) => {
    console.warn(
      `[create-weekly-editorial-draft] Generation trigger failed for edition ${edition.id}:`,
      err instanceof Error ? err.message : err,
    )
  })

  return { edition_id: edition.id, success: true }
}
