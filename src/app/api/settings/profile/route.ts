import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone, brokerage, license_number, bio, timezone } = body;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      name,
      phone: phone || null,
      brokerage: brokerage || null,
      license_number: license_number || null,
      bio: bio || null,
      timezone: timezone || "America/Vancouver",
    })
    .eq("id", session.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
