"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { LogoIcon } from "@/components/brand/Logo";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <LogoIcon size={36} />
          <span className="text-xl font-bold tracking-tight">Magnate</span>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Forgot password?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-6 space-y-5">
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Check your email</h3>
                  <p className="text-sm text-muted-foreground">
                    If an account exists for <strong>{email}</strong>, we&apos;ve sent a
                    password reset link.
                  </p>
                </div>
                <Link href="/login">
                  <Button variant="outline" className="w-full h-11 mt-4">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    disabled={!email || loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                  </Button>
                </form>

                <Link href="/login" className="block">
                  <Button variant="ghost" className="w-full h-11 text-muted-foreground">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Sign In
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
