"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Check, Loader2, RefreshCw } from "lucide-react";

interface Variant {
  id: string;
  style_name: string;
  preview_url: string | null;
  screenshots: { desktop: string; mobile: string } | null;
  is_selected: boolean;
  live_url: string | null;
}

interface VariantPickerProps {
  generationId: string;
  onApproved: (liveUrl: string) => void;
  onRegenerate: () => void;
}

const STYLE_LABELS: Record<string, { name: string; desc: string }> = {
  dark_luxury: { name: "Dark Luxury", desc: "Black & gold, elegant serif" },
  light_modern: { name: "Light Modern", desc: "White & navy, clean sans-serif" },
  bold_warm: { name: "Bold & Warm", desc: "Cream & terracotta, distinctive" },
};

export function VariantPicker({
  generationId,
  onApproved,
  onRegenerate,
}: VariantPickerProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVariants();
  }, [generationId]);

  const fetchVariants = async () => {
    try {
      const res = await fetch(`/api/generations/${generationId}`);
      const data = await res.json();
      setVariants(data.variants || []);
    } catch {
      setError("Failed to load variants");
    }
  };

  const handleApprove = async (variantId: string) => {
    setApproving(variantId);
    setError("");

    try {
      const res = await fetch(`/api/variants/${variantId}/approve`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setApproving(null);
        return;
      }

      onApproved(data.live_url);
    } catch {
      setError("Failed to approve variant");
      setApproving(null);
    }
  };

  return (
    <div className="py-8 animate-float-in">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Choose Your Website
        </h2>
        <p className="text-sm text-gray-500">
          We designed 3 unique variations. Pick your favorite to go live.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {variants.map((variant) => {
          const label = STYLE_LABELS[variant.style_name] || {
            name: variant.style_name,
            desc: "",
          };
          const isApproving = approving === variant.id;

          return (
            <div
              key={variant.id}
              className="card overflow-hidden group hover:shadow-lg transition-shadow"
            >
              {/* Screenshot */}
              <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                {variant.screenshots?.desktop ? (
                  <img
                    src={`data:image/png;base64,${variant.screenshots.desktop}`}
                    alt={label.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Preview unavailable
                  </div>
                )}

                {/* Preview link overlay */}
                {variant.preview_url && (
                  <a
                    href={variant.preview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <span className="bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-900 flex items-center gap-2 shadow-lg">
                      <ExternalLink className="h-4 w-4" />
                      Open Preview
                    </span>
                  </a>
                )}
              </div>

              {/* Info + Action */}
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-1">{label.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{label.desc}</p>

                <button
                  onClick={() => handleApprove(variant.id)}
                  disabled={isApproving || !!approving}
                  className="btn btn-primary w-full disabled:opacity-50"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Going Live...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Choose This One
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg text-center mb-4">
          {error}
        </p>
      )}

      <div className="text-center">
        <button
          onClick={onRegenerate}
          className="btn btn-outline text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Not happy? Regenerate
        </button>
      </div>
    </div>
  );
}
