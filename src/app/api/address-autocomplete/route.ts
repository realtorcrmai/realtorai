import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

const BC_GEOCODER = "https://geocoder.api.gov.bc.ca/addresses.json";

export type AddressSuggestion = {
  fullAddress: string;
  streetAddress: string; // civic + street (no city/province)
  city: string;
  province: string;
  postalCode: string;
};

/**
 * GET /api/address-autocomplete?q=123+Main
 * Proxies to the BC Geocoder (free, no API key required).
 * Returns structured suggestions including city, province, postal code.
 */
export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const url = new URL(BC_GEOCODER);
    url.searchParams.set("addressString", q);
    url.searchParams.set("autoComplete", "true");
    url.searchParams.set("maxResults", "6");
    url.searchParams.set("echo", "true");
    url.searchParams.set("fuzzyMatch", "true");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const json = await res.json();
    const features: unknown[] = json.features ?? [];

    const suggestions: AddressSuggestion[] = features
      .map((f) => {
        const props = (f as Record<string, unknown>).properties as Record<string, string> | undefined;
        if (!props?.fullAddress) return null;

        const civic = props.civicNumber ?? "";
        const street = [props.streetName, props.streetType, props.streetDirectionCode]
          .filter(Boolean)
          .join(" ");
        const streetAddress = [civic, street].filter(Boolean).join(" ");

        return {
          fullAddress: props.fullAddress,
          streetAddress,
          city: props.localityName ?? "",
          province: props.provinceCode ?? "BC",
          postalCode: props.postalCode ?? "",
        } satisfies AddressSuggestion;
      })
      .filter((s): s is AddressSuggestion => s !== null)
      .slice(0, 5);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
