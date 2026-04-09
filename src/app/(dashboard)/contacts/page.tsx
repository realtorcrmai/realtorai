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
  searchParams: Promise<{ stage?: string; role?: string; lifecycle?: string }>;
}) {
  const { stage, role, lifecycle } = await searchParams;
  const supabase = await getAuthenticatedTenantClient();

  // Build query suffix to preserve active filters when redirecting
  const buildSuffix = (contactId: string) => {
    const params = new URLSearchParams();
    if (stage) params.set("stage", stage);
    if (role) params.set("role", role);
    if (lifecycle) params.set("lifecycle", lifecycle);
    const qs = params.toString();
    return `/contacts/${contactId}${qs ? `?${qs}` : ""}`;
  };

  // Role filter: find first contact whose roles[] contains the given role
  if (role) {
    const { data: match } = await supabase
      .from("contacts")
      .select("id")
      .contains("roles", [role])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (match) redirect(buildSuffix(match.id));
  }

  // Lifecycle filter: find first contact with the given lifecycle_stage
  if (lifecycle) {
    const { data: match } = await supabase
      .from("contacts")
      .select("id")
      .eq("lifecycle_stage", lifecycle)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (match) redirect(buildSuffix(match.id));
  }

  // Stage filter: find first contact in that stage_bar bucket
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
      redirect(buildSuffix(match.id));
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
    redirect(buildSuffix(latest.id));
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
