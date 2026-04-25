"use client";

import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PLANS } from "@/lib/plans";
import { FEATURE_KEYS, FEATURE_META, getUserFeatures } from "@/lib/features";
import { updateUserFeatures, changeUserPlan } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface UserDetailSettingsProps {
  user: {
    id: string;
    email: string;
    timezone: string | null;
    pref_channel?: string;
    casl_consent_given?: boolean;
    casl_consent_date?: string;
    newsletter_unsubscribed?: boolean;
    plan?: string;
    role?: string;
    created_at?: string;
    last_active_at?: string;
    enabled_features?: string[] | null;
    [key: string]: unknown;
  };
}

function StatusBadge({
  connected,
  label,
}: {
  connected: boolean;
  label: string;
}) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
        connected
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-gray-50 text-gray-500 border-gray-200"
      }`}
    >
      {label}
    </span>
  );
}

export function UserDetailSettings({ user }: UserDetailSettingsProps) {
  const plan = PLANS[user.plan ?? "free"] ?? PLANS.free;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Feature toggles — start from user's current enabled_features or derive from plan
  const [features, setFeatures] = useState<Set<string>>(() => {
    const initial = user.enabled_features ?? getUserFeatures(user.plan ?? "free");
    return new Set(initial);
  });

  // Plan selector
  const [selectedPlan, setSelectedPlan] = useState(user.plan ?? "free");

  function handleFeatureToggle(key: string) {
    setFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleSaveFeatures() {
    startTransition(async () => {
      const result = await updateUserFeatures(user.id, [...features]);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Feature gates updated");
        router.refresh();
      }
    });
  }

  function handleChangePlan() {
    if (selectedPlan === user.plan) return;
    startTransition(async () => {
      const result = await changeUserPlan(user.id, selectedPlan);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Plan changed to ${selectedPlan}`);
        // Reset features to plan defaults
        setFeatures(new Set(getUserFeatures(selectedPlan)));
        router.refresh();
      }
    });
  }

  function handleResetToDefaults() {
    const defaults = getUserFeatures(user.plan ?? "free");
    setFeatures(new Set(defaults));
    toast.info("Reset to plan defaults — click Save to apply");
  }

  // Plan features for comparison
  const planDefaults = new Set(getUserFeatures(user.plan ?? "free"));
  const hasChanges = (() => {
    const current = user.enabled_features ?? [...planDefaults];
    if (current.length !== features.size) return true;
    return current.some((f) => !features.has(f)) || [...features].some((f) => !current.includes(f));
  })();

  function copyId() {
    navigator.clipboard.writeText(user.id);
    toast.success("Copied");
  }

  return (
    <div className="space-y-6">

      {/* Card 0: Plan & Feature Gates */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Plan & Feature Gates
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Control which features this user can access. Overrides are per-user and persist across sessions.
          </p>
        </div>

        {/* Plan selector */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <label htmlFor="plan-select" className="text-sm font-medium text-foreground">
              Plan
            </label>
            <div className="flex items-center gap-2">
              <select
                id="plan-select"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Object.entries(PLANS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleChangePlan}
                disabled={isPending || selectedPlan === user.plan}
              >
                Change Plan
              </Button>
            </div>
          </div>
        </div>

        {/* Feature toggles grid */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">
              {features.size} of {FEATURE_KEYS.length} features enabled
            </p>
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="text-xs text-primary hover:underline"
            >
              Reset to plan defaults
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {FEATURE_KEYS.map((key) => {
              const meta = FEATURE_META[key];
              const enabled = features.has(key);
              const isDefault = planDefaults.has(key);
              const isOverride = enabled !== isDefault;

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleFeatureToggle(key)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                    enabled
                      ? "bg-primary/5 border-primary/30 text-foreground"
                      : "bg-muted/30 border-border text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{meta.label}</span>
                    <div className="flex items-center gap-1.5">
                      {isOverride && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          Override
                        </span>
                      )}
                      <span
                        className={`w-8 h-4.5 rounded-full transition-colors relative inline-flex items-center ${
                          enabled ? "bg-primary" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute transition-transform ${
                            enabled ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Save button */}
          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border">
            {hasChanges && (
              <span className="text-xs text-amber-600 font-medium mr-auto">
                Unsaved changes
              </span>
            )}
            <Button
              variant="brand"
              size="sm"
              onClick={handleSaveFeatures}
              disabled={isPending || !hasChanges}
            >
              {isPending ? "Saving..." : "Save Feature Gates"}
            </Button>
          </div>
        </div>
      </div>

      {/* Card 1: Integrations */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Integrations
          </h3>
        </div>
        <div className="px-4 py-1">
          <div className="flex items-center justify-between py-2.5 border-b border-border">
            <span className="text-sm text-muted-foreground">
              Google Calendar
            </span>
            <StatusBadge connected={false} label="Not connected" />
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-border">
            <span className="text-sm text-muted-foreground">
              Email (Resend)
            </span>
            <StatusBadge connected={true} label="Platform default" />
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground">Twilio SMS</span>
            <StatusBadge connected={true} label="Platform shared number" />
          </div>
        </div>
      </div>

      {/* Card 2: Communication Preferences */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Communication Preferences
          </h3>
        </div>
        <div className="px-4 py-1">
          <div className="flex items-center justify-between py-2.5 border-b border-border">
            <span className="text-sm text-muted-foreground">
              Preferred Channel
            </span>
            <span className="text-sm text-foreground font-medium">
              {user.pref_channel
                ? user.pref_channel.charAt(0).toUpperCase() +
                  user.pref_channel.slice(1)
                : "Not set"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Timezone</span>
            <span className="text-sm text-foreground font-medium">
              {user.timezone ?? "Default (America/Vancouver)"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground">
              Newsletter Status
            </span>
            {user.newsletter_unsubscribed ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                Unsubscribed
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Subscribed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Compliance */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Compliance</h3>
        </div>
        <div className="px-4 py-1">
          <div className="flex items-center justify-between py-2.5 border-b border-border">
            <span className="text-sm text-muted-foreground">CASL Consent</span>
            {user.casl_consent_given ? (
              <span className="text-sm text-foreground font-medium">
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 mr-2">
                  Granted
                </span>
                {user.casl_consent_date
                  ? format(new Date(user.casl_consent_date as string), "MMM d, yyyy")
                  : ""}
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                Not recorded
              </span>
            )}
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground">Data Created</span>
            <span className="text-sm text-foreground font-medium">
              {user.created_at
                ? format(new Date(user.created_at), "MMM d, yyyy")
                : "Unknown"}
            </span>
          </div>
        </div>
      </div>

      {/* Card 4: Account Info */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Account Info
          </h3>
        </div>
        <div className="px-4 py-1">
          <div className="flex items-center justify-between py-2.5 border-b border-border">
            <span className="text-sm text-muted-foreground">User ID</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground font-mono">
                {user.id}
              </span>
              <button
                type="button"
                onClick={copyId}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy user ID"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Plan</span>
            <span className="text-sm text-foreground font-medium">
              {plan.name}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Role</span>
            <span className="text-sm text-foreground font-medium capitalize">
              {user.role ?? "realtor"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Created</span>
            <span className="text-sm text-foreground font-medium">
              {user.created_at
                ? format(new Date(user.created_at), "MMM d, yyyy 'at' h:mm a")
                : "Unknown"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground">Last Active</span>
            <span className="text-sm text-foreground font-medium">
              {user.last_active_at
                ? format(
                    new Date(user.last_active_at as string),
                    "MMM d, yyyy 'at' h:mm a"
                  )
                : "Never"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
