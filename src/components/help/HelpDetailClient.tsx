"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { HelpFeature } from "@/lib/help-parser";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "usecases", label: "Use Cases" },
  { id: "features", label: "Features" },
  { id: "faq", label: "FAQ" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function HelpDetailClient({ feature }: { feature: HelpFeature }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div>
      {/* Tabs */}
      <div role="tablist" aria-label="Help article sections" className="flex gap-1 mb-6 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.label}
            {tab.id === "usecases" && feature.scenarioCount > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground/60">({feature.scenarioCount})</span>
            )}
            {tab.id === "faq" && feature.faq.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground/60">({feature.faq.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="min-h-[300px]"
      >
        {activeTab === "overview" && <OverviewPanel feature={feature} />}
        {activeTab === "usecases" && <UseCasesPanel feature={feature} />}
        {activeTab === "features" && <FeaturesPanel feature={feature} />}
        {activeTab === "faq" && <FAQPanel feature={feature} />}
      </div>
    </div>
  );
}

// ── Overview Tab ────────────────────────────────────────────

function OverviewPanel({ feature }: { feature: HelpFeature }) {
  return (
    <div className="space-y-6">
      {/* Problem */}
      <section className="lf-card p-5">
        <h3 className="font-semibold text-foreground mb-2">What it does</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{feature.problem}</p>
      </section>

      {/* Roles */}
      {feature.roles.length > 0 && (
        <section className="lf-card p-5">
          <h3 className="font-semibold text-foreground mb-3">Who uses it</h3>
          <div className="space-y-3">
            {feature.roles.map((role) => (
              <div key={role.name} className="flex items-start gap-3">
                <span className="text-lg" aria-hidden="true">👤</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{role.name}</p>
                  <p className="text-xs text-muted-foreground">{role.access} — {role.actions}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Where in CRM */}
      {feature.relatedRoutes.length > 0 && (
        <section className="lf-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Where in the CRM</h3>
          <div className="flex flex-wrap gap-2">
            {feature.relatedRoutes.map((route) => (
              <a
                key={route}
                href={route}
                className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                {route}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="lf-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{feature.scenarioCount}</p>
          <p className="text-xs text-muted-foreground">Scenarios</p>
        </div>
        <div className="lf-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{feature.features.length}</p>
          <p className="text-xs text-muted-foreground">Features</p>
        </div>
        <div className="lf-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{feature.faq.length}</p>
          <p className="text-xs text-muted-foreground">FAQ</p>
        </div>
      </div>
    </div>
  );
}

// ── Use Cases Tab ───────────────────────────────────────────

function UseCasesPanel({ feature }: { feature: HelpFeature }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (feature.scenarios.length === 0) {
    return <p className="text-muted-foreground text-sm">No scenarios documented yet.</p>;
  }

  return (
    <div className="space-y-3">
      {feature.scenarios.map((scenario, idx) => (
        <div key={idx} className="lf-card overflow-hidden">
          <button
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            aria-expanded={expandedIdx === idx}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">{scenario.name}</span>
            <span className="text-muted-foreground text-xs shrink-0 ml-2">
              {expandedIdx === idx ? "▼" : "▶"}
            </span>
          </button>

          {expandedIdx === idx && (
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {/* Preconditions */}
              {scenario.preconditions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Preconditions</h4>
                  <ul className="space-y-1">
                    {scenario.preconditions.map((p, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5" aria-hidden="true">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Steps */}
              {scenario.steps.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Steps</h4>
                  <ol className="space-y-2">
                    {scenario.steps.map((step, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Expected Outcome */}
              {scenario.expectedOutcome && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Expected Outcome</h4>
                  <p className="text-sm text-foreground bg-[#0F7694]/5 dark:bg-[#1a1535]/20 p-3 rounded-lg border border-[#0F7694]/20 dark:border-green-800">
                    {scenario.expectedOutcome}
                  </p>
                </div>
              )}

              {/* Edge Cases */}
              {scenario.edgeCases.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Edge Cases</h4>
                  <ul className="space-y-1">
                    {scenario.edgeCases.map((e, i) => (
                      <li key={i} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                        <span aria-hidden="true">⚠️</span>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Features Tab ────────────────────────────────────────────

function FeaturesPanel({ feature }: { feature: HelpFeature }) {
  if (feature.features.length === 0) {
    return <p className="text-muted-foreground text-sm">No features documented yet.</p>;
  }

  return (
    <div className="space-y-3">
      {feature.features.map((f, idx) => (
        <div key={idx} className="lf-card p-4">
          <h3 className="text-sm font-semibold text-foreground">{f.name}</h3>
          {f.description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── FAQ Tab ─────────────────────────────────────────────────

function FAQPanel({ feature }: { feature: HelpFeature }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (feature.faq.length === 0) {
    return <p className="text-muted-foreground text-sm">No FAQ entries yet.</p>;
  }

  return (
    <div className="space-y-2">
      {feature.faq.map((item, idx) => (
        <div key={idx} className="lf-card overflow-hidden">
          <button
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            aria-expanded={expandedIdx === idx}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">{item.question}</span>
            <span className="text-muted-foreground text-xs shrink-0 ml-2">
              {expandedIdx === idx ? "▼" : "▶"}
            </span>
          </button>
          {expandedIdx === idx && (
            <div className="px-4 pb-4 border-t border-border pt-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
