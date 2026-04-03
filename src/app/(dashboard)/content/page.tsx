import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import Link from "next/link";
import {
  Wand2,
  Building2,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Video,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MEDIA_STATUS_COLORS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const supabase = await getAuthenticatedTenantClient();

  const [{ data: listings }, { data: prompts }, { data: assets }] =
    await Promise.all([
      supabase
        .from("listings")
        .select("id, address, list_price, status, hero_image_url, contacts!listings_seller_id_fkey(name)")
        .order("created_at", { ascending: false }),
      supabase.from("prompts").select("*"),
      supabase.from("media_assets").select("*"),
    ]);

  const totalListings = listings?.length ?? 0;
  const withPrompts = prompts?.length ?? 0;
  const completedAssets =
    assets?.filter((a) => a.status === "completed").length ?? 0;
  const processingAssets =
    assets?.filter(
      (a) => a.status === "processing" || a.status === "pending"
    ).length ?? 0;

  const stats = [
    {
      label: "Total Listings",
      value: totalListings,
      color: "text-indigo-600",
      icon: Building2,
    },
    {
      label: "With Prompts",
      value: withPrompts,
      color: "text-violet-600",
      icon: Sparkles,
    },
    {
      label: "Completed Media",
      value: completedAssets,
      color: "text-emerald-600",
      icon: CheckCircle2,
    },
    {
      label: "Processing",
      value: processingAssets,
      color: "text-amber-600",
      icon: Clock,
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-float-in">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-violet elevation-4">
              <Wand2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Content Engine
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered MLS remarks, social media & video content
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-float-in"
          style={{ animationDelay: "80ms" }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-xl px-4 py-3 elevation-2 transition-all duration-200 hover:elevation-4"
            >
              <div className="flex items-center gap-2">
                <p className={cn("text-2xl font-bold", stat.color)}>
                  {stat.value}
                </p>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Listing Cards */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Listings
          </h2>
          {totalListings === 0 ? (
            <div className="glass rounded-xl p-12 elevation-2 text-center animate-float-in">
              <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Listings Yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Add listings to start generating AI content.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 stagger-children">
              {(listings ?? []).map((listing) => {
                const listingPrompt = prompts?.find(
                  (p) => p.listing_id === listing.id
                );
                const listingAssets = (assets ?? []).filter(
                  (a) => a.listing_id === listing.id
                );
                const videoAsset = listingAssets.find(
                  (a) => a.asset_type === "video"
                );
                const imageAsset = listingAssets.find(
                  (a) => a.asset_type === "image"
                );

                const sellerName =
                  listing.contacts &&
                  typeof listing.contacts === "object" &&
                  "name" in listing.contacts
                    ? (listing.contacts as { name: string }).name
                    : null;

                return (
                  <Link
                    key={listing.id}
                    href={`/content/${listing.id}`}
                    className="glass rounded-xl p-5 elevation-2 hover:elevation-4 transition-all duration-200 group animate-float-in"
                  >
                    <div className="flex items-center gap-4">
                      {/* Hero image thumbnail */}
                      <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0">
                        {listing.hero_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={listing.hero_image_url}
                            alt={listing.address}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {listing.address}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          {sellerName && (
                            <p className="text-xs text-muted-foreground">
                              {sellerName}
                            </p>
                          )}
                          {listing.list_price && (
                            <p className="text-xs text-muted-foreground">
                              $
                              {listing.list_price.toLocaleString("en-CA")}
                            </p>
                          )}
                        </div>

                        {/* Status badges */}
                        <div className="flex items-center gap-2 mt-2">
                          {/* Prompts status */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                              listingPrompt
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            )}
                          >
                            <Sparkles className="h-3 w-3" />
                            {listingPrompt ? "Prompts ✓" : "No prompts"}
                          </span>

                          {/* Video status */}
                          {videoAsset && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                                MEDIA_STATUS_COLORS[
                                  videoAsset.status as keyof typeof MEDIA_STATUS_COLORS
                                ]
                              )}
                            >
                              <Video className="h-3 w-3" />
                              Video
                            </span>
                          )}

                          {/* Image status */}
                          {imageAsset && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                                MEDIA_STATUS_COLORS[
                                  imageAsset.status as keyof typeof MEDIA_STATUS_COLORS
                                ]
                              )}
                            >
                              <ImageIcon className="h-3 w-3" />
                              Image
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200 shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
