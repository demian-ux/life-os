import { z } from "zod";
import { aiProviderSchema, mascotMoodSchema } from "@/lib/user-preferences";

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const updateSettingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required")
    .max(120)
    .refine(isValidTimeZone, "Use a valid IANA timezone"),
  aiProvider: aiProviderSchema,
  aiModel: z.string().trim().max(120).optional(),
  reduceMascots: z.boolean().optional(),
  limitBreakBannerEnabled: z.boolean().optional(),
  mascotMood: mascotMoodSchema.optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
