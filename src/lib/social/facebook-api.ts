// Realtors360 Social — Facebook / Meta Graph API Integration
// Handles Facebook Page + Instagram Business publishing via Meta Graph API v21

import type { MetaPageInfo, MetaPublishResult, MetaInsights } from "./types";

const META_API_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ============================================================
// OAuth Flow
// ============================================================

export function getMetaOAuthURL(redirectUri: string, state: string): string {
  const clientId = process.env.META_APP_ID || "";
  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "pages_manage_metadata",
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_insights",
  ].join(",");

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(
    `${META_BASE_URL}/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Meta OAuth error: ${err.error?.message || res.statusText}`);
  }

  return res.json();
}

export async function getLongLivedToken(
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(
    `${META_BASE_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Token exchange error: ${err.error?.message || res.statusText}`);
  }

  return res.json();
}

// ============================================================
// Page Management
// ============================================================

export async function getUserPages(userAccessToken: string): Promise<MetaPageInfo[]> {
  const res = await fetch(
    `${META_BASE_URL}/me/accounts?fields=id,name,access_token,category,picture{url},instagram_business_account&access_token=${userAccessToken}`
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to get pages: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.data || [];
}

// ============================================================
// Facebook Publishing
// ============================================================

export async function publishToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  options: {
    message: string;
    link?: string;
    imageUrl?: string;
    imageUrls?: string[]; // for multi-photo posts
  }
): Promise<MetaPublishResult> {
  // Single photo post
  if (options.imageUrl && !options.imageUrls?.length) {
    const res = await fetch(`${META_BASE_URL}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: options.imageUrl,
        caption: options.message,
        access_token: pageAccessToken,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Facebook publish error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      post_id: data.post_id,
      permalink_url: `https://www.facebook.com/${data.post_id || data.id}`,
    };
  }

  // Multi-photo post
  if (options.imageUrls && options.imageUrls.length > 0) {
    // Step 1: Upload each photo as unpublished
    const photoIds: string[] = [];
    for (const url of options.imageUrls.slice(0, 10)) {
      const res = await fetch(`${META_BASE_URL}/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          published: false,
          access_token: pageAccessToken,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        photoIds.push(data.id);
      }
    }

    // Step 2: Create multi-photo post
    const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));
    const res = await fetch(`${META_BASE_URL}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: options.message,
        attached_media: attachedMedia,
        access_token: pageAccessToken,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Facebook multi-photo error: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      permalink_url: `https://www.facebook.com/${data.id}`,
    };
  }

  // Text-only or link post
  const body: Record<string, string> = {
    message: options.message,
    access_token: pageAccessToken,
  };
  if (options.link) body.link = options.link;

  const res = await fetch(`${META_BASE_URL}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Facebook publish error: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    permalink_url: `https://www.facebook.com/${data.id}`,
  };
}

// ============================================================
// Instagram Publishing (via Meta Graph API)
// ============================================================

export async function publishToInstagram(
  igBusinessAccountId: string,
  pageAccessToken: string,
  options: {
    imageUrl?: string;
    imageUrls?: string[]; // carousel
    videoUrl?: string;
    caption: string;
    mediaType?: "IMAGE" | "CAROUSEL_ALBUM" | "REELS" | "STORIES";
  }
): Promise<MetaPublishResult> {
  const mediaType = options.mediaType || "IMAGE";

  // Single image
  if (mediaType === "IMAGE" && options.imageUrl) {
    // Step 1: Create media container
    const containerRes = await fetch(`${META_BASE_URL}/${igBusinessAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: options.imageUrl,
        caption: options.caption,
        access_token: pageAccessToken,
      }),
    });

    if (!containerRes.ok) {
      const err = await containerRes.json();
      throw new Error(`IG container error: ${err.error?.message || containerRes.statusText}`);
    }

    const container = await containerRes.json();

    // Step 2: Publish
    const publishRes = await fetch(`${META_BASE_URL}/${igBusinessAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: pageAccessToken,
      }),
    });

    if (!publishRes.ok) {
      const err = await publishRes.json();
      throw new Error(`IG publish error: ${err.error?.message || publishRes.statusText}`);
    }

    const published = await publishRes.json();
    return {
      id: published.id,
      permalink_url: `https://www.instagram.com/p/${published.id}/`,
    };
  }

  // Carousel
  if (mediaType === "CAROUSEL_ALBUM" && options.imageUrls && options.imageUrls.length >= 2) {
    // Step 1: Create individual media containers
    const childIds: string[] = [];
    for (const url of options.imageUrls.slice(0, 10)) {
      const res = await fetch(`${META_BASE_URL}/${igBusinessAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: url,
          is_carousel_item: true,
          access_token: pageAccessToken,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        childIds.push(data.id);
      }
    }

    // Step 2: Create carousel container
    const carouselRes = await fetch(`${META_BASE_URL}/${igBusinessAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption: options.caption,
        access_token: pageAccessToken,
      }),
    });

    if (!carouselRes.ok) {
      const err = await carouselRes.json();
      throw new Error(`IG carousel error: ${err.error?.message || carouselRes.statusText}`);
    }

    const carousel = await carouselRes.json();

    // Step 3: Publish carousel
    const publishRes = await fetch(`${META_BASE_URL}/${igBusinessAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: carousel.id,
        access_token: pageAccessToken,
      }),
    });

    if (!publishRes.ok) {
      const err = await publishRes.json();
      throw new Error(`IG carousel publish error: ${err.error?.message || publishRes.statusText}`);
    }

    const published = await publishRes.json();
    return { id: published.id };
  }

  // Reels (video)
  if ((mediaType === "REELS" || mediaType === "STORIES") && options.videoUrl) {
    const containerRes = await fetch(`${META_BASE_URL}/${igBusinessAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_url: options.videoUrl,
        caption: options.caption,
        media_type: mediaType,
        access_token: pageAccessToken,
      }),
    });

    if (!containerRes.ok) {
      const err = await containerRes.json();
      throw new Error(`IG video error: ${err.error?.message || containerRes.statusText}`);
    }

    const container = await containerRes.json();

    // Poll for video processing completion
    let status = "IN_PROGRESS";
    let attempts = 0;
    while (status === "IN_PROGRESS" && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const statusRes = await fetch(
        `${META_BASE_URL}/${container.id}?fields=status_code&access_token=${pageAccessToken}`
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        status = statusData.status_code || "FINISHED";
      }
      attempts++;
    }

    if (status !== "FINISHED") {
      throw new Error(`Video processing timed out (status: ${status})`);
    }

    // Publish
    const publishRes = await fetch(`${META_BASE_URL}/${igBusinessAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: pageAccessToken,
      }),
    });

    if (!publishRes.ok) {
      const err = await publishRes.json();
      throw new Error(`IG video publish error: ${err.error?.message || publishRes.statusText}`);
    }

    const published = await publishRes.json();
    return { id: published.id };
  }

  throw new Error(`Unsupported media type: ${mediaType}`);
}

// ============================================================
// Engagement / Insights
// ============================================================

export async function getPostInsights(
  postId: string,
  accessToken: string,
  platform: "facebook" | "instagram"
): Promise<MetaInsights> {
  if (platform === "facebook") {
    const res = await fetch(
      `${META_BASE_URL}/${postId}?fields=insights.metric(post_impressions,post_engagements,post_clicks)&access_token=${accessToken}`
    );
    if (!res.ok) return { impressions: 0, reach: 0, engagement: 0, clicks: 0 };
    const data = await res.json();
    const insights = data.insights?.data || [];
    return {
      impressions: insights.find((i: { name: string }) => i.name === "post_impressions")?.values?.[0]?.value || 0,
      reach: 0,
      engagement: insights.find((i: { name: string }) => i.name === "post_engagements")?.values?.[0]?.value || 0,
      clicks: insights.find((i: { name: string }) => i.name === "post_clicks")?.values?.[0]?.value || 0,
    };
  }

  // Instagram insights
  const res = await fetch(
    `${META_BASE_URL}/${postId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${accessToken}`
  );
  if (!res.ok) return { impressions: 0, reach: 0, engagement: 0, clicks: 0 };
  const data = await res.json();
  const metrics = data.data || [];
  const getValue = (name: string) => metrics.find((m: { name: string }) => m.name === name)?.values?.[0]?.value || 0;

  return {
    impressions: getValue("impressions"),
    reach: getValue("reach"),
    engagement: getValue("likes") + getValue("comments") + getValue("shares") + getValue("saved"),
    clicks: 0,
  };
}

// ============================================================
// Token Validation
// ============================================================

export async function validateToken(accessToken: string): Promise<boolean> {
  const res = await fetch(
    `${META_BASE_URL}/debug_token?input_token=${accessToken}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data.data?.is_valid === true;
}

export async function getTokenExpiry(accessToken: string): Promise<Date | null> {
  const res = await fetch(
    `${META_BASE_URL}/debug_token?input_token=${accessToken}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.data?.expires_at) {
    return new Date(data.data.expires_at * 1000);
  }
  return null;
}
