import * as React from 'react'
import { Section, Text, Heading, Img } from '@react-email/components'
import type { HeroBlockContent } from '@/types/editorial'

export interface HeroBlockEmailProps {
  content: HeroBlockContent
}

const FOREST_GREEN = '#1a2e1a'
const GOLD = '#c9a96e'
const TEXT_BODY = '#4a4a3a'

export function HeroBlock({ content }: HeroBlockEmailProps) {
  const { headline, subheadline, image_url, image_alt, edition_label, date_label } = content

  if (!headline) return null

  const eyebrow = [edition_label, date_label].filter(Boolean).join('  ·  ')

  return (
    <Section style={{ backgroundColor: '#ffffff', padding: '0' }}>
      {image_url && (
        <Img
          src={image_url}
          alt={image_alt || headline}
          width="620"
          height="320"
          style={{
            display: 'block',
            width: '100%',
            maxWidth: '620px',
            height: 'auto',
            objectFit: 'cover',
          }}
        />
      )}
      <Section style={{ padding: '32px 40px 24px' }}>
        {eyebrow ? (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '2.5px',
              color: GOLD,
              textTransform: 'uppercase',
              margin: '0 0 12px',
            }}
          >
            {eyebrow}
          </Text>
        ) : null}

        <Heading
          as="h2"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '28px',
            fontWeight: '700',
            color: FOREST_GREEN,
            margin: '0 0 14px',
            lineHeight: '1.25',
            letterSpacing: '-0.3px',
          }}
        >
          {headline}
        </Heading>

        {subheadline ? (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '16px',
              color: TEXT_BODY,
              margin: '0',
              lineHeight: '1.65',
            }}
          >
            {subheadline}
          </Text>
        ) : null}
      </Section>
    </Section>
  )
}
