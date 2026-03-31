import { createAdminClient } from "@/lib/supabase/admin";
import type { RealtorSite } from "@/types";

const configCache = new Map<string, { site: RealtorSite; ts: number }>();
const CACHE_TTL = 60_000; // 60 seconds

export async function getSiteConfig(
  hostOrSlug: string
): Promise<RealtorSite | null> {
  const cached = configCache.get(hostOrSlug);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.site;
  }

  const supabase = createAdminClient();

  // Try subdomain first, then custom domain
  const { data } = await supabase
    .from("realtor_sites")
    .select("*")
    .or(`subdomain.eq.${hostOrSlug},custom_domain.eq.${hostOrSlug}`)
    .eq("is_published", true)
    .maybeSingle();

  if (data) {
    configCache.set(hostOrSlug, { site: data as RealtorSite, ts: Date.now() });
  }

  return (data as RealtorSite) ?? null;
}

export async function getSiteConfigById(
  siteId: string
): Promise<RealtorSite | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("realtor_sites")
    .select("*")
    .eq("id", siteId)
    .maybeSingle();

  return (data as RealtorSite) ?? null;
}

export function clearSiteCache(hostOrSlug?: string) {
  if (hostOrSlug) {
    configCache.delete(hostOrSlug);
  } else {
    configCache.clear();
  }
}
