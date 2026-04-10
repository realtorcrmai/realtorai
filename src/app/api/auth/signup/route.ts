import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hash } from "bcryptjs";
import { getUserFeatures } from "@/lib/features";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

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

    // All new users get 14-day Professional trial (S7)
    const trialPlan = "professional";
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const features = getUserFeatures(trialPlan);

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        email: normalizedEmail,
        name: name.trim(),
        password_hash: passwordHash,
        role: "realtor",
        plan: "free",
        trial_plan: trialPlan,
        trial_ends_at: trialEndsAt,
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

    // Send Day 0 welcome drip email (D1) — fire and forget
    import("@/actions/drip").then(({ sendDripEmail }) => {
      sendDripEmail(newUser.id, normalizedEmail, name.trim(), 0).catch(console.error);
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: trialPlan,
        trialEndsAt: newUser.trial_ends_at,
      },
      message: "Account created with 14-day Professional trial.",
    }, { status: 201 });

  } catch (err) {
    console.error("[signup] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
