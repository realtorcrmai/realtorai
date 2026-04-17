/**
 * GET /api/cron/refresh-external-data
 *
 * Proactively refreshes stale external data cache entries for all opted-in realtors.
 * Fetches Canadian/US mortgage rates and local events, upserts into external_data_cache.
 *
 * Auth: Bearer CRON_SECRET
 * Schedule: every 6 hours (see vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveExternalData } from '@/lib/newsletter/resolvers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[refresh-external-data] CRON_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
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
  const startedAt = Date.now()

  // ── Fetch all agent configs ─────────────────────────────────────────────────
  const { data: configs, error: configError } = await supabase
    .from('realtor_agent_config')
    .select('realtor_id, preferred_areas')

  if (configError) {
    console.error('[refresh-external-data] Failed to fetch agent configs:', configError.message)
    return NextResponse.json(
      { error: 'Failed to fetch agent configs', detail: configError.message },
      { status: 500 },
    )
  }

  if (!configs || configs.length === 0) {
    return NextResponse.json({ message: 'No agent configs found', processed: 0 })
  }

  const results = {
    total: configs.length,
    fresh: 0,
    cached: 0,
    errors: 0,
  }

  // ── Process each realtor ────────────────────────────────────────────────────
  for (const config of configs) {
    const realtorId = config.realtor_id as string
    const preferredAreas = config.preferred_areas as string[] | null

    const city =
      Array.isArray(preferredAreas) && preferredAreas.length > 0
        ? preferredAreas[0]
        : 'Vancouver, BC'

    try {
      const resolved = await resolveExternalData(realtorId, city, supabase)

      results.fresh += resolved.cache_misses.length
      results.cached += resolved.cache_hits.length

      if (resolved.cache_misses.length > 0) {
        console.info(
          `[refresh-external-data] Refreshed for realtor ${realtorId} (${city}):`,
          resolved.cache_misses.join(', '),
        )
      }
    } catch (err) {
      results.errors++
      console.error(
        `[refresh-external-data] Error for realtor ${realtorId} (${city}):`,
        err,
      )
    }
  }

  const durationMs = Date.now() - startedAt

  console.info('[refresh-external-data] Complete:', { ...results, durationMs })

  return NextResponse.json({
    ok: true,
    ...results,
    duration_ms: durationMs,
  })
}
