"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteContact } from "@/actions/contacts";

export function DeleteContactButton({
  contactId,
  contactName,
  variant = "button",
}: {
  contactId: string;
  contactName: string;
  variant?: "button" | "menuItem" | "moreMenu";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleDelete() {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const result = await deleteContact(contactId);
        if (result.error) {
          setErrorMsg(result.error);
        } else {
          setOpen(false);
          router.push("/contacts");
        }
      } catch {
        setErrorMsg("Your session may have expired. Please refresh and try again.");
      }
    });
  }

  const alertDialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{contactName}</strong>? This will permanently remove the contact and all associated communications, tasks, and documents. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {errorMsg}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isPending ? "Deleting..." : "Delete Contact"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (variant === "moreMenu") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          title="More actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
        {alertDialog}
      </>
    );
  }

  if (variant === "menuItem") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 w-full text-sm text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete contact
        </button>
        {alertDialog}
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Delete
      </Button>
      {alertDialog}
    </>
  );
}
