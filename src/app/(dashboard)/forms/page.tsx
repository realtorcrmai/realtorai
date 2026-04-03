import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import FormsPageClient from "./forms-client";

export default async function FormsPage() {
  const supabase = await getAuthenticatedTenantClient();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, address")
    .order("created_at", { ascending: false });

  const { data: submissions } = await supabase
    .from("form_submissions")
    .select("listing_id, form_key, status");

  // Build a map: { listingId: { formKey: status } }
  const allStatuses: Record<string, Record<string, "draft" | "completed">> = {};
  (submissions ?? []).forEach((s) => {
    if (!allStatuses[s.listing_id]) allStatuses[s.listing_id] = {};
    allStatuses[s.listing_id][s.form_key] = s.status as "draft" | "completed";
  });

  return (
    <FormsPageClient
      listings={listings ?? []}
      allStatuses={allStatuses}
    />
  );
}
