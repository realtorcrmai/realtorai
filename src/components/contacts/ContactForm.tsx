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
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_SOURCES } from "@/lib/constants";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email().optional().or(z.literal("")),
  type: z.enum(["buyer", "seller"]),
  pref_channel: z.enum(["whatsapp", "sms"]),
  notes: z.string().optional(),
  address: z.string().optional(),
  referred_by_id: z.string().uuid().optional().or(z.literal("")),
  source: z.string().optional(),
  lead_status: z.enum(LEAD_STATUSES).optional(),
});

type FormData = z.infer<typeof formSchema>;

export function ContactForm({
  contact,
  trigger,
  allContacts = [],
  defaultReferredById,
  defaultType,
}: {
  contact?: Contact;
  trigger?: React.ReactNode;
  allContacts?: { id: string; name: string }[];
  defaultReferredById?: string;
  defaultType?: "buyer" | "seller";
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
          address: contact.address ?? "",
          referred_by_id: contact.referred_by_id ?? "",
          source: contact.source ?? "",
          lead_status: (contact.lead_status ?? "new") as FormData["lead_status"],
        }
      : {
          type: defaultType ?? "buyer",
          pref_channel: "sms",
          referred_by_id: defaultReferredById ?? "",
          source: "",
          lead_status: "new",
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
            <Label htmlFor="address">Address (optional)</Label>
            <Input {...register("address")} placeholder="123 Main St, Vancouver, BC" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lead Status</Label>
              <Select
                defaultValue={contact?.lead_status ?? "new"}
                onValueChange={(val) => setValue("lead_status", val as FormData["lead_status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LEAD_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source (optional)</Label>
              <Select
                defaultValue={contact?.source ?? ""}
                onValueChange={(val: string | null) => setValue("source", val ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {allContacts.length > 0 && (
            <div>
              <Label>Referred By (optional)</Label>
              <Select
                defaultValue={contact?.referred_by_id ?? defaultReferredById ?? ""}
                onValueChange={(val: string | null) => setValue("referred_by_id", val ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select referrer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {allContacts
                    .filter((c) => c.id !== contact?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
