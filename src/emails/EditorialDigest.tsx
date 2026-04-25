/**
 * EditorialDigest.tsx — Master template for Magnate editorial newsletter editions.
 *
 * Uses the same visual language as the Welcome Drip emails: light purple bg,
 * white rounded card, system fonts, dark mode, realtor branding.
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
  Img,
} from '@react-email/components'
import type { RealtorBranding } from '@/emails/BaseLayout'
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
  const accent = branding.accentColor || '#4f35d2'

  switch (block.type) {
    case 'hero':
      return <HeroBlock content={block.content} accentColor={accent} />
    case 'just_sold':
      return <JustSoldBlock content={block.content} accentColor={accent} />
    case 'market_commentary':
      return <MarketCommentaryBlock content={block.content} accentColor={accent} />
    case 'rate_watch':
      return <RateWatchBlock content={block.content} country={country} accentColor={accent} />
    case 'neighborhood_spotlight':
      return <NeighborhoodSpotlightBlock content={block.content} accentColor={accent} />
    case 'local_intel':
      return <LocalIntelBlock content={block.content} accentColor={accent} />
    case 'quick_tip':
      return <QuickTipBlock content={block.content} accentColor={accent} />
    case 'agent_note':
      return (
        <AgentNoteBlock
          content={block.content}
          agentName={branding.name}
          agentTitle={branding.title}
          accentColor={accent}
        />
      )
    case 'cta':
      return <CtaBlock content={block.content} accentColor={accent} />
    case 'divider':
      return <DividerBlock content={block.content} accentColor={accent} />
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

// ── Subtitle builder ──────────────────────────────────────────────────────────

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
  const accent = branding.accentColor || '#4f35d2'

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

  const renderedBlocks: Array<{ id: string; el: React.ReactElement }> = []
  for (const block of edition.blocks) {
    const el = renderBlock(block, resolvedCountry, branding)
    if (el) {
      renderedBlocks.push({ id: block.id, el })
    }
  }

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @media (prefers-color-scheme: dark) {
            .ed-body { background-color: #1a1535 !important; }
            .ed-card { background-color: #2a2555 !important; }
            .ed-text { color: #e8e5f5 !important; }
            .ed-muted { color: #a0a0c0 !important; }
            .ed-footer { background-color: #1e1845 !important; }
          }
          @media only screen and (max-width: 600px) {
            .ed-card { width: 100% !important; border-radius: 0 !important; }
            .ed-content { padding: 0 16px !important; }
          }
        `}</style>
      </Head>

      <Preview>{previewText}</Preview>

      <Body style={main} className="ed-body">
        <Container style={container} className="ed-card">

          {/* ── Header: Logo or brand name ── */}
          <Section style={headerSection}>
            {branding.logoUrl ? (
              <Img
                src={branding.logoUrl}
                width="140"
                alt={`${branding.name} logo`}
                style={{ margin: '0 auto', display: 'block' }}
              />
            ) : (
              <Text style={{ ...brandNameStyle, color: accent }}>{branding.name}</Text>
            )}
          </Section>

          {/* ── Masthead: Edition title + subtitle ── */}
          <MastheadBlock
            title={edition.title}
            subtitle={subtitle}
            accentColor={accent}
            agentName={branding.name}
          />

          {/* ── Content blocks ── */}
          <Section className="ed-content">
            {renderedBlocks.length > 0 ? (
              renderedBlocks.map(({ id, el }, idx) => (
                <React.Fragment key={id}>
                  {el}
                  {idx < renderedBlocks.length - 1 && (
                    <Hr style={blockDivider} />
                  )}
                </React.Fragment>
              ))
            ) : (
              <Section style={{ padding: '40px', textAlign: 'center' }}>
                <Text style={{ fontSize: '16px', color: '#4a4a6a', margin: '0' }} className="ed-text">
                  {edition.title}
                </Text>
              </Section>
            )}
          </Section>

          {/* ── Agent card footer ── */}
          <Hr style={footerDivider} />
          <Section style={footerSection} className="ed-footer">
            {/* Headshot */}
            {branding.headshotUrl && (
              <Img
                src={branding.headshotUrl}
                width="64"
                height="64"
                alt={`Photo of ${branding.name}`}
                style={avatarStyle}
              />
            )}

            {/* Agent info */}
            <Text style={agentNameStyle} className="ed-text">{branding.name}</Text>
            {(branding.title || branding.brokerage) && (
              <Text style={agentDetailStyle} className="ed-muted">
                {[branding.title, branding.brokerage].filter(Boolean).join('  ·  ')}
              </Text>
            )}

            {/* Contact links */}
            {(branding.phone || branding.email) && (
              <Text style={agentDetailStyle}>
                {branding.phone && (
                  <Link href={`tel:${branding.phone}`} style={{ color: accent, textDecoration: 'none' }}>
                    {branding.phone}
                  </Link>
                )}
                {branding.phone && branding.email ? '  ·  ' : ''}
                {branding.email && (
                  <Link href={`mailto:${branding.email}`} style={{ color: accent, textDecoration: 'none' }}>
                    {branding.email}
                  </Link>
                )}
              </Text>
            )}

            {/* Compliance */}
            <Hr style={{ borderColor: '#e8e5f5', margin: '16px 0', borderTopWidth: '1px', borderStyle: 'solid', opacity: 0.5 }} />

            {resolvedCountry === 'CA' ? (
              <Text style={complianceStyle} className="ed-muted">
                Sent in compliance with CASL (Canada&apos;s Anti-Spam Legislation).
              </Text>
            ) : (
              <Text style={complianceStyle} className="ed-muted">
                CAN-SPAM compliant. This email was sent to you as a valued client.
              </Text>
            )}

            {branding.physicalAddress && (
              <Text style={addressStyle} className="ed-muted">{branding.physicalAddress}</Text>
            )}

            <Text style={unsubTextStyle}>
              <Link href={unsubscribe_url} style={unsubLinkStyle}>Unsubscribe</Link>
              {' '}from this newsletter
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ── Styles (matching Welcome Drip design language) ────────────────────────────

const main = {
  backgroundColor: '#f4f2ff',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  padding: '32px 16px',
}

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  overflow: 'hidden' as const,
}

const headerSection = {
  padding: '28px 32px 0',
  textAlign: 'center' as const,
}

const brandNameStyle = {
  fontSize: '20px',
  fontWeight: '700' as const,
  margin: '0',
  letterSpacing: '-0.5px',
}

const blockDivider = {
  borderColor: '#e8e5f5',
  borderTopWidth: '1px',
  borderStyle: 'solid' as const,
  margin: '0',
}

const footerDivider = {
  borderColor: '#e8e5f5',
  margin: '0',
}

const footerSection = {
  padding: '24px 32px',
  textAlign: 'center' as const,
}

const avatarStyle = {
  borderRadius: '50%',
  margin: '0 auto 12px',
  objectFit: 'cover' as const,
  display: 'block' as const,
}

const agentNameStyle = {
  fontSize: '16px',
  fontWeight: '600' as const,
  color: '#1a1535',
  margin: '0 0 2px',
}

const agentDetailStyle = {
  fontSize: '13px',
  color: '#6b6b8d',
  margin: '0 0 2px',
}

const complianceStyle = {
  fontSize: '10px',
  color: '#a0a0b0',
  margin: '0 0 4px',
  lineHeight: '1.6',
}

const addressStyle = {
  fontSize: '10px',
  color: '#b0b0c0',
  margin: '0 0 12px',
}

const unsubTextStyle = {
  fontSize: '11px',
  color: '#a0a0b0',
  margin: '0',
}

const unsubLinkStyle = {
  color: '#a0a0b0',
  textDecoration: 'underline',
}
