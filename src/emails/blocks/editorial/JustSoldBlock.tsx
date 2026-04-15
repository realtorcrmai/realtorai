import * as React from 'react'
import { Section, Text, Row, Column } from '@react-email/components'
import type { JustSoldBlockContent } from '@/types/editorial'

export interface JustSoldBlockEmailProps {
  content: JustSoldBlockContent
}

const FOREST_GREEN = '#1a2e1a'
const GOLD = '#c9a96e'
const SUCCESS_GREEN = '#1a6e3c'
const TEXT_BODY = '#4a4a3a'
const TEXT_MUTED = '#6b6b5a'
const CARD_BG = '#f9f7f2'

function formatPrice(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1_000_000) {
    return '$' + (dollars / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  }
  return '$' + dollars.toLocaleString('en-CA')
}

function formatPct(pct: number | null): string | null {
  if (pct === null) return null
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

export function JustSoldBlock({ content }: JustSoldBlockEmailProps) {
  const {
    address,
    sale_price,
    list_price,
    days_on_market,
    beds,
    baths,
    sqft,
    commentary,
    vs_asking_pct,
  } = content

  if (!address) return null

  const salePriceFormatted = formatPrice(sale_price)
  const listPriceFormatted = formatPrice(list_price)
  const pctLabel = formatPct(vs_asking_pct)

  const details: string[] = []
  if (beds) details.push(`${beds} bed`)
  if (baths) details.push(`${baths} bath`)
  if (sqft) details.push(`${sqft.toLocaleString()} sqft`)

  return (
    <Section
      style={{
        backgroundColor: CARD_BG,
        borderLeft: `4px solid ${GOLD}`,
        padding: '0',
        margin: '0',
      }}
    >
      <Section style={{ padding: '24px 28px 20px 24px' }}>
        {/* Label */}
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '2.5px',
            color: GOLD,
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          Just Sold
        </Text>

        {/* Address */}
        <Text
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '18px',
            fontWeight: '700',
            color: FOREST_GREEN,
            margin: '0 0 12px',
            lineHeight: '1.3',
          }}
        >
          {address}
        </Text>

        {/* Price row — table for Outlook compat */}
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{ borderCollapse: 'collapse', marginBottom: '12px' }}
        >
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'bottom' }}>
                <Text
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: '26px',
                    fontWeight: '700',
                    color: SUCCESS_GREEN,
                    margin: '0',
                    lineHeight: '1',
                  }}
                >
                  {salePriceFormatted}
                </Text>
              </td>
              {pctLabel && (
                <td style={{ verticalAlign: 'bottom', textAlign: 'right', paddingBottom: '2px' }}>
                  <Text
                    style={{
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: vs_asking_pct && vs_asking_pct >= 0 ? SUCCESS_GREEN : '#b91c1c',
                      margin: '0',
                    }}
                  >
                    {pctLabel} vs asking
                  </Text>
                </td>
              )}
            </tr>
          </tbody>
        </table>

        {/* Listed at */}
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '13px',
            color: TEXT_MUTED,
            margin: '0 0 8px',
          }}
        >
          Listed at {listPriceFormatted}
        </Text>

        {/* Details row */}
        {(details.length > 0 || days_on_market !== null) && (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '13px',
              color: TEXT_MUTED,
              margin: '0 0 16px',
            }}
          >
            {[...details, days_on_market !== null ? `${days_on_market} days on market` : null]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
        )}

        {/* Commentary */}
        {commentary && (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '14px',
              color: TEXT_BODY,
              margin: '0',
              lineHeight: '1.65',
              borderTop: `1px solid #e8e2d5`,
              paddingTop: '14px',
            }}
          >
            {commentary}
          </Text>
        )}
      </Section>
    </Section>
  )
}
