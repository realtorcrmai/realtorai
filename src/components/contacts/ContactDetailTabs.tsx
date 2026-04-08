"use client";

import { useState, useEffect } from "react";
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
import { BuyerJourneyPanel } from "@/components/contacts/BuyerJourneyPanel";
import { ContactPortfolioTab } from "@/components/contacts/ContactPortfolioTab";
import type { BuyerJourney } from "@/actions/buyer-journeys";
import type { BuyerJourneyProperty } from "@/actions/buyer-journey-properties";
import type { PortfolioItem } from "@/actions/contact-portfolio";
import { WorkflowStepperCard } from "@/components/contacts/WorkflowStepperCard";
import ActivityTimeline from "@/components/contacts/ActivityTimeline";
import { ContextLog } from "@/components/contacts/ContextLog";
import { FamilyTabPanel } from "@/components/contacts/FamilyWizard";
import { PropertyDealsTab } from "@/components/contacts/PropertyDealsTab";
import type { ContactFamilyMember } from "@/types";
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
  isBuyer: boolean;

  // Buyer journey + portfolio
  buyerJourneys: BuyerJourney[];
  recentJourneyProperties: (BuyerJourneyProperty & { journeyStatus?: string })[];
  portfolioItems: PortfolioItem[];

  // Overview tab
  sortedEnrollments: EnrollmentRow[];
  stepsByWorkflow: Record<string, WorkflowStepRow[]>;
  expandedWorkflowId: string | null;
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

  // Activity tab (lazy-loaded — null until tab is clicked)
  activities: ActivityRow[] | null;

  // Deals tab
  referredByName: string | null;
  referralsAsReferrer: ReferralRow[];
  referralsAsReferred: ReferralRow[];
  allContacts: { id: string; name: string }[];
  documents: ContactDocument[];
  contextEntries: Array<{ id: string; context_type: string; text: string; is_resolved: boolean; resolved_note: string | null; created_at: string }>;

  // Family tab
  familyMembers: ContactFamilyMember[];
};

// Check if preferences object has any meaningful data set
function hasPreferenceData(prefs: Record<string, unknown> | null | undefined): boolean {
  if (!prefs) return false;
  return Object.values(prefs).some((v) => {
    if (v === null || v === undefined || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (typeof v === "object" && Object.keys(v as object).length === 0) return false;
    return true;
  });
}

// ── Inner component (needs useSearchParams wrapped in Suspense) ──
function ContactDetailTabsInner(props: ContactDetailTabsProps) {
  const {
    contactId,
    contact,
    isSeller,
    isBuyer,
    // Buyer journey + portfolio
    buyerJourneys,
    recentJourneyProperties,
    portfolioItems,
    // Overview
    sortedEnrollments,
    stepsByWorkflow,
    expandedWorkflowId,
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
    contextEntries,
    // Family
    familyMembers,
  } = props;

  const [currentTab, setCurrentTab] = useState("overview");

  // ── Quick Setup tile triggers — open panels inline without tab switch ──
  const [triggerPrefs, setTriggerPrefs] = useState(false);
  const [triggerContext, setTriggerContext] = useState(false);
  const [triggerDocs, setTriggerDocs] = useState(false);

  // ── Lazy-load activity log when Activity tab is selected ──
  const [lazyActivities, setLazyActivities] = useState<ActivityRow[] | null>(activities);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    if (currentTab !== "activity" || lazyActivities || activitiesLoading) return;
    let cancelled = false;
    // Use a ref-style flag via the cancelled variable; mark loading in the promise chain
    const loadPromise = Promise.resolve().then(() => {
      if (!cancelled) setActivitiesLoading(true);
      return fetch(`/api/contacts/${contactId}/activities`);
    });
    loadPromise
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setLazyActivities(data); })
      .catch(() => { if (!cancelled) setLazyActivities([]); })
      .finally(() => { if (!cancelled) setActivitiesLoading(false); });
    return () => { cancelled = true; };
  }, [currentTab, contactId, lazyActivities, activitiesLoading]);

  return (
    <Tabs defaultValue="overview" value={currentTab} onValueChange={setCurrentTab}>
      <TabsList className="w-full justify-start bg-white/60 backdrop-blur border rounded-xl p-1 mb-4 shrink-0">
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
        <TabsTrigger value="properties" className="rounded-lg">
          🏠 Properties
        </TabsTrigger>
        <TabsTrigger value="family" className="rounded-lg">
          👨‍👩‍👧 Family
          {familyMembers.length > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1">
              {familyMembers.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="portfolio" className="rounded-lg">
          🏘️ Portfolio
        </TabsTrigger>
      </TabsList>

      {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
      <TabsContent value="overview" className="">
        <div className="space-y-3">
          {/* Panels sorted: panels WITH data render first, empty ones are collapsed into Quick Setup */}
          {(() => {
            const prefsHasData = isSeller ? hasPreferenceData(sellerPreferences as unknown as Record<string, unknown>) : hasPreferenceData(buyerPreferences);
            const contextHasData = contextEntries.length > 0;
            const propertiesHasData = !isSeller && (buyerPreferences?.properties_of_interest as unknown[] ?? []).length > 0;
            const docsHasData = documents.length > 0;
            const hasEnrollments = sortedEnrollments.length > 0;

            // Build array of panels with data (rendered in order)
            const filledPanels: React.ReactNode[] = [];

            // Workflows always first (if any)
            if (hasEnrollments) {
              for (const enrollment of sortedEnrollments) {
                filledPanels.push(
                  <Card
                    key={enrollment.id}
                    className="border-l-4 border-l-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10"
                  >
                    <CardContent className="p-4">
                      <WorkflowStepperCard
                        enrollment={enrollment}
                        steps={stepsByWorkflow[enrollment.workflow_id] ?? []}
                        defaultCollapsed={enrollment.workflow_id !== expandedWorkflowId}
                      />
                    </CardContent>
                  </Card>
                );
              }
            }

            // Preferences
            if (prefsHasData || triggerPrefs) {
              filledPanels.push(
                isSeller ? (
                  <Card key="prefs" id="section-seller-preferences" className="border-l-4 border-l-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10">
                    <CardContent className="p-4">
                      <SellerPreferencesPanel contactId={contactId} preferences={sellerPreferences} />
                    </CardContent>
                  </Card>
                ) : (
                  <Card key="prefs" id="section-buyer-preferences" className="border-l-4 border-l-teal-400 bg-teal-50/20 dark:bg-teal-950/10">
                    <CardContent className="p-4">
                      <BuyerPreferencesPanel contactId={contactId} preferences={buyerPreferences} initialEditing={!prefsHasData && triggerPrefs} />
                    </CardContent>
                  </Card>
                )
              );
            }

            // Buyer Journey Panel (buyers + dual clients)
            if (isBuyer && buyerJourneys.length > 0) {
              filledPanels.push(
                <Card key="buyer-journey" id="section-buyer-journey" className="border-l-4 border-l-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10">
                  <CardContent className="p-4">
                    <BuyerJourneyPanel
                      contactId={contactId}
                      journeys={buyerJourneys}
                      recentProperties={recentJourneyProperties}
                    />
                  </CardContent>
                </Card>
              );
            }

            // Context
            if (contextHasData || triggerContext) {
              filledPanels.push(
                <div key="context">
                  <ContextLog contactId={contactId} entries={contextEntries} autoShowForm={!contextHasData && triggerContext} />
                </div>
              );
            }

            // Properties of interest
            if (propertiesHasData) {
              filledPanels.push(
                <Card key="properties" id="section-properties-interest" className="border-l-4 border-l-sky-400 bg-sky-50/20 dark:bg-sky-950/10">
                  <CardContent className="p-4">
                    <PropertiesOfInterestPanel contactId={contactId} preferences={buyerPreferences} listings={allListings} />
                  </CardContent>
                </Card>
              );
            }

            // Documents
            if (docsHasData || triggerDocs) {
              filledPanels.push(
                <Card key="docs" className="border-l-4 border-l-amber-400 bg-amber-50/10 dark:bg-amber-950/10">
                  <CardContent className="p-4">
                    <ContactDocumentsPanel contactId={contactId} documents={documents} autoShowUpload={!docsHasData && triggerDocs} />
                  </CardContent>
                </Card>
              );
            }

            // Quick Setup actions for empty sections
            const emptyActions: React.ReactNode[] = [];
            if (!prefsHasData && !triggerPrefs) {
              emptyActions.push(
                <QuickSetupTile key="prefs" icon="🎯" label="Set Preferences"
                  description={isSeller ? "Motivation, pricing, timeline" : "Budget, areas, property type"}
                  color="indigo"
                  onClick={() => setTriggerPrefs(true)}
                />
              );
            }
            if (!contextHasData && !triggerContext) {
              emptyActions.push(
                <QuickSetupTile key="context" icon="📝" label="Add Context"
                  description="Notes, objections, preferences"
                  color="teal"
                  onClick={() => setTriggerContext(true)}
                />
              );
            }
            if (!isSeller && !portfolioItems.length) {
              emptyActions.push(
                <QuickSetupTile key="properties" icon="🏠" label="Add Property"
                  description="Track properties of interest"
                  color="sky"
                  onClick={() => setCurrentTab("portfolio")}
                />
              );
            }
            if (!docsHasData && !triggerDocs) {
              emptyActions.push(
                <QuickSetupTile key="docs" icon="📄" label="Upload Doc"
                  description="Contracts, ID, pre-approval"
                  color="amber"
                  onClick={() => setTriggerDocs(true)}
                />
              );
            }
            emptyActions.push(
              <QuickSetupTile key="tasks" icon="✅" label="Add Task"
                description="Follow-ups and reminders"
                color="emerald"
                onClick={() => setCurrentTab("activity")}
              />
            );

            return (
              <>
                {/* Panels with data — float to top */}
                {filledPanels}

                {/* Quick Setup — animated tiles */}
                {emptyActions.length > 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-teal-400" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Setup</h3>
                      <span className="text-sm text-muted-foreground ml-auto">{emptyActions.length - 1} remaining</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {emptyActions}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </TabsContent>

      {/* ── INTELLIGENCE TAB ─────────────────────────────────── */}
      <TabsContent value="intelligence" className="">
        <div className="space-y-3">
          {/* Relationship Network */}
          {graphNodes.length > 1 && (
            <Card className="border-l-4 border-l-indigo-400 bg-indigo-50/15 dark:bg-indigo-950/10">
              <CardContent className="p-4">
                <RelationshipGraph
                  nodes={graphNodes as any}
                  edges={graphEdges as any}
                />
              </CardContent>
            </Card>
          )}

          {/* Demographics Panel */}
          <Card className="border-l-4 border-l-violet-400 bg-violet-50/20 dark:bg-violet-950/10">
            <CardContent className="p-4">
              <DemographicsPanel
                contactId={contactId}
                demographics={demographics}
              />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ── ACTIVITY TAB ─────────────────────────────────────── */}
      <TabsContent value="activity" className="">
        <div className="space-y-3">
          {/* Tasks & Follow-ups */}
          <Card className="border-l-4 border-l-orange-400 bg-orange-50/15 dark:bg-orange-950/10">
            <CardContent className="p-4">
              <ContactTasksPanel contactId={contactId} tasks={tasks} />
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="border-l-4 border-l-amber-400 bg-amber-50/15 dark:bg-amber-950/10">
            <CardContent className="p-4">
              <UpcomingEventsCard
                contactDates={contactDates}
                demographics={demographics}
                contactName={contactName}
              />
            </CardContent>
          </Card>

          {/* Communication Timeline */}
          <Card className="border-l-4 border-l-sky-400 bg-sky-50/15 dark:bg-sky-950/10">
            <CardContent className="p-4">
              <CommunicationTimeline
                contactId={contactId}
                communications={communications}
              />
            </CardContent>
          </Card>

          {/* Activity Log (lazy-loaded) */}
          {activitiesLoading && (
            <Card className="border-l-4 border-l-slate-400 bg-slate-50/15 dark:bg-slate-950/10">
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          )}
          {!activitiesLoading && lazyActivities && lazyActivities.length > 0 && (
            <Card className="border-l-4 border-l-slate-400 bg-slate-50/15 dark:bg-slate-950/10">
              <CardContent className="p-4">
                <ActivityTimeline activities={lazyActivities} />
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* ── DEALS TAB ────────────────────────────────────────── */}
      <TabsContent value="deals" className="">
        <div className="space-y-3">
          {/* Seller Earnings Summary */}
          {isSeller && listings.some((l) => l.status === "sold") && (
            <Card className="border-l-4 border-l-emerald-400 bg-emerald-50/15 dark:bg-emerald-950/10">
              <CardContent className="p-4">
                <SellerEarningsSummary listings={listings} />
              </CardContent>
            </Card>
          )}

          {/* Property History */}
          {(isSeller ? listings.length > 0 : buyerListings.length > 0) && (
            <Card id="section-property-history" className="border-l-4 border-l-violet-400 bg-violet-50/15 dark:bg-violet-950/10">
              <CardContent className="p-4">
                <PropertyHistoryPanel
                  listings={isSeller ? listings : buyerListings}
                  contactType={contact.type}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* ── PROPERTIES TAB ─────────────────────────────────── */}
      <TabsContent value="properties">
        <Card className="border-border/60">
          <CardContent className="p-5">
            <PropertyDealsTab
              contactId={contactId}
              contactName={contact.name}
              allContacts={allContacts}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── FAMILY TAB ─────────────────────────────────────── */}
      <TabsContent value="family">
        <Card className="border-border/60">
          <CardContent className="p-5">
            <FamilyTabPanel contactId={contactId} initialMembers={familyMembers} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── PORTFOLIO TAB ──────────────────────────────────── */}
      <TabsContent value="portfolio">
        <Card className="border-border/60">
          <CardContent className="p-5">
            <ContactPortfolioTab contactId={contactId} items={portfolioItems} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export { ContactDetailTabsInner as ContactDetailTabs };

// ── Quick Setup Tile — Animated gradient tile with colored top border ──
const TILE_COLORS: Record<string, {
  border: string;
  bg: string;
  iconBg: string;
  hoverBorder: string;
  shimmer: string;
}> = {
  indigo: {
    border: "border-t-indigo-400",
    bg: "from-indigo-50/40 to-white dark:from-indigo-950/20 dark:to-background",
    iconBg: "from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-800/20",
    hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-700",
    shimmer: "from-indigo-200/0 via-indigo-200/30 to-indigo-200/0",
  },
  teal: {
    border: "border-t-teal-400",
    bg: "from-teal-50/40 to-white dark:from-teal-950/20 dark:to-background",
    iconBg: "from-teal-100 to-teal-50 dark:from-teal-900/40 dark:to-teal-800/20",
    hoverBorder: "hover:border-teal-300 dark:hover:border-teal-700",
    shimmer: "from-teal-200/0 via-teal-200/30 to-teal-200/0",
  },
  sky: {
    border: "border-t-sky-400",
    bg: "from-sky-50/40 to-white dark:from-sky-950/20 dark:to-background",
    iconBg: "from-sky-100 to-sky-50 dark:from-sky-900/40 dark:to-sky-800/20",
    hoverBorder: "hover:border-sky-300 dark:hover:border-sky-700",
    shimmer: "from-sky-200/0 via-sky-200/30 to-sky-200/0",
  },
  amber: {
    border: "border-t-amber-400",
    bg: "from-amber-50/40 to-white dark:from-amber-950/20 dark:to-background",
    iconBg: "from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
    shimmer: "from-amber-200/0 via-amber-200/30 to-amber-200/0",
  },
  emerald: {
    border: "border-t-emerald-400",
    bg: "from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-background",
    iconBg: "from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/20",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
    shimmer: "from-emerald-200/0 via-emerald-200/30 to-emerald-200/0",
  },
};

function QuickSetupTile({
  icon,
  label,
  description,
  color = "indigo",
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  color?: string;
  onClick: () => void;
}) {
  const c = TILE_COLORS[color] || TILE_COLORS.indigo;

  return (
    <button
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl border-t-[3px] ${c.border} border border-border/20
        bg-gradient-to-b ${c.bg}
        p-4 text-left group
        hover:shadow-lg ${c.hoverBorder} hover:-translate-y-0.5
        transition-all duration-200
      `}
    >
      {/* Shimmer animation on hover */}
      <div className={`absolute inset-0 bg-gradient-to-r ${c.shimmer} -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out`} />

      {/* Content */}
      <div className="relative flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 shadow-sm`}>
          <span className="text-lg">{icon}</span>
        </div>
        <div className="pt-0.5">
          <p className="text-sm font-semibold group-hover:text-foreground transition-colors">
            {label}
          </p>
          <p className="text-sm text-muted-foreground leading-snug mt-0.5">
            {description}
          </p>
        </div>
      </div>

      {/* Bottom progress bar — empty (0%) */}
      <div className="relative mt-3 h-1 rounded-full bg-border/20 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${c.shimmer.replace('/0', '/60').replace('/30', '/80')} w-0 group-hover:w-[15%] transition-all duration-500`} />
      </div>
    </button>
  );
}
