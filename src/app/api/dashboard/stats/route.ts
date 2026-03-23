import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();

  const [
    { count: activeListings },
    { count: pendingShowings },
    { data: tasks },
    { data: allListings },
    { data: allDocs },
    { count: totalContacts },
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "requested"),
    supabase
      .from("tasks")
      .select("id, status")
      .neq("status", "completed"),
    supabase
      .from("listings")
      .select("id, status"),
    supabase
      .from("listing_documents")
      .select("listing_id, doc_type"),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true }),
  ]);

  const openTasks = (tasks ?? []).length;

  const requiredTypes = ["FINTRAC", "DORTS", "PDS"];
  const activeListingRows = (allListings ?? []).filter((l) => l.status === "active");
  const missingDocs = activeListingRows.filter((listing) => {
    const docs = (allDocs ?? []).filter((d) => d.listing_id === listing.id);
    const docTypes = docs.map((d) => d.doc_type);
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
