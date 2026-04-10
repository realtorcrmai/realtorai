"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
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
  Phone,
  Globe,
  Heart,
  UserPlus,
  X,
  Plus,
} from "lucide-react";
import {
  advanceOnboardingStep,
  uploadHeadshot,
  updateProfessionalInfo,
  seedSampleData,
  getOnboardingProgress,
  saveFamilyInfo,
  sendTeamInvite,
  linkReferral,
} from "@/actions/onboarding";
import { EmailSyncStep } from "@/components/onboarding/EmailSyncStep";
import { MLSConnectionStep } from "@/components/onboarding/MLSConnectionStep";
import { CSVImportStep, type ReferralSuggestion } from "@/components/onboarding/CSVImportStep";
import { CelebrationScreen } from "@/components/onboarding/CelebrationScreen";
import { AIBioGenerator } from "@/components/onboarding/AIBioGenerator";

const STEPS = [
  { num: 1, label: "Profile", icon: Camera },
  { num: 2, label: "Contacts", icon: Users },
  { num: 3, label: "Email", icon: Mail },
  { num: 4, label: "Calendar", icon: Calendar },
  { num: 5, label: "Details", icon: Building2 },
  { num: 6, label: "MLS", icon: Globe },
  { num: 7, label: "Start", icon: ArrowRight },
];

/** Step 7: Auto-complete onboarding and redirect to dashboard */
function Step7AutoComplete({ completeOnboarding }: { completeOnboarding: (dest: string) => Promise<void> }) {
  const triggered = useRef(false);
  useEffect(() => {
    if (!triggered.current) {
      triggered.current = true;
      completeOnboarding("/");
    }
  }, [completeOnboarding]);

  return (
    <div className="text-center space-y-4 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <h2 className="text-xl font-bold">Setting up your dashboard...</h2>
      <p className="text-sm text-muted-foreground">Just a moment</p>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  // Step 1: Headshot
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Phone
  const [phone, setPhone] = useState("");

  // Step 1: Family details
  const [spouseName, setSpouseName] = useState("");
  const [kidsCount, setKidsCount] = useState("");
  const [familyFile, setFamilyFile] = useState<File | null>(null);

  // Step 2: Contact import
  const [importSource, setImportSource] = useState<"none" | "gmail" | "apple">("none");
  const [importedContacts, setImportedContacts] = useState<unknown[]>([]);
  const [importCount, setImportCount] = useState(0);
  const [fetchingContacts, setFetchingContacts] = useState(false);

  // Step 2: Referral suggestions (from import)
  const [referralSuggestions, setReferralSuggestions] = useState<ReferralSuggestion[]>([]);

  // Step 5: Professional info
  const [brokerage, setBrokerage] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [bio, setBio] = useState("");
  const [brokerageSuggestions, setBrokerageSuggestions] = useState<string[]>([]);

  // Step 7: Team invite
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDest, setCelebrationDest] = useState("/");

  // ── Resume progress on mount (Fix #3: step persistence) ──
  useEffect(() => {
    getOnboardingProgress().then((progress) => {
      setStep(progress.step);
      if (progress.avatarUrl) setAvatarPreview(progress.avatarUrl);
      setInitialLoading(false);
    }).catch(() => setInitialLoading(false));
  }, []);

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

  // ── Step 1: Save family info before advancing ──
  const handleStep1Continue = async () => {
    if (spouseName.trim() || kidsCount) {
      await saveFamilyInfo({
        spouse_name: spouseName.trim() || undefined,
        kids_count: kidsCount ? parseInt(kidsCount, 10) : undefined,
      });
    }
    // Upload family reference file if provided
    if (familyFile) {
      const formData = new FormData();
      formData.append("file", familyFile);
      await fetch("/api/contacts/import", { method: "POST", body: formData }).catch(() => {});
    }
    goNext();
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

  // ── Step 5: Brokerage search ──
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

  // ── Step 5: Save professional info (includes phone from Step 1) ──
  const saveProfessionalInfo = async () => {
    setLoading(true);
    await updateProfessionalInfo({
      brokerage,
      licenseNumber,
      bio,
      timezone,
      phone,
    });
    setLoading(false);
    goNext();
  };

  // ── Step 7: Send team invites ──
  const handleSendInvites = async () => {
    const validEmails = inviteEmails.filter((e) => e.trim() && e.includes("@"));
    if (validEmails.length === 0) return;
    setInviteSending(true);
    await sendTeamInvite(validEmails);
    setInviteSending(false);
    setInviteSent(true);
  };

  // ── Step 7: Complete onboarding → go straight to dashboard with fireworks ──
  const completeOnboarding = async (destination: string) => {
    await advanceOnboardingStep(8);
    await updateSession();
    // Hard redirect with welcome flag — dashboard fires confetti on ?welcome=1
    window.location.href = destination + (destination.includes("?") ? "&" : "?") + "welcome=1";
  };

  // Show celebration overlay (kept for backward compat — Step 7 now goes direct)
  if (showCelebration) {
    return <CelebrationScreen destination={celebrationDest} />;
  }

  // Loading state while resuming progress
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff]">
      {/* Progress bar — thin gradient at top (matches personalization) */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50">
        <div
          className="h-full bg-gradient-to-r from-[#4f35d2] to-[#ff5c3a] transition-all duration-300 ease-out"
          style={{ width: `${Math.max(8, (step / STEPS.length) * 100)}%` }}
        />
      </div>

      {/* Back button */}
      {step > 1 && (
        <button
          onClick={goBack}
          className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}

      {/* Centered content — no card wrapper, fields on gradient like personalization */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 overflow-y-auto">
        <div className="w-full max-w-xl">
              {error && (
                <div className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700 mb-6">
                  {error}
                </div>
              )}

              {/* ═══ Step 1: Profile Setup ═══ */}
              {step === 1 && (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2 animate-fade-in">
                    Make it yours
                  </h1>
                  <p className="text-gray-500 text-sm text-center mb-8">
                    Set up your profile so clients recognize you
                  </p>

                  {/* Avatar */}
                  <div className="flex flex-col items-center mb-8">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-28 h-28 rounded-full bg-white/80 flex items-center justify-center overflow-hidden ring-4 ring-white shadow-lg hover:ring-[#4f35d2]/30 transition-all mb-3"
                      aria-label="Upload headshot"
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Headshot" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="h-8 w-8 text-gray-300" />
                      )}
                      {loading && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-medium text-[#4f35d2] hover:text-[#3d28a8] transition-colors"
                    >
                      {avatarPreview ? "Change photo" : "Upload photo"}
                    </button>
                  </div>

                  {/* Fields */}
                  <div className="space-y-4 mb-8">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone number (e.g. 604-555-1234)"
                      className="w-full h-12 rounded-xl border-2 border-gray-200 bg-white px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors"
                    />
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-12 rounded-xl border-2 border-gray-200 bg-white px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors appearance-none"
                    >
                      <option value="America/Vancouver">Pacific (Vancouver)</option>
                      <option value="America/Edmonton">Mountain (Edmonton)</option>
                      <option value="America/Winnipeg">Central (Winnipeg)</option>
                      <option value="America/Toronto">Eastern (Toronto)</option>
                      <option value="America/Halifax">Atlantic (Halifax)</option>
                      <option value="America/Los_Angeles">Pacific (LA)</option>
                      <option value="America/New_York">Eastern (New York)</option>
                    </select>
                    <input
                      value={spouseName}
                      onChange={(e) => setSpouseName(e.target.value)}
                      placeholder="Spouse / partner name (optional)"
                      className="w-full h-12 rounded-xl border-2 border-gray-200 bg-white px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors"
                    />
                    <select
                      value={kidsCount}
                      onChange={(e) => setKidsCount(e.target.value)}
                      className="w-full h-12 rounded-xl border-2 border-gray-200 bg-white px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors appearance-none"
                    >
                      <option value="">Number of kids (optional)</option>
                      <option value="0">No kids</option>
                      <option value="1">1 kid</option>
                      <option value="2">2 kids</option>
                      <option value="3">3 kids</option>
                      <option value="4">4+ kids</option>
                    </select>
                    <label className="flex items-center gap-3 w-full h-12 rounded-xl border-2 border-dashed border-gray-200 bg-white/60 px-4 cursor-pointer hover:border-[#4f35d2] transition-colors">
                      <Upload className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-400 flex-1">
                        {familyFile ? <span className="text-foreground font-medium">{familyFile.name}</span> : "Upload family contacts (.csv)"}
                      </span>
                      <input type="file" accept=".csv" onChange={(e) => setFamilyFile(e.target.files?.[0] || null)} className="hidden" />
                      {familyFile && (
                        <button onClick={(e) => { e.preventDefault(); setFamilyFile(null); }} className="text-gray-400 hover:text-red-500">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </label>
                  </div>

                  {/* Continue */}
                  <button
                    onClick={handleStep1Continue}
                    className="w-full max-w-xs mx-auto block py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-colors"
                  >
                    Continue
                  </button>
                  <button onClick={goNext} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors text-center">
                    Skip for now
                  </button>
                </>
              )}

              {/* ═══ Step 2: Contact Import ═══ */}
              {step === 2 && (
                <>
                  {importSource === "none" && importCount === 0 && (
                    <>
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2 animate-fade-in">
                        Bring your contacts
                      </h1>
                      <p className="text-gray-500 text-sm text-center mb-8">
                        Your CRM works best with your real contacts
                      </p>

                      <div className="space-y-3">
                        <button
                          onClick={fetchGmailContacts}
                          disabled={fetchingContacts}
                          className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#4f35d2] transition-colors text-left"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 shrink-0">
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">Import from Gmail</p>
                            <p className="text-xs text-gray-500">One-click — read-only, never modify</p>
                          </div>
                          {fetchingContacts && <Loader2 className="h-4 w-4 animate-spin text-[#4f35d2] shrink-0" />}
                        </button>

                        <label className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-[#4f35d2] transition-colors text-left cursor-pointer">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 shrink-0">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83" fill="#000" />
                              <path d="M15.24 2c.13 1.05-.31 2.13-1.01 2.89-.71.77-1.87 1.36-3 1.28-.15-1.02.36-2.09 1.03-2.77.72-.73 1.96-1.28 2.98-1.4" fill="#000" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">Import from Apple</p>
                            <p className="text-xs text-gray-500">Upload .vcf from iCloud or iPhone</p>
                          </div>
                          {fetchingContacts && <Loader2 className="h-4 w-4 animate-spin text-[#4f35d2] shrink-0" />}
                          <input type="file" accept=".vcf" onChange={handleVcardUpload} className="hidden" />
                        </label>
                      </div>

                      {/* CSV Import */}
                      <CSVImportStep
                        onImported={(count, suggestions) => {
                          setImportCount(count);
                          setImportSource("none");
                          if (suggestions?.length) setReferralSuggestions(suggestions);
                        }}
                        onSkip={goNext}
                      />

                      <button
                        onClick={goNext}
                        className="w-full py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-colors"
                      >
                        Continue
                      </button>
                      <button
                        onClick={async () => { await seedSampleData(); goNext(); }}
                        className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors mt-3"
                      >
                        Skip — use sample data
                      </button>
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
                      onSkip={goNext}
                    />
                  )}

                  {/* Import success */}
                  {importCount > 0 && importSource === "none" && (
                    <div className="text-center space-y-4">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-muted">
                        <Check className="h-8 w-8 text-brand" />
                      </div>
                      <h2 className="text-xl font-bold">{importCount} contacts imported!</h2>
                      <p className="text-sm text-muted-foreground">
                        You&apos;re ahead of 80% of new users
                      </p>

                      {/* Referral suggestions */}
                      {referralSuggestions.length > 0 && (
                        <div className="space-y-2 text-left">
                          <p className="text-sm font-medium">We noticed some possible referrals:</p>
                          {referralSuggestions.map((s) => (
                            <div
                              key={s.contact_id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50/50 text-sm"
                            >
                              <div className="flex-1">
                                <span className="font-medium">{s.contact_name}</span>
                                <span className="text-muted-foreground"> may have been referred by </span>
                                <span className="font-medium">{s.possible_referrer_name}</span>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs bg-white"
                                  onClick={async () => {
                                    await linkReferral(s.contact_id, s.possible_referrer_id);
                                    setReferralSuggestions((prev) => prev.filter((r) => r.contact_id !== s.contact_id));
                                  }}
                                >
                                  <Check className="h-3 w-3 mr-1" /> Link
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => setReferralSuggestions((prev) => prev.filter((r) => r.contact_id !== s.contact_id))}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button className="w-full" onClick={goNext}>
                        Continue <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* ═══ Step 3: Email Sync ═══ */}
              {step === 3 && (
                <EmailSyncStep
                  onNext={goNext}
                  onBack={goBack}
                  onSkip={goNext}
                />
              )}

              {/* ═══ Step 4: Google Calendar ═══ */}
              {step === 4 && (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2 animate-fade-in">
                    Connect your calendar
                  </h1>
                  <p className="text-gray-500 text-sm text-center mb-8">
                    See showings and tasks on your Google Calendar
                  </p>

                  <button
                    onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
                    className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 bg-white hover:border-[#4f35d2] transition-colors text-left mb-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 shrink-0">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Connect Google Calendar</p>
                      <p className="text-xs text-gray-500">Sync showings, tasks, and appointments</p>
                    </div>
                  </button>

                  <p className="text-xs text-center text-gray-400 mb-6">
                    Already connected? Continue below.
                  </p>

                  <button onClick={goNext} className="w-full max-w-xs mx-auto block py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-colors">
                    Continue
                  </button>
                  <button onClick={goNext} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors text-center">
                    Skip for now
                  </button>
                </>
              )}

              {/* ═══ Step 5: Professional Details ═══ */}
              {step === 5 && (
                <>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2 animate-fade-in">
                    Professional details
                  </h1>
                  <p className="text-gray-500 text-sm text-center mb-8">
                    Optional — you can fill this in later
                  </p>

                  <div className="space-y-4 mb-8">
                    <div className="relative">
                      <input
                        placeholder="Brokerage name"
                        value={brokerage}
                        onChange={(e) => setBrokerage(e.target.value)}
                        className="w-full h-12 rounded-xl border-2 border-gray-200 bg-white px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors"
                      />
                      {brokerageSuggestions.length > 0 && (
                        <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-xl shadow-lg py-1 overflow-hidden">
                          {brokerageSuggestions.map((s) => (
                            <button
                              key={s}
                              onClick={() => { setBrokerage(s); setBrokerageSuggestions([]); }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      placeholder="License number (optional)"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="w-full h-12 rounded-xl border-2 border-gray-200 bg-white px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors"
                    />
                    <div>
                      <textarea
                        placeholder="Short bio or tagline — e.g. Vancouver realtor specializing in condos"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#4f35d2] transition-colors"
                      />
                      <AIBioGenerator bio={bio} onBioChange={setBio} />
                    </div>
                  </div>

                  <button
                    onClick={saveProfessionalInfo}
                    disabled={loading}
                    className="w-full max-w-xs mx-auto block py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-colors disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Continue"}
                  </button>
                  <button onClick={goNext} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors text-center">
                    Skip for now
                  </button>
                </>
              )}

              {/* ═══ Step 6: MLS Connection ═══ */}
              {step === 6 && (
                <MLSConnectionStep
                  onNext={goNext}
                  onBack={goBack}
                  onSkip={goNext}
                />
              )}

              {/* ═══ Step 7: Auto-complete → Dashboard ═══ */}
              {step === 7 && (
                <Step7AutoComplete completeOnboarding={completeOnboarding} />
              )}
        </div>
      </div>
    </div>
  );
}
