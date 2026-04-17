import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LocalIntelBlockContent } from '@/types/editorial'
import type { EditionContext } from '@/lib/editorial-ai'
import { sanitizeBlockContent } from '../content-safety'

const anthropic = new Anthropic()
const MODEL_SONNET = 'claude-sonnet-4-6'

export async function generateLocalIntel(
  ctx: EditionContext,
  _supabase: SupabaseClient,
): Promise<LocalIntelBlockContent> {
  const neighbourhood = ctx.neighbourhood ?? ctx.city ?? 'Vancouver, BC'

  const fallback: LocalIntelBlockContent = {
    headline: `Development Update: ${neighbourhood}`,
    body: `New development activity in ${neighbourhood} signals continued investment in the area. Infrastructure improvements are expected to enhance walkability and community amenities over the coming years.`,
    category: 'development',
    neighbourhood,
    source_url: null,
    source_label: 'City Planning Department',
    published_date: new Date().toISOString().slice(0, 10),
  }

  // If local_events are populated from Phase 2 resolvers, use them directly
  const localEvents = ctx.local_events
  if (localEvents && localEvents.length > 0) {
    const event = localEvents[0]
    const raw: Record<string, unknown> = {
      headline: event.title,
      body: event.description,
    }
    const { content: safeContent } = sanitizeBlockContent(raw)
    return {
      headline: String(safeContent.headline ?? fallback.headline),
      body: String(safeContent.body ?? fallback.body),
      category: mapEventCategory(event.category),
      neighbourhood,
      source_url: event.source_url ?? null,
      source_label: event.source_label ?? 'Local News',
      published_date: event.date ?? fallback.published_date,
    }
  }

  const prompt = `Write a local intelligence item for the ${neighbourhood} area for a real estate newsletter.

Requirements:
- headline: max 70 characters, specific and newsworthy (e.g. a new development, rezoning, transit expansion, business opening, park improvement)
- body: 60–100 words expanding on the headline with local impact and what it means for residents and property values
- source_note: brief attribution (e.g. "Source: City of Vancouver Planning Department" or "As reported by Vancouver Courier")
- category: one of "development" | "transit" | "school" | "business" | "zoning" | "event" | "other"
- Do NOT reference any protected class characteristics — focus on infrastructure, amenities, and economic factors only
- The item must pass a newsworthiness check: is it specific, timely, and locally relevant?

Return JSON matching this schema exactly:
{
  "headline": "string (max 70 chars)",
  "body": "string (60-100 words)",
  "source_note": "string",
  "category": "development | transit | school | business | zoning | event | other"
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
      headline: parsed.headline ?? fallback.headline,
      body: parsed.body ?? fallback.body,
      source_note: parsed.source_note ?? fallback.source_label,
    }
    const { content: safeContent } = sanitizeBlockContent(raw)

    const validCategories = ['development', 'transit', 'school', 'business', 'zoning', 'event', 'other'] as const
    const category = validCategories.includes(String(parsed.category) as typeof validCategories[number])
      ? (String(parsed.category) as typeof validCategories[number])
      : 'development'

    return {
      headline: String(safeContent.headline ?? fallback.headline),
      body: String(safeContent.body ?? fallback.body),
      category,
      neighbourhood,
      source_url: null,
      source_label: String(safeContent.source_note ?? fallback.source_label),
      published_date: fallback.published_date,
    }
  } catch (err) {
    console.error('[generator:local-intel] Generation failed:', err)
    return fallback
  }
}

type LocalIntelCategory = LocalIntelBlockContent['category']

function mapEventCategory(raw: string | undefined): LocalIntelCategory {
  const validCategories: LocalIntelCategory[] = [
    'development', 'transit', 'school', 'business', 'zoning', 'event', 'other',
  ]
  const lower = (raw ?? '').toLowerCase()
  for (const cat of validCategories) {
    if (lower.includes(cat)) return cat
  }
  return 'other'
}
