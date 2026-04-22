import { z } from "zod";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_CATEGORIES } from "@/lib/constants";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullish(),
  status: z.enum(TASK_STATUSES).default("pending"),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  category: z.enum(TASK_CATEGORIES).default("general"),
  due_date: z.string().nullish(),
  start_date: z.string().nullish(),
  contact_id: z.string().uuid().nullish(),
  listing_id: z.string().uuid().nullish(),
  assigned_to: z.string().uuid().nullish(),
  parent_id: z.string().uuid().nullish(),
  estimated_hours: z.number().min(0).nullish(),
  labels: z.array(z.string()).optional(),
  visibility: z.enum(["private", "team"]).default("private"),
  recurrence_rule: z.string().nullish(),
  position: z.number().int().optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;

export const taskTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  category: z.enum(TASK_CATEGORIES).default("general"),
  trigger_event: z.string().optional(),
  is_shared: z.boolean().default(false),
  items: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    priority: z.enum(TASK_PRIORITIES).default("medium"),
    category: z.enum(TASK_CATEGORIES).default("general"),
    offset_days: z.number().int().min(0).default(0),
    position: z.number().int().default(0),
  })).optional(),
});

export const taskFilterSchema = z.object({
  status: z.array(z.enum(TASK_STATUSES)).optional(),
  priority: z.array(z.enum(TASK_PRIORITIES)).optional(),
  category: z.array(z.enum(TASK_CATEGORIES)).optional(),
  assigned_to: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional(),
  labels: z.array(z.string()).optional(),
  search: z.string().optional(),
  due_date_from: z.string().optional(),
  due_date_to: z.string().optional(),
  archived: z.boolean().default(false),
  scope: z.enum(["mine", "assigned", "team", "all"]).default("all"),
  group_by: z.enum(["status", "priority", "category", "assignee", "due_date", "none"]).default("none"),
  sort_by: z.enum(["priority", "due_date", "created_at", "title", "position"]).default("priority"),
  sort_dir: z.enum(["asc", "desc"]).default("asc"),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(50),
});

export type TaskFilterData = z.infer<typeof taskFilterSchema>;
