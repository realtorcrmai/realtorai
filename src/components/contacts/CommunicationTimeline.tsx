"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  ArrowDownLeft,
  MessageSquare,
  MessageCircle,
  Mail,
  StickyNote,
  Send,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { addCommunicationNote } from "@/actions/contacts";
import type { Communication } from "@/types";

const channelIcons: Record<string, typeof MessageSquare> = {
  whatsapp: MessageCircle,
  sms: MessageSquare,
  email: Mail,
  note: StickyNote,
  voice: Phone,
};

const channelBadgeStyles: Record<string, string> = {
  whatsapp: "bg-[#0F7694]/10 text-[#0A6880] dark:bg-[#1a1535]/40 dark:text-[#67D4E8]",
  sms: "bg-[#0F7694]/10 text-[#0A6880] dark:bg-blue-900/40 dark:text-[#67D4E8]",
  email: "bg-[#0F7694]/10 text-[#0A6880] dark:bg-[#1a1535]/40 dark:text-[#67D4E8]",
  note: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  voice: "bg-[#0F7694]/10 text-[#0A6880] dark:bg-[#1a1535]/40 dark:text-[#67D4E8]",
};

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  note: "Note",
  voice: "Voice",
};

type FilterType = "all" | "sms" | "whatsapp" | "email" | "note" | "voice";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "note", label: "Notes" },
  { key: "voice", label: "Voice" },
];

export function CommunicationTimeline({
  contactId,
  communications,
}: {
  contactId: string;
  communications: Communication[];
}) {
  const [noteBody, setNoteBody] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: communications.length };
    for (const comm of communications) {
      c[comm.channel] = (c[comm.channel] || 0) + 1;
    }
    return c;
  }, [communications]);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? communications
        : communications.filter((c) => c.channel === filter),
    [communications, filter]
  );

  async function handleAddNote() {
    if (!noteBody.trim()) return;
    setSending(true);
    await addCommunicationNote(contactId, noteBody.trim());
    setNoteBody("");
    setSending(false);
  }

  return (
    <Card id="comm-timeline">
      <CardHeader>
        <CardTitle className="text-base">Communication Timeline</CardTitle>
        {/* Filter tabs */}
        <div className="flex gap-1 mt-2">
          {FILTERS.map((f) => {
            const count = counts[f.key] ?? 0;
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  isActive
                    ? "bg-[#0F7694] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span
                    className={`ml-1 ${isActive ? "opacity-80" : "opacity-60"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {filter === "all"
              ? "No communications yet."
              : `No ${filter === "note" ? "notes" : filter.toUpperCase()} messages.`}
          </p>
        )}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filtered.map((comm) => {
            const ChannelIcon = channelIcons[comm.channel];
            const isInbound = comm.direction === "inbound";
            const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;
            const badgeStyle = channelBadgeStyles[comm.channel] ?? "bg-muted text-muted-foreground";
            const formattedDate = new Date(comm.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });
            const relativeDate = formatDistanceToNow(new Date(comm.created_at), {
              addSuffix: true,
            });

            return (
              <div
                key={comm.id}
                className={cn(
                  "flex gap-3 p-3 rounded-lg transition-colors",
                  isInbound
                    ? "bg-[#0F7694]/5 dark:bg-blue-950/20 border-l-2 border-l-blue-400"
                    : "bg-muted/50 border-r-2 border-r-emerald-400 ml-4"
                )}
              >
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <DirectionIcon
                    className={cn(
                      "h-4 w-4",
                      isInbound ? "text-[#0F7694]" : "text-[#0F7694]"
                    )}
                  />
                  <ChannelIcon
                    className={cn(
                      "h-4 w-4",
                      isInbound ? "text-[#67D4E8]" : "text-[#67D4E8]"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        badgeStyle
                      )}
                    >
                      <ChannelIcon className="h-2.5 w-2.5" />
                      {channelLabels[comm.channel] ?? comm.channel}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {isInbound ? "Received" : "Sent"}
                    </span>
                  </div>
                  <p className="text-sm break-words">{comm.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {relativeDate}
                    <span className="mx-1.5 opacity-40">·</span>
                    {formattedDate}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Add Note</p>
          <div className="flex gap-2">
            <Textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Add a manual note..."
              className="min-h-[60px]"
            />
            <Button
              size="icon"
              onClick={handleAddNote}
              disabled={sending || !noteBody.trim()}
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
