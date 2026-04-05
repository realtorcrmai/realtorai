"use client";

/**
 * ContactDetailLayout — Pure CSS flex layout.
 *
 * Outer: height = viewport - 64px (app header)
 * Center: flex-col → header (shrink-0) + tab area (flex-1, scrolls if overflows)
 * Right panel: passed through, controls own overflow.
 * Text: 14px base (text-sm) for consistency.
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
      {/* CENTER */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f7fd] dark:bg-background">
        {/* Header — pinned, shrinks to content */}
        <div className="shrink-0 p-3 md:p-4 space-y-2">
          {header}
        </div>

        {/* Tab content — fills remaining, scrolls only if content overflows */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 pb-3">
          {tabs}
        </div>
      </div>

      {/* RIGHT PANEL */}
      {rightPanel}
    </div>
  );
}
