import { z } from "zod";

export const guardTypeSchema = z.enum(["HABIT_LOGGED"]);

export const habitLoggedParamsSchema = z.object({
  habitId: z.string().min(1),
});

export const blockRuleInputSchema = z.object({
  name: z.string().min(1).max(80),
  domains: z.array(z.string().min(1).max(253)).max(200),
  guardType: guardTypeSchema,
  guardParams: habitLoggedParamsSchema,
  active: z.boolean(),
});

export const updateBlockRuleSchema = blockRuleInputSchema.extend({
  ruleId: z.string().min(1),
});

export const ruleIdSchema = z.object({ ruleId: z.string().min(1) });

export type BlockRuleInput = z.infer<typeof blockRuleInputSchema>;
export type UpdateBlockRuleInput = z.infer<typeof updateBlockRuleSchema>;

/**
 * Normalize a free-form domains input string (one per line or comma-separated)
 * into a clean array. Strips schemes, paths, whitespace.
 */
export function parseDomainsInput(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((d) => d.trim().toLowerCase())
    .map((d) => d.replace(/^https?:\/\//, ""))
    .map((d) => d.replace(/\/.*$/, ""))
    .filter((d) => d.length > 0 && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));
}
