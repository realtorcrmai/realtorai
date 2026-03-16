import Anthropic from "@anthropic-ai/sdk";
import { DesignPatterns } from "../types.js";

const anthropic = new Anthropic();

/**
 * Scrape a URL and extract design patterns using Claude.
 * Uses a simple fetch for the HTML, then Claude analyzes it.
 */
export async function scrapeAndAnalyze(url: string): Promise<{
  url: string;
  design_patterns: DesignPatterns;
}> {
  // Fetch page HTML
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    html = await res.text();
  } catch (e) {
    console.error(`Failed to fetch ${url}:`, e);
    return {
      url,
      design_patterns: {
        colors: ["#000000", "#ffffff", "#c9a96e"],
        fonts: ["Playfair Display", "Inter"],
        layout_sections: ["hero", "about", "listings", "testimonials", "contact"],
        style_notes: "Could not scrape — using default luxury real estate patterns",
      },
    };
  }

  // Truncate HTML to avoid token limits
  const truncated = html.slice(0, 30000);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a web design analyst. Analyze the HTML of a real estate agent's website and extract design patterns.

Respond with ONLY valid JSON (no markdown fences):
{
  "colors": ["#hex1", "#hex2", ...],  // 3-6 dominant colors found in CSS/inline styles
  "fonts": ["Font Name 1", "Font Name 2"],  // font families referenced
  "layout_sections": ["hero", "about", ...],  // sections visible on the page in order
  "style_notes": "Brief description of the overall aesthetic — dark/light, minimalist/ornate, luxury/casual, etc."
}`,
    messages: [
      {
        role: "user",
        content: `Analyze this real estate website HTML and extract design patterns:\n\nURL: ${url}\n\n${truncated}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const patterns = JSON.parse(cleaned) as DesignPatterns;
    return { url, design_patterns: patterns };
  } catch {
    return {
      url,
      design_patterns: {
        colors: ["#000000", "#ffffff", "#c9a96e"],
        fonts: ["Playfair Display", "Inter"],
        layout_sections: ["hero", "about", "listings", "testimonials", "contact"],
        style_notes: "Parse error — using default luxury patterns",
      },
    };
  }
}

/**
 * Search for top realtor websites in a given market area.
 * Uses Anthropic's built-in web_search tool to find real, current websites
 * rather than relying on static model knowledge.
 */
export async function findReferenceWebsites(
  serviceAreas: string[]
): Promise<string[]> {
  const area = serviceAreas[0] || "Vancouver";
  const allUrls: string[] = [];

  // Run multiple targeted searches in parallel for broader coverage
  const searchQueries = [
    `best real estate agent website design ${area} 2025 2026`,
    `luxury realtor personal website ${area} new launch`,
    `top real estate agent website examples Canada`,
  ];

  const searchPromises = searchQueries.map((query) =>
    searchWeb(query).catch(() => [] as string[])
  );

  const results = await Promise.allSettled(searchPromises);
  for (const result of results) {
    if (result.status === "fulfilled") {
      allUrls.push(...result.value);
    }
  }

  // Deduplicate and filter to likely realtor sites
  const uniqueUrls = [...new Set(allUrls)];

  // Use Claude to pick the best 3-5 actual realtor personal websites from search results
  if (uniqueUrls.length > 0) {
    try {
      const filtered = await filterToRealtorSites(uniqueUrls, area);
      if (filtered.length >= 2) return filtered;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: ask Claude directly (static knowledge)
  console.log("Web search yielded few results, falling back to Claude knowledge");
  return fallbackFindReferences(area);
}

/**
 * Use Anthropic's web_search tool to find real estate websites.
 */
async function searchWeb(query: string): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools: [
        {
          type: "web_search" as any,
          name: "web_search",
        } as any,
      ],
      messages: [
        {
          role: "user",
          content: `Search the web for: "${query}"\n\nFind real estate agent personal websites (not Zillow, Realtor.ca, or brokerage corporate sites). Return the individual agent website URLs you find.`,
        },
      ],
    });

    // Extract URLs from the response text blocks
    const urls: string[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        // Extract URLs from text
        const urlMatches = block.text.match(
          /https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g
        );
        if (urlMatches) {
          urls.push(
            ...urlMatches.filter(
              (u) =>
                !u.includes("zillow.com") &&
                !u.includes("realtor.ca") &&
                !u.includes("redfin.com") &&
                !u.includes("realtor.com") &&
                !u.includes("google.com") &&
                !u.includes("youtube.com") &&
                !u.includes("facebook.com") &&
                !u.includes("instagram.com") &&
                !u.includes("wikipedia.org")
            )
          );
        }
      }
    }

    return urls;
  } catch (e) {
    console.warn("Web search failed:", e);
    return [];
  }
}

/**
 * Claude filters a list of URLs down to the best realtor personal websites.
 */
async function filterToRealtorSites(
  urls: string[],
  area: string
): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: `You are a real estate web design researcher. From a list of URLs, pick the 3-5 that are most likely individual real estate agent personal websites with good design.

EXCLUDE: brokerage corporate sites, MLS portals, real estate news sites, directories, social media.
PREFER: Individual agent sites with custom design, good aesthetics, luxury feel.
ALWAYS include https://mikemarfori.com if it's not already in the list (it's a known excellent reference).

Respond with ONLY a JSON array of URLs, no markdown:
["https://...", "https://...", ...]`,
    messages: [
      {
        role: "user",
        content: `Pick the best 3-5 individual realtor personal websites from this list for the ${area} market:\n\n${urls.join("\n")}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as string[];
  return parsed.filter((u) => u.startsWith("http"));
}

/**
 * Fallback: ask Claude for references from static knowledge.
 */
async function fallbackFindReferences(area: string): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: `You are a real estate web design researcher. Given a market area, provide 3-5 URLs of well-known luxury real estate agent websites that are good design references.

Include mikemarfori.com as one of them (it's a known high-quality reference).

Respond with ONLY a JSON array of URLs, no markdown:
["https://...", "https://...", ...]`,
    messages: [
      {
        role: "user",
        content: `Find top realtor websites in the ${area} real estate market for design reference.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const urls = JSON.parse(cleaned) as string[];
    return urls.filter((u) => u.startsWith("http"));
  } catch {
    return ["https://mikemarfori.com"];
  }
}
