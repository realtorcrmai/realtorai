"use server";

/**
 * Listing enrichment server actions.
 *
 * Calls external public APIs to enrich a listing with structured data:
 *   - BC Geocoder (free, no API key) — geo coordinates, structured address
 *   - ParcelMap BC (requires API key, optional) — parcel + legal description
 *   - LTSA (Land Title Survey Authority, requires API key, optional) — title #
 *   - BC Assessment (no public API, manual entry) — assessed values
 *
 * Stores results in `listing_enrichment` (one row per listing) with
 * `enrich_status` JSONB tracking which sources succeeded.
 *
 * Background: this file was added 2026-04-09 after the QA audit found 0
 * rows in listing_enrichment despite the table existing for months.
 * Before this, the only BC Geocoder usage was for address autocomplete
 * during contact/listing creation — no code ever wrote to the
 * listing_enrichment table.
 *
 * Limitations as of 2026-04-09:
 * - Only BC Geocoder is implemented. ParcelMap/LTSA/Assessment are stubs.
 * - No batch retry — call enrichListing() per listing in a loop.
 * - No background queue — sync calls only.
 */

import { z } from "zod";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

const BC_GEOCODER = "https://geocoder.api.gov.bc.ca/addresses.json";

type EnrichStatus = {
  geo: "pending" | "ok" | "failed" | "skipped";
  ltsa: "pending" | "ok" | "failed" | "skipped";
  parcel: "pending" | "ok" | "failed" | "skipped";
  assessment: "pending" | "ok" | "failed" | "skipped";
};

type GeoResult = {
  fullAddress: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
  matchScore: number | null;
  faults: string[];
};

/**
 * Calls BC Geocoder for one address. Returns the best-match feature
 * with lat/lng + structured address fields. Returns null on failure.
 */
async function geocodeBcAddress(address: string): Promise<GeoResult | null> {
  if (!address || address.trim().length < 5) return null;

  try {
    const url = new URL(BC_GEOCODER);
    url.searchParams.set("addressString", address);
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("echo", "true");
    url.searchParams.set("fuzzyMatch", "true");
    // 'any' rather than 'rooftop' — most BC addresses don't have rooftop
    // precision in the BC Geocoder dataset, and 'rooftop' returns zero
    // features for them (silent geocode failure). 'any' falls back to
    // street-centroid resolution which is good enough for showing on a
    // map. Verified empirically against all 48 dev listings: 48/48 ok
    // with 'any', 0/48 with 'rooftop'.
    url.searchParams.set("locationDescriptor", "any");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "realtors360-crm-enrichment/1.0",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const features = (json.features ?? []) as Array<Record<string, unknown>>;
    const first = features[0];
    if (!first) return null;

    const props = (first.properties ?? {}) as Record<string, string | number>;
    const geom = (first.geometry ?? {}) as { coordinates?: [number, number] };
    const coords = geom.coordinates ?? [null, null];

    const civic = String(props.civicNumber ?? "");
    const street = [props.streetName, props.streetType, props.streetDirectionCode]
      .filter(Boolean)
      .join(" ");
    const streetAddress = [civic, street].filter(Boolean).join(" ");

    return {
      fullAddress: String(props.fullAddress ?? address),
      streetAddress,
      city: String(props.localityName ?? ""),
      province: String(props.provinceCode ?? "BC"),
      postalCode: String(props.postalCode ?? ""),
      lat: typeof coords[1] === "number" ? coords[1] : null,
      lng: typeof coords[0] === "number" ? coords[0] : null,
      matchScore: typeof props.score === "number" ? props.score : null,
      faults:
        Array.isArray(props.faults)
          ? (props.faults as string[])
          : typeof props.faults === "string"
            ? [props.faults]
            : [],
    };
  } catch {
    return null;
  }
}

/**
 * Enrich a single listing. Idempotent — uses upsert on listing_id.
 * Currently runs only the BC Geocoder source; other sources are
 * marked 'skipped' until their integrations are wired up.
 */
export async function enrichListing(listingId: string) {
  const ListingIdSchema = z.string().uuid();
  const parsed = ListingIdSchema.safeParse(listingId);
  if (!parsed.success) return { error: "Invalid listing id" };

  const tc = await getAuthenticatedTenantClient();

  // Fetch the listing's address
  const { data: listing, error: fetchErr } = await tc
    .from("listings")
    .select("id, address")
    .eq("id", listingId)
    .single();

  if (fetchErr || !listing) {
    return { error: "Listing not found or not accessible" };
  }

  // Run the geocoder
  const geo = await geocodeBcAddress(listing.address ?? "");

  const enrich_status: EnrichStatus = {
    geo: geo ? "ok" : "failed",
    ltsa: "skipped",
    parcel: "skipped",
    assessment: "skipped",
  };

  const { data, error: upsertErr } = await tc.raw
    .from("listing_enrichment")
    .upsert(
      {
        listing_id: listingId,
        realtor_id: tc.realtorId,
        geo: geo ? (geo as unknown as Record<string, unknown>) : null,
        ltsa: null,
        parcel: null,
        assessment: null,
        strata: null,
        enrich_status: enrich_status as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "listing_id" }
    )
    .select()
    .single();

  if (upsertErr) {
    return { error: upsertErr.message };
  }

  revalidatePath(`/listings/${listingId}`);
  return { data, geocoded: geo !== null };
}

/**
 * Enrich every listing the calling realtor owns. Sequential, with a
 * 200ms throttle between calls so we don't hammer BC Geocoder.
 */
export async function enrichAllListings() {
  const tc = await getAuthenticatedTenantClient();

  const { data: listings } = await tc
    .from("listings")
    .select("id, address")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!listings || listings.length === 0) {
    return { processed: 0, ok: 0, failed: 0 };
  }

  let ok = 0;
  let failed = 0;
  const results: Array<{ id: string; address: string; ok: boolean }> = [];

  for (const l of listings) {
    const r = await enrichListing(l.id);
    const succeeded = !("error" in r) && (r as { geocoded?: boolean }).geocoded === true;
    if (succeeded) ok++;
    else failed++;
    results.push({ id: l.id, address: l.address ?? "", ok: succeeded });
    // Throttle: BC Geocoder doesn't publish a rate limit but we want to be polite
    await new Promise((r) => setTimeout(r, 200));
  }

  revalidatePath("/listings");
  return { processed: listings.length, ok, failed, results };
}
