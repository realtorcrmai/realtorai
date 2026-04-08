import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { PortfolioForm } from "@/components/contacts/PortfolioForm";
import type { PortfolioItem } from "@/actions/contact-portfolio";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortfolioEditPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const supabase = await getAuthenticatedTenantClient();

  const [{ data: contact }, { data: item }] = await Promise.all([
    supabase.from("contacts").select("id, name").eq("id", id).single(),
    supabase.from("contact_portfolio").select("*").eq("id", itemId).single(),
  ]);

  if (!contact || !item) notFound();

  const CATEGORY_LABELS: Record<string, string> = {
    primary_residence: "Primary Residence",
    investment: "Investment",
    vacation: "Vacation",
    commercial: "Commercial",
    other: "Other",
  };

  const categoryLabel = CATEGORY_LABELS[(item as PortfolioItem).property_category ?? "other"] ?? "Property";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href={`/contacts/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {contact.name}
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium">Edit {categoryLabel}</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">✏️ Edit Property</h1>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {(item as PortfolioItem).address}
          </p>
        </div>

        <div className="lf-card p-6">
          <PortfolioForm
            contactId={id}
            contactName={contact.name}
            existing={item as PortfolioItem}
          />
        </div>
      </div>
    </div>
  );
}
