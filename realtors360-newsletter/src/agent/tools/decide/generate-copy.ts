import type Anthropic from '@anthropic-ai/sdk';
import AnthropicSdk from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';
import { createWithRetry } from '../../../shared/anthropic-retry.js';
import { config } from '../../../config.js';
import { logger } from '../../../lib/logger.js';
import { parseAIJson, unescapeNewlines } from '../../../lib/parse-ai-json.js';

const anthropic = new AnthropicSdk();

export const GENERATE_COPY_SCHEMA: Anthropic.Tool = {
  name: 'generate_copy',
  description:
    'Generate high-quality, personalized email copy. MUST provide contact context from get_contact + get_engagement_intel, and data context from search_rag. Returns polished content ready for draft_email.',
  input_schema: {
    type: 'object',
    properties: {
      email_type: { type: 'string', description: 'Type of email to generate' },
      contact_context: { type: 'string', description: 'Who this contact is, their preferences, engagement history' },
      data_context: { type: 'string', description: 'Relevant data: listing details, market stats, RAG interaction history' },
      tone: { type: 'string', description: 'Tone: warm, professional, casual, celebratory, reassuring. Default: warm.' },
      realtor_name: { type: 'string', description: 'The realtor\'s name for sign-off' },
    },
    required: ['email_type', 'contact_context'],
  },
};

/**
 * System prompt for email generation. This is the single highest-leverage
 * prompt in the entire system. Quality here determines whether emails get
 * opened, clicked, and replied to — or ignored and unsubscribed from.
 */
const SYSTEM_PROMPT = `You are an elite real estate email copywriter working for a BC (British Columbia) realtor. You write emails that feel like they come from a trusted friend who happens to be an expert in real estate — never from a marketing machine.

## RULES — follow these exactly

1. **Open with something specific.** NEVER generic openers like "I hope this finds you well", "I wanted to reach out", "Just checking in", "I'm excited to share". Instead, reference something REAL: the contact's neighbourhood, a property they clicked on, the season, a local event, their kids' school district.

2. **One idea per email.** Each email does ONE thing: announces a listing, shares a market insight, celebrates a birthday. Never bundle.

3. **Write like you talk.** Short sentences. Contractions. Natural rhythm. Read it aloud — if it sounds like a brochure, rewrite it.

4. **Be specific, never vague.** "The 3-bed on Maple just dropped $40K" beats "A great property in your area has a new price". "Your Kerrisdale condo is worth ~$85K more than last year" beats "Your home has appreciated".

5. **Earn the CTA.** The call-to-action must follow naturally from the content. Don't ask "Schedule a call?" after a birthday wish.

6. **120 words max.** Respect their time. Every word must earn its place.

7. **Canadian spelling.** Neighbourhood, favourite, colour, centre.

8. **Subject lines that create curiosity.** Under 50 characters. Use specifics: "Your Kitsilano equity update" not "Monthly Market Report".

## ANTI-PATTERNS — never write these

- "I hope this email finds you well" → DELETE
- "I wanted to reach out to let you know" → DELETE
- "As your trusted real estate advisor" → DELETE
- "Don't miss this incredible opportunity" → DELETE
- "Act now before it's too late" → DELETE
- "In today's dynamic market" → DELETE
- Any sentence that could apply to ANY contact → REWRITE with specifics

## EXAMPLES OF GREAT EMAILS

### Saved Search Match (good)
Subject: 3-bed under $900K just hit Dunbar
"Hi Alex, a detached on W 28th just listed at $879K — 3 bed, 2 bath, south-facing yard. It matches the Dunbar criteria you saved. Open house Saturday 2-4. Want me to grab you a preview slot before then? — Sarah"

### Market Update (good)
Subject: Burnaby condos are moving faster
"Hey Maya, something interesting this month — Burnaby condos are selling in 14 days avg, down from 22 in January. Your building (Brentwood Gate) had two units close above ask last week. If you've been thinking about timing, this is the data I'd want to see. Here's the full breakdown. — Sarah"

### Birthday (good)
Subject: Happy birthday, James
"James — happy birthday! Hope you're celebrating properly today. No real estate talk, just wanted you to know I'm thinking of you. Enjoy it. — Sarah"

## OUTPUT FORMAT

Return ONLY valid JSON (no markdown fences):
{
  "subject": "Subject line, under 50 chars, specific not generic",
  "preheader": "Inbox preview text, under 90 chars, adds context the subject doesn't",
  "greeting": "Short personalized greeting",
  "body_paragraphs": ["1-3 short paragraphs, 120 words max total"],
  "cta_label": "Specific action text (not generic 'Learn More')",
  "cta_url": "URL or placeholder",
  "signoff": "Casual sign-off with realtor name"
}`;

export async function generateCopy(
  _ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const emailType = String(input.email_type);
  const contactContext = String(input.contact_context);
  const dataContext = String(input.data_context || '');
  const tone = String(input.tone || 'warm');
  const realtorName = String(input.realtor_name || config.AGENT_NAME);

  const userPrompt = `Write a "${emailType}" email.

TONE: ${tone}
REALTOR: ${realtorName}

ABOUT THIS CONTACT:
${contactContext}

${dataContext ? `DATA TO REFERENCE (use specifics from this, don't invent):\n${dataContext}\n` : 'No additional data provided — keep it personal and brief.'}

Remember: specific > generic. If you don't have enough data to be specific, keep it SHORT and honest rather than padding with filler.`;

  try {
    const message = await createWithRetry(anthropic, {
      model: config.AI_SCORING_MODEL,
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '';

    const parsed = parseAIJson<Record<string, unknown>>(text);
    if (parsed) {
      // Unescape literal \n in body paragraphs
      if (Array.isArray(parsed.body_paragraphs)) {
        parsed.body_paragraphs = (parsed.body_paragraphs as string[]).map(unescapeNewlines);
      }
      if (typeof parsed.body === 'string') {
        parsed.body = unescapeNewlines(parsed.body as string);
      }
      return parsed;
    }
    return {
      subject: emailType.replace(/_/g, ' '),
      greeting: 'Hi,',
      body_paragraphs: [unescapeNewlines(text.slice(0, 500))],
      cta_label: 'Learn More',
      cta_url: '#',
      signoff: `— ${realtorName}`,
    };
  } catch (err) {
    logger.error({ err, emailType }, 'generate_copy: Claude call failed');
    return { error: 'Failed to generate copy', details: String(err) };
  }
}
