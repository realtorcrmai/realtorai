'use client'

import { useEffect, useRef, useState } from 'react'

type GenerationStatus = {
  status: string
  progress: number
  current_block?: string
  error?: string
}

interface GenerationProgressProps {
  editionId: string
  onComplete: () => void
}

export function GenerationProgress({ editionId, onComplete }: GenerationProgressProps) {
  const [status, setStatus] = useState<GenerationStatus>({ status: 'generating', progress: 0 })
  const [showReady, setShowReady] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/editorial/${editionId}/status`)
        if (!res.ok) return
        const data: GenerationStatus = await res.json()
        setStatus(data)
        if (data.status === 'ready') {
          clearInterval(interval)
          setShowReady(true)
          setTimeout(() => onCompleteRef.current(), 2000)
        } else if (data.status === 'failed') {
          clearInterval(interval)
        }
      } catch {
        // ignore network errors, keep polling
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [editionId])

  // Failed state
  if (status.status === 'failed') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          height: 48,
          gap: 16,
        }}
        role="alert"
        aria-live="assertive"
      >
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 500, flex: 1 }}>
          ❌ Generation failed{status.error ? `: ${status.error}` : ''}
        </span>
        <button
          onClick={onComplete}
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  // Ready state
  if (showReady) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#16A34A',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          height: 48,
          gap: 16,
        }}
        role="status"
        aria-live="polite"
      >
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
          ✓ Content ready!
        </span>
      </div>
    )
  }

  // Generating state
  const progress = Math.min(100, Math.max(0, status.progress))

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: '#FF7A59',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        height: 48,
        gap: 16,
      }}
      role="status"
      aria-live="polite"
      aria-label={`Generating content, ${progress}% complete`}
    >
      {/* Left: label */}
      <span
        style={{
          color: '#fff',
          fontSize: 14,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          minWidth: 200,
        }}
      >
        ✨ Generating your content
        {status.current_block ? `: ${status.current_block}` : '…'}
      </span>

      {/* Center: progress bar */}
      <div
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: 9999,
          height: 8,
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            width: `${progress}%`,
            backgroundColor: '#fff',
            height: '100%',
            borderRadius: 9999,
            transition: 'width 600ms ease-in-out',
          }}
        />
      </div>

      {/* Right: percentage */}
      <span
        style={{
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          minWidth: 38,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {progress}%
      </span>
    </div>
  )
}
