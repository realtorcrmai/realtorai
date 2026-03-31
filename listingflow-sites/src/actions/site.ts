"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { clearSiteCache } from "@/lib/site-config";

export async function createSite(formData: {
  user_email: string;
  agent_name: string;
  subdomain: string;
  template?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  brokerage_name?: string;
  bio_short?: string;
}) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("realtor_sites")
    .insert({
      user_email: formData.user_email,
      agent_name: formData.agent_name,
      subdomain: formData.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      template: formData.template || "modern",
      tagline: formData.tagline || null,
      phone: formData.phone || null,
      email: formData.email || null,
      brokerage_name: formData.brokerage_name || null,
      bio_short: formData.bio_short || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true, site: data };
}

export async function updateSite(
  siteId: string,
  updates: Record<string, unknown>
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("realtor_sites")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", siteId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  clearSiteCache();
  revalidatePath("/");
  return { success: true, site: data };
}

export async function publishSite(siteId: string) {
  return updateSite(siteId, { is_published: true });
}

export async function unpublishSite(siteId: string) {
  return updateSite(siteId, { is_published: false });
}

export async function getMySite(userEmail: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("realtor_sites")
    .select("*")
    .eq("user_email", userEmail)
    .maybeSingle();

  return data;
}
