"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { X, Camera, Upload, ArrowLeft, ArrowRight, Check, Building2, Globe } from "lucide-react";
import { PersonalizationCard } from "@/components/onboarding/PersonalizationCard";
import { PersonalizationPills } from "@/components/onboarding/PersonalizationPills";
import { MLSConnectionStep } from "@/components/onboarding/MLSConnectionStep";
import { CSVImportStep, type ReferralSuggestion } from "@/components/onboarding/CSVImportStep";
import { AIBioGenerator } from "@/components/onboarding/AIBioGenerator";
import { LogoSpinner } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { formatPhone, normalizePhoneE164, titleCaseName } from "@/lib/format";
import {
  savePersonalizationStep,
  completePersonalization,
} from "@/actions/personalization";
import {
  advanceOnboardingStep,
  updateProfessionalInfo,
  seedSampleData,
  saveFamilyInfo,
} from "@/actions/onboarding";

// ── Personalization screen configs ──
const P_SCREENS = [
  {
    question: "What describes you best?",
    subtitle: "This helps us personalize your experience",
    type: "cards" as const,
    field: "onboarding_persona" as const,
    multiSelect: false,
    options: [
      { value: "solo_agent", icon: "🏠", label: "Solo Agent", description: "I manage my own clients and listings" },
      { value: "team_lead", icon: "👥", label: "Team Lead", description: "I lead a team of agents" },
      { value: "brokerage_admin", icon: "🏢", label: "Brokerage Admin", description: "I manage operations for a brokerage" },
      { value: "new_agent", icon: "🌟", label: "New to Real Estate", description: "I'm just getting started in the industry" },
    ],
  },
  {
    question: "What's your primary focus?",
    subtitle: "Select all that apply",
    type: "cards" as const,
    field: "onboarding_market" as const,
    multiSelect: true,
    options: [
      { value: "residential", icon: "🏡", label: "Residential", description: "Houses, condos, townhomes" },
      { value: "commercial", icon: "🏗️", label: "Commercial", description: "Office, retail, industrial" },
      { value: "luxury", icon: "💎", label: "Luxury / Prestige", description: "High-end properties $2M+" },
      { value: "property_mgmt", icon: "🔑", label: "Property Management", description: "Rentals and tenant management" },
    ],
  },
  {
    question: "How big is your team?",
    subtitle: "Helps us set up the right collaboration tools",
    type: "pills" as const,
    field: "onboarding_team_size" as const,
    multiSelect: false,
    options: [
      { value: "just_me", label: "Just me" },
      { value: "2_5", label: "2-5" },
      { value: "6_10", label: "6-10" },
      { value: "11_plus", label: "11+" },
    ],
  },
  {
    question: "How long have you been in real estate?",
    subtitle: "We'll adjust guidance to your experience level",
    type: "pills" as const,
    field: "onboarding_experience" as const,
    multiSelect: false,
    options: [
      { value: "new", label: "New (< 1 year)" },
      { value: "1_3_years", label: "1-3 years" },
      { value: "3_10_years", label: "3-10 years" },
      { value: "10_plus", label: "10+ years" },
    ],
  },
  {
    question: "What do you want to tackle first?",
    subtitle: "Pick 1-3 priorities",
    type: "cards" as const,
    field: "onboarding_focus" as const,
    multiSelect: true,
    options: [
      { value: "contacts", icon: "📇", label: "Manage Contacts", description: "Organize your client database" },
      { value: "listings", icon: "🏠", label: "List Properties", description: "Create and manage listings" },
      { value: "marketing", icon: "📧", label: "Email Marketing", description: "Send newsletters and drip campaigns" },
      { value: "showings", icon: "📅", label: "Schedule Showings", description: "Book and track property viewings" },
      { value: "ai_content", icon: "🤖", label: "AI Content", description: "Generate MLS remarks and social posts" },
      { value: "import", icon: "📥", label: "Import Data", description: "Bring in contacts from other tools" },
    ],
  },
];

const TOTAL_PERSONALIZATION = P_SCREENS.length;
const TOTAL_ONBOARDING = 4; // profile, contacts, details, MLS
const TOTAL_STEPS = TOTAL_PERSONALIZATION + TOTAL_ONBOARDING;

type Phase = "personalization" | "onboarding";

interface OnboardingOverlayProps {
  needsPersonalization: boolean;
  needsOnboarding: boolean;
}

export function OnboardingOverlay({ needsPersonalization, needsOnboarding }: OnboardingOverlayProps) {
  const { update: updateSession } = useSession();
  const router = useRouter();

  // Dismiss state — persisted in localStorage
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("onboarding-dismissed") === "true";
  });

  // Flow state
  const [phase, setPhase] = useState<Phase>(needsPersonalization ? "personalization" : "onboarding");
  const [pScreen, setPScreen] = useState(0);
  const [oStep, setOStep] = useState(1);
  const [selections, setSelections] = useState<Record<string, string | string[] | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Onboarding step state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [spouseName, setSpouseName] = useState("");
  const [kidsCount, setKidsCount] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [bio, setBio] = useState("");
  const [brokerageSuggestions, setBrokerageSuggestions] = useState<string[]>([]);
  const [importCount, setImportCount] = useState(0);
  const [fetchingContacts, setFetchingContacts] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current progress for the progress bar
  const currentStep = phase === "personalization"
    ? pScreen + 1
    : TOTAL_PERSONALIZATION + oStep;
  const progressPercent = Math.max(5, (currentStep / TOTAL_STEPS) * 100);

  // Skip personalization phase if not needed
  useEffect(() => {
    if (!needsPersonalization && phase === "personalization") {
      setPhase("onboarding");
    }
  }, [needsPersonalization, phase]);

  // If nothing needed or dismissed, don't render
  if (dismissed || (!needsPersonalization && !needsOnboarding)) return null;

  const handleDismiss = () => {
    localStorage.setItem("onboarding-dismissed", "true");
    setDismissed(true);
  };

  // ── Personalization handlers ──
  const currentPConfig = P_SCREENS[pScreen];

  const handlePSelect = (value: string) => {
    if (!currentPConfig) return;
    if (currentPConfig.multiSelect) {
      setSelections((prev) => {
        const current = (prev[currentPConfig.field] as string[]) || [];
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : current.length < 3 ? [...current, value] : current;
        return { ...prev, [currentPConfig.field]: updated };
      });
    } else {
      setSelections((prev) => ({ ...prev, [currentPConfig.field]: value }));
    }
  };

  const handlePContinue = async () => {
    if (!currentPConfig) return;
    setSaving(true);
    const value = selections[currentPConfig.field] ?? null;
    await savePersonalizationStep(currentPConfig.field, value);

    if (pScreen < TOTAL_PERSONALIZATION - 1) {
      setPScreen(pScreen + 1);
    } else {
      // Personalization done → move to onboarding
      await completePersonalization();
      await updateSession();
      if (needsOnboarding) {
        setPhase("onboarding");
      } else {
        handleDismiss();
        router.refresh();
      }
    }
    setSaving(false);
  };

  const handlePSkip = async () => {
    setSaving(true);
    if (currentPConfig) {
      await savePersonalizationStep(currentPConfig.field, null);
    }
    if (pScreen < TOTAL_PERSONALIZATION - 1) {
      setPScreen(pScreen + 1);
    } else {
      await completePersonalization();
      await updateSession();
      if (needsOnboarding) {
        setPhase("onboarding");
      } else {
        handleDismiss();
        router.refresh();
      }
    }
    setSaving(false);
  };

  const hasPSelection = currentPConfig
    ? currentPConfig.multiSelect
      ? ((selections[currentPConfig.field] as string[]) || []).length > 0
      : !!selections[currentPConfig.field]
    : false;

  // ── Onboarding handlers ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Only JPG, PNG, and WebP accepted"); return; }

    setAvatarPreview(URL.createObjectURL(file));
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/onboarding/upload-avatar", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok || result.error) { setError(result.error || "Upload failed"); setAvatarPreview(null); }
    } catch { setError("Upload failed"); setAvatarPreview(null); }
    setLoading(false);
  };

  const handleONext = async () => {
    setError("");
    const next = oStep + 1;
    await advanceOnboardingStep(next);
    setOStep(next);
  };

  const handleStep1Continue = async () => {
    if (spouseName.trim() || kidsCount) {
      await saveFamilyInfo({
        spouse_name: spouseName.trim() || undefined,
        kids_count: kidsCount ? parseInt(kidsCount, 10) : undefined,
      });
    }
    await handleONext();
  };

  const saveProfessionalInfo = async () => {
    setLoading(true);
    await updateProfessionalInfo({
      brokerage,
      licenseNumber,
      bio,
      timezone,
      phone: normalizePhoneE164(phone) ?? phone,
    });
    setLoading(false);
    handleONext();
  };

  const handleComplete = async () => {
    await advanceOnboardingStep(6);
    await updateSession();
    localStorage.removeItem("onboarding-dismissed");
    setDismissed(true);
    window.location.href = "/?welcome=1";
  };

  // Google CSV import
  const handleGoogleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFetchingContacts(true);
    setError("");
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { setError("No contacts found in file"); setFetchingContacts(false); return; }
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      const nameIdx = headers.findIndex((h) => /^(name|full name)$/i.test(h));
      const givenIdx = headers.findIndex((h) => /given name/i.test(h));
      const familyIdx = headers.findIndex((h) => /family name/i.test(h));
      const emailIdx = headers.findIndex((h) => /e-?mail/i.test(h));
      const phoneIdx = headers.findIndex((h) => /phone/i.test(h));
      const contacts = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
        const name = (nameIdx >= 0 ? cols[nameIdx] : "") || [cols[givenIdx] || "", cols[familyIdx] || ""].filter(Boolean).join(" ");
        if (!name) continue;
        contacts.push({ name, email: emailIdx >= 0 ? cols[emailIdx] || null : null, phone: phoneIdx >= 0 ? cols[phoneIdx] || null : null });
      }
      if (contacts.length === 0) { setError("No contacts found"); setFetchingContacts(false); return; }
      const res = await fetch("/api/contacts/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contacts, source: "google_csv" }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Import failed"); } else { setImportCount(data.imported || 0); }
    } catch { setError("Failed to import Google contacts"); }
    finally { setFetchingContacts(false); }
  };

  const handleVcardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFetchingContacts(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/contacts/import-vcard", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to parse file"); setFetchingContacts(false); return; }
      setImportCount(data.imported || 0);
    } catch { setError("Failed to import vCard file"); }
    finally { setFetchingContacts(false); }
  };

  // Brokerage search
  useEffect(() => {
    if (brokerage.length < 2) { setBrokerageSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { searchBrokerages } = await import("@/actions/onboarding");
        const results = await searchBrokerages(brokerage);
        setBrokerageSuggestions(results);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [brokerage]);

  const handleBack = () => {
    if (phase === "onboarding" && oStep > 1) {
      setOStep(oStep - 1);
    } else if (phase === "onboarding" && oStep === 1 && needsPersonalization) {
      setPhase("personalization");
      setPScreen(TOTAL_PERSONALIZATION - 1);
    } else if (phase === "personalization" && pScreen > 0) {
      setPScreen(pScreen - 1);
    }
  };

  const canGoBack = (phase === "personalization" && pScreen > 0) || (phase === "onboarding" && (oStep > 1 || needsPersonalization));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff] rounded-2xl shadow-2xl overflow-y-auto">
        {/* Progress bar */}
        <div className="sticky top-0 left-0 right-0 h-1 z-10">
          <div
            className="h-full bg-gradient-to-r from-[#4f35d2] to-[#ff5c3a] transition-all duration-300 ease-out rounded-tl-2xl"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/80 border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
          aria-label="Close onboarding"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Back button */}
        {canGoBack && (
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-white/80 border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
        )}

        {/* Content */}
        <div className="px-6 py-10 md:px-10">
          {error && (
            <div className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700 mb-6">{error}</div>
          )}

          {/* ════ PERSONALIZATION PHASE ════ */}
          {phase === "personalization" && currentPConfig && (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">{currentPConfig.question}</h1>
              <p className="text-gray-500 text-sm mb-8">{currentPConfig.subtitle}</p>

              {currentPConfig.type === "cards" ? (
                <div className={`grid gap-3 mb-8 ${currentPConfig.options.length > 4 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"}`}>
                  {currentPConfig.options.map((opt) => (
                    <PersonalizationCard
                      key={opt.value}
                      icon={"icon" in opt ? opt.icon : ""}
                      label={opt.label}
                      description={"description" in opt ? opt.description : ""}
                      selected={
                        currentPConfig.multiSelect
                          ? ((selections[currentPConfig.field] as string[]) || []).includes(opt.value)
                          : selections[currentPConfig.field] === opt.value
                      }
                      onClick={() => handlePSelect(opt.value)}
                    />
                  ))}
                </div>
              ) : (
                <div className="mb-8">
                  <PersonalizationPills
                    options={currentPConfig.options}
                    selected={selections[currentPConfig.field] as string | null}
                    onSelect={handlePSelect}
                  />
                </div>
              )}

              <button
                onClick={handlePContinue}
                disabled={!hasPSelection || saving}
                className="w-full max-w-xs mx-auto py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-colors disabled:opacity-40"
              >
                {saving ? "Saving..." : "Continue"}
              </button>
              <button
                onClick={handlePSkip}
                disabled={saving}
                className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors block mx-auto"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* ════ ONBOARDING PHASE ════ */}

          {/* Step 1: Profile */}
          {phase === "onboarding" && oStep === 1 && (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">Make it yours</h1>
              <p className="text-gray-500 text-sm mb-8">Set up your profile so clients recognize you</p>

              <div className="flex flex-col items-center mb-8">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full bg-white/80 flex items-center justify-center overflow-hidden ring-4 ring-white shadow-lg hover:ring-[#4f35d2]/30 transition-all mb-3"
                  aria-label="Upload headshot"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Headshot" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-7 w-7 text-gray-300" />
                  )}
                  {loading && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <LogoSpinner size={20} />
                    </div>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-[#4f35d2]">
                  {avatarPreview ? "Change photo" : "Upload photo"}
                </button>
              </div>

              <div className="space-y-3 mb-8 text-left">
                <input
                  type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="Phone (e.g. +1 604 555-1234)"
                  className="w-full h-11 rounded-xl border-2 border-white/40 bg-white/30 backdrop-blur-sm px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors"
                />
                <select
                  value={timezone} onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-11 rounded-xl border-2 border-white/40 bg-white/30 backdrop-blur-sm px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors appearance-none"
                >
                  <option value="America/Vancouver">Pacific (Vancouver)</option>
                  <option value="America/Edmonton">Mountain (Edmonton)</option>
                  <option value="America/Toronto">Eastern (Toronto)</option>
                  <option value="America/Los_Angeles">Pacific (LA)</option>
                  <option value="America/New_York">Eastern (New York)</option>
                </select>
                <input
                  value={spouseName}
                  onChange={(e) => setSpouseName(e.target.value)}
                  onBlur={(e) => setSpouseName(titleCaseName(e.target.value))}
                  placeholder="Spouse / partner name (optional)"
                  className="w-full h-11 rounded-xl border-2 border-white/40 bg-white/30 backdrop-blur-sm px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors"
                />
                <select
                  value={kidsCount} onChange={(e) => setKidsCount(e.target.value)}
                  className="w-full h-11 rounded-xl border-2 border-white/40 bg-white/30 backdrop-blur-sm px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors appearance-none"
                >
                  <option value="">Number of kids (optional)</option>
                  <option value="0">No kids</option>
                  <option value="1">1 kid</option>
                  <option value="2">2 kids</option>
                  <option value="3">3 kids</option>
                  <option value="4">4+ kids</option>
                </select>
              </div>

              <button onClick={handleStep1Continue} className="w-full max-w-xs mx-auto block py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-colors">
                Continue
              </button>
              <button onClick={handleONext} className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors block mx-auto">
                Skip for now
              </button>
            </div>
          )}

          {/* Step 2: Contact Import */}
          {phase === "onboarding" && oStep === 2 && (
            <div className="text-center">
              {importCount === 0 ? (
                <>
                  <h1 className="text-2xl font-bold text-foreground mb-2">Bring your contacts</h1>
                  <p className="text-gray-500 text-sm mb-8">Your CRM works best with your real contacts</p>

                  <div className="space-y-3 mb-6">
                    <label className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-white/40 bg-white/30 backdrop-blur-sm hover:border-[#4f35d2] transition-colors text-left cursor-pointer">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 shrink-0">
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Import from Google</p>
                        <p className="text-xs text-gray-500">Upload .csv from contacts.google.com</p>
                      </div>
                      {fetchingContacts && <LogoSpinner size={16} />}
                      <input type="file" accept=".csv" onChange={handleGoogleCsvUpload} className="hidden" />
                    </label>

                    <label className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-white/40 bg-white/30 backdrop-blur-sm hover:border-[#4f35d2] transition-colors text-left cursor-pointer">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 shrink-0">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83" fill="#000" />
                          <path d="M15.24 2c.13 1.05-.31 2.13-1.01 2.89-.71.77-1.87 1.36-3 1.28-.15-1.02.36-2.09 1.03-2.77.72-.73 1.96-1.28 2.98-1.4" fill="#000" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Import from Apple</p>
                        <p className="text-xs text-gray-500">Upload .vcf from iCloud or iPhone</p>
                      </div>
                      <input type="file" accept=".vcf" onChange={handleVcardUpload} className="hidden" />
                    </label>
                  </div>

                  <button onClick={handleONext} className="w-full max-w-xs mx-auto block py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-colors">
                    Continue
                  </button>
                  <button
                    onClick={async () => { await seedSampleData(); handleONext(); }}
                    className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors block mx-auto"
                  >
                    Skip — use sample data
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold">{importCount} contacts imported!</h2>
                  <p className="text-sm text-gray-500">You're ahead of 80% of new users</p>
                  <button onClick={handleONext} className="w-full max-w-xs mx-auto block py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-colors">
                    Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Professional Details */}
          {phase === "onboarding" && oStep === 3 && (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">Professional details</h1>
              <p className="text-gray-500 text-sm mb-8">Optional — you can fill this in later</p>

              <div className="space-y-3 mb-8 text-left">
                <div className="relative">
                  <input
                    placeholder="Brokerage name" value={brokerage}
                    onChange={(e) => setBrokerage(e.target.value)}
                    className="w-full h-11 rounded-xl border-2 border-white/40 bg-white/30 backdrop-blur-sm px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors"
                  />
                  {brokerageSuggestions.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-xl shadow-lg py-1 overflow-hidden">
                      {brokerageSuggestions.map((s) => (
                        <button key={s} onClick={() => { setBrokerage(s); setBrokerageSuggestions([]); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  placeholder="License number (optional)" value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full h-11 rounded-xl border-2 border-white/40 bg-white/30 backdrop-blur-sm px-4 text-sm focus:outline-none focus:border-[#4f35d2] transition-colors"
                />
                <div>
                  <textarea
                    placeholder="Short bio or tagline" value={bio}
                    onChange={(e) => setBio(e.target.value)} rows={3}
                    className="w-full rounded-xl border-2 border-white/40 bg-white/30 backdrop-blur-sm px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#4f35d2] transition-colors"
                  />
                  <AIBioGenerator bio={bio} onBioChange={setBio} />
                </div>
              </div>

              <button
                onClick={saveProfessionalInfo} disabled={loading}
                className="w-full max-w-xs mx-auto block py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : "Continue"}
              </button>
              <button onClick={handleONext} className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors block mx-auto">
                Skip for now
              </button>
            </div>
          )}

          {/* Step 4: MLS Connection */}
          {phase === "onboarding" && oStep === 4 && (
            <MLSConnectionStep
              onNext={handleComplete}
              onBack={() => setOStep(3)}
              onSkip={handleComplete}
            />
          )}

          {/* Step 5+: Auto-complete (shouldn't show in modal, but safety net) */}
          {phase === "onboarding" && oStep >= 5 && (
            <div className="text-center py-8">
              <LogoSpinner size={32} />
              <h2 className="text-xl font-bold mt-4">Setting up your dashboard...</h2>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
