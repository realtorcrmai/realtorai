// ============================================================
// Paragon Listing Detail Report — PDF parser via Claude vision.
// Single-pass extraction with confidence scores per field.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";
import { z } from "zod";

// Lazy-initialized so this module is safe to import in client bundles
// (e.g. ParagonReviewStep pulls in `buildImportNotes` from here, and the
// CSV import path runs entirely client-side). The Anthropic constructor
// throws in browser-like environments, so defer it until parseParagonPDF
// is actually invoked — which only happens server-side.
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

export const PARAGON_PROPERTY_TYPES = [
  "Residential",
  "Condo/Apartment",
  "Townhouse",
  "Land",
  "Commercial",
  "Multi-Family",
] as const;

const StringField = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
const NumberField = z.object({
  value: z.number().nullable(),
  confidence: z.number().min(0).max(1),
});
const PropertyTypeField = z.object({
  value: z.enum(PARAGON_PROPERTY_TYPES).nullable(),
  confidence: z.number().min(0).max(1),
});

export const ParagonParseSchema = z.object({
  address: StringField,
  mls_number: StringField,
  list_price: NumberField,
  property_type: PropertyTypeField,
  bedrooms: NumberField,
  bathrooms: NumberField,
  sqft: NumberField,
  year_built: NumberField,
  lot_size: StringField,
  taxes_annual: NumberField,
  description: StringField,
});

export type ParagonParseResult = z.infer<typeof ParagonParseSchema>;

const FIELD_OBJECT_SCHEMA = (valueType: "string" | "number", desc: string) => ({
  type: "object" as const,
  description: desc,
  properties: {
    value: {
      type: [valueType, "null"],
      description: desc,
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "0.0 = wild guess, 1.0 = field is plainly labeled in the document",
    },
  },
  required: ["value", "confidence"],
});

const TOOL_DEFINITION = {
  name: "extract_listing_fields",
  description:
    "Extract structured listing fields from a Paragon Listing Detail Report PDF. Call this exactly once.",
  input_schema: {
    type: "object",
    properties: {
      address: FIELD_OBJECT_SCHEMA(
        "string",
        "Full street address with city, province, postal code (e.g. '1234 Marine Dr, West Vancouver, BC V7T 1B5')"
      ),
      mls_number: FIELD_OBJECT_SCHEMA("string", "MLS listing number (e.g. 'R2912345')"),
      list_price: FIELD_OBJECT_SCHEMA(
        "number",
        "Original or current list price as a plain number with no currency symbol or commas"
      ),
      property_type: {
        type: "object" as const,
        description:
          "Normalized property type. Map Paragon labels: 'Single Family Detached' → 'Residential', 'Apartment' → 'Condo/Apartment', 'Strata' → 'Condo/Apartment', 'Row House' → 'Townhouse', 'Vacant Land' → 'Land'",
        properties: {
          value: {
            type: ["string", "null"],
            enum: [...PARAGON_PROPERTY_TYPES, null],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["value", "confidence"],
      },
      bedrooms: FIELD_OBJECT_SCHEMA("number", "Total number of bedrooms (integer)"),
      bathrooms: FIELD_OBJECT_SCHEMA(
        "number",
        "Total bathrooms — decimals allowed (e.g. 2.5 = 2 full + 1 half)"
      ),
      sqft: FIELD_OBJECT_SCHEMA(
        "number",
        "Total finished floor area in square feet (integer). If multiple sqft figures are present, prefer 'Total Floor Area' or 'Finished Area'."
      ),
      year_built: FIELD_OBJECT_SCHEMA("number", "Year built (4-digit integer)"),
      lot_size: FIELD_OBJECT_SCHEMA(
        "string",
        "Lot size as a human-readable string preserving original units (e.g. '5,200 sqft', '0.12 ac', '465 m²')"
      ),
      taxes_annual: FIELD_OBJECT_SCHEMA(
        "number",
        "Annual property taxes in dollars (plain number, no currency symbol)"
      ),
      description: FIELD_OBJECT_SCHEMA(
        "string",
        "MLS public remarks / description copied verbatim from the report. Truncate to 800 characters if longer."
      ),
    },
    required: [
      "address",
      "mls_number",
      "list_price",
      "property_type",
      "bedrooms",
      "bathrooms",
      "sqft",
      "year_built",
      "lot_size",
      "taxes_annual",
      "description",
    ],
  },
};

const SYSTEM_PROMPT = `You are a careful data-extraction assistant for a Canadian real estate CRM (BC, primarily BCRES Paragon reports).

You will be given a Paragon Listing Detail Report or Agent Full Report as a PDF. Extract the listed fields and call the extract_listing_fields tool exactly once.

Rules:
- Return value=null when the field is genuinely absent. Do NOT guess.
- confidence: 1.0 if the field is plainly labeled in the report, 0.7 if labeled but ambiguous, 0.4 if inferred from context, <0.3 if you're guessing.
- Numbers must be plain JSON numbers — strip currency symbols, commas, and units.
- property_type must be one of: ${PARAGON_PROPERTY_TYPES.join(", ")}. Map Paragon-specific labels per the tool description.
- description: copy MLS public remarks verbatim. Truncate to 800 chars if longer. Set null if no description block exists.
- If multiple list prices are shown (current vs original), prefer the most recent / current one.
- Never fabricate an MLS number — if the report header doesn't show one, return null with low confidence.`;

/**
 * Parse a Paragon Listing Detail Report PDF using Claude Sonnet vision.
 * @param pdfBuffer raw PDF bytes
 * @param opts.temperature 0 = deterministic (default for first parse). For a "rescan" after the realtor
 *        rejected the result, callers pass ~0.4 to nudge the model toward a different answer.
 * @throws if Claude does not return a tool_use block, or output fails schema validation.
 */
export async function parseParagonPDF(
  pdfBuffer: Buffer,
  opts: { temperature?: number } = {}
): Promise<ParagonParseResult> {
  const base64 = pdfBuffer.toString("base64");
  const model = process.env.PARAGON_PARSE_MODEL || "claude-sonnet-4-6";

  const response = await createWithRetry(getAnthropic(), {
    model,
    max_tokens: 4096,
    temperature: opts.temperature ?? 0,
    system: SYSTEM_PROMPT,
    tools: [TOOL_DEFINITION as unknown as Anthropic.Tool],
    tool_choice: { type: "tool", name: "extract_listing_fields" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          } as unknown as Anthropic.ContentBlockParam,
          {
            type: "text",
            text: "Extract the listing data from this Paragon report.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a tool_use block");
  }

  const parsed = ParagonParseSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(
      `Parse output failed schema validation: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    );
  }
  return parsed.data;
}

/**
 * Build the markdown notes block we persist into listings.notes for v1
 * (since rich fields like bedrooms/sqft/description don't all live in listingSchema yet).
 * v2 (migration 150) will lift these into dedicated columns.
 *
 * `source` lets the CSV import path label the block correctly while reusing
 * everything else. Defaults to "PDF" so existing callers stay unchanged.
 */
export function buildImportNotes(
  parsed: ParagonParseResult,
  originalNotes: string,
  source: "PDF" | "CSV" = "PDF"
): string {
  const lines: string[] = [];
  lines.push(`📄 Imported from Paragon ${source} · ${new Date().toISOString().slice(0, 10)}`);

  const facts: string[] = [];
  if (parsed.bedrooms.value != null) facts.push(`${parsed.bedrooms.value} bed`);
  if (parsed.bathrooms.value != null) facts.push(`${parsed.bathrooms.value} bath`);
  if (parsed.sqft.value != null) facts.push(`${parsed.sqft.value.toLocaleString()} sqft`);
  if (parsed.year_built.value != null) facts.push(`Built ${parsed.year_built.value}`);
  if (facts.length) lines.push(facts.join(" · "));

  const extras: string[] = [];
  if (parsed.lot_size.value) extras.push(`Lot: ${parsed.lot_size.value}`);
  if (parsed.taxes_annual.value != null) {
    extras.push(`Annual taxes: $${parsed.taxes_annual.value.toLocaleString()}`);
  }
  if (extras.length) lines.push(extras.join(" · "));

  if (parsed.description.value) {
    lines.push("", "MLS Description:", parsed.description.value);
  }

  const importBlock = lines.join("\n");
  return originalNotes.trim()
    ? `${originalNotes.trim()}\n\n---\n\n${importBlock}`
    : importBlock;
}
