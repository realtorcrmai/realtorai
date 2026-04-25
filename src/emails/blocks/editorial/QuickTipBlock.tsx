import * as React from 'react'
import { Section, Text, Heading } from '@react-email/components'
import type { QuickTipBlockContent } from '@/types/editorial'

export interface QuickTipBlockEmailProps {
  accentColor?: string
  content: QuickTipBlockContent
}

const HEADING_COLOR = '#1a1535'

const TEXT_BODY = '#4a4a3a'
const BOX_BG = '#f4f1eb'

const CATEGORY_LABELS: Record<QuickTipBlockContent['category'], string> = {
  buying: 'Buying',
  selling: 'Selling',
  investing: 'Investing',
  maintenance: 'Maintenance',
  financing: 'Financing',
  staging: 'Staging',
  general: 'General',
}

export function QuickTipBlock({ content, accentColor }: QuickTipBlockEmailProps) {
  const accent = accentColor || '#4f35d2'
  const { title, body, category, icon_emoji } = content

  if (!title && !body) return null

  const catLabel = CATEGORY_LABELS[category] || category

  return (
    <Section
      style={{
        backgroundColor: BOX_BG,
        borderLeft: `4px solid ${HEADING_COLOR}`,
        padding: '0',
        margin: '0',
      }}
    >
      <Section style={{ padding: '22px 28px 20px 24px' }}>
        {/* Category eyebrow */}
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '2.5px',
            color: accent,
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}
        >
          {icon_emoji ? `${icon_emoji}  ` : ''}Quick Tip · {catLabel}
        </Text>

        {/* Headline */}
        {title && (
          <Heading
            as="h4"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: '17px',
              fontWeight: '700',
              color: HEADING_COLOR,
              margin: '0 0 10px',
              lineHeight: '1.3',
            }}
          >
            {title}
          </Heading>
        )}

        {/* Body */}
        {body && (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '14px',
              color: TEXT_BODY,
              margin: '0',
              lineHeight: '1.65',
            }}
          >
            {body}
          </Text>
        )}
      </Section>
    </Section>
  )
}
