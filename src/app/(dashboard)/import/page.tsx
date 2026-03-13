"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X } from "lucide-react";
import * as XLSX from "xlsx";

type ImportedRow = {
  address: string;
  listPrice?: number;
  mlsNumber?: string;
  lockboxCode?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  status?: string;
  notes?: string;
};

type ImportResult = {
  success: number;
  errors: string[];
};

export default function ImportPage() {
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function parseXlsx(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const mapped: ImportedRow[] = json.map((r) => ({
        address:      String(r["Address"] ?? r["address"] ?? r["Property Address"] ?? ""),
        listPrice:    parseFloat(String(r["List Price"] ?? r["listPrice"] ?? 0)) || undefined,
        mlsNumber:    String(r["MLS #"] ?? r["MLS Number"] ?? r["mlsNumber"] ?? ""),
        lockboxCode:  String(r["Lockbox"] ?? r["Lockbox Code"] ?? r["lockboxCode"] ?? "0000"),
        sellerName:   String(r["Seller"] ?? r["Seller Name"] ?? r["sellerName"] ?? ""),
        sellerPhone:  String(r["Seller Phone"] ?? r["sellerPhone"] ?? ""),
        sellerEmail:  String(r["Seller Email"] ?? r["sellerEmail"] ?? ""),
        status:       String(r["Status"] ?? r["status"] ?? "active").toLowerCase(),
        notes:        String(r["Notes"] ?? r["notes"] ?? ""),
      })).filter((r) => r.address);

      setRows(mapped);
      setResult(null);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    parseXlsx(file);
  }

  async function importToSupabase() {
    setImporting(true);
    const errors: string[] = [];
    let success = 0;

    for (const row of rows) {
      try {
        const res = await fetch("/api/import-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        if (!res.ok) {
          const e = await res.json();
          errors.push(`${row.address}: ${e.error ?? res.statusText}`);
        } else {
          success++;
        }
      } catch (e) {
        errors.push(`${row.address}: Network error`);
      }
    }

    setResult({ success, errors });
    setImporting(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Excel Import</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bulk-import listings from an Excel spreadsheet. Download the template to get started.
        </p>
      </div>

      {/* Template download */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold">Excel Template</p>
              <p className="text-xs text-muted-foreground">
                Columns: Address, List Price, MLS #, Lockbox, Seller Name, Seller Phone, Seller Email, Status, Notes
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadTemplate()}
            className="shrink-0"
          >
            ⬇ Download Template
          </Button>
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card>
        <CardContent className="p-8">
          <div
            className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">
              {fileName ? `📊 ${fileName}` : "Click to upload your Excel file"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls files</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview table */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              Preview — {rows.length} listings found
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setRows([]); setFileName(""); setResult(null); }}
              >
                <X className="h-4 w-4" /> Clear
              </Button>
              <Button size="sm" onClick={importToSupabase} disabled={importing}>
                {importing ? "Importing…" : `Import ${rows.length} Listings`}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Address", "Price", "MLS #", "Seller", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-2 font-semibold text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium">{row.address}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {row.listPrice
                          ? row.listPrice.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{row.mlsNumber || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{row.sellerName || "—"}</td>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className={
                            row.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : row.status === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {row.status ?? "active"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardContent className="p-5 space-y-2">
            {result.success > 0 && (
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">{result.success} listings imported successfully</span>
              </div>
            )}
            {result.errors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {err}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Address", "List Price", "MLS #", "Lockbox", "Seller Name", "Seller Phone", "Seller Email", "Status", "Notes"],
    ["123 Main St, Surrey, BC V3S 1A1", 1250000, "R2900000", "1234", "John Smith", "604-555-0100", "john@email.com", "active", ""],
    ["456 Oak Ave, Burnaby, BC V5H 2B2", 890000, "R2900001", "5678", "Jane Doe", "604-555-0200", "jane@email.com", "active", ""],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Listings");
  XLSX.writeFile(wb, "ListingFlow_Import_Template.xlsx");
}
