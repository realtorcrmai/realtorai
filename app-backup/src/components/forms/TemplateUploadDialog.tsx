"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function TemplateUploadDialog() {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formKey, setFormKey] = useState("");
  const [formName, setFormName] = useState("");
  const [organization, setOrganization] = useState("BCREA");
  const [file, setFile] = useState<File | null>(null);
  const [extractedFields, setExtractedFields] = useState<string[]>([]);
  const router = useRouter();

  async function handleUpload() {
    if (!file || !formKey || !formName) {
      toast.error("Please fill in all required fields and select a PDF");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("form_key", formKey.toLowerCase().replace(/\s+/g, "_"));
      formData.append("form_name", formName);
      formData.append("organization", organization);

      const res = await fetch("/api/forms/templates", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const { fieldNames } = await res.json();
      setExtractedFields(fieldNames);

      toast.success(
        `Template uploaded! ${fieldNames.length} form fields detected.`
      );

      // Reset form but keep dialog open if fields were found (for mapping)
      if (fieldNames.length === 0) {
        setOpen(false);
        resetForm();
      }

      router.refresh();
    } catch (err) {
      console.error("[TemplateUpload]", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to upload template"
      );
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setFormKey("");
    setFormName("");
    setOrganization("BCREA");
    setFile(null);
    setExtractedFields([]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors">
        <Plus className="h-4 w-4" />
        Upload Template
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload PDF Form Template</DialogTitle>
          <DialogDescription>
            Upload an official BC real estate PDF form. The system will extract
            fillable fields automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="formKey">Form Key</Label>
              <Input
                id="formKey"
                placeholder="e.g. dorts"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                placeholder="e.g. BCREA"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="formName">Form Name</Label>
            <Input
              id="formName"
              placeholder="e.g. Disclosure of Representation in Trading Services"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdfFile">PDF File</Label>
            <div className="flex items-center gap-3">
              <Input
                id="pdfFile"
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="flex-1"
              />
            </div>
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {extractedFields.length > 0 && (
            <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-700">
                {extractedFields.length} fillable fields detected:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {extractedFields.slice(0, 20).map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 bg-white text-xs rounded border border-green-200"
                  >
                    {f}
                  </span>
                ))}
                {extractedFields.length > 20 && (
                  <span className="px-2 py-0.5 text-xs text-green-600">
                    +{extractedFields.length - 20} more
                  </span>
                )}
              </div>
              <p className="text-xs text-green-600 mt-1">
                Configure field mapping from the template settings to auto-fill
                these fields with CRM data.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              {extractedFields.length > 0 ? "Done" : "Cancel"}
            </Button>
            {extractedFields.length === 0 && (
              <Button onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Upload className="h-4 w-4 mr-1.5" />
                )}
                Upload & Analyze
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
