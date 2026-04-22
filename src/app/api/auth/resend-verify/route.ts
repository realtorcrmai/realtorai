import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMagicLinkToken } from "@/lib/auth/verification";
import { renderVerifyEmail } from "@/lib/auth/verify-email-template";
import { sendEmail } from "@/lib/resend";

/**
 * POST /api/auth/resend-verify
 * Resends the email verification link. Requires an active session.
 * Rate limited: max 1 per 60 seconds per user (enforced client-side + server-side).
 */

const resendMap = new Map<string, number>();

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = session.user.email;
  const userId = session.user.id || "";

  // Rate limit: 1 per 60 seconds
  const lastSent = resendMap.get(userId);
  if (lastSent && Date.now() - lastSent < 60_000) {
    const waitSeconds = Math.ceil((60_000 - (Date.now() - lastSent)) / 1000);
    return NextResponse.json(
      { error: `Please wait ${waitSeconds} seconds before requesting another email.` },
      { status: 429 }
    );
  }

  const supabase = createAdminClient();

  // Check if already verified
  const { data: user } = await supabase
    .from("users")
    .select("email_verified, name")
    .eq("id", userId)
    .single();

  if (user?.email_verified) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  // Generate new token (invalidates previous by using latest)
  const { token, tokenHash } = generateMagicLinkToken();
  const { error: tokenInsertError } = await supabase.from("verification_tokens").insert({
    user_id: userId,
    type: "email",
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });

  if (tokenInsertError) {
    console.error("[resend-verify] Failed to insert token:", tokenInsertError.message);
    return NextResponse.json({ error: "Failed to generate verification link" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const html = renderVerifyEmail({ name: user?.name || "there", verifyUrl });
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@realtors360.com";

  await sendEmail({
    to: email,
    from: `Magnate <${fromEmail}>`,
    subject: "Verify your email — Magnate",
    html,
  });

  resendMap.set(userId, Date.now());

  return NextResponse.json({ success: true });
}
