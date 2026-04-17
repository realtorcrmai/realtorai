/**
 * editorial-renderer.tsx
 *
 * Server-side renderer for Realtors360 editorial newsletter editions.
 * Delegates rendering to EditorialDigest (React Email component).
 *
 * Public API:
 *   renderEdition(input)       → Promise<string>   HTML email string
 *   getEditionPreviewText(ed)  → string             ~90-char preview snippet
 */

import * as React from 'react'
import type { RealtorBranding } from '@/emails/BaseLayout'
import { EditorialDigest } from '@/emails/EditorialDigest'
import type { EditorBlock } from '@/types/editorial'

// ---------------------------------------------------------------------------
// Public input type
// ---------------------------------------------------------------------------

export interface RenderEditionInput {
  title: string
  edition_type: string
  blocks: EditorBlock[]
  branding: RealtorBranding
  unsubscribe_url: string
  /** Edition number shown in masthead subtitle */
  edition_number?: number
  /** If true, use placeholder data for empty blocks */
  preview_mode?: boolean
}

// ---------------------------------------------------------------------------
// Helper: safe string coercion from unknown content values
// ---------------------------------------------------------------------------

function str(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback
  return String(val)
}

// ---------------------------------------------------------------------------
// renderEdition — main export
// ---------------------------------------------------------------------------

/**
 * Renders an editorial edition (array of typed blocks) to a production-quality
 * HTML email string. Server-side only (uses React renderToStaticMarkup).
 */
export async function renderEdition(edition: RenderEditionInput): Promise<string> {
  const { title, edition_type, blocks, branding, unsubscribe_url, edition_number, preview_mode = false } =
    edition

  const element = React.createElement(EditorialDigest, {
    edition: { title, edition_type, blocks, subject: title },
    branding,
    unsubscribe_url,
    edition_number,
    preview_mode,
  })

  // Dynamic import avoids Next.js 15 static-analysis block on react-dom/server.
  // renderToStaticMarkup is synchronous (no streams, no Suspense) so it does NOT
  // deadlock inside an RSC server action the way @react-email/render's
  // renderToPipeableStream/renderToReadableStream paths do.
  const { renderToStaticMarkup } = await import('react-dom/server')
  const html = renderToStaticMarkup(element)
  const doctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'

  // Inject the personalizer marker just before the dark footer table so that
  // sendEdition() can replace it per-recipient with a Haiku-generated paragraph.
  // Falls back to injecting before </body> if the footer pattern is not found.
  const MARKER = '<!-- __PERSONALIZED_BLOCK__ -->'
  let markedHtml: string

  // Match the dark footer table — background:#1a2e1a or background-color:#1a2e1a
  // (use a tolerant pattern; stop at the first > after the opening <table tag)
  const footerTableRe = /(<table[^>]*(?:background(?:-color)?:\s*#1a2e1a)[^>]*>)/i
  if (footerTableRe.test(html)) {
    markedHtml = html.replace(footerTableRe, `${MARKER}$1`)
  } else {
    // Fallback: inject before closing </body>
    markedHtml = html.replace(/<\/body>/i, `${MARKER}</body>`)
  }

  return `${doctype}${markedHtml}`
}

// ---------------------------------------------------------------------------
// getEditionPreviewText — secondary export
// ---------------------------------------------------------------------------

/**
 * Returns ~90 char preview text for email clients (the text shown after the
 * subject line in inbox previews). Extracts from the first meaningful block.
 */
export function getEditionPreviewText(edition: {
  title: string
  edition_type: string
  blocks: EditorBlock[]
}): string {
  const { title, blocks } = edition

  for (const block of blocks) {
    if (block.type === 'hero') {
      const headline = str(block.content.headline)
      const subheadline = str(block.content.subheadline)
      if (headline) {
        const base = subheadline ? `${headline} — ${subheadline}` : headline
        return base.slice(0, 90)
      }
    }

    if (block.type === 'market_commentary') {
      const body = str(block.content.body)
      if (body) return body.slice(0, 90)
    }

    if (block.type === 'agent_note') {
      const body = str(block.content.body)
      if (body) return body.slice(0, 90)
    }

    if (block.type === 'just_sold') {
      const address = str(block.content.address)
      const price = block.content.sale_price
      if (address && price !== null && price !== undefined) {
        const dollars = Number(price) / 100
        const formatted =
          dollars >= 1_000_000
            ? '$' + (dollars / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
            : '$' + dollars.toLocaleString('en-CA')
        return `Just Sold: ${address} for ${formatted}`.slice(0, 90)
      }
    }

    if (block.type === 'local_intel') {
      const headline = str(block.content.headline)
      if (headline) return headline.slice(0, 90)
    }

    if (block.type === 'neighborhood_spotlight') {
      const name = str(block.content.neighbourhood)
      const description = str(block.content.description)
      if (name) {
        return description ? `${name} — ${description}`.slice(0, 90) : name.slice(0, 90)
      }
    }

    if (block.type === 'quick_tip') {
      const tipBody = str(block.content.body)
      if (tipBody) return tipBody.slice(0, 90)
    }
  }

  return title.slice(0, 90)
}
