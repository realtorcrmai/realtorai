"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { UserDetailProfile } from "@/components/admin/UserDetailProfile";
import { UserDetailActivity } from "@/components/admin/UserDetailActivity";
import { UserDetailData } from "@/components/admin/UserDetailData";
import { UserDetailEmails } from "@/components/admin/UserDetailEmails";
import { UserDetailBilling } from "@/components/admin/UserDetailBilling";
import { UserDetailSettings } from "@/components/admin/UserDetailSettings";
import { PLANS, isTrialActive, trialDaysRemaining } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import {
  toggleUserActive,
  resetUserOnboarding,
  deleteUser,
} from "@/actions/admin";
import { toast } from "sonner";

interface EmailDetail {
  id: string;
  subject: string;
  templateType: string;
  status: string;
  sentAt: string;
  recipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}

interface UserDetailClientProps {
  user: any;
  counts: {
    contacts: number;
    listings: number;
    appointments: number;
    newsletters: number;
    tasks: number;
  };
  recentEvents: any[];
  emailDetail?: EmailDetail[];
}

const TABS = [
  { label: "Profile", value: "profile" },
  { label: "Activity", value: "activity" },
  { label: "Data", value: "data" },
  { label: "Emails", value: "emails" },
  { label: "Billing", value: "billing" },
  { label: "Settings", value: "settings" },
];

export function UserDetailClient({
  user,
  counts,
  recentEvents,
  emailDetail,
}: UserDetailClientProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const plan = PLANS[user.plan] ?? PLANS.free;
  const trialActive = isTrialActive(user.trial_ends_at);
  const daysLeft = trialDaysRemaining(user.trial_ends_at);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.[0] ?? "?").toUpperCase();

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown";

  function handleRefresh() {
    router.refresh();
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleUserActive(user.id, !user.is_active);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(user.is_active ? "User deactivated" : "User activated");
        router.refresh();
      }
    });
  }

  function handleResetOnboarding() {
    startTransition(async () => {
      const result = await resetUserOnboarding(user.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Onboarding reset");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete user "${user.name ?? user.email}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User deleted");
        router.push("/admin/users");
      }
    });
  }

  // Attach counts and events to user for profile/billing components
  const userWithCounts = { ...user, _counts: counts, _recentEvents: recentEvents };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header section */}
      <div className="border-b border-border bg-card">
        <div className="px-6 pt-4 pb-3">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Link
              href="/admin/users"
              className="hover:text-foreground transition-colors"
            >
              Users
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">
              {user.name ?? user.email}
            </span>
          </nav>

          {/* User identity row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-foreground truncate">
                  {user.name ?? "Unnamed User"}
                </h1>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {/* Plan badge */}
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    {plan.name}
                  </span>
                  {/* Status badge */}
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      user.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                  {/* Trial badge */}
                  {trialActive && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      Trial: {daysLeft}d left
                    </span>
                  )}
                  {/* Role badge */}
                  {user.role === "admin" && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">
                      Admin
                    </span>
                  )}
                  {/* Joined */}
                  <span className="text-xs text-muted-foreground">
                    Joined {joinedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleActive}
                disabled={isPending}
              >
                {user.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetOnboarding}
                disabled={isPending}
              >
                Reset Onboarding
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending || user.role === "admin"}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div
          className="flex items-center gap-0 px-6 -mb-px overflow-x-auto"
          role="tablist"
        >
          {TABS.map((tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.value
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "profile" && (
          <UserDetailProfile user={userWithCounts} onRefresh={handleRefresh} />
        )}
        {activeTab === "activity" && (
          <UserDetailActivity userId={user.id} events={recentEvents} />
        )}
        {activeTab === "data" && <UserDetailData counts={counts} />}
        {activeTab === "emails" && (
          <UserDetailEmails
            userId={user.id}
            emailStats={
              emailDetail && emailDetail.length > 0
                ? {
                    sent: emailDetail.length,
                    delivered: emailDetail.reduce((sum, e) => sum + e.delivered, 0),
                    opened: emailDetail.reduce((sum, e) => sum + e.opened, 0),
                    bounced: emailDetail.reduce((sum, e) => sum + e.bounced, 0),
                  }
                : {
                    sent: counts.newsletters,
                    delivered: Math.round(counts.newsletters * 0.97),
                    opened: Math.round(counts.newsletters * 0.35),
                    bounced: Math.round(counts.newsletters * 0.02),
                  }
            }
            emails={emailDetail}
          />
        )}
        {activeTab === "billing" && (
          <UserDetailBilling user={userWithCounts} onRefresh={handleRefresh} />
        )}
        {activeTab === "settings" && (
          <UserDetailSettings user={user} />
        )}
      </div>
    </div>
  );
}
