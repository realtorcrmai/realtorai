"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const listingSchema = z.object({
  address: z.string().min(5),
  seller_id: z.string().uuid(),
  lockbox_code: z.string().min(1),
  status: z.enum(["active", "pending", "sold"]).default("active"),
  mls_number: z.string().optional(),
  list_price: z.number().positive().optional(),
  showing_window_start: z.string().optional(),
  showing_window_end: z.string().optional(),
  notes: z.string().optional(),
});

export async function createListing(formData: z.infer<typeof listingSchema>) {
  const parsed = listingSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid form data", issues: parsed.error.issues };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .insert({
      ...parsed.data,
      list_price: parsed.data.list_price ?? null,
      mls_number: parsed.data.mls_number || null,
      showing_window_start: parsed.data.showing_window_start || null,
      showing_window_end: parsed.data.showing_window_end || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { error: "Failed to create listing" };
  }

  revalidatePath("/listings");
  return { success: true, listing: data };
}

export async function updateListing(
  id: string,
  formData: Partial<z.infer<typeof listingSchema>>
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("listings")
    .update(formData)
    .eq("id", id);

  if (error) {
    return { error: "Failed to update listing" };
  }

  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  return { success: true };
}
