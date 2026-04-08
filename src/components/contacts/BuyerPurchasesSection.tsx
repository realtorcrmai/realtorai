"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  DollarSign,
  Percent,
  Calendar,
  Landmark,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRight,
  User,
  Phone,
  Mail,
} from "lucide-react";
import type { Mortgage } from "@/types";
import Link from "next/link";

interface DealWithListing {
  id: string;
  title: string;
  stage: string;
  status: string;
  value: number | null;
  commission_pct: number | null;
  commission_amount: number | null;
  close_date: string | null;
  possession_date: string | null;
  subject_removal_date: string | null;
  notes: string | null;
  created_at: string;
  listings: {
    id: string;
    address: string;
    mls_number: string | null;
    list_price: number | null;
    status: string;
    notes: string | null;
  } | null;
}

interface BuyerPurchasesSectionProps {
  deals: DealWithListing[];
  mortgages: Mortgage[];
}

const MORTGAGE_TYPE_LABELS: Record<string, string> = {
  fixed: "Fixed",
  variable: "Variable",
  arm: "ARM",
};

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  showing: "Showing",
  offer: "Offer",
  conditional: "Conditional",
  subject_removal: "Subject Removal",
  closing: "Closing",
  closed: "Closed",
};

export function BuyerPurchasesSection({
  deals,
  mortgages,
}: BuyerPurchasesSectionProps) {
  const [expandedDealId, setExpandedDealId] = useState<string | null>(
    deals.length === 1 ? deals[0].id : null
  );

  if (deals.length === 0) return null;

  const wonDeals = deals.filter((d) => d.status === "won");
  const activeDeals = deals.filter((d) => d.status === "active");

  function getMortgagesForDeal(dealId: string) {
    return mortgages.filter((m) => m.deal_id === dealId);
  }

  function isRenewalSoon(renewalDate: string | null) {
    if (!renewalDate) return false;
    const renewal = new Date(renewalDate);
    const now = new Date();
    const diffDays = (renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 180;
  }

  function formatCurrency(amount: number | null) {
    if (!amount) return "—";
    return `$${Number(amount).toLocaleString("en-CA")}`;
  }

  return (
    <Card className="animate-float-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Home className="h-4 w-4" />
          Properties & Purchases
          {wonDeals.length > 0 && (
            <Badge className="bg-[#0F7694]/10 text-[#0A6880] border-[#0F7694]/30 text-[10px] px-1.5 py-0">
              {wonDeals.length} Purchased
            </Badge>
          )}
          {activeDeals.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {activeDeals.length} Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deals.map((deal) => {
            const isExpanded = expandedDealId === deal.id;
            const dealMortgages = getMortgagesForDeal(deal.id);
            const isWon = deal.status === "won";
            const isLost = deal.status === "lost";

            return (
              <div
                key={deal.id}
                className={`rounded-lg border transition-colors ${
                  isWon
                    ? "border-[#0F7694]/20 bg-[#0F7694]/5/30"
                    : isLost
                    ? "border-muted bg-muted/20 opacity-60"
                    : "border-[#0F7694]/20 bg-[#0F7694]/5"
                }`}
              >
                {/* Summary row */}
                <button
                  onClick={() =>
                    setExpandedDealId(isExpanded ? null : deal.id)
                  }
                  className="flex items-center justify-between w-full p-4 text-left group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{deal.title}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          isWon
                            ? "bg-[#0F7694]/10 text-[#0A6880] border-[#0F7694]/30"
                            : isLost
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-[#0F7694]/10 text-[#0A6880] border-[#0F7694]/30"
                        }`}
                      >
                        {isWon ? "Purchased" : isLost ? "Lost" : STAGE_LABELS[deal.stage] ?? deal.stage}
                      </Badge>
                    </div>

                    {/* Property address */}
                    {deal.listings && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{deal.listings.address}</span>
                        {deal.listings.mls_number && (
                          <span className="text-muted-foreground/60">
                            · MLS {deal.listings.mls_number}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quick stats row */}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      {deal.value && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(deal.value)}
                        </span>
                      )}
                      {deal.close_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {isWon ? "Closed" : "Est. close"}{" "}
                          {new Date(deal.close_date).toLocaleDateString("en-CA")}
                        </span>
                      )}
                      {dealMortgages.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Landmark className="h-3 w-3" />
                          {dealMortgages.length} mortgage{dealMortgages.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-4">
                    {/* Deal details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      {deal.value && (
                        <div>
                          <span className="text-muted-foreground text-xs">Purchase Price</span>
                          <p className="font-medium">{formatCurrency(deal.value)}</p>
                        </div>
                      )}
                      {deal.commission_pct && (
                        <div>
                          <span className="text-muted-foreground text-xs">Commission</span>
                          <p>
                            {deal.commission_pct}% ({formatCurrency(deal.commission_amount)})
                          </p>
                        </div>
                      )}
                      {deal.close_date && (
                        <div>
                          <span className="text-muted-foreground text-xs">Close Date</span>
                          <p>{new Date(deal.close_date).toLocaleDateString("en-CA")}</p>
                        </div>
                      )}
                      {deal.possession_date && (
                        <div>
                          <span className="text-muted-foreground text-xs">Possession Date</span>
                          <p>{new Date(deal.possession_date).toLocaleDateString("en-CA")}</p>
                        </div>
                      )}
                      {deal.subject_removal_date && (
                        <div>
                          <span className="text-muted-foreground text-xs">Subject Removal</span>
                          <p>
                            {new Date(deal.subject_removal_date).toLocaleDateString("en-CA")}
                          </p>
                        </div>
                      )}
                    </div>

                    {deal.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                        {deal.notes}
                      </p>
                    )}

                    {/* Mortgages for this deal */}
                    {dealMortgages.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Landmark className="h-3 w-3" />
                          Mortgage Details
                        </h4>
                        <div className="space-y-2">
                          {dealMortgages.map((mortgage) => {
                            const renewalSoon = isRenewalSoon(mortgage.renewal_date);

                            return (
                              <div
                                key={mortgage.id}
                                className={`rounded-md border p-3 ${
                                  renewalSoon
                                    ? "border-amber-300 bg-amber-50/50"
                                    : "border-border/40 bg-background"
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium">
                                    {mortgage.lender_name}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {MORTGAGE_TYPE_LABELS[mortgage.mortgage_type] ??
                                      mortgage.mortgage_type}
                                  </Badge>
                                  {renewalSoon && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300"
                                    >
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Renewal Soon
                                    </Badge>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-2 text-sm">
                                  {mortgage.mortgage_amount && (
                                    <div>
                                      <span className="text-muted-foreground text-xs">
                                        Amount
                                      </span>
                                      <p className="flex items-center gap-1">
                                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                                        {Number(mortgage.mortgage_amount).toLocaleString("en-CA")}
                                      </p>
                                    </div>
                                  )}
                                  {mortgage.interest_rate && (
                                    <div>
                                      <span className="text-muted-foreground text-xs">
                                        Interest Rate
                                      </span>
                                      <p className="flex items-center gap-1">
                                        <Percent className="h-3 w-3 text-muted-foreground" />
                                        {mortgage.interest_rate}%
                                      </p>
                                    </div>
                                  )}
                                  {mortgage.monthly_payment && (
                                    <div>
                                      <span className="text-muted-foreground text-xs">
                                        Monthly Payment
                                      </span>
                                      <p>
                                        ${Number(mortgage.monthly_payment).toLocaleString("en-CA")}
                                      </p>
                                    </div>
                                  )}
                                  {mortgage.term_months && (
                                    <div>
                                      <span className="text-muted-foreground text-xs">
                                        Term
                                      </span>
                                      <p>{mortgage.term_months} months</p>
                                    </div>
                                  )}
                                  {mortgage.amortization_years && (
                                    <div>
                                      <span className="text-muted-foreground text-xs">
                                        Amortization
                                      </span>
                                      <p>{mortgage.amortization_years} years</p>
                                    </div>
                                  )}
                                  {mortgage.start_date && (
                                    <div>
                                      <span className="text-muted-foreground text-xs">
                                        Start Date
                                      </span>
                                      <p>
                                        {new Date(mortgage.start_date).toLocaleDateString("en-CA")}
                                      </p>
                                    </div>
                                  )}
                                  {mortgage.renewal_date && (
                                    <div>
                                      <span className="text-muted-foreground text-xs">
                                        Renewal Date
                                      </span>
                                      <p>
                                        {new Date(mortgage.renewal_date).toLocaleDateString("en-CA")}
                                      </p>
                                    </div>
                                  )}
                                  {mortgage.lender_contact && (
                                    <div>
                                      <span className="text-muted-foreground text-xs">
                                        Lender Contact
                                      </span>
                                      <p className="flex items-center gap-1">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        {mortgage.lender_contact}
                                      </p>
                                    </div>
                                  )}
                                  {mortgage.lender_phone && (
                                    <div>
                                      <span className="text-muted-foreground text-xs">
                                        Lender Phone
                                      </span>
                                      <p className="flex items-center gap-1">
                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                        {mortgage.lender_phone}
                                      </p>
                                    </div>
                                  )}
                                  {mortgage.lender_email && (
                                    <div>
                                      <span className="text-muted-foreground text-xs">
                                        Lender Email
                                      </span>
                                      <p className="flex items-center gap-1">
                                        <Mail className="h-3 w-3 text-muted-foreground" />
                                        {mortgage.lender_email}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {mortgage.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 bg-muted/30 rounded px-2 py-1.5">
                                    {mortgage.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Link to deal page */}
                    <Link
                      href={`/pipeline/${deal.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      View full deal details
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
