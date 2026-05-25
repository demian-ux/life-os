import { z } from "zod";
import { idSchema } from "./week";

export const dayOfWeekSchema = z.number().int().min(1).max(7);
export const daysOfWeekSchema = z.array(dayOfWeekSchema).min(1).max(7);
export const traitAxisSchema = z.enum([
  "DISCIPLINE",
  "AUDACITY",
  "RECOVERY",
  "FOCUS",
  "CRAFT",
]);

const baseFields = {
  name: z.string().min(1).max(120),
  category: z.string().max(60).optional(),
  minimumVersion: z.string().min(1).max(280),
  idealVersion: z.string().max(280).optional(),
  anchor: z.string().max(280).optional(),
  difficulty: z.number().int().min(1).max(5),
  days: daysOfWeekSchema,
  axis: traitAxisSchema.default("CRAFT"),
};

export const createHabitSchema = z.object(baseFields);
export const updateHabitSchema = z.object({
  habitId: idSchema,
  ...baseFields,
});
export const habitIdSchema = z.object({ habitId: idSchema });

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
