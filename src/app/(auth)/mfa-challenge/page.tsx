// SOC 2 CC6.6 — Login-time second-factor challenge
//
// Reached when:
//   - The user has MFA enabled (mfa_credentials.enrolled_at IS NOT NULL,
//     disabled_at IS NULL)
//   - They have an authenticated NextAuth session
//   - But the JWT claim mfaVerified is still false for this session
//
// The dashboard layout enforces the redirect to here. This page itself
// only requires that an authenticated session exists; if the user is
// already elevated (mfaVerified === true), we send them to the
// dashboard so this page can never serve as a "trap".

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MfaChallengeForm } from "@/components/security/MfaChallengeForm";

export const dynamic = "force-dynamic";

export default async function MfaChallengePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as Record<string, unknown>;

  // Already elevated → bounce to dashboard.
  if (user.mfaVerified === true) redirect("/");

  // No MFA on the account → nothing to challenge; bounce to dashboard.
  if (user.mfaActive !== true) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card border border-border rounded-lg shadow-sm p-8 max-w-md w-full">
        <h1 className="text-xl font-semibold text-primary mb-1">
          Two-factor verification
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter the 6-digit code from your authenticator app, or one of
          your 8-character backup codes.
        </p>
        <MfaChallengeForm />
      </div>
    </div>
  );
}
