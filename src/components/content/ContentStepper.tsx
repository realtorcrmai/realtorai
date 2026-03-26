"use client";

import { cn } from "@/lib/utils";
import { CONTENT_STEPS } from "@/lib/constants";
import { Sparkles, Wand2, Image } from "lucide-react";

const stepIcons = [Sparkles, Wand2, Image];

interface ContentStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  className?: string;
}

export function ContentStepper({
  currentStep,
  onStepClick,
  className,
}: ContentStepperProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {CONTENT_STEPS.map((s, i) => {
        const Icon = stepIcons[i];
        // "visited" = user has navigated past this step. We intentionally avoid a green
        // checkmark here because we cannot validate server-side data (e.g. prompts saved)
        // from this client-only stepper. A green check would falsely imply the step is
        // fully complete. Instead, visited steps use the primary (indigo) palette to signal
        // "been here" without claiming "all done".
        const isVisited = currentStep > s.step;
        const isCurrent = currentStep === s.step;

        return (
          <div key={s.step} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => onStepClick(s.step)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full group",
                isCurrent
                  ? "bg-primary text-primary-foreground shadow-sm elevation-4"
                  : isVisited
                    ? "bg-primary/8 text-primary border border-primary/20 hover:bg-primary/12"
                    : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors",
                  isCurrent
                    ? "bg-white/20"
                    : isVisited
                      ? "bg-primary/15"
                      : "bg-muted"
                )}
              >
                {/* Always show the step's own icon — no green check, to avoid implying completion */}
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold leading-tight">
                  {s.label}
                </p>
                <p
                  className={cn(
                    "text-xs leading-tight mt-0.5",
                    isCurrent
                      ? "text-primary-foreground/70"
                      : isVisited
                        ? "text-primary/70"
                        : "text-muted-foreground"
                  )}
                >
                  {s.description}
                </p>
              </div>
            </button>

            {/* Connector line — indigo for visited segments, not green */}
            {i < CONTENT_STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 shrink-0",
                  currentStep > s.step ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
