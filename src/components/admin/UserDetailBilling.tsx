"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// base-ui Select passes (value: string | null, eventDetails) — wrapper to satisfy Dispatch<SetStateAction<string>>
function safeSet(setter: (v: string) => void) {
  return (value: string | null) => {
    if (value !== null) setter(value);
  };
}
import { FEATURE_KEYS, FEATURE_META, type FeatureKey } from "@/lib/features";
import { PLANS, PLAN_IDS, trialDaysRemaining, isTrialActive } from "@/lib/plans";
import {
  changeUserPlan,
  startUserTrial,
  updateUserFeatures,
} from "@/actions/admin";
import { toast } from "sonner";

interface UserDetailBillingProps {
  user: any;
  onRefresh: () => void;
}

export function UserDetailBilling({ user, onRefresh }: UserDetailBillingProps) {
  const [isPending, startTransition] = useTransition();
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showTrialDialog, setShowTrialDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(user.plan ?? "free");
  const [trialPlan, setTrialPlan] = useState("professional");
  const [trialDays, setTrialDays] = useState(14);

  const currentPlan = PLANS[user.plan] ?? PLANS.free;
  const enabledFeatures = (user.enabled_features ?? []) as string[];
  const trialActive = isTrialActive(user.trial_ends_at);
  const daysLeft = trialDaysRemaining(user.trial_ends_at);

  function handleChangePlan() {
    startTransition(async () => {
      const result = await changeUserPlan(user.id, selectedPlan);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Plan changed to ${PLANS[selectedPlan]?.name ?? selectedPlan}`);
        setShowPlanDialog(false);
        onRefresh();
      }
    });
  }

  function handleStartTrial() {
    startTransition(async () => {
      const result = await startUserTrial(user.id, trialPlan, trialDays);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${trialDays}-day trial started on ${PLANS[trialPlan]?.name ?? trialPlan}`);
        setShowTrialDialog(false);
        onRefresh();
      }
    });
  }

  function handleFeatureToggle(featureKey: FeatureKey, enabled: boolean) {
    const updated = enabled
      ? [...enabledFeatures, featureKey]
      : enabledFeatures.filter((f) => f !== featureKey);

    startTransition(async () => {
      const result = await updateUserFeatures(user.id, updated);
      if (result.error) {
        toast.error(result.error);
      } else {
        onRefresh();
      }
    });
  }

  // Usage vs limits
  const limits = currentPlan.limits;
  const usageRows = [
    {
      label: "Contacts",
      used: user._counts?.contacts ?? 0,
      limit: limits.contacts,
    },
    {
      label: "Listings",
      used: user._counts?.listings ?? 0,
      limit: limits.listings,
    },
    {
      label: "Emails / month",
      used: user._counts?.newsletters ?? 0,
      limit: limits.emails_per_month,
    },
  ];

  return (
    <div className={`space-y-4 ${isPending ? "opacity-70 pointer-events-none" : ""}`}>
      {/* Card 1: Current Plan */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-foreground">
              {currentPlan.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {currentPlan.price === 0
                ? "Free"
                : `$${currentPlan.price}/mo`}
            </p>
            {trialActive && (
              <p className="text-sm text-amber-600 font-medium mt-1">
                Trial: {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining
                {user.trial_plan && ` (${PLANS[user.trial_plan]?.name ?? user.trial_plan})`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="brand"
              size="sm"
              onClick={() => setShowPlanDialog(!showPlanDialog)}
            >
              Change Plan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTrialDialog(!showTrialDialog)}
            >
              Start Trial
            </Button>
          </div>
        </div>

        {/* Inline plan change form */}
        {showPlanDialog && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <p className="text-sm font-medium text-foreground">Select new plan</p>
            <Select value={selectedPlan} onValueChange={safeSet(setSelectedPlan)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_IDS.map((pid) => (
                  <SelectItem key={pid} value={pid}>
                    {PLANS[pid].name} - {PLANS[pid].price === 0 ? "Free" : `$${PLANS[pid].price}/mo`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="brand" size="sm" onClick={handleChangePlan}>
                Confirm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPlanDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Inline trial start form */}
        {showTrialDialog && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <p className="text-sm font-medium text-foreground">Start a trial</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Plan</label>
                <Select value={trialPlan} onValueChange={safeSet(setTrialPlan)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_IDS.filter((p) => p !== "free" && p !== "admin").map(
                      (pid) => (
                        <SelectItem key={pid} value={pid}>
                          {PLANS[pid].name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Days</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  className="flex h-8 w-full rounded-lg border border-border bg-background px-3 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="brand" size="sm" onClick={handleStartTrial}>
                Start Trial
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTrialDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Card 2: Enabled Features */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">
            Enabled Features
          </p>
          <span className="text-xs text-muted-foreground">
            {enabledFeatures.length}/{FEATURE_KEYS.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {FEATURE_KEYS.map((key) => {
            const meta = FEATURE_META[key];
            const isEnabled = enabledFeatures.includes(key);
            return (
              <div
                key={key}
                className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-accent/40 transition-colors"
              >
                <p className="text-sm text-foreground truncate">{meta.label}</p>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) =>
                    handleFeatureToggle(key, checked)
                  }
                  className="shrink-0 ml-2"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 3: Usage vs Limits */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm font-semibold text-foreground mb-3">
          Usage vs Limits
        </p>
        <div className="space-y-3">
          {usageRows.map((row) => {
            const limitLabel = row.limit === -1 ? "Unlimited" : row.limit.toLocaleString();
            const pct =
              row.limit > 0 ? Math.min((row.used / row.limit) * 100, 100) : 0;

            return (
              <div key={row.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="text-foreground font-medium">
                    {row.used.toLocaleString()} / {limitLabel}
                  </span>
                </div>
                {row.limit > 0 && (
                  <div className="h-1.5 rounded-full bg-muted mt-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        pct > 90
                          ? "bg-red-500"
                          : pct > 70
                          ? "bg-amber-500"
                          : "bg-brand"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
