import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import type { RealtorSite } from "@/types";

export function PublicFooter({ site, basePath = "" }: { site: RealtorSite; basePath?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Agent Info */}
          <div>
            <h3 className="font-bold text-lg rt-heading mb-3">
              {site.agent_name}
            </h3>
            {site.agent_title && (
              <p className="text-gray-400 text-sm mb-1">{site.agent_title}</p>
            )}
            {site.brokerage_name && (
              <p className="text-gray-400 text-sm">{site.brokerage_name}</p>
            )}
            {site.bio_short && (
              <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                {site.bio_short}
              </p>
            )}
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-gray-400 mb-4">
              Contact
            </h4>
            <div className="space-y-3">
              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4" /> {site.phone}
                </a>
              )}
              {site.email && (
                <a
                  href={`mailto:${site.email}`}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4" /> {site.email}
                </a>
              )}
              {site.office_address && (
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="h-4 w-4" /> {site.office_address}
                </p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-widest text-gray-400 mb-4">
              Quick Links
            </h4>
            <div className="space-y-2">
              {["Home", "Listings", "About", "Contact"].map((label) => (
                <Link
                  key={label}
                  href={label === "Home" ? `${basePath}/` : `${basePath}/${label.toLowerCase()}`}
                  className="block text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            &copy; {year} {site.agent_name}. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">
            Powered by{" "}
            <span className="text-gray-400">
              ListingFlow
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
