import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getEmailOpsKPIs,
  getPerUserEmailStats,
  getBounceLog,
} from "@/actions/analytics";
import { EmailOpsView } from "@/components/admin/EmailOpsView";

export const dynamic = "force-dynamic";

const defaultKpis = {
  sent: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  bounced: 0,
  complained: 0,
};

export default async function EmailsPage() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") redirect("/");

  const [kpisResult, perUserResult, bouncesResult] = await Promise.all([
    getEmailOpsKPIs("7d"),
    getPerUserEmailStats("7d"),
    getBounceLog("7d"),
  ]);

  // Map per-user data to component shape
  const perUser = (
    (perUserResult.data as Array<{
      realtorId: string;
      name: string;
      email: string;
      sent: number;
      delivered: number;
      openRate: number;
      bounceRate: number;
    }>) ?? []
  ).map((u) => ({
    realtor_id: u.realtorId,
    name: u.name,
    sent: u.sent,
    delivered: u.delivered,
    open_rate: u.openRate,
    bounce_rate: u.bounceRate,
    status:
      u.bounceRate > 10
        ? "critical"
        : u.bounceRate >= 5
          ? "warning"
          : "healthy",
  }));

  // Map bounce log to component shape
  const bounceLog = (
    (bouncesResult.data as Array<{
      created_at: string;
      event_type: string;
      metadata: Record<string, unknown> | null;
      contacts?: { name: string; email: string } | null;
      newsletters?: { subject: string; realtor_id: string } | null;
    }>) ?? []
  ).map((b) => ({
    created_at: b.created_at,
    contact_name: b.contacts?.name ?? "",
    contact_email: b.contacts?.email ?? "",
    event_type: b.event_type,
    realtor_name: "",
    metadata: b.metadata,
  }));

  return (
    <div className="space-y-0">
      <EmailOpsView
        kpis={kpisResult.data ?? defaultKpis}
        perUser={perUser}
        bounceLog={bounceLog}
      />
    </div>
  );
}
