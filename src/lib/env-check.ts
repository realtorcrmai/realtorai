/**
 * Startup environment variable validation.
 *
 * Imported once in the root layout (src/app/layout.tsx). If any required
 * variable is missing, logs a loud error at server startup time instead
 * of failing silently at first request. In production mode, throws so
 * the deploy fails fast and Vercel reports it in the build/runtime log.
 *
 * In development mode, logs warnings but doesn't throw — this lets devs
 * start the server even with a partial .env.local (useful when working
 * on UI-only changes that don't touch the DB).
 *
 * Added: 2026-04-09 (production readiness audit).
 */

type EnvCheck = {
  name: string;
  required: boolean;
  hint?: string;
};

const REQUIRED_VARS: EnvCheck[] = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", required: true, hint: "Supabase project URL (https://xxx.supabase.co)" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true, hint: "Supabase anon/public key (JWT)" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", required: true, hint: "Supabase service role key (JWT, server-side only)" },
  { name: "NEXTAUTH_SECRET", required: true, hint: "Random 32+ char secret for JWT signing" },
  { name: "NEXTAUTH_URL", required: true, hint: "App URL (http://localhost:3000 for dev)" },
  { name: "NEXT_PUBLIC_APP_URL", required: true, hint: "Same as NEXTAUTH_URL in most cases" },
];

const OPTIONAL_VARS: EnvCheck[] = [
  { name: "ANTHROPIC_API_KEY", required: false, hint: "Required for AI content generation" },
  { name: "RESEND_API_KEY", required: false, hint: "Required for sending emails" },
  { name: "RESEND_FROM_EMAIL", required: false, hint: "Verified sender address" },
  { name: "TWILIO_ACCOUNT_SID", required: false, hint: "Required for SMS/WhatsApp" },
  { name: "TWILIO_AUTH_TOKEN", required: false, hint: "Required for SMS/WhatsApp" },
  { name: "GOOGLE_CLIENT_ID", required: false, hint: "Required for Google OAuth login" },
  { name: "GOOGLE_CLIENT_SECRET", required: false, hint: "Required for Google OAuth login" },
  { name: "CRON_SECRET", required: false, hint: "Required for cron endpoint auth" },
  { name: "DEMO_EMAIL", required: false, hint: "Demo login email" },
  { name: "DEMO_PASSWORD", required: false, hint: "Demo login password" },
];

let checked = false;

export function validateEnv() {
  if (checked) return; // Only run once per server lifecycle
  checked = true;

  const isProd = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of REQUIRED_VARS) {
    if (!process.env[v.name]) {
      missing.push(`  ❌ ${v.name} — ${v.hint}`);
    }
  }

  for (const v of OPTIONAL_VARS) {
    if (!process.env[v.name]) {
      warnings.push(`  ⚠ ${v.name} — ${v.hint}`);
    }
  }

  if (missing.length > 0) {
    const msg = [
      "",
      "═══════════════════════════════════════════════════════════════",
      " MISSING REQUIRED ENVIRONMENT VARIABLES",
      "═══════════════════════════════════════════════════════════════",
      ...missing,
      "",
      " Fix: copy .env.local.example → .env.local and fill in values",
      " Or:  vercel env pull .env.local --environment=preview",
      "═══════════════════════════════════════════════════════════════",
      "",
    ].join("\n");

    if (isProd) {
      // In production, crash immediately so Vercel shows the error
      // in the build/runtime log. A deploy with missing secrets
      // should never serve traffic.
      throw new Error(msg);
    } else {
      // In development, warn but don't crash — lets devs work on
      // UI-only tasks with a partial env.
      console.error(msg);
    }
  }

  if (warnings.length > 0 && !isProd) {
    console.warn(
      "\n⚠ Optional env vars missing (some features won't work):\n" +
        warnings.join("\n") +
        "\n"
    );
  }
}
