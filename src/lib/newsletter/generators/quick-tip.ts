import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuickTipBlockContent } from '@/types/editorial'
import type { EditionContext } from '@/lib/editorial-ai'
import { sanitizeBlockContent } from '../content-safety'

const anthropic = new Anthropic()
const MODEL_HAIKU = 'claude-opus-4-6'

// ── Season detection ──────────────────────────────────────────────────────────

function getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

// ── Types for content library rows ────────────────────────────────────────────

interface ContentLibraryRow {
  id: string
  realtor_id: string | null
  block_type: string
  content: Record<string, unknown>  // actual DB column name
  context_tags: string[]
  country: string | null
  season: string | null
  use_count: number
  created_at: string
}

export async function generateQuickTip(
  ctx: EditionContext,
  supabase: SupabaseClient,
): Promise<QuickTipBlockContent> {
  const city = ctx.city ?? 'Vancouver, BC'
  const season = getCurrentSeason()
  const country = 'CA' // Canadian context

  const fallback: QuickTipBlockContent = {
    title: 'Lock in Your Rate Before the Next BoC Decision',
    body: `Most Canadian lenders offer free 90–120 day rate holds. If you're planning to buy in the next few months, contact your mortgage broker this week to explore a rate hold — it costs nothing and protects you from potential increases before your purchase closes.`,
    category: 'financing',
    icon_emoji: '💡',
  }

  // ── Step 1: Query the content library for matching tips ───────────────────
  let libraryTip: QuickTipBlockContent | null = null

  try {
    const { data: libraryRows } = await supabase
      .from('editorial_content_library')
      .select('id, realtor_id, block_type, content, context_tags, country, season, use_count, created_at')
      .eq('block_type', 'quick_tip')
      .or(`season.eq.${season},season.is.null`)
      .or(`country.eq.${country},country.is.null`)
      .order('use_count', { ascending: true })
      .limit(10)

    const rows = (libraryRows ?? []) as ContentLibraryRow[]

    // Filter: match realtor's tips or platform-wide tips (realtor_id IS NULL)
    const matchingRows = rows.filter(
      (r) => r.realtor_id === null || r.realtor_id === undefined,
    )

    if (matchingRows.length >= 3) {
      // Pick one at random (weighted toward lower use_count since we sorted ASC)
      const randomIndex = Math.floor(Math.random() * Math.min(matchingRows.length, 5))
      const chosen = matchingRows[randomIndex]

      if (chosen?.content) {
        const raw = chosen.content as Record<string, unknown>

        // Normalize field names — seeded tips use headline/tip_text/tip_category keys
        const normalized: Record<string, unknown> = {
          title: raw.title ?? raw.headline,
          body: raw.body ?? raw.tip_text,
          category: raw.category ?? raw.tip_category,
          icon_emoji: raw.icon_emoji,
        }

        const { content: safeContent } = sanitizeBlockContent(normalized)

        // Increment use_count
        await supabase
          .from('editorial_content_library')
          .update({ use_count: chosen.use_count + 1 })
          .eq('id', chosen.id)

        libraryTip = {
          title: String(safeContent.title ?? fallback.title),
          body: String(safeContent.body ?? fallback.body),
          category: isValidCategory(normalized.category)
            ? (normalized.category as QuickTipBlockContent['category'])
            : 'general',
          icon_emoji: typeof normalized.icon_emoji === 'string' ? normalized.icon_emoji : '💡',
        }
      }
    }
  } catch (err) {
    console.warn('[generator:quick-tip] Content library query failed, generating fresh:', err)
  }

  // Return library tip if found (still adapt to voice via Claude if needed)
  if (libraryTip) {
    // If a voice profile exists, adapt the library tip to the agent's voice
    if (ctx.voice_profile && ctx.voice_profile.writing_style) {
      try {
        const adaptedTip = await adaptTipToVoice(libraryTip, ctx, city)
        return adaptedTip
      } catch {
        // If adaptation fails, return the library tip as-is
        return libraryTip
      }
    }
    return libraryTip
  }

  // ── Step 2: Generate fresh tip with Claude ────────────────────────────────
  const freshTip = await generateFreshTip(ctx, city, season)

  // ── Step 3: Insert into content library for future use ───────────────────
  try {
    await supabase.from('editorial_content_library').insert({
      realtor_id: null, // platform-wide tip
      block_type: 'quick_tip',
      content: {
        headline: freshTip.title,
        tip_text: freshTip.body,
        tip_category: freshTip.category,
        icon_emoji: freshTip.icon_emoji,
      },
      context_tags: [ctx.edition_type, season],
      country,
      season,
      use_count: 1,
    })
  } catch (err) {
    console.warn('[generator:quick-tip] Failed to insert into content library:', err)
  }

  return freshTip
}

async function generateFreshTip(
  ctx: EditionContext,
  city: string,
  season: string,
): Promise<QuickTipBlockContent> {
  const fallback: QuickTipBlockContent = {
    title: 'Lock in Your Rate Before the Next BoC Decision',
    body: `Most Canadian lenders offer free 90–120 day rate holds. If you're planning to buy in the next few months, contact your mortgage broker this week to explore a rate hold — it costs nothing and protects you from potential increases before your purchase closes.`,
    category: 'financing',
    icon_emoji: '💡',
  }

  const prompt = `Write a quick tip for real estate newsletter readers in ${city} for a ${season} edition about "${ctx.edition_type}".

Requirements:
- title: max 60 characters, active verb, entices the reader to read the tip
- body: one actionable tip the reader can act on THIS WEEK — not a generic platitude, 40–80 words
- Must be specific and practical (e.g. not "talk to a mortgage broker" but "call your lender before the next BoC rate decision and ask about rate holds — most are free for 90–120 days")
- category: one of "buying" | "selling" | "investing" | "maintenance" | "financing" | "staging" | "general"
- icon_emoji: a single relevant emoji

Return JSON matching this schema exactly:
{
  "title": "string (max 60 chars)",
  "body": "string (40-80 words)",
  "category": "buying | selling | investing | maintenance | financing | staging | general",
  "icon_emoji": "string (single emoji)"
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

    const raw: Record<string, unknown> = {
      title: parsed.title ?? fallback.title,
      body: parsed.body ?? fallback.body,
    }
    const { content: safeContent } = sanitizeBlockContent(raw)

    return {
      title: String(safeContent.title ?? fallback.title),
      body: String(safeContent.body ?? fallback.body),
      category: isValidCategory(parsed.category)
        ? (parsed.category as QuickTipBlockContent['category'])
        : 'general',
      icon_emoji: typeof parsed.icon_emoji === 'string' ? parsed.icon_emoji : '💡',
    }
  } catch (err) {
    console.error('[generator:quick-tip] Claude generation failed:', err)
    return fallback
  }
}

async function adaptTipToVoice(
  tip: QuickTipBlockContent,
  ctx: EditionContext,
  city: string,
): Promise<QuickTipBlockContent> {
  const tone = ctx.voice_profile?.tone ?? 'professional'
  const writingStyle = ctx.voice_profile?.writing_style ?? ''
  const examples =
    ctx.voice_profile?.writing_examples?.slice(0, 2).join('\n\n---\n\n') ?? ''

  const prompt = `Rewrite the following real estate tip in the agent's voice for ${city}.

ORIGINAL TIP:
Title: ${tip.title}
Body: ${tip.body}

AGENT VOICE:
Tone: ${tone}
Style: ${writingStyle}
${examples ? `Writing examples:\n${examples}` : ''}

Keep the same practical advice and specific details. Only change the phrasing to match the agent's voice.
Return JSON:
{
  "title": "string (max 60 chars)",
  "body": "string (40-80 words)"
}`

  const response = await anthropic.messages.create({
    model: MODEL_HAIKU,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : rawText.trim()
  const start = candidate.search(/[{[]/)
  const parsed =
    start !== -1 ? (JSON.parse(candidate.slice(start)) as Record<string, unknown>) : {}

  const raw: Record<string, unknown> = {
    title: parsed.title ?? tip.title,
    body: parsed.body ?? tip.body,
  }
  const { content: safeContent } = sanitizeBlockContent(raw)

  return {
    ...tip,
    title: String(safeContent.title ?? tip.title),
    body: String(safeContent.body ?? tip.body),
  }
}

type ValidCategory = QuickTipBlockContent['category']

function isValidCategory(v: unknown): v is ValidCategory {
  return ['buying', 'selling', 'investing', 'maintenance', 'financing', 'staging', 'general'].includes(
    String(v),
  )
}
