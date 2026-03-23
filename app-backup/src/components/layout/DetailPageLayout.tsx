import { cn } from "@/lib/utils";

interface DetailPageLayoutProps {
  /** Main scrollable content (cards, workflow, etc.) */
  children: React.ReactNode;
  /** Right sidebar context panel (e.g., FormReadinessPanel, ContactContextPanel) */
  contextPanel?: React.ReactNode;
  /** Width class for the context panel (default: "w-[340px]") */
  contextPanelWidth?: string;
}

/**
 * Standard detail page layout with scrollable center content + fixed right context panel.
 * Used by listing detail, contact detail, and showing detail pages.
 * Context panel is hidden below lg breakpoint.
 */
export function DetailPageLayout({
  children,
  contextPanel,
  contextPanelWidth = "w-[340px]",
}: DetailPageLayoutProps) {
  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="space-y-6">{children}</div>
      </div>
      {contextPanel && (
        <aside
          className={cn(
            "hidden lg:block shrink-0 border-l overflow-y-auto p-6 bg-card/30",
            contextPanelWidth
          )}
        >
          {contextPanel}
        </aside>
      )}
    </div>
  );
}
