import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPdfFromUrl, fillPdf } from "@/lib/forms/pdf-service";
import { applyFieldMapping, type CrmContext } from "@/lib/forms/field-mapping";

/**
 * POST /api/forms/fill
 * Body: { listingId: string, formKey: string }
 *
 * Returns a pre-filled (non-flattened) PDF as application/pdf.
 * If a draft exists, applies the draft's saved field data.
 * Otherwise, pre-fills from CRM data via the template's field_mapping.
 */
export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const { listingId, formKey } = await req.json();

    if (!listingId || !formKey) {
      return NextResponse.json(
        { error: "Missing listingId or formKey" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch template
    const { data: template, error: tplErr } = await supabase
      .from("form_templates")
      .select("*")
      .eq("form_key", formKey)
      .single();

    if (tplErr || !template) {
      return NextResponse.json(
        { error: `Template not found for form_key: ${formKey}` },
        { status: 404 }
      );
    }

    // Load the template PDF bytes
    const pdfBytes = await loadPdfFromUrl(template.pdf_url);

    // Check for existing draft
    const { data: draft } = await supabase
      .from("form_submissions")
      .select("form_data")
      .eq("listing_id", listingId)
      .eq("form_key", formKey)
      .single();

    let fieldValues: Record<string, string | boolean>;

    if (draft?.form_data && Object.keys(draft.form_data).length > 0) {
      // Use saved draft data
      fieldValues = draft.form_data as Record<string, string | boolean>;
    } else {
      // Pre-fill from CRM data using the template's field_mapping
      const { data: listing } = await supabase
        .from("listings")
        .select("*, contacts(id, name, phone, email)")
        .eq("id", listingId)
        .single();

      if (!listing) {
        return NextResponse.json(
          { error: "Listing not found" },
          { status: 404 }
        );
      }

      const seller = (listing as Record<string, unknown>).contacts as {
        name: string;
        phone: string;
        email: string | null;
      };

      const context: CrmContext = {
        listing,
        seller: seller ?? { name: "", phone: "", email: null },
        user: {
          name: session.user?.name ?? null,
          email: session.user?.email ?? null,
        },
      };

      fieldValues = applyFieldMapping(
        template.field_mapping as Record<string, string>,
        context
      );
    }

    // Fill the PDF (non-flattened — fields remain editable)
    const filledPdf = await fillPdf(pdfBytes, fieldValues);

    return new NextResponse(Buffer.from(filledPdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${formKey}_filled.pdf"`,
      },
    });
  } catch (err) {
    console.error("[/api/forms/fill]", err);
    return NextResponse.json(
      { error: "Failed to fill PDF form" },
      { status: 500 }
    );
  }
}
