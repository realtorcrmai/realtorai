"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { HelpFeature } from "@/lib/help-parser";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "usecases", label: "Use Cases" },
  { id: "procedures", label: "How-To" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "faq", label: "FAQ" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function HelpDetailClient({ feature }: { feature: HelpFeature }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Only show tabs that have content
  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "overview") return true; // always show
    if (tab.id === "usecases") return feature.scenarioCount > 0;
    if (tab.id === "procedures") return feature.procedureCount > 0;
    if (tab.id === "troubleshooting") return feature.troubleshootingCount > 0;
    if (tab.id === "faq") return feature.faqCount > 0;
    return true;
  });

  return (
    <div>
      {/* Tabs */}
      <div role="tablist" aria-label="Help article sections" className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {visibleTabs.map((tab) => {
          const count = tab.id === "usecases" ? feature.scenarioCount
            : tab.id === "procedures" ? feature.procedureCount
            : tab.id === "troubleshooting" ? feature.troubleshootingCount
            : tab.id === "faq" ? feature.faqCount : 0;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
              {count > 0 && <span className="ml-1.5 text-xs text-muted-foreground/60">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div role="tabpanel" id={`panel-${activeTab}`} className="min-h-[300px]">
        {activeTab === "overview" && <OverviewPanel feature={feature} />}
        {activeTab === "usecases" && <UseCasesPanel feature={feature} />}
        {activeTab === "procedures" && <ProceduresPanel feature={feature} />}
        {activeTab === "troubleshooting" && <TroubleshootingPanel feature={feature} />}
        {activeTab === "faq" && <FAQPanel feature={feature} />}
      </div>
    </div>
  );
}

// ── Overview ────────────────────────────────────────────────

function OverviewPanel({ feature }: { feature: HelpFeature }) {
  return (
    <div className="space-y-6">
      <section className="lf-card p-5">
        <h3 className="font-semibold text-foreground mb-2">What it does</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{feature.problem}</p>
      </section>

      {feature.businessValue && (
        <section className="lf-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Why it matters</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{feature.businessValue}</p>
        </section>
      )}

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

      {feature.preconditions.length > 0 && (
        <section className="lf-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Before you start</h3>
          <ul className="space-y-1.5">
            {feature.preconditions.map((p, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5" aria-hidden="true">•</span>{p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {feature.keyConcepts.length > 0 && (
        <section className="lf-card p-5">
          <h3 className="font-semibold text-foreground mb-3">Key concepts</h3>
          <div className="space-y-2">
            {feature.keyConcepts.map((kc, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-sm font-medium text-foreground min-w-[120px]">{kc.term}</span>
                <span className="text-sm text-muted-foreground">{kc.definition}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {feature.coreWorkflow.length > 0 && (
        <section className="lf-card p-5">
          <h3 className="font-semibold text-foreground mb-3">How it works</h3>
          <ol className="space-y-2">
            {feature.coreWorkflow.map((step, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {feature.relatedRoutes.length > 0 && (
        <section className="lf-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Where in the CRM</h3>
          <div className="flex flex-wrap gap-2">
            {feature.relatedRoutes.map((route) => (
              <a key={route} href={route} className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg bg-primary/5 text-primary hover:bg-primary/10 transition-colors">{route}</a>
            ))}
          </div>
        </section>
      )}

      {feature.edgeCaseCount > 0 && (
        <section className="lf-card p-5">
          <h3 className="font-semibold text-foreground mb-3">Watch out for</h3>
          <ul className="space-y-2">
            {feature.edgeCases.slice(0, 5).map((ec, i) => (
              <li key={i} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <span aria-hidden="true">⚠️</span>{ec}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { n: feature.scenarioCount, label: "Scenarios" },
          { n: feature.procedureCount, label: "Procedures" },
          { n: feature.faqCount, label: "FAQ" },
          { n: feature.troubleshootingCount, label: "Troubleshooting" },
        ].map((s) => (
          <div key={s.label} className="lf-card p-3 text-center">
            <p className="text-xl font-bold text-foreground">{s.n}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Use Cases ───────────────────────────────────────────────

function UseCasesPanel({ feature }: { feature: HelpFeature }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  if (feature.scenarios.length === 0) return <EmptySection label="scenarios" />;

  return (
    <div className="space-y-3">
      {feature.scenarios.map((scenario, idx) => (
        <div key={idx} className="lf-card overflow-hidden">
          <button onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)} aria-expanded={expandedIdx === idx} className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors">
            <div>
              <span className="text-sm font-medium text-foreground">{scenario.name}</span>
              {scenario.role && <span className="ml-2 text-xs text-muted-foreground">({scenario.role})</span>}
            </div>
            <span className="text-muted-foreground text-xs shrink-0 ml-2">{expandedIdx === idx ? "▼" : "▶"}</span>
          </button>
          {expandedIdx === idx && (
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {scenario.goal && <Detail label="Goal" text={scenario.goal} />}
              {scenario.navigation && <Detail label="Navigation" text={scenario.navigation} />}
              {scenario.preconditions.length > 0 && <BulletSection title="Preconditions" items={scenario.preconditions} />}
              {scenario.steps.length > 0 && <NumberedSection title="Steps" items={scenario.steps} />}
              {scenario.expectedBehavior.length > 0 && <BulletSection title="Expected behavior" items={scenario.expectedBehavior} />}
              {scenario.expectedOutcome && <SuccessBox text={scenario.expectedOutcome} />}
              {scenario.edgeCases.length > 0 && <WarningSection title="Edge cases" items={scenario.edgeCases} />}
              {scenario.commonMistakes.length > 0 && <WarningSection title="Common mistakes" items={scenario.commonMistakes} />}
              {scenario.recovery.length > 0 && <BulletSection title="Recovery" items={scenario.recovery} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Procedures (How-To) ─────────────────────────────────────

function ProceduresPanel({ feature }: { feature: HelpFeature }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  if (feature.procedures.length === 0) return <EmptySection label="procedures" />;

  return (
    <div className="space-y-3">
      {feature.procedures.map((proc, idx) => (
        <div key={idx} className="lf-card overflow-hidden">
          <button onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)} aria-expanded={expandedIdx === idx} className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors">
            <span className="text-sm font-medium text-foreground">{proc.title}</span>
            <span className="text-muted-foreground text-xs shrink-0 ml-2">{expandedIdx === idx ? "▼" : "▶"}</span>
          </button>
          {expandedIdx === idx && (
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {proc.whenToUse && <Detail label="When to use" text={proc.whenToUse} />}
              {proc.startingPoint && <Detail label="Starting point" text={proc.startingPoint} />}
              {proc.steps.length > 0 && <NumberedSection title="Steps" items={proc.steps} />}
              {proc.validations.length > 0 && <BulletSection title="System validations" items={proc.validations} />}
              {proc.whatHappensNext && <Detail label="What happens next" text={proc.whatHappensNext} />}
              {proc.commonMistakes.length > 0 && <WarningSection title="Common mistakes" items={proc.commonMistakes} />}
              {proc.recovery.length > 0 && <BulletSection title="How to recover" items={proc.recovery} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Troubleshooting ─────────────────────────────────────────

function TroubleshootingPanel({ feature }: { feature: HelpFeature }) {
  if (feature.troubleshooting.length === 0) return <EmptySection label="troubleshooting items" />;

  return (
    <div className="space-y-3">
      {feature.troubleshooting.map((item, idx) => (
        <div key={idx} className="lf-card p-4">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-lg shrink-0" aria-hidden="true">🔍</span>
            <div>
              <p className="text-sm font-medium text-foreground">{item.symptom}</p>
              <p className="text-xs text-muted-foreground mt-1">Likely cause: {item.cause}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Verify</p>
              <p className="text-xs text-blue-600 dark:text-blue-300">{item.verify}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Fix</p>
              <p className="text-xs text-green-600 dark:text-green-300">{item.fix}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Escalate when</p>
              <p className="text-xs text-amber-600 dark:text-amber-300">{item.escalate}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── FAQ ─────────────────────────────────────────────────────

function FAQPanel({ feature }: { feature: HelpFeature }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  if (feature.faq.length === 0) return <EmptySection label="FAQ entries" />;

  return (
    <div className="space-y-2">
      {feature.faq.map((item, idx) => {
        // Clean the question — remove any leftover markdown heading markers
        const cleanQ = item.question.replace(/^#+\s*/, "").trim();
        return (
          <div key={idx} className="lf-card overflow-hidden">
            <button onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)} aria-expanded={expandedIdx === idx} className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors">
              <span className="text-sm font-medium text-foreground">{cleanQ}</span>
              <span className="text-muted-foreground text-xs shrink-0 ml-2">{expandedIdx === idx ? "▼" : "▶"}</span>
            </button>
            {expandedIdx === idx && (
              <div className="px-4 pb-4 border-t border-border pt-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shared Components ───────────────────────────────────────

function EmptySection({ label }: { label: string }) {
  return <p className="text-muted-foreground text-sm py-8 text-center">No {label} documented yet.</p>;
}

function Detail({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-0.5" aria-hidden="true">•</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NumberedSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{title}</p>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-foreground flex items-start gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

function WarningSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <span aria-hidden="true">⚠️</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuccessBox({ text }: { text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Expected outcome</p>
      <p className="text-sm text-foreground bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">{text}</p>
    </div>
  );
}
