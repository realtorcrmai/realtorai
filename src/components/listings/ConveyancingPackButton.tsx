"use client";

import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ListingDocument } from "@/types";

const REQUIRED_FOR_PACK = ["CONTRACT", "PDS", "TITLE"] as const;

export function ConveyancingPackButton({
  address,
  documents,
  disabled,
}: {
  address: string;
  documents: ListingDocument[];
  disabled?: boolean;
}) {
  const [generating, setGenerating] = useState(false);

  const docMap = new Map(documents.map((d) => [d.doc_type, d]));
  const missing = REQUIRED_FOR_PACK.filter((t) => !docMap.has(t));

  async function handleGenerate() {
    if (missing.length > 0) {
      toast.error(`Missing required documents: ${missing.join(", ")}`);
      return;
    }

    setGenerating(true);
    try {
      const zip = new JSZip();

      for (const docType of REQUIRED_FOR_PACK) {
        const doc = docMap.get(docType)!;
        const response = await fetch(doc.file_url);
        const blob = await response.arrayBuffer();
        zip.file(doc.file_name, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const cleanAddress = address.replace(/[^a-zA-Z0-9]/g, "_");
      const date = new Date().toISOString().split("T")[0];
      saveAs(content, `Conveyancing_Pack_${cleanAddress}_${date}.zip`);
      toast.success("Conveyancing pack downloaded!");
    } catch (err) {
      console.error("Failed to generate conveyancing pack:", err);
      toast.error("Failed to generate conveyancing pack");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      variant="outline"
      disabled={generating || disabled}
    >
      {generating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Package className="h-4 w-4 mr-2" />
      )}
      Generate Conveyancing Pack
    </Button>
  );
}
