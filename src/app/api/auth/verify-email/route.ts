import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTokenHash } from "@/lib/auth/verification";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const email = request.nextUrl.searchParams.get("email");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!token || !email) {
    return NextResponse.redirect(`${appUrl}/verify?error=invalid`);
  }

  const supabase = createAdminClient();
  const normalizedEmail = decodeURIComponent(email).toLowerCase().trim();

  // Find the user
  const { data: user } = await supabase
    .from("users")
    .select("id, email_verified")
    .eq("email", normalizedEmail)
    .single();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/verify?error=not_found`);
  }

  // Already verified — skip to onboarding/dashboard
  if (user.email_verified) {
    return NextResponse.redirect(`${appUrl}/onboarding`);
  }

  // Find valid (non-expired) token
  const now = new Date().toISOString();
  const { data: tokenRecord, error: tokenError } = await supabase
    .from("verification_tokens")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "email")
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!tokenRecord) {
    // Debug: check if ANY tokens exist for this user (even expired)
    const { data: allTokens } = await supabase
      .from("verification_tokens")
      .select("id, expires_at, created_at")
      .eq("user_id", user.id)
      .eq("type", "email")
      .order("created_at", { ascending: false })
      .limit(3);
    console.error("[verify-email] No valid token found.", {
      userId: user.id,
      now,
      tokenError: tokenError?.message,
      allTokensForUser: allTokens,
    });
    return NextResponse.redirect(`${appUrl}/verify?error=expired`);
  }

  // Verify token hash (constant-time comparison)
  if (!verifyTokenHash(token, tokenRecord.token_hash)) {
    return NextResponse.redirect(`${appUrl}/verify?error=invalid`);
  }

  // Mark email as verified
  await supabase
    .from("users")
    .update({ email_verified: true })
    .eq("id", user.id);

  // Delete used token
  await supabase
    .from("verification_tokens")
    .delete()
    .eq("id", tokenRecord.id);

  // Log event (non-critical — don't block verification on logging failure)
  const { error } = await supabase.from("signup_events").insert({ user_id: user.id, event: "email_verified" });
  if (error) console.error("Failed to log verification event:", error.message);

  // Now that email is confirmed, send Day 0 welcome drip
  const { data: verifiedUser } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();
  import("@/actions/drip").then(({ sendDripEmail }) => {
    sendDripEmail(user.id, normalizedEmail, verifiedUser?.name || "", 0).catch(console.error);
  });

  // Redirect to onboarding (email verified → continue signup flow)
  return NextResponse.redirect(`${appUrl}/onboarding`);
}
