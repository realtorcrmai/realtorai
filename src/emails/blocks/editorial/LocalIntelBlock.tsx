import * as React from 'react'
import { Section, Text, Heading, Link, Hr } from '@react-email/components'
import type { LocalIntelBlockContent } from '@/types/editorial'

export interface LocalIntelBlockEmailProps {
  content: LocalIntelBlockContent
}

const FOREST_GREEN = '#1a2e1a'
const GOLD = '#c9a96e'
const TEXT_BODY = '#4a4a3a'
const TEXT_MUTED = '#6b6b5a'

const CATEGORY_LABELS: Record<LocalIntelBlockContent['category'], string> = {
  development: 'Development',
  transit: 'Transit',
  school: 'School',
  business: 'Business',
  zoning: 'Zoning',
  event: 'Event',
  other: 'Local Intel',
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function LocalIntelBlock({ content }: LocalIntelBlockEmailProps) {
  const { headline, body, category, neighbourhood, source_url, source_label, published_date } =
    content

  if (!headline) return null

  const dateLabel = formatDate(published_date)
  const catLabel = CATEGORY_LABELS[category] || 'Local Intel'
  const eyebrow = [dateLabel, catLabel, neighbourhood].filter(Boolean).join('  ·  ')

  return (
    <Section style={{ backgroundColor: '#ffffff', padding: '0' }}>
      <Section style={{ padding: '24px 40px 20px' }}>
        {/* Eyebrow: date + category */}
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '2px',
            color: GOLD,
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}
        >
          {eyebrow}
        </Text>

        {/* Headline */}
        <Heading
          as="h4"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '17px',
            fontWeight: '700',
            color: FOREST_GREEN,
            margin: '0 0 10px',
            lineHeight: '1.3',
          }}
        >
          {headline}
        </Heading>

        {/* Body */}
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

        {/* Source link */}
        {source_url && (
          <Text style={{ margin: '10px 0 0' }}>
            <Link
              href={source_url}
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '12px',
                fontWeight: '700',
                color: GOLD,
                textDecoration: 'none',
                letterSpacing: '0.5px',
              }}
            >
              {source_label || 'Read more'} →
            </Link>
          </Text>
        )}
      </Section>
      <Hr
        style={{
          borderColor: '#e8e2d5',
          borderTopWidth: '1px',
          margin: '0 40px',
        }}
      />
    </Section>
  )
}
