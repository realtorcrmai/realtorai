import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle2, Circle, ArrowRight, GitBranch } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const MLS_PHASES = [
  { phase: 1, name: "Pre-Listing",     desc: "Assessment, photos, staging, pricing strategy" },
  { phase: 2, name: "Listing Prep",    desc: "Contracts, DORTS, MLC, disclosure forms signed" },
  { phase: 3, name: "Active MLS",      desc: "Listed on MLS, marketing live, showings open" },
  { phase: 4, name: "Offers",          desc: "Reviewing offers, counter-offers, negotiations" },
  { phase: 5, name: "Accepted",        desc: "Offer accepted — subjects & conditions period" },
  { phase: 6, name: "Conveyancing",    desc: "Lawyer, title search, completion prep" },
  { phase: 7, name: "Completed",       desc: "Keys handed over — deal complete 🎉" },
];

const PHASE_COLORS: Record<number, string> = {
  1: "bg-slate-100 text-slate-700 border-slate-300",
  2: "bg-blue-100 text-blue-700 border-blue-300",
  3: "bg-emerald-100 text-emerald-700 border-emerald-300",
  4: "bg-amber-100 text-amber-700 border-amber-300",
  5: "bg-orange-100 text-orange-700 border-orange-300",
  6: "bg-purple-100 text-purple-700 border-purple-300",
  7: "bg-teal-100 text-teal-700 border-teal-300",
};

export default async function WorkflowPage() {
  const supabase = createAdminClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, address, status, mls_number, list_price, created_at")
    .order("created_at", { ascending: false });

  // Map listing status → phase
  function listingPhase(status: string): number {
    if (status === "sold") return 7;
    if (status === "pending") return 5;
    return 3; // active → MLS live
  }

  const phaseCounts = MLS_PHASES.map((p) => ({
    ...p,
    count: (listings ?? []).filter((l) => listingPhase(l.status) === p.phase).length,
  }));

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
    <div className="space-y-8">
      <div className="animate-float-in">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-pink elevation-4">
            <GitBranch className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">MLS Workflow</h1>
            <p className="text-sm text-muted-foreground">7-phase listing pipeline</p>
          </div>
        </div>
      </div>

      {/* Phase pipeline overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 animate-float-in" style={{ animationDelay: "80ms" }}>
        {phaseCounts.map((p, i) => (
          <div key={p.phase} className="relative">
            <div className={`rounded-xl border p-3 text-center ${PHASE_COLORS[p.phase]}`}>
              <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Ph {p.phase}</div>
              <div className="text-2xl font-bold mt-1">{p.count}</div>
              <div className="text-xs font-medium mt-0.5 leading-tight">{p.name}</div>
            </div>
            {i < phaseCounts.length - 1 && (
              <ArrowRight className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40 z-10" />
            )}
          </div>
        ))}
      </div>

      {/* Listings by phase */}
      <div className="space-y-4">
        {MLS_PHASES.map((phase) => {
          const phaseListings = (listings ?? []).filter(
            (l) => listingPhase(l.status) === phase.phase
          );
          if (phaseListings.length === 0) return null;
          return (
            <Card key={phase.phase}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="outline" className={`${PHASE_COLORS[phase.phase]} text-xs`}>
                    Phase {phase.phase}
                  </Badge>
                  {phase.name}
                  <span className="text-xs text-muted-foreground font-normal">— {phase.desc}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {phaseListings.map((listing) => (
                    <Link key={listing.id} href={`/listings/${listing.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group">
                        {phase.phase === 7 ? (
                          <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {listing.address}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {listing.mls_number ? `MLS# ${listing.mls_number}` : "No MLS#"}
                            {listing.list_price
                              ? ` · ${Number(listing.list_price).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })}`
                              : ""}
                          </p>
                        </div>
                        <Building2 className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {(listings ?? []).length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No listings yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                <Link href="/listings" className="text-primary hover:underline">Add a listing</Link> to see it in the workflow pipeline.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </div>
  );
}
