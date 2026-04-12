"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchDDFListings, importDDFListing } from "@/actions/ddf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Search, Download, Check, AlertCircle, MapPin, Bed, Bath, Image } from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";

type SearchResult = {
  listingKey: string;
  listingId: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  listPrice: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  livingAreaUnits: string | null;
  propertySubType: string;
  status: string;
  photosCount: number;
  heroImage: string | null;
  modifiedAt: string;
};

type ImportState = "idle" | "importing" | "success" | "error";

export function DDFImportModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Vancouver");
  const [province] = useState("British Columbia");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, startSearch] = useTransition();
  const [importStates, setImportStates] = useState<Record<string, ImportState>>({});
  const [importMessages, setImportMessages] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function handleSearch() {
    setError(null);
    startSearch(async () => {
      const params = query
        ? { mlsNumber: query, top: 10, count: true }
        : {
            city: city || undefined,
            province: province || undefined,
            status: "Active" as const,
            top: 20,
            count: true,
          };

      const res = await searchDDFListings(params);
      if ("error" in res) {
        setError(res.error ?? "Search failed");
        setResults([]);
      } else {
        setResults(res.results ?? []);
        if (res.results?.length === 0) {
          setError("No listings found matching your criteria");
        }
      }
    });
  }

  async function handleImport(result: SearchResult) {
    setImportStates((s) => ({ ...s, [result.listingKey]: "importing" }));

    try {
      const res = await importDDFListing(result.listingId, "mls");
      if ("error" in res) {
        setImportStates((s) => ({ ...s, [result.listingKey]: "error" }));
        setImportMessages((s) => ({ ...s, [result.listingKey]: res.error ?? "Import failed" }));
      } else {
        setImportStates((s) => ({ ...s, [result.listingKey]: "success" }));
        setImportMessages((s) => ({
          ...s,
          [result.listingKey]: `Imported with ${res.enrichment_fields} enrichment fields`,
        }));
        router.refresh();
        // Navigate to the imported listing after a brief delay
        setTimeout(() => {
          router.push(`/listings/${res.id}`);
          setOpen(false);
        }, 800);
      }
    } catch {
      setImportStates((s) => ({ ...s, [result.listingKey]: "error" }));
      setImportMessages((s) => ({ ...s, [result.listingKey]: "Unexpected error" }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" />
            Import from DDF
          </Button>
        }
      />
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Import from CREA DDF
          </DialogTitle>
        </DialogHeader>

        {/* Search controls */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="MLS# (e.g. R3045716) or leave blank to browse"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9 text-sm"
            />
          </div>
          {!query && (
            <Input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-32 h-9 text-sm"
            />
          )}
          <Button
            onClick={handleSearch}
            disabled={searching}
            size="sm"
            className="h-9 px-3"
          >
            {searching ? (
              <LogoSpinner size={16} />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2">
          {results.map((r) => {
            const state = importStates[r.listingKey] ?? "idle";
            const msg = importMessages[r.listingKey];

            return (
              <div
                key={r.listingKey}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-md bg-muted shrink-0 overflow-hidden">
                  {r.heroImage ? (
                    <img
                      src={r.heroImage}
                      alt={r.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Image className="h-6 w-6" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.address}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {r.city}
                    </span>
                    <span>MLS# {r.listingId}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {r.listPrice != null && (
                      <span className="font-medium text-foreground">
                        {r.listPrice.toLocaleString("en-CA", {
                          style: "currency",
                          currency: "CAD",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    )}
                    {r.bedrooms != null && (
                      <span className="flex items-center gap-0.5">
                        <Bed className="h-3 w-3" /> {r.bedrooms}
                      </span>
                    )}
                    {r.bathrooms != null && (
                      <span className="flex items-center gap-0.5">
                        <Bath className="h-3 w-3" /> {r.bathrooms}
                      </span>
                    )}
                    {r.livingArea != null && (
                      <span>{r.livingArea.toLocaleString()} sqft</span>
                    )}
                  </div>
                  {/* Import message */}
                  {msg && (
                    <p
                      className={`text-xs mt-1 ${
                        state === "error" ? "text-red-600" : "text-brand"
                      }`}
                    >
                      {msg}
                    </p>
                  )}
                </div>

                {/* Action */}
                <div className="shrink-0">
                  <Badge
                    variant="outline"
                    className="text-[10px] mb-1.5 capitalize"
                  >
                    {r.propertySubType}
                  </Badge>
                  <div>
                    {state === "idle" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleImport(r)}
                      >
                        <Download className="h-3 w-3" />
                        Import
                      </Button>
                    )}
                    {state === "importing" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
                        <LogoSpinner size={12} />
                      </Button>
                    )}
                    {state === "success" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-brand" disabled>
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    {state === "error" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600"
                        onClick={() => handleImport(r)}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        {results.length === 0 && !error && !searching && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Search by MLS number for a specific listing, or browse active listings by city.
            <br />
            Powered by CREA DDF — 184,000+ Canadian listings.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
