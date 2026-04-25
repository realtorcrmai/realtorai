import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'

export interface MastheadBlockProps {
  title: string
  subtitle: string
  edition_label?: string | null
  accentColor?: string
  agentName?: string
}

export function MastheadBlock({ title, subtitle, accentColor, agentName }: MastheadBlockProps) {
  const accent = accentColor || '#4f35d2'

  return (
    <Section style={{ padding: '28px 32px 20px', textAlign: 'center' }}>
      {/* Edition eyebrow */}
      <Text
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '2px',
          color: accent,
          textTransform: 'uppercase',
          margin: '0 0 12px',
        }}
      >
        {agentName ? `${agentName} · Newsletter` : 'Newsletter'}
      </Text>

      {/* Title */}
      <Heading
        as="h1"
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          fontSize: '26px',
          fontWeight: '700',
          color: '#1a1535',
          margin: '0 0 8px',
          lineHeight: '1.25',
          letterSpacing: '-0.5px',
        }}
      >
        {title}
      </Heading>

      {/* Subtitle */}
      <Text
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          fontSize: '13px',
          color: '#6b6b8d',
          margin: '0 0 20px',
          letterSpacing: '0.2px',
        }}
      >
        {subtitle}
      </Text>

      {/* Accent divider */}
      <Hr
        style={{
          borderColor: accent,
          borderTopWidth: '2px',
          borderStyle: 'solid',
          margin: '0 auto',
          width: '48px',
        }}
      />
    </Section>
  )
}
