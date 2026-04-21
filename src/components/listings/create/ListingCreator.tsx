"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Building2, X, Check } from "lucide-react";
import Link from "next/link";
import { PropertyTypeSelector } from "./PropertyTypeSelector";
import { PropertyDetailsStep } from "./PropertyDetailsStep";
import { FintracStep, type FintracData } from "./FintracStep";
import { ReviewStep } from "./ReviewStep";
import { createListing } from "@/actions/listings";
import { createSellerIdentity } from "@/actions/seller-identities";
import type { Contact } from "@/types";

const STEPS = [
  { id: 1, label: "Property & Seller", icon: "🏠" },
  { id: 2, label: "Property Details", icon: "📐" },
  { id: 3, label: "Pricing & Showing", icon: "💰" },
  { id: 4, label: "Seller Identity", icon: "🆔" },
  { id: 5, label: "Review & Create", icon: "✅" },
];

export function ListingCreator() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sellers
  const [sellers, setSellers] = useState<Contact[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);

  // Step 1: Property & Seller
  const [address, setAddress] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [lockboxCode, setLockboxCode] = useState("");

  // Step 2: Property Details
  const [propDetails, setPropDetails] = useState({
    bedrooms: "", bathrooms: "", total_sqft: "", finished_sqft: "",
    lot_sqft: "", year_built: "", parking_spaces: "", stories: "",
    basement_type: "", heating_type: "", cooling_type: "",
    roof_type: "", exterior_type: "",
    flooring: [] as string[], features: [] as string[],
  });

  // Step 3: Pricing & Showing
  const [listPrice, setListPrice] = useState("");
  const [mlsNumber, setMlsNumber] = useState("");
  const [showingStart, setShowingStart] = useState("");
  const [showingEnd, setShowingEnd] = useState("");
  const [notes, setNotes] = useState("");

  // Step 4: FINTRAC
  const [fintrac, setFintrac] = useState<FintracData>({
    full_name: "", dob: "", citizenship: "canadian",
    id_type: "drivers_license", id_number: "", id_expiry: "",
    phone: "", email: "", mailing_address: "", occupation: "",
  });

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

  // Per-step validation
  const step1Valid = address.length >= 5 && !!sellerId && lockboxCode.length >= 1;
  const step2Valid = !!propDetails.bedrooms && !!propDetails.bathrooms && !!propDetails.total_sqft;
  const step3Valid = true; // all optional
  const step4Valid = true; // skippable

  function canProceed() {
    if (step === 1) return step1Valid;
    if (step === 2) return step2Valid;
    if (step === 3) return step3Valid;
    if (step === 4) return step4Valid;
    return true;
  }

  function handlePropDetailChange(field: string, value: string | string[]) {
    setPropDetails((prev) => ({ ...prev, [field]: value }));
  }

  function handleFintracChange(field: string, value: string) {
    setFintrac((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
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

      // Property details
      if (propDetails.bedrooms) payload.bedrooms = parseInt(propDetails.bedrooms);
      if (propDetails.bathrooms) payload.bathrooms = parseFloat(propDetails.bathrooms);
      if (propDetails.total_sqft) payload.total_sqft = parseInt(propDetails.total_sqft);
      if (propDetails.finished_sqft) payload.finished_sqft = parseInt(propDetails.finished_sqft);
      if (propDetails.lot_sqft) payload.lot_sqft = parseInt(propDetails.lot_sqft);
      if (propDetails.year_built) payload.year_built = parseInt(propDetails.year_built);
      if (propDetails.parking_spaces) payload.parking_spaces = parseInt(propDetails.parking_spaces);
      if (propDetails.stories) payload.stories = parseInt(propDetails.stories);
      if (propDetails.basement_type) payload.basement_type = propDetails.basement_type;
      if (propDetails.heating_type) payload.heating_type = propDetails.heating_type;
      if (propDetails.cooling_type) payload.cooling_type = propDetails.cooling_type;
      if (propDetails.roof_type) payload.roof_type = propDetails.roof_type;
      if (propDetails.exterior_type) payload.exterior_type = propDetails.exterior_type;
      if (propDetails.flooring.length > 0) payload.flooring = propDetails.flooring;
      if (propDetails.features.length > 0) payload.features = propDetails.features;

      const result = await createListing(payload as any);
      if (result && typeof result === "object" && "error" in result) {
        setError((result as { error: string }).error);
        setSubmitting(false);
        return;
      }

      const listing = (result as { listing: { id: string } }).listing;

      // Save FINTRAC identity if entered
      if (fintrac.full_name.trim()) {
        try {
          await createSellerIdentity({
            listing_id: listing.id,
            contact_id: sellerId,
            full_name: fintrac.full_name.trim(),
            dob: fintrac.dob || null,
            citizenship: fintrac.citizenship,
            id_type: fintrac.id_type,
            id_number: fintrac.id_number || null,
            id_expiry: fintrac.id_expiry || null,
            phone: fintrac.phone || null,
            email: fintrac.email || null,
            mailing_address: fintrac.mailing_address || null,
            occupation: fintrac.occupation || null,
            sort_order: 0,
          });
        } catch {
          // Don't block listing creation if FINTRAC save fails
        }
      }

      router.push(`/listings/${listing.id}`);
      router.refresh();
    } catch {
      setError("Failed to create listing. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-[#FAF8F4] via-white to-[#0F7694]/5 dark:from-zinc-950 dark:via-background dark:to-[#1a1535]/5">
      {/* Header */}
      <div className="border-b border-border/30 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/listings"
              className="p-2 -ml-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Building2 className="h-5 w-5 text-brand" />
                List a Property
              </h1>
              <p className="text-sm text-muted-foreground">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-initial">
              <button
                type="button"
                onClick={() => { if (s.id < step) setStep(s.id); }}
                disabled={s.id > step}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  s.id === step
                    ? "bg-brand/10 text-brand border border-brand/30"
                    : s.id < step
                      ? "text-success cursor-pointer hover:bg-success/5"
                      : "text-muted-foreground/40"
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  s.id < step
                    ? "bg-success/15 text-success"
                    : s.id === step
                      ? "bg-brand text-white"
                      : "bg-muted/30 text-muted-foreground/40"
                }`}>
                  {s.id < step ? <Check className="h-3.5 w-3.5" /> : s.id}
                </span>
                <span className="hidden md:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded-full ${s.id < step ? "bg-success/30" : "bg-muted/20"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-6 md:p-8">
          {/* Step 1: Property & Seller */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Property Address <span className="text-red-400">*</span></label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1234 Marine Drive, West Vancouver, BC V7T 1B5"
                  className="h-11 text-sm"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground/60 mt-1">Street, city, province, postal code</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Property Type</label>
                <PropertyTypeSelector value={propertyType} onChange={setPropertyType} />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Seller <span className="text-red-400">*</span></label>
                {loadingSellers ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                    Loading sellers...
                  </div>
                ) : sellers.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/50">
                    <p className="text-sm text-amber-700">No seller contacts found.</p>
                    <Link href="/contacts/new" className="text-sm text-brand hover:underline mt-1 inline-block">
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

              <div>
                <label className="text-sm font-medium mb-1.5 block">Lockbox Code <span className="text-red-400">*</span></label>
                <Input
                  value={lockboxCode}
                  onChange={(e) => setLockboxCode(e.target.value)}
                  placeholder="1234"
                  className="h-11 text-sm w-48"
                />
              </div>
            </div>
          )}

          {/* Step 2: Property Details */}
          {step === 2 && (
            <PropertyDetailsStep data={propDetails} onChange={handlePropDetailChange} />
          )}

          {/* Step 3: Pricing & Showing */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">List Price</label>
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
                <div>
                  <label className="text-sm font-medium mb-1.5 block">MLS Number</label>
                  <Input
                    value={mlsNumber}
                    onChange={(e) => setMlsNumber(e.target.value)}
                    placeholder="R2912345 (add later if not yet listed)"
                    className="h-11 text-sm"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Showing Window</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Start time</label>
                    <Input type="time" value={showingStart} onChange={(e) => setShowingStart(e.target.value)} className="h-10" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">End time</label>
                    <Input type="time" value={showingEnd} onChange={(e) => setShowingEnd(e.target.value)} className="h-10" />
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

          {/* Step 4: FINTRAC */}
          {step === 4 && (
            <FintracStep
              data={fintrac}
              sellerName={selectedSeller?.name || ""}
              onChange={handleFintracChange}
            />
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <ReviewStep
              address={address}
              propertyType={propertyType}
              sellerName={selectedSeller?.name || ""}
              lockboxCode={lockboxCode}
              listPrice={listPrice}
              mlsNumber={mlsNumber}
              showingStart={showingStart}
              showingEnd={showingEnd}
              notes={notes}
              bedrooms={propDetails.bedrooms}
              bathrooms={propDetails.bathrooms}
              totalSqft={propDetails.total_sqft}
              finishedSqft={propDetails.finished_sqft}
              lotSqft={propDetails.lot_sqft}
              yearBuilt={propDetails.year_built}
              parkingSpaces={propDetails.parking_spaces}
              stories={propDetails.stories}
              basementType={propDetails.basement_type}
              heatingType={propDetails.heating_type}
              coolingType={propDetails.cooling_type}
              roofType={propDetails.roof_type}
              exteriorType={propDetails.exterior_type}
              flooring={propDetails.flooring}
              features={propDetails.features}
              fintracName={fintrac.full_name}
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 4 && !fintrac.full_name.trim() && (
              <Button
                variant="ghost"
                onClick={() => setStep(5)}
                className="text-muted-foreground"
              >
                Skip for now
              </Button>
            )}

            {step < 5 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="gap-2 bg-brand hover:bg-brand/90"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || !step1Valid}
                className="gap-2 bg-brand hover:bg-brand/90 h-12 px-8 text-base font-semibold"
                size="lg"
              >
                {submitting ? "Creating..." : "Create Listing →"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
