"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sendTestTemplateEmail } from "@/actions/newsletters";

export interface TemplateCard {
  slug: string;
  displayName: string;
  description: string;
  icon: string;
  timing: string;
  subject: string;
  html: string;
}

export interface PhaseGroup {
  phase: string;
  phaseLabel: string;
  phaseIcon: string;
  emails: TemplateCard[];
}

interface Props {
  buyerJourney: PhaseGroup[];
  sellerJourney: PhaseGroup[];
  eventTemplates: TemplateCard[];
  greetingOccasions: string[];
}

const PHASE_LABELS: Record<string, string> = {
  lead: "New Contact",
  active: "Active Buyer/Seller",
  under_contract: "Under Contract",
  past_client: "Past Client",
  dormant: "Dormant",
};

const PHASE_ICONS: Record<string, string> = {
  lead: "🟢",
  active: "🔥",
  under_contract: "📝",
  past_client: "⭐",
  dormant: "❄️",
};

function formatDelay(hours: number): string {
  if (hours === 0) return "Immediately";
  if (hours < 24) return `${hours}h after`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Day 1";
  if (days < 7) return `Day ${days}`;
  const weeks = Math.round(days / 7);
  if (weeks === 1) return "Week 1";
  if (days < 60) return `Week ${weeks}`;
  const months = Math.round(days / 30);
  if (months === 1) return "1 month";
  if (days < 365) return `${months} months`;
  return "1 year";
}

function TemplateCardComponent({
  card,
  onClick,
}: {
  card: TemplateCard;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left w-full rounded-lg border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all overflow-hidden"
    >
      {/* Scaled iframe preview */}
      <div className="relative w-full overflow-hidden bg-white" style={{ height: 240 }}>
        <iframe
          srcDoc={card.html}
          sandbox=""
          className="pointer-events-none origin-top-left border-0"
          style={{
            width: 600,
            height: 686,
            transform: "scale(0.35)",
            transformOrigin: "top left",
          }}
          title={card.displayName}
          loading="lazy"
        />
      </div>
      {/* Info */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{card.icon}</span>
          <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {card.displayName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {card.timing}
          </Badge>
        </div>
      </div>
    </button>
  );
}

function PhaseSection({
  group,
  defaultOpen,
  onSelectTemplate,
}: {
  group: PhaseGroup;
  defaultOpen: boolean;
  onSelectTemplate: (card: TemplateCard) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{group.phaseIcon}</span>
          <span className="text-sm font-semibold">{group.phaseLabel}</span>
          <Badge variant="secondary" className="text-[10px]">
            {group.emails.length} email{group.emails.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {group.emails.map((card) => (
            <TemplateCardComponent
              key={card.slug + "-" + card.timing}
              card={card}
              onClick={() => onSelectTemplate(card)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TemplateGalleryClient({
  buyerJourney,
  sellerJourney,
  eventTemplates,
  greetingOccasions,
}: Props) {
  const [activeSection, setActiveSection] = useState<"buyer" | "seller" | "alerts">("buyer");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateCard | null>(null);
  const [sendingTest, startSendTest] = useTransition();
  const [testResult, setTestResult] = useState<{ success?: boolean; sentTo?: string; error?: string } | null>(null);

  function handleSendTest(card: TemplateCard) {
    setTestResult(null);
    startSendTest(async () => {
      const result = await sendTestTemplateEmail(card.slug, card.subject, card.html);
      setTestResult(result);
    });
  }

  const sections = [
    { id: "buyer" as const, label: "Buyer Journey", count: buyerJourney.reduce((n, g) => n + g.emails.length, 0) },
    { id: "seller" as const, label: "Seller Journey", count: sellerJourney.reduce((n, g) => n + g.emails.length, 0) },
    { id: "alerts" as const, label: "Smart Alerts & Greetings", count: eventTemplates.length },
  ];

  return (
    <>
      {/* Section tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition-all whitespace-nowrap border-b-2 -mb-px ${
              activeSection === s.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
            <Badge
              variant={activeSection === s.id ? "default" : "secondary"}
              className="text-[10px] px-1.5 py-0"
            >
              {s.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Buyer Journey */}
      {activeSection === "buyer" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Every buyer contact receives these emails automatically as they move through the buying journey.
            AI personalizes each email with the contact's preferences, area interests, and market data.
          </p>
          {buyerJourney.map((group, i) => (
            <PhaseSection
              key={group.phase}
              group={group}
              defaultOpen={i === 0}
              onSelectTemplate={setSelectedTemplate}
            />
          ))}
        </div>
      )}

      {/* Seller Journey */}
      {activeSection === "seller" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Every seller contact receives these emails automatically as they move through the selling journey.
            AI personalizes each email with the seller's property details and local market data.
          </p>
          {sellerJourney.map((group, i) => (
            <PhaseSection
              key={group.phase}
              group={group}
              defaultOpen={i === 0}
              onSelectTemplate={setSelectedTemplate}
            />
          ))}
        </div>
      )}

      {/* Smart Alerts & Greetings */}
      {activeSection === "alerts" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            These emails are triggered by real-time events — a listing sells, a price drops, a showing is confirmed.
            They're sent once when the event occurs, not on a schedule.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {eventTemplates.map((card) => (
              <TemplateCardComponent
                key={card.slug}
                card={card}
                onClick={() => setSelectedTemplate(card)}
              />
            ))}
          </div>

          {/* Greetings info card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎂</span>
                <h4 className="text-sm font-semibold">Greeting Automations</h4>
                <Badge variant="secondary" className="text-[10px]">
                  {greetingOccasions.length} occasions
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                AI writes a unique greeting for each occasion based on your contact's relationship history.
                Configure which occasions are active in Settings.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {greetingOccasions.map((occasion) => (
                  <Badge key={occasion} variant="outline" className="text-[10px] capitalize">
                    {occasion.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full preview dialog */}
      <Dialog
        open={!!selectedTemplate}
        onOpenChange={(open) => { if (!open) { setSelectedTemplate(null); setTestResult(null); } }}
      >
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
          {selectedTemplate && (
            <>
              <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedTemplate.icon}</span>
                  <div>
                    <DialogTitle className="text-base">
                      {selectedTemplate.displayName}
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Subject: {selectedTemplate.subject}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedTemplate.description}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-[10px] text-muted-foreground/70 italic flex-1">
                    AI personalizes this email with each contact's details, area preferences, and market data.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendingTest}
                    onClick={() => handleSendTest(selectedTemplate)}
                    className="text-xs shrink-0"
                  >
                    {sendingTest ? "Sending..." : "Send Test"}
                  </Button>
                  <Link
                    href={`/newsletters/templates/${selectedTemplate.slug}`}
                    className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    Full Page
                  </Link>
                </div>
                {testResult && (
                  <div className={`mt-2 text-xs px-3 py-2 rounded-md ${testResult.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    {testResult.success
                      ? `Sent to ${testResult.sentTo}`
                      : `Failed: ${testResult.error}`}
                  </div>
                )}
              </DialogHeader>
              <div className="flex-1 overflow-hidden">
                <iframe
                  srcDoc={selectedTemplate.html}
                  sandbox=""
                  className="w-full h-full border-0"
                  title={selectedTemplate.displayName}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
