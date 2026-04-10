import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
            value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
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

export default nextConfig;
