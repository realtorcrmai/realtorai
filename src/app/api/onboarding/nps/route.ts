import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { score } = await request.json();
    if (typeof score !== "number" || score < 1 || score > 5) {
      return NextResponse.json({ error: "Score must be 1-5" }, { status: 400 });
    }

    const supabase = createAdminClient();
    await supabase
      .from("users")
      .update({ onboarding_nps: score })
      .eq("id", session.user.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
