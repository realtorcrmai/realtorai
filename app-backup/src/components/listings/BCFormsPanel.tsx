"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";

const BC_FORMS = [
  { key: "dorts",   label: "DORTS",   icon: "📋" },
  { key: "mlc",     label: "MLC",     icon: "📝" },
  { key: "pds",     label: "PDS",     icon: "🏠" },
  { key: "fintrac", label: "FINTRAC", icon: "🔍" },
  { key: "privacy", label: "Privacy", icon: "🔒" },
  { key: "c3",      label: "C3",      icon: "🤝" },
  { key: "drup",    label: "DRUP",    icon: "💰" },
  { key: "mls",     label: "MLS",     icon: "📊" },
];

type Seller = { id: string; name: string; phone: string; email: string | null };

export function BCFormsPanel({
  listing,
  seller,
}: {
  listing: Record<string, unknown>;
  seller: Seller;
}) {
  const [opening, setOpening] = useState<string | null>(null);

  async function openForm(formKey: string) {
    setOpening(formKey);
    const win = window.open("about:blank", "_blank");
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><title>Loading…</title>
        <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0edff;color:#4f35d2;font-size:1rem;font-weight:600}</style>
        </head><body>⏳ Loading form…</body></html>`);
    }
    try {
      const listingPayload = {
        propAddress: listing.address,
        listPrice: listing.list_price,
        mlsNumber: listing.mls_number,
        agentName: "Your Agent Name",
        brokerage: "Your Brokerage",
        sellers: [
          {
            fullName: seller.name,
            phone: seller.phone,
            email: seller.email ?? "",
          },
        ],
      };
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_key: formKey, listing: listingPayload, cfg: {} }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const html = await res.text();
      if (win && !win.closed) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      }
    } catch {
      if (win && !win.closed) {
        win.document.open();
        win.document.write(`<!DOCTYPE html><html><body style="padding:40px;font-family:Arial;color:#b91c1c">
          <h2>⚠ Could not load form</h2><p>Ensure <code>start.command</code> is running.</p></body></html>`);
        win.document.close();
      }
    } finally {
      setOpening(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          BC Standard Forms
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BC_FORMS.map((form) => (
            <Button
              key={form.key}
              variant="outline"
              size="sm"
              className="h-auto flex-col gap-1 py-3 text-xs"
              onClick={() => openForm(form.key)}
              disabled={opening === form.key}
            >
              <span className="text-base">{form.icon}</span>
              <span>{form.label}</span>
              {opening === form.key ? (
                <span className="text-[10px] text-muted-foreground">Opening…</span>
              ) : (
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Forms open pre-filled with this listing&apos;s data — edit any field, then print to PDF.
        </p>
      </CardContent>
    </Card>
  );
}
