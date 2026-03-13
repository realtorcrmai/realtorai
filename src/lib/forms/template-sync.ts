/**
 * Template Sync — Auto-download publicly available form templates
 *
 * Currently supports FINTRAC Individual Identification Information Record.
 * Can be extended with other publicly available forms.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { extractFieldNames } from "./pdf-service";

/**
 * Publicly available form sources.
 * These can be fetched without authentication.
 */
const PUBLIC_FORM_SOURCES = [
  {
    form_key: "fintrac",
    form_name: "Individual Identification Information Record",
    organization: "FINTRAC / CREA",
    // Publicly hosted FINTRAC compliance form for Canadian real estate
    source_url:
      "https://www.garbuttdumas.ca/wp-content/uploads/FINTRAC-Individual-Identification-Information-Record.pdf",
    // Fallback URLs in case primary is unavailable
    fallback_urls: [
      "https://www.fintracker.ca/pdf/individual-identification.pdf",
    ],
  },
];

/**
 * Sync a single publicly available form template.
 * Downloads the PDF, extracts fields, and upserts the template record.
 */
export async function syncPublicTemplate(source: (typeof PUBLIC_FORM_SOURCES)[0]) {
  const supabase = createAdminClient();

  // Try primary URL, then fallbacks
  const urls = [source.source_url, ...(source.fallback_urls || [])];
  let pdfBytes: Uint8Array | null = null;
  let usedUrl = "";

  for (const url of urls) {
    console.log(`[template-sync] Trying ${source.form_key} from ${url}`);
    try {
      const response = await fetch(url);
      if (response.ok) {
        pdfBytes = new Uint8Array(await response.arrayBuffer());
        usedUrl = url;
        break;
      }
      console.warn(`[template-sync] ${url} returned ${response.status}, trying next...`);
    } catch (err) {
      console.warn(`[template-sync] ${url} failed:`, err);
    }
  }

  if (!pdfBytes) {
    throw new Error(
      `Failed to download ${source.form_key} from any source URL`
    );
  }

  console.log(`[template-sync] Downloaded ${source.form_key} (${pdfBytes.length} bytes) from ${usedUrl}`);

  // Extract field names
  let fieldNames: string[] = [];
  try {
    const fields = await extractFieldNames(pdfBytes);
    fieldNames = fields.map((f) => f.name);
    console.log(
      `[template-sync] Extracted ${fieldNames.length} fields from ${source.form_key}`
    );
  } catch (err) {
    console.warn(
      `[template-sync] Could not extract fields from ${source.form_key}:`,
      err
    );
  }

  // Upload to storage (form-templates bucket for template PDFs)
  const storagePath = `${source.form_key}_latest.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("form-templates")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Failed to upload ${source.form_key}: ${uploadError.message}`
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("form-templates").getPublicUrl(storagePath);

  // Upsert template record
  const { error: upsertError } = await supabase
    .from("form_templates")
    .upsert(
      {
        form_key: source.form_key,
        form_name: source.form_name,
        organization: source.organization,
        version: new Date().toISOString().split("T")[0], // date as version
        pdf_url: publicUrl,
        field_names: fieldNames,
        is_public: true,
        source_url: source.source_url,
        last_checked: new Date().toISOString(),
      },
      { onConflict: "form_key" }
    );

  if (upsertError) {
    throw new Error(
      `Failed to upsert ${source.form_key}: ${upsertError.message}`
    );
  }

  console.log(`[template-sync] Successfully synced ${source.form_key}`);
  return { form_key: source.form_key, fieldCount: fieldNames.length };
}

/**
 * Sync all publicly available form templates.
 * Returns results for each form.
 */
export async function syncAllPublicTemplates() {
  const results: { form_key: string; success: boolean; error?: string; fieldCount?: number }[] = [];

  for (const source of PUBLIC_FORM_SOURCES) {
    try {
      const result = await syncPublicTemplate(source);
      results.push({ form_key: result.form_key, success: true, fieldCount: result.fieldCount });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[template-sync] Error syncing ${source.form_key}:`, errorMessage);
      results.push({ form_key: source.form_key, success: false, error: errorMessage });
    }
  }

  return results;
}
