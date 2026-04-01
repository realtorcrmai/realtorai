import { createAdminClient } from "@/lib/supabase/admin";
import { Users, Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = createAdminClient();

  const { data: site } = await supabase.from("realtor_sites").select("id").limit(1).maybeSingle();
  if (!site) return <div className="p-8 text-gray-400">Set up your website first.</div>;

  const { data: leads } = await supabase
    .from("site_leads")
    .select("*")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-gray-500 text-sm mt-1">Inquiries from your website visitors</p>
      </div>

      <div className="card">
        {(!leads || leads.length === 0) ? (
          <div className="card-body text-center py-12">
            <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No leads yet</p>
            <p className="text-sm text-gray-400 mt-1">Leads will appear here when visitors submit forms on your website.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {leads.map((lead) => {
              const fd = lead.form_data as Record<string, string>;
              return (
                <div key={lead.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-sm font-bold shrink-0">
                    {(fd?.name || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{fd?.name || "Unknown"}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      {fd?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {fd.email}
                        </span>
                      )}
                      {fd?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {fd.phone}
                        </span>
                      )}
                    </div>
                    {fd?.message && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{fd.message}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`badge ${
                      lead.status === "new" ? "badge-info" :
                      lead.status === "contacted" ? "badge-warning" :
                      lead.status === "qualified" ? "badge-success" : "badge-neutral"
                    }`}>
                      {lead.status}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
