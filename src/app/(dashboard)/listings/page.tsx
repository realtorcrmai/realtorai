import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { ListingsTableClient } from "@/components/listings/ListingsTableClient";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const supabase = await getAuthenticatedTenantClient();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, address, status, mls_number, list_price, property_type, created_at, contacts!listings_seller_id_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader
        title="Listings"
        subtitle={`${listings?.length ?? 0} listings`}
        actions={
          <Link href="/listings/new">
            <Button className="bg-brand text-white hover:bg-brand-dark">Create Listing</Button>
          </Link>
        }
      />
      <div className="p-6">
        <ListingsTableClient listings={(listings ?? []) as any} />
      </div>
    </>
  );
}
