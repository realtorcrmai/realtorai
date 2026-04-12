import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { PDFFormEditor } from "@/components/forms/PDFFormEditor";


export default async function FormEditorPage({
  params,
}: {
  params: Promise<{ listingId: string; formKey: string }>;
}) {
  const { listingId, formKey } = await params;
  const tc = await getAuthenticatedTenantClient();
  const adminDb = createAdminClient();

  // Fetch listing (tenant-scoped) + template (global)
  const [{ data: listing }, { data: template }] = await Promise.all([
    tc
      .from("listings")
      .select("id, address")
      .eq("id", listingId)
      .single(),
    adminDb
      .from("form_templates")
      .select("*")
      .eq("form_key", formKey)
      .single(),
  ]);

  if (!listing) notFound();

  if (!template) {
    // Template not yet uploaded — show a helpful message instead of 404
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="text-4xl">📄</div>
        <h1 className="text-xl font-semibold">Template Not Found</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          No PDF template has been uploaded for the <strong>{formKey.toUpperCase()}</strong> form yet.
          Upload the official PDF template from the Form Templates admin page.
        </p>
        <a
          href="/forms/templates"
          className="text-sm text-primary underline hover:text-primary/80"
        >
          Go to Form Templates
        </a>
      </div>
    );
  }

  // Fetch existing draft/submission
  const { data: draft } = await tc
    .from("form_submissions")
    .select("*")
    .eq("listing_id", listingId)
    .eq("form_key", formKey)
    .single();

  return (
    <PDFFormEditor
      listingId={listingId}
      formKey={formKey}
      template={template}
      listingAddress={listing.address}
      existingDraft={draft}
    />
  );
}
