'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { SourceHealthWidget } from '@/components/editorial/SourceHealthWidget'
import { updateEditorialSettings } from '@/actions/editorial'
import type { DataSourceHealth, EditorialSettings } from '@/actions/editorial'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SourcesSettingsClientProps {
  initialSettings: EditorialSettings
  initialSources: DataSourceHealth[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SourcesSettingsClient({
  initialSettings,
  initialSources,
}: SourcesSettingsClientProps) {
  const [autoDraft, setAutoDraft] = React.useState(initialSettings.editorial_auto_draft)
  const [defaultCity, setDefaultCity] = React.useState(initialSettings.default_city)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setSaved(false)
    setSaveError(null)

    const result = await updateEditorialSettings({
      editorial_auto_draft: autoDraft,
      default_city: defaultCity.trim() || undefined,
    })

    setSaving(false)

    if (result.error) {
      setSaveError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Section 1: Data Sources ─────────────────────────────────────────── */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-foreground">Data Sources</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live feeds used to generate market data, rate watch, and neighbourhood blocks.
          </p>
        </div>
        <SourceHealthWidget sources={initialSources} />
      </section>

      {/* ── Section 2 & 3: Schedule + City ──────────────────────────────────── */}
      <form onSubmit={handleSave}>
        <section className="rounded-lg border border-border bg-card p-5 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Edition Schedule</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              When enabled, a draft edition is automatically created every Monday at 6 AM UTC
              and generation starts immediately. You can review, edit, and approve before sending.
            </p>
          </div>

          {/* Auto-draft toggle */}
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Monday Auto-Draft</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically create a weekly draft edition every Monday morning
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoDraft}
              aria-label="Toggle Monday auto-draft"
              onClick={() => setAutoDraft((v) => !v)}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2',
                autoDraft ? 'bg-brand' : 'bg-muted',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className={[
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0',
                  'transition duration-200 ease-in-out',
                  autoDraft ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
          </div>

          {/* Default city */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="default-city" className="text-sm font-medium text-foreground">
              Default Market City
            </label>
            <p className="text-xs text-muted-foreground">
              Used as the primary city for market data, rate watch, and neighbourhood spotlights.
            </p>
            <input
              id="default-city"
              type="text"
              value={defaultCity}
              onChange={(e) => setDefaultCity(e.target.value)}
              placeholder="e.g. Vancouver, BC"
              className="lf-input mt-1"
              aria-label="Default market city"
            />
          </div>

          {/* Save controls */}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" variant="brand" disabled={saving} size="sm">
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
            {saved && (
              <span className="text-sm text-success font-medium">
                ✓ Settings saved
              </span>
            )}
            {saveError && (
              <span className="text-sm text-destructive">
                {saveError}
              </span>
            )}
          </div>
        </section>
      </form>

      {/* ── Section 4: Info ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Edition rotation</strong> — Each week rotates through:
        Market Update, Just Sold, Rate Watch, Neighbourhood Spotlight. The edition type for a given
        week is determined by week number mod 4, ensuring variety without repeating the same type
        back-to-back.
      </div>
    </div>
  )
}
