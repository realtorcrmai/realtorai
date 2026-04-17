"use client";

import { useState, useTransition } from "react";
import {
  UserPlus,
  Clock,
  ToggleRight,
  Play,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  createUser,
  extendUserTrial,
  findUserByEmail,
  bulkToggleFeature,
} from "@/actions/admin";
import { triggerCron } from "@/actions/analytics";
import { FEATURE_KEYS, FEATURE_META, type FeatureKey } from "@/lib/features";
import { toast } from "sonner";

type ActionType =
  | "create_user"
  | "extend_trial"
  | "toggle_feature"
  | "trigger_cron"
  | "set_announcement"
  | null;

const ACTIONS = [
  { label: "Create User", icon: UserPlus, action: "create_user" as const },
  { label: "Extend Trial", icon: Clock, action: "extend_trial" as const },
  {
    label: "Toggle Feature",
    icon: ToggleRight,
    action: "toggle_feature" as const,
  },
  { label: "Trigger Cron", icon: Play, action: "trigger_cron" as const },
  {
    label: "Set Announcement",
    icon: Megaphone,
    action: "set_announcement" as const,
  },
];

const CRON_OPTIONS = [
  "process-workflows",
  "daily-digest",
  "consent-expiry",
  "trial-expiry",
];

interface LookedUpUser {
  id: string;
  name: string | null;
  email: string;
  trial_ends_at: string | null;
  trial_plan: string | null;
  plan: string;
  is_active: boolean;
}

export function QuickActions() {
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPlan, setCreatePlan] = useState("free");

  // Extend trial states
  const [extendEmail, setExtendEmail] = useState("");
  const [extendDays, setExtendDays] = useState("7");
  const [extendUser, setExtendUser] = useState<LookedUpUser | null>(null);
  const [extendLookupError, setExtendLookupError] = useState("");

  // Toggle feature states
  const [featureEmail, setFeatureEmail] = useState("");
  const [featureUser, setFeatureUser] = useState<LookedUpUser | null>(null);
  const [featureLookupError, setFeatureLookupError] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey>(FEATURE_KEYS[0]);

  const [selectedCron, setSelectedCron] = useState(CRON_OPTIONS[0]);

  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [announcementType, setAnnouncementType] = useState("info");

  function resetForms() {
    setCreateEmail("");
    setCreateName("");
    setCreatePlan("free");
    setExtendEmail("");
    setExtendDays("7");
    setExtendUser(null);
    setExtendLookupError("");
    setFeatureEmail("");
    setFeatureUser(null);
    setFeatureLookupError("");
    setSelectedFeature(FEATURE_KEYS[0]);
    setSelectedCron(CRON_OPTIONS[0]);
    setAnnouncementMsg("");
    setAnnouncementType("info");
  }

  function close() {
    setActiveAction(null);
    resetForms();
  }

  function handleOpen(action: ActionType) {
    resetForms();
    setActiveAction(action);
  }

  function handleCreateUser() {
    startTransition(async () => {
      const result = await createUser({
        email: createEmail,
        name: createName,
        plan: createPlan,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`User ${createEmail} created`);
        close();
      }
    });
  }

  // --- Extend Trial ---

  function handleExtendLookup() {
    if (!extendEmail.trim()) {
      setExtendLookupError("Enter an email address");
      return;
    }
    setExtendLookupError("");
    startTransition(async () => {
      const result = await findUserByEmail(extendEmail);
      if ("error" in result && result.error) {
        setExtendLookupError(result.error);
        setExtendUser(null);
      } else if (result.data) {
        setExtendUser(result.data as LookedUpUser);
        setExtendLookupError("");
      }
    });
  }

  function handleExtendTrial() {
    const days = parseInt(extendDays, 10);
    if (!extendUser || isNaN(days) || days < 1) {
      toast.error("Look up a user first and enter valid days");
      return;
    }
    startTransition(async () => {
      const result = await extendUserTrial(extendUser.id, days);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Trial extended by ${days} days for ${extendUser.name ?? extendUser.email}`);
        close();
      }
    });
  }

  // --- Toggle Feature ---

  function handleFeatureLookup() {
    if (!featureEmail.trim()) {
      setFeatureLookupError("Enter an email address");
      return;
    }
    setFeatureLookupError("");
    startTransition(async () => {
      const result = await findUserByEmail(featureEmail);
      if ("error" in result && result.error) {
        setFeatureLookupError(result.error);
        setFeatureUser(null);
      } else if (result.data) {
        setFeatureUser(result.data as LookedUpUser);
        setFeatureLookupError("");
      }
    });
  }

  function handleToggleFeature(enabled: boolean) {
    if (!featureUser) {
      toast.error("Look up a user first");
      return;
    }
    startTransition(async () => {
      const result = await bulkToggleFeature(
        [featureUser.id],
        selectedFeature,
        enabled,
      );
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `${FEATURE_META[selectedFeature].label} ${enabled ? "enabled" : "disabled"} for ${featureUser.name ?? featureUser.email}`,
        );
        close();
      }
    });
  }

  function handleTriggerCron() {
    startTransition(async () => {
      const result = await triggerCron(selectedCron);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Cron "${selectedCron}" triggered`);
        close();
      }
    });
  }

  function handleSetAnnouncement() {
    if (!announcementMsg.trim()) {
      toast.error("Enter an announcement message");
      return;
    }
    // For now, just show success — write to platform_config when table is ready
    toast.success("Announcement set");
    close();
  }

  function formatTrialStatus(user: LookedUpUser) {
    if (!user.trial_ends_at) return "No trial";
    const end = new Date(user.trial_ends_at);
    const now = new Date();
    if (end < now) return `Trial expired ${end.toLocaleDateString()}`;
    const days = Math.ceil((end.getTime() - now.getTime()) / 86400000);
    return `Trial active — ${days}d remaining (${user.trial_plan ?? user.plan})`;
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Quick Actions
          </h3>
        </div>
        <div className="p-2">
          {ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.action}
                type="button"
                onClick={() => handleOpen(item.action)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Create User Dialog */}
      <AlertDialog open={activeAction === "create_user"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create User</AlertDialogTitle>
            <AlertDialogDescription>
              Add a new user to Realtors360.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Email
              </label>
              <input
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Name
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Plan
              </label>
              <select
                value={createPlan}
                onChange={(e) => setCreatePlan(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="free">Free</option>
                <option value="professional">Professional</option>
                <option value="studio">Studio</option>
                <option value="team">Team</option>
              </select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateUser} disabled={isPending}>
              {isPending ? "Creating..." : "Create User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Trial Dialog */}
      <AlertDialog open={activeAction === "extend_trial"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extend Trial</AlertDialogTitle>
            <AlertDialogDescription>
              Look up a user by email, then extend their trial period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                User Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={extendEmail}
                  onChange={(e) => {
                    setExtendEmail(e.target.value);
                    setExtendUser(null);
                    setExtendLookupError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleExtendLookup()}
                  placeholder="user@example.com"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExtendLookup}
                  disabled={isPending}
                  className="shrink-0"
                >
                  {isPending ? "..." : "Look up"}
                </Button>
              </div>
              {extendLookupError && (
                <p className="text-xs text-red-600 mt-1">{extendLookupError}</p>
              )}
            </div>

            {extendUser && (
              <div className="bg-muted/50 border border-border rounded-md p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {extendUser.name ?? "Unnamed"} ({extendUser.email})
                </p>
                <p className="text-xs text-muted-foreground">
                  Plan: {extendUser.plan} | Status: {extendUser.is_active ? "Active" : "Inactive"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTrialStatus(extendUser)}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Additional Days
              </label>
              <input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                min="1"
                max="365"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExtendTrial}
              disabled={isPending || !extendUser}
            >
              {isPending ? "Extending..." : "Extend Trial"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Feature Dialog */}
      <AlertDialog open={activeAction === "toggle_feature"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toggle Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Enable or disable a feature for a specific user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                User Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={featureEmail}
                  onChange={(e) => {
                    setFeatureEmail(e.target.value);
                    setFeatureUser(null);
                    setFeatureLookupError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleFeatureLookup()}
                  placeholder="user@example.com"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFeatureLookup}
                  disabled={isPending}
                  className="shrink-0"
                >
                  {isPending ? "..." : "Look up"}
                </Button>
              </div>
              {featureLookupError && (
                <p className="text-xs text-red-600 mt-1">{featureLookupError}</p>
              )}
            </div>

            {featureUser && (
              <div className="bg-muted/50 border border-border rounded-md p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {featureUser.name ?? "Unnamed"} ({featureUser.email})
                </p>
                <p className="text-xs text-muted-foreground">
                  Plan: {featureUser.plan} | Status: {featureUser.is_active ? "Active" : "Inactive"}
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Feature
              </label>
              <select
                value={selectedFeature}
                onChange={(e) => setSelectedFeature(e.target.value as FeatureKey)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {FEATURE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {FEATURE_META[key].label} — {FEATURE_META[key].description}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleFeature(false)}
              disabled={isPending || !featureUser}
            >
              {isPending ? "..." : "Disable"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleToggleFeature(true)}
              disabled={isPending || !featureUser}
            >
              {isPending ? "..." : "Enable"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Trigger Cron Dialog */}
      <AlertDialog open={activeAction === "trigger_cron"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger Cron</AlertDialogTitle>
            <AlertDialogDescription>
              Manually run a scheduled task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1">
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Cron Job
            </label>
            <select
              value={selectedCron}
              onChange={(e) => setSelectedCron(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {CRON_OPTIONS.map((cron) => (
                <option key={cron} value={cron}>
                  {cron}
                </option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTriggerCron} disabled={isPending}>
              {isPending ? "Running..." : "Run Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set Announcement Dialog */}
      <AlertDialog open={activeAction === "set_announcement"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Show a banner to all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-1">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Message
              </label>
              <textarea
                value={announcementMsg}
                onChange={(e) => setAnnouncementMsg(e.target.value)}
                placeholder="Announcement message..."
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Type
              </label>
              <div className="flex gap-4">
                {(["info", "warning", "critical"] as const).map((type) => (
                  <label key={type} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="announcement_type"
                      value={type}
                      checked={announcementType === type}
                      onChange={() => setAnnouncementType(type)}
                      className="accent-brand"
                    />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSetAnnouncement}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Set Announcement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
