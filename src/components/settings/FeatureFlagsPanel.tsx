"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ToggleLeft, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

type FeatureRow = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  override?: boolean;
  effectiveEnabled: boolean;
};

export function FeatureFlagsPanel() {
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function fetchFeatures() {
    try {
      const res = await fetch("/api/features");
      if (res.ok) {
        const data = await res.json();
        setFeatures(data.features);
      }
    } catch {
      toast.error("Failed to load features");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeatures();
  }, []);

  async function toggleFeature(featureId: string, enabled: boolean) {
    setUpdating(featureId);
    try {
      const res = await fetch("/api/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureId, enabled }),
      });
      if (res.ok) {
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === featureId
              ? { ...f, override: enabled, effectiveEnabled: enabled }
              : f
          )
        );
        toast.success(`${featureId} ${enabled ? "enabled" : "disabled"}`);
      }
    } catch {
      toast.error("Failed to update feature");
    } finally {
      setUpdating(null);
    }
  }

  async function resetFeature(featureId: string, configDefault: boolean) {
    setUpdating(featureId);
    try {
      const res = await fetch("/api/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureId, enabled: null }),
      });
      if (res.ok) {
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === featureId
              ? { ...f, override: undefined, effectiveEnabled: configDefault }
              : f
          )
        );
        toast.success(`${featureId} reverted to default`);
      }
    } catch {
      toast.error("Failed to reset feature");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ToggleLeft className="h-4 w-4" />
          Feature Flags
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enable or disable features. Overrides take effect immediately.
        </p>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {features.map((feature) => {
            const hasOverride = feature.override !== undefined;
            const isUpdating = updating === feature.id;

            return (
              <div
                key={feature.id}
                className="flex items-center justify-between py-3 gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{feature.label}</p>
                    {hasOverride && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                        Override
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {feature.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasOverride && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2 gap-1"
                      onClick={() => resetFeature(feature.id, feature.enabled)}
                      disabled={isUpdating}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </Button>
                  )}
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={feature.effectiveEnabled}
                      onCheckedChange={(checked) =>
                        toggleFeature(feature.id, checked)
                      }
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
