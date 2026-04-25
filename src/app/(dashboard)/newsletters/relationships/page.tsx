export const dynamic = "force-dynamic";

import { getJourneysForRelationshipsPage } from "@/actions/journeys";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  JourneyRowControls,
  JourneyPhaseBadge,
  NextEmailLabel,
  BulkEnrollModal,
} from "@/components/newsletters/JourneyControls";

const PAGE_SIZE = 50;

const JOURNEY_TYPE_ICONS: Record<string, string> = {
  buyer: "🏠",
  seller: "🏷️",
  customer: "👤",
  agent: "🤝",
};

export default async function RelationshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const { journeys, unenrolledContacts, hasMore } = await getJourneysForRelationshipsPage(PAGE_SIZE, offset);

  const activeCount = journeys.filter((j: any) => !j.is_paused).length;
  const pausedCount = journeys.filter((j: any) => j.is_paused).length;

  return (
    <>
      <PageHeader
        title="Relationships"
        subtitle="Manage contact journey enrollments and email cadence"
        breadcrumbs={[
          { label: "AI Agents", href: "/newsletters" },
          { label: "Relationships" },
        ]}
        actions={
          <BulkEnrollModal unenrolledContacts={unenrolledContacts as any} />
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-medium">
            <span className="text-green-600">●</span>
            <span>{activeCount} active</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-medium">
            <span className="text-amber-500">⏸</span>
            <span>{pausedCount} paused</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-medium">
            <span>👤</span>
            <span>{unenrolledContacts.length} not enrolled</span>
          </div>
        </div>

        {/* Journey table */}
        <Card>
          <CardContent className="p-0">
            {journeys.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm font-medium text-foreground mb-1">No contacts enrolled yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Contacts are automatically enrolled when added to the CRM, or use the button above to enroll manually.
                </p>
                <BulkEnrollModal unenrolledContacts={unenrolledContacts as any} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Journey</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phase</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sent</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {journeys.map((journey: any) => {
                      const contact = Array.isArray(journey.contacts)
                        ? journey.contacts[0]
                        : journey.contacts;
                      const icon = JOURNEY_TYPE_ICONS[journey.journey_type] ?? "📧";

                      return (
                        <tr
                          key={journey.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {/* Contact */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                {(contact?.name ?? "?")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <a
                                  href={`/contacts/${journey.contact_id}`}
                                  className="font-medium text-foreground hover:text-primary hover:underline truncate block"
                                >
                                  {contact?.name ?? "Unknown"}
                                </a>
                                {contact?.email && (
                                  <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Journey type */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-xs font-medium capitalize">
                              {icon} {journey.journey_type}
                            </span>
                          </td>

                          {/* Phase badge */}
                          <td className="px-4 py-3">
                            <JourneyPhaseBadge
                              phase={journey.current_phase}
                              isPaused={journey.is_paused}
                            />
                          </td>

                          {/* Next email */}
                          <td className="px-4 py-3">
                            <NextEmailLabel
                              nextEmailAt={journey.next_email_at}
                              isPaused={journey.is_paused}
                            />
                          </td>

                          {/* Emails sent */}
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">
                              {journey.emails_sent_in_phase ?? 0} in phase
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <JourneyRowControls
                                journeyId={journey.id}
                                contactId={journey.contact_id}
                                journeyType={journey.journey_type}
                                isPaused={journey.is_paused}
                                nextEmailAt={journey.next_email_at}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination controls */}
        {(page > 1 || hasMore) && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-muted-foreground">
              Page {page} · showing {offset + 1}–{offset + journeys.length}
            </span>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <a
                  href={`?page=${page - 1}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted transition-colors"
                >
                  ← Previous
                </a>
              )}
              {hasMore && (
                <a
                  href={`?page=${page + 1}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted transition-colors"
                >
                  Next →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Un-enrolled contacts callout */}
        {unenrolledContacts.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    ⚠️ {unenrolledContacts.length} contact{unenrolledContacts.length !== 1 ? "s" : ""} not in any journey
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    These contacts won't receive AI-generated emails until enrolled.
                  </p>
                </div>
                <BulkEnrollModal unenrolledContacts={unenrolledContacts as any} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
