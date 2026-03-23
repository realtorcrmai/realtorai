"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  MessageSquare,
  StickyNote,
  ListTodo,
  Send,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendContactMessage, addCommunicationNote } from "@/actions/contacts";

export function QuickActionBar({
  contactId,
  contactPhone,
  contactChannel,
}: {
  contactId: string;
  contactPhone: string;
  contactChannel: "whatsapp" | "sms";
}) {
  const [mode, setMode] = useState<"idle" | "text" | "note">("idle");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleCall() {
    const clean = contactPhone.replace(/\D/g, "");
    const e164 = clean.startsWith("1") ? `+${clean}` : `+1${clean}`;
    window.open(`tel:${e164}`, "_self");
  }

  function handleSend() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      let result;
      if (mode === "text") {
        result = await sendContactMessage(contactId, body.trim());
      } else {
        result = await addCommunicationNote(contactId, body.trim());
      }
      if (result.error) {
        setError(result.error);
      } else {
        setBody("");
        setMode("idle");
        router.refresh();
      }
    });
  }

  function scrollToTimeline() {
    const el = document.getElementById("comm-timeline");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setMode("note");
  }

  function scrollToTasks() {
    const el = document.getElementById("tasks-panel");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  if (mode !== "idle") {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
              if (e.key === "Escape") {
                setMode("idle");
                setBody("");
                setError(null);
              }
            }}
            placeholder={
              mode === "text"
                ? `Send ${contactChannel === "whatsapp" ? "WhatsApp" : "SMS"}...`
                : "Add a note..."
            }
            autoFocus
            disabled={isPending}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary pr-8"
          />
        </div>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={isPending || !body.trim()}
          className="shrink-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMode("idle");
            setBody("");
            setError(null);
          }}
          disabled={isPending}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
        {error && (
          <span className="text-xs text-red-500 shrink-0">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCall}
        className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/30 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
      >
        <Phone className="h-3.5 w-3.5 mr-1.5" />
        Call
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMode("text")}
        className="text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-950/20 dark:border-blue-800/30 dark:text-blue-400 dark:hover:bg-blue-950/40"
      >
        <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
        Text
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={scrollToTimeline}
        className="text-xs bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-400 dark:hover:bg-amber-950/40"
      >
        <StickyNote className="h-3.5 w-3.5 mr-1.5" />
        Log Note
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={scrollToTasks}
        className="text-xs bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:bg-violet-950/20 dark:border-violet-800/30 dark:text-violet-400 dark:hover:bg-violet-950/40"
      >
        <ListTodo className="h-3.5 w-3.5 mr-1.5" />
        Add Task
      </Button>
    </div>
  );
}
