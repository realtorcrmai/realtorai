"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { titleCaseName } from "@/lib/format";

/** Password strength: 0=empty, 1=weak, 2=medium, 3=strong (S12) */
function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw || pw.length < 8) return { level: 0, label: "", color: "" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  if (hasUpper && hasNumber && hasSpecial) return { level: 3, label: "Strong", color: "bg-green-500" };
  if (hasUpper || hasNumber) return { level: 2, label: "Medium", color: "bg-yellow-500" };
  return { level: 1, label: "Weak", color: "bg-red-500" };
}

// Cloudflare Turnstile site key — falls back gracefully if not set
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hasTeam, setHasTeam] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken" | "disposable">("idle");
  const emailCheckTimer = useRef<NodeJS.Timeout>(undefined);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  // Load Turnstile script
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    if (document.getElementById("cf-turnstile-script")) return;

    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
    script.async = true;
    document.head.appendChild(script);

    // If Turnstile script fails to load within 5s, allow form submission without it
    const fallbackTimer = setTimeout(() => {
      if (!turnstileWidgetId.current) setTurnstileReady(false);
    }, 5000);

    (window as unknown as Record<string, unknown>).onTurnstileLoad = () => {
      clearTimeout(fallbackTimer);
      setTurnstileReady(true);
      if (turnstileRef.current && (window as unknown as Record<string, { render: (el: HTMLElement, opts: Record<string, unknown>) => string }>).turnstile) {
        turnstileWidgetId.current = (window as unknown as Record<string, { render: (el: HTMLElement, opts: Record<string, unknown>) => string }>).turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
          theme: "light",
        });
      }
    };

    script.onerror = () => {
      clearTimeout(fallbackTimer);
      setTurnstileReady(false);
    };

    return () => clearTimeout(fallbackTimer);
  }, []);

  // Reset Turnstile after failed attempt
  const resetTurnstile = useCallback(() => {
    if (turnstileWidgetId.current && (window as unknown as Record<string, { reset: (id: string) => void }>).turnstile) {
      (window as unknown as Record<string, { reset: (id: string) => void }>).turnstile.reset(turnstileWidgetId.current);
      setTurnstileToken(null);
    }
  }, []);

  // Real-time email availability check with 500ms debounce (S10)
  useEffect(() => {
    if (!email || !email.includes("@") || email.length < 5) {
      setEmailStatus("idle");
      return;
    }
    setEmailStatus("checking");
    clearTimeout(emailCheckTimer.current);
    emailCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.available) setEmailStatus("available");
        else if (data.reason === "disposable") setEmailStatus("disposable");
        else setEmailStatus("taken");
      } catch {
        setEmailStatus("idle"); // fail-open
      }
    }, 500);
    return () => clearTimeout(emailCheckTimer.current);
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || name.trim().length < 2) {
      setError("Name is required (min 2 characters)");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Require Turnstile only if widget loaded successfully
    if (turnstileReady && !turnstileToken) {
      setError("Please complete the CAPTCHA verification");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        resetTurnstile();
        return;
      }

      // Sign in (creates session) then redirect to verify page
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.ok) {
        // External return_to (e.g. from Pulse360) — redirect after sign-in
        if (returnTo) {
          window.location.href = returnTo;
          return;
        }
        // Redirect to email verification — mandatory before onboarding
        const verifyUrl = hasTeam ? "/verify?next=/onboarding?create_team=true" : "/verify";
        router.push(verifyUrl);
      } else {
        // Account created but auto-sign-in failed — send to login
        router.push(returnTo ? `/login?return_to=${encodeURIComponent(returnTo)}` : "/login");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      resetTurnstile();
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff]">
      {/* Left: Social proof panel — desktop only (S8) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-center px-12 py-16">
        <div className="max-w-md mx-auto">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f35d2] to-[#ff5c3a] mb-6">
            <span className="text-white text-xl font-bold">M</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            The AI-powered CRM built for BC realtors
          </h1>
          <p className="text-gray-600 mb-8">
            Manage listings, contacts, showings, and compliance — all in one place. Let AI handle the busywork.
          </p>

          {/* Testimonials */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-white/60 backdrop-blur rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4f35d2] to-[#7c5cfc] flex items-center justify-center text-white text-sm font-bold shrink-0">SK</div>
              <div>
                <p className="text-sm text-gray-700 italic">&ldquo;Magnate cut my listing prep time from 3 hours to 20 minutes. The AI remarks generator alone is worth it.&rdquo;</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Sarah K. — Top Producer, RE/MAX Vancouver</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/60 backdrop-blur rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00bfa5] to-[#059669] flex items-center justify-center text-white text-sm font-bold shrink-0">MP</div>
              <div>
                <p className="text-sm text-gray-700 italic">&ldquo;Finally a CRM that understands BC real estate — FINTRAC, BCREA forms, the whole workflow.&rdquo;</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Mike P. — Broker, Royal LePage Surrey</p>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex items-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Free forever
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Upgrade anytime
            </div>
          </div>
        </div>
      </div>

      {/* Right: Signup form (S1, S6) */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f35d2] to-[#ff5c3a] mb-3">
              <span className="text-white text-xl font-bold">M</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Get started free</h2>
            <p className="text-sm text-gray-500 mt-1">Free forever — upgrade anytime</p>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 space-y-4">
            <div className="hidden lg:block">
              <h2 className="text-xl font-bold text-foreground">Create your account</h2>
              <p className="text-sm text-gray-500 mt-0.5">Get started in 30 seconds</p>
            </div>

            {/* Trial badge (S7) */}
            <div className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-[#4f35d2]/5 to-[#ff5c3a]/5 rounded-lg border border-[#4f35d2]/10">
              <span className="text-xs bg-gradient-to-r from-[#4f35d2] to-[#ff5c3a] text-white px-2 py-0.5 rounded-full font-medium">FREE</span>
              <span className="text-xs text-gray-600">Contacts, calendar, and tasks — upgrade to unlock more</span>
            </div>

            {/* Google OAuth signup */}
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: returnTo || "/" })}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">or sign up with email</span></div>
            </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={(e) => setName(titleCaseName(e.target.value))}
                placeholder="Sarah Johnson"
                required
                autoFocus
                aria-describedby={error && error.includes("Name") ? "signup-error" : undefined}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(e.target.value.trim().toLowerCase())}
                placeholder="sarah@realty.ca"
                required
                aria-describedby={emailStatus === "disposable" || emailStatus === "taken" ? "email-status" : undefined}
                className={`w-full px-4 py-2.5 rounded-lg border outline-none text-sm focus:ring-1 ${
                  emailStatus === "disposable" || emailStatus === "taken"
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-200 focus:border-primary focus:ring-primary"
                }`}
              />
              {emailStatus === "disposable" && (
                <p id="email-status" className="text-xs text-red-500 mt-1" role="alert">Please use a non-disposable email</p>
              )}
              {emailStatus === "taken" && (
                <p id="email-status" className="text-xs text-red-500 mt-1" role="alert">
                  This email is already registered.{" "}
                  <Link href="/login" className="text-primary font-medium hover:underline">Sign in instead</Link>
                </p>
              )}
              {emailStatus === "available" && email.includes("@") && (
                <p className="text-xs text-green-500 mt-1">Email available</p>
              )}
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                aria-describedby={password.length > 0 ? "password-strength" : undefined}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
              />
              {/* Password strength meter (S12) */}
              {password.length > 0 && (
                <div id="password-strength" className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color} ${
                        strength.level === 1 ? "w-1/3" : strength.level === 2 ? "w-2/3" : strength.level === 3 ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    strength.level === 3 ? "text-green-600" :
                    strength.level === 2 ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Team option */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasTeam}
                onChange={(e) => setHasTeam(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">I have a team (I&apos;ll invite members after setup)</span>
            </label>

            {/* Cloudflare Turnstile CAPTCHA — hidden if script fails to load */}
            {TURNSTILE_SITE_KEY && (
              <div className={`flex justify-center ${turnstileReady ? "" : "hidden"}`}>
                <div ref={turnstileRef} />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (turnstileReady && !turnstileToken)}
              className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-[#3d28a8] transition-colors disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create free account"}
            </button>

            {error && (
              <div id="signup-error" role="alert" aria-live="polite" className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
                {error.includes("already exists") && (
                  <Link href="/login" className="block mt-1 text-primary font-medium hover:underline">
                    Sign in instead
                  </Link>
                )}
              </div>
            )}

            <p className="text-center text-xs text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>

            <p className="text-center text-[10px] text-gray-400">
              By signing up, you agree to our{" "}
              <a href="/terms" className="underline hover:text-gray-300">Terms of Use</a>{" "}
              and{" "}
              <a href="/privacy" className="underline hover:text-gray-300">Privacy Policy</a>
            </p>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}
