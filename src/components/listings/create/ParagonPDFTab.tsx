"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ParagonReviewStep } from "./ParagonReviewStep";
import type { ParagonParseResult } from "@/lib/paragon/parse";
import type { Contact } from "@/types";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ACCEPT = "application/pdf,.pdf";

interface ParagonPDFTabProps {
  sellers: Contact[];
  loadingSellers: boolean;
}

type Phase = "upload" | "parsing" | "review";

export function ParagonPDFTab({ sellers, loadingSellers }: ParagonPDFTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("upload");
  const [parsed, setParsed] = useState<ParagonParseResult | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);

  const handleFile = useCallback((f: File) => {
    setError(null);
    const isPdf =
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("That's not a PDF. Please upload the Listing Detail Report as a PDF.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(
        `File is ${(f.size / 1024 / 1024).toFixed(1)} MB — max is 15 MB. Re-export from Paragon at a smaller size.`
      );
      return;
    }
    setFile(f);
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function onContinue() {
    if (!file) return;
    setError(null);
    setPhase("parsing");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/listings/parse-paragon", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as
        | { parsed: ParagonParseResult; storagePath: string | null }
        | { error: string }
        | null;

      if (!res.ok || !data || "error" in data) {
        const msg =
          data && "error" in data
            ? data.error
            : "We couldn't read this PDF. Try re-exporting from Paragon, or fill in the listing manually.";
        setError(msg);
        setPhase("upload");
        return;
      }

      setParsed(data.parsed);
      setStoragePath(data.storagePath);
      setPhase("review");
    } catch (err) {
      console.error("[ParagonPDFTab] parse failed:", err);
      setError("Network error while uploading the PDF. Please try again.");
      setPhase("upload");
    }
  }

  async function onRescan() {
    if (!storagePath || rescanning) return;
    setRescanning(true);
    setError(null);

    try {
      const res = await fetch("/api/listings/reparse-paragon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
      });
      const data = (await res.json().catch(() => null)) as
        | { parsed: ParagonParseResult; storagePath: string }
        | { error: string }
        | null;

      if (!res.ok || !data || "error" in data) {
        // 404 means PDF expired — bounce them back to re-upload.
        if (res.status === 404) {
          setError(
            data && "error" in data
              ? data.error
              : "We couldn't find that PDF — please upload it again."
          );
          setPhase("upload");
          setParsed(null);
          setStoragePath(null);
          setFile(null);
          return;
        }
        const msg =
          data && "error" in data
            ? data.error
            : "Couldn't re-parse this PDF. Please try again or fill the listing manually.";
        setError(msg);
        return;
      }

      setParsed(data.parsed);
      // storagePath is unchanged but echo it back for parity
      setStoragePath(data.storagePath);
    } catch (err) {
      console.error("[ParagonPDFTab] rescan failed:", err);
      setError("Network error while re-parsing. Please try again.");
    } finally {
      setRescanning(false);
    }
  }

  function reset() {
    setFile(null);
    setError(null);
    setParsed(null);
    setStoragePath(null);
    setPhase("upload");
  }

  // ── Review phase ───────────────────────────────────────────────────────
  if (phase === "review" && parsed && file) {
    return (
      <ParagonReviewStep
        parsed={parsed}
        fileName={file.name}
        sellers={sellers}
        loadingSellers={loadingSellers}
        onBack={reset}
        onRescan={storagePath ? onRescan : undefined}
        rescanning={rescanning}
      />
    );
  }

  // ── Upload + parsing phases share the same scaffolding ────────────────
  const isParsing = phase === "parsing";

  return (
    <div className="space-y-6">
      {/* Step header + how-to popover */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white text-xs font-bold shadow-sm">
            1
          </div>
          <h2 className="text-sm font-semibold">
            Upload Paragon Listing Detail Report{" "}
            <span className="text-red-400">*</span>
          </h2>
        </div>

        <Popover>
          <PopoverTrigger
            aria-label="How to export the Listing Detail Report from Paragon"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline focus:outline-none focus:ring-2 focus:ring-brand/40 rounded px-1 py-0.5"
          >
            <Info className="h-3.5 w-3.5" />
            How to export from Paragon
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            className="w-[420px] max-w-[calc(100vw-2rem)] p-4"
          >
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">
                  Export the Listing Detail Report from Paragon
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Takes about a minute. You'll save a PDF, then drag it into the box on the left.
                </p>
              </div>

              <ol className="space-y-2.5 text-xs">
                <li className="flex gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>
                    <strong>Log in to Paragon.</strong> For BCRES this is{" "}
                    <code className="px-1 py-0.5 rounded bg-muted text-[11px]">
                      bcres.paragonrels.com
                    </code>{" "}
                    — use your member login, not the collab subdomain.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>
                    <strong>Find the property.</strong> Search by MLS # (fastest), by
                    address, or open <em>My Listings</em> if it's your own historical listing
                    (most relistings are 2 years old and live there).
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>
                    <strong>Select the listing.</strong> Click into the detail view for one
                    property, or check the row in search results to multi-select.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center text-[10px]">
                    4
                  </span>
                  <span>
                    <strong>Open Reports.</strong> Look for <em>Reports</em>,{" "}
                    <em>Print</em>, or an <em>Actions ▾</em> menu on the toolbar (usually top-right).
                    Paragon's UI moves this around — current versions use a{" "}
                    <em>Print/Reports</em> dropdown.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center text-[10px]">
                    5
                  </span>
                  <span>
                    <strong>Pick the report type.</strong> Choose <em>Agent Full</em> or{" "}
                    <em>Listing Detail</em> (BCRES may use a custom name — pick the equivalent on your board).
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center text-[10px]">
                    6
                  </span>
                  <span>
                    <strong>Output as PDF.</strong> Click <em>PDF</em> or{" "}
                    <em>Save as PDF</em>. On older Paragon versions you'll see a print preview —{" "}
                    <em>Save as PDF</em> from the browser's print dialog works too.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand font-semibold flex items-center justify-center text-[10px]">
                    7
                  </span>
                  <span>
                    <strong>Drop it here.</strong> Save the file to disk, then drag it into
                    the upload box (or click to browse).
                  </span>
                </li>
              </ol>

              <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                We'll read the PDF and pre-fill the listing — you'll get a chance to review every field before publishing. We hold the PDF for 7 days so you can re-parse, then it's auto-deleted.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Drop zone (or selected file) */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!file && !isParsing) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        className={`relative block rounded-2xl border-2 border-dashed transition-all ${
          file || isParsing ? "cursor-default" : "cursor-pointer"
        } ${
          isDragOver
            ? "border-brand bg-brand/5"
            : file
              ? "border-brand/50 bg-brand/5"
              : "border-border bg-muted/20 hover:border-brand/50 hover:bg-brand/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onPick}
          className="sr-only"
          aria-label="Paragon Listing Detail Report PDF"
          disabled={!!file || isParsing}
        />

        {file ? (
          <div className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
              {isParsing ? (
                <Loader2 className="h-6 w-6 text-brand animate-spin" />
              ) : (
                <FileText className="h-6 w-6 text-brand" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {isParsing
                  ? "Reading the PDF — this takes 15–30 seconds…"
                  : `${formatBytes(file.size)} · PDF · ready to import`}
              </p>
            </div>
            {!isParsing && (
              <>
                <CheckCircle2 className="h-5 w-5 text-brand shrink-0" aria-hidden="true" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    reset();
                  }}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-brand" />
            </div>
            <p className="text-sm font-semibold">Drop your Paragon PDF here</p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse · PDF only · max 15 MB
            </p>
          </div>
        )}
      </label>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* Continue */}
      <Button
        onClick={onContinue}
        disabled={!file || isParsing}
        className="w-full h-12 text-base font-semibold bg-brand shadow-lg rounded-xl gap-2"
        size="lg"
      >
        {isParsing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Reading PDF…
          </>
        ) : file ? (
          <>
            Continue to review <ArrowRight className="h-5 w-5" />
          </>
        ) : (
          "Upload a PDF to continue"
        )}
      </Button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
