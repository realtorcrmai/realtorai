"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Landmark,
  Plus,
  Trash2,
  Calendar,
  Percent,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Mortgage } from "@/types";

interface MortgageSectionProps {
  dealId: string;
  contactId: string | null;
  mortgages: Mortgage[];
}

const MORTGAGE_TYPE_LABELS: Record<string, string> = {
  fixed: "Fixed",
  variable: "Variable",
  arm: "ARM",
};

export function MortgageSection({
  dealId,
  contactId,
  mortgages: initialMortgages,
}: MortgageSectionProps) {
  const [mortgages, setMortgages] = useState(initialMortgages);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function addMortgage(formData: FormData) {
    const body: Record<string, unknown> = {
      lender_name: formData.get("lender_name"),
      mortgage_type: formData.get("mortgage_type"),
      contact_id: contactId,
    };

    const numericFields = ["mortgage_amount", "interest_rate", "term_months", "amortization_years", "monthly_payment"];
    for (const f of numericFields) {
      const val = formData.get(f) as string;
      if (val) body[f] = Number(val);
    }

    const stringFields = ["start_date", "renewal_date", "lender_contact", "lender_phone", "lender_email", "notes"];
    for (const f of stringFields) {
      const val = formData.get(f) as string;
      if (val) body[f] = val;
    }

    const res = await fetch(`/api/deals/${dealId}/mortgages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const newMortgage = await res.json();
      setMortgages((prev) => [newMortgage, ...prev]);
      setShowForm(false);
    }
  }

  async function removeMortgage(mortgageId: string) {
    const res = await fetch(`/api/deals/${dealId}/mortgages?mortgage_id=${mortgageId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMortgages((prev) => prev.filter((m) => m.id !== mortgageId));
    }
  }

  function isRenewalSoon(renewalDate: string | null) {
    if (!renewalDate) return false;
    const renewal = new Date(renewalDate);
    const now = new Date();
    const diffMs = renewal.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 180;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Mortgage Details
            {mortgages.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {mortgages.length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {mortgages.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No mortgage details added yet.
          </p>
        ) : (
          <div className="space-y-3">
            {mortgages.map((mortgage) => {
              const isExpanded = expandedId === mortgage.id;
              const renewalSoon = isRenewalSoon(mortgage.renewal_date);

              return (
                <div
                  key={mortgage.id}
                  className={`rounded-lg border transition-colors ${
                    renewalSoon
                      ? "border-amber-300 bg-amber-50/50"
                      : "border-border/40"
                  }`}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : mortgage.id)}
                    className="flex items-center justify-between w-full p-3 text-left group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{mortgage.lender_name}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {MORTGAGE_TYPE_LABELS[mortgage.mortgage_type] ?? mortgage.mortgage_type}
                        </Badge>
                        {renewalSoon && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Renewal Soon
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {mortgage.mortgage_amount && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {Number(mortgage.mortgage_amount).toLocaleString("en-CA")}
                          </span>
                        )}
                        {mortgage.interest_rate && (
                          <span className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            {mortgage.interest_rate}%
                          </span>
                        )}
                        {mortgage.renewal_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Renews {new Date(mortgage.renewal_date).toLocaleDateString("en-CA")}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/30 pt-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        {mortgage.term_months && (
                          <div>
                            <span className="text-muted-foreground text-xs">Term</span>
                            <p>{mortgage.term_months} months</p>
                          </div>
                        )}
                        {mortgage.amortization_years && (
                          <div>
                            <span className="text-muted-foreground text-xs">Amortization</span>
                            <p>{mortgage.amortization_years} years</p>
                          </div>
                        )}
                        {mortgage.monthly_payment && (
                          <div>
                            <span className="text-muted-foreground text-xs">Monthly Payment</span>
                            <p>${Number(mortgage.monthly_payment).toLocaleString("en-CA")}</p>
                          </div>
                        )}
                        {mortgage.start_date && (
                          <div>
                            <span className="text-muted-foreground text-xs">Start Date</span>
                            <p>{new Date(mortgage.start_date).toLocaleDateString("en-CA")}</p>
                          </div>
                        )}
                        {mortgage.lender_contact && (
                          <div>
                            <span className="text-muted-foreground text-xs">Lender Contact</span>
                            <p>{mortgage.lender_contact}</p>
                          </div>
                        )}
                        {mortgage.lender_phone && (
                          <div>
                            <span className="text-muted-foreground text-xs">Lender Phone</span>
                            <p>{mortgage.lender_phone}</p>
                          </div>
                        )}
                        {mortgage.lender_email && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground text-xs">Lender Email</span>
                            <p>{mortgage.lender_email}</p>
                          </div>
                        )}
                        {mortgage.notes && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground text-xs">Notes</span>
                            <p className="whitespace-pre-wrap">{mortgage.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => removeMortgage(mortgage.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add mortgage form */}
        {showForm ? (
          <MortgageForm
            onSubmit={addMortgage}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Mortgage
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function MortgageForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="mt-3 space-y-3 p-3 rounded-lg border border-border/40 bg-muted/30"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          name="lender_name"
          required
          placeholder="Lender name *"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        />
        <select
          name="mortgage_type"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        >
          <option value="fixed">Fixed Rate</option>
          <option value="variable">Variable Rate</option>
          <option value="arm">ARM</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input
          name="mortgage_amount"
          type="number"
          step="0.01"
          placeholder="Mortgage amount"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        />
        <input
          name="interest_rate"
          type="number"
          step="0.001"
          placeholder="Rate %"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        />
        <input
          name="monthly_payment"
          type="number"
          step="0.01"
          placeholder="Monthly payment"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Term (months)</label>
          <input
            name="term_months"
            type="number"
            placeholder="e.g. 60"
            className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Amortization (years)</label>
          <input
            name="amortization_years"
            type="number"
            placeholder="e.g. 25"
            className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Start Date</label>
          <input
            name="start_date"
            type="date"
            className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Renewal Date</label>
          <input
            name="renewal_date"
            type="date"
            className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input
          name="lender_contact"
          placeholder="Lender contact"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        />
        <input
          name="lender_phone"
          placeholder="Lender phone"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        />
        <input
          name="lender_email"
          type="email"
          placeholder="Lender email"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        />
      </div>

      <textarea
        name="notes"
        placeholder="Notes (optional)"
        rows={2}
        className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background resize-none"
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Add Mortgage
        </Button>
      </div>
    </form>
  );
}
