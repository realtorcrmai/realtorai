import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hash } from "bcryptjs";
import { getUserFeatures } from "@/lib/features";
import { generateMagicLinkToken } from "@/lib/auth/verification";
import { renderVerifyEmail } from "@/lib/auth/verify-email-template";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { sendEmail } from "@/lib/resend";
import { isDisposableEmail } from "@/lib/auth/disposable-check";

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
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!checkRateLimit(`signup:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, password, turnstileToken } = body;

    // Validation — only 3 required fields (S1)
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Name is required (min 2 characters)" }, { status: 422 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 422 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 422 });
    }

    // Reject disposable/temporary email domains
    if (isDisposableEmail(email)) {
      return NextResponse.json({ error: "Temporary email services are not supported. Please use a permanent email." }, { status: 422 });
    }

    // Turnstile CAPTCHA verification (fails open if not configured)
    if (turnstileToken) {
      const turnstileValid = await verifyTurnstile(turnstileToken, ip);
      if (!turnstileValid) {
        return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 422 });
      }
    } else if (process.env.TURNSTILE_SECRET_KEY) {
      // If Turnstile is configured but no token was sent, reject
      return NextResponse.json({ error: "CAPTCHA verification required." }, { status: 422 });
    }

    // Admin client required — no authenticated session exists during signup
    const supabase = createAdminClient();  
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    const features = getUserFeatures("free");

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        email: normalizedEmail,
        name: name.trim(),
        password_hash: passwordHash,
        role: "realtor",
        plan: "free",
        enabled_features: features,
        signup_source: "email",
        email_verified: false,
        is_active: true,
        onboarding_completed: false,
        personalization_completed: false,
      })
      .select("id, email, name, plan, trial_ends_at")
      .single();

    if (insertError) {
      console.error("[signup] Error:", insertError.message);
      return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
    }

    // Send verification email (non-blocking — don't fail signup if email fails)
    let emailSent = false;
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const { token, tokenHash } = generateMagicLinkToken();

      const tokenPayload = {
        user_id: newUser.id,
        identifier: normalizedEmail,
        type: "email",
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
      };
      const { error } = await supabase.from("verification_tokens").insert(tokenPayload);
      if (error) {
        console.error("[signup] Failed to insert verification token:", error.message);
      }

      const verifyUrl = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(normalizedEmail)}`;
      const html = renderVerifyEmail({ name: name.trim(), verifyUrl });
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@realtors360.com";

      await sendEmail({
        to: normalizedEmail,
        from: `Magnate <${fromEmail}>`,
        subject: "Verify your email — Magnate",
        html,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("[signup] Verification email failed (non-blocking):", emailErr instanceof Error ? emailErr.message : emailErr);
    }

    return NextResponse.json({
      success: true,
      requiresVerification: emailSent,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: "free",
      },
      message: emailSent
        ? "Account created. Please check your email to verify."
        : "Account created. You can verify your email later from settings.",
    }, { status: 201 });

  } catch (err) {
    console.error("[signup] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
