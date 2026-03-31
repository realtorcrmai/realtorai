"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Check,
  X,
  Loader2,
  Building2,
  Plus,
} from "lucide-react";
import { updateContact } from "@/actions/contacts";
import type { SellerPreferences } from "@/types";
import type { Json } from "@/types/database";

const MOTIVATION_OPTIONS = [
  { value: "relocating", label: "Relocating" },
  { value: "upsizing", label: "Upsizing" },
  { value: "downsizing", label: "Downsizing" },
  { value: "investment", label: "Investment" },
  { value: "estate", label: "Estate" },
  { value: "other", label: "Other" },
];

const OCCUPANCY_OPTIONS = [
  { value: "owner_occupied", label: "Owner Occupied" },
  { value: "tenant", label: "Tenant" },
  { value: "vacant", label: "Vacant" },
];

export function SellerPreferencesPanel({
  contactId,
  preferences,
}: {
  contactId: string;
  preferences: SellerPreferences | null;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SellerPreferences>(preferences ?? {});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const hasPreferences = preferences && Object.keys(preferences).length > 0;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateContact(contactId, {
        seller_preferences: form as any,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  const motivationLabel =
    MOTIVATION_OPTIONS.find((m) => m.value === preferences?.motivation)?.label ??
    preferences?.motivation;

  const occupancyLabel =
    OCCUPANCY_OPTIONS.find((o) => o.value === preferences?.occupancy)?.label ??
    preferences?.occupancy;

  if (!editing && !hasPreferences) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            Seller Preferences
          </h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            No preferences set — Edit to add seller criteria
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
            <Building2 className="h-4 w-4" />
            Seller Preferences
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
          {preferences?.motivation && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Motivation
              </p>
              <p className="text-sm font-medium mt-1">{motivationLabel}</p>
            </div>
          )}
          {preferences?.desired_list_price && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Desired List Price
              </p>
              <p className="text-sm font-medium mt-1">
                {Number(preferences.desired_list_price).toLocaleString("en-CA", {
                  style: "currency",
                  currency: "CAD",
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          )}
          {preferences?.earliest_list_date && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Earliest List Date
              </p>
              <p className="text-sm font-medium mt-1">
                {new Date(preferences.earliest_list_date).toLocaleDateString("en-CA", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
          {preferences?.occupancy && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Occupancy
              </p>
              <p className="text-sm font-medium mt-1">{occupancyLabel}</p>
            </div>
          )}
          {preferences?.has_purchase_plan_after_sale !== undefined && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Purchase Plan After Sale
              </p>
              <p className="text-sm font-medium mt-1">
                {preferences.has_purchase_plan_after_sale ? "Yes" : "No"}
              </p>
            </div>
          )}
        </div>

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
          <Building2 className="h-4 w-4" />
          Seller Preferences
        </h3>
      </div>

      <div className="p-4 rounded-lg border border-border bg-background space-y-4">
        {/* Motivation */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Motivation
          </label>
          <select
            value={form.motivation ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                motivation: e.target.value || undefined,
              }))
            }
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          >
            <option value="">Select motivation...</option>
            {MOTIVATION_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desired List Price */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Desired List Price
          </label>
          <input
            type="number"
            placeholder="e.g. 850000"
            value={form.desired_list_price ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                desired_list_price: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />
        </div>

        {/* Earliest List Date */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Earliest List Date
          </label>
          <input
            type="date"
            value={form.earliest_list_date ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                earliest_list_date: e.target.value || undefined,
              }))
            }
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />
        </div>

        {/* Occupancy */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Occupancy
          </label>
          <select
            value={form.occupancy ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                occupancy: e.target.value || undefined,
              }))
            }
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          >
            <option value="">Select occupancy...</option>
            {OCCUPANCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Has Purchase Plan After Sale */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="has_purchase_plan"
            checked={form.has_purchase_plan_after_sale ?? false}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                has_purchase_plan_after_sale: e.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            disabled={isPending}
          />
          <label htmlFor="has_purchase_plan" className="text-sm text-muted-foreground">
            Has purchase plan after sale
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Notes
          </label>
          <textarea
            placeholder="Any other seller notes..."
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
              <Loader2 className="h-4 w-4 animate-spin" />
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
