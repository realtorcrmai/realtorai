import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemHealth } from "@/actions/analytics";
import { SystemView } from "@/components/admin/SystemView";
import { PageHeader } from "@/components/layout/PageHeader";
import { RefreshButton } from "@/components/admin/RefreshButton";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") redirect("/");

  const result = await getSystemHealth();

  // Map from analytics shape to component props
  const rawCrons =
    (result.data as Array<{
      cron: string;
      lastRun: string;
      status: string;
      duration: number | null;
    }>) ?? [];

  const crons = rawCrons.map((c) => ({
    name: c.cron,
    lastRun: c.lastRun,
    status: c.status,
    duration_ms: c.duration ?? 0,
  }));

  const systemOk =
    crons.length > 0 ? crons.every((c) => c.status === "success") : true;

  return (
    <div className="space-y-0">
      <PageHeader
        title="System Health"
        subtitle="Operational status and diagnostics"
        actions={<RefreshButton />}
      />
      <SystemView crons={crons} systemOk={systemOk} />
    </div>
  );
}
