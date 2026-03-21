import Anthropic from "@anthropic-ai/sdk";
import { SiteConfig, CRMData, DesignPatterns } from "../types.js";

const anthropic = new Anthropic();

const STYLE_PRESETS = {
  dark_luxury: {
    name: "Dark Luxury",
    description: "Dark background, gold/champagne accents, serif headings. Inspired by high-end real estate branding.",
    defaultColors: { bg: "#0a0a0a", text: "#f5f5f5", accent: "#c9a96e", muted: "#8a8a8a" },
    defaultFonts: { heading: "Playfair Display", body: "Inter" },
  },
  light_modern: {
    name: "Light Modern",
    description: "White/cream background, navy/slate accents, clean sans-serif. Professional and airy.",
    defaultColors: { bg: "#fafafa", text: "#1a1a2e", accent: "#2d3a8c", muted: "#6b7280" },
    defaultFonts: { heading: "DM Sans", body: "DM Sans" },
  },
  bold_warm: {
    name: "Bold & Warm",
    description: "Warm cream background, terracotta/copper accents, distinctive headings. Approachable and energetic.",
    defaultColors: { bg: "#faf5f0", text: "#2d1b0e", accent: "#c45d3e", muted: "#8b7355" },
    defaultFonts: { heading: "Bricolage Grotesque", body: "Inter" },
  },
};

/**
 * Generate 3 site config JSONs — one per style preset.
 */
export async function generateConfigs(
  crmData: CRMData,
  referencePatterns: DesignPatterns[],
  designPrompt?: string
): Promise<{ style_name: string; config: SiteConfig }[]> {
  const results: { style_name: string; config: SiteConfig }[] = [];

  // Build content data once (shared across all 3 styles)
  const listingItems = crmData.listings.map((l) => ({
    photo: l.hero_image_url || undefined,
    address: l.address,
    price: l.list_price ? `$${l.list_price.toLocaleString()}` : "Contact for Price",
    beds: 0,
    baths: 0,
    status: l.status,
  }));

  const testimonialItems = crmData.testimonials.map((t) => ({
    quote: t.content,
    name: t.client_name,
    role: t.client_location || "Client",
  }));

  const heroImages = [
    ...(crmData.media.filter((m) => m.category === "hero").map((m) => m.file_url)),
    ...(crmData.listings.filter((l) => l.hero_image_url).map((l) => l.hero_image_url!)),
  ].slice(0, 3);

  const leadEndpoint = `${process.env.NEXT_PUBLIC_APP_URL || "https://listingflow.com"}/api/leads`;

  for (const [styleKey, preset] of Object.entries(STYLE_PRESETS)) {
    try {
      const config = await generateSingleConfig(
        styleKey,
        preset,
        crmData,
        referencePatterns,
        listingItems,
        testimonialItems,
        heroImages,
        leadEndpoint,
        designPrompt
      );
      results.push({ style_name: styleKey, config });
    } catch (e) {
      console.error(`Failed to generate ${styleKey} config:`, e);
      // Fallback to a default config
      results.push({
        style_name: styleKey,
        config: buildFallbackConfig(preset, crmData, listingItems, testimonialItems, heroImages, leadEndpoint),
      });
    }
  }

  return results;
}

async function generateSingleConfig(
  styleKey: string,
  preset: (typeof STYLE_PRESETS)[keyof typeof STYLE_PRESETS],
  crmData: CRMData,
  referencePatterns: DesignPatterns[],
  listingItems: SiteConfig["listings"]["items"],
  testimonialItems: SiteConfig["testimonials"]["items"],
  heroImages: string[],
  leadEndpoint: string,
  designPrompt?: string
): Promise<SiteConfig> {
  const { profile } = crmData;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `You are a luxury real estate website designer. Generate a site configuration JSON for the "${preset.name}" style.

Style description: ${preset.description}

Reference design patterns found from top realtor sites:
${JSON.stringify(referencePatterns, null, 2)}

You MUST respond with ONLY valid JSON (no markdown fences). The JSON must match this exact structure:
{
  "theme": {
    "colors": { "bg": "#...", "text": "#...", "accent": "#...", "muted": "#..." },
    "fonts": { "heading": "Font Name", "body": "Font Name" }
  },
  "headline": "A compelling headline for the hero section",
  "subheadline": "A compelling subheadline",
  "bio": "A polished version of the agent's bio (rewrite for the website)",
  "stats": [{ "number": "500+", "label": "Homes Sold" }, ...],
  "cta_headline": "A compelling CTA headline",
  "cta_button_text": "Button text"
}

Rules:
- Pick colors that match the "${preset.name}" style but are influenced by the reference patterns
- Pick Google Fonts that match the style
- Write a compelling headline and subheadline for a ${profile.service_areas[0] || "luxury"} real estate agent
- Generate 3 impressive stats based on the agent's profile
- The bio should be polished, professional, 2-3 sentences
- CTA should drive contact form submissions
${designPrompt ? `\nIMPORTANT — The realtor has provided these design preferences. Incorporate them into your design choices:\n"${designPrompt}"` : ""}`,
    messages: [
      {
        role: "user",
        content: `Generate a "${preset.name}" website config for this realtor:

Name: ${profile.agent_name}
Title: ${profile.agent_title || "REALTOR®"}
Bio: ${profile.bio_full || profile.bio_short || "Experienced real estate professional"}
Brokerage: ${profile.brokerage_name || ""}
Service Areas: ${profile.service_areas.join(", ") || "Metro Vancouver"}
Credentials: ${profile.credentials.join(", ") || "Licensed REALTOR®"}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const generated = JSON.parse(cleaned);

  // Assemble full SiteConfig
  return {
    theme: {
      colors: generated.theme?.colors || preset.defaultColors,
      fonts: generated.theme?.fonts || preset.defaultFonts,
    },
    nav: {
      logo_url: profile.logo_url || undefined,
      links: ["About", "Listings", "Testimonials", "Contact"],
    },
    hero: {
      images: heroImages,
      headline: generated.headline || `${profile.agent_name} — Real Estate`,
      subheadline: generated.subheadline || profile.tagline || "Your trusted real estate professional",
    },
    about: {
      headshot_url: profile.headshot_url || undefined,
      name: profile.agent_name,
      title: profile.agent_title || undefined,
      bio: generated.bio || profile.bio_full || profile.bio_short || "",
      credentials: profile.credentials,
    },
    stats: {
      items: generated.stats || [
        { number: "100+", label: "Homes Sold" },
        { number: "15+", label: "Years Experience" },
        { number: "$50M+", label: "Total Volume" },
      ],
    },
    testimonials: { items: testimonialItems },
    listings: { items: listingItems },
    cta: {
      headline: generated.cta_headline || "Ready to Make Your Move?",
      button_text: generated.cta_button_text || "Contact Me",
      button_link: "#contact",
    },
    contact: { lead_endpoint: leadEndpoint },
    footer: {
      phone: profile.phone || undefined,
      email: profile.email || undefined,
      address: profile.office_address || undefined,
      areas: profile.service_areas,
      social_links: profile.social_links,
    },
  };
}

function buildFallbackConfig(
  preset: (typeof STYLE_PRESETS)[keyof typeof STYLE_PRESETS],
  crmData: CRMData,
  listingItems: SiteConfig["listings"]["items"],
  testimonialItems: SiteConfig["testimonials"]["items"],
  heroImages: string[],
  leadEndpoint: string
): SiteConfig {
  const { profile } = crmData;
  return {
    theme: { colors: preset.defaultColors, fonts: preset.defaultFonts },
    nav: { logo_url: profile.logo_url || undefined, links: ["About", "Listings", "Testimonials", "Contact"] },
    hero: {
      images: heroImages,
      headline: `${profile.agent_name}`,
      subheadline: profile.tagline || "Your Trusted Real Estate Professional",
    },
    about: {
      headshot_url: profile.headshot_url || undefined,
      name: profile.agent_name,
      title: profile.agent_title || undefined,
      bio: profile.bio_full || profile.bio_short || "",
      credentials: profile.credentials,
    },
    stats: { items: [{ number: "100+", label: "Homes Sold" }, { number: "15+", label: "Years Experience" }, { number: "$50M+", label: "Total Volume" }] },
    testimonials: { items: testimonialItems },
    listings: { items: listingItems },
    cta: { headline: "Ready to Make Your Move?", button_text: "Contact Me", button_link: "#contact" },
    contact: { lead_endpoint: leadEndpoint },
    footer: {
      phone: profile.phone || undefined,
      email: profile.email || undefined,
      address: profile.office_address || undefined,
      areas: profile.service_areas,
      social_links: profile.social_links,
    },
  };
}
