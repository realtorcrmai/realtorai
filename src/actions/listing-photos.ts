"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

export async function uploadListingPhoto(
  listingId: string,
  photoUrl: string,
  storagePath: string,
  role: string = "gallery",
  caption: string | null = null
) {
  const tc = await getAuthenticatedTenantClient();

  // Get next sort order
  const { count } = await tc
    .from("listing_photos")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  const sortOrder = (count ?? 0);

  const { data, error } = await tc
    .from("listing_photos")
    .insert({
      listing_id: listingId,
      photo_url: photoUrl,
      storage_path: storagePath,
      role: role as any,
      sort_order: sortOrder,
      caption,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Set hero image if this is the first photo
  if (sortOrder === 0) {
    await tc.from("listings").update({ hero_image_url: photoUrl }).eq("id", listingId);
  }

  revalidatePath(`/listings/${listingId}`);
  return { success: true, photo: data };
}

export async function updateListingPhoto(
  photoId: string,
  updates: { role?: string; caption?: string; sort_order?: number }
) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("listing_photos")
    .update(updates)
    .eq("id", photoId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteListingPhoto(photoId: string, listingId: string) {
  const tc = await getAuthenticatedTenantClient();

  // Get storage path before deleting
  const { data: photo } = await tc
    .from("listing_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  // Delete from storage
  if (photo?.storage_path) {
    await tc.raw.storage.from("listing-photos").remove([photo.storage_path]);
  }

  // Delete DB row
  const { error } = await tc
    .from("listing_photos")
    .delete()
    .eq("id", photoId);

  if (error) return { error: error.message };

  revalidatePath(`/listings/${listingId}`);
  return { success: true };
}

export async function reorderListingPhotos(
  listingId: string,
  orderedIds: string[]
) {
  const tc = await getAuthenticatedTenantClient();

  // Batch update sort_order
  for (let i = 0; i < orderedIds.length; i++) {
    await tc
      .from("listing_photos")
      .update({ sort_order: i })
      .eq("id", orderedIds[i]);
  }

  // Update hero image to first photo
  if (orderedIds.length > 0) {
    const { data: first } = await tc
      .from("listing_photos")
      .select("photo_url")
      .eq("id", orderedIds[0])
      .single();

    if (first) {
      await tc.from("listings").update({ hero_image_url: first.photo_url }).eq("id", listingId);
    }
  }

  revalidatePath(`/listings/${listingId}`);
  return { success: true };
}
