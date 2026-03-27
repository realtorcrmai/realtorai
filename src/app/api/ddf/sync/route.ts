import { NextRequest, NextResponse } from "next/server";
import { syncDDFListing } from "@/actions/ddf";

/**
 * POST /api/ddf/sync — Re-sync an existing CRM listing from DDF.
 *
 * Body: { listingId: string }
 * Merges fresh DDF data into the listing's enrichment and MLS prep.
 * Existing manually-entered enrichment fields are preserved (DDF overwrites only DDF fields).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { listingId } = body as { listingId?: string };

  if (!listingId) {
    return NextResponse.json(
      { error: "listingId is required" },
      { status: 400 }
    );
  }

  const result = await syncDDFListing(listingId);

  if ("error" in result) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
