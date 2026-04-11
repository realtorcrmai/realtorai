"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * ListingBlastAutomation — shows on the Workflows tab.
 * Displays the automated listing alert blast configuration.
 */
export function ListingBlastAutomation() {
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-[#0F7694]/5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏠</span>
            <div>
              <h3 className="text-sm font-bold">Listing Blast Automation</h3>
              <p className="text-xs text-muted-foreground">
                Auto-send new listing alerts to matching buyer contacts
              </p>
            </div>
          </div>
          <Badge className="bg-brand-muted text-brand-dark hover:bg-brand-muted text-[11px]">
            Active
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/60 rounded-lg p-3 border">
            <p className="text-lg font-bold text-primary">Auto</p>
            <p className="text-[10px] text-muted-foreground">
              Triggers on new listing
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-3 border">
            <p className="text-lg font-bold text-primary">Match</p>
            <p className="text-[10px] text-muted-foreground">
              By area, price, type
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-3 border">
            <p className="text-lg font-bold text-primary">AI</p>
            <p className="text-[10px] text-muted-foreground">
              Personalized content
            </p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-3">
          When a new listing is created, the AI automatically identifies matching
          buyer contacts and sends personalized listing alerts. Each email is
          quality-scored before sending.
        </p>
      </CardContent>
    </Card>
  );
}
