import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPdfFromUrl, flattenPdf } from "@/lib/forms/pdf-service";
import { getDocType } from "@/lib/forms/constants";

/**
 * POST /api/forms/complete
 * Body: { listingId: string, formKey: string, formData: Record<string, unknown> }
 *
 * Finalizes a form:
 * 1. Fills + flattens the PDF (non-editable)
 * 2. Uploads to Supabase Storage
 * 3. Updates form_submissions as 'completed'
 * 4. Upserts listing_documents record
 * 5. Returns the PDF URL for download
 */
export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const { listingId, formKey, formData } = await req.json();

    if (!listingId || !formKey || !formData) {
      return NextResponse.json(
        { error: "Missing listingId, formKey, or formData" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch template
    const { data: template, error: tplErr } = await supabase
      .from("form_templates")
      .select("pdf_url, form_name")
      .eq("form_key", formKey)
      .single();

    if (tplErr || !template) {
      return NextResponse.json(
        { error: `Template not found: ${formKey}` },
        { status: 404 }
      );
    }

    // Load template and flatten with final field values
    const templateBytes = await loadPdfFromUrl(template.pdf_url);
    const flattenedPdf = await flattenPdf(
      templateBytes,
      formData as Record<string, string | boolean>
    );

    // Upload flattened PDF to Supabase Storage
    const timestamp = Date.now();
    const fileName = `${formKey}_${timestamp}.pdf`;
    const storagePath = `${listingId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-documents")
      .upload(storagePath, flattenedPdf, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[/api/forms/complete] Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload PDF" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("listing-documents").getPublicUrl(storagePath);

    // Upsert form_submissions as completed
    await supabase
      .from("form_submissions")
      .upsert(
        {
          listing_id: listingId,
          form_key: formKey,
          form_data: formData,
          pdf_url: publicUrl,
          status: "completed",
        },
        { onConflict: "listing_id,form_key" }
      );

    // Also upsert listing_documents for readiness tracking
    const docType = getDocType(formKey);
    await supabase
      .from("listing_documents")
      .upsert(
        {
          listing_id: listingId,
          doc_type: docType,
          file_name: fileName,
          file_url: publicUrl,
        },
        { onConflict: "listing_id,doc_type" }
      );

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      fileName,
    });
  } catch (err) {
    console.error("[/api/forms/complete]", err);
    return NextResponse.json(
      { error: "Failed to complete form" },
      { status: 500 }
    );
  }
}
