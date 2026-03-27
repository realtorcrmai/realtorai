"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SuccessStory = {
  contactId: string;
  contactName: string;
  contactType: string;
  icon: string;
  story: string;
  score?: number;
};

type UpcomingSend = {
  date: string;
  label: string;
  emailType: string;
  count: number;
};

type Props = {
  totalSent: number;
  openRate: number;
  clickRate: number;
  hotLeadCount: number;
  successStories: SuccessStory[];
  upcomingSends: UpcomingSend[];
};

export function AIWorkingForYou({
  totalSent,
  openRate,
  clickRate,
  hotLeadCount,
  successStories,
  upcomingSends,
}: Props) {
  const timeSavedMinutes = totalSent * 15;
  const timeSavedHours = Math.round(timeSavedMinutes / 60);
  const timeSavedDisplay =
    timeSavedHours >= 1
      ? `${timeSavedHours}h`
      : `${timeSavedMinutes}m`;

  return (
    <div className="space-y-4">
      {/* Impact Stats */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-semibold mb-4">AI Working For You</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalSent}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Emails Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{timeSavedDisplay}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Time Saved</div>
              <div className="text-[10px] text-muted-foreground">~15 min per email</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{openRate}%</div>
              <div className="text-[10px] text-muted-foreground uppercase">Open Rate</div>
              {openRate > 21 && (
                <div className="text-[10px] text-emerald-600 font-medium">
                  {(openRate / 21).toFixed(1)}x industry avg
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{hotLeadCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Hot Leads</div>
              <div className="text-[10px] text-muted-foreground">from AI emails</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Stories + Upcoming in a row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Success Stories */}
        <Card>
          <CardContent className="p-5">
            <h4 className="text-sm font-semibold mb-3">AI Success Stories</h4>
            {successStories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                AI is learning your contacts. Stories will appear as engagement grows.
              </p>
            ) : (
              successStories.map((story, i) => (
                <div
                  key={story.contactId + i}
                  className="flex items-start gap-2.5 py-2.5 border-b border-border last:border-0"
                >
                  <span className="text-lg shrink-0 mt-0.5">{story.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <a
                        href={`/contacts/${story.contactId}`}
                        className="text-sm font-medium hover:text-primary transition-colors truncate"
                      >
                        {story.contactName}
                      </a>
                      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                        {story.contactType}
                      </Badge>
                      {typeof story.score === "number" && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${
                            story.score >= 60
                              ? "text-red-600 border-red-200"
                              : "text-amber-600 border-amber-200"
                          }`}
                        >
                          {story.score}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{story.story}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Coming Up Next */}
        <Card>
          <CardContent className="p-5">
            <h4 className="text-sm font-semibold mb-3">Coming Up Next</h4>
            {upcomingSends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No emails scheduled. Enroll contacts to start journeys.
              </p>
            ) : (
              upcomingSends.map((send, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {send.count}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {send.emailType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">{send.label}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{send.date}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
