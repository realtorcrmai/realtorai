"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Known column name mappings for fuzzy matching
const COLUMN_MAP: Record<string, string> = {
  "name": "name", "full name": "name", "full_name": "name", "contact name": "name",
  "first name": "first_name", "first_name": "first_name", "firstname": "first_name",
  "last name": "last_name", "last_name": "last_name", "lastname": "last_name",
  "email": "email", "e-mail": "email", "email address": "email", "email_address": "email",
  "phone": "phone", "mobile": "phone", "cell": "phone", "telephone": "phone", "phone number": "phone",
  "type": "type", "category": "type", "contact type": "type",
  "notes": "notes", "note": "notes", "comments": "notes",
};

const CRM_FIELDS = ["name", "first_name", "last_name", "email", "phone", "type", "notes", "ignore"];

interface CSVImportStepProps {
  onImported: (count: number) => void;
  onSkip?: () => void;
}

/**
 * CSV Import step for onboarding (O5).
 * Drag-drop → parse → column mapping → preview → import.
 */
export function CSVImportStep({ onImported, onSkip }: CSVImportStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  // Parse CSV client-side (simple parser — handles quotes and commas)
  const parseCSV = useCallback((text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { setError("No data found. Please check your file."); return; }

    // Simple CSV parse (handles quoted fields)
    const parseLine = (line: string) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; }
        else { current += char; }
      }
      result.push(current.trim());
      return result;
    };

    const hdrs = parseLine(lines[0]);
    const dataRows = lines.slice(1).map(parseLine);

    if (dataRows.length > 5000) {
      setError("Import limited to 5000 contacts. Please split your file.");
      return;
    }

    // Auto-map columns
    const autoMap: Record<string, string> = {};
    hdrs.forEach((h) => {
      const normalized = h.toLowerCase().trim();
      if (COLUMN_MAP[normalized]) {
        autoMap[h] = COLUMN_MAP[normalized];
      }
    });

    setHeaders(hdrs);
    setRows(dataRows);
    setMapping(autoMap);
    setError("");
  }, []);

  // Handle file drop/select
  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target?.result as string);
    reader.readAsText(f);
  };

  // Import mapped contacts
  const handleImport = async () => {
    setImporting(true);
    setError("");

    // Build contacts from mapping
    const contacts = rows.map((row) => {
      const contact: Record<string, string> = {};
      headers.forEach((h, i) => {
        const field = mapping[h];
        if (field && field !== "ignore" && row[i]) {
          contact[field] = row[i];
        }
      });
      // Combine first_name + last_name if no "name" field
      if (!contact.name && (contact.first_name || contact.last_name)) {
        contact.name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
      }
      return contact;
    }).filter((c) => c.name || c.email); // At least name or email required

    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts, source: "csv_import" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        onImported(data.imported || contacts.length);
      }
    } catch {
      setError("Import failed. Please try again.");
    }
    setImporting(false);
  };

  // No file yet — show drop zone
  if (!file || headers.length === 0) {
    return (
      <div className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary transition-colors cursor-pointer bg-gray-50/50"
          onClick={() => document.getElementById("csv-input")?.click()}
        >
          <Upload className="h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-600">
            Drop your CSV file here, or click to browse
          </p>
          <p className="text-xs text-gray-400">Supports .csv files up to 5000 contacts</p>
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    );
  }

  // File loaded — show column mapping + preview
  const noEmailWarning = !Object.values(mapping).includes("email");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <FileText className="h-4 w-4 text-primary" />
        <span className="font-medium">{file.name}</span>
        <span className="text-muted-foreground">— {rows.length} contacts</span>
        <button onClick={() => { setFile(null); setHeaders([]); setRows([]); }} className="ml-auto text-xs text-muted-foreground hover:underline">
          Change file
        </button>
      </div>

      {/* Column mapping */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Map your columns:</p>
        <div className="grid gap-2">
          {headers.map((h) => (
            <div key={h} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-32 truncate" title={h}>{h}</span>
              <span className="text-xs text-muted-foreground">→</span>
              <select
                value={mapping[h] || "ignore"}
                onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                className={`flex-1 h-8 rounded border text-xs px-2 ${
                  mapping[h] && mapping[h] !== "ignore" ? "border-green-300 bg-green-50" : "border-gray-200"
                }`}
              >
                <option value="ignore">— Ignore —</option>
                {CRM_FIELDS.filter((f) => f !== "ignore").map((f) => (
                  <option key={f} value={f}>{f.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {noEmailWarning && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          No email column detected — contacts without email can&apos;t receive newsletters
        </div>
      )}

      {/* Preview first 3 rows */}
      <div className="text-xs">
        <p className="font-medium mb-1">Preview (first 3):</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                {headers.filter((h) => mapping[h] && mapping[h] !== "ignore").map((h) => (
                  <th key={h} className="px-2 py-1 text-muted-foreground">{mapping[h]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 3).map((row, i) => (
                <tr key={i} className="border-b border-dashed">
                  {headers.map((h, j) => mapping[h] && mapping[h] !== "ignore" ? (
                    <td key={j} className="px-2 py-1 truncate max-w-[120px]">{row[j]}</td>
                  ) : null)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Button onClick={handleImport} disabled={importing} className="w-full">
        {importing ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</>
        ) : (
          <><Check className="h-4 w-4 mr-2" /> Import {rows.length} contacts</>
        )}
      </Button>
      {onSkip && (
        <button
          onClick={onSkip}
          className="w-full text-xs text-muted-foreground hover:underline text-center mt-2"
        >
          Continue without importing
        </button>
      )}
    </div>
  );
}
