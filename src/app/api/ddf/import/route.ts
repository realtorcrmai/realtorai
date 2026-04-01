import { NextRequest, NextResponse } from "next/server";
import { importDDFListing } from "@/actions/ddf";

/**
 * POST /api/ddf/import — Import a DDF listing into the CRM.
 *
 * Body: { listingKey?: string, mlsNumber?: string }
 * One of listingKey or mlsNumber is required.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { listingKey, mlsNumber } = body as {
    listingKey?: string;
    mlsNumber?: string;
  };

  if (!listingKey && !mlsNumber) {
    return NextResponse.json(
      { error: "Either listingKey or mlsNumber is required" },
      { status: 400 }
    );
  }

  const identifier = mlsNumber || listingKey!;
  const lookupBy = mlsNumber ? "mls" : "key";

  const result = await importDDFListing(identifier, lookupBy as "key" | "mls");

  if ("error" in result) {
    const status = (result.error ?? "").includes("already exists") ? 409 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
