"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPortfolioItem, updatePortfolioItem } from "@/actions/contact-portfolio";
import type { PortfolioItem, PropertyCategory, PortfolioStatus } from "@/actions/contact-portfolio";
import { AddressAutocompleteInput } from "@/components/shared/AddressAutocompleteInput";
import type { AddressSuggestion } from "@/components/shared/AddressAutocompleteInput";

// ── Types ────────────────────────────────────────────────────

type CoOwner = {
  name: string;
  role: "individual" | "partner" | "spouse" | "trust" | "corporation";
  ownership_pct: number;
  contact_id?: string;
};

const CATEGORY_OPTIONS: { value: PropertyCategory; label: string; emoji: string; desc: string }[] = [
  { value: "primary_residence", label: "Primary Residence", emoji: "🏠", desc: "Where the contact lives" },
  { value: "investment",        label: "Investment Property", emoji: "💼", desc: "Rental or income property" },
  { value: "vacation",          label: "Vacation / Recreational", emoji: "🏖️", desc: "Cottage, cabin, vacation home" },
  { value: "commercial",        label: "Commercial", emoji: "🏢", desc: "Office, retail, industrial" },
  { value: "other",             label: "Other", emoji: "🏗️", desc: "Land, mixed-use, other" },
];

const STATUS_OPTIONS: { value: PortfolioStatus; label: string }[] = [
  { value: "owned",       label: "Currently Owned" },
  { value: "selling",     label: "For Sale / Listing Active" },
  { value: "sold",        label: "Sold / Transferred" },
  { value: "refinancing", label: "Refinancing" },
  { value: "transferred", label: "Gifted / Transferred" },
];

const CO_OWNER_ROLES: { value: CoOwner["role"]; label: string }[] = [
  { value: "individual",   label: "Individual (joint tenancy)" },
  { value: "spouse",       label: "Spouse / Common-law" },
  { value: "partner",      label: "Business Partner" },
  { value: "trust",        label: "Trust / Estate" },
  { value: "corporation",  label: "Corporation / Ltd." },
];

const PROPERTY_TYPES = [
  "Detached", "Semi-Detached", "Townhouse", "Condo/Apartment",
  "Duplex", "Triplex", "Fourplex", "Multi-Family",
  "Commercial", "Industrial", "Land/Lot", "Mixed-Use", "Other",
];

// ── Component ─────────────────────────────────────────────────

interface PortfolioFormProps {
  contactId: string;
  contactName: string;
  existing?: PortfolioItem; // when editing
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
  const [category, setCategory]       = useState<PropertyCategory>(existing?.property_category ?? "primary_residence");
  const [propertyType, setPropertyType] = useState(existing?.property_type ?? "");
  const [status, setStatus]           = useState<PortfolioStatus>(existing?.status ?? "owned");

  // ── Ownership ─────────────────────────────────────────────
  const [ownershipPct, setOwnershipPct] = useState(String(existing?.ownership_pct ?? 100));
  const [coOwners, setCoOwners]         = useState<CoOwner[]>(
    (existing?.co_owners as CoOwner[] | null) ?? []
  );
  const [addingCoOwner, setAddingCoOwner] = useState(false);
  const [newCoOwner, setNewCoOwner] = useState<CoOwner>({
    name: "", role: "individual", ownership_pct: 50,
  });

  // ── Financials ────────────────────────────────────────────
  const [purchasePrice, setPurchasePrice]       = useState(existing?.purchase_price ? String(existing.purchase_price) : "");
  const [purchaseDate, setPurchaseDate]         = useState(existing?.purchase_date ?? "");
  const [estimatedValue, setEstimatedValue]     = useState(existing?.estimated_value ? String(existing.estimated_value) : "");
  const [bcAssessed, setBcAssessed]             = useState(existing?.bc_assessed_value ? String(existing.bc_assessed_value) : "");
  const [mortgageBalance, setMortgageBalance]   = useState(existing?.mortgage_balance ? String(existing.mortgage_balance) : "");
  const [rentalIncome, setRentalIncome]         = useState(existing?.monthly_rental_income ? String(existing.monthly_rental_income) : "");
  const [strataFee, setStrataFee]               = useState(existing?.strata_fee ? String(existing.strata_fee) : "");
  const [notes, setNotes]                       = useState(existing?.notes ?? "");

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

  // Compute remaining ownership % for display
  const coOwnerTotal = coOwners.reduce((s, o) => s + o.ownership_pct, 0);
  const myOwnership = Math.max(0, Math.min(100, Number(ownershipPct) || 100));
  const totalOwnership = myOwnership + coOwnerTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) { setError("Address is required."); return; }
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

      {/* ── Category picker ─────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Property Type
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCategory(opt.value)}
              className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all ${
                category === opt.value
                  ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-400"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <span className="text-xl shrink-0">{opt.emoji}</span>
              <div>
                <p className="text-xs font-semibold">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Address ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Property Address
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Street Address <span className="text-red-500">*</span>
            </label>
            <AddressAutocompleteInput
              value={address}
              onChange={setAddress}
              onSelect={handleAddressSuggestion}
              placeholder="Start typing to search…"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Unit / Suite</label>
              <input
                className="lf-input w-full"
                placeholder="e.g. 204"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">City</label>
              <input
                className="lf-input w-full"
                placeholder="Vancouver"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Province</label>
              <select
                className="lf-select w-full"
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
              <label className="text-xs font-medium text-muted-foreground block mb-1">Postal Code</label>
              <input
                className="lf-input w-full"
                placeholder="V5K 0A1"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Property Sub-type</label>
            <select
              className="lf-select w-full"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              disabled={saving}
            >
              <option value="">Select…</option>
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* ── Ownership ────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ownership
        </h2>
        <div className="space-y-3">
          {/* Contact's own ownership */}
          <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {contactName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{contactName}</p>
              <p className="text-xs text-muted-foreground">Primary owner</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={100}
                className="lf-input w-20 text-right"
                value={ownershipPct}
                onChange={(e) => setOwnershipPct(e.target.value)}
                disabled={saving}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Co-owners list */}
          {coOwners.map((co, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
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
                className="text-xs text-red-500 hover:text-red-700 font-medium ml-1"
                disabled={saving}
              >
                ✕
              </button>
            </div>
          ))}

          {/* Ownership total warning */}
          {totalOwnership !== 100 && (coOwners.length > 0 || myOwnership !== 100) && (
            <p className="text-xs text-amber-600 font-medium">
              ⚠️ Total ownership: {totalOwnership}% (should equal 100%)
            </p>
          )}

          {/* Add co-owner form */}
          {addingCoOwner ? (
            <div className="p-3 border border-indigo-200 rounded-xl bg-indigo-50/30 space-y-3">
              <h4 className="text-xs font-semibold">Add Co-Owner</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Name</label>
                  <input
                    className="lf-input w-full"
                    placeholder="Full name"
                    value={newCoOwner.name}
                    onChange={(e) => setNewCoOwner((d) => ({ ...d, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Role</label>
                  <select
                    className="lf-select w-full"
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
                <label className="text-xs text-muted-foreground">Ownership %</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  className="lf-input w-24"
                  value={newCoOwner.ownership_pct}
                  onChange={(e) => setNewCoOwner((d) => ({ ...d, ownership_pct: Number(e.target.value) }))}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={addCoOwner} className="lf-btn-sm">
                  Add
                </button>
                <button type="button" onClick={() => setAddingCoOwner(false)} className="lf-btn-ghost lf-btn-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingCoOwner(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              disabled={saving}
            >
              + Add Co-Owner / Partner
            </button>
          )}
        </div>
      </section>

      {/* ── Status ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === opt.value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Financials ────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Financials (optional)
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Purchase Price ($)</label>
            <input
              type="number"
              className="lf-input w-full"
              placeholder="e.g. 950000"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Purchase Date</label>
            <input
              type="date"
              className="lf-input w-full"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Estimated Market Value ($)</label>
            <input
              type="number"
              className="lf-input w-full"
              placeholder="e.g. 1100000"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">BC Assessed Value ($)</label>
            <input
              type="number"
              className="lf-input w-full"
              placeholder="e.g. 1020000"
              value={bcAssessed}
              onChange={(e) => setBcAssessed(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Mortgage Balance ($)</label>
            <input
              type="number"
              className="lf-input w-full"
              placeholder="e.g. 550000"
              value={mortgageBalance}
              onChange={(e) => setMortgageBalance(e.target.value)}
              disabled={saving}
            />
          </div>
          {category === "investment" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Monthly Rental Income ($)</label>
              <input
                type="number"
                className="lf-input w-full"
                placeholder="e.g. 2800"
                value={rentalIncome}
                onChange={(e) => setRentalIncome(e.target.value)}
                disabled={saving}
              />
            </div>
          )}
          {(category === "primary_residence" || category === "vacation") && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Monthly Strata Fee ($)</label>
              <input
                type="number"
                className="lf-input w-full"
                placeholder="e.g. 450"
                value={strataFee}
                onChange={(e) => setStrataFee(e.target.value)}
                disabled={saving}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Equity summary ─────────────────────────────────── */}
      {estimatedValue && mortgageBalance && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
          <p className="font-semibold text-emerald-800">
            💰 Estimated Equity: ${(Number(estimatedValue) - Number(mortgageBalance)).toLocaleString()}
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            {Math.round(((Number(estimatedValue) - Number(mortgageBalance)) / Number(estimatedValue)) * 100)}% LTV ratio
          </p>
        </div>
      )}

      {/* ── Notes ──────────────────────────────────────────── */}
      <section>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
        <textarea
          className="lf-textarea w-full"
          rows={3}
          placeholder="Any additional context about this property…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={saving}
        />
      </section>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="lf-btn">
          {saving ? "Saving…" : existing ? "Save Changes" : "Add Property"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/contacts/${contactId}`)}
          className="lf-btn-ghost"
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
