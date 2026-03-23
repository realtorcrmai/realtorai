"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "./pdf-editor.css";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Download,
  Printer,
  Loader2,
  RotateCcw,
  FileCheck,
  Clock,
} from "lucide-react";
import type { FormTemplate, FormSubmission } from "@/types";
import { formatDistanceToNow } from "date-fns";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFFormEditorProps {
  listingId: string;
  formKey: string;
  template: FormTemplate;
  listingAddress: string;
  existingDraft: FormSubmission | null;
}

export function PDFFormEditor({
  listingId,
  formKey,
  template,
  listingAddress,
  existingDraft,
}: PDFFormEditorProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(
    existingDraft ? new Date(existingDraft.updated_at) : null
  );
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load pre-filled PDF on mount
  useEffect(() => {
    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/forms/fill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, formKey }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server returned ${res.status}`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error("[PDFFormEditor] Load error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load form"
        );
      } finally {
        setLoading(false);
      }
    }
    loadPdf();

    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, formKey]);

  /**
   * Extract current field values from the PDF.js annotation layer DOM.
   * PDF.js renders AcroForm fields as HTML inputs/selects in .annotationLayer.
   */
  const extractFieldValues = useCallback((): Record<
    string,
    string | boolean
  > => {
    const values: Record<string, string | boolean> = {};
    if (!containerRef.current) return values;

    const inputs = containerRef.current.querySelectorAll(
      ".annotationLayer input, .annotationLayer textarea, .annotationLayer select"
    );

    inputs.forEach((el) => {
      const name = el.getAttribute("name");
      if (!name) return;

      if (el instanceof HTMLInputElement) {
        if (el.type === "checkbox" || el.type === "radio") {
          values[name] = el.checked;
        } else {
          values[name] = el.value;
        }
      } else if (el instanceof HTMLTextAreaElement) {
        values[name] = el.value;
      } else if (el instanceof HTMLSelectElement) {
        values[name] = el.value;
      }
    });

    return values;
  }, []);

  /**
   * Save draft — extract field values and POST to /api/forms/save
   */
  const saveDraft = useCallback(
    async (silent = false) => {
      const formData = extractFieldValues();
      if (Object.keys(formData).length === 0 && !silent) {
        toast.info("No form fields to save");
        return;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/forms/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, formKey, formData }),
        });

        if (!res.ok) throw new Error("Save failed");

        const { savedAt } = await res.json();
        setLastSaved(new Date(savedAt));

        if (!silent) {
          toast.success("Draft saved");
        }
      } catch (err) {
        console.error("[PDFFormEditor] Save error:", err);
        if (!silent) {
          toast.error("Failed to save draft");
        }
      } finally {
        setSaving(false);
      }
    },
    [listingId, formKey, extractFieldValues]
  );

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveDraft(true); // silent auto-save
    }, 30_000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  /**
   * Complete & Download — flatten PDF, save to storage, download
   */
  async function completeForm() {
    const formData = extractFieldValues();
    setCompleting(true);

    try {
      const res = await fetch("/api/forms/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, formKey, formData }),
      });

      if (!res.ok) throw new Error("Complete failed");

      const { pdfUrl: downloadUrl, fileName } = await res.json();

      // Trigger download
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Form completed and saved! PDF downloading...");

      // Refresh the router to update status badges
      router.refresh();
    } catch (err) {
      console.error("[PDFFormEditor] Complete error:", err);
      toast.error("Failed to complete form");
    } finally {
      setCompleting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleBack() {
    // Save before leaving
    saveDraft(true);
    router.back();
  }

  async function resetToDefaults() {
    if (
      !confirm(
        "Reset all fields to their original CRM data? Your draft edits will be lost."
      )
    ) {
      return;
    }

    // Delete the draft
    try {
      const supabaseRes = await fetch("/api/forms/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          formKey,
          formData: {}, // empty = no draft
        }),
      });
      if (supabaseRes.ok) {
        // Reload the PDF with fresh CRM data
        setLoading(true);
        const res = await fetch("/api/forms/fill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, formKey }),
        });
        if (res.ok) {
          const blob = await res.blob();
          if (pdfUrl) URL.revokeObjectURL(pdfUrl);
          setPdfUrl(URL.createObjectURL(blob));
          setLastSaved(null);
          toast.success("Form reset to CRM data");
        }
        setLoading(false);
      }
    } catch {
      toast.error("Failed to reset form");
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Toolbar */}
      <div className="pdf-editor-toolbar sticky top-0 z-10 flex items-center justify-between gap-4 px-4 md:px-6 py-3 bg-card border-b shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-semibold truncate">
              {template.form_name}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {listingAddress}
            </p>
          </div>
          {existingDraft?.status === "completed" && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 shrink-0">
              <FileCheck className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastSaved && (
            <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Saved{" "}
              {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            title="Reset to CRM data"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveDraft(false)}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            <span className="hidden md:inline">Print</span>
          </Button>
          <Button
            size="sm"
            onClick={completeForm}
            disabled={completing}
            className="bg-primary text-primary-foreground"
          >
            {completing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Complete
          </Button>
        </div>
      </div>

      {/* Draft banner */}
      {existingDraft && existingDraft.status === "draft" && (
        <div className="pdf-editor-draft-banner flex items-center gap-2 px-6 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-700">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Continuing from draft saved{" "}
            {formatDistanceToNow(new Date(existingDraft.updated_at), {
              addSuffix: true,
            })}
          </span>
          <Button
            variant="link"
            size="sm"
            className="text-amber-700 underline p-0 h-auto"
            onClick={resetToDefaults}
          >
            Reset to CRM data
          </Button>
        </div>
      )}

      {/* PDF Viewer Area */}
      <div
        ref={containerRef}
        className="pdf-editor-container flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6"
      >
        <div className="max-w-[850px] mx-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading form...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetch("/api/forms/fill", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ listingId, formKey }),
                  })
                    .then((res) => res.blob())
                    .then((blob) => {
                      setPdfUrl(URL.createObjectURL(blob));
                      setLoading(false);
                    })
                    .catch(() => {
                      setError("Still unable to load form");
                      setLoading(false);
                    });
                }}
              >
                Retry
              </Button>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={(err) => {
                console.error("[PDFFormEditor] PDF load error:", err);
                setError("Failed to render PDF");
              }}
              loading={
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }
            >
              {Array.from({ length: numPages }, (_, i) => (
                <Page
                  key={i}
                  pageNumber={i + 1}
                  width={800}
                  renderAnnotationLayer={true}
                  renderForms={true}
                  renderTextLayer={true}
                  className="mb-4"
                />
              ))}
            </Document>
          )}

          {/* No template state */}
          {!pdfUrl && !loading && !error && (
            <div className="flex flex-col items-center justify-center h-96 gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                No PDF template found for this form.
              </p>
              <p className="text-xs text-muted-foreground">
                Upload a template from the{" "}
                <a
                  href="/forms/templates"
                  className="text-primary underline"
                >
                  Form Templates
                </a>{" "}
                page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
