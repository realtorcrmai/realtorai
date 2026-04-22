import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { readFileSync } from "fs";
import { join } from "path";

// Read version from package.json at build time
const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8"));
const appVersion = pkg.version || "0.0.0";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
  },
  // Fix Turbopack workspace root detection (picks up parent package-lock.json otherwise)
  turbopack: {
    root: __dirname,
  },
  // ── Security headers ──────────────────────────────────────────
  // Applied to every response. Added 2026-04-09 for production readiness.
  // Reference: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking — only allow framing from same origin
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME-type sniffing (XSS vector)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control referrer leakage
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Opt into browser XSS protection (legacy, but zero cost)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // DNS prefetch control
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Permissions Policy — disable features we don't use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.twilio.com https://api.resend.com; frame-src 'self'",
          },
          // HSTS — force HTTPS for 1 year + subdomains.
          // Only sent in production (Vercel handles TLS termination).
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "listingflow",
  project: "realtors360-crm-frontend",
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
});
