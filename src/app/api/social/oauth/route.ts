import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserPages,
} from "@/lib/social/facebook-api";
import { encrypt } from "@/lib/social/crypto";

// GET /api/social/oauth?code=XXX&state=facebook
// Handles OAuth callback from Meta (Facebook + Instagram)
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/social?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/social?error=missing_code", request.url)
    );
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/social/oauth`;

    // Exchange code for short-lived token
    const { access_token: shortToken } = await exchangeCodeForToken(code, redirectUri);

    // Exchange for long-lived token (60 days)
    const { access_token: longToken, expires_in } = await getLongLivedToken(shortToken);

    // Get user's Facebook pages (with Instagram accounts)
    const pages = await getUserPages(longToken);

    if (!pages.length) {
      return NextResponse.redirect(
        new URL("/social?error=no_pages", request.url)
      );
    }

    const supabase = createAdminClient();

    // Get or create brand kit
    let { data: brandKit } = await supabase
      .from("social_brand_kits")
      .select("id")
      .limit(1)
      .single();

    if (!brandKit) {
      const { data: newKit } = await supabase
        .from("social_brand_kits")
        .insert({ user_email: "demo@realtors360.com" })
        .select("id")
        .single();
      brandKit = newKit;
    }

    if (!brandKit) {
      return NextResponse.redirect(
        new URL("/social?error=brand_kit_failed", request.url)
      );
    }

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Save each Facebook page as a connected account
    for (const page of pages) {
      await supabase.from("social_accounts").upsert(
        {
          brand_kit_id: brandKit.id,
          platform: "facebook",
          platform_account_id: page.id,
          account_name: page.name,
          account_type: "page",
          profile_url: `https://www.facebook.com/${page.id}`,
          profile_image_url: page.picture?.data?.url || null,
          access_token_encrypted: encrypt(page.access_token),
          token_expires_at: tokenExpiresAt,
          token_scopes: ["pages_manage_posts", "pages_read_engagement"],
          connection_status: "connected",
          is_active: true,
        },
        { onConflict: "brand_kit_id,platform,platform_account_id" }
      );

      // If page has Instagram business account, save that too
      if (page.instagram_business_account?.id) {
        await supabase.from("social_accounts").upsert(
          {
            brand_kit_id: brandKit.id,
            platform: "instagram",
            platform_account_id: page.instagram_business_account.id,
            account_name: `${page.name} (Instagram)`,
            account_type: "business",
            access_token_encrypted: encrypt(page.access_token), // Same token works for IG
            token_expires_at: tokenExpiresAt,
            token_scopes: ["instagram_basic", "instagram_content_publish", "instagram_manage_insights"],
            connection_status: "connected",
            is_active: true,
          },
          { onConflict: "brand_kit_id,platform,platform_account_id" }
        );
      }
    }

    return NextResponse.redirect(
      new URL("/social?connected=facebook", request.url)
    );
  } catch (err) {
    console.error("OAuth error:", err);
    return NextResponse.redirect(
      new URL(`/social?error=${encodeURIComponent(err instanceof Error ? err.message : "oauth_failed")}`, request.url)
    );
  }
}
