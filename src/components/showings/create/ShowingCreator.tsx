"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, X } from "lucide-react";
import Link from "next/link";
import { ShowingPreviewCard } from "./ShowingPreviewCard";
import { createShowingRequest } from "@/actions/showings";

interface ListingOption {
  id: string;
  address: string;
}

export function ShowingCreator() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listings loaded from API
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Form state
  const [listingId, setListingId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [buyerAgentName, setBuyerAgentName] = useState("");
  const [buyerAgentPhone, setBuyerAgentPhone] = useState("");
  const [buyerAgentEmail, setBuyerAgentEmail] = useState("");

  // Load active listings on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/listings?status=active");
        const data = await res.json();
        setListings(Array.isArray(data) ? data : []);
      } catch {
        setListings([]);
      }
      setLoadingListings(false);
    })();
  }, []);

  const selectedListing = listings.find((l) => l.id === listingId);
  const canSubmit = listingId && date && startTime && endTime && buyerAgentName.length >= 2 && buyerAgentPhone.length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00`).toISOString();

      const payload = {
        listingId,
        startTime: startISO,
        endTime: endISO,
        buyerAgentName: buyerAgentName.trim(),
        buyerAgentPhone: buyerAgentPhone.trim(),
        buyerAgentEmail: buyerAgentEmail.trim() || undefined,
      };

      const result = await createShowingRequest(payload as any);
      if (result && typeof result === "object" && "error" in result) {
        setError((result as { error: string }).error);
        setSubmitting(false);
        return;
      }

      router.push("/showings");
      router.refresh();
    } catch {
      setError("Failed to create showing request. Please try again.");
      setSubmitting(false);
    }
  };

  // Set default end time 30 min after start
  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    if (val && !endTime) {
      const [h, m] = val.split(":").map(Number);
      const totalMin = h * 60 + m + 30;
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      setEndTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
    }
  };

  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-amber-50/20 dark:from-zinc-950 dark:via-background dark:to-amber-950/5">
      {/* Header */}
      <div className="border-b border-border/30 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/showings"
              className="p-2 -ml-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Schedule a Showing
              </h1>
              <p className="text-sm text-muted-foreground">Request a showing for one of your active listings</p>
            </div>
          </div>
          <div />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* LEFT — Form */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
            </div>
          )}

          <div className="space-y-8">
            {/* Section 1: Which property? */}
            <div className="space-y-4">
              <SectionLabel number={1} label="Which property?" required />
              {loadingListings ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                  Loading listings...
                </div>
              ) : listings.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20">
                  <p className="text-sm text-amber-700 dark:text-amber-300">No active listings found.</p>
                  <Link href="/listings/new" className="text-sm text-indigo-600 hover:underline mt-1 inline-block">
                    Create a listing first →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {listings.map((listing) => {
                    const selected = listingId === listing.id;
                    return (
                      <button
                        key={listing.id}
                        type="button"
                        onClick={() => setListingId(listing.id)}
                        className={`
                          w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                          ${selected
                            ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800 ring-2 ring-amber-400 ring-offset-1 shadow-md"
                            : "border-border/30 hover:border-border hover:shadow-sm bg-white/50 dark:bg-white/5"
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${selected ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg" : "bg-muted/30"}`}>
                            🏠
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                              {listing.address}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: When? */}
            <div className="space-y-4">
              <SectionLabel number={2} label="When should the showing be?" required />
              <div className="p-4 rounded-xl bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Date <span className="text-red-400">*</span></label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="h-11 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Start time <span className="text-red-400">*</span></label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">End time <span className="text-red-400">*</span></label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Buyer's Agent */}
            <div className="space-y-4">
              <SectionLabel number={3} label="Buyer's agent info" required />
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Agent name <span className="text-red-400">*</span></label>
                  <Input
                    value={buyerAgentName}
                    onChange={(e) => setBuyerAgentName(e.target.value)}
                    placeholder="Jane Kim"
                    className="h-11 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone <span className="text-red-400">*</span></label>
                    <Input
                      value={buyerAgentPhone}
                      onChange={(e) => setBuyerAgentPhone(e.target.value)}
                      placeholder="604-555-9876"
                      className="h-11 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email</label>
                    <Input
                      value={buyerAgentEmail}
                      onChange={(e) => setBuyerAgentEmail(e.target.value)}
                      placeholder="jane@brokerage.com"
                      className="h-11 text-sm"
                      type="email"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div className="hidden lg:block w-[340px] shrink-0">
          <div className="fixed" style={{ width: "340px", top: "140px", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
            <ShowingPreviewCard
              listingAddress={selectedListing?.address || ""}
              date={date}
              startTime={startTime}
              endTime={endTime}
              buyerAgentName={buyerAgentName}
              buyerAgentPhone={buyerAgentPhone}
              buyerAgentEmail={buyerAgentEmail}
            />
            <p className="text-xs text-muted-foreground text-center mt-3 italic">
              The seller will be notified via their preferred channel
            </p>

            <Button
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="w-full mt-4 h-12 text-base font-semibold bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 shadow-lg rounded-xl"
              size="lg"
            >
              {submitting ? "Requesting..." : canSubmit ? "Request Showing →" : "Fill required fields *"}
            </Button>

            {canSubmit && (
              <p className="text-xs text-emerald-600 text-center mt-1.5 font-medium">Ready to send request</p>
            )}
          </div>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}

// ── Section Label ──────────────────────────
function SectionLabel({ number, label, optional, required }: { number: number; label: string; optional?: boolean; required?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
        {number}
      </div>
      <h2 className="text-sm font-semibold">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </h2>
      {optional && <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">optional</span>}
    </div>
  );
}
