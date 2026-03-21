"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Check,
  X,
  Loader2,
  Plus,
} from "lucide-react";
import { updateContact } from "@/actions/contacts";
import type { Demographics } from "@/types";
import type { Json } from "@/types/database";
import { INCOME_RANGES } from "@/lib/constants/contacts";

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-CA", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function DemographicsPanel({
  contactId,
  demographics,
}: {
  contactId: string;
  demographics: Demographics | null;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Demographics>(demographics ?? {});
  const [langInput, setLangInput] = useState("");
  const [hobbyInput, setHobbyInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const hasDemographics = demographics && Object.keys(demographics).length > 0;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateContact(contactId, {
        demographics: form as unknown as Json,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function addLanguage() {
    const lang = langInput.trim();
    if (!lang) return;
    const current = form.languages ?? [];
    if (!current.includes(lang)) {
      setForm((f) => ({ ...f, languages: [...current, lang] }));
    }
    setLangInput("");
  }

  function removeLanguage(lang: string) {
    setForm((f) => ({
      ...f,
      languages: (f.languages ?? []).filter((l) => l !== lang),
    }));
  }

  function addHobby() {
    const hobby = hobbyInput.trim();
    if (!hobby) return;
    const current = form.hobbies_interests ?? [];
    if (!current.includes(hobby)) {
      setForm((f) => ({ ...f, hobbies_interests: [...current, hobby] }));
    }
    setHobbyInput("");
  }

  function removeHobby(hobby: string) {
    setForm((f) => ({
      ...f,
      hobbies_interests: (f.hobbies_interests ?? []).filter((h) => h !== hobby),
    }));
  }

  // Empty state
  if (!editing && !hasDemographics) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            📋 Demographics
          </h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">
            No demographics recorded yet.
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 mx-auto px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Demographics
          </button>
        </div>
      </div>
    );
  }

  // View mode
  if (!editing && hasDemographics) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            📋 Demographics
          </h3>
          <button
            type="button"
            onClick={() => {
              setForm(demographics ?? {});
              setEditing(true);
            }}
            className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {demographics?.birthday && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Birthday
              </p>
              <p className="text-sm font-medium mt-1">
                {formatDate(demographics.birthday)}
              </p>
            </div>
          )}
          {demographics?.anniversary && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Anniversary
              </p>
              <p className="text-sm font-medium mt-1">
                {formatDate(demographics.anniversary)}
              </p>
            </div>
          )}
          {demographics?.occupation && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Occupation
              </p>
              <p className="text-sm font-medium mt-1">
                {demographics.occupation}
              </p>
            </div>
          )}
          {demographics?.employer && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Employer
              </p>
              <p className="text-sm font-medium mt-1">
                {demographics.employer}
              </p>
            </div>
          )}
          {demographics?.income_range && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Income Range
              </p>
              <p className="text-sm font-medium mt-1">
                {demographics.income_range}
              </p>
            </div>
          )}
          {demographics?.family_size != null && (
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground uppercase font-medium">
                Family Size
              </p>
              <p className="text-sm font-medium mt-1">
                {demographics.family_size}
              </p>
            </div>
          )}
        </div>

        {demographics?.languages && demographics.languages.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
              Languages
            </p>
            <div className="flex flex-wrap gap-1.5">
              {demographics.languages.map((lang) => (
                <span
                  key={lang}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {demographics?.hobbies_interests &&
          demographics.hobbies_interests.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium mb-2">
                Hobbies & Interests
              </p>
              <div className="flex flex-wrap gap-1.5">
                {demographics.hobbies_interests.map((hobby) => (
                  <span
                    key={hobby}
                    className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                  >
                    {hobby}
                  </span>
                ))}
              </div>
            </div>
          )}

        {demographics?.bio_notes && (
          <div>
            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">
              Bio / Notes
            </p>
            <p className="text-sm text-muted-foreground">
              {demographics.bio_notes}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          📋 Demographics
        </h3>
      </div>

      <div className="p-4 rounded-lg border border-border bg-background space-y-4">
        {/* Birthday & Anniversary */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Birthday
            </label>
            <input
              type="date"
              value={form.birthday ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  birthday: e.target.value || undefined,
                }))
              }
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Anniversary
            </label>
            <input
              type="date"
              value={form.anniversary ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  anniversary: e.target.value || undefined,
                }))
              }
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Occupation & Employer */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Occupation
            </label>
            <input
              type="text"
              placeholder="e.g. Software Engineer"
              value={form.occupation ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, occupation: e.target.value || undefined }))
              }
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Employer
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Corp"
              value={form.employer ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, employer: e.target.value || undefined }))
              }
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Income Range */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Income Range
          </label>
          <select
            value={form.income_range ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                income_range: e.target.value || undefined,
              }))
            }
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          >
            <option value="">Select range...</option>
            {INCOME_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Family Size */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Family Size
          </label>
          <input
            type="number"
            min={1}
            placeholder="e.g. 4"
            value={form.family_size ?? ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                family_size: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />
        </div>

        {/* Languages */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Languages
          </label>
          <div className="flex gap-2 mt-1.5">
            <input
              type="text"
              placeholder="Add language..."
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLanguage();
                }
              }}
              className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={addLanguage}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-muted rounded-md hover:bg-muted/80 transition-colors"
            >
              Add
            </button>
          </div>
          {(form.languages ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(form.languages ?? []).map((lang) => (
                <span
                  key={lang}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                >
                  {lang}
                  <button
                    type="button"
                    onClick={() => removeLanguage(lang)}
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

        {/* Hobbies & Interests */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Hobbies & Interests
          </label>
          <div className="flex gap-2 mt-1.5">
            <input
              type="text"
              placeholder="e.g. hiking, cooking..."
              value={hobbyInput}
              onChange={(e) => setHobbyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHobby();
                }
              }}
              className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={addHobby}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium bg-muted rounded-md hover:bg-muted/80 transition-colors"
            >
              Add
            </button>
          </div>
          {(form.hobbies_interests ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(form.hobbies_interests ?? []).map((hobby) => (
                <span
                  key={hobby}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                >
                  {hobby}
                  <button
                    type="button"
                    onClick={() => removeHobby(hobby)}
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

        {/* Bio / Notes */}
        <div>
          <label className="text-xs text-muted-foreground font-medium">
            Bio / Notes
          </label>
          <textarea
            placeholder="Any additional notes about this contact..."
            value={form.bio_notes ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, bio_notes: e.target.value || undefined }))
            }
            className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={3}
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
            Save Demographics
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(demographics ?? {});
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
