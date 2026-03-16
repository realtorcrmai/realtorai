"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  generatePromptsSchema,
  updatePromptSchema,
  generateMediaSchema,
} from "@/lib/schemas";
import {
  generateContentPrompts,
  generateMLSRemarks,
} from "@/lib/anthropic/creative-director";
import {
  startVideoGeneration,
  startImageGeneration,
} from "@/lib/kling/client";
import type { UpdatePromptData, GenerateMediaData } from "@/lib/schemas";

export async function generatePrompts(formData: { listingId: string }) {
  const parsed = generatePromptsSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid listing ID" };
  }

  const supabase = createAdminClient();
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*, contacts(name)")
    .eq("id", parsed.data.listingId)
    .single();

  if (listingError || !listing) {
    return { error: "Listing not found" };
  }

  try {
    const [contentPrompts, mlsRemarks] = await Promise.all([
      generateContentPrompts({
        address: listing.address,
        listPrice: listing.list_price,
        notes: listing.notes,
      }),
      generateMLSRemarks({
        address: listing.address,
        listPrice: listing.list_price,
        notes: listing.notes,
      }),
    ]);

    // Check if a prompt row already exists for this listing
    const { data: existing } = await supabase
      .from("prompts")
      .select("id")
      .eq("listing_id", parsed.data.listingId)
      .maybeSingle();

    let prompt;
    let saveError;

    if (existing) {
      // Update existing row
      const { data, error } = await supabase
        .from("prompts")
        .update({
          video_prompt: contentPrompts.videoPrompt,
          image_prompt: contentPrompts.imagePrompt,
          ig_caption: contentPrompts.igCaption,
          mls_public: mlsRemarks.publicRemarks,
          mls_realtor: mlsRemarks.realtorRemarks,
        })
        .eq("id", existing.id)
        .select()
        .single();
      prompt = data;
      saveError = error;
    } else {
      // Insert new row
      const { data, error } = await supabase
        .from("prompts")
        .insert({
          listing_id: parsed.data.listingId,
          video_prompt: contentPrompts.videoPrompt,
          image_prompt: contentPrompts.imagePrompt,
          ig_caption: contentPrompts.igCaption,
          mls_public: mlsRemarks.publicRemarks,
          mls_realtor: mlsRemarks.realtorRemarks,
        })
        .select()
        .single();
      prompt = data;
      saveError = error;
    }

    if (saveError) {
      return { error: "Failed to save prompts: " + saveError.message };
    }

    revalidatePath("/content");
    revalidatePath(`/content/${parsed.data.listingId}`);
    return { success: true, prompt };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to generate prompts",
    };
  }
}

export async function updatePrompt(formData: UpdatePromptData) {
  const parsed = updatePromptSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid prompt data" };
  }

  const supabase = createAdminClient();

  const updateData: Record<string, string | null> = {};
  if (parsed.data.videoPrompt !== undefined)
    updateData.video_prompt = parsed.data.videoPrompt ?? null;
  if (parsed.data.imagePrompt !== undefined)
    updateData.image_prompt = parsed.data.imagePrompt ?? null;
  if (parsed.data.mlsPublic !== undefined)
    updateData.mls_public = parsed.data.mlsPublic ?? null;
  if (parsed.data.mlsRealtor !== undefined)
    updateData.mls_realtor = parsed.data.mlsRealtor ?? null;
  if (parsed.data.igCaption !== undefined)
    updateData.ig_caption = parsed.data.igCaption ?? null;

  const { error } = await supabase
    .from("prompts")
    .update(updateData)
    .eq("id", parsed.data.promptId);

  if (error) {
    return { error: "Failed to update prompt: " + error.message };
  }

  revalidatePath("/content");
  return { success: true };
}

export async function startMediaGeneration(formData: GenerateMediaData) {
  const parsed = generateMediaSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid generation data" };
  }

  const supabase = createAdminClient();

  const { data: prompt } = await supabase
    .from("prompts")
    .select("*")
    .eq("id", parsed.data.promptId)
    .single();

  if (!prompt) {
    return { error: "Prompt not found" };
  }

  try {
    let klingTaskId: string;

    if (parsed.data.assetType === "video") {
      const { data: listing } = await supabase
        .from("listings")
        .select("hero_image_url")
        .eq("id", parsed.data.listingId)
        .single();

      if (!listing?.hero_image_url) {
        return { error: "Hero image required for video generation" };
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
        listing_id: parsed.data.listingId,
        prompt_id: parsed.data.promptId,
        asset_type: parsed.data.assetType,
        kling_task_id: klingTaskId,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      return { error: "Failed to save asset: " + insertError.message };
    }

    revalidatePath("/content");
    revalidatePath(`/content/${parsed.data.listingId}`);
    return { success: true, assetId: asset.id, klingTaskId };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to start media generation",
    };
  }
}

export async function updateMediaAssetStatus(
  assetId: string,
  status: string,
  outputUrl?: string,
  errorMessage?: string
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("media_assets")
    .update({
      status,
      output_url: outputUrl ?? null,
      error_message: errorMessage ?? null,
    })
    .eq("id", assetId);

  if (error) {
    return { error: "Failed to update asset status" };
  }

  revalidatePath("/content");
  return { success: true };
}

export async function updateHeroImage(
  listingId: string,
  heroImageUrl: string
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("listings")
    .update({ hero_image_url: heroImageUrl })
    .eq("id", listingId);

  if (error) {
    return { error: "Failed to update hero image" };
  }

  revalidatePath("/content");
  revalidatePath(`/content/${listingId}`);
  revalidatePath(`/listings/${listingId}`);
  return { success: true };
}
