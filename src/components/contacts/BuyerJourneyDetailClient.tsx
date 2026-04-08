"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addPropertyToJourney } from "@/actions/buyer-journey-properties";
import { recordOffer, updatePropertyStatus } from "@/actions/buyer-journey-properties";
import { advanceBuyerJourneyStatus } from "@/actions/buyer-journeys";
import { Card, CardContent } from "@/components/ui/card";
import { AddressAutocompleteInput } from "@/components/shared/AddressAutocompleteInput";
import type { AddressSuggestion } from "@/components/shared/AddressAutocompleteInput";

type PropertyStatus =
  | "interested" | "scheduled" | "viewed" | "offer_pending"
  | "offer_made" | "accepted" | "rejected" | "withdrawn" | "closed";

const STATUS_BADGE: Record<PropertyStatus, string> = {
  interested:    "lf-badge-pending",
  scheduled:     "lf-badge-info",
  viewed:        "lf-badge-info",
  offer_pending: "lf-badge-active",
  offer_made:    "lf-badge-active",
  accepted:      "lf-badge-done",
  rejected:      "lf-badge",
  withdrawn:     "lf-badge",
  closed:        "lf-badge-done",
};

const INTEREST_STARS = (level: number | null) =>
  Array.from({ length: 5 }, (_, i) => (i < (level ?? 0) ? "⭐" : "☆")).join("");

type AddSource = "crm" | "mls" | "manual";

interface Listing {
  id: string;
  address: string;
  list_price: number | null;
  property_type: string;
}

interface Property {
  id: string;
  address: string;
  status: string;
  interest_level: number | null;
  list_price: number | null;
  notes: string | null;
  offer_price: number | null;
  offer_status: string | null;
  offer_date: string | null;
  subjects: string[];
  [key: string]: unknown;
}

interface Props {
  journeyId: string;
  contactId: string;
  journeyStatus: string;
  properties: Record<string, unknown>[];
  allListings: Listing[];
}

export function BuyerJourneyDetailClient({
  journeyId,
  contactId,
  journeyStatus,
  properties: initialProperties,
  allListings,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [properties, setProperties] = useState<Property[]>(initialProperties as Property[]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSource, setAddSource] = useState<AddSource>("manual");
  const [showOfferForm, setShowOfferForm] = useState<string | null>(null); // propertyId
  const [error, setError] = useState<string | null>(null);

  // Add property form state
  const [addData, setAddData] = useState({
    address: "",
    mls_number: "",
    list_price: "",
    interest_level: "3",
    notes: "",
    crm_listing_id: "",
  });

  // Offer form state
  const [offerData, setOfferData] = useState({
    offer_price: "",
    offer_date: new Date().toISOString().split("T")[0],
    offer_expiry: "",
    subjects: "",
    offer_status: "pending" as const,
    counter_price: "",
  });

  async function handleAddProperty() {
    setError(null);
    let address = addData.address;
    let listingId: string | undefined;
    let mlsNumber: string | undefined;

    if (addSource === "crm") {
      const listing = allListings.find((l) => l.id === addData.crm_listing_id);
      if (!listing) { setError("Select a CRM listing."); return; }
      address = listing.address;
      listingId = listing.id;
    } else if (addSource === "mls") {
      if (!addData.mls_number) { setError("Enter an MLS number."); return; }
      mlsNumber = addData.mls_number;
      if (!address) address = `MLS# ${mlsNumber}`;
    } else {
      if (!address) { setError("Enter an address."); return; }
    }

    startTransition(async () => {
      const result = await addPropertyToJourney({
        journey_id: journeyId,
        contact_id: contactId,
        address,
        status: "interested",
        listing_id: listingId,
        mls_number: mlsNumber,
        list_price: addData.list_price ? Number(addData.list_price) : undefined,
        interest_level: Number(addData.interest_level),
        notes: addData.notes || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.property) {
        setProperties((prev) => [result.property as Property, ...prev]);
        setShowAddForm(false);
        setAddData({ address: "", mls_number: "", list_price: "", interest_level: "3", notes: "", crm_listing_id: "" });
        router.refresh();
      }
    });
  }

  async function handleRecordOffer(propertyId: string) {
    setError(null);
    if (!offerData.offer_price) { setError("Enter an offer price."); return; }

    startTransition(async () => {
      const result = await recordOffer(propertyId, {
        offer_price: Number(offerData.offer_price),
        offer_date: offerData.offer_date,
        offer_expiry: offerData.offer_expiry || undefined,
        subjects: offerData.subjects ? offerData.subjects.split(",").map((s) => s.trim()) : [],
        offer_status: offerData.offer_status,
        counter_price: offerData.counter_price ? Number(offerData.counter_price) : undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setShowOfferForm(null);
        router.refresh();
      }
    });
  }

  async function handleStatusChange(propertyId: string, status: PropertyStatus) {
    startTransition(async () => {
      await updatePropertyStatus(propertyId, status);
      router.refresh();
    });
  }

  async function handleAdvanceJourney() {
    startTransition(async () => {
      await advanceBuyerJourneyStatus(journeyId);
      router.refresh();
    });
  }

  const canAdvance = !["closed", "cancelled", "paused", "firm"].includes(journeyStatus);

  return (
    <div className="space-y-4">
      {/* Journey controls */}
      <div className="flex items-center gap-3">
        {canAdvance && (
          <button
            onClick={handleAdvanceJourney}
            disabled={isPending}
            className="lf-btn-sm"
          >
            ⬆️ Advance Stage
          </button>
        )}
        <button
          onClick={() => setShowAddForm(true)}
          className="lf-btn-sm"
          disabled={isPending}
        >
          + Add Property
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      {/* Add property form */}
      {showAddForm && (
        <Card className="border-indigo-200">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-sm">➕ Add Property of Interest</h3>

            {/* Source selector */}
            <div className="flex gap-2">
              {(["manual", "crm", "mls"] as AddSource[]).map((src) => (
                <button
                  key={src}
                  onClick={() => setAddSource(src)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    addSource === src ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {src === "manual" ? "🏠 Manual" : src === "crm" ? "📋 CRM Listing" : "🔢 MLS#"}
                </button>
              ))}
            </div>

            {addSource === "crm" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">CRM Listing</label>
                <select
                  className="lf-select w-full"
                  value={addData.crm_listing_id}
                  onChange={(e) => setAddData((d) => ({ ...d, crm_listing_id: e.target.value }))}
                >
                  <option value="">Select a listing…</option>
                  {allListings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.address} {l.list_price ? `· $${l.list_price.toLocaleString()}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {addSource === "mls" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">MLS Number</label>
                <input
                  className="lf-input w-full"
                  placeholder="e.g. R2891234"
                  value={addData.mls_number}
                  onChange={(e) => setAddData((d) => ({ ...d, mls_number: e.target.value }))}
                />
              </div>
            )}

            {addSource === "manual" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Address</label>
                <AddressAutocompleteInput
                  value={addData.address}
                  onChange={(val) => setAddData((d) => ({ ...d, address: val }))}
                  onSelect={(s: AddressSuggestion) => {
                    setAddData((d) => ({ ...d, address: s.fullAddress }));
                  }}
                  placeholder="e.g. 123 Main St, Burnaby"
                  disabled={isPending}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">List Price</label>
                <input
                  type="number"
                  className="lf-input w-full"
                  placeholder="e.g. 850000"
                  value={addData.list_price}
                  onChange={(e) => setAddData((d) => ({ ...d, list_price: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Interest (1–5)</label>
                <select
                  className="lf-select w-full"
                  value={addData.interest_level}
                  onChange={(e) => setAddData((d) => ({ ...d, interest_level: e.target.value }))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
              <textarea
                className="lf-textarea w-full"
                rows={2}
                value={addData.notes}
                onChange={(e) => setAddData((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={handleAddProperty} disabled={isPending} className="lf-btn-sm">
                {isPending ? "Adding…" : "Add Property"}
              </button>
              <button onClick={() => setShowAddForm(false)} className="lf-btn-ghost lf-btn-sm">Cancel</button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Properties list */}
      <div>
        <h3 className="font-semibold text-sm mb-3">🏘️ Properties of Interest ({properties.length})</h3>
        {properties.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No properties added yet. Use "+ Add Property" above.</p>
        ) : (
          <div className="space-y-3">
            {properties.map((prop) => (
              <Card key={prop.id} className="border border-gray-200">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{prop.address as string}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {prop.list_price && (
                          <span className="text-xs text-muted-foreground">${(prop.list_price as number).toLocaleString()}</span>
                        )}
                        <span className="text-yellow-500 text-xs">{INTEREST_STARS(prop.interest_level as number | null)}</span>
                      </div>
                    </div>
                    <span className={`lf-badge ${STATUS_BADGE[prop.status as PropertyStatus] ?? ""} text-xs shrink-0`}>
                      {prop.status as string}
                    </span>
                  </div>

                  {prop.notes && <p className="text-xs text-muted-foreground">{prop.notes as string}</p>}

                  {/* Offer summary */}
                  {prop.offer_price && (
                    <div className="p-2 bg-blue-50 border border-blue-100 rounded text-xs space-y-0.5">
                      <p className="font-medium text-blue-800">📝 Offer: ${(prop.offer_price as number).toLocaleString()}</p>
                      {prop.offer_date && <p className="text-blue-600">Date: {prop.offer_date as string}</p>}
                      {prop.offer_status && <p className="text-blue-600">Status: <strong>{prop.offer_status as string}</strong></p>}
                      {(prop.subjects as string[])?.length > 0 && (
                        <p className="text-blue-600">Subjects: {(prop.subjects as string[]).join(" · ")}</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <select
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                      value={prop.status as string}
                      onChange={(e) => handleStatusChange(prop.id, e.target.value as PropertyStatus)}
                      disabled={isPending}
                    >
                      {["interested","scheduled","viewed","offer_pending","offer_made","accepted","rejected","withdrawn","closed"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowOfferForm(prop.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      📝 Record Offer
                    </button>
                  </div>

                  {/* Inline offer form */}
                  {showOfferForm === prop.id && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded space-y-3">
                      <h4 className="text-xs font-semibold">📝 Record Offer</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Offer Price *</label>
                          <input
                            type="number"
                            className="lf-input w-full text-sm"
                            value={offerData.offer_price}
                            onChange={(e) => setOfferData((d) => ({ ...d, offer_price: e.target.value }))}
                            placeholder="850000"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Offer Date *</label>
                          <input
                            type="date"
                            className="lf-input w-full text-sm"
                            value={offerData.offer_date}
                            onChange={(e) => setOfferData((d) => ({ ...d, offer_date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Expiry</label>
                          <input
                            type="datetime-local"
                            className="lf-input w-full text-sm"
                            value={offerData.offer_expiry}
                            onChange={(e) => setOfferData((d) => ({ ...d, offer_expiry: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Status</label>
                          <select
                            className="lf-select w-full text-sm"
                            value={offerData.offer_status}
                            onChange={(e) => setOfferData((d) => ({ ...d, offer_status: e.target.value as "pending" }))}
                          >
                            {["pending","accepted","rejected","countered","withdrawn","subject_removed"].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Subjects (comma-separated)</label>
                        <input
                          className="lf-input w-full text-sm"
                          placeholder="Financing, Inspection, Sale of property"
                          value={offerData.subjects}
                          onChange={(e) => setOfferData((d) => ({ ...d, subjects: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRecordOffer(prop.id)} disabled={isPending} className="lf-btn-sm">
                          {isPending ? "Saving…" : "Save Offer"}
                        </button>
                        <button onClick={() => setShowOfferForm(null)} className="lf-btn-ghost lf-btn-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
