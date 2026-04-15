import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { HeroBlockContent } from '@/types/editorial'
import type { EditionContext } from '@/lib/editorial-ai'
import { sanitizeBlockContent } from '../content-safety'

const anthropic = new Anthropic()
const MODEL_SONNET = 'claude-sonnet-4-6'

export async function generateHero(
  ctx: EditionContext,
  _supabase: SupabaseClient,
): Promise<HeroBlockContent> {
  const neighbourhood = ctx.neighbourhood ?? ctx.city ?? 'Vancouver, BC'

  const fallback: HeroBlockContent = {
    headline: `${neighbourhood} Market Update`,
    subheadline: `What's happening in ${neighbourhood} real estate right now`,
    image_url: null,
    image_alt: null,
    edition_label: null,
    neighbourhood: neighbourhood,
    date_label: new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }),
  }

  const prompt = `Generate a hero section for a real estate newsletter edition titled "${ctx.title}" focused on ${neighbourhood}.

Requirements:
- headline: max 80 characters, active voice, include the neighbourhood name or a specific data point
- subheadline: max 120 characters, expands on the headline with a benefit or context

Return JSON matching this schema exactly:
{
  "headline": "string (max 80 chars)",
  "subheadline": "string (max 120 chars)"
}`

  try {
    const response = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText =
      response.content[0]?.type === 'text' ? response.content[0].text : ''

    // Parse JSON
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : rawText.trim()
    const start = candidate.search(/[{[]/)
    const parsed =
      start !== -1 ? (JSON.parse(candidate.slice(start)) as Record<string, unknown>) : {}

    const raw: Record<string, unknown> = {
      headline: parsed.headline ?? fallback.headline,
      subheadline: parsed.subheadline ?? fallback.subheadline,
    }

    const { content: safeContent } = sanitizeBlockContent(raw)

    return {
      headline: String(safeContent.headline ?? fallback.headline),
      subheadline: String(safeContent.subheadline ?? fallback.subheadline),
      image_url: null,
      image_alt: null,
      edition_label: null,
      neighbourhood,
      date_label: fallback.date_label,
    }
  } catch (err) {
    console.error('[generator:hero] Generation failed:', err)
    return fallback
  }
}
