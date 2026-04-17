import { Shield } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminHeaderLogout } from "@/components/admin/AdminHeaderLogout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar (hidden on mobile) */}
      <AdminSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center h-14 px-4 md:px-6 gap-4 shrink-0 bg-card border-b border-border z-30">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight text-foreground">
              Realtors360 Admin
            </span>
          </div>

          <div className="flex-1" />

          <AdminHeaderLogout />
        </header>

        {/* Mobile tab bar (visible only on mobile) */}
        <AdminMobileNav />

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
