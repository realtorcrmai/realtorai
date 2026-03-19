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
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleApprove = (id: string) => {
    startTransition(async () => {
      await approveNewsletter(id);
      setQueue(q => q.filter(item => item.id !== id));
      if (previewId === id) setPreviewId(null);
      router.refresh();
    });
  };

  const handleSkip = (id: string) => {
    startTransition(async () => {
      await skipNewsletter(id);
      setQueue(q => q.filter(item => item.id !== id));
      if (previewId === id) setPreviewId(null);
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
    <div style={{ display: "grid", gridTemplateColumns: previewId ? "1fr 1fr" : "1fr", gap: 14 }}>
      {/* Queue List */}
      <div>
        {queue.map(item => (
          <div
            key={item.id}
            className="lf-card"
            style={{
              padding: 16,
              marginBottom: 10,
              cursor: "pointer",
              border: previewId === item.id ? "2px solid #4f35d2" : "1px solid transparent",
            }}
            onClick={() => setPreviewId(item.id)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1535" }}>
                  {item.contacts?.name || "Unknown"}
                </div>
                <div style={{ fontSize: 14, color: "#3a3a5c", marginTop: 2 }}>{item.subject}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <span className="lf-badge lf-badge-info" style={{ fontSize: 10 }}>
                    {item.email_type.replace(/_/g, " ")}
                  </span>
                  {item.journey_phase && (
                    <span className="lf-badge" style={{ fontSize: 10 }}>
                      {item.journey_phase}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  className="lf-btn-sm lf-btn-success"
                  onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }}
                  disabled={pending}
                >
                  {"\u2713"} Send
                </button>
                <button
                  className="lf-btn-sm lf-btn-ghost"
                  onClick={(e) => { e.stopPropagation(); handleSkip(item.id); }}
                  disabled={pending}
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Panel */}
      {previewItem && (
        <div className="lf-card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 110, height: "calc(100vh - 130px)" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e5f5", background: "#fafafa" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1535" }}>Preview: {previewItem.subject}</div>
            <div style={{ fontSize: 12, color: "#6b6b8d" }}>To: {previewItem.contacts?.email}</div>
          </div>
          <iframe
            srcDoc={previewItem.html_body}
            style={{ width: "100%", height: "calc(100% - 50px)", border: "none" }}
            title="Email Preview"
          />
        </div>
      )}
    </div>
  );
}
