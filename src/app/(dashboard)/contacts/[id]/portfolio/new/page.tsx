import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { PortfolioForm } from "@/components/contacts/PortfolioForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortfolioNewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getAuthenticatedTenantClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-[#FAF8F4] via-white to-[#0F7694]/5 dark:from-zinc-950 dark:via-background dark:to-[#1a1535]/5">
      {/* Glass header */}
      <div className="border-b border-border/30 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href={`/contacts/${id}?tab=portfolio`}
            className="p-2 -ml-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              🏘️ Add Property to Portfolio
            </h1>
            <p className="text-sm text-muted-foreground">
              Track a property {contact.name} owns, co-owns, or has interest in
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <PortfolioForm contactId={id} contactName={contact.name} />
      </div>

      <div className="h-8" />
    </div>
  );
}
