"use client";

import { useState, useCallback } from "react";
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
  DollarSign,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  AlertCircle,
  BedDouble,
  Bath,
  Ruler,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { LogoSpinner } from "@/components/brand/Logo";

type RepliersAddress = {
  streetNumber?: string;
  streetName?: string;
  streetSuffix?: string;
  streetDirection?: string;
  city?: string;
  state?: string;
  zip?: string;
  neighborhood?: string;
};

type RepliersListing = {
  mlsNumber: string;
  class: string;
  listPrice: number | null;
  address: RepliersAddress;
  details: {
    numBedrooms: number | null;
    numBathrooms: number | null;
    sqft: string | null;
    propertyType: string | null;
    yearBuilt: string | null;
    description: string | null;
  };
  images: string[];
  photoCount: number;
  daysOnMarket: number | null;
  map?: { latitude: number; longitude: number };
};

type ImportState = "idle" | "importing" | "success" | "error";

function formatAddress(addr: RepliersAddress): string {
  const parts = [
    addr.streetNumber,
    addr.streetName,
    addr.streetSuffix,
    addr.streetDirection,
  ].filter(Boolean);
  const street = parts.join(" ");
  const cityState = [addr.city, addr.state].filter(Boolean).join(", ");
  return [street, cityState, addr.zip].filter(Boolean).join(", ");
}

function formatPrice(price: number | null): string {
  if (!price) return "Price N/A";
  return `$${price.toLocaleString()}`;
}

export default function MLSBrowsePage() {
  // Search state
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [propertyClass, setPropertyClass] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Results state
  const [listings, setListings] = useState<RepliersListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Import state per listing
  const [importStates, setImportStates] = useState<Record<string, ImportState>>({});
  const [importResults, setImportResults] = useState<Record<string, { id?: string; error?: string }>>({});

  const fetchListings = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("pageNum", String(pageNum));
    params.set("resultsPerPage", "12");

    if (city.trim()) params.set("city", city.trim());
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (minBedrooms) params.set("minBedrooms", minBedrooms);
    if (propertyClass !== "all") params.set("class", propertyClass);

    try {
      const res = await fetch(`/api/repliers/listings?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch listings");
        setListings([]);
        return;
      }

      setListings(data.listings ?? []);
      setTotalPages(data.numPages ?? 0);
      setTotalCount(data.count ?? 0);
      setPage(data.page ?? pageNum);
      setSearched(true);
    } catch {
      setError("Failed to connect to MLS service");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [city, minPrice, maxPrice, minBedrooms, propertyClass]);

  function handleSearch() {
    setImportStates({});
    setImportResults({});
    fetchListings(1);
  }

  function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    fetchListings(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleImport(listing: RepliersListing) {
    const key = listing.mlsNumber;
    setImportStates((prev) => ({ ...prev, [key]: "importing" }));

    try {
      const res = await fetch("/api/repliers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mlsNumber: listing.mlsNumber,
          address: formatAddress(listing.address),
          listPrice: listing.listPrice,
          class: listing.class,
          propertyType: listing.details?.propertyType,
          description: listing.details?.description,
          bedrooms: listing.details?.numBedrooms,
          bathrooms: listing.details?.numBathrooms,
          sqft: listing.details?.sqft,
          yearBuilt: listing.details?.yearBuilt,
          lat: listing.map?.latitude,
          lng: listing.map?.longitude,
          images: listing.images,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportStates((prev) => ({ ...prev, [key]: "error" }));
        setImportResults((prev) => ({ ...prev, [key]: { error: data.error } }));
        return;
      }

      setImportStates((prev) => ({ ...prev, [key]: "success" }));
      setImportResults((prev) => ({ ...prev, [key]: { id: data.id } }));
    } catch {
      setImportStates((prev) => ({ ...prev, [key]: "error" }));
      setImportResults((prev) => ({ ...prev, [key]: { error: "Network error" } }));
    }
  }

  const hasActiveFilters = city || minPrice || maxPrice || minBedrooms || propertyClass !== "all";

  function clearFilters() {
    setCity("");
    setMinPrice("");
    setMaxPrice("");
    setMinBedrooms("");
    setPropertyClass("all");
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-float-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-blue elevation-4">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                MLS Browse
              </h1>
              <p className="text-sm text-muted-foreground">
                Search and import listings from Repliers MLS
              </p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by city (e.g. Vancouver, Toronto, Calgary)..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
              aria-label="City search"
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
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? (
              <LogoSpinner size={16} />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Property Class</Label>
                  <Select value={propertyClass} onValueChange={(val) => val && setPropertyClass(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      <SelectItem value="ResidentialProperty">Residential</SelectItem>
                      <SelectItem value="CondoProperty">Condo</SelectItem>
                      <SelectItem value="CommercialProperty">Commercial</SelectItem>
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
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="pl-10"
                      aria-label="Minimum price"
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
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="pl-10"
                      aria-label="Maximum price"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Min Bedrooms</Label>
                  <Select value={minBedrooms || "any"} onValueChange={(val) => setMinBedrooms(val === "any" ? "" : val ?? "")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="1">1+</SelectItem>
                      <SelectItem value="2">2+</SelectItem>
                      <SelectItem value="3">3+</SelectItem>
                      <SelectItem value="4">4+</SelectItem>
                      <SelectItem value="5">5+</SelectItem>
                    </SelectContent>
                  </Select>
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

        {/* Error message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results count + pagination top */}
        {searched && !error && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {totalCount.toLocaleString()} {totalCount === 1 ? "listing" : "listings"} found
              {totalPages > 1 && ` \u00B7 Page ${page} of ${totalPages.toLocaleString()}`}
            </p>
          </div>
        )}

        {/* Results grid */}
        {loading ? (
          <div className="text-center py-12">
            <LogoSpinner size={32} />
            <p className="text-sm text-muted-foreground">
              Searching MLS listings...
            </p>
          </div>
        ) : !searched ? (
          <div className="text-center py-12">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              Search MLS listings from Repliers
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Enter a city or use filters, then click Search
            </p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              No MLS listings found
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Try adjusting your filters or search a different city
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => {
              const key = listing.mlsNumber;
              const state = importStates[key] ?? "idle";
              const result = importResults[key];
              const addr = formatAddress(listing.address);
              const heroImg = listing.images?.[0]
                ? `https://cdn.repliers.io/${listing.images[0]}`
                : null;

              return (
                <Card
                  key={key}
                  className="hover:shadow-md transition-shadow group overflow-hidden"
                >
                  {/* Hero image */}
                  {heroImg && (
                    <div className="relative h-40 bg-muted overflow-hidden">
                      <img
                        src={heroImg}
                        alt={addr}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {listing.photoCount > 1 && (
                        <Badge className="absolute top-2 right-2 bg-black/60 text-white border-0 text-[10px]">
                          {listing.photoCount} photos
                        </Badge>
                      )}
                    </div>
                  )}

                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold truncate">
                          {addr}
                        </CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          MLS# {listing.mlsNumber}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                        {listing.class?.replace("Property", "") ?? "Residential"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-4">
                    {/* Price */}
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      <span className="text-lg font-bold">
                        {formatPrice(listing.listPrice)}
                      </span>
                    </div>

                    {/* Details row */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {listing.details?.numBedrooms != null && (
                        <div className="flex items-center gap-1">
                          <BedDouble className="h-3 w-3" />
                          <span>{listing.details.numBedrooms} bed</span>
                        </div>
                      )}
                      {listing.details?.numBathrooms != null && (
                        <div className="flex items-center gap-1">
                          <Bath className="h-3 w-3" />
                          <span>{listing.details.numBathrooms} bath</span>
                        </div>
                      )}
                      {listing.details?.sqft && (
                        <div className="flex items-center gap-1">
                          <Ruler className="h-3 w-3" />
                          <span>{listing.details.sqft} sqft</span>
                        </div>
                      )}
                      {listing.daysOnMarket != null && (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          <span>{listing.daysOnMarket}d</span>
                        </div>
                      )}
                    </div>

                    {/* Import action */}
                    <div className="pt-1">
                      {state === "idle" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleImport(listing)}
                          aria-label={`Import listing ${listing.mlsNumber}`}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Import to CRM
                        </Button>
                      )}
                      {state === "importing" && (
                        <Button variant="outline" size="sm" className="w-full text-xs" disabled>
                          <LogoSpinner size={12} />
                          Importing...
                        </Button>
                      )}
                      {state === "success" && result?.id && (
                        <Link href={`/listings/${result.id}`}>
                          <Button variant="outline" size="sm" className="w-full text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            View Listing
                          </Button>
                        </Link>
                      )}
                      {state === "error" && (
                        <div className="space-y-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleImport(listing)}
                            aria-label={`Retry import for ${listing.mlsNumber}`}
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Retry Import
                          </Button>
                          {result?.error && (
                            <p className="text-[10px] text-red-500 text-center">
                              {result.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {searched && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => handlePageChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages.toLocaleString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => handlePageChange(page + 1)}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
