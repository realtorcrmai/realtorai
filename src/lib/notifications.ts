import { createAdminClient } from "@/lib/supabase/admin";

export async function createNotification(realtorId: string, data: {
  type: string;
  title: string;
  body?: string;
  related_type?: string;
  related_id?: string;
}) {
  const supabase = createAdminClient();
  await supabase.from("notifications").insert({
    realtor_id: realtorId,
    ...data,
  });
}
