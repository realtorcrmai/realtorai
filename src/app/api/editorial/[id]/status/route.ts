import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { EditorBlock, EditionStatus, GenerationStatus } from '@/types/editorial'

export const dynamic = 'force-dynamic'

/** Loose UUID v4 check — catches obvious non-UUIDs without a full regex library */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/editorial/[id]/status
 *
 * Polling endpoint for generation progress.
 * Auth: NextAuth user session (browser-facing).
 * Cache-Control: no-store — every response must be fresh.
 *
 * Returns GenerationStatus:
 *   { status, progress, current_block?, error? }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const realtorId = session.user.id

  // ── 2. Validate route param ────────────────────────────────────────────────
  const { id } = await params
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid edition id' }, { status: 400 })
  }

  // ── 3. Fetch edition ───────────────────────────────────────────────────────
  const supabase = createAdminClient()

  const { data: edition, error: fetchError } = await supabase
    .from('editorial_editions')
    .select(
      'id, status, blocks, generation_started_at, generation_error, realtor_id',
    )
    .eq('id', id)
    .single()

  if (fetchError || !edition) {
    return NextResponse.json({ error: 'Edition not found' }, { status: 404 })
  }

  // ── 4. Tenant isolation ────────────────────────────────────────────────────
  if (edition.realtor_id !== realtorId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── 5. Compute progress ────────────────────────────────────────────────────
  const status = edition.status as EditionStatus
  const blocks: EditorBlock[] = Array.isArray(edition.blocks)
    ? (edition.blocks as EditorBlock[])
    : []

  // Dividers carry no AI content — exclude from progress maths
  const contentBlocks = blocks.filter((b) => b.type !== 'divider')
  const totalContent = contentBlocks.length

  let progress = 0
  let currentBlock: string | undefined

  switch (status) {
    case 'draft':
      progress = 0
      break

    case 'generating': {
      if (totalContent === 0) {
        progress = 0
        break
      }

      // A block is "done" once its content object has at least one AI-generated
      // field (checked via the _generated_at sentinel written by generateBlock).
      const doneCount = contentBlocks.filter(
        (b) =>
          b.is_locked ||
          (b.content != null &&
            '_generated_at' in (b.content as unknown as Record<string, unknown>)),
      ).length

      progress = Math.round((doneCount / totalContent) * 100)

      // Surface the first block type that is still pending
      const pendingBlock = contentBlocks.find(
        (b) =>
          !b.is_locked &&
          (b.content == null ||
            !('_generated_at' in (b.content as unknown as Record<string, unknown>))),
      )
      if (pendingBlock) {
        // Convert snake_case type to a human-readable label
        currentBlock = pendingBlock.type
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      }
      break
    }

    case 'ready':
    case 'sent':
    case 'scheduled':
      progress = 100
      break

    case 'failed':
      progress = 0
      break

    default:
      progress = 0
  }

  // ── 6. Build response ──────────────────────────────────────────────────────
  const body: GenerationStatus = {
    status,
    progress,
    ...(currentBlock ? { current_block: currentBlock } : {}),
    ...(edition.generation_error ? { error: edition.generation_error } : {}),
  }

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
