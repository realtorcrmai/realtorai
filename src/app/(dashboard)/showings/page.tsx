import { getAuthenticatedTenantClient, getScopedTenantClient } from "@/lib/supabase/tenant";
import type { DataScope } from "@/types/team";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShowingsTableClient } from "@/components/showings/ShowingsTableClient";
import { EmptyState } from "@/components/shared/EmptyState";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ShowingsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const params = await searchParams;
  const scope = (params.scope === "team" ? "team" : "personal") as DataScope;
  const supabase = await getScopedTenantClient(scope);

  const { data: showings } = await supabase
    .from("appointments")
    .select("id, start_time, status, buyer_agent_name, buyer_agent_phone, listing_id, listings!inner(address)")
    .order("start_time", { ascending: false })
    .limit(200);

  const isEmpty = !showings || showings.length === 0;

  return (
    <>
      <PageHeader
        title="Showings"
        subtitle={`${showings?.length ?? 0} showings`}
        actions={
          !isEmpty ? (
            <Link href="/showings/new">
              <Button className="bg-brand text-white hover:bg-brand-dark">Schedule Showing</Button>
            </Link>
          ) : undefined
        }
      />
      <div className="p-6">
        {isEmpty ? (
          <EmptyState
            icon={CalendarDays}
            title="No showings yet"
            description="Schedule your first showing and we'll handle the buyer agent notifications, calendar sync, and lockbox code delivery."
            action={
              <Link href="/showings/new">
                <Button className="bg-brand text-white hover:bg-brand-dark">Schedule a Showing</Button>
              </Link>
            }
          />
        ) : (
          <ShowingsTableClient showings={(showings ?? []) as any} />
        )}
      </div>
    </>
  );
}
