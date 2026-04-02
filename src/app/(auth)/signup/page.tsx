"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [plan, setPlan] = useState<"free" | "professional">("free");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
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
        body: JSON.stringify({
          name, email, password, phone, brokerage, license_number: licenseNumber, plan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Auto sign in after signup
      setTimeout(async () => {
        await signIn("credentials", {
          email,
          password,
          callbackUrl: "/",
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
        <div className="w-full max-w-md p-8 bg-white/90 backdrop-blur rounded-2xl shadow-lg text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-[#1a1535] mb-2">Welcome to Realtors360!</h1>
          <p className="text-sm text-gray-600 mb-4">Your account has been created. Signing you in...</p>
          <div className="animate-pulse text-[#4f35d2] text-sm">Redirecting to dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff] px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f35d2] to-[#ff5c3a] mb-3">
            <span className="text-white text-xl font-bold">R</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1535]">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start managing your real estate business with AI</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? "bg-[#4f35d2] text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > 1 ? "bg-[#4f35d2]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-6 space-y-4">
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-[#1a1535]">Account Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Johnson"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#4f35d2] focus:ring-1 focus:ring-[#4f35d2] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@realty.ca"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#4f35d2] focus:ring-1 focus:ring-[#4f35d2] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#4f35d2] focus:ring-1 focus:ring-[#4f35d2] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#4f35d2] focus:ring-1 focus:ring-[#4f35d2] outline-none text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!name || !email || !password || !confirmPassword) {
                    setError("Please fill in all required fields");
                    return;
                  }
                  if (password !== confirmPassword) {
                    setError("Passwords do not match");
                    return;
                  }
                  if (password.length < 8) {
                    setError("Password must be at least 8 characters");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="w-full py-2.5 bg-[#4f35d2] text-white rounded-lg text-sm font-medium hover:bg-[#3d28a8] transition-colors"
              >
                Continue →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold text-[#1a1535]">Professional Info</h2>
              <p className="text-xs text-gray-500">Optional — you can fill this in later from Settings</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="604-555-1234"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#4f35d2] focus:ring-1 focus:ring-[#4f35d2] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brokerage</label>
                <input
                  type="text"
                  value={brokerage}
                  onChange={(e) => setBrokerage(e.target.value)}
                  placeholder="24K Realty Group"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#4f35d2] focus:ring-1 focus:ring-[#4f35d2] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#4f35d2] focus:ring-1 focus:ring-[#4f35d2] outline-none text-sm"
                />
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose Your Plan</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlan("free")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      plan === "free"
                        ? "border-[#4f35d2] bg-[#4f35d2]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-semibold">Free</div>
                    <div className="text-xs text-gray-500">$0/mo</div>
                    <div className="text-xs text-gray-400 mt-1">50 contacts, 3 listings</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlan("professional")}
                    className={`p-3 rounded-xl border-2 text-left transition-all relative ${
                      plan === "professional"
                        ? "border-[#4f35d2] bg-[#4f35d2]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="absolute -top-2 right-2 text-[10px] bg-[#ff5c3a] text-white px-1.5 py-0.5 rounded-full font-medium">Popular</span>
                    <div className="text-sm font-semibold">Professional</div>
                    <div className="text-xs text-gray-500">$29/mo</div>
                    <div className="text-xs text-gray-400 mt-1">Unlimited + AI emails</div>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#4f35d2] text-white rounded-lg text-sm font-medium hover:bg-[#3d28a8] transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">or</span></div>
          </div>

          {/* Google signup */}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign up with Google
          </button>

          {/* Login link */}
          <p className="text-center text-xs text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-[#4f35d2] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
