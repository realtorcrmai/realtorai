import { notFound } from "next/navigation";
import Link from "next/link";
import { getFeature, getAllFeatures, getFeatureIcon } from "@/lib/help-parser";
import type { Metadata } from "next";

// Public page — no auth required, SEO-indexed
export async function generateStaticParams() {
  return getAllFeatures()
    .filter((f) => f.visibility !== "internal")
    .map((f) => ({ slug: f.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) return { title: "Not Found" };
  return {
    title: `${feature.title} — RealtorAI Help`,
    description: feature.problem.slice(0, 160),
    openGraph: {
      title: `${feature.title} — RealtorAI Help`,
      description: feature.problem.slice(0, 160),
      type: "article",
    },
  };
}

export default async function PublicDocsPage({ params }: Props) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature || feature.visibility === "internal") notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* Simple public header */}
      <header className="border-b border-border py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/docs" className="font-bold text-lg text-foreground">
            RealtorAI Help
          </Link>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </header>

      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: feature.title,
            description: feature.problem.slice(0, 160),
            author: { "@type": "Organization", name: "RealtorAI" },
            publisher: { "@type": "Organization", name: "RealtorAI" },
            ...(feature.faq.length > 0 && {
              mainEntity: feature.faq.map((q) => ({
                "@type": "Question",
                name: q.question,
                acceptedAnswer: { "@type": "Answer", text: q.answer },
              })),
            }),
          }),
        }}
      />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <span className="text-3xl" aria-hidden="true">{getFeatureIcon(slug)}</span>
          <h1 className="text-3xl font-bold text-foreground mt-3">{feature.title}</h1>
          <p className="text-lg text-muted-foreground mt-2">{feature.problem}</p>
        </div>

        {/* Roles */}
        {feature.roles.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Who uses this</h2>
            {feature.roles.map((role) => (
              <div key={role.name} className="mb-2">
                <span className="font-medium text-foreground">{role.name}</span>
                <span className="text-muted-foreground"> — {role.actions}</span>
              </div>
            ))}
          </section>
        )}

        {/* Scenarios */}
        {feature.scenarios.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Scenarios</h2>
            {feature.scenarios.map((s, i) => (
              <div key={i} className="mb-6 border border-border rounded-lg p-5">
                <h3 className="font-medium text-foreground mb-3">{s.name}</h3>
                {s.steps.length > 0 && (
                  <ol className="space-y-2 mb-3">
                    {s.steps.map((step, j) => (
                      <li key={j} className="text-sm text-foreground flex gap-2">
                        <span className="font-bold text-primary">{j + 1}.</span> {step}
                      </li>
                    ))}
                  </ol>
                )}
                {s.expectedOutcome && (
                  <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">{s.expectedOutcome}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* FAQ */}
        {feature.faq.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">FAQ</h2>
            {feature.faq.map((q, i) => (
              <div key={i} className="mb-4">
                <h3 className="font-medium text-foreground">{q.question}</h3>
                <p className="text-sm text-muted-foreground mt-1">{q.answer}</p>
              </div>
            ))}
          </section>
        )}

        {/* CTA */}
        <div className="mt-12 p-8 rounded-xl bg-primary/5 border border-primary/10 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Ready to automate your listing workflow?</h2>
          <p className="text-muted-foreground mb-4">
            RealtorAI handles FINTRAC, BCREA forms, MLS prep, and showing management for BC realtors.
          </p>
          <Link href="/login" className="lf-btn inline-flex">
            Get Started
          </Link>
        </div>
      </main>
    </div>
  );
}
