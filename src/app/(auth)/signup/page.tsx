"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
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

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken" | "disposable">("idle");
  const emailCheckTimer = useRef<NodeJS.Timeout>(undefined);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

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

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Auto sign in → redirect to personalization wizard
      setTimeout(async () => {
        await signIn("credentials", {
          email,
          password,
          callbackUrl: "/personalize",
        });
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff]">
        <div className="w-full max-w-md p-8 bg-white/90 backdrop-blur rounded-2xl shadow-lg text-center animate-float-in">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome, {name.split(" ")[0]}!</h1>
          <p className="text-sm text-gray-600 mb-2">Your account is ready.</p>
          <div className="animate-pulse text-primary text-sm">Setting up your workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff]">
      {/* Left: Social proof panel — desktop only (S8) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-center px-12 py-16">
        <div className="max-w-md mx-auto">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f35d2] to-[#ff5c3a] mb-6">
            <span className="text-white text-xl font-bold">R</span>
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
              <span className="text-white text-xl font-bold">R</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Get started free</h1>
            <p className="text-sm text-gray-500 mt-1">Free forever — upgrade anytime</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 space-y-4">
            <div className="hidden lg:block">
              <h2 className="text-xl font-bold text-foreground">Create your account</h2>
              <p className="text-sm text-gray-500 mt-0.5">Get started in 30 seconds</p>
            </div>

            {/* Trial badge (S7) */}
            <div className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-[#4f35d2]/5 to-[#ff5c3a]/5 rounded-lg border border-[#4f35d2]/10">
              <span className="text-xs bg-gradient-to-r from-[#4f35d2] to-[#ff5c3a] text-white px-2 py-0.5 rounded-full font-medium">FREE</span>
              <span className="text-xs text-gray-600">Contacts, calendar, and tasks — upgrade to unlock more</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={(e) => setName(titleCaseName(e.target.value))}
                placeholder="Sarah Johnson"
                required
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(e.target.value.trim().toLowerCase())}
                placeholder="sarah@realty.ca"
                required
                className={`w-full px-4 py-2.5 rounded-lg border outline-none text-sm focus:ring-1 ${
                  emailStatus === "disposable" || emailStatus === "taken"
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-200 focus:border-primary focus:ring-primary"
                }`}
              />
              {emailStatus === "disposable" && (
                <p className="text-xs text-red-500 mt-1">Please use a non-disposable email</p>
              )}
              {emailStatus === "taken" && (
                <p className="text-xs text-red-500 mt-1">
                  This email is already registered.{" "}
                  <Link href="/login" className="text-primary font-medium hover:underline">Sign in instead</Link>
                </p>
              )}
              {emailStatus === "available" && email.includes("@") && (
                <p className="text-xs text-green-500 mt-1">Email available</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
              />
              {/* Password strength meter (S12) */}
              {password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(strength.level / 3) * 100}%` }}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-[#3d28a8] transition-colors disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create free account"}
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
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
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
