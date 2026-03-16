import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMLSRemarks } from "@/lib/anthropic/creative-director";

export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { listingId } = body;

    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid listingId" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("address, list_price, notes")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const remarks = await generateMLSRemarks({
      address: listing.address,
      listPrice: listing.list_price,
      notes: listing.notes,
    });

    return NextResponse.json(remarks);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate remarks",
      },
      { status: 500 }
    );
  }
}
