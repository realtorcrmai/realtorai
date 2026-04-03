import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { TaskSidebar } from "@/components/tasks/TaskSidebar";
import { MobileSidebarSheet } from "@/components/layout/MobileSidebarSheet";

export const dynamic = "force-dynamic";

export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getAuthenticatedTenantClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, contacts(name), listings(address)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col h-full">
        <TaskSidebar initialTasks={tasks ?? []} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile: sticky bar to open sidebar sheet */}
        <MobileSidebarSheet title="Tasks">
          <TaskSidebar initialTasks={tasks ?? []} />
        </MobileSidebarSheet>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
