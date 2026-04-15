'use client'

import * as React from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { EditorBlock, BlockType } from '@/types/editorial'

// ── Block metadata ────────────────────────────────────────────────────────────

const BLOCK_META: Record<BlockType, { emoji: string; label: string }> = {
  hero: { emoji: '🏠', label: 'Hero' },
  just_sold: { emoji: '🏷️', label: 'Just Sold' },
  market_commentary: { emoji: '📊', label: 'Market Commentary' },
  rate_watch: { emoji: '📈', label: 'Rate Watch' },
  local_intel: { emoji: '🗞️', label: 'Local Intel' },
  neighborhood_spotlight: { emoji: '📍', label: 'Neighbourhood Spotlight' },
  quick_tip: { emoji: '💡', label: 'Quick Tip' },
  agent_note: { emoji: '✍️', label: 'Agent Note' },
  cta: { emoji: '🔗', label: 'Call to Action' },
  divider: { emoji: '➖', label: 'Divider' },
}

const ALL_BLOCK_TYPES: BlockType[] = [
  'hero',
  'just_sold',
  'market_commentary',
  'rate_watch',
  'local_intel',
  'neighborhood_spotlight',
  'quick_tip',
  'agent_note',
  'cta',
  'divider',
]

// ── Content preview helper ────────────────────────────────────────────────────

function getContentPreview(block: EditorBlock): string {
  const c = block.content as unknown as Record<string, unknown>
  if (block.type === 'divider') return ''
  const candidates = [
    c.headline,
    c.address,
    c.neighbourhood,
    c.body,
    c.commentary,
    c.tip_text,
    c.note,
  ]
  for (const val of candidates) {
    if (typeof val === 'string' && val.trim()) {
      return val.trim().slice(0, 60)
    }
  }
  return ''
}

// ── Sortable block item ───────────────────────────────────────────────────────

interface SortableBlockItemProps {
  block: EditorBlock
  isSelected: boolean
  isGenerating: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  isDragOverlay?: boolean
}

function SortableBlockItem({
  block,
  isSelected,
  isGenerating,
  onSelect,
  onDelete,
  onDuplicate,
  isDragOverlay = false,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: isGenerating })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const meta = BLOCK_META[block.type]
  const preview = getContentPreview(block)

  if (block.type === 'divider') {
    return (
      <div
        ref={setNodeRef}
        style={isDragOverlay ? undefined : style}
        className={[
          'group relative flex items-center gap-2 px-3 py-2 cursor-pointer border-l-4 transition-colors',
          isSelected
            ? 'border-l-brand bg-brand/5'
            : 'border-l-transparent hover:bg-muted/40',
          isGenerating ? 'animate-pulse' : '',
        ].join(' ')}
        onClick={() => onSelect(block.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect(block.id)
        }}
        aria-selected={isSelected}
        aria-label={`${meta.label} block`}
      >
        {/* Drag handle */}
        {!isGenerating && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity select-none flex-shrink-0"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            ⠿
          </span>
        )}
        <span className="text-sm">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
            {block.is_locked && (
              <Badge variant="warning" className="text-[10px] h-4 px-1">🔒 Locked</Badge>
            )}
          </div>
          <div className="mt-0.5 border-t border-dashed border-border w-full" />
        </div>
        {/* Hover actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(block.id) }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs"
            title="Duplicate block"
            aria-label="Duplicate block"
          >
            ⧉
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(block.id) }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors text-xs"
            title="Delete block"
            aria-label="Delete block"
          >
            🗑
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={[
        'group relative flex items-start gap-2 px-3 py-2.5 cursor-pointer border-l-4 transition-colors',
        isSelected
          ? 'border-l-brand bg-brand/5'
          : 'border-l-transparent hover:bg-muted/40',
        isGenerating ? 'animate-pulse' : '',
      ].join(' ')}
      onClick={() => onSelect(block.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(block.id)
      }}
      aria-selected={isSelected}
      aria-label={`${meta.label} block${preview ? `: ${preview}` : ''}`}
    >
      {/* Drag handle */}
      {!isGenerating && (
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity select-none flex-shrink-0 mt-0.5 leading-none"
          aria-label="Drag to reorder"
          title="Drag to reorder"
        >
          ⠿
        </span>
      )}

      {/* Block type icon */}
      <span className="text-base flex-shrink-0 mt-0.5">{meta.emoji}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-foreground">{meta.label}</span>
          {block.is_locked && (
            <Badge variant="warning" className="text-[10px] h-4 px-1">🔒</Badge>
          )}
        </div>
        {preview && (
          <p className="text-xs text-muted-foreground truncate mt-0.5 leading-snug">
            {preview}{preview.length >= 60 ? '…' : ''}
          </p>
        )}
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(block.id) }}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs"
          title="Duplicate block"
          aria-label={`Duplicate ${meta.label} block`}
        >
          ⧉
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(block.id) }}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors text-xs"
          title="Delete block"
          aria-label={`Delete ${meta.label} block`}
        >
          🗑
        </button>
      </div>
    </div>
  )
}

// ── Block type picker sheet ───────────────────────────────────────────────────

interface BlockPickerSheetProps {
  onAdd: (type: BlockType) => void
  disabled: boolean
}

function BlockPickerSheet({ onAdd, disabled }: BlockPickerSheetProps) {
  const [open, setOpen] = React.useState(false)

  function handlePick(type: BlockType) {
    onAdd(type)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="w-full"
          >
            + Add Block
          </Button>
        }
      />
      <SheetContent side="bottom" className="max-h-[60vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Choose Block Type</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-2 p-4">
          {ALL_BLOCK_TYPES.map((type) => {
            const meta = BLOCK_META[type]
            return (
              <button
                key={type}
                onClick={() => handlePick(type)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-brand/40 transition-colors text-left group"
              >
                <span className="text-2xl leading-none">{meta.emoji}</span>
                <span className="text-sm font-medium text-foreground group-hover:text-brand transition-colors">
                  {meta.label}
                </span>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface BlockListProps {
  blocks: EditorBlock[]
  selectedBlockId: string | null
  onSelectBlock: (id: string) => void
  onReorder: (newBlocks: EditorBlock[]) => void
  onAddBlock: (type: BlockType, afterId?: string) => void
  onDeleteBlock: (id: string) => void
  onDuplicateBlock: (id: string) => void
  isGenerating: boolean
}

export function BlockList({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onReorder,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
  isGenerating,
}: BlockListProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(blocks, oldIndex, newIndex)
    onReorder(reordered)
  }

  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Blocks ({blocks.length})
        </p>
      </div>

      {/* Sortable list */}
      <div className="flex-1 overflow-y-auto">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-sm text-muted-foreground">No blocks yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add one below to get started.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div role="list" aria-label="Edition blocks">
                {blocks.map((block) => (
                  <div key={block.id} role="listitem">
                    <SortableBlockItem
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      isGenerating={isGenerating}
                      onSelect={onSelectBlock}
                      onDelete={onDeleteBlock}
                      onDuplicate={onDuplicateBlock}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>

            {/* Drag overlay — renders a floating clone while dragging */}
            <DragOverlay>
              {activeBlock ? (
                <div className="bg-card border border-brand/30 rounded-lg shadow-lg opacity-95">
                  <SortableBlockItem
                    block={activeBlock}
                    isSelected={false}
                    isGenerating={false}
                    onSelect={() => {}}
                    onDelete={() => {}}
                    onDuplicate={() => {}}
                    isDragOverlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Add block footer */}
      <div className="px-3 py-3 border-t border-border">
        <BlockPickerSheet
          onAdd={(type) => onAddBlock(type, selectedBlockId ?? undefined)}
          disabled={isGenerating}
        />
      </div>
    </div>
  )
}
