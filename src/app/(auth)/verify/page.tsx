"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Mail, RefreshCw, AlertCircle } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");

  // 60-second cooldown on page load (email was just sent)
  useEffect(() => {
    if (!error) setCooldown(60);
  }, [error]);

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

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_oklch(0.60_0.20_260)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_oklch(0.40_0.15_240)_0%,_transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Home className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">RealtorAI</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight">
              Almost there!
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              Just one click in your inbox to verify your email and unlock your
              AI-powered real estate CRM.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/50">
            Trusted by real estate professionals across British Columbia
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">RealtorAI</span>
          </div>

          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
            <p className="text-sm text-muted-foreground mt-2">
              We sent a verification link to <strong>{maskedEmail}</strong>
            </p>
          </div>

          <Card className="border-0 shadow-none lg:border lg:shadow-sm">
            <CardContent className="p-0 lg:p-6 space-y-4">
              {/* Error message */}
              {error && errorMessages[error] && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {errorMessages[error]}
                </div>
              )}

              {/* Success message */}
              {message && (
                <div className="p-3 rounded-lg bg-brand-muted text-sm text-brand-dark text-center">
                  {message}
                </div>
              )}

              {/* Instructions */}
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Click the link in the email to verify your account. The link expires in 15 minutes.</p>
                <p className="text-xs">
                  Don&apos;t see it? Check your spam folder.
                </p>
              </div>

              {/* Open email quick link */}
              {session?.user?.email?.includes("gmail") && (
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={() =>
                    window.open("https://mail.google.com", "_blank")
                  }
                >
                  Open Gmail
                </Button>
              )}

              {/* Resend button */}
              <Button
                variant="secondary"
                className="w-full h-11"
                disabled={cooldown > 0 || resending}
                onClick={handleResend}
              >
                {resending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend verification email"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Wrong email?{" "}
                <a href="/signup" className="text-primary font-medium hover:underline">
                  Start over
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
