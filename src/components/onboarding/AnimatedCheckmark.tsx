"use client";

import { cn } from "@/lib/utils";

interface AnimatedCheckmarkProps {
  state: "pending" | "loading" | "done";
  label: string;
  delay?: number;
}

/**
 * SVG checkmark with stroke animation (C2).
 * States: pending (gray) → loading (spinner) → done (green checkmark with scale bounce).
 */
export function AnimatedCheckmark({ state, label, delay = 0 }: AnimatedCheckmarkProps) {
  return (
    <div
      className="flex items-center gap-3 transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-7 h-7 flex items-center justify-center shrink-0">
        {state === "pending" && (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
        )}
        {state === "loading" && (
          <div className="w-5 h-5 rounded-full border-2 border-[#4f35d2] border-t-transparent animate-spin" />
        )}
        {state === "done" && (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center animate-bounce-once">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                className="animate-draw-check"
              />
            </svg>
          </div>
        )}
      </div>
      <span className={cn(
        "text-sm font-medium transition-colors duration-300",
        state === "done" ? "text-foreground" : "text-gray-400"
      )}>
        {label}
      </span>
      {state === "done" && (
        <span className="text-green-500 text-xs font-medium ml-auto">Done</span>
      )}
    </div>
  );
}
