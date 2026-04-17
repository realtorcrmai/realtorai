import * as React from 'react'
import { Hr, Section } from '@react-email/components'
import type { DividerBlockContent } from '@/types/editorial'

export interface DividerBlockEmailProps {
  content: DividerBlockContent
}

const GOLD = '#c9a96e'

export function DividerBlock({ content }: DividerBlockEmailProps) {
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
            backgroundColor: color || GOLD,
            borderRadius: '50%',
            margin: '0 4px',
          }}
        />
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            backgroundColor: color || GOLD,
            borderRadius: '50%',
            margin: '0 4px',
          }}
        />
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            backgroundColor: color || GOLD,
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
        borderColor: color || GOLD,
        borderTopWidth: '1px',
        borderStyle: 'solid',
        margin: '0',
      }}
    />
  )
}
