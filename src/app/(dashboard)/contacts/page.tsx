import { redirect } from "next/navigation";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { Users, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

// Pipeline key → actual stage_bar values
const STAGE_FILTER_MAP: Record<string, string[]> = {
  new: ["new"],
  qualified: ["qualified"],
  active: ["active_search", "active_listing"],
  under_contract: ["under_contract"],
  closed: ["closed"],
  cold: ["cold"],
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;
  const supabase = await getAuthenticatedTenantClient();

  // If a stage filter is provided, find the first contact in that stage
  if (stage && STAGE_FILTER_MAP[stage]) {
    const stageValues = STAGE_FILTER_MAP[stage];
    const { data: match } = await supabase
      .from("contacts")
      .select("id")
      .in("stage_bar", stageValues)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (match) {
      redirect(`/contacts/${match.id}?stage=${stage}`);
    }
  }

  // Default: redirect to latest contact
  const { data: latest } = await supabase
    .from("contacts")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latest) {
    redirect(`/contacts/${latest.id}${stage ? `?stage=${stage}` : ""}`);
  }

  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <Card className="max-w-sm w-full animate-float-in">
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">
            No Contacts Yet
          </h2>
          <p className="text-sm text-muted-foreground">
            Add your first contact using the form in the sidebar to get
            started.
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground/60">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Use the form on the left to add one</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
