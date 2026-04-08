import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

/**
 * Service-role Supabase client.
 *
 * Bypasses RLS by design — this service runs server-side only and the worker
 * needs to read/write rows on behalf of any realtor. Never expose this client
 * to a request that has not been authenticated through `/events` HMAC.
 */
export const supabase: SupabaseClient = createClient(
  config.NEXT_PUBLIC_SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
  }
);
