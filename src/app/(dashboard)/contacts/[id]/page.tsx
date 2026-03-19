import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageSquare, Edit } from "lucide-react";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ContactWorkflow } from "@/components/contacts/ContactWorkflow";
import { ContactContextPanel } from "@/components/contacts/ContactContextPanel";
import { CommunicationTimeline } from "@/components/contacts/CommunicationTimeline";
import { PropertyHistoryPanel } from "@/components/contacts/PropertyHistoryPanel";
import { ReferralsPanel, type ReferralRow } from "@/components/contacts/ReferralsPanel";
import { FamilyMembersPanel } from "@/components/contacts/FamilyMembersPanel";
import { SellerEarningsSummary } from "@/components/contacts/SellerEarningsSummary";
import { BuyerPreferencesPanel } from "@/components/contacts/BuyerPreferencesPanel";
import { SellerPreferencesPanel } from "@/components/contacts/SellerPreferencesPanel";
import { QuickActionBar } from "@/components/contacts/QuickActionBar";
import { TagEditor } from "@/components/contacts/TagEditor";
import { StageBar, type StageData } from "@/components/contacts/StageBar";
import { ContactTasksPanel } from "@/components/contacts/ContactTasksPanel";
import { ContactDocumentsPanel } from "@/components/contacts/ContactDocumentsPanel";
import { PropertiesOfInterestPanel } from "@/components/contacts/PropertiesOfInterestPanel";
import { WorkflowStepperCard } from "@/components/contacts/WorkflowStepperCard";
import EmailComposer from "@/components/contacts/EmailComposer";
import ActivityTimeline from "@/components/contacts/ActivityTimeline";
import { Button } from "@/components/ui/button";
import type { Contact, Communication, Listing, ContactDate, ContactDocument, FamilyMember, BuyerPreferences, SellerPreferences } from "@/types";
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
  const supabase = createAdminClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  const isSeller = contact.type === "seller";

  // ── Single parallel batch: ALL queries at once ─────────────
  // No waterfalls — everything fetched in one round-trip
  const [
    { data: communications },
    { data: listings },
    { data: contactDates },
    { data: allContacts },
    { data: buyerListings },
    { data: tasks },
    { data: contactDocuments },
    { data: referralsAsReferrer },
    { data: referralsAsReferred },
    { data: workflowEnrollments },
    { data: availableWorkflows },
    { data: activityLog },
    { data: allListings },
    { data: referredByContact },
  ] = await Promise.all([
    // 1. Communications — limit to recent 50
    supabase
      .from("communications")
      .select("id, contact_id, direction, channel, body, related_id, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    // 2. Seller listings (skip for buyers)
    isSeller
      ? supabase
          .from("listings")
          .select("*")
          .eq("seller_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    // 3. Contact dates
    supabase
      .from("contact_dates")
      .select("id, contact_id, label, date, notes")
      .eq("contact_id", id)
      .order("date", { ascending: true }),
    // 4. All contacts (id, name only — for referral selectors)
    supabase
      .from("contacts")
      .select("id, name"),
    // 5. Buyer listings (skip for sellers)
    !isSeller
      ? supabase
          .from("listings")
          .select("*")
          .eq("buyer_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    // 6. Tasks
    supabase
      .from("tasks")
      .select("id, contact_id, title, status, priority, category, due_date, notes, completed_at, created_at")
      .eq("contact_id", id)
      .order("due_date", { ascending: true }),
    // 7. Contact documents
    supabase
      .from("contact_documents")
      .select("id, contact_id, doc_type, file_name, file_url, uploaded_at, notes")
      .eq("contact_id", id)
      .order("uploaded_at", { ascending: false }),
    // 8. Referrals as referrer
    supabase
      .from("referrals")
      .select("*, referred_client:contacts!referred_client_contact_id(id, name, type), closed_deal:listings!closed_deal_id(id, address)")
      .eq("referred_by_contact_id", id)
      .order("referral_date", { ascending: false }),
    // 9. Referrals as referred
    supabase
      .from("referrals")
      .select("*, referrer:contacts!referred_by_contact_id(id, name, type), closed_deal:listings!closed_deal_id(id, address)")
      .eq("referred_client_contact_id", id)
      .order("referral_date", { ascending: false }),
    // 10. Workflow enrollments (was waterfall 2)
    supabase
      .from("workflow_enrollments")
      .select("*, workflows(id, name, slug)")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    // 11. Available workflows (was waterfall 2)
    supabase
      .from("workflows")
      .select("id, slug, name, is_active")
      .order("name", { ascending: true }),
    // 12. Activity log (was waterfall 3)
    supabase
      .from("activity_log")
      .select("id, contact_id, listing_id, activity_type, description, metadata, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    // 13. All listings for properties of interest (was waterfall 4)
    !isSeller
      ? supabase
          .from("listings")
          .select("id, address, list_price")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    // 14. Referred-by contact name (was waterfall 5)
    contact.referred_by_id
      ? supabase
          .from("contacts")
          .select("name")
          .eq("id", contact.referred_by_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const referredByName = referredByContact?.name ?? null;

  // ── Workflow steps — only sequential query (depends on enrollment IDs) ──
  const activeEnrollmentWorkflowIds = (workflowEnrollments ?? [])
    .filter((e: { status: string }) => e.status === "active" || e.status === "paused")
    .map((e: { workflow_id: string }) => e.workflow_id);

  const { data: workflowSteps } = activeEnrollmentWorkflowIds.length > 0
    ? await supabase
        .from("workflow_steps")
        .select("id, workflow_id, step_order, name, action_type, delay_minutes, delay_unit, delay_value, exit_on_reply")
        .in("workflow_id", activeEnrollmentWorkflowIds)
        .order("step_order", { ascending: true })
    : { data: [] as never[] };

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
    notes: string | null;
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

  const leadStatus = (contact.lead_status ?? "new") as LeadStatus;

  // Check if lifecycle is completed (all steps done) — used to hide the lifecycle card
  const lifecycleComplete = isSeller
    ? typedListings.some((l) => l.status === "sold")
    : typedBuyerListings.some((l) => l.status === "sold");

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
            { label: "Sale Price", value: fmt(typedListings.find((l) => l.status === "pending" || l.status === "sold")?.sale_price), filled: !!typedListings.find((l) => l.status === "pending" || l.status === "sold")?.sale_price },
          ],
        },
        closed: {
          sectionId: "section-property-history",
          items: [
            { label: "Sold Listing", value: typedListings.find((l) => l.status === "sold")?.address || null, filled: typedListings.some((l) => l.status === "sold") },
            { label: "Sale Price", value: fmt(typedListings.find((l) => l.status === "sold")?.sale_price), filled: !!typedListings.find((l) => l.status === "sold")?.sale_price },
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
            { label: "Budget", value: buyerPreferences?.max_price ? `Up to ${fmt(buyerPreferences.max_price)}` : null, filled: !!buyerPreferences?.max_price },
            { label: "Areas", value: buyerPreferences?.preferred_areas?.join(", ") || null, filled: (buyerPreferences?.preferred_areas?.length ?? 0) > 0 },
            { label: "Property Type", value: buyerPreferences?.property_type || null, filled: !!buyerPreferences?.property_type },
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
            { label: "Purchase Price", value: fmt(typedBuyerListings.find((l) => l.status === "pending" || l.status === "sold")?.sale_price), filled: !!typedBuyerListings.find((l) => l.status === "pending" || l.status === "sold")?.sale_price },
          ],
        },
        closed: {
          sectionId: "section-property-history",
          items: [
            { label: "Purchased", value: typedBuyerListings.find((l) => l.status === "sold")?.address || null, filled: typedBuyerListings.some((l) => l.status === "sold") },
            { label: "Purchase Price", value: fmt(typedBuyerListings.find((l) => l.status === "sold")?.sale_price), filled: !!typedBuyerListings.find((l) => l.status === "sold")?.sale_price },
            { label: "Closing Date", value: typedBuyerListings.find((l) => l.status === "sold")?.closing_date || null, filled: !!typedBuyerListings.find((l) => l.status === "sold")?.closing_date },
          ],
        },
      };

  return (
    <div className="flex h-full">
      {/* CENTER -- scrollable */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-background to-teal-50/20 dark:from-background dark:via-background dark:to-teal-950/10">
        <div className="space-y-5">
          {/* Header Card — gradient accent strip */}
          <Card id="section-contact-info" className="animate-float-in overflow-hidden shadow-md border-0">
            <div className="h-1.5 bg-gradient-to-r from-teal-500 via-indigo-500 to-violet-500" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">
                      {contact.name}
                    </h1>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${LEAD_STATUS_COLORS[leadStatus] ?? ""}`}
                    >
                      {LEAD_STATUS_LABELS[leadStatus] ?? leadStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{contact.phone}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className={CONTACT_TYPE_COLORS[contact.type as ContactType]}
                    >
                      {contact.type}
                    </Badge>
                    <Badge variant="outline">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {contact.pref_channel}
                    </Badge>
                    {buyerPreferences?.pre_approval_amount && !isSeller && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs"
                      >
                        Pre-Approved{" "}
                        {Number(buyerPreferences.pre_approval_amount).toLocaleString(
                          "en-CA",
                          {
                            style: "currency",
                            currency: "CAD",
                            maximumFractionDigits: 0,
                          }
                        )}
                      </Badge>
                    )}
                  </div>
                  {/* Tags */}
                  <div className="mt-2">
                    <TagEditor contactId={id} tags={contactTags} />
                  </div>
                  {/* Stage Bar */}
                  <StageBar
                    contactId={id}
                    contactType={contact.type as "buyer" | "seller"}
                    currentStage={contact.stage_bar as string | null}
                    stageData={stageData}
                  />
                  {contact.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {contact.notes}
                    </p>
                  )}
                </div>
                <ContactForm
                  contact={contact}
                  allContacts={(allContacts ?? []) as { id: string; name: string }[]}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Action Bar — colored icon buttons */}
          <div className="flex items-center gap-2 px-1">
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

          {/* Active workflow enrollments — highest priority expanded, rest collapsed */}
          {sortedEnrollments.map((enrollment) => (
            <Card
              key={enrollment.id}
              className="border-l-4 border-l-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10"
            >
              <CardContent className="p-6">
                <WorkflowStepperCard
                  enrollment={enrollment}
                  steps={stepsByWorkflow[enrollment.workflow_id] ?? []}
                  defaultCollapsed={enrollment.workflow_id !== expandedWorkflowId}
                />
              </CardContent>
            </Card>
          ))}

          {/* Contact Lifecycle Workflow — hidden when fully completed */}
          {!lifecycleComplete && (
            <Card className="border-l-4 border-l-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
              <CardContent className="p-6">
                <ContactWorkflow
                  contact={contact}
                  listings={typedListings}
                  communications={typedCommunications}
                  buyerListings={typedBuyerListings}
                />
              </CardContent>
            </Card>
          )}

          {/* Post-lifecycle content */}
          {isSeller ? (
            <>
              {/* Seller Preferences */}
              <Card id="section-seller-preferences" className="border-l-4 border-l-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10">
                <CardContent className="p-6">
                  <SellerPreferencesPanel
                    contactId={id}
                    preferences={sellerPreferences}
                  />
                </CardContent>
              </Card>
              {/* Seller Earnings Summary */}
              {typedListings.some((l) => l.status === "sold") && (
                <Card className="border-l-4 border-l-amber-400 bg-amber-50/20 dark:bg-amber-950/10">
                  <CardContent className="p-6">
                    <SellerEarningsSummary listings={typedListings} />
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            /* Buyer Preferences */
            <Card id="section-buyer-preferences" className="border-l-4 border-l-teal-400 bg-teal-50/20 dark:bg-teal-950/10">
              <CardContent className="p-6">
                <BuyerPreferencesPanel
                  contactId={id}
                  preferences={buyerPreferences}
                />
              </CardContent>
            </Card>
          )}

          {/* Properties of Interest (buyers only) */}
          {!isSeller && (
            <Card id="section-properties-interest" className="bg-sky-50/20 dark:bg-sky-950/10">
              <CardContent className="p-6">
                <PropertiesOfInterestPanel
                  contactId={id}
                  preferences={buyerPreferences}
                  listings={(allListings ?? []) as { id: string; address: string; list_price: number | null }[]}
                />
              </CardContent>
            </Card>
          )}

          {/* Property History */}
          {(isSeller ? typedListings.length > 0 : typedBuyerListings.length > 0) && (
            <Card id="section-property-history" className="bg-violet-50/15 dark:bg-violet-950/10">
              <CardContent className="p-6">
                <PropertyHistoryPanel
                  listings={isSeller ? typedListings : typedBuyerListings}
                  contactType={contact.type}
                />
              </CardContent>
            </Card>
          )}

          {/* Tasks & Follow-ups */}
          <Card className="border-l-4 border-l-orange-400 bg-orange-50/15 dark:bg-orange-950/10">
            <CardContent className="p-6">
              <ContactTasksPanel contactId={id} tasks={typedTasks} />
            </CardContent>
          </Card>

          {/* Activity Log */}
          {(activityLog ?? []).length > 0 && (
            <Card className="bg-slate-50/40 dark:bg-slate-950/10">
              <CardContent className="p-6">
                <ActivityTimeline
                  activities={
                    (activityLog ?? []) as {
                      id: string;
                      activity_type: string;
                      description: string | null;
                      metadata: Record<string, unknown> | null;
                      created_at: string;
                    }[]
                  }
                />
              </CardContent>
            </Card>
          )}

          {/* Communication Timeline (with filter tabs) */}
          <CommunicationTimeline
            contactId={id}
            communications={typedCommunications}
          />
        </div>
      </div>

      {/* RIGHT PANEL -- fixed, own scroll */}
      <aside className="hidden lg:block w-[340px] shrink-0 border-l overflow-y-auto p-6 space-y-5 bg-gradient-to-b from-slate-50 via-white to-teal-50/30 dark:from-card/50 dark:via-card/30 dark:to-teal-950/10">
        <ContactContextPanel
          contact={contact}
          communications={typedCommunications}
          contactDates={(contactDates ?? []) as ContactDate[]}
        />

        {/* Family Members */}
        <div className="border-t pt-5">
          <FamilyMembersPanel
            contactId={contact.id}
            familyMembers={
              (Array.isArray(contact.family_members)
                ? contact.family_members
                : []) as FamilyMember[]
            }
          />
        </div>

        {/* Referrals */}
        <div className="border-t pt-5">
          <ReferralsPanel
            contact={contact}
            referredByName={referredByName}
            referralsAsReferrer={(referralsAsReferrer ?? []) as ReferralRow[]}
            referralsAsReferred={(referralsAsReferred ?? []) as ReferralRow[]}
            allContacts={(allContacts ?? []) as { id: string; name: string }[]}
          />
        </div>

        {/* Contact Documents */}
        <div className="border-t pt-5">
          <ContactDocumentsPanel
            contactId={id}
            documents={typedDocuments}
          />
        </div>
      </aside>
    </div>
  );
}
