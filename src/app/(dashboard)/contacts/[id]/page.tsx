import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { TrackRecentView } from "@/components/shared/TrackRecentView";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare, Edit, MoreHorizontal, Building2, Clock, TrendingUp, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ContactContextPanel } from "@/components/contacts/ContactContextPanel";
import { MobileDetailSheet } from "@/components/layout/MobileDetailSheet";
import { type ReferralRow } from "@/components/contacts/ReferralsPanel";
import { NetworkStatsCard } from "@/components/contacts/NetworkStatsCard";
import { HouseholdBanner } from "@/components/contacts/HouseholdBanner";
import { QuickActionBar } from "@/components/contacts/QuickActionBar";
import { TagEditor } from "@/components/contacts/TagEditor";
import { StageBar, type StageData } from "@/components/contacts/StageBar";
import EmailComposer from "@/components/contacts/EmailComposer";
import { ContactDetailTabs } from "@/components/contacts/ContactDetailTabs";
import { JourneyProgressBar } from "@/components/contacts/JourneyProgressBar";
import { EmailHistoryTimeline } from "@/components/contacts/EmailHistoryTimeline";
import { IntelligencePanel } from "@/components/contacts/IntelligencePanel";
import { ContextLog } from "@/components/contacts/ContextLog";
import { ProspectControls } from "@/components/contacts/ProspectControls";
import { LogInteractionDialog } from "@/components/contacts/LogInteractionDialog";
import { WebsiteActivityLoader } from "@/components/contacts/WebsiteActivityLoader";
import { DeleteContactButton } from "@/components/contacts/DeleteContactButton";
import { ContactDetailLayout } from "@/components/contacts/ContactDetailLayout";
import { Button } from "@/components/ui/button";
import type { Contact, Communication, Listing, ContactDate, ContactDocument, BuyerPreferences, SellerPreferences, Demographics } from "@/types";
import type { BuyerJourney } from "@/actions/buyer-journeys";
import type { BuyerJourneyProperty } from "@/actions/buyer-journey-properties";
import type { PortfolioItem } from "@/actions/contact-portfolio";
import {
  CONTACT_TYPE_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  type ContactType,
  type LeadStatus,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getAuthenticatedTenantClient();
  const realtorId = supabase.realtorId;

  // ── Lightweight type check (1 query, minimal columns) ──────
  const { data: contactMeta } = await supabase
    .from("contacts")
    .select("type")
    .eq("id", id)
    .single();

  if (!contactMeta) notFound();

  const isSeller = contactMeta.type === "seller";
  const isBuyer = contactMeta.type === "buyer" || contactMeta.type === "dual";

  // ── Two RPC calls + ~6 conditional queries in parallel (was 28 queries) ──
  const [
    { data: detailRpc },
    { data: networkRpc },
    { data: listings },
    { data: buyerListings },
    { data: allContacts },
    { data: availableWorkflows },
    { data: allListings },
    { data: allHouseholds },
    { data: buyerJourneysData },
    { data: journeyPropertiesData },
  ] = await Promise.all([
    // RPC 1: Core contact data (contact, comms, tasks, docs, dates, family, context, portfolio, journey, household, referred-by)
    supabase.raw.rpc("get_contact_detail", { p_contact_id: id, p_realtor_id: realtorId }),
    // RPC 2: Network data (relationships, referrals, enrollments+steps, newsletters+events)
    supabase.raw.rpc("get_contact_network", { p_contact_id: id, p_realtor_id: realtorId }),
    // Seller listings (conditional — need full Listing type for stage bar)
    isSeller
      ? supabase.from("listings").select("*").eq("seller_id", id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    // Buyer listings (conditional)
    !isSeller
      ? supabase.from("listings").select("*").eq("buyer_id", id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    // All contacts (for referral/relationship selectors)
    supabase.from("contacts").select("id, name"),
    // Available workflows (active only)
    supabase.from("workflows").select("id, slug, name, is_active").eq("is_active", true).order("name", { ascending: true }),
    // All listings for buyer properties of interest
    !isSeller
      ? supabase.from("listings").select("id, address, list_price").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    // All households (for selector)
    supabase.from("households").select("id, name").order("name"),
    // Buyer journeys (conditional)
    isBuyer
      ? supabase.from("buyer_journeys")
          .select("id, status, min_price, max_price, preferred_property_types, preferred_areas, notes, created_at, updated_at")
          .eq("contact_id", id).not("status", "in", "(closed,cancelled)").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    // Buyer journey properties (conditional)
    isBuyer
      ? supabase.from("buyer_journey_properties")
          .select("id, journey_id, address, status, interest_level, list_price, notes, offer_price, offer_status, offer_date, subjects, created_at, buyer_journeys!inner(contact_id)")
          .eq("buyer_journeys.contact_id", id).order("created_at", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  // ── Unpack RPC results ─────────────────────────────────────
  const detail = (detailRpc ?? {}) as Record<string, any>;
  const network = (networkRpc ?? {}) as Record<string, any>;

  const contact = detail.contact;
  if (!contact) notFound();

  const communications = detail.communications ?? [];
  const tasks = detail.tasks ?? [];
  const contactDocuments = detail.documents ?? [];
  const contactDates = detail.dates ?? [];
  const familyMembersData = detail.family_members ?? [];
  const contactContextEntries = detail.context_entries ?? [];
  const portfolioData = detail.portfolio ?? [];
  const contactJourney = detail.journey ?? null;
  const referredByName = detail.referred_by_name ?? null;
  const household = detail.household ?? null;
  const householdMembers = (detail.household_members ?? []) as { id: string; name: string; type: string }[];

  const relationshipsData = network.relationships ?? [];
  const referralsAsReferrer = network.referrals_as_referrer ?? [];
  const referralsAsReferred = network.referrals_as_referred ?? [];
  const workflowEnrollments = network.enrollments ?? [];
  const newslettersWithEvents = network.newsletters ?? [];

  // Parse intelligence
  const intel = contact.newsletter_intelligence as Record<string, unknown> | null;

  // Extract workflow steps from enrollment data (already nested by the RPC)
  const workflowSteps = workflowEnrollments.flatMap((e: any) => e.steps ?? []);

  // Group steps by workflow_id
  type WorkflowStepRow = {
    id: string;
    workflow_id: string;
    step_order: number;
    name: string;
    action_type: string;
    delay_minutes: number;
    delay_unit: string;
    delay_value: number;
    exit_on_reply: boolean;
  };
  const stepsByWorkflow: Record<string, WorkflowStepRow[]> = {};
  for (const step of (workflowSteps ?? []) as WorkflowStepRow[]) {
    if (!stepsByWorkflow[step.workflow_id]) stepsByWorkflow[step.workflow_id] = [];
    stepsByWorkflow[step.workflow_id].push(step);
  }

  const typedListings = (listings ?? []) as Listing[];
  const typedBuyerListings = (buyerListings ?? []) as Listing[];
  const typedCommunications = (communications ?? []) as Communication[];
  const typedTasks = (tasks ?? []) as {
    id: string;
    title: string;
    status: string;
    priority: string;
    category: string;
    due_date: string | null;
    description: string | null;
    completed_at: string | null;
    created_at: string;
  }[];
  const typedDocuments = (contactDocuments ?? []) as ContactDocument[];

  // Parse buyer preferences from JSONB
  const buyerPreferences = contact.buyer_preferences
    ? (contact.buyer_preferences as unknown as BuyerPreferences)
    : null;

  // Parse seller preferences from JSONB
  const sellerPreferences = contact.seller_preferences
    ? (contact.seller_preferences as unknown as SellerPreferences)
    : null;

  // Parse tags from JSONB
  const contactTags: string[] = Array.isArray(contact.tags)
    ? (contact.tags as string[])
    : [];

  // Parse demographics from JSONB
  const demographics = ((contact as Record<string, unknown>).demographics || null) as Demographics | null;

  const leadStatus = (contact.lead_status ?? "new") as LeadStatus;

  // Check if lifecycle should be hidden:
  // - completed (sold listing exists)
  // - contact is type "other" or "partner" (not a buyer/seller)
  // - contact is cold/lost
  const lifecycleComplete =
    contact.type === "other" ||
    contact.type === "partner" ||
    contact.stage_bar === "cold" ||
    contact.lead_status === "lost" ||
    (isSeller
      ? typedListings.some((l) => l.status === "sold")
      : typedBuyerListings.some((l) => l.status === "sold"));

  // Filter to only active/paused enrollments (no completed/exited/failed)
  type EnrollmentRow = {
    id: string;
    workflow_id: string;
    status: string;
    current_step: number;
    next_run_at: string | null;
    started_at: string;
    completed_at: string | null;
    exit_reason: string | null;
    workflows: { id: string; name: string; slug: string };
  };
  const activeEnrollments = ((workflowEnrollments ?? []) as EnrollmentRow[])
    .filter((e) => e.status === "active" || e.status === "paused");

  // Priority order — lower = more important = expanded first
  const WORKFLOW_PRIORITY: Record<string, number> = {
    speed_to_contact: 1,
    open_house_followup: 2,
    buyer_nurture: 3,
    post_close_buyer: 4,
    post_close_seller: 5,
    lead_reengagement: 6,
    referral_partner: 7,
  };

  // Sort by priority — highest priority (lowest number) first
  const sortedEnrollments = [...activeEnrollments].sort((a, b) => {
    const pa = WORKFLOW_PRIORITY[a.workflows.slug] ?? 99;
    const pb = WORKFLOW_PRIORITY[b.workflows.slug] ?? 99;
    return pa - pb;
  });

  // Only expand the first (highest priority) workflow
  const expandedWorkflowId = sortedEnrollments.length > 0
    ? sortedEnrollments[0].workflow_id
    : null;

  // ── Build stage data for StageBar ──────────────────────────
  const fmt = (v: number | null | undefined) =>
    v ? Number(v).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }) : null;

  const stageData: Record<string, StageData> = isSeller
    ? {
        new: {
          sectionId: "section-contact-info",
          items: [
            { label: "Name", value: contact.name, filled: !!contact.name },
            { label: "Phone", value: contact.phone, filled: !!contact.phone },
            { label: "Email", value: contact.email, filled: !!contact.email },
            { label: "Pref Channel", value: contact.pref_channel, filled: !!contact.pref_channel },
          ],
        },
        qualified: {
          sectionId: "section-seller-preferences",
          items: [
            { label: "Motivation", value: sellerPreferences?.motivation || null, filled: !!sellerPreferences?.motivation },
            { label: "Desired Price", value: fmt(sellerPreferences?.desired_list_price as number), filled: !!sellerPreferences?.desired_list_price },
            { label: "Earliest List Date", value: sellerPreferences?.earliest_list_date || null, filled: !!sellerPreferences?.earliest_list_date },
            { label: "Occupancy", value: sellerPreferences?.occupancy || null, filled: !!sellerPreferences?.occupancy },
          ],
        },
        active_listing: {
          sectionId: "section-property-history",
          items: [
            { label: "Listings", value: typedListings.length > 0 ? `${typedListings.length} listing(s)` : null, filled: typedListings.length > 0 },
            { label: "Active Listing", value: typedListings.find((l) => l.status === "active")?.address || null, filled: typedListings.some((l) => l.status === "active") },
            { label: "List Price", value: fmt(typedListings[0]?.list_price), filled: !!typedListings[0]?.list_price },
            { label: "Showings", value: null, filled: false }, // placeholder
          ],
        },
        under_contract: {
          sectionId: "section-property-history",
          items: [
            { label: "Pending Listing", value: typedListings.find((l) => l.status === "pending")?.address || null, filled: typedListings.some((l) => l.status === "pending" || l.status === "sold") },
            { label: "Sale Price", value: fmt(typedListings.find((l) => l.status === "pending" || l.status === "sold")?.sold_price), filled: !!typedListings.find((l) => l.status === "pending" || l.status === "sold")?.sold_price },
          ],
        },
        closed: {
          sectionId: "section-property-history",
          items: [
            { label: "Sold Listing", value: typedListings.find((l) => l.status === "sold")?.address || null, filled: typedListings.some((l) => l.status === "sold") },
            { label: "Sale Price", value: fmt(typedListings.find((l) => l.status === "sold")?.sold_price), filled: !!typedListings.find((l) => l.status === "sold")?.sold_price },
            { label: "Closing Date", value: typedListings.find((l) => l.status === "sold")?.closing_date || null, filled: !!typedListings.find((l) => l.status === "sold")?.closing_date },
          ],
        },
      }
    : {
        new: {
          sectionId: "section-contact-info",
          items: [
            { label: "Name", value: contact.name, filled: !!contact.name },
            { label: "Phone", value: contact.phone, filled: !!contact.phone },
            { label: "Email", value: contact.email, filled: !!contact.email },
            { label: "Pref Channel", value: contact.pref_channel, filled: !!contact.pref_channel },
          ],
        },
        qualified: {
          sectionId: "section-buyer-preferences",
          items: [
            { label: "Budget", value: buyerPreferences?.price_range_max ? `Up to ${fmt(buyerPreferences.price_range_max)}` : null, filled: !!buyerPreferences?.price_range_max },
            { label: "Areas", value: buyerPreferences?.preferred_areas?.join(", ") || null, filled: (buyerPreferences?.preferred_areas?.length ?? 0) > 0 },
            { label: "Property Type", value: buyerPreferences?.property_types?.join(", ") || null, filled: !!buyerPreferences?.property_types?.join(", ") },
            { label: "Timeline", value: buyerPreferences?.timeline || buyerPreferences?.move_in_timeline || null, filled: !!(buyerPreferences?.timeline || buyerPreferences?.move_in_timeline) },
            { label: "Financing", value: buyerPreferences?.financing_status || null, filled: !!buyerPreferences?.financing_status },
            { label: "Pre-Approval", value: fmt(buyerPreferences?.pre_approval_amount as number), filled: !!buyerPreferences?.pre_approval_amount },
            { label: "Must-Haves", value: buyerPreferences?.must_haves?.join(", ") || null, filled: (buyerPreferences?.must_haves?.length ?? 0) > 0 },
          ],
        },
        active_search: {
          sectionId: "section-properties-interest",
          items: [
            { label: "Properties Viewed", value: typedBuyerListings.length > 0 ? `${typedBuyerListings.length} property(ies)` : null, filled: typedBuyerListings.length > 0 },
            { label: "Communications", value: typedCommunications.length > 0 ? `${typedCommunications.length} message(s)` : null, filled: typedCommunications.length > 0 },
          ],
        },
        under_contract: {
          sectionId: "section-property-history",
          items: [
            { label: "Property", value: typedBuyerListings.find((l) => l.status === "pending" || l.status === "sold")?.address || null, filled: typedBuyerListings.some((l) => l.status === "pending" || l.status === "sold") },
            { label: "Purchase Price", value: fmt(typedBuyerListings.find((l) => l.status === "pending" || l.status === "sold")?.sold_price), filled: !!typedBuyerListings.find((l) => l.status === "pending" || l.status === "sold")?.sold_price },
          ],
        },
        closed: {
          sectionId: "section-property-history",
          items: [
            { label: "Purchased", value: typedBuyerListings.find((l) => l.status === "sold")?.address || null, filled: typedBuyerListings.some((l) => l.status === "sold") },
            { label: "Purchase Price", value: fmt(typedBuyerListings.find((l) => l.status === "sold")?.sold_price), filled: !!typedBuyerListings.find((l) => l.status === "sold")?.sold_price },
            { label: "Closing Date", value: typedBuyerListings.find((l) => l.status === "sold")?.closing_date || null, filled: !!typedBuyerListings.find((l) => l.status === "sold")?.closing_date },
          ],
        },
      };

  // ── Build graph data for RelationshipGraph ──────────────────
  const graphNodes: Array<{ id: string; name: string; initials: string; type: string; isCentral: boolean; color: string }> = [];
  const graphEdges: Array<{ source: string; target: string; label: string; color: string; dashed?: boolean }> = [];

  const typeColors: Record<string, string> = {
    buyer: "#2563eb",
    seller: "#a855f7",
    partner: "#0891b2",
    other: "#6b7280",
    child: "#059669",
  };

  const getInitials = (name: string) => name.split(/\s+/).map(w => w[0]).join("").substring(0, 2).toUpperCase();
  graphNodes.push({
    id: contact.id,
    name: contact.name,
    initials: getInitials(contact.name),
    type: contact.type,
    isCentral: true,
    color: typeColors[contact.type] || "#4f35d2",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relationships = (relationshipsData ?? []) as any[];
  const seenIds = new Set<string>([contact.id]);

  for (const rel of relationships) {
    const otherId = rel.contact_a_id === id ? rel.contact_b_id : rel.contact_a_id;
    const other = rel.contact_a_id === id ? rel.contact_b : rel.contact_a;
    if (!seenIds.has(otherId) && other) {
      seenIds.add(otherId);
      graphNodes.push({
        id: otherId,
        name: other.name,
        initials: getInitials(other.name),
        type: other.type,
        isCentral: false,
        color: typeColors[other.type] || "#6b7280",
      });
    }
    graphEdges.push({
      source: rel.contact_a_id,
      target: rel.contact_b_id,
      label: rel.relationship_label || rel.relationship_type.charAt(0).toUpperCase() + rel.relationship_type.slice(1),
      color: typeColors[other?.type ?? "other"] || "#6b7280",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allReferrals = [...(referralsAsReferrer ?? []), ...(referralsAsReferred ?? [])] as any[];
  for (const ref of allReferrals) {
    const otherId = ref.referred_by_contact_id === id ? ref.referred_client_contact_id : ref.referred_by_contact_id;
    const otherContact = ref.referred_by_contact_id === id ? ref.referred_client : ref.referrer;
    if (!seenIds.has(otherId) && otherContact) {
      seenIds.add(otherId);
      graphNodes.push({
        id: otherId,
        name: otherContact.name,
        initials: getInitials(otherContact.name),
        type: otherContact.type || "other",
        isCentral: false,
        color: "#d97706",
      });
    }
    if (otherContact) {
      graphEdges.push({
        source: ref.referred_by_contact_id,
        target: ref.referred_client_contact_id,
        label: "Referred",
        color: "#d97706",
        dashed: true,
      });
    }
  }

  for (const member of householdMembers) {
    if (!seenIds.has(member.id)) {
      seenIds.add(member.id);
      graphNodes.push({
        id: member.id,
        name: member.name,
        initials: getInitials(member.name),
        type: member.type,
        isCentral: false,
        color: typeColors[member.type] || "#6b7280",
      });
      graphEdges.push({
        source: contact.id,
        target: member.id,
        label: "Household",
        color: "#4f35d2",
        dashed: true,
      });
    }
  }

  // Calculate network stats
  const networkValue = allReferrals.reduce((sum: number) => sum, 0);

  const totalDemoFields = 9;
  const filledDemoFields = demographics ? Object.values(demographics).filter(v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)).length : 0;
  const dataScore = Math.round(((filledDemoFields / totalDemoFields) * 50) + (relationships.length > 0 ? 25 : 0) + ((contactDates?.length ?? 0) > 0 ? 25 : 0));

  // Compute engagement score + last contacted for header
  const engagementScore = (intel as Record<string, unknown> | null)?.engagement_score as number | undefined;
  const scoreLabel = engagementScore != null ? (engagementScore >= 60 ? "Hot" : engagementScore >= 30 ? "Warm" : "Cold") : null;
  const scoreColor = engagementScore != null ? (engagementScore >= 60 ? "bg-destructive/15 text-destructive border-destructive/30" : engagementScore >= 30 ? "bg-[#f5c26b]/15 text-[#8a5a1e] border-[#f5c26b]/30" : "bg-muted text-muted-foreground") : "";

  const lastComm = typedCommunications.length > 0 ? typedCommunications[0] : null;
  const lastContactedText = lastComm
    ? `Last contact: ${new Date(lastComm.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })} via ${lastComm.channel}`
    : "No contact history";

  const avatarColor = contact.type === "seller" ? "bg-brand" : contact.type === "buyer" ? "bg-primary" : "bg-[#516f90]";

  // Build header JSX (measured by useAutoLayout in ContactDetailLayout)
  const headerJsx = (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1" aria-label="Breadcrumb">
        <a href="/contacts" className="hover:text-foreground transition-colors">Contacts</a>
        <span>/</span>
        <span className="text-foreground">{contact.name}</span>
      </nav>

      {/* Contact Card Header */}
      <div id="section-contact-info" className="relative z-20">
            <Card className="border border-border overflow-visible">
              <CardContent className="p-4">
                {/* Row 1: Avatar + Name + Badges + Meta */}
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                    {contact.name.split(/\s+/).map((w: string) => w[0]).filter(Boolean).join("").substring(0, 2).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold tracking-tight">{contact.name}</h1>
                      <Badge variant="secondary" className={`text-sm ${LEAD_STATUS_COLORS[leadStatus] ?? ""}`}>
                        {LEAD_STATUS_LABELS[leadStatus] ?? leadStatus}
                      </Badge>
                      <Badge variant="secondary" className={CONTACT_TYPE_COLORS[contact.type as ContactType]}>
                        {contact.type}
                      </Badge>
                      {scoreLabel && (
                        <Badge variant="outline" className={`${scoreColor} text-[10px]`}>{scoreLabel} {engagementScore}</Badge>
                      )}
                      <TagEditor contactId={id} tags={contactTags} />
                    </div>

                    {/* Contact info — labeled */}
                    <div className="flex items-center gap-4 text-sm mt-1.5 flex-wrap">
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{contact.phone}</span>
                      </a>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{contact.email}</span>
                        </a>
                      )}
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="capitalize">Prefers {contact.pref_channel}</span>
                      </span>
                    </div>

                    {/* Last contacted + social */}
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">{lastContactedText}</span>
                      {contact.social_profiles && typeof contact.social_profiles === "object" && Object.keys(contact.social_profiles as Record<string, string>).length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {Object.entries(contact.social_profiles as Record<string, string>).map(([platform, handle]) => {
                            const icons: Record<string, string> = { instagram: "📸", facebook: "📘", linkedin: "💼", twitter: "𝕏", tiktok: "🎵", youtube: "▶️" };
                            const urls: Record<string, string> = { instagram: "instagram.com/", facebook: "facebook.com/", linkedin: "linkedin.com/in/", twitter: "x.com/", tiktok: "tiktok.com/@", youtube: "youtube.com/@" };
                            return (
                              <a key={platform} href={`https://${urls[platform] || ""}${handle}`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-muted-foreground hover:text-brand transition-colors" title={`@${handle} on ${platform}`}>
                                <span>{icons[platform] || "🔗"}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions — Edit prominent, destructive actions in More menu */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ContactForm
                      contact={contact}
                      allContacts={(allContacts ?? []) as { id: string; name: string }[]}
                      trigger={<Button variant="outline" size="sm"><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button>}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="text-destructive focus:text-destructive" asChild>
                          <div><DeleteContactButton contactId={id} contactName={contact.name} variant="menuItem" /></div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Row 2: Pipeline bar or Convert button */}
                <div className="mt-3 pt-2 border-t border-border">
                  {contact.type === "customer" ? (
                    <div className="flex items-center gap-2 p-3 bg-brand-muted border border-brand/20 rounded-lg">
                      <span className="text-sm text-brand-dark font-medium flex-1">Unqualified lead — convert when ready:</span>
                      <form action={async () => {
                        "use server";
                        const { convertContactType } = await import("@/actions/contacts");
                        await convertContactType(id, "buyer");
                      }}>
                        <button type="submit" className="text-sm px-3 py-1.5 rounded-md bg-brand text-white font-medium hover:bg-brand-dark">Convert to Buyer</button>
                      </form>
                      <form action={async () => {
                        "use server";
                        const { convertContactType } = await import("@/actions/contacts");
                        await convertContactType(id, "seller");
                      }}>
                        <button type="submit" className="text-sm px-3 py-1.5 rounded-md bg-brand text-white font-medium hover:bg-brand-dark">Convert to Seller</button>
                      </form>
                    </div>
                  ) : (
                    <StageBar
                      contactId={id}
                      contactType={contact.type}
                      currentStage={contact.stage_bar as string | null}
                      stageData={stageData}
                    />
                  )}
                </div>
                {contact.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{contact.notes}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* KPI Stat Cards — Dashboard style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-brand">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Lead Score</p>
                  <p className="text-xl font-semibold text-foreground">{engagementScore ?? "—"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-[#f5c26b]">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[#f5c26b]/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-[#8a5a1e]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Network</p>
                  <p className="text-xl font-semibold text-foreground">{relationships.length + allReferrals.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-success">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Portfolio</p>
                  <p className="text-xl font-semibold text-foreground">{(portfolioData ?? []).length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Contact</p>
                  <p className="text-sm font-semibold text-foreground">{lastContactedText}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Household Banner — only show when assigned */}
          {household && (
            <HouseholdBanner
              contactId={contact.id}
              household={household}
              householdMembers={householdMembers as { id: string; name: string; type: string }[]}
              allHouseholds={(allHouseholds ?? []) as { id: string; name: string }[]}
            />
          )}

          {/* Mobile: Details button to open right panel in sheet */}
          <MobileDetailSheet title="Details">
            <ContactContextPanel
              contact={contact}
              communications={typedCommunications}
              contactDates={(contactDates ?? []) as ContactDate[]}
            />
          </MobileDetailSheet>

          {/* Quick Action Bar — grouped: primary communication + secondary tools */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1">
              <QuickActionBar
                contactId={id}
                contactPhone={contact.phone}
                contactChannel={contact.pref_channel}
              />
              <EmailComposer
                contactId={id}
                contactEmail={contact.email}
              />
            </div>
          </div>

          {/* Journey Progress Bar */}
          {contactJourney && (
            <JourneyProgressBar
              contactType={contact.type}
              currentPhase={contactJourney.current_phase}
              engagementScore={(intel as Record<string, unknown> | null)?.engagement_score as number ?? 0}
              phaseEnteredAt={contactJourney.phase_entered_at}
              enrolledAt={contactJourney.created_at}
            />
          )}

          {/* Prospect 360 — Email History + Quick Log */}
          {newslettersWithEvents.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Email History</h3>
                <EmailHistoryTimeline newsletters={newslettersWithEvents as any} />
              </CardContent>
            </Card>
          )}

    </>
  );

  // Build tabs JSX (placed in scrollable area by ContactDetailLayout)
  const tabsJsx = (
          <ContactDetailTabs
            contactId={id}
            contact={contact}
            isSeller={isSeller}
            sortedEnrollments={sortedEnrollments}
            stepsByWorkflow={stepsByWorkflow}
            expandedWorkflowId={expandedWorkflowId}

            listings={typedListings}
            buyerListings={typedBuyerListings}
            communications={typedCommunications}
            buyerPreferences={buyerPreferences}
            sellerPreferences={sellerPreferences}
            allListings={(allListings ?? []) as { id: string; address: string; list_price: number | null }[]}
            tasks={typedTasks}
            demographics={demographics}
            graphNodes={graphNodes}
            graphEdges={graphEdges}
            connectionCount={relationships.length}
            referralCount={allReferrals.length}
            networkValue={networkValue}
            dataScore={dataScore}
            contactDates={(contactDates ?? []) as ContactDate[]}
            contactName={contact.name}
            activities={[]}
            referredByName={referredByName}
            referralsAsReferrer={(referralsAsReferrer ?? []) as ReferralRow[]}
            referralsAsReferred={(referralsAsReferred ?? []) as ReferralRow[]}
            allContacts={(allContacts ?? []) as { id: string; name: string }[]}
            documents={typedDocuments}
            contextEntries={(contactContextEntries ?? []) as Array<{ id: string; context_type: string; text: string; is_resolved: boolean; resolved_note: string | null; created_at: string }>}
            familyMembers={(familyMembersData ?? []) as import("@/types").ContactFamilyMember[]}
            relationships={relationships}
            isBuyer={isBuyer}
            buyerJourneys={(buyerJourneysData ?? []) as BuyerJourney[]}
            recentJourneyProperties={(journeyPropertiesData ?? []) as BuyerJourneyProperty[]}
            portfolioItems={(portfolioData ?? []) as PortfolioItem[]}
            newslettersWithEvents={(newslettersWithEvents ?? []) as any}
          />
  );

  // Right panel inner content — shared between mobile collapsible and desktop aside
  const rightPanelContentJsx = (
    <>
      {/* Engagement — 1st section */}
      {intel && (
        <div className="pb-3 border-b border-brand/15 dark:border-foreground/30 border-l-4 border-l-primary pl-4 rounded-sm shrink-0">
          <IntelligencePanel
            intelligence={intel}
            totalEmails={newslettersWithEvents.length}
          />
        </div>
      )}

      {/* Prospect Controls — journey pause/resume, trust, frequency */}
      {(contactJourney || contact.type === "buyer" || contact.type === "seller") && (
        <div className="pb-3 border-b border-brand/15 dark:border-foreground/30 border-l-4 border-l-brand pl-4 rounded-sm shrink-0">
          <ProspectControls
            contactId={id}
            contactName={contact.name}
            journey={contactJourney as { id: string; journey_type: string; current_phase: string; is_paused: boolean; send_mode: string; next_email_at: string | null; trust_level: number } | null}
            aiContextNotes={(contact as Record<string, unknown>).ai_context_notes as string | null}
          />
        </div>
      )}

      {/* Quick Log — compact trigger that opens full form in dialog */}
      <div className="pb-3 border-b border-brand/15 dark:border-foreground/30 border-l-4 border-l-primary pl-4 rounded-sm shrink-0">
        <LogInteractionDialog
          contactId={id}
          contactName={contact.name}
          recentEmails={(newslettersWithEvents ?? [])
            .filter((nl: Record<string, unknown>) => nl.status === "sent")
            .slice(0, 5)
            .map((nl: Record<string, unknown>) => ({
              id: nl.id as string,
              subject: nl.subject as string,
              sent_at: nl.sent_at as string | null,
            }))}
        />
      </div>

      {/* Network Stats — 2nd section */}
      <div className="border-b border-brand/20 dark:border-brand/10 pb-3 pt-3 border-l-4 border-l-primary pl-4 rounded-sm shrink-0">
        <NetworkStatsCard
          connectionCount={relationships.length}
          referralCount={allReferrals.length}
          networkValue={networkValue}
          dataScore={dataScore}
          demographics={demographics}
          dateCount={(contactDates ?? []).length}
          hasPreferences={!!(buyerPreferences || sellerPreferences)}
        />
      </div>

      {/* Referrals + Relationships moved to Overview tab (ContactDetailTabs) */}
    </>
  );

  // Mobile: collapsible sidebar panels (rendered inside center column by ContactDetailLayout)
  const mobileRightPanelJsx = (
    <div className="lg:hidden border-t border-border mt-4">
      <details className="group">
        <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors">
          <span>👤 Profile & Intelligence</span>
          <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-4 bg-card space-y-4 border-t border-border overflow-y-auto max-h-[60vh]">
          {rightPanelContentJsx}
        </div>
      </details>
    </div>
  );

  // Desktop: fixed right panel
  const rightPanelJsx = (
    <aside className="hidden lg:block w-[320px] shrink-0 border-l border-border p-4 bg-card overflow-y-auto space-y-4">
      {rightPanelContentJsx}
    </aside>
  );

  return (
    <>
      <TrackRecentView id={contact.id} type="contact" label={contact.name} href={`/contacts/${contact.id}`} />
      <ContactDetailLayout
        header={headerJsx}
        tabs={tabsJsx}
        rightPanel={rightPanelJsx}
        mobileRightPanel={mobileRightPanelJsx}
      />
    </>
  );
}
