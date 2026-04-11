"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PersonalizationCard } from "@/components/onboarding/PersonalizationCard";
import { PersonalizationPills } from "@/components/onboarding/PersonalizationPills";
import { savePersonalizationStep, completePersonalization, getPersonalizationProgress } from "@/actions/personalization";

const TOTAL_SCREENS = 6;

// Screen configs (P1-P4, matching gap doc v3 exactly)
const SCREENS = [
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
    subtitle: "Select all that apply — we'll tailor your workspace to match",
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
    subtitle: "Pick 1-3 priorities — we'll order your setup around these",
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

// Conversational headings per screen (P8)
function getHeading(screen: number, firstName: string): string {
  const name = firstName || "there";
  switch (screen) {
    case 0: return `Hey ${name}, what brings you to Realtors360?`;
    case 1: return "Great! What's your primary focus?";
    case 2: return "How big is your team?";
    case 3: return "How long have you been in real estate?";
    case 4: return "Almost done! What do you want to tackle first?";
    case 5: return `Setting up your workspace, ${name}...`;
    default: return "";
  }
}

export default function PersonalizePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [selections, setSelections] = useState<Record<string, string | string[] | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const firstName = session?.user?.name?.split(" ")[0] || "";

  // Resume progress on mount
  useEffect(() => {
    getPersonalizationProgress().then((progress) => {
      if (progress.completed) {
        // Already completed — redirect to onboarding or dashboard
        const onboardingDone = (session?.user as Record<string, unknown> | undefined)?.onboardingCompleted;
        router.replace(onboardingDone ? "/" : "/onboarding");
        return;
      }
      setScreen(progress.screen);
      if (progress.data) {
        // Normalize: multi-select fields may be stored as strings (old data) or arrays (new JSONB)
        const data = progress.data as Record<string, string | string[] | null>;
        const multiSelectFields = ["onboarding_persona", "onboarding_market"];
        for (const field of multiSelectFields) {
          const val = data[field];
          if (typeof val === "string") {
            data[field] = [val]; // Convert old string to array
          }
        }
        setSelections(data);
      }
      setLoading(false);
    });
  }, [router, session]);

  const currentConfig = SCREENS[screen];

  // Handle card/pill selection
  const handleSelect = useCallback((value: string) => {
    if (!currentConfig) return;
    if (currentConfig.multiSelect) {
      setSelections((prev) => {
        const current = (prev[currentConfig.field] as string[]) || [];
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : current.length < 3 ? [...current, value] : current;
        return { ...prev, [currentConfig.field]: updated };
      });
    } else {
      setSelections((prev) => ({ ...prev, [currentConfig.field]: value }));
    }
  }, [currentConfig]);

  // Continue to next screen
  const handleContinue = async () => {
    if (!currentConfig) return;
    setSaving(true);

    const value = selections[currentConfig.field] ?? null;
    await savePersonalizationStep(currentConfig.field, value);

    if (screen < TOTAL_SCREENS - 2) {
      setScreen(screen + 1);
    } else if (screen === TOTAL_SCREENS - 2) {
      // Go to loading screen (Screen 6)
      setScreen(TOTAL_SCREENS - 1);
      await completePersonalization();
      setTimeout(() => router.push("/onboarding"), 2000);
    }
    setSaving(false);
  };

  // Skip current screen
  const handleSkip = async () => {
    setSaving(true);
    if (currentConfig) {
      await savePersonalizationStep(currentConfig.field, null);
    }
    if (screen < TOTAL_SCREENS - 2) {
      setScreen(screen + 1);
    } else {
      setScreen(TOTAL_SCREENS - 1);
      await completePersonalization();
      setTimeout(() => router.push("/onboarding"), 2000);
    }
    setSaving(false);
  };

  const handleBack = () => {
    if (screen > 0) setScreen(screen - 1);
  };

  const hasSelection = currentConfig
    ? currentConfig.multiSelect
      ? ((selections[currentConfig.field] as string[]) || []).length > 0
      : !!selections[currentConfig.field]
    : false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff]">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  // Screen 6: Mini loading (NOT full celebration — that's at end of onboarding)
  if (screen === TOTAL_SCREENS - 1) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff]">
        <div className="fixed top-0 left-0 right-0 h-1">
          <div className="h-full bg-gradient-to-r from-[#4f35d2] to-[#ff5c3a] w-full" />
        </div>
        <div className="text-center animate-float-in">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full border-4 border-[#4f35d2] border-t-transparent animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {getHeading(5, firstName)}
          </h1>
          <p className="text-gray-500 text-sm">Preparing your personalized onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff]">
      {/* Progress bar — thin gradient, no step numbers (P7) */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50">
        <div
          className="h-full bg-gradient-to-r from-[#4f35d2] to-[#ff5c3a] transition-all duration-300 ease-out"
          style={{ width: `${Math.max(8, ((screen + 1) / TOTAL_SCREENS) * 100)}%` }}
        />
      </div>

      {/* Back button (P9) */}
      {screen > 0 && (
        <button
          onClick={handleBack}
          className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full bg-white/80 backdrop-blur border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 animate-fade-in">
            {getHeading(screen, firstName)}
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            {currentConfig.subtitle}
          </p>

          {/* Card or Pill selection */}
          {currentConfig.type === "cards" ? (
            <div className={`grid gap-3 md:gap-4 mb-8 ${
              currentConfig.options.length > 4 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"
            }`}>
              {currentConfig.options.map((opt) => (
                <PersonalizationCard
                  key={opt.value}
                  icon={"icon" in opt ? opt.icon : ""}
                  label={opt.label}
                  description={"description" in opt ? opt.description : ""}
                  selected={
                    currentConfig.multiSelect
                      ? ((selections[currentConfig.field] as string[]) || []).includes(opt.value)
                      : selections[currentConfig.field] === opt.value
                  }
                  onClick={() => handleSelect(opt.value)}
                />
              ))}
            </div>
          ) : (
            <div className="mb-8">
              <PersonalizationPills
                options={currentConfig.options}
                selected={selections[currentConfig.field] as string | null}
                onSelect={handleSelect}
              />
            </div>
          )}

          {/* Continue (P9) */}
          <button
            onClick={handleContinue}
            disabled={!hasSelection || saving}
            className="w-full max-w-xs mx-auto py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Continue"}
          </button>

          {/* Skip (P9) */}
          <button
            onClick={handleSkip}
            disabled={saving}
            className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
