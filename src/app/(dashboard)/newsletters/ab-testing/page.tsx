export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { ABTestingClient } from "@/components/newsletters/ABTestingClient";
import { getABTests, getDraftEditions } from "@/actions/editorial";

export default async function ABTestingPage() {
  const [testsResult, draftsResult] = await Promise.all([
    getABTests(),
    getDraftEditions(),
  ]);

  const tests = testsResult.data ?? [];
  const drafts = draftsResult.data ?? [];

  // Stats
  const running = tests.filter(
    (t) => t.active_variant === "ab_testing" && !t.ab_winner,
  ).length;
  const completed = tests.filter((t) => t.ab_winner).length;
  const configured = tests.filter(
    (t) => t.subject_b && t.active_variant !== "ab_testing" && !t.ab_winner,
  ).length;

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="A/B Subject Line Testing"
        subtitle="Split-test email subject lines to improve open rates"
        breadcrumbs={[
          { label: "Email Marketing", href: "/newsletters" },
          { label: "A/B Testing" },
        ]}
        actions={
          <a
            href="/newsletters/editorial"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            📰 Editorial Editions →
          </a>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">🧪</span>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {tests.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Total tests</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">🔬</span>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {running}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Running now</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">⚙️</span>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {configured}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configured
              </p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">🏆</span>
            <div>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {completed}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed
              </p>
            </div>
          </div>
        </div>

        <ABTestingClient tests={tests as any} drafts={drafts as any} />
      </div>
    </div>
  );
}
