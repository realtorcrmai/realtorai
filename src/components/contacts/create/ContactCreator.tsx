"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { TypeSelector } from "./TypeSelector";
import { ChannelSelector } from "./ChannelSelector";
import { LivePreviewCard } from "./LivePreviewCard";
import { createContact } from "@/actions/contacts";
import { LEAD_SOURCES, PARTNER_TYPES, PARTNER_TYPE_LABELS } from "@/lib/constants/contacts";

interface ContactCreatorProps {
  allContacts?: { id: string; name: string }[];
}

// ── Step definitions ──────────────────────────
const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "type", label: "Type" },
  { key: "preferences", label: "Prefs" },
  { key: "details", label: "Address" },
  { key: "family", label: "Family" },
  { key: "portfolio", label: "Portfolio" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

// ── Types for inline collections ──────────────
interface FamilyMemberDraft {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

interface PortfolioDraft {
  address: string;
  city: string;
  property_type: string;
  status: string;
  notes: string;
}

// Social platforms
const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: "📸", prefix: "instagram.com/", placeholder: "username" },
  { key: "facebook", label: "Facebook", icon: "📘", prefix: "facebook.com/", placeholder: "profile.name" },
  { key: "linkedin", label: "LinkedIn", icon: "💼", prefix: "linkedin.com/in/", placeholder: "firstname-lastname" },
  { key: "twitter", label: "X / Twitter", icon: "𝕏", prefix: "x.com/", placeholder: "handle" },
  { key: "tiktok", label: "TikTok", icon: "🎵", prefix: "tiktok.com/@", placeholder: "username" },
  { key: "youtube", label: "YouTube", icon: "▶️", prefix: "youtube.com/@", placeholder: "channel" },
] as const;

/** Extract platform + handle from a pasted URL or raw handle */
function parseSocialInput(input: string): { platform: string; handle: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlPatterns: [RegExp, string][] = [
    [/(?:instagram\.com|instagr\.am)\/([^/?#]+)/i, "instagram"],
    [/facebook\.com\/([^/?#]+)/i, "facebook"],
    [/linkedin\.com\/in\/([^/?#]+)/i, "linkedin"],
    [/(?:twitter\.com|x\.com)\/([^/?#]+)/i, "twitter"],
    [/tiktok\.com\/@?([^/?#]+)/i, "tiktok"],
    [/youtube\.com\/@?([^/?#]+)/i, "youtube"],
  ];
  for (const [pattern, platform] of urlPatterns) {
    const match = trimmed.match(pattern);
    if (match) return { platform, handle: match[1].replace(/^@/, "") };
  }
  return null;
}

// Context types matching ContextLog design
interface ContextDraft { type: string; text: string }
const CONTEXT_TYPES = [
  { key: "preference", label: "Preference", emoji: "💜" },
  { key: "objection", label: "Objection", emoji: "⚠️" },
  { key: "concern", label: "Concern", emoji: "🔴" },
  { key: "timeline", label: "Timeline", emoji: "🕐" },
  { key: "info", label: "Info", emoji: "ℹ️" },
] as const;

const FAMILY_RELATIONSHIPS = ["Spouse", "Child", "Parent", "Sibling", "Partner", "Other"] as const;

// ── North American formatters ──────────────────
/** Format phone as (604) 555-1234 for display, store raw digits */
function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Strip leading 1 for display
  const d = digits.startsWith("1") && digits.length > 10 ? digits.slice(1) : digits;
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

/** Extract raw digits from formatted phone */
function phoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

/** Format Canadian postal code: V5H 2N2 */
function formatPostalCode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)}`;
}
const PROPERTY_TYPES_LIST = ["Detached", "Townhome", "Condo", "Duplex", "Acreage", "Commercial", "Land"] as const;
const PORTFOLIO_STATUSES = ["owned", "rented", "sold", "interested"] as const;

export function ContactCreator({ allContacts = [] }: ContactCreatorProps) {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("basics");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [channel, setChannel] = useState("sms");
  const [notes, setNotes] = useState(""); // kept for payload, built from contextEntries
  const [source, setSource] = useState("");

  // Social profiles
  const [socialProfiles, setSocialProfiles] = useState<Record<string, string>>({});
  const [socialPlatform, setSocialPlatform] = useState("instagram");
  const [socialInput, setSocialInput] = useState("");

  // Context entries (multi-type, matching ContextLog design)
  const [contextEntries, setContextEntries] = useState<ContextDraft[]>([]);
  const [ctxType, setCtxType] = useState("info");
  const [ctxText, setCtxText] = useState("");
  const [leadStatus, setLeadStatus] = useState("new");

  // Referred by & partner fields
  const [referredById, setReferredById] = useState("");
  const [partnerType, setPartnerType] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

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

  // Family members (collected during wizard, saved after contact creation)
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberDraft[]>([]);
  const [familyForm, setFamilyForm] = useState<FamilyMemberDraft>({ name: "", relationship: "Spouse", phone: "", email: "" });

  // Portfolio properties
  const [portfolioItems, setPortfolioItems] = useState<PortfolioDraft[]>([]);
  const [portfolioForm, setPortfolioForm] = useState<PortfolioDraft>({ address: "", city: "", property_type: "", status: "owned", notes: "" });

  // Auto-scroll preview ref
  const previewRef = useRef<HTMLDivElement>(null);

  // Auto-scroll preview to relevant section when step changes
  useEffect(() => {
    if (!previewRef.current) return;
    const sectionMap: Record<string, string> = {
      basics: "[data-preview='contact']",
      type: "[data-preview='pipeline']",
      preferences: "[data-preview='preferences']",
      details: "[data-preview='details']",
      family: "[data-preview='family']",
      portfolio: "[data-preview='portfolio']",
    };
    const selector = sectionMap[step];
    if (selector) {
      const el = previewRef.current.querySelector(selector);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [step]);

  // BC postal code → city lookup
  const BC_POSTAL_CITIES: Record<string, string> = {
    V5: "Burnaby", V3: "Coquitlam", V6: "Vancouver", V7: "North Vancouver",
    V4: "Delta", V8: "Victoria", V1: "Kelowna", V2: "Abbotsford",
    V9: "Nanaimo", V0: "Rural BC",
  };

  const handlePostalCodeChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setPostalCode(clean);
    if (clean.length >= 2 && !city) {
      const prefix = clean.substring(0, 2);
      const matched = BC_POSTAL_CITIES[prefix];
      if (matched) setCity(matched);
    }
  };

  const isBuyer = type === "buyer";
  const isSeller = type === "seller";
  const isPartner = type === "agent" || type === "partner";
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

  // ── Step navigation ──────────────────────────
  const stepIndex = STEPS.findIndex(s => s.key === step);

  const canGoNext = () => {
    if (step === "basics") return name.length >= 2 && phone.length >= 10;
    if (step === "type") return !!type;
    return true;
  };

  const goNext = () => {
    if (!canGoNext()) return;
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.key);
  };

  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.key);
  };

  const isLastStep = stepIndex === STEPS.length - 1;

  // ── Family helpers ──────────────────────────
  const addFamilyMember = () => {
    if (!familyForm.name.trim()) return;
    setFamilyMembers([...familyMembers, { ...familyForm, name: familyForm.name.trim() }]);
    setFamilyForm({ name: "", relationship: "Spouse", phone: "", email: "" });
  };

  const removeFamilyMember = (i: number) => {
    setFamilyMembers(familyMembers.filter((_, idx) => idx !== i));
  };

  // ── Portfolio helpers ──────────────────────────
  const addPortfolioItem = () => {
    if (!portfolioForm.address.trim()) return;
    setPortfolioItems([...portfolioItems, { ...portfolioForm, address: portfolioForm.address.trim() }]);
    setPortfolioForm({ address: "", city: "", property_type: "", status: "owned", notes: "" });
  };

  const removePortfolioItem = (i: number) => {
    setPortfolioItems(portfolioItems.filter((_, idx) => idx !== i));
  };

  // ── Context helpers ──────────────────────────
  const addContextEntry = () => {
    if (!ctxText.trim()) return;
    setContextEntries([...contextEntries, { type: ctxType, text: ctxText.trim() }]);
    setCtxText("");
  };

  const removeContextEntry = (i: number) => {
    setContextEntries(contextEntries.filter((_, idx) => idx !== i));
  };

  // ── Social helpers ──────────────────────────
  const addSocialProfile = () => {
    const input = socialInput.trim();
    if (!input) return;
    const parsed = parseSocialInput(input);
    if (parsed) {
      setSocialProfiles({ ...socialProfiles, [parsed.platform]: parsed.handle });
      setSocialInput("");
      setSocialPlatform(parsed.platform);
      return;
    }
    setSocialProfiles({ ...socialProfiles, [socialPlatform]: input.replace(/^@/, "") });
    setSocialInput("");
  };

  const removeSocialProfile = (platform: string) => {
    const updated = { ...socialProfiles };
    delete updated[platform];
    setSocialProfiles(updated);
  };

  // ── Submit ──────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    // Auto-add any unsaved draft family member or portfolio item
    const allFamily = [...familyMembers];
    if (familyForm.name.trim()) {
      allFamily.push({ ...familyForm, name: familyForm.name.trim() });
    }
    const allPortfolio = [...portfolioItems];
    if (portfolioForm.address.trim()) {
      allPortfolio.push({ ...portfolioForm, address: portfolioForm.address.trim() });
    }

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.startsWith("1") ? phone : `1${phone}`, // stored as digits, server action adds +
        email: email.trim() || undefined,
        type,
        pref_channel: channel,
        notes: notes.trim() || undefined,
        address: fullAddress || undefined,
        source: source || undefined,
        lead_status: leadStatus,
        referred_by_id: referredById || undefined,
        partner_type: partnerType || undefined,
        company_name: companyName.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        social_profiles: Object.keys(socialProfiles).length > 0 ? socialProfiles : undefined,
      };

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

      // Save family, portfolio, and context entries in background
      const contactId = (result as { id?: string })?.id;
      if (contactId) {
        const saves: Promise<unknown>[] = [];
        for (const fm of allFamily) {
          saves.push(
            fetch(`/api/contacts/${contactId}/family`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fm),
            }).catch(() => {})
          );
        }
        for (const pi of allPortfolio) {
          saves.push(
            fetch(`/api/contacts/${contactId}/portfolio`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(pi),
            }).catch(() => {})
          );
        }
        for (const ctx of contextEntries) {
          saves.push(
            fetch("/api/contacts/context", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contactId, contextType: ctx.type, text: ctx.text }),
            }).catch(() => {})
          );
        }
        await Promise.allSettled(saves);
      }

      router.push("/contacts");
      router.refresh();
    } catch {
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

  // ── Render ──────────────────────────
  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-[#FAF8F4] via-white to-[#0F7694]/5 dark:from-zinc-950 dark:via-background dark:to-[#1a1535]/5">
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
                <Sparkles className="h-5 w-5 text-brand" />
                Meet Someone New
              </h1>
              <p className="text-sm text-muted-foreground">Step {stepIndex + 1} of {STEPS.length} — {STEPS[stepIndex].label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step indicator — constrained to left form column width (excludes 340px preview + 32px gap) */}
      <div className="max-w-6xl mx-auto px-6 pt-6 lg:pr-[388px]">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => {
            const isActive = i === stepIndex;
            const isDone = i < stepIndex;
            return (
              <div key={s.key} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => { if (isDone) setStep(s.key); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full ${
                    isActive
                      ? "bg-brand/10 text-brand border border-brand/20"
                      : isDone
                        ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30 cursor-pointer hover:bg-emerald-100/50"
                        : "bg-muted/30 text-muted-foreground border border-transparent"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                        ? "bg-brand text-white"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline truncate">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-2 h-0.5 shrink-0 ${isDone ? "bg-emerald-300" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content — 2 column */}
      <div className="max-w-6xl mx-auto px-6 py-6 flex gap-8">
        {/* LEFT — Step content */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
            </div>
          )}

          <div className="space-y-6">
            {/* ── STEP 1: Basics ────────────────── */}
            {step === "basics" && (
              <div className="space-y-5 animate-float-in">
                <SectionLabel label="Who are they?" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Full name <span className="text-red-400">*</span></label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah Miller" className="h-11 text-sm" autoFocus />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone number <span className="text-red-400">*</span></label>
                    <Input value={formatPhoneDisplay(phone)} onChange={(e) => setPhone(phoneDigits(e.target.value))} placeholder="(604) 555-1234" className="h-11 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email address</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah@email.com" className="h-11 text-sm" type="email" />
                </div>
              </div>
            )}

            {/* ── STEP 2: Type & Channel ────────── */}
            {step === "type" && (
              <div className="space-y-8 animate-float-in">
                <div className="space-y-4">
                  <SectionLabel label="They are a..." />
                  <TypeSelector value={type} onChange={setType} />
                </div>
                <div className="space-y-4">
                  <SectionLabel label="Best way to reach them" />
                  <ChannelSelector value={channel} onChange={setChannel} />
                </div>
              </div>
            )}

            {/* ── STEP 3: Preferences ──────────── */}
            {step === "preferences" && (
              <div className="space-y-6 animate-float-in">
                {isBuyer && (
                  <>
                    <SectionLabel label="What are they looking for?" />
                    <div className="space-y-3 p-4 rounded-xl bg-brand-muted dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20">
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
                        <label className="text-sm text-muted-foreground mb-1 block">Preferred neighbourhoods</label>
                        <p className="text-xs text-muted-foreground/60 mb-1.5">Where they want to purchase — press Enter to add</p>
                        <Input
                          value={areaInput}
                          onChange={(e) => setAreaInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArea(); } }}
                          placeholder="e.g. Burnaby, Coquitlam"
                          className="h-10"
                        />
                        {areas.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap mt-2">
                            {areas.map((area) => (
                              <span key={area} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-muted dark:bg-blue-900/30 text-brand-dark dark:text-blue-300 text-sm">
                                {area}
                                <button onClick={() => setAreas(areas.filter(a => a !== area))} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Property types</label>
                        <div className="flex flex-wrap gap-2">
                          {["Detached", "Townhome", "Condo", "Duplex", "Acreage", "Commercial"].map((pt) => (
                            <button key={pt} type="button" onClick={() => togglePropertyType(pt)}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${propertyTypes.includes(pt) ? "bg-brand text-white shadow-sm" : "bg-white dark:bg-zinc-800 border border-border/50 text-muted-foreground hover:text-foreground hover:border-border"}`}>
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
                  </>
                )}

                {isSeller && (
                  <>
                    <SectionLabel label="Tell us about their property" />
                    <div className="space-y-3 p-4 rounded-xl bg-brand-muted/30 dark:bg-foreground/10 border border-brand/15 dark:border-brand/10">
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
                  </>
                )}

                {isPartner && (
                  <>
                    <SectionLabel label="Professional details" />
                    <div className="space-y-3 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Partner type</label>
                        <select value={partnerType} onChange={(e) => setPartnerType(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                          <option value="">Select type...</option>
                          {PARTNER_TYPES.map((pt) => (
                            <option key={pt} value={pt}>{PARTNER_TYPE_LABELS[pt]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">Company</label>
                          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="RE/MAX, TD Bank..." className="h-10" />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">Job title</label>
                          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Mortgage Specialist..." className="h-10" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!isBuyer && !isSeller && !isPartner && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No extra preferences for this contact type.</p>
                    <p className="text-xs mt-1">Click Next to continue to details.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 5: Family ────────────────── */}
            {step === "family" && (
              <div className="space-y-5 animate-float-in">
                <SectionLabel label="Family members" />
                <p className="text-sm text-muted-foreground -mt-3">Add spouse, children, or other family members. You can skip this and add later.</p>

                {familyMembers.length > 0 && (
                  <div className="space-y-2">
                    {familyMembers.map((fm, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{fm.name}</p>
                          <p className="text-xs text-muted-foreground">{fm.relationship}{fm.phone ? ` — ${formatPhoneDisplay(fm.phone)}` : ""}</p>
                        </div>
                        <button type="button" onClick={() => removeFamilyMember(i)} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-foreground/10 border border-border/30 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Name</label>
                      <Input value={familyForm.name} onChange={(e) => setFamilyForm({ ...familyForm, name: e.target.value })} placeholder="Jane Doe" className="h-10" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Relationship</label>
                      <select value={familyForm.relationship} onChange={(e) => setFamilyForm({ ...familyForm, relationship: e.target.value })} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                        {FAMILY_RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Phone</label>
                      <Input value={formatPhoneDisplay(familyForm.phone)} onChange={(e) => setFamilyForm({ ...familyForm, phone: phoneDigits(e.target.value) })} placeholder="(604) 555-0000" className="h-10" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                      <Input value={familyForm.email} onChange={(e) => setFamilyForm({ ...familyForm, email: e.target.value })} placeholder="jane@email.com" className="h-10" />
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={addFamilyMember} disabled={!familyForm.name.trim()} className="gap-2 w-full">
                    <Plus className="h-4 w-4" /> Add Family Member
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 6: Portfolio ────────────── */}
            {step === "portfolio" && (
              <div className="space-y-5 animate-float-in">
                <SectionLabel label="Properties" />
                <p className="text-sm text-muted-foreground -mt-3">Properties they own or are interested in. You can skip this and add later.</p>

                {portfolioItems.length > 0 && (
                  <div className="space-y-2">
                    {portfolioItems.map((pi, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{pi.address}{pi.city ? `, ${pi.city}` : ""}</p>
                          <p className="text-xs text-muted-foreground capitalize">{pi.property_type || "Property"} — {pi.status}</p>
                        </div>
                        <button type="button" onClick={() => removePortfolioItem(i)} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-foreground/10 border border-border/30 space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Address</label>
                    <Input value={portfolioForm.address} onChange={(e) => setPortfolioForm({ ...portfolioForm, address: e.target.value })} placeholder="456 Oak Ave" className="h-10" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">City</label>
                      <Input value={portfolioForm.city} onChange={(e) => setPortfolioForm({ ...portfolioForm, city: e.target.value })} placeholder="Vancouver" className="h-10" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Type</label>
                      <select value={portfolioForm.property_type} onChange={(e) => setPortfolioForm({ ...portfolioForm, property_type: e.target.value })} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                        <option value="">Select...</option>
                        {PROPERTY_TYPES_LIST.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                      <select value={portfolioForm.status} onChange={(e) => setPortfolioForm({ ...portfolioForm, status: e.target.value })} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm capitalize">
                        {PORTFOLIO_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Notes</label>
                    <Input value={portfolioForm.notes} onChange={(e) => setPortfolioForm({ ...portfolioForm, notes: e.target.value })} placeholder="Primary residence, rental property..." className="h-10" />
                  </div>
                  <Button type="button" variant="outline" onClick={addPortfolioItem} disabled={!portfolioForm.address.trim()} className="gap-2 w-full">
                    <Plus className="h-4 w-4" /> Add Property
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Details ──────────────── */}
            {step === "details" && (
              <div className="space-y-5 animate-float-in">
                <SectionLabel label="Address & lead info" />
                {/* Structured Address */}
                <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-foreground/10 border border-border/30 space-y-3">
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
                      <Input value={formatPostalCode(postalCode)} onChange={(e) => handlePostalCodeChange(e.target.value)} placeholder="V5H 2N2" className="h-10" maxLength={7} />
                    </div>
                  </div>
                  {postalCode.length >= 2 && city && (
                    <p className="text-xs text-brand flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand/50" />
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

                {allContacts.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Referred by</label>
                    <select value={referredById} onChange={(e) => setReferredById(e.target.value)} className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm">
                      <option value="">Select referrer...</option>
                      {allContacts.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Social Profiles — smart handle input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium block">Social Media</label>

                  {Object.keys(socialProfiles).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(socialProfiles).map(([platform, handle]) => {
                        const cfg = SOCIAL_PLATFORMS.find(p => p.key === platform);
                        return (
                          <div key={platform} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/30 text-sm group">
                            <span>{cfg?.icon || "🔗"}</span>
                            <a href={`https://${cfg?.prefix || ""}${handle}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-medium">
                              @{handle}
                            </a>
                            <button type="button" onClick={() => removeSocialProfile(platform)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 ml-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-[#FAF8F4] dark:bg-foreground/10 border border-border/30 space-y-2">
                    <div className="flex gap-1 flex-wrap">
                      {SOCIAL_PLATFORMS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setSocialPlatform(p.key)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                            socialPlatform === p.key
                              ? "bg-brand text-white shadow-sm"
                              : socialProfiles[p.key]
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                : "bg-white dark:bg-zinc-800 border border-border/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {p.icon} {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={socialInput}
                        onChange={(e) => setSocialInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSocialProfile(); } }}
                        placeholder={`${SOCIAL_PLATFORMS.find(p => p.key === socialPlatform)?.placeholder || "handle"} or paste profile URL`}
                        className="h-9 text-sm flex-1"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addSocialProfile} disabled={!socialInput.trim()} className="h-9 px-3">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Type a handle or paste a full profile URL — platform auto-detected</p>
                  </div>
                </div>

                {/* Realtor Context — multi-entry with type tags */}
                <div className="space-y-3">
                  <label className="text-sm font-medium block">Realtor Context</label>

                  {contextEntries.length > 0 && (
                    <div className="space-y-1.5">
                      {contextEntries.map((ctx, i) => {
                        const cfg = CONTEXT_TYPES.find(c => c.key === ctx.type) || CONTEXT_TYPES[4];
                        return (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/20 text-sm group">
                            <span className="shrink-0">{cfg.emoji}</span>
                            <span className="flex-1 min-w-0">{ctx.text}</span>
                            <button type="button" onClick={() => removeContextEntry(i)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-[#FAF8F4] dark:bg-foreground/10 border border-border/30 space-y-2">
                    <div className="flex gap-1 flex-wrap">
                      {CONTEXT_TYPES.map((ct) => (
                        <button
                          key={ct.key}
                          type="button"
                          onClick={() => setCtxType(ct.key)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            ctxType === ct.key
                              ? "bg-brand text-white shadow-sm"
                              : "bg-white dark:bg-zinc-800 border border-border/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {ct.emoji} {ct.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={ctxText}
                        onChange={(e) => setCtxText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addContextEntry(); } }}
                        placeholder={
                          ctxType === "objection" ? "e.g., Thinks Kits is too expensive"
                          : ctxType === "preference" ? "e.g., Wants south-facing with mountain view"
                          : ctxType === "concern" ? "e.g., Worried about interest rates"
                          : ctxType === "timeline" ? "e.g., Needs to move by September"
                          : "e.g., Works from home, needs office space"
                        }
                        className="h-9 text-sm flex-1"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addContextEntry} disabled={!ctxText.trim()} className="h-9 px-3">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Step Navigation Buttons ────────── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
            <div>
              {stepIndex > 0 && (
                <Button variant="outline" onClick={goBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isLastStep ? (
                <Button onClick={goNext} disabled={!canGoNext()} className="gap-2 bg-brand hover:bg-brand/90">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="gap-2 h-11 px-8 text-base font-semibold bg-gradient-to-r from-[#0F7694] to-[#0F7694] hover:bg-brand-dark shadow-lg rounded-xl"
                  size="lg"
                >
                  {submitting ? "Creating..." : "Add to Network →"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Live Preview (fixed, scrollable if overflow, submit always pinned) */}
        <div className="hidden lg:block w-[340px] shrink-0">
          <div className="fixed flex flex-col" style={{ width: "340px", top: "180px", maxHeight: "calc(100vh - 200px)" }}>
            {/* Scrollable preview area */}
            <div ref={previewRef} className="flex-1 min-h-0 overflow-y-auto">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
              <LivePreviewCard
                name={name} phone={phone} email={email} type={type} channel={channel}
                notes={notes} source={source} address={fullAddress} leadStatus={leadStatus}
                budgetDisplay={formatBudget()} buyerAreas={areas} propertyTypes={propertyTypes}
                timeline={timeline} financing={financing} sellerMotivation={motivation}
                desiredPrice={desiredPrice} listDate={listDate}
                familyMembers={familyMembers} portfolioItems={portfolioItems} contextEntries={contextEntries}
              />
              <p className="text-xs text-muted-foreground text-center mt-3 mb-1 italic">
                This is how the contact will appear in your CRM
              </p>
            </div>

            {/* Submit button — always visible, pinned to bottom of preview */}
            <div className="shrink-0 pt-3">
              <Button
                disabled={!canSubmit || submitting}
                onClick={canSubmit ? handleSubmit : undefined}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#0F7694] to-[#0F7694] hover:bg-brand-dark shadow-lg rounded-xl"
                size="lg"
              >
                {submitting ? "Creating..." : canSubmit ? "Add to Network →" : "Fill required fields *"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section Label ──────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <h2 className="text-base font-semibold text-foreground">{label}</h2>
  );
}
