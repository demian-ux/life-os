import { z } from "zod";
import { dateKeySchema, idSchema } from "./week";

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const energyLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const taskStatusSchema = z.enum([
  "INBOX",
  "TODO",
  "SCHEDULED",
  "DONE",
  "SOMEDAY",
  "ARCHIVED",
]);

export const quickCaptureSchema = z.object({
  title: z.string().min(1).max(280),
  source: z.string().max(60).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(280),
  notes: z.string().max(4000).optional(),
  priority: prioritySchema.default("MEDIUM"),
  energy: energyLevelSchema.default("MEDIUM"),
  estimatedMinutes: z.number().int().positive().max(24 * 60).optional(),
  dueDate: dateKeySchema.optional(),
  scheduledDate: dateKeySchema.optional(),
  source: z.string().max(60).optional(),
});

export const updateTaskSchema = z.object({
  taskId: idSchema,
  title: z.string().min(1).max(280),
  notes: z.string().max(4000).optional(),
  priority: prioritySchema,
  energy: energyLevelSchema,
  estimatedMinutes: z.number().int().positive().max(24 * 60).optional(),
  dueDate: dateKeySchema.optional(),
  scheduledDate: dateKeySchema.optional(),
});

export const taskIdSchema = z.object({ taskId: idSchema });

export const scheduleTaskSchema = z.object({
  taskId: idSchema,
  scheduledDate: dateKeySchema,
});

export type Priority = z.infer<typeof prioritySchema>;
export type EnergyLevel = z.infer<typeof energyLevelSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type QuickCaptureInput = z.infer<typeof quickCaptureSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ScheduleTaskInput = z.infer<typeof scheduleTaskSchema>;
