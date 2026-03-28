import Link from "next/link";
import { getAllFeatures, getFeatureIcon } from "@/lib/help-parser";

export const dynamic = "force-dynamic";

export default function HelpPage() {
  const features = getAllFeatures();

  const quickStarts = [
    { title: "Quick Tour", description: "3-minute overview of the CRM", slug: "listing-workflow", duration: "3 min", emoji: "🚀" },
    { title: "Your First Listing", description: "Create and advance through 8 phases", slug: "listing-workflow", duration: "5 min", emoji: "🏠" },
    { title: "First Showing", description: "Schedule and confirm a showing", slug: "showing-management", duration: "2 min", emoji: "🔑" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Skip nav for accessibility */}
      <a href="#help-content" className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-6 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg">
        Skip to help content
      </a>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
        <p className="text-muted-foreground mt-1">
          Learn how to use ListingFlow — guides, scenarios, and walkthroughs for every feature.
        </p>
      </div>

      <div id="help-content">
        {/* Getting Started */}
        <section className="mb-10" aria-label="Getting started guides">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Getting Started
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickStarts.map((qs) => (
              <Link
                key={qs.title}
                href={`/help/${qs.slug}`}
                className="lf-card p-5 hover:shadow-md transition-shadow group"
              >
                <div className="text-3xl mb-3">{qs.emoji}</div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {qs.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{qs.description}</p>
                <span className="text-xs text-muted-foreground/70 mt-2 block">{qs.duration}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* All Features */}
        <section aria-label="Feature guides">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Features ({features.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => (
              <Link
                key={feature.slug}
                href={`/help/${feature.slug}`}
                className="lf-card p-5 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <div className="text-2xl">{getFeatureIcon(feature.slug)}</div>
                  {feature.changelog.length > 0 && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      Updated
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-foreground mt-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {feature.problem}
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground/70">
                  {feature.scenarioCount > 0 && (
                    <span>{feature.scenarioCount} scenarios</span>
                  )}
                  {feature.features.length > 0 && (
                    <span>{feature.features.length} features</span>
                  )}
                  {feature.faq.length > 0 && (
                    <span>{feature.faq.length} FAQ</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
