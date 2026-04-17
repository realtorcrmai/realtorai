import * as React from 'react'
import { Section, Text, Heading, Button, Link } from '@react-email/components'
import type { CtaBlockContent } from '@/types/editorial'

export interface CtaBlockEmailProps {
  content: CtaBlockContent
}

const FOREST_GREEN = '#1a2e1a'
const GOLD = '#c9a96e'
const TEXT_BODY = '#4a4a3a'
const CARD_BG = '#f9f7f2'

export function CtaBlock({ content }: CtaBlockEmailProps) {
  const { headline, subtext, button_label, button_url, secondary_label, secondary_url } = content

  if (!headline) return null

  return (
    <Section
      style={{
        backgroundColor: CARD_BG,
        padding: '0',
        margin: '0',
      }}
    >
      <Section style={{ padding: '36px 40px 32px', textAlign: 'center' }}>
        {/* Headline */}
        <Heading
          as="h3"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '22px',
            fontWeight: '700',
            color: FOREST_GREEN,
            margin: '0 0 12px',
            lineHeight: '1.3',
          }}
        >
          {headline}
        </Heading>

        {/* Subtext */}
        {subtext && (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '14px',
              color: TEXT_BODY,
              margin: '0 0 24px',
              lineHeight: '1.6',
            }}
          >
            {subtext}
          </Text>
        )}

        {/* Primary button */}
        <Button
          href={button_url}
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            backgroundColor: FOREST_GREEN,
            color: GOLD,
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: '2px',
            padding: '14px 32px',
            display: 'inline-block',
          }}
        >
          {button_label}
        </Button>

        {/* Secondary link */}
        {secondary_label && secondary_url && (
          <Text style={{ margin: '16px 0 0' }}>
            <Link
              href={secondary_url}
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '13px',
                color: FOREST_GREEN,
                textDecoration: 'underline',
              }}
            >
              {secondary_label}
            </Link>
          </Text>
        )}
      </Section>
    </Section>
  )
}
