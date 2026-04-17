"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addCommunicationNote } from "@/actions/contacts";

type Communication = {
  id: string;
  direction: string;
  channel: string;
  body: string;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

const CHANNEL_ICONS: Record<string, string> = {
  note: "📝",
  email: "📧",
  sms: "📱",
  whatsapp: "💬",
  phone: "📞",
};

export function NotesDialog({
  contactId,
  contactName,
  communications,
}: {
  contactId: string;
  contactName: string;
  communications: Communication[];
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    if (!note.trim()) return;
    startTransition(async () => {
      await addCommunicationNote(contactId, note.trim());
      setNote("");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-400 dark:hover:bg-amber-950/40"
      >
        <StickyNote className="h-3.5 w-3.5 mr-1.5" />
        Log Note
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Notes — {contactName}</DialogTitle>
          </DialogHeader>

          {/* Add new note */}
          <div className="flex gap-2 border-b pb-3">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-brand"
              disabled={isPending}
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!note.trim() || isPending}
              className="bg-brand text-white hover:bg-brand-dark"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Notes history */}
          <div className="overflow-y-auto flex-1 space-y-2 min-h-0">
            {communications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No notes or communications yet. Add your first note above.
              </p>
            ) : (
              communications.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm shrink-0 mt-0.5">
                    {CHANNEL_ICONS[c.channel] || "📨"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">
                      {c.body || "(no content)"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.direction === "inbound" ? "Received" : "Sent"} via {c.channel} · {timeAgo(c.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
