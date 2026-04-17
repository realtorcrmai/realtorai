"use client";

import Link from "next/link";
import { Users, DollarSign, Activity, GraduationCap, TrendingUp, ArrowUp, ArrowDown, Info } from "lucide-react";

interface OverviewKPIsProps {
  kpis: {
    totalUsers: number;
    mrr: number;
    activeToday: number;
    onboardingRate: number;
    trialConversion: number;
    systemOk: boolean;
  };
  trends?: Record<string, number>;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const points = data
    .map(
      (v, i) =>
        `${(i / Math.max(data.length - 1, 1)) * 80},${32 - (v / max) * 28}`
    )
    .join(" ");
  return (
    <svg viewBox="0 0 80 32" className="w-20 h-8 mt-2">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendArrow({ value }: { value: number | undefined }) {
  if (value === undefined || value === 0) return null;
  return value > 0 ? (
    <span className="flex items-center gap-0.5 text-xs text-emerald-600">
      <ArrowUp className="h-3 w-3" />
      {value}%
    </span>
  ) : (
    <span className="flex items-center gap-0.5 text-xs text-red-500">
      <ArrowDown className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  );
}

export function OverviewKPIs({ kpis, trends }: OverviewKPIsProps) {
  const allDefault =
    kpis.totalUsers === 0 &&
    kpis.mrr === 0 &&
    kpis.activeToday === 0 &&
    kpis.onboardingRate === 0 &&
    kpis.trialConversion === 0;

  const cards = [
    {
      label: "Total Users",
      value: kpis.totalUsers.toLocaleString(),
      emptyHint: "Invite your first realtor",
      href: "/admin/users",
      icon: Users,
      trendKey: "totalUsers",
      sparkColor: "var(--brand)",
      isEmpty: kpis.totalUsers === 0,
    },
    {
      label: "MRR",
      value: `$${kpis.mrr.toLocaleString()}`,
      emptyHint: "Revenue starts with your first paid user",
      href: "/admin/revenue",
      icon: DollarSign,
      trendKey: "mrr",
      sparkColor: "#00BDA5",
      isEmpty: kpis.mrr === 0,
    },
    {
      label: "Active Today",
      value: kpis.activeToday.toLocaleString(),
      emptyHint: "No sessions today",
      href: "/admin/users",
      icon: Activity,
      trendKey: "activeToday",
      sparkColor: "var(--brand)",
      isEmpty: kpis.activeToday === 0,
    },
    {
      label: "Onboarding Rate",
      value: kpis.onboardingRate === 0 ? "--" : `${kpis.onboardingRate}%`,
      emptyHint: "Needs signup data",
      href: "#funnel",
      icon: GraduationCap,
      trendKey: "onboardingRate",
      sparkColor: "#6366f1",
      isEmpty: kpis.onboardingRate === 0,
    },
    {
      label: "Trial Conversion",
      value: kpis.trialConversion === 0 ? "--" : `${kpis.trialConversion}%`,
      emptyHint: "Needs trial data",
      href: "/admin/revenue",
      icon: TrendingUp,
      trendKey: "trialConversion",
      sparkColor: "#00BDA5",
      isEmpty: kpis.trialConversion === 0,
    },
  ];

  return (
    <>
      {allDefault && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3 mb-4">
          <Info className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Dashboard is warming up</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Analytics data will populate as users sign up and interact with the platform. Run the seed script to backfill from existing data.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const trend = trends?.[card.trendKey];
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <TrendArrow value={trend} />
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.label}
              </p>
              {card.isEmpty && (
                <p className="text-xs text-muted-foreground mt-1">
                  {card.emptyHint}
                </p>
              )}
              <Sparkline data={[]} color={card.sparkColor} />
            </Link>
          );
        })}

        {/* System Status — special card */}
        <Link
          href="/admin/system"
          className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span
              className={`h-3 w-3 rounded-full ${
                kpis.systemOk ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {kpis.systemOk ? "All OK" : "Issues"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">System Status</p>
        </Link>
      </div>
    </>
  );
}
