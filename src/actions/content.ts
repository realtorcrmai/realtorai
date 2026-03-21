"use server";

import { revalidatePath } from "next/cache";
import {
  generatePromptsSchema,
  updatePromptSchema,
  generateMediaSchema,
  generateAllSchema,
} from "@/lib/schemas";
import type { UpdatePromptData, GenerateMediaData } from "@/lib/schemas";

const CONTENT_SERVICE_URL =
  process.env.CONTENT_GENERATOR_URL ?? "http://localhost:8769";

export async function generatePrompts(formData: { listingId: string }) {
  const parsed = generatePromptsSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid listing ID" };
  }

  try {
    const res = await fetch(`${CONTENT_SERVICE_URL}/api/prompts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: parsed.data.listingId }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error ?? "Failed to generate prompts" };
    }

    revalidatePath("/content");
    revalidatePath(`/content/${parsed.data.listingId}`);
    return { success: true, prompt: data.prompt };
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

  try {
    const res = await fetch(
      `${CONTENT_SERVICE_URL}/api/prompts/${parsed.data.promptId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoPrompt: parsed.data.videoPrompt,
          imagePrompt: parsed.data.imagePrompt,
          mlsPublic: parsed.data.mlsPublic,
          mlsRealtor: parsed.data.mlsRealtor,
          igCaption: parsed.data.igCaption,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error ?? "Failed to update prompt" };
    }

    revalidatePath("/content");
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update prompt",
    };
  }
}

export async function startMediaGeneration(formData: GenerateMediaData) {
  const parsed = generateMediaSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid generation data" };
  }

  try {
    const res = await fetch(`${CONTENT_SERVICE_URL}/api/media/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: parsed.data.listingId,
        promptId: parsed.data.promptId,
        assetType: parsed.data.assetType,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error ?? "Failed to start media generation" };
    }

    revalidatePath("/content");
    revalidatePath(`/content/${parsed.data.listingId}`);
    return { success: true, assetId: data.assetId, klingTaskId: data.klingTaskId };
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
  try {
    const res = await fetch(
      `${CONTENT_SERVICE_URL}/api/media/${assetId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, outputUrl, errorMessage }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error ?? "Failed to update asset status" };
    }

    revalidatePath("/content");
    return { success: true };
  } catch (err) {
    return { error: "Failed to update asset status" };
  }
}

export async function generateAll(formData: { listingId: string }) {
  const parsed = generateAllSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid listing ID" };
  }

  try {
    const res = await fetch(
      `${CONTENT_SERVICE_URL}/api/pipeline/generate-all`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: parsed.data.listingId }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error ?? "Failed to generate all content" };
    }

    revalidatePath("/content");
    revalidatePath(`/content/${parsed.data.listingId}`);
    return {
      success: true,
      prompt: data.prompt,
      media: data.media,
      heroImageMissing: data.heroImageMissing,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to generate all content",
    };
  }
}

export async function updateHeroImage(
  listingId: string,
  heroImageUrl: string
) {
  try {
    const res = await fetch(
      `${CONTENT_SERVICE_URL}/api/listings/${listingId}/hero-image`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageUrl }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error ?? "Failed to update hero image" };
    }

    revalidatePath("/content");
    revalidatePath(`/content/${listingId}`);
    revalidatePath(`/listings/${listingId}`);
    return { success: true };
  } catch (err) {
    return { error: "Failed to update hero image" };
  }
}
