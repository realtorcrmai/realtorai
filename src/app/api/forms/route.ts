import { NextResponse } from "next/server";

/**
 * POST /api/forms (DEPRECATED)
 *
 * This endpoint previously generated HTML forms.
 * It has been replaced by the PDF-based form system:
 * - /api/forms/fill — pre-fill PDF with CRM data
 * - /api/forms/save — save draft field values
 * - /api/forms/complete — finalize and download PDF
 * - /api/forms/templates — manage PDF form templates
 *
 * Use the full-page editor at /forms/[listingId]/[formKey] instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint has been deprecated. Use /api/forms/fill instead.",
      migration: "Forms now use official PDF templates. Navigate to /forms/[listingId]/[formKey] for the full-page editor.",
    },
    { status: 410 } // 410 Gone
  );
}
