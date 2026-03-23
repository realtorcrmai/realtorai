export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  getEmailActivityFeed,
  getWorkflowCommandCenter,
  getContactJourneyTracker,
  getScheduleOverview,
} from "@/actions/control-panel";
import ControlPanelClient from "@/components/newsletters/ControlPanelClient";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bot,
  HandMetal,
  Ghost,
  BarChart3,
  MailOpen,
} from "lucide-react";

export default async function ControlPanelPage() {
  const [emailActivity, workflows, journeys, schedule] = await Promise.all([
    getEmailActivityFeed(),
    getWorkflowCommandCenter(),
    getContactJourneyTracker(),
    getScheduleOverview(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/newsletters">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor and manage email activity, workflows, and contact journeys
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/newsletters/activity">
            <Button variant="outline" size="sm" className="gap-2">
              <Bot className="h-4 w-4" />
              Activity
            </Button>
          </Link>
          <Link href="/newsletters/suppressions">
            <Button variant="outline" size="sm" className="gap-2">
              <HandMetal className="h-4 w-4" />
              Held Back
            </Button>
          </Link>
          <Link href="/newsletters/ghost">
            <Button variant="outline" size="sm" className="gap-2">
              <Ghost className="h-4 w-4" />
              Ghost
            </Button>
          </Link>
          <Link href="/newsletters/insights">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Insights
            </Button>
          </Link>
          <Link href="/newsletters/queue">
            <Button variant="outline" size="sm" className="gap-2">
              <MailOpen className="h-4 w-4" />
              Queue
            </Button>
          </Link>
        </div>
      </div>

      <ControlPanelClient
        initialEmailActivity={emailActivity}
        initialWorkflows={workflows}
        initialJourneys={journeys}
        initialSchedule={schedule}
      />
    </div>
  );
}
