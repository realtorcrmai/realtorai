import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RateWatchBlockContent } from '@/types/editorial'
import type { EditionContext } from '@/lib/editorial-ai'
import { checkContentSafety } from '../content-safety'

const anthropic = new Anthropic()
const MODEL_HAIKU = 'claude-opus-4-6'

export async function generateRateWatch(
  ctx: EditionContext,
  _supabase: SupabaseClient,
): Promise<RateWatchBlockContent> {
  const md = ctx.market_data

  // If live rates are present from context, use them directly — no Claude needed for numbers
  const rate1yr = md?.rate_1yr ? parseFloat(md.rate_1yr) : null
  const rate3yr = md?.rate_3yr ? parseFloat(md.rate_3yr) : null
  const rate5yr = md?.rate_5yr ? parseFloat(md.rate_5yr) : null
  const variableRate = md?.variable_rate ? parseFloat(md.variable_rate) : null

  const fallback: RateWatchBlockContent = {
    as_of_date: new Date().toISOString().slice(0, 10),
    rate_5yr_fixed: rate5yr ?? 4.74,
    rate_5yr_variable: variableRate ?? 6.20,
    rate_3yr_fixed: rate3yr ?? 4.89,
    rate_1yr_fixed: rate1yr ?? 5.14,
    prime_rate: null,
    change_bps: null,
    trend: 'stable',
    commentary: `Current mortgage rates offer opportunities for buyers planning their purchase. Speaking with a mortgage broker about rate holds can lock in today's rates for up to 120 days.`,
    source: null,
  }

  const rateContext = md
    ? `Current BC mortgage rates: 1-year fixed ${md.rate_1yr ?? 'N/A'}, 3-year fixed ${md.rate_3yr ?? 'N/A'}, 5-year fixed ${md.rate_5yr ?? 'N/A'}, variable ${md.variable_rate ?? 'N/A'}.`
    : `Use current approximate Canadian mortgage rates. 1-year fixed ~${fallback.rate_1yr_fixed}%, 5-year fixed ~${fallback.rate_5yr_fixed}%, variable ~${fallback.rate_5yr_variable}%.`

  // Use Claude only for the commentary field (40-80 words interpreting what rates mean)
  const prompt = `Write a short rate commentary (40–80 words) for a Canadian real estate newsletter.

${rateContext}

The commentary should explain what current rates mean RIGHT NOW for readers — not generic advice, but a specific implication (e.g. "at 4.89% variable, a $900K mortgage runs ~$470/mo less than at peak 2023 rates").

Also return:
- trend: one of "rising" | "falling" | "stable"
- call_to_action: one sentence with a concrete next step for the reader

Return JSON matching this schema exactly:
{
  "commentary": "string (40-80 words)",
  "trend": "rising | falling | stable",
  "call_to_action": "string"
}`

  try {
    const response = await anthropic.messages.create({
      model: MODEL_HAIKU,
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

    const rawCommentary = String(parsed.commentary ?? fallback.commentary)
    const { cleaned_text: commentary } = checkContentSafety(rawCommentary)

    return {
      ...fallback,
      commentary,
      trend: (['rising', 'falling', 'stable'].includes(String(parsed.trend))
        ? parsed.trend
        : 'stable') as 'rising' | 'falling' | 'stable' | null,
    }
  } catch (err) {
    console.error('[generator:rate-watch] Generation failed:', err)
    return fallback
  }
}
