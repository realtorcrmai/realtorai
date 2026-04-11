"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Info, FileCheck, Pencil, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { BC_FORMS } from "@/lib/forms/constants";
import Link from "next/link";

type ListingOption = { id: string; address: string };
type FormStatus = Record<string, "draft" | "completed">;

export default function FormsPageClient({
  listings,
  allStatuses,
}: {
  listings: ListingOption[];
  allStatuses: Record<string, FormStatus>;
}) {
  const [selectedListing, setSelectedListing] = useState<string>(
    listings.length > 0 ? listings[0].id : ""
  );
  const router = useRouter();

  const formStatuses = selectedListing ? (allStatuses[selectedListing] ?? {}) : {};
  const selectedAddress = listings.find((l) => l.id === selectedListing)?.address ?? "Select a listing...";

  function openForm(formKey: string) {
    if (!selectedListing) return;
    router.push(`/forms/${selectedListing}/${formKey}`);
  }

  const required = BC_FORMS.filter((f) => f.required);
  const optional = BC_FORMS.filter((f) => !f.required);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <div className="space-y-8">
        <div className="animate-float-in space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            BC real estate documents
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            BC Standard Forms
          </h1>
        </div>

        {/* Listing selector + admin link */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[250px]">
            {listings.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                No listings found. Create a listing first to fill forms.
              </div>
            ) : (
              <select
                value={selectedListing}
                onChange={(e) => setSelectedListing(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              >
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.address}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Link href="/forms/templates">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1.5" />
              Manage Templates
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 p-4 bg-brand-muted border border-brand/20 rounded-xl text-sm text-brand-dark">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            Select a listing above, then click a form to open the PDF editor.
            Forms are pre-filled with your listing data. Edit fields, save
            drafts, and download completed PDFs.
          </span>
        </div>

        {selectedListing && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Required Forms
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {required.map((form) => (
                  <FormCard
                    key={form.key}
                    form={form}
                    status={formStatuses[form.key]}
                    onOpen={openForm}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Additional Forms
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {optional.map((form) => (
                  <FormCard
                    key={form.key}
                    form={form}
                    status={formStatuses[form.key]}
                    onOpen={openForm}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FormCard({
  form,
  status,
  onOpen,
}: {
  form: (typeof BC_FORMS)[number];
  status?: "draft" | "completed";
  onOpen: (key: string) => void;
}) {
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
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.name} form
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {status === "completed" && (
              <Badge
                variant="outline"
                className="text-[10px] bg-brand-muted text-brand-dark border-brand/20"
              >
                <FileCheck className="h-3 w-3 mr-0.5" />
                Done
              </Badge>
            )}
            {status === "draft" && (
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-50 text-amber-600 border-amber-200"
              >
                <Pencil className="h-3 w-3 mr-0.5" />
                Draft
              </Badge>
            )}
            {form.required && !status && (
              <Badge
                variant="outline"
                className="text-[10px] bg-red-50 text-red-600 border-red-200"
              >
                Required
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-4 w-full gap-2 text-xs"
          onClick={() => onOpen(form.key)}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {status === "draft"
            ? "Continue Editing"
            : status === "completed"
              ? "View / Re-edit"
              : "Open & Edit Form"}
        </Button>
      </CardContent>
    </Card>
  );
}
