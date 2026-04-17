"use client";

import { Copy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PLANS } from "@/lib/plans";

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

  function copyId() {
    navigator.clipboard.writeText(user.id);
    toast.success("Copied");
  }

  return (
    <div className="space-y-6">
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
