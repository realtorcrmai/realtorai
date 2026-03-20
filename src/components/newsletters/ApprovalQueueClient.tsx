"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveNewsletter, skipNewsletter } from "@/actions/newsletters";

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
    setLoadingIds(prev => {
      const next = new Set(prev);
      loading ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleApprove = (id: string) => {
    setLoading(id, true);
    startTransition(async () => {
      await approveNewsletter(id);
      setQueue(q => q.filter(item => item.id !== id));
      if (previewId === id) setPreviewId(null);
      setLoading(id, false);
      router.refresh();
    });
  };

  const handleSkip = (id: string) => {
    setLoading(id, true);
    startTransition(async () => {
      await skipNewsletter(id);
      setQueue(q => q.filter(item => item.id !== id));
      if (previewId === id) setPreviewId(null);
      setLoading(id, false);
      router.refresh();
    });
  };

  const handleBulkApprove = () => {
    startTransition(async () => {
      const ids = queue.map(q => q.id);
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

  const previewItem = queue.find(q => q.id === previewId);

  if (queue.length === 0) {
    return (
      <div className="lf-card" style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u2705"}</div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1a1535" }}>All caught up!</h3>
        <p style={{ fontSize: 14, color: "#6b6b8d", marginTop: 4 }}>No newsletters waiting for approval.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Bulk Actions */}
      {queue.length > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, gap: 8 }}>
          <button
            className="lf-btn-sm lf-btn-success"
            onClick={handleBulkApprove}
            disabled={pending}
          >
            {pending ? "Sending..." : `\u2713 Approve All (${queue.length})`}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: previewId ? "1fr 1fr" : "1fr", gap: 14 }}>
        {/* Queue List */}
        <div>
          {queue.map(item => {
            const isLoading = loadingIds.has(item.id);
            return (
              <div
                key={item.id}
                className="lf-card"
                style={{
                  padding: 16,
                  marginBottom: 10,
                  cursor: "pointer",
                  border: previewId === item.id ? "2px solid #4f35d2" : "1px solid transparent",
                  opacity: isLoading ? 0.6 : 1,
                  transition: "opacity 0.2s",
                }}
                onClick={() => !isLoading && setPreviewId(item.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1535" }}>
                      {item.contacts?.name || "Unknown"}
                    </div>
                    <div style={{ fontSize: 14, color: "#3a3a5c", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.subject}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <span className="lf-badge lf-badge-info" style={{ fontSize: 10 }}>
                        {item.email_type.replace(/_/g, " ")}
                      </span>
                      {item.journey_phase && (
                        <span className="lf-badge" style={{ fontSize: 10 }}>
                          {item.journey_phase}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "#a0a0b0" }}>
                        {item.contacts?.email}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <button
                      className="lf-btn-sm lf-btn-success"
                      onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }}
                      disabled={isLoading || pending}
                    >
                      {isLoading ? "..." : "\u2713 Send"}
                    </button>
                    <button
                      className="lf-btn-sm lf-btn-ghost"
                      onClick={(e) => { e.stopPropagation(); handleSkip(item.id); }}
                      disabled={isLoading || pending}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview Panel */}
        {previewItem && (
          <div className="lf-card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 110, height: "min(calc(100vh - 130px), 700px)" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e5f5", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1535" }}>{previewItem.subject}</div>
                <div style={{ fontSize: 12, color: "#6b6b8d" }}>To: {previewItem.contacts?.email}</div>
              </div>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#6b6b8d" }}
                onClick={() => setPreviewId(null)}
              >
                {"\u2715"}
              </button>
            </div>
            <iframe
              srcDoc={previewItem.html_body}
              style={{ width: "100%", height: "calc(100% - 50px)", border: "none" }}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
}
