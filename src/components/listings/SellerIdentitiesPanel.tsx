"use client";

/**
 * FINTRAC seller identity intake panel.
 *
 * Surfaces existing seller_identities rows for a listing and provides a
 * form to add new ones. Used on the listing detail page to satisfy the
 * write-time gate added in src/actions/listings.ts (updateListingStatus
 * refuses to activate a listing without at least one identity row).
 *
 * Why a panel rather than a full page: the listing detail page already
 * has tabs/panels for documents, forms, etc. — adding FINTRAC inline
 * lets a realtor see compliance state alongside the rest of the
 * listing context. A separate page would require an extra navigation
 * step that breaks the workflow.
 *
 * Added: 2026-04-09 — backfills the missing UI for the data model
 * shipped in migration 078_seller_identities.sql + the server actions
 * shipped in src/actions/seller-identities.ts.
 */

import { useState, useTransition } from "react";
import {
  createSellerIdentity,
  deleteSellerIdentity,
} from "@/actions/seller-identities";

type SellerIdentity = {
  id: string;
  listing_id: string;
  full_name: string;
  dob: string | null;
  citizenship: string | null;
  id_type: string | null;
  id_number: string | null;
  id_expiry: string | null;
  phone: string | null;
  email: string | null;
  mailing_address: string | null;
  occupation: string | null;
  sort_order: number | null;
  created_at: string;
};

type Props = {
  listingId: string;
  initialIdentities: SellerIdentity[];
};

const ID_TYPES = [
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "Passport" },
  { value: "bcid", label: "BCID" },
  { value: "other_government_id", label: "Other Government ID" },
];

const CITIZENSHIPS = [
  { value: "canadian", label: "Canadian" },
  { value: "permanent_resident", label: "Permanent Resident" },
  { value: "foreign", label: "Foreign National" },
];

export function SellerIdentitiesPanel({ listingId, initialIdentities }: Props) {
  const [identities, setIdentities] = useState<SellerIdentity[]>(initialIdentities);
  const [showForm, setShowForm] = useState(initialIdentities.length === 0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasFintrac = identities.length > 0;

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createSellerIdentity({
        listing_id: listingId,
        full_name: String(formData.get("full_name") ?? ""),
        dob: (formData.get("dob") as string) || null,
        citizenship: (formData.get("citizenship") as string) || "canadian",
        id_type: (formData.get("id_type") as string) || "drivers_license",
        id_number: (formData.get("id_number") as string) || null,
        id_expiry: (formData.get("id_expiry") as string) || null,
        phone: (formData.get("phone") as string) || null,
        email: (formData.get("email") as string) || null,
        mailing_address: (formData.get("mailing_address") as string) || null,
        occupation: (formData.get("occupation") as string) || null,
        sort_order: identities.length,
      });

      if ("error" in result) {
        setError(result.error || "Failed to create identity");
        return;
      }

      if (result.data) {
        setIdentities([...identities, result.data as SellerIdentity]);
        setShowForm(false);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this identity record? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteSellerIdentity(id);
      if ("error" in result) {
        setError(result.error || "Failed to delete");
        return;
      }
      setIdentities(identities.filter((i) => i.id !== id));
    });
  };

  return (
    <div className="lf-card p-4 space-y-4">
      {/* Header + status */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          🪪 FINTRAC Seller Identity
          {hasFintrac ? (
            <span className="lf-badge lf-badge-done text-xs">{identities.length} verified</span>
          ) : (
            <span className="lf-badge lf-badge-blocked text-xs">Required</span>
          )}
        </h3>
        {hasFintrac && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            type="button"
          >
            + Add Seller
          </button>
        )}
      </div>

      {/* Compliance warning */}
      {!hasFintrac && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
          <p className="font-semibold mb-1">⚠ FINTRAC Compliance Required</p>
          <p>
            BC and federal regulations (FINTRAC Part XV.1) require identity
            verification for every seller in a real estate transaction. You
            cannot activate this listing without at least one verified seller
            identity record below.
          </p>
        </div>
      )}

      {/* Existing identities */}
      {identities.length > 0 && (
        <div className="space-y-2">
          {identities.map((identity) => (
            <div
              key={identity.id}
              className="border border-gray-200 rounded-md p-3 bg-white space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{identity.full_name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(identity.id)}
                  disabled={isPending}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {identity.dob && <div>DOB: {identity.dob}</div>}
                {identity.citizenship && (
                  <div>Citizenship: {identity.citizenship.replace(/_/g, " ")}</div>
                )}
                {identity.id_type && (
                  <div>
                    ID: {identity.id_type.replace(/_/g, " ")}
                    {identity.id_number && ` ••${identity.id_number.slice(-4)}`}
                    {identity.id_expiry && ` (exp ${identity.id_expiry})`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form action={handleSubmit} className="space-y-3 border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Full Legal Name *</label>
              <input
                name="full_name"
                required
                className="lf-input w-full text-sm"
                placeholder="As shown on government ID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Date of Birth</label>
              <input
                name="dob"
                type="date"
                className="lf-input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Citizenship</label>
              <select name="citizenship" className="lf-select w-full text-sm" defaultValue="canadian">
                {CITIZENSHIPS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">ID Type</label>
              <select name="id_type" className="lf-select w-full text-sm" defaultValue="drivers_license">
                {ID_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">ID Number</label>
              <input name="id_number" className="lf-input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">ID Expiry</label>
              <input name="id_expiry" type="date" className="lf-input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Phone</label>
              <input name="phone" type="tel" className="lf-input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <input name="email" type="email" className="lf-input w-full text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">Mailing Address</label>
              <input name="mailing_address" className="lf-input w-full text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">Occupation</label>
              <input name="occupation" className="lf-input w-full text-sm" />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="lf-btn-sm text-xs"
            >
              {isPending ? "Saving..." : "Save Identity"}
            </button>
            {hasFintrac && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs text-muted-foreground hover:text-gray-900"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
