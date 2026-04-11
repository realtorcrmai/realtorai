"use client";

import { useState, useTransition } from "react";
import { updateContact } from "@/actions/contacts";
import {
  BUYER_STAGES,
  SELLER_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
} from "@/lib/constants/contacts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, Snowflake, ChevronDown, ChevronUp } from "lucide-react";

// ── Stage data items: what data each stage expects ──────────

export type StageDataItem = {
  label: string;
  value: string | null;
  filled: boolean;
};

export type StageData = {
  /** Section ID to scroll to on click */
  sectionId: string;
  /** Items to display for this stage */
  items: StageDataItem[];
};

interface StageBarProps {
  contactId: string;
  contactType: string;
  currentStage: string | null;
  /** Per-stage data to display when expanded. Key = stage slug */
  stageData?: Record<string, StageData>;
}

export function StageBar({ contactId, contactType, currentStage, stageData }: StageBarProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmStage, setConfirmStage] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  // Only buyer and seller have stage pipelines
  if (contactType !== "buyer" && contactType !== "seller") {
    return null; // No pipeline for customer, agent, partner, other
  }

  const allStages = contactType === "buyer" ? BUYER_STAGES : SELLER_STAGES;
  const pipelineStages = allStages.filter((s) => s !== "cold");
  const stage = currentStage ?? "new";
  const isCold = stage === "cold";
  const currentIndex = pipelineStages.indexOf(stage as typeof pipelineStages[number]);

  function handleStageClick(newStage: string) {
    if (isPending) return;
    // If clicking on a completed or current stage, toggle data panel
    const clickedIndex = pipelineStages.indexOf(newStage as typeof pipelineStages[number]);
    const isCompletedOrCurrent = !isCold && clickedIndex <= currentIndex;

    if (isCompletedOrCurrent && stageData?.[newStage]) {
      // Toggle expand — only show summary, no auto-scroll
      setExpandedStage(expandedStage === newStage ? null : newStage);
      return;
    }

    // For future stages, confirm stage change
    if (newStage !== stage) {
      setConfirmStage(newStage);
    }
  }

  function confirmChange() {
    if (!confirmStage) return;
    startTransition(async () => {
      await updateContact(contactId, { stage_bar: confirmStage } as Parameters<typeof updateContact>[1]);
      setConfirmStage(null);
    });
  }

  // Calculate data completeness per stage
  function getCompleteness(stageSlug: string): { filled: number; total: number } | null {
    const data = stageData?.[stageSlug];
    if (!data || data.items.length === 0) return null;
    const filled = data.items.filter((i) => i.filled).length;
    return { filled, total: data.items.length };
  }

  return (
    <>
      <div className="mt-3">
        {/* Pipeline steps */}
        <div className="flex items-center gap-0">
          {pipelineStages.map((s, i) => {
            const isPastStage = !isCold && currentIndex > i;
            const isCurrent = !isCold && stage === s;
            const colors = STAGE_COLORS[s];
            const label = STAGE_LABELS[s];
            const completeness = getCompleteness(s);
            const hasData = stageData?.[s] && stageData[s].items.length > 0;
            const isExpanded = expandedStage === s;

            // A stage is only truly completed if it's a past stage AND all its subtasks are done.
            // If subtask data exists but some items are missing, show as "in progress" (not green check).
            const allSubtasksDone = !completeness || completeness.filled === completeness.total;
            const isCompleted = isPastStage && allSubtasksDone;
            const isIncomplete = isPastStage && !allSubtasksDone; // past stage with missing subtasks
            const isClickableForData = (isPastStage || isCurrent) && hasData;

            return (
              <div key={s} className="flex items-center">
                {/* Connector line */}
                {i > 0 && (
                  <div
                    className={`h-0.5 w-4 sm:w-6 md:w-8 transition-colors duration-300 ${
                      isCompleted ? "bg-brand-light"
                        : isIncomplete ? "bg-amber-400"
                        : isCurrent ? "bg-brand-light"
                        : "bg-gray-200"
                    }`}
                  />
                )}

                {/* Stage node */}
                <button
                  type="button"
                  onClick={() => handleStageClick(s)}
                  disabled={isPending}
                  className={`
                    group relative flex flex-col items-center
                    ${isPending ? "opacity-60 cursor-wait" : "cursor-pointer"}
                  `}
                  title={isClickableForData ? `View ${label} data` : `Move to ${label}`}
                >
                  {/* Circle */}
                  <div
                    className={`
                      flex items-center justify-center rounded-full transition-all duration-300
                      w-6 h-6 sm:w-7 sm:h-7
                      ${
                        isCompleted
                          ? "bg-brand/50 text-white shadow-sm"
                          : isIncomplete
                          ? "bg-amber-500 text-white shadow-sm ring-2 ring-offset-1 ring-amber-300"
                          : isCurrent
                          ? `${colors.dot} text-white shadow-md ring-2 ring-offset-1 ring-brand`
                          : "bg-gray-200 text-gray-400 group-hover:bg-gray-300"
                      }
                      ${isCurrent ? "animate-pulse-subtle" : ""}
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : isIncomplete ? (
                      <span className="text-[10px] font-bold">!</span>
                    ) : (
                      <span className="text-[10px] font-semibold">{i + 1}</span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`
                      mt-1 text-[10px] sm:text-xs leading-tight text-center whitespace-nowrap
                      ${
                        isCurrent
                          ? `font-semibold ${colors.text}`
                          : isCompleted
                          ? "font-medium text-brand-dark"
                          : isIncomplete
                          ? "font-medium text-amber-600"
                          : "text-gray-400"
                      }
                    `}
                  >
                    {label}
                  </span>

                  {/* Data completeness indicator */}
                  {completeness && (isPastStage || isCurrent) && (
                    <span
                      className={`
                        mt-0.5 text-[8px] font-medium leading-none
                        ${completeness.filled === completeness.total ? "text-brand" : "text-amber-600"}
                      `}
                    >
                      {completeness.filled}/{completeness.total}
                    </span>
                  )}
                </button>
              </div>
            );
          })}

          {/* Cold indicator */}
          <div className="flex items-center ml-3 sm:ml-4">
            <div className="h-0.5 w-2 bg-gray-200 mr-1" />
            <button
              type="button"
              onClick={() => {
                if (isPending) return;
                if ("cold" !== stage) setConfirmStage("cold");
              }}
              disabled={isPending}
              className={`
                group relative flex flex-col items-center
                ${isPending ? "opacity-60 cursor-wait" : "cursor-pointer"}
              `}
              title="Move to Cold"
            >
              <div
                className={`
                  flex items-center justify-center rounded-full transition-all duration-300
                  w-6 h-6 sm:w-7 sm:h-7
                  ${
                    isCold
                      ? "bg-gray-400 text-white shadow-md ring-2 ring-offset-1 ring-gray-300"
                      : "bg-gray-200 text-gray-400 group-hover:bg-gray-300"
                  }
                  ${isCold ? "animate-pulse-subtle" : ""}
                `}
              >
                <Snowflake className="w-3.5 h-3.5" />
              </div>
              <span
                className={`
                  mt-1 text-[10px] sm:text-xs leading-tight text-center whitespace-nowrap
                  ${isCold ? "font-semibold text-gray-600" : "text-gray-400"}
                `}
              >
                Cold
              </span>
            </button>
          </div>
        </div>

        {/* Expanded stage data panel */}
        {expandedStage && stageData?.[expandedStage] && (
          <div className="mt-3 rounded-lg border bg-white/80 dark:bg-card/80 p-3 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[expandedStage]?.dot || "bg-gray-400"}`} />
                {STAGE_LABELS[expandedStage]} — Data Collected
              </h4>
              <button
                onClick={() => setExpandedStage(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {stageData[expandedStage].items.map((item) => (
                <div key={item.label} className="flex items-start gap-1.5 text-[11px]">
                  <span className={`mt-0.5 shrink-0 w-3 h-3 rounded-full flex items-center justify-center text-[8px] ${
                    item.filled ? "bg-brand-muted text-brand" : "bg-red-100 text-red-500"
                  }`}>
                    {item.filled ? "✓" : "—"}
                  </span>
                  <div className="min-w-0">
                    <span className="text-muted-foreground">{item.label}: </span>
                    <span className={`font-medium ${item.filled ? "text-foreground" : "text-red-400 italic"}`}>
                      {item.value || "Missing"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {stageData[expandedStage].sectionId && (
              <button
                onClick={() => {
                  document.getElementById(stageData[expandedStage].sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="mt-2 text-[10px] text-brand hover:text-foreground font-medium flex items-center gap-0.5"
              >
                <ChevronDown className="w-3 h-3" /> Jump to section
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmStage} onOpenChange={(open) => !open && setConfirmStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Pipeline Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Move this contact from{" "}
              <span className="font-medium text-foreground">
                {STAGE_LABELS[stage] ?? stage}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {confirmStage ? (STAGE_LABELS[confirmStage] ?? confirmStage) : ""}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange} disabled={isPending}>
              {isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
