"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import type { RealtorSite } from "@/types";

export function PublicNav({ site, basePath = "" }: { site: RealtorSite; basePath?: string }) {
  const [open, setOpen] = useState(false);

  const pages = [
    { href: `${basePath}/`, label: "Home" },
    { href: `${basePath}/listings`, label: "Listings" },
    { href: `${basePath}/about`, label: "About" },
    ...(site.show_sold ? [{ href: `${basePath}/sold`, label: "Sold" }] : []),
    { href: `${basePath}/contact`, label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Name */}
          <Link href={`${basePath}/`} className="flex items-center gap-3">
            {site.headshot_url ? (
              <img
                src={site.headshot_url}
                alt={site.agent_name}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: "var(--rt-primary)" }}
              >
                {site.agent_name[0]}
              </div>
            )}
            <div>
              <p className="font-bold text-sm text-gray-900 rt-heading">
                {site.agent_name}
              </p>
              {site.brokerage_name && (
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {site.brokerage_name}
                </p>
              )}
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {pages.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {p.label}
              </Link>
            ))}
            {site.phone && (
              <a
                href={`tel:${site.phone}`}
                className="ml-2 btn btn-primary btn-sm"
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </a>
            )}
          </nav>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-gray-500"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {open && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            {pages.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                {p.label}
              </Link>
            ))}
            {site.phone && (
              <a
                href={`tel:${site.phone}`}
                className="block px-3 py-2.5 text-sm font-semibold rounded-lg"
                style={{ color: "var(--rt-primary)" }}
              >
                Call {site.phone}
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
