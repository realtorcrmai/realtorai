"use client";

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

interface UserDetailEmailsProps {
  userId: string;
  emailStats?: {
    sent: number;
    delivered: number;
    opened: number;
    bounced: number;
  };
  emails?: EmailDetail[];
}

const TYPE_LABELS: Record<string, string> = {
  new_listing_alert: "Listing Alert",
  market_update: "Market Update",
  just_sold: "Just Sold",
  open_house_invite: "Open House",
  neighbourhood_guide: "Neighbourhood",
  home_anniversary: "Anniversary",
  custom: "Custom",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) + ", " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

function getStatusInfo(email: EmailDetail) {
  if (email.bounced > 0) {
    return { label: "Bounced", className: "bg-red-50 text-red-700 border-red-200" };
  }
  if (email.opened > 0) {
    return { label: "Opened", className: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  if (email.delivered > 0) {
    return { label: "Delivered", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  return { label: "Sent", className: "bg-gray-50 text-gray-600 border-gray-200" };
}

export function UserDetailEmails({ emailStats, emails }: UserDetailEmailsProps) {
  const sent = emailStats?.sent ?? 0;
  const delivered = emailStats?.delivered ?? 0;
  const opened = emailStats?.opened ?? 0;
  const bounced = emailStats?.bounced ?? 0;

  const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
  const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
  const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;

  const kpis = [
    { label: "Sent", value: sent.toLocaleString(), color: "text-foreground" },
    {
      label: "Delivery Rate",
      value: sent > 0 ? `${deliveryRate.toFixed(1)}%` : "--",
      color: deliveryRate >= 95 ? "text-emerald-600" : deliveryRate >= 90 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "Open Rate",
      value: delivered > 0 ? `${openRate.toFixed(1)}%` : "--",
      color: openRate >= 25 ? "text-emerald-600" : openRate >= 15 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "Bounce Rate",
      value: sent > 0 ? `${bounceRate.toFixed(1)}%` : "--",
      color: bounceRate > 5 ? "text-red-600" : bounceRate > 2 ? "text-amber-600" : "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-card border border-border rounded-lg p-4"
          >
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Email table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm" aria-label="Email delivery log">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Sent</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Subject</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Recipients</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Opens</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Clicks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(!emails || emails.length === 0) ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No emails sent yet.
                </td>
              </tr>
            ) : (
              emails.map((email) => {
                const statusInfo = getStatusInfo(email);
                return (
                  <tr key={email.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {formatDate(email.sentAt)}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium max-w-[240px] truncate" title={email.subject}>
                      {email.subject.length > 40
                        ? email.subject.slice(0, 40) + "..."
                        : email.subject}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {TYPE_LABELS[email.templateType] ?? email.templateType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground tabular-nums">
                      {email.recipients}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground tabular-nums">
                      {email.opened}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground tabular-nums">
                      {email.clicked}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
