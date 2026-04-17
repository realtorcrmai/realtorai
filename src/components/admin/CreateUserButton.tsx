"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createUser } from "@/actions/admin";
import { PLANS } from "@/lib/plans";

export function CreateUserButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("free");

  const handleCreate = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    startTransition(async () => {
      const result = await createUser({ name: name.trim(), email: email.trim(), plan });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User created");
        setName("");
        setEmail("");
        setPlan("free");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="brand">
            <UserPlus className="h-4 w-4 mr-1.5" />
            Create User
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Add a new user to the platform. They will receive an invitation to set up their account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-sm font-medium" htmlFor="create-user-name">
              Full Name
            </label>
            <Input
              id="create-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="create-user-email">
              Email
            </label>
            <Input
              id="create-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="create-user-plan">
              Plan
            </label>
            <select
              id="create-user-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.values(PLANS)
                .filter((p) => p.id !== "admin")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.price > 0 ? `($${p.price}/mo)` : "(Free)"}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="brand" onClick={handleCreate} disabled={isPending}>
            {isPending ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
