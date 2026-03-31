import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteBasePath } from "@/lib/site-links";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Listing } from "@/types";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const supabase = createAdminClient();
  const basePath = await getSiteBasePath();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, address, list_price, hero_image_url, status, mls_number, notes")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 rt-heading">
          Available Listings
        </h1>
        <p className="text-gray-500 mt-1">
          {listings?.length || 0} properties available
        </p>
      </div>

      {(!listings || listings.length === 0) ? (
        <div className="text-center py-20">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No active listings at the moment</p>
          <p className="text-gray-400 text-sm mt-1">Check back soon for new properties.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(listings as Listing[]).map((listing) => (
            <Link
              key={listing.id}
              href={`${basePath}/listings/${listing.id}`}
              className="group card overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div className="h-52 bg-gray-100 overflow-hidden">
                {listing.hero_image_url ? (
                  <img
                    src={listing.hero_image_url}
                    alt={listing.address}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-300">
                    <MapPin className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="text-xl font-bold text-gray-900">
                  {listing.list_price
                    ? `$${Number(listing.list_price).toLocaleString()}`
                    : "Contact for Price"}
                </p>
                <p className="text-sm text-gray-500 mt-1">{listing.address}</p>
                {listing.mls_number && (
                  <p className="text-xs text-gray-400 mt-2">MLS# {listing.mls_number}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
