import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// Prompt injection sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize voice profile strings before injecting into Claude prompts.
 * Blocks prompt injection attempts while preserving legitimate writing guidance.
 */
function sanitizeVoiceInput(input: string): string {
  return input
    // Remove common injection phrases
    .replace(/\b(ignore|forget|disregard|override|bypass)\b.{0,60}\b(instruction|rule|system|prompt|previous|above|all)\b/gi, '[removed]')
    // Strip backticks (used to inject code blocks)
    .replace(/`/g, "'")
    // Strip angle brackets (injection via XML/HTML)
    .replace(/[<>]/g, '')
    // Normalize excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    // Hard truncate
    .slice(0, 300)
}

function sanitizeVoiceRules(rules: string[]): string[] {
  return rules
    .filter(r => typeof r === 'string' && r.trim().length > 0)
    .map(r => sanitizeVoiceInput(r.trim()))
    .filter(r => r !== '[removed]' && r.length > 3)
    .slice(0, 20) // max 20 rules
}

// ---------------------------------------------------------------------------
// Inline type definitions
// ---------------------------------------------------------------------------

export interface VoiceProfile {
  tone: 'professional' | 'friendly' | 'luxury' | 'casual' | 'authoritative';
  writing_style: string;
  signature_phrase?: string;
  voice_rules: string[]; // e.g. ['Use active voice', 'Always include a statistic']
}

export interface EditorBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
  is_locked: boolean;
}

export interface EditionContext {
  edition_type: string; // 'market_update' | 'just_sold' | 'open_house' | etc.
  title: string;
  neighbourhood?: string;
  city?: string; // defaults to 'Vancouver, BC'
  voice_profile?: VoiceProfile;
  market_data?: {
    median_price?: string;
    price_change_yoy?: string;
    days_on_market?: number;
    sales_ratio?: string;
    rate_1yr?: string;
    rate_3yr?: string;
    rate_5yr?: string;
    variable_rate?: string;
  };
  recent_listings?: Array<{
    address: string;
    sale_price: string;
    list_price?: string;
    days_on_market?: number;
  }>;
}

// ---------------------------------------------------------------------------
// Shared Anthropic client
// ---------------------------------------------------------------------------

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const MODEL_SONNET = 'claude-sonnet-4-6';
const MODEL_HAIKU = 'claude-haiku-4-5-20251001';

// ---------------------------------------------------------------------------
// Safe JSON parser — never throws
// ---------------------------------------------------------------------------

function safeParseJSON(text: string): Record<string, unknown> {
  // Extract JSON from a markdown code block if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();

  // Locate the first { or [ to handle leading prose
  const start = candidate.search(/[{[]/);
  if (start === -1) return {};

  try {
    return JSON.parse(candidate.slice(start));
  } catch {
    // Try finding the last complete } if parsing failed
    const end = candidate.lastIndexOf('}');
    if (end !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return {};
      }
    }
    return {};
  }
}

// ---------------------------------------------------------------------------
// 6. buildSystemPrompt
// ---------------------------------------------------------------------------

export function buildSystemPrompt(context: EditionContext): string {
  const city = context.city ?? 'Vancouver, BC';
  const neighbourhood = context.neighbourhood ?? city;

  const toneMap: Record<NonNullable<VoiceProfile['tone']>, string> = {
    professional: 'Write in a polished, credible, and data-informed tone. Avoid colloquialisms.',
    friendly: 'Write in a warm, conversational tone — like a knowledgeable neighbour, not a salesperson.',
    luxury: 'Write in an elevated, aspirational tone. Use refined vocabulary. Evoke prestige and exclusivity.',
    casual: 'Write casually and directly. Short sentences. Contractions welcome. Relatable energy.',
    authoritative: 'Write with confidence and expertise. Back every claim with data or professional experience.',
  };

  const tone = context.voice_profile?.tone ?? 'professional';
  const toneInstruction = toneMap[tone];

  const safeVoiceRules = sanitizeVoiceRules(context.voice_profile?.voice_rules ?? [])

  const voiceRulesSection =
    safeVoiceRules.length > 0
      ? `\n\nVOICE RULES (follow these strictly):\n${safeVoiceRules.map((r) => `• ${r}`).join('\n')}`
      : '';

  const safeSignaturePhrase = context.voice_profile?.signature_phrase
    ? sanitizeVoiceInput(context.voice_profile.signature_phrase)
    : null;

  const signaturePhraseNote = safeSignaturePhrase
    ? `\n\nSIGNATURE PHRASE: When appropriate, end the copy with: "${safeSignaturePhrase}"`
    : '';

  const marketDataSection =
    context.market_data && Object.keys(context.market_data).length > 0
      ? `\n\nCURRENT MARKET DATA for ${neighbourhood}:\n${JSON.stringify(context.market_data, null, 2)}\nUse this data for statistics. Do not invent numbers.`
      : '';

  return `You are an expert real estate newsletter writer for ${city}.
Your job is to write compelling, hyper-local email newsletter content for a real estate agent.

TONE: ${toneInstruction}
${voiceRulesSection}${signaturePhraseNote}${marketDataSection}

FAIR HOUSING COMPLIANCE (MANDATORY):
Never reference race, religion, national origin, sex, disability, familial status, or any protected class in any description. Focus on property features and location only.

OUTPUT FORMAT:
Always respond with valid JSON matching the block content schema shown in the user prompt.
Do not include explanatory prose before or after the JSON.
Do not wrap the JSON in markdown code blocks.`;
}

// ---------------------------------------------------------------------------
// Per-block prompt builders (private)
// ---------------------------------------------------------------------------

function buildHeroPrompt(block: EditorBlock, context: EditionContext): string {
  const neighbourhood = context.neighbourhood ?? context.city ?? 'Vancouver, BC';
  void block; // block.content may seed future placeholders
  return `Generate a hero section for a real estate newsletter edition titled "${context.title}" focused on ${neighbourhood}.

Requirements:
- headline: max 80 characters, active voice, include the neighbourhood name or a specific data point
- subheadline: max 120 characters, expands on the headline with a benefit or context

Return JSON matching this schema exactly:
{
  "headline": "string (max 80 chars)",
  "subheadline": "string (max 120 chars)"
}`;
}

function buildJustSoldPrompt(block: EditorBlock, context: EditionContext): string {
  const listings = context.recent_listings ?? [];
  const listingContext =
    listings.length > 0
      ? `Recent sold listings:\n${JSON.stringify(listings, null, 2)}`
      : 'No specific listing data provided — write a general just-sold narrative.';

  void block;
  return `Generate a "Just Sold" block for a real estate newsletter in ${context.neighbourhood ?? context.city ?? 'Vancouver, BC'}.

${listingContext}

Requirements:
- highlights: array of exactly 3 specific, factual points about what made the property sell (e.g. price achievement, days on market, multiple offers)
- commentary: 2–3 sentences of market insight — what this sale says about current conditions in the area (property features only, no demographic references)

Return JSON matching this schema exactly:
{
  "highlights": ["string", "string", "string"],
  "commentary": "string (2-3 sentences)"
}`;
}

function buildMarketCommentaryPrompt(block: EditorBlock, context: EditionContext): string {
  const neighbourhood = context.neighbourhood ?? context.city ?? 'Vancouver, BC';
  const md = context.market_data;
  const statsHint = md
    ? `Available stats: median price ${md.median_price ?? 'N/A'}, YoY change ${md.price_change_yoy ?? 'N/A'}, days on market ${md.days_on_market ?? 'N/A'}, sales ratio ${md.sales_ratio ?? 'N/A'}.`
    : 'Use plausible BC market statistics if no data is provided.';

  const currentPeriod = new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

  void block;
  return `Write market commentary for the ${neighbourhood} real estate market for the newsletter edition "${context.title}".

${statsHint}

Requirements:
- headline: max 80 characters, punchy summary of the market condition
- body: 80–120 words of substantive analysis
- Must include at least 2 specific statistics (price, ratio, days, volume, or rate figures)
- Identify whether this is a buyer's market or seller's market and explain why
- Do NOT use filler phrases like "the market continues to…", "as we move into…", or "it remains to be seen…"
- End with a forward-looking insight or actionable implication for the reader
- market_type: one of "buyers" | "sellers" | "balanced"
- period_label: the reporting period (e.g. "${currentPeriod}" or "Q2 2026")
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
  "period_label": "string (e.g. '${currentPeriod}')",
  "avg_sale_price": "$1,350,000",
  "avg_list_price": "$1,285,000",
  "median_dom": 14,
  "active_listings": 1240,
  "sold_count": 312,
  "price_change_mom_pct": 1.8,
  "price_change_yoy_pct": -3.2
}`;
}

function buildRateWatchPrompt(block: EditorBlock, context: EditionContext): string {
  const md = context.market_data;
  const rateContext = md
    ? `Current BC mortgage rates: 1-year fixed ${md.rate_1yr ?? 'N/A'}, 3-year fixed ${md.rate_3yr ?? 'N/A'}, 5-year fixed ${md.rate_5yr ?? 'N/A'}, variable ${md.variable_rate ?? 'N/A'}.`
    : 'Use current approximate Canadian mortgage rates (check against known recent data).';

  void block;
  return `Write a rate watch section for a real estate newsletter in ${context.city ?? 'Vancouver, BC'}.

${rateContext}

Requirements:
- commentary: 40–80 words explaining what current rates mean RIGHT NOW for the reader — not generic advice, but a specific implication (e.g. "at 4.89% variable, a $900K mortgage runs ~$470/mo less than at peak 2023 rates")
- rate_1yr_fixed, rate_3yr_fixed, rate_5yr_fixed, rate_5yr_variable: the four rate values as plain numbers (e.g. 4.89, NOT "4.89%"), using provided data or approximate if unknown
- trend: one of "rising" | "falling" | "stable" — direction rates are moving right now
- call_to_action: one sentence with a concrete next step for the reader

Return JSON matching this schema exactly (rates as numbers, NOT strings with % sign):
{
  "commentary": "string (40-80 words)",
  "rate_1yr_fixed": 5.14,
  "rate_3yr_fixed": 4.89,
  "rate_5yr_fixed": 4.74,
  "rate_5yr_variable": 6.20,
  "trend": "rising | falling | stable",
  "call_to_action": "string"
}`;
}

function buildLocalIntelPrompt(block: EditorBlock, context: EditionContext): string {
  const neighbourhood = context.neighbourhood ?? context.city ?? 'Vancouver, BC';
  void block;
  return `Write a local intelligence item for the ${neighbourhood} area for a real estate newsletter.

Requirements:
- headline: max 70 characters, specific and newsworthy (e.g. a new development, rezoning, transit expansion, business opening, park improvement)
- body: 60–100 words expanding on the headline with local impact and what it means for residents and property values
- source_note: brief attribution (e.g. "Source: City of Vancouver Planning Department" or "As reported by Vancouver Courier")
- Do NOT reference any protected class characteristics — focus on infrastructure, amenities, and economic factors only
- The item must pass a newsworthiness check: is it specific, timely, and locally relevant?

Return JSON matching this schema exactly:
{
  "headline": "string (max 70 chars)",
  "body": "string (60-100 words)",
  "source_note": "string"
}`;
}

function buildNeighborhoodSpotlightPrompt(block: EditorBlock, context: EditionContext): string {
  const neighbourhood = context.neighbourhood ?? context.city ?? 'Vancouver, BC';
  void block;
  return `Write a neighbourhood spotlight for ${neighbourhood} for a real estate newsletter.

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
}`;
}

function buildQuickTipPrompt(block: EditorBlock, context: EditionContext): string {
  void block;
  return `Write a quick tip for real estate newsletter readers in ${context.city ?? 'Vancouver, BC'} for an edition about "${context.edition_type}".

Requirements:
- title: max 60 characters, active verb, entices the reader to read the tip
- body: one actionable tip the reader can act on THIS WEEK — not a generic platitude, 40–80 words
- Must be specific and practical (e.g. not "talk to a mortgage broker" but "call your lender before February rate decisions and ask about rate holds — most are free for 90–120 days")

Return JSON matching this schema exactly:
{
  "title": "string (max 60 chars)",
  "body": "string (40-80 words)"
}`;
}

function buildAgentNotePrompt(block: EditorBlock, context: EditionContext): string {
  const safeRules = sanitizeVoiceRules(context.voice_profile?.voice_rules ?? []);
  const voiceRules =
    safeRules.length > 0
      ? `Follow these voice rules:\n${safeRules.map((r) => `• ${r}`).join('\n')}`
      : '';
  const rawSig = context.voice_profile?.signature_phrase;
  const signaturePhrase = rawSig
    ? `End with this signature phrase: "${sanitizeVoiceInput(rawSig)}"`
    : '';

  void block;
  return `Write a personal agent note for a real estate newsletter in ${context.city ?? 'Vancouver, BC'} for edition "${context.title}".

${voiceRules}
${signaturePhrase}

Requirements:
- body: 50–100 words in the agent's first-person voice — warm, genuine, not salesy. Must feel personal, not corporate — like a note from a trusted advisor, not a press release. Self-check: "Would you send this to your mom?" — if not, rewrite it.
- sign_off: a short, warm closing line (e.g. "Here whenever you need me." or "Talk soon,")

Return JSON matching this schema exactly:
{
  "body": "string (50-100 words)",
  "sign_off": "string (max 15 words)"
}`;
}

function buildCtaPrompt(block: EditorBlock, context: EditionContext): string {
  const ctaGuide: Record<string, string> = {
    market_update: 'Request a free market evaluation or book a consultation',
    just_sold: 'Find out what your home is worth or start a buyer search',
    open_house: 'RSVP to the open house or book a private showing',
    new_listing: 'Book a showing or request the full property details',
    neighbourhood_guide: 'Explore listings in this neighbourhood or book a tour',
    home_anniversary: 'Request a current home value estimate',
  };

  const ctaGuidance = ctaGuide[context.edition_type] ?? 'Connect with the agent for personalized advice';
  void block;

  return `Write a call-to-action block for a real estate newsletter edition of type "${context.edition_type}" in ${context.city ?? 'Vancouver, BC'}.

Context: ${ctaGuidance}

Requirements:
- headline: max 60 characters, action-oriented, creates urgency or curiosity
- button_label: max 30 characters, imperative verb phrase (e.g. "Book a Free Call", "See Your Home's Value")
- subtext: 1 sentence (max 80 chars) under the button that reduces friction or adds context

Return JSON matching this schema exactly:
{
  "headline": "string (max 60 chars)",
  "button_label": "string (max 30 chars)",
  "subtext": "string (max 80 chars)"
}`;
}

// ---------------------------------------------------------------------------
// Block prompt dispatcher
// ---------------------------------------------------------------------------

function getBlockPrompt(block: EditorBlock, context: EditionContext): string {
  switch (block.type) {
    case 'hero':
      return buildHeroPrompt(block, context);
    case 'just_sold':
      return buildJustSoldPrompt(block, context);
    case 'market_commentary':
      return buildMarketCommentaryPrompt(block, context);
    case 'rate_watch':
      return buildRateWatchPrompt(block, context);
    case 'local_intel':
      return buildLocalIntelPrompt(block, context);
    case 'neighborhood_spotlight':
      return buildNeighborhoodSpotlightPrompt(block, context);
    case 'quick_tip':
      return buildQuickTipPrompt(block, context);
    case 'agent_note':
      return buildAgentNotePrompt(block, context);
    case 'cta':
      return buildCtaPrompt(block, context);
    default:
      return `Generate content for a "${block.type}" block in a real estate newsletter. Return a JSON object with appropriate fields.`;
  }
}

// ---------------------------------------------------------------------------
// 2. generateBlock
// ---------------------------------------------------------------------------

export async function generateBlock(
  block: EditorBlock,
  context: EditionContext,
  retries = 2,
): Promise<EditorBlock> {
  const systemPrompt = buildSystemPrompt(context);
  const userPrompt = getBlockPrompt(block, context);
  const maxTokens = block.type === 'market_commentary' ? 2048 : 1024;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL_SONNET,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const rawText =
        response.content[0]?.type === 'text' ? response.content[0].text : '';
      const parsed = safeParseJSON(rawText);

      return {
        ...block,
        content: {
          ...block.content,
          ...parsed,
          _generated_at: new Date().toISOString(),
        },
      };
    } catch (err) {
      if (attempt === retries) {
        console.error(`[editorial-ai] generateBlock failed for block ${block.id} (type: ${block.type}) after ${retries + 1} attempts:`, err);
        return {
          ...block,
          content: {
            ...block.content,
            generation_error: 'Failed to generate',
          },
        };
      }
      // Brief back-off between retries
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  // TypeScript safety — unreachable, but satisfies return type
  return {
    ...block,
    content: { ...block.content, generation_error: 'Failed to generate' },
  };
}

// ---------------------------------------------------------------------------
// 1. generateAllBlocks
// ---------------------------------------------------------------------------

export async function generateAllBlocks(
  blocks: EditorBlock[],
  context: EditionContext,
): Promise<EditorBlock[]> {
  const result: EditorBlock[] = [];

  for (const block of blocks) {
    // Skip locked blocks
    if (block.is_locked) {
      result.push(block);
      continue;
    }

    // Skip dividers — no AI content needed
    if (block.type === 'divider') {
      result.push(block);
      continue;
    }

    // Sequential to respect rate limits
    const updated = await generateBlock(block, context);
    result.push(updated);
  }

  return result;
}

// ---------------------------------------------------------------------------
// 3. generateSubjectLines
// ---------------------------------------------------------------------------

export async function generateSubjectLines(
  context: EditionContext,
  blockSummary: string,
): Promise<{ subject_a: string; subject_b: string }> {
  const neighbourhood = context.neighbourhood ?? context.city ?? 'Vancouver, BC';
  const fallback = {
    subject_a: `${neighbourhood} Market Update — ${new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}`,
    subject_b: `What's really happening in ${neighbourhood} real estate?`,
  };

  const prompt = `Generate two A/B test subject lines for a real estate newsletter.

Newsletter title: "${context.title}"
Edition type: ${context.edition_type}
Location: ${neighbourhood}
Content summary: ${blockSummary}

Requirements:
- subject_a: Data-forward — include a specific number, percentage, price, or place name. 40–60 characters.
- subject_b: Question or curiosity format — creates intrigue without revealing the answer. 40–60 characters.
- Both must be distinct in format and hook strategy
- Do NOT use spam trigger words (free, guaranteed, limited time, act now)

Return JSON matching this schema exactly:
{
  "subject_a": "string (40-60 chars)",
  "subject_b": "string (40-60 chars)"
}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText =
      response.content[0]?.type === 'text' ? response.content[0].text : '';
    const parsed = safeParseJSON(rawText) as { subject_a?: string; subject_b?: string };

    if (parsed.subject_a && parsed.subject_b) {
      return {
        subject_a: String(parsed.subject_a).slice(0, 90),
        subject_b: String(parsed.subject_b).slice(0, 90),
      };
    }

    return fallback;
  } catch (err) {
    console.error('[editorial-ai] generateSubjectLines failed:', err);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 4. extractVoiceRules
// ---------------------------------------------------------------------------

export async function extractVoiceRules(
  sampleEmail: string,
  tone: string,
): Promise<string[]> {
  const fallback = [
    'Write in first person',
    'Keep sentences under 20 words',
    'Lead with the most important point',
    'Include at least one local Vancouver reference',
    'End with a clear call to action',
  ];

  const prompt = `Analyze the following real estate email written by a realtor and extract their specific writing style rules.

TONE DECLARED BY REALTOR: ${tone}

EMAIL SAMPLE:
---
${sampleEmail.slice(0, 3000)}
---

Your job is to reverse-engineer 5–10 specific, actionable writing rules from this sample — rules that another writer (or AI) could follow to replicate this person's voice exactly.

Rules should be SPECIFIC (not generic):
- Good: "Always start the email with a local Vancouver neighbourhood reference before introducing the market data"
- Bad: "Write in a friendly tone"

Good: "Use contractions (we're, it's, you'll) — never formal expansions"
Good: "Use first-person plural 'we' not 'I' — position yourself as part of a team"
Good: "Include exactly one rhetorical question per email"
Good: "End every paragraph with an action implication, not just a fact"

Return JSON matching this schema exactly:
{
  "rules": ["string", "string", ...]
}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText =
      response.content[0]?.type === 'text' ? response.content[0].text : '';
    const parsed = safeParseJSON(rawText) as { rules?: unknown };

    if (Array.isArray(parsed.rules) && parsed.rules.length >= 3) {
      return parsed.rules.map((r) => String(r)).slice(0, 10);
    }

    return fallback;
  } catch (err) {
    console.error('[editorial-ai] extractVoiceRules failed:', err);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 5. getMarketDataFallback
// ---------------------------------------------------------------------------

export async function getMarketDataFallback(
  neighbourhood: string,
  city: string,
): Promise<EditionContext['market_data']> {
  const fallback: EditionContext['market_data'] = {
    median_price: '$1,250,000',
    price_change_yoy: '+2.3%',
    days_on_market: 18,
    sales_ratio: '58%',
    rate_1yr: '5.14%',
    rate_3yr: '4.89%',
    rate_5yr: '4.74%',
    variable_rate: '6.20%',
  };

  const prompt = `Generate realistic real estate market data for the ${neighbourhood} neighbourhood in ${city} for the current period (${new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}).

Base your estimates on typical BC/Metro Vancouver market conditions. Use plausible numbers that a realtor would recognize as credible — do not exaggerate.

Return JSON matching this schema exactly:
{
  "median_price": "string (e.g. '$1,450,000')",
  "price_change_yoy": "string (e.g. '+3.2%' or '-1.5%')",
  "days_on_market": number,
  "sales_ratio": "string (e.g. '62%')",
  "rate_1yr": "string (e.g. '5.09%')",
  "rate_3yr": "string (e.g. '4.84%')",
  "rate_5yr": "string (e.g. '4.69%')",
  "variable_rate": "string (e.g. '6.15%')"
}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText =
      response.content[0]?.type === 'text' ? response.content[0].text : '';
    const parsed = safeParseJSON(rawText) as EditionContext['market_data'];

    if (parsed && parsed.median_price) {
      return parsed;
    }

    return fallback;
  } catch (err) {
    console.error('[editorial-ai] getMarketDataFallback failed:', err);
    return fallback;
  }
}
