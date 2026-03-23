// ── Workflow Action Types ─────────────────────────────────────
export const WORKFLOW_ACTION_TYPES = [
  "auto_email",
  "auto_sms",
  "auto_whatsapp",
  "manual_task",
  "auto_alert",
  "system_action",
  "wait",
  "condition",
  "milestone",
] as const;
export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[number];

export const ACTION_TYPE_LABELS: Record<WorkflowActionType, string> = {
  auto_email: "Auto Email",
  auto_sms: "Auto SMS",
  auto_whatsapp: "Auto WhatsApp",
  manual_task: "Manual Task",
  auto_alert: "Agent Alert",
  system_action: "System Action",
  wait: "Wait / Delay",
  condition: "Condition",
  milestone: "Milestone",
};

export const ACTION_TYPE_ICONS: Record<WorkflowActionType, string> = {
  auto_email: "📧",
  auto_sms: "📱",
  auto_whatsapp: "💬",
  manual_task: "✅",
  auto_alert: "🔔",
  system_action: "⚙️",
  wait: "⏳",
  condition: "🔀",
  milestone: "🏁",
};

export const ACTION_TYPE_COLORS: Record<WorkflowActionType, { bg: string; text: string }> = {
  auto_email: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-600 dark:text-blue-400" },
  auto_sms: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-600 dark:text-green-400" },
  auto_whatsapp: { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-600 dark:text-emerald-400" },
  manual_task: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-600 dark:text-amber-400" },
  auto_alert: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-600 dark:text-red-400" },
  system_action: { bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-600 dark:text-purple-400" },
  wait: { bg: "bg-gray-50 dark:bg-gray-900", text: "text-gray-500 dark:text-gray-400" },
  condition: { bg: "bg-indigo-50 dark:bg-indigo-950", text: "text-indigo-600 dark:text-indigo-400" },
  milestone: { bg: "bg-teal-50 dark:bg-teal-950", text: "text-teal-600 dark:text-teal-400" },
};

// ── Workflow Trigger Types ────────────────────────────────────
export const WORKFLOW_TRIGGER_TYPES = [
  "lead_status_change",
  "listing_status_change",
  "manual",
  "inactivity",
  "showing_completed",
  "new_lead",
  "tag_added",
] as const;
export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPES)[number];

export const TRIGGER_TYPE_LABELS: Record<WorkflowTriggerType, string> = {
  lead_status_change: "Lead Status Change",
  listing_status_change: "Listing Status Change",
  manual: "Manual Enrollment",
  inactivity: "Contact Inactivity",
  showing_completed: "Showing Completed",
  new_lead: "New Lead Created",
  tag_added: "Tag Added",
};

// ── Enrollment Statuses ───────────────────────────────────────
export const ENROLLMENT_STATUSES = [
  "active",
  "paused",
  "completed",
  "exited",
  "failed",
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const ENROLLMENT_STATUS_COLORS: Record<EnrollmentStatus, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-800",
  exited: "bg-gray-100 text-gray-800",
  failed: "bg-red-100 text-red-800",
};

// ── Template Variable Helpers ─────────────────────────────────
export const TEMPLATE_VARIABLES = [
  { key: "contact_name", label: "Contact Name", example: "John Doe" },
  { key: "contact_first_name", label: "First Name", example: "John" },
  { key: "contact_phone", label: "Phone", example: "604-555-0123" },
  { key: "contact_email", label: "Email", example: "john@example.com" },
  { key: "agent_name", label: "Agent Name", example: "Sarah Smith" },
  { key: "agent_phone", label: "Agent Phone", example: "604-555-9999" },
  { key: "listing_address", label: "Listing Address", example: "123 Main St" },
  { key: "listing_price", label: "Listing Price", example: "$899,000" },
  { key: "closing_date", label: "Closing Date", example: "Mar 15, 2026" },
  { key: "today_date", label: "Today's Date", example: "Mar 16, 2026" },
] as const;

// ── Template Categories ───────────────────────────────────────
export const TEMPLATE_CATEGORIES = [
  "general",
  "nurture",
  "post_close",
  "follow_up",
  "reengagement",
  "speed_to_contact",
  "referral",
  "showing",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: "General",
  nurture: "Nurture",
  post_close: "Post-Close",
  follow_up: "Follow-Up",
  reengagement: "Re-Engagement",
  speed_to_contact: "Speed-to-Contact",
  referral: "Referral",
  showing: "Showing",
};

// ── Notification Types ────────────────────────────────────────
export const NOTIFICATION_TYPES = [
  "info",
  "warning",
  "urgent",
  "task",
  "workflow",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_COLORS: Record<NotificationType, string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-800",
  task: "bg-green-100 text-green-800",
  workflow: "bg-purple-100 text-purple-800",
};

// ── 7 Workflow Definitions (step blueprints) ──────────────────
// These define the default steps for each seeded workflow.
// Used when setting up steps for the first time.

export type WorkflowStepBlueprint = {
  name: string;
  action_type: WorkflowActionType;
  delay_value: number;
  delay_unit: "minutes" | "hours" | "days";
  exit_on_reply?: boolean;
  template_category?: string;
  task_config?: Record<string, unknown>;
  action_config?: Record<string, unknown>;
  /** When set, AI generates the message body instead of using a static template */
  ai_template_intent?: string;
};

export type WorkflowBlueprint = {
  slug: string;
  name: string;
  icon: string;
  description: string;
  steps: WorkflowStepBlueprint[];
};

export const WORKFLOW_BLUEPRINTS: WorkflowBlueprint[] = [
  {
    slug: "speed_to_contact",
    name: "Lead Speed-to-Contact",
    icon: "⚡",
    description: "0-1 min to 24-hour escalation for new leads",
    steps: [
      { name: "Instant auto-text: acknowledge lead", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { name: "Alert agent: new lead received", action_type: "auto_alert", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: call lead within 5 min", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Call new lead", priority: "urgent", category: "follow_up" } },
      { name: "Wait 5 minutes", action_type: "wait", delay_value: 5, delay_unit: "minutes" },
      { name: "If no response: follow-up text", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { name: "Wait 1 hour", action_type: "wait", delay_value: 1, delay_unit: "hours" },
      { name: "Email with value offer", action_type: "auto_email", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { name: "Wait 4 hours", action_type: "wait", delay_value: 4, delay_unit: "hours" },
      { name: "Task: second call attempt", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Second call attempt", priority: "high", category: "follow_up" } },
      { name: "Wait 24 hours", action_type: "wait", delay_value: 24, delay_unit: "hours" },
      { name: "Final outreach text", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { name: "Change status to nurturing", action_type: "system_action", delay_value: 0, delay_unit: "minutes", action_config: { action: "change_lead_status", value: "nurturing" } },
    ],
  },
  {
    slug: "buyer_nurture",
    name: "Buyer Nurture Plan",
    icon: "🏠",
    description: "7-stage multi-day drip sequence for qualified buyer leads",
    steps: [
      // Stage 1: Welcome (Day 0)
      { name: "Welcome email: intro + what to expect", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Welcome text: confirm preferences received", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: review buyer preferences", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Review buyer preferences", priority: "high", category: "follow_up" } },
      // Stage 2: Education (Day 1-3)
      { name: "Wait 1 day", action_type: "wait", delay_value: 1, delay_unit: "days" },
      { name: "Email: buying process overview", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 2 days", action_type: "wait", delay_value: 2, delay_unit: "days" },
      { name: "Email: mortgage pre-approval guide", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      // Stage 3: Market Intro (Day 5)
      { name: "Wait 2 days", action_type: "wait", delay_value: 2, delay_unit: "days" },
      { name: "Email: current market snapshot", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: send curated listings", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Send 3-5 curated listings", priority: "medium", category: "follow_up" } },
      // Stage 4: Engagement (Day 7)
      { name: "Wait 2 days", action_type: "wait", delay_value: 2, delay_unit: "days" },
      { name: "Text: check-in on listings sent", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { name: "Task: schedule showing", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Schedule first showing", priority: "high", category: "showing" } },
      // Stage 5: Active Search (Day 10-14)
      { name: "Wait 3 days", action_type: "wait", delay_value: 3, delay_unit: "days" },
      { name: "Email: neighbourhood guides", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 4 days", action_type: "wait", delay_value: 4, delay_unit: "days" },
      { name: "Task: showing follow-up call", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Follow-up call after showings", priority: "medium", category: "follow_up" } },
      // Stage 6: Decision Support (Day 18-21)
      { name: "Wait 4 days", action_type: "wait", delay_value: 4, delay_unit: "days" },
      { name: "Email: making an offer guide", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 3 days", action_type: "wait", delay_value: 3, delay_unit: "days" },
      { name: "Text: ready to make an offer?", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      // Stage 7: Closing (Day 25-30)
      { name: "Wait 4 days", action_type: "wait", delay_value: 4, delay_unit: "days" },
      { name: "Email: closing checklist", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Change status to active", action_type: "system_action", delay_value: 0, delay_unit: "minutes", action_config: { action: "change_lead_status", value: "active" } },
    ],
  },
  {
    slug: "post_close_buyer",
    name: "Post-Close Buyer Workflow",
    icon: "🎉",
    description: "Timed touchpoints from closing day through annual follow-up",
    steps: [
      { name: "Day 0: Congratulations email", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Day 0: Congrats text", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: send closing gift", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Send closing gift / housewarming", priority: "high", category: "closing" } },
      { name: "Wait 3 days", action_type: "wait", delay_value: 3, delay_unit: "days" },
      { name: "Email: move-in checklist & local resources", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 7 days", action_type: "wait", delay_value: 7, delay_unit: "days" },
      { name: "Text: how is the new home?", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: check-in call", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Post-close check-in call", priority: "medium", category: "follow_up" } },
      { name: "Wait 23 days", action_type: "wait", delay_value: 23, delay_unit: "days" },
      { name: "Email: 30-day home maintenance tips", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 60 days", action_type: "wait", delay_value: 60, delay_unit: "days" },
      { name: "Email: 90-day check-in + referral ask", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: ask for Google review", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Ask for Google review", priority: "medium", category: "marketing" } },
      { name: "Wait 90 days", action_type: "wait", delay_value: 90, delay_unit: "days" },
      { name: "Email: 6-month home equity update", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 180 days", action_type: "wait", delay_value: 180, delay_unit: "days" },
      { name: "Email: 1-year anniversary + market update", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: anniversary call", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "1-year anniversary call", priority: "medium", category: "follow_up" } },
      { name: "Change status to closed", action_type: "system_action", delay_value: 0, delay_unit: "minutes", action_config: { action: "change_lead_status", value: "closed" } },
    ],
  },
  {
    slug: "post_close_seller",
    name: "Post-Close Seller Workflow",
    icon: "🤝",
    description: "Timed touchpoints from sale closing through annual follow-up",
    steps: [
      { name: "Day 0: Congratulations on sale email", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Day 0: Thank you text", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: send thank-you gift", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Send thank-you gift to seller", priority: "high", category: "closing" } },
      { name: "Wait 3 days", action_type: "wait", delay_value: 3, delay_unit: "days" },
      { name: "Email: what's next + moving resources", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 7 days", action_type: "wait", delay_value: 7, delay_unit: "days" },
      { name: "Text: settling in OK?", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: check-in call", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Post-sale check-in call", priority: "medium", category: "follow_up" } },
      { name: "Wait 23 days", action_type: "wait", delay_value: 23, delay_unit: "days" },
      { name: "Email: 30-day follow-up + referral ask", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: request testimonial", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Request testimonial / Google review", priority: "medium", category: "marketing" } },
      { name: "Wait 60 days", action_type: "wait", delay_value: 60, delay_unit: "days" },
      { name: "Email: 90-day market update", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 90 days", action_type: "wait", delay_value: 90, delay_unit: "days" },
      { name: "Email: 6-month neighbourhood update", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 180 days", action_type: "wait", delay_value: 180, delay_unit: "days" },
      { name: "Email: 1-year anniversary", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: anniversary touch-base", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "1-year sale anniversary call", priority: "medium", category: "follow_up" } },
      { name: "Change status to closed", action_type: "system_action", delay_value: 0, delay_unit: "minutes", action_config: { action: "change_lead_status", value: "closed" } },
    ],
  },
  {
    slug: "lead_reengagement",
    name: "Lead Re-Engagement",
    icon: "🔁",
    description: "Triggered after 60-90 days of inactivity",
    steps: [
      { name: "Re-engagement text: still looking?", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { name: "Alert agent: re-engagement triggered", action_type: "auto_alert", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 2 days", action_type: "wait", delay_value: 2, delay_unit: "days" },
      { name: "Email: market update + new listings", action_type: "auto_email", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { name: "Wait 5 days", action_type: "wait", delay_value: 5, delay_unit: "days" },
      { name: "Task: personal outreach call", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Re-engagement call", priority: "high", category: "follow_up" } },
      { name: "Wait 7 days", action_type: "wait", delay_value: 7, delay_unit: "days" },
      { name: "Email: exclusive opportunity / value add", action_type: "auto_email", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { name: "Wait 14 days", action_type: "wait", delay_value: 14, delay_unit: "days" },
      { name: "Final text: last check-in", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { name: "Tag as cold if no response", action_type: "system_action", delay_value: 0, delay_unit: "minutes", action_config: { action: "add_tag", value: "cold_lead" } },
    ],
  },
  {
    slug: "open_house_followup",
    name: "Open House / Showing Follow-Up",
    icon: "🏡",
    description: "Immediate to 7-day follow-up after showing",
    steps: [
      { name: "Immediate: thank you text", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 2 hours", action_type: "wait", delay_value: 2, delay_unit: "hours" },
      { name: "Email: property details + next steps", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: follow-up call next day", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Post-showing follow-up call", priority: "high", category: "showing" } },
      { name: "Wait 1 day", action_type: "wait", delay_value: 1, delay_unit: "days" },
      { name: "Text: thoughts on the property?", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { name: "Wait 2 days", action_type: "wait", delay_value: 2, delay_unit: "days" },
      { name: "Email: similar properties you might like", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 4 days", action_type: "wait", delay_value: 4, delay_unit: "days" },
      { name: "Final text: ready for another showing?", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { name: "Change stage to nurturing if no reply", action_type: "system_action", delay_value: 0, delay_unit: "minutes", action_config: { action: "change_lead_status", value: "nurturing" } },
    ],
  },
  {
    slug: "referral_partner",
    name: "Referral Partner Workflow",
    icon: "🤝",
    description: "Ongoing relationship nurture for referral sources",
    steps: [
      { name: "Welcome email: thank you for partnership", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Text: intro + what to expect", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { name: "Task: add to referral partner list", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Add to referral partner database", priority: "medium", category: "general" } },
      { name: "Wait 7 days", action_type: "wait", delay_value: 7, delay_unit: "days" },
      { name: "Email: market update for partners", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 30 days", action_type: "wait", delay_value: 30, delay_unit: "days" },
      { name: "Task: coffee / lunch check-in", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Schedule referral partner coffee/lunch", priority: "medium", category: "follow_up" } },
      { name: "Wait 30 days", action_type: "wait", delay_value: 30, delay_unit: "days" },
      { name: "Email: quarterly newsletter", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { name: "Wait 60 days", action_type: "wait", delay_value: 60, delay_unit: "days" },
      { name: "Task: send appreciation gift", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Send referral partner appreciation gift", priority: "medium", category: "general" } },
      { name: "Email: annual recap + thank you", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
    ],
  },
  // NOTE: buyer_lifecycle and seller_lifecycle workflows have been REMOVED.
  // They were 100% redundant with the StageBar pipeline (same stages: new → qualified → active → under_contract → closed).
  // StageBar is the single source of truth for pipeline position.
  // Other workflows (buyer_nurture, post_close, etc.) auto-sync stage_bar via WORKFLOW_STAGE_MAP.
];

// ── Workflow → Stage Bar Mapping ─────────────────────────────
// When a contact is enrolled in a workflow, their stage_bar should
// automatically reflect the implied stage. This prevents data inconsistency
// (e.g. stage_bar = "new" while enrolled in post_close_buyer).
export const WORKFLOW_STAGE_MAP: Record<string, {
  buyer: string;
  seller: string;
}> = {
  speed_to_contact: { buyer: "new", seller: "new" },
  buyer_nurture: { buyer: "qualified", seller: "qualified" },
  post_close_buyer: { buyer: "closed", seller: "closed" },
  post_close_seller: { buyer: "closed", seller: "closed" },
  lead_reengagement: { buyer: "cold", seller: "cold" },
  open_house_followup: { buyer: "active_search", seller: "active_listing" },
  referral_partner: { buyer: "new", seller: "new" }, // partners don't have a pipeline stage, keep as-is
};

// LIFECYCLE_MILESTONE_STAGE_MAP removed — lifecycle workflows were redundant with StageBar.

// Helper: find blueprint by slug
export function getWorkflowBlueprint(slug: string): WorkflowBlueprint | undefined {
  return WORKFLOW_BLUEPRINTS.find((w) => w.slug === slug);
}

// Helper: calculate total duration of a workflow in days
export function calculateWorkflowDuration(steps: WorkflowStepBlueprint[]): number {
  let totalMinutes = 0;
  for (const step of steps) {
    if (step.action_type === "wait") {
      switch (step.delay_unit) {
        case "minutes": totalMinutes += step.delay_value; break;
        case "hours": totalMinutes += step.delay_value * 60; break;
        case "days": totalMinutes += step.delay_value * 1440; break;
      }
    }
  }
  return Math.ceil(totalMinutes / 1440);
}

// Helper: format delay for display
export function formatDelay(value: number, unit: string): string {
  if (value === 0) return "Immediate";
  if (unit === "minutes" && value < 60) return `${value} min`;
  if (unit === "hours") return value === 1 ? "1 hour" : `${value} hours`;
  if (unit === "days") return value === 1 ? "1 day" : `${value} days`;
  return `${value} ${unit}`;
}
