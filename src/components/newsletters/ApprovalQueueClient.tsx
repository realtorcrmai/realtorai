"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { approveNewsletter, skipNewsletter, editNewsletterDraft } from "@/actions/newsletters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Send, X, Pencil, Save, Undo2, Brain } from "lucide-react";
import { toast } from "sonner";

interface QueueItem {
  id: string;
  subject: string;
  email_type: string;
  journey_phase: string | null;
  html_body: string;
  created_at: string;
  contacts: { id: string; name: string; email: string; type: string } | null;
}

interface VoiceLearningNotification {
  id: string;
  rules: string[];
}

export function ApprovalQueueClient({ initialQueue }: { initialQueue: QueueItem[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [originalSubject, setOriginalSubject] = useState("");
  const [originalBody, setOriginalBody] = useState("");
  const [saving, setSaving] = useState(false);

  // Voice learning notification
  const [voiceNotification, setVoiceNotification] = useState<VoiceLearningNotification | null>(null);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss voice learning notification after 6 seconds
  useEffect(() => {
    if (voiceNotification) {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = setTimeout(() => {
        setVoiceNotification(null);
      }, 6000);
    }
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, [voiceNotification]);

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
      const result = await approveNewsletter(id);
      if (result?.error) {
        toast.error("Failed to send newsletter: " + result.error);
        setLoading(id, false);
        return;
      }
      setQueue((q) => q.filter((item) => item.id !== id));
      if (previewId === id) setPreviewId(null);
      if (editingId === id) setEditingId(null);
      setLoading(id, false);
      toast.success("Newsletter sent");
      router.refresh();
    });
  };

  const handleSkip = (id: string) => {
    setLoading(id, true);
    startTransition(async () => {
      const result = await skipNewsletter(id) as { success?: boolean; error?: string };
      if (result?.error) {
        toast.error("Failed to skip newsletter: " + result.error);
        setLoading(id, false);
        return;
      }
      setQueue((q) => q.filter((item) => item.id !== id));
      if (previewId === id) setPreviewId(null);
      if (editingId === id) setEditingId(null);
      setLoading(id, false);
      toast.success("Newsletter skipped");
      router.refresh();
    });
  };

  const handleBulkApprove = () => {
    const confirmed = window.confirm(`Send all ${queue.length} newsletters now?`);
    if (!confirmed) return;
    startTransition(async () => {
      const ids = queue.map((q) => q.id);
      setLoadingIds(new Set(ids));
      const results = await Promise.allSettled(ids.map((id) => approveNewsletter(id)));
      const failures = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value?.error)
      );
      if (failures.length > 0) {
        toast.error(`${failures.length} newsletter${failures.length > 1 ? "s" : ""} failed to send`);
      } else {
        toast.success(`${ids.length} newsletter${ids.length > 1 ? "s" : ""} sent`);
      }
      setQueue([]);
      setPreviewId(null);
      setEditingId(null);
      setLoadingIds(new Set());
      router.refresh();
    });
  };

  const startEditing = (item: QueueItem) => {
    setEditingId(item.id);
    setEditSubject(item.subject);
    setEditBody(item.html_body);
    setOriginalSubject(item.subject);
    setOriginalBody(item.html_body);
    setPreviewId(item.id);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditSubject("");
    setEditBody("");
    setOriginalSubject("");
    setOriginalBody("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    const hasChanges = editSubject !== originalSubject || editBody !== originalBody;
    if (!hasChanges) {
      cancelEditing();
      return;
    }

    setSaving(true);
    try {
      const result = await editNewsletterDraft(
        editingId,
        originalSubject,
        originalBody,
        editSubject,
        editBody
      );

      if (result.success) {
        // Update the queue item in local state
        setQueue((q) =>
          q.map((item) =>
            item.id === editingId
              ? { ...item, subject: editSubject, html_body: editBody }
              : item
          )
        );

        // Show voice learning notification if rules were learned
        if (result.learnedRules && result.learnedRules.length > 0) {
          setVoiceNotification({
            id: editingId,
            rules: result.learnedRules,
          });
        }

        toast.success("Draft saved");
        setEditingId(null);
      } else {
        toast.error("Failed to save draft" + (result.error ? ": " + result.error : ""));
      }
    } catch (e) {
      toast.error("Failed to save edit: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const previewItem = queue.find((q) => q.id === previewId);
  const isEditing = editingId !== null;

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
      {/* Voice Learning Notification */}
      {voiceNotification && (
        <div className="flex items-start gap-3 rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/40 px-4 py-3 animate-fade-in">
          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
              AI learned from your edit
            </p>
            <ul className="mt-1 space-y-0.5">
              {voiceNotification.rules.map((rule, i) => (
                <li key={i} className="text-xs text-purple-700 dark:text-purple-300">
                  {rule}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => setVoiceNotification(null)}
            className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-200"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      {queue.length > 1 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-2 bg-brand-dark hover:bg-brand-dark text-white"
            onClick={handleBulkApprove}
            disabled={pending || isEditing}
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
            const isItemEditing = editingId === item.id;
            return (
              <Card
                key={item.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "ring-2 ring-primary border-primary"
                    : "hover:shadow-md"
                } ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
                onClick={() => !isLoading && !isItemEditing && setPreviewId(item.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {item.contacts?.name || "Unknown"}
                      </p>
                      {isItemEditing ? (
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="mt-1 w-full text-sm border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                          placeholder="Email subject..."
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Edit email subject"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {item.subject}
                        </p>
                      )}
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
                      {isItemEditing ? (
                        <>
                          <Button
                            size="sm"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEdit();
                            }}
                            disabled={saving}
                            aria-label="Save edits"
                          >
                            <Save className="h-3.5 w-3.5" />
                            {saving ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing();
                            }}
                            disabled={saving}
                            aria-label="Cancel editing"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(item);
                            }}
                            disabled={isLoading || pending || (isEditing && !isItemEditing)}
                            aria-label="Edit draft"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5 bg-brand-dark hover:bg-brand-dark text-white"
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
                        </>
                      )}
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
                <p className="text-sm font-semibold text-foreground truncate">
                  {editingId === previewItem.id ? editSubject : previewItem.subject}
                </p>
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
            {editingId === previewItem.id ? (
              <div className="p-3 h-[calc(100%-53px)] flex flex-col">
                <label className="text-xs font-medium text-muted-foreground mb-1">
                  Email Body (HTML)
                </label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="flex-1 w-full text-xs font-mono border border-border rounded-md px-3 py-2 bg-background text-foreground resize-none focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Email HTML body..."
                  aria-label="Edit email body"
                />
              </div>
            ) : (
              <iframe
                srcDoc={previewItem.html_body}
                className="w-full border-none"
                style={{ height: "calc(100% - 53px)" }}
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
