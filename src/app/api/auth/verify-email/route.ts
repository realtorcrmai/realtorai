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

  // Already verified — skip to phone
  if (user.email_verified) {
    return NextResponse.redirect(`${appUrl}/verify/phone`);
  }

  // Find valid (non-expired) token
  const { data: tokenRecord } = await supabase
    .from("verification_tokens")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "email")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!tokenRecord) {
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

  // Log event
  await supabase.from("signup_events").insert({
    user_id: user.id,
    event: "email_verified",
  });

  // Redirect to phone verification
  return NextResponse.redirect(`${appUrl}/verify/phone`);
}
