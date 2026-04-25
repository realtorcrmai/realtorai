import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { OnboardingChecklist } from "@/components/help/OnboardingChecklist";
import { CommandPalette } from "@/components/help/CommandPalette";
import { FeatureDiscovery } from "@/components/help/FeatureDiscovery";
import { OnboardingNPS } from "@/components/help/OnboardingNPS";
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

  // ── Admin redirect — admins go to /admin, not the realtor dashboard ──
  if (session.user.role === "admin") {
    redirect("/admin");
  }

  // ── Email verification gate — must verify before accessing dashboard ──
  // Only gate users who are explicitly unverified AND haven't completed onboarding.
  // Existing/demo users who finished onboarding are implicitly trusted — their JWT
  // may have a stale emailVerified=false if they signed up before this column existed.
  const user = session.user as Record<string, unknown>;
  if (user.emailVerified === false && user.onboardingCompleted === false) {
    redirect("/verify");
  }

  // ── Personalization gate — OAuth users may skip personalization ──
  if (user.personalizationCompleted === false && user.onboardingCompleted === false) {
    redirect("/personalize");
  }

  // ── Onboarding gate — use JWT token (populated in auth.ts callbacks) ──
  if (user.onboardingCompleted === false) {
    redirect("/onboarding");
  }
  return (
    <LayoutProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <TrialBanner />
        <DashboardShellClient>
          {children}
        </DashboardShellClient>
        <OnboardingChecklist />
        <CommandPalette />
        <FeatureDiscovery />
        <OnboardingNPS />
        <Toaster />
      </div>
    </LayoutProvider>
  );
}
