import { createClient } from "@supabase/supabase-js";
import { CRMData, RealtorProfile } from "../types.js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key);
}

/**
 * Fetch all CRM data needed for website generation.
 */
export async function fetchCRMData(
  siteId: string,
  listingIds?: string[],
  testimonialIds?: string[]
): Promise<CRMData> {
  const supabase = getSupabase();

  // Fetch site profile
  const { data: site } = await supabase
    .from("realtor_sites")
    .select("*")
    .eq("id", siteId)
    .single();

  if (!site) {
    throw new Error(`Site ${siteId} not found`);
  }

  const profile: RealtorProfile = {
    id: site.id,
    agent_name: site.agent_name,
    agent_title: site.agent_title,
    tagline: site.tagline,
    headshot_url: site.headshot_url,
    logo_url: site.logo_url,
    brokerage_name: site.brokerage_name,
    phone: site.phone,
    email: site.email,
    office_address: site.office_address,
    social_links: site.social_links || {},
    bio_short: site.bio_short,
    bio_full: site.bio_full,
    service_areas: site.service_areas || [],
    credentials: site.credentials || [],
  };

  // Fetch listings
  let listingsQuery = supabase
    .from("listings")
    .select("id, address, list_price, hero_image_url, status, mls_number")
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false })
    .limit(12);

  if (listingIds?.length) {
    listingsQuery = supabase
      .from("listings")
      .select("id, address, list_price, hero_image_url, status, mls_number")
      .in("id", listingIds);
  }

  const { data: listings } = await listingsQuery;

  // Fetch testimonials
  let testimonialsQuery = supabase
    .from("testimonials")
    .select("client_name, content, client_location, rating")
    .eq("site_id", siteId)
    .order("sort_order")
    .limit(6);

  if (testimonialIds?.length) {
    testimonialsQuery = supabase
      .from("testimonials")
      .select("client_name, content, client_location, rating")
      .in("id", testimonialIds);
  }

  const { data: testimonials } = await testimonialsQuery;

  // Fetch media
  const { data: media } = await supabase
    .from("site_media")
    .select("file_url, category")
    .eq("site_id", siteId)
    .in("category", ["hero", "gallery"])
    .order("sort_order")
    .limit(10);

  return {
    profile,
    listings: listings || [],
    testimonials: testimonials || [],
    media: media || [],
  };
}
