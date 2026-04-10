"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPortfolioItem, updatePortfolioItem } from "@/actions/contact-portfolio";
import type { PortfolioItem, PropertyCategory, PortfolioStatus } from "@/actions/contact-portfolio";
import { AddressAutocompleteInput } from "@/components/shared/AddressAutocompleteInput";
import type { AddressSuggestion } from "@/components/shared/AddressAutocompleteInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ── Types ────────────────────────────────────────────────────

type CoOwner = {
  name: string;
  role: "individual" | "partner" | "spouse" | "trust" | "corporation";
  ownership_pct: number;
  contact_id?: string;
};

const CATEGORY_OPTIONS: {
  value: PropertyCategory;
  label: string;
  emoji: string;
  desc: string;
  gradient: string;
  bg: string;
  ring: string;
  border: string;
}[] = [
  {
    value: "primary_residence",
    label: "Primary",
    emoji: "🏠",
    desc: "Where they live",
    gradient: "from-blue-500 to-[#0F7694]",
    bg: "from-[#0F7694]/5 to-[#0F7694]/10 dark:from-[#1a1535]/20 dark:to-[#1a1535]/30",
    ring: "ring-blue-400",
    border: "border-brand/20 dark:border-blue-800",
  },
  {
    value: "investment",
    label: "Investment",
    emoji: "💼",
    desc: "Rental / income",
    gradient: "from-emerald-500 to-teal-600",
    bg: "from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20",
    ring: "ring-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  {
    value: "vacation",
    label: "Vacation",
    emoji: "🏖️",
    desc: "Cottage, cabin",
    gradient: "from-sky-500 to-blue-600",
    bg: "from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20",
    ring: "ring-sky-400",
    border: "border-sky-200 dark:border-sky-800",
  },
  {
    value: "commercial",
    label: "Commercial",
    emoji: "🏢",
    desc: "Office, retail",
    gradient: "from-amber-500 to-orange-600",
    bg: "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
    ring: "ring-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    value: "other",
    label: "Other",
    emoji: "🏗️",
    desc: "Land, mixed-use",
    gradient: "from-gray-500 to-slate-600",
    bg: "from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20",
    ring: "ring-gray-400",
    border: "border-gray-200 dark:border-gray-800",
  },
];

const STATUS_OPTIONS: { value: PortfolioStatus; label: string; emoji: string }[] = [
  { value: "owned",       label: "Currently Owned",        emoji: "🏡" },
  { value: "selling",     label: "For Sale / Active",      emoji: "🪧" },
  { value: "sold",        label: "Sold / Transferred",     emoji: "✅" },
  { value: "refinancing", label: "Refinancing",            emoji: "🔄" },
  { value: "transferred", label: "Gifted / Transferred",   emoji: "🎁" },
];

const CO_OWNER_ROLES: { value: CoOwner["role"]; label: string }[] = [
  { value: "individual",  label: "Individual (joint tenancy)" },
  { value: "spouse",      label: "Spouse / Common-law" },
  { value: "partner",     label: "Business Partner" },
  { value: "trust",       label: "Trust / Estate" },
  { value: "corporation", label: "Corporation / Ltd." },
];

const PROPERTY_TYPES = [
  "Detached", "Semi-Detached", "Townhouse", "Condo/Apartment",
  "Duplex", "Triplex", "Fourplex", "Multi-Family",
  "Commercial", "Industrial", "Land/Lot", "Mixed-Use", "Other",
];

// ── Sub-components ─────────────────────────────────────────

function SectionLabel({
  number,
  label,
  optional,
}: {
  number: number;
  label: string;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0F7694] to-[#0F7694] flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
        {number}
      </div>
      <h2 className="text-sm font-semibold">{label}</h2>
      {optional && (
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
          optional
        </span>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────

interface PortfolioFormProps {
  contactId: string;
  contactName: string;
  existing?: PortfolioItem;
}

export function PortfolioForm({ contactId, contactName, existing }: PortfolioFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Address fields ────────────────────────────────────────
  const [address, setAddress]       = useState(existing?.address ?? "");
  const [unitNumber, setUnitNumber] = useState(existing?.unit_number ?? "");
  const [city, setCity]             = useState(existing?.city ?? "");
  const [province, setProvince]     = useState(existing?.province ?? "BC");
  const [postalCode, setPostalCode] = useState(existing?.postal_code ?? "");

  // ── Property details ──────────────────────────────────────
  const [category, setCategory]         = useState<PropertyCategory>(existing?.property_category ?? "primary_residence");
  const [propertyType, setPropertyType] = useState(existing?.property_type ?? "");
  const [status, setStatus]             = useState<PortfolioStatus>(existing?.status ?? "owned");

  // ── Ownership ─────────────────────────────────────────────
  const [ownershipPct, setOwnershipPct] = useState(String(existing?.ownership_pct ?? 100));
  const [coOwners, setCoOwners]         = useState<CoOwner[]>(
    (existing?.co_owners as CoOwner[] | null) ?? []
  );
  const [addingCoOwner, setAddingCoOwner] = useState(false);
  const [newCoOwner, setNewCoOwner]       = useState<CoOwner>({
    name: "", role: "individual", ownership_pct: 50,
  });

  // ── Financials ────────────────────────────────────────────
  const [purchasePrice, setPurchasePrice]     = useState(existing?.purchase_price ? String(existing.purchase_price) : "");
  const [purchaseDate, setPurchaseDate]       = useState(existing?.purchase_date ?? "");
  const [estimatedValue, setEstimatedValue]   = useState(existing?.estimated_value ? String(existing.estimated_value) : "");
  const [bcAssessed, setBcAssessed]           = useState(existing?.bc_assessed_value ? String(existing.bc_assessed_value) : "");
  const [mortgageBalance, setMortgageBalance] = useState(existing?.mortgage_balance ? String(existing.mortgage_balance) : "");
  const [rentalIncome, setRentalIncome]       = useState(existing?.monthly_rental_income ? String(existing.monthly_rental_income) : "");
  const [strataFee, setStrataFee]             = useState(existing?.strata_fee ? String(existing.strata_fee) : "");
  const [notes, setNotes]                     = useState(existing?.notes ?? "");

  function handleAddressSuggestion(s: AddressSuggestion) {
    setAddress(s.fullAddress);
    if (s.city)       setCity(s.city);
    if (s.province)   setProvince(s.province);
    if (s.postalCode) setPostalCode(s.postalCode);
  }

  function addCoOwner() {
    if (!newCoOwner.name) return;
    setCoOwners((prev) => [...prev, { ...newCoOwner }]);
    setNewCoOwner({ name: "", role: "individual", ownership_pct: 50 });
    setAddingCoOwner(false);
  }

  function removeCoOwner(idx: number) {
    setCoOwners((prev) => prev.filter((_, i) => i !== idx));
  }

  const coOwnerTotal  = coOwners.reduce((s, o) => s + o.ownership_pct, 0);
  const myOwnership   = Math.max(0, Math.min(100, Number(ownershipPct) || 100));
  const totalOwnership = myOwnership + coOwnerTotal;

  const equity = estimatedValue && mortgageBalance
    ? Number(estimatedValue) - Number(mortgageBalance)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) { setError("Please enter the property address."); return; }
    setSaving(true);
    setError(null);

    const payload = {
      contact_id: contactId,
      address: address.trim(),
      unit_number: unitNumber || null,
      city: city || null,
      province: province || "BC",
      postal_code: postalCode || null,
      property_type: propertyType || null,
      property_category: category,
      ownership_pct: myOwnership,
      co_owners: coOwners as Record<string, unknown>[],
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
      purchase_date: purchaseDate || null,
      estimated_value: estimatedValue ? Number(estimatedValue) : null,
      bc_assessed_value: bcAssessed ? Number(bcAssessed) : null,
      mortgage_balance: mortgageBalance ? Number(mortgageBalance) : null,
      monthly_rental_income: rentalIncome ? Number(rentalIncome) : null,
      strata_fee: strataFee ? Number(strataFee) : null,
      status,
      notes: notes || null,
    };

    const result = existing
      ? await updatePortfolioItem(existing.id, payload)
      : await addPortfolioItem(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push(`/contacts/${contactId}?tab=portfolio`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── 1. Property Type ─────────────────────────────────── */}
      <div className="space-y-4">
        <SectionLabel number={1} label="What type of property?" />
        <div className="grid grid-cols-5 gap-2.5">
          {CATEGORY_OPTIONS.map((opt) => {
            const selected = category === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`
                  relative p-3.5 rounded-xl border-2 text-center transition-all duration-200
                  ${selected
                    ? `bg-gradient-to-br ${opt.bg} ${opt.border} ring-2 ${opt.ring} ring-offset-1 shadow-md scale-[1.02]`
                    : "border-border/30 hover:border-border hover:shadow-sm hover:-translate-y-0.5 bg-white/50 dark:bg-white/5"
                  }
                `}
              >
                <div className={`
                  w-11 h-11 rounded-xl mx-auto mb-2 flex items-center justify-center text-xl
                  ${selected
                    ? `bg-gradient-to-br ${opt.gradient} shadow-lg`
                    : "bg-muted/30"
                  }
                  transition-all duration-200
                `}>
                  <span className={selected ? "drop-shadow-sm" : ""}>{opt.emoji}</span>
                </div>
                <p className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                  {opt.label}
                </p>
                <p className={`text-xs mt-0.5 ${selected ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Property Address ──────────────────────────────── */}
      <div className="space-y-4">
        <SectionLabel number={2} label="Where is the property?" />
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Street Address <span className="text-red-400">*</span>
            </label>
            <AddressAutocompleteInput
              value={address}
              onChange={setAddress}
              onSelect={handleAddressSuggestion}
              placeholder="Start typing to search BC addresses…"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Unit / Suite</label>
              <Input
                className="h-11"
                placeholder="e.g. 204"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">City</label>
              <Input
                className="h-11"
                placeholder="Vancouver"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Province</label>
              <select
                className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                disabled={saving}
              >
                {["BC","AB","SK","MB","ON","QC","NB","NS","PE","NL","YT","NT","NU"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Postal Code</label>
              <Input
                className="h-11 uppercase"
                placeholder="V5K 0A1"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Property Sub-type
              <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
            </label>
            <select
              className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              disabled={saving}
            >
              <option value="">Select…</option>
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── 3. Ownership ────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionLabel number={3} label="Who owns it?" />
        <div className="space-y-3">
          {/* Primary owner */}
          <div className="flex items-center gap-3 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-[#4f35d2] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {contactName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{contactName}</p>
              <p className="text-xs text-muted-foreground">Primary owner</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                max={100}
                className="h-9 w-20 text-right"
                value={ownershipPct}
                onChange={(e) => setOwnershipPct(e.target.value)}
                disabled={saving}
              />
              <span className="text-sm text-muted-foreground font-medium">%</span>
            </div>
          </div>

          {/* Co-owners */}
          {coOwners.map((co, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {co.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{co.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{co.role.replace("_", " ")}</p>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">{co.ownership_pct}%</span>
              <button
                type="button"
                onClick={() => removeCoOwner(idx)}
                className="text-xs text-red-400 hover:text-red-600 font-bold ml-1 w-5 h-5 rounded-full hover:bg-red-50 flex items-center justify-center"
                disabled={saving}
              >
                ✕
              </button>
            </div>
          ))}

          {totalOwnership !== 100 && (coOwners.length > 0 || myOwnership !== 100) && (
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
              <span>⚠️</span>
              Total ownership: {totalOwnership}% — should equal 100%
            </p>
          )}

          {addingCoOwner ? (
            <div className="p-4 border border-indigo-200 dark:border-indigo-800 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 space-y-3">
              <p className="text-sm font-semibold">Add Co-Owner / Partner</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Name</label>
                  <Input
                    className="h-10"
                    placeholder="Full name"
                    value={newCoOwner.name}
                    onChange={(e) => setNewCoOwner((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Role</label>
                  <select
                    className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                    value={newCoOwner.role}
                    onChange={(e) => setNewCoOwner((d) => ({ ...d, role: e.target.value as CoOwner["role"] }))}
                  >
                    {CO_OWNER_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Ownership %</label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  className="h-10 w-24"
                  value={newCoOwner.ownership_pct}
                  onChange={(e) => setNewCoOwner((d) => ({ ...d, ownership_pct: Number(e.target.value) }))}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={addCoOwner}>Add</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setAddingCoOwner(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingCoOwner(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              disabled={saving}
            >
              + Add Co-Owner / Partner
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Current Status ──────────────────────────────── */}
      <div className="space-y-4">
        <SectionLabel number={4} label="Current status?" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {STATUS_OPTIONS.map((opt) => {
            const selected = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`
                  flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 text-left transition-all duration-200
                  ${selected
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 ring-1 ring-indigo-300 shadow-sm"
                    : "border-border/30 hover:border-border hover:shadow-sm bg-white/50 dark:bg-white/5"
                  }
                `}
              >
                <span className="text-base">{opt.emoji}</span>
                <span className={`text-xs font-medium ${selected ? "text-indigo-700 dark:text-indigo-300" : "text-muted-foreground"}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5. Financials ─────────────────────────────────── */}
      <div className="space-y-4">
        <SectionLabel number={5} label="Financial details" optional />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Purchase Price ($)</label>
            <Input
              type="number"
              className="h-11"
              placeholder="e.g. 950000"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Purchase Date</label>
            <Input
              type="date"
              className="h-11"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Estimated Market Value ($)</label>
            <Input
              type="number"
              className="h-11"
              placeholder="e.g. 1100000"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">BC Assessed Value ($)</label>
            <Input
              type="number"
              className="h-11"
              placeholder="e.g. 1020000"
              value={bcAssessed}
              onChange={(e) => setBcAssessed(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Mortgage Balance ($)</label>
            <Input
              type="number"
              className="h-11"
              placeholder="e.g. 550000"
              value={mortgageBalance}
              onChange={(e) => setMortgageBalance(e.target.value)}
              disabled={saving}
            />
          </div>
          {category === "investment" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Monthly Rental Income ($)</label>
              <Input
                type="number"
                className="h-11"
                placeholder="e.g. 2800"
                value={rentalIncome}
                onChange={(e) => setRentalIncome(e.target.value)}
                disabled={saving}
              />
            </div>
          )}
          {(category === "primary_residence" || category === "vacation") && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Monthly Strata Fee ($)</label>
              <Input
                type="number"
                className="h-11"
                placeholder="e.g. 450"
                value={strataFee}
                onChange={(e) => setStrataFee(e.target.value)}
                disabled={saving}
              />
            </div>
          )}
        </div>

        {/* Live equity card */}
        {equity !== null && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              💰 Estimated Equity: ${equity.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {Math.round((equity / Number(estimatedValue)) * 100)}% equity ratio
            </p>
          </div>
        )}
      </div>

      {/* ── Notes ──────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-sm font-medium block">
          Notes
          <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
        </label>
        <textarea
          className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
          placeholder="Any additional context about this property…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={saving}
        />
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Submit ─────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2 pb-4">
        <Button
          type="submit"
          disabled={saving || !address}
          className="bg-primary hover:bg-[#3d27a8] text-white px-6 h-11"
        >
          {saving ? "Saving…" : existing ? "Save Changes →" : "Add to Portfolio →"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => router.push(`/contacts/${contactId}?tab=portfolio`)}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
