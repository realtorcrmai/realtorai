export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { CampaignsTab } from "@/components/newsletters/CampaignsTab";
import { sendListingBlast, sendCampaign } from "@/actions/newsletters";
import { auth } from "@/lib/auth";
import { getUserFeatures } from "@/lib/features";
import { redirect } from "next/navigation";

export default async function CampaignsPage() {
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

  const [{ data: listings }, { data: recentBlastsRaw }] = await Promise.all([
    tc
      .from("listings")
      .select("id, address, list_price, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10),
    tc
      .from("newsletters")
      .select(
        "id, subject, email_type, status, sent_at, contact_id, created_at, contacts(name, type), newsletter_events(event_type)"
      )
      .in("email_type", ["listing_blast", "campaign", "listing_alert"])
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const blastHistory = (recentBlastsRaw || []).map((nl: any) => {
    const events = nl.newsletter_events || [];
    return {
      id: nl.id,
      listing_address:
        nl.subject
          ?.replace(/^NEW LISTING:\s*/i, "")
          .split("—")[0]
          ?.trim() ||
        nl.subject ||
        "Campaign",
      listing_price: null,
      template: nl.email_type?.replace(/_/g, " ") || "Campaign",
      recipients: 1,
      sent_at: nl.sent_at || nl.created_at,
      opens: events.filter((e: any) => e.event_type === "opened").length,
      clicks: events.filter((e: any) => e.event_type === "clicked").length,
      replies: 0,
    };
  });

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Send listing blasts and one-off campaigns"
        breadcrumbs={[
          { label: "AI Agents", href: "/newsletters" },
        ]}
      />
      <div className="p-6">
        <CampaignsTab
          listings={(listings || []) as any}
          blastHistory={blastHistory}
          onSendBlast={sendListingBlast}
          onSendCampaign={sendCampaign}
        />
      </div>
    </>
  );
}
