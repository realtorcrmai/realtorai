/**
 * Local Events Fetcher
 *
 * Uses Claude with web_search to find upcoming community events,
 * real estate development news, and neighbourhood news for any city.
 *
 * Fair Housing / CREA Compliance:
 * - Never describes demographics of an area
 * - Never mentions school quality tied to demographics
 * - Focuses only on events, development projects, and market data
 */

import Anthropic from '@anthropic-ai/sdk'

export interface LocalEvent {
  title: string
  date: string           // human-readable, e.g. "May 15"
  venue: string | null
  description: string    // 1-2 sentences
  category: 'community' | 'arts' | 'food' | 'sports' | 'development' | 'market'
  source_url: string | null
  source_label?: string  // optional attribution, e.g. "Vancouver Courier"
}

export interface LocalEventsResult {
  city: string
  events: LocalEvent[]  // 3-6 items
  fetched_at: string
}

const anthropic = new Anthropic()

const EMPTY_RESULT = (city: string): LocalEventsResult => ({
  city,
  events: [],
  fetched_at: new Date().toISOString(),
})

/**
 * Validate that a parsed event object matches the LocalEvent interface.
 */
function isValidEvent(item: unknown): item is LocalEvent {
  if (!item || typeof item !== 'object') return false
  const e = item as Record<string, unknown>
  if (typeof e.title !== 'string' || e.title.trim().length === 0) return false
  if (typeof e.date !== 'string') return false
  if (typeof e.description !== 'string') return false
  const validCategories = ['community', 'arts', 'food', 'sports', 'development', 'market']
  if (typeof e.category !== 'string' || !validCategories.includes(e.category)) return false
  return true
}

function normalizeEvent(raw: Record<string, unknown>): LocalEvent {
  const validCategories: LocalEvent['category'][] = [
    'community', 'arts', 'food', 'sports', 'development', 'market',
  ]
  const category = validCategories.includes(raw.category as LocalEvent['category'])
    ? (raw.category as LocalEvent['category'])
    : 'community'

  return {
    title: String(raw.title ?? '').trim().slice(0, 120),
    date: String(raw.date ?? '').trim().slice(0, 40),
    venue: typeof raw.venue === 'string' && raw.venue.trim().length > 0
      ? raw.venue.trim().slice(0, 100)
      : null,
    description: String(raw.description ?? '').trim().slice(0, 300),
    category,
    source_url: typeof raw.source_url === 'string' && raw.source_url.startsWith('http')
      ? raw.source_url.slice(0, 500)
      : null,
  }
}

/**
 * Fetch local events and development news for a city using Claude web_search.
 * Returns an empty events array on any failure — never throws.
 */
export async function fetchLocalEvents(city: string): Promise<LocalEventsResult> {
  const fetchedAt = new Date().toISOString()

  try {
    const prompt = `Search for upcoming community events, real estate development news, and neighbourhood news in ${city} in the next 30 days. Return a JSON array of 4-6 items with: title, date (human-readable, e.g. "May 15"), venue (or null if unknown), description (1-2 sentences), category (one of: community, arts, food, sports, development, market), source_url (or null). Focus on things relevant to homeowners and home buyers: new developments, rezoning approvals, infrastructure projects, community events, business openings, park improvements. Avoid generic national news. IMPORTANT: Do not mention area demographics, school ratings tied to any group, or any fair housing protected characteristics.`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })

    // Extract text from response — Claude may call tools then provide a final answer
    let resultText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        resultText += block.text
      }
    }

    if (!resultText.trim()) {
      console.warn('[local-events] Claude returned no text content for city:', city)
      return EMPTY_RESULT(city)
    }

    // Extract JSON array from the response text
    const arrayStart = resultText.indexOf('[')
    const arrayEnd = resultText.lastIndexOf(']')

    if (arrayStart === -1 || arrayEnd === -1 || arrayEnd <= arrayStart) {
      console.warn('[local-events] No JSON array found in Claude response for city:', city)
      return EMPTY_RESULT(city)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(resultText.slice(arrayStart, arrayEnd + 1))
    } catch (parseErr) {
      console.warn('[local-events] JSON parse error for city:', city, parseErr)
      return EMPTY_RESULT(city)
    }

    if (!Array.isArray(parsed)) {
      console.warn('[local-events] Parsed result is not an array for city:', city)
      return EMPTY_RESULT(city)
    }

    const events: LocalEvent[] = parsed
      .filter(isValidEvent)
      .map((item) => normalizeEvent(item as unknown as Record<string, unknown>))
      .slice(0, 6)

    return {
      city,
      events,
      fetched_at: fetchedAt,
    }
  } catch (err) {
    console.warn('[local-events] Error fetching events for city:', city, err)
    return EMPTY_RESULT(city)
  }
}
