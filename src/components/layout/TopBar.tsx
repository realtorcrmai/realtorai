"use client";

import { Home, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

export function TopBar() {
  return (
    <header className="flex h-14 items-center border-b px-4 md:hidden bg-card">
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Home className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="font-bold text-sm">RealtorAI</span>
      </div>
    </header>
  );
}
