// Realtors360 Social — AI Content Generator
// Uses Claude to generate platform-specific social media content from CRM data

import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";
import type {
  ContentGenerationRequest,
  GeneratedContent,
  SocialBrandKit,
} from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

function buildVoiceRulesPrompt(brandKit: SocialBrandKit): string {
  const rules: string[] = [];

  if (brandKit.voice_tone !== "custom") {
    rules.push(`Voice tone: ${brandKit.voice_tone}`);
  }
  if (brandKit.voice_custom_description) {
    rules.push(`Voice description: ${brandKit.voice_custom_description}`);
  }
  if (brandKit.emoji_preference) {
    const emojiGuide: Record<string, string> = {
      none: "Do NOT use any emojis",
      minimal: "Use 1-2 emojis max, only at the start or end",
      moderate: "Use 3-5 emojis naturally throughout the caption",
      heavy: "Use emojis liberally, 1-2 per sentence",
    };
    rules.push(emojiGuide[brandKit.emoji_preference] || "");
  }
  if (brandKit.default_cta) {
    rules.push(`Default CTA style: "${brandKit.default_cta}"`);
  }
  if (brandKit.brokerage_name) {
    rules.push(`COMPLIANCE: Always include brokerage name "${brandKit.brokerage_name}" in every post`);
  }
  if (brandKit.license_number) {
    rules.push(`Include license number: ${brandKit.license_number}`);
  }
  if (brandKit.voice_rules && Array.isArray(brandKit.voice_rules) && brandKit.voice_rules.length > 0) {
    rules.push("Learned voice rules from past edits:");
    for (const rule of brandKit.voice_rules) {
      if (typeof rule === "object" && rule !== null && "rule" in rule) {
        rules.push(`  - ${(rule as { rule: string }).rule}`);
      }
    }
  }

  return rules.filter(Boolean).join("\n");
}

function buildListingPrompt(request: ContentGenerationRequest): string {
  const { listing } = request;
  if (!listing) return "";

  return `
Property Details:
- Address: ${listing.address}
- Price: $${listing.price.toLocaleString()}
- Bedrooms: ${listing.beds} | Bathrooms: ${listing.baths} | Square Feet: ${listing.sqft.toLocaleString()}
- Property Type: ${listing.property_type}
- Neighbourhood: ${listing.neighbourhood}
- Status: ${listing.status}
- Description: ${listing.description}
- Key Features: ${listing.features.join(", ")}
`;
}

function buildContentTypePrompt(contentType: string): string {
  const prompts: Record<string, string> = {
    just_listed: "Create exciting 'Just Listed' announcement content. Highlight the best features. Create urgency.",
    just_sold: "Create a 'Just Sold' celebration post. Celebrate the achievement. Attract future sellers.",
    open_house: "Create an Open House invitation. Include date/time/address. Create excitement to visit.",
    price_reduced: "Create a 'Price Reduced' alert. Show the savings. Create urgency to act now.",
    coming_soon: "Create a 'Coming Soon' teaser. Build anticipation without revealing too much.",
    market_update: "Create a market update post with data and insights. Position the agent as a market expert.",
    neighbourhood: "Create a neighbourhood spotlight. Highlight local amenities, lifestyle, and community feel.",
    testimonial: "Create a client testimonial/success story post. Let the results speak.",
    tips: "Create an educational tip post. Provide genuine value to buyers or sellers.",
    holiday: "Create a holiday greeting that feels genuine, not salesy. Keep it warm.",
    milestone: "Create a milestone celebration (deals closed, anniversary, award). Be proud but humble.",
    custom: "Create engaging social media content based on the provided details.",
  };
  return prompts[contentType] || prompts.custom;
}

export async function generateContentForPlatforms(
  request: ContentGenerationRequest
): Promise<GeneratedContent> {
  const { brand_kit, content_type, target_platforms } = request;

  const voiceRules = buildVoiceRulesPrompt(brand_kit);
  const listingDetails = buildListingPrompt(request);
  const contentTypeGuide = buildContentTypePrompt(content_type);

  const systemPrompt = `You are a social media content creator for a real estate agent.

AGENT PROFILE:
- Name: ${brand_kit.agent_name || "Real Estate Agent"}
- Brokerage: ${brand_kit.brokerage_name || ""}
- Service Areas: ${brand_kit.service_areas?.join(", ") || ""}
- Bio: ${brand_kit.bio_text || ""}

VOICE & STYLE RULES:
${voiceRules}

DEFAULT HASHTAGS TO INCLUDE: ${brand_kit.default_hashtags?.join(" ") || "none specified"}

IMPORTANT RULES:
1. Content must be accurate — never make up features or stats not provided
2. Always include the brokerage name for compliance
3. Each platform variant must be optimized for THAT platform's audience and format
4. Hashtags must be relevant and location-specific
5. CTAs should be clear and actionable
6. Never use generic filler — every sentence should add value
7. Prices must match exactly what is provided — never round or estimate`;

  const userPrompt = `${contentTypeGuide}

${listingDetails}

${request.testimonial ? `Client Testimonial:
- Quote: "${request.testimonial.quote}"
- Author: ${request.testimonial.author}
- Detail: ${request.testimonial.detail}` : ""}

${request.market_data ? `Market Data:
- Average Price: $${request.market_data.avg_price.toLocaleString()}
- Price Change: ${request.market_data.price_change_pct > 0 ? "+" : ""}${request.market_data.price_change_pct}%
- Average Days on Market: ${request.market_data.avg_dom}
- Active Listings: ${request.market_data.active_listings}
- Area: ${request.market_data.area}` : ""}

${request.custom_prompt ? `Additional instructions: ${request.custom_prompt}` : ""}

Generate content for these platforms: ${target_platforms.join(", ")}

Respond with ONLY valid JSON in this exact format:
{
  "facebook": {
    "caption": "Full Facebook post caption (2-3 paragraphs, 150-300 words)",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
    "cta": "Call to action text"
  },
  "instagram": {
    "caption": "Instagram caption (engaging, 100-200 words, with line breaks)",
    "hashtags": ["up to 30 relevant hashtags"],
    "cta": "Call to action"
  },
  "instagram_carousel": {
    "slides": [
      {"caption": "Slide 1 text overlay", "overlay_text": "Short text for image overlay"},
      {"caption": "Slide 2 text overlay", "overlay_text": "Feature highlight"},
      {"caption": "Slide 3 text overlay", "overlay_text": "Another feature"},
      {"caption": "Slide 4 text overlay", "overlay_text": "Neighbourhood info"},
      {"caption": "Slide 5 text overlay", "overlay_text": "CTA slide text"}
    ],
    "main_caption": "Main carousel caption",
    "hashtags": ["hashtag1", "hashtag2"]
  },
  "linkedin": {
    "caption": "Professional LinkedIn post (market context, professional tone, 150-250 words)",
    "hashtags": ["3-5 professional hashtags"],
    "cta": "Professional CTA"
  },
  "tiktok": {
    "caption": "TikTok caption (short, punchy, hook-driven, 50-100 words)",
    "hashtags": ["trending and local hashtags"],
    "cta": "Quick CTA"
  }
}

Only include platforms that were requested. Ensure all JSON is valid.`;

  const model = process.env.SOCIAL_AI_MODEL || "claude-sonnet-4-20250514";

  const message = await createWithRetry(anthropic, {
    model,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as GeneratedContent;
    return parsed;
  } catch {
    // If JSON parsing fails, create a basic structure from the raw text
    const fallback: GeneratedContent = {
      facebook: {
        caption: responseText.slice(0, 500),
        hashtags: brand_kit.default_hashtags || [],
      },
      instagram: {
        caption: responseText.slice(0, 300),
        hashtags: brand_kit.default_hashtags || [],
      },
    };
    return fallback;
  }
}
