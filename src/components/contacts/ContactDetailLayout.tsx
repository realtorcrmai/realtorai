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
}: {
  header: React.ReactNode;
  tabs: React.ReactNode;
  rightPanel: React.ReactNode;
}) {
  return (
    <div className="flex text-sm h-full">
      {/* CENTER — single scrollable unit */}
      <div className="flex-1 overflow-y-auto bg-[#f8f7fd] dark:bg-background">
        <div className="p-3 md:p-4 space-y-2">
          {header}
          {tabs}
        </div>
      </div>

      {/* RIGHT PANEL — passed through, scrolls as one unit */}
      {rightPanel}
    </div>
  );
}
