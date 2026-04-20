import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    display_name,
    title,
    website_url,
    physical_address,
    brand_color,
    tagline,
    service_areas,
    instagram_url,
    facebook_url,
    linkedin_url,
    twitter_url,
  } = body;

  const admin = createAdminClient();

  // Upsert brand profile (create if doesn't exist, update if it does)
  const { error } = await admin
    .from("realtor_brand_profiles")
    .upsert(
      {
        realtor_id: session.user.id,
        display_name: display_name || null,
        title: title || null,
        website_url: website_url || null,
        physical_address: physical_address || null,
        brand_color: brand_color || "#4f35d2",
        tagline: tagline || null,
        service_areas: Array.isArray(service_areas) ? service_areas.filter(Boolean) : [],
        instagram_url: instagram_url || null,
        facebook_url: facebook_url || null,
        linkedin_url: linkedin_url || null,
        twitter_url: twitter_url || null,
      },
      { onConflict: "realtor_id" }
    );

  if (error) {
    console.error("Brand profile save error:", error);
    return NextResponse.json({ error: "Failed to update brand profile" }, { status: 500 });
  }

  revalidatePath("/settings/profile");
  revalidatePath("/newsletters");
  return NextResponse.json({ success: true });
}
