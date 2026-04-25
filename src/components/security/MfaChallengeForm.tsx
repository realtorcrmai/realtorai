"use client";

// SOC 2 CC6.6 — MFA challenge form
//
// Submits the user's TOTP or backup code to /api/auth/mfa/elevate.
// On success, calls NextAuth's `update({ mfaVerified: true })` to
// flip the JWT claim, then router.push("/") to land on the dashboard.
//
// Errors are surfaced inline; rate-limit errors (429) prompt the user
// to wait. We intentionally do NOT distinguish "wrong code" from
// "expired code" or "backup-code already used" — generic message keeps
// the failure mode opaque to attackers.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function MfaChallengeForm() {
  const router = useRouter();
  const { update } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmed = code.trim();
    if (trimmed.length < 6 || trimmed.length > 16) {
      setError("Code must be 6–16 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/mfa/elevate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });

      if (res.status === 429) {
        setError("Too many attempts. Please wait 15 minutes.");
        return;
      }
      if (!res.ok) {
        setError("Invalid code. Try again.");
        return;
      }

      // Flip the JWT mfaVerified claim via NextAuth update().
      await update({ mfaVerified: true });

      // Hard navigation so the dashboard layout re-evaluates the
      // session and DOES NOT redirect back to /mfa-challenge.
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="mfa-code"
          className="block text-sm font-medium text-primary mb-1"
        >
          Verification code
        </label>
        <input
          id="mfa-code"
          name="code"
          type="text"
          inputMode="text"
          autoComplete="one-time-code"
          autoFocus
          maxLength={16}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "mfa-error" : undefined}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-base text-primary focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="123456 or backup code"
          required
        />
      </div>

      {error && (
        <p
          id="mfa-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || code.trim().length < 6}
        className="w-full bg-brand text-white rounded-md py-2 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
