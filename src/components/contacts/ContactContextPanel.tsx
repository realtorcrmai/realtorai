import { formatDistanceToNow } from "date-fns";
import { Phone, Mail, MessageSquare, Building2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Contact, Listing, Communication } from "@/types";

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  sold: "bg-blue-50 text-blue-700 border-blue-200",
};

export function ContactContextPanel({
  contact,
  listings,
  communications,
}: {
  contact: Contact;
  listings: Listing[];
  communications: Communication[];
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
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {contact.type}
            </Badge>
          </div>
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
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Listings</span>
            <span className="font-medium">{listings.length}</span>
          </div>
        </div>
      </div>

      {/* Related Listings */}
      {listings.length > 0 && (
        <div className="space-y-3 border-t pt-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Related Listings
          </h3>
          <div className="space-y-2">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {listing.address}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`${statusColors[listing.status] ?? ""} text-[11px] px-1.5 py-0 shrink-0 capitalize`}
                >
                  {listing.status}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
