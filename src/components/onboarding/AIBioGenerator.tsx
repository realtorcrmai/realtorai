"use client";

import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";
import { generateBio } from "@/actions/ai-onboarding";

interface AIBioGeneratorProps {
  bio: string;
  onBioChange: (bio: string) => void;
}

/**
 * AI Bio Generator button + typewriter effect (A1).
 * Shows next to bio textarea in onboarding Step 5.
 */
export function AIBioGenerator({ bio, onBioChange }: AIBioGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState("");

  const maxAttempts = 3;

  const handleGenerate = async () => {
    if (attempts >= maxAttempts) return;
    setGenerating(true);
    setError("");

    const result = await generateBio();

    if ("error" in result) {
      setError(result.error);
    } else {
      // Typewriter effect
      const fullBio = result.bio;
      let i = 0;
      onBioChange("");
      const interval = setInterval(() => {
        i += 2;
        onBioChange(fullBio.slice(0, i));
        if (i >= fullBio.length) clearInterval(interval);
      }, 15);
    }

    setAttempts((a) => a + 1);
    setGenerating(false);
  };

  if (attempts >= maxAttempts) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        Edit the bio above or try again later
      </p>
    );
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4f35d2] hover:text-[#3d28a8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {generating ? (
          <><LogoSpinner size={14} /> Generating...</>
        ) : attempts > 0 ? (
          <><RefreshCw className="w-3.5 h-3.5" /> Regenerate with AI</>
        ) : (
          <><Sparkles className="w-3.5 h-3.5" /> Generate with AI</>
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
