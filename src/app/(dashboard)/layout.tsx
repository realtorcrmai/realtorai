import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { NetworkErrorBanner } from "@/components/shared/NetworkErrorBanner";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { OnboardingChecklist } from "@/components/help/OnboardingChecklist";
import { CommandPalette } from "@/components/help/CommandPalette";
import { FeatureDiscovery } from "@/components/help/FeatureDiscovery";
import { OnboardingNPS } from "@/components/help/OnboardingNPS";
import { VoiceAgentWidget } from "@/components/voice-agent/VoiceAgentWidget";
import { LayoutProvider } from "@/components/layout/LayoutProvider";
import { DashboardShellClient } from "@/components/layout/DashboardShellClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // ── Onboarding gate — use JWT token (populated in auth.ts callbacks) ──
  if (session.user.role !== "admin") {
    const user = session.user as Record<string, unknown>;
    if (user.onboardingCompleted === false) {
      redirect("/onboarding");
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
        <OnboardingNPS />
        <Toaster />
      </div>
    </LayoutProvider>
  );
}
