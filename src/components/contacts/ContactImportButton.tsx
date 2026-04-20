"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Import contacts button + modal for the contacts page.
 * Supports: CSV (server-parsed with phone dedup), vCard, Google CSV.
 * Uses the FormData import path which already handles duplicate detection by phone.
 */
export function ContactImportButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);
  const vcfRef = useRef<HTMLInputElement>(null);

  function reset() {
    setResult(null);
    setError("");
    setImporting(false);
  }

  function handleClose() {
    setOpen(false);
    reset();
    if (result && result.imported > 0) {
      router.refresh();
    }
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/contacts/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setResult({ imported: data.imported || 0, skipped: data.skipped || 0 });
      }
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setImporting(false);
      if (csvRef.current) csvRef.current.value = "";
    }
  }

  async function handleVCardUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/contacts/import-vcard", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setResult({ imported: data.imported || 0, skipped: data.skipped || 0 });
      }
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setImporting(false);
      if (vcfRef.current) vcfRef.current.value = "";
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Upload className="h-4 w-4" />
        Import
      </Button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Import Contacts</h2>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Success state */}
          {result && (
            <div className="text-center space-y-3 py-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
                <Check className="h-7 w-7 text-success" />
              </div>
              <p className="text-lg font-semibold">{result.imported} contacts imported</p>
              {result.skipped > 0 && (
                <p className="text-sm text-muted-foreground">
                  {result.skipped} skipped (duplicates or missing data)
                </p>
              )}
              <Button onClick={handleClose} className="bg-brand text-white hover:bg-brand/90">
                Done
              </Button>
            </div>
          )}

          {/* Error state */}
          {error && !result && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Upload options */}
          {!result && (
            <>
              {importing ? (
                <div className="text-center py-8 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto" />
                  <p className="text-sm text-muted-foreground">Importing contacts...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload a file to add contacts. Duplicates are automatically skipped (matched by phone number).
                  </p>

                  {/* CSV option */}
                  <label className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-brand hover:bg-brand/5 transition-colors cursor-pointer">
                    <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-brand" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">CSV File</p>
                      <p className="text-xs text-muted-foreground">Requires &apos;name&apos; and &apos;phone&apos; columns</p>
                    </div>
                    <input ref={csvRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                  </label>

                  {/* vCard option */}
                  <label className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-brand hover:bg-brand/5 transition-colors cursor-pointer">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <Upload className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">vCard / VCF</p>
                      <p className="text-xs text-muted-foreground">From iPhone, iCloud, or Outlook</p>
                    </div>
                    <input ref={vcfRef} type="file" accept=".vcf" onChange={handleVCardUpload} className="hidden" />
                  </label>

                  {/* Google CSV option */}
                  <label className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-brand hover:bg-brand/5 transition-colors cursor-pointer">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Google Contacts CSV</p>
                      <p className="text-xs text-muted-foreground">Export from contacts.google.com</p>
                    </div>
                    <input ref={csvRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                  </label>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
