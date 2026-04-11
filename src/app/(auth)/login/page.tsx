"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Loader2, ArrowRight } from "lucide-react";

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
              Streamline your
              <br />
              real estate workflow
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              Manage listings, automate showings, and stay on top of every
              transaction — all in one place.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/50">
            Trusted by real estate professionals across British Columbia
          </p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">RealtorAI</span>
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
