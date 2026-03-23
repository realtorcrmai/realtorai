"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteContactDocument } from "@/actions/contacts";
import { CONTACT_DOC_TYPES } from "@/lib/constants";
import type { ContactDocument } from "@/types";

export function ContactDocumentsPanel({
  contactId,
  documents,
}: {
  contactId: string;
  documents: ContactDocument[];
}) {
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<string>("Other");
  const [showUpload, setShowUpload] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      // Upload to Supabase storage
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const filePath = `${contactId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("contact-documents")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        setUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("contact-documents").getPublicUrl(filePath);

      // Insert document record
      const { error: insertError } = await supabase
        .from("contact_documents")
        .insert({
          contact_id: contactId,
          doc_type: docType,
          file_name: file.name,
          file_url: publicUrl,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
      }

      setShowUpload(false);
      router.refresh();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(docId: string) {
    startTransition(async () => {
      await deleteContactDocument(docId, contactId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Documents
          {documents.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
              {documents.length}
            </span>
          )}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
          className="text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Upload
        </Button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="p-4 rounded-lg border border-border bg-background space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full mt-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CONTACT_DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">
              File
            </label>
            <div className="mt-1">
              <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Choose file"}
                </span>
                <input
                  type="file"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </label>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUpload(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {doc.file_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground">
                      {doc.doc_type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(doc.uploaded_at).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  disabled={isPending}
                  className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 && !showUpload && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No documents uploaded yet.
        </p>
      )}
    </div>
  );
}
