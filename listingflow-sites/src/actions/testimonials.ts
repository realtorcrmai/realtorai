"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createTestimonial(data: {
  site_id: string;
  client_name: string;
  client_location?: string;
  content: string;
  rating?: number;
  is_featured?: boolean;
}) {
  const supabase = createAdminClient();

  const { data: testimonial, error } = await supabase
    .from("testimonials")
    .insert({
      site_id: data.site_id,
      client_name: data.client_name,
      client_location: data.client_location || null,
      content: data.content,
      rating: data.rating || 5,
      is_featured: data.is_featured || false,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/testimonials");
  return { success: true, testimonial };
}

export async function deleteTestimonial(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/testimonials");
  return { success: true };
}
