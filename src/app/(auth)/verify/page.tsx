"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");

  // 60-second cooldown on page load (email was just sent)
  useEffect(() => {
    if (!error) setCooldown(60);
  }, [error]);

  // Poll for email verification status every 5 seconds
  // When verified in DB (via email link click), refresh JWT and redirect
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/check-verified");
        const data = await res.json();
        if (data.verified) {
          clearInterval(poll);
          await update();
          router.push("/onboarding");
        }
      } catch {
        // Silent — keep polling
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [update, router]);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const maskedEmail = session?.user?.email
    ? session.user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "your email";

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/resend-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setMessage("Verification email sent!");
        setCooldown(60);
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to resend. Try again.");
      }
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setResending(false);
    }
  }, [cooldown, resending]);

  const errorMessages: Record<string, string> = {
    expired: "This verification link has expired. Request a new one below.",
    invalid: "This verification link is invalid. Request a new one below.",
    not_found: "Account not found. Please sign up again.",
  };

  const isGmail = session?.user?.email?.includes("gmail");

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff]">
      {/* Left panel — matches signup design */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-center px-12 py-16">
        <div className="max-w-md mx-auto">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f35d2] to-[#ff5c3a] mb-6">
            <span className="text-white text-xl font-bold">M</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Almost there!
          </h1>
          <p className="text-gray-600 mb-8">
            Just one click in your inbox to verify your email and unlock your AI-powered real estate CRM.
          </p>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00bfa5] to-[#059669] flex items-center justify-center text-white text-sm font-bold shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Account created</p>
                <p className="text-xs text-gray-500">Your account is ready to go</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur rounded-xl border-2 border-[#4f35d2]/20">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4f35d2] to-[#7c5cfc] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Verify your email</p>
                <p className="text-xs text-gray-500">Check your inbox and click the link</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/40 backdrop-blur rounded-xl opacity-50">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm font-bold shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-gray-400">Set up your profile</p>
                <p className="text-xs text-gray-400">Personalize your CRM experience</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f35d2] to-[#ff5c3a] mb-3">
              <span className="text-white text-xl font-bold">M</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
            <p className="text-sm text-gray-500 mt-1">One quick step to get started</p>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 space-y-5">
            {/* Email icon + heading */}
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4f35d2]/10 to-[#7c5cfc]/10 mb-4">
                <svg className="h-8 w-8 text-[#4f35d2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="hidden lg:block text-xl font-bold text-foreground">Check your email</h2>
              <p className="text-sm text-gray-500 mt-2">
                We sent a verification link to <strong className="text-gray-700">{maskedEmail}</strong>
              </p>
            </div>

            {/* Error message */}
            {error && errorMessages[error] && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                {errorMessages[error]}
              </div>
            )}

            {/* Success message */}
            {message && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-[#4f35d2]/5 to-[#ff5c3a]/5 border border-[#4f35d2]/10 text-sm text-[#4f35d2] text-center font-medium">
                {message}
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-2 text-sm text-gray-500">
              <p>Click the link in the email to verify your account. The link expires in 15 minutes.</p>
              <p className="text-xs">Don&apos;t see it? Check your spam folder.</p>
            </div>

            {/* Open email quick link */}
            {isGmail && (
              <button
                onClick={() => window.open("https://mail.google.com", "_blank")}
                className="w-full py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="currentColor"/></svg>
                Open Gmail
              </button>
            )}

            {/* Resend button */}
            <button
              disabled={cooldown > 0 || resending}
              onClick={handleResend}
              className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-[#3d28a8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {resending && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              )}
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend verification email"}
            </button>

            <p className="text-center text-xs text-gray-500">
              Wrong email?{" "}
              <Link href="/signup" className="text-[#4f35d2] font-medium hover:underline">
                Start over
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
