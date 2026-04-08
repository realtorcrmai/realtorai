"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { TypeSelector } from "./TypeSelector";
import { ChannelSelector } from "./ChannelSelector";
import { LivePreviewCard } from "./LivePreviewCard";
import { createContact } from "@/actions/contacts";
import { LEAD_SOURCES } from "@/lib/constants/contacts";

export function ContactCreator() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [channel, setChannel] = useState("sms");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("");
  const [leadStatus, setLeadStatus] = useState("new");

  // Structured address
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("BC");
  const [postalCode, setPostalCode] = useState("");

  const fullAddress = [street, city, province, postalCode].filter(Boolean).join(", ");

  // Buyer preferences
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [areaInput, setAreaInput] = useState("");
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [financing, setFinancing] = useState("");

  // Seller preferences
  const [motivation, setMotivation] = useState("");
  const [desiredPrice, setDesiredPrice] = useState("");
  const [listDate, setListDate] = useState("");

  // BC postal code → city lookup (common areas)
  const BC_POSTAL_CITIES: Record<string, string> = {
    V5: "Burnaby", V3: "Coquitlam", V6: "Vancouver", V7: "North Vancouver",
    V4: "Delta", V8: "Victoria", V1: "Kelowna", V2: "Abbotsford",
    V9: "Nanaimo", V0: "Rural BC",
  };

  const handlePostalCodeChange = (val: string) => {
    const formatted = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setPostalCode(formatted);
    // Auto-fill city from first 2 characters
    if (formatted.length >= 2 && !city) {
      const prefix = formatted.substring(0, 2);
      const matched = BC_POSTAL_CITIES[prefix];
      if (matched) setCity(matched);
    }
  };

  // Auto-show preferences after type selection
  const isBuyer = type === "buyer";
  const isSeller = type === "seller";
  const hasTypeForPrefs = isBuyer || isSeller;

  const canSubmit = name.length >= 2 && phone.length >= 10 && type;

  const addArea = () => {
    if (areaInput.trim() && !areas.includes(areaInput.trim())) {
      setAreas([...areas, areaInput.trim()]);
      setAreaInput("");
    }
  };

  const togglePropertyType = (pt: string) => {
    setPropertyTypes(prev =>
      prev.includes(pt) ? prev.filter(t => t !== pt) : [...prev, pt]
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        type,
        pref_channel: channel,
        notes: notes.trim() || undefined,
        address: fullAddress || undefined,
        source: source || undefined,
        lead_status: leadStatus,
      };

      // Add buyer preferences
      if (isBuyer && (budgetMax || areas.length || propertyTypes.length)) {
        payload.buyer_preferences = {
          price_range_min: budgetMin ? parseInt(budgetMin) * 1000 : undefined,
          price_range_max: budgetMax ? parseInt(budgetMax) * 1000 : undefined,
          preferred_areas: areas.length > 0 ? areas : undefined,
          property_types: propertyTypes.length > 0 ? propertyTypes : undefined,
          timeline: timeline || undefined,
          financing_status: financing || undefined,
        };
      }

      // Add seller preferences
      if (isSeller && (motivation || desiredPrice)) {
        payload.seller_preferences = {
          motivation: motivation || undefined,
          desired_list_price: desiredPrice ? parseInt(desiredPrice) * 1000 : undefined,
          earliest_list_date: listDate || undefined,
        };
      }

      const result = await createContact(payload as any);
      if (result && typeof result === "object" && "error" in result) {
        setError((result as { error: string }).error);
        setSubmitting(false);
        return;
      }

      router.push("/contacts");
      router.refresh();
    } catch (err) {
      setError("Failed to create contact. Please try again.");
      setSubmitting(false);
    }
  };

  const formatBudget = () => {
    if (!budgetMax) return "";
    const min = budgetMin ? `$${budgetMin}K` : "";
    const max = `$${budgetMax}K`;
    return min ? `${min} — ${max}` : `Up to ${max}`;
  };

  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 dark:from-zinc-950 dark:via-background dark:to-indigo-950/5">
      {/* Header */}
      <div className="border-b border-border/30 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/contacts"
              className="p-2 -ml-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                Meet Someone New
              </h1>
              <p className="text-sm text-muted-foreground">Add a new contact to your network</p>
            </div>
          </div>
          <div />
        </div>
      </div>

      {/* Content — 2 column: form scrolls, preview fixed */}
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* LEFT — Form (scrolls with page) */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
            </div>
          )}

          <div className="space-y-8">

            {/* Section 1: Who are they? */}
            <div className="space-y-4">
              <SectionLabel number={1} label="Who are they?" required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Full name <span className="text-red-400">*</span></label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sarah Miller"
                    className="h-11 text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone number <span className="text-red-400">*</span></label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="604-555-1234"
                    className="h-11 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email address</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@email.com"
                  className="h-11 text-sm"
                  type="email"
                />
              </div>
            </div>

            {/* Section 2: What type? */}
            <div className="space-y-4">
              <SectionLabel number={2} label="They are a..." required />
              <TypeSelector value={type} onChange={(v) => { setType(v); if (v === "buyer" || v === "seller") setShowPrefs(true); }} />
            </div>

            {/* Section 3: How to reach them */}
            <div className="space-y-4">
              <SectionLabel number={3} label="Best way to reach them" required />
              <ChannelSelector value={channel} onChange={setChannel} />
            </div>

            {/* Section 4: Preferences (auto-shown for buyer/seller) */}
            {hasTypeForPrefs && (
              <div className="space-y-4">
                <SectionLabel
                  number={4}
                  label={isBuyer ? "What are they looking for?" : "Tell us about their property"}
                  optional
                />

                {isBuyer && (
                  <div className="space-y-3 p-4 rounded-xl bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Budget min ($K)</label>
                        <Input value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="500" className="h-10" type="number" />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Budget max ($K)</label>
                        <Input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="900" className="h-10" type="number" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        Preferred neighbourhoods to buy in
                      </label>
                      <p className="text-xs text-muted-foreground/60 mb-1.5">Where they want to purchase — not where they currently live</p>
                      <div className="flex gap-2">
                        <Input
                          value={areaInput}
                          onChange={(e) => setAreaInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArea(); } }}
                          placeholder="e.g. Burnaby, Coquitlam — press Enter to add"
                          className="h-10"
                        />
                      </div>
                      {areas.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mt-2">
                          {areas.map((area) => (
                            <span key={area} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm">
                              {area}
                              <button onClick={() => setAreas(areas.filter(a => a !== area))} className="hover:text-red-500">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block">Property types</label>
                      <div className="flex flex-wrap gap-2">
                        {["Detached", "Townhome", "Condo", "Duplex", "Acreage", "Commercial"].map((pt) => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => togglePropertyType(pt)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                              propertyTypes.includes(pt)
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white dark:bg-zinc-800 border border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                            }`}
                          >
                            {pt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Timeline</label>
                        <select value={timeline} onChange={(e) => setTimeline(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                          <option value="">Select...</option>
                          <option value="immediately">Immediately</option>
                          <option value="1-3 months">1-3 months</option>
                          <option value="3-6 months">3-6 months</option>
                          <option value="6-12 months">6-12 months</option>
                          <option value="just browsing">Just browsing</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Financing</label>
                        <select value={financing} onChange={(e) => setFinancing(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                          <option value="">Select...</option>
                          <option value="not_started">Not started</option>
                          <option value="in_progress">In progress</option>
                          <option value="preapproved">Pre-approved</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {isSeller && (
                  <div className="space-y-3 p-4 rounded-xl bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100/50 dark:border-purple-900/20">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Motivation</label>
                      <select value={motivation} onChange={(e) => setMotivation(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                        <option value="">Select...</option>
                        <option value="downsizing">Downsizing</option>
                        <option value="upsizing">Upsizing</option>
                        <option value="relocating">Relocating</option>
                        <option value="investment">Investment sale</option>
                        <option value="divorce">Divorce/separation</option>
                        <option value="estate">Estate sale</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Desired price ($K)</label>
                        <Input value={desiredPrice} onChange={(e) => setDesiredPrice(e.target.value)} placeholder="850" className="h-10" type="number" />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Earliest list date</label>
                        <Input value={listDate} onChange={(e) => setListDate(e.target.value)} className="h-10" type="date" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 5: More details (collapsible) */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                More details (optional)
              </button>

              {showMore && (
                <div className="space-y-4 animate-float-in">
                  {/* Structured Address */}
                  <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border border-border/30 space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Residential Address</p>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Street address</label>
                      <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Main Street, Unit 4" className="h-10" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">City</label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Vancouver" className="h-10" />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Province</label>
                        <select value={province} onChange={(e) => setProvince(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                          <option value="BC">British Columbia</option>
                          <option value="AB">Alberta</option>
                          <option value="ON">Ontario</option>
                          <option value="QC">Quebec</option>
                          <option value="MB">Manitoba</option>
                          <option value="SK">Saskatchewan</option>
                          <option value="NS">Nova Scotia</option>
                          <option value="NB">New Brunswick</option>
                          <option value="NL">Newfoundland</option>
                          <option value="PE">PEI</option>
                          <option value="NT">NWT</option>
                          <option value="YT">Yukon</option>
                          <option value="NU">Nunavut</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Postal code</label>
                        <Input
                          value={postalCode}
                          onChange={(e) => handlePostalCodeChange(e.target.value)}
                          placeholder="V5H 2N2"
                          className="h-10 uppercase"
                          maxLength={7}
                        />
                      </div>
                    </div>
                    {postalCode.length >= 2 && city && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Auto-detected: {city}, {province}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Source</label>
                      <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm">
                        <option value="">How did you meet?</option>
                        {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Lead status</label>
                      <select value={leadStatus} onChange={(e) => setLeadStatus(e.target.value)} className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm">
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="interested">Interested</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Notes</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anything you want to remember about this contact..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Live Preview — fixed position alongside form */}
        <div className="hidden lg:block w-[340px] shrink-0">
          <div className="fixed" style={{ width: "340px", top: "140px", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
            <LivePreviewCard
                name={name}
                phone={phone}
                email={email}
                type={type}
                channel={channel}
                notes={notes}
                source={source}
                address={fullAddress}
                leadStatus={leadStatus}
                budgetDisplay={formatBudget()}
                buyerAreas={areas}
                propertyTypes={propertyTypes}
                timeline={timeline}
                financing={financing}
                sellerMotivation={motivation}
                desiredPrice={desiredPrice}
                listDate={listDate}
              />
            <p className="text-xs text-muted-foreground text-center mt-3 italic">
              This is how the contact will appear in your CRM
            </p>

            {/* Primary action button — always visible with preview */}
            <Button
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="w-full mt-4 h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-lg rounded-xl"
              size="lg"
            >
              {submitting ? "Creating..." : canSubmit ? "Add to Network →" : "Fill required fields *"}
            </Button>

            {canSubmit && (
              <p className="text-xs text-emerald-600 text-center mt-1.5 font-medium">Ready to add to your network</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom spacer for scroll clearance */}
      <div className="h-8" />
    </div>
  );
}

// ── Section Label ──────────────────────────
function SectionLabel({ number, label, optional, required }: { number: number; label: string; optional?: boolean; required?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
        {number}
      </div>
      <h2 className="text-sm font-semibold">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </h2>
      {optional && <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">optional</span>}
    </div>
  );
}
