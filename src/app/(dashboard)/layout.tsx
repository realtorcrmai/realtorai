import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { VoiceAgentWidget } from "@/components/voice-agent/VoiceAgentWidget";
import { Toaster } from "@/components/ui/sonner";
import { NetworkErrorBanner } from "@/components/shared/NetworkErrorBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

      {/* Floating Voice Agent Widget — opens chat on click */}
      <VoiceAgentWidget />

      <Toaster />
    </div>
  );
}
