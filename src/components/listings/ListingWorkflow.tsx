"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { EditableStepDataPanel } from "@/components/listings/EditableStepDataPanel";
import { SkipStepButton } from "@/components/listings/SkipStepButton";
import type { ListingDocument } from "@/types";
import {
  WORKFLOW_STEPS,
  STATUS_STYLES,
  deriveStepStatuses,
  deriveSubstepStatuses,
  getSubstepMessage,
  TypingDots,
  getStepDataSections,
} from "./workflow";
import { PhaseActions } from "./workflow/PhaseActions";
import type { MessageContext, StepDataContext } from "./workflow";

export function ListingWorkflow({
  listing,
  documents,
  formStatuses = {},
  seller,
  showingsCount,
  listingId,
  sellerIdentities = [],
  photos = [],
  contactId,
}: {
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
    bedrooms?: number | null;
    bathrooms?: number | null;
    total_sqft?: number | null;
    finished_sqft?: number | null;
    lot_sqft?: number | null;
    year_built?: number | null;
    parking_spaces?: number | null;
    stories?: number | null;
    basement_type?: string | null;
    heating_type?: string | null;
    cooling_type?: string | null;
    roof_type?: string | null;
    exterior_type?: string | null;
    flooring?: string[];
    features?: string[];
  };
  documents: ListingDocument[];
  formStatuses?: Record<string, "draft" | "completed">;
  seller?: { name: string; phone: string; email: string | null; type?: string };
  showingsCount?: number;
  listingId: string;
  contactId: string;
  sellerIdentities?: unknown[];
  photos?: { id: string; photo_url: string; role: string; caption: string | null; sort_order: number }[];
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
    }),
    [seller, listing, documents, formStatuses, showingsCount]
  );

  const initialExpanded = useMemo(() => {
    const expanded = new Set<string>();
    let foundFirstPending = false;
    for (const step of WORKFLOW_STEPS) {
      if (statuses[step.id] !== "pending") {
        expanded.add(step.id);
      } else if (!foundFirstPending) {
        expanded.add(step.id);
        foundFirstPending = true;
      }
    }
    return expanded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(initialExpanded);

  function toggleStep(stepId: string) {
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Listing Workflow</h2>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{WORKFLOW_STEPS.length} steps complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00C875] to-[#007A47] transition-all duration-500"
          style={{
            width: `${(completedCount / WORKFLOW_STEPS.length) * 100}%`,
          }}
        />
      </div>

      {/* Timeline */}
      <div className="relative">
        {WORKFLOW_STEPS.map((step, i) => {
          const status = statuses[step.id];
          const styles = STATUS_STYLES[status];
          const isLast = i === WORKFLOW_STEPS.length - 1;
          const stepNumber = i + 1;
          const isExpanded = expandedSteps.has(step.id);
          const hasSubsteps = step.substeps.length > 0;

          const completedSubsteps = step.substeps.filter(
            (s) => substepStatuses[s.id] === "completed"
          ).length;

          const isLocked =
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
                    aria-label={`Phase ${stepNumber}: ${step.name} — Complete. ${isExpanded ? "Collapse" : "Expand"} details.`}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-110 ${styles.circle}`}
                  >
                    <Check className="h-5 w-5 text-white" />
                  </button>
                ) : status === "in-progress" ? (
                  <button
                    type="button"
                    onClick={() => hasSubsteps && toggleStep(step.id)}
                    aria-label={`Phase ${stepNumber}: ${step.name} — In progress. ${isExpanded ? "Collapse" : "Expand"} details.`}
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
                    aria-label={`Phase ${stepNumber}: ${step.name} — Locked. Complete previous steps first.`}
                  >
                    <span className="text-sm" role="img" aria-hidden="true">🔒</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => hasSubsteps && toggleStep(step.id)}
                    aria-label={`Phase ${stepNumber}: ${step.name} — Pending. ${isExpanded ? "Collapse" : "Expand"} details.`}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-110 ${styles.circle}`}
                  >
                    <span className="text-sm font-medium text-muted-foreground/50">
                      {stepNumber}
                    </span>
                  </button>
                )}
                {!isLast && (
                  <div className={`w-0.5 flex-1 mt-1.5 ${styles.connector}`} />
                )}
              </div>

              {/* Content */}
              <div className="pb-2 min-w-0 pt-1.5 flex-1">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => hasSubsteps && toggleStep(step.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hasSubsteps && toggleStep(step.id); } }}
                  className={`w-full text-left ${hasSubsteps ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base">{step.icon}</span>
                    <p className={`text-base font-semibold leading-6 ${styles.text}`}>
                      {step.name}
                    </p>
                    {styles.badgeLabel && (
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${styles.badge}`}>
                        {styles.badgeLabel}
                      </span>
                    )}
                    {(status === "pending" || isLocked) && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <SkipStepButton listingId={listingId} stepId={step.id} stepName={step.name} />
                      </span>
                    )}
                    {hasSubsteps && (
                      <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1.5">
                        <span className="tabular-nums">{completedSubsteps}/{step.substeps.length}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-7">{step.desc}</p>
                </div>

                {/* Expandable content */}
                {hasSubsteps && (
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                    style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      {status === "completed" && (() => {
                        const sections = getStepDataSections(step.id, stepDataCtx);
                        return sections ? (
                          <div className="border border-border/50 rounded-lg bg-muted/20 p-4 mt-3 ml-7">
                            <EditableStepDataPanel
                              sections={sections}
                              listingId={listingId}
                              contactId={contactId}
                            />
                          </div>
                        ) : null;
                      })()}
                      {status !== "completed" && (
                        <div className="ml-7 mt-3 space-y-1.5">
                          {step.substeps.map((sub) => {
                            const subStatus = substepStatuses[sub.id];
                            const message = getSubstepMessage(sub.id, subStatus, messageCtx);
                            return (
                              <div key={sub.id} className="flex items-start gap-2.5 py-1.5">
                                <div className="mt-0.5 shrink-0">
                                  {subStatus === "completed" ? (
                                    <div className="h-5 w-5 rounded-full bg-brand flex items-center justify-center">
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
                                <div className="min-w-0">
                                  <span className={`text-sm ${
                                    subStatus === "completed"
                                      ? "text-foreground"
                                      : subStatus === "in-progress"
                                        ? "text-orange-600 dark:text-orange-400 font-medium"
                                        : "text-muted-foreground"
                                  }`}>
                                    {sub.name}
                                  </span>
                                  {message && (
                                    <p className={`text-xs mt-0.5 ${
                                      subStatus === "completed"
                                        ? "text-muted-foreground"
                                        : subStatus === "in-progress"
                                          ? "text-orange-600/80 dark:text-orange-400/80"
                                          : "text-muted-foreground/60"
                                    }`}>
                                      {message}
                                      {subStatus === "in-progress" && <TypingDots />}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Phase action panel */}
                          <div className="ml-0 mt-2 border-t border-border/30 pt-3">
                            <PhaseActions
                              stepId={step.id}
                              listingId={listingId}
                              contactId={contactId}
                              listing={listing as Record<string, unknown>}
                              seller={seller as any}
                              documents={documents}
                              formStatuses={formStatuses}
                              sellerIdentities={sellerIdentities}
                              photos={photos}
                            />
                          </div>
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
  );
}
