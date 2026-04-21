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

const PAGE_SIZE = 50;

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ smart_list?: string; scope?: string; page?: string }>;
}) {
  const params = await searchParams;
  const scope = (params.scope === "team" ? "team" : "personal") as DataScope;
  const supabase = await getScopedTenantClient(scope);
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  let listings;
  let activeSmartList = null;
  let totalCount = 0;

  if (params.smart_list) {
    const result = await executeSmartList(params.smart_list);
    listings = result.rows;
    activeSmartList = result.smartList;
    totalCount = listings?.length ?? 0;
  } else {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [{ count }, { data }] = await Promise.all([
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from("listings")
        .select("id, address, status, mls_number, list_price, property_type, hero_image_url, created_at, contacts!listings_seller_id_fkey(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(from, to),
    ]);

    listings = data;
    totalCount = count ?? 0;
  }

  const isEmpty = !listings || listings.length === 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <PageHeader
        title={activeSmartList ? `${activeSmartList.icon} ${activeSmartList.name}` : "Listings"}
        subtitle={`${totalCount} listing${totalCount !== 1 ? "s" : ""}`}
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
        {isEmpty && page === 1 ? (
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
          <ListingsTableClient
            listings={(listings ?? []) as any}
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
          />
        )}
      </div>
    </>
  );
}
