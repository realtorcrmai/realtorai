"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Building2, Clock, ListTodo } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function QuickAddButton() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch from base-ui auto-generated IDs
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  if (!mounted) {
    // Render static placeholder during SSR to avoid hydration mismatch from auto-generated IDs
    return (
      <button
        className="flex items-center justify-center size-8 shrink-0 aspect-square rounded-lg border border-brand/30 bg-brand text-white shadow-[0_1px_3px_rgba(15,118,148,0.3),0_2px_6px_rgba(15,118,148,0.15)]"
        aria-label="Quick add"
      >
        <Plus className="h-4 w-4" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center justify-center size-8 shrink-0 aspect-square rounded-lg border border-brand/30 bg-brand text-white shadow-[0_1px_3px_rgba(15,118,148,0.3),0_2px_6px_rgba(15,118,148,0.15)] hover:bg-brand/90 hover:shadow-[0_3px_10px_rgba(15,118,148,0.35)] transition-all"
        aria-label="Quick add"
      >
        <Plus className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" sideOffset={12} className="w-48">
        <DropdownMenuItem onClick={() => router.push("/contacts/new")}>
          <Users className="h-4 w-4" />
          <span>Contact</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/listings/new")}>
          <Building2 className="h-4 w-4" />
          <span>Listing</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/showings/new")}>
          <Clock className="h-4 w-4" />
          <span>Showing</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/tasks/new")}>
          <ListTodo className="h-4 w-4" />
          <span>Task</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
