"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Draft = {
  id: string;
  subject: string;
  email_type: string;
  html_body: string;
  ai_context: any;
  contacts: any;
};

type Props = {
  drafts: Draft[];
  sendAction: (id: string) => Promise<any>;
  skipAction: (id: string) => Promise<any>;
  bulkApproveAction: (ids: string[]) => Promise<any>;
};

export function AIAgentQueue({ drafts: initialDrafts, sendAction, skipAction, bulkApproveAction }: Props) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [results, setResults] = useState<Record<string, { status: "sent" | "skipped" | "error"; message?: string }>>({});
  const [isPending, startTransition] = useTransition();

  const pendingDrafts = drafts.filter(d => !results[d.id]);

  async function handleApprove(id: string) {
    setSendingId(id);
    try {
      const result = await sendAction(id);
      if (result?.success || result?.messageId) {
        setResults(prev => ({ ...prev, [id]: { status: "sent" } }));
      } else {
        setResults(prev => ({ ...prev, [id]: { status: "error", message: result?.error || "Send failed" } }));
      }
    } catch (e) {
      setResults(prev => ({ ...prev, [id]: { status: "error", message: String(e) } }));
    }
    setSendingId(null);
  }

  async function handleSkip(id: string) {
    setSendingId(id);
    try {
      await skipAction(id);
      setResults(prev => ({ ...prev, [id]: { status: "skipped" } }));
    } catch {
      setResults(prev => ({ ...prev, [id]: { status: "error", message: "Skip failed" } }));
    }
    setSendingId(null);
  }

  async function handleBulkApprove() {
    setBulkSending(true);
    const ids = pendingDrafts.map(d => d.id);
    try {
      const result = await bulkApproveAction(ids);
      for (const id of ids) {
        setResults(prev => ({ ...prev, [id]: { status: "sent" } }));
      }
    } catch {
      // Individual failures handled by server action
    }
    setBulkSending(false);
  }

  function handleEdit(draft: Draft) {
    setEditingId(draft.id);
    setEditSubject(draft.subject);
  }

  function getContactName(d: Draft) {
    return Array.isArray(d.contacts) ? d.contacts[0]?.name : d.contacts?.name || "Unknown";
  }
  function getContactType(d: Draft) {
    return Array.isArray(d.contacts) ? d.contacts[0]?.type : d.contacts?.type || "buyer";
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">🤖 AI Agent Queue</h3>
          <p className="text-xs text-muted-foreground">{pendingDrafts.length} emails drafted by AI — review, edit, or approve</p>
        </div>
        {pendingDrafts.length > 0 && (
          <button
            onClick={handleBulkApprove}
            disabled={bulkSending}
            className="text-xs px-3 py-1.5 rounded-md bg-[#0F7694] text-white font-medium hover:bg-[#0A6880] transition-colors disabled:opacity-50"
          >
            {bulkSending ? "Sending..." : `✓ Approve All (${pendingDrafts.length})`}
          </button>
        )}
      </div>

      {/* Drafts */}
      {pendingDrafts.length === 0 && Object.keys(results).length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="text-3xl mb-2">🤖</div>
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">AI will generate new drafts as contacts progress through their journeys.</p>
          </CardContent>
        </Card>
      ) : (
        drafts.map((d) => {
          const result = results[d.id];
          const isSending = sendingId === d.id;
          const name = getContactName(d);
          const type = getContactType(d);

          // Show result state
          if (result) {
            return (
              <Card key={d.id} className={`overflow-hidden transition-opacity ${result.status === "error" ? "" : "opacity-60"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        result.status === "sent" ? "bg-[#0F7694]" : result.status === "skipped" ? "bg-gray-400" : "bg-red-500"
                      }`}>
                        {result.status === "sent" ? "✓" : result.status === "skipped" ? "—" : "!"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground">{d.subject}</p>
                      </div>
                    </div>
                    <Badge variant={result.status === "sent" ? "default" : result.status === "skipped" ? "secondary" : "destructive"} className="text-xs capitalize">
                      {result.status === "sent" ? "✓ Sent" : result.status === "skipped" ? "Skipped" : "Error"}
                    </Badge>
                  </div>
                  {result.message && <p className="text-xs text-red-500 mt-2">{result.message}</p>}
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={d.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Header bar */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                      type === "seller" ? "bg-[#0F7694]" : "bg-gradient-to-br from-primary to-[#1a1535]"
                    }`}>
                      {name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{name}</p>
                      <p className="text-xs text-muted-foreground">{type} · {d.email_type?.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{d.email_type?.replace(/_/g, " ")}</Badge>
                </div>

                {/* Subject + body preview */}
                <div className="p-4">
                  {editingId === d.id ? (
                    <div className="space-y-2">
                      <input
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        className="w-full text-sm font-medium border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-3 py-1.5 rounded-md bg-[#0F7694] text-white font-medium"
                        >Save</button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-3 py-1.5 rounded-md text-muted-foreground font-medium"
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-1">Subject: {d.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {d.html_body ? d.html_body.replace(/<[^>]*>/g, "").slice(0, 200) + "..." : "No preview"}
                      </p>
                    </>
                  )}
                </div>

                {/* AI Reasoning */}
                {d.ai_context && (
                  <div className="px-4 pb-3">
                    <details>
                      <summary className="text-xs text-primary font-medium cursor-pointer hover:underline">🧠 Why this email?</summary>
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3 leading-relaxed">
                        {d.ai_context.reasoning || (
                          <>
                            {d.ai_context.journey_phase && <span>Phase: <strong>{d.ai_context.journey_phase}</strong>. </span>}
                            {d.ai_context.contact_type && <span>Type: <strong>{d.ai_context.contact_type}</strong>. </span>}
                            AI generated based on journey schedule and engagement history.
                          </>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 px-4 pb-4">
                  <button
                    onClick={() => handleApprove(d.id)}
                    disabled={isSending}
                    className="text-xs px-3 py-1.5 rounded-md bg-[#0F7694] text-white font-medium hover:bg-[#0A6880] transition-colors disabled:opacity-50"
                  >
                    {isSending ? "Sending..." : "✓ Approve & Send"}
                  </button>
                  <button
                    onClick={() => handleEdit(d)}
                    className="text-xs px-3 py-1.5 rounded-md border border-border text-foreground font-medium hover:bg-muted transition-colors"
                  >✎ Edit</button>
                  <button
                    onClick={() => handleSkip(d.id)}
                    disabled={isSending}
                    className="text-xs px-3 py-1.5 rounded-md text-muted-foreground font-medium hover:text-foreground transition-colors disabled:opacity-50"
                  >✕ Skip</button>
                  <button
                    onClick={() => setPreviewHtml(d.html_body)}
                    className="text-xs px-3 py-1.5 rounded-md text-muted-foreground font-medium hover:text-foreground transition-colors ml-auto"
                  >👁 Preview</button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewHtml(null)}>
          <div className="bg-background rounded-xl shadow-2xl w-[90vw] max-w-[700px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h4 className="text-sm font-semibold">Email Preview</h4>
              <button onClick={() => setPreviewHtml(null)} className="text-muted-foreground hover:text-foreground text-lg">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              <iframe srcDoc={previewHtml} className="w-full border-0 rounded-b-xl" style={{ minHeight: "500px", height: "70vh" }} sandbox="allow-same-origin" title="Email preview" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
