"use client";

import { useState, useEffect } from "react";

/**
 * PIPEDA/CASL cookie consent banner.
 * Stores consent in localStorage. Shows once per browser.
 * Required for PIPEDA compliance in Canada — must inform users
 * about analytics cookies (Vercel Analytics, Speed Insights).
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Small delay so it doesn't flash on first paint
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie-consent", "declined");
    localStorage.setItem("cookie-consent-date", new Date().toISOString());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-border bg-card p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm text-muted-foreground">
          We use essential cookies to keep you signed in and analytics cookies
          (Vercel Analytics) to improve the platform. No personal data is sold
          or shared with third parties. By clicking &quot;Accept&quot;, you
          consent to our use of cookies in accordance with PIPEDA.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={decline}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
