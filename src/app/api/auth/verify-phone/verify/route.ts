import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTokenHash } from "@/lib/auth/verification";
import { auth } from "@/lib/auth";

// Rate limiter — in-memory Map, resets on server restart
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (entry.count >= maxRequests) return false; // blocked
  entry.count++;
  return true; // allowed
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!checkRateLimit(`verify-phone:${session.user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 1 hour." }, { status: 429 });
  }

  const { otp } = await request.json();
  if (!otp || typeof otp !== "string" || otp.length !== 6) {
    return NextResponse.json({ error: "Invalid code format" }, { status: 422 });
  }

  const supabase = createAdminClient();

  // Find latest valid phone token
  const { data: tokenRecord } = await supabase
    .from("verification_tokens")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("type", "phone")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!tokenRecord) {
    return NextResponse.json(
      { error: "Code expired. Request a new one." },
      { status: 410 }
    );
  }

  // Check lockout (5 failed attempts → 30 min cooldown)
  if (tokenRecord.attempts >= tokenRecord.max_attempts) {
    const lockoutEnd = new Date(
      new Date(tokenRecord.created_at).getTime() + 30 * 60 * 1000
    );
    if (new Date() < lockoutEnd) {
      return NextResponse.json(
        {
          error: `Too many attempts. Try again at ${lockoutEnd.toLocaleTimeString("en-CA", { timeZone: "America/Vancouver", hour: "numeric", minute: "2-digit" })}`,
          locked: true,
        },
        { status: 429 }
      );
    }
  }

  // Verify OTP (constant-time comparison)
  if (!verifyTokenHash(otp, tokenRecord.token_hash)) {
    // Increment attempt counter
    await supabase
      .from("verification_tokens")
      .update({ attempts: tokenRecord.attempts + 1 })
      .eq("id", tokenRecord.id);

    const remaining = tokenRecord.max_attempts - tokenRecord.attempts - 1;
    return NextResponse.json(
      { error: "Incorrect code. Try again.", remaining },
      { status: 422 }
    );
  }

  // Success — verify phone and activate account
  await supabase
    .from("users")
    .update({ phone_verified: true, is_active: true })
    .eq("id", session.user.id);

  // Delete used token
  await supabase
    .from("verification_tokens")
    .delete()
    .eq("id", tokenRecord.id);

  // Log events
  await supabase.from("signup_events").insert([
    { user_id: session.user.id, event: "phone_verified" },
    { user_id: session.user.id, event: "account_activated" },
  ]);

  return NextResponse.json({ success: true, verified: true });
}
