import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractFieldNames } from "@/lib/forms/pdf-service";

/**
 * GET /api/forms/templates
 * Returns all form templates.
 */
export async function GET() {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("form_templates")
    .select("*")
    .order("form_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/forms/templates
 * Upload a new PDF form template.
 * Expects FormData with: pdf (File), form_key, form_name, organization (optional)
 *
 * Extracts AcroForm field names from the PDF and stores the template.
 */
export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  try {
    const formData = await req.formData();
    const pdfFile = formData.get("pdf") as File | null;
    const formKey = formData.get("form_key") as string | null;
    const formName = formData.get("form_name") as string | null;
    const organization = (formData.get("organization") as string) || "BCREA";

    if (!pdfFile || !formKey || !formName) {
      return NextResponse.json(
        { error: "Missing required fields: pdf, form_key, form_name" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Read PDF bytes
    const buffer = await pdfFile.arrayBuffer();
    const pdfBytes = new Uint8Array(buffer);

    // Extract AcroForm field names
    let fieldNames: string[] = [];
    try {
      const fields = await extractFieldNames(pdfBytes);
      fieldNames = fields.map((f) => f.name);
    } catch (err) {
      console.warn(
        "[/api/forms/templates] Could not extract fields (PDF may not have AcroForm):",
        err
      );
    }

    // Upload PDF to storage
    const storagePath = `templates/${formKey}_v1.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("listing-documents")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[/api/forms/templates] Upload error:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload PDF: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("listing-documents").getPublicUrl(storagePath);

    // Insert template record
    const { data: template, error: insertError } = await supabase
      .from("form_templates")
      .upsert(
        {
          form_key: formKey,
          form_name: formName,
          organization,
          version: "1.0",
          pdf_url: publicUrl,
          field_names: fieldNames,
          field_mapping: {},
          is_public: false,
        },
        { onConflict: "form_key" }
      )
      .select()
      .single();

    if (insertError) {
      console.error("[/api/forms/templates] Insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
      fieldNames,
    });
  } catch (err) {
    console.error("[/api/forms/templates]", err);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
