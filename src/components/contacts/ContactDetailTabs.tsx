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
import { WorkflowStepperCard } from "@/components/contacts/WorkflowStepperCard";
import ActivityTimeline from "@/components/contacts/ActivityTimeline";
import { ContextLog } from "@/components/contacts/ContextLog";
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
  } = props;

  const [currentTab, setCurrentTab] = useState("overview");

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
      </TabsList>

      {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
      <TabsContent value="overview" className="">
        <div className="space-y-3">
          {/* Panels sorted: panels WITH data render first, empty ones are collapsed into Quick Setup */}
          {(() => {
            const prefsHasData = isSeller ? hasPreferenceData(sellerPreferences) : hasPreferenceData(buyerPreferences);
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
            if (prefsHasData) {
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
                      <BuyerPreferencesPanel contactId={contactId} preferences={buyerPreferences} />
                    </CardContent>
                  </Card>
                )
              );
            }

            // Context
            if (contextHasData) {
              filledPanels.push(
                <div key="context">
                  <ContextLog contactId={contactId} entries={contextEntries} />
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
            if (docsHasData) {
              filledPanels.push(
                <Card key="docs" className="border-l-4 border-l-amber-400 bg-amber-50/10 dark:bg-amber-950/10">
                  <CardContent className="p-4">
                    <ContactDocumentsPanel contactId={contactId} documents={documents} />
                  </CardContent>
                </Card>
              );
            }

            // Quick Setup actions for empty sections
            const emptyActions: React.ReactNode[] = [];
            if (!prefsHasData) {
              emptyActions.push(
                <QuickSetupAction key="prefs" icon="🎯" label="Set Preferences"
                  description={isSeller ? "Motivation, pricing, timeline" : "Budget, areas, property type"}
                  onClick={() => { const btn = document.querySelector('[data-pref-edit]') as HTMLButtonElement; if (btn) btn.click(); }}
                />
              );
            }
            if (!contextHasData) {
              emptyActions.push(
                <QuickSetupAction key="context" icon="📝" label="Add Context"
                  description="Notes, objections, preferences"
                  onClick={() => { const el = document.getElementById("context-add-btn"); if (el) el.click(); }}
                />
              );
            }
            if (!isSeller && !propertiesHasData) {
              emptyActions.push(
                <QuickSetupAction key="properties" icon="🏠" label="Add Property"
                  description="Track properties of interest"
                  onClick={() => {}}
                />
              );
            }
            if (!docsHasData) {
              emptyActions.push(
                <QuickSetupAction key="docs" icon="📄" label="Upload Doc"
                  description="Contracts, ID, pre-approval"
                  onClick={() => { const el = document.getElementById("doc-upload-btn"); if (el) el.click(); }}
                />
              );
            }
            emptyActions.push(
              <QuickSetupAction key="tasks" icon="✅" label="Add Task"
                description="Follow-ups and reminders"
                onClick={() => setCurrentTab("activity")}
              />
            );

            return (
              <>
                {/* Panels with data — float to top */}
                {filledPanels}

                {/* Quick Setup — fills remaining space */}
                {emptyActions.length > 1 && (
                  <Card className="border border-dashed border-muted-foreground/20 bg-muted/5">
                    <CardContent className="p-5">
                      <h3 className="text-sm font-semibold mb-3">Quick Setup</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Complete these steps to build a full contact profile.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {emptyActions}
                      </div>
                    </CardContent>
                  </Card>
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
    </Tabs>
  );
}

export { ContactDetailTabsInner as ContactDetailTabs };

// ── Quick Setup Action Button ──────────────────────────────
function QuickSetupAction({
  icon,
  label,
  description,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2.5 p-3 rounded-xl border border-border/40 hover:bg-muted/30 hover:border-border transition-all text-left group"
    >
      <span className="text-lg shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs font-medium group-hover:text-primary transition-colors">
          {label}
        </p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
          {description}
        </p>
      </div>
    </button>
  );
}
