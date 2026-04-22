import { getTeamAnalytics } from "@/actions/team";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AgentMetrics = {
  user_id: string;
  name: string;
  role: string;
  contacts: number;
  active_listings: number;
  tasks_completed_this_month: number;
  showings_this_month: number;
};

export async function TeamAnalyticsWidget() {
  const result = await getTeamAnalytics();
  if (result.error || !result.data || result.data.length === 0) return null;

  const agents = result.data as AgentMetrics[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">📊 Team Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 pr-3 font-medium">Agent</th>
                <th className="text-right py-2 px-2 font-medium">Contacts</th>
                <th className="text-right py-2 px-2 font-medium">Listings</th>
                <th className="text-right py-2 px-2 font-medium">Tasks (mo)</th>
                <th className="text-right py-2 pl-2 font-medium">Showings (mo)</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.user_id} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                        {a.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <span className="font-medium text-foreground">{a.name}</span>
                        <span className="text-muted-foreground ml-1 capitalize">({a.role})</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-2 px-2 tabular-nums">{a.contacts}</td>
                  <td className="text-right py-2 px-2 tabular-nums">{a.active_listings}</td>
                  <td className="text-right py-2 px-2 tabular-nums">{a.tasks_completed_this_month}</td>
                  <td className="text-right py-2 pl-2 tabular-nums">{a.showings_this_month}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
