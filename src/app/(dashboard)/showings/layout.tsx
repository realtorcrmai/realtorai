import { createAdminClient } from "@/lib/supabase/admin";
import { ShowingSidebar } from "@/components/showings/ShowingSidebar";
import { ShowingRequestForm } from "@/components/showings/ShowingRequestForm";

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
      {/* Left sidebar — showing list */}
      <div className="hidden md:flex flex-col h-full">
        <ShowingSidebar
          showings={(showings ?? []) as (typeof showings extends (infer T)[] | null ? T : never)[]}
        />
        {/* Add showing button at bottom of sidebar */}
        <div className="p-3 border-r border-t bg-card/50">
          <ShowingRequestForm listings={activeListings ?? []} />
        </div>
      </div>

      {/* Center + Right content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
