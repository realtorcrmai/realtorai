"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Zap, FileText, Upload, Send, MapPin, DollarSign, Sparkles } from "lucide-react";
import { SellerIdentitiesPanel } from "@/components/listings/SellerIdentitiesPanel";
import { FormReadinessPanel } from "@/components/listings/FormReadinessPanel";
import { PhotoUploader } from "@/components/listings/PhotoUploader";
import { MLSRemarksPanel } from "@/components/listings/MLSRemarksPanel";
import { enrichListing } from "@/actions/enrichment";
import { updateListing } from "@/actions/listings";
import { toast } from "sonner";
import type { ListingDocument } from "@/types";

interface PhaseActionsProps {
  stepId: string;
  listingId: string;
  contactId: string;
  listing: Record<string, unknown>;
  seller?: { id: string; name: string; phone: string; email: string | null };
  documents: ListingDocument[];
  formStatuses: Record<string, "draft" | "completed">;
  sellerIdentities: unknown[];
  photos: { id: string; photo_url: string; role: string; caption: string | null; sort_order: number }[];
}

export function PhaseActions({
  stepId,
  listingId,
  contactId,
  listing,
  seller,
  documents,
  formStatuses,
  sellerIdentities,
  photos,
}: PhaseActionsProps) {
  const router = useRouter();
  const refresh = () => router.refresh();

  switch (stepId) {
    case "seller-intake":
      return <SellerIntakeAction listingId={listingId} sellerIdentities={sellerIdentities} />;
    case "data-enrichment":
      return <EnrichmentAction listingId={listingId} />;
    case "cma":
      return <CMAAction />;
    case "pricing-review":
      return <PricingAction listingId={listingId} listing={listing} onRefresh={refresh} />;
    case "form-generation":
      return (
        <div className="mt-3">
          <FormReadinessPanel
            listingId={listingId}
            documents={documents}
            listing={listing as any}
            seller={seller as any}
            formStatuses={formStatuses}
          />
        </div>
      );
    case "e-signature":
      return <ESignatureAction />;
    case "mls-prep":
      return (
        <MLSPrepAction
          listingId={listingId}
          photos={photos}
          publicRemarks={listing.mls_remarks as string | null}
          realtorRemarks={listing.mls_realtor_remarks as string | null}
          onRefresh={refresh}
        />
      );
    case "mls-submission":
      return <MLSSubmitAction listingId={listingId} mlsNumber={listing.mls_number as string | null} onRefresh={refresh} />;
    default:
      return null;
  }
}

// ── Phase 1: Seller Identity ─────────────────
function SellerIntakeAction({ listingId, sellerIdentities }: { listingId: string; sellerIdentities: unknown[] }) {
  if ((sellerIdentities ?? []).length > 0) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-success/10 border border-success/20 text-sm text-success flex items-center gap-2">
        <span>✅</span> Seller identity verified ({(sellerIdentities as unknown[]).length} record{(sellerIdentities as unknown[]).length !== 1 ? "s" : ""})
      </div>
    );
  }

  return (
    <div className="mt-3">
      <SellerIdentitiesPanel
        listingId={listingId}
        initialIdentities={sellerIdentities as never}
      />
    </div>
  );
}

// ── Phase 2: Data Enrichment ─────────────────
function EnrichmentAction({ listingId }: { listingId: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleEnrich() {
    setRunning(true);
    try {
      const res = await enrichListing(listingId);
      if (res && typeof res === "object" && "error" in res) {
        toast.error(String(res.error));
      } else {
        setResult("Data enrichment complete — geocoding applied");
        toast.success("Listing enriched with BC data");
        router.refresh();
      }
    } catch {
      toast.error("Enrichment failed");
    }
    setRunning(false);
  }

  return (
    <div className="mt-3 space-y-2">
      <Button size="sm" onClick={handleEnrich} disabled={running} className="gap-2">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        {running ? "Enriching..." : "Run Data Enrichment"}
      </Button>
      {result && <p className="text-xs text-success">{result}</p>}
      <p className="text-xs text-muted-foreground">Geocodes address via BC Geocoder. ParcelMap, LTSA, and BC Assessment coming soon.</p>
    </div>
  );
}

// ── Phase 3: CMA ─────────────────────────────
function CMAAction() {
  return (
    <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/30 text-sm text-muted-foreground">
      <p className="font-medium">Comparable Market Analysis</p>
      <p className="text-xs mt-1">Pull comparable sales data and generate a CMA report to present to the seller. Full CMA integration coming soon.</p>
    </div>
  );
}

// ── Phase 4: Pricing & Review ────────────────
function PricingAction({ listingId, listing, onRefresh }: { listingId: string; listing: Record<string, unknown>; onRefresh: () => void }) {
  const [price, setPrice] = useState(listing.list_price ? String(listing.list_price) : "");
  const [saving, setSaving] = useState(false);

  async function handleSavePrice() {
    if (!price) return;
    setSaving(true);
    await updateListing(listingId, { list_price: parseInt(price) });
    setSaving(false);
    toast.success("List price confirmed");
    onRefresh();
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirm List Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="899,000"
              className="pl-7 h-10 text-sm"
              inputMode="numeric"
            />
          </div>
        </div>
        <Button size="sm" onClick={handleSavePrice} disabled={saving || !price} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />}
          Confirm Price
        </Button>
      </div>
    </div>
  );
}

// ── Phase 6: E-Signature ─────────────────────
function ESignatureAction() {
  return (
    <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/30 text-sm text-muted-foreground">
      <p className="font-medium">E-Signature</p>
      <p className="text-xs mt-1">DocuSign integration for routing documents to seller and agent. Upload signed documents manually for now.</p>
    </div>
  );
}

// ── Phase 7: MLS Prep (Photos + Remarks) ─────
function MLSPrepAction({
  listingId,
  photos,
  publicRemarks,
  realtorRemarks,
  onRefresh,
}: {
  listingId: string;
  photos: { id: string; photo_url: string; role: string; caption: string | null; sort_order: number }[];
  publicRemarks: string | null;
  realtorRemarks: string | null;
  onRefresh: () => void;
}) {
  return (
    <div className="mt-3 space-y-5">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">📸 Listing Photos</p>
        <PhotoUploader listingId={listingId} photos={photos} onRefresh={onRefresh} />
      </div>
      <div className="border-t border-border/30 pt-4">
        <MLSRemarksPanel
          listingId={listingId}
          publicRemarks={publicRemarks}
          realtorRemarks={realtorRemarks}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}

// ── Phase 8: MLS Submit ──────────────────────
function MLSSubmitAction({
  listingId,
  mlsNumber,
  onRefresh,
}: {
  listingId: string;
  mlsNumber: string | null;
  onRefresh: () => void;
}) {
  const [mls, setMls] = useState(mlsNumber || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!mls.trim()) return;
    setSaving(true);
    await updateListing(listingId, { mls_number: mls.trim() });
    setSaving(false);
    toast.success("MLS number saved — listing marked as submitted");
    onRefresh();
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">MLS Number</label>
          <Input
            value={mls}
            onChange={(e) => setMls(e.target.value)}
            placeholder="R2912345"
            className="h-10 text-sm"
          />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving || !mls.trim()} className="gap-1.5 bg-brand hover:bg-brand/90">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Submit
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter the MLS number after submitting to the board. This completes the listing workflow.
      </p>
    </div>
  );
}
