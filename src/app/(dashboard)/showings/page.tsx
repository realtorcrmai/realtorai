import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShowingsTableClient } from "@/components/showings/ShowingsTableClient";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ShowingsPage() {
  const supabase = await getAuthenticatedTenantClient();

  const { data: showings } = await supabase
    .from("appointments")
    .select("id, start_time, status, buyer_agent_name, buyer_agent_phone, listing_id, listings!inner(address)")
    .order("start_time", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader
        title="Showings"
        subtitle={`${showings?.length ?? 0} showings`}
        actions={
          <Link href="/showings/new">
            <Button className="bg-brand text-white hover:bg-brand-dark">Schedule Showing</Button>
          </Link>
        }
      />
      <div className="p-6">
        <ShowingsTableClient showings={(showings ?? []) as any} />
      </div>
    </>
  );
}
