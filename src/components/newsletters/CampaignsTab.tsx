"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home, Users, Mail, ChevronRight, ChevronDown, ArrowLeft,
  Send, Calendar, Clock, CheckCircle2, Sparkles, Zap,
  MailOpen, MousePointerClick, Eye, Settings2, Plus, History,
} from "lucide-react";

type Listing = { id: string; address: string; list_price: number | null; status: string };
type BlastRun = {
  id: string; listing_address: string; listing_price: number | null;
  template: string; recipients: number; sent_at: string;
  opens: number; clicks: number; replies: number;
};

type Props = {
  listings: Listing[];
  blastHistory?: BlastRun[];
  onSendBlast?: (listingId: string, template: string) => Promise<{ success?: boolean; error?: string }>;
  onSendCampaign?: (emailType: string, recipients: string, subject: string) => Promise<{ success?: boolean; error?: string }>;
};

const TEMPLATES = [
  { id: "listing_alert", emoji: "🏠", name: "New Listing Alert", desc: "Property details, photos, showing CTA", rate: "83%", for: "buyers" },
  { id: "market_update", emoji: "📊", name: "Market Update", desc: "Area stats, price trends, recent sales", rate: "31%", for: "all" },
  { id: "just_sold", emoji: "🎉", name: "Just Sold", desc: "Sale celebration, social proof", rate: "72%", for: "all" },
  { id: "open_house", emoji: "🏡", name: "Open House Invite", desc: "Date, time, address, RSVP", rate: "75%", for: "buyers" },
  { id: "neighbourhood_guide", emoji: "🗺️", name: "Neighbourhood Guide", desc: "Local spots, schools, lifestyle", rate: "45%", for: "buyers" },
  { id: "home_anniversary", emoji: "🎂", name: "Home Anniversary", desc: "Value update, maintenance tips", rate: "68%", for: "past_clients" },
  { id: "welcome", emoji: "📧", name: "Welcome Email", desc: "Intro, what to expect, first CTA", rate: "67%", for: "new_leads" },
  { id: "luxury_showcase", emoji: "✨", name: "Luxury Showcase", desc: "Premium property spotlight", rate: "—", for: "buyers" },
];

type View = "home" | "listing_blast" | "custom_campaign";
type BlastStep = "select_listing" | "customize" | "recipients" | "review";
type CampaignStep = "select_template" | "select_contacts" | "customize" | "schedule";

export function CampaignsTab({ listings, blastHistory = [], onSendBlast, onSendCampaign }: Props) {
  const [isSending, setIsSending] = useState(false);
  const [view, setView] = useState<View>("home");

  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // Blast wizard state
  const [blastStep, setBlastStep] = useState<BlastStep>("select_listing");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [blastSent, setBlastSent] = useState(false);

  // Custom campaign state
  const [campaignStep, setCampaignStep] = useState<CampaignStep>("select_template");
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState("all_buyers");
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [campaignSent, setCampaignSent] = useState(false);

  function resetBlast() { setBlastStep("select_listing"); setSelectedListing(null); setBlastSent(false); }
  function resetCampaign() { setCampaignStep("select_template"); setSelectedTemplate(null); setSelectedRecipients("all_buyers"); setScheduleType("now"); setCampaignSent(false); }

  // ═══ HOME VIEW ═══
  if (view === "home") {
    const history: BlastRun[] = blastHistory;

    return (
      <div className="space-y-5">
        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all group" onClick={() => { setView("listing_blast"); resetBlast(); }}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Manual Listing Blast</p>
                <p className="text-xs text-muted-foreground">Pick a listing, AI writes the email, send to agents</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all group" onClick={() => { setView("custom_campaign"); resetCampaign(); }}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand/50/10 flex items-center justify-center shrink-0 group-hover:bg-brand/50/20">
                <Mail className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold">Custom Campaign</p>
                <p className="text-xs text-muted-foreground">Choose template, select contacts, schedule or send</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </div>

        {/* Blast History */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Blast History</h4>
              </div>
              <Badge variant="secondary" className="text-xs">{history.length} blasts</Badge>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No campaigns sent yet. Use the buttons above to send your first blast or campaign.</p>
            ) : history.map(run => {
              const isExpanded = expandedRun === run.id;
              const openRate = run.recipients > 0 ? Math.round((run.opens / run.recipients) * 100) : 0;

              return (
                <div key={run.id} className={`border-b border-border last:border-0 ${isExpanded ? "bg-muted/10" : ""}`}>
                  <button
                    onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                    className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/20 transition-colors rounded-md px-1"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Home className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{run.listing_address}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(run.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {run.template} · {run.recipients} agents
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${run.opens > 0 ? "text-brand" : "text-muted-foreground"}`}>
                          <MailOpen className="h-3 w-3" /> {run.opens}
                        </span>
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${run.clicks > 0 ? "text-primary" : "text-muted-foreground"}`}>
                          <MousePointerClick className="h-3 w-3" /> {run.clicks}
                        </span>
                      </div>
                      <div className="hidden md:flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${openRate >= 70 ? "bg-brand" : openRate >= 40 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${openRate}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{openRate}%</span>
                      </div>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                        <div className="p-2.5 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold">{run.recipients}</div>
                          <div className="text-[10px] text-muted-foreground">Sent</div>
                        </div>
                        <div className="p-2.5 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold text-brand">{run.opens}</div>
                          <div className="text-[10px] text-muted-foreground">Opens</div>
                        </div>
                        <div className="p-2.5 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold text-primary">{run.clicks}</div>
                          <div className="text-[10px] text-muted-foreground">Clicks</div>
                        </div>
                        <div className="p-2.5 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold">{run.replies}</div>
                          <div className="text-[10px] text-muted-foreground">Replies</div>
                        </div>
                        <div className="p-2.5 bg-muted/50 rounded-lg">
                          <div className="text-lg font-bold">{openRate}%</div>
                          <div className="text-[10px] text-muted-foreground">Open Rate</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div><span className="text-muted-foreground">Listing:</span> <span className="font-medium">{run.listing_address}</span></div>
                        <div><span className="text-muted-foreground">Price:</span> <span className="font-medium">{run.listing_price ? "$" + Number(run.listing_price).toLocaleString() : "N/A"}</span></div>
                        <div><span className="text-muted-foreground">Template:</span> <span className="font-medium">{run.template}</span></div>
                        <div><span className="text-muted-foreground">Sent:</span> <span className="font-medium">{new Date(run.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toast.info("Email preview — open the newsletter in the AI tab to view the full email")}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted font-medium"
                        >
                          <Eye className="h-3 w-3" /> View Email
                        </button>
                        <button
                          onClick={() => toast.info("Recipients are all agent / partner contacts in your CRM with a valid email")}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted font-medium"
                        >
                          <Users className="h-3 w-3" /> View Recipients
                        </button>
                        <button
                          onClick={() => toast.info("To resend, go to Manual Listing Blast and choose the same listing")}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                        >
                          <Send className="h-3 w-3" /> Resend
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ LISTING BLAST WIZARD ═══
  if (view === "listing_blast") {
    const steps: { key: BlastStep; label: string }[] = [
      { key: "select_listing", label: "Listing" },
      { key: "customize", label: "AI Email" },
      { key: "recipients", label: "Recipients" },
      { key: "review", label: "Send" },
    ];
    const currentIdx = steps.findIndex(s => s.key === blastStep);

    if (blastSent) {
      return (
        <div className="space-y-4">
          <Card><CardContent className="p-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <h3 className="text-xl font-bold text-success mb-1">Blast Sent!</h3>
            <p className="text-sm text-muted-foreground">{selectedListing?.address} → announced to all agents</p>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={resetBlast} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">Send Another</button>
              <button onClick={() => setView("home")} className="text-xs px-4 py-2 rounded-lg bg-brand text-white font-medium hover:bg-primary/90">Back to Campaigns</button>
            </div>
          </CardContent></Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("home")} className="p-1.5 rounded-md hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <div><h3 className="text-lg font-semibold">Manual Listing Blast</h3><p className="text-xs text-muted-foreground">AI writes the email, you approve and send</p></div>
        </div>

        <StepIndicator steps={steps} currentIdx={currentIdx} />

        {blastStep === "select_listing" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Which listing?</p>
            {listings.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No active listings.</CardContent></Card>
            ) : listings.map(l => (
              <Card key={l.id} className={`cursor-pointer transition-all ${selectedListing?.id === l.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`} onClick={() => setSelectedListing(l)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div><p className="text-sm font-semibold">{l.address}</p><p className="text-xs text-muted-foreground">{l.list_price ? `$${Number(l.list_price).toLocaleString()}` : "Price TBD"}</p></div>
                  <RadioDot selected={selectedListing?.id === l.id} />
                </CardContent>
              </Card>
            ))}
            <div className="flex justify-end pt-2">
              <button onClick={() => selectedListing && setBlastStep("customize")} disabled={!selectedListing} className="text-xs px-4 py-2 rounded-lg bg-brand text-white font-medium disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}

        {blastStep === "customize" && selectedListing && (
          <div className="space-y-3">
            <Card><CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-primary" /><span className="text-xs font-semibold text-primary">AI Generated</span></div>
              <div className="space-y-3">
                <div><label className="text-[10px] text-muted-foreground uppercase">Subject</label><input className="w-full mt-1 text-sm font-medium border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" defaultValue={`NEW LISTING: ${selectedListing.address} — ${selectedListing.list_price ? "$" + Number(selectedListing.list_price).toLocaleString() : ""}`} /></div>
                <div><label className="text-[10px] text-muted-foreground uppercase">Note</label><textarea className="w-full mt-1 text-sm border border-border rounded-md px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20" defaultValue={`Excited to share my newest listing at ${selectedListing.address}. Your clients are welcome.\n\nKunal`} /></div>
                <div className="flex gap-3 flex-wrap">
                  <label className="text-xs flex items-center gap-1.5"><input type="checkbox" defaultChecked className="accent-primary" /> Photos</label>
                  <label className="text-xs flex items-center gap-1.5"><input type="checkbox" defaultChecked className="accent-primary" /> Open house</label>
                  <label className="text-xs flex items-center gap-1.5"><input type="checkbox" className="accent-primary" /> Commission</label>
                  <label className="text-xs flex items-center gap-1.5"><input type="checkbox" className="accent-primary" /> Floor plan</label>
                </div>
              </div>
            </CardContent></Card>
            <NavButtons onBack={() => setBlastStep("select_listing")} onNext={() => setBlastStep("recipients")} />
          </div>
        )}

        {blastStep === "recipients" && (
          <RecipientStep selectedRecipients={selectedRecipients} setSelectedRecipients={setSelectedRecipients}
            options={[
              { value: "all_agents", label: "All agents in CRM", desc: "Every partner/agent contact", count: "5" },
              { value: "area_agents", label: "Area-specific agents", desc: "Agents active in this listing's area", count: "3" },
              { value: "import", label: "Import email list", desc: "Paste emails from your board", count: "" },
            ]}
            onBack={() => setBlastStep("customize")} onNext={() => setBlastStep("review")}
          />
        )}

        {blastStep === "review" && selectedListing && (
          <div className="space-y-3">
            <Card><CardContent className="p-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-muted/50 rounded-lg"><Home className="h-4 w-4 mx-auto mb-1 text-muted-foreground" /><p className="text-xs font-semibold">{selectedListing.address?.split(",")[0]}</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" /><p className="text-xs font-semibold">All agent contacts</p></div>
                <div className="p-3 bg-muted/50 rounded-lg"><Send className="h-4 w-4 mx-auto mb-1 text-muted-foreground" /><p className="text-xs font-semibold">Send Now</p></div>
              </div>
            </CardContent></Card>
            <div className="flex justify-between pt-2">
              <button onClick={() => setBlastStep("recipients")} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">← Back</button>
              <div className="flex gap-2">
                <button
                  onClick={() => toast.info("Test email: enter your email address in Settings → your email will receive a preview copy")}
                  className="text-xs px-4 py-2 rounded-lg border border-border font-medium"
                >📧 Send Test</button>
                <button
                  disabled={isSending}
                  onClick={async () => {
                    if (onSendBlast && selectedListing) {
                      setIsSending(true);
                      try {
                        const result = await onSendBlast(selectedListing.id, "listing_alert");
                        if (result?.error) {
                          toast.error(result.error);
                          setIsSending(false);
                          return;
                        }
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Failed to send blast");
                        setIsSending(false);
                        return;
                      }
                      setIsSending(false);
                    }
                    setBlastSent(true);
                  }}
                  className="text-xs px-4 py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark disabled:opacity-50"
                >{isSending ? "Sending..." : "Send to All Agents"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══ CUSTOM CAMPAIGN WIZARD ═══
  if (view === "custom_campaign") {
    const steps: { key: CampaignStep; label: string }[] = [
      { key: "select_template", label: "Template" },
      { key: "select_contacts", label: "Contacts" },
      { key: "customize", label: "Customize" },
      { key: "schedule", label: "Send" },
    ];
    const currentIdx = steps.findIndex(s => s.key === campaignStep);

    if (campaignSent) {
      return (
        <div className="space-y-4">
          <Card><CardContent className="p-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <h3 className="text-xl font-bold text-brand mb-1">{scheduleType === "now" ? "Campaign Sent!" : "Scheduled!"}</h3>
            <p className="text-sm text-muted-foreground">{selectedTemplate?.name} → {selectedRecipients.replace(/_/g, " ")}</p>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={resetCampaign} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">Create Another</button>
              <button onClick={() => setView("home")} className="text-xs px-4 py-2 rounded-lg bg-brand text-white font-medium hover:bg-primary/90">Back</button>
            </div>
          </CardContent></Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("home")} className="p-1.5 rounded-md hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <div><h3 className="text-lg font-semibold">Custom Campaign</h3><p className="text-xs text-muted-foreground">Template → Contacts → Customize → Send</p></div>
        </div>

        <StepIndicator steps={steps} currentIdx={currentIdx} />

        {campaignStep === "select_template" && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Choose a template</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <Card key={t.id} className={`cursor-pointer transition-all ${selectedTemplate?.id === t.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`} onClick={() => setSelectedTemplate(t)}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <span className="text-2xl">{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between"><p className="text-sm font-semibold">{t.name}</p><Badge variant="outline" className="text-[10px]">{t.rate}</Badge></div>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1.5 capitalize">{t.for.replace(/_/g, " ")}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => selectedTemplate && setCampaignStep("select_contacts")} disabled={!selectedTemplate} className="text-xs px-4 py-2 rounded-lg bg-brand text-white font-medium disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}

        {campaignStep === "select_contacts" && (
          <RecipientStep selectedRecipients={selectedRecipients} setSelectedRecipients={setSelectedRecipients}
            options={[
              { value: "all_buyers", label: "All buyers", desc: "Every buyer in CRM", count: "" },
              { value: "all_sellers", label: "All sellers", desc: "Every seller in CRM", count: "" },
              { value: "active_buyers", label: "Active buyers", desc: "Score 30+", count: "" },
              { value: "past_clients", label: "Past clients", desc: "Closed deals", count: "" },
              { value: "new_leads", label: "New leads (30 days)", desc: "Recently added", count: "" },
              { value: "all_contacts", label: "Everyone", desc: "All contacts", count: "" },
            ]}
            onBack={() => setCampaignStep("select_template")} onNext={() => setCampaignStep("customize")}
          />
        )}

        {campaignStep === "customize" && selectedTemplate && (
          <div className="space-y-3">
            <Card><CardContent className="p-5 space-y-3">
              <div><label className="text-[10px] text-muted-foreground uppercase">Subject</label><input className="w-full mt-1 text-sm font-medium border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20" defaultValue={selectedTemplate.desc} /></div>
              <div><label className="text-[10px] text-muted-foreground uppercase">Message</label><textarea className="w-full mt-1 text-sm border border-border rounded-md px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20" defaultValue="AI will personalize this for each recipient." /></div>
              <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-primary font-medium">AI personalizes for each contact</span></div>
            </CardContent></Card>
            <NavButtons onBack={() => setCampaignStep("select_contacts")} onNext={() => setCampaignStep("schedule")} />
          </div>
        )}

        {campaignStep === "schedule" && selectedTemplate && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card className={`cursor-pointer ${scheduleType === "now" ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`} onClick={() => setScheduleType("now")}>
                <CardContent className="p-4 text-center"><Send className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-sm font-semibold">Send Now</p></CardContent>
              </Card>
              <Card className={`cursor-pointer ${scheduleType === "scheduled" ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`} onClick={() => setScheduleType("scheduled")}>
                <CardContent className="p-4 text-center"><Calendar className="h-5 w-5 mx-auto mb-1 text-brand" /><p className="text-sm font-semibold">Schedule</p></CardContent>
              </Card>
            </div>
            {scheduleType === "scheduled" && <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground" /><input type="datetime-local" className="text-sm border border-border rounded-md px-3 py-2 flex-1" /></CardContent></Card>}
            <Card><CardContent className="p-4 grid grid-cols-3 gap-3 text-center text-xs">
              <div><span className="text-lg">{selectedTemplate.emoji}</span><p className="font-medium mt-1">{selectedTemplate.name}</p></div>
              <div><span className="text-lg">👥</span><p className="font-medium mt-1 capitalize">{selectedRecipients.replace(/_/g, " ")}</p></div>
              <div><span className="text-lg">{scheduleType === "now" ? "🚀" : "📅"}</span><p className="font-medium mt-1">{scheduleType === "now" ? "Now" : "Scheduled"}</p></div>
            </CardContent></Card>
            <div className="flex justify-between pt-2">
              <button onClick={() => setCampaignStep("customize")} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">← Back</button>
              <div className="flex gap-2">
                <button
                  onClick={() => toast.info("Test email: enter your email address in Settings → your email will receive a preview copy")}
                  className="text-xs px-4 py-2 rounded-lg border border-border font-medium"
                >📧 Test</button>
                <button
                  disabled={isSending}
                  onClick={async () => {
                    if (onSendCampaign && selectedTemplate) {
                      setIsSending(true);
                      try {
                        const result = await onSendCampaign(selectedTemplate.id, selectedRecipients, selectedTemplate.desc);
                        if (result?.error) {
                          toast.error(result.error);
                          setIsSending(false);
                          return;
                        }
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Failed to send campaign");
                        setIsSending(false);
                        return;
                      }
                      setIsSending(false);
                    }
                    setCampaignSent(true);
                  }}
                  className="text-xs px-4 py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand-dark disabled:opacity-50"
                >{isSending ? "Sending..." : scheduleType === "now" ? "Send" : "Schedule"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ═══ Shared Components ═══

function StepIndicator({ steps, currentIdx }: { steps: { key: string; label: string }[]; currentIdx: number }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            i < currentIdx ? "bg-brand-muted text-brand-dark" : i === currentIdx ? "bg-brand text-white" : "bg-muted text-muted-foreground"
          }`}>
            {i < currentIdx ? <CheckCircle2 className="h-3 w-3" /> : <span>{i + 1}</span>}
            <span className="hidden md:inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className={`w-6 h-0.5 mx-1 ${i < currentIdx ? "bg-brand-light" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-primary bg-primary" : "border-border"}`}>
      {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel = "Next →" }: { onBack: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="flex justify-between pt-2">
      <button onClick={onBack} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">← Back</button>
      <button onClick={onNext} className="text-xs px-4 py-2 rounded-lg bg-brand text-white font-medium hover:bg-primary/90">{nextLabel}</button>
    </div>
  );
}

function RecipientStep({ selectedRecipients, setSelectedRecipients, options, onBack, onNext }: {
  selectedRecipients: string; setSelectedRecipients: (v: string) => void;
  options: { value: string; label: string; desc: string; count: string }[];
  onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Who should receive this?</p>
      {options.map(opt => (
        <Card key={opt.value} className={`cursor-pointer transition-all ${selectedRecipients === opt.value ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`} onClick={() => setSelectedRecipients(opt.value)}>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RadioDot selected={selectedRecipients === opt.value} />
              <div><p className="text-sm font-medium">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.desc}</p></div>
            </div>
            {opt.count && <Badge variant="secondary" className="text-xs">{opt.count}</Badge>}
          </CardContent>
        </Card>
      ))}
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  );
}
