"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Pencil,
  Upload,
  Download,
  Save,
  X,
  FileText,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveStepData, deleteStepFile } from "@/actions/workflow";
import type { StepFieldConfig, FieldType } from "@/lib/constants/workflow-fields";
import { FetchPreviousListingButton } from "./FetchPreviousListingButton";
import { FormPreviewDialog } from "./FormPreviewDialog";
import { MLSIntegrationButtons } from "./MLSIntegrationButtons";
import type { ListingDocument } from "@/types";

type DataSection = { title: string; fields: { label: string; value: string }[] };

type StepDataPanelProps = {
  listingId: string;
  stepId: string;
  sections: DataSection[];
  fieldConfigs: StepFieldConfig[];
  savedData: Record<string, unknown>;
  documents: ListingDocument[];
  autoEditMode?: boolean;
  onEditModeChange?: (editing: boolean) => void;
  address?: string;
  hasEnrichmentData?: boolean;
};

// --- Field input renderer ---

function FieldInput({
  fieldKey,
  label,
  type,
  options,
  value,
  onChange,
}: {
  fieldKey: string;
  label: string;
  type: FieldType;
  options?: string[];
  value: string;
  onChange: (key: string, val: string) => void;
}) {
  const id = `field-${fieldKey}`;

  if (type === "select" && options) {
    return (
      <div>
        <Label htmlFor={id} className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
          {label}
        </Label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div>
        <Label htmlFor={id} className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
          {label}
        </Label>
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          rows={3}
          className="text-sm"
        />
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor={id} className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
        {label}
      </Label>
      <Input
        id={id}
        type={type === "currency" ? "number" : type === "phone" ? "tel" : type}
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="text-sm h-9"
        step={type === "currency" ? "0.01" : undefined}
      />
    </div>
  );
}

// --- Main component ---

export function StepDataPanel({
  listingId,
  stepId,
  sections,
  fieldConfigs,
  savedData,
  documents,
  autoEditMode = false,
  onEditModeChange,
  address,
  hasEnrichmentData,
}: StepDataPanelProps) {
  const [isEditing, setIsEditing] = useState(autoEditMode);
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    if (!autoEditMode) return {};
    // Pre-populate if auto-edit mode
    const initial: Record<string, string> = {};
    for (const section of fieldConfigs) {
      for (const field of section.fields) {
        const saved = savedData[field.key];
        if (saved !== undefined && saved !== null) {
          initial[field.key] = String(saved);
        }
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // When autoEditMode turns on, enter edit mode with pre-populated values
  useEffect(() => {
    if (autoEditMode && !isEditing) {
      const initial: Record<string, string> = {};
      const allConfigFields = fieldConfigs.flatMap((s) => s.fields);

      for (const field of allConfigFields) {
        const saved = savedData[field.key];
        if (saved !== undefined && saved !== null) {
          initial[field.key] = String(saved);
        }
      }
      // Fill gaps from display sections
      for (const section of sections) {
        for (const field of section.fields) {
          if (!field.value || field.value === "—" || field.value === "Not set") continue;
          const configField = allConfigFields.find(
            (f) =>
              !initial[f.key] &&
              (f.label === field.label ||
                f.label.includes(field.label) ||
                field.label.includes(f.label))
          );
          if (configField) {
            initial[configField.key] = field.value;
          }
        }
      }
      setFormValues(initial);
      setIsEditing(true);
    }
  }, [autoEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Files attached to this step (stored as OTHER with step prefix in file path)
  const stepPrefix = `step-${stepId}_`;
  const stepFiles = documents.filter(
    (d) => d.doc_type === "OTHER" && d.file_name.startsWith(stepPrefix)
  );

  // Initialize form values from savedData + sections
  const startEditing = useCallback(() => {
    const initial: Record<string, string> = {};
    const allConfigFields = fieldConfigs.flatMap((s) => s.fields);

    // First, populate from field configs with savedData
    for (const field of allConfigFields) {
      const saved = savedData[field.key];
      if (saved !== undefined && saved !== null) {
        initial[field.key] = String(saved);
      }
    }

    // Then fill gaps from display sections (for seller-intake which reads from real tables)
    // Match by exact label OR by label substring (e.g. "Full Name" matches "Full Legal Name")
    for (const section of sections) {
      for (const field of section.fields) {
        if (!field.value || field.value === "—" || field.value === "Not set") continue;

        const configField = allConfigFields.find(
          (f) =>
            !initial[f.key] &&
            (f.label === field.label ||
              f.label.includes(field.label) ||
              field.label.includes(f.label))
        );
        if (configField) {
          initial[configField.key] = field.value;
        }
      }
    }

    setFormValues(initial);
    setIsEditing(true);
  }, [fieldConfigs, savedData, sections]);

  const cancelEditing = () => {
    setIsEditing(false);
    setFormValues({});
    onEditModeChange?.(false);
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveStepData(listingId, stepId, formValues);
      if (result.success) {
        toast.success("Data saved — later steps reset");
        setIsEditing(false);
        setFormValues({});
        onEditModeChange?.(false);
        router.refresh();
      }
    } catch {
      toast.error("Failed to save data");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.jpg,.png,.csv,.xlsx";
    input.multiple = true;

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      setUploading(true);

      for (const file of Array.from(files)) {
        const fileName = `${stepPrefix}${Date.now()}_${file.name}`;
        const filePath = `${listingId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-documents")
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Upload failed: ${uploadError.message}`);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("listing-documents").getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from("listing_documents")
          .insert({
            listing_id: listingId,
            doc_type: "OTHER" as const,
            file_name: fileName,
            file_url: publicUrl,
          });

        if (dbError) {
          toast.error(`Failed to save file record: ${dbError.message}`);
          continue;
        }

        toast.success(`${file.name} uploaded`);
      }

      setUploading(false);
      router.refresh();
    };

    input.click();
  };

  const handleDeleteFile = async (docId: string, fileName: string) => {
    try {
      await deleteStepFile(listingId, docId);
      toast.success(`${fileName} removed`);
      router.refresh();
    } catch {
      toast.error("Failed to remove file");
    }
  };

  const handlePreviousDataFetched = (data: Record<string, string>) => {
    // Merge fetched data into form values, only filling empty fields
    setFormValues((prev) => {
      const merged = { ...prev };
      for (const [key, value] of Object.entries(data)) {
        if (!merged[key]) {
          merged[key] = value;
        }
      }
      return merged;
    });
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const downloadTemplate = () => {
    const allFields = fieldConfigs.flatMap((s) => s.fields);
    const headers = allFields.map((f) => f.label).join(",");
    const csv = `${headers}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${stepId}_template.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Template downloaded");
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center gap-2 justify-end">
        {!isEditing && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2.5 gap-1.5"
              onClick={startEditing}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
            {fieldConfigs.length > 0 && (
              <FormPreviewDialog
                stepId={stepId}
                stepName={fieldConfigs[0]?.sectionTitle ? stepId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : stepId}
                fieldConfigs={fieldConfigs}
                formValues={savedData}
                onSave={async (data) => {
                  const result = await saveStepData(listingId, stepId, data);
                  if (result.success) router.refresh();
                }}
              />
            )}
          </>
        )}
        {stepId === "data-enrichment" && address && (
          <FetchPreviousListingButton
            address={address}
            listingId={listingId}
            onDataFetched={handlePreviousDataFetched}
          />
        )}
        {(stepId === "mls-prep" || stepId === "mls-submission") && (
          <MLSIntegrationButtons
            listingId={listingId}
            stepId={stepId}
            hasEnrichmentData={hasEnrichmentData}
          />
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs px-2.5 gap-1.5"
          onClick={handleUpload}
          disabled={uploading}
          data-upload-step={stepId}
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          Upload
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs px-2.5 gap-1.5"
          onClick={downloadTemplate}
        >
          <Download className="h-3 w-3" />
          Template
        </Button>
      </div>

      {/* View or Edit mode */}
      {isEditing ? (
        <div className="space-y-4">
          {fieldConfigs.map((section) => (
            <div key={section.sectionTitle}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {section.sectionTitle}
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {section.fields.map((field) => (
                  <div key={field.key} className={field.colSpan === 2 ? "col-span-2" : ""}>
                    <FieldInput
                      fieldKey={field.key}
                      label={field.label}
                      type={field.type}
                      options={field.options}
                      value={formValues[field.key] ?? ""}
                      onChange={handleFieldChange}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Save / Cancel */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              className="h-8 text-xs px-4 gap-1.5"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs px-3 gap-1.5"
              onClick={cancelEditing}
              disabled={saving}
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {section.title}
              </h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {section.fields.map((field) => (
                  <div
                    key={field.label}
                    className={field.value.length > 40 ? "col-span-2" : ""}
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                      {field.label}
                    </dt>
                    <dd className="text-sm text-foreground mt-0.5">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attached files */}
      {stepFiles.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            Attached Files ({stepFiles.length})
          </p>
          <div className="space-y-1.5">
            {stepFiles.map((file) => {
              // Strip step prefix from display name
              const displayName = file.file_name.replace(
                new RegExp(`^step-${stepId}_\\d+_`),
                ""
              );
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-muted/40 text-sm"
                >
                  <span className="truncate mr-2">{displayName}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title="Open file"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.id, displayName)}
                      className="p-1 rounded hover:bg-destructive/10 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
