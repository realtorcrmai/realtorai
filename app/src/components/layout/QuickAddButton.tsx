"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Users, Building2, Clock, ListTodo } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactFormContent } from "@/components/contacts/ContactForm";
import { ListingFormContent } from "@/components/listings/ListingForm";
import { ShowingFormContent } from "@/components/showings/ShowingRequestForm";
import { TaskForm } from "@/components/tasks/TaskForm";
import type { Contact } from "@/types";

type ActiveDialog = null | "contact" | "listing" | "showing" | "task";

export function QuickAddButton() {
  const [mounted, setMounted] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [sellers, setSellers] = useState<Contact[]>([]);
  const [listings, setListings] = useState<{ id: string; address: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Prevent hydration mismatch from base-ui auto-generated IDs
  useEffect(() => setMounted(true), []);

  const openDialog = useCallback(async (type: ActiveDialog) => {
    if (!type) return;

    if (type === "listing") {
      setLoading(true);
      try {
        const res = await fetch("/api/contacts?type=seller");
        const data = await res.json();
        setSellers(Array.isArray(data) ? data : []);
      } catch {
        setSellers([]);
      }
      setLoading(false);
    }

    if (type === "showing") {
      setLoading(true);
      try {
        const res = await fetch("/api/listings?status=active");
        const data = await res.json();
        setListings(Array.isArray(data) ? data : []);
      } catch {
        setListings([]);
      }
      setLoading(false);
    }

    setActiveDialog(type);
  }, []);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
  }, []);

  if (!mounted) {
    // Render static placeholder during SSR to avoid hydration mismatch from auto-generated IDs
    return (
      <button
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4f35d2] text-white"
        aria-label="Quick add"
      >
        <Plus className="h-4.5 w-4.5" />
      </button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4f35d2] text-white hover:bg-[#3d28b0] transition-all hover:scale-105"
          aria-label="Quick add"
        >
          <Plus className="h-4.5 w-4.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" sideOffset={12} className="w-48">
          <DropdownMenuItem onClick={() => openDialog("contact")}>
            <Users className="h-4 w-4" />
            <span>Contact</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openDialog("listing")}>
            <Building2 className="h-4 w-4" />
            <span>Listing</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openDialog("showing")}>
            <Clock className="h-4 w-4" />
            <span>Showing</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openDialog("task")}>
            <ListTodo className="h-4 w-4" />
            <span>Task</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Contact Dialog */}
      <Dialog open={activeDialog === "contact"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Contact</DialogTitle>
          </DialogHeader>
          <ContactFormContent onSuccess={closeDialog} />
        </DialogContent>
      </Dialog>

      {/* Listing Dialog */}
      <Dialog open={activeDialog === "listing"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Listing</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading sellers...
            </div>
          ) : (
            <ListingFormContent onSuccess={closeDialog} sellers={sellers} />
          )}
        </DialogContent>
      </Dialog>

      {/* Showing Dialog */}
      <Dialog open={activeDialog === "showing"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Showing Request</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading listings...
            </div>
          ) : (
            <ShowingFormContent onSuccess={closeDialog} listings={listings} />
          )}
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={activeDialog === "task"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <TaskForm onSuccess={closeDialog} onCancel={closeDialog} />
        </DialogContent>
      </Dialog>
    </>
  );
}
