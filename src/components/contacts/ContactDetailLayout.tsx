"use client";

/**
 * ContactDetailLayout — Each panel scrolls as ONE unit.
 * No independent section scrolling within a panel.
 * All content flows naturally, panel scrolls if it overflows viewport.
 */
export function ContactDetailLayout({
  header,
  tabs,
  rightPanel,
  mobileRightPanel,
}: {
  header: React.ReactNode;
  tabs: React.ReactNode;
  rightPanel: React.ReactNode;
  mobileRightPanel?: React.ReactNode;
}) {
  return (
    <div className="flex text-sm h-full">
      {/* CENTER — single scrollable unit */}
      <div className="flex-1 overflow-y-auto bg-muted/50 dark:bg-background">
        <div className="p-3 md:p-4 space-y-2">
          {header}
          {tabs}
        </div>
        {/* Mobile right panel content — rendered inside scrollable center column */}
        {mobileRightPanel}
      </div>

      {/* RIGHT PANEL — passed through, scrolls as one unit */}
      {rightPanel}
    </div>
  );
}
