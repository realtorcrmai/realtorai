"use client";

import { useState, useTransition, useEffect } from "react";
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
import { Mail, Send, RefreshCw, Check, X } from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";

interface EmailComposerProps {
  contactId: string;
  contactEmail: string | null;
}

export default function EmailComposer({
  contactId,
  contactEmail,
}: EmailComposerProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [isSending, startSendTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const router = useRouter();

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  if (!mounted) return null;

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
    <>
      <button
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        title={disabled ? "No email address" : `Email ${contactEmail}`}
        className="inline-flex items-center justify-center rounded-md border px-3 h-8 text-xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none bg-brand-muted border-brand/20 text-brand-dark hover:bg-brand-muted hover:text-brand-dark"
      >
        <Mail className="h-3.5 w-3.5 mr-1.5" />
        Email
      </button>
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
            <div className="flex items-center gap-2 text-sm text-brand-dark bg-brand-muted rounded-md px-3 py-2">
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
                <LogoSpinner size={16} />
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
                <LogoSpinner size={16} />
              ) : (
                <Send className="h-4 w-4 mr-1.5" />
              )}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
