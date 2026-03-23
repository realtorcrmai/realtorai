import { z } from "zod";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_CATEGORIES } from "@/lib/constants";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).default("pending"),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  category: z.enum(TASK_CATEGORIES).default("general"),
  due_date: z.string().optional(),
  contact_id: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;
