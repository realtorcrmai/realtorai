"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { CommunicationTimeline } from "@/components/contacts/CommunicationTimeline";
import { PropertyHistoryPanel } from "@/components/contacts/PropertyHistoryPanel";
import { ReferralsPanel, type ReferralRow } from "@/components/contacts/ReferralsPanel";
import { DemographicsPanel } from "@/components/contacts/DemographicsPanel";
import RelationshipGraph from "@/components/contacts/RelationshipGraph";
import { NetworkStatsCard } from "@/components/contacts/NetworkStatsCard";
import { UpcomingEventsCard } from "@/components/contacts/UpcomingEventsCard";
import { SellerEarningsSummary } from "@/components/contacts/SellerEarningsSummary";
import { BuyerPreferencesPanel } from "@/components/contacts/BuyerPreferencesPanel";
import { SellerPreferencesPanel } from "@/components/contacts/SellerPreferencesPanel";
import { ContactTasksPanel } from "@/components/contacts/ContactTasksPanel";
import { ContactDocumentsPanel } from "@/components/contacts/ContactDocumentsPanel";
import { PropertiesOfInterestPanel } from "@/components/contacts/PropertiesOfInterestPanel";
import { WorkflowStepperCard } from "@/components/contacts/WorkflowStepperCard";
import ActivityTimeline from "@/components/contacts/ActivityTimeline";
import type {
  Contact,
  Communication,
  Listing,
  ContactDate,
  ContactDocument,
  BuyerPreferences,
  SellerPreferences,
  Demographics,
} from "@/types";

// ── Shared sub-types ────────────────────────────────────────
type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  due_date: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type GraphNode = {
  id: string;
  name: string;
  initials: string;
  type: string;
  isCentral: boolean;
  color: string;
};

type GraphEdge = {
  source: string;
  target: string;
  label: string;
  color: string;
  dashed?: boolean;
};

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

// ── Props ───────────────────────────────────────────────────
export type ContactDetailTabsProps = {
  // Identity
  contactId: string;
  contact: Contact;
  isSeller: boolean;

  // Overview tab
  sortedEnrollments: EnrollmentRow[];
  stepsByWorkflow: Record<string, WorkflowStepRow[]>;
  expandedWorkflowId: string | null;
  lifecycleComplete: boolean;
  listings: Listing[];
  buyerListings: Listing[];
  communications: Communication[];
  buyerPreferences: BuyerPreferences | null;
  sellerPreferences: SellerPreferences | null;
  allListings: { id: string; address: string; list_price: number | null }[];
  tasks: TaskRow[];

  // Intelligence tab
  demographics: Demographics | null;
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  connectionCount: number;
  referralCount: number;
  networkValue: number;
  dataScore: number;
  contactDates: ContactDate[];
  contactName: string;

  // Activity tab
  activities: ActivityRow[];

  // Deals tab
  referredByName: string | null;
  referralsAsReferrer: ReferralRow[];
  referralsAsReferred: ReferralRow[];
  allContacts: { id: string; name: string }[];
  documents: ContactDocument[];
};

// ── Inner component (needs useSearchParams wrapped in Suspense) ──
function ContactDetailTabsInner(props: ContactDetailTabsProps) {
  const {
    contactId,
    contact,
    isSeller,
    // Overview
    sortedEnrollments,
    stepsByWorkflow,
    expandedWorkflowId,
    lifecycleComplete,
    listings,
    buyerListings,
    communications,
    buyerPreferences,
    sellerPreferences,
    allListings,
    tasks,
    // Intelligence
    demographics,
    graphNodes,
    graphEdges,
    connectionCount,
    referralCount,
    networkValue,
    dataScore,
    contactDates,
    contactName,
    // Activity
    activities,
    // Deals
    referredByName,
    referralsAsReferrer,
    referralsAsReferred,
    allContacts,
    documents,
  } = props;

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = searchParams.get("tab") || "overview";

  const setTab = (value: unknown) => {
    const tab = value as string;
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <Tabs defaultValue={currentTab} value={currentTab} onValueChange={setTab}>
      <TabsList className="w-full justify-start bg-white/60 backdrop-blur border rounded-xl p-1 mb-4">
        <TabsTrigger value="overview" className="rounded-lg">
          📋 Overview
        </TabsTrigger>
        <TabsTrigger value="intelligence" className="rounded-lg">
          🧠 Intelligence
        </TabsTrigger>
        <TabsTrigger value="activity" className="rounded-lg">
          💬 Activity
        </TabsTrigger>
        <TabsTrigger value="deals" className="rounded-lg">
          🏠 Deals
        </TabsTrigger>
      </TabsList>

      {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
      <TabsContent value="overview">
        <div className="space-y-5">
          {/* Active workflow enrollments */}
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

          {/* Seller / Buyer Preferences */}
          {isSeller ? (
            <Card
              id="section-seller-preferences"
              className="border-l-4 border-l-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10"
            >
              <CardContent className="p-6">
                <SellerPreferencesPanel
                  contactId={contactId}
                  preferences={sellerPreferences}
                />
              </CardContent>
            </Card>
          ) : (
            <Card
              id="section-buyer-preferences"
              className="border-l-4 border-l-teal-400 bg-teal-50/20 dark:bg-teal-950/10"
            >
              <CardContent className="p-6">
                <BuyerPreferencesPanel
                  contactId={contactId}
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
                  contactId={contactId}
                  preferences={buyerPreferences}
                  listings={allListings}
                />
              </CardContent>
            </Card>
          )}

          {/* Tasks & Follow-ups */}
          <Card className="border-l-4 border-l-orange-400 bg-orange-50/15 dark:bg-orange-950/10">
            <CardContent className="p-6">
              <ContactTasksPanel contactId={contactId} tasks={tasks} />
            </CardContent>
          </Card>

          {/* Referrals */}
          <Card className="bg-white/60 dark:bg-card/40">
            <CardContent className="p-6">
              <ReferralsPanel
                contact={contact}
                referredByName={referredByName}
                referralsAsReferrer={referralsAsReferrer}
                referralsAsReferred={referralsAsReferred}
                allContacts={allContacts}
              />
            </CardContent>
          </Card>

          {/* Contact Documents */}
          <Card className="bg-white/60 dark:bg-card/40">
            <CardContent className="p-6">
              <ContactDocumentsPanel
                contactId={contactId}
                documents={documents}
              />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ── INTELLIGENCE TAB ─────────────────────────────────── */}
      <TabsContent value="intelligence">
        <div className="space-y-5">
          {/* Demographics Panel */}
          <Card className="border-l-4 border-l-violet-400 bg-violet-50/20 dark:bg-violet-950/10">
            <CardContent className="p-6">
              <DemographicsPanel
                contactId={contactId}
                demographics={demographics}
              />
            </CardContent>
          </Card>

          {/* Relationship Graph */}
          {graphNodes.length > 1 && (
            <Card className="border-l-4 border-l-indigo-400 bg-indigo-50/15 dark:bg-indigo-950/10">
              <CardContent className="p-6">
                <RelationshipGraph
                  nodes={graphNodes as any}
                  edges={graphEdges as any}
                />
              </CardContent>
            </Card>
          )}

          {/* Network Stats + Upcoming Events */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-teal-400 bg-teal-50/15 dark:bg-teal-950/10">
              <CardContent className="p-6">
                <NetworkStatsCard
                  connectionCount={connectionCount}
                  referralCount={referralCount}
                  networkValue={networkValue}
                  dataScore={dataScore}
                  demographics={demographics}
                  dateCount={contactDates.length}
                  hasPreferences={!!(buyerPreferences || sellerPreferences)}
                />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-400 bg-amber-50/15 dark:bg-amber-950/10">
              <CardContent className="p-6">
                <UpcomingEventsCard
                  contactDates={contactDates}
                  demographics={demographics}
                  contactName={contactName}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* ── ACTIVITY TAB ─────────────────────────────────────── */}
      <TabsContent value="activity">
        <div className="space-y-5">
          {/* Communication Timeline */}
          <Card className="border-l-4 border-l-sky-400 bg-sky-50/15 dark:bg-sky-950/10">
            <CardContent className="p-6">
              <CommunicationTimeline
                contactId={contactId}
                communications={communications}
              />
            </CardContent>
          </Card>

          {/* Activity Log */}
          {activities.length > 0 && (
            <Card className="border-l-4 border-l-slate-400 bg-slate-50/15 dark:bg-slate-950/10">
              <CardContent className="p-6">
                <ActivityTimeline activities={activities} />
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* ── DEALS TAB ────────────────────────────────────────── */}
      <TabsContent value="deals">
        <div className="space-y-5">
          {/* Seller Earnings Summary */}
          {isSeller && listings.some((l) => l.status === "sold") && (
            <Card className="border-l-4 border-l-emerald-400 bg-emerald-50/15 dark:bg-emerald-950/10">
              <CardContent className="p-6">
                <SellerEarningsSummary listings={listings} />
              </CardContent>
            </Card>
          )}

          {/* Property History */}
          {(isSeller ? listings.length > 0 : buyerListings.length > 0) && (
            <Card id="section-property-history" className="border-l-4 border-l-violet-400 bg-violet-50/15 dark:bg-violet-950/10">
              <CardContent className="p-6">
                <PropertyHistoryPanel
                  listings={isSeller ? listings : buyerListings}
                  contactType={contact.type as "buyer" | "seller"}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ── Exported wrapper with Suspense (useSearchParams requires it) ──
export function ContactDetailTabs(props: ContactDetailTabsProps) {
  return (
    <Suspense fallback={<div className="animate-pulse h-12 bg-muted rounded-xl" />}>
      <ContactDetailTabsInner {...props} />
    </Suspense>
  );
}
