import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { NetworkErrorBanner } from "@/components/shared/NetworkErrorBanner";
import { EmailVerificationBanner } from "@/components/layout/EmailVerificationBanner";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { OnboardingChecklist } from "@/components/help/OnboardingChecklist";
import { CommandPalette } from "@/components/help/CommandPalette";
import { FeatureDiscovery } from "@/components/help/FeatureDiscovery";
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
  return (
    <LayoutProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <NetworkErrorBanner />
        <TrialBanner />
        <EmailVerificationBanner />
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
