import { cn } from "@/lib/utils";

interface SidebarLayoutProps {
  /** The sidebar content (e.g., ListingSidebar, ContactSidebar) */
  sidebar: React.ReactNode;
  /** Optional footer at the bottom of the sidebar (e.g., "Add" form button) */
  sidebarFooter?: React.ReactNode;
  /** Main content area */
  children: React.ReactNode;
  /** Additional classes for the content wrapper */
  contentClassName?: string;
}

/**
 * Standard sidebar + content layout used by listings, contacts, showings, tasks, calendar.
 * Sidebar is hidden on mobile (md: breakpoint).
 */
export function SidebarLayout({
  sidebar,
  sidebarFooter,
  children,
  contentClassName,
}: SidebarLayoutProps) {
  return (
    <div className="flex h-full">
      <div className="hidden md:flex flex-col h-full">
        {sidebar}
        {sidebarFooter && (
          <div className="p-3 border-r border-t backdrop-blur-2xl bg-white/78">{sidebarFooter}</div>
        )}
      </div>
      <div className={cn("flex-1 overflow-hidden", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
