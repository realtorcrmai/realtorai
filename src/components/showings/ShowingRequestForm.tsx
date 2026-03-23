"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createShowingRequest } from "@/actions/showings";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  listingId: z.string().uuid("Select a listing"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  buyerAgentName: z.string().min(2, "Agent name is required"),
  buyerAgentPhone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\d\s\-\(\)\+\.]+$/, "Invalid phone number format"),
  buyerAgentEmail: z.string().email().optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

export interface ShowingFormContentProps {
  onSuccess?: () => void;
  listings: Array<{ id: string; address: string }>;
  preselectedListingId?: string;
}

export function ShowingFormContent({
  onSuccess,
  listings,
  preselectedListingId,
}: ShowingFormContentProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      listingId: preselectedListingId ?? "",
    },
  });

  useEffect(() => {
    if (preselectedListingId) {
      setValue("listingId", preselectedListingId);
    }
  }, [preselectedListingId, setValue]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setError(null);

    const startDate = new Date(data.startTime);
    const endDate = new Date(data.endTime);

    const result = await createShowingRequest({
      listingId: data.listingId,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      buyerAgentName: data.buyerAgentName,
      buyerAgentPhone: data.buyerAgentPhone,
      buyerAgentEmail: data.buyerAgentEmail || undefined,
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      if (result.calendarWarning) {
        toast.warning(result.calendarWarning);
      }
      reset();
      onSuccess?.();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="listingId">Listing</Label>
        <Select
          onValueChange={(val) => setValue("listingId", val as string, { shouldValidate: true, shouldDirty: true })}
          defaultValue={preselectedListingId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a listing" />
          </SelectTrigger>
          <SelectContent>
            {listings.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.listingId && (
          <p className="text-sm text-red-600 mt-1">
            {errors.listingId.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            type="datetime-local"
            {...register("startTime")}
          />
          {errors.startTime && (
            <p className="text-sm text-red-600 mt-1">
              {errors.startTime.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            type="datetime-local"
            {...register("endTime")}
          />
          {errors.endTime && (
            <p className="text-sm text-red-600 mt-1">
              {errors.endTime.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="buyerAgentName">Buyer&apos;s Agent Name</Label>
        <Input
          {...register("buyerAgentName")}
          placeholder="Jane Smith"
        />
        {errors.buyerAgentName && (
          <p className="text-sm text-red-600 mt-1">
            {errors.buyerAgentName.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="buyerAgentPhone">Buyer&apos;s Agent Phone</Label>
        <Input
          {...register("buyerAgentPhone")}
          placeholder="604-555-0123"
        />
        {errors.buyerAgentPhone && (
          <p className="text-sm text-red-600 mt-1">
            {errors.buyerAgentPhone.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="buyerAgentEmail">
          Buyer&apos;s Agent Email (optional)
        </Label>
        <Input
          {...register("buyerAgentEmail")}
          placeholder="agent@example.com"
          type="email"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Sending Request..." : "Send Showing Request"}
      </Button>
    </form>
  );
}

export function ShowingRequestForm({
  listings,
  preselectedListingId,
  disabled,
}: {
  listings: Array<{ id: string; address: string }>;
  preselectedListingId?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={disabled}>
            <Plus className="h-4 w-4 mr-2" />
            New Showing Request
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a Showing</DialogTitle>
        </DialogHeader>
        <ShowingFormContent
          onSuccess={() => setOpen(false)}
          listings={listings}
          preselectedListingId={preselectedListingId}
        />
      </DialogContent>
    </Dialog>
  );
}
