"use client";

import { cn } from "@/lib/utils";

interface PersonalizationCardProps {
  icon: string;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

/**
 * Visual card for personalization wizard (P5).
 * Monday.com-style: icon + label + description, hover scale, selected = indigo border + checkmark.
 */
export function PersonalizationCard({ icon, label, description, selected, onClick }: PersonalizationCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 text-center min-h-[120px] justify-center",
        selected
          ? "border-[#4f35d2] bg-[#4f35d2]/5 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm hover:scale-[1.02]"
      )}
    >
      {/* Checkmark overlay */}
      {selected && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#4f35d2] flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-xs text-gray-500 leading-tight">{description}</span>
    </button>
  );
}
