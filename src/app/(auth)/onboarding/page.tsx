"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContactImportPreview } from "@/components/onboarding/ContactImportPreview";
import {
  Home,
  Camera,
  Upload,
  Users,
  Calendar,
  Building2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  LayoutDashboard,
  Mail,
  Sparkles,
} from "lucide-react";
import {
  advanceOnboardingStep,
  uploadHeadshot,
  updateProfessionalInfo,
  seedSampleData,
} from "@/actions/onboarding";

const STEPS = [
  { num: 1, label: "Profile", icon: Camera },
  { num: 2, label: "Contacts", icon: Users },
  { num: 3, label: "Calendar", icon: Calendar },
  { num: 4, label: "Details", icon: Building2 },
  { num: 5, label: "Start", icon: ArrowRight },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Headshot
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Contact import
  const [importSource, setImportSource] = useState<"none" | "gmail" | "apple">("none");
  const [importedContacts, setImportedContacts] = useState<unknown[]>([]);
  const [importCount, setImportCount] = useState(0);
  const [vcardFile, setVcardFile] = useState<File | null>(null);
  const [fetchingContacts, setFetchingContacts] = useState(false);

  // Step 4: Professional info
  const [brokerage, setBrokerage] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [bio, setBio] = useState("");
  const [brokerageSuggestions, setBrokerageSuggestions] = useState<string[]>([]);

  const goNext = useCallback(async () => {
    setError("");
    const nextStep = step + 1;
    await advanceOnboardingStep(nextStep);
    setStep(nextStep);
  }, [step]);

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  // ── Step 1: Headshot upload ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadHeadshot(formData);

    if ("error" in result && result.error) {
      setError(result.error);
      setAvatarPreview(null);
    }
    setLoading(false);
  };

  // ── Step 2: Gmail import ──
  const fetchGmailContacts = async () => {
    setFetchingContacts(true);
    setError("");

    try {
      const res = await fetch("/api/contacts/import-gmail");
      const data = await res.json();

      if (data.needs_auth) {
        signIn("google", { callbackUrl: "/onboarding" });
        return;
      }
      if (!res.ok) {
        setError(data.error || "Failed to fetch contacts");
        setFetchingContacts(false);
        return;
      }

      setImportedContacts(data.contacts);
      setImportSource("gmail");
    } catch {
      setError("Failed to connect to Gmail");
    } finally {
      setFetchingContacts(false);
    }
  };

  // ── Step 2: vCard upload ──
  const handleVcardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVcardFile(file);
    setFetchingContacts(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/contacts/import-vcard", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to parse file");
        setFetchingContacts(false);
        return;
      }

      setImportedContacts(data.contacts);
      setImportSource("apple");
    } catch {
      setError("Failed to parse vCard file");
    } finally {
      setFetchingContacts(false);
    }
  };

  const handleImportSelected = async (selected: unknown[]) => {
    const endpoint =
      importSource === "gmail"
        ? "/api/contacts/import-gmail"
        : "/api/contacts/import-vcard";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacts: selected }),
    });

    const data = await res.json();
    setImportCount(data.imported || 0);
    setImportedContacts([]);
    setImportSource("none");
  };

  // ── Step 4: Brokerage search ──
  useEffect(() => {
    if (brokerage.length < 2) {
      setBrokerageSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { searchBrokerages } = await import("@/actions/onboarding");
        const results = await searchBrokerages(brokerage);
        setBrokerageSuggestions(results);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [brokerage]);

  // ── Step 4: Save professional info ──
  const saveProfessionalInfo = async () => {
    setLoading(true);
    await updateProfessionalInfo({
      brokerage,
      licenseNumber,
      bio,
      timezone,
    });
    setLoading(false);
    goNext();
  };

  // ── Step 5: Complete onboarding ──
  const completeOnboarding = async (destination: string) => {
    await advanceOnboardingStep(6);
    router.push(destination);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
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
              Let&apos;s set up
              <br />
              your workspace
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md">
              {step === 1 && "Add a photo so clients recognize you."}
              {step === 2 && "Import your contacts to get started fast."}
              {step === 3 && "Connect your calendar for showing management."}
              {step === 4 && "Add your professional details."}
              {step === 5 && "You're all set! Choose where to start."}
            </p>
          </div>
          {/* Progress */}
          <div className="flex gap-2">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step >= s.num ? "bg-white" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile progress */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">RealtorAI</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1 lg:hidden">
            {STEPS.map((s) => (
              <div
                key={s.num}
                className={`h-1 flex-1 max-w-12 rounded-full ${
                  step >= s.num ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <Card className="border-0 shadow-none lg:border lg:shadow-sm">
            <CardContent className="p-0 lg:p-6 space-y-5">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* ═══ Step 1: Headshot + Timezone ═══ */}
              {step === 1 && (
                <>
                  <div className="text-center">
                    <h2 className="text-xl font-bold">Make it yours</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add a photo so clients recognize you
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                      aria-label="Upload headshot"
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Headshot" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                      {loading && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {avatarPreview ? "Change photo" : "Upload photo"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-11 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="America/Vancouver">Pacific (Vancouver)</option>
                      <option value="America/Edmonton">Mountain (Edmonton)</option>
                      <option value="America/Winnipeg">Central (Winnipeg)</option>
                      <option value="America/Toronto">Eastern (Toronto)</option>
                      <option value="America/Halifax">Atlantic (Halifax)</option>
                      <option value="America/Los_Angeles">Pacific (LA)</option>
                      <option value="America/New_York">Eastern (New York)</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button className="flex-1" onClick={goNext}>
                      Continue <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <button
                    onClick={goNext}
                    className="w-full text-xs text-muted-foreground hover:underline text-center"
                  >
                    Skip for now
                  </button>
                </>
              )}

              {/* ═══ Step 2: Contact Import ═══ */}
              {step === 2 && (
                <>
                  {importSource === "none" && importCount === 0 && (
                    <>
                      <div className="text-center">
                        <h2 className="text-xl font-bold">Bring your contacts</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your CRM works best with your real contacts
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <button
                          onClick={fetchGmailContacts}
                          disabled={fetchingContacts}
                          className="flex items-center gap-4 p-4 rounded-xl border-2 border-muted hover:border-primary transition-colors text-left"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 shrink-0">
                            <svg className="h-6 w-6" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold">Import from Gmail</p>
                            <p className="text-xs text-muted-foreground">
                              One-click — we read your contacts (read-only, never modify)
                            </p>
                          </div>
                          {fetchingContacts && (
                            <Loader2 className="h-5 w-5 animate-spin text-primary ml-auto" />
                          )}
                        </button>

                        <label className="flex items-center gap-4 p-4 rounded-xl border-2 border-muted hover:border-primary transition-colors text-left cursor-pointer">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 shrink-0">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83" fill="#000" />
                              <path d="M15.24 2c.13 1.05-.31 2.13-1.01 2.89-.71.77-1.87 1.36-3 1.28-.15-1.02.36-2.09 1.03-2.77.72-.73 1.96-1.28 2.98-1.4" fill="#000" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-semibold">Import from Apple</p>
                            <p className="text-xs text-muted-foreground">
                              Upload your .vcf file from iCloud or iPhone
                            </p>
                          </div>
                          <input
                            type="file"
                            accept=".vcf"
                            onChange={handleVcardUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={goBack}>
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          Back
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={async () => {
                          await seedSampleData();
                          goNext();
                        }}>
                          Skip — use sample data
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Contact preview */}
                  {importSource !== "none" && importedContacts.length > 0 && (
                    <ContactImportPreview
                      contacts={importedContacts as never[]}
                      source={importSource}
                      onImport={async (selected) => {
                        await handleImportSelected(selected);
                      }}
                      onBack={() => {
                        setImportSource("none");
                        setImportedContacts([]);
                      }}
                    />
                  )}

                  {/* Import success */}
                  {importCount > 0 && importSource === "none" && (
                    <div className="text-center space-y-4">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F7694]/10">
                        <Check className="h-8 w-8 text-[#0F7694]" />
                      </div>
                      <h2 className="text-xl font-bold">{importCount} contacts imported!</h2>
                      <p className="text-sm text-muted-foreground">
                        You&apos;re ahead of 80% of new users
                      </p>
                      <Button className="w-full" onClick={goNext}>
                        Continue <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* ═══ Step 3: Google Calendar ═══ */}
              {step === 3 && (
                <>
                  <div className="text-center">
                    <h2 className="text-xl font-bold">Connect your calendar</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      See showings and tasks on your Google Calendar
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-12"
                    onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Connect Google Calendar
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Already connected? You&apos;re all set — continue below.
                  </p>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={goBack}>
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <Button className="flex-1" onClick={goNext}>
                      Continue <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <button
                    onClick={goNext}
                    className="w-full text-xs text-muted-foreground hover:underline text-center"
                  >
                    Skip for now
                  </button>
                </>
              )}

              {/* ═══ Step 4: Professional Details ═══ */}
              {step === 4 && (
                <>
                  <div className="text-center">
                    <h2 className="text-xl font-bold">Professional details</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Optional — you can fill this in later
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2 relative">
                      <Label>Brokerage</Label>
                      <Input
                        placeholder="24K Realty Group"
                        value={brokerage}
                        onChange={(e) => setBrokerage(e.target.value)}
                        className="h-11"
                      />
                      {brokerageSuggestions.length > 0 && (
                        <div className="absolute z-10 top-full mt-1 w-full bg-background border rounded-lg shadow-lg py-1">
                          {brokerageSuggestions.map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setBrokerage(s);
                                setBrokerageSuggestions([]);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>License number</Label>
                      <Input
                        placeholder="Optional"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Short bio / tagline</Label>
                      <textarea
                        placeholder="Vancouver realtor specializing in condos and townhomes"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={goBack}>
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <Button className="flex-1" disabled={loading} onClick={saveProfessionalInfo}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4 ml-1" /></>}
                    </Button>
                  </div>
                  <button onClick={goNext} className="w-full text-xs text-muted-foreground hover:underline text-center">
                    Skip for now
                  </button>
                </>
              )}

              {/* ═══ Step 5: Choose Action ═══ */}
              {step === 5 && (
                <>
                  <div className="text-center">
                    <h2 className="text-xl font-bold">You&apos;re all set!</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      What would you like to do first?
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        icon: Users,
                        label: "Manage my contacts",
                        desc: "Organize, tag, and follow up with your clients",
                        href: "/contacts",
                      },
                      {
                        icon: Mail,
                        label: "Set up email marketing",
                        desc: "Create newsletters and automated drip campaigns",
                        href: "/newsletters",
                      },
                      {
                        icon: LayoutDashboard,
                        label: "Explore the dashboard",
                        desc: "See everything Realtors360 has to offer",
                        href: "/",
                      },
                    ].map((option) => (
                      <button
                        key={option.href}
                        onClick={() => completeOnboarding(option.href)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-muted hover:border-primary transition-colors text-left"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                          <option.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                      </button>
                    ))}
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
