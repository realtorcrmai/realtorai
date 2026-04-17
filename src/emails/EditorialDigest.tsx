/**
 * EditorialDigest.tsx — Master template for Magnate editorial newsletter editions.
 *
 * Composes all 10 block types into a production-quality HTML email using
 * React Email primitives. Outlook-compatible (no CSS Grid, no flexbox,
 * no CSS custom properties, inline styles only).
 */

import * as React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components'
import type { RealtorBranding } from '@/emails/BaseLayout'
import type { BlockType, EditorBlock } from '@/types/editorial'

// Block components
import { MastheadBlock } from '@/emails/blocks/editorial/MastheadBlock'
import { HeroBlock } from '@/emails/blocks/editorial/HeroBlock'
import { JustSoldBlock } from '@/emails/blocks/editorial/JustSoldBlock'
import { RateWatchBlock } from '@/emails/blocks/editorial/RateWatchBlock'
import { MarketCommentaryBlock } from '@/emails/blocks/editorial/MarketCommentaryBlock'
import { NeighborhoodSpotlightBlock } from '@/emails/blocks/editorial/NeighborhoodSpotlightBlock'
import { LocalIntelBlock } from '@/emails/blocks/editorial/LocalIntelBlock'
import { QuickTipBlock } from '@/emails/blocks/editorial/QuickTipBlock'
import { AgentNoteBlock } from '@/emails/blocks/editorial/AgentNoteBlock'
import { CtaBlock } from '@/emails/blocks/editorial/CtaBlock'
import { DividerBlock } from '@/emails/blocks/editorial/DividerBlock'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EditorialEditionInput {
  title: string
  edition_type: string
  blocks: EditorBlock[]
  subject: string
}

export interface EditorialDigestProps {
  edition: EditorialEditionInput
  branding: RealtorBranding
  unsubscribe_url: string
  country?: 'CA' | 'US'
  /** Edition number shown in masthead subtitle */
  edition_number?: number
  /** If true, apply placeholder data for empty blocks */
  preview_mode?: boolean
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const FOREST_GREEN = '#1a2e1a'
const GOLD = '#c9a96e'
const MUTED_GREEN = '#8aaa8a'

// ── Province → country detector ───────────────────────────────────────────────

function detectCountry(branding: RealtorBranding): 'CA' | 'US' {
  const haystack = [branding.physicalAddress, branding.brokerage]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
  // Canadian province codes
  const caProvinces = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NS', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU']
  for (const prov of caProvinces) {
    // Match province code as a word boundary (space, comma, end)
    if (new RegExp(`\\b${prov}\\b`).test(haystack)) return 'CA'
  }
  return 'US'
}

// ── Block registry ────────────────────────────────────────────────────────────

/**
 * Renders a single EditorBlock to a React element.
 * Returns null if the block type is unrecognised or has no renderable content.
 */
function renderBlock(block: EditorBlock, country: 'CA' | 'US', branding: RealtorBranding): React.ReactElement | null {
  switch (block.type) {
    case 'hero':
      return <HeroBlock content={block.content} />

    case 'just_sold':
      return <JustSoldBlock content={block.content} />

    case 'market_commentary':
      return <MarketCommentaryBlock content={block.content} />

    case 'rate_watch':
      return <RateWatchBlock content={block.content} country={country} />

    case 'neighborhood_spotlight':
      return <NeighborhoodSpotlightBlock content={block.content} />

    case 'local_intel':
      return <LocalIntelBlock content={block.content} />

    case 'quick_tip':
      return <QuickTipBlock content={block.content} />

    case 'agent_note':
      return (
        <AgentNoteBlock
          content={block.content}
          agentName={branding.name}
          agentTitle={branding.title}
        />
      )

    case 'cta':
      return <CtaBlock content={block.content} />

    case 'divider':
      return <DividerBlock content={block.content} />

    default:
      return null
  }
}

// ── Masthead subtitle builder ─────────────────────────────────────────────────

function buildSubtitle(
  edition: EditorialEditionInput,
  country: 'CA' | 'US',
  edition_number?: number
): string {
  const parts: string[] = []
  const now = new Date()
  const monthYear = now.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
  parts.push(monthYear)

  const typeLabels: Record<string, string> = {
    market_update: 'Real Estate Intelligence',
    just_sold: 'Recent Transactions',
    open_house: 'Open House Edition',
    neighbourhood_spotlight: 'Neighbourhood Focus',
    rate_watch: 'Mortgage Rate Update',
    seasonal: 'Seasonal Edition',
  }
  const typeLabel = typeLabels[edition.edition_type] || 'Real Estate Intelligence'
  parts.push(typeLabel)

  if (edition_number) parts.push(`Edition #${edition_number}`)

  return parts.join('  ·  ')
}

// ── Footer ────────────────────────────────────────────────────────────────────

interface EditorialFooterProps {
  branding: RealtorBranding
  unsubscribe_url: string
  country: 'CA' | 'US'
}

function EditorialFooter({ branding, unsubscribe_url, country }: EditorialFooterProps) {
  return (
    <Section
      style={{
        backgroundColor: FOREST_GREEN,
        padding: '32px 40px',
        textAlign: 'center',
      }}
    >
      {/* Agent name */}
      {branding.name && (
        <Text
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '16px',
            fontWeight: '700',
            color: GOLD,
            margin: '0 0 4px',
          }}
        >
          {branding.name}
        </Text>
      )}

      {/* Title + brokerage */}
      {(branding.title || branding.brokerage) && (
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: MUTED_GREEN,
            margin: '0 0 8px',
          }}
        >
          {[branding.title, branding.brokerage].filter(Boolean).join('  ·  ')}
        </Text>
      )}

      {/* Phone + email */}
      {(branding.phone || branding.email) && (
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12px',
            color: MUTED_GREEN,
            margin: '0 0 16px',
          }}
        >
          {branding.phone && (
            <Link
              href={`tel:${branding.phone}`}
              style={{ color: MUTED_GREEN, textDecoration: 'none' }}
            >
              {branding.phone}
            </Link>
          )}
          {branding.phone && branding.email ? '  ·  ' : ''}
          {branding.email && (
            <Link
              href={`mailto:${branding.email}`}
              style={{ color: MUTED_GREEN, textDecoration: 'none' }}
            >
              {branding.email}
            </Link>
          )}
        </Text>
      )}

      {/* Gold divider */}
      <Hr
        style={{
          borderColor: GOLD,
          borderTopWidth: '1px',
          borderStyle: 'solid',
          margin: '0 0 16px',
          opacity: 0.3,
        }}
      />

      {/* Compliance — CA or US */}
      {country === 'CA' ? (
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            color: MUTED_GREEN,
            margin: '0 0 8px',
            lineHeight: '1.6',
          }}
        >
          Sent in compliance with CASL (Canada's Anti-Spam Legislation).
        </Text>
      ) : (
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            color: MUTED_GREEN,
            margin: '0 0 8px',
            lineHeight: '1.6',
          }}
        >
          CAN-SPAM compliant. This email was sent to you as a valued client.
        </Text>
      )}

      {/* Physical address */}
      {branding.physicalAddress && (
        <Text
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10px',
            color: MUTED_GREEN,
            margin: '0 0 12px',
          }}
        >
          {branding.physicalAddress}
        </Text>
      )}

      {/* Unsubscribe */}
      <Text
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '11px',
          color: MUTED_GREEN,
          margin: '0',
        }}
      >
        <Link
          href={unsubscribe_url}
          style={{
            color: GOLD,
            textDecoration: 'underline',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11px',
          }}
        >
          Unsubscribe
        </Link>
        {' '}from this newsletter
      </Text>
    </Section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function EditorialDigest({
  edition,
  branding,
  unsubscribe_url,
  country,
  edition_number,
  preview_mode = false,
}: EditorialDigestProps) {
  const resolvedCountry = country ?? detectCountry(branding)

  // Build preview text from the first hero headline
  const previewText = (() => {
    for (const block of edition.blocks) {
      if (block.type === 'hero') {
        const h = block.content.headline
        if (h) return h.slice(0, 90)
      }
    }
    return edition.title.slice(0, 90)
  })()

  const subtitle = buildSubtitle(edition, resolvedCountry, edition_number)

  // Render all blocks, tracking which produce output
  const renderedBlocks: Array<{ id: string; el: React.ReactElement }> = []
  for (const block of edition.blocks) {
    const el = renderBlock(block, resolvedCountry, branding)
    if (el) {
      renderedBlocks.push({ id: block.id, el })
    }
  }

  return (
    <Html lang="en" dir="ltr">
      <Head>
        {/* Google Fonts — Cormorant Garamond for premium headings */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      </Head>

      <Preview>{previewText}</Preview>

      <Body
        style={{
          backgroundColor: '#f4f1eb',
          fontFamily: 'Arial, Helvetica, sans-serif',
          margin: '0',
          padding: '24px 0',
        }}
      >
        <Container
          style={{
            maxWidth: '620px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            border: '1px solid #e8e2d5',
          }}
        >
          {/* 1. Masthead — always first */}
          <MastheadBlock
            title={edition.title}
            subtitle={subtitle}
          />

          {/* 2. Content blocks */}
          {renderedBlocks.length > 0 ? (
            renderedBlocks.map(({ id, el }, idx) => (
              <React.Fragment key={id}>
                {el}
                {/* Section divider between blocks (not after last) */}
                {idx < renderedBlocks.length - 1 && (
                  <Hr
                    style={{
                      borderColor: '#f0ebe0',
                      borderTopWidth: '1px',
                      borderStyle: 'solid',
                      margin: '0',
                    }}
                  />
                )}
              </React.Fragment>
            ))
          ) : (
            <Section style={{ padding: '40px' }}>
              <Text
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: '16px',
                  color: '#4a4a3a',
                  margin: '0',
                  textAlign: 'center',
                }}
              >
                {edition.title}
              </Text>
            </Section>
          )}

          {/* 3. Footer */}
          <EditorialFooter
            branding={branding}
            unsubscribe_url={unsubscribe_url}
            country={resolvedCountry}
          />
        </Container>
      </Body>
    </Html>
  )
}
