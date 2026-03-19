import { createAdminClient } from "@/lib/supabase/admin";
import { ListingSidebar } from "@/components/listings/ListingSidebar";
import { ListingForm } from "@/components/listings/ListingForm";

export const dynamic = "force-dynamic";

export default async function ListingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAdminClient();

  const [{ data: listings }, { data: sellers }] = await Promise.all([
    supabase
      .from("listings")
      .select("*, contacts!listings_seller_id_fkey(name, phone)")
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").eq("type", "seller"),
  ]);

  return (
    <div className="flex h-full">
      {/* Left sidebar — listing list + add button at top */}
      <div className="hidden md:flex flex-col h-full w-[280px] shrink-0 border-r bg-card/50">
        <div className="p-3 border-b bg-card/50 shrink-0">
          <ListingForm sellers={sellers ?? []} />
        </div>
        <ListingSidebar
          listings={(listings ?? []) as (typeof listings extends (infer T)[] | null ? T : never)[]}
          sellers={sellers ?? []}
        />
      </div>

      {/* Center + Right content */}
      <div className="flex-1 overflow-hidden relative">
        {children}
        {/* Mobile FAB for creating listings */}
        <div className="md:hidden fixed bottom-20 right-4 z-50">
          <ListingForm sellers={sellers ?? []} />
        </div>
      </div>
    </div>
  );
}
