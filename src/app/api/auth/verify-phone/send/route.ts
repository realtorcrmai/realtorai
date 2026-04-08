import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOtp } from "@/lib/auth/verification";
import { sendOtpSms } from "@/lib/auth/otp";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { phone } = await request.json();

  // Validate and normalize to E.164
  const clean = (phone || "").replace(/\D/g, "");
  if (clean.length < 10 || clean.length > 15) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 422 });
  }
  const e164 = clean.startsWith("1") ? `+${clean}` : `+1${clean}`;

  const supabase = createAdminClient();

  // Check for duplicate phone (different user)
  const { data: existingPhone } = await supabase
    .from("users")
    .select("id, email")
    .eq("phone", e164)
    .neq("id", session.user.id)
    .single();

  if (existingPhone) {
    const maskedEmail = existingPhone.email.replace(
      /(.{2})(.*)(@.*)/,
      "$1***$3"
    );
    return NextResponse.json(
      {
        error: `This phone is already registered to ${maskedEmail}`,
        duplicate: true,
      },
      { status: 409 }
    );
  }

  // Rate limit: max 5 OTP sends per user per hour
  const { count } = await supabase
    .from("verification_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .eq("type", "phone")
    .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  if ((count || 0) >= 5) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 1 hour." },
      { status: 429 }
    );
  }

  // Invalidate previous phone tokens
  await supabase
    .from("verification_tokens")
    .delete()
    .eq("user_id", session.user.id)
    .eq("type", "phone");

  // Generate and store OTP
  const { otp, otpHash } = generateOtp();
  await supabase.from("verification_tokens").insert({
    user_id: session.user.id,
    type: "phone",
    token_hash: otpHash,
    identifier: e164,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  // Store phone on user (unverified)
  await supabase
    .from("users")
    .update({ phone: e164 })
    .eq("id", session.user.id);

  // Send via Twilio
  await sendOtpSms(e164, otp);

  // Log event
  await supabase.from("signup_events").insert({
    user_id: session.user.id,
    event: "phone_sent",
    metadata: { phone: e164 },
  });

  return NextResponse.json({ success: true, phone: e164 });
}
