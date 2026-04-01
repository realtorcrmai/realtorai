import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteBasePath } from "@/lib/site-links";
import { notFound } from "next/navigation";
import { MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ContactForm } from "@/components/shared/ContactForm";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const basePath = await getSiteBasePath();

  const [{ data: listing }, { data: site }, { data: prompt }] = await Promise.all([
    supabase.from("listings").select("*").eq("id", id).maybeSingle(),
    supabase.from("realtor_sites").select("id").eq("is_published", true).limit(1).maybeSingle(),
    supabase.from("prompts").select("mls_public").eq("listing_id", id).maybeSingle(),
  ]);

  if (!listing) return notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={`${basePath}/listings`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Listings
      </Link>

      {/* Hero Image */}
      <div className="h-64 sm:h-96 rounded-2xl overflow-hidden bg-gray-100 mb-8">
        {listing.hero_image_url ? (
          <img
            src={listing.hero_image_url}
            alt={listing.address}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-300">
            <MapPin className="h-16 w-16" />
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 rt-heading mb-2">
          {listing.address}
        </h1>
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-2xl font-bold" style={{ color: "var(--rt-primary)" }}>
            {listing.list_price
              ? `$${Number(listing.list_price).toLocaleString()}`
              : "Contact for Price"}
          </p>
          {listing.mls_number && (
            <span className="badge badge-neutral">MLS# {listing.mls_number}</span>
          )}
          <span className={`badge ${
            listing.status === "active" ? "badge-success" :
            listing.status === "pending" ? "badge-warning" : "badge-neutral"
          }`}>
            {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Description */}
      {(prompt?.mls_public || listing.notes) && (
        <div className="card card-body mb-8">
          <h2 className="font-semibold text-gray-900 mb-3">About This Property</h2>
          <p className="text-gray-600 leading-relaxed">
            {prompt?.mls_public || listing.notes}
          </p>
        </div>
      )}

      {/* Contact / Inquiry Form */}
      {site && (
        <div className="card card-body">
          <h2 className="font-semibold text-gray-900 mb-4">Interested in this property?</h2>
          <ContactForm siteId={site.id} sourcePage={`/listings/${id}`} />
        </div>
      )}
    </div>
  );
}
