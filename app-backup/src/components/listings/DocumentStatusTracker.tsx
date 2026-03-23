"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ListingDocument } from "@/types";

const REQUIRED_DOCS = [
  {
    type: "FINTRAC" as const,
    label: "FINTRAC — Client Identification",
    description: "Required for all transactions",
  },
  {
    type: "DORTS" as const,
    label: "DORTS — Disclosure of Representation",
    description: "Disclosure of Representation in Trading Services",
  },
  {
    type: "PDS" as const,
    label: "PDS — Property Disclosure Statement",
    description: "Required for active listings",
  },
];

export function DocumentStatusTracker({
  listingId,
  documents,
}: {
  listingId: string;
  documents: ListingDocument[];
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const uploadedTypes = new Set(documents.map((d) => d.doc_type));

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

      toast.success(`${docType} document uploaded successfully`);
      setUploading(null);
      router.refresh();
    };

    input.click();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">BC Required Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {REQUIRED_DOCS.map((doc) => {
          const isUploaded = uploadedTypes.has(doc.type);
          const isUploading = uploading === doc.type;
          return (
            <div
              key={doc.type}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                {isUploaded ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <X className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.description}
                  </p>
                </div>
              </div>
              {!isUploaded && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpload(doc.type)}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
