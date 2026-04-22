export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { buttonVariants } from '@/components/ui/button';

const STARTER_FEATURES = [
  '2 editions per month',
  'All block types',
  'A/B subject lines (view-only)',
  'Community support',
];

const PRO_FEATURES = [
  'Unlimited editions',
  'All block types',
  'A/B subject line testing',
  'Voice learning AI',
  'Monday auto-draft cron',
  'Priority email support',
];

export default function EditorialUpgradePage() {
  return (
    <div className="flex flex-col gap-6 px-6 py-6 max-w-4xl">
      <PageHeader
        title="Upgrade to Pro"
        subtitle="Unlock unlimited editorial editions and advanced AI features"
        breadcrumbs={[
          { label: 'Newsletters', href: '/newsletters' },
          { label: 'Editorial', href: '/newsletters/editorial' },
          { label: 'Upgrade' },
        ]}
      />

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Starter card */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground mb-3">
              Current Plan
            </div>
            <h2 className="text-xl font-bold text-foreground">Free Starter</h2>
            <p className="text-3xl font-bold text-foreground mt-1">
              $0
              <span className="text-base font-normal text-muted-foreground"> / month</span>
            </p>
          </div>

          <ul className="flex flex-col gap-2.5">
            {STARTER_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-muted-foreground" aria-hidden="true">○</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-2">
            <button
              type="button"
              className={buttonVariants({ variant: 'outline', size: 'default' }) + ' w-full justify-center opacity-50 cursor-not-allowed'}
              disabled
              aria-label="Current plan — already on starter"
            >
              Current Plan
            </button>
          </div>
        </div>

        {/* Pro card */}
        <div className="rounded-xl border-2 border-brand bg-card p-6 flex flex-col gap-4 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow-sm">
              ★ Most Popular
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand mb-3">
              Pro
            </div>
            <h2 className="text-xl font-bold text-foreground">Pro</h2>
            <p className="text-3xl font-bold text-foreground mt-1">
              $79
              <span className="text-base font-normal text-muted-foreground"> / month</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">14-day free trial — no credit card required</p>
          </div>

          <ul className="flex flex-col gap-2.5">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-success" aria-hidden="true">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-2">
            <a
              href="mailto:hello@magnate360.com?subject=Pro%20Trial%20Request&body=Hi%2C%20I%27d%20like%20to%20start%20a%20Pro%20trial%20for%20the%20Editorial%20Newsletter%20System."
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'brand', size: 'default' }) + ' w-full justify-center'}
              aria-label="Start free Pro trial"
            >
              Start Free Trial →
            </a>
          </div>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Feature Comparison</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground w-1/2">
                Feature
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">
                Starter
              </th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-brand">
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Editions per month', '2', 'Unlimited'],
              ['All block types', '✓', '✓'],
              ['AI content generation', '✓', '✓'],
              ['A/B subject testing', '—', '✓'],
              ['Voice learning AI', '—', '✓'],
              ['Monday auto-draft', '—', '✓'],
              ['Data source health', '✓', '✓'],
              ['Support', 'Community', 'Priority email'],
            ].map(([feature, starter, pro], idx) => (
              <tr
                key={idx}
                className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-5 py-3 font-medium text-foreground">{feature}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{starter}</td>
                <td className={`px-4 py-3 text-center font-medium ${pro === '—' ? 'text-muted-foreground' : 'text-success'}`}>
                  {pro}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Have questions before upgrading?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Our team typically replies within 2 business hours.
          </p>
        </div>
        <a
          href="mailto:hello@magnate360.com?subject=Editorial%20Pro%20Question"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Book a Call
        </a>
      </div>

      <div className="text-center">
        <Link
          href="/newsletters/editorial"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Editorial
        </Link>
      </div>
    </div>
  );
}
