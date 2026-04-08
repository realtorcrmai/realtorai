"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Upload, Loader2, FileText, FileCheck, Pencil, Download, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ListingDocument } from "@/types";

const REQUIRED_DOCS = [
  { type: "FINTRAC" as const, label: "FINTRAC", desc: "Client Identification & Verification" },
  { type: "DORTS" as const, label: "DORTS", desc: "Disclosure of Representation" },
  { type: "PDS" as const, label: "PDS", desc: "Property Disclosure Statement" },
];

const BC_FORMS = [
  { key: "dorts", label: "DORTS", icon: "📋" },
  { key: "mlc", label: "MLC", icon: "📝" },
  { key: "pds", label: "PDS", icon: "🏠" },
  { key: "fintrac", label: "FINTRAC", icon: "🔍" },
  { key: "privacy", label: "Privacy", icon: "🔒" },
  { key: "c3", label: "C3", icon: "🤝" },
  { key: "drup", label: "DRUP", icon: "💰" },
  { key: "mls", label: "MLS Input", icon: "📊" },
  { key: "mktauth", label: "Mktg Auth", icon: "📢" },
  { key: "agency", label: "Agency", icon: "🏢" },
  { key: "c3conf", label: "C3 Conf", icon: "✅" },
  { key: "fairhsg", label: "Fair Housing", icon: "⚖️" },
];

export function FormReadinessPanel({
  listingId,
  documents,
  formStatuses = {},
}: {
  listingId: string;
  documents: ListingDocument[];
  listing?: Record<string, unknown>;
  seller?: { id: string; name: string; phone: string; email: string | null };
  formStatuses?: Record<string, "draft" | "completed">;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const uploadedTypes = new Set(documents.map((d) => d.doc_type));
  const requiredComplete = REQUIRED_DOCS.filter((d) =>
    uploadedTypes.has(d.type)
  ).length;
  const totalRequired = REQUIRED_DOCS.length;
  const progressPct = Math.round((requiredComplete / totalRequired) * 100);

  async function handleUpload(docType: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.jpg,.png";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploading(docType);

      const filePath = `${listingId}/${docType}_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("listing-documents")
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        setUploading(null);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("listing-documents").getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("listing_documents")
        .upsert(
          {
            listing_id: listingId,
            doc_type: docType,
            file_name: file.name,
            file_url: publicUrl,
          },
          { onConflict: "listing_id,doc_type" }
        );

      if (dbError) {
        toast.error(`Failed to save document record: ${dbError.message}`);
        setUploading(null);
        return;
      }

      toast.success(`${docType} uploaded`);
      setUploading(null);
      router.refresh();
    };

    input.click();
  }

  function openFormEditor(formKey: string) {
    router.push(`/forms/${listingId}/${formKey}`);
  }

  return (
    <div className="space-y-6">
      {/* Readiness header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold">Document Readiness</h2>
          <span className="text-sm font-medium text-muted-foreground">
            {requiredComplete}/{totalRequired} required
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct === 100 ? "bg-[#0F7694]/50" : "bg-[#0F7694]/50/70"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Required documents */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Required Documents
        </p>
        {REQUIRED_DOCS.map((doc) => {
          const isUploaded = uploadedTypes.has(doc.type);
          const isUploading = uploading === doc.type;
          return (
            <div
              key={doc.type}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2.5">
                {isUploaded ? (
                  <Check className="h-4.5 w-4.5 text-[#0F7694] shrink-0" />
                ) : (
                  <X className="h-4.5 w-4.5 text-red-500 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.desc}
                  </p>
                </div>
              </div>
              {!isUploaded && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-3"
                  onClick={() => handleUpload(doc.type)}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Upload
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* BC Standard Forms */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          BC Standard Forms
        </p>
        <div className="grid grid-cols-3 gap-2">
          {BC_FORMS.map((form) => {
            const status = formStatuses[form.key];
            return (
              <button
                key={form.key}
                onClick={() => openFormEditor(form.key)}
                className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-border/50 hover:bg-muted/60 hover:border-primary/30 transition-colors text-center"
              >
                <span className="text-lg">{form.icon}</span>
                <span className="text-xs font-medium leading-tight">
                  {form.label}
                </span>
                {/* Status indicator */}
                {status && (
                  <div className="absolute top-1 right-1">
                    {status === "completed" ? (
                      <FileCheck className="h-3.5 w-3.5 text-[#0F7694]" />
                    ) : (
                      <Pencil className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Click to open form editor. Fill, save drafts, and download as PDF.
        </p>
      </div>

      {/* Attached Documents (OTHER, CONTRACT, TITLE, etc.) */}
      {(() => {
        const otherDocs = documents.filter(
          (d) => !["FINTRAC", "DORTS", "PDS"].includes(d.doc_type)
        );
        if (otherDocs.length === 0) return null;
        return (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Attached Documents
            </p>
            <div className="space-y-2">
              {otherDocs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{doc.doc_type.toLowerCase()}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                </a>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
