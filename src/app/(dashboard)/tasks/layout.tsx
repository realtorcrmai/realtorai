import { createAdminClient } from "@/lib/supabase/admin";
import { TaskSidebar } from "@/components/tasks/TaskSidebar";
import { MobileSidebarSheet } from "@/components/layout";

export const dynamic = "force-dynamic";

export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAdminClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, contacts(name), listings(address)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex h-full">
      <div className="hidden md:flex flex-col h-full">
        <TaskSidebar initialTasks={tasks ?? []} />
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {/* Mobile sidebar sheet for task list */}
        <MobileSidebarSheet title="Tasks">
          <TaskSidebar initialTasks={tasks ?? []} />
        </MobileSidebarSheet>

        {children}
      </div>
    </div>
  );
}
