import Link from "next/link";

interface EmptyStateHelpProps {
  icon: string;
  title: string;
  description: string;
  helpSlug: string;
  primaryAction: { label: string; href: string };
}

export function EmptyStateHelp({ icon, title, description, helpSlug, primaryAction }: EmptyStateHelpProps) {
  return (
    <div className="lf-card text-center py-16 px-8 max-w-md mx-auto" role="status">
      <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href={primaryAction.href} className="lf-btn">{primaryAction.label}</Link>
        <Link href={`/help/${helpSlug}`} className="lf-btn-ghost">Read Guide</Link>
      </div>
    </div>
  );
}
