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
