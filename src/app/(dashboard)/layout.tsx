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
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay";

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

  // ── MFA challenge gate — SOC 2 CC6.6 ──
  // If the user has MFA enabled but hasn't elevated this session,
  // force them to /mfa-challenge before any dashboard route renders.
  // Server-side check is the source of truth; we don't trust client.
  // Runs before the onboarding overlay so MFA always wins, regardless
  // of onboarding state.
  if (user.mfaActive === true && user.mfaVerified !== true) {
    redirect("/mfa-challenge");
  }

  // ── Onboarding: show as dismissible modal overlay instead of hard redirect ──
  // (Onboarding redirect was retired in favour of OnboardingOverlay below —
  // see PR #285. The flags are surfaced through to the JSX.)
  const needsPersonalization = user.personalizationCompleted === false;
  const needsOnboarding = user.onboardingCompleted === false;

  return (
    <LayoutProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <TrialBanner />
        <DashboardShellClient>
          {children}
        </DashboardShellClient>
        {(needsPersonalization || needsOnboarding) && (
          <OnboardingOverlay
            needsPersonalization={needsPersonalization}
            needsOnboarding={needsOnboarding}
          />
        )}
        <OnboardingChecklist />
        <CommandPalette />
        <FeatureDiscovery />
        <OnboardingNPS />
        <Toaster />
      </div>
    </LayoutProvider>
  );
}
