import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Realtors360",
  description:
    "Learn how Realtors360 collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  const effectiveDate = "April 25, 2026";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-foreground">
            Realtors360
          </Link>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Effective date: {effectiveDate}
        </p>

        <div className="prose prose-gray max-w-none space-y-6 text-foreground/90 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              1. Introduction
            </h2>
            <p>
              Realtors360 (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
              operates a real estate transaction management platform for
              licensed realtors in British Columbia, Canada. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              personal information when you use our website, application, and
              services (collectively, the &quot;Service&quot;).
            </p>
            <p>
              By accessing or using the Service you agree to this Privacy
              Policy. If you do not agree, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              2. Information We Collect
            </h2>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account information:</strong> name, email address,
                phone number, brokerage name, license number.
              </li>
              <li>
                <strong>Client data:</strong> contact details, property
                information, showing records, and transaction documents you
                upload or enter into the Service on behalf of your clients.
              </li>
              <li>
                <strong>Communications:</strong> messages you send through the
                Service (SMS, WhatsApp, email) and support requests.
              </li>
              <li>
                <strong>Payment information:</strong> billing details processed
                by our third-party payment provider (we do not store full
                payment card numbers).
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Usage data:</strong> pages visited, features used, time
                stamps, referring URLs, and click patterns.
              </li>
              <li>
                <strong>Device information:</strong> browser type, operating
                system, IP address, and device identifiers.
              </li>
              <li>
                <strong>Cookies &amp; similar technologies:</strong> we use
                essential cookies for authentication and optional analytics
                cookies (see Section 7).
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
              2.3 Information from Third Parties
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Google OAuth:</strong> name and email when you sign in
                with Google.
              </li>
              <li>
                <strong>Public data sources:</strong> BC Assessment, Land Title
                Survey Authority (LTSA), ParcelMap BC, and BC Geocoder data
                used for property enrichment.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide, maintain, and improve the Service.</li>
              <li>
                Process transactions, manage listings, and facilitate showings.
              </li>
              <li>
                Generate AI-powered content (MLS remarks, marketing materials,
                newsletters) based on your listing data.
              </li>
              <li>
                Send transactional communications (showing confirmations,
                status updates, system notifications).
              </li>
              <li>
                Send marketing communications where you have given consent
                (CASL-compliant).
              </li>
              <li>
                Enforce compliance with FINTRAC, BCFSA, and other regulatory
                requirements.
              </li>
              <li>Detect, prevent, and address fraud or security issues.</li>
              <li>Analyze usage to improve features and user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              4. How We Share Your Information
            </h2>
            <p>
              We do not sell your personal information. We may share information
              with:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Service providers:</strong> Supabase (database hosting),
                Twilio (SMS/WhatsApp), Resend (email delivery), Anthropic (AI
                content generation), Google (calendar integration, OAuth),
                Vercel (hosting), Cloudflare (CDN and website hosting).
              </li>
              <li>
                <strong>Your clients and counterparties:</strong> when you use
                the Service to send communications or share documents.
              </li>
              <li>
                <strong>Regulatory bodies:</strong> when required by FINTRAC,
                BCFSA, or applicable law.
              </li>
              <li>
                <strong>Legal compliance:</strong> to comply with legal
                obligations, enforce our terms, or protect rights and safety.
              </li>
              <li>
                <strong>Business transfers:</strong> in connection with a
                merger, acquisition, or sale of assets.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              5. Data Retention
            </h2>
            <p>
              We retain your personal information for as long as your account is
              active or as needed to provide the Service. Regulatory records
              (e.g., FINTRAC identity verification) are retained for the
              minimum period required by law (currently 5 years after the
              transaction). You may request deletion of your account and
              non-regulated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              6. Data Security
            </h2>
            <p>
              We implement industry-standard security measures including
              encryption in transit (TLS), encryption at rest, row-level
              security on database tables, JWT-based authentication, and
              regular security reviews. However, no method of transmission or
              storage is 100% secure, and we cannot guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              7. Cookies
            </h2>
            <p>
              We use essential cookies for authentication and session
              management. We also use optional analytics cookies (via Vercel
              Analytics) to understand how the Service is used. You can manage
              cookie preferences through the cookie consent banner displayed on
              your first visit or through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              8. Your Rights
            </h2>
            <p>
              Under applicable Canadian privacy legislation (PIPEDA, BC PIPA),
              you have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Access the personal information we hold about you.
              </li>
              <li>
                Request correction of inaccurate or incomplete information.
              </li>
              <li>
                Request deletion of your personal information (subject to
                regulatory retention requirements).
              </li>
              <li>Withdraw consent for marketing communications at any time.</li>
              <li>
                File a complaint with the Office of the Privacy Commissioner
                of Canada or the BC Office of the Information and Privacy
                Commissioner.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              9. Canadian Anti-Spam Legislation (CASL)
            </h2>
            <p>
              We comply with Canada&apos;s Anti-Spam Legislation. We only send
              commercial electronic messages where we have express or implied
              consent. Every marketing email includes an unsubscribe mechanism
              that is honoured within 10 business days. Transactional messages
              (showing confirmations, system alerts) do not require consent
              under CASL.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              10. International Transfers
            </h2>
            <p>
              Your data may be processed by service providers located outside
              Canada (primarily in the United States). Where this occurs, we
              ensure contractual safeguards are in place to protect your
              information to a comparable standard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              11. Children&apos;s Privacy
            </h2>
            <p>
              The Service is intended for licensed real estate professionals
              and is not directed at individuals under the age of 18. We do
              not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              12. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by posting the updated policy on
              this page and updating the effective date. Your continued use of
              the Service after changes constitutes acceptance of the revised
              policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              13. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy or wish to
              exercise your privacy rights, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Realtors360</strong>
              <br />
              Email: privacy@realtors360.ai
              <br />
              Website: realtors360.ai
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/terms" className="hover:underline">
            Terms of Use
          </Link>
          <Link href="/login" className="hover:underline">
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
