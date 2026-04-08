"use client";

import { Check } from "lucide-react";

const SHOWING_STEPS = [
  {
    id: "request-submitted",
    name: "Request Submitted",
    desc: "Buyer agent submits showing request",
    icon: "\ud83d\udccb",
  },
  {
    id: "seller-notified",
    name: "Seller Notified",
    desc: "SMS/WhatsApp sent to seller",
    icon: "\ud83d\udcf1",
  },
  {
    id: "response-received",
    name: "Response Received",
    desc: "Seller confirms or denies",
    icon: "\u2705",
  },
  {
    id: "showing-completed",
    name: "Showing Completed",
    desc: "Property viewed by buyer",
    icon: "\ud83c\udfe0",
  },
  {
    id: "feedback",
    name: "Feedback",
    desc: "Post-showing notes & follow-up",
    icon: "\ud83d\udcac",
  },
];

type StepStatus = "completed" | "in-progress" | "pending";

const STATUS_STYLES = {
  completed: {
    circle: "bg-[#00C875] shadow-sm shadow-[#00C875]/30",
    connector: "bg-[#00C875]",
    text: "text-foreground",
    badge: "bg-[#00C875]/15 text-[#007A47] dark:bg-[#00C875]/15 dark:text-[#00C875]",
    badgeLabel: "COMPLETE",
  },
  "in-progress": {
    circle: "border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/50",
    connector: "bg-muted-foreground/15",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    badgeLabel: "IN PROGRESS",
  },
  pending: {
    circle: "border-2 border-muted-foreground/25 bg-muted/50",
    connector: "bg-muted-foreground/15",
    text: "text-muted-foreground",
    badge: "",
    badgeLabel: "",
  },
};

function deriveStepStatuses(showing: {
  status: string;
  twilio_message_sid: string | null;
  start_time: string;
  notes: string | null;
}): Record<string, StepStatus> {
  const statuses: Record<string, StepStatus> = {};

  const isConfirmed = showing.status === "confirmed";
  const isDenied = showing.status === "denied";
  const isResponded = isConfirmed || isDenied;
  const isPast = new Date(showing.start_time) < new Date();
  const showingCompleted = isConfirmed && isPast;
  const hasNotes = !!showing.notes && showing.notes.trim().length > 0;

  // Step 1: Request Submitted — always completed once a showing exists
  statuses["request-submitted"] = "completed";

  // Step 2: Seller Notified — completed if twilio_message_sid exists
  statuses["seller-notified"] = showing.twilio_message_sid
    ? "completed"
    : "in-progress";

  // Step 3: Response Received — completed if confirmed/denied; in-progress if requested
  statuses["response-received"] = isResponded
    ? "completed"
    : showing.twilio_message_sid
      ? "in-progress"
      : "pending";

  // Step 4: Showing Completed — completed if confirmed & past; in-progress if confirmed but future
  statuses["showing-completed"] = showingCompleted
    ? "completed"
    : isConfirmed
      ? "in-progress"
      : "pending";

  // Step 5: Feedback — completed if notes exist; in-progress if showing completed but no notes
  statuses["feedback"] = hasNotes
    ? "completed"
    : showingCompleted
      ? "in-progress"
      : "pending";

  // Sequential enforcement — a step cannot be "completed" or "in-progress"
  // if its predecessor is not "completed"
  const stepOrder = [
    "request-submitted",
    "seller-notified",
    "response-received",
    "showing-completed",
    "feedback",
  ];
  for (let i = 1; i < stepOrder.length; i++) {
    const prevStatus = statuses[stepOrder[i - 1]];
    const currStatus = statuses[stepOrder[i]];
    if (prevStatus !== "completed") {
      if (currStatus === "completed") {
        statuses[stepOrder[i]] = "pending";
      }
      if (currStatus === "in-progress" && prevStatus === "pending") {
        statuses[stepOrder[i]] = "pending";
      }
    }
  }

  return statuses;
}

export function ShowingWorkflow({
  showing,
}: {
  showing: {
    status: string;
    twilio_message_sid: string | null;
    start_time: string;
    notes: string | null;
  };
}) {
  const statuses = deriveStepStatuses(showing);

  const completedCount = Object.values(statuses).filter(
    (s) => s === "completed"
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Showing Workflow</h2>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{SHOWING_STEPS.length} steps complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00C875] to-[#007A47] transition-all duration-500"
          style={{
            width: `${(completedCount / SHOWING_STEPS.length) * 100}%`,
          }}
        />
      </div>

      {/* Timeline */}
      <div className="relative">
        {SHOWING_STEPS.map((step, i) => {
          const status = statuses[step.id];
          const styles = STATUS_STYLES[status];
          const isLast = i === SHOWING_STEPS.length - 1;
          const stepNumber = i + 1;

          return (
            <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
              {/* Timeline connector + circle */}
              <div className="flex flex-col items-center">
                {status === "completed" ? (
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}
                  >
                    <Check className="h-5 w-5 text-white" />
                  </div>
                ) : status === "in-progress" ? (
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}
                  >
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {stepNumber}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}
                  >
                    <span className="text-sm font-medium text-muted-foreground/50">
                      {stepNumber}
                    </span>
                  </div>
                )}
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 mt-1.5 ${styles.connector}`}
                  />
                )}
              </div>

              {/* Content: icon + name + badge + description */}
              <div className="pb-2 min-w-0 pt-1.5 flex-1">
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
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-7">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
