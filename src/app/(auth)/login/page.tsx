"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { LogoSpinner, LogoVideo } from "@/components/brand/Logo";
import Link from "next/link";

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
      // Check session to determine redirect target
      try {
        const sess = await fetch("/api/auth/session").then(r => r.json());
        if (sess?.user?.role === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      } catch {
        window.location.href = "/";
      }
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
          <LogoVideo size={380} />

          {/* Brand text below logo */}
          <div className="text-center mt-6 space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Magnate
            </h1>
            <p className="text-sm text-white/40 tracking-widest uppercase">
              360° AI Platform for Realtors
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
          <div className="lg:hidden flex flex-col items-center mb-4">
            <LogoVideo size={200} />
            <h1 className="text-2xl font-bold tracking-tight mt-2">Magnate</h1>
            <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">
              360° AI Platform for Realtors
            </p>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
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
                    <LogoSpinner size={16} />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </form>

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
