import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  Globe,
  Users,
  Eye,
  TrendingUp,
  Palette,
  FileText,
  MessageSquareQuote,
  Settings,
  ArrowRight,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  // Get the first site (single-tenant for now)
  const { data: site } = await supabase
    .from("realtor_sites")
    .select("*")
    .limit(1)
    .maybeSingle();

  // If no site exists, show setup prompt
  if (!site) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-md animate-float-in">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center mx-auto mb-6">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to ListingFlow Sites
          </h1>
          <p className="text-gray-500 mb-8">
            Create your professional real estate website in minutes. Upload your photos, add testimonials, and go live.
          </p>
          <Link
            href="/setup"
            className="btn btn-primary text-base px-8 py-3"
          >
            <Plus className="h-5 w-5" />
            Create Your Website
          </Link>
        </div>
      </div>
    );
  }

  // Fetch stats
  const [
    { count: leadCount },
    { count: testimonialCount },
    { data: recentLeads },
  ] = await Promise.all([
    supabase
      .from("site_leads")
      .select("*", { count: "exact", head: true })
      .eq("site_id", site.id),
    supabase
      .from("testimonials")
      .select("*", { count: "exact", head: true })
      .eq("site_id", site.id),
    supabase
      .from("site_leads")
      .select("*")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    {
      label: "Total Leads",
      value: leadCount ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Testimonials",
      value: testimonialCount ?? 0,
      icon: MessageSquareQuote,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Status",
      value: site.live_url ? "Live" : site.is_published ? "Published" : "Draft",
      icon: Globe,
      color: site.live_url ? "text-green-600" : site.is_published ? "text-amber-600" : "text-gray-400",
      bg: site.live_url ? "bg-green-50" : site.is_published ? "bg-amber-50" : "bg-gray-50",
    },
    {
      label: "Website",
      value: site.live_url ? "AI Generated" : "Not Generated",
      icon: Palette,
      color: site.live_url ? "text-teal-600" : "text-gray-400",
      bg: site.live_url ? "bg-teal-50" : "bg-gray-50",
    },
  ];

  const quickActions = [
    { href: "/design", label: "Edit Design", icon: Palette, desc: "Colors, fonts & template" },
    { href: "/pages", label: "Edit Pages", icon: FileText, desc: "Homepage, about & more" },
    { href: "/testimonials", label: "Testimonials", icon: MessageSquareQuote, desc: "Client reviews" },
    { href: "/settings", label: "Settings", icon: Settings, desc: "Domain, SEO & social" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-float-in">
        <h1 className="text-2xl font-bold text-gray-900">
          Website Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          {site.agent_name}&apos;s website &mdash;{" "}
          <span className="text-teal-600 font-medium">
            {site.subdomain}.listingflow.com
          </span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-float-in" style={{ animationDelay: "80ms" }}>
        {stats.map((stat) => (
          <div key={stat.label} className="card card-body flex items-center gap-4">
            <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="animate-float-in" style={{ animationDelay: "160ms" }}>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="card card-body group hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <action.icon className="h-5 w-5 text-gray-400 group-hover:text-teal-600 transition-colors" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                <p className="text-xs text-gray-400">{action.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="animate-float-in" style={{ animationDelay: "240ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Recent Leads
          </h2>
          <Link href="/leads" className="text-xs text-teal-600 font-medium hover:underline">
            View all
          </Link>
        </div>
        <div className="card">
          {(!recentLeads || recentLeads.length === 0) ? (
            <div className="card-body text-center py-10">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No leads yet. Share your website to start capturing leads.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="px-6 py-3 flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold">
                    {((lead.form_data as Record<string, string>)?.name || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(lead.form_data as Record<string, string>)?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400">{lead.lead_type} &middot; {new Date(lead.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`badge ${lead.status === "new" ? "badge-info" : "badge-neutral"}`}>
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
