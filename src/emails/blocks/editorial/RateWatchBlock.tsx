import * as React from 'react'
import { Section, Text, Heading } from '@react-email/components'
import type { RateWatchBlockContent } from '@/types/editorial'

export interface RateWatchBlockEmailProps {
  content: RateWatchBlockContent
  country: 'CA' | 'US'
}

const FOREST_GREEN = '#1a2e1a'
const GOLD = '#c9a96e'
const TEXT_BODY = '#4a4a3a'
const TEXT_MUTED = '#6b6b5a'
const CARD_BG = '#f9f7f2'
const ROW_ALT = '#f0ebe0'

interface RateRow {
  label: string
  value: number | null
  key: keyof RateWatchBlockContent
}

function formatRate(val: number | null | undefined): string {
  if (val == null) return '—'
  return `${val.toFixed(2)}%`
}

function changeBpsDisplay(
  bps: number | null | undefined
): { symbol: string; text: string; color: string } | null {
  if (bps == null) return null
  if (bps > 0) return { symbol: '▲', text: `+${bps}bps`, color: '#b91c1c' }
  if (bps < 0) return { symbol: '▼', text: `${bps}bps`, color: '#1a6e3c' }
  return { symbol: '—', text: 'unchanged', color: TEXT_MUTED }
}

export function RateWatchBlock({ content, country }: RateWatchBlockEmailProps) {
  const { commentary, change_bps, as_of_date } = content

  const caRows: RateRow[] = [
    { label: '5yr Fixed', key: 'rate_5yr_fixed', value: content.rate_5yr_fixed },
    { label: 'Variable (Prime-0.90)', key: 'rate_5yr_variable', value: content.rate_5yr_variable },
    { label: 'BoC Prime', key: 'prime_rate', value: content.prime_rate },
  ]

  const usRows: RateRow[] = [
    { label: '30yr Fixed', key: 'rate_5yr_fixed', value: content.rate_5yr_fixed },
    { label: '15yr Fixed', key: 'rate_3yr_fixed', value: content.rate_3yr_fixed },
    { label: 'Fed Funds', key: 'prime_rate', value: content.prime_rate },
  ]

  const rows = country === 'CA' ? caRows : usRows
  const activeRows = rows.filter((r) => r.value !== null)

  const changeDisplay = changeBpsDisplay(change_bps)

  const dateLabel = as_of_date
    ? new Date(as_of_date).toLocaleDateString('en-CA', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  if (activeRows.length === 0 && !commentary) return null

  return (
    <Section style={{ backgroundColor: '#ffffff', padding: '0' }}>
      <Section style={{ padding: '28px 40px 24px' }}>
        {/* Header row */}
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse', marginBottom: '18px' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top' }}>
                <Text
                  style={{
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    fontSize: '10px',
                    fontWeight: '700',
                    letterSpacing: '2.5px',
                    color: GOLD,
                    textTransform: 'uppercase',
                    margin: '0 0 4px',
                  }}
                >
                  Rate Watch
                </Text>
                <Heading
                  as="h3"
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: '20px',
                    fontWeight: '700',
                    color: FOREST_GREEN,
                    margin: '0',
                  }}
                >
                  {country === 'CA' ? 'Canadian Mortgage Rates' : 'US Mortgage Rates'}
                </Heading>
              </td>
              {changeDisplay && (
                <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
                  <Text
                    style={{
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: changeDisplay.color,
                      margin: '0',
                    }}
                  >
                    {changeDisplay.symbol} {changeDisplay.text}
                  </Text>
                  {dateLabel && (
                    <Text
                      style={{
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontSize: '11px',
                        color: TEXT_MUTED,
                        margin: '2px 0 0',
                      }}
                    >
                      As of {dateLabel}
                    </Text>
                  )}
                </td>
              )}
            </tr>
          </tbody>
        </table>

        {/* Rate table */}
        {activeRows.length > 0 && (
          <table
            width="100%"
            cellPadding="0"
            cellSpacing="0"
            style={{
              borderCollapse: 'collapse',
              border: '1px solid #e8e2d5',
              marginBottom: '16px',
            }}
          >
            <tbody>
              {activeRows.map((row, idx) => (
                <tr
                  key={row.label}
                  style={{ backgroundColor: idx % 2 === 0 ? CARD_BG : ROW_ALT }}
                >
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e8e2d5' }}>
                    <Text
                      style={{
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontSize: '13px',
                        color: TEXT_MUTED,
                        margin: '0',
                      }}
                    >
                      {row.label}
                    </Text>
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      borderBottom: '1px solid #e8e2d5',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: '20px',
                        fontWeight: '700',
                        color: FOREST_GREEN,
                        margin: '0',
                      }}
                    >
                      {formatRate(row.value)}
                    </Text>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Commentary */}
        {commentary && (
          <Text
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '14px',
              fontStyle: 'italic',
              color: TEXT_BODY,
              margin: '0',
              lineHeight: '1.65',
            }}
          >
            {commentary}
          </Text>
        )}
      </Section>
    </Section>
  )
}
