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
      .select("*, contacts(name, phone)")
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").eq("type", "seller"),
  ]);

  return (
    <div className="flex h-full">
      {/* Left sidebar — listing list */}
      <div className="hidden md:flex flex-col h-full">
        <ListingSidebar
          listings={(listings ?? []) as (typeof listings extends (infer T)[] | null ? T : never)[]}
          sellers={sellers ?? []}
        />
        {/* Add listing button at bottom of sidebar */}
        <div className="p-3 border-r border-t bg-card/50">
          <ListingForm sellers={sellers ?? []} />
        </div>
      </div>

      {/* Center + Right content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
