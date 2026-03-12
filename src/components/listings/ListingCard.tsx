import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign } from "lucide-react";
import type { Listing } from "@/types";

const statusColors = {
  active: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  sold: "bg-blue-100 text-blue-800",
};

export function ListingCard({ listing }: { listing: Listing & { contacts?: { name: string; phone: string } } }) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-base">{listing.address}</h3>
              </div>
              {listing.list_price && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>
                    {listing.list_price.toLocaleString("en-CA", {
                      style: "currency",
                      currency: "CAD",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              )}
              {listing.mls_number && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  MLS# {listing.mls_number}
                </p>
              )}
              {listing.contacts && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Seller: {listing.contacts.name}
                </p>
              )}
            </div>
            <Badge
              variant="secondary"
              className={statusColors[listing.status]}
            >
              {listing.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
