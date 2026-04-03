import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { VoiceAgentWidget } from "@/components/voice-agent/VoiceAgentWidget";
import { Toaster } from "@/components/ui/sonner";
import { NetworkErrorBanner } from "@/components/shared/NetworkErrorBanner";
import { OnboardingChecklist } from "@/components/help/OnboardingChecklist";
import { CommandPalette } from "@/components/help/CommandPalette";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth guard — works on any hosting (Netlify, Vercel, etc.)
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Offline/online connectivity banner */}
      <NetworkErrorBanner />

      {/* Header with horizontal nav (desktop) / mobile top bar */}
      <AppHeader />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main content area */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-background">
          <div className="pb-24">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Voice Agent Widget — microphone + text chat with TTS */}
      <VoiceAgentWidget />

      {/* Onboarding checklist (first 30 days) */}
      <OnboardingChecklist />

      {/* Cmd+K command palette */}
      <CommandPalette />

      <Toaster />
    </div>
  );
}
