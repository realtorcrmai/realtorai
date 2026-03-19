"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { FEATURE_KEYS, FEATURE_META, type FeatureKey } from "@/lib/features";
import { updateUserFeatures, toggleUserActive } from "@/actions/admin";
import type { User } from "@/types";
import { toast } from "sonner";

export function RealtorCard({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition();
  const enabledFeatures = (user.enabled_features ?? []) as string[];

  function handleFeatureToggle(featureKey: FeatureKey, enabled: boolean) {
    const updated = enabled
      ? [...enabledFeatures, featureKey]
      : enabledFeatures.filter((f) => f !== featureKey);

    startTransition(async () => {
      const result = await updateUserFeatures(user.id, updated);
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleActiveToggle(isActive: boolean) {
    startTransition(async () => {
      const result = await toggleUserActive(user.id, isActive);
      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div
      className={`glass rounded-2xl p-5 elevation-2 transition-all duration-200 ${
        !user.is_active ? "opacity-60" : ""
      } ${isPending ? "pointer-events-none opacity-70" : ""}`}
    >
      {/* User Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full gradient-indigo text-white text-sm font-bold ring-2 ring-primary/20">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {user.name ?? "Unnamed User"}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              user.role === "admin"
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-primary/10 text-primary border border-primary/20"
            }`}
          >
            {user.role}
          </span>
        </div>
      </div>

      {/* Active Toggle */}
      <div className="flex items-center justify-between py-2 px-1 mb-3 border-b border-border/50">
        <span className="text-sm font-medium text-foreground">
          Account Active
        </span>
        <Switch
          checked={user.is_active}
          onCheckedChange={handleActiveToggle}
        />
      </div>

      {/* Feature Toggles */}
      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Features
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {FEATURE_KEYS.map((key) => {
            const meta = FEATURE_META[key];
            const isEnabled = enabledFeatures.includes(key);
            return (
              <div
                key={key}
                className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-accent/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {meta.label}
                  </p>
                </div>
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
    </div>
  );
}
