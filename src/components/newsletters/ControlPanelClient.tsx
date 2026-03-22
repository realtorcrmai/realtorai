"use client";

import { useState, useTransition } from "react";
import type {
  EmailActivityItem,
  WorkflowOverview,
  ContactJourneyItem,
  ScheduleItem,
  ContactEmailHistory,
} from "@/actions/control-panel";
import {
  getEmailActivityFeed,
  getEmailHistoryForContact,
  retryFailedNewsletter,
  rescheduleEmail,
  cancelScheduledEmail,
  toggleWorkflowActive,
} from "@/actions/control-panel";
import { approveNewsletter } from "@/actions/newsletters";
import { pauseJourney, resumeJourney, advanceJourneyPhase } from "@/actions/journeys";

type Tab = "activity" | "workflows" | "contacts" | "schedule";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "activity", label: "Email Activity", emoji: "📧" },
  { key: "workflows", label: "Workflows", emoji: "⚙️" },
  { key: "contacts", label: "Contact Journeys", emoji: "👥" },
  { key: "schedule", label: "Schedule", emoji: "📅" },
];

type Props = {
  initialEmailActivity: EmailActivityItem[];
  initialWorkflows: WorkflowOverview[];
  initialJourneys: ContactJourneyItem[];
  initialSchedule: ScheduleItem[];
};

export default function ControlPanelClient({
  initialEmailActivity,
  initialWorkflows,
  initialJourneys,
  initialSchedule,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("activity");
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {/* Tab Navigation */}
      <div className="lf-card" style={{ padding: "8px 12px", marginBottom: 16, display: "flex", gap: 4, flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: activeTab === tab.key ? "linear-gradient(135deg, #4f35d2, #6c4fe6)" : "transparent",
              color: activeTab === tab.key ? "#fff" : "#6b6b8d",
              transition: "all 0.2s",
            }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {isPending && (
        <div style={{ padding: 12, textAlign: "center", color: "#6b6b8d", fontSize: 13 }}>
          Updating...
        </div>
      )}

      {activeTab === "activity" && (
        <EmailActivityTab items={initialEmailActivity} startTransition={startTransition} />
      )}
      {activeTab === "workflows" && (
        <WorkflowsTab workflows={initialWorkflows} startTransition={startTransition} />
      )}
      {activeTab === "contacts" && (
        <ContactJourneysTab journeys={initialJourneys} startTransition={startTransition} />
      )}
      {activeTab === "schedule" && (
        <ScheduleTab items={initialSchedule} startTransition={startTransition} />
      )}
    </div>
  );
}

// ── Tab 1: Email Activity ──────────────────────────────────────

function EmailActivityTab({ items, startTransition }: { items: EmailActivityItem[]; startTransition: (fn: () => void) => void }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = items.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (typeFilter !== "all" && item.email_type !== typeFilter) return false;
    return true;
  });

  const emailTypes = [...new Set(items.map((i) => i.email_type))];
  const pendingItems = filtered.filter((i) => i.status === "draft");
  const failedItems = filtered.filter((i) => i.status === "failed");

  return (
    <div>
      {/* Filters */}
      <div className="lf-card" style={{ padding: "12px 16px", marginBottom: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select className="lf-select" style={{ width: "auto", fontSize: 13 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="draft">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <select className="lf-select" style={{ width: "auto", fontSize: 13 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {emailTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: "#6b6b8d", marginLeft: "auto" }}>
          {filtered.length} emails
        </span>

        {statusFilter === "draft" && pendingItems.length > 0 && (
          <button
            className="lf-btn-sm lf-btn-success"
            onClick={() => startTransition(async () => {
              for (const item of pendingItems) await approveNewsletter(item.id);
            })}
          >
            Approve All ({pendingItems.length})
          </button>
        )}
        {statusFilter === "failed" && failedItems.length > 0 && (
          <button
            className="lf-btn-sm"
            style={{ background: "#ff5c3a", color: "#fff", border: "none" }}
            onClick={() => startTransition(async () => {
              for (const item of failedItems) await retryFailedNewsletter(item.id);
            })}
          >
            Retry All ({failedItems.length})
          </button>
        )}
      </div>

      {/* Email Rows */}
      {filtered.length === 0 ? (
        <div className="lf-card" style={{ padding: 40, textAlign: "center", color: "#6b6b8d" }}>
          No emails found
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((item) => (
            <div key={item.id}>
              <div
                className="lf-card"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                style={{ padding: "12px 16px", cursor: "pointer", transition: "all 0.15s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff",
                    background: item.contact_type === "seller" ? "linear-gradient(135deg, #4f35d2, #ff5c3a)" : "linear-gradient(135deg, #4f35d2, #8b5cf6)",
                  }}>
                    {item.contact_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1535" }}>
                      {item.contact_name}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b6b8d", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300 }}>
                      {item.subject}
                    </div>
                  </div>

                  {/* Badges */}
                  <span className={`lf-badge lf-badge-info`} style={{ fontSize: 11 }}>
                    {item.email_type.replace(/_/g, " ")}
                  </span>
                  <span className={`lf-badge ${item.status === "sent" ? "lf-badge-done" : item.status === "draft" ? "lf-badge-pending" : "lf-badge-blocked"}`} style={{ fontSize: 11 }}>
                    {item.status}
                  </span>

                  {/* Stats */}
                  {item.status === "sent" && (
                    <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#6b6b8d" }}>
                      <span title="Opens">👁 {item.open_count}</span>
                      <span title="Clicks">🖱 {item.click_count}</span>
                      {item.bounce && <span title="Bounced" style={{ color: "#dc2626" }}>⚠️</span>}
                    </div>
                  )}

                  {/* Date */}
                  <div style={{ fontSize: 12, color: "#a0a0b0", minWidth: 80, textAlign: "right" }}>
                    {item.sent_at ? new Date(item.sent_at).toLocaleDateString() : new Date(item.created_at).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  {item.status === "draft" && (
                    <button
                      className="lf-btn-sm lf-btn-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        startTransition(() => approveNewsletter(item.id));
                      }}
                      style={{ fontSize: 11 }}
                    >
                      Send
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Preview */}
              {expandedId === item.id && item.html_body && (
                <div className="lf-card" style={{ padding: 16, marginTop: 4, borderLeft: "3px solid #4f35d2" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1535", marginBottom: 8 }}>
                    Email Preview
                  </div>
                  <iframe
                    srcDoc={item.html_body}
                    style={{ width: "100%", height: 400, border: "1px solid #e8e5f5", borderRadius: 8, background: "#fff" }}
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Workflows ───────────────────────────────────────────

function WorkflowsTab({ workflows, startTransition }: { workflows: WorkflowOverview[]; startTransition: (fn: () => void) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 12 }}>
      {workflows.length === 0 ? (
        <div className="lf-card" style={{ padding: 40, textAlign: "center", color: "#6b6b8d", gridColumn: "1/-1" }}>
          No workflows found. Create one in Automations.
        </div>
      ) : (
        workflows.map((wf) => (
          <div key={wf.id} className="lf-card" style={{ padding: 16 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>
                {wf.contact_type === "seller" ? "🏠" : wf.contact_type === "buyer" ? "🔑" : "📋"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1535" }}>{wf.name}</div>
                {wf.description && (
                  <div style={{ fontSize: 12, color: "#6b6b8d" }}>{wf.description}</div>
                )}
              </div>
              <span className={`lf-badge ${wf.is_active ? "lf-badge-done" : "lf-badge-pending"}`} style={{ fontSize: 11 }}>
                {wf.is_active ? "Active" : "Paused"}
              </span>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#6b6b8d", marginBottom: 12 }}>
              <span>{wf.step_count} steps</span>
              <span>{wf.enrollments.length} enrolled</span>
              {wf.lifecycle_phase && <span className="lf-badge lf-badge-info" style={{ fontSize: 10 }}>{wf.lifecycle_phase}</span>}
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                className="lf-btn-sm lf-btn-ghost"
                onClick={() => startTransition(() => toggleWorkflowActive(wf.id, !wf.is_active))}
                style={{ fontSize: 12 }}
              >
                {wf.is_active ? "⏸ Pause" : "▶️ Resume"}
              </button>
              <button
                className="lf-btn-sm lf-btn-ghost"
                onClick={() => setExpandedId(expandedId === wf.id ? null : wf.id)}
                style={{ fontSize: 12 }}
              >
                {expandedId === wf.id ? "Hide" : "Show"} Contacts ({wf.enrollments.length})
              </button>
              <a
                href={`/automations/workflows/${wf.id}`}
                className="lf-btn-sm lf-btn-ghost"
                style={{ fontSize: 12, textDecoration: "none" }}
              >
                ✏️ Edit
              </a>
            </div>

            {/* Expanded Enrollment List */}
            {expandedId === wf.id && (
              <div style={{ borderTop: "1px solid #e8e5f5", paddingTop: 10 }}>
                {wf.enrollments.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#a0a0b0", textAlign: "center", padding: 12 }}>
                    No contacts enrolled
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {wf.enrollments.map((e) => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: "#f9f8ff", borderRadius: 8, fontSize: 13 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff",
                          background: e.contact_type === "seller" ? "linear-gradient(135deg, #4f35d2, #ff5c3a)" : "linear-gradient(135deg, #4f35d2, #8b5cf6)",
                        }}>
                          {e.contact_name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ flex: 1, fontWeight: 500, color: "#1a1535" }}>{e.contact_name}</span>
                        <span style={{ color: "#6b6b8d" }}>Step {e.current_step}</span>
                        <span className={`lf-badge ${e.status === "active" ? "lf-badge-active" : "lf-badge-pending"}`} style={{ fontSize: 10 }}>
                          {e.status}
                        </span>
                        <span style={{ fontSize: 11, color: "#a0a0b0" }}>
                          {new Date(e.enrolled_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ── Tab 3: Contact Journeys ────────────────────────────────────

function ContactJourneysTab({ journeys, startTransition }: { journeys: ContactJourneyItem[]; startTransition: (fn: () => void) => void }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emailHistory, setEmailHistory] = useState<Record<string, ContactEmailHistory[]>>({});

  const filtered = journeys.filter((j) => {
    if (search && !j.contact_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "all" && j.contact_type !== typeFilter) return false;
    if (phaseFilter !== "all" && j.current_phase !== phaseFilter) return false;
    return true;
  });

  const phases = ["lead", "active", "under_contract", "past_client", "dormant"];
  const phaseLabels: Record<string, string> = {
    lead: "Lead", active: "Active", under_contract: "Under Contract", past_client: "Past Client", dormant: "Dormant",
  };
  const phaseEmoji: Record<string, string> = {
    lead: "🟢", active: "🔥", under_contract: "📝", past_client: "⭐", dormant: "❄️",
  };

  async function loadHistory(contactId: string) {
    if (emailHistory[contactId]) return;
    const history = await getEmailHistoryForContact(contactId);
    setEmailHistory((prev) => ({ ...prev, [contactId]: history }));
  }

  function scoreColor(score: number): string {
    if (score >= 70) return "#059669";
    if (score >= 40) return "#d97706";
    return "#6b6b8d";
  }

  return (
    <div>
      {/* Search & Filters */}
      <div className="lf-card" style={{ padding: "12px 16px", marginBottom: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="lf-input"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 200, fontSize: 13 }}
        />
        <select className="lf-select" style={{ width: "auto", fontSize: 13 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="buyer">Buyers</option>
          <option value="seller">Sellers</option>
        </select>
        <select className="lf-select" style={{ width: "auto", fontSize: 13 }} value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
          <option value="all">All Phases</option>
          {phases.map((p) => (
            <option key={p} value={p}>{phaseLabels[p]}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: "#6b6b8d", marginLeft: "auto" }}>
          {filtered.length} contacts
        </span>
      </div>

      {/* Contact Rows */}
      {filtered.length === 0 ? (
        <div className="lf-card" style={{ padding: 40, textAlign: "center", color: "#6b6b8d" }}>
          No contacts in journeys
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((j) => (
            <div key={j.id}>
              <div
                className="lf-card"
                onClick={() => {
                  const newExpanded = expandedId === j.id ? null : j.id;
                  setExpandedId(newExpanded);
                  if (newExpanded) loadHistory(j.contact_id);
                }}
                style={{ padding: "12px 16px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff",
                    background: j.contact_type === "seller" ? "linear-gradient(135deg, #4f35d2, #ff5c3a)" : "linear-gradient(135deg, #4f35d2, #8b5cf6)",
                  }}>
                    {j.contact_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + Email */}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1535" }}>{j.contact_name}</div>
                    <div style={{ fontSize: 12, color: "#a0a0b0" }}>{j.contact_email}</div>
                  </div>

                  {/* Type */}
                  <span className="lf-badge" style={{ fontSize: 10, background: j.contact_type === "seller" ? "#fff0ed" : "#f0edff", color: j.contact_type === "seller" ? "#ff5c3a" : "#4f35d2" }}>
                    {j.contact_type}
                  </span>

                  {/* Phase */}
                  <span className="lf-badge lf-badge-info" style={{ fontSize: 11 }}>
                    {phaseEmoji[j.current_phase] ?? ""} {phaseLabels[j.current_phase] ?? j.current_phase}
                  </span>

                  {/* Engagement Score */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: scoreColor(j.engagement_score), minWidth: 30, textAlign: "center" }}>
                    {j.engagement_score}
                  </div>

                  {/* Last Email */}
                  <div style={{ fontSize: 12, color: "#6b6b8d", minWidth: 100, textAlign: "right" }}>
                    {j.last_email_subject ? (
                      <div>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                          {j.last_email_subject}
                        </div>
                        <div style={{ fontSize: 11, color: "#a0a0b0" }}>
                          {j.last_email_date ? new Date(j.last_email_date).toLocaleDateString() : ""}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "#a0a0b0" }}>No emails yet</span>
                    )}
                  </div>

                  {/* Paused indicator */}
                  {j.is_paused && (
                    <span className="lf-badge lf-badge-blocked" style={{ fontSize: 10 }}>Paused</span>
                  )}
                </div>
              </div>

              {/* Expanded: Email History + Actions */}
              {expandedId === j.id && (
                <div className="lf-card" style={{ padding: 16, marginTop: 4, borderLeft: "3px solid #4f35d2" }}>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <button
                      className="lf-btn-sm lf-btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        startTransition(() => j.is_paused ? resumeJourney(j.contact_id, j.journey_type as any) : pauseJourney(j.contact_id, j.journey_type as any));
                      }}
                      style={{ fontSize: 12 }}
                    >
                      {j.is_paused ? "▶️ Resume" : "⏸ Pause"} Journey
                    </button>
                    {phases.filter((p) => p !== j.current_phase).slice(0, 2).map((phase) => (
                      <button
                        key={phase}
                        className="lf-btn-sm lf-btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          startTransition(() => advanceJourneyPhase(j.contact_id, j.journey_type as any, phase as any));
                        }}
                        style={{ fontSize: 12 }}
                      >
                        → {phaseLabels[phase]}
                      </button>
                    ))}
                    <a
                      href={`/contacts/${j.contact_id}`}
                      className="lf-btn-sm lf-btn-ghost"
                      style={{ fontSize: 12, textDecoration: "none", marginLeft: "auto" }}
                    >
                      View Contact →
                    </a>
                  </div>

                  {/* Email History */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1535", marginBottom: 8 }}>
                    Email History ({j.emails_sent} sent)
                  </div>
                  {!emailHistory[j.contact_id] ? (
                    <div style={{ fontSize: 13, color: "#a0a0b0", padding: 12, textAlign: "center" }}>Loading...</div>
                  ) : emailHistory[j.contact_id].length === 0 ? (
                    <div style={{ fontSize: 13, color: "#a0a0b0", padding: 12, textAlign: "center" }}>No emails sent yet</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {emailHistory[j.contact_id].map((email) => (
                        <div key={email.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f9f8ff", borderRadius: 8, fontSize: 13 }}>
                          <span className={`lf-badge ${email.status === "sent" ? "lf-badge-done" : email.status === "draft" ? "lf-badge-pending" : "lf-badge-blocked"}`} style={{ fontSize: 10 }}>
                            {email.status}
                          </span>
                          <span style={{ flex: 1, color: "#1a1535" }}>{email.subject}</span>
                          <span className="lf-badge lf-badge-info" style={{ fontSize: 10 }}>{email.email_type.replace(/_/g, " ")}</span>
                          {email.status === "sent" && (
                            <span style={{ fontSize: 12, color: "#6b6b8d" }}>
                              👁 {email.open_count} 🖱 {email.click_count}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "#a0a0b0" }}>
                            {email.sent_at ? new Date(email.sent_at).toLocaleDateString() : new Date(email.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Schedule ────────────────────────────────────────────

function ScheduleTab({ items, startTransition }: { items: ScheduleItem[]; startTransition: (fn: () => void) => void }) {
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

  // Group by date
  const grouped: Record<string, ScheduleItem[]> = {};
  for (const item of items) {
    const dateKey = new Date(item.scheduled_at).toLocaleDateString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  }

  return (
    <div>
      {items.length === 0 ? (
        <div className="lf-card" style={{ padding: 40, textAlign: "center", color: "#6b6b8d" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
          No emails scheduled. Enroll contacts in journeys to start.
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, dateItems]) => (
          <div key={dateLabel} style={{ marginBottom: 16 }}>
            {/* Date Header */}
            <div style={{ fontSize: 14, fontWeight: 600, color: "#4f35d2", marginBottom: 8, paddingLeft: 4 }}>
              {dateLabel}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dateItems.map((item) => (
                <div key={`${item.source}-${item.id}`} className="lf-card" style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {/* Time */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1535", minWidth: 60 }}>
                      {new Date(item.scheduled_at).toLocaleTimeString("en-CA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff",
                      background: item.contact_type === "seller" ? "linear-gradient(135deg, #4f35d2, #ff5c3a)" : "linear-gradient(135deg, #4f35d2, #8b5cf6)",
                    }}>
                      {item.contact_name.charAt(0).toUpperCase()}
                    </div>

                    <span style={{ flex: 1, fontSize: 14, color: "#1a1535", fontWeight: 500 }}>
                      {item.contact_name}
                    </span>

                    <span className="lf-badge lf-badge-info" style={{ fontSize: 10 }}>
                      {item.email_type ?? item.workflow_name ?? "Email"}
                    </span>

                    <span className="lf-badge" style={{ fontSize: 10, background: item.source === "journey" ? "#f0edff" : "#e8faf3", color: item.source === "journey" ? "#4f35d2" : "#059669" }}>
                      {item.source}
                    </span>

                    {/* Actions */}
                    {cancelConfirm === item.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="lf-btn-sm lf-btn-danger"
                          onClick={() => {
                            startTransition(() => cancelScheduledEmail(item.id, item.source));
                            setCancelConfirm(null);
                          }}
                          style={{ fontSize: 11 }}
                        >
                          Confirm Cancel
                        </button>
                        <button
                          className="lf-btn-sm lf-btn-ghost"
                          onClick={() => setCancelConfirm(null)}
                          style={{ fontSize: 11 }}
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        className="lf-btn-sm lf-btn-ghost"
                        onClick={() => setCancelConfirm(item.id)}
                        style={{ fontSize: 11 }}
                      >
                        ✕ Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
