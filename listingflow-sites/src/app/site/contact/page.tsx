import { createAdminClient } from "@/lib/supabase/admin";
import { Phone, Mail, MapPin } from "lucide-react";
import type { RealtorSite } from "@/types";
import { ContactForm } from "@/components/shared/ContactForm";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const supabase = createAdminClient();

  const { data: siteData } = await supabase
    .from("realtor_sites")
    .select("*")
    .eq("is_published", true)
    .limit(1)
    .maybeSingle();

  const site = siteData as RealtorSite | null;
  if (!site) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Contact Info */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 rt-heading mb-4">
            Get In Touch
          </h1>
          <p className="text-gray-600 leading-relaxed mb-8">
            Whether you&apos;re looking to buy, sell, or just have questions about
            the real estate market, I&apos;m here to help. Reach out and I&apos;ll
            get back to you as soon as possible.
          </p>

          <div className="space-y-5">
            {site.phone && (
              <a
                href={`tel:${site.phone}`}
                className="flex items-center gap-4 group"
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ background: "var(--rt-primary)" }}
                >
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-gray-900 font-semibold group-hover:underline">
                    {site.phone}
                  </p>
                </div>
              </a>
            )}
            {site.email && (
              <a
                href={`mailto:${site.email}`}
                className="flex items-center gap-4 group"
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ background: "var(--rt-primary)" }}
                >
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900 font-semibold group-hover:underline">
                    {site.email}
                  </p>
                </div>
              </a>
            )}
            {site.office_address && (
              <div className="flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ background: "var(--rt-primary)" }}
                >
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Office</p>
                  <p className="text-gray-900 font-semibold">
                    {site.office_address}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Social Links */}
          {site.social_links && Object.values(site.social_links).some(Boolean) && (
            <div className="mt-8">
              <p className="text-sm font-semibold text-gray-900 mb-3">Follow Me</p>
              <div className="flex gap-3">
                {Object.entries(site.social_links).map(([platform, url]) =>
                  url ? (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-xs font-bold uppercase"
                    >
                      {platform[0]}
                    </a>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contact Form */}
        <div className="card card-body">
          <h2 className="font-semibold text-gray-900 mb-4">Send a Message</h2>
          <ContactForm siteId={site.id} sourcePage="/contact" />
        </div>
      </div>
    </div>
  );
}
