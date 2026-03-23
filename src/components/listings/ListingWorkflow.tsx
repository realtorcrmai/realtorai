"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown, ChevronRight, Trophy, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { EditableStepDataPanel } from "@/components/listings/EditableStepDataPanel";
import type { ListingDocument } from "@/types";
import { StepDataPanel } from "./StepDataPanel";
import { STEP_FIELDS } from "@/lib/constants/workflow-fields";
import {
  WORKFLOW_STEPS,
  STATUS_STYLES,
  deriveStepStatuses,
  deriveSubstepStatuses,
  getSubstepMessage,
  getStepDataSections,
  formatPrice,
  type StepStatus,
  type MessageContext,
  type StepDataContext,
} from "./listingWorkflowUtils";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:0ms]" />
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:150ms]" />
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

export function ListingWorkflow({
  listingId,
  listing,
  documents,
  formStatuses = {},
  seller,
  showingsCount,
  stepFormData = {},
  relatedDealId,
  contactId,
}: {
  listingId: string;
  listing: {
    status: string;
    mls_number?: string | null;
    list_price?: number | null;
    address?: string;
    seller_name?: string;
    lockbox_code?: string;
    notes?: string | null;
    showing_window_start?: string | null;
    showing_window_end?: string | null;
    created_at?: string;
  };
  documents: ListingDocument[];
  formStatuses?: Record<string, "draft" | "completed">;
  seller?: { name: string; phone: string; email: string | null; type?: string };
  showingsCount?: number;
  stepFormData?: Record<string, Record<string, unknown>>;
  relatedDealId?: string;
  contactId?: string;
}) {
  const statuses = deriveStepStatuses(listing, documents, formStatuses);
  const substepStatuses = deriveSubstepStatuses(listing, documents, formStatuses, statuses);

  const messageCtx = useMemo<MessageContext>(
    () => ({
      address: listing.address,
      sellerName: listing.seller_name ?? seller?.name,
      listPrice: listing.list_price,
      mlsNumber: listing.mls_number,
      status: listing.status,
      documentCount: documents.length,
      formStatuses,
    }),
    [listing, documents.length, formStatuses, seller]
  );

  const stepDataCtx = useMemo<StepDataContext>(
    () => ({
      seller,
      listing,
      documents,
      formStatuses,
      showingsCount,
      stepFormData,
    }),
    [seller, listing, documents, formStatuses, showingsCount, stepFormData]
  );

  // Only the in-progress step starts expanded by default
  const initialExpanded = useMemo(() => {
    const expanded = new Set<string>();
    for (const step of WORKFLOW_STEPS) {
      if (statuses[step.id] === "in-progress") {
        expanded.add(step.id);
      }
    }
    return expanded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(initialExpanded);

  // For sold listings, start with workflow collapsed
  const isSold = listing.status === "sold";
  const [workflowCollapsed, setWorkflowCollapsed] = useState(isSold);

  function toggleStep(stepId: string) {
    // Prevent expanding locked (pending) steps
    if (statuses[stepId] === "pending") {
      toast.info("Complete the previous step first");
      return;
    }
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }

  const completedCount = Object.values(statuses).filter(
    (s) => s === "completed"
  ).length;

  return (
    <div className="space-y-5">
      {/* Sold banner */}
      {isSold && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-5 py-4">
            <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Listing Completed — Sold
                {listing.list_price
                  ? ` for ${formatPrice(listing.list_price)}`
                  : ""}
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                All {WORKFLOW_STEPS.length} workflow steps completed
              </p>
            </div>
          </div>

          {/* Post-completion navigation */}
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-5 py-3">
            <span className="text-xs font-medium text-muted-foreground">Next Actions:</span>
            <div className="flex items-center gap-2">
              {relatedDealId ? (
                <Link
                  href={`/pipeline/${relatedDealId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  View Deal <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <Link
                  href="/pipeline"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Go to Pipeline <ArrowRight className="h-3 w-3" />
                </Link>
              )}
              <Link
                href="/listings"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors"
              >
                Back to Listings
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => isSold && setWorkflowCollapsed((p) => !p)}
          className={`flex items-center gap-2 ${isSold ? "cursor-pointer" : ""}`}
        >
          {isSold && (
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                !workflowCollapsed ? "rotate-90" : ""
              }`}
            />
          )}
          <h2 className="text-lg font-semibold">Listing Workflow</h2>
        </button>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{WORKFLOW_STEPS.length} steps complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{
            width: `${(completedCount / WORKFLOW_STEPS.length) * 100}%`,
          }}
        />
      </div>

      {/* Timeline — collapsible for sold listings */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: workflowCollapsed ? "0fr" : "1fr" }}
      >
      <div className="overflow-hidden">
      <div className="relative">
        {WORKFLOW_STEPS.map((step, i) => {
          const status = statuses[step.id];
          const styles = STATUS_STYLES[status];
          const isLast = i === WORKFLOW_STEPS.length - 1;
          const stepNumber = i + 1;
          const isLocked = status === "pending";
          const isExpanded = expandedSteps.has(step.id) && !isLocked;
          const hasSubsteps = step.substeps.length > 0;

          const completedSubsteps = step.substeps.filter(
            (s) => substepStatuses[s.id] === "completed"
          ).length;

          // Determine if truly locked (previous step not done)
          const isFullyLocked =
            status === "pending" &&
            i > 0 &&
            statuses[WORKFLOW_STEPS[i - 1].id] !== "completed";

          return (
            <div key={step.id} className={`flex gap-4 pb-6 last:pb-0 ${isLocked ? "opacity-50" : ""}`}>
              {/* Timeline connector + circle */}
              <div className="flex flex-col items-center">
                {status === "completed" ? (
                  <button
                    type="button"
                    onClick={() => hasSubsteps && toggleStep(step.id)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-110 ${styles.circle}`}
                  >
                    <Check className="h-5 w-5 text-white" />
                  </button>
                ) : status === "in-progress" ? (
                  <button
                    type="button"
                    onClick={() => hasSubsteps && toggleStep(step.id)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-110 ${styles.circle}`}
                  >
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {stepNumber}
                    </span>
                  </button>
                ) : isLocked ? (
                  <button
                    type="button"
                    onClick={() => hasSubsteps && toggleStep(step.id)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${styles.circle}`}
                    title="Complete previous steps first"
                  >
                    <span className="text-sm">🔒</span>
                  </button>
                ) : (
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 opacity-50 cursor-not-allowed ${styles.circle}`}
                  >
                    <Lock className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                )}
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 mt-1.5 ${isLocked ? "border-l-2 border-dashed border-muted-foreground/15 w-0" : styles.connector}`}
                  />
                )}
              </div>

              {/* Content: clickable header + expandable substeps */}
              <div className="pb-2 min-w-0 pt-1.5 flex-1">
                {/* Step header — clickable (locked steps show toast) */}
                <button
                  type="button"
                  onClick={() => hasSubsteps && toggleStep(step.id)}
                  className={`w-full text-left ${isLocked ? "cursor-not-allowed opacity-60" : hasSubsteps ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`text-base ${isLocked ? "grayscale" : ""}`}>{step.icon}</span>
                    <p
                      className={`text-base font-semibold leading-6 ${styles.text}`}
                    >
                      {step.name}
                    </p>
                    {isLocked && (
                      <span className="text-[10px] text-muted-foreground/60 font-medium">(Locked)</span>
                    )}
                    {styles.badgeLabel && !isLocked && (
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${styles.badge}`}
                      >
                        {styles.badgeLabel}
                      </span>
                    )}
                    {/* Substep progress + chevron (hidden for locked steps) */}
                    {hasSubsteps && !isLocked && (
                      <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1.5">
                        <span className="tabular-nums">
                          {completedSubsteps}/{step.substeps.length}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    )}
                  </div>
                  <p className={`text-sm text-muted-foreground mt-1 ml-7 ${isLocked ? "opacity-60" : ""}`}>
                    {step.desc}
                  </p>
                </button>

                {/* Expandable content: data panel for completed, substeps for in-progress/pending */}
                {hasSubsteps && (
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                    style={{
                      gridTemplateRows: isExpanded ? "1fr" : "0fr",
                    }}
                  >
                    <div className="overflow-hidden">
                      {/* Data panel with edit/upload/template for all statuses */}
                      {(() => {
                        const sections = getStepDataSections(step.id, stepDataCtx);
                        const fieldConfigs = STEP_FIELDS[step.id] ?? [];
                        // For seller-intake, merge real DB values with form_submissions extras
                        let savedData = stepFormData[`step-${step.id}`] ?? {};
                        if (step.id === "seller-intake") {
                          savedData = {
                            full_name: seller?.name ?? "",
                            phone: seller?.phone ?? "",
                            email: seller?.email ?? "",
                            address: listing.address ?? "",
                            lockbox_code: listing.lockbox_code ?? "",
                            list_price: listing.list_price != null ? String(listing.list_price) : "",
                            notes: listing.notes ?? "",
                            ...savedData, // form_submissions extras (seller_type) override
                          };
                        }
                        return sections ? (
                          <div className="border border-border/50 rounded-lg bg-muted/20 p-4 mt-3 ml-7">
                            <StepDataPanel
                              listingId={listingId}
                              stepId={step.id}
                              sections={sections}
                              fieldConfigs={fieldConfigs}
                              savedData={savedData}
                              documents={documents}
                              address={listing.address}
                              hasEnrichmentData={Object.keys(stepFormData["step-data-enrichment"] ?? {}).length > 0}
                            />
                          </div>
                        ) : null;
                      })()}
                      {/* Activity messages for non-completed steps */}
                      {status !== "completed" && (
                        <div className="ml-7 mt-3 space-y-1.5">
                          {step.substeps.map((sub) => {
                            const subStatus = substepStatuses[sub.id];
                            const message = getSubstepMessage(sub.id, subStatus, messageCtx);
                            return (
                              <div
                                key={sub.id}
                                className="flex items-start gap-2.5 py-1.5"
                              >
                                {/* Substep indicator */}
                                <div className="mt-0.5 shrink-0">
                                  {subStatus === "completed" ? (
                                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  ) : subStatus === "in-progress" ? (
                                    <div className="h-5 w-5 rounded-full border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
                                      <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                    </div>
                                  ) : (
                                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/25 bg-muted/50" />
                                  )}
                                </div>
                                {/* Substep name + activity message */}
                                <div className="min-w-0">
                                  <span
                                    className={`text-sm ${
                                      subStatus === "completed"
                                        ? "text-foreground"
                                        : subStatus === "in-progress"
                                          ? "text-orange-600 dark:text-orange-400 font-medium"
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    {sub.name}
                                  </span>
                                  {message && (
                                    <p
                                      className={`text-xs mt-0.5 ${
                                        subStatus === "completed"
                                          ? "text-muted-foreground"
                                          : subStatus === "in-progress"
                                            ? "text-orange-600/80 dark:text-orange-400/80"
                                            : "text-muted-foreground/60"
                                      }`}
                                    >
                                      {message}
                                      {subStatus === "in-progress" && <TypingDots />}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      </div>
    </div>
  );
}
