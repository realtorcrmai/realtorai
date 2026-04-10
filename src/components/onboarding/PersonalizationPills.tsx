"use client";

import { cn } from "@/lib/utils";

interface PillOption {
  value: string;
  label: string;
}

interface PersonalizationPillsProps {
  options: PillOption[];
  selected: string | null;
  onSelect: (value: string) => void;
}

/**
 * Pill button group for personalization wizard screens 3-4 (P5).
 * Single-select pill buttons with transition animation.
 */
export function PersonalizationPills({ options, selected, onSelect }: PersonalizationPillsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={cn(
            "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border-2",
            selected === opt.value
              ? "border-[#4f35d2] bg-[#4f35d2] text-white shadow-md"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
