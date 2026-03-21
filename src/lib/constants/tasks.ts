import { getStatusColor } from "./theme";

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
    color: getStatusColor("priority", "low").text,
    bg: getStatusColor("priority", "low").bg,
    dotColor: getStatusColor("priority", "low").dot,
    label: "Low",
  },
  medium: {
    color: getStatusColor("priority", "medium").text,
    bg: getStatusColor("priority", "medium").bg,
    dotColor: getStatusColor("priority", "medium").dot,
    label: "Medium",
  },
  high: {
    color: getStatusColor("priority", "high").text,
    bg: getStatusColor("priority", "high").bg,
    dotColor: getStatusColor("priority", "high").dot,
    label: "High",
  },
  urgent: {
    color: getStatusColor("priority", "urgent").text,
    bg: getStatusColor("priority", "urgent").bg,
    dotColor: getStatusColor("priority", "urgent").dot,
    label: "Urgent",
  },
};
