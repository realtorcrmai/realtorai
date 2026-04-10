"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

/**
 * Non-blocking email verification banner (S5).
 * Shows on ALL pages until email is verified.
 * Does NOT block access — just nudges.
 */
export function EmailVerificationBanner() {
  const { data: session } = useSession();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Don't show if: no session, already verified, or Google SSO (auto-verified)
  const emailVerified = (session?.user as Record<string, unknown> | undefined)?.emailVerified;
  if (!session?.user || emailVerified !== false) return null;

  const handleResend = async () => {
    setResending(true);
    try {
      await fetch("/api/auth/verify-email/send", { method: "POST" });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {
      // Silent fail — banner stays visible
    }
    setResending(false);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <span className="text-amber-800">
        Please verify your email — check your inbox (or spam folder)
      </span>
      <button
        onClick={handleResend}
        disabled={resending || resent}
        className="text-amber-900 font-medium underline underline-offset-2 hover:text-amber-700 disabled:opacity-50 disabled:no-underline"
      >
        {resent ? "Sent!" : resending ? "Sending..." : "Resend"}
      </button>
    </div>
  );
}
