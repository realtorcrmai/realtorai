import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { tenantClient } from "@/lib/supabase/tenant";
import { parseParagonPDF } from "@/lib/paragon/parse";

export const runtime = "nodejs";
// Vision call on a multi-page PDF can take 15–30s. Pro plan supports up to 60s.
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;
const BUCKET = "paragon-imports";

export async function POST(req: NextRequest) {
  const session = await auth();
  const realtorId = session?.user?.id;
  if (!realtorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File missing" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 15 MB)" }, { status: 413 });
  }
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Persist the PDF first — auto-deleted after 7 days by /api/cron/cleanup-paragon-pdfs.
  // Tenant scope is enforced by the object path (`<realtor_id>/<uuid>.pdf`) plus
  // the bucket's RLS policies; we go through the tenant wrapper to keep the
  // "no admin client in user-facing routes" rule honest.
  const objectId = randomUUID();
  const storagePath = `${realtorId}/${objectId}.pdf`;
  const tc = tenantClient(realtorId);

  const { error: uploadError } = await tc.raw.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("[parse-paragon] storage upload failed:", uploadError.message);
    // Non-fatal — continue with parse so realtor isn't blocked. Rescan won't work in this branch.
  }

  try {
    const parsed = await parseParagonPDF(buffer);
    return NextResponse.json({
      parsed,
      storagePath: uploadError ? null : storagePath,
    });
  } catch (err) {
    console.error("[parse-paragon] failed:", err);
    // Best-effort cleanup on parse failure so we don't keep PDFs we can't use.
    if (!uploadError) {
      await tc.raw.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    }
    return NextResponse.json(
      {
        error:
          "Could not read this PDF. Please verify it's a Paragon Listing Detail Report — or fill in the fields manually.",
      },
      { status: 422 }
    );
  }
}
