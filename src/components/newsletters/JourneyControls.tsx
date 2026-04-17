"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { pauseJourney, resumeJourney, triggerNextEmail, enrollContactInJourney } from "@/actions/journeys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ─── Phase badge labels ───────────────────────────────────────────────────────
const PHASE_LABELS: Record<string, string> = {
  lead: "Lead",
  active: "Active",
  under_contract: "Under Contract",
  past_client: "Past Client",
  dormant: "Dormant",
};

const PHASE_COLORS: Record<string, string> = {
  lead: "bg-green-100 text-green-700",
  active: "bg-brand-muted text-brand-dark",
  under_contract: "bg-blue-100 text-blue-700",
  past_client: "bg-purple-100 text-purple-700",
  dormant: "bg-gray-100 text-gray-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function formatNextEmail(dateStr: string | null): string {
  if (!dateStr) return "No email scheduled";
  const d = new Date(dateStr);
  const now = new Date();
  if (d < now) return "Due now";
  return "Next email: " + d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: LOCAL_TZ });
}

// ─── Pause/Resume + Send Next controls per journey row ───────────────────────
export function JourneyRowControls({
  journeyId,
  contactId,
  journeyType,
  isPaused,
  nextEmailAt,
}: {
  journeyId: string;
  contactId: string;
  journeyType: string;
  isPaused: boolean;
  nextEmailAt: string | null;
}) {
  const router = useRouter();
  const [pendingPause, startPause] = useTransition();
  const [pendingResume, startResume] = useTransition();
  const [pendingSend, startSend] = useTransition();

  const isFuture = nextEmailAt ? new Date(nextEmailAt) > new Date() : false;

  function handlePause() {
    const confirmed = window.confirm("Pause this journey? The contact will stop receiving emails.");
    if (!confirmed) return;
    startPause(async () => {
      const result = await pauseJourney(contactId, journeyType as any, "manual");
      if (result?.error) {
        toast.error("Failed to pause journey: " + result.error);
        return;
      }
      toast.success("Journey paused");
      router.refresh();
    });
  }

  function handleResume() {
    startResume(async () => {
      const result = await resumeJourney(contactId, journeyType as any);
      if (result?.error) {
        toast.error("Failed to resume journey: " + result.error);
        return;
      }
      toast.success("Journey resumed");
      router.refresh();
    });
  }

  function handleSendNext() {
    startSend(async () => {
      const result = await triggerNextEmail(journeyId);
      if (result?.error) {
        toast.error("Failed to send next email: " + result.error);
        return;
      }
      toast.success("Next email sent");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isPaused ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleResume}
          disabled={pendingResume}
          className="text-xs h-7 px-2.5"
        >
          {pendingResume ? "..." : "▶ Resume"}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePause}
          disabled={pendingPause}
          className="text-xs h-7 px-2.5"
        >
          {pendingPause ? "..." : "⏸ Pause"}
        </Button>
      )}

      {!isPaused && isFuture && (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSendNext}
          disabled={pendingSend}
          className="text-xs h-7 px-2.5"
          title="Send next email immediately"
        >
          {pendingSend ? "Sending..." : "⚡ Send Next"}
        </Button>
      )}
    </div>
  );
}

// ─── Bulk enrollment modal ────────────────────────────────────────────────────
export function BulkEnrollModal({
  unenrolledContacts,
}: {
  unenrolledContacts: Array<{ id: string; name: string; email: string | null; type: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [journeyType, setJourneyType] = useState<"buyer" | "seller">("buyer");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function toggleContact(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === unenrolledContacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unenrolledContacts.map((c) => c.id)));
    }
  }

  function handleEnroll() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const selectedIds = Array.from(selected);
      const results = await Promise.allSettled(
        selectedIds.map((id) => enrollContactInJourney(id, journeyType))
      );
      const failures = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value?.error)
      );
      if (failures.length > 0) {
        toast.error(`${failures.length} contact${failures.length > 1 ? "s" : ""} failed to enroll`);
      } else {
        toast.success(`${selectedIds.length} contact${selectedIds.length > 1 ? "s" : ""} enrolled`);
      }
      setDone(true);
      setSelected(new Set());
      // Close after a short moment so user sees "done" state
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1200);
    });
  }

  // Filter contacts by journey type affinity
  const filteredContacts = unenrolledContacts.filter((c) => {
    if (journeyType === "buyer") return ["buyer", "customer"].includes(c.type);
    if (journeyType === "seller") return c.type === "seller";
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm hover:bg-brand-dark active:bg-brand-dark/90 text-xs font-medium h-8 px-2.5 transition-all"
      >
        ➕ Enroll Contacts
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll Contacts in Journey</DialogTitle>
        </DialogHeader>

        {unenrolledContacts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            All contacts are already enrolled in a journey.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Journey type selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Journey Type
              </label>
              <div className="flex gap-2">
                {(["buyer", "seller"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setJourneyType(t);
                      setSelected(new Set());
                    }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      journeyType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {t === "buyer" ? "🏠 Buyer" : "🏷️ Seller"}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact list */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Contacts ({filteredContacts.length})
                </label>
                {filteredContacts.length > 0 && (
                  <button
                    onClick={toggleAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {selected.size === filteredContacts.length ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>

              {filteredContacts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  No un-enrolled {journeyType} contacts.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1 rounded-lg border border-border p-1">
                  {filteredContacts.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleContact(c.id)}
                        className="rounded border-border accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        {c.email && (
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        )}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize shrink-0">
                        {c.type}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter showCloseButton={filteredContacts.length === 0}>
          {filteredContacts.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={handleEnroll}
                disabled={pending || selected.size === 0}
              >
                {done
                  ? "✅ Enrolled!"
                  : pending
                  ? `Enrolling ${selected.size}...`
                  : `Enroll ${selected.size > 0 ? selected.size : ""} Selected`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Journey row — phase badge + next email date ──────────────────────────────
export function JourneyPhaseBadge({
  phase,
  isPaused,
}: {
  phase: string;
  isPaused: boolean;
}) {
  const colorClass = PHASE_COLORS[phase] ?? "bg-gray-100 text-gray-600";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {PHASE_LABELS[phase] ?? phase}
      </span>
      {isPaused && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
          ⏸ Paused
        </span>
      )}
    </div>
  );
}

export function NextEmailLabel({ nextEmailAt, isPaused }: { nextEmailAt: string | null; isPaused: boolean }) {
  if (isPaused) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className="text-xs text-muted-foreground">{formatNextEmail(nextEmailAt)}</span>;
}
