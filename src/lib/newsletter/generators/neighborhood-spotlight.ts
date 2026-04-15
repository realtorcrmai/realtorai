import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NeighborhoodSpotlightBlockContent } from '@/types/editorial'
import type { EditionContext } from '@/lib/editorial-ai'
import { sanitizeBlockContent } from '../content-safety'

const anthropic = new Anthropic()
const MODEL_SONNET = 'claude-sonnet-4-6'

export async function generateNeighborhoodSpotlight(
  ctx: EditionContext,
  _supabase: SupabaseClient,
): Promise<NeighborhoodSpotlightBlockContent> {
  const neighbourhood = ctx.neighbourhood ?? ctx.city ?? 'Vancouver, BC'

  const fallback: NeighborhoodSpotlightBlockContent = {
    neighbourhood,
    tagline: null,
    hero_image_url: null,
    description: `${neighbourhood} offers a vibrant mix of amenities, green space, and transit access that makes it a sought-after area for residents. The neighbourhood's walkable streets and local character continue to attract buyers.`,
    walk_score: null,
    transit_score: null,
    bike_score: null,
    avg_price: null,
    price_trend: null,
    highlights: ['Walkable streets', 'Local cafés', 'Transit access'],
    nearby_amenities: [],
  }

  const prompt = `Write a neighbourhood spotlight for ${neighbourhood} for a real estate newsletter.

Requirements:
- neighbourhood: the name of the neighbourhood (e.g. "Mount Pleasant" or "Kitsilano")
- description: 60–100 words describing the lifestyle and character of the area
- Must mention at least 2 specific local references: street names, parks, shops, restaurants, landmarks, or community features
- Avoid demographic language — describe places, not people groups
- Focus on what makes the neighbourhood appealing to live in (walkability, food scene, green space, transit, architecture, etc.)
- highlights: array of 3–5 short tags (e.g. ["Walk Score: 92", "avg 2BR: $889K", "café culture"])

Return JSON matching this schema exactly:
{
  "neighbourhood": "string",
  "description": "string (60-100 words)",
  "highlights": ["string", "string", "string"]
}`

  try {
    const response = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 512,
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
      description: parsed.description ?? fallback.description,
    }
    const { content: safeContent } = sanitizeBlockContent(raw)

    const highlights = Array.isArray(parsed.highlights)
      ? (parsed.highlights as unknown[])
          .map((h) => {
            if (typeof h === 'string') {
              const { content: hContent } = sanitizeBlockContent({ v: h } as Record<string, unknown>)
              return String(hContent.v ?? h)
            }
            return String(h)
          })
          .filter((h) => h.length > 0)
      : fallback.highlights

    return {
      ...fallback,
      neighbourhood: String(parsed.neighbourhood ?? neighbourhood),
      description: String(safeContent.description ?? fallback.description),
      highlights,
    }
  } catch (err) {
    console.error('[generator:neighborhood-spotlight] Generation failed:', err)
    return fallback
  }
}
