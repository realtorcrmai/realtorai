import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { PortfolioForm } from "@/components/contacts/PortfolioForm";
import type { PortfolioItem } from "@/actions/contact-portfolio";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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

  return (
    <div className="min-h-full bg-[#f8f7fd] dark:bg-background p-3 md:p-4 space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link
          href={`/contacts/${id}?tab=portfolio`}
          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2">
            ✏️ Edit Property
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            {(item as PortfolioItem).address}
          </p>
        </div>
      </div>

      {/* Form */}
      <PortfolioForm
        contactId={id}
        contactName={contact.name}
        existing={item as PortfolioItem}
      />
    </div>
  );
}
