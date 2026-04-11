"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

// Contact Picker API — only available on iOS Safari 14.5+ and Chrome on Android
interface ContactAddress { city?: string; region?: string; country?: string; postalCode?: string; streetAddress?: string; }
interface NativeContact { name?: string[]; tel?: string[]; email?: string[]; address?: ContactAddress[]; }
interface ContactsManager {
  select(props: string[], opts?: { multiple?: boolean }): Promise<NativeContact[]>;
  getProperties(): Promise<string[]>;
}
declare global { interface Navigator { contacts?: ContactsManager; } }

const IMPORT_SOURCES = [
  {
    id: "google",
    label: "Google Contacts",
    icon: "📱",
    desc: "Pick directly from your Gmail / Google account",
    href: "/contacts/import-gmail",
    badge: "Picker",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    id: "apple",
    label: "Apple / vCard",
    icon: "🍎",
    desc: "Export .vcf from Contacts app, Outlook, or iCloud",
    href: null, // handled inline (file upload below)
    badge: "File upload",
    badgeColor: "bg-gray-100 text-gray-600",
  },
  {
    id: "csv",
    label: "CSV Spreadsheet",
    icon: "📋",
    desc: "From any CRM, spreadsheet, or custom export",
    href: null, // handled inline
    badge: "File upload",
    badgeColor: "bg-gray-100 text-gray-600",
  },
];

interface ImportResult {
  ok: boolean;
  imported: number;
  skipped: number;
  referrals_linked: number;
  families_linked: number;
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
  referred_by?: string;
  family_of?: string;
  family_relationship?: string;
}

type FileType = "csv" | "vcf";

export default function ContactImportPage() {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>("csv");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [pickerSupported, setPickerSupported] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Detect Contact Picker API support (iOS Safari 14.5+ / Chrome Android)
  useEffect(() => {
    setPickerSupported(
      typeof navigator !== "undefined" &&
      "contacts" in navigator &&
      typeof navigator.contacts?.select === "function"
    );
  }, []);

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

    const emailIdx      = headerRow.indexOf("email");
    const typeIdx       = headerRow.indexOf("type");
    const notesIdx      = headerRow.indexOf("notes");
    const addressIdx    = headerRow.indexOf("address");
    const sourceIdx     = headerRow.indexOf("source");
    const referredByIdx = headerRow.indexOf("referred_by");
    const familyOfIdx   = headerRow.indexOf("family_of");
    const familyRelIdx  = headerRow.indexOf("family_relationship");

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVRow(lines[i]);
      const name = cols[nameIdx]?.trim();
      const phone = cols[phoneIdx]?.trim();
      if (!name || !phone) continue;

      rows.push({
        name,
        phone,
        email:               emailIdx      >= 0 ? cols[emailIdx]?.trim()      || undefined : undefined,
        type:                typeIdx       >= 0 ? cols[typeIdx]?.trim()        || undefined : undefined,
        notes:               notesIdx      >= 0 ? cols[notesIdx]?.trim()       || undefined : undefined,
        address:             addressIdx    >= 0 ? cols[addressIdx]?.trim()     || undefined : undefined,
        source:              sourceIdx     >= 0 ? cols[sourceIdx]?.trim()      || undefined : undefined,
        referred_by:         referredByIdx >= 0 ? cols[referredByIdx]?.trim()  || undefined : undefined,
        family_of:           familyOfIdx   >= 0 ? cols[familyOfIdx]?.trim()    || undefined : undefined,
        family_relationship: familyRelIdx  >= 0 ? cols[familyRelIdx]?.trim()   || undefined : undefined,
      });
    }

    setHeaders(headerRow);
    setRawLines(lines);
    setParsedRows(rows);
    setError("");
    setStep("preview");
  }, []);

  const parseVCF = useCallback((text: string) => {
    if (!text.toUpperCase().includes("BEGIN:VCARD")) {
      setError("Invalid vCard file — no BEGIN:VCARD found");
      return;
    }

    // Client-side preview parsing (simplified)
    const blocks = text.split(/BEGIN:VCARD/i).slice(1);
    const rows: ParsedRow[] = [];

    for (const block of blocks) {
      const lines = block.split(/\r?\n/).filter((l) => l.trim());
      let name = "";
      let phone = "";
      let email = "";
      let address = "";
      let org = "";
      let notes = "";

      for (const line of lines) {
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;
        const left = line.substring(0, colonIdx);
        const value = line.substring(colonIdx + 1);
        const prop = left.split(";")[0].toUpperCase().trim();

        if (prop === "FN" && !name) name = value.trim();
        if (prop === "TEL" && !phone) phone = value.replace(/[^\d+]/g, "");
        if (prop === "EMAIL" && !email) email = value.trim();
        if (prop === "ORG" && !org) org = value.split(";")[0].trim();
        if (prop === "NOTE" && !notes) notes = value.trim();
        if (prop === "ADR" && !address) {
          const parts = value.split(";").map((p) => p.trim());
          address = [parts[2], parts[3], parts[4], parts[5], parts[6]]
            .filter(Boolean)
            .join(", ");
        }
      }

      if (name.trim()) {
        rows.push({
          name: name.trim(),
          phone,
          email: email || undefined,
          address: address || undefined,
          notes: [notes, org ? `Org: ${org}` : ""].filter(Boolean).join(" | ") || undefined,
        });
      }
    }

    if (rows.length === 0) {
      setError("No contacts found in vCard file");
      return;
    }

    setHeaders(["name", "phone", "email", "address", "notes"]);
    setRawLines([]);
    setParsedRows(rows);
    setError("");
    setStep("preview");
  }, []);

  const handleNativePicker = useCallback(async () => {
    if (!navigator.contacts) return;
    setPickerLoading(true);
    setError("");
    try {
      const available = await navigator.contacts.getProperties();
      const props = (["name", "tel", "email", "address"] as const).filter((p) =>
        available.includes(p)
      );
      const picked: NativeContact[] = await navigator.contacts.select(props, { multiple: true });
      if (!picked || picked.length === 0) {
        setPickerLoading(false);
        return;
      }

      const rows: ParsedRow[] = picked.map((c) => {
        const addrObj = c.address?.[0];
        const addrParts = addrObj
          ? [addrObj.streetAddress, addrObj.city, addrObj.region, addrObj.postalCode, addrObj.country]
              .filter(Boolean)
              .join(", ")
          : undefined;
        return {
          name:    c.name?.[0]?.trim()  || "Unknown",
          phone:   c.tel?.[0]?.replace(/[^\d+]/g, "") || "",
          email:   c.email?.[0]?.trim() || undefined,
          address: addrParts            || undefined,
          source:  "native_contacts",
        };
      }).filter((r) => r.name !== "Unknown" || r.phone);

      if (rows.length === 0) {
        setError("No usable contacts found (need at least a name or phone)");
        setPickerLoading(false);
        return;
      }

      setHeaders(["name", "phone", "email", "address"]);
      setRawLines([]);
      setFile(null);
      setFileType("csv"); // native contacts go through the same CSV import endpoint
      setParsedRows(rows);
      setStep("preview");
    } catch (err: unknown) {
      // User cancelled — no error
      if (err instanceof Error && err.name !== "AbortError") {
        setError("Could not access contacts. Please check permissions.");
      }
    }
    setPickerLoading(false);
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();

    if (ext !== "csv" && ext !== "vcf") {
      setError("Please upload a .csv or .vcf file");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File too large (max 10MB)");
      return;
    }

    const type: FileType = ext === "vcf" ? "vcf" : "csv";
    setFile(selectedFile);
    setFileType(type);
    setError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (type === "vcf") {
        parseVCF(text);
      } else {
        parseCSV(text);
      }
    };
    reader.readAsText(selectedFile);
  }, [parseCSV, parseVCF]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!file && parsedRows.length === 0) return;
    setStep("importing");
    setError("");

    try {
      let res: Response;

      if (!file) {
        // Native Contact Picker path — POST JSON rows directly
        res = await fetch("/api/contacts/import-native", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts: parsedRows }),
        });
      } else {
        const formData = new FormData();
        formData.append("file", file);
        const endpoint = fileType === "vcf" ? "/api/contacts/import-vcard" : "/api/contacts/import";
        res = await fetch(endpoint, { method: "POST", body: formData });
      }

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
    setFileType("csv");
    setParsedRows([]);
    setHeaders([]);
    setRawLines([]);
    setResult(null);
    setError("");
  };

  const contactsWithPhone = parsedRows.filter((r) => r.phone);
  const contactsWithoutPhone = parsedRows.length - contactsWithPhone.length;

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
          <p className="text-sm text-[var(--lf-text)]/60">Upload a CSV or vCard (.vcf) file to bulk import contacts</p>
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
        <div className="space-y-4">
          {/* Source selector */}
          <div className="grid grid-cols-3 gap-3">
            {IMPORT_SOURCES.map((src) => (
              src.href ? (
                <Link
                  key={src.id}
                  href={src.href}
                  className="lf-card p-4 flex flex-col gap-2 hover:border-[var(--lf-indigo)]/50 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{src.icon}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${src.badgeColor}`}>
                      {src.badge}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm group-hover:text-[var(--lf-indigo)] transition-colors">
                      {src.label}
                    </div>
                    <div className="text-xs text-[var(--lf-text)]/50 mt-0.5">{src.desc}</div>
                  </div>
                </Link>
              ) : src.id === "apple" ? (
                <div key={src.id} className="lf-card p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{src.icon}</span>
                    {pickerSupported ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                        Native
                      </span>
                    ) : (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${src.badgeColor}`}>
                        {src.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{src.label}</div>
                    <div className="text-xs text-[var(--lf-text)]/50 mt-0.5">
                      {pickerSupported
                        ? "Tap to pick contacts directly from your device"
                        : src.desc}
                    </div>
                  </div>
                  {pickerSupported && (
                    <button
                      onClick={handleNativePicker}
                      disabled={pickerLoading}
                      className="mt-1 w-full lf-btn text-xs py-1.5 disabled:opacity-50"
                    >
                      {pickerLoading ? "Opening..." : "📲 Pick Contacts"}
                    </button>
                  )}
                </div>
              ) : (
                <div key={src.id} className="lf-card p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{src.icon}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${src.badgeColor}`}>
                      {src.badge}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{src.label}</div>
                    <div className="text-xs text-[var(--lf-text)]/50 mt-0.5">{src.desc}</div>
                  </div>
                </div>
              )
            ))}
          </div>

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
              Drag and drop your file here
            </p>
            <p className="text-xs text-gray-500 mb-4">Supports .csv and .vcf (vCard) files — max 10MB</p>
            <input
              type="file"
              accept=".csv,.vcf"
              className="hidden"
              id="file-upload"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <label
              htmlFor="file-upload"
              className="lf-btn cursor-pointer text-sm inline-block"
            >
              Choose File
            </label>
          </div>

          {/* Format Guide */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CSV Guide */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold mb-2">📋 CSV Format</h3>
              <p className="text-xs text-gray-600 mb-1">Required: <strong>name</strong>, <strong>phone</strong></p>
              <p className="text-xs text-gray-600 mb-1">Optional: email, type, notes, address, source</p>
              <p className="text-xs text-gray-600 mb-3">
                References:{" "}
                <span className="font-medium text-amber-700">referred_by</span>{" "}
                <span className="font-medium text-rose-700">family_of</span>{" "}
                <span className="font-medium text-rose-700">family_relationship</span>
              </p>
              <div className="bg-white rounded border p-2 font-mono text-[10px] overflow-x-auto text-gray-700 leading-5">
                <div className="text-gray-400">name,phone,type,referred_by,family_of,family_relationship</div>
                <div>Sarah Johnson,604-555-1234,buyer,,,</div>
                <div>Mike Johnson,604-555-5678,buyer,,Sarah Johnson,spouse</div>
                <div>Emma Johnson,604-555-9999,buyer,,Sarah Johnson,child</div>
                <div>David Lee,778-555-1111,buyer,Sarah Johnson,,</div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                <strong>referred_by</strong> — name or phone of who referred this contact<br/>
                <strong>family_of</strong> — name or phone of the primary contact<br/>
                <strong>family_relationship</strong> — spouse · child · parent · sibling · other
              </p>
              <a
                href={`data:text/csv;charset=utf-8,name,phone,email,type,notes,referred_by,family_of,family_relationship%0ASarah Johnson,604-555-1234,sarah@email.com,buyer,Primary contact,,,,%0AMike Johnson,604-555-5678,,buyer,,, Sarah Johnson,spouse%0AEmma Johnson,778-555-9999,,buyer,,,Sarah Johnson,child%0ADavid Lee,778-555-1111,,buyer,,Sarah Johnson,,`}
                download="contacts_template.csv"
                className="inline-block mt-3 text-xs text-[var(--lf-indigo)] hover:underline"
              >
                ⬇️ Download CSV template (with family columns)
              </a>
            </div>

            {/* vCard Guide */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold mb-2">📇 vCard (.vcf) Format</h3>
              <p className="text-xs text-gray-600 mb-2">Export from <strong>Apple Contacts</strong>, Outlook, or Google</p>
              <p className="text-xs text-gray-600 mb-3">Supports vCard 2.1, 3.0, and 4.0</p>
              <div className="bg-white rounded border p-3 text-xs space-y-2">
                <div>
                  <span className="font-semibold"> Apple:</span>
                  <span className="text-gray-600"> Contacts → Select All → File → Export → Export vCard</span>
                </div>
                <div>
                  <span className="font-semibold"> iPhone:</span>
                  <span className="text-gray-600"> iCloud.com → Contacts → Select → Export vCard</span>
                </div>
                <div>
                  <span className="font-semibold"> Outlook:</span>
                  <span className="text-gray-600"> People → Select → Save as vCard</span>
                </div>
                <div>
                  <span className="font-semibold"> Google:</span>
                  <span className="text-gray-600"> contacts.google.com → Export → vCard</span>
                </div>
              </div>
            </div>
          </div>
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
                File: {file?.name} ({fileType.toUpperCase()})
                {contactsWithoutPhone > 0 && (
                  <span className="text-amber-600 ml-2">
                    · {contactsWithoutPhone} without phone (will be skipped)
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="lf-btn-ghost text-sm px-3 py-1.5">
                ← Change File
              </button>
              <button onClick={handleImport} className="lf-btn text-sm px-4 py-1.5">
                ✅ Import {contactsWithPhone.length} Contacts
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 bg-amber-50">Referred By</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 bg-rose-50">Family Of</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 bg-rose-50">Relationship</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 50).map((row, i) => (
                  <tr key={i} className={`border-b hover:bg-gray-50 ${!row.phone ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-gray-600">{row.phone || <span className="text-amber-500 text-xs">No phone</span>}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{row.type || "buyer"}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{row.email || "—"}</td>
                    <td className="px-3 py-2 text-xs bg-amber-50/40">
                      {row.referred_by
                        ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">🔗 {row.referred_by}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs bg-rose-50/40">
                      {row.family_of
                        ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">👨‍👩‍👧 {row.family_of}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs bg-rose-50/40">
                      {row.family_relationship
                        ? <span className="capitalize text-rose-600">{row.family_relationship}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs max-w-[160px] truncate">{row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 50 && (
              <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 text-center">
                Showing first 50 of {parsedRows.length} contacts
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
          <p className="text-sm text-gray-500">Processing {contactsWithPhone.length} contacts. This may take a moment.</p>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && result && (
        <div className="lf-card p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold mb-2">Import Complete</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto my-6">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{result.imported}</div>
              <div className="text-xs text-green-600">Imported</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{result.skipped}</div>
              <div className="text-xs text-yellow-600">Skipped</div>
            </div>
            {(result.referrals_linked ?? 0) > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-700">{result.referrals_linked}</div>
                <div className="text-xs text-amber-600">Referrals linked</div>
              </div>
            )}
            {(result.families_linked ?? 0) > 0 && (
              <div className="p-3 bg-rose-50 rounded-lg">
                <div className="text-2xl font-bold text-rose-700">{result.families_linked}</div>
                <div className="text-xs text-rose-600">Family links</div>
              </div>
            )}
          </div>

          {result.skipped > 0 && (
            <p className="text-xs text-gray-500 mb-2">
              Skipped contacts had no phone number or duplicates
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
