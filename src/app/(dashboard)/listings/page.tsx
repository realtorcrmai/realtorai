import { createAdminClient } from "@/lib/supabase/admin";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingForm } from "@/components/listings/ListingForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const supabase = createAdminClient();

  const [{ data: listings }, { data: sellers }] = await Promise.all([
    supabase
      .from("listings")
      .select("*, contacts(name, phone)")
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").eq("type", "seller"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Listings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your property listings
          </p>
        </div>
        <ListingForm sellers={sellers ?? []} />
      </div>

      {(listings ?? []).length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No listings yet"
          description="Add your first property listing. Make sure to add a seller contact first."
          action={<ListingForm sellers={sellers ?? []} />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(listings ?? []).map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing as typeof listing & { contacts: { name: string; phone: string } }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
