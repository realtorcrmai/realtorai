import { createAdminClient } from "@/lib/supabase/admin";
import { ListingSidebar } from "@/components/listings/ListingSidebar";
import { ListingForm } from "@/components/listings/ListingForm";
import { MobileSidebarSheet } from "@/components/layout/MobileSidebarSheet";

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
      .select("id, address, status, mls_number, list_price, seller_id, created_at, contacts!listings_seller_id_fkey(name, phone)")
      .order("created_at", { ascending: false }),
    supabase.from("contacts").select("id, name, phone, email").eq("type", "seller"),
  ]);

  return (
    <div className="flex h-full">
      {/* Left sidebar — desktop only */}
      <div className="hidden md:flex flex-col h-full w-[280px] shrink-0 border-r bg-card/50">
        <div className="p-3 border-b bg-card/50 shrink-0">
          <ListingForm sellers={(sellers ?? []) as any} />
        </div>
        <ListingSidebar
          listings={(listings ?? []) as any}
          sellers={(sellers ?? []) as any}
        />
      </div>

      {/* Center + Right content */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Mobile: sticky bar to open sidebar sheet */}
        <MobileSidebarSheet title="Listings" footer={<ListingForm sellers={(sellers ?? []) as any} />}>
          <ListingSidebar
            listings={(listings ?? []) as any}
            sellers={(sellers ?? []) as any}
          />
        </MobileSidebarSheet>

        <div className="flex-1 overflow-hidden">
          {children}
        </div>
        {/* Mobile FAB for creating listings */}
        <div className="md:hidden fixed bottom-20 right-4 z-50">
          <ListingForm sellers={(sellers ?? []) as any} />
        </div>
      </div>
    </div>
  );
}
