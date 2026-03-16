"use client";

import { useState } from "react";
import { Sparkles, Loader2, Link2, ChevronDown, ChevronUp } from "lucide-react";

interface GenerateButtonProps {
  siteId: string;
  onGenerate: (generationId: string) => void;
}

export function GenerateButton({ siteId, onGenerate }: GenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = async () => {
    // Validate URL if provided
    if (referenceUrl && !referenceUrl.startsWith("http")) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          reference_url: referenceUrl || undefined,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      onGenerate(data.generation_id);
    } catch {
      setError("Failed to start generation. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="text-center py-12 animate-float-in">
      <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
        <Sparkles className="h-10 w-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Generate Your Website
      </h2>
      <p className="text-gray-500 max-w-md mx-auto mb-8">
        Our AI will research top-performing realtor websites, design 3 unique
        variations, and deploy them for preview. Pick your favorite and go live
        instantly.
      </p>

      {/* Reference URL (optional) */}
      <div className="max-w-lg mx-auto mb-8">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
        >
          <Link2 className="h-4 w-4" />
          Have a website you love? Use it as inspiration
          {showAdvanced ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showAdvanced && (
          <div className="animate-float-in">
            <input
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://example-realtor-site.com"
              className="input w-full text-center"
            />
            <p className="text-xs text-gray-400 mt-2">
              Paste the URL of any realtor website you admire. Our AI will use
              its design as a primary reference for your site.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="btn btn-primary text-base px-10 py-3.5 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Generate My Website
          </>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg mt-4 max-w-md mx-auto">
          {error}
        </p>
      )}
    </div>
  );
}
