"use client";

import { useSession } from "next-auth/react";
import { Check, X } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { trialDaysRemaining } from "@/lib/plans";

const FEATURE_ROWS = [
  { label: "Contacts", free: "50", pro: "Unlimited", studio: "Unlimited", team: "Unlimited" },
  { label: "Listings", free: "—", pro: "Unlimited", studio: "Unlimited", team: "Unlimited" },
  { label: "AI Agents", free: "—", pro: "500/mo", studio: "Unlimited", team: "Unlimited" },
  { label: "Showings", free: "—", pro: true, studio: true, team: true },
  { label: "BC Forms", free: "—", pro: true, studio: true, team: true },
  { label: "AI Content", free: "—", pro: "—", studio: true, team: true },
  { label: "Website Marketing", free: "—", pro: "—", studio: true, team: true },
  { label: "MLS Workflow", free: "—", pro: "—", studio: true, team: true },
  { label: "Excel Import", free: "—", pro: "—", studio: true, team: true },
  { label: "Property Search", free: "—", pro: "—", studio: "—", team: true },
  { label: "AI Assistant", free: "—", pro: "—", studio: "—", team: true },
  { label: "Team Seats", free: "1", pro: "1", studio: "1", team: "5" },
];

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-green-500 mx-auto" />;
  if (value === "—" || value === false) return <X className="w-4 h-4 text-gray-300 mx-auto" />;
  return <span className="text-xs">{value}</span>;
}

export default function BillingPage() {
  const { data: session } = useSession();
  const trialEndsAt = (session?.user as Record<string, unknown> | undefined)?.trialEndsAt as string | null;
  const daysLeft = trialDaysRemaining(trialEndsAt);
  const currentPlan = (session?.user as Record<string, unknown> | undefined)?.plan as string || "free";

  const plans = [
    { key: "free", ...PLANS.free },
    { key: "professional", ...PLANS.professional },
    { key: "studio", ...PLANS.studio },
    { key: "team", ...PLANS.team },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your subscription</p>
        </div>

        {/* Trial banner */}
        {daysLeft > 0 && (
          <div className="p-4 bg-gradient-to-r from-[#4f35d2]/10 to-[#ff5c3a]/10 border border-[#4f35d2]/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Professional Trial Active</p>
                <p className="text-sm text-muted-foreground">{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining — all features unlocked</p>
              </div>
              <div className="text-2xl font-bold text-[#4f35d2]">{daysLeft}</div>
            </div>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4f35d2] to-[#ff5c3a] rounded-full transition-all"
                style={{ width: `${Math.max(5, ((14 - daysLeft) / 14) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Trial expired */}
        {trialEndsAt && daysLeft === 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="font-semibold text-amber-800">Your trial has ended</p>
            <p className="text-sm text-amber-700 mt-1">Upgrade to regain access to premium features</p>
          </div>
        )}

        {/* Plan comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Feature</th>
                {plans.map((p) => (
                  <th key={p.key} className="text-center py-3 px-2 min-w-[100px]">
                    <div className={`font-semibold ${p.key === currentPlan ? "text-[#4f35d2]" : "text-foreground"}`}>
                      {p.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.price === 0 ? "Free" : `$${p.price}/mo`}
                    </div>
                    {p.key === currentPlan && (
                      <span className="inline-block mt-1 text-[10px] bg-[#4f35d2] text-white px-1.5 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-dashed">
                  <td className="py-2.5 px-2 text-muted-foreground">{row.label}</td>
                  <td className="py-2.5 px-2 text-center"><FeatureCell value={row.free} /></td>
                  <td className="py-2.5 px-2 text-center"><FeatureCell value={row.pro} /></td>
                  <td className="py-2.5 px-2 text-center"><FeatureCell value={row.studio} /></td>
                  <td className="py-2.5 px-2 text-center"><FeatureCell value={row.team} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Upgrade CTAs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {plans.map((p) => (
            <div key={p.key} className={`p-4 rounded-xl border text-center ${
              p.key === currentPlan ? "border-[#4f35d2] bg-[#4f35d2]/5" : "border-gray-200"
            }`}>
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-lg font-bold mt-1">{p.price === 0 ? "Free" : `$${p.price}`}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
              {p.key === currentPlan ? (
                <span className="inline-block mt-2 text-xs text-[#4f35d2] font-medium">Current Plan</span>
              ) : p.price > (PLANS[currentPlan as keyof typeof PLANS]?.price ?? 0) ? (
                <a
                  href={`mailto:rahul@realtors360.com?subject=Upgrade to ${p.name}&body=I'd like to upgrade to the ${p.name} plan.`}
                  className="inline-block mt-2 px-4 py-1.5 bg-[#4f35d2] text-white text-xs font-medium rounded-lg hover:bg-[#3d28a8] transition-colors"
                >
                  Upgrade
                </a>
              ) : null}
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Upgrade via email for now. Stripe self-serve checkout coming soon.
        </p>
      </div>
    </div>
  );
}
