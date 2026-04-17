import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentNoteBlockContent } from '@/types/editorial'
import type { EditionContext } from '@/lib/editorial-ai'
import { sanitizeBlockContent } from '../content-safety'

const anthropic = new Anthropic()
const MODEL_SONNET = 'claude-sonnet-4-6'

// Re-use the sanitizer from editorial-ai inline for simplicity
function sanitizeVoiceInput(input: string): string {
  return input
    .replace(/\b(ignore|forget|disregard|override|bypass)\b.{0,60}\b(instruction|rule|system|prompt|previous|above|all)\b/gi, '[removed]')
    .replace(/`/g, "'")
    .replace(/[<>]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, 300)
}

function sanitizeVoiceRules(rules: string[]): string[] {
  return rules
    .filter((r) => typeof r === 'string' && r.trim().length > 0)
    .map((r) => sanitizeVoiceInput(r.trim()))
    .filter((r) => r !== '[removed]' && r.length > 3)
    .slice(0, 20)
}

export async function generateAgentNote(
  ctx: EditionContext,
  _supabase: SupabaseClient,
): Promise<AgentNoteBlockContent> {
  const city = ctx.city ?? 'Vancouver, BC'

  const fallback: AgentNoteBlockContent = {
    body: `It's been a busy market lately, and I wanted to share what I'm seeing firsthand. Buyers are moving decisively when the right property appears, and sellers who price strategically are seeing strong results. If you're thinking about your next move, I'm here to walk you through your options — no pressure, just honest advice.`,
    sign_off: 'Here whenever you need me.',
    headshot_url: null,
    agent_name: null,
  }

  const safeRules = sanitizeVoiceRules(ctx.voice_profile?.voice_rules ?? [])
  const voiceRulesSection =
    safeRules.length > 0
      ? `Follow these voice rules:\n${safeRules.map((r) => `• ${r}`).join('\n')}`
      : ''

  const rawSig = ctx.voice_profile?.signature_phrase
  const signaturePhrase = rawSig
    ? `End with this signature phrase: "${sanitizeVoiceInput(rawSig)}"`
    : ''

  const tone = ctx.voice_profile?.tone ?? 'professional'
  const writingStyle = ctx.voice_profile?.writing_style
    ? `Writing style: ${sanitizeVoiceInput(ctx.voice_profile.writing_style)}`
    : ''

  // Include writing examples if available (from voice profile's writing_examples field)
  const writingExamples = ctx.voice_profile?.writing_examples
  const examplesSection =
    writingExamples && writingExamples.length > 0
      ? `\n\nWRITING EXAMPLES (mimic this agent's voice):\n${writingExamples
          .slice(0, 2)
          .map((ex) => sanitizeVoiceInput(ex))
          .join('\n\n---\n\n')}`
      : ''

  const prompt = `Write a personal agent note for a real estate newsletter in ${city} for edition "${ctx.title}".

TONE: ${tone}
${writingStyle}
${voiceRulesSection}
${signaturePhrase}
${examplesSection}

Requirements:
- body: 50–100 words in the agent's first-person voice — warm, genuine, not salesy. Must feel personal, not corporate — like a note from a trusted advisor, not a press release. Self-check: "Would you send this to your mom?" — if not, rewrite it.
- sign_off: a short, warm closing line (e.g. "Here whenever you need me." or "Talk soon,")

Return JSON matching this schema exactly:
{
  "body": "string (50-100 words)",
  "sign_off": "string (max 15 words)"
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
      body: parsed.body ?? fallback.body,
      sign_off: parsed.sign_off ?? fallback.sign_off,
    }
    const { content: safeContent } = sanitizeBlockContent(raw)

    return {
      body: String(safeContent.body ?? fallback.body),
      sign_off: String(safeContent.sign_off ?? fallback.sign_off),
      headshot_url: null,
      agent_name: null,
    }
  } catch (err) {
    console.error('[generator:agent-note] Generation failed:', err)
    return fallback
  }
}
