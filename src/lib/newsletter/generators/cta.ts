import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CtaBlockContent } from '@/types/editorial'
import type { EditionContext } from '@/lib/editorial-ai'
import { sanitizeBlockContent } from '../content-safety'

const anthropic = new Anthropic()
const MODEL_HAIKU = 'claude-haiku-4-5-20251001'

const CTA_GUIDE: Record<string, { guidance: string; cta_type: CtaBlockContent['cta_type'] }> = {
  market_update:           { guidance: 'Request a free market evaluation or book a consultation', cta_type: 'get_cma' },
  just_sold:               { guidance: 'Find out what your home is worth or start a buyer search', cta_type: 'get_cma' },
  open_house:              { guidance: 'RSVP to the open house or book a private showing', cta_type: 'open_house_rsvp' },
  new_listing:             { guidance: 'Book a showing or request the full property details', cta_type: 'view_listings' },
  neighbourhood_spotlight: { guidance: 'Explore listings in this neighbourhood or book a tour', cta_type: 'view_listings' },
  home_anniversary:        { guidance: 'Request a current home value estimate', cta_type: 'get_cma' },
  rate_watch:              { guidance: 'Book a free mortgage consultation or explore your buying power', cta_type: 'book_call' },
  seasonal:                { guidance: 'Connect with the agent for personalized seasonal advice', cta_type: 'book_call' },
}

export async function generateCta(
  ctx: EditionContext,
  _supabase: SupabaseClient,
): Promise<CtaBlockContent> {
  const city = ctx.city ?? 'Vancouver, BC'
  const editionMeta = CTA_GUIDE[ctx.edition_type] ?? {
    guidance: 'Connect with the agent for personalized advice',
    cta_type: 'book_call' as const,
  }

  const fallback: CtaBlockContent = {
    headline: 'Ready to Make Your Move?',
    subtext: 'No commitment — just honest, local expertise.',
    button_label: 'Book a Free Call',
    button_url: '#contact',
    secondary_label: null,
    secondary_url: null,
    style: 'primary',
    cta_type: editionMeta.cta_type,
  }

  const prompt = `Write a call-to-action block for a real estate newsletter edition of type "${ctx.edition_type}" in ${city}.

Context: ${editionMeta.guidance}

Requirements:
- headline: max 60 characters, action-oriented, creates urgency or curiosity
- button_label: max 30 characters, imperative verb phrase (e.g. "Book a Free Call", "See Your Home's Value")
- subtext: 1 sentence (max 80 chars) under the button that reduces friction or adds context

Return JSON matching this schema exactly:
{
  "headline": "string (max 60 chars)",
  "button_label": "string (max 30 chars)",
  "subtext": "string (max 80 chars)"
}`

  try {
    const response = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText =
      response.content[0]?.type === 'text' ? response.content[0].text : ''

    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : rawText.trim()
    const start = candidate.search(/[{[]/)
    const parsed =
      start !== -1 ? (JSON.parse(candidate.slice(start)) as Record<string, unknown>) : {}

    const raw: Record<string, unknown> = {
      headline: parsed.headline ?? fallback.headline,
      button_label: parsed.button_label ?? fallback.button_label,
      subtext: parsed.subtext ?? fallback.subtext,
    }
    const { content: safeContent } = sanitizeBlockContent(raw)

    return {
      headline: String(safeContent.headline ?? fallback.headline),
      subtext: String(safeContent.subtext ?? fallback.subtext),
      button_label: String(safeContent.button_label ?? fallback.button_label),
      button_url: '#contact',
      secondary_label: null,
      secondary_url: null,
      style: 'primary',
      cta_type: editionMeta.cta_type,
    }
  } catch (err) {
    console.error('[generator:cta] Generation failed:', err)
    return fallback
  }
}
