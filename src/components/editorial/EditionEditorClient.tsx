'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { BlockList } from '@/components/editorial/BlockList'
import { BlockEditor } from '@/components/editorial/BlockEditor'
import { GenerationProgress } from '@/components/editorial/GenerationProgress'
import {
  updateBlocks,
  reorderBlocks,
  triggerGeneration,
  sendEdition,
  getSegmentsForPicker,
} from '@/actions/editorial'
import type {
  EditorialEdition,
  EditorialVoiceProfile,
  EditorBlock,
  EditorBlockContent,
  BlockType,
  HeroBlockContent,
  JustSoldBlockContent,
  MarketCommentaryBlockContent,
  RateWatchBlockContent,
  LocalIntelBlockContent,
  NeighborhoodSpotlightBlockContent,
  QuickTipBlockContent,
  AgentNoteBlockContent,
  CtaBlockContent,
  DividerBlockContent,
} from '@/types/editorial'

// ── Default content factories ─────────────────────────────────────────────────

function defaultContentForType(type: BlockType): EditorBlockContent {
  switch (type) {
    case 'hero':
      return {
        headline: '',
        subheadline: null,
        image_url: null,
        image_alt: null,
        edition_label: null,
        neighbourhood: null,
        date_label: null,
      } satisfies HeroBlockContent
    case 'just_sold':
      return {
        address: '',
        sale_price: 0,
        list_price: 0,
        days_on_market: 0,
        beds: null,
        baths: null,
        sqft: null,
        sold_date: new Date().toISOString().split('T')[0],
        photo_url: null,
        commentary: null,
        vs_asking_pct: null,
      } satisfies JustSoldBlockContent
    case 'market_commentary':
      return {
        neighbourhood: '',
        body: '',
        avg_sale_price: null,
        avg_list_price: null,
        median_dom: null,
        active_listings: null,
        sold_count: null,
        price_change_mom_pct: null,
        price_change_yoy_pct: null,
        market_type: null,
        period_label: null,
      } satisfies MarketCommentaryBlockContent
    case 'rate_watch':
      return {
        as_of_date: new Date().toISOString().split('T')[0],
        rate_5yr_fixed: null,
        rate_5yr_variable: null,
        rate_3yr_fixed: null,
        rate_1yr_fixed: null,
        prime_rate: null,
        change_bps: null,
        trend: null,
        commentary: null,
        source: null,
      } satisfies RateWatchBlockContent
    case 'local_intel':
      return {
        headline: '',
        body: '',
        category: 'other',
        neighbourhood: null,
        source_url: null,
        source_label: null,
        published_date: null,
      } satisfies LocalIntelBlockContent
    case 'neighborhood_spotlight':
      return {
        neighbourhood: '',
        tagline: null,
        hero_image_url: null,
        description: '',
        walk_score: null,
        transit_score: null,
        bike_score: null,
        avg_price: null,
        price_trend: null,
        highlights: [],
        nearby_amenities: [],
      } satisfies NeighborhoodSpotlightBlockContent
    case 'quick_tip':
      return {
        title: '',
        body: '',
        category: 'general',
        icon_emoji: null,
      } satisfies QuickTipBlockContent
    case 'agent_note':
      return {
        body: '',
        sign_off: null,
        headshot_url: null,
        agent_name: null,
      } satisfies AgentNoteBlockContent
    case 'cta':
      return {
        headline: '',
        subtext: null,
        button_label: 'Learn More',
        button_url: '',
        secondary_label: null,
        secondary_url: null,
        style: 'primary',
        cta_type: 'custom',
      } satisfies CtaBlockContent
    case 'divider':
      return {
        style: 'line',
        spacer_height: undefined,
        color: null,
      } satisfies DividerBlockContent
  }
}

// ── Save indicator ────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null

  const map: Record<Exclude<SaveStatus, 'idle'>, { icon: string; text: string; className: string }> = {
    saving: { icon: '●', text: 'Saving…', className: 'text-amber-600' },
    saved: { icon: '✓', text: 'Saved', className: 'text-green-600' },
    error: { icon: '✕', text: 'Save failed', className: 'text-destructive' },
  }

  const { icon, text, className } = map[status]

  return (
    <span className={['text-xs font-medium flex items-center gap-1 tabular-nums', className].join(' ')}>
      <span aria-hidden="true">{icon}</span>
      {text}
    </span>
  )
}

// ── Loading spinner ───────────────────────────────────────────────────────────

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={[
        'inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent',
        className,
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  )
}

// ── Send dialog ───────────────────────────────────────────────────────────────

interface SegmentOption {
  id: string
  name: string
  contact_count?: number
}

interface SendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  edition: EditorialEdition
  onConfirm: () => Promise<void>
  isSending: boolean
  sendError: string | null
  segments: SegmentOption[]
  selectedSegmentId: string | undefined
  onSegmentChange: (id: string | undefined) => void
}

function SendDialog({
  open,
  onOpenChange,
  edition,
  onConfirm,
  isSending,
  sendError,
  segments,
  selectedSegmentId,
  onSegmentChange,
}: SendDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Edition #{edition.edition_number}</DialogTitle>
          <DialogDescription>
            This will send to all CASL-consented contacts on your list.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 border border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">Recipients</span>
            <span className="text-sm font-semibold text-foreground">
              {edition.recipient_count > 0
                ? edition.recipient_count.toLocaleString()
                : '—'}{' '}
              contacts
            </span>
          </div>

          {/* Segment picker */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="send-segment-select"
              className="text-sm font-medium text-foreground"
            >
              Send to
            </label>
            <select
              id="send-segment-select"
              value={selectedSegmentId ?? ''}
              onChange={(e) => onSegmentChange(e.target.value || undefined)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              <option value="">All contacts with CASL consent</option>
              {segments.map((seg) => (
                <option key={seg.id} value={seg.id}>
                  {seg.name}
                  {seg.contact_count !== undefined ? ` (${seg.contact_count})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">Subject line (variant A)</p>
            <p className="text-sm font-medium text-foreground">
              {edition.subject_a ?? (
                <span className="text-muted-foreground italic">No subject set</span>
              )}
            </p>
            {edition.subject_b && (
              <>
                <p className="text-xs text-muted-foreground mt-2 mb-1">Subject line (variant B)</p>
                <p className="text-sm font-medium text-foreground">{edition.subject_b}</p>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Contacts without CASL consent, or who have unsubscribed, will be automatically skipped.
          </p>

          {sendError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive font-medium">⚠️ {sendError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button variant="brand" onClick={onConfirm} disabled={isSending}>
            {isSending ? (
              <>
                <Spinner className="mr-1.5" />
                Sending…
              </>
            ) : (
              '📤 Send Edition'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyBlockState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-16 px-6">
      <span className="text-5xl leading-none">📝</span>
      <p className="text-base font-medium text-foreground">No block selected</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Select a block from the list on the left to edit its content, or add a new one.
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface EditionEditorClientProps {
  edition: EditorialEdition
  voiceProfile: EditorialVoiceProfile | null
}

export function EditionEditorClient({ edition, voiceProfile: _voiceProfile }: EditionEditorClientProps) {
  const [blocks, setBlocks] = React.useState<EditorBlock[]>(edition.blocks ?? [])
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle')
  const [isGenerating, setIsGenerating] = React.useState(edition.status === 'generating')
  const [isSending, setIsSending] = React.useState(false)
  const [sendOpen, setSendOpen] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = React.useState<string | undefined>(undefined)
  const [segments, setSegments] = React.useState<SegmentOption[]>([])

  // Debounce timer ref for auto-save
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  // Saved-fade timer — hides "Saved" after 2 seconds
  const savedFadeRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timers on unmount to prevent state updates on unmounted component
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current)
    }
  }, [])

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null

  // ── Debounced persist ─────────────────────────────────────────────────────

  const persistBlocks = React.useCallback(
    (newBlocks: EditorBlock[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current)

      setSaveStatus('saving')

      debounceRef.current = setTimeout(async () => {
        try {
          const result = await updateBlocks(edition.id, newBlocks)
          if (result.error) {
            setSaveStatus('error')
            // Don't auto-dismiss error — user must see the save failed
          } else {
            setSaveStatus('saved')
            savedFadeRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
          }
        } catch {
          setSaveStatus('error')
          // Don't auto-dismiss error — user must see the save failed
        }
      }, 500)
    },
    [edition.id]
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleBlockUpdate(blockId: string, contentUpdate: Partial<EditorBlockContent>) {
    setBlocks((prev) => {
      const next = prev.map((b) => {
        if (b.id !== blockId) return b
        return {
          ...b,
          content: { ...b.content, ...contentUpdate },
          is_locked: true,
        } as EditorBlock
      })
      persistBlocks(next)
      return next
    })
  }

  function handleReorder(newBlocks: EditorBlock[]) {
    setBlocks(newBlocks)
    reorderBlocks(edition.id, newBlocks.map((b) => b.id)).catch(() => {
      setSaveStatus('error')
    })
  }

  function handleAddBlock(type: BlockType, afterId?: string) {
    const newBlock = {
      id: crypto.randomUUID(),
      type,
      content: defaultContentForType(type),
      is_locked: false,
    } as EditorBlock

    setBlocks((prev) => {
      let next: EditorBlock[]
      if (afterId) {
        const idx = prev.findIndex((b) => b.id === afterId)
        if (idx === -1) {
          next = [...prev, newBlock]
        } else {
          next = [...prev.slice(0, idx + 1), newBlock, ...prev.slice(idx + 1)]
        }
      } else {
        next = [...prev, newBlock]
      }
      persistBlocks(next)
      return next
    })

    setSelectedBlockId(newBlock.id)
  }

  function handleDeleteBlock(id: string) {
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id)
      persistBlocks(next)
      return next
    })
    if (selectedBlockId === id) setSelectedBlockId(null)
  }

  function handleDuplicateBlock(id: string) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      if (idx === -1) return prev
      const original = prev[idx]
      const duplicate = {
        ...original,
        id: crypto.randomUUID(),
        content: { ...original.content },
      } as EditorBlock
      const next = [...prev.slice(0, idx + 1), duplicate, ...prev.slice(idx + 1)]
      persistBlocks(next)
      return next
    })
  }

  function handleToggleLock(blockId: string) {
    setBlocks((prev) => {
      const next = prev.map((b) =>
        b.id === blockId ? ({ ...b, is_locked: !b.is_locked } as EditorBlock) : b
      )
      persistBlocks(next)
      return next
    })
  }

  async function handleGenerate() {
    if (isGenerating || edition.status === 'sent') return
    setIsGenerating(true)
    try {
      await triggerGeneration(edition.id)
    } catch {
      // GenerationProgress surfaces errors via polling
    }
  }

  function handleGenerationComplete() {
    setIsGenerating(false)
    window.location.reload()
  }

  async function handleSendOpen() {
    setSendOpen(true)
    // Load segments when dialog opens — graceful degradation if it fails
    try {
      const data = await getSegmentsForPicker()
      setSegments(data)
    } catch {
      setSegments([])
    }
  }

  async function handleSendConfirm() {
    if (isSending) return
    setIsSending(true)
    setSendError(null)
    try {
      const result = await sendEdition(edition.id, { segment_id: selectedSegmentId })
      if (result && 'error' in result && result.error) {
        setSendError(result.error)
        return
      }
      setSendOpen(false)
      window.location.reload()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const canSend = edition.status === 'ready' && !isGenerating
  const canGenerate = edition.status !== 'sent' && !isGenerating

  return (
    <div className="flex flex-col h-full relative">
      {/* Generation progress overlay bar */}
      {isGenerating && (
        <GenerationProgress
          editionId={edition.id}
          onComplete={handleGenerationComplete}
        />
      )}

      {/* Top toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0"
        style={{ minHeight: 56 }}
      >
        {/* Left: edition info + save status */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-tight">
              {edition.title}
            </span>
            <span className="text-xs text-muted-foreground">
              Edition #{edition.edition_number}
              {edition.edition_type ? ` · ${edition.edition_type.replace(/_/g, ' ')}` : ''}
            </span>
          </div>
          <SaveIndicator status={saveStatus} />
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {edition.status === 'sent' && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              ✓ Sent
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={!canGenerate}
            aria-label={isGenerating ? 'AI generation in progress' : 'Generate content with AI'}
          >
            {isGenerating ? (
              <>
                <Spinner className="mr-1.5" />
                Generating…
              </>
            ) : (
              '✨ Generate Content'
            )}
          </Button>

          {canSend && (
            <Button
              variant="brand"
              size="sm"
              onClick={handleSendOpen}
              aria-label="Send this edition"
            >
              📤 Send Edition
            </Button>
          )}
        </div>
      </div>

      {/* Body: two-column layout */}
      <div className="flex flex-wrap flex-1 overflow-hidden">
        {/* Left column: block list */}
        <aside
          className="w-full md:w-72 flex-shrink-0 border-r border-border overflow-y-auto bg-card"
          aria-label="Block list"
        >
          <BlockList
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onReorder={handleReorder}
            onAddBlock={handleAddBlock}
            onDeleteBlock={handleDeleteBlock}
            onDuplicateBlock={handleDuplicateBlock}
            isGenerating={isGenerating}
          />
        </aside>

        {/* Right column: block editor */}
        <main
          className="flex-1 overflow-y-auto bg-background"
          aria-label="Block editor"
        >
          {selectedBlock ? (
            <div className="max-w-2xl mx-auto px-6 py-6">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-foreground">Edit Block</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Changes auto-save after 500ms.
                </p>
              </div>
              <BlockEditor
                block={selectedBlock}
                onUpdate={handleBlockUpdate}
                onToggleLock={handleToggleLock}
                isGenerating={isGenerating}
              />
            </div>
          ) : (
            <EmptyBlockState />
          )}
        </main>
      </div>

      {/* Send dialog */}
      <SendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        edition={edition}
        onConfirm={handleSendConfirm}
        isSending={isSending}
        sendError={sendError}
        segments={segments}
        selectedSegmentId={selectedSegmentId}
        onSegmentChange={setSelectedSegmentId}
      />
    </div>
  )
}
