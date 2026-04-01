import { createAdminClient } from "@/lib/supabase/admin";
import { Building2, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  const supabase = createAdminClient();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, address, status, list_price, hero_image_url, mls_number")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your CRM listings are automatically synced to your website. Active listings appear on your public site.
        </p>
      </div>

      <div className="card">
        {(!listings || listings.length === 0) ? (
          <div className="card-body text-center py-12">
            <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No listings found</p>
            <p className="text-sm text-gray-400 mt-1">Create listings in your CRM and they will appear here automatically.</p>
            <a
              href={process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:3000"}
              className="btn btn-outline btn-sm mt-4 inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Go to CRM
            </a>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {listings.map((listing) => (
              <div key={listing.id} className="px-6 py-4 flex items-center gap-4">
                <div className="h-14 w-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {listing.hero_image_url ? (
                    <img
                      src={listing.hero_image_url}
                      alt={listing.address}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{listing.address}</p>
                  <p className="text-xs text-gray-500">
                    {listing.mls_number ? `MLS# ${listing.mls_number} · ` : ""}
                    {listing.list_price
                      ? `$${Number(listing.list_price).toLocaleString()}`
                      : "Price TBD"}
                  </p>
                </div>
                <span className={`badge ${
                  listing.status === "active" ? "badge-success" :
                  listing.status === "pending" ? "badge-warning" : "badge-neutral"
                }`}>
                  {listing.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
