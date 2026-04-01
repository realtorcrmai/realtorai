"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import type {
  SocialBrandKit,
  ContentType,
  SocialPlatform,
  PostStatus,
  ContentGenerationRequest,
  GeneratedContent,
} from "@/lib/social/types";

// ============================================================
// Brand Kit Actions
// ============================================================

export async function saveBrandKit(data: Partial<SocialBrandKit>) {
  const tc = await getAuthenticatedTenantClient();

  const { data: existing } = await tc
    .from("social_brand_kits")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    const { error } = await tc
      .from("social_brand_kits")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await tc
      .from("social_brand_kits")
      .insert({
        user_email: data.email || "demo@realtors360.com",
        ...data,
      });
    if (error) return { error: error.message };
  }

  revalidatePath("/social");
  return { success: true };
}

export async function getBrandKit(): Promise<SocialBrandKit | null> {
  const tc = await getAuthenticatedTenantClient();
  const { data } = await tc
    .from("social_brand_kits")
    .select("*")
    .limit(1)
    .single();
  return data;
}

// ============================================================
// Content Generation Actions
// ============================================================

export async function generateSocialContent(request: ContentGenerationRequest) {
  const tc = await getAuthenticatedTenantClient();

  try {
    const { generateContentForPlatforms } = await import("@/lib/social/content-generator");
    const generated = await generateContentForPlatforms(request);

    // Create draft post
    const { data: post, error } = await tc
      .from("social_posts")
      .insert({
        brand_kit_id: request.brand_kit.id,
        content_type: request.content_type,
        caption: generated.facebook?.caption || generated.instagram?.caption || "",
        caption_original: generated.facebook?.caption || generated.instagram?.caption || "",
        hashtags: generated.facebook?.hashtags || generated.instagram?.hashtags || [],
        media_urls: request.listing?.images?.slice(0, 5) || [],
        media_type: "image",
        source_type: request.listing ? "listing" : request.testimonial ? "testimonial" : "manual",
        source_id: request.listing?.id || null,
        source_data: request.listing || request.testimonial || request.market_data || {},
        target_platforms: request.target_platforms,
        platform_variants: generated,
        status: "draft",
        ai_generated: true,
        ai_model: "claude-sonnet-4-20250514",
        ai_prompt: request.custom_prompt || `Generate ${request.content_type} content`,
        includes_brokerage: (generated.facebook?.caption || "").includes(request.brand_kit.brokerage_name || ""),
      })
      .select()
      .single();

    if (error) return { error: error.message };

    // Score the content
    try {
      const { scoreContent } = await import("@/lib/social/content-scorer");
      const score = await scoreContent(post.caption || "", request.brand_kit);
      await tc
        .from("social_posts")
        .update({
          content_score: score.overall,
          content_score_breakdown: score,
        })
        .eq("id", post.id);
    } catch {
      // scoring is optional, don't fail the generation
    }

    // Log to audit
    await tc.from("social_audit_log").insert({
      brand_kit_id: request.brand_kit.id,
      post_id: post.id,
      action: "generated",
      actor: "ai",
      original_caption: post.caption,
      metadata: { content_type: request.content_type, platforms: request.target_platforms },
    });

    // Track usage
    const month = new Date().toISOString().slice(0, 7) + "-01";
    try {
      await tc
        .from("social_usage_tracking")
        .upsert(
          {
            brand_kit_id: request.brand_kit.id,
            month,
            captions_generated: 1,
          },
          { onConflict: "brand_kit_id,month" }
        );
    } catch {
      // usage tracking is optional
    }

    revalidatePath("/social");
    return { success: true, post };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Content generation failed" };
  }
}

// ============================================================
// Post Management Actions
// ============================================================

export async function approvePost(postId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("social_posts")
    .update({
      status: "approved" as PostStatus,
      approved_at: new Date().toISOString(),
      approved_by: "demo@realtors360.com",
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (error) return { error: error.message };

  // Log approval
  await tc.from("social_audit_log").insert({
    brand_kit_id: (await tc.from("social_posts").select("brand_kit_id").eq("id", postId).single()).data?.brand_kit_id,
    post_id: postId,
    action: "approved",
    actor: "demo@realtors360.com",
  });

  revalidatePath("/social");
  return { success: true };
}

export async function skipPost(postId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("social_posts")
    .update({
      status: "skipped" as PostStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (error) return { error: error.message };

  await tc.from("social_audit_log").insert({
    brand_kit_id: (await tc.from("social_posts").select("brand_kit_id").eq("id", postId).single()).data?.brand_kit_id,
    post_id: postId,
    action: "skipped",
    actor: "demo@realtors360.com",
  });

  revalidatePath("/social");
  return { success: true };
}

export async function regeneratePost(postId: string) {
  const tc = await getAuthenticatedTenantClient();

  // Get original post data
  const { data: post } = await tc
    .from("social_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (!post) return { error: "Post not found" };

  // Get brand kit
  const { data: brandKit } = await tc
    .from("social_brand_kits")
    .select("*")
    .eq("id", post.brand_kit_id)
    .single();

  if (!brandKit) return { error: "Brand kit not found" };

  // Regenerate content
  const request: ContentGenerationRequest = {
    brand_kit: brandKit,
    content_type: post.content_type as ContentType,
    listing: post.source_type === "listing" ? post.source_data as ContentGenerationRequest["listing"] : undefined,
    target_platforms: post.target_platforms as SocialPlatform[],
    custom_prompt: `Regenerate this content with a different angle. Previous caption was: "${post.caption}"`,
  };

  try {
    const { generateContentForPlatforms } = await import("@/lib/social/content-generator");
    const generated = await generateContentForPlatforms(request);

    const newCaption = generated.facebook?.caption || generated.instagram?.caption || "";

    await tc
      .from("social_posts")
      .update({
        caption: newCaption,
        caption_original: newCaption,
        hashtags: generated.facebook?.hashtags || generated.instagram?.hashtags || [],
        platform_variants: generated,
        status: "draft",
        ai_prompt: request.custom_prompt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    await tc.from("social_audit_log").insert({
      brand_kit_id: post.brand_kit_id,
      post_id: postId,
      action: "regenerated",
      actor: "demo@realtors360.com",
      original_caption: post.caption,
      edited_caption: newCaption,
    });

    revalidatePath("/social");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Regeneration failed" };
  }
}

export async function updatePostCaption(postId: string, newCaption: string) {
  const tc = await getAuthenticatedTenantClient();

  // Get original for voice learning
  const { data: post } = await tc
    .from("social_posts")
    .select("caption, caption_original, brand_kit_id")
    .eq("id", postId)
    .single();

  if (!post) return { error: "Post not found" };

  await tc
    .from("social_posts")
    .update({
      caption: newCaption,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  // Log edit for voice learning
  if (post.caption_original && post.caption_original !== newCaption) {
    await tc.from("social_audit_log").insert({
      brand_kit_id: post.brand_kit_id,
      post_id: postId,
      action: "edited",
      actor: "demo@realtors360.com",
      original_caption: post.caption_original,
      edited_caption: newCaption,
    });
  }

  revalidatePath("/social");
  return { success: true };
}

export async function schedulePost(postId: string, scheduledAt: string) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("social_posts")
    .update({
      status: "scheduled" as PostStatus,
      scheduled_at: scheduledAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);

  if (error) return { error: error.message };

  revalidatePath("/social");
  return { success: true };
}

export async function deletePost(postId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("social_posts")
    .delete()
    .eq("id", postId);

  if (error) return { error: error.message };

  revalidatePath("/social");
  return { success: true };
}

export async function bulkApprovePosts(postIds: string[]) {
  const tc = await getAuthenticatedTenantClient();
  const now = new Date().toISOString();

  const { error } = await tc
    .from("social_posts")
    .update({
      status: "approved" as PostStatus,
      approved_at: now,
      approved_by: "demo@realtors360.com",
      updated_at: now,
    })
    .in("id", postIds);

  if (error) return { error: error.message };

  revalidatePath("/social");
  return { success: true, count: postIds.length };
}

// ============================================================
// Custom Draft Creation
// ============================================================

export async function createCustomDraft(params: {
  brandKitId: string;
  caption: string;
  contentType: ContentType;
  targetPlatforms: SocialPlatform[];
}) {
  const supabase = createAdminClient();

  const { data: post, error } = await supabase
    .from("social_posts")
    .insert({
      brand_kit_id: params.brandKitId,
      content_type: params.contentType,
      caption: params.caption,
      caption_original: params.caption,
      hashtags: [],
      media_urls: [],
      media_type: "image",
      source_type: "manual",
      target_platforms: params.targetPlatforms,
      platform_variants: {},
      status: "draft" as PostStatus,
      ai_generated: false,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Log to audit trail
  await supabase.from("social_audit_log").insert({
    brand_kit_id: params.brandKitId,
    post_id: post.id,
    action: "created",
    actor: "demo@realtors360.com",
    metadata: { content_type: params.contentType, platforms: params.targetPlatforms, source: "manual_draft" },
  });

  revalidatePath("/social");
  return { success: true, post };
}

// ============================================================
// Disconnect Social Account
// ============================================================

export async function disconnectSocialAccount(accountId: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Get account info before updating for audit log
  const { data: account } = await supabase
    .from("social_accounts")
    .select("brand_kit_id, platform, account_name")
    .eq("id", accountId)
    .single();

  const { error } = await supabase
    .from("social_accounts")
    .update({
      connection_status: "disconnected",
      is_active: false,
      updated_at: now,
    })
    .eq("id", accountId);

  if (error) return { error: error.message };

  // Log to audit trail
  if (account) {
    await supabase.from("social_audit_log").insert({
      brand_kit_id: account.brand_kit_id,
      action: "account_disconnected",
      actor: "demo@realtors360.com",
      metadata: {
        account_id: accountId,
        platform: account.platform,
        account_name: account.account_name,
      },
    });
  }

  revalidatePath("/social");
  return { success: true };
}
