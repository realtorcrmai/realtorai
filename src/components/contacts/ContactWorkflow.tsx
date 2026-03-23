"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Contact, Listing, Communication } from "@/types";
import {
  CONTACT_STEPS,
  STATUS_STYLES,
  deriveStepStatuses,
  deriveSubstepStatuses,
  getSubstepMessage,
  getStepDataSections,
  getBestBuyerDeal,
  type StepStatus,
  type BuyerDeal,
  type MessageContext,
} from "./contactWorkflowUtils";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:0ms]" />
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:150ms]" />
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

export function ContactWorkflow({
  contact,
  listings,
  communications,
  deals = [],
}: {
  contact: Contact;
  listings: Listing[];
  communications: Communication[];
  deals?: BuyerDeal[];
}) {
  const statuses = deriveStepStatuses(contact, listings, communications, deals);
  const substepStatuses = deriveSubstepStatuses(
    contact,
    listings,
    communications,
    statuses,
    deals
  );

  const bestDeal = contact.type === "buyer" ? getBestBuyerDeal(deals) : null;

  const messageCtx = useMemo<MessageContext>(
    () => ({
      contactName: contact.name,
      contactType: contact.type,
      listingsCount: listings.length,
      communicationsCount: communications.length,
      hasNotes: !!contact.notes,
      hasEmail: !!contact.email,
      listingAddresses: listings.map((l) => l.address),
      bestDealAddress: bestDeal?.listings?.address ?? null,
      bestDealValue: bestDeal?.value ?? null,
      bestDealCloseDate: bestDeal?.close_date ?? null,
      bestDealStatus: bestDeal?.status ?? null,
      dealsCount: deals.length,
    }),
    [contact, listings, communications, bestDeal, deals.length]
  );

  // Only the in-progress step starts expanded by default
  const initialExpanded = useMemo(() => {
    const expanded = new Set<string>();
    for (const step of CONTACT_STEPS) {
      if (statuses[step.id] === "in-progress") {
        expanded.add(step.id);
      }
    }
    return expanded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expandedSteps, setExpandedSteps] =
    useState<Set<string>>(initialExpanded);

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
        <h2 className="text-lg font-semibold">Contact Lifecycle</h2>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{CONTACT_STEPS.length} steps complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{
            width: `${(completedCount / CONTACT_STEPS.length) * 100}%`,
          }}
        />
      </div>

      {/* Timeline */}
      <div className="relative">
        {CONTACT_STEPS.map((step, i) => {
          const status = statuses[step.id];
          const styles = STATUS_STYLES[status];
          const isLast = i === CONTACT_STEPS.length - 1;
          const stepNumber = i + 1;
          const isExpanded = expandedSteps.has(step.id);
          const hasSubsteps = step.substeps.length > 0;

          const completedSubsteps = step.substeps.filter(
            (s) => substepStatuses[s.id] === "completed"
          ).length;

          const sections = getStepDataSections(
            step.id,
            contact,
            listings,
            communications,
            deals
          );

          return (
            <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
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
                ) : (
                  <button
                    type="button"
                    onClick={() => hasSubsteps && toggleStep(step.id)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-110 ${styles.circle}`}
                  >
                    <span className="text-sm font-medium text-muted-foreground/50">
                      {stepNumber}
                    </span>
                  </button>
                )}
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 mt-1.5 ${styles.connector}`}
                  />
                )}
              </div>

              {/* Content: clickable header + expandable substeps */}
              <div className="pb-2 min-w-0 pt-1.5 flex-1">
                {/* Step header — clickable */}
                <button
                  type="button"
                  onClick={() => hasSubsteps && toggleStep(step.id)}
                  className={`w-full text-left ${hasSubsteps ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base">{step.icon}</span>
                    <p
                      className={`text-base font-semibold leading-6 ${styles.text}`}
                    >
                      {step.name}
                    </p>
                    {styles.badgeLabel && (
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${styles.badge}`}
                      >
                        {styles.badgeLabel}
                      </span>
                    )}
                    {/* Substep progress + chevron */}
                    {hasSubsteps && (
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
                  <p className="text-sm text-muted-foreground mt-1 ml-7">
                    {step.desc}
                  </p>
                </button>

                {/* Expandable content: data panel + substeps */}
                {hasSubsteps && (
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                    style={{
                      gridTemplateRows: isExpanded ? "1fr" : "0fr",
                    }}
                  >
                    <div className="overflow-hidden">
                      {/* Data panel */}
                      {sections && (
                        <div className="border border-border/50 rounded-lg bg-muted/20 p-4 mt-3 ml-7">
                          <div className="space-y-4">
                            {sections.map((section) => (
                              <div key={section.title}>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  {section.title}
                                </h4>
                                <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                  {section.fields.map((field, idx) => (
                                    <div
                                      key={`${section.title}-${field.label}-${idx}`}
                                      className={
                                        field.label === "Notes" ||
                                        field.value.length > 40
                                          ? "col-span-2"
                                          : ""
                                      }
                                    >
                                      <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                        {field.label}
                                      </dt>
                                      <dd className="text-sm text-foreground mt-0.5 truncate">
                                        {field.value}
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Activity messages (substeps) */}
                      <div className="ml-7 mt-3 space-y-1.5">
                        {step.substeps.map((sub) => {
                          const subStatus = substepStatuses[sub.id];
                          const message = getSubstepMessage(
                            sub.id,
                            subStatus,
                            messageCtx
                          );
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
                                    {subStatus === "in-progress" && (
                                      <TypingDots />
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
