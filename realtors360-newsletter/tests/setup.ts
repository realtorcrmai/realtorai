/**
 * Vitest setup — injects placeholder env vars so `src/config.ts` doesn't
 * exit the process when tests load modules that import the logger or
 * Supabase client. Tests that actually need real env should either set
 * their own values or mock the modules.
 *
 * Bracket notation is used because Next.js's ambient types mark some keys
 * (notably NODE_ENV) as read-only, which trips the CRM's tsc when it walks
 * this directory.
 */
const env = process.env as Record<string, string | undefined>;
env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';
env.ANTHROPIC_API_KEY ??= 'test-anthropic-key';
env.RESEND_API_KEY ??= 'test-resend-key';
env.LOG_LEVEL ??= 'error';
env.NODE_ENV ??= 'test';
