'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { triggerGeneration, deleteEdition, sendEdition } from '@/actions/editorial'
import { TransactionManager } from '@/components/editorial/TransactionManager'
import type { EditorialEdition, EditionStatus, EditionType } from '@/types/editorial'

// ─── Send dialog ─────────────────────────────────────────────────────────────

interface SendDialogProps {
  edition: EditorialEdition
  onClose: () => void
  onSuccess: () => void
}

function SendDialog({ edition, onClose, onSuccess }: SendDialogProps) {
  const [mode, setMode] = useState<'test' | 'full'>('test')
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleSend() {
    setSending(true)
    setResult(null)
    try {
      const res = await sendEdition(
        edition.id,
        mode === 'test' ? { test_email: testEmail } : undefined,
      )
      if (res.error === null) {
        setResult({
          ok: true,
          message:
            mode === 'test'
              ? `✅ Test email sent to ${testEmail}`
              : `✅ Sent to ${res.data?.sent ?? 0} contacts (${res.data?.skipped ?? 0} skipped)`,
        })
        if (mode === 'full') {
          setTimeout(() => { onSuccess(); onClose() }, 1500)
        }
      } else {
        setResult({ ok: false, message: `❌ ${res.error}` })
      }
    } catch (err) {
      setResult({ ok: false, message: `❌ ${(err as Error).message}` })
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send edition"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">📤 Send Edition</h2>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
          {edition.title}
        </p>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('test')}
            className={[
              'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
              mode === 'test'
                ? 'bg-[#FF7A59] text-white border-[#FF7A59]'
                : 'bg-transparent text-muted-foreground border-border hover:text-foreground',
            ].join(' ')}
          >
            🧪 Test Send
          </button>
          <button
            onClick={() => setMode('full')}
            className={[
              'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
              mode === 'full'
                ? 'bg-[#FF7A59] text-white border-[#FF7A59]'
                : 'bg-transparent text-muted-foreground border-border hover:text-foreground',
            ].join(' ')}
          >
            🚀 Send to All
          </button>
        </div>

        {mode === 'test' && (
          <div className="mb-4">
            <label htmlFor="send-test-email" className="block text-sm font-medium text-foreground mb-1">
              Test email address
            </label>
            <input
              id="send-test-email"
              type="email"
              placeholder="you@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A59]/40 focus:border-[#FF7A59]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Sends with [TEST] prefix — does not mark edition as sent
            </p>
          </div>
        )}

        {mode === 'full' && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            ⚠️ This will send to all CASL-consented contacts and mark the edition as <strong>Sent</strong>. This cannot be undone.
          </div>
        )}

        {result && (
          <div
            className={[
              'mb-4 p-3 rounded-lg text-sm',
              result.ok
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800',
            ].join(' ')}
          >
            {result.message}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            variant="brand"
            size="sm"
            disabled={sending || (mode === 'test' && !testEmail.includes('@'))}
            onClick={handleSend}
          >
            {sending ? '⏳ Sending...' : mode === 'test' ? '📧 Send Test' : '🚀 Send Now'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Edition type label map ──────────────────────────────────────────────────

const TYPE_LABELS: Record<EditionType, string> = {
  market_update: '📊 Market Update',
  just_sold: '🏷️ Just Sold',
  open_house: '🏠 Open House',
  neighbourhood_spotlight: '📍 Neighbourhood',
  rate_watch: '📉 Rate Watch',
  seasonal: '🌸 Seasonal',
}

// ─── Filter tab definition ───────────────────────────────────────────────────

type FilterTab = 'all' | EditionStatus

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'sent', label: 'Sent' },
]

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  all: '📰 No editions yet — create your first one',
  draft: 'No drafts',
  generating: 'No editions generating',
  ready: 'No editions ready to send',
  sent: 'No editions sent yet',
  failed: 'No failed editions',
  scheduled: 'No scheduled editions',
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EditionStatus }) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>
    case 'generating':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 animate-pulse">
          Generating...
        </Badge>
      )
    case 'ready':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">Ready to Send</Badge>
      )
    case 'sent':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">Sent</Badge>
      )
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'scheduled':
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200">Scheduled</Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// ─── Date formatter ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ─── Edition card ────────────────────────────────────────────────────────────

interface EditionCardProps {
  edition: EditorialEdition
  onActionComplete: () => void
}

function EditionCard({ edition, onActionComplete }: EditionCardProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showSendDialog, setShowSendDialog] = useState(false)

  function navigate() {
    router.push(`/newsletters/editorial/${edition.id}/edit`)
  }

  function handleGenerate(e: React.MouseEvent) {
    e.stopPropagation()
    startTransition(async () => {
      await triggerGeneration(edition.id)
      onActionComplete()
    })
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete "${edition.title}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteEdition(edition.id)
      onActionComplete()
    })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${edition.title}`}
      onClick={navigate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate() }}
      className="bg-card border border-border rounded-lg p-4 hover:border-[#FF7A59] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A59]"
    >
      {/* Top row: type + status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {TYPE_LABELS[edition.edition_type] ?? edition.edition_type}
        </span>
        <StatusBadge status={edition.status} />
      </div>

      {/* Title */}
      <h3
        className="text-lg font-semibold text-foreground mb-1 line-clamp-2"
      >
        {edition.title}
      </h3>

      {/* Meta */}
      <p className="text-xs text-muted-foreground mb-3">
        Edition #{edition.edition_number} · {formatDate(edition.created_at)}
      </p>

      {/* Stats row — only when sent */}
      {edition.status === 'sent' && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span>📤 {edition.send_count} sent</span>
          <span>📬 {edition.recipient_count} recipients</span>
        </div>
      )}

      {/* Actions row */}
      <div
        className="flex items-center gap-2 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        {edition.status === 'draft' && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleGenerate}
          >
            ✨ Generate
          </Button>
        )}

        {edition.status === 'ready' && (
          <>
            <Button
              variant="brand"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setShowSendDialog(true) }}
            >
              📤 Send
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/newsletters/editorial/${edition.id}/edit`)}
            >
              ✏️ Edit
            </Button>
          </>
        )}

        {edition.status === 'generating' && (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 animate-pulse select-none">
            ⏳ Generating...
          </Badge>
        )}

        {edition.status === 'sent' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/newsletters/editorial/${edition.id}/analytics`)}
          >
            📊 View Stats
          </Button>
        )}

        {edition.status === 'failed' && (
          <Button
            variant="outline"
            size="sm"
            className="border-amber-400 text-amber-700 hover:bg-amber-50"
            disabled={pending}
            onClick={handleGenerate}
          >
            🔄 Retry
          </Button>
        )}

        {/* Overflow menu — always visible */}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sm hover:bg-muted transition-colors"
              aria-label="More options"
            >
              ⋯
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDelete}
              >
                🗑️ Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showSendDialog && (
        <SendDialog
          edition={edition}
          onClose={() => setShowSendDialog(false)}
          onSuccess={onActionComplete}
        />
      )}
    </div>
  )
}

// ─── Main dashboard client ───────────────────────────────────────────────────

interface EditorialDashboardClientProps {
  editions: EditorialEdition[]
  realtorId: string
}

export function EditorialDashboardClient({
  editions,
  realtorId: _realtorId,
}: EditorialDashboardClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  function handleActionComplete() {
    router.refresh()
  }

  // Filter by tab
  const tabFiltered =
    activeTab === 'all'
      ? editions
      : editions.filter((e) => e.status === activeTab)

  // Filter by search (client-side, title match)
  const searchLower = search.trim().toLowerCase()
  const filtered = searchLower
    ? tabFiltered.filter((e) => e.title.toLowerCase().includes(searchLower))
    : tabFiltered

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs + search */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={[
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {tab.label}
              {tab.value !== 'all' && (
                <span className="ml-1.5 text-xs opacity-60">
                  {editions.filter((e) => e.status === tab.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="search"
            placeholder="Search editions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search editions"
            className="w-full h-8 px-3 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#FF7A59]/40 focus:border-[#FF7A59]"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">
          {EMPTY_MESSAGES[activeTab]}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((edition) => (
            <EditionCard
              key={edition.id}
              edition={edition}
              onActionComplete={handleActionComplete}
            />
          ))}
        </div>
      )}

      {/* Transactions section */}
      <div style={{ marginTop: 40, borderTop: '1px solid #e5e7eb', paddingTop: 32 }}>
        <TransactionManager />
      </div>
    </div>
  )
}
