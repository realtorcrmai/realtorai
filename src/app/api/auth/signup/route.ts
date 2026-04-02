import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hash } from "bcryptjs";
import { getUserFeatures } from "@/lib/features";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone, brokerage, license_number, plan } = body;

    // Validation
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

    // Hash password
    const passwordHash = await hash(password, 12);

    // Determine plan
    const selectedPlan = plan === "professional" ? "professional" : "free";
    const features = getUserFeatures(selectedPlan);

    // Create user
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        email: normalizedEmail,
        name: name.trim(),
        password_hash: passwordHash,
        phone: phone?.trim() || null,
        brokerage: brokerage?.trim() || null,
        license_number: license_number?.trim() || null,
        role: "realtor",
        plan: selectedPlan,
        enabled_features: features,
        signup_source: "email",
        email_verified: false,
        is_active: true,
      })
      .select("id, email, name, plan")
      .single();

    if (insertError) {
      console.error("[signup] Error:", insertError.message);
      return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        plan: newUser.plan,
      },
      message: "Account created successfully. Please sign in.",
    }, { status: 201 });

  } catch (err) {
    console.error("[signup] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
