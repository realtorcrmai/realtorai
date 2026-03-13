"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Info } from "lucide-react";

const FORM_SERVER = "http://127.0.0.1:8767";

const BC_FORMS = [
  { key: "dorts",   name: "DORTS",         full: "Disclosure of Representation in Trading Services", icon: "📋", required: true },
  { key: "mlc",     name: "MLC",           full: "Listing Contract (MLC)", icon: "📝", required: true },
  { key: "pds",     name: "PDS",           full: "Property Disclosure Statement", icon: "🏠", required: true },
  { key: "fintrac", name: "FINTRAC",       full: "Client Identification & Verification", icon: "🔍", required: true },
  { key: "privacy", name: "Privacy",       full: "Privacy Notice & Consent", icon: "🔒", required: false },
  { key: "c3",      name: "C3",            full: "Working with a REALTOR® Disclosure", icon: "🤝", required: false },
  { key: "drup",    name: "DRUP",          full: "Disclosure of Remuneration / Referrals", icon: "💰", required: false },
  { key: "mls",     name: "MLS Input",     full: "MLS Listing Input Sheet", icon: "📊", required: false },
  { key: "mktauth", name: "Mktg Auth",     full: "Marketing Authorization", icon: "📢", required: false },
  { key: "agency",  name: "Agency",        full: "Agency Relationships", icon: "🏢", required: false },
  { key: "c3conf",  name: "C3 Conf",       full: "C3 Confirmation of Representation", icon: "✅", required: false },
  { key: "fairhsg", name: "Fair Housing",  full: "Fair Housing Declaration", icon: "⚖️", required: false },
];

// Demo listing data — in a real integration this comes from Supabase
const DEMO_LISTING = {
  propAddress: "123 Main Street, Surrey, BC V3S 0H9",
  listPrice: "1250000",
  propType: "Detached",
  agentName: "Your Agent Name",
  agentPhone: "604-555-0100",
  agentEmail: "agent@realtorbc.ca",
  brokerage: "Your Brokerage Name",
  sellers: [{ fullName: "Seller Name", phone: "604-555-0200", email: "seller@email.com" }],
};

export default function FormsPage() {
  const [opening, setOpening] = useState<string | null>(null);
  const [serverError, setServerError] = useState(false);

  async function openForm(formKey: string) {
    setOpening(formKey);
    setServerError(false);
    const win = window.open("about:blank", "_blank");
    if (win) {
      win.document.write(`<!DOCTYPE html><html><head><title>Loading…</title>
        <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0edff;color:#4f35d2;font-size:1rem;font-weight:600}</style>
        </head><body>⏳ Loading form…</body></html>`);
    }
    try {
      const res = await fetch(`${FORM_SERVER}/api/form/html`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_key: formKey, listing: DEMO_LISTING, cfg: {} }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const html = await res.text();
      if (win && !win.closed) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      }
    } catch {
      setServerError(true);
      if (win && !win.closed) {
        win.document.open();
        win.document.write(`<!DOCTYPE html><html><body style="font-family:Arial;padding:40px;color:#b91c1c">
          <h2>⚠ Could not connect to form server</h2>
          <p>Make sure <code>start.command</code> is running.</p></body></html>`);
        win.document.close();
      }
    } finally {
      setOpening(null);
    }
  }

  const required = BC_FORMS.filter((f) => f.required);
  const optional = BC_FORMS.filter((f) => !f.required);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">BC Standard Forms</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pre-filled, fully editable BC real estate forms. Open any form to edit in-browser and print to PDF.
        </p>
      </div>

      {serverError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Could not reach the form server. Make sure <strong>start.command</strong> is running in your project folder.</span>
        </div>
      )}

      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <Info className="h-4 w-4 shrink-0" />
        <span>Forms open pre-filled from your listing data. All fields are editable — click any field to change values, then use the <strong>🖨 Print / Save PDF</strong> button to export.</span>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Required Forms
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {required.map((form) => (
              <FormCard key={form.key} form={form} opening={opening} onOpen={openForm} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Additional Forms
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {optional.map((form) => (
              <FormCard key={form.key} form={form} opening={opening} onOpen={openForm} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormCard({
  form,
  opening,
  onOpen,
}: {
  form: (typeof BC_FORMS)[0];
  opening: string | null;
  onOpen: (key: string) => void;
}) {
  const isLoading = opening === form.key;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{form.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{form.full}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{form.name} form</p>
            </div>
          </div>
          {form.required && (
            <Badge variant="outline" className="text-[10px] shrink-0 bg-red-50 text-red-600 border-red-200">
              Required
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-4 w-full gap-2 text-xs"
          onClick={() => onOpen(form.key)}
          disabled={isLoading}
        >
          {isLoading ? (
            "Opening…"
          ) : (
            <>
              <ExternalLink className="h-3.5 w-3.5" />
              Open & Edit Form
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
