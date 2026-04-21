import { getAuthenticatedTenantClient, getScopedTenantClient } from "@/lib/supabase/tenant";
import type { DataScope } from "@/types/team";
import { PageHeader } from "@/components/layout/PageHeader";
import { ListingsTableClient } from "@/components/listings/ListingsTableClient";
import { EmptyState } from "@/components/shared/EmptyState";
import { SmartListBanner } from "@/components/smart-lists/SmartListBanner";
import { executeSmartList } from "@/actions/smart-lists";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ smart_list?: string; scope?: string }>;
}) {
  const params = await searchParams;
  const scope = (params.scope === "team" ? "team" : "personal") as DataScope;
  const supabase = await getScopedTenantClient(scope);

  let listings;
  let activeSmartList = null;

  if (params.smart_list) {
    const result = await executeSmartList(params.smart_list);
    listings = result.rows;
    activeSmartList = result.smartList;
  } else {
    const { data } = await supabase
      .from("listings")
      .select("id, address, status, mls_number, list_price, property_type, hero_image_url, created_at, contacts!listings_seller_id_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    listings = data;
  }

  const isEmpty = !listings || listings.length === 0;

  return (
    <>
      <PageHeader
        title={activeSmartList ? `${activeSmartList.icon} ${activeSmartList.name}` : "Listings"}
        subtitle={`${listings?.length ?? 0} listings`}
        actions={
          <Link href="/listings/new">
            <Button className="bg-brand text-white hover:bg-brand-dark">Create Listing</Button>
          </Link>
        }
      />
      <div className="p-6">
        {activeSmartList && (
          <SmartListBanner smartList={activeSmartList} count={listings?.length ?? 0} />
        )}
        {isEmpty ? (
          <EmptyState
            icon={Building2}
            title="No listings yet"
            description="Create your first listing and the 8-phase workflow will guide you from seller intake through MLS submission."
            action={
              <Link href="/listings/new">
                <Button className="bg-brand text-white hover:bg-brand-dark">Create Your First Listing</Button>
              </Link>
            }
          />
        ) : (
          <ListingsTableClient listings={(listings ?? []) as any} />
        )}
      </div>
    </>
  );
}
