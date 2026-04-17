"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuickLogForm } from "@/components/contacts/QuickLogForm";

type RecentEmail = {
  id: string;
  subject: string;
  sent_at: string | null;
};

export function LogInteractionDialog({
  contactId,
  contactName,
  recentEmails = [],
}: {
  contactId: string;
  contactName: string;
  recentEmails?: RecentEmail[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Log Interaction
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setOpen(true)}
        >
          <ClipboardList className="h-4 w-4 text-primary" />
          Log a call, text, or meeting
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Log Interaction — {contactName}</DialogTitle>
          </DialogHeader>
          <QuickLogForm
            contactId={contactId}
            contactName={contactName}
            recentEmails={recentEmails}
            onLog={() => setOpen(false)}
            onClose={() => setOpen(false)}
            hideHeader
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
