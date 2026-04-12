"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";
import Link from "next/link";
import { getContactCommunications } from "@/actions/contacts";

interface ContactPreviewSheetProps {
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    type: string;
    stage_bar: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Communication {
  id: string;
  direction: string;
  channel: string;
  body: string;
  created_at: string;
}

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  active_search: "Active",
  active_listing: "Active",
  under_contract: "Contract",
  closed: "Closed",
  cold: "Cold",
};

const STAGE_COLORS: Record<string, string> = {
  new: "bg-[#516f90]/10 text-[#516f90] border-[#516f90]/20",
  qualified: "bg-brand/10 text-brand border-brand/20",
  active_search: "bg-brand/10 text-brand-dark border-brand/20",
  active_listing: "bg-brand/10 text-brand-dark border-brand/20",
  under_contract: "bg-[#f5c26b]/10 text-[#8a5a1e] border-[#f5c26b]/20",
  closed: "bg-success/10 text-success border-success/20",
  cold: "bg-muted text-muted-foreground",
};

const TYPE_COLORS: Record<string, string> = {
  buyer: "bg-primary/10 text-primary border-primary/20",
  seller: "bg-brand/10 text-brand border-brand/20",
  dual: "bg-[#516f90]/10 text-[#516f90] border-[#516f90]/20",
  customer: "bg-muted text-muted-foreground",
  partner: "bg-success/10 text-success border-success/20",
  other: "bg-muted text-muted-foreground",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function ContactPreviewSheet({ contact, open, onOpenChange }: ContactPreviewSheetProps) {
  const [comms, setComms] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(false);

  const contactId = contact?.id ?? null;
  useEffect(() => {
    let cancelled = false;
    if (open && contactId) {
      setLoading(true);
      setComms([]);
      getContactCommunications(contactId, 5)
        .then((data) => { if (!cancelled) setComms(data as Communication[]); })
        .catch(() => { if (!cancelled) setComms([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [open, contactId]);

  if (!contact) return null;

  const stage = contact.stage_bar || "new";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[450px] flex flex-col">
        <SheetHeader>
          <SheetTitle>{contact.name}</SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`capitalize ${TYPE_COLORS[contact.type] || ""}`}>
              {contact.type}
            </Badge>
            <Badge variant="outline" className={STAGE_COLORS[stage] || STAGE_COLORS.new}>
              {STAGE_LABELS[stage] || stage}
            </Badge>
          </div>
        </SheetHeader>

        <div className="px-4 space-y-4 flex-1 overflow-y-auto">
          {/* Contact details */}
          <div className="space-y-2">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {contact.email}
              </a>
            )}
          </div>

          {/* Recent Communications */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Recent Communications
            </h4>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <LogoSpinner size={20} className="text-muted-foreground" />
              </div>
            ) : comms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No recent communications.</p>
            ) : (
              <div className="space-y-2">
                {comms.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 rounded-md border border-border p-2.5">
                    <div className="mt-0.5 shrink-0">
                      {c.direction === "outbound" ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-brand" />
                      ) : (
                        <ArrowDownLeft className="h-3.5 w-3.5 text-success" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground line-clamp-2">{c.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground capitalize">{c.channel}</span>
                        <span className="text-[10px] text-muted-foreground">{relativeTime(c.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer link */}
        <div className="p-4 border-t border-border">
          <Link
            href={`/contacts/${contact.id}`}
            className="text-sm font-medium text-brand hover:text-brand/80 transition-colors flex items-center gap-1"
          >
            View Full Profile
            <MessageSquare className="h-3.5 w-3.5" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
