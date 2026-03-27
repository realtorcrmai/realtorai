import { notFound } from "next/navigation";
import Link from "next/link";
import { getFeature, getAllFeatures, getFeatureIcon } from "@/lib/help-parser";
import { HelpDetailClient } from "@/components/help/HelpDetailClient";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getAllFeatures().map((f) => ({ slug: f.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function HelpDetailPage({ params }: Props) {
  const { slug } = await params;
  const feature = getFeature(slug);
  if (!feature) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Skip nav */}
      <a href="#help-detail" className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-6 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg">
        Skip to article content
      </a>

      {/* Back link */}
      <Link
        href="/help"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <span aria-hidden="true">&larr;</span> Back to Help Center
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl" aria-hidden="true">{getFeatureIcon(slug)}</span>
          <h1 className="text-2xl font-bold text-foreground">{feature.title}</h1>
        </div>
        <p className="text-muted-foreground">{feature.problem}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground/70">
          <span>Owner: {feature.owner}</span>
          {feature.lastReviewed && <span>Reviewed: {feature.lastReviewed}</span>}
          <span>{feature.wordCount} words</span>
        </div>
      </div>

      <div id="help-detail">
        <HelpDetailClient feature={feature} />
      </div>
    </div>
  );
}
