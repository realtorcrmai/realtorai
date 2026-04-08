"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────
interface PartnerContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_indirect: boolean;
}

interface DealPartnerRow {
  id: string;
  role: string;
  ownership_pct: number | null;
  is_primary: boolean;
  contacts: PartnerContact;
}

interface PropertyDeal {
  id: string;
  address: string;
  property_type: string;
  listing_id: string | null;
  notes: string | null;
  created_at: string;
  property_deal_partners: DealPartnerRow[];
}

interface DealResponse {
  id: string;
  role: string;
  ownership_pct: number | null;
  is_primary: boolean;
  notes: string | null;
  property_deals: PropertyDeal;
}

const PROPERTY_TYPES = ["residential", "condo", "townhouse", "commercial", "land", "multi-family", "industrial", "other"];
const PARTNER_ROLES  = ["owner", "co-owner", "investor", "trustee", "beneficiary", "other"];

interface NewPartner {
  contact_id?: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  ownership_pct: string;
  is_primary: boolean;
}

// ── PropertyDealsTab ─────────────────────────────────────────
export function PropertyDealsTab({
  contactId,
  contactName,
  allContacts,
}: {
  contactId: string;
  contactName: string;
  allContacts: { id: string; name: string }[];
}) {
  const [deals, setDeals] = useState<DealResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/contacts/${contactId}/property-deals`);
    const data = await res.json();
    setDeals(data.deals ?? []);
    setLoading(false);
  }, [contactId]);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  const handleUpgrade = async (targetContactId: string) => {
    await fetch(`/api/contacts/${targetContactId}/upgrade-indirect`, { method: "POST" });
    loadDeals();
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm("Remove this property deal? Partners will remain as contacts.")) return;
    await fetch(`/api/contacts/${contactId}/property-deals?deal_id=${dealId}`, { method: "DELETE" });
    loadDeals();
  };

  if (loading) return (
    <div className="p-8 text-center text-sm text-[var(--lf-text)]/50">Loading properties…</div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--lf-text)]">Co-Owned Properties</h3>
          <p className="text-xs text-[var(--lf-text)]/50">Properties {contactName} owns with others</p>
        </div>
        <button onClick={() => setShowWizard(true)} className="lf-btn text-xs px-4 py-1.5">
          + Add Property
        </button>
      </div>

      {/* Empty state */}
      {deals.length === 0 && !showWizard && (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
          <div className="text-3xl mb-2">🏠</div>
          <p className="text-sm font-medium text-[var(--lf-text)]/70">No properties yet</p>
          <p className="text-xs text-[var(--lf-text)]/40 mt-1 mb-4">
            Add a co-owned property to link partners automatically
          </p>
          <button onClick={() => setShowWizard(true)} className="lf-btn text-sm px-4 py-2">
            + Add First Property
          </button>
        </div>
      )}

      {/* Deal cards */}
      {deals.map(({ property_deals: deal }) => (
        <div key={deal.id} className="lf-card p-4">
          {/* Deal header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-sm">🏠 {deal.address}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs capitalize text-[var(--lf-text)]/50">{deal.property_type}</span>
                {deal.listing_id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--lf-indigo)]/10 text-[var(--lf-indigo)]">
                    Active listing
                  </span>
                )}
                <span className="text-[10px] text-[var(--lf-text)]/30">
                  {deal.property_deal_partners.length} partner{deal.property_deal_partners.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDeleteDeal(deal.id)}
              className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded"
            >
              Remove
            </button>
          </div>

          {/* Partners list */}
          <div className="space-y-2">
            {deal.property_deal_partners.map((p) => {
              const isThisContact = p.contacts.id === contactId;
              return (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/50 hover:bg-white/80 transition-colors">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--lf-indigo)] to-[var(--lf-coral)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {p.contacts.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isThisContact ? (
                        <span className="text-sm font-medium">{p.contacts.name}</span>
                      ) : (
                        <Link
                          href={`/contacts/${p.contacts.id}`}
                          className="text-sm font-medium text-[var(--lf-indigo)] hover:underline"
                        >
                          {p.contacts.name}
                        </Link>
                      )}
                      {isThisContact && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">You</span>
                      )}
                      {p.contacts.is_indirect && !isThisContact && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          🔗 Via property
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--lf-text)]/50 flex gap-2">
                      <span className="capitalize">{p.role}</span>
                      {p.ownership_pct != null && <span>· {p.ownership_pct}%</span>}
                      {p.contacts.phone && <span>· {p.contacts.phone}</span>}
                    </div>
                  </div>

                  {/* Upgrade button for indirect contacts */}
                  {p.contacts.is_indirect && !isThisContact && (
                    <button
                      onClick={() => handleUpgrade(p.contacts.id)}
                      className="text-[10px] px-2 py-1 rounded border border-[var(--lf-indigo)]/30 text-[var(--lf-indigo)] hover:bg-[var(--lf-indigo)]/5 whitespace-nowrap flex-shrink-0"
                    >
                      Make direct client
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {deal.notes && (
            <p className="text-xs text-[var(--lf-text)]/50 mt-2 pt-2 border-t border-border/40">
              {deal.notes}
            </p>
          )}
        </div>
      ))}

      {/* Wizard */}
      {showWizard && (
        <PropertyDealWizard
          contactId={contactId}
          contactName={contactName}
          allContacts={allContacts}
          onSaved={() => { setShowWizard(false); loadDeals(); }}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

// ── PropertyDealWizard ────────────────────────────────────────
function PropertyDealWizard({
  contactId,
  contactName,
  allContacts,
  onSaved,
  onCancel,
}: {
  contactId: string;
  contactName: string;
  allContacts: { id: string; name: string }[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Property details
  const [address, setAddress]         = useState("");
  const [propertyType, setPropertyType] = useState("residential");
  const [notes, setNotes]             = useState("");

  // Step 2 — Partners
  const [partners, setPartners] = useState<NewPartner[]>([
    { name: "", phone: "", email: "", role: "co-owner", ownership_pct: "", is_primary: false },
  ]);

  const addPartner = () =>
    setPartners((p) => [...p, { name: "", phone: "", email: "", role: "co-owner", ownership_pct: "", is_primary: false }]);

  const removePartner = (i: number) =>
    setPartners((p) => p.filter((_, idx) => idx !== i));

  const updatePartner = (i: number, field: keyof NewPartner, value: string | boolean) =>
    setPartners((p) => p.map((pt, idx) => idx === i ? { ...pt, [field]: value } : pt));

  const selectExistingContact = (i: number, contactId2: string) => {
    const c = allContacts.find((c) => c.id === contactId2);
    if (c) setPartners((p) => p.map((pt, idx) =>
      idx === i ? { ...pt, contact_id: c.id, name: c.name } : pt
    ));
  };

  const handleSave = async () => {
    if (!address.trim()) { setError("Address is required"); return; }
    const validPartners = partners.filter((p) => p.contact_id || p.name.trim());
    if (validPartners.length === 0) { setError("Add at least one partner"); return; }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/contacts/${contactId}/property-deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          property_type: propertyType,
          notes: notes || null,
          partners: validPartners.map((p) => ({
            contact_id: p.contact_id || undefined,
            name:       p.name  || undefined,
            phone:      p.phone || undefined,
            email:      p.email || undefined,
            role:       p.role,
            ownership_pct: p.ownership_pct ? parseFloat(p.ownership_pct) : null,
            is_primary: p.is_primary,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Save failed"); setSaving(false); return; }

      onSaved();
    } catch {
      setError("Save failed. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="lf-card p-5 border-2 border-[var(--lf-indigo)]/20">
      {/* Wizard header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                n <= wizardStep ? "bg-[var(--lf-indigo)] text-white" : "bg-gray-200 text-gray-500"
              }`}>{n}</div>
              <span className={`text-xs hidden sm:block ${n <= wizardStep ? "text-[var(--lf-text)]" : "text-gray-400"}`}>
                {n === 1 ? "Property" : n === 2 ? "Partners" : "Review"}
              </span>
              {n < 3 && <div className={`w-8 h-0.5 ${n < wizardStep ? "bg-[var(--lf-indigo)]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
        <button onClick={onCancel} className="text-xs text-[var(--lf-text)]/40 hover:text-[var(--lf-text)] px-2 py-1">✕</button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>
      )}

      {/* ── Step 1: Property details ── */}
      {wizardStep === 1 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">🏠 Property Details</h3>
          <div>
            <label className="text-xs text-[var(--lf-text)]/60 mb-1 block">Address *</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Vancouver, BC"
              className="lf-input w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--lf-text)]/60 mb-1 block">Property Type</label>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="lf-select w-full text-sm">
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--lf-text)]/60 mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes about this property"
              className="lf-textarea w-full text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => { if (!address.trim()) { setError("Address is required"); return; } setError(""); setWizardStep(2); }}
              className="lf-btn text-sm px-4 py-1.5"
            >
              Next: Add Partners →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Partners ── */}
      {wizardStep === 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">👥 Co-Owners & Partners</h3>
            <span className="text-xs text-[var(--lf-text)]/40">{contactName} is always included</span>
          </div>

          {partners.map((p, i) => (
            <div key={i} className="p-3 border border-border/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--lf-text)]/60">Partner {i + 1}</span>
                {partners.length > 1 && (
                  <button onClick={() => removePartner(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>

              {/* Pick existing or create new */}
              <div>
                <label className="text-xs text-[var(--lf-text)]/50 mb-1 block">Existing contact (optional)</label>
                <select
                  value={p.contact_id || ""}
                  onChange={(e) => e.target.value ? selectExistingContact(i, e.target.value) : updatePartner(i, "contact_id", "")}
                  className="lf-select w-full text-sm"
                >
                  <option value="">— Enter details below —</option>
                  {allContacts
                    .filter((c) => c.id !== contactId)
                    .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {!p.contact_id && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[var(--lf-text)]/50 mb-1 block">Name *</label>
                    <input value={p.name} onChange={(e) => updatePartner(i, "name", e.target.value)} placeholder="Full name" className="lf-input w-full text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--lf-text)]/50 mb-1 block">Phone</label>
                    <input value={p.phone} onChange={(e) => updatePartner(i, "phone", e.target.value)} placeholder="+1 604 555 0000" className="lf-input w-full text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-[var(--lf-text)]/50 mb-1 block">Email</label>
                    <input value={p.email} onChange={(e) => updatePartner(i, "email", e.target.value)} placeholder="email@example.com" className="lf-input w-full text-sm" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--lf-text)]/50 mb-1 block">Role</label>
                  <select value={p.role} onChange={(e) => updatePartner(i, "role", e.target.value)} className="lf-select w-full text-sm">
                    {PARTNER_ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--lf-text)]/50 mb-1 block">Ownership %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={p.ownership_pct}
                    onChange={(e) => updatePartner(i, "ownership_pct", e.target.value)}
                    placeholder="e.g. 50"
                    className="lf-input w-full text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          <button onClick={addPartner} className="lf-btn-ghost text-xs px-3 py-1.5 w-full">
            + Add Another Partner
          </button>

          <div className="flex justify-between pt-1">
            <button onClick={() => setWizardStep(1)} className="lf-btn-ghost text-sm px-3 py-1.5">← Back</button>
            <button onClick={() => setWizardStep(3)} className="lf-btn text-sm px-4 py-1.5">Review →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {wizardStep === 3 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">✅ Review & Save</h3>

          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-sm font-medium">🏠 {address}</p>
            <p className="text-xs text-[var(--lf-text)]/50 mt-0.5 capitalize">{propertyType}{notes && ` · ${notes}`}</p>
          </div>

          <div className="space-y-1.5">
            {/* The primary contact (always included) */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--lf-indigo)] to-[var(--lf-coral)] flex items-center justify-center text-white text-xs font-bold">
                {contactName.charAt(0)}
              </div>
              <div className="flex-1 text-sm">{contactName}</div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Primary</span>
            </div>

            {partners.filter((p) => p.contact_id || p.name.trim()).map((p, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {(p.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{p.name || allContacts.find((c) => c.id === p.contact_id)?.name}</p>
                  <p className="text-xs text-[var(--lf-text)]/40 capitalize">{p.role}{p.ownership_pct ? ` · ${p.ownership_pct}%` : ""}</p>
                </div>
                {!p.contact_id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">New contact</span>
                )}
              </div>
            ))}
          </div>

          {partners.some((p) => !p.contact_id && p.name.trim()) && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
              ⚠️ New contacts will be created as <strong>indirect clients</strong> — they'll appear in your contacts list with a "Via property" badge. You can upgrade them to direct clients anytime.
            </p>
          )}

          <div className="flex justify-between pt-1">
            <button onClick={() => setWizardStep(2)} className="lf-btn-ghost text-sm px-3 py-1.5">← Back</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="lf-btn text-sm px-5 py-1.5 disabled:opacity-50"
            >
              {saving ? "Saving…" : "💾 Save Property"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
