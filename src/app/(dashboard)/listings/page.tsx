import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  DollarSign,
  Calendar,
  Eye,
  Home,
  Search,
  Building2,
  Plus,
} from "lucide-react";
import { LISTING_STATUS_COLORS } from "@/lib/constants";
import type { Listing, Contact } from "@/types";

export const dynamic = "force-dynamic";

interface ListingWithDetails extends Listing {
  contacts: { id: string; name: string; phone: string } | null;
}

interface ListingWithCounts extends ListingWithDetails {
  _count?: {
    appointments: number;
    open_houses: number;
  };
}

interface SearchParams {
  search?: string;
  status?: "all" | "active" | "pending" | "sold";
}

async function fetchListingsWithCounts(): Promise<ListingWithCounts[]> {
  const supabase = createAdminClient();

  // Fetch all listings with seller contacts
  const { data: allListings, error } = await supabase
    .from("listings")
    .select("*, contacts(id, name, phone)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching listings:", error);
    return [];
  }

  if (!allListings) {
    return [];
  }

  // Fetch counts for each listing
  const listingsWithCounts = await Promise.all(
    (allListings as Listing[]).map(async (listing) => {
      const [appointments, openHouses] = await Promise.all([
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("listing_id", listing.id),
        supabase
          .from("open_houses")
          .select("id", { count: "exact", head: true })
          .eq("listing_id", listing.id),
      ]);

      // Get the contact object from the relation
      const contact = (allListings.find((l) => l.id === listing.id) as any)?.contacts || null;

      return {
        ...listing,
        contacts: contact,
        _count: {
          appointments: appointments.count || 0,
          open_houses: openHouses.count || 0,
        },
      };
    })
  );

  return listingsWithCounts;
}

function filterListings(
  listings: ListingWithCounts[],
  searchQuery: string,
  statusFilter: "all" | "active" | "pending" | "sold"
): ListingWithCounts[] {
  return listings.filter((listing) => {
    const matchesStatus = statusFilter === "all" || listing.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      listing.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.mls_number?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });
}

function formatPrice(price: number | null): string {
  if (!price) return "N/A";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const searchQuery = params.search || "";
  const statusFilter = (params.status || "all") as "all" | "active" | "pending" | "sold";

  const listings = await fetchListingsWithCounts();
  const filteredListings = filterListings(listings, searchQuery, statusFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Listings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/listings/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Listing
          </Button>
        </Link>
      </div>

      {/* Search and Filter Bar */}
      <div className="space-y-4">
        <form method="get" className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {statusFilter !== "all" && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
          <input
            type="text"
            name="search"
            placeholder="Search by address or MLS number..."
            defaultValue={searchQuery}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </form>

        {/* Status Filter Tabs */}
        <div className="flex gap-2">
          {(["all", "active", "pending", "sold"] as const).map((status) => {
            const href = status === "all"
              ? searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "/listings"
              : searchQuery ? `?status=${status}&search=${encodeURIComponent(searchQuery)}` : `?status=${status}`;

            return (
              <Link
                key={status}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {status === "all" ? "All" : status}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Listings or Empty State */}
      {filteredListings.length === 0 ? (
        <Card className="max-w-md animate-float-in">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {listings.length === 0 ? "No Listings Yet" : "No Results Found"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {listings.length === 0
                ? "Create your first listing to get started."
                : "Try adjusting your search or filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredListings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Column */}
                    <div className="flex-1 min-w-0">
                      {/* Address and MLS */}
                      <div className="flex items-start gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                            {listing.address}
                          </h3>
                          {listing.mls_number && (
                            <p className="text-xs text-muted-foreground">
                              MLS# {listing.mls_number}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      {listing.list_price && (
                        <div className="flex items-center gap-1.5 mb-3">
                          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-foreground">
                            {formatPrice(listing.list_price)}
                          </span>
                        </div>
                      )}

                      {/* Seller and Created Date */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {listing.contacts && (
                          <div>
                            <p className="text-xs text-muted-foreground">Seller</p>
                            <p className="font-medium text-foreground truncate">
                              {listing.contacts.name}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created
                          </p>
                          <p className="font-medium text-foreground">
                            {formatDate(listing.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      {/* Status Badge */}
                      <Badge
                        className={`${LISTING_STATUS_COLORS[listing.status]} capitalize text-xs font-medium`}
                      >
                        {listing.status}
                      </Badge>

                      {/* Counts */}
                      <div className="flex flex-col gap-1.5 text-right">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {listing._count?.appointments || 0} showing
                            {listing._count?.appointments !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Home className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {listing._count?.open_houses || 0} open house
                            {listing._count?.open_houses !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
