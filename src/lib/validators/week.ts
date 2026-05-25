import { z } from "zod";

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (expected YYYY-MM-DD)");
export const timeKeySchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Invalid time (expected HH:mm)");
export const idSchema = z.string().min(1);

export const updateBigRockSchema = z.object({
  weekId: idSchema,
  bigRock: z.string().max(280),
});

export const updateReflectionSchema = z.object({
  weekId: idSchema,
  reflection: z.string().max(4000),
});

export const addWeeklyTargetSchema = z.object({
  weekId: idSchema,
  title: z.string().min(1).max(280),
});

export const targetIdSchema = z.object({
  targetId: idSchema,
});

export const timeBlockCategorySchema = z.enum([
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

export const addTimeBlockSchema = z.object({
  dayPlanId: idSchema,
  title: z.string().min(1).max(280),
  startTime: timeKeySchema,
  endTime: timeKeySchema,
  category: timeBlockCategorySchema.default("FLEXIBLE"),
});

export const updateTimeBlockSchema = z.object({
  timeBlockId: idSchema,
  title: z.string().min(1).max(280),
  startTime: timeKeySchema,
  endTime: timeKeySchema,
  category: timeBlockCategorySchema,
});

export const timeBlockIdSchema = z.object({
  timeBlockId: idSchema,
});

export const habitLogStatusSchema = z.enum([
  "NONE",
  "MINIMUM",
  "IDEAL",
  "SKIPPED",
]);

export const logHabitSchema = z.object({
  habitId: idSchema,
  date: dateKeySchema,
  status: habitLogStatusSchema,
});

export const startNewWeekSchema = z.object({
  userId: idSchema,
  fromStartDate: dateKeySchema,
});

export type AddTimeBlockInput = z.infer<typeof addTimeBlockSchema>;
export type UpdateTimeBlockInput = z.infer<typeof updateTimeBlockSchema>;
export type LogHabitInput = z.infer<typeof logHabitSchema>;
export type TimeBlockCategory = z.infer<typeof timeBlockCategorySchema>;
export type HabitLogStatus = z.infer<typeof habitLogStatusSchema>;
