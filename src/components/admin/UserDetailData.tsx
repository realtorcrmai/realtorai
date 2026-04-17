"use client";

interface UserDetailDataProps {
  counts: {
    contacts: number;
    listings: number;
    appointments: number;
    newsletters: number;
    tasks: number;
  };
}

const CARDS = [
  { key: "contacts", label: "Contacts" },
  { key: "listings", label: "Listings" },
  { key: "appointments", label: "Showings" },
  { key: "newsletters", label: "Emails Sent" },
  { key: "tasks", label: "Tasks" },
  { key: "workflows", label: "Workflows" },
] as const;

export function UserDetailData({ counts }: UserDetailDataProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {CARDS.map((card) => {
        const count =
          card.key === "workflows"
            ? 0
            : counts[card.key as keyof typeof counts] ?? 0;

        return (
          <div
            key={card.key}
            className="bg-card border border-border rounded-lg p-4"
          >
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <div className="text-sm text-muted-foreground mt-2 space-y-0.5">
              {count === 0 && (
                <p className="text-xs text-muted-foreground/60">No data yet</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
