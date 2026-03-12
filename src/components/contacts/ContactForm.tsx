"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createContact, updateContact } from "@/actions/contacts";
import { Plus } from "lucide-react";
import type { Contact } from "@/types";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email().optional().or(z.literal("")),
  type: z.enum(["buyer", "seller"]),
  pref_channel: z.enum(["whatsapp", "sms"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function ContactForm({
  contact,
  trigger,
}: {
  contact?: Contact;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: contact
      ? {
          name: contact.name,
          phone: contact.phone,
          email: contact.email ?? "",
          type: contact.type,
          pref_channel: contact.pref_channel,
          notes: contact.notes ?? "",
        }
      : {
          type: "buyer",
          pref_channel: "sms",
        },
  });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    if (contact) {
      await updateContact(contact.id, data);
    } else {
      await createContact(data);
    }
    setSubmitting(false);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          )
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {contact ? "Edit Contact" : "New Contact"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input {...register("name")} placeholder="John Doe" />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input {...register("phone")} placeholder="604-555-0123" />
            {errors.phone && (
              <p className="text-sm text-red-600 mt-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              {...register("email")}
              placeholder="john@example.com"
              type="email"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select
                defaultValue={contact?.type ?? "buyer"}
                onValueChange={(val) =>
                  setValue("type", val as "buyer" | "seller")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preferred Channel</Label>
              <Select
                defaultValue={contact?.pref_channel ?? "sms"}
                onValueChange={(val) =>
                  setValue("pref_channel", val as "whatsapp" | "sms")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea {...register("notes")} placeholder="Additional notes..." />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "Saving..."
              : contact
                ? "Update Contact"
                : "Create Contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
