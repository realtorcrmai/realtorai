"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setEditionABSubjects, pickABWinner } from "@/actions/editorial";

type ABTest = {
  id: string;
  title: string;
  edition_type: string;
  status: string;
  subject_a: string | null;
  subject_b: string | null;
  active_variant: string;
  ab_winner: string | null;
  ab_test_sent_at: string | null;
  sent_at: string | null;
  send_count: number;
  created_at: string;
};

type DraftEdition = {
  id: string;
  title: string;
  edition_type: string;
  subject_a: string | null;
};

type Props = {
  tests: ABTest[];
  drafts: DraftEdition[];
};

const EDITION_TYPE_LABELS: Record<string, string> = {
  market_update: "Market Update",
  just_sold: "Just Sold",
  open_house: "Open House",
  neighbourhood_spotlight: "Neighbourhood Spotlight",
  rate_watch: "Rate Watch",
  seasonal: "Seasonal",
};

const EDITION_TYPE_ICONS: Record<string, string> = {
  market_update: "📊",
  just_sold: "🎉",
  open_house: "🏡",
  neighbourhood_spotlight: "🗺️",
  rate_watch: "📈",
  seasonal: "🌿",
};

function getTestStatus(test: ABTest): { label: string; variant: "success" | "warning" | "secondary" | "info" } {
  if (test.ab_winner) return { label: "Winner Picked", variant: "success" };
  if (test.active_variant === "ab_testing") return { label: "Running", variant: "warning" };
  if (test.subject_b) return { label: "Configured", variant: "info" };
  return { label: "Draft", variant: "secondary" };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ABTestingClient({ tests, drafts }: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEditionId, setSelectedEditionId] = useState("");
  const [subjectA, setSubjectA] = useState("");
  const [subjectB, setSubjectB] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pickingWinner, setPickingWinner] = useState<string | null>(null);

  // Pre-fill subject A when a draft edition is selected
  function handleSelectEdition(id: string) {
    setSelectedEditionId(id);
    const draft = drafts.find((d) => d.id === id);
    if (draft?.subject_a) {
      setSubjectA(draft.subject_a);
    } else {
      setSubjectA("");
    }
    setFormError("");
    setFormSuccess("");
  }

  function handleCreateTest() {
    if (!selectedEditionId) {
      setFormError("Please select a newsletter edition.");
      return;
    }
    if (!subjectA.trim()) {
      setFormError("Subject Line A is required.");
      return;
    }
    if (!subjectB.trim()) {
      setFormError("Subject Line B is required.");
      return;
    }
    if (subjectA.trim() === subjectB.trim()) {
      setFormError("Subject A and B must be different.");
      return;
    }

    setFormError("");
    startTransition(async () => {
      const result = await setEditionABSubjects(selectedEditionId, subjectA, subjectB);
      if (result.error) {
        setFormError(result.error);
      } else {
        setFormSuccess("A/B test configured! The variants will be sent when this edition is dispatched.");
        setShowCreateForm(false);
        setSelectedEditionId("");
        setSubjectA("");
        setSubjectB("");
      }
    });
  }

  function handlePickWinner(editionId: string, winner: "a" | "b") {
    setPickingWinner(editionId + winner);
    startTransition(async () => {
      await pickABWinner(editionId, winner);
      setPickingWinner(null);
    });
  }

  const runningTests = tests.filter((t) => t.active_variant === "ab_testing" && !t.ab_winner);
  const completedTests = tests.filter((t) => t.ab_winner);
  const configuredTests = tests.filter((t) => t.subject_b && t.active_variant !== "ab_testing" && !t.ab_winner);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test subject lines on editorial newsletter editions to improve open rates.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setFormError("");
            setFormSuccess("");
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          {showCreateForm ? "✕ Cancel" : "+ New A/B Test"}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Configure A/B Subject Line Test</h3>

            {/* Edition selector */}
            <div>
              <label className="text-xs font-medium block mb-1.5">
                Newsletter Edition
              </label>
              {drafts.length === 0 ? (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
                  No draft or ready editions found.{" "}
                  <a href="/newsletters/editorial/new" className="text-primary underline">
                    Create one first →
                  </a>
                </p>
              ) : (
                <select
                  value={selectedEditionId}
                  onChange={(e) => handleSelectEdition(e.target.value)}
                  aria-label="Select newsletter edition for A/B test"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— Select an edition —</option>
                  {drafts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {EDITION_TYPE_ICONS[d.edition_type] || "📄"}{" "}
                      {d.title} ({EDITION_TYPE_LABELS[d.edition_type] || d.edition_type})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Subject lines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1.5">
                  Subject Line A <span className="text-muted-foreground font-normal">(original)</span>
                </label>
                <input
                  type="text"
                  value={subjectA}
                  onChange={(e) => setSubjectA(e.target.value)}
                  placeholder="e.g., Vancouver Market Update — March 2026"
                  aria-label="Subject Line A"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={500}
                />
                <p className="text-[11px] text-muted-foreground mt-1">{subjectA.length}/500 chars</p>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1.5">
                  Subject Line B <span className="text-muted-foreground font-normal">(variant)</span>
                </label>
                <input
                  type="text"
                  value={subjectB}
                  onChange={(e) => setSubjectB(e.target.value)}
                  placeholder="e.g., Prices up 3% in March — what it means for you"
                  aria-label="Subject Line B"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={500}
                />
                <p className="text-[11px] text-muted-foreground mt-1">{subjectB.length}/500 chars</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-base shrink-0">ℹ️</span>
              <p className="text-xs text-amber-800">
                Recipients are randomly split 50/50. The winner is determined by open rate after sending. You can manually pick a winner from this page.
              </p>
            </div>

            {formError && (
              <p className="text-xs text-destructive font-medium">{formError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTest}
                disabled={isPending || drafts.length === 0}
                className="text-xs px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? "Configuring..." : "Configure A/B Test"}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {formSuccess && (
        <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg">
          <span>✅</span>
          <p className="text-xs text-success font-medium">{formSuccess}</p>
        </div>
      )}

      {/* Running Tests */}
      {runningTests.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            🔬 Running ({runningTests.length})
          </h3>
          <div className="space-y-3">
            {runningTests.map((test) => (
              <ABTestCard
                key={test.id}
                test={test}
                onPickWinner={handlePickWinner}
                pickingWinner={pickingWinner}
              />
            ))}
          </div>
        </section>
      )}

      {/* Configured (not yet sent) */}
      {configuredTests.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            ⚙️ Configured — Ready to Send ({configuredTests.length})
          </h3>
          <div className="space-y-3">
            {configuredTests.map((test) => (
              <ABTestCard
                key={test.id}
                test={test}
                onPickWinner={handlePickWinner}
                pickingWinner={pickingWinner}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completedTests.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            🏆 Completed ({completedTests.length})
          </h3>
          <div className="space-y-3">
            {completedTests.map((test) => (
              <ABTestCard
                key={test.id}
                test={test}
                onPickWinner={handlePickWinner}
                pickingWinner={pickingWinner}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {tests.length === 0 && !showCreateForm && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-4xl mb-3">🧪</p>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              No A/B tests yet
            </h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
              Configure two subject line variants on any editorial edition to automatically split-test open rates.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-4 py-2 text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              + Create Your First A/B Test
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── ABTestCard sub-component ──────────────────────────────────────────────────

function ABTestCard({
  test,
  onPickWinner,
  pickingWinner,
}: {
  test: ABTest;
  onPickWinner: (id: string, winner: "a" | "b") => void;
  pickingWinner: string | null;
}) {
  const { label, variant } = getTestStatus(test);
  const icon = EDITION_TYPE_ICONS[test.edition_type] || "📄";
  const typeLabel = EDITION_TYPE_LABELS[test.edition_type] || test.edition_type;
  const isRunning = test.active_variant === "ab_testing" && !test.ab_winner;
  const hasWinner = Boolean(test.ab_winner);

  return (
    <Card className={hasWinner ? "border-success/30" : isRunning ? "border-amber-200" : ""}>
      <CardContent className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">{icon}</span>
            <div className="min-w-0">
              <a
                href={`/newsletters/editorial/${test.id}`}
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
              >
                {test.title}
              </a>
              <p className="text-[11px] text-muted-foreground">
                {typeLabel} · {test.send_count > 0 ? `${test.send_count} recipients` : "Not sent yet"} · Created {formatDate(test.created_at)}
              </p>
            </div>
          </div>
          <Badge variant={variant} className="text-[10px] shrink-0">
            {label}
          </Badge>
        </div>

        {/* Subject comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          {/* Variant A */}
          <div
            className={`px-3 py-2.5 rounded-lg border text-xs ${
              test.ab_winner === "a"
                ? "bg-success/10 border-success/30"
                : test.ab_winner === "b"
                ? "bg-muted/50 border-border opacity-60"
                : "bg-background border-border"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold shrink-0">
                A
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Variant A {test.ab_winner === "a" ? "🏆 Winner" : ""}
              </span>
            </div>
            <p className="text-foreground leading-snug">
              {test.subject_a || <span className="text-muted-foreground italic">No subject set</span>}
            </p>
          </div>

          {/* Variant B */}
          <div
            className={`px-3 py-2.5 rounded-lg border text-xs ${
              test.ab_winner === "b"
                ? "bg-success/10 border-success/30"
                : test.ab_winner === "a"
                ? "bg-muted/50 border-border opacity-60"
                : "bg-background border-border"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold shrink-0">
                B
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Variant B {test.ab_winner === "b" ? "🏆 Winner" : ""}
              </span>
            </div>
            <p className="text-foreground leading-snug">
              {test.subject_b || <span className="text-muted-foreground italic">No subject set</span>}
            </p>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground">
            {test.ab_test_sent_at ? (
              <span>Sent {formatDate(test.ab_test_sent_at)}</span>
            ) : test.sent_at ? (
              <span>Sent {formatDate(test.sent_at)}</span>
            ) : (
              <span>Will split 50/50 on send</span>
            )}
          </div>
          {!hasWinner && isRunning && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Pick winner:</span>
              <button
                onClick={() => onPickWinner(test.id, "a")}
                disabled={pickingWinner === test.id + "a"}
                aria-label="Pick Variant A as winner"
                className="text-[11px] px-2.5 py-1 rounded bg-primary/10 text-primary font-medium hover:bg-primary/20 disabled:opacity-50 transition-colors"
              >
                {pickingWinner === test.id + "a" ? "..." : "A Wins"}
              </button>
              <button
                onClick={() => onPickWinner(test.id, "b")}
                disabled={pickingWinner === test.id + "b"}
                aria-label="Pick Variant B as winner"
                className="text-[11px] px-2.5 py-1 rounded bg-brand/10 text-brand-dark font-medium hover:bg-brand/20 disabled:opacity-50 transition-colors"
              >
                {pickingWinner === test.id + "b" ? "..." : "B Wins"}
              </button>
            </div>
          )}
          {hasWinner && (
            <span className="text-[11px] text-success font-medium">
              ✅ Winner: Variant {test.ab_winner?.toUpperCase()}
            </span>
          )}
          {!hasWinner && !isRunning && (
            <a
              href={`/newsletters/editorial/${test.id}`}
              className="text-[11px] text-primary font-medium hover:underline"
            >
              Edit &amp; Send →
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
