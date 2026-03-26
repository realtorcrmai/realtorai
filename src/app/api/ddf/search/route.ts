import { NextRequest, NextResponse } from "next/server";
import { searchDDFListings, countDDFListings } from "@/actions/ddf";
import type { DDFSearchParams, DDFStandardStatus } from "@/types/ddf";

/**
 * GET /api/ddf/search — Search CREA DDF listings.
 *
 * Query params:
 *   city, province, status, minPrice, maxPrice, minBeds, minBaths,
 *   propertySubType, mlsNumber, modifiedSince, top, skip, orderBy, countOnly
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const params: DDFSearchParams = {
    city: sp.get("city") || undefined,
    province: sp.get("province") || undefined,
    status: (sp.get("status") as DDFStandardStatus) || undefined,
    minPrice: sp.has("minPrice") ? Number(sp.get("minPrice")) : undefined,
    maxPrice: sp.has("maxPrice") ? Number(sp.get("maxPrice")) : undefined,
    minBeds: sp.has("minBeds") ? Number(sp.get("minBeds")) : undefined,
    minBaths: sp.has("minBaths") ? Number(sp.get("minBaths")) : undefined,
    propertySubType: sp.get("propertySubType") || undefined,
    mlsNumber: sp.get("mlsNumber") || undefined,
    modifiedSince: sp.get("modifiedSince") || undefined,
    top: sp.has("top") ? Number(sp.get("top")) : 20,
    skip: sp.has("skip") ? Number(sp.get("skip")) : 0,
    orderBy: sp.get("orderBy") || undefined,
    count: sp.get("count") === "true",
  };

  // Count-only mode
  if (sp.get("countOnly") === "true") {
    const result = await countDDFListings(params);
    return NextResponse.json(result);
  }

  const result = await searchDDFListings(params);
  return NextResponse.json(result);
}
