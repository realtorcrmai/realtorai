"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Info, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PropertyTypeSelector } from "./PropertyTypeSelector";
import { createListing } from "@/actions/listings";
import {
  buildImportNotes,
  PARAGON_PROPERTY_TYPES,
  type ParagonParseResult,
} from "@/lib/paragon/parse";
import type { Contact } from "@/types";

const LOW_CONFIDENCE = 0.8;

interface ParagonReviewStepProps {
  parsed: ParagonParseResult;
  fileName: string;
  sellers: Contact[];
  loadingSellers: boolean;
  onBack: () => void;
  /** If provided, the realtor can re-parse the same PDF when they don't like the result.
   *  Omitted when storage upload failed and we have nothing to re-parse. */
  onRescan?: () => void;
  rescanning?: boolean;
  /** "PDF" (Listing Detail Report, AI parsed) or "CSV" (ML Default Spreadsheet, deterministic parse). */
  source?: "PDF" | "CSV";
  /** Soft warnings from the parser to surface to the realtor (missing columns, multi-row CSVs, etc). */
  warnings?: string[];
}

export function ParagonReviewStep({
  parsed,
  fileName,
  sellers,
  loadingSellers,
  onBack,
  onRescan,
  rescanning = false,
  source = "PDF",
  warnings = [],
}: ParagonReviewStepProps) {
  const router = useRouter();
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from parsed values
  const [address, setAddress] = useState(parsed.address.value ?? "");
  const [propertyType, setPropertyType] = useState<string>(
    parsed.property_type.value ?? ""
  );
  const [listPrice, setListPrice] = useState(
    parsed.list_price.value != null ? String(parsed.list_price.value) : ""
  );
  const [mlsNumber, setMlsNumber] = useState(parsed.mls_number.value ?? "");
  const [sellerId, setSellerId] = useState("");
  const [lockboxCode, setLockboxCode] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  const flags = useMemo(
    () => ({
      address: parsed.address.confidence < LOW_CONFIDENCE,
      mls_number: parsed.mls_number.confidence < LOW_CONFIDENCE,
      list_price: parsed.list_price.confidence < LOW_CONFIDENCE,
      property_type: parsed.property_type.confidence < LOW_CONFIDENCE,
    }),
    [parsed]
  );

  const lowConfFields = (
    Object.entries(flags) as [keyof typeof flags, boolean][]
  ).filter(([, v]) => v).length;

  const canSubmit =
    address.trim().length >= 5 && sellerId && lockboxCode.trim().length >= 1;

  function handleSubmit() {
    if (!canSubmit) return;
    setError(null);

    startSubmit(async () => {
      const notes = buildImportNotes(parsed, extraNotes, source);
      const priceNum = listPrice ? Number(listPrice) : undefined;

      const payload = {
        address: address.trim(),
        seller_id: sellerId,
        lockbox_code: lockboxCode.trim(),
        property_type: (propertyType || undefined) as
          | (typeof PARAGON_PROPERTY_TYPES)[number]
          | undefined,
        mls_number: mlsNumber.trim() || undefined,
        list_price:
          priceNum != null && Number.isFinite(priceNum) && priceNum > 0
            ? priceNum
            : undefined,
        notes,
      };

      const result = await createListing(payload as Parameters<typeof createListing>[0]);
      if (result && "error" in result) {
        setError((result as { error: string }).error);
        return;
      }

      router.push("/listings");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* AI banner */}
      <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-brand shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">We pre-filled the listing from {fileName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {source === "CSV"
              ? "CSV imports are exact but include fewer fields than the PDF. Review the highlights and add anything missing."
              : "Review every field — yellow highlights mean we weren't certain."}
            {lowConfFields > 0 && ` (${lowConfFields} field${lowConfFields > 1 ? "s" : ""} need a closer look.)`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onRescan && (
            <button
              type="button"
              onClick={onRescan}
              disabled={rescanning || submitting}
              aria-label="Re-parse the same PDF with different settings"
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/50"
            >
              {rescanning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {rescanning ? "Re-reading…" : "Try parsing again"}
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            disabled={rescanning || submitting}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {source === "CSV" ? "Replace CSV" : "Replace PDF"}
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div
          role="status"
          className="rounded-xl border border-amber-200/60 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/30 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1"
        >
          <p className="font-semibold">A few things to double-check:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Section 1: Property */}
      <Section number={1} label="Property" required>
        <FieldShell label="Full address" required flagged={flags.address}>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="1234 Marine Drive, West Vancouver, BC V7T 1B5"
            className="h-11 text-sm"
          />
        </FieldShell>

        <FieldShell label="Property type" flagged={flags.property_type}>
          <PropertyTypeSelector value={propertyType} onChange={setPropertyType} />
        </FieldShell>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldShell label="List price" flagged={flags.list_price}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="899000"
                className="h-11 text-sm pl-7"
                inputMode="numeric"
              />
            </div>
          </FieldShell>

          <FieldShell label="MLS number" flagged={flags.mls_number}>
            <Input
              value={mlsNumber}
              onChange={(e) => setMlsNumber(e.target.value)}
              placeholder="R2912345"
              className="h-11 text-sm"
            />
          </FieldShell>
        </div>
      </Section>

      {/* Section 2: Seller + lockbox (manual — not in PDF) */}
      <Section number={2} label="Assign seller & lockbox" required>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldShell label="Seller" required>
            {loadingSellers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sellers...
              </div>
            ) : sellers.length === 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                No seller contacts. Add one first.
              </p>
            ) : (
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">Select a seller...</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.phone}
                  </option>
                ))}
              </select>
            )}
          </FieldShell>

          <FieldShell label="Lockbox code" required>
            <Input
              value={lockboxCode}
              onChange={(e) => setLockboxCode(e.target.value)}
              placeholder="1234"
              className="h-11 text-sm"
            />
          </FieldShell>
        </div>
      </Section>

      {/* Section 3: Imported details preview (read-only summary) */}
      <Section number={3} label="Imported details" optional>
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2 text-sm">
          <ImportedFact
            label="Bedrooms"
            value={parsed.bedrooms.value}
            confidence={parsed.bedrooms.confidence}
          />
          <ImportedFact
            label="Bathrooms"
            value={parsed.bathrooms.value}
            confidence={parsed.bathrooms.confidence}
          />
          <ImportedFact
            label="Floor area"
            value={parsed.sqft.value != null ? `${parsed.sqft.value.toLocaleString()} sqft` : null}
            confidence={parsed.sqft.confidence}
          />
          <ImportedFact
            label="Year built"
            value={parsed.year_built.value}
            confidence={parsed.year_built.confidence}
          />
          <ImportedFact
            label="Lot size"
            value={parsed.lot_size.value}
            confidence={parsed.lot_size.confidence}
          />
          <ImportedFact
            label="Annual taxes"
            value={parsed.taxes_annual.value != null ? `$${parsed.taxes_annual.value.toLocaleString()}` : null}
            confidence={parsed.taxes_annual.confidence}
          />
          {parsed.description.value && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/70 mb-1">
                MLS Description
              </p>
              <p className="text-xs text-muted-foreground line-clamp-4">
                {parsed.description.value}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground/70 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          These are saved into the listing notes. They&apos;ll move into structured fields in a future update.
        </p>
      </Section>

      {/* Section 4: Optional extra notes */}
      <Section number={4} label="Anything else to add?" optional>
        <Textarea
          value={extraNotes}
          onChange={(e) => setExtraNotes(e.target.value)}
          placeholder="Special instructions, alarm codes, pet info..."
          rows={3}
          className="text-sm resize-none"
        />
      </Section>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full h-12 text-base font-semibold bg-brand shadow-lg rounded-xl gap-2"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Creating listing...
          </>
        ) : canSubmit ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Create listing
            <ArrowRight className="h-5 w-5" />
          </>
        ) : (
          "Fill required fields *"
        )}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function Section({
  number,
  label,
  required,
  optional,
  children,
}: {
  number: number;
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white text-xs font-bold shadow-sm">
          {number}
        </div>
        <h2 className="text-sm font-semibold">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </h2>
        {optional && (
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            optional
          </span>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FieldShell({
  label,
  required,
  flagged,
  children,
}: {
  label: string;
  required?: boolean;
  flagged?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={flagged ? "rounded-lg ring-2 ring-amber-300/60 ring-offset-2 ring-offset-background" : ""}>
      <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
        <span>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </span>
        {flagged && (
          <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
            verify
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function ImportedFact({
  label,
  value,
  confidence,
}: {
  label: string;
  value: string | number | null;
  confidence: number;
}) {
  if (value == null || value === "") return null;
  const low = confidence < LOW_CONFIDENCE;
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${low ? "text-amber-700 dark:text-amber-400" : ""}`}>
        {value}
        {low && <span className="ml-1.5 text-[10px] text-amber-600">(verify)</span>}
      </span>
    </div>
  );
}
