import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteBasePath } from "@/lib/site-links";
import Link from "next/link";
import { ArrowRight, Star, MapPin } from "lucide-react";
import type { RealtorSite, Listing, Testimonial } from "@/types";
import { ContactForm } from "@/components/shared/ContactForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createAdminClient();
  const basePath = await getSiteBasePath();

  const { data: siteData } = await supabase
    .from("realtor_sites")
    .select("*")
    .eq("is_published", true)
    .limit(1)
    .maybeSingle();

  const site = siteData as RealtorSite | null;
  if (!site) return null;

  const [{ data: listings }, { data: testimonials }] = await Promise.all([
    supabase
      .from("listings")
      .select("id, address, list_price, hero_image_url, status, mls_number")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("testimonials")
      .select("*")
      .eq("site_id", site.id)
      .order("sort_order")
      .limit(4),
  ]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4">
        <div className="absolute inset-0 gradient-primary opacity-95" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/10" />
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold rt-heading mb-4 leading-tight">
            {site.tagline || `Find Your Dream Home with ${site.agent_name}`}
          </h1>
          {site.bio_short && (
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              {site.bio_short}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={`${basePath}/listings`} className="btn bg-white text-gray-900 hover:bg-gray-100 text-base px-8 py-3">
              View Listings <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={`${basePath}/contact`} className="btn border-2 border-white/30 text-white hover:bg-white/10 text-base px-8 py-3">
              Contact Me
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {listings && listings.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 rt-heading">
                Featured Listings
              </h2>
              <p className="text-gray-500 mt-1">Explore my current properties</p>
            </div>
            <Link
              href={`${basePath}/listings`}
              className="text-sm font-semibold hover:underline hidden sm:flex items-center gap-1"
              style={{ color: "var(--rt-primary)" }}
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(listings as Listing[]).map((listing) => (
              <Link
                key={listing.id}
                href={`${basePath}/listings/${listing.id}`}
                className="group card overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-48 bg-gray-100 overflow-hidden">
                  {listing.hero_image_url ? (
                    <img
                      src={listing.hero_image_url}
                      alt={listing.address}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-300">
                      <MapPin className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-lg font-bold text-gray-900">
                    {listing.list_price
                      ? `$${Number(listing.list_price).toLocaleString()}`
                      : "Price TBD"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    {listing.address}
                  </p>
                  {listing.mls_number && (
                    <p className="text-xs text-gray-400 mt-1">
                      MLS# {listing.mls_number}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* About Preview */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              {site.headshot_url ? (
                <img
                  src={site.headshot_url}
                  alt={site.agent_name}
                  className="rounded-2xl shadow-lg w-full max-w-md mx-auto"
                />
              ) : (
                <div
                  className="h-80 rounded-2xl flex items-center justify-center text-white text-6xl font-bold rt-heading"
                  style={{ background: "var(--rt-primary)" }}
                >
                  {site.agent_name[0]}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 rt-heading mb-4">
                About {site.agent_name}
              </h2>
              {site.agent_title && (
                <p className="text-sm font-medium mb-2" style={{ color: "var(--rt-primary)" }}>
                  {site.agent_title}
                </p>
              )}
              <p className="text-gray-600 leading-relaxed mb-6">
                {site.bio_full || site.bio_short || "Dedicated to helping you find your perfect home."}
              </p>
              {site.service_areas && site.service_areas.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Service Areas</p>
                  <div className="flex flex-wrap gap-2">
                    {site.service_areas.map((area) => (
                      <span key={area} className="badge badge-neutral">{area}</span>
                    ))}
                  </div>
                </div>
              )}
              <Link href={`${basePath}/about`} className="btn btn-primary">
                Learn More <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials && testimonials.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 rt-heading">
              What My Clients Say
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(testimonials as Testimonial[]).map((t) => (
              <div key={t.id} className="card card-body">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating || 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 italic leading-relaxed mb-4">
                  &ldquo;{t.content}&rdquo;
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  — {t.client_name}
                  {t.client_location && (
                    <span className="text-gray-400 font-normal">, {t.client_location}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact CTA */}
      <section className="py-16 px-4" style={{ background: "var(--rt-primary)" }}>
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold rt-heading mb-3">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 mb-8">
            Whether you&apos;re buying or selling, I&apos;m here to help every step of the way.
          </p>
          <ContactForm siteId={site.id} sourcePage="/" dark />
        </div>
      </section>
    </div>
  );
}
