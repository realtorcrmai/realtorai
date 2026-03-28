"use client";

import Link from "next/link";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  type: string;
  source: string;
  lead_status: string | null;
  stage_bar: string | null;
  created_at: string;
}

interface Props {
  leads: Lead[];
}

const SOURCE_LABELS: Record<string, string> = {
  website: "Contact Form",
  website_newsletter: "Newsletter",
  website_booking: "Booking",
  website_valuation: "Valuation",
  website_chat: "Chatbot",
  website_newsletter_resubscribe: "Re-subscribe",
};

export function LeadsTab({ leads }: Props) {
  if (leads.length === 0) {
    return (
      <div className="lf-card" style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>No Website Leads Yet</h3>
        <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
          Add the ListingFlow SDK to your website. When visitors submit forms, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="lf-card" style={{ padding: "12px 18px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {leads.length} website lead{leads.length !== 1 ? "s" : ""}
        </span>
        <a
          href="/api/contacts/export"
          style={{ fontSize: 12, color: "#4f35d2", textDecoration: "none" }}
        >
          Export CSV
        </a>
      </div>

      <div className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.06)", textAlign: "left" }}>
              <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#888" }}>Name</th>
              <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#888" }}>Contact</th>
              <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#888" }}>Source</th>
              <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#888" }}>Type</th>
              <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#888" }}>Status</th>
              <th style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#888" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <td style={{ padding: "10px 14px" }}>
                  <Link
                    href={`/contacts/${lead.id}`}
                    style={{ color: "#4f35d2", textDecoration: "none", fontWeight: 500 }}
                  >
                    {lead.name}
                  </Link>
                </td>
                <td style={{ padding: "10px 14px", color: "#666" }}>
                  {lead.email || lead.phone}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10,
                    background: "rgba(79,53,210,0.08)", color: "#4f35d2",
                  }}>
                    {SOURCE_LABELS[lead.source] || lead.source}
                  </span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10, textTransform: "capitalize",
                    background: lead.type === "seller" ? "rgba(255,92,58,0.08)" : "rgba(0,191,165,0.08)",
                    color: lead.type === "seller" ? "#ff5c3a" : "#00bfa5",
                  }}>
                    {lead.type}
                  </span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10, textTransform: "capitalize",
                    background: "rgba(0,0,0,0.04)", color: "#666",
                  }}>
                    {lead.stage_bar || lead.lead_status || "new"}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", color: "#999", fontSize: 12 }}>
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
