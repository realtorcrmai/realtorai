"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addPortfolioItem, updatePortfolioItem, createContactFromCoOwner } from "@/actions/contact-portfolio";
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
  // For new contacts to be created on submit
  isNew?: boolean;
  newPhone?: string;
  newEmail?: string;
};

type ContactSuggestion = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
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

// ── Formatters ──────────────────────────────────────────────

/** Format Canadian postal code: "v5k0a1" → "V5K 0A1" */
function formatPostalCode(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleaned.length <= 3) return cleaned;
  return cleaned.slice(0, 3) + " " + cleaned.slice(3, 6);
}

/** Format phone: strip non-digits, add +1 prefix and grouping: +1 (604) 555-0100 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  // If starts with 1 and has 11 digits, or 10 digits without leading 1
  const national = digits.startsWith("1") && digits.length >= 11
    ? digits.slice(1, 11)
    : digits.slice(0, 10);
  if (national.length <= 3) return national;
  if (national.length <= 6) return `(${national.slice(0, 3)}) ${national.slice(3)}`;
  return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 10)}`;
}

/** Format currency input: "950000" → "950,000" (display only, strips commas for storage) */
function formatCurrency(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-CA");
}

/** Strip formatting to get raw number string */
function unformatCurrency(formatted: string): string {
  return formatted.replace(/[^0-9]/g, "");
}

// ── Sub-components ─────────────────────────────────────────

/** Debounce helper */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Contact search input with a fixed-position dropdown (avoids overflow:hidden clipping).
 * Emits either an existing contact (onSelect) or a new-contact intent (onCreateNew).
 */
function ContactSearchInput({
  value,
  onChange,
  onSelect,
  onCreateNew,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (c: ContactSuggestion) => void;
  onCreateNew: (name: string) => void;
  disabled?: boolean;
}) {
  const [results, setResults] = useState<ContactSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const debouncedQ = useDebounce(value, 250);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedQ.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    fetch(`/api/contacts?search=${encodeURIComponent(debouncedQ)}&limit=6`)
      .then((r) => r.json())
      .then((d) => {
        setResults(Array.isArray(d) ? d : (d.contacts ?? []));
        setOpen(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function updateDropdownPosition() {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setDropdownRect({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        ref={inputRef}
        className="h-10"
        placeholder="Search by name…"
        value={value}
        onChange={(e) => { onChange(e.target.value); updateDropdownPosition(); }}
        onFocus={() => { updateDropdownPosition(); if (results.length || value.length >= 2) setOpen(true); }}
        disabled={disabled}
        autoComplete="off"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          searching…
        </span>
      )}
      {open && value.length >= 2 && dropdownRect && (
        <div
          className="fixed z-[9999] bg-white dark:bg-gray-900 border border-border rounded-xl shadow-xl overflow-hidden"
          style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }}
        >
          {results.length > 0 ? (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-left transition-colors"
                onMouseDown={(e) => { e.preventDefault(); onSelect(c); setOpen(false); onChange(c.name); }}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-[#4f35d2] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2.5 text-sm text-muted-foreground">No contact found</div>
          )}
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-indigo-600 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border-t border-border transition-colors"
            onMouseDown={(e) => { e.preventDefault(); onCreateNew(value); setOpen(false); }}
          >
            <span className="text-base">➕</span>
            Create &ldquo;{value}&rdquo; as new contact
          </button>
        </div>
      )}
    </div>
  );
}

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
      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm shrink-0">
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
  // Track whether the new co-owner was picked from contacts or will be created
  const [newCoOwnerIsNew, setNewCoOwnerIsNew] = useState(false);
  const [newCoOwnerPhone, setNewCoOwnerPhone] = useState("");
  const [newCoOwnerEmail, setNewCoOwnerEmail] = useState("");

  // ── Financials ────────────────────────────────────────────
  const [purchasePrice, setPurchasePrice]     = useState(existing?.purchase_price ? formatCurrency(String(existing.purchase_price)) : "");
  const [purchaseDate, setPurchaseDate]       = useState(existing?.purchase_date ?? "");
  const [estimatedValue, setEstimatedValue]   = useState(existing?.estimated_value ? formatCurrency(String(existing.estimated_value)) : "");
  const [bcAssessed, setBcAssessed]           = useState(existing?.bc_assessed_value ? formatCurrency(String(existing.bc_assessed_value)) : "");
  const [mortgageBalance, setMortgageBalance] = useState(existing?.mortgage_balance ? formatCurrency(String(existing.mortgage_balance)) : "");
  const [rentalIncome, setRentalIncome]       = useState(existing?.monthly_rental_income ? formatCurrency(String(existing.monthly_rental_income)) : "");
  const [strataFee, setStrataFee]             = useState(existing?.strata_fee ? formatCurrency(String(existing.strata_fee)) : "");
  const [notes, setNotes]                     = useState(existing?.notes ?? "");

  function handleAddressSuggestion(s: AddressSuggestion) {
    // Always update all fields unconditionally so stale values from a previous
    // selection get cleared when the user picks a different address.
    setAddress(s.streetAddress || s.fullAddress);
    setCity(s.city);
    setProvince(s.province || "BC");
    setPostalCode(s.postalCode ? formatPostalCode(s.postalCode) : "");
  }

  const coOwnerTotal = coOwners.reduce((s, o) => s + o.ownership_pct, 0);
  const myOwnership  = Math.max(0, Math.min(100, Number(ownershipPct) || 100));
  const totalOwnership = myOwnership + coOwnerTotal;

  // How much % is still unallocated (used to suggest new co-owner's %)
  const remainingForNew = Math.max(0, 100 - coOwnerTotal - myOwnership);
  // Preview: what primary owner will become after the new co-owner is added
  const primaryAfterAdd = Math.max(0, 100 - coOwnerTotal - newCoOwner.ownership_pct);

  // Max % a new co-owner can take (all of contact's current share minus 1%)
  const maxNewCoOwnerPct = Math.max(1, 100 - coOwnerTotal - 1);

  function handleNewCoOwnerPctChange(rawPct: number) {
    // Clamp to valid range: 1% to maxNewCoOwnerPct
    const pct = Math.max(1, Math.min(rawPct, maxNewCoOwnerPct));
    setNewCoOwner((d) => ({ ...d, ownership_pct: pct }));
    // Live-update contact's ownership as user types
    setOwnershipPct(String(Math.max(1, 100 - coOwnerTotal - pct)));
  }

  function addCoOwner() {
    if (!newCoOwner.name) return;
    // If no existing contact was selected from search, treat as new contact to create
    const shouldCreateNew = newCoOwnerIsNew || !newCoOwner.contact_id;
    const entry: CoOwner = {
      ...newCoOwner,
      isNew: shouldCreateNew || undefined,
      newPhone: shouldCreateNew ? newCoOwnerPhone : undefined,
      newEmail: shouldCreateNew ? newCoOwnerEmail : undefined,
    };
    const newList = [...coOwners, entry];
    setCoOwners(newList);
    // Auto-adjust primary owner % to fill up to 100
    const newCoTotal = newList.reduce((s, o) => s + o.ownership_pct, 0);
    setOwnershipPct(String(Math.max(0, 100 - newCoTotal)));
    // Reset form — suggest half of contact's remaining share for next co-owner
    const contactRemaining = Math.max(0, 100 - newCoTotal);
    setNewCoOwner({ name: "", role: "individual", ownership_pct: Math.max(1, Math.floor(contactRemaining / 2)) });
    setNewCoOwnerIsNew(false);
    setNewCoOwnerPhone("");
    setNewCoOwnerEmail("");
    setAddingCoOwner(false);
  }

  function removeCoOwner(idx: number) {
    const newList = coOwners.filter((_, i) => i !== idx);
    setCoOwners(newList);
    // Auto-adjust primary owner % back
    const newCoTotal = newList.reduce((s, o) => s + o.ownership_pct, 0);
    setOwnershipPct(String(Math.max(0, 100 - newCoTotal)));
  }

  const equity = estimatedValue && mortgageBalance
    ? Number(unformatCurrency(estimatedValue)) - Number(unformatCurrency(mortgageBalance))
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) { setError("Please enter the property address."); return; }
    if (totalOwnership !== 100 && coOwners.length > 0) {
      setError(`Total ownership is ${totalOwnership}% — must equal 100%.`);
      return;
    }
    setSaving(true);
    setError(null);

    // Create contacts for any new co-owners before saving the portfolio item
    const resolvedCoOwners = [...coOwners];
    for (let i = 0; i < resolvedCoOwners.length; i++) {
      const co = resolvedCoOwners[i];
      if (co.isNew) {
        const { contactId: newId, error: createErr } = await createContactFromCoOwner({
          name: co.name,
          phone: co.newPhone,
          email: co.newEmail,
        });
        if (createErr || !newId) {
          setError(`Could not create contact for "${co.name}": ${createErr}`);
          setSaving(false);
          return;
        }
        resolvedCoOwners[i] = { name: co.name, role: co.role, ownership_pct: co.ownership_pct, contact_id: newId };
      }
    }

    // Strip client-only fields before saving
    const cleanCoOwners = resolvedCoOwners.map(
      ({ isNew: _i, newPhone: _p, newEmail: _e, ...rest }) => ({
        name: rest.name,
        role: rest.role,
        ownership_pct: rest.ownership_pct,
        ...(rest.contact_id ? { contact_id: rest.contact_id } : {}),
      })
    );

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
      co_owners: cleanCoOwners,
      purchase_price: purchasePrice ? Number(unformatCurrency(purchasePrice)) : null,
      purchase_date: purchaseDate || null,
      estimated_value: estimatedValue ? Number(unformatCurrency(estimatedValue)) : null,
      bc_assessed_value: bcAssessed ? Number(unformatCurrency(bcAssessed)) : null,
      mortgage_balance: mortgageBalance ? Number(unformatCurrency(mortgageBalance)) : null,
      monthly_rental_income: rentalIncome ? Number(unformatCurrency(rentalIncome)) : null,
      strata_fee: strataFee ? Number(unformatCurrency(strataFee)) : null,
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
    <form onSubmit={handleSubmit} className="space-y-6">

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
                maxLength={7}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                onBlur={() => setPostalCode((v) => formatPostalCode(v))}
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
                onChange={(e) => {
                  const val = Math.max(1, Math.min(100 - coOwnerTotal, Number(e.target.value) || 1));
                  setOwnershipPct(String(val));
                }}
                disabled={saving || coOwners.length > 0}
              />
              <span className="text-sm text-muted-foreground font-medium">%</span>
              {coOwners.length > 0 && (
                <span className="text-xs text-muted-foreground">(auto)</span>
              )}
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
                  <ContactSearchInput
                    value={newCoOwner.name}
                    onChange={(v) => {
                      setNewCoOwner((d) => ({ ...d, name: v }));
                      setNewCoOwnerIsNew(false); // reset if they start typing again
                    }}
                    onSelect={(c) => {
                      setNewCoOwner((d) => ({ ...d, name: c.name, contact_id: c.id }));
                      setNewCoOwnerIsNew(false);
                    }}
                    onCreateNew={(name) => {
                      setNewCoOwner((d) => ({ ...d, name, contact_id: undefined }));
                      setNewCoOwnerIsNew(true);
                    }}
                  />
                  {newCoOwnerIsNew && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      ⚡ Will be created as a new contact on save
                    </p>
                  )}
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

              {/* Optional phone/email for new contacts */}
              {newCoOwnerIsNew && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-indigo-100 dark:border-indigo-900/30">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone <span className="text-xs font-normal text-muted-foreground">(optional)</span></label>
                    <Input
                      className="h-10"
                      placeholder="+1 (604) 555-0100"
                      value={newCoOwnerPhone}
                      onChange={(e) => setNewCoOwnerPhone(e.target.value)}
                      onBlur={() => setNewCoOwnerPhone((v) => formatPhone(v))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email <span className="text-xs font-normal text-muted-foreground">(optional)</span></label>
                    <Input
                      className="h-10"
                      type="email"
                      placeholder="name@email.com"
                      value={newCoOwnerEmail}
                      onChange={(e) => setNewCoOwnerEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Ownership % with auto-preview */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Ownership %</label>
                <Input
                  type="number"
                  min={1}
                  max={maxNewCoOwnerPct}
                  className="h-10 w-24"
                  value={newCoOwner.ownership_pct}
                  onChange={(e) => handleNewCoOwnerPctChange(Number(e.target.value))}
                />
                <span className="text-xs text-muted-foreground">
                  → {contactName.split(" ")[0]} will be{" "}
                  <span className={primaryAfterAdd < 0 ? "text-red-500 font-semibold" : "font-semibold"}>
                    {primaryAfterAdd}%
                  </span>
                </span>
              </div>
              {remainingForNew > 0 && newCoOwner.ownership_pct !== remainingForNew && (
                <p className="text-xs text-indigo-500">
                  💡 {remainingForNew}% is currently unallocated
                </p>
              )}

              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={addCoOwner} disabled={!newCoOwner.name}>Add</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setAddingCoOwner(false); setNewCoOwnerIsNew(false); setNewCoOwnerPhone(""); setNewCoOwnerEmail(""); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                // Split contact's current ownership evenly with the new partner
                const available = 100 - coOwnerTotal;
                const suggested = Math.max(1, Math.floor(available / 2));
                setNewCoOwner({ name: "", role: "individual", ownership_pct: suggested });
                setAddingCoOwner(true);
              }}
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
              className="h-11"
              inputMode="numeric"
              placeholder="e.g. 950,000"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value.replace(/[^0-9,]/g, ""))}
              onBlur={() => setPurchasePrice((v) => formatCurrency(v))}
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
              className="h-11"
              inputMode="numeric"
              placeholder="e.g. 1,100,000"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value.replace(/[^0-9,]/g, ""))}
              onBlur={() => setEstimatedValue((v) => formatCurrency(v))}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">BC Assessed Value ($)</label>
            <Input
              className="h-11"
              inputMode="numeric"
              placeholder="e.g. 1,020,000"
              value={bcAssessed}
              onChange={(e) => setBcAssessed(e.target.value.replace(/[^0-9,]/g, ""))}
              onBlur={() => setBcAssessed((v) => formatCurrency(v))}
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Mortgage Balance ($)</label>
            <Input
              className="h-11"
              inputMode="numeric"
              placeholder="e.g. 550,000"
              value={mortgageBalance}
              onChange={(e) => setMortgageBalance(e.target.value.replace(/[^0-9,]/g, ""))}
              onBlur={() => setMortgageBalance((v) => formatCurrency(v))}
              disabled={saving}
            />
          </div>
          {category === "investment" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Monthly Rental Income ($)</label>
              <Input
                className="h-11"
                inputMode="numeric"
                placeholder="e.g. 2,800"
                value={rentalIncome}
                onChange={(e) => setRentalIncome(e.target.value.replace(/[^0-9,]/g, ""))}
                onBlur={() => setRentalIncome((v) => formatCurrency(v))}
                disabled={saving}
              />
            </div>
          )}
          {(category === "primary_residence" || category === "vacation") && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Monthly Strata Fee ($)</label>
              <Input
                className="h-11"
                inputMode="numeric"
                placeholder="e.g. 450"
                value={strataFee}
                onChange={(e) => setStrataFee(e.target.value.replace(/[^0-9,]/g, ""))}
                onBlur={() => setStrataFee((v) => formatCurrency(v))}
                disabled={saving}
              />
            </div>
          )}
        </div>

        {/* Live equity card */}
        {equity !== null && Number(unformatCurrency(estimatedValue)) > 0 && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              💰 Estimated Equity: ${equity.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {Math.round((equity / Number(unformatCurrency(estimatedValue))) * 100)}% equity ratio
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
          disabled={saving || !address.trim()}
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
