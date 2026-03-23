import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign } from "lucide-react";
import type { Listing } from "@/types";
import { LISTING_STATUS_COLORS } from "@/lib/constants";

export function ListingCard({ listing }: { listing: Listing & { contacts?: { name: string; phone: string } } }) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {listing.address}
                </h3>
              </div>
              {listing.list_price && (
                <div className="flex items-center gap-1 text-sm font-medium mt-2">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {listing.list_price.toLocaleString("en-CA", {
                      style: "currency",
                      currency: "CAD",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                {listing.mls_number && (
                  <p className="text-xs text-muted-foreground">
                    MLS# {listing.mls_number}
                  </p>
                )}
                {listing.contacts && (
                  <p className="text-xs text-muted-foreground">
                    Seller: {listing.contacts.name}
                  </p>
                )}
              </div>
            </div>
            <Badge
              variant="outline"
              className={`${LISTING_STATUS_COLORS[listing.status as keyof typeof LISTING_STATUS_COLORS]} text-[11px] font-medium capitalize shrink-0`}
            >
              {listing.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
