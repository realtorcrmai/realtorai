import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cache the admin client — no need to recreate on every call.
// The client is stateless (persistSession: false) so safe to reuse.
let _cachedClient: SupabaseClient | null = null;

export function createAdminClient() {
  if (_cachedClient) return _cachedClient;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const isPlaceholder =
    !serviceKey || serviceKey.startsWith("placeholder");

  if (isPlaceholder) {
    console.warn(
      "[supabase/admin] Service role key missing or placeholder — falling back to anon key. " +
        "Set SUPABASE_SERVICE_ROLE_KEY in .env.local for full admin access."
    );
  }

  const key = isPlaceholder
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    : serviceKey;

  _cachedClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });

  return _cachedClient;
}
