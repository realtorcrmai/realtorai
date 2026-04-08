import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";
import { Phone, Mail, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface ShowingContextPanelProps {
  showing: {
    id: string;
    listing_id: string;
    status: "requested" | "confirmed" | "denied" | "cancelled";
    buyer_agent_name: string;
    buyer_agent_phone: string;
    buyer_agent_email: string | null;
    start_time: string;
    created_at: string;
    listings: {
      id: string;
      address: string;
      lockbox_code: string;
      contacts: {
        id: string;
        name: string;
        phone: string;
        email: string | null;
      } | null;
    } | null;
  };
}

export function ShowingContextPanel({ showing }: ShowingContextPanelProps) {
  const listing = showing.listings;
  const seller = listing?.contacts ?? null;

  return (
    <div className="space-y-6">
      {/* Status */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Status
        </h3>
        <ShowingStatusBadge status={showing.status} />
      </section>

      {/* Listing */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Listing
        </h3>
        <div className="space-y-1.5">
          {listing ? (
            <>
              <Link
                href={`/listings/${showing.listing_id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {listing.address}
              </Link>
              {showing.status === "confirmed" && listing.lockbox_code && (
                <p className="text-xs font-medium text-[#0A6880]">
                  Lockbox: {listing.lockbox_code}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Unknown listing</p>
          )}
        </div>
      </section>

      {/* Buyer Agent */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Buyer Agent
        </h3>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{showing.buyer_agent_name}</p>
          <a
            href={`tel:${showing.buyer_agent_phone}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
          >
            <Phone className="h-3.5 w-3.5" />
            {showing.buyer_agent_phone}
          </a>
          {showing.buyer_agent_email && (
            <a
              href={`mailto:${showing.buyer_agent_email}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5" />
              {showing.buyer_agent_email}
            </a>
          )}
        </div>
      </section>

      {/* Seller */}
      {seller && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Seller
          </h3>
          <div className="space-y-1.5">
            <Link
              href={`/contacts/${seller.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {seller.name}
            </Link>
            <a
              href={`tel:${seller.phone}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" />
              {seller.phone}
            </a>
            {seller.email && (
              <a
                href={`mailto:${seller.email}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
              >
                <Mail className="h-3.5 w-3.5" />
                {seller.email}
              </a>
            )}
          </div>
        </section>
      )}

      {/* Timeline */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Timeline
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Created{" "}
              {formatDistanceToNow(new Date(showing.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Showing:{" "}
              {new Date(showing.start_time).toLocaleString("en-CA", {
                timeZone: "America/Vancouver",
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {new Date(showing.start_time) < new Date()
                ? `Occurred ${formatDistanceToNow(new Date(showing.start_time), { addSuffix: true })}`
                : `Upcoming in ${formatDistanceToNow(new Date(showing.start_time))}`}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
