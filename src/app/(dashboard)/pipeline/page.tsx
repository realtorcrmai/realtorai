import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = await getAuthenticatedTenantClient();

  const [{ data: contacts }, { data: listings }] = await Promise.all([
    supabase.from("contacts").select("*").order("name"),
    supabase.from("listings").select("*").order("address"),
  ]);

  return (
    <PipelineBoard
      contacts={contacts ?? []}
      listings={listings ?? []}
    />
  );
}
