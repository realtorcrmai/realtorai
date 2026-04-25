import * as React from 'react'
import { Section, Text, Heading, Button, Link } from '@react-email/components'
import type { CtaBlockContent } from '@/types/editorial'

export interface CtaBlockEmailProps {
  content: CtaBlockContent
  accentColor?: string
}

export function CtaBlock({ content, accentColor }: CtaBlockEmailProps) {
  const accent = accentColor || '#4f35d2'
  const { headline, subtext, button_label, button_url, secondary_label, secondary_url } = content

  if (!headline) return null

  return (
    <Section style={{ backgroundColor: '#f7f7f8', padding: '0', margin: '0' }}>
      <Section style={{ padding: '32px 32px 28px', textAlign: 'center' }}>
        <Heading
          as="h3"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
            fontSize: '20px',
            fontWeight: '700',
            color: '#1a1535',
            margin: '0 0 10px',
            lineHeight: '1.3',
          }}
        >
          {headline}
        </Heading>

        {subtext && (
          <Text
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
              fontSize: '14px',
              color: '#4a4a6a',
              margin: '0 0 20px',
              lineHeight: '1.6',
            }}
          >
            {subtext}
          </Text>
        )}

        <Button
          href={button_url}
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
            backgroundColor: accent,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '600',
            textDecoration: 'none',
            borderRadius: '10px',
            padding: '12px 28px',
            display: 'inline-block',
          }}
        >
          {button_label}
        </Button>

        {secondary_label && secondary_url && (
          <Text style={{ margin: '14px 0 0' }}>
            <Link
              href={secondary_url}
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                fontSize: '13px',
                color: accent,
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
