"use client";

import { useState } from "react";
import { List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MobileSidebarSheetProps {
  /** The sidebar content to render inside the sheet */
  children: React.ReactNode;
  /** Optional footer (e.g. add form button) rendered at the bottom */
  footer?: React.ReactNode;
  /** Label shown in the sheet header and on the button */
  title?: string;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * A mobile-only sheet that slides from the left to reveal sidebar content.
 * Visible only below the md breakpoint where the desktop sidebar is hidden.
 * Renders inline as a sticky bar at the top of the content area.
 */
export function MobileSidebarSheet({
  children,
  footer,
  title = "Menu",
  className,
}: MobileSidebarSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "md:hidden sticky top-0 z-30 flex items-center gap-2 px-3 py-2 bg-card/90 backdrop-blur-sm border-b",
        className
      )}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] gap-2"
              aria-label={`Open ${title}`}
            />
          }
        >
          <List className="h-4 w-4" />
          {title}
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-[300px] sm:max-w-[300px] flex flex-col"
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer && (
            <div className="p-3 border-t bg-card/50 shrink-0">{footer}</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
