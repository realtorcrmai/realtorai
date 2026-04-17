"use client";

import { Fragment, useState, useTransition } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { getCronHistory, triggerCron } from "@/actions/analytics";
import { toast } from "sonner";

interface CronItem {
  name: string;
  lastRun: string | null;
  status: string;
  duration_ms: number;
}

interface SystemViewProps {
  crons: CronItem[];
  systemOk: boolean;
}

interface HistoryEntry {
  created_at: string;
  metadata: Record<string, unknown>;
}

export function SystemView({ crons, systemOk }: SystemViewProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [historyCache, setHistoryCache] = useState<
    Record<string, HistoryEntry[]>
  >({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  const [triggerPending, startTrigger] = useTransition();
  const [triggeringCron, setTriggeringCron] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCron, setDialogCron] = useState<string | null>(null);

  const allOk =
    crons.length > 0 ? crons.every((c) => c.status === "success") : systemOk;

  async function handleExpand(cronName: string) {
    if (expandedRow === cronName) {
      setExpandedRow(null);
      return;
    }

    setExpandedRow(cronName);

    if (!historyCache[cronName]) {
      setLoadingHistory(cronName);
      try {
        const result = await getCronHistory(cronName, 10);
        setHistoryCache((prev) => ({
          ...prev,
          [cronName]: (result.data as HistoryEntry[]) ?? [],
        }));
      } catch {
        setHistoryCache((prev) => ({ ...prev, [cronName]: [] }));
      } finally {
        setLoadingHistory(null);
      }
    }
  }

  function handleTriggerClick(cronName: string) {
    setDialogCron(cronName);
    setDialogOpen(true);
  }

  function handleConfirmTrigger() {
    if (!dialogCron) return;
    const cronName = dialogCron;
    setTriggeringCron(cronName);
    setDialogOpen(false);

    startTrigger(async () => {
      try {
        const result = await triggerCron(cronName);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(`Cron "${cronName}" triggered successfully`);
        }
      } catch {
        toast.error("Failed to trigger cron");
      } finally {
        setTriggeringCron(null);
        setDialogCron(null);
      }
    });
  }

  function statusDot(status: string, lastRun: string | null) {
    if (!lastRun) {
      return <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-2" />;
    }
    if (status === "success") {
      return <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-2" />;
    }
    return <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-2" />;
  }

  function formatDuration(ms: number): string {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function formatLastRun(dateStr: string | null): string {
    if (!dateStr) return "Never run";
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Status Banner */}
      {allOk ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-900">
              All Systems Operational
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Last check:{" "}
              {crons.length > 0 && crons[0].lastRun
                ? formatLastRun(crons[0].lastRun)
                : "N/A"}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">
              System Issues Detected
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              One or more cron jobs have failed. Check the details below.
            </p>
          </div>
        </div>
      )}

      {/* Cron Monitor Table */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Cron Jobs</h2>
        </div>

        {crons.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No cron jobs have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5 w-8" />
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                    Cron
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                    Last Run
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                    Status
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                    Duration
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-2.5">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {crons.map((cron) => {
                  const isExpanded = expandedRow === cron.name;
                  const history = historyCache[cron.name];
                  const isLoadingThis = loadingHistory === cron.name;

                  return (
                    <Fragment key={cron.name}>
                      <tr
                        className={`border-b border-border cursor-pointer hover:bg-muted/30 transition-colors ${
                          cron.status === "error" ? "bg-red-50/50" : ""
                        }`}
                        onClick={() => handleExpand(cron.name)}
                      >
                        <td className="px-4 py-2.5">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          {cron.name}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {formatLastRun(cron.lastRun)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center">
                            {statusDot(cron.status, cron.lastRun)}
                            <span className="capitalize">{cron.lastRun ? cron.status : "Pending"}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                          {cron.duration_ms ? formatDuration(cron.duration_ms) : "--"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerClick(cron.name);
                            }}
                            disabled={triggerPending && triggeringCron === cron.name}
                          >
                            {triggerPending && triggeringCron === cron.name ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            Run Now
                          </Button>
                        </td>
                      </tr>

                      {/* Expanded history */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-muted/20 px-4 py-3">
                            {isLoadingThis ? (
                              <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading history...
                              </div>
                            ) : !history || history.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-3">
                                No history available for this cron.
                              </p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="text-left font-medium py-1.5 px-2">
                                      Date
                                    </th>
                                    <th className="text-left font-medium py-1.5 px-2">
                                      Status
                                    </th>
                                    <th className="text-left font-medium py-1.5 px-2">
                                      Duration
                                    </th>
                                    <th className="text-left font-medium py-1.5 px-2">
                                      Error
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {history.map((entry, idx) => {
                                    const meta = entry.metadata ?? {};
                                    const entryStatus = String(
                                      meta.status ?? "unknown"
                                    );
                                    const entryDuration =
                                      typeof meta.duration_ms === "number"
                                        ? meta.duration_ms
                                        : null;
                                    const entryError = meta.error
                                      ? String(meta.error)
                                      : null;

                                    return (
                                      <tr
                                        key={idx}
                                        className="border-t border-border/50"
                                      >
                                        <td className="py-1.5 px-2 text-muted-foreground">
                                          {format(
                                            new Date(entry.created_at),
                                            "MMM d, HH:mm"
                                          )}
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <span className="flex items-center gap-1">
                                            {statusDot(entryStatus, entry.created_at)}
                                            <span className="capitalize">
                                              {entryStatus}
                                            </span>
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-muted-foreground tabular-nums">
                                          {entryDuration !== null
                                            ? formatDuration(entryDuration)
                                            : "--"}
                                        </td>
                                        <td className="py-1.5 px-2 text-muted-foreground max-w-[200px] truncate">
                                          {entryError ?? "--"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* External Links Card */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            External Dashboards
          </h2>
        </div>
        <div className="p-4 flex flex-wrap gap-3">
          <a
            href="https://sentry.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-md border border-border hover:bg-muted/50 text-sm font-medium transition-colors"
          >
            View Errors in Sentry
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-md border border-border hover:bg-muted/50 text-sm font-medium transition-colors"
          >
            View Performance in Vercel
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Trigger Cron Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Trigger Cron Job
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to manually trigger the &quot;{dialogCron}&quot; cron
              job? This will execute immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTrigger}>
              Run Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
