"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Smartphone, AlertCircle } from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";
import { formatPhone, normalizePhoneE164 } from "@/lib/format";

export default function VerifyPhonePage() {
  const router = useRouter();
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [remaining, setRemaining] = useState(5);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSendCode = useCallback(async () => {
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhoneE164(phone) ?? phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send code");
        setLoading(false);
        return;
      }

      setStep("verify");
      setCooldown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;

      const newOtp = [...otp];
      newOtp[index] = value.slice(-1);
      setOtp(newOtp);

      // Auto-advance to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 digits entered
      const fullCode = newOtp.join("");
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    },
    [otp]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      verifyCode(pasted);
    }
  }, []);

  const verifyCode = async (code: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        if (data.remaining !== undefined) setRemaining(data.remaining);
        if (data.locked) setRemaining(0);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // Success — redirect to onboarding
      router.push("/onboarding");
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
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
              Verify your phone
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              Your phone number enables showing notifications, lockbox codes,
              and WhatsApp automations.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/50">
            We&apos;ll send a 6-digit code via SMS
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
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {step === "enter" ? "Enter your phone" : "Enter verification code"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {step === "enter"
                ? "We'll send a 6-digit code to verify your number"
                : `Code sent to ${phone}`}
            </p>
          </div>

          <Card className="border-0 shadow-none lg:border lg:shadow-sm">
            <CardContent className="p-0 lg:p-6 space-y-4">
              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    {error}
                    {remaining < 5 && remaining > 0 && (
                      <span className="block text-xs mt-1">
                        {remaining} attempt{remaining !== 1 ? "s" : ""} remaining
                      </span>
                    )}
                  </div>
                </div>
              )}

              {step === "enter" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile number</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                        +1
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(604) 555-1234"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={(e) => {
                          // Format without the +1 prefix since it's shown separately in the UI
                          const formatted = formatPhone(e.target.value);
                          setPhone(formatted.replace(/^\+1\s*/, ""));
                        }}
                        className="h-11"
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full h-11 font-semibold"
                    disabled={loading}
                    onClick={handleSendCode}
                  >
                    {loading ? (
                      <LogoSpinner size={16} />
                    ) : (
                      "Send code"
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* OTP Input — 6 digit boxes */}
                  <div
                    className="flex justify-center gap-2"
                    onPaste={handlePaste}
                  >
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-bold border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                        aria-label={`Digit ${i + 1}`}
                        disabled={loading}
                      />
                    ))}
                  </div>

                  {loading && (
                    <div className="flex justify-center">
                      <LogoSpinner size={20} />
                    </div>
                  )}

                  {/* Resend */}
                  <div className="text-center space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={cooldown > 0}
                      onClick={handleSendCode}
                    >
                      {cooldown > 0
                        ? `Resend in ${cooldown}s`
                        : "Resend code"}
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setStep("enter");
                        setOtp(["", "", "", "", "", ""]);
                        setError("");
                      }}
                    >
                      Change number
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
