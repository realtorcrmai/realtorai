import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { JustSoldBlockContent } from '@/types/editorial'
import type { EditionContext } from '@/lib/editorial-ai'
import { sanitizeBlockContent } from '../content-safety'

const anthropic = new Anthropic()
const MODEL_SONNET = 'claude-sonnet-4-6'

export async function generateJustSold(
  ctx: EditionContext,
  _supabase: SupabaseClient,
): Promise<JustSoldBlockContent> {
  const neighbourhood = ctx.neighbourhood ?? ctx.city ?? 'Vancouver, BC'
  const listings = ctx.recent_listings ?? []

  const fallback: JustSoldBlockContent = {
    address: listings[0]?.address ?? `123 Example St, ${neighbourhood}`,
    sale_price: 1250000,
    list_price: 1199000,
    days_on_market: listings[0]?.days_on_market ?? 14,
    beds: null,
    baths: null,
    sqft: null,
    sold_date: new Date().toISOString().slice(0, 10),
    photo_url: null,
    commentary: `A recent sale in ${neighbourhood} reflects strong market demand.`,
    vs_asking_pct: null,
  }

  const listingContext =
    listings.length > 0
      ? `Recent sold listings:\n${JSON.stringify(listings, null, 2)}`
      : 'No specific listing data provided — write a general just-sold narrative.'

  const prompt = `Generate a "Just Sold" block for a real estate newsletter in ${neighbourhood}.

${listingContext}

Requirements:
- highlights: array of exactly 3 specific, factual points about what made the property sell (e.g. price achievement, days on market, multiple offers)
- commentary: 2–3 sentences of market insight — what this sale says about current conditions in the area (property features only, no demographic references)

Return JSON matching this schema exactly:
{
  "highlights": ["string", "string", "string"],
  "commentary": "string (2-3 sentences)"
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
      commentary: parsed.commentary ?? fallback.commentary,
    }
    const { content: safeContent } = sanitizeBlockContent(raw)

    return {
      ...fallback,
      commentary: String(safeContent.commentary ?? fallback.commentary),
    }
  } catch (err) {
    console.error('[generator:just-sold] Generation failed:', err)
    return fallback
  }
}
