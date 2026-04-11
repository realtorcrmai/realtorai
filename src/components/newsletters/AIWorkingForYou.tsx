"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SuccessStory {
  contactId: string;
  contactName: string;
  contactType: string;
  icon: string;
  story: string;
  score?: number;
}

interface UpcomingSend {
  date: string;
  label: string;
  emailType: string;
  count: number;
}

interface AIWorkingForYouProps {
  totalSent: number;
  openRate: number;
  clickRate: number;
  hotLeadCount: number;
  successStories: SuccessStory[];
  upcomingSends: UpcomingSend[];
}

/**
 * AIWorkingForYou — hero card on the AI Agent tab showing
 * AI performance summary, success stories, and upcoming sends.
 */
export function AIWorkingForYou({
  totalSent,
  openRate,
  clickRate,
  hotLeadCount,
  successStories,
  upcomingSends,
}: AIWorkingForYouProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-[#0F7694]/5">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🤖</span>
            <div>
              <h3 className="text-sm font-bold">AI Working For You</h3>
              <p className="text-xs text-muted-foreground">
                Your AI agent is nurturing contacts 24/7
              </p>
            </div>
          </div>
          <Badge className="bg-brand-muted text-brand-dark hover:bg-brand-muted text-[11px]">
            Active
          </Badge>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white/60 rounded-lg p-2.5 border text-center">
            <p className="text-lg font-bold text-primary">{totalSent}</p>
            <p className="text-[10px] text-muted-foreground">Emails Sent</p>
          </div>
          <div className="bg-white/60 rounded-lg p-2.5 border text-center">
            <p className="text-lg font-bold text-brand">{openRate}%</p>
            <p className="text-[10px] text-muted-foreground">Open Rate</p>
          </div>
          <div className="bg-white/60 rounded-lg p-2.5 border text-center">
            <p className="text-lg font-bold text-brand">{clickRate}%</p>
            <p className="text-[10px] text-muted-foreground">Click Rate</p>
          </div>
          <div className="bg-white/60 rounded-lg p-2.5 border text-center">
            <p className="text-lg font-bold text-red-600">{hotLeadCount}</p>
            <p className="text-[10px] text-muted-foreground">Hot Leads</p>
          </div>
        </div>

        {/* Success stories */}
        {successStories.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Success Stories
            </h4>
            <div className="space-y-1.5">
              {successStories.map((story, i) => (
                <div
                  key={`${story.contactId}-${i}`}
                  className="flex items-center gap-2 bg-white/50 rounded-md p-2 border"
                >
                  <span className="text-sm shrink-0">{story.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold truncate">
                        {story.contactName}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          story.contactType === "buyer"
                            ? "bg-brand-muted text-brand-dark"
                            : "bg-brand-muted text-brand-dark"
                        }`}
                      >
                        {story.contactType.toUpperCase()}
                      </span>
                      {story.score !== undefined && (
                        <span className="text-[9px] text-muted-foreground">
                          Score {story.score}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {story.story}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming sends */}
        {upcomingSends.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Upcoming Sends
            </h4>
            <div className="flex flex-wrap gap-2">
              {upcomingSends.map((send, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-white/50 rounded-md px-2.5 py-1.5 border text-xs"
                >
                  <span className="font-semibold text-primary">
                    {send.date}
                  </span>
                  <span className="text-muted-foreground">
                    {send.count} {send.emailType.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
