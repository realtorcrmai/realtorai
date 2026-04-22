import { unsubscribeContact } from "@/actions/contacts";
import { UnsubscribeClient } from "./UnsubscribeClient";

/**
 * Public unsubscribe landing page.
 * No auth required — validates HMAC token, then marks contact unsubscribed.
 * Route: /unsubscribe/[token]
 */
export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Process unsubscribe on page load (idempotent — setting true twice is safe)
  const result = await unsubscribeContact(token);

  // ── Helper: mask email for privacy ─────────────────────────────────────────
  function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    const visible = local.slice(0, 1);
    const masked = local.length > 1 ? `${visible}${"*".repeat(Math.min(local.length - 1, 4))}` : visible;
    return `${masked}@${domain}`;
  }

  // ── Invalid / expired token ─────────────────────────────────────────────────
  if (!result.success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-sm ring-1 ring-gray-100 text-center">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
            <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Link no longer valid
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            This unsubscribe link has expired or is invalid. If you&apos;d like to unsubscribe, please reply to any email you received with the word{" "}
            <span className="font-medium text-gray-700">UNSUBSCRIBE</span>.
          </p>
          <p className="mt-5 text-sm text-gray-400">
            Need help?{" "}
            <a
              href="mailto:support@magnate360.com"
              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
            >
              support@magnate360.com
            </a>
          </p>

          {/* Footer */}
          <p className="mt-10 text-xs text-gray-300">
            Magnate · Sent in compliance with CASL
          </p>
        </div>
      </main>
    );
  }

  // ── Successfully unsubscribed ────────────────────────────────────────────────
  const maskedEmail = result.email ? maskEmail(result.email) : null;
  const agentLabel = result.agentName ? `${result.agentName}'s` : "your agent's";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-sm ring-1 ring-gray-100 text-center">
        {/* Checkmark icon */}
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
          <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          You&apos;ve been unsubscribed
        </h1>

        {/* Masked email */}
        {maskedEmail && (
          <p className="mt-2 text-sm font-mono text-gray-500">{maskedEmail}</p>
        )}

        {/* Confirmation message */}
        <p className="mt-4 text-sm leading-relaxed text-gray-500">
          You&apos;ve been removed from {agentLabel} real estate updates. You won&apos;t receive any further marketing emails.
        </p>

        {/* Divider */}
        <div className="my-7 border-t border-gray-100" />

        {/* Re-subscribe button (client component — handles click + loading state) */}
        <UnsubscribeClient token={token} />

        {/* Footer */}
        <p className="mt-10 text-xs text-gray-300">
          Magnate · Sent in compliance with CASL
        </p>
      </div>
    </main>
  );
}
