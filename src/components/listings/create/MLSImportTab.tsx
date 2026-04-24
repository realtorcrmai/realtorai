"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Calendar,
  DollarSign,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Key,
  User,
} from "lucide-react";
import { scrapeRealtorCaListing, importScrapedListing } from "@/actions/mls-scraper";
import type { ScrapedListing } from "@/actions/mls-scraper";
import type { Contact } from "@/types";

interface MLSImportTabProps {
  sellers: Contact[];
  loadingSellers: boolean;
}

export function MLSImportTab({ sellers, loadingSellers }: MLSImportTabProps) {
  const router = useRouter();
  const [mlsInput, setMlsInput] = useState("");
  const [preview, setPreview] = useState<ScrapedListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, startFetch] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [sellerId, setSellerId] = useState("");
  const [lockboxCode, setLockboxCode] = useState("");
  const [importSuccess, setImportSuccess] = useState<{ id: string; address: string } | null>(null);

  function handleFetch() {
    if (!mlsInput.trim()) return;
    setError(null);
    setPreview(null);
    setImportSuccess(null);

    startFetch(async () => {
      const result = await scrapeRealtorCaListing(mlsInput.trim());
      if ("error" in result && result.error) {
        setError(result.error);
      } else if (result.listing) {
        setPreview(result.listing);
      }
    });
  }

  function handleImport() {
    if (!preview) return;
    setError(null);

    startImport(async () => {
      const result = await importScrapedListing(preview, sellerId, lockboxCode.trim());
      if ("error" in result) {
        setError(result.error ?? "Import failed");
      } else if (result.success) {
        setImportSuccess({ id: result.id!, address: result.address! });
      }
    });
  }

  // Success state
  if (importSuccess) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-brand" />
          </div>
          <h3 className="text-xl font-bold">Listing Imported Successfully</h3>
          <p className="text-muted-foreground">{importSuccess.address}</p>
          <p className="text-sm text-muted-foreground">
            All MLS data, property details, and photos have been imported. You can now complete the listing workflow.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setPreview(null);
                setMlsInput("");
                setImportSuccess(null);
                setLockboxCode("");
                setSellerId("");
              }}
            >
              Import Another
            </Button>
            <Button
              className="bg-brand gap-2"
              onClick={() => {
                router.push(`/listings/${importSuccess.id}`);
                router.refresh();
              }}
            >
              View Listing <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* MLS Input Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white text-xs font-bold shadow-sm">
            1
          </div>
          <h2 className="text-sm font-semibold">
            Paste MLS link or number <span className="text-red-400">*</span>
          </h2>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={mlsInput}
              onChange={(e) => setMlsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFetch();
              }}
              placeholder="Paste realtor.ca listing URL"
              className="h-11 text-sm pl-10"
              autoFocus
            />
          </div>
          <Button
            onClick={handleFetch}
            disabled={!mlsInput.trim() || isFetching}
            className="h-11 px-6 bg-brand gap-2"
          >
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Fetch
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/60">
          Paste a full realtor.ca listing URL (e.g. https://www.realtor.ca/real-estate/12345678/...)
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
            {error.includes("already exists") && (
              <p className="text-xs text-red-600/70 mt-1">This listing is already in your CRM.</p>
            )}
          </div>
        </div>
      )}

      {/* Preview Card */}
      {preview && (
        <>
          <div className="rounded-2xl border border-border/50 bg-white dark:bg-zinc-900 overflow-hidden shadow-lg animate-float-in">
            {/* Hero Image */}
            {preview.heroImage ? (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={preview.heroImage}
                  alt={preview.address}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    <p className="text-white font-bold text-lg drop-shadow-lg">{preview.address}</p>
                    <p className="text-white/80 text-sm">
                      {[preview.city, preview.province, preview.postalCode].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  {preview.listPrice != null && (
                    <span className="text-white font-bold text-xl drop-shadow-lg">
                      ${preview.listPrice.toLocaleString()}
                    </span>
                  )}
                </div>
                {preview.photoCount > 0 && (
                  <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <ImageIcon className="h-3 w-3" />
                    {preview.photoCount} photos
                  </div>
                )}
              </div>
            ) : (
              <div className="h-32 bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-brand mx-auto mb-1" />
                  <p className="font-bold">{preview.address}</p>
                  {preview.listPrice != null && (
                    <p className="text-brand font-bold text-lg">${preview.listPrice.toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {preview.mlsNumber && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand/10 text-brand border border-brand/20">
                    MLS# {preview.mlsNumber}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {preview.propertyType}
                </span>
                {preview.landSize && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                    Lot: {preview.landSize}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {preview.bedrooms != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <BedDouble className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{preview.bedrooms}</span>
                    <span className="text-muted-foreground">beds</span>
                  </div>
                )}
                {preview.bathrooms != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{preview.bathrooms}</span>
                    <span className="text-muted-foreground">baths</span>
                  </div>
                )}
                {preview.sqft != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{preview.sqft.toLocaleString()}</span>
                    <span className="text-muted-foreground">sqft</span>
                  </div>
                )}
                {preview.yearBuilt != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{preview.yearBuilt}</span>
                    <span className="text-muted-foreground">built</span>
                  </div>
                )}
              </div>

              {preview.description && (
                <div className="text-sm text-muted-foreground border-t border-border/30 pt-3">
                  <p className="line-clamp-3">{preview.description}</p>
                </div>
              )}

              {/* Photo thumbnails */}
              {preview.photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto border-t border-border/30 pt-3">
                  {preview.photos.slice(0, 6).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="h-16 w-24 rounded-lg object-cover shrink-0 border border-border/30"
                    />
                  ))}
                </div>
              )}

              <a
                href={preview.listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
              >
                View on realtor.ca <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Seller + Lockbox (required before import) */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white text-xs font-bold shadow-sm">
                2
              </div>
              <h2 className="text-sm font-semibold">
                Assign seller & lockbox <span className="text-red-400">*</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Seller <span className="text-red-400">*</span>
                </label>
                {loadingSellers ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading sellers...
                  </div>
                ) : (
                  <select
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                    className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Select a seller...</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {s.phone}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  Lockbox code <span className="text-red-400">*</span>
                </label>
                <Input
                  value={lockboxCode}
                  onChange={(e) => setLockboxCode(e.target.value)}
                  placeholder="1234"
                  className="h-11 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!sellerId || !lockboxCode.trim() || isImporting}
            className="w-full h-12 text-base font-semibold bg-brand shadow-lg rounded-xl gap-2"
            size="lg"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Importing listing data...
              </>
            ) : sellerId && lockboxCode.trim() ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Import Listing from MLS
              </>
            ) : (
              "Select seller & enter lockbox to import"
            )}
          </Button>
        </>
      )}
    </div>
  );
}
