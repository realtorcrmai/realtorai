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
  // Buyer preference fields
  budget_min: z.string().optional(),
  budget_max: z.string().optional(),
  preferred_areas: z.string().optional(),
  property_types: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  timeline: z.string().optional(),
  must_haves: z.string().optional(),
  // Seller preference fields
  property_address: z.string().optional(),
  asking_price: z.string().optional(),
  sell_timeline: z.string().optional(),
  property_condition: z.string().optional(),
  // Demographics
  birthday: z.string().optional(),
});

const BC_AREAS = [
  "Kitsilano", "Point Grey", "Dunbar", "Kerrisdale", "Marpole",
  "Mount Pleasant", "Main Street", "East Vancouver", "Strathcona",
  "Yaletown", "Coal Harbour", "West End", "Downtown",
  "North Vancouver", "West Vancouver", "Burnaby", "New Westminster",
  "Coquitlam", "Port Moody", "Surrey", "Langley", "Richmond",
  "White Rock", "South Surrey", "Delta", "Maple Ridge",
];

const PROPERTY_TYPES = ["Condo", "Townhouse", "Detached", "Duplex", "Penthouse", "Laneway"];
const TIMELINES = ["ASAP", "1-3 months", "3-6 months", "6-12 months", "Just exploring"];
const BEDROOM_OPTIONS = ["Studio", "1", "2", "3", "4", "5+"];
const CONDITIONS = ["Move-in ready", "Needs minor updates", "Needs renovation", "Teardown/rebuild"];

type FormData = z.infer<typeof formSchema>;

export interface ContactFormContentProps {
  onSuccess?: () => void;
  contact?: Contact;
  allContacts?: { id: string; name: string }[];
  defaultType?: "buyer" | "seller";
  defaultReferredById?: string;
}

export function ContactFormContent({
  onSuccess,
  contact,
  allContacts = [],
  defaultType,
  defaultReferredById,
}: ContactFormContentProps) {
  const [submitting, setSubmitting] = useState(false);

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
          type: contact.type,
          pref_channel: contact.pref_channel,
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
          budget_min: (contact.buyer_preferences as Record<string, string>)?.budget_min ?? "",
          budget_max: (contact.buyer_preferences as Record<string, string>)?.budget_max ?? "",
          preferred_areas: (contact.buyer_preferences as Record<string, string>)?.preferred_areas ?? "",
          property_types: (contact.buyer_preferences as Record<string, string>)?.property_types ?? "",
          bedrooms: (contact.buyer_preferences as Record<string, string>)?.bedrooms ?? "",
          bathrooms: (contact.buyer_preferences as Record<string, string>)?.bathrooms ?? "",
          timeline: (contact.buyer_preferences as Record<string, string>)?.timeline ?? "",
          must_haves: (contact.buyer_preferences as Record<string, string>)?.must_haves ?? "",
          property_address: (contact.seller_preferences as Record<string, string>)?.property_address ?? "",
          asking_price: (contact.seller_preferences as Record<string, string>)?.asking_price ?? "",
          sell_timeline: (contact.seller_preferences as Record<string, string>)?.sell_timeline ?? "",
          property_condition: (contact.seller_preferences as Record<string, string>)?.property_condition ?? "",
          birthday: (contact.demographics as Record<string, string>)?.birthday ?? "",
        }
      : {
          type: defaultType ?? "buyer",
          pref_channel: "sms",
          referred_by_id: defaultReferredById ?? "",
          source: "",
          lead_status: "new",
          partner_type: "",
          company_name: "",
          job_title: "",
          typical_client_profile: "",
          referral_agreement_terms: "",
          budget_min: "",
          budget_max: "",
          preferred_areas: "",
          property_types: "",
          bedrooms: "",
          bathrooms: "",
          timeline: "",
          must_haves: "",
          property_address: "",
          asking_price: "",
          sell_timeline: "",
          property_condition: "",
          birthday: "",
        },
  });

  const selectedType = watch("type");

  async function onSubmit(data: FormData) {
    setSubmitting(true);

    // Pack buyer preferences into JSONB
    const buyer_preferences = (data.type === "buyer") ? {
      budget_min: data.budget_min || undefined,
      budget_max: data.budget_max || undefined,
      preferred_areas: data.preferred_areas || undefined,
      property_types: data.property_types || undefined,
      bedrooms: data.bedrooms || undefined,
      bathrooms: data.bathrooms || undefined,
      timeline: data.timeline || undefined,
      must_haves: data.must_haves || undefined,
    } : undefined;

    // Pack seller preferences into JSONB
    const seller_preferences = (data.type === "seller") ? {
      property_address: data.property_address || undefined,
      asking_price: data.asking_price || undefined,
      sell_timeline: data.sell_timeline || undefined,
      property_condition: data.property_condition || undefined,
    } : undefined;

    // Pack demographics
    const demographics = data.birthday ? { birthday: data.birthday } : undefined;

    // Remove preference fields from flat payload
    const { budget_min, budget_max, preferred_areas, property_types, bedrooms, bathrooms,
      timeline, must_haves, property_address, asking_price, sell_timeline, property_condition,
      birthday, ...rest } = data;

    const payload = {
      ...rest,
      buyer_preferences,
      seller_preferences,
      demographics,
      ...(data.type !== "partner" && {
        partner_type: undefined,
        company_name: undefined,
        job_title: undefined,
        typical_client_profile: undefined,
        referral_agreement_terms: undefined,
      }),
    };
    if (contact) {
      await updateContact(contact.id, payload);
    } else {
      await createContact(payload);
    }
    setSubmitting(false);
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
              setValue("type", val as FormData["type"])
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

      {/* ── Partner-specific Fields ───────────────────────── */}
      {selectedType === "partner" && (
        <div className="space-y-4 rounded-lg border border-teal-200 bg-teal-50/50 p-4">
          <p className="text-sm font-semibold text-teal-800">Partner Details</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Partner Type</Label>
              <Select
                defaultValue={contact?.partner_type ?? ""}
                onValueChange={(val) =>
                  setValue("partner_type", val as FormData["partner_type"])
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

      {/* ── Buyer Preferences ───────────────────────── */}
      {selectedType === "buyer" && (
        <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
          <p className="text-sm font-semibold text-indigo-800">What Are They Looking For?</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Min Budget</Label>
              <Input {...register("budget_min")} placeholder="$600,000" />
            </div>
            <div>
              <Label className="text-xs">Max Budget</Label>
              <Input {...register("budget_max")} placeholder="$900,000" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Preferred Areas</Label>
            <Select
              defaultValue={(contact?.buyer_preferences as Record<string, string>)?.preferred_areas ?? ""}
              onValueChange={(val) => setValue("preferred_areas", val ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select area..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any area</SelectItem>
                {BC_AREAS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Property Type</Label>
              <Select
                defaultValue={(contact?.buyer_preferences as Record<string, string>)?.property_types ?? ""}
                onValueChange={(val) => setValue("property_types", val ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Bedrooms</Label>
              <Select
                defaultValue={(contact?.buyer_preferences as Record<string, string>)?.bedrooms ?? ""}
                onValueChange={(val) => setValue("bedrooms", val ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Beds..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {BEDROOM_OPTIONS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Timeline</Label>
            <Select
              defaultValue={(contact?.buyer_preferences as Record<string, string>)?.timeline ?? ""}
              onValueChange={(val) => setValue("timeline", val ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="When do they want to buy?" />
              </SelectTrigger>
              <SelectContent>
                {TIMELINES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Must-Haves (optional)</Label>
            <Input {...register("must_haves")} placeholder="Parking, in-suite laundry, near schools..." />
          </div>
        </div>
      )}

      {/* ── Seller Preferences ───────────────────────── */}
      {selectedType === "seller" && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-sm font-semibold text-amber-800">Property Details</p>

          <div>
            <Label className="text-xs">Property Address</Label>
            <Input {...register("property_address")} placeholder="123 W 4th Ave, Vancouver, BC" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Asking Price</Label>
              <Input {...register("asking_price")} placeholder="$1,200,000" />
            </div>
            <div>
              <Label className="text-xs">Timeline</Label>
              <Select
                defaultValue={(contact?.seller_preferences as Record<string, string>)?.sell_timeline ?? ""}
                onValueChange={(val) => setValue("sell_timeline", val ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="When?" />
                </SelectTrigger>
                <SelectContent>
                  {TIMELINES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Property Condition</Label>
            <Select
              defaultValue={(contact?.seller_preferences as Record<string, string>)?.property_condition ?? ""}
              onValueChange={(val) => setValue("property_condition", val ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition..." />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="address">Address (optional)</Label>
        <Input {...register("address")} placeholder="123 Main St, Vancouver, BC" />
      </div>

      {/* ── Birthday ───────────────────────── */}
      <div>
        <Label htmlFor="birthday">Birthday (optional)</Label>
        <Input {...register("birthday")} type="date" />
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
  defaultType?: "buyer" | "seller";
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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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
