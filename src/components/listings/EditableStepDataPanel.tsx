"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check, Loader2 } from "lucide-react";
import { updateListing } from "@/actions/listings";
import { updateContact } from "@/actions/contacts";

type FieldItem = {
  label: string;
  value: string;
  editKey?: string;
  editTarget?: "listing" | "contact";
  inputType?: "text" | "number" | "time";
};

type DataSection = { title: string; fields: FieldItem[] };

export function EditableStepDataPanel({
  sections,
  listingId,
  contactId,
}: {
  sections: DataSection[];
  listingId: string;
  contactId: string;
}) {
  return (
    <div className="ml-7 mt-3 space-y-4">
      {sections.map((section) => (
        <EditableSection
          key={section.title}
          section={section}
          listingId={listingId}
          contactId={contactId}
        />
      ))}
    </div>
  );
}

function EditableSection({
  section,
  listingId,
  contactId,
}: {
  section: DataSection;
  listingId: string;
  contactId: string;
}) {
  const hasEditableFields = section.fields.some((f) => f.editKey);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function startEditing() {
    const initial: Record<string, string> = {};
    for (const field of section.fields) {
      if (field.editKey) {
        // Strip currency formatting for number fields
        let rawValue = field.value;
        if (field.inputType === "number") {
          rawValue = rawValue.replace(/[^0-9.-]/g, "");
        }
        if (rawValue === "—" || rawValue === "Not set") rawValue = "";
        initial[field.editKey] = rawValue;
      }
    }
    setEditValues(initial);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditValues({});
    setError(null);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      // Split updates by target
      const listingUpdates: Record<string, unknown> = {};
      const contactUpdates: Record<string, unknown> = {};

      for (const field of section.fields) {
        if (!field.editKey || editValues[field.editKey] === undefined) continue;
        const val = editValues[field.editKey];
        const target = field.editTarget;

        if (target === "listing") {
          if (field.inputType === "number") {
            listingUpdates[field.editKey] = val ? Number(val) : null;
          } else {
            listingUpdates[field.editKey] = val || null;
          }
        } else if (target === "contact") {
          contactUpdates[field.editKey] = val || null;
        }
      }

      const errors: string[] = [];

      if (Object.keys(listingUpdates).length > 0) {
        const result = await updateListing(listingId, listingUpdates as Record<string, string | number | null>);
        if (result.error) errors.push(result.error);
      }

      if (Object.keys(contactUpdates).length > 0) {
        const result = await updateContact(contactId, contactUpdates as Record<string, string | null>);
        if (result.error) errors.push(result.error);
      }

      if (errors.length > 0) {
        setError(errors.join(", "));
      } else {
        setIsEditing(false);
        setEditValues({});
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.title}
        </h4>
        {hasEditableFields && !isEditing && (
          <button
            type="button"
            onClick={startEditing}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
        {isEditing && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-brand hover:text-brand-dark font-medium disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {section.fields.map((field) => (
          <div
            key={field.label}
            className={field.value.length > 40 ? "col-span-2" : ""}
          >
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              {field.label}
            </dt>
            {isEditing && field.editKey ? (
              <input
                type={field.inputType ?? "text"}
                value={editValues[field.editKey] ?? ""}
                onChange={(e) =>
                  setEditValues((prev) => ({
                    ...prev,
                    [field.editKey!]: e.target.value,
                  }))
                }
                className="w-full mt-0.5 px-2 py-1 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={isPending}
              />
            ) : (
              <dd className="text-sm text-foreground mt-0.5">
                {field.value}
              </dd>
            )}
          </div>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}
