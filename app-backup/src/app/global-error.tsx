"use client";

import { RefreshCw } from "lucide-react";

/**
 * Root-level error boundary for errors outside the dashboard layout.
 * Uses inline styles since global CSS may not be loaded when this renders.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#fafafa",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 16px",
              borderRadius: "50%",
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
              fontSize: 24,
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 4 }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          {process.env.NODE_ENV === "development" && error.message && (
            <pre
              style={{
                marginTop: 12,
                padding: 12,
                backgroundColor: "#f3f4f6",
                borderRadius: 8,
                fontSize: 12,
                color: "#dc2626",
                textAlign: "left",
                overflow: "auto",
                maxHeight: 120,
              }}
            >
              {error.message}
            </pre>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
