"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { addContactDate, updateContactDate, deleteContactDate } from "@/actions/contacts";
import { formatDistanceToNow, differenceInDays, isBefore, addYears } from "date-fns";
import type { ContactDate } from "@/types";

const DATE_PRESETS = ["Birthday", "Anniversary", "Mortgage Renewal"];

function getNextOccurrence(dateStr: string, recurring: boolean): Date {
  const d = new Date(dateStr + "T00:00:00");
  if (!recurring) return d;

  const now = new Date();
  let next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (isBefore(next, now)) {
    next = addYears(next, 1);
  }
  return next;
}

function getDaysUntil(dateStr: string, recurring: boolean): string {
  const next = getNextOccurrence(dateStr, recurring);
  const days = differenceInDays(next, new Date());
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  if (days < 0 && !recurring) return "Passed";
  return `in ${days} days`;
}

export function ImportantDatesPanel({
  contactId,
  dates,
}: {
  contactId: string;
  dates: ContactDate[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingDate, setEditingDate] = useState<ContactDate | null>(null);
  const [form, setForm] = useState({
    label: "",
    customLabel: "",
    date: "",
    recurring: true,
    notes: "",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Sort dates by next occurrence
  const sortedDates = [...dates].sort((a, b) => {
    const nextA = getNextOccurrence(a.date, a.recurring);
    const nextB = getNextOccurrence(b.date, b.recurring);
    return nextA.getTime() - nextB.getTime();
  });

  function resetForm() {
    setForm({ label: "", customLabel: "", date: "", recurring: true, notes: "" });
    setShowForm(false);
    setEditingDate(null);
    setError(null);
  }

  function startEdit(d: ContactDate) {
    const isPreset = DATE_PRESETS.includes(d.label);
    setForm({
      label: isPreset ? d.label : "Custom",
      customLabel: isPreset ? "" : d.label,
      date: d.date,
      recurring: d.recurring,
      notes: d.notes ?? "",
    });
    setEditingDate(d);
    setShowForm(true);
  }

  function handleSave() {
    const finalLabel = form.label === "Custom" ? form.customLabel.trim() : form.label;
    if (!finalLabel) {
      setError("Label is required");
      return;
    }
    if (!form.date) {
      setError("Date is required");
      return;
    }
    setError(null);

    startTransition(async () => {
      const payload = {
        label: finalLabel,
        date: form.date,
        recurring: form.recurring,
        notes: form.notes || undefined,
      };

      let result;
      if (editingDate) {
        result = await updateContactDate(editingDate.id, contactId, payload);
      } else {
        result = await addContactDate(contactId, payload);
      }

      if (result.error) {
        setError(result.error);
      } else {
        resetForm();
        router.refresh();
      }
    });
  }

  function handleDelete(dateId: string) {
    startTransition(async () => {
      const result = await deleteContactDate(dateId, contactId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          Important Dates
        </h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>

      {/* Dates List */}
      {sortedDates.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground text-center py-3">
          No important dates added yet.
        </p>
      )}

      {sortedDates.map((d) => {
        const daysUntil = getDaysUntil(d.date, d.recurring);
        const isUpcoming =
          differenceInDays(getNextOccurrence(d.date, d.recurring), new Date()) <= 30;

        return (
          <div
            key={d.id}
            className={`flex items-start justify-between p-2.5 rounded-lg group ${
              isUpcoming ? "bg-amber-50 dark:bg-amber-950/20" : "bg-muted/30"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{d.label}</p>
                {d.recurring && (
                  <RefreshCw className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(d.date + "T00:00:00").toLocaleDateString("en-CA", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p
                className={`text-xs font-medium mt-0.5 ${
                  isUpcoming ? "text-amber-600" : "text-muted-foreground"
                }`}
              >
                {daysUntil}
              </p>
              {d.notes && (
                <p className="text-xs text-muted-foreground mt-1">{d.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={() => startEdit(d)}
                className="p-1 text-muted-foreground hover:text-primary transition-colors"
                disabled={isPending}
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(d.id)}
                className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                disabled={isPending}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="p-3 rounded-lg border border-border bg-background space-y-2.5">
          <select
            value={form.label}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                label: e.target.value,
                customLabel: e.target.value === "Custom" ? f.customLabel : "",
              }))
            }
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          >
            <option value="">Select type...</option>
            {DATE_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value="Custom">Custom...</option>
          </select>

          {form.label === "Custom" && (
            <input
              type="text"
              placeholder="Custom label *"
              value={form.customLabel}
              onChange={(e) => setForm((f) => ({ ...f, customLabel: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
          )}

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.checked }))}
              className="rounded border-border"
              disabled={isPending}
            />
            Repeat yearly
          </label>

          <input
            type="text"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              {editingDate ? "Update" : "Add"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
