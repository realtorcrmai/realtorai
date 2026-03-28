import { formatDistanceToNow } from "date-fns";
import { Building2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Listing } from "@/types";

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  sold: "bg-blue-50 text-blue-700 border-blue-200",
};

export function PropertyHistoryPanel({
  listings,
  contactType,
}: {
  listings: Listing[];
  contactType: string;
}) {
  if (listings.length === 0) return null;

  const activeListings = listings.filter((l) => l.status !== "sold");
  const soldListings = listings.filter((l) => l.status === "sold");

  const totalSoldValue = soldListings.reduce(
    (sum, l) => sum + (Number(l.sold_price) || Number(l.list_price) || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          {contactType === "seller" ? "Property History" : "Purchases"}
        </h3>
        {soldListings.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {soldListings.length} {contactType === "seller" ? "sold" : "purchased"}
          </span>
        )}
      </div>

      {/* Summary Stats */}
      {soldListings.length > 0 && (
        <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted/30">
          <div className="text-center">
            <p className="text-2xl font-bold">{soldListings.length}</p>
            <p className="text-xs text-muted-foreground uppercase">
              {contactType === "seller" ? "Properties Sold" : "Properties Purchased"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {totalSoldValue.toLocaleString("en-CA", {
                style: "currency",
                currency: "CAD",
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-muted-foreground uppercase">
              Total Value
            </p>
          </div>
        </div>
      )}

      {/* Active Listings */}
      {activeListings.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Active
          </p>
          {activeListings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group border border-border/50"
            >
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {listing.address}
                </p>
                {listing.list_price && (
                  <p className="text-xs text-muted-foreground">
                    {Number(listing.list_price).toLocaleString("en-CA", {
                      style: "currency",
                      currency: "CAD",
                      maximumFractionDigits: 0,
                    })}
                  </p>
                )}
              </div>
              <Badge
                variant="outline"
                className={`${statusColors[listing.status] ?? ""} text-[11px] px-1.5 py-0 shrink-0 capitalize`}
              >
                {listing.status}
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}

      {/* Sold/Purchased Listings */}
      {soldListings.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {contactType === "seller" ? "Sold" : "Purchased"}
          </p>
          {soldListings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group border border-border/50"
            >
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {listing.address}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {(Number(listing.sold_price) || Number(listing.list_price) || 0).toLocaleString("en-CA", {
                      style: "currency",
                      currency: "CAD",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  {listing.closing_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(listing.closing_date + "T00:00:00").toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] px-1.5 py-0 shrink-0"
              >
                Sold
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
