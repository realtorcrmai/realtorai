
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { getNewsletterEngineSnapshot } from "@/actions/newsletter-engine";
import { EngineRulesTable } from "@/components/newsletters/EngineRulesTable";
import { EngineEventsQueue } from "@/components/newsletters/EngineEventsQueue";

/**
 * Newsletter Engine v3 — observability page (M2-B).
 *
 * Read-only viewer for the events being processed by the realtors360-newsletter
 * service. Shows:
 *   - Per-realtor event_type → email_type rules with their caps + send mode
 *   - Last 50 email_events with status + relative timestamps
 *
 * If migration 074 hasn't been applied yet, renders an explicit empty state
 * pointing the realtor to the deploy step.
 */
export default async function NewsletterEnginePage() {
  const snapshot = await getNewsletterEngineSnapshot();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1">
            <Link href="/newsletters">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Newsletters
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Newsletter Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live view of the event-driven email pipeline (Newsletter Engine v3)
          </p>
        </div>
        {!snapshot.notReady && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {snapshot.counts.pending} pending
            </Badge>
            <Badge variant="default" className="text-sm px-3 py-1">
              {snapshot.counts.processed} processed
            </Badge>
            {snapshot.counts.failed > 0 && (
              <Badge variant="destructive" className="text-sm px-3 py-1">
                {snapshot.counts.failed} failed
              </Badge>
            )}
          </div>
        )}
      </div>

      {snapshot.notReady ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
          <h2 className="text-base font-semibold text-amber-900">
            Newsletter Engine v3 not yet provisioned
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            Migrations 074 and 075 have not been applied to this Supabase project.
            Apply them via{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
              node scripts/apply-newsletter-migrations.mjs
            </code>{" "}
            (requires <code>SUPABASE_ACCESS_TOKEN</code> in the environment), or
            run them manually in the Supabase Dashboard SQL editor. Then deploy
            the <code>realtors360-newsletter</code> service to Render.
          </p>
          <p className="mt-2 text-xs text-amber-700">
            See <code>MASTER_NEWSLETTER_PLAN.md</code> for the full rollout
            checklist.
          </p>
        </div>
      ) : (
        <>
          {/* Rules section */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold text-foreground">Event Rules</h2>
              <span className="text-xs text-muted-foreground">
                {snapshot.rules.length} rule
                {snapshot.rules.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Each rule maps a CRM event to an email type, with frequency caps
              and a send mode. Editing UI ships in M3-B — for now, edit via the
              <code className="mx-1">email_event_rules</code> table.
            </p>
            <EngineRulesTable rules={snapshot.rules} />
          </section>

          {/* Events section */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Events</h2>
              <span className="text-xs text-muted-foreground">
                showing latest {snapshot.events.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              The newsletter service polls this queue every 10 seconds and
              processes each event through its registered pipeline. Failed
              events show their error inline so you can diagnose without
              digging into logs.
            </p>
            <EngineEventsQueue events={snapshot.events} />
          </section>
        </>
      )}
    </div>
  );
}
