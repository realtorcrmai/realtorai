"use client";

function formatNetworkValue(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `$${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function NetworkStatsCard({
  connectionCount,
  referralCount,
  networkValue,
  dataScore,
}: {
  connectionCount: number;
  referralCount: number;
  networkValue: number;
  dataScore: number;
}) {
  const stats = [
    { label: "Connections", value: connectionCount.toString() },
    { label: "Referrals", value: referralCount.toString() },
    { label: "Network Value", value: formatNetworkValue(networkValue) },
    { label: "Data Score", value: `${Math.round(dataScore)}%` },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <span>📊</span>
        Network Stats
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#f8f7fd] rounded-lg p-3 text-center"
          >
            <p className="text-lg font-bold text-primary">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
