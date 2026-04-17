"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Eye,
  CreditCard,
  Play,
  Clock,
  ToggleLeft,
  Settings,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  changeUserPlan,
  startUserTrial,
  extendUserTrial,
  toggleUserActive,
  resetUserOnboarding,
  deleteUser,
  updateUserFeatures,
  bulkChangePlan,
  bulkToggleActive,
} from "@/actions/admin";
import { PLANS } from "@/lib/plans";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserRow = Record<string, any> & {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "admin" | "realtor";
  plan: string;
  is_active: boolean;
  enabled_features: string[];
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
  trial_plan: string | null;
  trial_ends_at: string | null;
  onboarding_completed: boolean;
  onboarding_step: number | null;
};

type StatusFilter = "all" | "active" | "inactive" | "trial" | "onboarding";
type SortOption = "newest" | "oldest" | "last_active" | "name";

type DialogState =
  | { type: "none" }
  | { type: "change_plan"; user: UserRow }
  | { type: "start_trial"; user: UserRow }
  | { type: "extend_trial"; user: UserRow }
  | { type: "toggle_active"; user: UserRow }
  | { type: "delete"; user: UserRow }
  | { type: "reset_onboarding"; user: UserRow }
  | { type: "manage_features"; user: UserRow };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function getUserStatus(user: UserRow): "active" | "inactive" | "trial" | "onboarding" {
  if (user.trial_ends_at && new Date(user.trial_ends_at) > new Date()) return "trial";
  if (!user.onboarding_completed && user.onboarding_step != null && user.onboarding_step < 6) return "onboarding";
  if (!user.is_active) return "inactive";
  return "active";
}

function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-red-50 text-red-700 border-red-200",
  trial: "bg-amber-50 text-amber-700 border-amber-200",
  onboarding: "bg-blue-50 text-blue-700 border-blue-200",
};

const PLAN_BADGE: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  professional: "bg-primary/10 text-primary",
  studio: "bg-brand/10 text-brand",
  team: "bg-emerald-50 text-emerald-700",
  admin: "bg-primary/10 text-primary",
};

const PLAN_OPTIONS = [
  { value: "", label: "All Plans" },
  { value: "free", label: "Free" },
  { value: "professional", label: "Professional" },
  { value: "studio", label: "Studio" },
  { value: "team", label: "Team" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "last_active", label: "Last Active" },
  { value: "name", label: "Name A-Z" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserTable({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters & search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const [dialogPlan, setDialogPlan] = useState("professional");
  const [dialogTrialDays, setDialogTrialDays] = useState(14);

  // Compute filter counts
  const counts = useMemo(() => {
    const c = { all: users.length, active: 0, inactive: 0, trial: 0, onboarding: 0 };
    for (const u of users) {
      const s = getUserStatus(u);
      c[s]++;
    }
    return c;
  }, [users]);

  // Filter + search + sort
  const filtered = useMemo(() => {
    let result = [...users];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((u) => getUserStatus(u) === statusFilter);
    }

    // Plan filter
    if (planFilter) {
      result = result.filter((u) => u.plan === planFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "last_active": {
          const at = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
          const bt = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
          return bt - at;
        }
        case "name":
          return (a.name ?? "").localeCompare(b.name ?? "");
        default:
          return 0;
      }
    });

    return result;
  }, [users, search, statusFilter, planFilter, sortOption]);

  // Dialog close helper
  const closeDialog = useCallback(() => setDialog({ type: "none" }), []);

  // Action handlers
  const handleChangePlan = useCallback(() => {
    if (dialog.type !== "change_plan") return;
    const userId = dialog.user.id;
    startTransition(async () => {
      const result = await changeUserPlan(userId, dialogPlan);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Plan changed to ${PLANS[dialogPlan]?.name ?? dialogPlan}`);
      }
      closeDialog();
    });
  }, [dialog, dialogPlan, closeDialog]);

  const handleStartTrial = useCallback(() => {
    if (dialog.type !== "start_trial") return;
    const userId = dialog.user.id;
    startTransition(async () => {
      const result = await startUserTrial(userId, dialogPlan, dialogTrialDays);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${dialogTrialDays}-day ${PLANS[dialogPlan]?.name ?? dialogPlan} trial started`);
      }
      closeDialog();
    });
  }, [dialog, dialogPlan, dialogTrialDays, closeDialog]);

  const handleExtendTrial = useCallback(() => {
    if (dialog.type !== "extend_trial") return;
    const userId = dialog.user.id;
    startTransition(async () => {
      const result = await extendUserTrial(userId, dialogTrialDays);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Trial extended by ${dialogTrialDays} days`);
      }
      closeDialog();
    });
  }, [dialog, dialogTrialDays, closeDialog]);

  const handleToggleActive = useCallback(() => {
    if (dialog.type !== "toggle_active") return;
    const userId = dialog.user.id;
    const newActive = !dialog.user.is_active;
    startTransition(async () => {
      const result = await toggleUserActive(userId, newActive);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(newActive ? "User activated" : "User deactivated");
      }
      closeDialog();
    });
  }, [dialog, closeDialog]);

  const handleResetOnboarding = useCallback(() => {
    if (dialog.type !== "reset_onboarding") return;
    const userId = dialog.user.id;
    startTransition(async () => {
      const result = await resetUserOnboarding(userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Onboarding reset");
      }
      closeDialog();
    });
  }, [dialog, closeDialog]);

  const handleDelete = useCallback(() => {
    if (dialog.type !== "delete") return;
    const userId = dialog.user.id;
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User deleted");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
      closeDialog();
    });
  }, [dialog, closeDialog]);

  // Bulk actions
  const handleBulkChangePlan = useCallback(
    (plan: string) => {
      if (!plan) return;
      startTransition(async () => {
        const result = await bulkChangePlan(Array.from(selectedIds), plan);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(`Changed ${result.count} users to ${PLANS[plan]?.name ?? plan}`);
          setSelectedIds(new Set());
        }
      });
    },
    [selectedIds]
  );

  const handleBulkDeactivate = useCallback(() => {
    startTransition(async () => {
      const result = await bulkToggleActive(Array.from(selectedIds), false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Deactivated ${result.count} users`);
        setSelectedIds(new Set());
      }
    });
  }, [selectedIds]);

  // Status filter tabs
  const statusTabs: { label: string; value: StatusFilter; count: number }[] = [
    { label: "All", value: "all", count: counts.all },
    { label: "Active", value: "active", count: counts.active },
    { label: "Inactive", value: "inactive", count: counts.inactive },
    { label: "Trial", value: "trial", count: counts.trial },
    { label: "Onboarding", value: "onboarding", count: counts.onboarding },
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1 border-b border-border -mx-1 px-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search users"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              aria-label="Filter by plan"
            >
              {PLAN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              aria-label="Sort users"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        ariaLabel="Users list"
        emptyMessage="No users match your filters."
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
        columns={[
          {
            key: "name",
            header: "User",
            width: "35%",
            sortable: true,
            render: (row: UserRow) => (
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {getInitials(row.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{row.name || "Unnamed"}</div>
                  <div className="text-xs text-muted-foreground truncate">{row.email}</div>
                </div>
              </div>
            ),
          },
          {
            key: "plan",
            header: "Plan",
            width: "15%",
            sortable: true,
            render: (row: UserRow) => {
              const plan = PLANS[row.plan];
              return (
                <div>
                  <Badge
                    variant="outline"
                    className={PLAN_BADGE[row.plan] || PLAN_BADGE.free}
                  >
                    {plan?.name ?? row.plan ?? "Free"}
                  </Badge>
                  {plan && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
                    </div>
                  )}
                </div>
              );
            },
          },
          {
            key: "is_active",
            header: "Status",
            width: "15%",
            render: (row: UserRow) => {
              const status = getUserStatus(row);
              const label = status.charAt(0).toUpperCase() + status.slice(1);
              return (
                <div>
                  <Badge variant="outline" className={STATUS_BADGE[status]}>
                    {label}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {status === "trial" && `${trialDaysRemaining(row.trial_ends_at)}d left`}
                    {status === "inactive" && row.last_active_at && `Last: ${daysSince(row.last_active_at)}d ago`}
                    {status === "onboarding" && `Step ${row.onboarding_step ?? 1}/6`}
                  </div>
                </div>
              );
            },
          },
          {
            key: "created_at",
            header: "Signed Up",
            width: "15%",
            sortable: true,
            render: (row: UserRow) => (
              <div>
                <div className="text-sm font-medium">
                  {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(row.created_at), "MMM d, yyyy")}
                </div>
              </div>
            ),
          },
          {
            key: "onboarding_step",
            header: "Onboarding",
            width: "10%",
            render: (row: UserRow) => {
              const step = row.onboarding_step ?? 0;
              const completed = row.onboarding_completed ?? false;
              const pct = completed ? 100 : Math.round((step / 6) * 100);
              return (
                <div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{pct}%</div>
                </div>
              );
            },
          },
          {
            key: "actions",
            header: "",
            width: "10%",
            render: (row: UserRow) => (
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors" aria-label={`Actions for ${row.name || row.email}`}>
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    }
                  />
                  <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
                    <DropdownMenuItem onClick={() => router.push(`/admin/users/${row.id}`)}>
                      <Eye className="h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setDialogPlan(row.plan || "professional"); setDialog({ type: "change_plan", user: row }); }}>
                      <CreditCard className="h-4 w-4" />
                      Change Plan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setDialogPlan("professional"); setDialogTrialDays(14); setDialog({ type: "start_trial", user: row }); }}>
                      <Play className="h-4 w-4" />
                      Start Trial
                    </DropdownMenuItem>
                    {row.trial_ends_at && (
                      <DropdownMenuItem onClick={() => { setDialogTrialDays(7); setDialog({ type: "extend_trial", user: row }); }}>
                        <Clock className="h-4 w-4" />
                        Extend Trial
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => { setDialog({ type: "manage_features", user: row }); }}>
                      <Settings className="h-4 w-4" />
                      Manage Features
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialog({ type: "reset_onboarding", user: row })}>
                      <RotateCcw className="h-4 w-4" />
                      Reset Onboarding
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDialog({ type: "toggle_active", user: row })}
                    >
                      <ToggleLeft className="h-4 w-4" />
                      {row.is_active ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDialog({ type: "delete", user: row })}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ]}
        data={filtered}
        bulkActions={(ids) => (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              onChange={(e) => {
                handleBulkChangePlan(e.target.value);
                e.target.value = "";
              }}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium"
              defaultValue=""
              aria-label="Bulk change plan"
            >
              <option value="" disabled>
                Change Plan...
              </option>
              <option value="free">Free</option>
              <option value="professional">Professional</option>
              <option value="studio">Studio</option>
              <option value="team">Team</option>
            </select>
            <button
              onClick={handleBulkDeactivate}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              Deactivate
            </button>
          </div>
        )}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Dialogs                                                            */}
      {/* ------------------------------------------------------------------ */}

      {/* Change Plan Dialog */}
      <Dialog open={dialog.type === "change_plan"} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Change the plan for{" "}
              <span className="font-medium text-foreground">
                {dialog.type === "change_plan" ? (dialog.user.name || dialog.user.email) : ""}
              </span>
              . Their features will be updated to match the new plan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium" htmlFor="change-plan-select">
              New Plan
            </label>
            <select
              id="change-plan-select"
              value={dialogPlan}
              onChange={(e) => setDialogPlan(e.target.value)}
              className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.values(PLANS)
                .filter((p) => p.id !== "admin")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.price > 0 ? `($${p.price}/mo)` : "(Free)"}
                  </option>
                ))}
            </select>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="brand" onClick={handleChangePlan} disabled={isPending}>
              {isPending ? "Saving..." : "Change Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Trial Dialog */}
      <Dialog open={dialog.type === "start_trial"} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Trial</DialogTitle>
            <DialogDescription>
              Start a trial for{" "}
              <span className="font-medium text-foreground">
                {dialog.type === "start_trial" ? (dialog.user.name || dialog.user.email) : ""}
              </span>
              . They will get access to all features in the trial plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium" htmlFor="trial-plan-select">
                Trial Plan
              </label>
              <select
                id="trial-plan-select"
                value={dialogPlan}
                onChange={(e) => setDialogPlan(e.target.value)}
                className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.values(PLANS)
                  .filter((p) => p.id !== "admin" && p.id !== "free")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.price}/mo)
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="trial-days-select">
                Duration
              </label>
              <select
                id="trial-days-select"
                value={dialogTrialDays}
                onChange={(e) => setDialogTrialDays(Number(e.target.value))}
                className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="brand" onClick={handleStartTrial} disabled={isPending}>
              {isPending ? "Starting..." : "Start Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={dialog.type === "extend_trial"} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial</DialogTitle>
            <DialogDescription>
              Extend the trial for{" "}
              <span className="font-medium text-foreground">
                {dialog.type === "extend_trial" ? (dialog.user.name || dialog.user.email) : ""}
              </span>
              .{" "}
              {dialog.type === "extend_trial" && dialog.user.trial_ends_at && (
                <>Current trial ends {format(new Date(dialog.user.trial_ends_at), "MMM d, yyyy")}.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium" htmlFor="extend-days-select">
              Additional Days
            </label>
            <select
              id="extend-days-select"
              value={dialogTrialDays}
              onChange={(e) => setDialogTrialDays(Number(e.target.value))}
              className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="brand" onClick={handleExtendTrial} disabled={isPending}>
              {isPending ? "Extending..." : "Extend Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Active Dialog */}
      <Dialog open={dialog.type === "toggle_active"} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.type === "toggle_active" && dialog.user.is_active ? "Deactivate User" : "Activate User"}
            </DialogTitle>
            <DialogDescription>
              {dialog.type === "toggle_active" && dialog.user.is_active ? (
                <>
                  Are you sure you want to deactivate{" "}
                  <span className="font-medium text-foreground">{dialog.user.name || dialog.user.email}</span>?
                  They will no longer be able to log in.
                </>
              ) : (
                <>
                  Activate{" "}
                  <span className="font-medium text-foreground">
                    {dialog.type === "toggle_active" ? (dialog.user.name || dialog.user.email) : ""}
                  </span>
                  ? They will regain access to their account.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant={dialog.type === "toggle_active" && dialog.user.is_active ? "destructive" : "brand"}
              onClick={handleToggleActive}
              disabled={isPending}
            >
              {isPending
                ? "Saving..."
                : dialog.type === "toggle_active" && dialog.user.is_active
                ? "Deactivate"
                : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Onboarding Dialog */}
      <Dialog open={dialog.type === "reset_onboarding"} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Onboarding</DialogTitle>
            <DialogDescription>
              Reset the onboarding progress for{" "}
              <span className="font-medium text-foreground">
                {dialog.type === "reset_onboarding" ? (dialog.user.name || dialog.user.email) : ""}
              </span>
              ? They will see the onboarding wizard again on their next login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="brand" onClick={handleResetOnboarding} disabled={isPending}>
              {isPending ? "Resetting..." : "Reset Onboarding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={dialog.type === "delete"} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              <span className="text-destructive font-medium">This action cannot be undone.</span>{" "}
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {dialog.type === "delete" ? (dialog.user.name || dialog.user.email) : ""}
              </span>{" "}
              and all their data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Features Dialog */}
      <ManageFeaturesDialog
        open={dialog.type === "manage_features"}
        user={dialog.type === "manage_features" ? dialog.user : null}
        onClose={closeDialog}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manage Features sub-dialog
// ---------------------------------------------------------------------------

function ManageFeaturesDialog({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: UserRow | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [features, setFeatures] = useState<string[]>([]);

  // Sync features when user changes
  const userFeatures = user?.enabled_features;
  const userId = user?.id;
  useMemo(() => {
    if (userFeatures) setFeatures([...userFeatures]);
  }, [userFeatures]);

  const ALL_FEATURES = [
    "contacts",
    "calendar",
    "tasks",
    "newsletters",
    "automations",
    "listings",
    "showings",
    "forms",
    "social",
    "website",
    "content",
    "import",
    "workflow",
    "assistant",
    "search",
  ];

  const handleSave = () => {
    if (!userId) return;
    startTransition(async () => {
      const result = await updateUserFeatures(userId, features);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Features updated");
      }
      onClose();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Features</DialogTitle>
          <DialogDescription>
            Toggle features for{" "}
            <span className="font-medium text-foreground">{user?.name || user?.email || ""}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 max-h-64 overflow-y-auto space-y-1">
          {ALL_FEATURES.map((f) => (
            <label
              key={f}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={features.includes(f)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFeatures((prev) => [...prev, f]);
                  } else {
                    setFeatures((prev) => prev.filter((x) => x !== f));
                  }
                }}
                className="rounded border-border"
              />
              <span className="text-sm capitalize">{f}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="brand" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Features"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
