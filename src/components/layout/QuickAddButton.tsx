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
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F7694] text-white"
        aria-label="Quick add"
      >
        <Plus className="h-4.5 w-4.5" />
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F7694] text-white hover:shadow-md hover:shadow-[#0F7694]/30 transition-all hover:scale-105"
        aria-label="Quick add"
      >
        <Plus className="h-4.5 w-4.5" />
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
