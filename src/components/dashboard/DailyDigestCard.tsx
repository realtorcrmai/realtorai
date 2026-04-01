"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MousePointerClick, Eye, TrendingUp, Phone } from "lucide-react";

type DigestData = {
  emails_sent: number;
  pending_drafts: number;
  opens_today: number;
  clicks_today: number;
  open_rate: number;
  hot_leads: Array<{ name: string; type: string; score: number }>;
};

export function DailyDigestCard() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDigest() {
      try {
        const res = await fetch("/api/cron/daily-digest", {
          headers: { "X-Digest-Request": "true" },
        });
        if (res.ok) {
          const data = await res.json();
          setDigest(data.digest);
        }
      } catch { /* silent */ }
      setLoading(false);
    }
    fetchDigest();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!digest) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">AI Email Summary</h3>
          <Badge variant="secondary" className="text-[10px]">
            Last 24h
          </Badge>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Mail className="w-3 h-3" />
            </div>
            <p className="text-lg font-bold">{digest.emails_sent}</p>
            <p className="text-[10px] text-muted-foreground">Sent</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Eye className="w-3 h-3" />
            </div>
            <p className="text-lg font-bold">{digest.opens_today}</p>
            <p className="text-[10px] text-muted-foreground">Opens</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <MousePointerClick className="w-3 h-3" />
            </div>
            <p className="text-lg font-bold">{digest.clicks_today}</p>
            <p className="text-[10px] text-muted-foreground">Clicks</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="w-3 h-3" />
            </div>
            <p className="text-lg font-bold">{digest.open_rate}%</p>
            <p className="text-[10px] text-muted-foreground">Open Rate</p>
          </div>
        </div>

        {/* Hot leads */}
        {digest.hot_leads.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-red-600 mb-1">
              🔥 Hot Leads — Act Today
            </p>
            {digest.hot_leads.map((lead, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{lead.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1">
                    {lead.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-semibold">
                    Score: {lead.score}
                  </span>
                  <Button variant="outline" size="sm" className="h-5 text-[10px] px-2 gap-0.5">
                    <Phone className="w-2.5 h-2.5" /> Call
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending */}
        {digest.pending_drafts > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {digest.pending_drafts} email{digest.pending_drafts > 1 ? "s" : ""} pending review
            </span>
            <a href="/newsletters/queue" className="text-xs text-primary hover:underline">
              Review →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
