import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDisposableEmail } from "@/lib/auth/disposable-check";

/**
 * Email availability check for inline signup validation.
 * Called with debounced 300ms from the signup form.
 * Returns: { available: true/false, signup_source?: string }
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 422 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check disposable domain
  if (isDisposableEmail(normalizedEmail)) {
    return NextResponse.json({
      available: false,
      reason: "disposable",
      message: "Temporary email services are not supported.",
    });
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("users")
    .select("signup_source")
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    return NextResponse.json({
      available: false,
      reason: "exists",
      signup_source: existing.signup_source,
    });
  }

  return NextResponse.json({ available: true });
}
