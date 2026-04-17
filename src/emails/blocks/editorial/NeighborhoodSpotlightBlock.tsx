import * as React from 'react'
import { Section, Text, Heading } from '@react-email/components'
import type { NeighborhoodSpotlightBlockContent } from '@/types/editorial'

export interface NeighborhoodSpotlightBlockEmailProps {
  content: NeighborhoodSpotlightBlockContent
}

const FOREST_GREEN = '#1a2e1a'
const GOLD = '#c9a96e'
const TEXT_BODY = '#4a4a3a'
const TEXT_MUTED = '#6b6b5a'
const CARD_BG = '#f9f7f2'

function formatScore(val: number | null | undefined, label: string): string | null {
  if (val == null) return null
  return `${label}: ${val}/100`
}

function formatAvgPrice(cents: number | null | undefined): string | null {
  if (cents == null) return null
  const dollars = cents / 100
  if (dollars >= 1_000_000) {
    return 'Avg. ' + '$' + (dollars / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  }
  return 'Avg. $' + dollars.toLocaleString('en-CA')
}

export function NeighborhoodSpotlightBlock({ content }: NeighborhoodSpotlightBlockEmailProps) {
  const {
    neighbourhood,
    tagline,
    description,
    highlights,
    walk_score,
    transit_score,
    bike_score,
    avg_price,
    price_trend,
  } = content

  if (!neighbourhood) return null

  const topHighlights = (highlights || []).slice(0, 3)

  const scoreItems = [
    formatScore(walk_score, 'Walk'),
    formatScore(transit_score, 'Transit'),
    formatScore(bike_score, 'Bike'),
    formatAvgPrice(avg_price),
    price_trend === 'up' ? 'Prices trending up' : price_trend === 'down' ? 'Prices trending down' : null,
  ].filter((x): x is string => x !== null)

  return (
    <Section style={{ backgroundColor: CARD_BG, padding: '0' }}>
      <Section style={{ padding: '28px 40px 24px' }}>
        {/* Eyebrow */}
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '2.5px',
            color: GOLD,
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}
        >
          Neighbourhood Spotlight
        </Text>

        {/* Neighbourhood name */}
        <Heading
          as="h3"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '20px',
            fontWeight: '700',
            color: FOREST_GREEN,
            margin: '0 0 6px',
            lineHeight: '1.25',
          }}
        >
          {neighbourhood}
        </Heading>

        {/* Tagline */}
        {tagline && (
          <Text
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: '14px',
              fontStyle: 'italic',
              color: TEXT_MUTED,
              margin: '0 0 16px',
            }}
          >
            {tagline}
          </Text>
        )}

        {/* Description */}
        {description && (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '14px',
              color: TEXT_BODY,
              margin: '0 0 18px',
              lineHeight: '1.65',
            }}
          >
            {description}
          </Text>
        )}

        {/* Highlights — gold dot bullets */}
        {topHighlights.length > 0 && (
          <table
            width="100%"
            cellPadding="0"
            cellSpacing="0"
            style={{ borderCollapse: 'collapse', marginBottom: scoreItems.length > 0 ? '16px' : '0' }}
          >
            <tbody>
              {topHighlights.map((h) => (
                <tr key={h}>
                  <td
                    width="20"
                    style={{ verticalAlign: 'top', paddingTop: '2px', paddingBottom: '6px' }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontSize: '14px',
                        color: GOLD,
                        margin: '0',
                        fontWeight: '700',
                      }}
                    >
                      ●
                    </Text>
                  </td>
                  <td style={{ paddingBottom: '6px' }}>
                    <Text
                      style={{
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontSize: '14px',
                        color: TEXT_BODY,
                        margin: '0',
                        lineHeight: '1.5',
                      }}
                    >
                      {h}
                    </Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Score / stat pills */}
        {scoreItems.length > 0 && (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '11px',
              color: TEXT_MUTED,
              margin: '0',
              lineHeight: '1.8',
            }}
          >
            {scoreItems.join('  ·  ')}
          </Text>
        )}
      </Section>
    </Section>
  )
}
