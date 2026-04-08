"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveNewsletter, skipNewsletter } from "@/actions/newsletters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Send, X } from "lucide-react";

interface QueueItem {
  id: string;
  subject: string;
  email_type: string;
  journey_phase: string | null;
  html_body: string;
  created_at: string;
  contacts: { id: string; name: string; email: string; type: string } | null;
}

export function ApprovalQueueClient({ initialQueue }: { initialQueue: QueueItem[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const setLoading = (id: string, loading: boolean) => {
    setLoadingIds((prev) => {
      const next = new Set(prev);
      loading ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleApprove = (id: string) => {
    setLoading(id, true);
    startTransition(async () => {
      await approveNewsletter(id);
      setQueue((q) => q.filter((item) => item.id !== id));
      if (previewId === id) setPreviewId(null);
      setLoading(id, false);
      router.refresh();
    });
  };

  const handleSkip = (id: string) => {
    setLoading(id, true);
    startTransition(async () => {
      await skipNewsletter(id);
      setQueue((q) => q.filter((item) => item.id !== id));
      if (previewId === id) setPreviewId(null);
      setLoading(id, false);
      router.refresh();
    });
  };

  const handleBulkApprove = () => {
    startTransition(async () => {
      const ids = queue.map((q) => q.id);
      setLoadingIds(new Set(ids));
      for (const id of ids) {
        await approveNewsletter(id);
      }
      setQueue([]);
      setPreviewId(null);
      setLoadingIds(new Set());
      router.refresh();
    });
  };

  const previewItem = queue.find((q) => q.id === previewId);

  if (queue.length === 0) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="py-12 text-center">
          <div className="text-5xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
          <p className="text-sm text-muted-foreground mt-1">No newsletters waiting for approval.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {queue.length > 1 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-2 bg-[#0A6880] hover:bg-[#0A6880] text-white"
            onClick={handleBulkApprove}
            disabled={pending}
          >
            <Send className="h-4 w-4" />
            {pending ? "Sending..." : `Approve All (${queue.length})`}
          </Button>
        </div>
      )}

      <div className={`grid gap-4 ${previewId ? "grid-cols-2" : "grid-cols-1"}`}>
        {/* Queue List */}
        <div className="space-y-3">
          {queue.map((item) => {
            const isLoading = loadingIds.has(item.id);
            const isSelected = previewId === item.id;
            return (
              <Card
                key={item.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "ring-2 ring-primary border-primary"
                    : "hover:shadow-md"
                } ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
                onClick={() => !isLoading && setPreviewId(item.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {item.contacts?.name || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {item.subject}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {item.email_type.replace(/_/g, " ")}
                        </Badge>
                        {item.journey_phase && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.journey_phase}
                          </Badge>
                        )}
                        {item.contacts?.email && (
                          <span className="text-xs text-muted-foreground">
                            {item.contacts.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-[#0A6880] hover:bg-[#0A6880] text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(item.id);
                        }}
                        disabled={isLoading || pending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isLoading ? "..." : "Send"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSkip(item.id);
                        }}
                        disabled={isLoading || pending}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Preview Panel */}
        {previewItem && (
          <Card className="overflow-hidden sticky top-28 h-[min(calc(100vh-140px),700px)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{previewItem.subject}</p>
                <p className="text-xs text-muted-foreground">To: {previewItem.contacts?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 ml-2"
                onClick={() => setPreviewId(null)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close preview</span>
              </Button>
            </div>
            <iframe
              srcDoc={previewItem.html_body}
              className="w-full border-none"
              style={{ height: "calc(100% - 53px)" }}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </Card>
        )}
      </div>
    </div>
  );
}
