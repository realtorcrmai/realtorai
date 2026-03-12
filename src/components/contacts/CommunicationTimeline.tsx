"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  ArrowDownLeft,
  MessageSquare,
  Phone,
  Mail,
  StickyNote,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { addCommunicationNote } from "@/actions/contacts";
import type { Communication } from "@/types";

const channelIcons = {
  whatsapp: MessageSquare,
  sms: Phone,
  email: Mail,
  note: StickyNote,
};

export function CommunicationTimeline({
  contactId,
  communications,
}: {
  contactId: string;
  communications: Communication[];
}) {
  const [noteBody, setNoteBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleAddNote() {
    if (!noteBody.trim()) return;
    setSending(true);
    await addCommunicationNote(contactId, noteBody.trim());
    setNoteBody("");
    setSending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Communication Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {communications.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No communications yet.
          </p>
        )}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {communications.map((comm) => {
            const ChannelIcon = channelIcons[comm.channel];
            const DirectionIcon =
              comm.direction === "inbound" ? ArrowDownLeft : ArrowUpRight;
            return (
              <div
                key={comm.id}
                className="flex gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="flex flex-col items-center gap-1">
                  <DirectionIcon
                    className={`h-4 w-4 ${
                      comm.direction === "inbound"
                        ? "text-blue-500"
                        : "text-green-500"
                    }`}
                  />
                  <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words">{comm.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(comm.created_at), {
                      addSuffix: true,
                    })}
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
