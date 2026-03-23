/**
 * PDF Service — Server-side PDF manipulation using pdf-lib
 *
 * Handles: loading templates, extracting form fields,
 * filling fields with CRM data, and flattening for final export.
 */

import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
} from "pdf-lib";

export type PdfFieldInfo = {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "radio" | "other";
  value?: string;
};

/**
 * Load a PDF document from a URL.
 */
export async function loadPdfFromUrl(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF from ${url}: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Extract all AcroForm field names and types from a PDF.
 * Used when uploading a new template to discover fillable fields.
 */
export async function extractFieldNames(
  pdfBytes: Uint8Array
): Promise<PdfFieldInfo[]> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const fields = form.getFields();

  return fields.map((field) => {
    let type: PdfFieldInfo["type"] = "other";
    let value: string | undefined;

    if (field instanceof PDFTextField) {
      type = "text";
      value = field.getText() ?? undefined;
    } else if (field instanceof PDFCheckBox) {
      type = "checkbox";
      value = field.isChecked() ? "true" : "false";
    } else if (field instanceof PDFDropdown) {
      type = "dropdown";
      const selected = field.getSelected();
      value = selected.length > 0 ? selected[0] : undefined;
    } else if (field instanceof PDFRadioGroup) {
      type = "radio";
      value = field.getSelected() ?? undefined;
    }

    return {
      name: field.getName(),
      type,
      value,
    };
  });
}

/**
 * Fill a PDF with field values. Returns a NON-flattened PDF
 * so that fields remain editable in the browser viewer.
 */
export async function fillPdf(
  pdfBytes: Uint8Array,
  fieldValues: Record<string, string | boolean>
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = doc.getForm();

  for (const [fieldName, value] of Object.entries(fieldValues)) {
    try {
      if (typeof value === "boolean") {
        const checkbox = form.getCheckBox(fieldName);
        value ? checkbox.check() : checkbox.uncheck();
      } else {
        const field = form.getField(fieldName);
        if (field instanceof PDFTextField) {
          field.setText(value);
        } else if (field instanceof PDFDropdown) {
          field.select(value);
        } else if (field instanceof PDFCheckBox) {
          value === "true" ? field.check() : field.uncheck();
        }
      }
    } catch {
      // Field not found in PDF — skip silently
      console.warn(`[pdf-service] Field "${fieldName}" not found, skipping`);
    }
  }

  return doc.save();
}

/**
 * Fill and FLATTEN a PDF — fields become non-editable.
 * Used for final export / download.
 */
export async function flattenPdf(
  pdfBytes: Uint8Array,
  fieldValues: Record<string, string | boolean>
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = doc.getForm();

  for (const [fieldName, value] of Object.entries(fieldValues)) {
    try {
      if (typeof value === "boolean") {
        const checkbox = form.getCheckBox(fieldName);
        value ? checkbox.check() : checkbox.uncheck();
      } else {
        const field = form.getField(fieldName);
        if (field instanceof PDFTextField) {
          field.setText(value);
        } else if (field instanceof PDFDropdown) {
          field.select(value);
        } else if (field instanceof PDFCheckBox) {
          value === "true" ? field.check() : field.uncheck();
        }
      }
    } catch {
      console.warn(`[pdf-service] Field "${fieldName}" not found, skipping`);
    }
  }

  form.flatten();
  return doc.save();
}
