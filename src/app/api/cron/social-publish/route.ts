import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/social/crypto";
import { publishToFacebookPage, publishToInstagram } from "@/lib/social/facebook-api";

// GET /api/cron/social-publish
// Runs every 5 minutes to publish scheduled posts
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Find posts scheduled in the next 5 minutes (or overdue)
  const { data: duePosts } = await supabase
    .from("social_posts")
    .select("*")
    .in("status", ["scheduled", "approved"])
    .lte("scheduled_at", fiveMinFromNow)
    .order("scheduled_at", { ascending: true })
    .limit(20);

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ published: 0, message: "No posts due" });
  }

  let publishedCount = 0;
  let failedCount = 0;

  for (const post of duePosts) {
    // Mark as publishing
    await supabase
      .from("social_posts")
      .update({ status: "publishing", updated_at: now })
      .eq("id", post.id);

    const platforms = post.target_platforms || [];

    for (const platform of platforms) {
      // Find connected account for this platform
      const { data: account } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("brand_kit_id", post.brand_kit_id)
        .eq("platform", platform)
        .eq("is_active", true)
        .eq("connection_status", "connected")
        .limit(1)
        .single();

      if (!account) {
        await supabase.from("social_post_publishes").insert({
          post_id: post.id,
          account_id: "00000000-0000-0000-0000-000000000000",
          platform,
          status: "failed",
          error_message: `No connected ${platform} account`,
        });
        continue;
      }

      let accessToken: string;
      try {
        accessToken = decrypt(account.access_token_encrypted);
      } catch (decryptErr) {
        const decryptErrMsg = decryptErr instanceof Error ? decryptErr.message : "Unknown decryption error";
        console.error(`[social-publish] Token decryption failed for account ${account.id} (${platform}):`, decryptErrMsg);
        await supabase.from("social_post_publishes").insert({
          post_id: post.id,
          account_id: account.id,
          platform,
          status: "failed",
          error_message: `Token decryption failed for ${platform} account — reconnect required`,
        });
        failedCount++;
        continue;
      }

      try {
        const variant = post.platform_variants?.[platform] || {};
        const caption = variant.caption || post.caption || "";
        const hashtags = variant.hashtags || post.hashtags || [];
        const fullCaption = `${caption}\n\n${hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ")}`;

        let result;

        if (platform === "facebook") {
          result = await publishToFacebookPage(
            account.platform_account_id,
            accessToken,
            {
              message: fullCaption,
              imageUrl: post.media_urls?.[0],
              imageUrls: post.media_urls?.length > 1 ? post.media_urls : undefined,
            }
          );
        } else if (platform === "instagram") {
          const mediaType = post.media_type === "carousel" ? "CAROUSEL_ALBUM" :
                           post.media_type === "video" || post.media_type === "reel" ? "REELS" :
                           "IMAGE";
          result = await publishToInstagram(
            account.platform_account_id,
            accessToken,
            {
              imageUrl: post.media_urls?.[0],
              imageUrls: mediaType === "CAROUSEL_ALBUM" ? post.media_urls : undefined,
              videoUrl: mediaType === "REELS" ? post.media_urls?.[0] : undefined,
              caption: fullCaption,
              mediaType,
            }
          );
        } else {
          // Other platforms not yet supported
          await supabase.from("social_post_publishes").insert({
            post_id: post.id,
            account_id: account.id,
            platform,
            status: "failed",
            error_message: `${platform} publishing not yet implemented`,
          });
          continue;
        }

        // Save publish record
        await supabase.from("social_post_publishes").insert({
          post_id: post.id,
          account_id: account.id,
          platform,
          platform_post_id: result.id,
          platform_url: result.permalink_url,
          status: "published",
          published_at: now,
        });

        publishedCount++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        await supabase.from("social_post_publishes").insert({
          post_id: post.id,
          account_id: account.id,
          platform,
          status: "failed",
          error_message: errorMessage,
          retry_count: 1,
          next_retry_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
        failedCount++;
      }
    }

    // Update post status
    const allPublishes = await supabase
      .from("social_post_publishes")
      .select("status")
      .eq("post_id", post.id);

    const allFailed = allPublishes.data?.every(p => p.status === "failed");
    const anyPublished = allPublishes.data?.some(p => p.status === "published");

    await supabase
      .from("social_posts")
      .update({
        status: allFailed ? "failed" : anyPublished ? "published" : "publishing",
        published_at: anyPublished ? now : null,
        updated_at: now,
      })
      .eq("id", post.id);

    // Log to audit
    await supabase.from("social_audit_log").insert({
      brand_kit_id: post.brand_kit_id,
      post_id: post.id,
      action: anyPublished ? "published" : "failed",
      actor: "system",
      metadata: { platforms, publishedCount, failedCount },
    });
  }

  return NextResponse.json({
    published: publishedCount,
    failed: failedCount,
    total: duePosts.length,
  });
}
