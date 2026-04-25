import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — Realtors360",
  description:
    "Terms and conditions governing the use of the Realtors360 platform.",
};

export default function TermsOfUsePage() {
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
          Terms of Use
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Effective date: {effectiveDate}
        </p>

        <div className="prose prose-gray max-w-none space-y-6 text-foreground/90 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              These Terms of Use (&quot;Terms&quot;) govern your access to and
              use of the Realtors360 platform, including the website,
              application, APIs, and all related services (the
              &quot;Service&quot;). By creating an account or using the Service,
              you agree to be bound by these Terms and our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              2. Eligibility
            </h2>
            <p>
              The Service is designed for licensed real estate professionals in
              British Columbia, Canada. By using the Service you represent that
              you are at least 18 years old and, where applicable, hold a
              valid real estate licence issued by the BC Financial Services
              Authority (BCFSA) or an equivalent regulatory body.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              3. Account Registration
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                You must provide accurate, complete, and current information
                when creating an account.
              </li>
              <li>
                You are responsible for maintaining the confidentiality of
                your login credentials and for all activity under your
                account.
              </li>
              <li>
                You must notify us immediately of any unauthorized access to
                your account.
              </li>
              <li>
                We reserve the right to suspend or terminate accounts that
                violate these Terms or are inactive for an extended period.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              4. Permitted Use
            </h2>
            <p>You may use the Service to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Manage real estate listings, contacts, showings, and
                transactions.
              </li>
              <li>
                Generate AI-assisted content (MLS remarks, newsletters,
                marketing materials) for your real estate business.
              </li>
              <li>
                Communicate with clients and other agents via the built-in
                messaging tools.
              </li>
              <li>
                Track compliance requirements (FINTRAC, CASL, BCFSA).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              5. Prohibited Conduct
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Use the Service for any unlawful purpose or in violation of
                any applicable regulation.
              </li>
              <li>
                Upload false, misleading, or fraudulent listing information.
              </li>
              <li>
                Send unsolicited commercial messages in violation of CASL or
                CAN-SPAM.
              </li>
              <li>
                Attempt to gain unauthorized access to other users&apos;
                accounts or data.
              </li>
              <li>
                Reverse-engineer, decompile, or disassemble any part of the
                Service.
              </li>
              <li>
                Use automated bots, scrapers, or similar tools to access the
                Service without our written consent.
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Service.
              </li>
              <li>
                Resell, sublicense, or redistribute the Service without
                authorization.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              6. AI-Generated Content
            </h2>
            <p>
              The Service uses artificial intelligence (powered by Anthropic
              Claude) to generate content including MLS remarks, email
              newsletters, marketing copy, and property descriptions. You
              acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                AI-generated content is provided as a draft and should be
                reviewed for accuracy before use.
              </li>
              <li>
                You are solely responsible for the accuracy and compliance of
                any content you publish, whether AI-generated or not.
              </li>
              <li>
                We do not guarantee that AI-generated content will be free
                from errors, omissions, or bias.
              </li>
              <li>
                AI outputs do not constitute legal, financial, or
                professional advice.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              7. Your Data
            </h2>
            <p>
              You retain ownership of all data you upload or create in the
              Service (&quot;Your Data&quot;). By using the Service, you grant
              us a limited licence to process Your Data solely to provide and
              improve the Service. We will not use Your Data for purposes
              unrelated to the Service without your consent.
            </p>
            <p>
              You are responsible for ensuring that you have the necessary
              rights and consents to upload client data to the Service,
              including compliance with PIPEDA, BC PIPA, and any applicable
              real estate regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              8. Intellectual Property
            </h2>
            <p>
              The Service, including its design, code, branding, logos, and
              documentation, is owned by Realtors360 and protected by
              copyright, trademark, and other intellectual property laws. You
              may not copy, modify, or distribute any part of the Service
              except as expressly permitted by these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              9. Third-Party Services
            </h2>
            <p>
              The Service integrates with third-party providers including
              Twilio, Google, Resend, Supabase, and Cloudflare. Your use of
              these integrations is subject to the respective third party&apos;s
              terms and privacy policies. We are not responsible for the
              availability, accuracy, or practices of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              10. Fees and Payment
            </h2>
            <p>
              Certain features of the Service may require a paid subscription.
              Fees are billed in advance on a monthly or annual basis as
              selected during signup. All fees are in Canadian dollars unless
              otherwise stated. We may change pricing with 30 days&apos; notice.
              Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              11. Service Availability
            </h2>
            <p>
              We strive to maintain high availability but do not guarantee
              uninterrupted access. The Service may be temporarily unavailable
              for maintenance, updates, or circumstances beyond our control.
              We will make reasonable efforts to provide advance notice of
              planned downtime.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              12. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Realtors360 and its
              officers, directors, employees, and agents shall not be liable
              for any indirect, incidental, special, consequential, or
              punitive damages arising out of or related to your use of the
              Service, including but not limited to loss of profits, data, or
              business opportunities.
            </p>
            <p>
              Our total liability for any claim arising under these Terms
              shall not exceed the amount you paid us in the 12 months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              13. Disclaimer of Warranties
            </h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as
              available&quot; without warranties of any kind, whether express
              or implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, and
              non-infringement. We do not warrant that the Service will meet
              your requirements, be error-free, or be secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              14. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless Realtors360 from any
              claims, losses, damages, liabilities, and expenses (including
              legal fees) arising from your use of the Service, your violation
              of these Terms, or your violation of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              15. Termination
            </h2>
            <p>
              You may terminate your account at any time by contacting us. We
              may suspend or terminate your access if you breach these Terms
              or engage in conduct that we reasonably believe is harmful to
              other users or the Service. Upon termination, your right to use
              the Service ceases immediately. We will retain Your Data for a
              reasonable period to allow you to export it, after which it may
              be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              16. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of the Province of British
              Columbia and the federal laws of Canada applicable therein. Any
              disputes arising under these Terms shall be resolved in the
              courts located in British Columbia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              17. Changes to These Terms
            </h2>
            <p>
              We may update these Terms from time to time. We will notify you
              of material changes by posting the updated terms on this page
              and updating the effective date. Continued use of the Service
              after changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">
              18. Contact Us
            </h2>
            <p>
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Realtors360</strong>
              <br />
              Email: legal@realtors360.ai
              <br />
              Website: realtors360.ai
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link href="/login" className="hover:underline">
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
