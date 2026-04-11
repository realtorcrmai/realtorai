"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { LogoVideo, LogoIcon } from "@/components/brand/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      window.location.href = "/";
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding with animated logo */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: "#0a1628" }}>
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-40" style={{ background: "radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 60%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, rgba(45,62,80,0.15) 0%, transparent 60%)" }} />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          {/* Animated 3D logo */}
          <LogoVideo size={300} />

          {/* Brand text below logo */}
          <div className="text-center mt-6 space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Realtors360
            </h1>
            <p className="text-sm text-white/40 tracking-widest uppercase">
              AI-Powered Real Estate Platform
            </p>
          </div>

          {/* Tagline */}
          <p className="text-center text-white/30 text-xs mt-12 max-w-xs">
            Trusted by real estate professionals across British Columbia
          </p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-2">
            <LogoIcon size={36} />
            <span className="text-xl font-bold tracking-tight">Realtors360</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to your account to continue
            </p>
          </div>

          <Card className="border-0 shadow-none lg:border lg:shadow-sm">
            <CardContent className="p-0 lg:p-6 space-y-5">
              <form onSubmit={handleCredentialsLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="demo@realestatecrm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                {error && (
                  <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </form>

              {/* Quick login — demo accounts */}
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs text-muted-foreground text-center font-medium">
                  Quick Login (Demo)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Kunal (Pro)", email: "demo@realestatecrm.com", color: "bg-brand-muted text-brand-dark hover:bg-brand/20" },
                    { label: "Sarah (Studio)", email: "sarah@realtors360.com", color: "bg-brand-muted text-brand-dark hover:bg-brand-muted-strong" },
                    { label: "Mike (Pro)", email: "mike@realtors360.com", color: "bg-amber-100 text-amber-700 hover:bg-amber-200" },
                    { label: "Priya (Free)", email: "priya@realtors360.com", color: "bg-pink-100 text-pink-700 hover:bg-pink-200" },
                    { label: "Admin", email: "admin@realtors360.com", color: "bg-gray-100 text-gray-700 hover:bg-gray-200 col-span-2" },
                  ].map((user) => (
                    <button
                      key={user.email}
                      type="button"
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${user.color}`}
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        setError("");
                        const result = await signIn("credentials", {
                          email: user.email,
                          password: "demo1234",
                          redirect: false,
                        });
                        if (result?.error) {
                          setError("Login failed");
                          setLoading(false);
                        } else {
                          window.location.href = "/";
                        }
                      }}
                    >
                      {user.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-3">
                Don&apos;t have an account?{" "}
                <a href="/signup" className="text-primary font-medium hover:underline">
                  Sign up free
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
