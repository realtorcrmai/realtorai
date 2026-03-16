import { createAdminClient } from "@/lib/supabase/admin";
import { Star, Award, MapPin } from "lucide-react";
import type { RealtorSite, Testimonial } from "@/types";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const supabase = createAdminClient();

  const { data: siteData } = await supabase
    .from("realtor_sites")
    .select("*")
    .eq("is_published", true)
    .limit(1)
    .maybeSingle();

  const site = siteData as RealtorSite | null;
  if (!site) return null;

  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("*")
    .eq("site_id", site.id)
    .order("sort_order")
    .limit(6);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      {/* Profile Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-1">
          {site.headshot_url ? (
            <img
              src={site.headshot_url}
              alt={site.agent_name}
              className="rounded-2xl shadow-lg w-full"
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
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold text-gray-900 rt-heading mb-2">
            {site.agent_name}
          </h1>
          {site.agent_title && (
            <p className="font-medium mb-4" style={{ color: "var(--rt-primary)" }}>
              {site.agent_title}
            </p>
          )}
          {site.brokerage_name && (
            <p className="text-gray-500 text-sm mb-6">{site.brokerage_name}</p>
          )}
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {site.bio_full || site.bio_short || "Dedicated real estate professional committed to helping you achieve your real estate goals."}
          </p>
        </div>
      </section>

      {/* Credentials */}
      {site.credentials && site.credentials.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 rt-heading mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" style={{ color: "var(--rt-primary)" }} />
            Credentials & Designations
          </h2>
          <div className="flex flex-wrap gap-3">
            {site.credentials.map((cred) => (
              <span key={cred} className="badge badge-info text-sm px-4 py-1.5">
                {cred}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Service Areas */}
      {site.service_areas && site.service_areas.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 rt-heading mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" style={{ color: "var(--rt-primary)" }} />
            Service Areas
          </h2>
          <div className="flex flex-wrap gap-3">
            {site.service_areas.map((area) => (
              <span key={area} className="badge badge-neutral text-sm px-4 py-1.5">
                {area}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials && testimonials.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 rt-heading mb-6">
            Client Testimonials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(testimonials as Testimonial[]).map((t) => (
              <div key={t.id} className="card card-body">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating || 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 italic leading-relaxed mb-3">
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
    </div>
  );
}
