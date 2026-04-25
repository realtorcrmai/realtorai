import Link from "next/link";

interface PipelineStage {
  key: string;
  label: string;
  count: number;
  value: number;
  color: string;
}

interface PipelineSnapshotProps {
  stages: PipelineStage[];
  totalGCI: number;
}

const currencyFmt = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

function formatGCI(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${Math.round(amount)}`;
}

function stageHref(key: string): string {
  return `/contacts?stage=${key}`;
}

export default function PipelineSnapshot({
  stages,
  totalGCI,
}: PipelineSnapshotProps) {
  const totalCount = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="rounded-lg overflow-hidden bg-card border border-border">
    <div className="p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Pipeline
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-emerald-700">
          💰 GCI {formatGCI(totalGCI)}
        </span>
      </div>

      {/* Segmented bar */}
      <div className="flex h-10 rounded-lg overflow-hidden mb-4">
        {stages.map((stage) => {
          const pct = totalCount > 0 ? (stage.count / totalCount) * 100 : 0;
          if (pct === 0) return null;
          return (
            <Link
              key={stage.key}
              href={stageHref(stage.key)}
              className={`${stage.color} flex items-center justify-center transition-all duration-300 hover:brightness-110 cursor-pointer`}
              style={{ width: `${pct}%` }}
              title={`${stage.label}: ${stage.count} contacts`}
            >
              <span className="text-xs font-bold text-primary">
                {stage.count}
              </span>
            </Link>
          );
        })}
        {totalCount === 0 && (
          <div className="w-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No contacts yet</span>
          </div>
        )}
      </div>

      {/* Labels row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stages.map((stage) => (
          <Link
            key={stage.key}
            href={stageHref(stage.key)}
            className={`flex items-start gap-2 min-w-0 rounded-lg p-1.5 -m-1.5 transition-colors hover:bg-muted/60 cursor-pointer group ${stage.count === 0 ? "opacity-40" : ""}`}
          >
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${stage.color} group-hover:ring-2 group-hover:ring-offset-1 group-hover:ring-current transition-all`}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {stage.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {stage.count} contact{stage.count !== 1 ? "s" : ""}
              </p>
              <p className="text-xs font-semibold text-foreground">
                {stage.count > 0 ? currencyFmt.format(stage.value) : "—"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
    </div>
  );
}
