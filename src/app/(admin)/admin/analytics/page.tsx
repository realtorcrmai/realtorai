import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") redirect("/");

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Analytics coming soon</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Deep funnel analysis, retention cohorts, and custom reports will be available here once enough data has been collected.
      </p>
      <p className="text-xs text-muted-foreground mt-4">
        In the meantime, check the onboarding funnel and feature adoption on the{" "}
        <a href="/admin" className="text-brand hover:underline">Overview</a> page.
      </p>
    </div>
  );
}
