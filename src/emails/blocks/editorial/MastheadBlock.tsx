import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'

export interface MastheadBlockProps {
  title: string
  subtitle: string
  edition_label?: string | null
}

const FOREST_GREEN = '#1a2e1a'
const GOLD = '#c9a96e'
const WHITE = '#ffffff'
const MUTED_GREEN = '#8aaa8a'

export function MastheadBlock({ title, subtitle, edition_label }: MastheadBlockProps) {
  return (
    <Section
      style={{
        backgroundColor: FOREST_GREEN,
        padding: '36px 40px 28px',
        textAlign: 'center',
      }}
    >
      {/* Eyebrow */}
      <Text
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10px',
          fontWeight: '700',
          letterSpacing: '3px',
          color: GOLD,
          textTransform: 'uppercase',
          margin: '0 0 16px',
        }}
      >
        {edition_label ? `${edition_label} · REALTORS360 EDITORIAL` : 'REALTORS360 EDITORIAL'}
      </Text>

      {/* Title */}
      <Heading
        as="h1"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: '32px',
          fontWeight: '700',
          color: WHITE,
          margin: '0 0 10px',
          lineHeight: '1.2',
          letterSpacing: '-0.5px',
        }}
      >
        {title}
      </Heading>

      {/* Subtitle */}
      <Text
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '13px',
          color: MUTED_GREEN,
          margin: '0 0 24px',
          letterSpacing: '0.3px',
        }}
      >
        {subtitle}
      </Text>

      {/* Gold divider */}
      <Hr
        style={{
          borderColor: GOLD,
          borderTopWidth: '1px',
          borderStyle: 'solid',
          margin: '0',
        }}
      />
    </Section>
  )
}
