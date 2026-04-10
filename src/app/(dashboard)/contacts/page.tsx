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
          <div className="text-4xl mb-4">📇</div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Your client relationships start here
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Import your contacts from Gmail, CSV, or add them manually to get started.
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="/contacts/new"
              className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Import Contacts
            </a>
            <span className="text-xs text-muted-foreground">Or use the form on the left to add one manually</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
