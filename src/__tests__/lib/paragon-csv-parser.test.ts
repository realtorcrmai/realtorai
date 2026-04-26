/**
 * Tests for src/lib/paragon/csv-parser.ts
 *
 * Validates the Paragon ML Default Spreadsheet CSV parser produces a correct
 * ParagonParseResult for the realtor's "import historical listing" flow.
 */

import { describe, it, expect } from "vitest";
import { parseParagonCsv, type CsvParseSuccess } from "@/lib/paragon/csv-parser";

// Real-world fixture: the exact content the user pulled from their Downloads.
const FIXTURE = `"PicCount","Pics","ML #","Address","Price","Tot BR","Status","Yr Blt","DOM","TypeDwel","S/A","Prop Type","Lot Sz(SF)"
"1","https://zimg.paragon.ice.com/img.JPG","R3108813","11365 86 AVENUE","$1,275,000","6","A","2026","18","DUPXH","Annieville","Residential Attached","3,000.00"
`;

function asSuccess(r: ReturnType<typeof parseParagonCsv>): CsvParseSuccess {
  if ("error" in r) throw new Error(`Expected success, got error: ${r.error}`);
  return r;
}

describe("parseParagonCsv — real-world fixture", () => {
  it("extracts MLS number, price, beds, year, lot at confidence 1.0", () => {
    const r = asSuccess(parseParagonCsv(FIXTURE));
    expect(r.parsed.mls_number).toEqual({ value: "R3108813", confidence: 1.0 });
    expect(r.parsed.list_price).toEqual({ value: 1275000, confidence: 1.0 });
    expect(r.parsed.bedrooms).toEqual({ value: 6, confidence: 1.0 });
    expect(r.parsed.year_built).toEqual({ value: 2026, confidence: 1.0 });
    expect(r.parsed.lot_size).toEqual({ value: "3,000.00", confidence: 1.0 });
  });

  it("composes address with sub-area appended (street + neighbourhood)", () => {
    const r = asSuccess(parseParagonCsv(FIXTURE));
    expect(r.parsed.address.value).toBe("11365 86 AVENUE, Annieville");
    // No comma-and-province pattern → confidence stays below 1.0
    expect(r.parsed.address.confidence).toBeGreaterThan(0.5);
    expect(r.parsed.address.confidence).toBeLessThanOrEqual(0.95);
  });

  it("maps DUPXH TypeDwel code to Multi-Family", () => {
    const r = asSuccess(parseParagonCsv(FIXTURE));
    expect(r.parsed.property_type.value).toBe("Multi-Family");
    expect(r.parsed.property_type.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("emits warnings for fields the CSV doesn't carry (bath, sqft) and for missing city", () => {
    const r = asSuccess(parseParagonCsv(FIXTURE));
    expect(r.parsed.bathrooms.value).toBeNull();
    expect(r.parsed.sqft.value).toBeNull();
    expect(r.warnings.some((w) => /bathroom/i.test(w))).toBe(true);
    expect(r.warnings.some((w) => /square footage/i.test(w))).toBe(true);
    expect(r.warnings.some((w) => /city|postal/i.test(w))).toBe(true);
  });

  it("leaves taxes and description null (not in default CSV)", () => {
    const r = asSuccess(parseParagonCsv(FIXTURE));
    expect(r.parsed.taxes_annual.value).toBeNull();
    expect(r.parsed.description.value).toBeNull();
  });
});

describe("parseParagonCsv — edge cases", () => {
  it("rejects an empty file", () => {
    const r = parseParagonCsv("");
    expect("error" in r).toBe(true);
  });

  it("rejects a header-only file (no data rows)", () => {
    const r = parseParagonCsv(`"ML #","Address"\n`);
    expect("error" in r).toBe(true);
  });

  it("rejects a CSV without recognizable columns", () => {
    const r = parseParagonCsv(`"foo","bar"\n"1","2"\n`);
    expect("error" in r).toBe(true);
  });

  it("ignores rows beyond the first and warns", () => {
    const multi = FIXTURE + `"1","x","R9999999","42 OAK ST","$500,000","3","A","2010","5","HOUSE","Cloverdale","Residential","6,000"\n`;
    const r = asSuccess(parseParagonCsv(multi));
    expect(r.rowCount).toBe(2);
    expect(r.parsed.mls_number.value).toBe("R3108813"); // first row only
    expect(r.warnings.some((w) => /2 rows|first/i.test(w))).toBe(true);
  });

  it("strips $ and commas from price; survives whitespace and BOM", () => {
    const withBom = "\uFEFF" + FIXTURE.replace("$1,275,000", "  $1,275,000  ");
    const r = asSuccess(parseParagonCsv(withBom));
    expect(r.parsed.list_price.value).toBe(1275000);
  });

  it("falls back to Prop Type text when TypeDwel is unknown", () => {
    const csv = FIXTURE.replace("DUPXH", "ZZZZZ");
    const r = asSuccess(parseParagonCsv(csv));
    // "Residential Attached" → Townhouse via text fallback
    expect(r.parsed.property_type.value).toBe("Townhouse");
    expect(r.parsed.property_type.confidence).toBeLessThan(0.9);
  });

  it("handles CRLF line endings", () => {
    const crlf = FIXTURE.replace(/\n/g, "\r\n");
    const r = asSuccess(parseParagonCsv(crlf));
    expect(r.parsed.mls_number.value).toBe("R3108813");
  });

  it("does not double-append sub-area when address already contains it", () => {
    const csv = FIXTURE.replace('"11365 86 AVENUE"', '"11365 86 AVENUE, ANNIEVILLE"');
    const r = asSuccess(parseParagonCsv(csv));
    expect(r.parsed.address.value).toBe("11365 86 AVENUE, ANNIEVILLE");
  });

  it("returns null + 0 confidence for unparseable price", () => {
    const csv = FIXTURE.replace("$1,275,000", "Call");
    const r = asSuccess(parseParagonCsv(csv));
    expect(r.parsed.list_price).toEqual({ value: null, confidence: 0 });
  });
});

describe("parseParagonCsv — TypeDwel code mapping", () => {
  const cases: Array<[string, string]> = [
    ["HOUSE", "Residential"],
    ["SFD", "Residential"],
    ["TWNHS", "Townhouse"],
    ["APARTM", "Condo/Apartment"],
    ["LAND", "Land"],
    ["COMM", "Commercial"],
    ["DUPXH", "Multi-Family"],
  ];

  for (const [code, expected] of cases) {
    it(`maps ${code} → ${expected}`, () => {
      const csv = FIXTURE.replace("DUPXH", code);
      const r = asSuccess(parseParagonCsv(csv));
      expect(r.parsed.property_type.value).toBe(expected);
    });
  }
});
