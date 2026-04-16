import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

const REPLIERS_BASE = "https://api.repliers.io";

/**
 * Proxy search to Repliers MLS API.
 * Keeps the API key server-side and adds auth check.
 */
export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const apiKey = process.env.REPLIERS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "REPLIERS_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Forward supported query params
  const sp = req.nextUrl.searchParams;
  const params = new URLSearchParams();

  const passthrough = [
    "city",
    "area",
    "state",
    "zip",
    "neighborhood",
    "minPrice",
    "maxPrice",
    "minBedrooms",
    "maxBedrooms",
    "minBathrooms",
    "maxBathrooms",
    "minSqft",
    "maxSqft",
    "class",
    "propertyType",
    "status",
    "sortBy",
    "pageNum",
    "resultsPerPage",
  ];

  for (const key of passthrough) {
    const val = sp.get(key);
    if (val) params.set(key, val);
  }

  // Defaults
  if (!params.has("resultsPerPage")) params.set("resultsPerPage", "12");
  if (!params.has("pageNum")) params.set("pageNum", "1");
  if (!params.has("status")) params.set("status", "A");

  try {
    const res = await fetch(`${REPLIERS_BASE}/listings?${params.toString()}`, {
      headers: { "REPLIERS-API-KEY": apiKey },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Repliers API error: ${res.status}`, details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach Repliers API" },
      { status: 502 }
    );
  }
}
