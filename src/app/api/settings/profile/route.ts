import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone, brokerage, license_number, bio, timezone, family_info } = body;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc.raw
    .from("users")
    .update({
      name,
      phone: phone || null,
      brokerage: brokerage || null,
      license_number: license_number || null,
      bio: bio || null,
      timezone: timezone || "America/Vancouver",
      family_info: family_info || null,
    })
    .eq("id", session.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
