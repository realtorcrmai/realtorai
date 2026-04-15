import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateAllBlocks,
  generateSubjectLines,
  getMarketDataFallback,
  type EditorBlock,
  type EditionContext,
  type VoiceProfile,
} from '@/lib/editorial-ai'
import type { EditorialVoiceProfile } from '@/types/editorial'

export const dynamic = 'force-dynamic'

/**
 * POST /api/editorial/generate
 *
 * Internal background worker called by triggerGeneration() with fire-and-forget.
 * Auth: Bearer token matching CRON_SECRET (NOT a user session — this is a
 *       service-to-service call from the server action layer).
 *
 * Body: { edition_id: string }
 *
 * Flow:
 *  1. Auth via CRON_SECRET
 *  2. Fetch edition (status must be 'generating')
 *  3. Optionally fetch voice profile
 *  4. Resolve market data (cache or fallback)
 *  5. generateAllBlocks — fills non-locked, non-divider blocks via Claude
 *  6. generateSubjectLines — two A/B subject lines via Claude Haiku
 *  7. Persist results, set status = 'ready'
 *  8. On any error: set status = 'failed' + store error message
 */
export async function POST(request: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[editorial/generate] CRON_SECRET env var not configured')
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET missing' },
      { status: 500 },
    )
  }

  const authHeader = request.headers.get('authorization')
  // Validate Bearer prefix explicitly before timing-safe token comparison
  const BEARER_PREFIX = 'Bearer '
  let authorized = false
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    const token = authHeader.slice(BEARER_PREFIX.length)
    // Timing-safe comparison: always run on same-length padded buffers so an
    // attacker cannot determine secret length via response time. Length equality
    // is checked separately after the constant-time comparison.
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

  // ── 2. Parse & validate body ───────────────────────────────────────────────
  let editionId: string
  try {
    const body = await request.json()
    editionId = body?.edition_id
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!editionId || typeof editionId !== 'string' || !UUID_RE.test(editionId)) {
    return NextResponse.json(
      { error: 'edition_id must be a valid UUID' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  // ── 3. Fetch edition ───────────────────────────────────────────────────────
  const { data: edition, error: fetchError } = await supabase
    .from('editorial_editions')
    .select(
      'id, realtor_id, title, edition_type, status, blocks, voice_profile_id, updated_at, generation_started_at',
    )
    .eq('id', editionId)
    .single()

  if (fetchError || !edition) {
    console.error('[editorial/generate] Edition not found:', editionId, fetchError?.message)
    return NextResponse.json({ error: 'Edition not found' }, { status: 404 })
  }

  // ── 4. Guard: only process editions in 'generating' state ─────────────────
  if (edition.status !== 'generating') {
    return NextResponse.json(
      { error: `Edition status is '${edition.status}', expected 'generating'` },
      { status: 409 },
    )
  }

  // Atomic claim: try to mark as "processing" — only one worker wins.
  // We use a generation_started_at timestamp as an idempotency key.
  // If generation started more than 3 minutes ago and status is still 'generating',
  // allow re-processing (stale generation recovery). Otherwise reject.
  const THREE_MINUTES_AGO = new Date(Date.now() - 3 * 60 * 1000).toISOString()
  const isStale =
    edition.generation_started_at && edition.generation_started_at < THREE_MINUTES_AGO

  if (!isStale) {
    // Check if another worker already advanced past our checkpoint
    // by attempting an update that only succeeds if nothing changed the row since we read it
    const { data: claimed } = await supabase
      .from('editorial_editions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', editionId)
      .eq('status', 'generating')
      .eq('updated_at', edition.updated_at ?? '') // optimistic lock
      .select('id')

    if (!claimed || claimed.length === 0) {
      return NextResponse.json(
        { error: 'Edition is being processed by another worker' },
        { status: 409 },
      )
    }
  }

  // Wrap everything from here in try/catch so we can always mark failed
  try {
    // ── 5. Resolve voice profile ─────────────────────────────────────────────
    let voiceProfile: VoiceProfile | undefined

    if (edition.voice_profile_id) {
      const { data: vp } = await supabase
        .from('editorial_voice_profiles')
        .select('*')
        .eq('id', edition.voice_profile_id)
        .single()

      if (vp) {
        const typedVp = vp as EditorialVoiceProfile
        voiceProfile = {
          tone: typedVp.tone,
          writing_style: typedVp.style_description ?? '',
          signature_phrase: typedVp.default_sign_off ?? undefined,
          voice_rules: typedVp.writing_examples?.length
            ? typedVp.preferred_phrases.concat(typedVp.writing_examples)
            : typedVp.preferred_phrases,
        }
      }
    }

    // ── 5b. Resolve agent's market city from realtor_agent_config ───────────
    let agentCity = 'Vancouver, BC' // fallback
    const { data: agentConfig } = await supabase
      .from('realtor_agent_config')
      .select('preferred_areas')
      .eq('realtor_id', edition.realtor_id)
      .single()

    if (
      agentConfig?.preferred_areas &&
      Array.isArray(agentConfig.preferred_areas) &&
      agentConfig.preferred_areas.length > 0
    ) {
      agentCity = agentConfig.preferred_areas[0]
    }

    // ── 6. Resolve market data (cache → fallback) ──────────────────────────
    const cacheKey = `${edition.edition_type}_${agentCity.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 7)}` // e.g. "market_update_vancouver_bc_2026-04"

    const { data: cacheRow } = await supabase
      .from('external_data_cache')
      .select('payload, expires_at')
      .eq('realtor_id', edition.realtor_id)
      .eq('cache_key', cacheKey)
      .single()

    let marketData: EditionContext['market_data']

    const now = new Date()
    const cacheValid =
      cacheRow &&
      cacheRow.expires_at &&
      new Date(cacheRow.expires_at) > now &&
      cacheRow.payload &&
      Object.keys(cacheRow.payload).length > 0

    if (cacheValid) {
      marketData = cacheRow.payload as EditionContext['market_data']
    } else {
      // Generate fresh market data and cache it for 7 days
      marketData = await getMarketDataFallback(
        edition.edition_type,
        agentCity,
      )

      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

      await supabase.from('external_data_cache').upsert(
        {
          realtor_id: edition.realtor_id,
          cache_key: cacheKey,
          payload: marketData as Record<string, unknown>,
          data_as_of: now.toISOString(),
          fetched_at: now.toISOString(),
          expires_at: expiresAt,
          fetch_status: 'ok',
          fetch_error: null,
          source_url: null,
          updated_at: now.toISOString(),
        },
        { onConflict: 'realtor_id,cache_key' },
      )
    }

    // ── 7. Build EditionContext ────────────────────────────────────────────
    const editionContext: EditionContext = {
      edition_type: edition.edition_type,
      title: edition.title,
      city: agentCity,
      voice_profile: voiceProfile,
      market_data: marketData,
    }

    // ── 8. Scaffold blocks from edition type if empty ────────────────────
    // Maps edition type → ordered list of block types to generate
    const EDITION_TYPE_BLOCKS: Record<string, string[]> = {
      market_update:           ['hero', 'market_commentary', 'rate_watch', 'quick_tip', 'cta'],
      just_sold:               ['hero', 'just_sold', 'market_commentary', 'cta'],
      open_house:              ['hero', 'quick_tip', 'cta'],
      neighbourhood_spotlight: ['hero', 'neighborhood_spotlight', 'local_intel', 'quick_tip', 'cta'],
      rate_watch:              ['hero', 'rate_watch', 'market_commentary', 'quick_tip', 'cta'],
      seasonal:                ['hero', 'market_commentary', 'quick_tip', 'agent_note', 'cta'],
    }

    let rawBlocks: EditorBlock[] = Array.isArray(edition.blocks)
      ? (edition.blocks as EditorBlock[])
      : []

    // If no blocks exist yet, scaffold them from the edition type template
    if (rawBlocks.length === 0) {
      const blockTypes = EDITION_TYPE_BLOCKS[edition.edition_type] ?? ['hero', 'cta']
      rawBlocks = blockTypes.map((type, idx) => ({
        id: `${type}-${Date.now()}-${idx}`,
        type,
        content: {},
        is_locked: false,
      }))
    }

    const updatedBlocks = await generateAllBlocks(rawBlocks, editionContext)

    // ── 9. Generate A/B subject lines ─────────────────────────────────────
    // Build a brief summary from hero + market_commentary blocks for context
    const heroBlock = updatedBlocks.find((b) => b.type === 'hero')
    const marketBlock = updatedBlocks.find((b) => b.type === 'market_commentary')

    const heroHeadline =
      heroBlock?.content &&
      typeof (heroBlock.content as Record<string, unknown>).headline === 'string'
        ? (heroBlock.content as Record<string, unknown>).headline as string
        : ''

    const marketCommentary =
      marketBlock?.content &&
      typeof (marketBlock.content as Record<string, unknown>).commentary === 'string'
        ? (marketBlock.content as Record<string, unknown>).commentary as string
        : ''

    const blockSummary = `${heroHeadline} ${marketCommentary}`.trim().slice(0, 200)

    const subjectLines = await generateSubjectLines(editionContext, blockSummary)

    // ── 10. Count generated blocks (non-divider, non-locked) ─────────────
    const generatedCount = updatedBlocks.filter(
      (b) =>
        b.type !== 'divider' &&
        !b.is_locked &&
        b.content &&
        '_generated_at' in b.content,
    ).length

    // ── 11. Persist results ───────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from('editorial_editions')
      .update({
        blocks: updatedBlocks,
        subject_a: subjectLines.subject_a,
        subject_b: subjectLines.subject_b,
        status: 'ready',
        generation_error: null,
        updated_at: now.toISOString(),
      })
      .eq('id', editionId)

    if (updateError) {
      throw new Error(`Failed to persist generated edition: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      edition_id: editionId,
      blocks_generated: generatedCount,
    })
  } catch (err) {
    // ── Error recovery: mark edition as failed ───────────────────────────
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown generation error'

    console.error('[editorial/generate] Generation failed for edition', editionId, err)

    await supabase
      .from('editorial_editions')
      .update({
        status: 'failed',
        generation_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editionId)

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    )
  }
}
