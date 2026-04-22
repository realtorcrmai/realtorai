export const TASK_STATUSES = ["pending", "in_progress", "completed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_CATEGORIES = [
  "follow_up",
  "showing",
  "document",
  "listing",
  "marketing",
  "inspection",
  "closing",
  "general",
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  follow_up: "Follow Up",
  showing: "Showing",
  document: "Document",
  listing: "Listing",
  marketing: "Marketing",
  inspection: "Inspection",
  closing: "Closing",
  general: "General",
};

export const TASK_CATEGORY_ICONS: Record<TaskCategory, string> = {
  follow_up: "📞",
  showing: "🏠",
  document: "📄",
  listing: "🏢",
  marketing: "📣",
  inspection: "🔍",
  closing: "✅",
  general: "📋",
};

export const TASK_PRIORITY_CONFIG: Record<
  TaskPriority,
  { color: string; bg: string; dotColor: string; label: string }
> = {
  low: {
    color: "text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-900",
    dotColor: "bg-gray-400",
    label: "Low",
  },
  medium: {
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950",
    dotColor: "bg-blue-500",
    label: "Medium",
  },
  high: {
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950",
    dotColor: "bg-orange-500",
    label: "High",
  },
  urgent: {
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950",
    dotColor: "bg-red-500",
    label: "Urgent",
  },
};

export const TASK_SCOPE_OPTIONS = [
  { value: "all", label: "All Tasks" },
  { value: "mine", label: "My Tasks" },
  { value: "assigned", label: "Assigned to Me" },
  { value: "team", label: "Team Tasks" },
] as const;

export const TASK_GROUP_BY_OPTIONS = [
  { value: "none", label: "No Grouping" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "category", label: "Category" },
  { value: "assignee", label: "Assignee" },
  { value: "due_date", label: "Due Date" },
] as const;

export const TASK_SORT_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "due_date", label: "Due Date" },
  { value: "created_at", label: "Created" },
  { value: "title", label: "Title" },
  { value: "position", label: "Custom Order" },
] as const;

export const TASK_VIEW_MODES = ["list", "board", "calendar"] as const;
export type TaskViewMode = (typeof TASK_VIEW_MODES)[number];

export const TASK_TRIGGER_EVENTS = [
  { value: "listing_created", label: "New Listing Created" },
  { value: "contact_created", label: "New Contact Added" },
  { value: "showing_confirmed", label: "Showing Confirmed" },
  { value: "showing_completed", label: "Showing Completed" },
  { value: "offer_received", label: "Offer Received" },
  { value: "deal_accepted", label: "Deal Accepted" },
] as const;

export const RECURRENCE_PRESETS = [
  { value: "", label: "No Repeat" },
  { value: "FREQ=DAILY", label: "Daily" },
  { value: "FREQ=WEEKLY", label: "Weekly" },
  { value: "FREQ=WEEKLY;BYDAY=MO,WE,FR", label: "Mon/Wed/Fri" },
  { value: "FREQ=MONTHLY", label: "Monthly" },
  { value: "FREQ=YEARLY", label: "Yearly" },
] as const;

// Priority sort weight (lower = higher priority)
export const PRIORITY_SORT_WEIGHT: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
