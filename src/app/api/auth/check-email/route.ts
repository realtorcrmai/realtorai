import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDisposableEmail } from "@/lib/auth/disposable-check";
import { checkApiRateLimit } from "@/lib/api-rate-limit";

/**
 * Email availability check for inline signup validation.
 * Called with debounced 300ms from the signup form.
 * Returns: { available: true/false }
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkApiRateLimit(ip, "check-email");
  if (!rateCheck.allowed) {
    return new NextResponse("Too many requests.", { status: 429 });
  }

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
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    return NextResponse.json({
      available: false,
    });
  }

  return NextResponse.json({ available: true });
}
