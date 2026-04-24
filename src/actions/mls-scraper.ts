"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────

export interface ScrapedListing {
  mlsNumber: string | null;
  address: string;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  listPrice: number | null;
  propertyType: string;
  description: string | null;
  heroImage: string | null;
  photos: string[];
  photoCount: number;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  landSize: string | null;
  annualTax: string | null;
  parkingType: string | null;
  parkingSpaces: number | null;
  heatingType: string | null;
  fireplaces: number | null;
  buildingStyle: string | null;
  architectureStyle: string | null;
  listingUrl: string;
  source: string;
}

// ─── URL validation & normalization ──────────────────

function isRealtorCaUrl(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return url.hostname.includes("realtor.ca");
  } catch {
    return false;
  }
}

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  return url;
}

// ─── Extract data from HTML ─────────────────────────

function extractJsonLd(html: string): Record<string, unknown> | null {
  const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractMeta(html: string, attr: string): string | null {
  // Match both property="X" and name="X" meta tags
  const pattern = new RegExp(
    `<meta[^>]*(?:property|name)=["']${attr}["'][^>]*content=["']([^"']*)["']` +
    `|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${attr}["']`,
    "i"
  );
  const match = html.match(pattern);
  return match ? (match[1] || match[2] || null) : null;
}

function extractFromTitle(title: string): { address: string | null; mlsNumber: string | null } {
  // Title format: "For sale: 2235 W 16TH AVENUE, Vancouver, British Columbia V6K3B4 - R3115412 | REALTOR.ca"
  const mlsMatch = title.match(/([A-Z]\d{5,10})\s*\|/);
  const addrMatch = title.match(/(?:For (?:sale|rent):\s*)?(.+?)\s*-\s*[A-Z]\d/i);
  return {
    address: addrMatch ? addrMatch[1].trim() : null,
    mlsNumber: mlsMatch ? mlsMatch[1] : null,
  };
}

function extractTextValue(text: string, key: string): string | null {
  // realtor.ca renders as "Key\nValue\n" pairs in the page text
  const pattern = new RegExp(key + "\\s*\\n([^\\n]+)", "i");
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function extractNumber(text: string, key: string): number | null {
  const val = extractTextValue(text, key);
  if (!val) return null;
  const num = val.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(num);
  return isNaN(parsed) ? null : parsed;
}

function extractImages(html: string, mlsNumber: string | null): string[] {
  // Extract all CDN image URLs
  const pattern = /https:\/\/cdn\.realtor\.ca\/listings\/[^"'\s)]+\.jpg/gi;
  const matches = html.match(pattern) || [];
  // Deduplicate and prefer highres
  const unique = [...new Set(matches)].filter(url => url.includes("highres"));
  return unique.length > 0 ? unique.slice(0, 20) : [...new Set(matches)].slice(0, 20);
}

function mapPropertyType(category: string | null, buildingType: string | null): string {
  const combined = ((category || "") + " " + (buildingType || "")).toLowerCase();
  if (combined.includes("condo") || combined.includes("apartment")) return "Condo/Apartment";
  if (combined.includes("townhouse") || combined.includes("row")) return "Townhouse";
  if (combined.includes("duplex") || combined.includes("triplex") || combined.includes("multi")) return "Multi-Family";
  if (combined.includes("land") || combined.includes("vacant")) return "Land";
  if (combined.includes("commercial") || combined.includes("office") || combined.includes("retail")) return "Commercial";
  return "Residential";
}

// ─── Main scraper ────────────────────────────────────

export async function scrapeRealtorCaListing(input: string): Promise<{ error?: string } & Partial<{ success: true; listing: ScrapedListing }>> {
  // Validate input
  const url = normalizeUrl(input);
  if (!isRealtorCaUrl(url)) {
    return { error: "Please enter a valid realtor.ca listing URL (e.g. https://www.realtor.ca/real-estate/12345678/...)" };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      if (res.status === 404) return { error: "Listing not found. It may have been removed from realtor.ca." };
      return { error: `Failed to fetch listing page (HTTP ${res.status})` };
    }

    const html = await res.text();

    // Check if listing exists
    if (html.includes("The listing you are looking for no longer exists")) {
      return { error: "This listing no longer exists on realtor.ca." };
    }

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "";
    const { address: titleAddress, mlsNumber: titleMls } = extractFromTitle(title);

    // Extract JSON-LD
    const jsonLd = extractJsonLd(html);

    // Extract meta description for beds/baths
    const metaDesc = extractMeta(html, "description") || "";
    const bedsMatch = metaDesc.match(/(\d+)\s*bedroom/i);
    const bathsMatch = metaDesc.match(/(\d+)\s*bathroom/i);

    // We need to extract the text content from the HTML for key-value pairs
    // Strip HTML tags to get text
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n");

    // Extract property details from text
    const buildingType = extractTextValue(textContent, "Building Type");
    const sqftText = extractTextValue(textContent, "Square Footage");
    const sqft = sqftText ? parseFloat(sqftText.replace(/[^0-9.]/g, "")) : null;
    const landSize = extractTextValue(textContent, "Land Size");
    const builtIn = extractTextValue(textContent, "Built in");
    const yearBuilt = builtIn ? parseInt(builtIn) : null;
    const annualTax = extractTextValue(textContent, "Annual Property Taxes");
    const parkingType = extractTextValue(textContent, "Parking Type");
    const totalParking = extractNumber(textContent, "Total Parking Spaces");
    const heatingType = extractTextValue(textContent, "Heating Type");
    const fireplaces = extractNumber(textContent, "Fireplace");
    const style = extractTextValue(textContent, "Style");
    const archStyle = extractTextValue(textContent, "Architecture Style");
    const totalBaths = extractNumber(textContent, "Total\n") || (bathsMatch ? parseInt(bathsMatch[1]) : null);

    // Build address
    const jsonLdName = jsonLd?.name as string | undefined;
    const address = jsonLdName || titleAddress || extractMeta(html, "og:description") || "Unknown Address";

    // Parse address parts
    const addrParts = address.split(",").map(s => s.trim());
    const province = addrParts.length >= 3 ? addrParts[addrParts.length - 1].replace(/\s*[A-Z]\d[A-Z]\s*\d[A-Z]\d\s*$/, "").trim() : null;
    const city = addrParts.length >= 2 ? addrParts[1] : null;
    const postalMatch = address.match(/([A-Z]\d[A-Z]\s*\d[A-Z]\d)/i);
    const postalCode = postalMatch ? postalMatch[1] : null;

    // Price
    const offers = (jsonLd?.offers as Array<{ price?: string }>) || [];
    const jsonLdPrice = offers[0]?.price ? parseFloat(offers[0].price) : null;

    // MLS number
    const mlsNumber = titleMls;

    // Images
    const images = extractImages(html, mlsNumber);
    const heroImage = (jsonLd?.image as string[])?.[0] || images[0] || extractMeta(html, "og:image") || null;

    // Property type
    const category = jsonLd?.category as string | undefined;
    const propertyType = mapPropertyType(category || null, buildingType);

    // Description
    const description = (jsonLd?.description as string) || null;

    const listing: ScrapedListing = {
      mlsNumber,
      address: address.replace(/\s*[A-Z]\d[A-Z]\s*\d[A-Z]\d\s*$/, "").trim(),
      city,
      province,
      postalCode,
      listPrice: jsonLdPrice,
      propertyType,
      description,
      heroImage,
      photos: images,
      photoCount: images.length,
      bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : null,
      bathrooms: totalBaths ? Math.round(totalBaths) : null,
      sqft: sqft && !isNaN(sqft) ? sqft : null,
      yearBuilt: yearBuilt && !isNaN(yearBuilt) ? yearBuilt : null,
      landSize,
      annualTax,
      parkingType,
      parkingSpaces: totalParking,
      heatingType,
      fireplaces: fireplaces ? Math.round(fireplaces) : null,
      buildingStyle: style,
      architectureStyle: archStyle,
      listingUrl: url,
      source: "realtor.ca",
    };

    return { success: true, listing };
  } catch (err) {
    return { error: `Failed to scrape listing: ${String(err)}` };
  }
}

// ─── Import scraped listing into CRM ─────────────────

export async function importScrapedListing(
  listing: ScrapedListing,
  sellerId: string,
  lockboxCode: string,
) {
  const supabase = await getAuthenticatedTenantClient();

  // Check for duplicate by MLS number
  if (listing.mlsNumber) {
    const { data: existing } = await supabase
      .from("listings")
      .select("id, address, mls_number")
      .eq("mls_number", listing.mlsNumber)
      .maybeSingle();

    if (existing) {
      return {
        error: `Listing with MLS# ${listing.mlsNumber} already exists (${existing.address})`,
        existing_id: existing.id,
      };
    }
  }

  // Map to CRM listing
  const listingData = {
    address: listing.address,
    seller_id: sellerId,
    lockbox_code: lockboxCode,
    mls_number: listing.mlsNumber,
    list_price: listing.listPrice,
    property_type: listing.propertyType,
    status: "active" as const,
    hero_image_url: listing.heroImage,
    notes: `Imported from ${listing.source} on ${new Date().toLocaleDateString("en-CA")}`,
  };

  // Insert listing
  const { data: created, error: insertError } = await supabase
    .from("listings")
    .insert(listingData)
    .select("id, address, mls_number")
    .single();

  if (insertError || !created) {
    return { error: `Failed to create listing: ${insertError?.message}` };
  }

  // Build enrichment data
  const enrichment: Record<string, string | number | null> = {};
  if (listing.city) enrichment.city = listing.city;
  if (listing.province) enrichment.province = listing.province;
  if (listing.postalCode) enrichment.postal_code = listing.postalCode;
  if (listing.bedrooms != null) enrichment.bedrooms = String(listing.bedrooms);
  if (listing.bathrooms != null) enrichment.bathrooms = String(listing.bathrooms);
  if (listing.sqft != null) enrichment.total_floor_area = String(listing.sqft);
  if (listing.yearBuilt != null) enrichment.year_built = String(listing.yearBuilt);
  if (listing.landSize) enrichment.lot_size = listing.landSize;
  if (listing.annualTax) enrichment.annual_taxes = listing.annualTax.replace(/[^0-9.]/g, "");
  if (listing.parkingType) enrichment.parking_type = listing.parkingType;
  if (listing.parkingSpaces != null) enrichment.total_parking = String(listing.parkingSpaces);
  if (listing.heatingType) enrichment.heating_type = listing.heatingType;
  if (listing.fireplaces != null) enrichment.num_fireplaces = String(listing.fireplaces);
  if (listing.buildingStyle) enrichment.dwelling_type = listing.buildingStyle;
  if (listing.architectureStyle) enrichment.dwelling_style = listing.architectureStyle;
  enrichment.scraped_from = listing.listingUrl;
  enrichment.scrape_date = new Date().toISOString();

  // Insert enrichment form_submission
  if (Object.keys(enrichment).length > 0) {
    await supabase.from("form_submissions").insert({
      listing_id: created.id,
      form_key: "step-data-enrichment",
      form_data: enrichment,
      status: "draft",
    });
  }

  // Insert MLS prep with description
  if (listing.description) {
    await supabase.from("form_submissions").insert({
      listing_id: created.id,
      form_key: "step-mls-prep",
      form_data: {
        property_description: listing.description,
        photo_count: String(listing.photoCount),
      },
      status: "draft",
    });
  }

  // Import photos
  if (listing.photos.length > 0) {
    const photoRows = listing.photos.map((url, i) => ({
      listing_id: created.id,
      photo_url: url,
      role: i === 0 ? "hero" : "gallery",
      sort_order: i,
      caption: null,
    }));

    await supabase.from("listing_photos").insert(photoRows);
  }

  revalidatePath("/listings");
  revalidatePath(`/listings/${created.id}`);

  return {
    success: true,
    id: created.id,
    address: created.address,
    mls_number: created.mls_number,
    enrichment_fields: Object.keys(enrichment).length,
    photos_imported: listing.photos.length,
  };
}
