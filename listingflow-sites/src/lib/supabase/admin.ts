import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const isPlaceholder = !serviceKey || serviceKey.startsWith("placeholder");

  if (isPlaceholder) {
    console.warn(
      "[supabase/admin] Service role key missing — falling back to anon key."
    );
  }

  const key = isPlaceholder
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    : serviceKey;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });
}
