import { getAuthenticatedTenantClient, getScopedTenantClient } from "@/lib/supabase/tenant";
import type { DataScope } from "@/types/team";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactsTableClient } from "@/components/contacts/ContactsTableClient";
import { EmptyState } from "@/components/shared/EmptyState";
import { SmartListBanner } from "@/components/smart-lists/SmartListBanner";
import { executeSmartList } from "@/actions/smart-lists";
import PipelineSnapshot from "@/components/dashboard/PipelineSnapshot";
import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, Flame, BarChart3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ContactImportButton } from "@/components/contacts/ContactImportButton";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ smart_list?: string; scope?: string }>;
}) {
  const params = await searchParams;
  const scope = (params.scope === "team" ? "team" : "personal") as DataScope;
  const supabase = await getScopedTenantClient(scope);

  let contacts;
  let activeSmartList = null;

  if (params.smart_list) {
    const result = await executeSmartList(params.smart_list);
    contacts = result.rows;
    activeSmartList = result.smartList;
  } else {
    const { data } = await supabase
      .from("contacts")
      .select("id, name, email, phone, type, photo_url, stage_bar, lead_status, last_activity_date, created_at, newsletter_intelligence")
      .order("created_at", { ascending: false })
      .limit(200);
    contacts = data;
  }

  const isEmpty = !contacts || contacts.length === 0;

  return (
    <>
      <PageHeader
        title={activeSmartList ? `${activeSmartList.icon} ${activeSmartList.name}` : "Contacts"}
        subtitle={`${contacts?.length ?? 0} contacts`}
        actions={
          <div className="flex items-center gap-2">
            <ContactImportButton />
            <Link href="/contacts/new">
              <Button className="bg-brand text-white hover:bg-brand-dark">Create Contact</Button>
            </Link>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* KPI Stat Cards — Dashboard style */}
        {!isEmpty && !activeSmartList && (() => {
          const allContacts = contacts ?? [];
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          const newThisWeek = allContacts.filter((c: any) => new Date(c.created_at) >= weekAgo).length;
          const hotLeads = allContacts.filter((c: any) => {
            const intel = c.newsletter_intelligence;
            return intel && typeof intel === "object" && (intel as any).engagement_score >= 60;
          }).length;
          const inPipeline = allContacts.filter((c: any) =>
            c.stage_bar && !["closed", "cold"].includes(c.stage_bar)
          ).length;
          const closedThisMonth = allContacts.filter((c: any) =>
            c.stage_bar === "closed" && c.last_activity_date && new Date(c.last_activity_date) >= monthStart
          ).length;

          // Pipeline stages for bar
          const PIPELINE_STAGES = [
            { key: "new", label: "New Leads", color: "bg-[#C8F5F0]" },
            { key: "qualified", label: "Qualified", color: "bg-brand-light" },
            { key: "active", label: "Active", color: "bg-brand" },
            { key: "under_contract", label: "Under Contract", color: "bg-[#FDAB3D]" },
            { key: "closed", label: "Closed", color: "bg-success" },
          ];
          const stageCounts: Record<string, number> = {};
          for (const s of PIPELINE_STAGES) stageCounts[s.key] = 0;
          for (const c of allContacts) {
            const bar = (c as any).stage_bar;
            if (!bar || bar === "cold") { stageCounts["new"]++; continue; }
            if (bar === "active_search" || bar === "active_listing") { stageCounts["active"]++; continue; }
            if (stageCounts[bar] !== undefined) stageCounts[bar]++;
            else stageCounts["new"]++;
          }
          const pipelineStages = PIPELINE_STAGES.map(s => ({ ...s, count: stageCounts[s.key], value: 0 }));

          return (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Link href="/contacts?recent=week">
                  <Card className="border-l-4 border-l-brand cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-4 w-4 text-brand" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">New This Week</p>
                        <p className="text-xl font-semibold text-foreground">{newThisWeek}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/contacts?engagement=hot">
                  <Card className="border-l-4 border-l-destructive cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                        <Flame className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Hot Leads</p>
                        <p className="text-xl font-semibold text-foreground">{hotLeads}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/contacts?view=pipeline">
                  <Card className="border-l-4 border-l-[#f5c26b] cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#f5c26b]/10 flex items-center justify-center shrink-0">
                        <BarChart3 className="h-4 w-4 text-[#8a5a1e]" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">In Pipeline</p>
                        <p className="text-xl font-semibold text-foreground">{inPipeline}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/contacts?stage=closed">
                  <Card className="border-l-4 border-l-success cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Closed This Mo</p>
                        <p className="text-xl font-semibold text-foreground">{closedThisMonth}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
              <PipelineSnapshot stages={pipelineStages} totalGCI={0} />
            </>
          );
        })()}

        {activeSmartList && (
          <SmartListBanner smartList={activeSmartList} count={contacts?.length ?? 0} />
        )}
        {isEmpty && !activeSmartList ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add your first client to start tracking relationships, sending emails, and scheduling showings."
            action={
              <Link href="/contacts/new">
                <Button className="bg-brand text-white hover:bg-brand-dark">Add Your First Contact</Button>
              </Link>
            }
          />
        ) : isEmpty && activeSmartList ? (
          <EmptyState
            icon={Users}
            title="No matches"
            description={`No contacts match the "${activeSmartList.name}" filters. Try editing the conditions.`}
            action={
              <Link href="/contacts">
                <Button variant="outline">View All Contacts</Button>
              </Link>
            }
          />
        ) : (
          <ContactsTableClient contacts={(contacts ?? []) as never} />
        )}
      </div>
    </>
  );
}
