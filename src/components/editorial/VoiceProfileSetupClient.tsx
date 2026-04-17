"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { upsertVoiceProfile } from "@/actions/editorial";

// ── Types ─────────────────────────────────────────────────────────────────────

type VoiceTone = "professional" | "friendly" | "luxury" | "casual" | "authoritative";

interface WizardData {
  // Step 1 — Market
  market: string;
  country: "CA" | "US";
  specialties: string[];
  // Step 2 — Voice Style
  tone: VoiceTone;
  voice_rules: string[];
  default_sign_off: string;
  // Step 3 — About You
  bio_snippet: string;
  licence_number: string;
  brokerage: string;
  writing_sample: string;
}

const SPECIALTIES = [
  "Detached Homes",
  "Condos",
  "Luxury",
  "Commercial",
  "First-Time Buyers",
  "Investors",
] as const;

const TONE_OPTIONS: { value: VoiceTone; label: string; description: string }[] = [
  {
    value: "professional",
    label: "Professional",
    description: "Polished, credible, data-informed",
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm, conversational, approachable",
  },
  {
    value: "luxury",
    label: "Luxury",
    description: "Elevated, aspirational, refined",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Direct, relaxed, contractions welcome",
  },
  {
    value: "authoritative",
    label: "Authoritative",
    description: "Confident, expert, data-backed",
  },
];

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  const labels = ["Market", "Voice Style", "About You", "Done"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isComplete = step < currentStep;
        const isCurrent = step === currentStep;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                  isComplete
                    ? "bg-brand text-white"
                    : isCurrent
                    ? "bg-brand text-white ring-4 ring-brand/20"
                    : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {isComplete ? "✓" : step}
              </div>
              <span
                className={[
                  "text-xs hidden sm:block",
                  isCurrent ? "text-foreground font-medium" : "text-muted-foreground",
                ].join(" ")}
              >
                {labels[i]}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div
                className={[
                  "w-12 h-px mx-2 mb-5 transition-colors",
                  step < currentStep ? "bg-brand" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function VoiceProfileSetupClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<WizardData>({
    market: "",
    country: "CA",
    specialties: [],
    tone: "professional",
    voice_rules: ["", "", ""],
    default_sign_off: "",
    bio_snippet: "",
    licence_number: "",
    brokerage: "",
    writing_sample: "",
  });

  const [savedProfile, setSavedProfile] = useState<{
    tone: string;
    market: string;
    specialties: string[];
  } | null>(null);

  function updateField<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSpecialty(s: string) {
    setData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  }

  function updateVoiceRule(index: number, value: string) {
    const rules = [...data.voice_rules];
    rules[index] = value;
    setData((prev) => ({ ...prev, voice_rules: rules }));
  }

  // Auto-detect country from market city
  function handleMarketChange(value: string) {
    updateField("market", value);
    const lower = value.toLowerCase();
    const usKeywords = [
      "california",
      "new york",
      "texas",
      "florida",
      "seattle",
      "portland",
      "denver",
      "chicago",
      ", ca",
      ", ny",
      ", tx",
      ", wa",
    ];
    const isUS = usKeywords.some((kw) => lower.includes(kw));
    if (isUS) updateField("country", "US");
    else if (value.length > 2) updateField("country", "CA");
  }

  async function handleSubmit() {
    setError(null);

    startTransition(async () => {
      try {
        // Build the rules array — filter empties
        const rawRules = data.voice_rules.filter((r) => r.trim().length > 0);

        // The server action handles AI voice extraction if writing_sample is provided
        const result = await upsertVoiceProfile({
          name: `${data.market || "My Market"} — ${data.tone} voice`,
          tone: data.tone,
          style_description: TONE_OPTIONS.find((t) => t.value === data.tone)?.description ?? "",
          voice_rules: rawRules,
          bio_snippet: data.bio_snippet || undefined,
          default_sign_off: data.default_sign_off || undefined,
          focus_neighbourhoods: data.market ? [data.market] : [],
          market: data.market,
          specialties: data.specialties,
          licence_number: data.licence_number || undefined,
          brokerage: data.brokerage || undefined,
          writing_sample: data.writing_sample || undefined,
          is_default: true,
        });

        if (result.error) {
          setError(result.error);
          return;
        }

        setSavedProfile({
          tone: data.tone,
          market: data.market,
          specialties: data.specialties,
        });
        setStep(4);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  // ── Step 1: Market ──────────────────────────────────────────────────────────
  function renderStep1() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Your market</h2>
          <p className="text-sm text-muted-foreground">
            The AI uses this to write hyper-local content for your area.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="market-input">
            Which city or market are you in?
          </label>
          <input
            id="market-input"
            type="text"
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="e.g. Vancouver, BC"
            value={data.market}
            onChange={(e) => handleMarketChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Country</label>
          <div className="flex gap-2">
            {(["CA", "US"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => updateField("country", c)}
                className={[
                  "flex-1 h-10 rounded-md border text-sm font-medium transition-colors",
                  data.country === c
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-card text-muted-foreground hover:border-brand/40",
                ].join(" ")}
              >
                {c === "CA" ? "🇨🇦 Canada" : "🇺🇸 United States"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Specialties</label>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALTIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={[
                  "h-10 rounded-md border text-sm transition-colors text-left px-3",
                  data.specialties.includes(s)
                    ? "border-brand bg-brand/10 text-brand font-medium"
                    : "border-border bg-card text-muted-foreground hover:border-brand/40",
                ].join(" ")}
              >
                {data.specialties.includes(s) ? "✓ " : ""}
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Voice Style ─────────────────────────────────────────────────────
  function renderStep2() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Your writing style</h2>
          <p className="text-sm text-muted-foreground">
            Choose the tone that best matches how you communicate with clients.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Writing tone</label>
          <div className="grid grid-cols-1 gap-2">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField("tone", opt.value)}
                className={[
                  "w-full h-14 rounded-md border text-sm transition-colors text-left px-4 flex items-center gap-3",
                  data.tone === opt.value
                    ? "border-brand bg-brand/10"
                    : "border-border bg-card hover:border-brand/40",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    data.tone === opt.value ? "border-brand" : "border-muted-foreground",
                  ].join(" ")}
                >
                  {data.tone === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-brand" />
                  )}
                </div>
                <div>
                  <span
                    className={[
                      "font-medium",
                      data.tone === opt.value ? "text-brand" : "text-foreground",
                    ].join(" ")}
                  >
                    {opt.label}
                  </span>
                  <span className="text-muted-foreground ml-2 text-xs">{opt.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Writing rules{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Up to 3 rules the AI should always follow. e.g. "Always include a data point"
          </p>
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              type="text"
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder={
                i === 0
                  ? "e.g. Always include a local market stat"
                  : i === 1
                  ? "e.g. Keep sentences under 20 words"
                  : "e.g. End with a clear call to action"
              }
              value={data.voice_rules[i] ?? ""}
              onChange={(e) => updateVoiceRule(i, e.target.value)}
              aria-label={`Writing rule ${i + 1}`}
            />
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="sign-off">
            Default sign-off{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="sign-off"
            type="text"
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            placeholder="e.g. Let's talk about your next move."
            value={data.default_sign_off}
            onChange={(e) => updateField("default_sign_off", e.target.value)}
          />
        </div>
      </div>
    );
  }

  // ── Step 3: About You ───────────────────────────────────────────────────────
  function renderStep3() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">About you</h2>
          <p className="text-sm text-muted-foreground">
            This information personalizes the AI-generated agent note blocks.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="bio">
            Bio snippet{" "}
            <span className="text-muted-foreground font-normal">(max 200 chars)</span>
          </label>
          <textarea
            id="bio"
            rows={3}
            maxLength={200}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
            placeholder="e.g. 15-year Vancouver realtor specializing in Kitsilano condos and first-time buyers."
            value={data.bio_snippet}
            onChange={(e) => updateField("bio_snippet", e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-right">
            {data.bio_snippet.length}/200
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="licence">
              Licence number{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="licence"
              type="text"
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="e.g. BCFSA #12345"
              value={data.licence_number}
              onChange={(e) => updateField("licence_number", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="brokerage">
              Brokerage{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="brokerage"
              type="text"
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="e.g. RE/MAX City Realty"
              value={data.brokerage}
              onChange={(e) => updateField("brokerage", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="writing-sample">
            Paste a sample email you've written{" "}
            <span className="text-muted-foreground font-normal">(optional — max 600 chars)</span>
          </label>
          <p className="text-xs text-muted-foreground">
            The AI analyzes your writing to extract specific style rules.
          </p>
          <textarea
            id="writing-sample"
            rows={6}
            maxLength={600}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
            placeholder="Paste a few sentences or a full email you've sent to clients..."
            value={data.writing_sample}
            onChange={(e) => updateField("writing_sample", e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-right">
            {data.writing_sample.length}/600
          </p>
        </div>
      </div>
    );
  }

  // ── Step 4: Done ────────────────────────────────────────────────────────────
  function renderStep4() {
    return (
      <div className="space-y-6 text-center">
        <div className="text-5xl">🎉</div>
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Your voice profile is saved!
          </h2>
          <p className="text-sm text-muted-foreground">
            The AI will now write every edition in your style.
          </p>
        </div>

        {savedProfile && (
          <div className="bg-card border border-border rounded-lg p-5 text-left space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Profile summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Market</span>
                <span className="text-foreground font-medium">
                  {savedProfile.market || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tone</span>
                <span className="text-foreground font-medium capitalize">
                  {savedProfile.tone}
                </span>
              </div>
              {savedProfile.specialties.length > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Specialties</span>
                  <span className="text-foreground font-medium text-right">
                    {savedProfile.specialties.join(", ")}
                  </span>
                </div>
              )}
              {data.voice_rules.filter((r) => r.trim()).length > 0 && (
                <div>
                  <span className="text-muted-foreground">Writing rules</span>
                  <ul className="mt-1 space-y-1">
                    {data.voice_rules
                      .filter((r) => r.trim())
                      .map((r, i) => (
                        <li key={i} className="text-foreground text-xs pl-2 border-l-2 border-brand">
                          {r}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {data.default_sign_off && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">Sign-off</span>
                  <span className="text-foreground italic text-right text-xs">
                    &ldquo;{data.default_sign_off}&rdquo;
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <Button
          variant="brand"
          className="w-full"
          onClick={() => router.push("/newsletters/editorial/new")}
        >
          Start creating your first edition →
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          onClick={() => router.push("/newsletters/editorial")}
        >
          Go back to editorial dashboard
        </button>
      </div>
    );
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (step === 1) return data.market.trim().length > 0;
    if (step === 2) return true; // tone always has a default
    if (step === 3) return true; // all optional
    return false;
  }

  return (
    <div>
      <StepIndicator currentStep={step} totalSteps={4} />

      <div className="bg-card border border-border rounded-lg p-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {error && (
          <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        {step < 4 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className={[
                "text-sm text-muted-foreground hover:text-foreground",
                step === 1 ? "invisible" : "",
              ].join(" ")}
            >
              ← Back
            </button>

            {step < 3 ? (
              <Button
                variant="brand"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
              >
                Continue →
              </Button>
            ) : (
              <Button
                variant="brand"
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Save profile →"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
