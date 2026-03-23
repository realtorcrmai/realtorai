"use client";

import { useState } from "react";
import { PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileDetailSheetProps {
  /** The panel content to render inside the sheet */
  children: React.ReactNode;
  /** Label shown in the sheet header */
  title?: string;
}

/**
 * A mobile-only sheet that slides from the right to reveal a detail/context panel.
 * Visible only below the lg breakpoint where the desktop aside is hidden.
 */
export function MobileDetailSheet({
  children,
  title = "Details",
}: MobileDetailSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              aria-label={`Open ${title}`}
            />
          }
        >
          <PanelRight className="h-4 w-4 mr-1.5" />
          {title}
        </SheetTrigger>
        <SheetContent
          side="right"
          className="p-0 w-[340px] sm:max-w-[340px] flex flex-col"
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
