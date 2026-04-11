import { formatDistanceToNow } from "date-fns";
import { Phone, Mail, MessageSquare, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Contact, Communication, ContactDate } from "@/types";
import { ImportantDatesPanel } from "./ImportantDatesPanel";

export function ContactContextPanel({
  contact,
  communications,
  contactDates = [],
}: {
  contact: Contact;
  communications: Communication[];
  contactDates?: ContactDate[];
}) {
  const lastComm =
    communications.length > 0 ? communications[0] : null;

  return (
    <div className="space-y-6">
      {/* Contact Info */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Contact Info
        </h3>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{contact.phone}</span>
          </div>
          {contact.email && (
            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[11px]">
              <MessageSquare className="h-3 w-3 mr-1" />
              {contact.pref_channel}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-[11px] capitalize ${
                contact.type === "seller"
                  ? "bg-brand-muted-strong text-brand-dark"
                  : "bg-brand-muted text-brand-dark"
              }`}
            >
              {contact.type}
            </Badge>
          </div>
          {contact.address && (
            <p className="text-sm text-muted-foreground">{contact.address}</p>
          )}
          {contact.source && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Source</span>
              <span className="font-medium">{contact.source}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>
              Added{" "}
              {formatDistanceToNow(new Date(contact.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="space-y-3 border-t pt-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Quick Stats
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Communications</span>
            <span className="font-medium">{communications.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last contact</span>
            <span className="font-medium text-xs">
              {lastComm
                ? formatDistanceToNow(new Date(lastComm.created_at), {
                    addSuffix: true,
                  })
                : "Never"}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {contact.notes && (
        <div className="space-y-3 border-t pt-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Notes
          </h3>
          <p className="text-sm text-muted-foreground">{contact.notes}</p>
        </div>
      )}

      {/* Important Dates */}
      <div className="border-t pt-6">
        <ImportantDatesPanel contactId={contact.id} dates={contactDates} />
      </div>
    </div>
  );
}
