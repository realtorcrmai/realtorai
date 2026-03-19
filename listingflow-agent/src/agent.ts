import { createClient } from "@supabase/supabase-js";
import { findReferenceWebsites, scrapeAndAnalyze } from "./tools/scrape.js";
import { fetchCRMData } from "./tools/crm-data.js";
import { generateConfigs } from "./tools/config.js";
import { renderSiteToHTML } from "./tools/render.js";
import { screenshotHTML, closeBrowser } from "./tools/screenshot.js";
import { GenerationRequest, DesignPatterns } from "./types.js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key);
}

async function updateGenerationStatus(
  generationId: string,
  status: string,
  extra?: Record<string, unknown>
) {
  const supabase = getSupabase();
  await supabase
    .from("site_generations")
    .update({ status, ...extra })
    .eq("id", generationId);
}

/**
 * Run the full generation pipeline (preview-only, no deployment):
 * 1. Research reference sites
 * 2. Fetch CRM data
 * 3. Generate 3 configs via Claude
 * 4. Render HTML for each
 * 5. Screenshot via Playwright (in-memory, no server)
 * 6. Save config + HTML + screenshots to Supabase
 */
export async function runGeneration(
  generationId: string,
  request: GenerationRequest
): Promise<void> {
  const supabase = getSupabase();

  try {
    // ── Step 1: Research ──
    await updateGenerationStatus(generationId, "researching");

    const crmData = await fetchCRMData(
      request.site_id,
      request.listing_ids,
      request.testimonial_ids
    );

    // Find and scrape reference websites
    const referenceResults: { url: string; design_patterns: DesignPatterns }[] = [];

    if (request.reference_url) {
      console.log(`Scraping user-provided reference: ${request.reference_url}`);
      try {
        const userRef = await scrapeAndAnalyze(request.reference_url);
        referenceResults.push(userRef);
      } catch (e) {
        console.warn("Failed to scrape user reference URL:", e);
      }
    }

    // Discover additional reference sites from the agent's market
    const referenceUrls = await findReferenceWebsites(crmData.profile.service_areas);
    const remainingSlots = 3 - referenceResults.length;
    const scrapePromises = referenceUrls
      .filter((url) => url !== request.reference_url)
      .slice(0, remainingSlots)
      .map((url) => scrapeAndAnalyze(url));
    const scrapeResults = await Promise.allSettled(scrapePromises);
    for (const result of scrapeResults) {
      if (result.status === "fulfilled") {
        referenceResults.push(result.value);
      }
    }

    await updateGenerationStatus(generationId, "researching", {
      reference_scrapes: referenceResults,
    });

    // ── Step 2: Generate 3 configs ──
    await updateGenerationStatus(generationId, "generating");

    const allPatterns = referenceResults.map((r) => r.design_patterns);
    const configs = await generateConfigs(crmData, allPatterns, request.design_prompt);

    // ── Step 3: Render + Screenshot each variant (no deploy) ──
    for (const { style_name, config } of configs) {
      try {
        // Render to HTML
        const html = renderSiteToHTML(config);
        console.log(`[RENDER] ${style_name} — ${html.length} bytes`);

        // Screenshot from HTML in-memory (no server needed)
        let screenshots = { desktop: "", mobile: "" };
        try {
          const result = await screenshotHTML(html);
          screenshots = { desktop: result.desktop, mobile: result.mobile };
          if (result.consoleErrors.length) {
            console.warn(`Console errors on ${style_name}:`, result.consoleErrors);
          }
          console.log(`[SCREENSHOT] ${style_name} — desktop: ${screenshots.desktop.length} chars, mobile: ${screenshots.mobile.length} chars`);
        } catch (e) {
          console.error(`Screenshot failed for ${style_name}:`, e);
        }

        // Save variant with config + rendered HTML + screenshots
        await supabase.from("site_variants").insert({
          generation_id: generationId,
          style_name,
          site_config: { ...config, rendered_html: html },
          preview_url: null,
          screenshots,
        });
      } catch (e) {
        console.error(`Failed to process variant ${style_name}:`, e);
        await supabase.from("site_variants").insert({
          generation_id: generationId,
          style_name,
          site_config: config,
          preview_url: null,
          screenshots: null,
        });
      }
    }

    // ── Step 4: Done ──
    await updateGenerationStatus(generationId, "previewing");
    await closeBrowser();
  } catch (e) {
    console.error("Generation failed:", e);
    await updateGenerationStatus(generationId, "failed", {
      error_message: e instanceof Error ? e.message : String(e),
    });
    await closeBrowser();
  }
}

/**
 * Approve a variant — mark it as selected, save to realtor_sites.
 * No deployment — HTML is stored in site_config.rendered_html for future use.
 */
export async function approveVariant(variantId: string): Promise<string> {
  const supabase = getSupabase();

  const { data: variant } = await supabase
    .from("site_variants")
    .select("*, site_generations!inner(site_id)")
    .eq("id", variantId)
    .single();

  if (!variant) throw new Error("Variant not found");

  // Mark variant as selected
  await supabase
    .from("site_variants")
    .update({ is_selected: true })
    .eq("id", variantId);

  // Update generation status
  await supabase
    .from("site_generations")
    .update({ status: "completed" })
    .eq("id", variant.generation_id);

  // Update realtor_sites with active variant
  const siteId = (variant as any).site_generations?.site_id;
  if (siteId) {
    await supabase
      .from("realtor_sites")
      .update({ active_variant_id: variantId })
      .eq("id", siteId);
  }

  return variantId;
}
