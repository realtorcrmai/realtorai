"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Building2,
  MapPin,
  DollarSign,
  Filter,
  X,
  Eye,
  Clock,
} from "lucide-react";
import Link from "next/link";

type Listing = {
  id: string;
  address: string;
  status: string;
  mls_number: string | null;
  list_price: number | null;
  lockbox_code: string | null;
  showing_window_start: string | null;
  showing_window_end: string | null;
  notes: string | null;
  created_at: string;
  contacts: { name: string; phone: string } | null;
};

export default function PropertySearchPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      let url = "/api/listings";
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
      }
      const resp = await fetch(url);
      const data = await resp.json();
      setListings(Array.isArray(data) ? data : []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Filter listings client-side
  const filtered = listings.filter((l) => {
    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchAddress = l.address?.toLowerCase().includes(q);
      const matchMls = l.mls_number?.toLowerCase().includes(q);
      const matchSeller = l.contacts?.name?.toLowerCase().includes(q);
      if (!matchAddress && !matchMls && !matchSeller) return false;
    }

    // Price range
    if (priceMin && l.list_price && l.list_price < Number(priceMin)) return false;
    if (priceMax && l.list_price && l.list_price > Number(priceMax)) return false;

    return true;
  });

  const statusConfig: Record<string, { color: string; label: string }> = {
    active: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", label: "Active" },
    pending: { color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", label: "Pending" },
    sold: { color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", label: "Sold" },
  };

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setPriceMin("");
    setPriceMax("");
  }

  const hasActiveFilters = searchQuery || statusFilter !== "all" || priceMin || priceMax;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
    <div className="space-y-8">
      <div className="animate-float-in space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Find properties</p>
        <h1 className="text-3xl font-bold tracking-tight">Property Search</h1>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address, MLS #, or seller name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 h-2 w-2 rounded-full bg-primary-foreground" />
          )}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Min Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end mt-3">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "property" : "properties"} found
        </p>
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="text-center py-12">
          <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">
            Searching properties...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            No properties match your criteria
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Try adjusting your filters or search terms
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing) => {
            const status = statusConfig[listing.status] ?? statusConfig.active;
            return (
              <Card
                key={listing.id}
                className="hover:shadow-md transition-shadow group overflow-hidden"
              >
                {/* Colored top border based on status */}
                <div
                  className={`h-1 ${
                    listing.status === "active"
                      ? "bg-emerald-500"
                      : listing.status === "pending"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                />
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">
                        {listing.address}
                      </CardTitle>
                      {listing.mls_number && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          MLS# {listing.mls_number}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${status.color} border-0 shrink-0 ml-2`}
                    >
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  {/* Price */}
                  {listing.list_price && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      <span className="text-lg font-bold">
                        ${listing.list_price.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {listing.contacts?.name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>Seller: {listing.contacts.name}</span>
                      </div>
                    )}
                    {listing.showing_window_start && listing.showing_window_end && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          Showings: {listing.showing_window_start} -{" "}
                          {listing.showing_window_end}
                        </span>
                      </div>
                    )}
                  </div>

                  {listing.notes && (
                    <p className="text-xs text-muted-foreground/70 line-clamp-2 border-t pt-2">
                      {listing.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Link href={`/listings/${listing.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </div>
  );
}
