"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Palette, Globe, CheckCircle, AlertCircle } from "lucide-react";

interface GenerationProgressProps {
  generationId: string;
  onComplete: () => void;
  onFailed: (error: string) => void;
}

const STEPS = [
  { status: "started", label: "Getting started", icon: Loader2 },
  { status: "researching", label: "Researching top realtor websites", icon: Search },
  { status: "generating", label: "Designing 3 unique variations", icon: Palette },
  { status: "previewing", label: "Deploying previews", icon: Globe },
];

export function GenerationProgress({
  generationId,
  onComplete,
  onFailed,
}: GenerationProgressProps) {
  const [currentStatus, setCurrentStatus] = useState("started");

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generations/${generationId}`);
        const data = await res.json();

        setCurrentStatus(data.status);

        if (data.status === "previewing" || data.status === "completed") {
          clearInterval(interval);
          onComplete();
        } else if (data.status === "failed") {
          clearInterval(interval);
          onFailed(data.error_message || "Generation failed");
        }
      } catch {
        // Silently retry
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [generationId, onComplete, onFailed]);

  const currentIndex = STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className="py-12 animate-float-in">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Building Your Website
          </h2>
          <p className="text-sm text-gray-500">
            This usually takes 30-60 seconds
          </p>
        </div>

        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const isActive = i === currentIndex;
            const isDone = i < currentIndex;
            const Icon = isDone ? CheckCircle : step.icon;

            return (
              <div
                key={step.status}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-teal-50 border border-teal-100"
                    : isDone
                    ? "bg-green-50/50"
                    : "opacity-40"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive
                      ? "text-teal-600 animate-spin"
                      : isDone
                      ? "text-green-500"
                      : "text-gray-400"
                  }`}
                  style={
                    isActive && step.status !== "started"
                      ? { animation: "none" }
                      : undefined
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    isActive
                      ? "text-teal-700"
                      : isDone
                      ? "text-green-700"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                  {isActive && "..."}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
