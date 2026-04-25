import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { tenantClient } from "@/lib/supabase/tenant";
import { parseParagonPDF } from "@/lib/paragon/parse";

export const runtime = "nodejs";
// Vision call on a multi-page PDF can take 15–30s. Pro plan supports up to 60s.
export const maxDuration = 60;

const BUCKET = "paragon-imports";

/**
 * POST /api/listings/reparse-paragon
 * Body: { storagePath: string }
 *
 * Re-parses an already-uploaded Paragon PDF when the realtor rejects the first
 * extraction. Uses temperature 0.4 to nudge variation (deterministic re-runs
 * would just produce the same wrong answer).
 *
 * Tenant safety: the storage path must start with `${realtorId}/` — we never
 * read another realtor's PDF even if a path is forged.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const realtorId = session?.user?.id;
  if (!realtorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { storagePath?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const storagePath = body.storagePath;
  if (typeof storagePath !== "string" || storagePath.length === 0) {
    return NextResponse.json({ error: "storagePath is required" }, { status: 400 });
  }

  // Tenant scope: object naming is `<realtor_id>/<uuid>.pdf`.
  if (!storagePath.startsWith(`${realtorId}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Tenant scope is already enforced by the path check above; we go through the
  // tenant wrapper to keep the "no admin client in user-facing routes" rule honest.
  const tc = tenantClient(realtorId);
  const { data, error: downloadError } = await tc.raw.storage
    .from(BUCKET)
    .download(storagePath);

  if (downloadError || !data) {
    // PDFs are auto-deleted after 7 days. Treat both "missing" and "expired" as 404.
    return NextResponse.json(
      {
        error:
          "We couldn't find that PDF — it may have expired (we keep them for 7 days). Upload it again to re-parse.",
      },
      { status: 404 }
    );
  }

  const buffer = Buffer.from(await data.arrayBuffer());

  try {
    const parsed = await parseParagonPDF(buffer, { temperature: 0.4 });
    return NextResponse.json({ parsed, storagePath });
  } catch (err) {
    console.error("[reparse-paragon] failed:", err);
    return NextResponse.json(
      {
        error:
          "Couldn't re-read this PDF. It may not be a Paragon Listing Detail Report — try a different export.",
      },
      { status: 422 }
    );
  }
}
