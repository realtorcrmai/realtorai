"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronUp, Building2, X } from "lucide-react";
import Link from "next/link";
import { PropertyTypeSelector } from "./PropertyTypeSelector";
import { ListingPreviewCard } from "./ListingPreviewCard";
import { createListing } from "@/actions/listings";
import type { Contact } from "@/types";

export function ListingCreator() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Sellers loaded from API
  const [sellers, setSellers] = useState<Contact[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);

  // Form state
  const [address, setAddress] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [lockboxCode, setLockboxCode] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [mlsNumber, setMlsNumber] = useState("");
  const [showingStart, setShowingStart] = useState("");
  const [showingEnd, setShowingEnd] = useState("");
  const [notes, setNotes] = useState("");

  // Load sellers on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/contacts?type=seller");
        const data = await res.json();
        setSellers(Array.isArray(data) ? data : []);
      } catch {
        setSellers([]);
      }
      setLoadingSellers(false);
    })();
  }, []);

  const selectedSeller = sellers.find((s) => s.id === sellerId);
  const canSubmit = address.length >= 5 && sellerId && lockboxCode.length >= 1;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        address: address.trim(),
        seller_id: sellerId,
        lockbox_code: lockboxCode.trim(),
        property_type: propertyType || undefined,
        mls_number: mlsNumber.trim() || undefined,
        list_price: listPrice ? parseInt(listPrice) : undefined,
        showing_window_start: showingStart || undefined,
        showing_window_end: showingEnd || undefined,
        notes: notes.trim() || undefined,
      };

      const result = await createListing(payload as any);
      if (result && typeof result === "object" && "error" in result) {
        setError((result as { error: string }).error);
        setSubmitting(false);
        return;
      }

      router.push("/listings");
      router.refresh();
    } catch {
      setError("Failed to create listing. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-purple-50/20 dark:from-zinc-950 dark:via-background dark:to-purple-950/5">
      {/* Header */}
      <div className="border-b border-border/30 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/listings"
              className="p-2 -ml-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-500" />
                List a Property
              </h1>
              <p className="text-sm text-muted-foreground">Create a new listing and start the workflow</p>
            </div>
          </div>
          <div />
        </div>
      </div>

      {/* Content — 2 column: form scrolls, preview fixed */}
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
            {/* Section 1: Property Address */}
            <div className="space-y-4">
              <SectionLabel number={1} label="Property address" required />
              <div>
                <label className="text-sm font-medium mb-1.5 block">Full address <span className="text-red-400">*</span></label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1234 Marine Drive, West Vancouver, BC V7T 1B5"
                  className="h-11 text-sm"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground/60 mt-1">Street, city, province, postal code</p>
              </div>
            </div>

            {/* Section 2: Property Type */}
            <div className="space-y-4">
              <SectionLabel number={2} label="What type of property?" />
              <PropertyTypeSelector value={propertyType} onChange={setPropertyType} />
            </div>

            {/* Section 3: Seller */}
            <div className="space-y-4">
              <SectionLabel number={3} label="Who is the seller?" required />
              {loadingSellers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                  Loading sellers...
                </div>
              ) : sellers.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/20">
                  <p className="text-sm text-amber-700 dark:text-amber-300">No seller contacts found.</p>
                  <Link href="/contacts/new" className="text-sm text-indigo-600 hover:underline mt-1 inline-block">
                    Add a seller contact first →
                  </Link>
                </div>
              ) : (
                <select
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                  className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Select a seller...</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.phone}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Section 4: Key Details */}
            <div className="space-y-4">
              <SectionLabel number={4} label="Key details" required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Lockbox code <span className="text-red-400">*</span></label>
                  <Input
                    value={lockboxCode}
                    onChange={(e) => setLockboxCode(e.target.value)}
                    placeholder="1234"
                    className="h-11 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">List price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="899,000"
                      className="h-11 text-sm pl-7"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">MLS number</label>
                <Input
                  value={mlsNumber}
                  onChange={(e) => setMlsNumber(e.target.value)}
                  placeholder="R2912345"
                  className="h-11 text-sm"
                />
              </div>
            </div>

            {/* Section 5: More details (collapsible) */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Showing window & notes (optional)
              </button>

              {showMore && (
                <div className="space-y-4 animate-float-in">
                  <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border border-border/30 space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Showing Window</p>
                    <p className="text-xs text-muted-foreground/60">When are showings allowed for this property?</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Start time</label>
                        <Input
                          type="time"
                          value={showingStart}
                          onChange={(e) => setShowingStart(e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">End time</label>
                        <Input
                          type="time"
                          value={showingEnd}
                          onChange={(e) => setShowingEnd(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Notes</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special instructions, pet info, alarm codes..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div className="hidden lg:block w-[340px] shrink-0">
          <div className="fixed" style={{ width: "340px", top: "140px", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
            <ListingPreviewCard
              address={address}
              propertyType={propertyType}
              sellerName={selectedSeller?.name || ""}
              listPrice={listPrice}
              mlsNumber={mlsNumber}
              lockboxCode={lockboxCode}
              showingStart={showingStart}
              showingEnd={showingEnd}
              notes={notes}
            />
            <p className="text-xs text-muted-foreground text-center mt-3 italic">
              This is how the listing will appear in your CRM
            </p>

            <Button
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="w-full mt-4 h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 shadow-lg rounded-xl"
              size="lg"
            >
              {submitting ? "Creating..." : canSubmit ? "Create Listing →" : "Fill required fields *"}
            </Button>

            {canSubmit && (
              <p className="text-xs text-emerald-600 text-center mt-1.5 font-medium">Ready to list</p>
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
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
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
