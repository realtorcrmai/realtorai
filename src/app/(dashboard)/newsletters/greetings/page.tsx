export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { GreetingAutomations } from "@/components/newsletters/GreetingAutomations";
import { getGreetingRules } from "@/actions/config";
import { auth } from "@/lib/auth";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { getUserFeatures } from "@/lib/features";
import { redirect } from "next/navigation";

export default async function GreetingsPage() {
  const session = await auth();
  const tc = await getAuthenticatedTenantClient();

  // Feature gate: require newsletters feature (fail-open if lookup fails)
  const userId = session?.user?.id || tc.realtorId;
  if (userId) {
    const { data: user } = await tc.from("users").select("plan, enabled_features").eq("id", userId).single();
    if (user) {
      const features = getUserFeatures((user.plan as string) ?? "free", user.enabled_features as string[] | null);
      if (!features.includes("newsletters")) redirect("/");
    }
  }

  const greetingRules = await getGreetingRules();

  return (
    <>
      <PageHeader
        title="Greetings"
        subtitle="Automated holiday and milestone greetings for your contacts"
        breadcrumbs={[
          { label: "AI Agents", href: "/newsletters" },
        ]}
      />
      <div className="p-6">
        <GreetingAutomations initialRules={greetingRules as any} />
      </div>
    </>
  );
}
