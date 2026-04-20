"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BrandProfile {
  id?: string;
  realtor_id?: string;
  display_name: string | null;
  title: string | null;
  headshot_url: string | null;
  logo_url: string | null;
  brokerage_logo_url: string | null;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  physical_address: string | null;
  brand_color: string;
  instagram_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  tagline: string | null;
  service_areas: string[];
  brokerage_name: string | null;
}

const DEFAULTS: Omit<BrandProfile, "id" | "realtor_id"> = {
  display_name: null,
  title: "REALTOR®",
  headshot_url: null,
  logo_url: null,
  brokerage_logo_url: null,
  website_url: null,
  phone: null,
  email: null,
  physical_address: null,
  brand_color: "#4f35d2",
  instagram_url: null,
  facebook_url: null,
  linkedin_url: null,
  twitter_url: null,
  tagline: null,
  service_areas: [],
  brokerage_name: null,
};

export async function getBrandProfile(): Promise<BrandProfile | null> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { data, error } = await tc.raw
      .from("realtor_brand_profiles")
      .select("*")
      .eq("realtor_id", tc.realtorId)
      .maybeSingle();

    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}

export async function saveBrandProfile(
  profile: Omit<BrandProfile, "id" | "realtor_id">
): Promise<{ success: boolean; error?: string }> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const admin = createAdminClient();

    // Upsert on realtor_id
    const { error } = await admin
      .from("realtor_brand_profiles")
      .upsert(
        {
          realtor_id: tc.realtorId,
          ...profile,
          // Normalise service_areas — split comma string if someone passes one
          service_areas: Array.isArray(profile.service_areas)
            ? profile.service_areas.filter(Boolean)
            : [],
        },
        { onConflict: "realtor_id" }
      );

    if (error) return { success: false, error: error.message };

    revalidatePath("/newsletters/settings");
    revalidatePath("/newsletters");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

/** Upload a brand asset (logo / headshot / brokerage logo) to Supabase storage.
 *  Returns the public URL or an error. */
export async function uploadBrandAsset(
  formData: FormData,
  bucket: "logos" | "headshots"
): Promise<{ url?: string; error?: string }> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const admin = createAdminClient();
    const file = formData.get("file") as File | null;

    if (!file) return { error: "No file provided" };
    if (file.size > 5 * 1024 * 1024) return { error: "File must be under 5 MB" };
    if (!["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(file.type)) {
      return { error: "Unsupported format — use JPG, PNG, WebP, or SVG" };
    }

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${tc.realtorId}/${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (uploadError) return { error: uploadError.message };

    const { data } = admin.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
}
