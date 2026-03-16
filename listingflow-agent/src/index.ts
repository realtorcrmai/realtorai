import express from "express";
import { createClient } from "@supabase/supabase-js";
import { runGeneration, approveVariant } from "./agent.js";

const app = express();
app.use(express.json());

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key);
}

/**
 * POST /api/generate
 * Start a new website generation.
 * Body: { site_id, listing_ids?, testimonial_ids? }
 */
app.post("/api/generate", async (req, res) => {
  try {
    const { site_id, listing_ids, testimonial_ids, reference_url } = req.body;
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
    runGeneration(generation.id, { site_id, listing_ids, testimonial_ids, reference_url }).catch(
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
    const liveUrl = await approveVariant(req.params.id);
    return res.json({ live_url: liveUrl });
  } catch (e) {
    console.error("Approve endpoint error:", e);
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Internal server error",
    });
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
