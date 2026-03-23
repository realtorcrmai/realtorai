import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Admin Header */}
      <header className="flex items-center h-16 px-4 md:px-6 gap-4 shrink-0 bg-card border-b border-border shadow-sm z-30">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
        </Link>

        <div className="h-6 w-px bg-border/60 shrink-0" />

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-indigo">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">
            Admin Panel
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden bg-background">{children}</main>

      <Toaster />
    </div>
  );
}
