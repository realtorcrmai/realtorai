import express from "express";
import { createClient } from "@supabase/supabase-js";
import {
  generateMLSRemarks,
  generateContentPrompts,
  type ListingContext,
} from "./tools/creative-director.js";
import {
  startVideoGeneration,
  startImageGeneration,
  getTaskStatus,
} from "./tools/kling.js";

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

// ── Health ──────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "content-generator" });
});

// ── Generate Prompts (Claude AI) ────────────────────────────
// POST /api/prompts/generate { listingId }
app.post("/api/prompts/generate", async (req, res) => {
  const { listingId } = req.body;
  if (!listingId) {
    res.status(400).json({ error: "listingId is required" });
    return;
  }

  try {
    // Fetch listing details with enrichment data
    const [{ data: listing, error: listingError }, { data: enrichment }] =
      await Promise.all([
        supabase
          .from("listings")
          .select("*, contacts(name)")
          .eq("id", listingId)
          .single(),
        supabase
          .from("listing_enrichment")
          .select("geo, parcel, assessment, strata")
          .eq("listing_id", listingId)
          .maybeSingle(),
      ]);

    if (listingError || !listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const sellerName =
      listing.contacts &&
      typeof listing.contacts === "object" &&
      "name" in listing.contacts
        ? (listing.contacts as { name: string }).name
        : null;

    // Extract enrichment fields
    const parcel = enrichment?.parcel as Record<string, unknown> | null;
    const assessment = enrichment?.assessment as Record<string, unknown> | null;
    const strata = enrichment?.strata as Record<string, unknown> | null;
    const geo = enrichment?.geo as Record<string, unknown> | null;

    const context: ListingContext = {
      address: listing.address,
      listPrice: listing.list_price,
      notes: listing.notes,
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      sqft: listing.sqft ?? null,
      yearBuilt: listing.year_built ?? null,
      lotSize: parcel?.lot_size as string ?? null,
      propertyType: listing.property_type ?? null,
      features: listing.features ?? null,
      showingInstructions: listing.showing_instructions ?? null,
      mlsNumber: listing.mls_number ?? null,
      sellerName,
      neighbourhood: geo?.locality as string ?? null,
      zoning: parcel?.zoning as string ?? null,
      assessedValue: assessment?.total_value as number ?? null,
      strataFees: strata?.monthly_fees as number ?? null,
      lotDimensions: parcel?.lot_dimensions as string ?? null,
    };

    // Generate prompts + remarks in parallel
    const [contentPrompts, mlsRemarks] = await Promise.all([
      generateContentPrompts(context),
      generateMLSRemarks(context),
    ]);

    // Upsert into prompts table
    const { data: existing } = await supabase
      .from("prompts")
      .select("id")
      .eq("listing_id", listingId)
      .maybeSingle();

    let prompt;
    let saveError;

    const promptData = {
      video_prompt: contentPrompts.videoPrompt,
      image_prompt: contentPrompts.imagePrompt,
      ig_caption: contentPrompts.igCaption,
      mls_public: mlsRemarks.publicRemarks,
      mls_realtor: mlsRemarks.realtorRemarks,
    };

    if (existing) {
      const { data, error } = await supabase
        .from("prompts")
        .update(promptData)
        .eq("id", existing.id)
        .select()
        .single();
      prompt = data;
      saveError = error;
    } else {
      const { data, error } = await supabase
        .from("prompts")
        .insert({ listing_id: listingId, ...promptData })
        .select()
        .single();
      prompt = data;
      saveError = error;
    }

    if (saveError) {
      res.status(500).json({ error: "Failed to save prompts: " + saveError.message });
      return;
    }

    res.json({ success: true, prompt });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to generate prompts",
    });
  }
});

// ── Update Prompt ───────────────────────────────────────────
// PATCH /api/prompts/:id
app.patch("/api/prompts/:id", async (req, res) => {
  const { id } = req.params;
  const updates: Record<string, string | null> = {};

  if (req.body.videoPrompt !== undefined) updates.video_prompt = req.body.videoPrompt;
  if (req.body.imagePrompt !== undefined) updates.image_prompt = req.body.imagePrompt;
  if (req.body.mlsPublic !== undefined) updates.mls_public = req.body.mlsPublic;
  if (req.body.mlsRealtor !== undefined) updates.mls_realtor = req.body.mlsRealtor;
  if (req.body.igCaption !== undefined) updates.ig_caption = req.body.igCaption;

  const { error } = await supabase.from("prompts").update(updates).eq("id", id);

  if (error) {
    res.status(500).json({ error: "Failed to update prompt: " + error.message });
    return;
  }

  res.json({ success: true });
});

// ── MLS Remarks (standalone) ────────────────────────────────
// POST /api/mls-remarks { listingId }
app.post("/api/mls-remarks", async (req, res) => {
  const { listingId } = req.body;
  if (!listingId) {
    res.status(400).json({ error: "listingId is required" });
    return;
  }

  try {
    const [{ data: listing }, { data: enrichment }] = await Promise.all([
      supabase
        .from("listings")
        .select("*, contacts(name)")
        .eq("id", listingId)
        .single(),
      supabase
        .from("listing_enrichment")
        .select("geo, parcel, assessment, strata")
        .eq("listing_id", listingId)
        .maybeSingle(),
    ]);

    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const parcel = enrichment?.parcel as Record<string, unknown> | null;
    const assessment = enrichment?.assessment as Record<string, unknown> | null;
    const geo = enrichment?.geo as Record<string, unknown> | null;

    const remarks = await generateMLSRemarks({
      address: listing.address,
      listPrice: listing.list_price,
      notes: listing.notes,
      showingInstructions: listing.showing_instructions,
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      sqft: listing.sqft ?? null,
      yearBuilt: listing.year_built ?? null,
      features: listing.features ?? null,
      neighbourhood: geo?.locality as string ?? null,
      zoning: parcel?.zoning as string ?? null,
      assessedValue: assessment?.total_value as number ?? null,
    });

    res.json(remarks);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to generate remarks",
    });
  }
});

// ── Start Media Generation (Kling AI) ───────────────────────
// POST /api/media/generate { listingId, promptId, assetType }
app.post("/api/media/generate", async (req, res) => {
  const { listingId, promptId, assetType } = req.body;

  if (!listingId || !promptId || !assetType) {
    res.status(400).json({ error: "listingId, promptId, and assetType are required" });
    return;
  }

  if (assetType !== "video" && assetType !== "image") {
    res.status(400).json({ error: "assetType must be 'video' or 'image'" });
    return;
  }

  try {
    const { data: prompt } = await supabase
      .from("prompts")
      .select("*")
      .eq("id", promptId)
      .single();

    if (!prompt) {
      res.status(404).json({ error: "Prompt not found" });
      return;
    }

    let klingTaskId: string;

    if (assetType === "video") {
      const { data: listing } = await supabase
        .from("listings")
        .select("hero_image_url")
        .eq("id", listingId)
        .single();

      if (!listing?.hero_image_url) {
        res.status(400).json({ error: "Hero image required for video generation" });
        return;
      }

      klingTaskId = await startVideoGeneration({
        imageUrl: listing.hero_image_url,
        prompt: prompt.video_prompt ?? "",
        aspectRatio: "9:16",
      });
    } else {
      klingTaskId = await startImageGeneration({
        prompt: prompt.image_prompt ?? "",
        aspectRatio: "1:1",
      });
    }

    const { data: asset, error: insertError } = await supabase
      .from("media_assets")
      .insert({
        listing_id: listingId,
        prompt_id: promptId,
        asset_type: assetType,
        kling_task_id: klingTaskId,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      res.status(500).json({ error: "Failed to save asset: " + insertError.message });
      return;
    }

    // Start server-side background polling so client doesn't have to stay open
    pollTaskUntilDone(asset.id, klingTaskId);

    res.json({ success: true, assetId: asset.id, klingTaskId });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to start media generation",
    });
  }
});

// ── Poll Kling Task Status ──────────────────────────────────
// GET /api/media/status?taskId=xxx
app.get("/api/media/status", async (req, res) => {
  const taskId = req.query.taskId as string;
  if (!taskId) {
    res.status(400).json({ error: "taskId is required" });
    return;
  }

  try {
    const status = await getTaskStatus(taskId);
    res.json(status);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to get task status",
    });
  }
});

// ── Update Media Asset Status ───────────────────────────────
// PATCH /api/media/:id/status
app.patch("/api/media/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, outputUrl, errorMessage } = req.body;

  const { error } = await supabase
    .from("media_assets")
    .update({
      status,
      output_url: outputUrl ?? null,
      error_message: errorMessage ?? null,
    })
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: "Failed to update asset status" });
    return;
  }

  res.json({ success: true });
});

// ── Update Hero Image ───────────────────────────────────────
// PATCH /api/listings/:id/hero-image
app.patch("/api/listings/:id/hero-image", async (req, res) => {
  const { id } = req.params;
  const { heroImageUrl } = req.body;

  const { error } = await supabase
    .from("listings")
    .update({ hero_image_url: heroImageUrl })
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: "Failed to update hero image" });
    return;
  }

  res.json({ success: true });
});

// ── Server-Side Polling ─────────────────────────────────────
// Background poll a Kling task until terminal state, then update the DB
async function pollTaskUntilDone(assetId: string, klingTaskId: string) {
  const POLL_INTERVAL = 10_000; // 10 seconds
  const MAX_POLLS = 60; // 10 min max

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    try {
      const status = await getTaskStatus(klingTaskId);

      if (status.status === "completed") {
        await supabase
          .from("media_assets")
          .update({
            status: "completed",
            output_url: status.outputUrl ?? null,
          })
          .eq("id", assetId);
        console.log(`[poll] Asset ${assetId} completed: ${status.outputUrl}`);
        return;
      }

      if (status.status === "failed") {
        await supabase
          .from("media_assets")
          .update({
            status: "failed",
            error_message: status.errorMessage ?? "Generation failed",
          })
          .eq("id", assetId);
        console.log(`[poll] Asset ${assetId} failed: ${status.errorMessage}`);
        return;
      }
    } catch (err) {
      console.error(`[poll] Error checking ${assetId}:`, err);
    }
  }

  // Timed out
  await supabase
    .from("media_assets")
    .update({ status: "failed", error_message: "Timed out after 10 minutes" })
    .eq("id", assetId);
  console.log(`[poll] Asset ${assetId} timed out`);
}

// ── Generate All (Prompts + Video + Image in one call) ──────
// POST /api/pipeline/generate-all { listingId }
app.post("/api/pipeline/generate-all", async (req, res) => {
  const { listingId } = req.body;
  if (!listingId) {
    res.status(400).json({ error: "listingId is required" });
    return;
  }

  try {
    // Step 1: Generate prompts (same logic as /api/prompts/generate)
    const [{ data: listing, error: listingError }, { data: enrichment }] =
      await Promise.all([
        supabase
          .from("listings")
          .select("*, contacts(name)")
          .eq("id", listingId)
          .single(),
        supabase
          .from("listing_enrichment")
          .select("geo, parcel, assessment, strata")
          .eq("listing_id", listingId)
          .maybeSingle(),
      ]);

    if (listingError || !listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const sellerName =
      listing.contacts &&
      typeof listing.contacts === "object" &&
      "name" in listing.contacts
        ? (listing.contacts as { name: string }).name
        : null;

    const parcel = enrichment?.parcel as Record<string, unknown> | null;
    const assessment = enrichment?.assessment as Record<string, unknown> | null;
    const strata = enrichment?.strata as Record<string, unknown> | null;
    const geo = enrichment?.geo as Record<string, unknown> | null;

    const context: ListingContext = {
      address: listing.address,
      listPrice: listing.list_price,
      notes: listing.notes,
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      sqft: listing.sqft ?? null,
      yearBuilt: listing.year_built ?? null,
      lotSize: parcel?.lot_size as string ?? null,
      propertyType: listing.property_type ?? null,
      features: listing.features ?? null,
      showingInstructions: listing.showing_instructions ?? null,
      mlsNumber: listing.mls_number ?? null,
      sellerName,
      neighbourhood: geo?.locality as string ?? null,
      zoning: parcel?.zoning as string ?? null,
      assessedValue: assessment?.total_value as number ?? null,
      strataFees: strata?.monthly_fees as number ?? null,
      lotDimensions: parcel?.lot_dimensions as string ?? null,
    };

    // Generate prompts + remarks in parallel
    const [contentPrompts, mlsRemarks] = await Promise.all([
      generateContentPrompts(context),
      generateMLSRemarks(context),
    ]);

    // Upsert prompts
    const { data: existing } = await supabase
      .from("prompts")
      .select("id")
      .eq("listing_id", listingId)
      .maybeSingle();

    const promptData = {
      video_prompt: contentPrompts.videoPrompt,
      image_prompt: contentPrompts.imagePrompt,
      ig_caption: contentPrompts.igCaption,
      mls_public: mlsRemarks.publicRemarks,
      mls_realtor: mlsRemarks.realtorRemarks,
    };

    let prompt;
    if (existing) {
      const { data } = await supabase
        .from("prompts")
        .update(promptData)
        .eq("id", existing.id)
        .select()
        .single();
      prompt = data;
    } else {
      const { data } = await supabase
        .from("prompts")
        .insert({ listing_id: listingId, ...promptData })
        .select()
        .single();
      prompt = data;
    }

    if (!prompt) {
      res.status(500).json({ error: "Failed to save prompts" });
      return;
    }

    // Step 2: Start video + image generation in parallel
    const results: {
      video?: { assetId: string; klingTaskId: string };
      image?: { assetId: string; klingTaskId: string };
    } = {};

    // Video — requires hero image
    const videoPromise = listing.hero_image_url
      ? (async () => {
          const klingTaskId = await startVideoGeneration({
            imageUrl: listing.hero_image_url!,
            prompt: prompt.video_prompt ?? "",
            aspectRatio: "9:16",
          });
          const { data: asset } = await supabase
            .from("media_assets")
            .insert({
              listing_id: listingId,
              prompt_id: prompt.id,
              asset_type: "video" as const,
              kling_task_id: klingTaskId,
              status: "processing" as const,
            })
            .select()
            .single();
          if (asset) {
            results.video = { assetId: asset.id, klingTaskId };
            // Fire background polling — don't await
            pollTaskUntilDone(asset.id, klingTaskId);
          }
        })()
      : Promise.resolve();

    // Image — text-to-image, no hero needed
    const imagePromise = (async () => {
      const klingTaskId = await startImageGeneration({
        prompt: prompt.image_prompt ?? "",
        aspectRatio: "1:1",
      });
      const { data: asset } = await supabase
        .from("media_assets")
        .insert({
          listing_id: listingId,
          prompt_id: prompt.id,
          asset_type: "image" as const,
          kling_task_id: klingTaskId,
          status: "processing" as const,
        })
        .select()
        .single();
      if (asset) {
        results.image = { assetId: asset.id, klingTaskId };
        // Fire background polling — don't await
        pollTaskUntilDone(asset.id, klingTaskId);
      }
    })();

    await Promise.all([videoPromise, imagePromise]);

    res.json({
      success: true,
      prompt,
      media: results,
      heroImageMissing: !listing.hero_image_url,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Pipeline failed",
    });
  }
});

// ── Start server ────────────────────────────────────────────
const PORT = process.env.PORT ?? 8769;
app.listen(PORT, () => {
  console.log(`Content Generator running on port ${PORT}`);
});
