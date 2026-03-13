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
import { createListing } from "@/actions/listings";
import { Plus } from "lucide-react";
import type { Contact } from "@/types";

const formSchema = z.object({
  address: z.string().min(5, "Address is required"),
  seller_id: z.string().uuid("Select a seller"),
  lockbox_code: z.string().min(1, "Lockbox code is required"),
  mls_number: z.string().optional(),
  list_price: z.string().optional(),
  showing_window_start: z.string().optional(),
  showing_window_end: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function ListingForm({ sellers }: { sellers: Contact[] }) {
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
  });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    await createListing({
      address: data.address,
      seller_id: data.seller_id,
      lockbox_code: data.lockbox_code,
      status: "active",
      mls_number: data.mls_number,
      list_price: data.list_price ? parseFloat(data.list_price) : undefined,
      showing_window_start: data.showing_window_start,
      showing_window_end: data.showing_window_end,
      notes: data.notes,
    });
    setSubmitting(false);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Listing
          </Button>
        }
      />
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Listing</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Address</Label>
            <Input
              {...register("address")}
              placeholder="12345 King George Blvd, Surrey, BC"
            />
            {errors.address && (
              <p className="text-sm text-red-600 mt-1">
                {errors.address.message}
              </p>
            )}
          </div>

          <div>
            <Label>Seller</Label>
            <Select onValueChange={(val) => setValue("seller_id", val as string)}>
              <SelectTrigger>
                <SelectValue placeholder="Select seller" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.seller_id && (
              <p className="text-sm text-red-600 mt-1">
                {errors.seller_id.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lockbox Code</Label>
              <Input
                {...register("lockbox_code")}
                placeholder="1234"
              />
              {errors.lockbox_code && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.lockbox_code.message}
                </p>
              )}
            </div>
            <div>
              <Label>MLS Number</Label>
              <Input
                {...register("mls_number")}
                placeholder="R2876543"
              />
            </div>
          </div>

          <div>
            <Label>List Price (CAD)</Label>
            <Input
              {...register("list_price")}
              type="number"
              placeholder="899000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Showing Window Start</Label>
              <Input {...register("showing_window_start")} type="time" />
            </div>
            <div>
              <Label>Showing Window End</Label>
              <Input {...register("showing_window_end")} type="time" />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              {...register("notes")}
              placeholder="Additional listing notes..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Listing"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
