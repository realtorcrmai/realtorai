"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Check,
  X,
  Home,
  Plus,
} from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";
import { updateContact } from "@/actions/contacts";
import type { BuyerPreferences } from "@/types";
import type { Json } from "@/types/database";
import { FINANCING_STATUSES, FINANCING_STATUS_LABELS } from "@/lib/constants/contacts";

const PROPERTY_TYPES = ["Detached", "Townhouse", "Condo", "Duplex"];
const TIMELINE_OPTIONS = [
  "Immediately",
  "1-3 months",
  "3-6 months",
  "6-12 months",
  "12+ months",
];

export function BuyerPreferencesPanel({
  contactId,
  preferences,
  initialEditing = false,
}: {
  contactId: string;
  preferences: BuyerPreferences | null;
  initialEditing?: boolean;
}) {
  const [editing, setEditing] = useState(initialEditing);
  const [form, setForm] = useState<BuyerPreferences>(
    preferences ?? {}
  );
  const [areaInput, setAreaInput] = useState("");
  const [mustHaveInput, setMustHaveInput] = useState("");
  const [niceToHaveInput, setNiceToHaveInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const hasPreferences = preferences && Object.keys(preferences).length > 0;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateContact(contactId, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buyer_preferences: form as any,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function addArea() {
    const area = areaInput.trim();
    if (!area) return;
    const current = form.preferred_areas ?? [];
    if (!current.includes(area)) {
      setForm((f) => ({ ...f, preferred_areas: [...current, area] }));
    }
    setAreaInput("");
  }

  function removeArea(area: string) {
    setForm((f) => ({
      ...f,
      preferred_areas: (f.preferred_areas ?? []).filter((a) => a !== area),
    }));
  }

  function addMustHave() {
    const item = mustHaveInput.trim();
    if (!item) return;
    const current = form.must_haves ?? [];
    if (!current.includes(item)) {
      setForm((f) => ({ ...f, must_haves: [...current, item] }));
    }
    setMustHaveInput("");
  }

  function removeMustHave(item: string) {
    setForm((f) => ({
      ...f,
      must_haves: (f.must_haves ?? []).filter((i) => i !== item),
    }));
  }

  function addNiceToHave() {
    const item = niceToHaveInput.trim();
    if (!item) return;
    const current = form.nice_to_haves ?? [];
    if (!current.includes(item)) {
      setForm((f) => ({ ...f, nice_to_haves: [...current, item] }));
    }
    setNiceToHaveInput("");
  }

  function removeNiceToHave(item: string) {
    setForm((f) => ({
      ...f,
      nice_to_haves: (f.nice_to_haves ?? []).filter((i) => i !== item),
    }));
  }

  function togglePropertyType(type: string) {
    const current = form.property_types ?? [];
    if (current.includes(type)) {
      setForm((f) => ({
        ...f,
        property_types: current.filter((t) => t !== type),
      }));
    } else {
      setForm((f) => ({
        ...f,
        property_types: [...current, type],
      }));
    }
  }

  if (!editing && !hasPreferences) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Home className="h-4 w-4" />
            Buyer Preferences
          </h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            No preferences set — Edit to add buyer criteria
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 mx-auto px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Set Preferences
          </button>
        </div>
      </div>
    );
  }

  if (!editing && hasPreferences) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Home className="h-4 w-4" />
            Buyer Preferences
          </h3>
          <button
            type="button"
            onClick={() => {
              setForm(preferences ?? {});
              setEditing(true);
            }}
            className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(preferences?.price_range_min || preferences?.price_range_max) && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Price Range
              </p>
              <p className="text-sm font-medium mt-1">
                {preferences.price_range_min
                  ? Number(preferences.price_range_min).toLocaleString("en-CA", {
                      style: "currency",
                      currency: "CAD",
                      maximumFractionDigits: 0,
                    })
                  : "Any"}{" "}
                -{" "}
                {preferences.price_range_max
                  ? Number(preferences.price_range_max).toLocaleString("en-CA", {
                      style: "currency",
                      currency: "CAD",
                      maximumFractionDigits: 0,
                    })
                  : "Any"}
              </p>
            </div>
          )}
          {(preferences?.bedrooms || preferences?.bathrooms) && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Beds / Baths
              </p>
              <p className="text-sm font-medium mt-1">
                {preferences.bedrooms ?? "Any"} bed /{" "}
                {preferences.bathrooms ?? "Any"} bath
              </p>
            </div>
          )}
          {(preferences?.move_in_timeline || preferences?.timeline) && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Timeline
              </p>
              <p className="text-sm font-medium mt-1">
                {preferences.move_in_timeline || preferences.timeline}
              </p>
            </div>
          )}
          {preferences?.pre_approval_amount && (
            <div className="p-3 rounded-lg bg-brand-muted dark:bg-foreground/20">
              <p className="text-xs text-brand dark:text-brand uppercase font-medium">
                Pre-Approved
              </p>
              <p className="text-sm font-bold text-brand-dark dark:text-brand-light mt-1">
                {Number(preferences.pre_approval_amount).toLocaleString("en-CA", {
                  style: "currency",
                  currency: "CAD",
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          )}
        </div>

        {preferences?.property_types && preferences.property_types.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
              Property Types
            </p>
            <div className="flex flex-wrap gap-1.5">
              {preferences.property_types.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {preferences?.preferred_areas && preferences.preferred_areas.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
              Preferred Areas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {preferences.preferred_areas.map((a) => (
                <span
                  key={a}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-brand-muted text-brand-dark dark:bg-blue-900/30 dark:text-brand-light"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {preferences?.financing_status && (
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground uppercase font-medium">
              Financing Status
            </p>
            <p className="text-sm font-medium mt-1">
              {FINANCING_STATUS_LABELS[preferences.financing_status]}
            </p>
          </div>
        )}

        {preferences?.must_haves && preferences.must_haves.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
              Must-Haves
            </p>
            <div className="flex flex-wrap gap-1.5">
              {preferences.must_haves.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {preferences?.nice_to_haves && preferences.nice_to_haves.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
              Nice-to-Haves
            </p>
            <div className="flex flex-wrap gap-1.5">
              {preferences.nice_to_haves.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {preferences?.notes && (
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">
              Notes
            </p>
            <p className="text-sm text-muted-foreground">{preferences.notes}</p>
          </div>
        )}
      </div>
    );
  }

  // Editing mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Home className="h-4 w-4" />
          Buyer Preferences
        </h3>
      </div>

      <div className="p-4 rounded-lg border border-border bg-background space-y-4">
        {/* Price Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Min Price
            </label>
            <input
              type="number"
              placeholder="e.g. 500000"
              value={form.price_range_min ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  price_range_min: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Max Price
            </label>
            <input
              type="number"
              placeholder="e.g. 1000000"
              value={form.price_range_max ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  price_range_max: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Pre-Approval Amount */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Pre-Approval Amount
          </label>
          <input
            type="number"
            placeholder="e.g. 800000"
            value={form.pre_approval_amount ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                pre_approval_amount: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />
        </div>

        {/* Financing Status */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Financing Status
          </label>
          <select
            value={form.financing_status ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                financing_status: (e.target.value || undefined) as BuyerPreferences["financing_status"],
              }))
            }
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          >
            <option value="">Select status...</option>
            {FINANCING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {FINANCING_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Beds / Baths */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Bedrooms
            </label>
            <input
              type="number"
              min={0}
              placeholder="Any"
              value={form.bedrooms ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  bedrooms: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Bathrooms
            </label>
            <input
              type="number"
              min={0}
              placeholder="Any"
              value={form.bathrooms ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  bathrooms: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Property Types */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Property Types
          </label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {PROPERTY_TYPES.map((type) => {
              const selected = (form.property_types ?? []).includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => togglePropertyType(type)}
                  disabled={isPending}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    selected
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Areas */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Preferred Areas
          </label>
          <div className="flex gap-2 mt-1.5">
            <input
              type="text"
              placeholder="Add area..."
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addArea();
                }
              }}
              className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={addArea}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-muted rounded-md hover:bg-muted/80 transition-colors"
            >
              Add
            </button>
          </div>
          {(form.preferred_areas ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(form.preferred_areas ?? []).map((area) => (
                <span
                  key={area}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-brand-muted text-brand-dark dark:bg-blue-900/30 dark:text-brand-light"
                >
                  {area}
                  <button
                    type="button"
                    onClick={() => removeArea(area)}
                    className="hover:text-red-500 transition-colors"
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Must-Haves */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Must-Haves
          </label>
          <div className="flex gap-2 mt-1.5">
            <input
              type="text"
              placeholder="e.g. garage, backyard..."
              value={mustHaveInput}
              onChange={(e) => setMustHaveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addMustHave();
                }
              }}
              className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={addMustHave}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-muted rounded-md hover:bg-muted/80 transition-colors"
            >
              Add
            </button>
          </div>
          {(form.must_haves ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(form.must_haves ?? []).map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeMustHave(item)}
                    className="hover:text-red-500 transition-colors"
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Nice-to-Haves */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Nice-to-Haves
          </label>
          <div className="flex gap-2 mt-1.5">
            <input
              type="text"
              placeholder="e.g. pool, home office..."
              value={niceToHaveInput}
              onChange={(e) => setNiceToHaveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNiceToHave();
                }
              }}
              className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={addNiceToHave}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-muted rounded-md hover:bg-muted/80 transition-colors"
            >
              Add
            </button>
          </div>
          {(form.nice_to_haves ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(form.nice_to_haves ?? []).map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeNiceToHave(item)}
                    className="hover:text-red-500 transition-colors"
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Move-in Timeline
          </label>
          <select
            value={form.move_in_timeline ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                move_in_timeline: e.target.value || undefined,
              }))
            }
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          >
            <option value="">Select timeline...</option>
            {TIMELINE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Notes
          </label>
          <textarea
            placeholder="Any other preferences..."
            value={form.notes ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={2}
            disabled={isPending}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <LogoSpinner size={16} />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save Preferences
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(preferences ?? {});
              setEditing(false);
              setError(null);
            }}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
