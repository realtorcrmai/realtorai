import { createAdminClient } from "@/lib/supabase/admin";
import { ShowingSidebar } from "@/components/showings/ShowingSidebar";
import { ShowingRequestForm } from "@/components/showings/ShowingRequestForm";
import { MobileSidebarSheet } from "@/components/layout";

export const dynamic = "force-dynamic";

export default async function ShowingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAdminClient();

  const [{ data: showings }, { data: activeListings }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, listings(address, lockbox_code)")
      .order("start_time", { ascending: false }),
    supabase
      .from("listings")
      .select("id, address")
      .eq("status", "active"),
  ]);

  return (
    <div className="flex h-full">
      {/* Left sidebar — showing list + add button at top */}
      <div className="hidden md:flex flex-col h-full w-[280px] shrink-0 border-r bg-card/50">
        <div className="p-3 border-b bg-card/50 shrink-0">
          <ShowingRequestForm listings={activeListings ?? []} />
        </div>
        <ShowingSidebar
          showings={(showings ?? []) as (typeof showings extends (infer T)[] | null ? T : never)[]}
        />
      </div>

      {/* Center + Right content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Mobile sidebar sheet for showing list */}
        <MobileSidebarSheet
          title="Showings"
          footer={<ShowingRequestForm listings={activeListings ?? []} />}
        >
          <ShowingSidebar
            showings={(showings ?? []) as (typeof showings extends (infer T)[] | null ? T : never)[]}
          />
        </MobileSidebarSheet>

        {children}
        {/* Mobile FAB for creating showings */}
        <div className="md:hidden fixed bottom-20 right-4 z-50">
          <ShowingRequestForm listings={activeListings ?? []} />
        </div>
      </div>
    </div>
  );
}
