"use client";

import { Input } from "@/components/ui/input";

const ID_TYPES = [
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "Passport" },
  { value: "bc_id", label: "BC ID Card" },
  { value: "other", label: "Other Government ID" },
];

const CITIZENSHIP_OPTIONS = [
  { value: "canadian", label: "Canadian Citizen" },
  { value: "permanent_resident", label: "Permanent Resident" },
  { value: "foreign_national", label: "Foreign National" },
];

export interface FintracData {
  full_name: string;
  dob: string;
  citizenship: string;
  id_type: string;
  id_number: string;
  id_expiry: string;
  phone: string;
  email: string;
  mailing_address: string;
  occupation: string;
}

interface FintracStepProps {
  data: FintracData;
  sellerName: string;
  onChange: (field: string, value: string) => void;
}

export function FintracStep({ data, sellerName, onChange }: FintracStepProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/50 text-sm text-amber-800">
        <p className="font-semibold">FINTRAC Compliance Required</p>
        <p className="text-xs mt-1 text-amber-700">
          BC real estate regulations require identity verification for every seller.
          You can complete this later, but the listing cannot go active without it.
        </p>
      </div>

      {/* Identity */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Identity Verification</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full Legal Name <span className="text-red-400">*</span></label>
            <Input
              value={data.full_name}
              onChange={(e) => onChange("full_name", e.target.value)}
              placeholder={sellerName || "Full legal name"}
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Date of Birth</label>
            <Input
              type="date"
              value={data.dob}
              onChange={(e) => onChange("dob", e.target.value)}
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Citizenship</label>
            <select
              value={data.citizenship}
              onChange={(e) => onChange("citizenship", e.target.value)}
              className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {CITIZENSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Occupation</label>
            <Input
              value={data.occupation}
              onChange={(e) => onChange("occupation", e.target.value)}
              placeholder="e.g. Software Engineer"
              className="h-11 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ID Document */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Government ID</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">ID Type</label>
            <select
              value={data.id_type}
              onChange={(e) => onChange("id_type", e.target.value)}
              className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {ID_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">ID Number</label>
            <Input
              value={data.id_number}
              onChange={(e) => onChange("id_number", e.target.value)}
              placeholder="ID number"
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Expiry Date</label>
            <Input
              type="date"
              value={data.id_expiry}
              onChange={(e) => onChange("id_expiry", e.target.value)}
              className="h-11 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Contact details */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Seller Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Phone</label>
            <Input
              value={data.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="+1 (604) 555-0123"
              className="h-11 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <Input
              type="email"
              value={data.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="seller@email.com"
              className="h-11 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1.5 block">Mailing Address</label>
            <Input
              value={data.mailing_address}
              onChange={(e) => onChange("mailing_address", e.target.value)}
              placeholder="Full mailing address"
              className="h-11 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
