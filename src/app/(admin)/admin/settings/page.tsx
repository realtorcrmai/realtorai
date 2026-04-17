import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") redirect("/");

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <Settings className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Settings coming soon</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Plan configuration, feature flag kill switches, and announcement management will be available here.
      </p>
      <p className="text-xs text-muted-foreground mt-4">
        For now, plans are managed in code and feature flags use environment variables.
      </p>
    </div>
  );
}
