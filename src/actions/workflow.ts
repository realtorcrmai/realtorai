"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// Step order for cascade reset — changing step N clears all steps after N
const STEP_ORDER = [
  "seller-intake",
  "data-enrichment",
  "cma",
  "pricing-review",
  "form-generation",
  "e-signature",
  "mls-prep",
  "mls-submission",
  "post-listing",
];

async function cascadeResetLaterSteps(
  supabase: ReturnType<typeof createAdminClient>,
  listingId: string,
  stepId: string
) {
  const stepIndex = STEP_ORDER.indexOf(stepId);
  if (stepIndex === -1 || stepIndex >= STEP_ORDER.length - 1) return;

  // Get all later step keys
  const laterStepKeys = STEP_ORDER.slice(stepIndex + 1).map((id) => `step-${id}`);

  // Delete form_submissions for later steps
  await supabase
    .from("form_submissions")
    .delete()
    .eq("listing_id", listingId)
    .in("form_key", laterStepKeys);

  // Delete uploaded files for later steps (file_name starts with step-{id}_)
  const laterStepPrefixes = STEP_ORDER.slice(stepIndex + 1).map((id) => `step-${id}_`);

  // Get files that belong to later steps
  const { data: laterFiles } = await supabase
    .from("listing_documents")
    .select("id, file_name, file_url")
    .eq("listing_id", listingId)
    .eq("doc_type", "OTHER");

  if (laterFiles && laterFiles.length > 0) {
    const filesToDelete = laterFiles.filter((f) =>
      laterStepPrefixes.some((prefix) => f.file_name.startsWith(prefix))
    );

    if (filesToDelete.length > 0) {
      // Remove from storage
      const storagePaths = filesToDelete
        .map((f) => {
          try {
            const url = new URL(f.file_url);
            const match = url.pathname.match(/listing-documents\/(.+)$/);
            return match ? match[1] : null;
          } catch {
            return null;
          }
        })
        .filter((p): p is string => p !== null);

      if (storagePaths.length > 0) {
        await supabase.storage.from("listing-documents").remove(storagePaths);
      }

      // Remove DB records
      await supabase
        .from("listing_documents")
        .delete()
        .in(
          "id",
          filesToDelete.map((f) => f.id)
        );
    }
  }
}

export async function saveStepData(
  listingId: string,
  stepId: string,
  data: Record<string, unknown>
) {
  const supabase = createAdminClient();

  if (stepId === "seller-intake") {
    // Seller-intake writes directly to contacts + listings tables
    const { data: listing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", listingId)
      .single();

    if (listing?.seller_id && (data.full_name || data.phone || data.email)) {
      const contactUpdate: Record<string, unknown> = {};
      if (data.full_name) contactUpdate.name = data.full_name;
      if (data.phone) contactUpdate.phone = data.phone;
      if (data.email) contactUpdate.email = data.email;

      await supabase
        .from("contacts")
        .update(contactUpdate)
        .eq("id", listing.seller_id);
    }

    const listingUpdate: Record<string, unknown> = {};
    if (data.address !== undefined) listingUpdate.address = data.address;
    if (data.lockbox_code !== undefined) listingUpdate.lockbox_code = data.lockbox_code;
    if (data.list_price !== undefined)
      listingUpdate.list_price = data.list_price ? Number(data.list_price) : null;
    if (data.notes !== undefined) listingUpdate.notes = data.notes;

    if (Object.keys(listingUpdate).length > 0) {
      await supabase.from("listings").update(listingUpdate).eq("id", listingId);
    }

    // Also save extra fields (seller_type, etc.) that don't map to real columns
    const extraData: Record<string, unknown> = {};
    const realColumnKeys = ["full_name", "phone", "email", "address", "lockbox_code", "list_price", "notes"];
    for (const [key, val] of Object.entries(data)) {
      if (!realColumnKeys.includes(key) && val !== undefined && val !== "") {
        extraData[key] = val;
      }
    }
    if (Object.keys(extraData).length > 0) {
      await supabase.from("form_submissions").upsert(
        {
          listing_id: listingId,
          form_key: `step-${stepId}`,
          form_data: extraData,
          status: "draft" as const,
        },
        { onConflict: "listing_id,form_key" }
      );
    }
  } else {
    // All other steps → upsert form_submissions with JSON form_data
    await supabase.from("form_submissions").upsert(
      {
        listing_id: listingId,
        form_key: `step-${stepId}`,
        form_data: data,
        status: "draft" as const,
      },
      { onConflict: "listing_id,form_key" }
    );
  }

  // Cascade: delete all later steps' data when this step is saved
  await cascadeResetLaterSteps(supabase, listingId, stepId);

  revalidatePath(`/listings/${listingId}`);
  return { success: true };
}

export async function deleteStepFile(
  listingId: string,
  documentId: string
) {
  const supabase = createAdminClient();

  // Get the file path from the document record
  const { data: doc } = await supabase
    .from("listing_documents")
    .select("file_url")
    .eq("id", documentId)
    .single();

  if (doc?.file_url) {
    // Extract storage path from URL
    const url = new URL(doc.file_url);
    const pathMatch = url.pathname.match(/listing-documents\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from("listing-documents").remove([pathMatch[1]]);
    }
  }

  await supabase.from("listing_documents").delete().eq("id", documentId);

  revalidatePath(`/listings/${listingId}`);
  return { success: true };
}
