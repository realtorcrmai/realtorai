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
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_SOURCES,
  CONTACT_TYPES,
  CONTACT_TYPE_LABELS,
  PARTNER_TYPES,
  PARTNER_TYPE_LABELS,
} from "@/lib/constants";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email().optional().or(z.literal("")),
  type: z.enum(CONTACT_TYPES),
  pref_channel: z.enum(["whatsapp", "sms"]),
  notes: z.string().optional(),
  address: z.string().optional(),
  referred_by_id: z.string().uuid().optional().or(z.literal("")),
  source: z.string().optional(),
  lead_status: z.enum(LEAD_STATUSES).optional(),
  // Partner-specific fields
  partner_type: z.enum(PARTNER_TYPES).optional().or(z.literal("")),
  company_name: z.string().optional(),
  job_title: z.string().optional(),
  typical_client_profile: z.string().optional(),
  referral_agreement_terms: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface ContactFormContentProps {
  onSuccess?: () => void;
  contact?: Contact;
  allContacts?: { id: string; name: string }[];
  defaultType?: string;
  defaultReferredById?: string;
}

type DuplicateContact = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

export function ContactFormContent({
  onSuccess,
  contact,
  allContacts = [],
  defaultType,
  defaultReferredById,
}: ContactFormContentProps) {
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateContact[] | null>(null);
  const [pendingPayload, setPendingPayload] = useState<FormData | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: contact
      ? {
          name: contact.name,
          phone: contact.phone,
          email: contact.email ?? "",
          type: contact.type as FormData["type"],
          pref_channel: contact.pref_channel as FormData["pref_channel"],
          notes: contact.notes ?? "",
          address: contact.address ?? "",
          referred_by_id: contact.referred_by_id ?? "",
          source: contact.source ?? "",
          lead_status: (contact.lead_status ?? "new") as FormData["lead_status"],
          partner_type: (contact.partner_type ?? "") as FormData["partner_type"],
          company_name: contact.company_name ?? "",
          job_title: contact.job_title ?? "",
          typical_client_profile: contact.typical_client_profile ?? "",
          referral_agreement_terms: contact.referral_agreement_terms ?? "",
        }
      : {
          type: (defaultType ?? "buyer") as FormData["type"],
          pref_channel: "sms",
          referred_by_id: defaultReferredById ?? "",
          source: "",
          lead_status: "new" as FormData["lead_status"],
          partner_type: "" as FormData["partner_type"],
          company_name: "",
          job_title: "",
          typical_client_profile: "",
          referral_agreement_terms: "",
        },
  });

  const selectedType = watch("type");

  function buildPayload(data: FormData) {
    return {
      ...data,
      ...(data.type !== "partner" && {
        partner_type: undefined,
        company_name: undefined,
        job_title: undefined,
        typical_client_profile: undefined,
        referral_agreement_terms: undefined,
      }),
    };
  }

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setDuplicates(null);
    const payload = buildPayload(data);
    if (contact) {
      await updateContact(contact.id, payload);
      setSubmitting(false);
      reset();
      onSuccess?.();
    } else {
      const result = await createContact(payload);
      setSubmitting(false);
      if (result && "duplicates" in result && result.duplicates) {
        setDuplicates(result.duplicates as DuplicateContact[]);
        setPendingPayload(data);
      } else {
        reset();
        onSuccess?.();
      }
    }
  }

  async function onCreateAnyway() {
    if (!pendingPayload) return;
    setSubmitting(true);
    setDuplicates(null);
    const payload = buildPayload(pendingPayload);
    await createContact(payload, true);
    setSubmitting(false);
    setPendingPayload(null);
    reset();
    onSuccess?.();
  }

  return (
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
            defaultValue={contact?.type ?? defaultType ?? "buyer"}
            onValueChange={(val) =>
              setValue("type", val as FormData["type"], { shouldValidate: true, shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {CONTACT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Preferred Channel</Label>
          <Select
            defaultValue={contact?.pref_channel ?? "sms"}
            onValueChange={(val) =>
              setValue("pref_channel", val as "whatsapp" | "sms", { shouldValidate: true, shouldDirty: true })
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

      {/* ── Partner-specific Fields ───────────────────────── */}
      {selectedType === "partner" && (
        <div className="space-y-4 rounded-lg border border-[#0F7694]/20 bg-[#0F7694]/5 p-4">
          <p className="text-sm font-semibold text-[#0A6880]">Partner Details</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Partner Type</Label>
              <Select
                defaultValue={contact?.partner_type ?? ""}
                onValueChange={(val) =>
                  setValue("partner_type", val as FormData["partner_type"], { shouldValidate: true, shouldDirty: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {PARTNER_TYPES.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {PARTNER_TYPE_LABELS[pt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="company_name">Company</Label>
              <Input
                {...register("company_name")}
                placeholder="ABC Mortgages Inc."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="job_title">Job Title (optional)</Label>
            <Input
              {...register("job_title")}
              placeholder="Senior Mortgage Advisor"
            />
          </div>

          <div>
            <Label htmlFor="typical_client_profile">
              Typical Client Profile (optional)
            </Label>
            <Textarea
              {...register("typical_client_profile")}
              placeholder="First-time buyers, pre-approvals up to $800K..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="referral_agreement_terms">
              Referral Agreement Terms (optional)
            </Label>
            <Textarea
              {...register("referral_agreement_terms")}
              placeholder="20% referral fee on closed deals..."
              rows={2}
            />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="address">Address (optional)</Label>
        <Input {...register("address")} placeholder="123 Main St, Vancouver, BC" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Lead Status</Label>
          <Select
            defaultValue={contact?.lead_status ?? "new"}
            onValueChange={(val) => setValue("lead_status", val as FormData["lead_status"], { shouldValidate: true, shouldDirty: true })}
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
            onValueChange={(val: string | null) => setValue("source", val ?? "", { shouldValidate: true, shouldDirty: true })}
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
            onValueChange={(val: string | null) => setValue("referred_by_id", val ?? "", { shouldValidate: true, shouldDirty: true })}
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

      {duplicates && duplicates.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">
            ⚠️ Possible duplicate contact{duplicates.length > 1 ? "s" : ""} found
          </p>
          <ul className="space-y-1">
            {duplicates.map((d) => (
              <li key={d.id} className="text-sm text-amber-700">
                <span className="font-medium">{d.name}</span>
                {d.phone ? ` · ${d.phone}` : ""}
                {d.email ? ` · ${d.email}` : ""}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { setDuplicates(null); setPendingPayload(null); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={submitting}
              onClick={onCreateAnyway}
            >
              {submitting ? "Creating..." : "Create Anyway"}
            </Button>
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting
          ? "Saving..."
          : contact
            ? "Update Contact"
            : "Create Contact"}
      </Button>
    </form>
  );
}

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
  defaultType?: string;
}) {
  const [open, setOpen] = useState(false);

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
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact ? "Edit Contact" : "New Contact"}
          </DialogTitle>
        </DialogHeader>
        <ContactFormContent
          onSuccess={() => setOpen(false)}
          contact={contact}
          allContacts={allContacts}
          defaultType={defaultType}
          defaultReferredById={defaultReferredById}
        />
      </DialogContent>
    </Dialog>
  );
}
