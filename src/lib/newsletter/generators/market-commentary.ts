import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MarketCommentaryBlockContent } from '@/types/editorial'
import type { EditionContext } from '@/lib/editorial-ai'
import { sanitizeBlockContent } from '../content-safety'

const anthropic = new Anthropic()
const MODEL_SONNET = 'claude-sonnet-4-6'

export async function generateMarketCommentary(
  ctx: EditionContext,
  _supabase: SupabaseClient,
): Promise<MarketCommentaryBlockContent> {
  const neighbourhood = ctx.neighbourhood ?? ctx.city ?? 'Vancouver, BC'
  const md = ctx.market_data
  const currentPeriod = new Date().toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
  })

  const fallback: MarketCommentaryBlockContent = {
    neighbourhood,
    body: `The ${neighbourhood} market continues to show resilience with steady activity. Buyers and sellers are finding balanced conditions as inventory levels remain manageable.`,
    avg_sale_price: null,
    avg_list_price: null,
    median_dom: md?.days_on_market ?? null,
    active_listings: null,
    sold_count: null,
    price_change_mom_pct: null,
    price_change_yoy_pct: null,
    market_type: 'balanced',
    period_label: currentPeriod,
  }

  const statsHint = md
    ? `Available stats: median price ${md.median_price ?? 'N/A'}, YoY change ${md.price_change_yoy ?? 'N/A'}, days on market ${md.days_on_market ?? 'N/A'}, sales ratio ${md.sales_ratio ?? 'N/A'}.`
    : 'Use plausible BC market statistics if no data is provided.'

  const prompt = `Write market commentary for the ${neighbourhood} real estate market for the newsletter edition "${ctx.title}".

${statsHint}

Requirements:
- headline: max 80 characters, punchy summary of the market condition
- body: 80–120 words of substantive analysis
- Must include at least 2 specific statistics (price, ratio, days, volume, or rate figures)
- Identify whether this is a buyer's market or seller's market and explain why
- Do NOT use filler phrases like "the market continues to…", "as we move into…", or "it remains to be seen…"
- End with a forward-looking insight or actionable implication for the reader
- market_type: one of "buyers" | "sellers" | "balanced"
- period_label: the reporting period (e.g. "${currentPeriod}")
- avg_sale_price: formatted string with $ and commas (e.g. "$1,350,000")
- avg_list_price: formatted string with $ and commas (e.g. "$1,285,000")
- median_dom: integer number of median days on market
- active_listings: integer total active listings in the area
- sold_count: integer number of sales this period
- price_change_mom_pct: float percent change vs last month (positive = up, negative = down)
- price_change_yoy_pct: float percent change vs last year (positive = up, negative = down)

Return JSON matching this schema exactly:
{
  "headline": "string (max 80 chars)",
  "body": "string (80-120 words)",
  "market_type": "buyers | sellers | balanced",
  "period_label": "string",
  "avg_sale_price": "$1,350,000",
  "avg_list_price": "$1,285,000",
  "median_dom": 14,
  "active_listings": 1240,
  "sold_count": 312,
  "price_change_mom_pct": 1.8,
  "price_change_yoy_pct": -3.2
}`

  try {
    const response = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 2048,
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
      body: parsed.body ?? fallback.body,
    }
    const { content: safeContent } = sanitizeBlockContent(raw)

    // Parse price strings to numbers
    const parsePriceStr = (v: unknown): number | null => {
      if (typeof v === 'number') return v
      if (typeof v === 'string') {
        const num = parseFloat(v.replace(/[$,]/g, ''))
        return isNaN(num) ? null : num
      }
      return null
    }

    const parseFloat2 = (v: unknown): number | null => {
      const n = parseFloat(String(v ?? ''))
      return isNaN(n) ? null : n
    }

    const parseInt2 = (v: unknown): number | null => {
      const n = parseInt(String(v ?? ''), 10)
      return isNaN(n) ? null : n
    }

    return {
      neighbourhood,
      body: String(safeContent.body ?? fallback.body),
      avg_sale_price: parsePriceStr(parsed.avg_sale_price),
      avg_list_price: parsePriceStr(parsed.avg_list_price),
      median_dom: parseInt2(parsed.median_dom),
      active_listings: parseInt2(parsed.active_listings),
      sold_count: parseInt2(parsed.sold_count),
      price_change_mom_pct: parseFloat2(parsed.price_change_mom_pct),
      price_change_yoy_pct: parseFloat2(parsed.price_change_yoy_pct),
      market_type: (['buyers', 'sellers', 'balanced'].includes(String(parsed.market_type))
        ? parsed.market_type
        : fallback.market_type) as 'buyers' | 'sellers' | 'balanced' | null,
      period_label: String(parsed.period_label ?? fallback.period_label),
    }
  } catch (err) {
    console.error('[generator:market-commentary] Generation failed:', err)
    return fallback
  }
}
