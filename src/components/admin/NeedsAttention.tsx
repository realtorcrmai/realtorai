"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extendUserTrial, resetUserOnboarding } from "@/actions/admin";
import { toast } from "sonner";

interface AttentionUser {
  id: string;
  name: string;
  email: string;
  issue: string;
  issueType: string;
}

interface NeedsAttentionProps {
  users: AttentionUser[];
}

const ISSUE_BADGE_STYLES: Record<string, string> = {
  trial_expiring:
    "bg-amber-100 text-amber-700 border border-amber-200",
  stuck_onboarding:
    "bg-blue-100 text-blue-700 border border-blue-200",
  inactive:
    "bg-red-100 text-red-700 border border-red-200",
  high_bounce:
    "bg-red-100 text-red-700 border border-red-200",
};

function ActionButton({
  user,
}: {
  user: AttentionUser;
}) {
  const [isPending, startTransition] = useTransition();

  function handleAction() {
    startTransition(async () => {
      if (user.issueType === "trial_expiring") {
        const result = await extendUserTrial(user.id, 7);
        if ("error" in result && result.error) {
          toast.error(result.error);
        } else {
          toast.success(`Extended trial for ${user.name} by 7 days`);
        }
      } else if (user.issueType === "stuck_onboarding") {
        const result = await resetUserOnboarding(user.id);
        if ("error" in result && result.error) {
          toast.error(result.error);
        } else {
          toast.success(`Reset onboarding for ${user.name}`);
        }
      }
    });
  }

  const label =
    user.issueType === "trial_expiring"
      ? "Extend 7d"
      : user.issueType === "stuck_onboarding"
        ? "Reset Onboarding"
        : null;

  if (!label) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAction}
      disabled={isPending}
      className="text-xs h-7"
    >
      {isPending ? "..." : label}
    </Button>
  );
}

export function NeedsAttention({ users }: NeedsAttentionProps) {
  const visible = users.slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Needs Attention
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Users who may need your help
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
          <p className="text-sm text-muted-foreground">
            No users need attention right now.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden mx-4 mb-4 mt-3">
          {/* Header */}
          <div className="bg-muted/60 border-b border-border grid grid-cols-[1fr_1fr_auto] px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Name
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Issue
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Actions
            </span>
          </div>

          {/* Rows */}
          {visible.map((user, idx) => (
            <div
              key={user.id}
              className={`grid grid-cols-[1fr_1fr_auto] px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors ${
                idx < visible.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
              <div className="flex items-center">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    ISSUE_BADGE_STYLES[user.issueType] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {user.issue}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/users/${user.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    View
                  </Button>
                </Link>
                <ActionButton user={user} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
