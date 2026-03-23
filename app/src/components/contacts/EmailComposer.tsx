"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendContactEmail, syncContactEmailHistory } from "@/actions/contacts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Loader2, RefreshCw, Check, X } from "lucide-react";

interface EmailComposerProps {
  contactId: string;
  contactEmail: string | null;
}

export default function EmailComposer({
  contactId,
  contactEmail,
}: EmailComposerProps) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [isSending, startSendTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const router = useRouter();

  function handleSend() {
    setError(null);
    startSendTransition(async () => {
      const result = await sendContactEmail(contactId, subject, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setSubject("");
      setBody("");
      setError(null);
      setSyncResult(null);
      router.refresh();
    });
  }

  function handleSync() {
    setError(null);
    setSyncResult(null);
    startSyncTransition(async () => {
      const result = await syncContactEmailHistory(contactId);
      if (result.error) {
        setError(result.error);
      } else {
        setSyncResult(`Imported ${result.imported} emails`);
      }
      router.refresh();
    });
  }

  const disabled = !contactEmail;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) {
          setError(null);
          setSyncResult(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            title={disabled ? "No email address" : `Email ${contactEmail}`}
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Email
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Recipient */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground font-medium w-10">To:</span>
            <span className="text-foreground">{contactEmail}</span>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Textarea
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              disabled={isSending}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              <X className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Sync Result */}
          {syncResult && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-md px-3 py-2">
              <Check className="h-4 w-4 shrink-0" />
              {syncResult}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing || isSending}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              Gmail Sync
            </Button>

            <Button
              onClick={handleSend}
              disabled={isSending || !subject.trim() || !body.trim()}
              size="sm"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1.5" />
              )}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
