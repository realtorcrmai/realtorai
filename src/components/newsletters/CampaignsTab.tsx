"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone, Home, Users, Mail, ChevronRight, ArrowLeft,
  Send, Calendar, Clock, CheckCircle2, Sparkles,
} from "lucide-react";

type Listing = {
  id: string;
  address: string;
  list_price: number | null;
  status: string;
};

type Props = {
  listings: Listing[];
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

export function CampaignsTab({ listings }: Props) {
  const [view, setView] = useState<View>("home");

  // Listing Blast state
  const [blastStep, setBlastStep] = useState<BlastStep>("select_listing");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [blastSent, setBlastSent] = useState(false);

  // Custom Campaign state
  const [campaignStep, setCampaignStep] = useState<CampaignStep>("select_template");
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string>("all_buyers");
  const [scheduleType, setScheduleType] = useState<"now" | "scheduled">("now");
  const [campaignSent, setCampaignSent] = useState(false);

  function resetBlast() {
    setBlastStep("select_listing");
    setSelectedListing(null);
    setBlastSent(false);
  }

  function resetCampaign() {
    setCampaignStep("select_template");
    setSelectedTemplate(null);
    setSelectedRecipients("all_buyers");
    setScheduleType("now");
    setCampaignSent(false);
  }

  // ═══════════════════════════════════════════
  // HOME — Campaign type selector
  // ═══════════════════════════════════════════
  if (view === "home") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Campaigns</h3>
            <p className="text-xs text-muted-foreground">Create and send email campaigns to your contacts</p>
          </div>
        </div>

        {/* Two campaign types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all group"
            onClick={() => { setView("listing_blast"); resetBlast(); }}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="text-base font-semibold mb-1">New Listing Blast</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Announce a new listing to all agents in your network. AI generates the email with photos, details, and open house dates.
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium">
                    <Sparkles className="h-3 w-3" /> AI writes the email
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </div>
                </div>
              </div>
              {listings.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Active listings</p>
                  <div className="flex gap-1 flex-wrap">
                    {listings.slice(0, 3).map(l => (
                      <Badge key={l.id} variant="outline" className="text-[10px]">{l.address?.split(",")[0]}</Badge>
                    ))}
                    {listings.length > 3 && <Badge variant="secondary" className="text-[10px]">+{listings.length - 3} more</Badge>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all group"
            onClick={() => { setView("custom_campaign"); resetCampaign(); }}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-base font-semibold mb-1">Custom Campaign</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose a template, select contacts or a segment, customize the content, and schedule or send immediately.
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-purple-600 font-medium">
                    <Users className="h-3 w-3" /> Target specific contacts
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Templates available</p>
                <div className="flex gap-1 flex-wrap">
                  {TEMPLATES.slice(0, 4).map(t => (
                    <Badge key={t.id} variant="outline" className="text-[10px]">{t.emoji} {t.name}</Badge>
                  ))}
                  <Badge variant="secondary" className="text-[10px]">+{TEMPLATES.length - 4} more</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent campaigns */}
        <Card>
          <CardContent className="p-5">
            <h4 className="text-sm font-semibold mb-3">Recent Campaigns</h4>
            <p className="text-xs text-muted-foreground text-center py-4">No campaigns sent yet. Start your first campaign above.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // LISTING BLAST FLOW
  // ═══════════════════════════════════════════
  if (view === "listing_blast") {
    const steps: { key: BlastStep; label: string }[] = [
      { key: "select_listing", label: "Select Listing" },
      { key: "customize", label: "AI Email" },
      { key: "recipients", label: "Recipients" },
      { key: "review", label: "Send" },
    ];
    const currentIdx = steps.findIndex(s => s.key === blastStep);

    if (blastSent) {
      return (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-emerald-600 mb-1">Blast Sent!</h3>
              <p className="text-sm text-muted-foreground">{selectedListing?.address} → announced to all agents</p>
              <div className="flex justify-center gap-3 mt-6">
                <button onClick={() => { resetBlast(); }} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">Send Another</button>
                <button onClick={() => setView("home")} className="text-xs px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90">Back to Campaigns</button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setView("home")} className="p-1.5 rounded-md hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <h3 className="text-lg font-semibold">New Listing Blast</h3>
            <p className="text-xs text-muted-foreground">Announce your listing to all agents</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                i < currentIdx ? "bg-emerald-100 text-emerald-700" :
                i === currentIdx ? "bg-primary text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < currentIdx ? <CheckCircle2 className="h-3 w-3" /> : <span>{i + 1}</span>}
                <span className="hidden md:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-6 h-0.5 mx-1 ${i < currentIdx ? "bg-emerald-300" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {blastStep === "select_listing" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Which listing are you announcing?</p>
            {listings.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No active listings. Create a listing first.</CardContent></Card>
            ) : listings.map(l => (
              <Card
                key={l.id}
                className={`cursor-pointer transition-all ${selectedListing?.id === l.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`}
                onClick={() => setSelectedListing(l)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{l.address}</p>
                      <p className="text-xs text-muted-foreground">{l.list_price ? `$${Number(l.list_price).toLocaleString()}` : "Price TBD"} · {l.status}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedListing?.id === l.id ? "border-primary bg-primary" : "border-border"}`}>
                      {selectedListing?.id === l.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => selectedListing && setBlastStep("customize")}
                disabled={!selectedListing}
                className="text-xs px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40"
              >Next: AI Email →</button>
            </div>
          </div>
        )}

        {blastStep === "customize" && selectedListing && (
          <div className="space-y-3">
            <p className="text-sm font-medium">AI-generated email for {selectedListing.address}</p>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">AI Generated</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Subject</label>
                    <input className="w-full mt-1 text-sm font-medium border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      defaultValue={`NEW LISTING: ${selectedListing.address} — ${selectedListing.list_price ? "$" + Number(selectedListing.list_price).toLocaleString() : "Price TBD"}`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Personal Note</label>
                    <textarea className="w-full mt-1 text-sm border border-border rounded-md px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                      defaultValue={`I'm excited to share my newest listing at ${selectedListing.address}. Your clients are welcome at the open house.\n\nKunal`}
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <label className="text-xs flex items-center gap-1.5"><input type="checkbox" defaultChecked className="accent-primary" /> Property photos</label>
                    <label className="text-xs flex items-center gap-1.5"><input type="checkbox" defaultChecked className="accent-primary" /> Open house dates</label>
                    <label className="text-xs flex items-center gap-1.5"><input type="checkbox" className="accent-primary" /> Commission details</label>
                    <label className="text-xs flex items-center gap-1.5"><input type="checkbox" className="accent-primary" /> Floor plan</label>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between pt-2">
              <button onClick={() => setBlastStep("select_listing")} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">← Back</button>
              <button onClick={() => setBlastStep("recipients")} className="text-xs px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90">Next: Recipients →</button>
            </div>
          </div>
        )}

        {blastStep === "recipients" && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Who should receive this blast?</p>
            {[
              { value: "all_agents", label: "All agents in CRM", desc: "Every contact with type partner/agent", count: "5 agents" },
              { value: "kits_agents", label: "Kitsilano-active agents", desc: "Agents who've shown Kits properties", count: "3 agents" },
              { value: "import", label: "Import email list", desc: "Paste emails from your board or MLS", count: "" },
            ].map(opt => (
              <Card
                key={opt.value}
                className={`cursor-pointer transition-all ${selectedRecipients === opt.value ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`}
                onClick={() => setSelectedRecipients(opt.value)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedRecipients === opt.value ? "border-primary bg-primary" : "border-border"}`}>
                      {selectedRecipients === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </div>
                  {opt.count && <Badge variant="secondary" className="text-xs">{opt.count}</Badge>}
                </CardContent>
              </Card>
            ))}
            <div className="flex justify-between pt-2">
              <button onClick={() => setBlastStep("customize")} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">← Back</button>
              <button onClick={() => setBlastStep("review")} className="text-xs px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90">Next: Review →</button>
            </div>
          </div>
        )}

        {blastStep === "review" && selectedListing && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Ready to send?</p>
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Home className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs font-semibold">{selectedListing.address?.split(",")[0]}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedListing.list_price ? "$" + Number(selectedListing.list_price).toLocaleString() : ""}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs font-semibold">5 agents</p>
                    <p className="text-[10px] text-muted-foreground">{selectedRecipients.replace(/_/g, " ")}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <Send className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs font-semibold">Send Now</p>
                    <p className="text-[10px] text-muted-foreground">Immediate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between pt-2">
              <button onClick={() => setBlastStep("recipients")} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">← Back</button>
              <div className="flex gap-2">
                <button className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">📧 Send Test to Me</button>
                <button
                  onClick={() => setBlastSent(true)}
                  className="text-xs px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                >✓ Send to 5 Agents</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // CUSTOM CAMPAIGN FLOW
  // ═══════════════════════════════════════════
  if (view === "custom_campaign") {
    const steps: { key: CampaignStep; label: string }[] = [
      { key: "select_template", label: "Template" },
      { key: "select_contacts", label: "Contacts" },
      { key: "customize", label: "Customize" },
      { key: "schedule", label: "Schedule & Send" },
    ];
    const currentIdx = steps.findIndex(s => s.key === campaignStep);

    if (campaignSent) {
      return (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-emerald-600 mb-1">{scheduleType === "now" ? "Campaign Sent!" : "Campaign Scheduled!"}</h3>
              <p className="text-sm text-muted-foreground">{selectedTemplate?.name} → {selectedRecipients.replace(/_/g, " ")}</p>
              <div className="flex justify-center gap-3 mt-6">
                <button onClick={() => { resetCampaign(); }} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">Create Another</button>
                <button onClick={() => setView("home")} className="text-xs px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90">Back to Campaigns</button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setView("home")} className="p-1.5 rounded-md hover:bg-muted"><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <h3 className="text-lg font-semibold">Custom Campaign</h3>
            <p className="text-xs text-muted-foreground">Choose template, contacts, and schedule</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                i < currentIdx ? "bg-emerald-100 text-emerald-700" :
                i === currentIdx ? "bg-primary text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < currentIdx ? <CheckCircle2 className="h-3 w-3" /> : <span>{i + 1}</span>}
                <span className="hidden md:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`w-6 h-0.5 mx-1 ${i < currentIdx ? "bg-emerald-300" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Template */}
        {campaignStep === "select_template" && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Choose an email template</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <Card
                  key={t.id}
                  className={`cursor-pointer transition-all ${selectedTemplate?.id === t.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`}
                  onClick={() => setSelectedTemplate(t)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{t.name}</p>
                          <Badge variant="outline" className="text-[10px]">{t.rate} open rate</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                        <Badge variant="secondary" className="text-[10px] mt-1.5 capitalize">{t.for.replace(/_/g, " ")}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => selectedTemplate && setCampaignStep("select_contacts")}
                disabled={!selectedTemplate}
                className="text-xs px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40"
              >Next: Select Contacts →</button>
            </div>
          </div>
        )}

        {/* Step 2: Select Contacts */}
        {campaignStep === "select_contacts" && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Who should receive this campaign?</p>
            {[
              { value: "all_buyers", label: "All buyers", desc: "Every buyer contact in your CRM", icon: "🏠" },
              { value: "all_sellers", label: "All sellers", desc: "Every seller contact in your CRM", icon: "🏗️" },
              { value: "active_buyers", label: "Active buyers only", desc: "Buyers in active search phase (score 30+)", icon: "🔥" },
              { value: "past_clients", label: "Past clients", desc: "Buyers and sellers you've closed deals with", icon: "⭐" },
              { value: "new_leads", label: "New leads", desc: "Contacts added in the last 30 days", icon: "🟢" },
              { value: "all_contacts", label: "Everyone", desc: "All contacts in your CRM", icon: "👥" },
            ].map(opt => (
              <Card
                key={opt.value}
                className={`cursor-pointer transition-all ${selectedRecipients === opt.value ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`}
                onClick={() => setSelectedRecipients(opt.value)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedRecipients === opt.value ? "border-primary bg-primary" : "border-border"}`}>
                    {selectedRecipients === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-lg">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="flex justify-between pt-2">
              <button onClick={() => setCampaignStep("select_template")} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">← Back</button>
              <button onClick={() => setCampaignStep("customize")} className="text-xs px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90">Next: Customize →</button>
            </div>
          </div>
        )}

        {/* Step 3: Customize */}
        {campaignStep === "customize" && selectedTemplate && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Customize your {selectedTemplate.name}</p>
            <Card>
              <CardContent className="p-5 space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Subject Line</label>
                  <input className="w-full mt-1 text-sm font-medium border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    defaultValue={selectedTemplate.desc}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Message</label>
                  <textarea className="w-full mt-1 text-sm border border-border rounded-md px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    defaultValue="AI will personalize this message for each recipient based on their preferences and engagement history."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-primary font-medium">AI will personalize for each contact</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between pt-2">
              <button onClick={() => setCampaignStep("select_contacts")} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">← Back</button>
              <button onClick={() => setCampaignStep("schedule")} className="text-xs px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90">Next: Schedule →</button>
            </div>
          </div>
        )}

        {/* Step 4: Schedule & Send */}
        {campaignStep === "schedule" && selectedTemplate && (
          <div className="space-y-3">
            <p className="text-sm font-medium">When should this campaign send?</p>

            <div className="grid grid-cols-2 gap-3">
              <Card
                className={`cursor-pointer transition-all ${scheduleType === "now" ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`}
                onClick={() => setScheduleType("now")}
              >
                <CardContent className="p-4 text-center">
                  <Send className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-semibold">Send Now</p>
                  <p className="text-xs text-muted-foreground">Deliver immediately</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${scheduleType === "scheduled" ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"}`}
                onClick={() => setScheduleType("scheduled")}
              >
                <CardContent className="p-4 text-center">
                  <Calendar className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                  <p className="text-sm font-semibold">Schedule</p>
                  <p className="text-xs text-muted-foreground">Pick date & time</p>
                </CardContent>
              </Card>
            </div>

            {scheduleType === "scheduled" && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <input type="datetime-local" className="text-sm border border-border rounded-md px-3 py-2 flex-1" />
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card>
              <CardContent className="p-4">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Campaign Summary</h5>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div><span className="text-lg">{selectedTemplate.emoji}</span><p className="font-medium mt-1">{selectedTemplate.name}</p></div>
                  <div><span className="text-lg">👥</span><p className="font-medium mt-1 capitalize">{selectedRecipients.replace(/_/g, " ")}</p></div>
                  <div><span className="text-lg">{scheduleType === "now" ? "🚀" : "📅"}</span><p className="font-medium mt-1">{scheduleType === "now" ? "Immediately" : "Scheduled"}</p></div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-2">
              <button onClick={() => setCampaignStep("customize")} className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">← Back</button>
              <div className="flex gap-2">
                <button className="text-xs px-4 py-2 rounded-lg border border-border font-medium hover:bg-muted">📧 Send Test</button>
                <button
                  onClick={() => setCampaignSent(true)}
                  className="text-xs px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
                >{scheduleType === "now" ? "✓ Send Campaign" : "📅 Schedule Campaign"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
