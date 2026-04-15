import * as React from 'react'
import { render } from '@react-email/components'
import {
  Section,
  Text,
  Heading,
  Button,
  Hr,
  Img,
  Row,
  Column,
  Link,
} from '@react-email/components'
import { BaseLayout, RealtorBranding } from '@/emails/BaseLayout'

// ---------------------------------------------------------------------------
// Block type definitions (inlined — no external import)
// ---------------------------------------------------------------------------

type BlockType =
  | 'hero'
  | 'just_sold'
  | 'market_commentary'
  | 'rate_watch'
  | 'local_intel'
  | 'neighborhood_spotlight'
  | 'quick_tip'
  | 'agent_note'
  | 'cta'
  | 'divider'

interface EditorBlock {
  id: string
  type: BlockType
  content: Record<string, unknown>
  is_locked: boolean
}

// ---------------------------------------------------------------------------
// Public input type
// ---------------------------------------------------------------------------

export interface RenderEditionInput {
  title: string
  edition_type: string
  blocks: EditorBlock[]
  branding: RealtorBranding
  unsubscribe_url: string
  /** If true, use placeholder data for empty blocks */
  preview_mode?: boolean
}

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

const NAVY = '#2D3E50'
const CORAL = '#FF7A59'
const AMBER = '#F59E0B'
const INDIGO_SOFT = '#F0EEFF'
const GREY_LIGHT = '#F5F8FA'
const BORDER_GREY = '#E5E7EB'
const TEXT_PRIMARY = '#1A2330'
const TEXT_MUTED = '#6B7280'

// ---------------------------------------------------------------------------
// Helper: safe string coercion from unknown content values
// ---------------------------------------------------------------------------

function str(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback
  return String(val)
}

function arr(val: unknown): string[] {
  if (!Array.isArray(val)) return []
  return val.map((v) => str(v)).filter(Boolean)
}

// ---------------------------------------------------------------------------
// Spacer between blocks
// ---------------------------------------------------------------------------

function Spacer(): React.ReactElement {
  return (
    <Section style={{ height: '16px', lineHeight: '16px', fontSize: '1px' }}>
      {/* spacer */}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Block: Hero
// ---------------------------------------------------------------------------

function HeroBlock({
  content,
  preview_mode,
}: {
  content: Record<string, unknown>
  preview_mode: boolean
}): React.ReactElement | null {
  const headline = str(content.headline) || (preview_mode ? 'Market Update — Spring 2026' : '')
  const subheadline =
    str(content.subheadline) ||
    (preview_mode ? 'Your trusted source for local real estate intelligence.' : '')
  const imageUrl = str(content.image_url)

  if (!headline && !preview_mode) return null

  return (
    <Section
      style={{
        backgroundColor: NAVY,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {imageUrl ? (
        <Img
          src={imageUrl}
          width="600"
          alt={headline}
          style={{ display: 'block', width: '100%', maxWidth: '600px' }}
        />
      ) : null}
      <Section style={{ padding: '40px 36px' }}>
        <Heading
          as="h1"
          style={{
            fontFamily: FONT_STACK,
            fontSize: '28px',
            fontWeight: '700',
            color: '#FFFFFF',
            margin: '0 0 12px',
            lineHeight: '1.25',
          }}
        >
          {headline}
        </Heading>
        {subheadline ? (
          <Text
            style={{
              fontFamily: FONT_STACK,
              fontSize: '16px',
              color: 'rgba(255,255,255,0.85)',
              margin: '0',
              lineHeight: '1.6',
            }}
          >
            {subheadline}
          </Text>
        ) : null}
      </Section>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Block: Just Sold
// ---------------------------------------------------------------------------

function JustSoldBlock({
  content,
  preview_mode,
}: {
  content: Record<string, unknown>
  preview_mode: boolean
}): React.ReactElement | null {
  const address = str(content.address) || (preview_mode ? '142 Maple Drive, Burnaby, BC' : '')
  const salePrice = str(content.sale_price) || (preview_mode ? '$1,285,000' : '')
  const daysOnMarket = str(content.days_on_market)
  const highlights = arr(content.highlights)

  if (!address && !preview_mode) return null

  const displayHighlights =
    preview_mode && highlights.length === 0
      ? ['Sold over asking price', 'Multiple offer situation', 'Closed in 14 days']
      : highlights

  return (
    <Section
      style={{
        backgroundColor: '#FFFFFF',
        borderLeft: `4px solid ${NAVY}`,
        borderRadius: '0 8px 8px 0',
        padding: '28px 28px 28px 24px',
      }}
    >
      <Text
        style={{
          fontFamily: FONT_STACK,
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '1.5px',
          color: CORAL,
          textTransform: 'uppercase',
          margin: '0 0 10px',
        }}
      >
        Just Sold
      </Text>
      <Heading
        as="h2"
        style={{
          fontFamily: FONT_STACK,
          fontSize: '20px',
          fontWeight: '700',
          color: TEXT_PRIMARY,
          margin: '0 0 8px',
          lineHeight: '1.3',
        }}
      >
        {address}
      </Heading>
      <Text
        style={{
          fontFamily: FONT_STACK,
          fontSize: '24px',
          fontWeight: '700',
          color: CORAL,
          margin: '0 0 6px',
        }}
      >
        {salePrice}
      </Text>
      {daysOnMarket ? (
        <Text
          style={{
            fontFamily: FONT_STACK,
            fontSize: '13px',
            color: TEXT_MUTED,
            margin: '0 0 16px',
          }}
        >
          {daysOnMarket} days on market
        </Text>
      ) : null}
      {displayHighlights.length > 0 ? (
        <Section style={{ margin: '0' }}>
          {displayHighlights.map((h) => (
            <Text
              key={h}
              style={{
                fontFamily: FONT_STACK,
                fontSize: '14px',
                color: TEXT_PRIMARY,
                margin: '0 0 6px',
                lineHeight: '1.5',
              }}
            >
              <span style={{ color: CORAL, fontWeight: '700', marginRight: '8px' }}>✓</span>
              {h}
            </Text>
          ))}
        </Section>
      ) : null}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Block: Market Commentary
// ---------------------------------------------------------------------------

function MarketCommentaryBlock({
  content,
  preview_mode,
}: {
  content: Record<string, unknown>
  preview_mode: boolean
}): React.ReactElement | null {
  const commentary =
    str(content.commentary) ||
    (preview_mode
      ? 'Metro Vancouver inventory remains tight with continued buyer demand pushing prices upward in detached segments. Attached properties are seeing more balanced conditions as new supply comes online.'
      : '')

  if (!commentary && !preview_mode) return null

  const stat1Label = str(content.stat_1_label) || (preview_mode ? 'Avg. Sale Price' : '')
  const stat1Value = str(content.stat_1_value) || (preview_mode ? '$1.42M' : '')
  const stat2Label = str(content.stat_2_label) || (preview_mode ? 'Days on Market' : '')
  const stat2Value = str(content.stat_2_value) || (preview_mode ? '18' : '')
  const hasStats = Boolean(stat1Label && stat1Value)
  const hasBothStats = hasStats && Boolean(stat2Label && stat2Value)

  return (
    <Section
      style={{
        backgroundColor: GREY_LIGHT,
        borderRadius: '8px',
        padding: '28px',
      }}
    >
      <Text
        style={{
          fontFamily: FONT_STACK,
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '1.5px',
          color: CORAL,
          textTransform: 'uppercase',
          margin: '0 0 12px',
        }}
      >
        Market Pulse
      </Text>
      <Text
        style={{
          fontFamily: FONT_STACK,
          fontSize: '15px',
          color: TEXT_PRIMARY,
          lineHeight: '1.7',
          margin: hasStats ? '0 0 20px' : '0',
        }}
      >
        {commentary}
      </Text>
      {hasStats ? (
        <Row>
          <Column style={{ width: '50%', paddingRight: '8px' }}>
            <Section
              style={{
                backgroundColor: NAVY,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: FONT_STACK,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#FFFFFF',
                  margin: '0 0 4px',
                }}
              >
                {stat1Value}
              </Text>
              <Text
                style={{
                  fontFamily: FONT_STACK,
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.75)',
                  margin: '0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {stat1Label}
              </Text>
            </Section>
          </Column>
          {hasBothStats ? (
            <Column style={{ width: '50%', paddingLeft: '8px' }}>
              <Section
                style={{
                  backgroundColor: NAVY,
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_STACK,
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    margin: '0 0 4px',
                  }}
                >
                  {stat2Value}
                </Text>
                <Text
                  style={{
                    fontFamily: FONT_STACK,
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.75)',
                    margin: '0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {stat2Label}
                </Text>
              </Section>
            </Column>
          ) : (
            <Column style={{ width: '50%' }}>
              <Section style={{ padding: '4px' }}>{/* empty col */}</Section>
            </Column>
          )}
        </Row>
      ) : null}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Block: Rate Watch
// ---------------------------------------------------------------------------

const RATE_ROWS: Array<{ label: string; key: string }> = [
  { label: '1-Year Fixed', key: 'rate_1yr' },
  { label: '3-Year Fixed', key: 'rate_3yr' },
  { label: '5-Year Fixed', key: 'rate_5yr' },
  { label: 'Variable', key: 'variable_rate' },
]

const PREVIEW_RATES: Record<string, string> = {
  rate_1yr: '5.14%',
  rate_3yr: '4.89%',
  rate_5yr: '4.64%',
  variable_rate: '6.45%',
}

function RateWatchBlock({
  content,
  preview_mode,
}: {
  content: Record<string, unknown>
  preview_mode: boolean
}): React.ReactElement | null {
  // Note: the AI generates 'narrative' (not 'commentary') for this block.
  // We check both field names for backwards compatibility with any manually-authored blocks.
  const commentary =
    str(content.narrative) ||
    str(content.commentary) ||
    (preview_mode
      ? 'The Bank of Canada held rates steady this cycle. Economists anticipate a potential cut later this quarter, which may bring further relief to variable-rate borrowers.'
      : '')

  const activeRates = RATE_ROWS.filter(
    ({ key }) => str(content[key]) || (preview_mode ? PREVIEW_RATES[key] : '')
  )

  if (activeRates.length === 0 && !commentary && !preview_mode) return null

  return (
    <Section
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        padding: '28px',
        border: `1px solid ${BORDER_GREY}`,
      }}
    >
      <Heading
        as="h3"
        style={{
          fontFamily: FONT_STACK,
          fontSize: '16px',
          fontWeight: '700',
          color: TEXT_PRIMARY,
          margin: '0 0 20px',
        }}
      >
        📉 Rate Watch
      </Heading>
      {activeRates.length > 0 ? (
        <Section
          style={{
            borderRadius: '6px',
            overflow: 'hidden',
            border: `1px solid ${BORDER_GREY}`,
            marginBottom: '16px',
          }}
        >
          {activeRates.map(({ label, key }, idx) => (
            <Row
              key={key}
              style={{ backgroundColor: idx % 2 === 0 ? GREY_LIGHT : '#FFFFFF' }}
            >
              <Column style={{ padding: '10px 16px', width: '60%' }}>
                <Text
                  style={{
                    fontFamily: FONT_STACK,
                    fontSize: '13px',
                    color: TEXT_MUTED,
                    margin: '0',
                  }}
                >
                  {label}
                </Text>
              </Column>
              <Column style={{ padding: '10px 16px', width: '40%', textAlign: 'right' }}>
                <Text
                  style={{
                    fontFamily: FONT_STACK,
                    fontSize: '14px',
                    fontWeight: '600',
                    color: NAVY,
                    margin: '0',
                  }}
                >
                  {str(content[key]) || (preview_mode ? PREVIEW_RATES[key] : '')}
                </Text>
              </Column>
            </Row>
          ))}
        </Section>
      ) : null}
      {commentary ? (
        <Text
          style={{
            fontFamily: FONT_STACK,
            fontSize: '14px',
            fontStyle: 'italic',
            color: TEXT_MUTED,
            margin: '0',
            lineHeight: '1.6',
          }}
        >
          {commentary}
        </Text>
      ) : null}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Block: Local Intel
// ---------------------------------------------------------------------------

function LocalIntelBlock({
  content,
  preview_mode,
}: {
  content: Record<string, unknown>
  preview_mode: boolean
}): React.ReactElement | null {
  const headline =
    str(content.headline) || (preview_mode ? 'New Transit Line to Boost East Van Values' : '')
  const body =
    str(content.body) ||
    (preview_mode
      ? "The planned SkyTrain extension through Commercial Drive to UBC is expected to increase property values along the corridor by 8–12% over the next 24 months, according to urban planners."
      : '')
  const sourceUrl = str(content.source_url)

  if (!headline && !preview_mode) return null

  return (
    <Section
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        padding: '28px',
        border: `1px solid ${BORDER_GREY}`,
      }}
    >
      <Text
        style={{
          fontFamily: FONT_STACK,
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '1.5px',
          color: CORAL,
          textTransform: 'uppercase',
          margin: '0 0 10px',
        }}
      >
        Local Intel
      </Text>
      <Heading
        as="h3"
        style={{
          fontFamily: FONT_STACK,
          fontSize: '18px',
          fontWeight: '700',
          color: TEXT_PRIMARY,
          margin: '0 0 10px',
          lineHeight: '1.35',
        }}
      >
        {headline}
      </Heading>
      {body ? (
        <Text
          style={{
            fontFamily: FONT_STACK,
            fontSize: '15px',
            color: TEXT_PRIMARY,
            lineHeight: '1.65',
            margin: sourceUrl ? '0 0 12px' : '0',
          }}
        >
          {body}
        </Text>
      ) : null}
      {sourceUrl ? (
        <Link
          href={sourceUrl}
          style={{
            fontFamily: FONT_STACK,
            fontSize: '13px',
            fontWeight: '600',
            color: CORAL,
            textDecoration: 'none',
          }}
        >
          Read more →
        </Link>
      ) : null}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Block: Neighbourhood Spotlight
// ---------------------------------------------------------------------------

function NeighborhoodSpotlightBlock({
  content,
  preview_mode,
}: {
  content: Record<string, unknown>
  preview_mode: boolean
}): React.ReactElement | null {
  const name = str(content.name) || (preview_mode ? 'Mount Pleasant' : '')
  // Note: the AI generates 'body' and 'vibe_tags' for this block.
  // We also check legacy field names 'description'/'highlights' for manually-authored blocks.
  const description =
    str(content.body) ||
    str(content.description) ||
    (preview_mode
      ? "One of Vancouver's most vibrant and walkable neighbourhoods, Mount Pleasant blends indie coffee shops, art studios, and family-friendly green spaces with a rapidly evolving condo market."
      : '')
  const highlights = arr(content.vibe_tags).length > 0 ? arr(content.vibe_tags) : arr(content.highlights)
  const displayHighlights =
    preview_mode && highlights.length === 0
      ? ['Walk Score: 92', 'Avg. 2BR: $889K', 'New cafés + breweries']
      : highlights.slice(0, 3)

  if (!name && !preview_mode) return null

  return (
    <Section
      style={{
        backgroundColor: INDIGO_SOFT,
        borderRadius: '8px',
        padding: '28px',
      }}
    >
      <Text
        style={{
          fontFamily: FONT_STACK,
          fontSize: '12px',
          fontWeight: '700',
          letterSpacing: '1px',
          color: '#6B5FD0',
          margin: '0 0 10px',
          textTransform: 'uppercase',
        }}
      >
        📍 Neighbourhood Spotlight
      </Text>
      <Heading
        as="h2"
        style={{
          fontFamily: FONT_STACK,
          fontSize: '22px',
          fontWeight: '700',
          color: NAVY,
          margin: '0 0 10px',
          lineHeight: '1.25',
        }}
      >
        {name}
      </Heading>
      {description ? (
        <Text
          style={{
            fontFamily: FONT_STACK,
            fontSize: '15px',
            color: TEXT_PRIMARY,
            lineHeight: '1.65',
            margin: displayHighlights.length > 0 ? '0 0 18px' : '0',
          }}
        >
          {description}
        </Text>
      ) : null}
      {displayHighlights.length > 0 ? (
        <Row>
          {displayHighlights.map((h, idx) => (
            <Column
              key={h}
              style={{ paddingRight: idx < displayHighlights.length - 1 ? '8px' : '0' }}
            >
              <Section
                style={{
                  border: `1px solid ${NAVY}`,
                  borderRadius: '20px',
                  padding: '5px 14px',
                  backgroundColor: 'transparent',
                  textAlign: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_STACK,
                    fontSize: '12px',
                    fontWeight: '600',
                    color: NAVY,
                    margin: '0',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </Text>
              </Section>
            </Column>
          ))}
        </Row>
      ) : null}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Block: Quick Tip
// ---------------------------------------------------------------------------

function QuickTipBlock({
  content,
  preview_mode,
}: {
  content: Record<string, unknown>
  preview_mode: boolean
}): React.ReactElement | null {
  const tip =
    str(content.tip) ||
    (preview_mode
      ? "Price your home 2–3% below the nearest comp to generate multiple offers in a balanced market. Controlled competition often yields a better final price than listing high."
      : '')
  const category = str(content.tip_category)

  if (!tip && !preview_mode) return null

  return (
    <Section
      style={{
        backgroundColor: '#FFFBF0',
        borderLeft: `4px solid ${AMBER}`,
        borderRadius: '0 8px 8px 0',
        padding: '24px 24px 24px 20px',
      }}
    >
      <Row>
        <Column>
          <Text
            style={{
              fontFamily: FONT_STACK,
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '1px',
              color: '#92400E',
              textTransform: 'uppercase',
              margin: '0 0 10px',
            }}
          >
            💡 Quick Tip
          </Text>
        </Column>
        {category ? (
          <Column style={{ textAlign: 'right' }}>
            <Section
              style={{
                display: 'inline-block',
                backgroundColor: AMBER,
                borderRadius: '4px',
                padding: '2px 10px',
              }}
            >
              <Text
                style={{
                  fontFamily: FONT_STACK,
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  margin: '0',
                }}
              >
                {category}
              </Text>
            </Section>
          </Column>
        ) : (
          <Column>
            <Text style={{ margin: '0' }}>{/* empty */}</Text>
          </Column>
        )}
      </Row>
      <Text
        style={{
          fontFamily: FONT_STACK,
          fontSize: '15px',
          fontStyle: 'italic',
          color: '#78350F',
          lineHeight: '1.65',
          margin: '0',
        }}
      >
        {tip}
      </Text>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Block: Agent Note
// ---------------------------------------------------------------------------

function AgentNoteBlock({
  content,
  preview_mode,
}: {
  content: Record<string, unknown>
  preview_mode: boolean
}): React.ReactElement | null {
  const note =
    str(content.note) ||
    (preview_mode
      ? "Spring is here and so is the competition. I'm seeing buyers who have been sitting on the fence finally making moves — and sellers who listed last fall are getting renewed interest. If you've been thinking about making a move, now is a great time to connect."
      : '')
  const signature =
    str(content.signature) || (preview_mode ? 'Here whenever you need me.' : '')

  if (!note && !preview_mode) return null

  return (
    <Section
      style={{
        backgroundColor: '#FEFEFE',
        borderRadius: '8px',
        padding: '32px 28px 24px',
        border: `1px solid ${BORDER_GREY}`,
      }}
    >
      {/* Decorative opening quote mark */}
      <Text
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: '72px',
          fontWeight: '700',
          color: CORAL,
          opacity: 0.25,
          lineHeight: '1',
          margin: '0 0 -16px',
          display: 'block',
        }}
      >
        {'\u201C'}
      </Text>
      <Text
        style={{
          fontFamily: FONT_STACK,
          fontSize: '16px',
          color: TEXT_PRIMARY,
          lineHeight: '1.7',
          margin: '0 0 16px',
        }}
      >
        {note}
      </Text>
      {signature ? (
        <Text
          style={{
            fontFamily: FONT_STACK,
            fontSize: '13px',
            fontStyle: 'italic',
            color: TEXT_MUTED,
            margin: '0',
          }}
        >
          {signature}
        </Text>
      ) : null}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Block: CTA
// ---------------------------------------------------------------------------

function CtaBlock({
  content,
  preview_mode,
}: {
  content: Record<string, unknown>
  preview_mode: boolean
}): React.ReactElement | null {
  const headline =
    str(content.headline) ||
    (preview_mode ? "Ready to Make Your Move? Let's Talk." : '')
  const buttonText =
    str(content.button_text) || (preview_mode ? 'Book a Free Consultation' : 'Get in Touch')
  const buttonUrl = str(content.button_url) || '#'
  const subtext = str(content.subtext)

  if (!headline && !preview_mode) return null

  return (
    <Section
      style={{
        backgroundColor: CORAL,
        borderRadius: '8px',
        padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      <Heading
        as="h2"
        style={{
          fontFamily: FONT_STACK,
          fontSize: '22px',
          fontWeight: '700',
          color: '#FFFFFF',
          margin: '0 0 24px',
          lineHeight: '1.3',
        }}
      >
        {headline}
      </Heading>
      <Button
        href={buttonUrl}
        style={{
          fontFamily: FONT_STACK,
          backgroundColor: NAVY,
          color: '#FFFFFF',
          fontSize: '15px',
          fontWeight: '600',
          textDecoration: 'none',
          borderRadius: '8px',
          padding: '14px 32px',
          display: 'inline-block',
          minWidth: '200px',
          textAlign: 'center',
        }}
      >
        {buttonText}
      </Button>
      {subtext ? (
        <Text
          style={{
            fontFamily: FONT_STACK,
            fontSize: '13px',
            color: 'rgba(255,255,255,0.85)',
            margin: '16px 0 0',
          }}
        >
          {subtext}
        </Text>
      ) : null}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Block: Divider
// ---------------------------------------------------------------------------

function DividerBlock(): React.ReactElement {
  return (
    <Hr
      style={{
        borderColor: BORDER_GREY,
        borderTopWidth: '1px',
        margin: '8px 0',
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Block router
// ---------------------------------------------------------------------------

function renderBlock(
  block: EditorBlock,
  preview_mode: boolean
): React.ReactElement | null {
  const { type, content } = block

  switch (type) {
    case 'hero':
      return <HeroBlock content={content} preview_mode={preview_mode} />
    case 'just_sold':
      return <JustSoldBlock content={content} preview_mode={preview_mode} />
    case 'market_commentary':
      return <MarketCommentaryBlock content={content} preview_mode={preview_mode} />
    case 'rate_watch':
      return <RateWatchBlock content={content} preview_mode={preview_mode} />
    case 'local_intel':
      return <LocalIntelBlock content={content} preview_mode={preview_mode} />
    case 'neighborhood_spotlight':
      return <NeighborhoodSpotlightBlock content={content} preview_mode={preview_mode} />
    case 'quick_tip':
      return <QuickTipBlock content={content} preview_mode={preview_mode} />
    case 'agent_note':
      return <AgentNoteBlock content={content} preview_mode={preview_mode} />
    case 'cta':
      return <CtaBlock content={content} preview_mode={preview_mode} />
    case 'divider':
      return <DividerBlock />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// EditionEmail — internal React component
// ---------------------------------------------------------------------------

interface EditionEmailProps {
  title: string
  blocks: EditorBlock[]
  branding: RealtorBranding
  unsubscribeUrl: string
  preview_mode: boolean
}

function EditionEmail({
  title,
  blocks,
  branding,
  unsubscribeUrl,
  preview_mode,
}: EditionEmailProps): React.ReactElement {
  // Build the list of rendered blocks (filtering out nulls).
  // Spacers are inserted between rendered blocks — we must pre-render all blocks
  // first so we know which ones produce output, then interleave spacers correctly.
  const renderedElements: Array<{ id: string; el: React.ReactElement }> = []

  for (const block of blocks) {
    const el = renderBlock(block, preview_mode)
    if (!el) continue
    renderedElements.push({ id: block.id, el })
  }

  const rendered: React.ReactElement[] = []
  renderedElements.forEach(({ id, el }, idx) => {
    rendered.push(<React.Fragment key={id}>{el}</React.Fragment>)
    // Spacer between blocks only — not after the last rendered block
    if (idx < renderedElements.length - 1) {
      rendered.push(<Spacer key={`spacer-${id}`} />)
    }
  })

  return (
    <BaseLayout previewText={title} branding={branding} unsubscribeUrl={unsubscribeUrl}>
      {rendered.length > 0 ? rendered : <Text style={{ margin: 0 }}>{title}</Text>}
    </BaseLayout>
  )
}

// ---------------------------------------------------------------------------
// Main export: renderEdition
// ---------------------------------------------------------------------------

/**
 * Renders an editorial edition (array of blocks) to a production-quality
 * HTML email string. Server-side only.
 */
export async function renderEdition(edition: RenderEditionInput): Promise<string> {
  const { title, blocks, branding, unsubscribe_url, preview_mode = false } = edition

  const element = (
    <EditionEmail
      title={title}
      blocks={blocks}
      branding={branding}
      unsubscribeUrl={unsubscribe_url}
      preview_mode={preview_mode}
    />
  )

  const html = await render(element)
  return html
}

// ---------------------------------------------------------------------------
// Export: getEditionPreviewText
// ---------------------------------------------------------------------------

/**
 * Returns ~90 char preview text for email clients (the text shown after
 * subject line). Extracts from the first meaningful block content.
 */
export function getEditionPreviewText(edition: {
  title: string
  edition_type: string
  blocks: EditorBlock[]
}): string {
  const { title, blocks } = edition

  for (const block of blocks) {
    const c = block.content

    if (block.type === 'hero') {
      const headline = str(c.headline)
      const subheadline = str(c.subheadline)
      if (headline) {
        const base = subheadline ? `${headline} — ${subheadline}` : headline
        return base.slice(0, 90)
      }
    }

    if (block.type === 'market_commentary') {
      const commentary = str(c.commentary)
      if (commentary) return commentary.slice(0, 90)
    }

    if (block.type === 'agent_note') {
      const note = str(c.note)
      if (note) return note.slice(0, 90)
    }

    if (block.type === 'just_sold') {
      const address = str(c.address)
      const price = str(c.sale_price)
      if (address && price) {
        return `Just Sold: ${address} for ${price}`.slice(0, 90)
      }
    }

    if (block.type === 'local_intel') {
      const headline = str(c.headline)
      if (headline) return headline.slice(0, 90)
    }

    if (block.type === 'neighborhood_spotlight') {
      const name = str(c.name)
      const description = str(c.description)
      if (name) {
        return description ? `${name} — ${description}`.slice(0, 90) : name.slice(0, 90)
      }
    }

    if (block.type === 'quick_tip') {
      const tip = str(c.tip)
      if (tip) return tip.slice(0, 90)
    }
  }

  // Fallback to edition title
  return title.slice(0, 90)
}
