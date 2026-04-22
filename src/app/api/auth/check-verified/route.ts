import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/auth/check-verified
 * Lightweight poll endpoint — verify page checks every 5s to detect
 * when the user clicks the email verification link in another tab.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ verified: false }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("email_verified")
    .eq("id", session.user.id)
    .single();

  return NextResponse.json({ verified: data?.email_verified === true });
}
