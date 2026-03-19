import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { runGeneration, approveVariant } from "./agent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key);
}

/**
 * GET /api/sites
 * List available realtor site profiles.
 */
app.get("/api/sites", async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("realtor_sites")
      .select("id, agent_name, brokerage_name")
      .order("agent_name");
    if (error) return res.status(500).json({ error: "Failed to fetch sites" });
    return res.json(data || []);
  } catch (e) {
    console.error("Sites endpoint error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/generate
 * Start a new website generation.
 * Body: { site_id, listing_ids?, testimonial_ids? }
 */
app.post("/api/generate", async (req, res) => {
  try {
    const { site_id, listing_ids, testimonial_ids, reference_url, design_prompt } = req.body;
    if (!site_id) {
      return res.status(400).json({ error: "site_id is required" });
    }

    const supabase = getSupabase();

    // Create generation record
    const { data: generation, error } = await supabase
      .from("site_generations")
      .insert({ site_id, status: "started" })
      .select()
      .single();

    if (error || !generation) {
      return res.status(500).json({ error: "Failed to create generation record" });
    }

    // Start generation in background (don't await)
    runGeneration(generation.id, { site_id, listing_ids, testimonial_ids, reference_url, design_prompt }).catch(
      (e) => console.error("Background generation error:", e)
    );

    return res.json({
      generation_id: generation.id,
      status: "started",
    });
  } catch (e) {
    console.error("Generate endpoint error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/generations/:id
 * Poll generation status + get variants.
 */
app.get("/api/generations/:id", async (req, res) => {
  try {
    const supabase = getSupabase();

    const { data: generation } = await supabase
      .from("site_generations")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (!generation) {
      return res.status(404).json({ error: "Generation not found" });
    }

    // Fetch variants if generation is in previewing/completed state
    let variants: any[] = [];
    if (generation.status === "previewing" || generation.status === "completed") {
      const { data } = await supabase
        .from("site_variants")
        .select("id, style_name, preview_url, screenshots, is_selected, live_url")
        .eq("generation_id", generation.id);
      variants = data || [];
    }

    return res.json({
      id: generation.id,
      status: generation.status,
      error_message: generation.error_message,
      variants,
    });
  } catch (e) {
    console.error("Status endpoint error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/variants/:id/approve
 * Promote a variant to production.
 */
app.post("/api/variants/:id/approve", async (req, res) => {
  try {
    const variantId = await approveVariant(req.params.id);
    return res.json({ approved: true, variant_id: variantId });
  } catch (e) {
    console.error("Approve endpoint error:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Internal server error",
    });
  }
});

/**
 * GET /api/variants/:id/preview
 * Serve the rendered HTML for a variant in the browser.
 */
app.get("/api/variants/:id/preview", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: variant } = await supabase
      .from("site_variants")
      .select("site_config, style_name")
      .eq("id", req.params.id)
      .single();

    if (!variant) {
      return res.status(404).send("Variant not found");
    }

    const html = variant.site_config?.rendered_html;
    if (!html) {
      return res.status(404).send("No rendered HTML available for this variant");
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (e) {
    console.error("Preview endpoint error:", e);
    return res.status(500).send("Internal server error");
  }
});

/**
 * Health check
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "listingflow-agent" });
});

const PORT = process.env.PORT || 8768;
app.listen(PORT, () => {
  console.log(`ListingFlow Agent running on port ${PORT}`);
});
