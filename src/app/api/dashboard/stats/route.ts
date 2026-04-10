import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export async function GET() {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const [
    { count: activeListings },
    { count: pendingShowings },
    { data: tasks },
    { data: allListings },
    { data: allDocs },
    { count: totalContacts },
  ] = await Promise.all([
    tc
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    tc
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "requested"),
    tc
      .from("tasks")
      .select("id, status")
      .neq("status", "completed"),
    tc
      .from("listings")
      .select("id, status"),
    tc
      .from("listing_documents")
      .select("listing_id, doc_type"),
    tc
      .from("contacts")
      .select("*", { count: "exact", head: true }),
  ]);

  const openTasks = (tasks ?? []).length;

  const requiredTypes = ["FINTRAC", "DORTS", "PDS"];
  const activeListingRows = (allListings ?? []).filter((l: Record<string, unknown>) => l.status === "active");
  const missingDocs = activeListingRows.filter((listing: Record<string, unknown>) => {
    const docs = (allDocs ?? []).filter((d: Record<string, unknown>) => d.listing_id === listing.id);
    const docTypes = docs.map((d: Record<string, unknown>) => d.doc_type);
    return requiredTypes.some((t) => !docTypes.includes(t));
  }).length;

  return NextResponse.json({
    activeListings: activeListings ?? 0,
    openTasks,
    pendingShowings: pendingShowings ?? 0,
    missingDocs,
    totalContacts: totalContacts ?? 0,
    newLeadsToday: 0,
  });
}
