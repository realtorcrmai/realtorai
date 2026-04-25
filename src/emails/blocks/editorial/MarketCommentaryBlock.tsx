import * as React from 'react'
import { Section, Text, Heading } from '@react-email/components'
import type { MarketCommentaryBlockContent } from '@/types/editorial'

export interface MarketCommentaryBlockEmailProps {
  accentColor?: string
  content: MarketCommentaryBlockContent
}

const HEADING_COLOR = '#1a1535'

const TEXT_BODY = '#4a4a3a'
const TEXT_MUTED = '#6b6b5a'
const CARD_BG = '#f9f7f2'
const SUCCESS_GREEN = '#1a6e3c'

function formatAvgPrice(cents: number | null | undefined): string {
  if (cents == null) return '—'
  const dollars = cents / 100
  if (dollars >= 1_000_000) {
    return '$' + (dollars / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  }
  if (dollars >= 1_000) {
    return '$' + (dollars / 1_000).toFixed(0) + 'K'
  }
  return '$' + dollars.toLocaleString('en-CA')
}

function formatDom(dom: number | null | undefined): string {
  if (dom == null) return '—'
  return `${dom} days`
}

function formatYoy(pct: number | null | undefined): { text: string; color: string } {
  if (pct == null) return { text: '—', color: TEXT_MUTED }
  const sign = pct >= 0 ? '+' : ''
  return {
    text: `${sign}${pct.toFixed(1)}%`,
    color: pct >= 0 ? SUCCESS_GREEN : '#b91c1c',
  }
}

export function MarketCommentaryBlock({ content, accentColor }: MarketCommentaryBlockEmailProps) {
  const accent = accentColor || '#4f35d2'
  const {
    neighbourhood,
    body,
    avg_sale_price,
    median_dom,
    price_change_yoy_pct,
    period_label,
    market_type,
  } = content

  if (!body) return null

  const yoy = formatYoy(price_change_yoy_pct)
  const hasStats = avg_sale_price !== null || median_dom !== null || price_change_yoy_pct !== null

  const marketTypeLabel =
    market_type === 'sellers'
      ? "Seller's Market"
      : market_type === 'buyers'
      ? "Buyer's Market"
      : market_type === 'balanced'
      ? 'Balanced Market'
      : null

  return (
    <Section style={{ backgroundColor: '#ffffff', padding: '0' }}>
      <Section style={{ padding: '28px 40px 24px' }}>
        {/* Eyebrow */}
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '2.5px',
            color: accent,
            textTransform: 'uppercase',
            margin: '0 0 4px',
          }}
        >
          Market Commentary
        </Text>

        {/* Area + period heading */}
        <Heading
          as="h3"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '20px',
            fontWeight: '700',
            color: HEADING_COLOR,
            margin: '0 0 4px',
          }}
        >
          {neighbourhood}
        </Heading>

        {(period_label || marketTypeLabel) && (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '12px',
              color: TEXT_MUTED,
              margin: '0 0 20px',
            }}
          >
            {[period_label, marketTypeLabel].filter(Boolean).join('  ·  ')}
          </Text>
        )}

        {/* Stats bar — 3-column table */}
        {hasStats && (
          <table
            width="100%"
            cellPadding="0"
            cellSpacing="0"
            style={{
              borderCollapse: 'collapse',
              backgroundColor: CARD_BG,
              border: '1px solid #e8e2d5',
              marginBottom: '20px',
            }}
          >
            <tbody>
              <tr>
                <td
                  width="33%"
                  style={{
                    padding: '16px 14px',
                    textAlign: 'center',
                    borderRight: '1px solid #e8e2d5',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: '22px',
                      fontWeight: '700',
                      color: HEADING_COLOR,
                      margin: '0 0 4px',
                    }}
                  >
                    {formatAvgPrice(avg_sale_price)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: '10px',
                      color: TEXT_MUTED,
                      margin: '0',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Avg Sale Price
                  </Text>
                </td>
                <td
                  width="33%"
                  style={{
                    padding: '16px 14px',
                    textAlign: 'center',
                    borderRight: '1px solid #e8e2d5',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: '22px',
                      fontWeight: '700',
                      color: HEADING_COLOR,
                      margin: '0 0 4px',
                    }}
                  >
                    {formatDom(median_dom)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: '10px',
                      color: TEXT_MUTED,
                      margin: '0',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Median Days on Market
                  </Text>
                </td>
                <td width="34%" style={{ padding: '16px 14px', textAlign: 'center' }}>
                  <Text
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                      fontSize: '22px',
                      fontWeight: '700',
                      color: yoy.color,
                      margin: '0 0 4px',
                    }}
                  >
                    {yoy.text}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: '10px',
                      color: TEXT_MUTED,
                      margin: '0',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    YoY Price Change
                  </Text>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Body text */}
        <Text
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '15px',
            color: TEXT_BODY,
            margin: '0',
            lineHeight: '1.75',
          }}
        >
          {body}
        </Text>
      </Section>
    </Section>
  )
}
