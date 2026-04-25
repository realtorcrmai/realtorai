import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/cron/cleanup-paragon-pdfs
 *
 * Deletes Paragon PDFs older than 7 days from the `paragon-imports` bucket.
 * Layout: paragon-imports/<realtor_id>/<uuid>.pdf
 *
 * Auth: Bearer CRON_SECRET (matches all other crons in vercel.json).
 * Schedule: daily at 05:00 UTC (see vercel.json crons).
 */

const BUCKET = "paragon-imports";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  // Bearer guard — same shape as the other crons. Guard against undefined
  // env so a misconfigured deploy can't be bypassed with `Bearer undefined`.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = Date.now() - TTL_MS;

  // Walk realtor folders, then files inside each folder. Storage's list() is
  // not recursive, so we have to do two levels (the layout is fixed at depth 2).
  const { data: realtorFolders, error: rootError } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1000 });

  if (rootError) {
    console.error("[cleanup-paragon-pdfs] root list failed:", rootError.message);
    return NextResponse.json({ error: "Failed to list bucket" }, { status: 500 });
  }

  const toDelete: string[] = [];
  let scanned = 0;

  for (const folder of realtorFolders ?? []) {
    // Folders show up with `id === null` in supabase-storage list output.
    if (folder.id !== null) continue;

    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(folder.name, { limit: 1000 });

    if (listError) {
      console.error(
        `[cleanup-paragon-pdfs] list ${folder.name} failed:`,
        listError.message
      );
      continue;
    }

    for (const f of files ?? []) {
      scanned += 1;
      const created = f.created_at ? new Date(f.created_at).getTime() : NaN;
      if (Number.isFinite(created) && created < cutoff) {
        toDelete.push(`${folder.name}/${f.name}`);
      }
    }
  }

  if (toDelete.length === 0) {
    return NextResponse.json({ scanned, deleted: 0 });
  }

  // remove() takes up to 1000 paths per call — chunk to be safe.
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 500) {
    const chunk = toDelete.slice(i, i + 500);
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(chunk);
    if (removeError) {
      console.error("[cleanup-paragon-pdfs] remove chunk failed:", removeError.message);
      continue;
    }
    deleted += chunk.length;
  }

  return NextResponse.json({ scanned, deleted, ttl_days: 7 });
}
