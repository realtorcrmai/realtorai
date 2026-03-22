import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ListingsIndexPage() {
  const supabase = createAdminClient();

  // Find the most recently updated listing
  const { data } = await supabase
    .from("listings")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (data) {
    redirect(`/listings/${data.id}`);
  }

  // No listings exist — show empty state
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">No Listings Yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first listing using the sidebar.
        </p>
      </div>
    </div>
  );
}
