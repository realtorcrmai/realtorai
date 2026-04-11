import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { NetworkErrorBanner } from "@/components/shared/NetworkErrorBanner";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { OnboardingChecklist } from "@/components/help/OnboardingChecklist";
import { CommandPalette } from "@/components/help/CommandPalette";
import { FeatureDiscovery } from "@/components/help/FeatureDiscovery";
import { VoiceAgentWidget } from "@/components/voice-agent/VoiceAgentWidget";
import { LayoutProvider } from "@/components/layout/LayoutProvider";
import { DashboardShellClient } from "@/components/layout/DashboardShellClient";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // ── Onboarding gate (PO8) — check DB directly for reliable state ──
  if (session.user.role !== "admin") {
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users")
      .select("onboarding_completed, personalization_completed")
      .eq("id", session.user.id)
      .single();

    if (user) {
      if (user.personalization_completed === false && user.onboarding_completed === false) {
        redirect("/personalize");
      }
      if (user.onboarding_completed === false) {
        redirect("/onboarding");
      }
    }
  }
  return (
    <LayoutProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <NetworkErrorBanner />
        <TrialBanner />
        <DashboardShellClient>
          {children}
        </DashboardShellClient>
        <VoiceAgentWidget />
        <OnboardingChecklist />
        <CommandPalette />
        <FeatureDiscovery />
        <Toaster />
      </div>
    </LayoutProvider>
  );
}
