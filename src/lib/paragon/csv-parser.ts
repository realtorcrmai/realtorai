// ============================================================
// Paragon "ML Default Spreadsheet" CSV parser.
//
// Realtors export this from Paragon when they want to bring in
// historical listing data (e.g. re-listing a property they sold
// 2 years ago — realtor.ca won't have it, but Paragon's
// "My Listings" view will).
//
// The CSV has fewer fields than the PDF Listing Detail Report
// (no bathrooms, no sqft, no description, no taxes), but it's
// instant and free to parse — no Claude vision call.
//
// We map the CSV row into the same ParagonParseResult shape the
// PDF parser produces, so the existing ParagonReviewStep UI and
// createListing flow work unchanged.
// ============================================================

import type { ParagonParseResult } from "./parse";

// Default column header → field key map. Header matching is
// case-insensitive and tolerant of leading/trailing whitespace.
const COLUMN_ALIASES: Record<string, string> = {
  "ml #": "mls_number",
  "ml#": "mls_number",
  "mls #": "mls_number",
  "mls#": "mls_number",
  "address": "address",
  "price": "list_price",
  "list price": "list_price",
  "tot br": "bedrooms",
  "br": "bedrooms",
  "bedrooms": "bedrooms",
  "tot bath": "bathrooms",
  "bath": "bathrooms",
  "bathrooms": "bathrooms",
  "yr blt": "year_built",
  "year built": "year_built",
  "lot sz(sf)": "lot_size",
  "lot sz": "lot_size",
  "lot size": "lot_size",
  "typedwel": "type_dwel",
  "type dwel": "type_dwel",
  "type of dwelling": "type_dwel",
  "prop type": "prop_type",
  "property type": "prop_type",
  "s/a": "sub_area",
  "sub area": "sub_area",
  "subarea": "sub_area",
  "status": "status",
  "tot sf": "sqft",
  "tot sqft": "sqft",
  "sqft": "sqft",
  "tot flr area": "sqft",
};

// Paragon TypeDwel codes → our internal property_type enum.
// Best-effort mapping; unknown codes fall back to null + low confidence.
const TYPE_DWEL_MAP: Record<string, ParagonParseResult["property_type"]["value"]> = {
  // Detached
  HOUSE: "Residential",
  SFD: "Residential",
  HOMEMM: "Residential",
  // Attached / Multi
  DUPXH: "Multi-Family",
  DUPXF: "Multi-Family",
  DUPLEX: "Multi-Family",
  MULT: "Multi-Family",
  MULTI: "Multi-Family",
  // Townhouse
  ROWBR: "Townhouse",
  TWNHS: "Townhouse",
  TWNH: "Townhouse",
  TH: "Townhouse",
  // Condo / Apartment
  APARTM: "Condo/Apartment",
  APTU: "Condo/Apartment",
  APT: "Condo/Apartment",
  CONDO: "Condo/Apartment",
  // Land
  LAND: "Land",
  LOT: "Land",
  // Commercial
  COMM: "Commercial",
  COM: "Commercial",
  // Manufactured / Mobile (best fit — system has no Mobile bucket)
  MANUM: "Residential",
  MOBHM: "Residential",
};

// Fallback: parse the human-readable "Prop Type" column when TypeDwel
// is unknown or absent. Less precise but more forgiving.
function propTypeFromText(s: string): ParagonParseResult["property_type"]["value"] {
  const t = s.toLowerCase();
  if (t.includes("attached") || t.includes("townhouse")) return "Townhouse";
  if (t.includes("apartment") || t.includes("condo")) return "Condo/Apartment";
  if (t.includes("multi") || t.includes("duplex")) return "Multi-Family";
  if (t.includes("commercial") || t.includes("retail") || t.includes("office")) return "Commercial";
  if (t.includes("land") || t.includes("lot") || t.includes("vacant")) return "Land";
  if (t.includes("residential") || t.includes("detached") || t.includes("house")) return "Residential";
  return null;
}

// ── CSV tokenizer (RFC 4180-ish: comma-separated, double-quoted, "" escapes) ──
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function toNumber(s: string | undefined | null): number | null {
  if (s == null) return null;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function emptyField<T>(): { value: T | null; confidence: number } {
  return { value: null, confidence: 0 };
}

function field<T>(value: T | null, confidence: number): { value: T | null; confidence: number } {
  return { value, confidence };
}

export interface CsvParseSuccess {
  parsed: ParagonParseResult;
  rowCount: number;
  warnings: string[];
}

export interface CsvParseError {
  error: string;
}

export type CsvParseResult = CsvParseSuccess | CsvParseError;

/**
 * Parse a Paragon ML Default Spreadsheet CSV string. Always uses the FIRST
 * data row when multiple are present (single-listing pre-fill flow).
 * Adds a warning for ignored rows so the UI can surface it.
 */
export function parseParagonCsv(text: string): CsvParseResult {
  if (!text || !text.trim()) {
    return { error: "CSV file is empty." };
  }

  const cleaned = stripBom(text).replace(/\r\n?/g, "\n").trim();
  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      error:
        "CSV has a header but no data rows. Re-export from Paragon with at least one listing selected.",
    };
  }

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);
  const colIndex: Record<string, number> = {};
  headerCells.forEach((h, i) => {
    const key = COLUMN_ALIASES[h];
    if (key && colIndex[key] == null) colIndex[key] = i;
  });

  // Need at least one of MLS# or address to be a useful import.
  if (colIndex.mls_number == null && colIndex.address == null) {
    return {
      error:
        "Couldn't recognize this CSV. Expected the Paragon 'ML Default Spreadsheet' format with at least an MLS # or Address column.",
    };
  }

  const dataRows = lines.slice(1).map(parseCsvLine);
  const row = dataRows[0];

  const get = (key: string): string => {
    const i = colIndex[key];
    if (i == null || i >= row.length) return "";
    return (row[i] ?? "").trim();
  };

  // ── Field extraction ─────────────────────────────────
  const rawAddress = get("address");
  const subArea = get("sub_area");
  // Append sub-area to bare street address when present — gives the
  // realtor a head start on city/province during review.
  const composedAddress =
    rawAddress && subArea && !rawAddress.toLowerCase().includes(subArea.toLowerCase())
      ? `${rawAddress}, ${subArea}`
      : rawAddress;

  const mlsNumber = get("mls_number");
  const price = toNumber(get("list_price"));
  const bedrooms = toNumber(get("bedrooms"));
  const bathrooms = toNumber(get("bathrooms"));
  const yearBuilt = toNumber(get("year_built"));
  const sqft = toNumber(get("sqft"));
  const lotSizeRaw = get("lot_size");

  const typeDwelRaw = get("type_dwel").toUpperCase();
  const propTypeRaw = get("prop_type");
  let propertyType: ParagonParseResult["property_type"]["value"] = null;
  let propertyTypeConfidence = 0;
  if (typeDwelRaw && TYPE_DWEL_MAP[typeDwelRaw] !== undefined) {
    propertyType = TYPE_DWEL_MAP[typeDwelRaw];
    propertyTypeConfidence = 0.95;
  } else if (propTypeRaw) {
    propertyType = propTypeFromText(propTypeRaw);
    propertyTypeConfidence = propertyType ? 0.7 : 0.2;
  }

  // ── Build ParagonParseResult ─────────────────────────
  // Confidence rules:
  //   1.0 — value came directly from a recognized column
  //   0.7 — partial / lower-fidelity (e.g. address with no city)
  //   0.0 — column absent or value blank/unparseable
  //
  // "hasCityish" looks for a Canadian postal code (A1A 1A1) or a
  // 2-letter province token. A bare comma isn't enough — the sub-area
  // append already adds one, but that's a neighbourhood, not a city.
  const hasCityish =
    /\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/.test(composedAddress) ||
    /\b(BC|AB|SK|MB|ON|QC|NB|NS|PE|NL|YT|NT|NU)\b/.test(composedAddress);
  const parsed: ParagonParseResult = {
    address: composedAddress
      ? field<string>(composedAddress, hasCityish ? 0.9 : 0.7)
      : emptyField<string>(),
    mls_number: mlsNumber ? field<string>(mlsNumber, 1.0) : emptyField<string>(),
    list_price: price != null ? field<number>(price, 1.0) : emptyField<number>(),
    property_type:
      propertyType != null
        ? field(propertyType, propertyTypeConfidence)
        : emptyField<ParagonParseResult["property_type"]["value"]>(),
    bedrooms: bedrooms != null ? field<number>(bedrooms, 1.0) : emptyField<number>(),
    // CSV doesn't export bathrooms — leave for manual review.
    bathrooms: bathrooms != null ? field<number>(bathrooms, 1.0) : emptyField<number>(),
    sqft: sqft != null ? field<number>(sqft, 1.0) : emptyField<number>(),
    year_built: yearBuilt != null ? field<number>(yearBuilt, 1.0) : emptyField<number>(),
    lot_size: lotSizeRaw ? field<string>(lotSizeRaw, 1.0) : emptyField<string>(),
    taxes_annual: emptyField<number>(),
    description: emptyField<string>(),
  };

  const warnings: string[] = [];
  if (dataRows.length > 1) {
    warnings.push(
      `CSV has ${dataRows.length} rows — only the first was imported. Use Paragon to export one listing at a time.`
    );
  }
  if (parsed.bathrooms.value == null) {
    warnings.push("Bathrooms aren't in the ML Default Spreadsheet — please add manually.");
  }
  if (parsed.sqft.value == null) {
    warnings.push("Square footage isn't in the ML Default Spreadsheet — please add manually.");
  }
  if (!hasCityish && composedAddress) {
    warnings.push("Address has no city/postal code — please complete it before publishing.");
  }

  return { parsed, rowCount: dataRows.length, warnings };
}
