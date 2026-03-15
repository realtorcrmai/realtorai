import { createAdminClient } from "@/lib/supabase/admin";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = createAdminClient();

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
