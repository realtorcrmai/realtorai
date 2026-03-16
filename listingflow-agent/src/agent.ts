import { createClient } from "@supabase/supabase-js";
import { findReferenceWebsites, scrapeAndAnalyze } from "./tools/scrape.js";
import { fetchCRMData } from "./tools/crm-data.js";
import { generateConfigs } from "./tools/config.js";
import { renderSiteToHTML } from "./tools/render.js";
import { createProject, deployFiles, generateProjectName } from "./tools/deploy.js";
import { deployLocal } from "./tools/local-preview.js";
import { screenshotSite, closeBrowser } from "./tools/screenshot.js";
import { GenerationRequest, DesignPatterns } from "./types.js";

const isLocalPreview = process.env.LOCAL_PREVIEW === "true";

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
 * Run the full generation pipeline:
 * 1. Research reference sites
 * 2. Fetch CRM data
 * 3. Generate 3 configs
 * 4. Render HTML for each
 * 5. Deploy to Cloudflare
 * 6. Screenshot each
 * 7. Save variants
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
    // If user provided a favorite URL, scrape it first as the primary reference
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

    // Also discover additional reference sites from the agent's market
    const referenceUrls = await findReferenceWebsites(crmData.profile.service_areas);
    const remainingSlots = 3 - referenceResults.length;
    const scrapePromises = referenceUrls
      .filter((url) => url !== request.reference_url) // Don't duplicate user's URL
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
    const configs = await generateConfigs(crmData, allPatterns);

    // ── Step 3: Render + Deploy + Screenshot each variant ──
    for (const { style_name, config } of configs) {
      try {
        // Render to HTML
        const html = renderSiteToHTML(config);
        const files = { "index.html": html };

        const projectName = generateProjectName(crmData.profile.agent_name, style_name);
        let deploymentUrl: string;

        if (isLocalPreview) {
          // Local mode: serve HTML on localhost
          const local = await deployLocal(projectName, files);
          deploymentUrl = local.previewUrl;
          console.log(`[LOCAL] ${style_name} → ${deploymentUrl}`);
        } else {
          // Production mode: deploy to Cloudflare Pages
          await createProject(projectName);
          const result = await deployFiles(projectName, files);
          deploymentUrl = result.deploymentUrl;
          // Wait for Cloudflare propagation
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        // Screenshot
        let screenshots = { desktop: "", mobile: "" };
        try {
          const result = await screenshotSite(deploymentUrl);
          screenshots = { desktop: result.desktop, mobile: result.mobile };
          if (result.consoleErrors.length) {
            console.warn(`Console errors on ${style_name}:`, result.consoleErrors);
          }
        } catch (e) {
          console.error(`Screenshot failed for ${style_name}:`, e);
        }

        // Save variant
        await supabase.from("site_variants").insert({
          generation_id: generationId,
          style_name,
          site_config: config,
          preview_url: deploymentUrl,
          screenshots,
          cloudflare_project_name: isLocalPreview ? null : projectName,
        });
      } catch (e) {
        console.error(`Failed to process variant ${style_name}:`, e);
        // Still save the variant with error info
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
 * Approve a variant — promote its Cloudflare deployment to production.
 */
export async function approveVariant(variantId: string): Promise<string> {
  const supabase = getSupabase();

  const { data: variant } = await supabase
    .from("site_variants")
    .select("*, site_generations!inner(site_id)")
    .eq("id", variantId)
    .single();

  if (!variant) throw new Error("Variant not found");

  let liveUrl: string;
  if (variant.preview_url && variant.preview_url.startsWith("http://localhost")) {
    // Local preview mode — the preview URL IS the live URL
    liveUrl = variant.preview_url;
  } else {
    const projectName = variant.cloudflare_project_name;
    if (!projectName) throw new Error("No Cloudflare project for this variant");
    liveUrl = `https://${projectName}.pages.dev`;
  }

  // Update variant
  await supabase
    .from("site_variants")
    .update({ is_selected: true, live_url: liveUrl })
    .eq("id", variantId);

  // Update generation status
  await supabase
    .from("site_generations")
    .update({ status: "completed" })
    .eq("id", variant.generation_id);

  // Update realtor_sites
  const siteId = (variant as any).site_generations?.site_id;
  if (siteId) {
    await supabase
      .from("realtor_sites")
      .update({ live_url: liveUrl, active_variant_id: variantId })
      .eq("id", siteId);
  }

  return liveUrl;
}
