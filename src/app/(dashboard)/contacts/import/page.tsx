"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface ImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
}

interface ParsedRow {
  name: string;
  phone: string;
  email?: string;
  type?: string;
  notes?: string;
  address?: string;
  source?: string;
}

export default function ContactImportPage() {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const parseCSV = useCallback((text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      setError("CSV must have a header row and at least 1 data row");
      return;
    }

    const headerRow = parseCSVRow(lines[0]).map((h) => h.trim().toLowerCase());
    const nameIdx = headerRow.indexOf("name");
    const phoneIdx = headerRow.indexOf("phone");

    if (nameIdx === -1 || phoneIdx === -1) {
      setError("CSV must have 'name' and 'phone' columns. Found: " + headerRow.join(", "));
      return;
    }

    const emailIdx = headerRow.indexOf("email");
    const typeIdx = headerRow.indexOf("type");
    const notesIdx = headerRow.indexOf("notes");
    const addressIdx = headerRow.indexOf("address");
    const sourceIdx = headerRow.indexOf("source");

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      const name = cols[nameIdx]?.trim();
      const phone = cols[phoneIdx]?.trim();
      if (!name || !phone) continue;

      rows.push({
        name,
        phone,
        email: emailIdx >= 0 ? cols[emailIdx]?.trim() : undefined,
        type: typeIdx >= 0 ? cols[typeIdx]?.trim() : undefined,
        notes: notesIdx >= 0 ? cols[notesIdx]?.trim() : undefined,
        address: addressIdx >= 0 ? cols[addressIdx]?.trim() : undefined,
        source: sourceIdx >= 0 ? cols[sourceIdx]?.trim() : undefined,
      });
    }

    setHeaders(headerRow);
    setRawLines(lines);
    setParsedRows(rows);
    setError("");
    setStep("preview");
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)");
      return;
    }
    setFile(selectedFile);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target?.result as string);
    reader.readAsText(selectedFile);
  }, [parseCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!file) return;
    setStep("importing");
    setError("");

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
        setStep("preview");
        return;
      }

      setResult(data);
      setStep("done");
    } catch {
      setError("Import failed. Please try again.");
      setStep("preview");
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setParsedRows([]);
    setHeaders([]);
    setRawLines([]);
    setResult(null);
    setError("");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/contacts" className="text-sm text-[var(--lf-text)]/50 hover:text-[var(--lf-text)]">
              ← Contacts
            </Link>
          </div>
          <h1 className="text-xl font-bold text-[var(--lf-text)]">📥 Import Contacts</h1>
          <p className="text-sm text-[var(--lf-text)]/60">Upload a CSV file to bulk import contacts into your CRM</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        {["Upload", "Preview", "Import"].map((label, i) => {
          const stepNum = i + 1;
          const current = step === "upload" ? 1 : step === "preview" ? 2 : 3;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                stepNum <= current ? "bg-[var(--lf-indigo)] text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {stepNum <= current && step === "done" && stepNum === 3 ? "✓" : stepNum}
              </div>
              <span className={`text-xs ${stepNum <= current ? "text-[var(--lf-text)]" : "text-gray-400"}`}>{label}</span>
              {i < 2 && <div className={`w-8 h-0.5 ${stepNum < current ? "bg-[var(--lf-indigo)]" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="lf-card p-8">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragOver ? "border-[var(--lf-indigo)] bg-[var(--lf-indigo)]/5" : "border-gray-300"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="text-4xl mb-3">📄</div>
            <p className="text-sm font-medium text-[var(--lf-text)] mb-1">
              Drag and drop your CSV file here
            </p>
            <p className="text-xs text-gray-500 mb-4">or click to browse (max 5MB)</p>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="csv-upload"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <label
              htmlFor="csv-upload"
              className="lf-btn cursor-pointer text-sm inline-block"
            >
              Choose File
            </label>
          </div>

          {/* CSV Format Guide */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">📋 CSV Format</h3>
            <p className="text-xs text-gray-600 mb-2">Required columns: <strong>name</strong>, <strong>phone</strong></p>
            <p className="text-xs text-gray-600 mb-3">Optional: email, type (buyer/seller/customer/agent/partner), notes, address, source</p>
            <div className="bg-white rounded border p-3 font-mono text-xs overflow-x-auto">
              <div className="text-gray-500">name,phone,email,type,notes</div>
              <div>Sarah Johnson,604-555-1234,sarah@email.com,buyer,Looking for 3BR in Kitsilano</div>
              <div>Mike Thompson,778-555-5678,mike@email.com,seller,Wants to list in March</div>
            </div>
            <a
              href="data:text/csv;charset=utf-8,name,phone,email,type,notes%0ASarah Johnson,604-555-1234,sarah@email.com,buyer,Looking for 3BR%0AMike Thompson,778-555-5678,mike@email.com,seller,Wants to list"
              download="contacts_template.csv"
              className="inline-block mt-3 text-xs text-[var(--lf-indigo)] hover:underline"
            >
              ⬇️ Download template CSV
            </a>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <div className="lf-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Preview ({parsedRows.length} contacts)</h2>
              <p className="text-xs text-gray-500">
                File: {file?.name} · Columns: {headers.join(", ")} · {rawLines.length - 1} rows
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="lf-btn-ghost text-sm px-3 py-1.5">
                ← Change File
              </button>
              <button onClick={handleImport} className="lf-btn text-sm px-4 py-1.5">
                ✅ Import {parsedRows.length} Contacts
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-gray-600">{row.phone}</td>
                    <td className="px-3 py-2 text-gray-600">{row.email || "—"}</td>
                    <td className="px-3 py-2">
                      <span className="lf-badge text-[10px]">{row.type || "buyer"}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">{row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 50 && (
              <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 text-center">
                Showing first 50 of {parsedRows.length} rows
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === "importing" && (
        <div className="lf-card p-12 text-center">
          <div className="text-4xl mb-4 animate-bounce">⏳</div>
          <h2 className="text-lg font-semibold mb-2">Importing contacts...</h2>
          <p className="text-sm text-gray-500">Processing {parsedRows.length} contacts. This may take a moment.</p>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && result && (
        <div className="lf-card p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold mb-2">Import Complete</h2>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto my-6">
            <div className="p-3 bg-[#0F7694]/5 rounded-lg">
              <div className="text-2xl font-bold text-[#0A6880]">{result.imported}</div>
              <div className="text-xs text-[#0F7694]">Imported</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{result.skipped}</div>
              <div className="text-xs text-yellow-600">Skipped</div>
            </div>
            <div className="p-3 bg-[#0F7694]/5 rounded-lg">
              <div className="text-2xl font-bold text-[#1a1535]">{result.total}</div>
              <div className="text-xs text-[#0F7694]">Total Rows</div>
            </div>
          </div>

          {result.skipped > 0 && (
            <p className="text-xs text-gray-500 mb-2">
              Skipped rows had missing data or duplicate phone numbers
            </p>
          )}

          {result.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-left">
              <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600">{err}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-center mt-6">
            <button onClick={reset} className="lf-btn-ghost text-sm px-4 py-2">
              Import More
            </button>
            <Link href="/contacts" className="lf-btn text-sm px-4 py-2">
              View Contacts →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { result.push(current); current = ""; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}
