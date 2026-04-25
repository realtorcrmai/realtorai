import * as React from 'react'
import { Hr, Section } from '@react-email/components'
import type { DividerBlockContent } from '@/types/editorial'

export interface DividerBlockEmailProps {
  accentColor?: string
  content: DividerBlockContent
}



export function DividerBlock({ content, accentColor }: DividerBlockEmailProps) {
  const accent = accentColor || '#4f35d2'
  const { style, spacer_height, color } = content

  // Spacer — invisible height-only block
  if (style === 'spacer') {
    const h = spacer_height ?? 24
    return (
      <Section
        style={{
          height: `${h}px`,
          lineHeight: `${h}px`,
          fontSize: '1px',
        }}
      >
        {/* spacer */}
      </Section>
    )
  }

  // Dots style
  if (style === 'dots') {
    return (
      <Section style={{ textAlign: 'center', padding: '8px 0' }}>
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            backgroundColor: color || accent,
            borderRadius: '50%',
            margin: '0 4px',
          }}
        />
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            backgroundColor: color || accent,
            borderRadius: '50%',
            margin: '0 4px',
          }}
        />
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            backgroundColor: color || accent,
            borderRadius: '50%',
            margin: '0 4px',
          }}
        />
      </Section>
    )
  }

  // Default: line (and 'wave' — fallback to gold line)
  return (
    <Hr
      style={{
        borderColor: color || accent,
        borderTopWidth: '1px',
        borderStyle: 'solid',
        margin: '0',
      }}
    />
  )
}
