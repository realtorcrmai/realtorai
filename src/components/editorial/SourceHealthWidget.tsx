'use client'

/**
 * SourceHealthWidget
 *
 * Displays the status of external data sources (mortgage rates, local events).
 * Used on the editorial settings page.
 */

export interface DataSourceStatus {
  name: string
  last_fetched: string | null
  status: 'ok' | 'error' | 'stale'
  error?: string
}

interface SourceHealthWidgetProps {
  sources: DataSourceStatus[]
}

const STATUS_CONFIG: Record<
  DataSourceStatus['status'],
  { label: string; dotClass: string; rowClass: string }
> = {
  ok: {
    label: 'Live',
    dotClass: 'bg-green-500',
    rowClass: 'text-green-700',
  },
  stale: {
    label: 'Stale',
    dotClass: 'bg-amber-400',
    rowClass: 'text-amber-700',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-red-500',
    rowClass: 'text-red-700',
  },
}

function formatFetchedAt(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHrs = Math.floor(diffMs / 3_600_000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

export function SourceHealthWidget({ sources }: SourceHealthWidgetProps) {
  if (sources.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No data sources configured.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Data Source Health</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Live feeds powering rate watch and local intel blocks
        </p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
              Source
            </th>
            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
              Status
            </th>
            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
              Last Fetched
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source, idx) => {
            const config = STATUS_CONFIG[source.status]
            return (
              <tr
                key={idx}
                className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground">{source.name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.rowClass}`}>
                    <span
                      className={`h-2 w-2 rounded-full ${config.dotClass} ${
                        source.status === 'ok' ? 'animate-pulse' : ''
                      }`}
                      aria-hidden="true"
                    />
                    {config.label}
                    {source.status === 'error' && source.error && (
                      <span
                        className="ml-1 text-xs text-red-500 font-normal truncate max-w-[160px]"
                        title={source.error}
                      >
                        — {source.error}
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {formatFetchedAt(source.last_fetched)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
