import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Zap,
  GitBranch,
  Mail,
  Bell,
  Settings,
  Play,
  Pause,
  Users,
  FileText,
  ChevronRight,
} from "lucide-react";
import { WORKFLOW_BLUEPRINTS } from "@/lib/constants";
import { BackfillButton } from "@/components/automations/BackfillButton";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const supabase = createAdminClient();

  // Fetch workflows with their steps
  const { data: workflows } = await supabase
    .from("workflows")
    .select("*, workflow_steps(id)")
    .order("created_at", { ascending: true });

  // Fetch active enrollment counts per workflow
  const { data: enrollments } = await supabase
    .from("workflow_enrollments")
    .select("id, workflow_id, status");

  // Fetch message templates count
  const { data: templates } = await supabase
    .from("message_templates")
    .select("id");

  // Fetch unread notifications count
  const { data: unreadNotifications } = await supabase
    .from("agent_notifications")
    .select("id")
    .eq("is_read", false);

  const workflowList = workflows ?? [];
  const enrollmentList = enrollments ?? [];
  const templateCount = templates?.length ?? 0;
  const unreadCount = unreadNotifications?.length ?? 0;

  const activeWorkflows = workflowList.filter((w) => w.is_active).length;
  const totalActiveEnrollments = enrollmentList.filter(
    (e) => e.status === "active"
  ).length;

  // Build enrollment counts by workflow
  const enrollmentsByWorkflow: Record<string, number> = {};
  for (const e of enrollmentList) {
    if (e.status === "active") {
      enrollmentsByWorkflow[e.workflow_id] =
        (enrollmentsByWorkflow[e.workflow_id] || 0) + 1;
    }
  }

  // Map blueprints by slug for icon lookup
  const blueprintsBySlug: Record<string, (typeof WORKFLOW_BLUEPRINTS)[number]> =
    {};
  for (const bp of WORKFLOW_BLUEPRINTS) {
    blueprintsBySlug[bp.slug] = bp;
  }

  return (
    <div className="space-y-6 animate-float-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-indigo elevation-4">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Automations
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage workflow automations, message templates, and notifications
            </p>
          </div>
        </div>
        <BackfillButton />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {activeWorkflows}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{workflowList.length}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Active Workflows
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {totalActiveEnrollments}
                </p>
                <p className="text-xs text-muted-foreground">
                  Active Enrollments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {templateCount}
                </p>
                <p className="text-xs text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {unreadCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Unread Notifications
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b">
        <Link href="/automations">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-b-none border-b-2 border-indigo-500 text-indigo-600 font-medium"
          >
            <GitBranch className="h-4 w-4 mr-1.5" />
            Workflows
          </Button>
        </Link>
        <Link href="/automations/templates">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-b-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Templates
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
              {templateCount}
            </Badge>
          </Button>
        </Link>
        <Link href="/automations/notifications">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-b-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4 w-4 mr-1.5" />
            Notifications
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-1.5 text-[10px] px-1.5"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </Link>
      </div>

      {/* Workflow Cards Grid */}
      {workflowList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              No Workflows Yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Workflows will appear here once they are created from blueprints.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflowList.map((workflow) => {
            const blueprint = blueprintsBySlug[workflow.slug];
            const icon = blueprint?.icon ?? "⚙️";
            const stepCount = Array.isArray(workflow.workflow_steps)
              ? workflow.workflow_steps.length
              : 0;
            const activeEnrollments =
              enrollmentsByWorkflow[workflow.id] ?? 0;

            return (
              <Link
                key={workflow.id}
                href={`/automations/workflows/${workflow.id}`}
                className="group"
              >
                <Card className="h-full transition-shadow hover:shadow-md group-hover:border-indigo-200">
                  <CardContent className="py-5 space-y-3">
                    {/* Top row: icon + status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-indigo-600 transition-colors leading-tight">
                            {workflow.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {workflow.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        {stepCount} step{stepCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {activeEnrollments} enrolled
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center justify-between">
                      {workflow.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[11px]">
                          <Play className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[11px]"
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Paused
                        </Badge>
                      )}
                      <div className="flex items-center gap-1.5">
                        {workflow.slug?.endsWith("_lifecycle") && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-teal-300 text-teal-700 bg-teal-50"
                          >
                            Lifecycle
                          </Badge>
                        )}
                        {workflow.contact_type &&
                          workflow.contact_type !== "any" && (
                            <Badge
                              variant="outline"
                              className="text-[11px] capitalize"
                            >
                              {workflow.contact_type}
                            </Badge>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
