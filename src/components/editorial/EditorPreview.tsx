'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { EditorBlock } from '@/types/editorial'

interface EditorPreviewProps {
  initialHtml: string
  edition: {
    id: string
    title: string
    edition_type: string
    blocks: EditorBlock[]
  }
}

type ViewMode = 'desktop' | 'mobile'

const VIEWPORT_WIDTHS: Record<ViewMode, number> = {
  desktop: 600,
  mobile: 375,
}

export function EditorPreview({ initialHtml, edition }: EditorPreviewProps) {
  const [mode, setMode] = useState<ViewMode>('desktop')
  const [html, setHtml] = useState<string>(initialHtml)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editionIdRef = useRef(edition.id)

  // Debounced refresh when blocks change
  useEffect(() => {
    // Skip the initial mount — initialHtml already covers that
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/editorial/${editionIdRef.current}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks: edition.blocks }),
        })
        if (res.ok) {
          const text = await res.text()
          setHtml(text)
        }
      } catch {
        // Keep the last good HTML — don't surface network errors here
      } finally {
        setLoading(false)
      }
    }, 1000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edition.blocks])

  const viewportWidth = VIEWPORT_WIDTHS[mode]

  return (
    <div className="flex flex-col h-full">
      {/* Viewport toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={mode === 'desktop' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('desktop')}
          aria-pressed={mode === 'desktop'}
        >
          🖥️ Desktop
        </Button>
        <Button
          variant={mode === 'mobile' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('mobile')}
          aria-pressed={mode === 'mobile'}
        >
          📱 Mobile
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{viewportWidth}px</span>
      </div>

      {/* iframe container */}
      <div
        className="relative mx-auto"
        style={{
          width: viewportWidth,
          maxWidth: '100%',
          overflow: 'hidden',
          borderRadius: 8,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          border: '1px solid var(--border)',
          transition: 'width 300ms ease-in-out',
        }}
      >
        {/* Loading skeleton overlay */}
        {loading && (
          <div
            className="absolute inset-0 z-10 bg-card/80 backdrop-blur-sm flex items-center justify-center"
            aria-label="Loading preview"
          >
            <div className="flex flex-col items-center gap-2">
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid var(--border)',
                  borderTopColor: '#FF7A59',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span className="text-xs text-muted-foreground">Refreshing preview…</span>
            </div>
          </div>
        )}

        <iframe
          srcDoc={html}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          scrolling="auto"
          title={`Email preview — ${edition.title}`}
          style={{
            width: viewportWidth,
            height: 600,
            border: 'none',
            borderRadius: 8,
            display: 'block',
          }}
        />
      </div>

      {/* Spin keyframe injected inline so the component is self-contained */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
