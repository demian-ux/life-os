import { z } from "zod";
import { dateKeySchema, idSchema, timeKeySchema } from "./week";
import { energyLevelSchema, prioritySchema } from "./task";

export const createTaskActionSchema = z.object({
  title: z.string().min(1).max(280),
  notes: z.string().max(4000).optional(),
  priority: prioritySchema.default("MEDIUM"),
  energy: energyLevelSchema.default("MEDIUM"),
  estimatedMinutes: z.number().int().positive().max(24 * 60).optional(),
  dueDate: dateKeySchema.optional(),
  scheduledDate: dateKeySchema.optional(),
  source: z.string().max(60).optional(),
});

export const scheduleTaskActionSchema = z.object({
  taskId: idSchema,
  scheduledDate: dateKeySchema,
});

export const timeBlockCategoryActionSchema = z.enum([
  "FIXED",
  "FLEXIBLE",
  "FREE",
  "DEEP_WORK",
  "ADMIN",
  "RECOVERY",
  "SOCIAL",
  "HEALTH",
  "CREATIVE",
]);

export const createTimeBlockActionSchema = z.object({
  date: dateKeySchema,
  startTime: timeKeySchema,
  endTime: timeKeySchema,
  title: z.string().min(1).max(280),
  category: timeBlockCategoryActionSchema.default("FLEXIBLE"),
  taskId: idSchema.optional(),
});

export const createWeeklyTargetActionSchema = z.object({
  weekStartDate: dateKeySchema,
  title: z.string().min(1).max(280),
});

export const updateWeekActionSchema = z.object({
  weekStartDate: dateKeySchema,
  bigRock: z.string().max(280).optional(),
  reflection: z.string().max(4000).optional(),
});

export const logHabitActionSchema = z.object({
  habitName: z.string().min(1).max(120),
  date: dateKeySchema,
  status: z.enum(["MINIMUM", "IDEAL", "SKIPPED"]),
});

export const aiActionProposalSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CREATE_TASK"), payload: createTaskActionSchema }),
  z.object({
    type: z.literal("SCHEDULE_TASK"),
    payload: scheduleTaskActionSchema,
  }),
  z.object({
    type: z.literal("CREATE_TIME_BLOCK"),
    payload: createTimeBlockActionSchema,
  }),
  z.object({
    type: z.literal("CREATE_WEEKLY_TARGET"),
    payload: createWeeklyTargetActionSchema,
  }),
  z.object({
    type: z.literal("UPDATE_WEEK"),
    payload: updateWeekActionSchema,
  }),
  z.object({
    type: z.literal("LOG_HABIT"),
    payload: logHabitActionSchema,
  }),
]);

export const aiCoachResponseSchema = z.object({
  message: z.string().min(1),
  reasoningSummary: z.string().optional(),
  actions: z.array(aiActionProposalSchema).max(20).default([]),
  warnings: z.array(z.string()).default([]),
});

export const SUPPORTED_ACTION_TYPES = [
  "CREATE_TASK",
  "SCHEDULE_TASK",
  "CREATE_TIME_BLOCK",
  "CREATE_WEEKLY_TARGET",
  "UPDATE_WEEK",
  "LOG_HABIT",
] as const;

export type SupportedActionType = (typeof SUPPORTED_ACTION_TYPES)[number];
export type AiActionProposal = z.infer<typeof aiActionProposalSchema>;
export type AiCoachResponse = z.infer<typeof aiCoachResponseSchema>;
