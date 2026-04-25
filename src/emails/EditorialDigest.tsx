/**
 * EditorialDigest.tsx — Master template for Magnate editorial newsletter editions.
 *
 * Uses the shared BaseLayout wrapper (logo, headshot, branding footer, dark mode,
 * mobile responsive) and renders editorial-specific blocks inside it.
 */

import * as React from 'react'
import { Hr, Section, Text } from '@react-email/components'
import { BaseLayout, type RealtorBranding } from '@/emails/BaseLayout'
import type { EditorBlock } from '@/types/editorial'

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
  edition_number?: number
  preview_mode?: boolean
}

// ── Block registry ────────────────────────────────────────────────────────────

function renderBlock(
  block: EditorBlock,
  country: 'CA' | 'US',
  branding: RealtorBranding,
): React.ReactElement | null {
  const accent = branding.accentColor || '#c9a96e'

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

// ── Province → country detector ───────────────────────────────────────────────

function detectCountry(branding: RealtorBranding): 'CA' | 'US' {
  const haystack = [branding.physicalAddress, branding.brokerage]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
  const caProvinces = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NS', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU']
  for (const prov of caProvinces) {
    if (new RegExp(`\\b${prov}\\b`).test(haystack)) return 'CA'
  }
  return 'US'
}

// ── Masthead subtitle builder ─────────────────────────────────────────────────

function buildSubtitle(
  edition: EditorialEditionInput,
  edition_number?: number,
): string {
  const parts: string[] = []
  const now = new Date()
  parts.push(now.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }))

  const typeLabels: Record<string, string> = {
    market_update: 'Real Estate Intelligence',
    just_sold: 'Recent Transactions',
    open_house: 'Open House Edition',
    neighbourhood_spotlight: 'Neighbourhood Focus',
    rate_watch: 'Mortgage Rate Update',
    seasonal: 'Seasonal Edition',
  }
  parts.push(typeLabels[edition.edition_type] || 'Real Estate Intelligence')

  if (edition_number) parts.push(`Edition #${edition_number}`)

  return parts.join('  ·  ')
}

// ── Main component ────────────────────────────────────────────────────────────

export function EditorialDigest({
  edition,
  branding,
  unsubscribe_url,
  country,
  edition_number,
}: EditorialDigestProps) {
  const resolvedCountry = country ?? detectCountry(branding)

  // Build preview text from the first hero headline
  const previewText = (() => {
    for (const block of edition.blocks) {
      if (block.type === 'hero') {
        const h = block.content.headline
        if (h) return String(h).slice(0, 90)
      }
    }
    return edition.title.slice(0, 90)
  })()

  const subtitle = buildSubtitle(edition, edition_number)

  // Render all blocks
  const renderedBlocks: Array<{ id: string; el: React.ReactElement }> = []
  for (const block of edition.blocks) {
    const el = renderBlock(block, resolvedCountry, branding)
    if (el) {
      renderedBlocks.push({ id: block.id, el })
    }
  }

  return (
    <BaseLayout
      previewText={previewText}
      branding={branding}
      unsubscribeUrl={unsubscribe_url}
    >
      {/* Masthead — edition title + type label */}
      <MastheadBlock title={edition.title} subtitle={subtitle} />

      {/* Content blocks */}
      {renderedBlocks.length > 0 ? (
        renderedBlocks.map(({ id, el }, idx) => (
          <React.Fragment key={id}>
            {el}
            {idx < renderedBlocks.length - 1 && (
              <Hr
                style={{
                  borderColor: '#e8e5f5',
                  borderTopWidth: '1px',
                  borderStyle: 'solid',
                  margin: '0',
                }}
              />
            )}
          </React.Fragment>
        ))
      ) : (
        <Section style={{ padding: '40px', textAlign: 'center' }}>
          <Text style={{ fontSize: '16px', color: '#3a3a5c', margin: '0' }}>
            {edition.title}
          </Text>
        </Section>
      )}
    </BaseLayout>
  )
}
